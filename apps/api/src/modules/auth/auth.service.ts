import * as crypto from 'node:crypto';
import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
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
  ): Promise<Omit<import('@prisma/client').User, 'passwordHash'> | null> {
    const clean = identifier.trim().toLowerCase();
    const user = await this.usersService.findByIdentifier(clean);
    if (!user) {
      if (this.prisma) {
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
          .catch(() => {});
      }
      return null;
    }

    if (user.status && user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        `Account is ${String(user.status).toLowerCase()}. Please contact your IT administrator.`,
      );
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
        .catch(() => {});
    }

    return null;
  }

  async login(loginDto: LoginDto, ipAddress = '127.0.0.1', userAgent = 'UIMS Client') {
    const user = await this.validateUser(loginDto.email, loginDto.password, ipAddress);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const role = user.roleName || 'Employee';
    const payload = {
      email: user.email,
      sub: user.id,
      role,
      username: user.username,
      type: 'access',
    };

    const token = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret:
          this.configService?.get<string>('JWT_REFRESH_SECRET') ||
          process.env.JWT_REFRESH_SECRET ||
          'uims-refresh-secret-2026',
        expiresIn: '7d',
      },
    );

    if (this.prisma) {
      const tokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.prisma.refreshToken
        .create({
          data: {
            userId: user.id,
            tokenHash,
            device: userAgent,
            ipAddress,
            expiresAt,
          },
        })
        .catch(() => {});

      // Record successful login audit
      await this.prisma.auditLog
        .create({
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
        })
        .catch(() => {});
    }

    return {
      token,
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
        role,
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
  }) {
    const userId = user.id || user.sub;
    if (!userId) {
      throw new UnauthorizedException('Invalid token claims');
    }

    if (this.prisma) {
      const freshUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });

      if (!freshUser || freshUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is inactive, suspended, or revoked.');
      }

      const role = freshUser.roleName || freshUser.role?.name || 'Employee';
      const payload = {
        email: freshUser.email,
        sub: freshUser.id,
        role,
        username: freshUser.username,
        type: 'access',
      };
      const token = this.jwtService.sign(payload);

      return {
        token,
        accessToken: token,
        user: {
          id: freshUser.id,
          username: freshUser.username,
          email: freshUser.email,
          name: freshUser.displayName || `${freshUser.firstName} ${freshUser.lastName}`.trim(),
          role,
        },
      };
    }

    const role = user.role || 'Employee';
    const payload = { email: user.email, sub: userId, role, username: user.username };
    const token = this.jwtService.sign(payload);
    return {
      token,
      accessToken: token,
      user: {
        ...user,
        role,
      },
    };
  }

  async logout(userId: string) {
    if (this.prisma && userId) {
      await this.prisma.refreshToken
        .updateMany({
          where: { userId, isRevoked: false },
          data: { isRevoked: true },
        })
        .catch(() => {});
    }
    return { success: true, message: 'Logged out successfully' };
  }
}
