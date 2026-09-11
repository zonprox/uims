import * as crypto from 'node:crypto';
import { Injectable, Logger, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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
              userEmail: clean.includes('@') ? clean : `${clean}@uims.internal`,
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
      this.configService?.get<string>('JWT_REFRESH_SECRET') || process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is required');
    }

    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
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
        this.logger.error(`Failed to persist refresh token for user ${user.id}: ${error}`);
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
        this.logger.error(`Failed to record login audit log for user ${user.id}: ${error}`);
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

  async refresh(user: {
    id?: string;
    sub?: string;
    email: string;
    username?: string;
    role?: string;
    name?: string;
    permissions?: string[];
  }) {
    const userId = user.id || user.sub;
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

    const role = user.role;
    if (!role) {
      throw new UnauthorizedException(
        'User account has no assigned role. Contact your system administrator.',
      );
    }
    const permissions = user.permissions || [];
    const payload = { email: user.email, sub: userId, role, permissions, username: user.username };
    const token = this.jwtService.sign(payload);
    return {
      token,
      accessToken: token,
      permissions,
      user: {
        ...user,
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
        this.logger.error(`Failed to revoke refresh tokens on logout for user ${userId}: ${error}`);
      }
    }
    return { success: true, message: 'Successfully logged out' };
  }
}
