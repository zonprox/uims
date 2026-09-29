import * as crypto from 'node:crypto';
import { Injectable, Logger, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Optional() private prisma?: PrismaService,
    @Optional() private configService?: ConfigService,
    @Optional() private redis?: RedisService,
  ) {}

  async validateUser(
    identifier: string,
    pass: string,
    ipAddress = '127.0.0.1',
  ): Promise<Omit<import('@prisma/client').AppUser, 'passwordHash'> | null> {
    const clean = identifier.trim().toLowerCase();
    const user = await this.usersService.findByIdentifier(clean);
    if (!user) {
      if (this.prisma) {
        // Strict Directory Record Isolation: Corporate directory employees cannot log into UIMS
        const directoryRecord = await this.prisma.directoryUser.findFirst({
          where: {
            OR: [
              { email: { equals: clean, mode: 'insensitive' } },
              { employeeCode: { equals: clean, mode: 'insensitive' } },
            ],
          },
          select: { id: true, email: true, employeeCode: true, displayName: true },
        });

        if (directoryRecord) {
          await this.prisma.auditLog
            .create({
              data: {
                userName: clean,
                userEmail: directoryRecord.email,
                action: 'LOGIN_REJECTED_DIRECTORY_RECORD',
                severity: 'Warning',
                entity: 'Authentication',
                entityType: 'Security',
                ipAddress,
                status: 'Failed',
                details: `Authentication strictly rejected: identity ${clean} is a corporate directory record without application access privileges.`,
              },
            })
            .catch((error: unknown) => {
              this.logger.error(
                'Failed to record audit log for directory rejection',
                error instanceof Error ? error.stack : error,
              );
            });

          throw new UnauthorizedException(
            'Corporate directory accounts do not have application login privileges. Contact your system administrator for access.',
          );
        }

        await this.prisma.auditLog
          .create({
            data: {
              userName: clean,
              userEmail: clean.includes('@') ? clean : `${clean}@youngonevn.com`,
              action: 'LOGIN_FAILED',
              severity: 'Warning',
              entity: 'Authentication',
              entityType: 'Security',
              ipAddress,
              status: 'Failed',
              details: `Failed authentication attempt for non-existent identity: ${clean}`,
            },
          })
          .catch((error: unknown) => {
            this.logger.error(
              'Failed to record audit log for failed login',
              error instanceof Error ? error.stack : error,
            );
          });
      }
      return null;
    }

    if (user.status && user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        `Account is ${String(user.status).toLowerCase()}. Contact your system administrator.`,
      );
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Account is locked. Contact your system administrator.');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (isMatch) {
      const { passwordHash: _passwordHash, ...result } = user;
      return result;
    }

    if (this.prisma) {
      await this.prisma.auditLog
        .create({
          data: {
            userId: user.id,
            userName: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
            userEmail: user.email,
            action: 'LOGIN_FAILED',
            severity: 'Warning',
            entity: 'Authentication',
            entityType: 'Security',
            ipAddress,
            status: 'Failed',
            details: `Invalid password attempt for account: ${user.email}`,
          },
        })
        .catch((error: unknown) => {
          this.logger.error(
            'Failed to record audit log for invalid password attempt',
            error instanceof Error ? error.stack : error,
          );
        });
    }

    return null;
  }

  private async resolvePermissions(
    roleId?: string | null,
    roleName?: string | null,
  ): Promise<string[]> {
    const roleUpper = String(roleName || '')
      .trim()
      .toUpperCase();
    if (roleUpper === 'SUPER ADMIN' || roleUpper === 'SUPERADMIN') {
      return ['*:*'];
    }

    if (!this.prisma) {
      return [];
    }

    const role = await this.prisma.role.findFirst({
      where: {
        OR: [...(roleId ? [{ id: roleId }] : []), ...(roleName ? [{ name: roleName }] : [])],
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return [];
    }

    if (role.name.trim().toUpperCase() === 'SUPER ADMIN') {
      return ['*:*'];
    }

    return role.permissions.map((rp) => `${rp.permission.subject}:${rp.permission.action}`);
  }

  async login(loginDto: LoginDto, ipAddress = '127.0.0.1', userAgent = 'UIMS Client') {
    const user = await this.validateUser(loginDto.email, loginDto.password, ipAddress);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const rawRole = (user as { role?: { name?: string } | string; roleName?: string }).role;
    const role =
      (typeof rawRole === 'object' && rawRole !== null ? rawRole.name : undefined) ||
      (typeof rawRole === 'string' ? rawRole : undefined) ||
      (user as { roleName?: string }).roleName;
    if (!role) {
      throw new UnauthorizedException(
        'User account has no assigned role. Contact your system administrator.',
      );
    }
    const permissions = await this.resolvePermissions(user.roleId, role);

    const payload = {
      email: user.email,
      sub: user.id,
      role,
      permissions,
      username: user.username,
      type: 'access',
    };

    const refreshSecret =
      typeof this.configService?.getOrThrow === 'function'
        ? this.configService.getOrThrow<string>('JWT_REFRESH_SECRET')
        : this.configService?.get<string>('JWT_REFRESH_SECRET') || process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required');
    }

    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'refresh' },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    if (this.prisma) {
      const tokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      try {
        await this.prisma.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash,
            device: userAgent,
            ipAddress,
            expiresAt,
          },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to persist refresh token for user ${user.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      // Record successful login audit
      try {
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            userName: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
            userEmail: user.email,
            action: 'LOGIN_SUCCESS',
            severity: 'Info',
            entity: 'Authentication',
            entityType: 'Security',
            ipAddress,
            status: 'Success',
            details: `User ${user.email} successfully authenticated via secure token grant.`,
          },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record login audit log for user ${user.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      // Track active session in Redis
      if (this.redis) {
        try {
          const sessionKey = `uims:session:${user.id}`;
          await this.redis.set(
            sessionKey,
            {
              userId: user.id,
              tokenHash,
              device: userAgent,
              ipAddress,
              createdAt: new Date().toISOString(),
            },
            7 * 24 * 60 * 60,
          );
        } catch (error: unknown) {
          this.logger.warn(
            `Failed to record Redis session on login for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    return {
      token,
      accessToken: token,
      refreshToken,
      permissions,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
        role,
        permissions,
      },
    };
  }

  async refresh(
    userOrToken:
      | string
      | {
          id?: string;
          sub?: string;
          email?: string;
          username?: string;
          role?: string;
          name?: string;
          permissions?: string[];
          refreshToken?: string;
        },
    refreshTokenParam?: string,
    ipAddress = '127.0.0.1',
    userAgent = 'UIMS Client',
  ) {
    const refreshToken =
      typeof userOrToken === 'string'
        ? userOrToken
        : refreshTokenParam || userOrToken?.refreshToken;

    let userId =
      typeof userOrToken === 'object' && userOrToken !== null
        ? userOrToken.id || userOrToken.sub
        : undefined;

    const refreshSecret =
      typeof this.configService?.getOrThrow === 'function'
        ? this.configService.getOrThrow<string>('JWT_REFRESH_SECRET')
        : this.configService?.get<string>('JWT_REFRESH_SECRET') || process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required');
    }

    if (!userId && refreshToken) {
      try {
        const payload = this.jwtService.verify<{ sub?: string; id?: string; type?: string }>(
          refreshToken,
          { secret: refreshSecret },
        );
        if (payload.type && payload.type !== 'refresh') {
          throw new UnauthorizedException('Invalid token type for refresh');
        }
        userId = payload.sub || payload.id;
      } catch (error: unknown) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to verify refresh token in refresh: ${message}`);
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    if (this.prisma) {
      const freshUser = await this.prisma.appUser.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      if (!freshUser || freshUser.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          'Account is inactive, suspended, or revoked. Contact your system administrator.',
        );
      }

      if (freshUser.isLocked) {
        throw new UnauthorizedException('Account is locked. Contact your system administrator.');
      }

      let newRefreshToken: string | undefined;

      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);

        if (typeof this.prisma.refreshToken?.findUnique === 'function') {
          const existingToken = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
          });

          if (!existingToken) {
            throw new UnauthorizedException('Invalid or expired refresh token');
          }

          if (existingToken.isRevoked) {
            try {
              await this.prisma.refreshToken.updateMany({
                where: { userId: freshUser.id, isRevoked: false },
                data: { isRevoked: true },
              });
            } catch (error: unknown) {
              this.logger.error(
                `Failed to revoke refresh tokens on reuse detection for user ${freshUser.id}`,
                error instanceof Error ? error.stack : String(error),
              );
            }
            if (this.redis) {
              try {
                await this.redis.del(`uims:session:${freshUser.id}`);
              } catch (error: unknown) {
                this.logger.warn(
                  `Failed to clear Redis session for user ${freshUser.id}: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }
            this.logger.warn(
              `Refresh token reuse detected for user ${freshUser.id}. All active sessions invalidated.`,
            );
            throw new UnauthorizedException('Session has been revoked due to security violation');
          }

          if (existingToken.expiresAt.getTime() < Date.now()) {
            throw new UnauthorizedException('Refresh token has expired');
          }

          if (existingToken.userId !== freshUser.id) {
            throw new UnauthorizedException('Refresh token does not belong to user');
          }

          // Atomic check-and-update to prevent race condition reuse
          if (typeof this.prisma.refreshToken?.updateMany === 'function') {
            const updateResult = await this.prisma.refreshToken.updateMany({
              where: { id: existingToken.id, isRevoked: false },
              data: { isRevoked: true },
            });

            if (updateResult.count === 0) {
              // Concurrent race condition detected: another request already consumed this token
              try {
                await this.prisma.refreshToken.updateMany({
                  where: { userId: freshUser.id, isRevoked: false },
                  data: { isRevoked: true },
                });
              } catch (error: unknown) {
                this.logger.error(
                  `Failed to revoke refresh tokens on concurrent reuse detection for user ${freshUser.id}`,
                  error instanceof Error ? error.stack : String(error),
                );
              }
              if (this.redis) {
                try {
                  await this.redis.del(`uims:session:${freshUser.id}`);
                } catch (error: unknown) {
                  this.logger.warn(
                    `Failed to clear Redis session on concurrent reuse for user ${freshUser.id}: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }
              this.logger.warn(
                `Concurrent refresh token reuse detected for user ${freshUser.id}. All active sessions invalidated.`,
              );
              throw new UnauthorizedException('Session has been revoked due to security violation');
            }
          }
        }

        // Issue new rotated refresh token
        newRefreshToken = this.jwtService.sign(
          { sub: freshUser.id, email: freshUser.email, type: 'refresh' },
          {
            secret: refreshSecret,
            expiresIn: '7d',
          },
        );

        const newTokenHash = hashToken(newRefreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        if (typeof this.prisma.refreshToken?.create === 'function') {
          try {
            await this.prisma.refreshToken.create({
              data: {
                userId: freshUser.id,
                tokenHash: newTokenHash,
                device: userAgent,
                ipAddress,
                expiresAt,
              },
            });
          } catch (error: unknown) {
            this.logger.error(
              `Failed to persist rotated refresh token for user ${freshUser.id}`,
              error instanceof Error ? error.stack : String(error),
            );
          }
        }

        if (this.redis) {
          try {
            const sessionKey = `uims:session:${freshUser.id}`;
            await this.redis.set(
              sessionKey,
              {
                userId: freshUser.id,
                tokenHash: newTokenHash,
                device: userAgent,
                ipAddress,
                rotatedAt: new Date().toISOString(),
              },
              7 * 24 * 60 * 60,
            );
          } catch (error: unknown) {
            this.logger.warn(
              `Failed to update Redis session on refresh for user ${freshUser.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      const rawFreshRole = (freshUser as { role?: { name?: string } | string; roleName?: string })
        .role;
      const role =
        (typeof rawFreshRole === 'object' && rawFreshRole !== null
          ? rawFreshRole.name
          : undefined) ||
        (typeof rawFreshRole === 'string' ? rawFreshRole : undefined) ||
        (freshUser as { roleName?: string }).roleName;
      if (!role) {
        throw new UnauthorizedException(
          'User account has no assigned role. Contact your system administrator.',
        );
      }
      const permissions = await this.resolvePermissions(freshUser.roleId, role);

      const payload = {
        email: freshUser.email,
        sub: freshUser.id,
        role,
        permissions,
        username: freshUser.username,
        type: 'access',
      };
      const token = this.jwtService.sign(payload);

      return {
        token,
        accessToken: token,
        ...(newRefreshToken || refreshToken
          ? { refreshToken: newRefreshToken || refreshToken }
          : {}),
        permissions,
        user: {
          id: freshUser.id,
          username: freshUser.username,
          email: freshUser.email,
          name: freshUser.displayName || `${freshUser.firstName} ${freshUser.lastName}`.trim(),
          role,
          permissions,
        },
      };
    }

    const role =
      typeof userOrToken === 'object' && userOrToken !== null ? userOrToken.role : undefined;
    if (!role) {
      throw new UnauthorizedException(
        'User account has no assigned role. Contact your system administrator.',
      );
    }
    const permissions =
      (typeof userOrToken === 'object' && userOrToken !== null
        ? userOrToken.permissions
        : undefined) || [];
    const email =
      (typeof userOrToken === 'object' && userOrToken !== null ? userOrToken.email : undefined) ||
      '';
    const username =
      typeof userOrToken === 'object' && userOrToken !== null ? userOrToken.username : undefined;
    const payload = { email, sub: userId, role, permissions, username, type: 'access' };
    const token = this.jwtService.sign(payload);
    return {
      token,
      accessToken: token,
      ...(refreshToken ? { refreshToken } : {}),
      permissions,
      user: {
        ...(typeof userOrToken === 'object' && userOrToken !== null ? userOrToken : {}),
        id: userId,
        role,
        permissions,
      },
    };
  }

  async logout(userId: string) {
    if (this.prisma && userId) {
      try {
        await this.prisma.refreshToken.updateMany({
          where: { userId, isRevoked: false },
          data: { isRevoked: true },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to revoke refresh tokens on logout for user ${userId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    if (this.redis && userId) {
      try {
        await this.redis.del(`uims:session:${userId}`);
      } catch (error: unknown) {
        this.logger.warn(
          `Failed to clear Redis session on logout for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { success: true, message: 'Successfully logged out' };
  }
}
