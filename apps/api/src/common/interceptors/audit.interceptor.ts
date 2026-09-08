import * as crypto from 'node:crypto';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import dotenv from 'dotenv';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';
import { extractClientIp } from '../decorators/client-ip.decorator';

dotenv.config();
dotenv.config({ path: '../../.env' });

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'adInitialPassword',
  'apiKey',
  'privateKey',
  'creditCard',
  'cvv',
]);

function sanitizePayload(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const copy: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const key of Object.keys(copy)) {
    if (SENSITIVE_KEYS.has(key)) {
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

function computeAuditHash(
  timestamp: string,
  userId: string,
  action: string,
  entity: string,
  status: string,
  ip: string,
  payloadStr: string,
): string {
  const secret = process.env.AUDIT_SIGNING_KEY;
  if (!secret) {
    throw new Error('AUDIT_SIGNING_KEY is required for tamper-evident audit logging');
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}|${userId}|${action}|${entity}|${status}|${ip}|${payloadStr}`)
    .digest('hex');
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
    res: Response,
    method: string,
    path: string,
    durationMs: number,
  ): Promise<void> {
    try {
      const user = req.user;
      const entity = resolveEntityName(path);
      const action = resolveAction(method);
      const ipAddress = extractClientIp(req);
      const userAgent =
        typeof req.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
      const sanitizedBody = sanitizePayload(req.body);
      const timestampIso = new Date().toISOString();
      const userId = user?.id || user?.sub || 'SYSTEM';
      const statusCode = res.statusCode || 200;
      const status = statusCode >= 400 ? 'Failed' : 'Success';

      const payloadStr = sanitizedBody ? JSON.stringify(sanitizedBody) : '{}';
      const hash = computeAuditHash(
        timestampIso,
        userId,
        action,
        entity,
        status,
        ipAddress,
        payloadStr,
      );

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
          status,
          statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          hash,
          details: `${action} performed on ${entity} via ${method} ${path} (${statusCode})`,
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
    if (path.includes('/health')) {
      return next.handle();
    }

    const startTime = performance.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = performance.now() - startTime;
        void this.recordAudit(req, res, method, path, durationMs);
      }),
    );
  }
}
