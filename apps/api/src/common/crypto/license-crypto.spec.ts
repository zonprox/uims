import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  decryptLicenseKey,
  encryptLicenseKey,
  getLicenseEncryptionKey,
  isLicenseKeyEncrypted,
  maskLicenseKey,
} from './license-crypto';

describe('license-crypto', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.LICENSE_ENCRYPTION_KEY = 'test-license-key-32-chars-minimum-secure!';
    delete process.env.AUDIT_SIGNING_KEY;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getLicenseEncryptionKey', () => {
    it('should derive a 32-byte (256-bit) buffer from LICENSE_ENCRYPTION_KEY', () => {
      process.env.LICENSE_ENCRYPTION_KEY = 'custom-encryption-secret-key-for-test-32';
      const key = getLicenseEncryptionKey();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it('should fall back to AUDIT_SIGNING_KEY if LICENSE_ENCRYPTION_KEY is unset', () => {
      delete process.env.LICENSE_ENCRYPTION_KEY;
      process.env.AUDIT_SIGNING_KEY = 'audit-signing-key-32-characters-minimum';
      const key = getLicenseEncryptionKey();
      expect(key.length).toBe(32);
    });

    it('should fall back to JWT_SECRET if both LICENSE_ENCRYPTION_KEY and AUDIT_SIGNING_KEY are unset', () => {
      delete process.env.LICENSE_ENCRYPTION_KEY;
      delete process.env.AUDIT_SIGNING_KEY;
      process.env.JWT_SECRET = 'jwt-secret-key-32-characters-minimum-length';
      const key = getLicenseEncryptionKey();
      expect(key.length).toBe(32);
    });

    it('should throw an error if no encryption secret is available', () => {
      delete process.env.LICENSE_ENCRYPTION_KEY;
      delete process.env.AUDIT_SIGNING_KEY;
      delete process.env.JWT_SECRET;

      expect(() => getLicenseEncryptionKey()).toThrow(
        'Encryption key resolution failed: LICENSE_ENCRYPTION_KEY, AUDIT_SIGNING_KEY, or JWT_SECRET is required',
      );
    });

    it('should throw an error if secret is an empty string', () => {
      process.env.LICENSE_ENCRYPTION_KEY = '   ';
      delete process.env.AUDIT_SIGNING_KEY;
      delete process.env.JWT_SECRET;

      expect(() => getLicenseEncryptionKey()).toThrow('Encryption key resolution failed');
    });
  });

  describe('isLicenseKeyEncrypted', () => {
    it('should return true for valid enc:v1: prefix', () => {
      expect(isLicenseKeyEncrypted('enc:v1:iv:tag:cipher')).toBe(true);
    });

    it('should return false for plaintext keys', () => {
      expect(isLicenseKeyEncrypted('MS-E5-YON-9921-8834-KKL9')).toBe(false);
      expect(isLicenseKeyEncrypted('N/A')).toBe(false);
      expect(isLicenseKeyEncrypted('')).toBe(false);
      expect(isLicenseKeyEncrypted(null)).toBe(false);
      expect(isLicenseKeyEncrypted(undefined)).toBe(false);
      expect(isLicenseKeyEncrypted(12345)).toBe(false);
    });
  });

  describe('encryptLicenseKey', () => {
    it('should encrypt a plaintext string into the format enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>', () => {
      const plaintext = 'MS-E5-YON-9921-8834-KKL9';
      const encrypted = encryptLicenseKey(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.startsWith('enc:v1:')).toBe(true);

      const parts = encrypted.slice('enc:v1:'.length).split(':');
      expect(parts.length).toBe(3);

      const [ivHex, authTagHex, cipherHex] = parts;
      expect(ivHex.length).toBe(24); // 12 bytes = 24 hex chars
      expect(authTagHex.length).toBe(32); // 16 bytes = 32 hex chars
      expect(cipherHex.length).toBeGreaterThan(0);
    });

    it('should generate different ciphertexts for the same plaintext due to random IV', () => {
      const plaintext = 'SAP-S4H-YON-8849-0192-PROD';
      const enc1 = encryptLicenseKey(plaintext);
      const enc2 = encryptLicenseKey(plaintext);

      expect(enc1).not.toBe(enc2);
      expect(decryptLicenseKey(enc1)).toBe(plaintext);
      expect(decryptLicenseKey(enc2)).toBe(plaintext);
    });

    it('should not double-encrypt if input is already encrypted', () => {
      const plaintext = 'LEC-MOD-BSL-2024-9981-CAD';
      const enc1 = encryptLicenseKey(plaintext);
      const enc2 = encryptLicenseKey(enc1);

      expect(enc1).toBe(enc2);
    });

    it('should return null or undefined as-is', () => {
      expect(encryptLicenseKey(null)).toBeNull();
      expect(encryptLicenseKey(undefined)).toBeNull();
    });

    it('should return empty string or N/A as-is', () => {
      expect(encryptLicenseKey('')).toBe('');
      expect(encryptLicenseKey('N/A')).toBe('N/A');
    });
  });

  describe('decryptLicenseKey', () => {
    it('should decrypt an encrypted key back to original plaintext', () => {
      const plaintext = 'GBR-ACCU-2024-8849-MRK';
      const encrypted = encryptLicenseKey(plaintext);
      const decrypted = decryptLicenseKey(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle UTF-8 and special characters in plaintext keys', () => {
      const complexKey = 'Bản-Quyền-Phần-Mềm-2026-!@#$%^&*()_+~`|}{[]:;?><,./';
      const encrypted = encryptLicenseKey(complexKey);
      const decrypted = decryptLicenseKey(encrypted);

      expect(decrypted).toBe(complexKey);
    });

    it('should return legacy unencrypted plaintext as-is without throwing', () => {
      const legacyKey = 'LEGACY-PLAINTEXT-KEY-1234';
      expect(decryptLicenseKey(legacyKey)).toBe(legacyKey);
    });

    it('should return null, undefined, empty, or N/A as-is', () => {
      expect(decryptLicenseKey(null)).toBeNull();
      expect(decryptLicenseKey(undefined)).toBeNull();
      expect(decryptLicenseKey('')).toBe('');
      expect(decryptLicenseKey('N/A')).toBe('N/A');
    });

    it('should return fallback string on corrupted ciphertext', () => {
      const plaintext = 'KEY-TO-BE-TAMPERED';
      const encrypted = encryptLicenseKey(plaintext);
      const parts = encrypted.slice('enc:v1:'.length).split(':');

      // Tamper ciphertext
      const tamperedCipher = `${parts[0]}:${parts[1]}:ff${parts[2].slice(2)}`;
      const tamperedKey = `enc:v1:${tamperedCipher}`;

      expect(decryptLicenseKey(tamperedKey)).toBe('••••-DECRYPTION-FAILED');
    });

    it('should throw error on corrupted ciphertext when throwOnError is true', () => {
      const plaintext = 'KEY-TO-BE-TAMPERED-THROW';
      const encrypted = encryptLicenseKey(plaintext);
      const parts = encrypted.slice('enc:v1:'.length).split(':');

      const tamperedCipher = `${parts[0]}:${parts[1]}:00${parts[2].slice(2)}`;
      const tamperedKey = `enc:v1:${tamperedCipher}`;

      expect(() => decryptLicenseKey(tamperedKey, { throwOnError: true })).toThrow();
    });

    it('should detect tampered auth tag', () => {
      const plaintext = 'KEY-TO-BE-TAMPERED-TAG';
      const encrypted = encryptLicenseKey(plaintext);
      const parts = encrypted.slice('enc:v1:'.length).split(':');

      // Flip byte in auth tag
      const corruptedTag = `00${parts[1].slice(2)}`;
      const tamperedKey = `enc:v1:${parts[0]}:${corruptedTag}:${parts[2]}`;

      expect(decryptLicenseKey(tamperedKey)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(tamperedKey, { throwOnError: true })).toThrow();
    });

    it('should detect tampered IV', () => {
      const plaintext = 'KEY-TO-BE-TAMPERED-IV';
      const encrypted = encryptLicenseKey(plaintext);
      const parts = encrypted.slice('enc:v1:'.length).split(':');

      // Flip byte in IV
      const corruptedIV = `aa${parts[0].slice(2)}`;
      const tamperedKey = `enc:v1:${corruptedIV}:${parts[1]}:${parts[2]}`;

      expect(decryptLicenseKey(tamperedKey)).toBe('••••-DECRYPTION-FAILED');
    });

    it('should handle malformed envelope format gracefully', () => {
      expect(decryptLicenseKey('enc:v1:only-two:parts')).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey('enc:v1:only-two:parts', { throwOnError: true })).toThrow(
        'Malformed encrypted license key payload structure',
      );
    });

    it('should handle invalid IV or tag length in envelope', () => {
      // IV is too short (10 hex chars instead of 24)
      const invalidEnvelope = 'enc:v1:1234567890:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d:123456';
      expect(decryptLicenseKey(invalidEnvelope)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(invalidEnvelope, { throwOnError: true })).toThrow(
        'Invalid IV or auth tag length in encrypted license key',
      );
    });

    it('should fail decryption if different encryption key is used', () => {
      const plaintext = 'SECRET-KEY-DIFFERENT-PASS';
      const encrypted = encryptLicenseKey(plaintext);

      // Change key
      process.env.LICENSE_ENCRYPTION_KEY = 'completely-different-key-32-chars-long!';
      expect(decryptLicenseKey(encrypted)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(encrypted, { throwOnError: true })).toThrow();
    });
  });

  describe('maskLicenseKey', () => {
    it('should return N/A for null, undefined, empty, or N/A', () => {
      expect(maskLicenseKey(null)).toBe('N/A');
      expect(maskLicenseKey(undefined)).toBe('N/A');
      expect(maskLicenseKey('')).toBe('N/A');
      expect(maskLicenseKey('N/A')).toBe('N/A');
    });

    it('should return key unchanged if 8 characters or shorter', () => {
      expect(maskLicenseKey('SHORT12')).toBe('SHORT12');
      expect(maskLicenseKey('12345678')).toBe('12345678');
    });

    it('should mask keys longer than 8 characters showing last 4 characters', () => {
      expect(maskLicenseKey('MS-E5-YON-9921-8834-KKL9')).toBe('••••-••••-KKL9');
      expect(maskLicenseKey('123456789')).toBe('••••-••••-6789');
    });
  });
});
