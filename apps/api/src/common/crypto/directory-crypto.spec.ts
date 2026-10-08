import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  decryptDirectoryCredential,
  decryptDirectoryPassword,
  encryptDirectoryCredential,
  encryptDirectoryPassword,
  generateSecurePassword,
  generateSecureRandomPassword,
  getDirectoryEncryptionKey,
  isDirectoryCredentialEncrypted,
  isDirectoryPasswordEncrypted,
  maskDirectoryPassword,
} from './directory-crypto';

describe('directory-crypto', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DIRECTORY_ENCRYPTION_KEY = 'test-directory-encryption-key-32-chars-long!';
    delete process.env.LICENSE_ENCRYPTION_KEY;
    delete process.env.AUDIT_SIGNING_KEY;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getDirectoryEncryptionKey', () => {
    it('should derive a 32-byte (256-bit) buffer from DIRECTORY_ENCRYPTION_KEY', () => {
      process.env.DIRECTORY_ENCRYPTION_KEY = 'custom-directory-secret-key-for-test-32';
      const key = getDirectoryEncryptionKey();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it('should fall back to LICENSE_ENCRYPTION_KEY if DIRECTORY_ENCRYPTION_KEY is unset', () => {
      delete process.env.DIRECTORY_ENCRYPTION_KEY;
      process.env.LICENSE_ENCRYPTION_KEY = 'license-encryption-key-32-chars-minimum';
      const key = getDirectoryEncryptionKey();
      expect(key.length).toBe(32);
    });

    it('should fall back to AUDIT_SIGNING_KEY if both DIRECTORY and LICENSE keys are unset', () => {
      delete process.env.DIRECTORY_ENCRYPTION_KEY;
      delete process.env.LICENSE_ENCRYPTION_KEY;
      process.env.AUDIT_SIGNING_KEY = 'audit-signing-key-32-chars-minimum';
      const key = getDirectoryEncryptionKey();
      expect(key.length).toBe(32);
    });

    it('should fall back to JWT_SECRET if all preceding keys are unset', () => {
      delete process.env.DIRECTORY_ENCRYPTION_KEY;
      delete process.env.LICENSE_ENCRYPTION_KEY;
      delete process.env.AUDIT_SIGNING_KEY;
      process.env.JWT_SECRET = 'jwt-secret-key-32-chars-minimum-length';
      const key = getDirectoryEncryptionKey();
      expect(key.length).toBe(32);
    });

    it('should throw an error if no encryption secret is available', () => {
      delete process.env.DIRECTORY_ENCRYPTION_KEY;
      delete process.env.LICENSE_ENCRYPTION_KEY;
      delete process.env.AUDIT_SIGNING_KEY;
      delete process.env.JWT_SECRET;

      expect(() => getDirectoryEncryptionKey()).toThrow(
        'Encryption key resolution failed: DIRECTORY_ENCRYPTION_KEY, LICENSE_ENCRYPTION_KEY, AUDIT_SIGNING_KEY, or JWT_SECRET is required',
      );
    });

    it('should throw an error if secret is an empty string', () => {
      process.env.DIRECTORY_ENCRYPTION_KEY = '   ';
      delete process.env.LICENSE_ENCRYPTION_KEY;
      delete process.env.AUDIT_SIGNING_KEY;
      delete process.env.JWT_SECRET;

      expect(() => getDirectoryEncryptionKey()).toThrow('Encryption key resolution failed');
    });
  });

  describe('isDirectoryPasswordEncrypted and isDirectoryCredentialEncrypted', () => {
    it('should return true for valid canonical encrypted envelope', () => {
      const validEnvelope = encryptDirectoryPassword('ValidPassword#2026');
      expect(isDirectoryPasswordEncrypted(validEnvelope)).toBe(true);
      expect(isDirectoryCredentialEncrypted(validEnvelope)).toBe(true);

      const staticEnvelope =
        'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:12345678';
      expect(isDirectoryPasswordEncrypted(staticEnvelope)).toBe(true);
      expect(isDirectoryCredentialEncrypted(staticEnvelope)).toBe(true);
    });

    it('should return false for malformed or non-hex envelopes', () => {
      expect(isDirectoryPasswordEncrypted('enc:v1:iv:tag:cipher')).toBe(false);
      expect(isDirectoryCredentialEncrypted('enc:v1:iv:tag:cipher')).toBe(false);
      expect(isDirectoryPasswordEncrypted('enc:v1:short')).toBe(false);
      expect(
        isDirectoryPasswordEncrypted(
          'enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:123',
        ),
      ).toBe(false);
    });

    it('should return false for plaintext passwords', () => {
      expect(isDirectoryPasswordEncrypted('MyP@ssw0rd2026!')).toBe(false);
      expect(isDirectoryPasswordEncrypted('N/A')).toBe(false);
      expect(isDirectoryPasswordEncrypted('')).toBe(false);
      expect(isDirectoryPasswordEncrypted(null)).toBe(false);
      expect(isDirectoryPasswordEncrypted(undefined)).toBe(false);
      expect(isDirectoryPasswordEncrypted(12345)).toBe(false);
      expect(isDirectoryCredentialEncrypted('PlaintextPassword')).toBe(false);
    });
  });

  describe('encryptDirectoryPassword and encryptDirectoryCredential', () => {
    it('should encrypt a plaintext string into the format enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>', () => {
      const plaintext = 'EnterpriseP@ssw0rd123!';
      const encrypted = encryptDirectoryPassword(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.startsWith('enc:v1:')).toBe(true);

      const parts = encrypted.slice('enc:v1:'.length).split(':');
      expect(parts.length).toBe(3);

      const [ivHex, authTagHex, cipherHex] = parts;
      expect(ivHex.length).toBe(24); // 12 bytes = 24 hex chars
      expect(authTagHex.length).toBe(32); // 16 bytes = 32 hex chars
      expect(cipherHex.length).toBeGreaterThan(0);
    });

    it('should work with alias encryptDirectoryCredential', () => {
      const plaintext = 'AnotherSecretPassword99!';
      const encrypted = encryptDirectoryCredential(plaintext);
      expect(encrypted.startsWith('enc:v1:')).toBe(true);
      expect(decryptDirectoryCredential(encrypted)).toBe(plaintext);
    });

    it('should generate different ciphertexts for the same plaintext due to random IV', () => {
      const plaintext = 'SecureDomainPass#2026';
      const enc1 = encryptDirectoryPassword(plaintext);
      const enc2 = encryptDirectoryPassword(plaintext);

      expect(enc1).not.toBe(enc2);
      expect(decryptDirectoryPassword(enc1)).toBe(plaintext);
      expect(decryptDirectoryPassword(enc2)).toBe(plaintext);
    });

    it('should not double-encrypt if input is already encrypted', () => {
      const plaintext = 'SingleEncryptionRequired1!';
      const enc1 = encryptDirectoryPassword(plaintext);
      const enc2 = encryptDirectoryPassword(enc1);

      expect(enc1).toBe(enc2);
    });

    it('should return null or undefined as null', () => {
      expect(encryptDirectoryPassword(null)).toBeNull();
      expect(encryptDirectoryPassword(undefined)).toBeNull();
    });

    it('should return empty string or N/A as-is', () => {
      expect(encryptDirectoryPassword('')).toBe('');
      expect(encryptDirectoryPassword('N/A')).toBe('N/A');
    });
  });

  describe('decryptDirectoryPassword and decryptDirectoryCredential', () => {
    it('should decrypt an encrypted password back to original plaintext', () => {
      const plaintext = 'CorrectHorseBatteryStaple!2026';
      const encrypted = encryptDirectoryPassword(plaintext);
      const decrypted = decryptDirectoryPassword(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle UTF-8, accented characters and special symbols in password', () => {
      const complexPass = 'MậtKhẩu#DoanhNghiệp!2026-🔒-✨-@#$%^&*()_+~`|}{[]:;?><,./';
      const encrypted = encryptDirectoryPassword(complexPass);
      const decrypted = decryptDirectoryPassword(encrypted);

      expect(decrypted).toBe(complexPass);
    });

    it('should reject unencrypted plaintext password with fallback or error', () => {
      const legacyPass = 'LEGACY_PLAINTEXT_PASSWORD';
      expect(decryptDirectoryPassword(legacyPass)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptDirectoryPassword(legacyPass, { throwOnError: true })).toThrow();
    });

    it('should return null, undefined, empty, or N/A as-is', () => {
      expect(decryptDirectoryPassword(null)).toBeNull();
      expect(decryptDirectoryPassword(undefined)).toBeNull();
      expect(decryptDirectoryPassword('')).toBe('');
      expect(decryptDirectoryPassword('N/A')).toBe('N/A');
    });

    const flipHexByte = (hex: string, index = 0): string => {
      const byte = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
      const flipped = (byte ^ 0xff).toString(16).padStart(2, '0');
      return `${hex.slice(0, index * 2)}${flipped}${hex.slice(index * 2 + 2)}`;
    };

    it('should return fallback string on corrupted ciphertext', () => {
      const plaintext = 'PASSWORD-TO-BE-TAMPERED';
      const encrypted = encryptDirectoryPassword(plaintext);
      const parts = encrypted.slice('enc:v1:'.length).split(':');

      const tamperedCipher = `${parts[0]}:${parts[1]}:${flipHexByte(parts[2])}`;
      const tamperedPass = `enc:v1:${tamperedCipher}`;

      expect(decryptDirectoryPassword(tamperedPass)).toBe('••••-DECRYPTION-FAILED');
    });

    it('should throw error on corrupted ciphertext when throwOnError is true', () => {
      const plaintext = 'PASSWORD-TAMPER-THROW';
      const encrypted = encryptDirectoryPassword(plaintext);
      const parts = encrypted.slice('enc:v1:'.length).split(':');

      const tamperedCipher = `${parts[0]}:${parts[1]}:${flipHexByte(parts[2])}`;
      const tamperedPass = `enc:v1:${tamperedCipher}`;

      expect(() => decryptDirectoryPassword(tamperedPass, { throwOnError: true })).toThrow();
    });

    it('should detect tampered auth tag', () => {
      const plaintext = 'PASSWORD-TAMPER-TAG';
      const encrypted = encryptDirectoryPassword(plaintext);
      const parts = encrypted.slice('enc:v1:'.length).split(':');

      const corruptedTag = flipHexByte(parts[1]);
      const tamperedPass = `enc:v1:${parts[0]}:${corruptedTag}:${parts[2]}`;

      expect(decryptDirectoryPassword(tamperedPass)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptDirectoryPassword(tamperedPass, { throwOnError: true })).toThrow();
    });

    it('should detect tampered IV', () => {
      const plaintext = 'PASSWORD-TAMPER-IV';
      const encrypted = encryptDirectoryPassword(plaintext);
      const parts = encrypted.slice('enc:v1:'.length).split(':');

      const corruptedIV = flipHexByte(parts[0]);
      const tamperedPass = `enc:v1:${corruptedIV}:${parts[1]}:${parts[2]}`;

      expect(decryptDirectoryPassword(tamperedPass)).toBe('••••-DECRYPTION-FAILED');
    });

    it('should handle malformed envelope format gracefully', () => {
      expect(decryptDirectoryPassword('enc:v1:only-two:parts')).toBe('••••-DECRYPTION-FAILED');
      expect(() =>
        decryptDirectoryPassword('enc:v1:only-two:parts', { throwOnError: true }),
      ).toThrow('Malformed encrypted directory credential payload structure');
    });

    it('should handle invalid IV or tag length in envelope', () => {
      const invalidEnvelope = 'enc:v1:1234567890:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d:123456';
      expect(decryptDirectoryPassword(invalidEnvelope)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptDirectoryPassword(invalidEnvelope, { throwOnError: true })).toThrow(
        'Invalid IV or auth tag length in encrypted directory credential',
      );
    });

    it('should fail decryption if different encryption key is used', () => {
      const plaintext = 'SECRET-PASSWORD-KEY-CHANGE';
      const encrypted = encryptDirectoryPassword(plaintext);

      // Change key
      process.env.DIRECTORY_ENCRYPTION_KEY = 'completely-different-key-32-chars-long!';
      expect(decryptDirectoryPassword(encrypted)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptDirectoryPassword(encrypted, { throwOnError: true })).toThrow();
    });
  });

  describe('maskDirectoryPassword', () => {
    it('should return masked string for any input', () => {
      expect(maskDirectoryPassword('secret123')).toBe('••••••••');
      expect(maskDirectoryPassword(null)).toBe('••••••••');
      expect(maskDirectoryPassword(undefined)).toBe('••••••••');
      expect(maskDirectoryPassword('')).toBe('••••••••');
      expect(maskDirectoryPassword('N/A')).toBe('••••••••');
    });
  });

  describe('generateSecurePassword and generateSecureRandomPassword', () => {
    it('should generate a 16-character password by default', () => {
      const password = generateSecurePassword();
      expect(password).toBeTypeOf('string');
      expect(password.length).toBe(16);
    });

    it('should generate requested length if length >= 12', () => {
      const pass24 = generateSecurePassword(24);
      expect(pass24.length).toBe(24);

      const pass32 = generateSecurePassword(32);
      expect(pass32.length).toBe(32);
    });

    it('should enforce minimum length of 12 if requested length is smaller', () => {
      const passSmall = generateSecurePassword(8);
      expect(passSmall.length).toBe(12);
    });

    it('should satisfy enterprise complexity rules: uppercase, lowercase, digit, and symbol', () => {
      // Test across multiple runs to verify consistency
      for (let i = 0; i < 20; i++) {
        const password = generateSecurePassword();
        expect(/[A-Z]/.test(password)).toBe(true);
        expect(/[a-z]/.test(password)).toBe(true);
        expect(/[0-9]/.test(password)).toBe(true);
        expect(/[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/.test(password)).toBe(true);
      }
    });

    it('should produce distinct passwords across calls', () => {
      const pass1 = generateSecurePassword();
      const pass2 = generateSecurePassword();
      const pass3 = generateSecurePassword();

      expect(pass1).not.toBe(pass2);
      expect(pass2).not.toBe(pass3);
    });

    it('should work with alias generateSecureRandomPassword', () => {
      const password = generateSecureRandomPassword(18);
      expect(password.length).toBe(18);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
    });
  });
});
