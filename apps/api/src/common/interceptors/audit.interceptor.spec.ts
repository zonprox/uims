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

  it('should safely handle circular references without stack overflow', () => {
    const circularObj: Record<string, unknown> = {
      name: 'Recursive Node',
      secretToken: 'super-secret',
    };
    circularObj.self = circularObj;

    const sanitized = sanitizePayload(circularObj) as Record<string, unknown>;
    expect(sanitized.name).toBe('Recursive Node');
    expect(sanitized.secretToken).toBe('[REDACTED]');
    expect(sanitized.self).toBe('[CIRCULAR]');
  });

  it('should truncate deeply nested objects beyond maximum depth', () => {
    let deep: Record<string, unknown> = { depth: 10, password: 'xyz' };
    for (let i = 9; i >= 0; i--) {
      deep = { level: i, next: deep };
    }

    const sanitized = sanitizePayload(deep) as Record<string, unknown>;
    expect(sanitized).toBeDefined();
    // Verify it traversed safely without call stack overflow
    let current = sanitized;
    let depthCount = 0;
    while (current && typeof current === 'object' && 'next' in current) {
      depthCount++;
      if (typeof current.next === 'string') {
        expect(current.next).toBe('[TRUNCATED]');
        break;
      }
      current = current.next as Record<string, unknown>;
    }
    expect(depthCount).toBeLessThanOrEqual(9);
  });

  it('should preserve Date instances as ISO strings and handle Buffer/binary payloads', () => {
    const testDate = new Date('2026-09-25T12:00:00.000Z');
    const testBuf = Buffer.from('binary-data');
    const testUint8 = new Uint8Array([1, 2, 3]);

    const input = {
      createdAt: testDate,
      rawBuffer: testBuf,
      binaryData: testUint8,
      apiKey: 'secret-key-123',
    };

    const sanitized = sanitizePayload(input) as Record<string, unknown>;
    expect(sanitized.createdAt).toBe('2026-09-25T12:00:00.000Z');
    expect(sanitized.rawBuffer).toBe('[BINARY BUFFER]');
    expect(sanitized.binaryData).toBe('[BINARY DATA]');
    expect(sanitized.apiKey).toBe('[REDACTED]');
  });

  it('should avoid false-positive redaction on author, authorId, authority while redacting sensitive auth tokens/keys', () => {
    const input = {
      author: 'John Doe',
      authorId: 'usr-123',
      authority: 'APAC Headquarters',
      auth: 'secret-token',
      auth_key: 'key-456',
      authHeader: 'Bearer token-789',
    };

    const sanitized = sanitizePayload(input) as Record<string, unknown>;
    expect(sanitized.author).toBe('John Doe');
    expect(sanitized.authorId).toBe('usr-123');
    expect(sanitized.authority).toBe('APAC Headquarters');
    expect(sanitized.auth).toBe('[REDACTED]');
    expect(sanitized.auth_key).toBe('[REDACTED]');
    expect(sanitized.authHeader).toBe('[REDACTED]');
  });

  it('should safely serialize invalid Date instances as null without throwing RangeError', () => {
    const input = {
      validDate: new Date('2026-09-25T12:00:00.000Z'),
      invalidDate: new Date('invalid-time-value'),
      nanDate: new Date(Number.NaN),
    };

    const sanitized = sanitizePayload(input) as Record<string, unknown>;
    expect(sanitized.validDate).toBe('2026-09-25T12:00:00.000Z');
    expect(sanitized.invalidDate).toBeNull();
    expect(sanitized.nanDate).toBeNull();
  });

  it('should ensure database error in audit logging does not fail the primary business request (error isolation)', async () => {
    mockPrisma.auditLog.create.mockRejectedValue(new Error('Postgres connection pool exhausted'));

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/api/v1/assets',
          user: { id: 'usr-1', email: 'admin@company.com' },
          body: { name: 'Switch-01' },
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ success: true, data: { id: 'asset-created' } }),
    } as CallHandler;

    let responseResult: unknown;
    await new Promise((resolve) => {
      interceptor.intercept(context, next).subscribe({
        next: (val) => {
          responseResult = val;
          resolve(val);
        },
      });
    });

    // Verify primary request completed successfully despite audit log write rejection
    expect(responseResult).toEqual({ success: true, data: { id: 'asset-created' } });
    await vi.waitFor(() => {
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
