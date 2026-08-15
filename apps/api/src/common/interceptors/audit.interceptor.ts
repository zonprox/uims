import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';

function sanitizePayload(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const copy: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
  ];
  for (const key of Object.keys(copy)) {
    if (sensitiveKeys.includes(key)) {
      copy[key] = '[REDACTED]';
    } else if (typeof copy[key] === 'object' && copy[key] !== null) {
      copy[key] = sanitizePayload(copy[key]);
    }
  }
  return copy;
}

function resolveEntityName(path: string): string {
  const segments = path
    .replace(/^\/api\/v1\//, '')
    .split('/')
    .filter(Boolean);
  if (segments.length === 0) return 'System';
  const resource = segments[0];
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

function resolveAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PATCH':
    case 'PUT':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'READ';
  }
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  private async recordAudit(
    req: {
      user?: { id?: string; sub?: string; name?: string; email?: string };
      headers?: Record<string, string | Array<string> | undefined>;
      ip?: string;
      body?: unknown;
    },
    method: string,
    path: string,
  ): Promise<void> {
    try {
      const user = req.user;
      const entity = resolveEntityName(path);
      const action = resolveAction(method);
      const forwarded = req.headers?.['x-forwarded-for'];
      const rawIp =
        (typeof forwarded === 'string'
          ? forwarded
          : Array.isArray(forwarded)
            ? forwarded[0]
            : undefined) ||
        req.ip ||
        '127.0.0.1';
      const ipAddress = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
      const userAgent =
        typeof req.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
      const sanitizedBody = sanitizePayload(req.body);

      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || user?.sub || null,
          userName: user?.name || user?.email?.split('@')[0] || 'Authenticated User',
          userEmail: user?.email || 'admin@uims.internal',
          action,
          severity: action === 'DELETE' ? 'Warning' : 'Info',
          entity,
          entityType: entity,
          ipAddress,
          status: 'Success',
          details: `${action} performed on ${entity} via ${method} ${path}`,
          diffPayload: sanitizedBody
            ? (sanitizedBody as import('@prisma/client').Prisma.InputJsonValue)
            : undefined,
          userAgent: userAgent || null,
        },
      });
    } catch {
      // Prevent audit logging failures from crashing client response
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method ? req.method.toUpperCase() : 'GET';

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const path = req.url || '';
    if (path.includes('/health')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.recordAudit(req, method, path);
      }),
    );
  }
}
