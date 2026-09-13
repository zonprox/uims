import { Logger } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const logger = new Logger('CorsConfig');

/**
 * Standard development origins permitted during local development.
 */
export const DEFAULT_DEV_ORIGINS: readonly string[] = [
  'http://localhost:5679',
  'https://localhost:5679',
  'http://localhost:3000',
  'http://localhost:3002',
];

/**
 * Strict regular expression matching secure Cloudflare quick tunnel subdomains.
 * ONLY evaluated in non-production environments.
 * Must begin with https:// and contain a valid alphanumeric/hyphen subdomain label.
 */
export const CLOUDFLARE_DEV_ORIGIN_REGEX = /^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/;

/**
 * Regular expression matching localhost, 127.0.0.1, or 0.0.0.0 loopback origins with any custom port.
 * Evaluated in non-production environments to permit running with arbitrary custom ports.
 */
export const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/;
export const LOCAL_DEV_ORIGIN_REGEX = LOCAL_ORIGIN_REGEX;

export interface CorsResolutionOptions {
  /**
   * Explicit comma-delimited origin string (e.g. from CORS_ORIGIN or ALLOWED_ORIGINS).
   * Overrides environment variable inspection if provided.
   */
  rawOrigins?: string | null;

  /**
   * Target environment string (e.g. 'development', 'production', 'test').
   * Defaults to process.env.NODE_ENV or 'development'.
   */
  nodeEnv?: string;

  /**
   * Custom fallback origins for non-production environments when rawOrigins is unset.
   * Defaults to DEFAULT_DEV_ORIGINS.
   */
  defaultDevOrigins?: readonly string[];

  /**
   * If true, suppresses logger warning when CORS_ORIGIN is unset in production.
   */
  silent?: boolean;
}

/**
 * Standard callback signature for Express and Socket.IO CORS origin validators.
 */
export type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

/**
 * Return type for getWebSocketCorsOptions() providing full type safety
 * and compatibility with NestJS @WebSocketGateway({ cors: ... }).
 */
export interface WebSocketCorsOptions {
  origin: (origin: string | undefined, callback: CorsOriginCallback) => void;
  credentials: true;
}

/**
 * Resolves allowed CORS origins based on environment configuration.
 *
 * Rules:
 * 1. If explicit rawOrigins (or CORS_ORIGIN / ALLOWED_ORIGINS env var) is provided and non-empty,
 *    it is split by comma, trimmed, and returned.
 * 2. In production mode (NODE_ENV === 'production') with no explicit origins,
 *    returns an empty array [] (fail-safe defense in depth; zero localhost leak).
 * 3. In non-production mode with no explicit origins, returns defaultDevOrigins.
 */
export function resolveAllowedOrigins(options?: CorsResolutionOptions): string[] {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const rawOrigins =
    options?.rawOrigins !== undefined
      ? options.rawOrigins
      : process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;

  if (rawOrigins && rawOrigins.trim().length > 0) {
    return rawOrigins
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  if (isProduction) {
    if (!options?.silent) {
      logger.warn(
        'CORS_ORIGIN is not configured in production mode. Browser requests will be blocked.',
      );
    }
    return [];
  }

  if (options?.defaultDevOrigins) {
    return [...options.defaultDevOrigins];
  }

  const devOrigins = [...DEFAULT_DEV_ORIGINS];
  const customPorts = [
    process.env.WEB_PORT,
    process.env.PORT,
    process.env.VITE_PORT,
    process.env.APP_PORT,
  ].filter((p): p is string => Boolean(p && p.trim().length > 0));

  for (const port of customPorts) {
    const httpOrigin = `http://localhost:${port}`;
    const httpsOrigin = `https://localhost:${port}`;
    const ipHttpOrigin = `http://127.0.0.1:${port}`;
    const ipHttpsOrigin = `https://127.0.0.1:${port}`;
    if (!devOrigins.includes(httpOrigin)) devOrigins.push(httpOrigin);
    if (!devOrigins.includes(httpsOrigin)) devOrigins.push(httpsOrigin);
    if (!devOrigins.includes(ipHttpOrigin)) devOrigins.push(ipHttpOrigin);
    if (!devOrigins.includes(ipHttpsOrigin)) devOrigins.push(ipHttpsOrigin);
  }

  return devOrigins;
}

/**
 * Evaluates whether a given request origin header is permitted.
 *
 * Rules:
 * 1. Missing or undefined origin (non-browser requests: mobile, cURL, server-to-server, health checks) -> allowed.
 * 2. Origin exactly matches an item in allowedOrigins or wildcard '*' -> allowed.
 * 3. In non-production environments ONLY, origin matches CLOUDFLARE_DEV_ORIGIN_REGEX -> allowed.
 * 4. In non-production environments ONLY, origin matches LOCAL_ORIGIN_REGEX (allowing any custom port on localhost, 127.0.0.1, or 0.0.0.0) -> allowed.
 * 5. Otherwise -> denied.
 */
export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: readonly string[],
  isProduction: boolean = process.env.NODE_ENV === 'production',
): boolean {
  // Allow requests without Origin header (e.g. mobile apps, cURL, server-to-server, health probes)
  if (!origin) {
    return true;
  }

  // Exact match in allowed origins list or wildcard
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    return true;
  }

  // Allow Cloudflare quick tunnel preview domains ONLY in non-production environments
  if (!isProduction && CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)) {
    return true;
  }

  // Allow any custom port on localhost, 127.0.0.1, or 0.0.0.0 in non-production environments
  if (!isProduction && LOCAL_ORIGIN_REGEX.test(origin)) {
    return true;
  }

  return false;
}

/**
 * Creates a standard CORS origin validation callback function compatible with Express and Socket.IO.
 * Invokes callback(null, true) if allowed, or callback(new Error(...), false) if rejected.
 */
export function createCorsOriginValidator(
  allowedOrigins: readonly string[] = resolveAllowedOrigins(),
  isProduction: boolean = process.env.NODE_ENV === 'production',
): (origin: string | undefined, callback: CorsOriginCallback) => void {
  return (origin: string | undefined, callback: CorsOriginCallback): void => {
    if (isOriginAllowed(origin, allowedOrigins, isProduction)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin '${origin}' is not allowed by CORS policy`), false);
  };
}

/**
 * Returns complete Express CORS options for NestJS app.enableCors().
 */
export function getApiCorsOptions(options?: CorsResolutionOptions): CorsOptions {
  const allowedOrigins = resolveAllowedOrigins(options);
  const isProduction = (options?.nodeEnv ?? process.env.NODE_ENV) === 'production';

  return {
    origin: createCorsOriginValidator(allowedOrigins, isProduction),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  };
}

/**
 * Returns complete WebSocket Gateway CORS options for @WebSocketGateway({ cors: ... }).
 */
export function getWebSocketCorsOptions(options?: CorsResolutionOptions): WebSocketCorsOptions {
  const allowedOrigins = resolveAllowedOrigins(options);
  const isProduction = (options?.nodeEnv ?? process.env.NODE_ENV) === 'production';

  return {
    origin: createCorsOriginValidator(allowedOrigins, isProduction),
    credentials: true,
  };
}
