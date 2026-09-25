import { HttpException, type CallHandler, type ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditInterceptor, sanitizePayload } from './audit.interceptor';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let mockPrisma: {
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    delete process.env.AUDIT_SIGNING_KEY;
    mockPrisma = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };
    interceptor = new AuditInterceptor(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  it('should ignore non-mutating GET requests', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/api/v1/assets',
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ data: 'ok' }),
    } as CallHandler;

    const result = await new Promise((resolve) => {
      interceptor.intercept(context, next).subscribe(resolve);
    });

    expect(result).toEqual({ data: 'ok' });
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('should audit mutating POST requests with sanitized passwords without requiring AUDIT_SIGNING_KEY', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/api/v1/users',
          user: { id: 'usr-1', name: 'Admin', email: 'admin@company.com' },
          body: {
            name: 'John Doe',
            password: 'SuperSecretPassword123!',
            api_key: 'sk_live_12345678901234567890',
            meta: {
              token: 'bearer-jwt-token-string',
              normalField: 'visible-value',
            },
          },
          headers: {
            'user-agent': 'Vitest-Agent/1.0',
            'x-forwarded-for': '192.168.1.100',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ success: true }),
    } as CallHandler;

    await new Promise((resolve) => {
      interceptor.intercept(context, next).subscribe(resolve);
    });

    // Wait for async tap execution
    await vi.waitFor(() => {
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'usr-1',
          action: 'CREATE',
          entity: 'Users',
          ipAddress: '192.168.1.100',
          status: 'Success',
          statusCode: 200,
          diffPayload: {
            name: 'John Doe',
            password: '[REDACTED]',
            api_key: '[REDACTED]',
            meta: {
              token: '[REDACTED]',
              normalField: 'visible-value',
            },
          },
        }),
      }),
    );
  });

  it('should capture failed mutating requests with error status code', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'DELETE',
          url: '/api/v1/assets/ast-123',
          user: { id: 'usr-2', name: 'Operator', email: 'op@company.com' },
          headers: {
            'user-agent': 'Vitest-Agent/1.0',
            'x-forwarded-for': '10.0.0.5',
          },
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => throwError(() => new HttpException('Asset is currently checked out', 400)),
    } as CallHandler;

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, next).subscribe({
        error: () => resolve(),
      });
    });

    await vi.waitFor(() => {
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'usr-2',
          action: 'DELETE',
          entity: 'Assets',
          status: 'Failed',
          statusCode: 400,
          severity: 'Warning',
        }),
      }),
    );
  });

  it('should ignore mutating requests to excluded routes (auth, audit, settings, notifications, health)', async () => {
    const excludedUrls = [
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/audit',
      '/api/v1/settings/general',
      '/api/v1/notifications/123/read',
      '/api/v1/health',
    ];

    for (const url of excludedUrls) {
      mockPrisma.auditLog.create.mockClear();

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url,
            body: { test: 'payload' },
          }),
        }),
      } as unknown as ExecutionContext;

      const next = {
        handle: () => of({ success: true }),
      } as CallHandler;

      await new Promise((resolve) => {
        interceptor.intercept(context, next).subscribe(resolve);
      });

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    }
  });

  it('should sanitize arrays and deep nested payloads', () => {
    const input = [
      { id: 1, password: 'secret', note: 'safe' },
      { id: 2, clientSecret: 'sensitive', list: [{ token: 'abc', val: 123 }] },
    ];
    const sanitized = sanitizePayload(input);
    expect(sanitized).toEqual([
      { id: 1, password: '[REDACTED]', note: 'safe' },
      { id: 2, clientSecret: '[REDACTED]', list: [{ token: '[REDACTED]', val: 123 }] },
    ]);
  });
});
