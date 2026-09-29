import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface RefreshTokenPayload {
  sub: string;
  type?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface RequestWithRefreshToken extends Request {
  user: {
    id: string;
    sub: string;
    email?: string;
  };
  refreshToken: string;
}

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  private readonly logger = new Logger(JwtRefreshGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithRefreshToken>();

    // 1. Extract refresh token from body, x-refresh-token header, Authorization Bearer header, or HTTP cookie
    const bodyToken =
      typeof request.body === 'object' &&
      request.body !== null &&
      typeof (request.body as { refreshToken?: unknown }).refreshToken === 'string'
        ? (request.body as { refreshToken: string }).refreshToken.trim()
        : undefined;

    const rawCustomHeader = request.headers['x-refresh-token'];
    const customHeaderToken =
      typeof rawCustomHeader === 'string'
        ? rawCustomHeader.trim()
        : Array.isArray(rawCustomHeader) && typeof rawCustomHeader[0] === 'string'
          ? rawCustomHeader[0].trim()
          : undefined;

    const rawAuthHeader = request.headers.authorization as string | string[] | undefined;
    const authHeader =
      typeof rawAuthHeader === 'string'
        ? rawAuthHeader.trim()
        : Array.isArray(rawAuthHeader) && typeof rawAuthHeader[0] === 'string'
          ? rawAuthHeader[0].trim()
          : undefined;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : undefined;

    const cookieToken =
      typeof (request as unknown as { cookies?: Record<string, unknown> }).cookies?.refreshToken ===
      'string'
        ? (request as unknown as { cookies: Record<string, string> }).cookies.refreshToken.trim()
        : undefined;

    const refreshToken = bodyToken || customHeaderToken || bearerToken || cookieToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // 2. Validate against configured JWT_REFRESH_SECRET
    const refreshSecret =
      typeof this.configService?.getOrThrow === 'function'
        ? this.configService.getOrThrow<string>('JWT_REFRESH_SECRET')
        : this.configService?.get<string>('JWT_REFRESH_SECRET') || process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      this.logger.error(
        'JWT_REFRESH_SECRET is not configured for refresh token validation',
        new Error('Missing JWT_REFRESH_SECRET configuration').stack,
      );
      throw new UnauthorizedException('Server configuration error');
    }

    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: refreshSecret,
      });

      if (payload.type && payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type for refresh');
      }

      const userId = payload.sub;
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      request.refreshToken = refreshToken;
      request.user = {
        id: userId.trim(),
        sub: userId.trim(),
        email: typeof payload.email === 'string' ? payload.email.trim() : undefined,
      };

      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Refresh token validation failed: ${message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
