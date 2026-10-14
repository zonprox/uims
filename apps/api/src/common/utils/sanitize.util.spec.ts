import { describe, expect, it } from 'vitest';
import { REDACTED_VALUE, isSensitiveKey, sanitizePayload } from './sanitize.util';

describe('sanitizePayload', () => {
  it('returns primitives, null, and undefined unchanged', () => {
    expect(sanitizePayload(null)).toBeNull();
    expect(sanitizePayload(undefined)).toBeUndefined();
    expect(sanitizePayload(42)).toBe(42);
    expect(sanitizePayload('regular string')).toBe('regular string');
    expect(sanitizePayload(true)).toBe(true);
  });

  it('redacts sensitive fields in shallow objects', () => {
    const input = {
      username: 'admin',
      password: 'SuperSecretPassword123!',
      adInitialPassword: 'InitialPassword#1',
      token: 'jwt.token.val',
      secret: 'very-secret-key',
      licenseKey: 'XXXX-YYYY-ZZZZ',
      licensekey: 'AAAA-BBBB-CCCC',
      pin: '9876',
      salt: 'random-salt',
      apiKey: 'api-12345',
      credentials: 'user-creds',
      status: 'Active',
    };

    const sanitized = sanitizePayload(input) as Record<string, unknown>;

    expect(sanitized.username).toBe('admin');
    expect(sanitized.status).toBe('Active');
    expect(sanitized.password).toBe(REDACTED_VALUE);
    expect(sanitized.adInitialPassword).toBe(REDACTED_VALUE);
    expect(sanitized.token).toBe(REDACTED_VALUE);
    expect(sanitized.secret).toBe(REDACTED_VALUE);
    expect(sanitized.licenseKey).toBe(REDACTED_VALUE);
    expect(sanitized.licensekey).toBe(REDACTED_VALUE);
    expect(sanitized.pin).toBe(REDACTED_VALUE);
    expect(sanitized.salt).toBe(REDACTED_VALUE);
    expect(sanitized.apiKey).toBe(REDACTED_VALUE);
    expect(sanitized.credentials).toBe(REDACTED_VALUE);
  });

  it('recursively redacts sensitive fields in nested objects and arrays', () => {
    const input = {
      user: {
        profile: {
          name: 'Jane Doe',
          privateKey: 'rsa-key-data',
        },
        items: [{ accessToken: 'tok-1' }, { accessToken: 'tok-2' }],
      },
      audit: {
        diff: {
          oldValue: { password: 'old-pass' },
          newValue: { password: 'new-pass' },
        },
      },
    };

    const sanitized = sanitizePayload(input) as {
      user: {
        profile: { name: string; privateKey: string };
        items: Array<{ accessToken: string }>;
      };
      audit: {
        diff: {
          oldValue: { password: string };
          newValue: { password: string };
        };
      };
    };

    expect(sanitized.user.profile.name).toBe('Jane Doe');
    expect(sanitized.user.profile.privateKey).toBe(REDACTED_VALUE);
    expect(sanitized.user.items[0].accessToken).toBe(REDACTED_VALUE);
    expect(sanitized.user.items[1].accessToken).toBe(REDACTED_VALUE);
    expect(sanitized.audit.diff.oldValue.password).toBe(REDACTED_VALUE);
    expect(sanitized.audit.diff.newValue.password).toBe(REDACTED_VALUE);
  });

  it('formats Date objects to ISO string', () => {
    const d = new Date('2026-05-15T10:00:00.000Z');
    const input = { timestamp: d };
    const sanitized = sanitizePayload(input) as { timestamp: string };
    expect(sanitized.timestamp).toBe('2026-05-15T10:00:00.000Z');
  });

  it('handles circular references without infinite recursion', () => {
    const circularObj: Record<string, unknown> = { name: 'Node' };
    circularObj.self = circularObj;

    const sanitized = sanitizePayload(circularObj) as Record<string, unknown>;
    expect(sanitized.name).toBe('Node');
    expect(sanitized.self).toBe('[CIRCULAR]');
  });

  it('handles binary buffers and Uint8Arrays', () => {
    const buffer = Buffer.from('test buffer');
    const uint8 = new Uint8Array([1, 2, 3]);

    expect(sanitizePayload(buffer)).toBe('[BINARY BUFFER]');
    expect(sanitizePayload(uint8)).toBe('[BINARY DATA]');
  });

  it('isSensitiveKey matches security keys accurately', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('userPassword')).toBe(true);
    expect(isSensitiveKey('corporateEmailPassword')).toBe(true);
    expect(isSensitiveKey('token')).toBe(true);
    expect(isSensitiveKey('refreshToken')).toBe(true);
    expect(isSensitiveKey('secret')).toBe(true);
    expect(isSensitiveKey('jwtSecret')).toBe(true);
    expect(isSensitiveKey('licenseKey')).toBe(true);
    expect(isSensitiveKey('licensekey')).toBe(true);
    expect(isSensitiveKey('pin')).toBe(true);
    expect(isSensitiveKey('salt')).toBe(true);
    expect(isSensitiveKey('apiKey')).toBe(true);
    expect(isSensitiveKey('credentials')).toBe(true);

    expect(isSensitiveKey('id')).toBe(false);
    expect(isSensitiveKey('name')).toBe(false);
    expect(isSensitiveKey('email')).toBe(false);
    expect(isSensitiveKey('assetTag')).toBe(false);
    expect(isSensitiveKey('status')).toBe(false);
  });
});
