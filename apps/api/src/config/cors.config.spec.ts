import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLOUDFLARE_DEV_ORIGIN_REGEX,
  LOCAL_ORIGIN_REGEX,
  createCorsOriginValidator,
  DEFAULT_DEV_ORIGINS,
  getApiCorsOptions,
  getWebSocketCorsOptions,
  isOriginAllowed,
  resolveAllowedOrigins,
} from './cors.config';

describe('cors.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('CLOUDFLARE_DEV_ORIGIN_REGEX', () => {
    it('should match valid HTTPS Cloudflare quick tunnel subdomains', () => {
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://quick-tunnel-123.trycloudflare.com')).toBe(
        true,
      );
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://uims-dev-preview.trycloudflare.com')).toBe(
        true,
      );
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://a-b-c-123.trycloudflare.com')).toBe(true);
    });

    it('should reject unencrypted HTTP Cloudflare domains', () => {
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('http://quick-tunnel-123.trycloudflare.com')).toBe(
        false,
      );
    });

    it('should reject domains without subdomain label', () => {
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://trycloudflare.com')).toBe(false);
    });

    it('should reject domains with nested subdomains or invalid characters', () => {
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://sub.nested.trycloudflare.com')).toBe(false);
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://invalid_underscore.trycloudflare.com')).toBe(
        false,
      );
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://quick-tunnel.trycloudflare.com:8080')).toBe(
        false,
      );
    });

    it('should reject regex evasion attempts with suffix domains', () => {
      expect(
        CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://quick-tunnel.trycloudflare.com.attacker.com'),
      ).toBe(false);
      expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test('https://attacker-trycloudflare.com')).toBe(false);
    });
  });

  describe('LOCAL_ORIGIN_REGEX', () => {
    it('should match localhost, 127.0.0.1, and 0.0.0.0 with arbitrary custom ports', () => {
      expect(LOCAL_ORIGIN_REGEX.test('http://localhost:8080')).toBe(true);
      expect(LOCAL_ORIGIN_REGEX.test('https://localhost:5679')).toBe(true);
      expect(LOCAL_ORIGIN_REGEX.test('http://127.0.0.1:4000')).toBe(true);
      expect(LOCAL_ORIGIN_REGEX.test('https://127.0.0.1:8443')).toBe(true);
      expect(LOCAL_ORIGIN_REGEX.test('http://0.0.0.0:9000')).toBe(true);
      expect(LOCAL_ORIGIN_REGEX.test('http://localhost')).toBe(true);
      expect(LOCAL_ORIGIN_REGEX.test('https://127.0.0.1')).toBe(true);
    });

    it('should reject non-loopback domains and malformed local hosts', () => {
      expect(LOCAL_ORIGIN_REGEX.test('http://localhost.attacker.com')).toBe(false);
      expect(LOCAL_ORIGIN_REGEX.test('http://attacker.com:8080')).toBe(false);
      expect(LOCAL_ORIGIN_REGEX.test('https://evil-127.0.0.1.com')).toBe(false);
      expect(LOCAL_ORIGIN_REGEX.test('http://localhost:3000/api')).toBe(false);
    });
  });

  describe('resolveAllowedOrigins', () => {
    it('should return DEFAULT_DEV_ORIGINS in development when no env vars or options are provided', () => {
      delete process.env.CORS_ORIGIN;
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'development';

      const origins = resolveAllowedOrigins();
      expect(origins).toEqual(DEFAULT_DEV_ORIGINS);
    });

    it('should return DEFAULT_DEV_ORIGINS when nodeEnv option is development', () => {
      const origins = resolveAllowedOrigins({ nodeEnv: 'development' });
      expect(origins).toEqual(DEFAULT_DEV_ORIGINS);
    });

    it('should return empty array in production when no origins are configured (fail-safe)', () => {
      delete process.env.CORS_ORIGIN;
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const origins = resolveAllowedOrigins({ silent: true });
      expect(origins).toEqual([]);
    });

    it('should return empty array when nodeEnv is production and rawOrigins is empty or whitespace', () => {
      expect(
        resolveAllowedOrigins({ nodeEnv: 'production', rawOrigins: '', silent: true }),
      ).toEqual([]);
      expect(
        resolveAllowedOrigins({ nodeEnv: 'production', rawOrigins: '   ', silent: true }),
      ).toEqual([]);
      expect(
        resolveAllowedOrigins({ nodeEnv: 'production', rawOrigins: null, silent: true }),
      ).toEqual([]);
    });

    it('should parse single explicit origin from rawOrigins option', () => {
      const origins = resolveAllowedOrigins({ rawOrigins: 'https://uims.example.com' });
      expect(origins).toEqual(['https://uims.example.com']);
    });

    it('should parse comma-delimited origins, trimming whitespace and filtering empty entries', () => {
      const raw = 'https://app.uims.io,  https://admin.uims.io , , https://portal.uims.io, ';
      const origins = resolveAllowedOrigins({ rawOrigins: raw });
      expect(origins).toEqual([
        'https://app.uims.io',
        'https://admin.uims.io',
        'https://portal.uims.io',
      ]);
    });

    it('should prioritize explicit rawOrigins option over process.env', () => {
      process.env.CORS_ORIGIN = 'https://env.uims.io';
      const origins = resolveAllowedOrigins({ rawOrigins: 'https://explicit.uims.io' });
      expect(origins).toEqual(['https://explicit.uims.io']);
    });

    it('should read from process.env.CORS_ORIGIN when rawOrigins option is not provided', () => {
      process.env.CORS_ORIGIN = 'https://env-cors.uims.io, https://env-cors-2.uims.io';
      const origins = resolveAllowedOrigins();
      expect(origins).toEqual(['https://env-cors.uims.io', 'https://env-cors-2.uims.io']);
    });

    it('should fallback to process.env.ALLOWED_ORIGINS when CORS_ORIGIN is absent', () => {
      delete process.env.CORS_ORIGIN;
      process.env.ALLOWED_ORIGINS = 'https://allowed-1.uims.io, https://allowed-2.uims.io';
      const origins = resolveAllowedOrigins();
      expect(origins).toEqual(['https://allowed-1.uims.io', 'https://allowed-2.uims.io']);
    });

    it('should accept custom defaultDevOrigins in non-production environments', () => {
      const customDevOrigins = ['http://localhost:8080', 'http://localhost:8081'];
      const origins = resolveAllowedOrigins({
        nodeEnv: 'development',
        defaultDevOrigins: customDevOrigins,
      });
      expect(origins).toEqual(customDevOrigins);
    });

    it('should incorporate custom ports from WEB_PORT, PORT, VITE_PORT, APP_PORT in development', () => {
      process.env.WEB_PORT = '8080';
      process.env.PORT = '9090';
      process.env.VITE_PORT = '5173';
      process.env.APP_PORT = '4000';
      process.env.NODE_ENV = 'development';

      const origins = resolveAllowedOrigins();
      expect(origins).toContain('http://localhost:8080');
      expect(origins).toContain('https://localhost:8080');
      expect(origins).toContain('http://127.0.0.1:8080');
      expect(origins).toContain('http://localhost:9090');
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://localhost:4000');
    });
  });

  describe('isOriginAllowed', () => {
    it('should allow undefined or empty origin (server-to-server, cURL, health probes)', () => {
      expect(isOriginAllowed(undefined, ['https://app.uims.io'], false)).toBe(true);
      expect(isOriginAllowed(undefined, [], true)).toBe(true);
      expect(isOriginAllowed('', ['https://app.uims.io'], false)).toBe(true);
      expect(isOriginAllowed('', [], true)).toBe(true);
    });

    it('should allow origins present in allowedOrigins list in both dev and production', () => {
      const allowed = ['https://app.uims.io', 'https://admin.uims.io'];
      expect(isOriginAllowed('https://app.uims.io', allowed, false)).toBe(true);
      expect(isOriginAllowed('https://app.uims.io', allowed, true)).toBe(true);
      expect(isOriginAllowed('https://admin.uims.io', allowed, true)).toBe(true);
    });

    it('should disallow origins not present in allowedOrigins in production', () => {
      const allowed = ['https://app.uims.io'];
      expect(isOriginAllowed('https://evil.com', allowed, true)).toBe(false);
      expect(isOriginAllowed('http://localhost:5679', allowed, true)).toBe(false);
      expect(isOriginAllowed('http://localhost:3000', allowed, true)).toBe(false);
    });

    it('should allow valid Cloudflare preview tunnel in development', () => {
      expect(isOriginAllowed('https://my-preview-tunnel.trycloudflare.com', [], false)).toBe(true);
    });

    it('should strictly disallow Cloudflare preview tunnel in production unless explicitly in allowedOrigins', () => {
      expect(isOriginAllowed('https://my-preview-tunnel.trycloudflare.com', [], true)).toBe(false);

      expect(
        isOriginAllowed(
          'https://my-preview-tunnel.trycloudflare.com',
          ['https://my-preview-tunnel.trycloudflare.com'],
          true,
        ),
      ).toBe(true);
    });

    it('should reject insecure HTTP Cloudflare preview tunnel even in development', () => {
      expect(isOriginAllowed('http://my-preview-tunnel.trycloudflare.com', [], false)).toBe(false);
    });

    it('should reject malformed Cloudflare preview tunnel domains in development', () => {
      expect(isOriginAllowed('https://trycloudflare.com', [], false)).toBe(false);
      expect(isOriginAllowed('https://sub.sub.trycloudflare.com', [], false)).toBe(false);
      expect(isOriginAllowed('https://preview.trycloudflare.com.attacker.com', [], false)).toBe(
        false,
      );
    });

    it('should permit arbitrary custom ports on localhost, 127.0.0.1, and 0.0.0.0 in development', () => {
      expect(isOriginAllowed('http://localhost:8888', [], false)).toBe(true);
      expect(isOriginAllowed('https://localhost:9999', [], false)).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:4173', [], false)).toBe(true);
      expect(isOriginAllowed('https://127.0.0.1:8443', [], false)).toBe(true);
      expect(isOriginAllowed('http://0.0.0.0:3001', [], false)).toBe(true);
    });

    it('should reject unlisted custom localhost ports in production mode (fail-safe)', () => {
      expect(isOriginAllowed('http://localhost:8888', [], true)).toBe(false);
      expect(isOriginAllowed('http://127.0.0.1:4173', [], true)).toBe(false);
      expect(isOriginAllowed('http://0.0.0.0:3001', [], true)).toBe(false);
    });
  });

  describe('createCorsOriginValidator', () => {
    it('should invoke callback with (null, true) when origin is undefined', () => {
      const validator = createCorsOriginValidator(['https://app.uims.io'], false);
      const callback = vi.fn();

      validator(undefined, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should invoke callback with (null, true) when origin is allowed', () => {
      const validator = createCorsOriginValidator(['https://app.uims.io'], false);
      const callback = vi.fn();

      validator('https://app.uims.io', callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should invoke callback with Error and false when origin is disallowed', () => {
      const validator = createCorsOriginValidator(['https://app.uims.io'], true);
      const callback = vi.fn();

      validator('https://disallowed.com', callback);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Origin 'https://disallowed.com' is not allowed by CORS policy",
        }),
        false,
      );
    });
  });

  describe('getApiCorsOptions', () => {
    it('should return complete Express CORS configuration with standard security options', () => {
      const options = getApiCorsOptions({
        rawOrigins: 'https://app.uims.io',
        nodeEnv: 'production',
      });

      expect(options.credentials).toBe(true);
      expect(options.methods).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
      expect(options.allowedHeaders).toEqual([
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
      ]);
      expect(typeof options.origin).toBe('function');
    });

    it('should validate allowed and disallowed origins via the origin callback', () => {
      const options = getApiCorsOptions({
        rawOrigins: 'https://app.uims.io',
        nodeEnv: 'production',
      });
      const originFn = options.origin as (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => void;

      const allowedCb = vi.fn();
      originFn('https://app.uims.io', allowedCb);
      expect(allowedCb).toHaveBeenCalledWith(null, true);

      const disallowedCb = vi.fn();
      originFn('https://unauthorized.io', disallowedCb);
      expect(disallowedCb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Origin 'https://unauthorized.io' is not allowed by CORS policy",
        }),
        false,
      );
    });
  });

  describe('getWebSocketCorsOptions', () => {
    it('should return complete WebSocket CORS options with origin callback and credentials', () => {
      const options = getWebSocketCorsOptions({
        rawOrigins: 'https://app.uims.io',
        nodeEnv: 'production',
      });

      expect(options.credentials).toBe(true);
      expect(typeof options.origin).toBe('function');
    });

    it('should permit Cloudflare tunnel connections in development WebSocket configuration', () => {
      const options = getWebSocketCorsOptions({
        nodeEnv: 'development',
      });

      const cb = vi.fn();
      options.origin('https://quick-tunnel-xyz.trycloudflare.com', cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('should reject Cloudflare tunnel connections in production WebSocket configuration when unlisted', () => {
      const options = getWebSocketCorsOptions({
        nodeEnv: 'production',
        rawOrigins: '',
        silent: true,
      });

      const cb = vi.fn();
      options.origin('https://quick-tunnel-xyz.trycloudflare.com', cb);
      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Origin 'https://quick-tunnel-xyz.trycloudflare.com' is not allowed by CORS policy",
        }),
        false,
      );
    });
  });
});
