import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export function extractClientIp(req: Partial<Request> | Record<string, unknown>): string {
  const headers = ((req as Request).headers || {}) as Record<string, string | string[] | undefined>;
  const forwarded = headers['x-forwarded-for'];

  if (typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    const firstIp = forwarded[0]?.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const expressReq = req as Request;
  if (expressReq.ip) {
    return expressReq.ip;
  }

  if (expressReq.socket?.remoteAddress) {
    return expressReq.socket.remoteAddress;
  }

  return '127.0.0.1';
}

export const ClientIP = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return extractClientIp(request);
});
