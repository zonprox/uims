import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let mockPrisma: {
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
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

  it('should audit mutating POST requests with sanitized passwords', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/api/v1/users',
          user: { id: 'usr-1', name: 'Admin', email: 'admin@company.com' },
          body: {
            name: 'John Doe',
            password: 'SuperSecretPassword123!',
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

    // Wait a tick for async tap execution
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'usr-1',
          action: 'CREATE',
          entity: 'Users',
          ipAddress: '192.168.1.100',
          diffPayload: {
            name: 'John Doe',
            password: '[REDACTED]',
          },
        }),
      }),
    );
  });
});
