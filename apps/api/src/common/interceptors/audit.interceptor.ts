import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';
import { extractClientIp } from '../decorators/client-ip.decorator';

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'token',
  'secret',
  'apikey',
  'privatekey',
  'creditcard',
  'cvv',
  'auth',
  'authorization',
  'credential',
  'sessionid',
  'ssn',
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function sanitizePayload(
  obj: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
  maxDepth = 8,
): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (obj instanceof Date) return obj.toISOString();
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) return '[BINARY BUFFER]';
  if (obj instanceof Uint8Array) return '[BINARY DATA]';

  if (depth >= maxDepth) return '[TRUNCATED]';

  if (seen.has(obj)) {
    return '[CIRCULAR]';
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item, seen, depth + 1, maxDepth));
  }

  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      copy[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      copy[key] = sanitizePayload(value, seen, depth + 1, maxDepth);
    } else {
      copy[key] = value;
    }
  }
  return copy;
}

const EXCLUDED_AUDIT_RESOURCES = new Set(['health', 'auth', 'audit', 'settings', 'notifications']);

function extractResource(path: string): string {
  const cleanPath = path.split('?')[0];
  const segments = cleanPath
    .replace(/^\/api(\/v\d+)?\//, '')
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean);
  return segments[0]?.toLowerCase() || '';
}

function resolveEntityName(path: string): string {
  const resource = extractResource(path);
  if (!resource) return 'System';
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
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  private async recordAudit(
    req: {
      user?: { id?: string; sub?: string; name?: string; email?: string };
      headers?: Record<string, string | Array<string> | undefined>;
      ip?: string;
      body?: unknown;
    },
    _res: Response,
    method: string,
    path: string,
    durationMs: number,
    statusCode = 200,
  ): Promise<void> {
    try {
      const user = req.user;
      const entity = resolveEntityName(path);
      const action = resolveAction(method);
      const ipAddress = extractClientIp(req);
      const userAgent =
        typeof req.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
      const sanitizedBody = sanitizePayload(req.body);
      const status = statusCode >= 400 ? 'Failed' : 'Success';
      const severity =
        statusCode >= 500
          ? 'Critical'
          : statusCode >= 400 || action === 'DELETE'
            ? 'Warning'
            : 'Info';

      await this.prisma.auditLog.create({
        data: {
          userId: user?.id || user?.sub || null,
          userName:
            user?.name ||
            user?.email?.split('@')[0] ||
            (user ? 'Authenticated User' : 'System Engine'),
          userEmail: user?.email || (user ? undefined : 'system@youngonevn.com'),
          action,
          severity,
          entity,
          entityType: entity,
          ipAddress,
          status,
          statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          details: `${action} performed on ${entity} via ${method} ${path} (${statusCode})`,
          diffPayload: sanitizedBody
            ? (sanitizedBody as import('@prisma/client').Prisma.InputJsonValue)
            : undefined,
          userAgent: userAgent || null,
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to persist activity log record for action "${method}" on path "${path}": ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest ? http.getRequest() : {};
    const res =
      (typeof http.getResponse === 'function' ? http.getResponse<Response>() : null) ||
      ({ statusCode: 200 } as Response);
    const method = req && req.method ? req.method.toUpperCase() : 'GET';

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const path = req.url || '';
    const resource = extractResource(path);
    if (!resource || EXCLUDED_AUDIT_RESOURCES.has(resource)) {
      return next.handle();
    }

    const startTime = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = performance.now() - startTime;
          const statusCode = res.statusCode || 200;
          this.recordAudit(req, res, method, path, durationMs, statusCode).catch((err: unknown) => {
            this.logger.error(
              `Failed to record activity log on success: ${err instanceof Error ? err.message : String(err)}`,
              err instanceof Error ? err.stack : undefined,
            );
          });
        },
        error: (error: unknown) => {
          const durationMs = performance.now() - startTime;
          const statusCode =
            error &&
            typeof error === 'object' &&
            'getStatus' in error &&
            typeof (error as { getStatus: () => number }).getStatus === 'function'
              ? (error as { getStatus: () => number }).getStatus()
              : res.statusCode >= 400
                ? res.statusCode
                : 500;
          this.recordAudit(req, res, method, path, durationMs, statusCode).catch((err: unknown) => {
            this.logger.error(
              `Failed to record activity log on error: ${err instanceof Error ? err.message : String(err)}`,
              err instanceof Error ? err.stack : undefined,
            );
          });
        },
      }),
    );
  }
}
