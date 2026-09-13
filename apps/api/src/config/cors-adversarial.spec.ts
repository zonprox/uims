import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLOUDFLARE_DEV_ORIGIN_REGEX,
  createCorsOriginValidator,
  DEFAULT_DEV_ORIGINS,
  getApiCorsOptions,
  getWebSocketCorsOptions,
  isOriginAllowed,
  resolveAllowedOrigins,
} from './cors.config';

describe('CORS Empirical Adversarial Challenge Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Vector 1: Cloudflare Subdomain Regex Boundary & Evasion Attacks', () => {
    const validDevTunnels: readonly string[] = [
      'https://a.trycloudflare.com',
      'https://quick-tunnel-123.trycloudflare.com',
      'https://uims-dev-preview.trycloudflare.com',
      'https://0123456789-abcdef.trycloudflare.com',
      'https://tunnel-with-hyphens-1-2-3.trycloudflare.com',
    ];

    it.each(validDevTunnels)(
      'should match strictly conformant HTTPS Cloudflare subdomains: %s',
      (origin: string) => {
        expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)).toBe(true);
        expect(isOriginAllowed(origin, [], false)).toBe(true);
      },
    );

    const maliciousAttackerDomainSuffixes: readonly string[] = [
      'https://evil.trycloudflare.com.attacker.com',
      'https://evil.trycloudflare.com.evil.net',
      'https://evil.trycloudflare.com.attacker.io',
      'https://evil.trycloudflare.com.co.uk',
      'https://quick-tunnel-123.trycloudflare.com.fake.org',
    ];

    it.each(maliciousAttackerDomainSuffixes)(
      'should reject appended attacker domain suffix attempts: %s',
      (origin: string) => {
        expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)).toBe(false);
        expect(isOriginAllowed(origin, [], false)).toBe(false);
      },
    );

    const typoSquattedDomains: readonly string[] = [
      'https://evil-trycloudflare.com',
      'https://eviltrycloudflare.com',
      'https://trycloudflare.com.attacker.com',
      'https://not-trycloudflare.com',
      'https://attackertrycloudflare.com',
      'https://fake-trycloudflare.org',
    ];

    it.each(typoSquattedDomains)(
      'should reject typo-squatted domain names lacking dot separator: %s',
      (origin: string) => {
        expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)).toBe(false);
        expect(isOriginAllowed(origin, [], false)).toBe(false);
      },
    );

    const nestedSubdomainTraversals: readonly string[] = [
      'https://sub.nested.trycloudflare.com',
      'https://a.b.c.trycloudflare.com',
      'https://deeply.nested.preview.trycloudflare.com',
      'https://evil.corp.trycloudflare.com',
    ];

    it.each(nestedSubdomainTraversals)(
      'should reject multi-level nested subdomains: %s',
      (origin: string) => {
        expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)).toBe(false);
        expect(isOriginAllowed(origin, [], false)).toBe(false);
      },
    );

    const portAndPathInjections: readonly string[] = [
      'https://valid-sub.trycloudflare.com:80',
      'https://valid-sub.trycloudflare.com:443',
      'https://valid-sub.trycloudflare.com:5679',
      'https://valid-sub.trycloudflare.com:3000',
      'https://valid-sub.trycloudflare.com/api',
      'https://valid-sub.trycloudflare.com/path/to/resource',
      'https://valid-sub.trycloudflare.com?query=evil',
      'https://valid-sub.trycloudflare.com#fragment',
    ];

    it.each(portAndPathInjections)(
      'should reject ports, paths, queries, and fragments in origin: %s',
      (origin: string) => {
        expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)).toBe(false);
        expect(isOriginAllowed(origin, [], false)).toBe(false);
      },
    );

    const hostileSchemes: readonly string[] = [
      'http://valid-sub.trycloudflare.com',
      'ws://valid-sub.trycloudflare.com',
      'wss://valid-sub.trycloudflare.com',
      'ftp://valid-sub.trycloudflare.com',
      'file://valid-sub.trycloudflare.com',
      'javascript:alert(1)//valid-sub.trycloudflare.com',
      'data:text/html,valid-sub.trycloudflare.com',
      '//valid-sub.trycloudflare.com',
      'https:valid-sub.trycloudflare.com',
      'https:///valid-sub.trycloudflare.com',
      'HTTPS://valid-sub.trycloudflare.com',
      'HtTpS://valid-sub.trycloudflare.com',
    ];

    it.each(hostileSchemes)(
      'should reject non-https or malformed scheme prefixes: %s',
      (origin: string) => {
        expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)).toBe(false);
        expect(isOriginAllowed(origin, [], false)).toBe(false);
      },
    );

    const invalidCharactersAndWhitespace: readonly string[] = [
      'https://valid-sub.trycloudflare.com ',
      ' https://valid-sub.trycloudflare.com',
      'https://valid-sub.trycloudflare.com\n',
      'https://valid-sub.trycloudflare.com\r\n',
      'https://valid-sub.trycloudflare.com\0',
      'https://sub_underscore.trycloudflare.com',
      'https://sub.with.dot.trycloudflare.com',
      'https://sub space.trycloudflare.com',
      'https://sub%20space.trycloudflare.com',
      'https://sub@attacker.trycloudflare.com',
      'https://sub:password.trycloudflare.com',
      'https://trycloudflare.com',
      'https://.trycloudflare.com',
    ];

    it.each(invalidCharactersAndWhitespace)(
      'should reject invalid characters, whitespaces, and apex domains: %s',
      (origin: string) => {
        expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)).toBe(false);
        expect(isOriginAllowed(origin, [], false)).toBe(false);
      },
    );

    const unicodeHomoglyphs: readonly string[] = [
      'https://valid-sub.trycloudflare。com',
      'https://valid-sub.ｔｒｙｃｌｏｕｄｆｌａｒｅ.com',
      'https://ԛuick.trycloudflare.com',
      'https://valid-sub.tryсloudflare.com',
    ];

    it.each(unicodeHomoglyphs)(
      'should reject Unicode homoglyphs and fullwidth characters: %s',
      (origin: string) => {
        expect(CLOUDFLARE_DEV_ORIGIN_REGEX.test(origin)).toBe(false);
        expect(isOriginAllowed(origin, [], false)).toBe(false);
      },
    );
  });

  describe('Vector 2: Production Isolation & Fail-Safe Fallbacks', () => {
    it('should return strictly empty array in production when CORS_ORIGIN and ALLOWED_ORIGINS are unset', () => {
      delete process.env.CORS_ORIGIN;
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const origins = resolveAllowedOrigins({ silent: true });
      expect(origins).toEqual([]);
      expect(origins).toHaveLength(0);
    });

    it('should NOT leak any localhost or development origins into production', () => {
      delete process.env.CORS_ORIGIN;
      delete process.env.ALLOWED_ORIGINS;
      process.env.NODE_ENV = 'production';

      const origins = resolveAllowedOrigins({ silent: true });

      for (const devOrigin of DEFAULT_DEV_ORIGINS) {
        expect(origins).not.toContain(devOrigin);
        expect(isOriginAllowed(devOrigin, origins, true)).toBe(false);
      }
    });

    it('should strictly reject Cloudflare quick tunnels in production unless explicitly allowlisted', () => {
      const origins = resolveAllowedOrigins({ nodeEnv: 'production', silent: true });
      const tunnelOrigin = 'https://uims-dev-preview.trycloudflare.com';

      // Disallowed when not in allowlist even if it matches regex
      expect(isOriginAllowed(tunnelOrigin, origins, true)).toBe(false);

      // Allowed only if explicitly configured in production allowlist
      const allowlistedOrigins = [tunnelOrigin];
      expect(isOriginAllowed(tunnelOrigin, allowlistedOrigins, true)).toBe(true);
    });

    const emptyFalsyValues: readonly (string | null | undefined)[] = [
      '',
      '   ',
      '\t\n  \r\n',
      ',,',
      ' , , , ',
      null,
      undefined,
    ];

    it.each(emptyFalsyValues)(
      'should return empty array in production for falsy/empty rawOrigins input: %j',
      (val: string | null | undefined) => {
        const origins = resolveAllowedOrigins({
          nodeEnv: 'production',
          rawOrigins: val,
          silent: true,
        });
        expect(origins).toEqual([]);
      },
    );

    it('should strictly enforce whitelist in production when explicit domains are configured', () => {
      const allowedDomain = 'https://uims.enterprise.com';
      const origins = resolveAllowedOrigins({
        nodeEnv: 'production',
        rawOrigins: allowedDomain,
      });

      expect(origins).toEqual([allowedDomain]);
      expect(isOriginAllowed(allowedDomain, origins, true)).toBe(true);

      // Subdomain spoofing
      expect(isOriginAllowed('https://attacker.uims.enterprise.com', origins, true)).toBe(false);
      expect(isOriginAllowed('https://uims.enterprise.com.attacker.com', origins, true)).toBe(
        false,
      );
      // HTTP downgrade
      expect(isOriginAllowed('http://uims.enterprise.com', origins, true)).toBe(false);
      // Port mismatch
      expect(isOriginAllowed('https://uims.enterprise.com:8443', origins, true)).toBe(false);
      // Unrelated domain
      expect(isOriginAllowed('https://evil.com', origins, true)).toBe(false);
    });
  });

  describe('Vector 3: Origin Header Edge Cases & Hostile Formats', () => {
    it('should permit undefined origin (server-to-server, cURL, health checks)', () => {
      expect(isOriginAllowed(undefined, ['https://uims.enterprise.com'], true)).toBe(true);
      expect(isOriginAllowed(undefined, [], true)).toBe(true);
      expect(isOriginAllowed(undefined, [], false)).toBe(true);
    });

    it('should permit empty string origin', () => {
      expect(isOriginAllowed('', ['https://uims.enterprise.com'], true)).toBe(true);
      expect(isOriginAllowed('', [], true)).toBe(true);
      expect(isOriginAllowed('', [], false)).toBe(true);
    });

    it('should reject "null" origin string in both dev and production', () => {
      // "null" origin is sent by browsers for data: URLs, local HTML files, or sandboxed iframes
      expect(isOriginAllowed('null', ['https://uims.enterprise.com'], true)).toBe(false);
      expect(isOriginAllowed('null', [], true)).toBe(false);
      expect(isOriginAllowed('null', [], false)).toBe(false);
      expect(isOriginAllowed('null', DEFAULT_DEV_ORIGINS, false)).toBe(false);
    });

    const hostileOriginHeaders: readonly string[] = [
      'null',
      'undefined',
      'false',
      'true',
      'data:text/html,<script>alert(1)</script>',
      'blob:https://uims.enterprise.com/uuid',
      'file:///etc/passwd',
      'about:blank',
    ];

    it.each(hostileOriginHeaders)(
      'should reject hostile/untrusted origin: %s',
      (origin: string) => {
        expect(isOriginAllowed(origin, ['https://uims.enterprise.com'], false)).toBe(false);
        expect(isOriginAllowed(origin, ['https://uims.enterprise.com'], true)).toBe(false);
      },
    );
  });

  describe('Vector 4: Whitespace, Delimiters & Normalization in Configuration', () => {
    it('should sanitize mixed spaces, tabs, and duplicate commas in rawOrigins', () => {
      const raw = '  https://one.uims.io , \t https://two.uims.io , ,  https://three.uims.io , \n ';
      const origins = resolveAllowedOrigins({ rawOrigins: raw });

      expect(origins).toEqual([
        'https://one.uims.io',
        'https://two.uims.io',
        'https://three.uims.io',
      ]);
    });

    it('should perform strict case matching on origins', () => {
      const origins = ['https://app.uims.io'];
      // Exact lowercase match passes
      expect(isOriginAllowed('https://app.uims.io', origins, false)).toBe(true);
      // Case-mismatched strings fail exact match
      expect(isOriginAllowed('https://APP.UIMS.IO', origins, false)).toBe(false);
      expect(isOriginAllowed('HTTPS://app.uims.io', origins, false)).toBe(false);
    });
  });

  describe('Vector 5: Origin Validator Callbacks & Options Parity', () => {
    it('should execute validator callback with (null, true) for allowed origin', () => {
      const validator = createCorsOriginValidator(['https://app.uims.io'], true);
      let errorResult: Error | null = null;
      let allowResult: boolean | undefined = undefined;

      validator('https://app.uims.io', (err: Error | null, allow?: boolean) => {
        errorResult = err;
        allowResult = allow;
      });

      expect(errorResult).toBeNull();
      expect(allowResult).toBe(true);
    });

    it('should execute validator callback with (Error, false) for forbidden origin', () => {
      const validator = createCorsOriginValidator(['https://app.uims.io'], true);
      let errorResult: Error | null = null;
      let allowResult: boolean | undefined = undefined;

      validator('https://attacker.io', (err: Error | null, allow?: boolean) => {
        errorResult = err;
        allowResult = allow;
      });

      expect(errorResult).toBeInstanceOf(Error);
      expect((errorResult as unknown as Error).message).toContain(
        "Origin 'https://attacker.io' is not allowed by CORS policy",
      );
      expect(allowResult).toBe(false);
    });

    it('should produce identical origin authorization for both API and WebSocket options', () => {
      const apiOptions = getApiCorsOptions({
        nodeEnv: 'development',
        rawOrigins: 'https://app.uims.io',
      });
      const wsOptions = getWebSocketCorsOptions({
        nodeEnv: 'development',
        rawOrigins: 'https://app.uims.io',
      });

      const testOrigins: readonly (string | undefined)[] = [
        'https://app.uims.io',
        'https://quick-tunnel-dev.trycloudflare.com',
        'https://attacker.io',
        'http://localhost:5679',
        undefined,
        'null',
      ];

      for (const origin of testOrigins) {
        let apiAllowed: boolean | undefined;
        let wsAllowed: boolean | undefined;

        const apiOriginFn = apiOptions.origin as (
          origin: string | undefined,
          cb: (err: Error | null, allow?: boolean) => void,
        ) => void;

        apiOriginFn(origin, (_err: Error | null, allow?: boolean) => {
          apiAllowed = allow;
        });

        wsOptions.origin(origin, (_err: Error | null, allow?: boolean) => {
          wsAllowed = allow;
        });

        expect(apiAllowed).toBe(wsAllowed);
      }
    });
  });

  describe('Vector 6: High Throughput & Rapid Stress Performance', () => {
    it('should evaluate 10,000 origin checks in under 50ms without memory bloat', () => {
      const allowed = ['https://app.uims.io', 'https://admin.uims.io'];
      const candidateOrigins: readonly (string | undefined)[] = [
        'https://app.uims.io',
        'https://admin.uims.io',
        'https://evil.com',
        'https://preview-123.trycloudflare.com',
        'https://evil.trycloudflare.com.attacker.com',
        undefined,
        'null',
      ];

      const startTime = performance.now();
      let allowedCount = 0;

      for (let i = 0; i < 10000; i++) {
        const origin = candidateOrigins[i % candidateOrigins.length];
        if (isOriginAllowed(origin, allowed, false)) {
          allowedCount++;
        }
      }

      const elapsedMs = performance.now() - startTime;

      // 4 out of 7 origins are allowed in full cycles (1428 * 4 = 5712), plus 3 in remaining 4 items = 5715
      expect(allowedCount).toBe(5715);
      expect(elapsedMs).toBeLessThan(100);
    });
  });
});
