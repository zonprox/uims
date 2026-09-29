import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtRefreshGuard, type RequestWithRefreshToken } from './jwt-refresh.guard';

describe('JwtRefreshGuard', () => {
  let guard: JwtRefreshGuard;
  let mockJwtService: { verify: ReturnType<typeof vi.fn> };
  let mockConfigService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockJwtService = {
      verify: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') {
          return 'test-refresh-secret-min-32-chars-long';
        }
        return undefined;
      }),
    };

    guard = new JwtRefreshGuard(
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
    );
  });

  const createMockContext = (req: Partial<RequestWithRefreshToken>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should extract refresh token from request body and validate successfully', () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'user-uuid-1',
      type: 'refresh',
      email: 'alex@uims.internal',
    });

    const req: Record<string, unknown> = {
      body: { refreshToken: 'valid-body-refresh-token' },
      headers: {},
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockJwtService.verify).toHaveBeenCalledWith('valid-body-refresh-token', {
      secret: 'test-refresh-secret-min-32-chars-long',
    });
    expect((req as RequestWithRefreshToken).refreshToken).toBe('valid-body-refresh-token');
    expect((req as RequestWithRefreshToken).user).toEqual({
      id: 'user-uuid-1',
      sub: 'user-uuid-1',
      email: 'alex@uims.internal',
    });
  });

  it('should extract refresh token from x-refresh-token header', () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'user-uuid-2',
      type: 'refresh',
    });

    const req: Record<string, unknown> = {
      body: {},
      headers: { 'x-refresh-token': 'valid-header-refresh-token' },
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect((req as RequestWithRefreshToken).refreshToken).toBe('valid-header-refresh-token');
    expect((req as RequestWithRefreshToken).user.id).toBe('user-uuid-2');
  });

  it('should extract refresh token from Authorization Bearer header', () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'user-uuid-3',
      type: 'refresh',
    });

    const req: Record<string, unknown> = {
      body: {},
      headers: { authorization: 'Bearer valid-auth-header-refresh-token' },
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect((req as RequestWithRefreshToken).refreshToken).toBe('valid-auth-header-refresh-token');
    expect((req as RequestWithRefreshToken).user.id).toBe('user-uuid-3');
  });

  it('should throw UnauthorizedException when no refresh token is provided anywhere', () => {
    const req: Record<string, unknown> = {
      body: {},
      headers: {},
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Refresh token is required'),
    );
  });

  it('should throw UnauthorizedException when token type is not refresh', () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'user-uuid-4',
      type: 'access', // Maliciously sending an access token as refresh token
    });

    const req: Record<string, unknown> = {
      body: { refreshToken: 'access-token-disguised-as-refresh' },
      headers: {},
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Invalid token type for refresh'),
    );
  });

  it('should throw UnauthorizedException when JWT verification fails or token is expired', () => {
    mockJwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const req: Record<string, unknown> = {
      body: { refreshToken: 'expired-refresh-token' },
      headers: {},
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Invalid or expired refresh token'),
    );
  });

  it('should extract refresh token from HTTP cookie when body and headers are omitted', () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'cookie-user-7',
      type: 'refresh',
      email: 'cookie@uims.internal',
    });

    const req: Record<string, unknown> = {
      body: {},
      headers: {},
      cookies: { refreshToken: 'cookie-refresh-token-val' },
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockJwtService.verify).toHaveBeenCalledWith('cookie-refresh-token-val', {
      secret: 'test-refresh-secret-min-32-chars-long',
    });
    expect((req as RequestWithRefreshToken).refreshToken).toBe('cookie-refresh-token-val');
    expect((req as RequestWithRefreshToken).user.id).toBe('cookie-user-7');
  });

  it('should prefer configService.getOrThrow and throw if secret is missing', () => {
    const configWithGetOrThrow = {
      getOrThrow: vi.fn().mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return undefined;
        return undefined;
      }),
    };
    const strictGuard = new JwtRefreshGuard(
      mockJwtService as unknown as JwtService,
      configWithGetOrThrow as unknown as ConfigService,
    );

    const req: Record<string, unknown> = {
      body: { refreshToken: 'some-token' },
      headers: {},
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    expect(() => strictGuard.canActivate(context)).toThrow(
      new UnauthorizedException('Server configuration error'),
    );
  });

  it('should extract refresh token from x-refresh-token when provided as a string array by a proxy', () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'array-user-1',
      type: 'refresh',
      email: 'array@uims.internal',
    });

    const req: Record<string, unknown> = {
      body: {},
      headers: {
        'x-refresh-token': ['array-header-token-1', 'array-header-token-2'],
      },
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect((req as RequestWithRefreshToken).refreshToken).toBe('array-header-token-1');
    expect((req as RequestWithRefreshToken).user.id).toBe('array-user-1');
  });

  it('should extract refresh token from authorization when provided as a string array by a proxy', () => {
    mockJwtService.verify.mockReturnValue({
      sub: 'array-user-2',
      type: 'refresh',
      email: 'auth-array@uims.internal',
    });

    const req: Record<string, unknown> = {
      body: {},
      headers: {
        authorization: ['Bearer array-bearer-token-1'],
      },
    };
    const context = createMockContext(req as unknown as RequestWithRefreshToken);

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect((req as RequestWithRefreshToken).refreshToken).toBe('array-bearer-token-1');
    expect((req as RequestWithRefreshToken).user.id).toBe('array-user-2');
  });
});
