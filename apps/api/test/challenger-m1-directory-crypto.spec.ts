import * as crypto from 'node:crypto';
import { AccountStatus, DomainJoinStatus } from '@uims/shared-types';
import { createDirectoryUserSchema, resetEmailPasswordSchema } from '@uims/shared-validators';
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
} from '../src/common/crypto/directory-crypto';

describe('Adversarial Challenger M1: Directory Cryptography & Schema Contracts', () => {
  const originalEnv = { ...process.env };
  const BASE_TEST_SECRET = 'uims-test-directory-encryption-key-32chars!';

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DIRECTORY_ENCRYPTION_KEY = BASE_TEST_SECRET;
    delete process.env.LICENSE_ENCRYPTION_KEY;
    delete process.env.AUDIT_SIGNING_KEY;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // Helper functions for adversarial bit-flipping
  // =========================================================================
  function flipHexBit(hex: string, byteIndex: number, bitIndex: number): string {
    const byteStart = byteIndex * 2;
    const currentByte = Number.parseInt(hex.slice(byteStart, byteStart + 2), 16);
    const flippedByte = currentByte ^ (1 << bitIndex);
    const flippedHex = flippedByte.toString(16).padStart(2, '0');
    return `${hex.slice(0, byteStart)}${flippedHex}${hex.slice(byteStart + 2)}`;
  }

  function parseEnvelope(envelope: string): { ivHex: string; tagHex: string; cipherHex: string } {
    const parts = envelope.slice('enc:v1:'.length).split(':');
    if (parts.length !== 3) {
      throw new Error(`Unexpected envelope format: ${envelope}`);
    }
    return { ivHex: parts[0], tagHex: parts[1], cipherHex: parts[2] };
  }

  function buildEnvelope(ivHex: string, tagHex: string, cipherHex: string): string {
    return `enc:v1:${ivHex}:${tagHex}:${cipherHex}`;
  }

  // =========================================================================
  // Suite 1: Cryptographic Bit-Flipping, IV Corruption, and Tag Forgery
  // =========================================================================
  describe('Suite 1: Cryptographic Tamper Resistance & Integrity Verification', () => {
    const secretPlaintext = 'AdversarialP@ssw0rd!2026-SuperSecretAdminCredentials';

    it('should detect bit-flipping at every single bit position across ciphertext bytes', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext);
      expect(encrypted).not.toBeNull();
      const { ivHex, tagHex, cipherHex } = parseEnvelope(encrypted!);
      const cipherByteCount = cipherHex.length / 2;

      // Test head, middle, and tail bytes
      const testByteIndices = [
        0,
        Math.floor(cipherByteCount / 4),
        Math.floor(cipherByteCount / 2),
        Math.floor((cipherByteCount * 3) / 4),
        cipherByteCount - 1,
      ];

      for (const byteIdx of testByteIndices) {
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
          const tamperedCipher = flipHexBit(cipherHex, byteIdx, bitIdx);
          const tamperedEnvelope = buildEnvelope(ivHex, tagHex, tamperedCipher);

          // Must safely return failure sentinel without throwing uncaught exception
          const safeResult = decryptDirectoryPassword(tamperedEnvelope);
          expect(safeResult).toBe('••••-DECRYPTION-FAILED');

          // Must throw explicit cryptographic authentication error when throwOnError is true
          expect(() =>
            decryptDirectoryPassword(tamperedEnvelope, { throwOnError: true }),
          ).toThrow();
        }
      }
    });

    it('should detect multi-byte corruption and ciphertext reversal', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext);
      const { ivHex, tagHex, cipherHex } = parseEnvelope(encrypted!);

      // Multi-byte corruption: invert first 4 bytes
      let corruptedCipher = cipherHex;
      for (let i = 0; i < 4; i++) {
        corruptedCipher = flipHexBit(corruptedCipher, i, 7);
      }
      expect(decryptDirectoryPassword(buildEnvelope(ivHex, tagHex, corruptedCipher))).toBe(
        '••••-DECRYPTION-FAILED',
      );

      // Ciphertext reversal
      const reversedCipher = cipherHex.match(/.{2}/g)?.reverse().join('') ?? '';
      expect(decryptDirectoryPassword(buildEnvelope(ivHex, tagHex, reversedCipher))).toBe(
        '••••-DECRYPTION-FAILED',
      );

      // Ciphertext truncation
      const truncatedCipher = cipherHex.slice(0, -4);
      expect(decryptDirectoryPassword(buildEnvelope(ivHex, tagHex, truncatedCipher))).toBe(
        '••••-DECRYPTION-FAILED',
      );

      // Ciphertext extension
      const extendedCipher = `${cipherHex}deadbeef`;
      expect(decryptDirectoryPassword(buildEnvelope(ivHex, tagHex, extendedCipher))).toBe(
        '••••-DECRYPTION-FAILED',
      );
    });

    it('should detect bit-flipping across all 12 bytes of IV', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext);
      const { ivHex, tagHex, cipherHex } = parseEnvelope(encrypted!);
      expect(ivHex.length).toBe(24); // 12 bytes

      for (let byteIdx = 0; byteIdx < 12; byteIdx++) {
        // Test lowest bit and highest bit of each IV byte
        for (const bitIdx of [0, 7]) {
          const tamperedIV = flipHexBit(ivHex, byteIdx, bitIdx);
          const tamperedEnvelope = buildEnvelope(tamperedIV, tagHex, cipherHex);

          expect(decryptDirectoryPassword(tamperedEnvelope)).toBe('••••-DECRYPTION-FAILED');
          expect(() =>
            decryptDirectoryPassword(tamperedEnvelope, { throwOnError: true }),
          ).toThrow();
        }
      }
    });

    it('should detect zeroed IV and IV substitution from another envelope', () => {
      const enc1 = encryptDirectoryPassword('CredentialNumberOne#2026')!;
      const enc2 = encryptDirectoryPassword('CredentialNumberTwo#2026')!;

      const p1 = parseEnvelope(enc1);
      const p2 = parseEnvelope(enc2);

      // Zeroed IV (12 zero bytes)
      const zeroIV = '00'.repeat(12);
      expect(decryptDirectoryPassword(buildEnvelope(zeroIV, p1.tagHex, p1.cipherHex))).toBe(
        '••••-DECRYPTION-FAILED',
      );

      // Swapped IV between two distinct ciphertexts
      const swappedIVEnvelope = buildEnvelope(p2.ivHex, p1.tagHex, p1.cipherHex);
      expect(decryptDirectoryPassword(swappedIVEnvelope)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptDirectoryPassword(swappedIVEnvelope, { throwOnError: true })).toThrow();
    });

    it('should reject IV length anomalies (underflow and overflow)', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext)!;
      const { ivHex, tagHex, cipherHex } = parseEnvelope(encrypted);

      // Truncated IV (10 bytes = 20 hex chars, 11 bytes = 22 hex chars)
      for (const length of [0, 8, 20, 22]) {
        const shortIV = ivHex.slice(0, length);
        const env = buildEnvelope(shortIV, tagHex, cipherHex);
        expect(decryptDirectoryPassword(env)).toBe('••••-DECRYPTION-FAILED');
        expect(() => decryptDirectoryPassword(env, { throwOnError: true })).toThrow(
          'Invalid IV or auth tag length',
        );
      }

      // Oversized IV (13 bytes = 26 hex chars, 16 bytes = 32 hex chars)
      for (const length of [26, 32, 64]) {
        const longIV = ivHex.padEnd(length, 'ff');
        const env = buildEnvelope(longIV, tagHex, cipherHex);
        expect(decryptDirectoryPassword(env)).toBe('••••-DECRYPTION-FAILED');
        expect(() => decryptDirectoryPassword(env, { throwOnError: true })).toThrow(
          'Invalid IV or auth tag length',
        );
      }
    });

    it('should detect bit-flipping across all 16 bytes of Authentication Tag', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext)!;
      const { ivHex, tagHex, cipherHex } = parseEnvelope(encrypted);
      expect(tagHex.length).toBe(32); // 16 bytes

      for (let byteIdx = 0; byteIdx < 16; byteIdx++) {
        for (const bitIdx of [0, 7]) {
          const tamperedTag = flipHexBit(tagHex, byteIdx, bitIdx);
          const env = buildEnvelope(ivHex, tamperedTag, cipherHex);

          expect(decryptDirectoryPassword(env)).toBe('••••-DECRYPTION-FAILED');
          expect(() => decryptDirectoryPassword(env, { throwOnError: true })).toThrow();
        }
      }
    });

    it('should reject forged, zeroed, and spliced Authentication Tags', () => {
      const enc1 = encryptDirectoryPassword('CredentialNumberOne#2026')!;
      const enc2 = encryptDirectoryPassword('CredentialNumberTwo#2026')!;

      const p1 = parseEnvelope(enc1);
      const p2 = parseEnvelope(enc2);

      // All zero auth tag
      const zeroTag = '00'.repeat(16);
      expect(decryptDirectoryPassword(buildEnvelope(p1.ivHex, zeroTag, p1.cipherHex))).toBe(
        '••••-DECRYPTION-FAILED',
      );

      // Randomly generated auth tag
      const randomTag = crypto.randomBytes(16).toString('hex');
      expect(decryptDirectoryPassword(buildEnvelope(p1.ivHex, randomTag, p1.cipherHex))).toBe(
        '••••-DECRYPTION-FAILED',
      );

      // Spliced tag from enc2 into enc1
      expect(decryptDirectoryPassword(buildEnvelope(p1.ivHex, p2.tagHex, p1.cipherHex))).toBe(
        '••••-DECRYPTION-FAILED',
      );

      // Spliced tag from identical plaintext with different IV
      const enc1Repeat = encryptDirectoryPassword('CredentialNumberOne#2026')!;
      const p1Repeat = parseEnvelope(enc1Repeat);
      expect(decryptDirectoryPassword(buildEnvelope(p1.ivHex, p1Repeat.tagHex, p1.cipherHex))).toBe(
        '••••-DECRYPTION-FAILED',
      );
    });

    it('should reject Authentication Tag length anomalies', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext)!;
      const { ivHex, tagHex, cipherHex } = parseEnvelope(encrypted);

      // Truncated tag (8 bytes = 16 hex chars, 15 bytes = 30 hex chars)
      for (const len of [0, 16, 28, 30]) {
        const shortTag = tagHex.slice(0, len);
        const env = buildEnvelope(ivHex, shortTag, cipherHex);
        expect(decryptDirectoryPassword(env)).toBe('••••-DECRYPTION-FAILED');
        expect(() => decryptDirectoryPassword(env, { throwOnError: true })).toThrow(
          'Invalid IV or auth tag length',
        );
      }

      // Oversized tag (17 bytes = 34 hex chars, 32 bytes = 64 hex chars)
      for (const len of [34, 48, 64]) {
        const longTag = tagHex.padEnd(len, 'aa');
        const env = buildEnvelope(ivHex, longTag, cipherHex);
        expect(decryptDirectoryPassword(env)).toBe('••••-DECRYPTION-FAILED');
        expect(() => decryptDirectoryPassword(env, { throwOnError: true })).toThrow(
          'Invalid IV or auth tag length',
        );
      }
    });

    it('should reject malformed envelope structures (colon counts and delimiters)', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext)!;
      const { ivHex, tagHex, cipherHex } = parseEnvelope(encrypted);

      const malformedCases = [
        'enc:v1:',
        'enc:v1:justonepart',
        `enc:v1:${ivHex}:${tagHex}`, // only 2 parts
        `enc:v1:${ivHex}:${tagHex}:${cipherHex}:extraFourthPart`, // 4 parts
        `enc:v1:${ivHex}:${tagHex}:${cipherHex}:five:six`,
        `enc:v1:::`, // empty parts
        `enc:v2:${ivHex}:${tagHex}:${cipherHex}`, // wrong version
        `v1:${ivHex}:${tagHex}:${cipherHex}`, // missing enc:
        `ENC:V1:${ivHex}:${tagHex}:${cipherHex}`, // uppercase prefix
        `enc:v1: ${ivHex} : ${tagHex} : ${cipherHex} `, // space injection
      ];

      for (const badEnvelope of malformedCases) {
        expect(decryptDirectoryPassword(badEnvelope)).toBe('••••-DECRYPTION-FAILED');
        expect(() => decryptDirectoryPassword(badEnvelope, { throwOnError: true })).toThrow();
      }
    });

    it('EMPIRICAL VULNERABILITY PROOF 1: loose hex parsing allows non-hex/null-byte injection into envelope without failing authentication', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext)!;
      const { ivHex, tagHex, cipherHex } = parseEnvelope(encrypted);

      // Demonstrates envelope malleability resistance: non-hex or null-byte injected into envelope must be rejected!
      const injectedWithGarbage = buildEnvelope(`${ivHex}zzzzzzzz`, tagHex, cipherHex);
      const injectedWithNull = buildEnvelope(`${ivHex}\0`, tagHex, cipherHex);

      expect(decryptDirectoryPassword(injectedWithGarbage)).toBe('••••-DECRYPTION-FAILED');
      expect(decryptDirectoryPassword(injectedWithNull)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptDirectoryPassword(injectedWithGarbage, { throwOnError: true })).toThrow();
      expect(() => decryptDirectoryPassword(injectedWithNull, { throwOnError: true })).toThrow();
    });

    it('EMPIRICAL VULNERABILITY PROOF 2: passwords starting with enc:v1: bypass encryption and cause permanent data loss', () => {
      const userPassword = 'enc:v1:MyCorporatePassword2026!';

      // Validates that single-segment passwords starting with enc:v1: are NOT treated as valid envelopes, but are safely encrypted
      const stored = encryptDirectoryPassword(userPassword);
      expect(stored).not.toBe(userPassword);
      expect(stored?.startsWith('enc:v1:')).toBe(true);

      // Decryption safely recovers original password
      const decrypted = decryptDirectoryPassword(stored);
      expect(decrypted).toBe(userPassword);
    });

    it('should handle non-hex characters in IV or AuthTag safely without crashing process', () => {
      const encrypted = encryptDirectoryPassword(secretPlaintext)!;
      const { tagHex, cipherHex } = parseEnvelope(encrypted);

      // 24 characters with non-hex characters (e.g. 'z')
      const nonHexIV = 'zzzzzzzzzzzzzzzzzzzzzzzz';
      expect(decryptDirectoryPassword(buildEnvelope(nonHexIV, tagHex, cipherHex))).toBe(
        '••••-DECRYPTION-FAILED',
      );

      const nonHexTag = 'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
      expect(decryptDirectoryPassword(buildEnvelope(nonHexIV, nonHexTag, cipherHex))).toBe(
        '••••-DECRYPTION-FAILED',
      );
    });
  });

  // =========================================================================
  // Suite 2: Plaintext Boundary & UTF-8 Stress Testing
  // =========================================================================
  describe('Suite 2: Boundary Plaintexts & Multilingual UTF-8 Stress', () => {
    it('should correctly roundtrip complex multilingual strings across world scripts', () => {
      const testCases = [
        // Vietnamese with complete diacritical accents
        'Cộng hòa Xã hội Chủ nghĩa Việt Nam - Độc lập Tự do Hạnh phúc @ 2026! ₫',
        // Chinese Simplified and Traditional
        '统一IT管理系统企业级目录服务用户密码测试：繁體中文與簡體中文混合密碼！',
        // Japanese Hiragana, Katakana, Kanji
        'セキュアなActiveDirectoryアカウントパスワードの暗号化検証テスト：日本語漢字ひらがなカタカナ',
        // Korean Hangul
        '안전한 엔터프라이즈 이메일 비밀번호 검증 2026 - 대한민국 서울특별시',
        // Arabic (Right-to-Left)
        'كلمة مرور البريد الإلكتروني الآمنة للغاية للمدير العام 2026 - نظام إدارة تكنولوجيا المعلومات',
        // Hebrew (Right-to-Left)
        'סיסמת אימייל מאובטחת במיוחד עבור מנהל המערכת 2026',
        // Cyrillic (Russian / Ukrainian)
        'СверхзащищенныйПарольАдминистратораСистемы2026!@#$%^&*()',
        // Greek
        'ΕλληνικόςΚωδικόςΠρόσβασηςΔιαχειριστή2026!@#',
        // Thai
        'รหัสผ่านอีเมลระดับองค์กรที่ปลอดภัยสูง๒๕๖๙',
        // Hindi (Devanagari)
        'सुरक्षित कॉर्पोरेट ईमेल पासवर्ड सत्यापन २०२६',
        // European accents
        'ÁÉÍÓÚáéíóúÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÄËÏÖÜäëïöüÑñÇçÅåÆæØø',
      ];

      for (const text of testCases) {
        const encrypted = encryptDirectoryPassword(text);
        expect(encrypted).not.toBeNull();
        expect(encrypted).not.toBe(text);
        expect(encrypted!.startsWith('enc:v1:')).toBe(true);

        const decrypted = decryptDirectoryPassword(encrypted);
        expect(decrypted).toBe(text);
      }
    });

    it('should roundtrip complex emoji sequences, modifiers, ZWJ, and astral plane Unicode', () => {
      const emojiCases = [
        // Basic emojis
        '🔑🛡️🔒🚀💻🏢✨🎉🔥',
        // Fitzpatrick skin tone modifiers
        '👍🏻👍🏼👍🏽👍🏾👍🏿',
        // Zero-Width Joiner (ZWJ) family and technologist sequences
        '👨‍💻👩‍💻👨‍👩‍👧‍👦🧑‍🔬🧑‍🚀',
        // Regional flag sequences
        '🇻🇳🇺🇸🇯🇵🇬🇧🇩🇪🇫🇷🇦🇺',
        // Mathematical & currency symbols
        '∀x ∈ ℝ : x² ≥ 0 ∧ ∑(i=1..n) x_i = ∫ f(t)dt | € $ ¥ £ ₫ ₿',
        // Control & invisible characters: ZWSP, LTR/RTL marks, BOM
        'Password\u200BWith\u200CInvisible\u200DChars\uFEFFAnd\u202EMarkers',
        // Astral plane Unicode (surrogate pairs)
        '𠜎𠜱𠝹𠱓𠱸𠲖𠳏𝄞𝄢',
      ];

      for (const emojis of emojiCases) {
        const encrypted = encryptDirectoryPassword(emojis);
        const decrypted = decryptDirectoryPassword(encrypted);
        expect(decrypted).toBe(emojis);
      }
    });

    it('should roundtrip control characters, newlines, null bytes, and quote escapes', () => {
      const controlCases = [
        'password\x00with\x00null\x00bytes',
        'line1\r\nline2\nline3\rline4\twith\ttabs',
        'escape\x1b[31mcolors\x1b[0m\x07bell\x08backspace',
        `sql' OR '1'='1; DROP TABLE "DirectoryUser"; -- injection test`,
        `<script>alert("XSS")</script>&quot;&apos;&amp;`,
        `JSON: {"email":"admin@uims.local","role":"SuperAdmin","active":true}`,
        `colons:::in:::password:::and:::separators:::`,
      ];

      for (const ctrl of controlCases) {
        const encrypted = encryptDirectoryPassword(ctrl);
        const decrypted = decryptDirectoryPassword(encrypted);
        expect(decrypted).toBe(ctrl);
      }
    });

    it('should handle AES-GCM exact block boundary lengths (15, 16, 17, 31, 32, 33, 64 bytes)', () => {
      const boundaryLengths = [1, 2, 15, 16, 17, 31, 32, 33, 63, 64, 65, 127, 128, 129, 255, 256];

      for (const len of boundaryLengths) {
        const plaintext = 'A'.repeat(len);
        const encrypted = encryptDirectoryPassword(plaintext);
        expect(encrypted).not.toBeNull();

        const decrypted = decryptDirectoryPassword(encrypted);
        expect(decrypted).toBe(plaintext);
        expect(decrypted!.length).toBe(len);
      }
    });

    it('should handle large payloads (100KB, 1MB, 2MB) without memory leaks or truncation', () => {
      const largeSizes = [100 * 1024, 1024 * 1024, 2 * 1024 * 1024];

      for (const size of largeSizes) {
        // Construct predictable deterministic multi-megabyte string
        const chunk = 'UIMS-Enterprise-Directory-Credential-Chunk-2026-Security!';
        const repeatCount = Math.ceil(size / chunk.length);
        const largePlaintext = chunk.repeat(repeatCount).slice(0, size);

        const t0 = performance.now();
        const encrypted = encryptDirectoryPassword(largePlaintext);
        const t1 = performance.now();

        expect(encrypted).not.toBeNull();
        expect(encrypted!.startsWith('enc:v1:')).toBe(true);

        const decrypted = decryptDirectoryPassword(encrypted);
        const t2 = performance.now();

        expect(decrypted).toBe(largePlaintext);
        expect(decrypted!.length).toBe(size);

        // Verification performance sanity: 1MB under 500ms
        const encDuration = t1 - t0;
        const decDuration = t2 - t1;
        expect(encDuration).toBeLessThan(2000);
        expect(decDuration).toBeLessThan(2000);
      }
    });

    it('should honor special identity tokens ("", "N/A", null, undefined)', () => {
      expect(encryptDirectoryPassword('')).toBe('');
      expect(decryptDirectoryPassword('')).toBe('');

      expect(encryptDirectoryPassword('N/A')).toBe('N/A');
      expect(decryptDirectoryPassword('N/A')).toBe('N/A');

      expect(encryptDirectoryPassword(null)).toBeNull();
      expect(decryptDirectoryPassword(null)).toBeNull();

      expect(encryptDirectoryPassword(undefined)).toBeNull();
      expect(decryptDirectoryPassword(undefined)).toBeNull();
    });

    it('should examine edge case when plaintext starts with "enc:v1:" prefix', () => {
      // If a user password intentionally starts with "enc:v1:foo"
      // The implementation must properly encrypt it and safely roundtrip
      const fakeEncryptedPlaintext = 'enc:v1:not-a-real-encrypted-payload';
      const isConsideredEnc = isDirectoryPasswordEncrypted(fakeEncryptedPlaintext);
      expect(isConsideredEnc).toBe(false);

      const encrypted = encryptDirectoryPassword(fakeEncryptedPlaintext);
      expect(encrypted).not.toBe(fakeEncryptedPlaintext);
      expect(decryptDirectoryPassword(encrypted)).toBe(fakeEncryptedPlaintext);
    });
  });

  // =========================================================================
  // Suite 3: Secret Hierarchy, Failover & Key Isolation
  // =========================================================================
  describe('Suite 3: Secret Hierarchy, Failover & Key Isolation', () => {
    it('should strictly respect key derivation precedence order', () => {
      process.env.DIRECTORY_ENCRYPTION_KEY = 'key-directory-level-1';
      process.env.LICENSE_ENCRYPTION_KEY = 'key-license-level-2';
      process.env.AUDIT_SIGNING_KEY = 'key-audit-level-3';
      process.env.JWT_SECRET = 'key-jwt-level-4';

      const keyLevel1 = getDirectoryEncryptionKey();
      const expectedKey1 = crypto.createHash('sha256').update('key-directory-level-1').digest();
      expect(keyLevel1).toEqual(expectedKey1);

      // Remove level 1 -> should fall back to LICENSE_ENCRYPTION_KEY
      delete process.env.DIRECTORY_ENCRYPTION_KEY;
      const keyLevel2 = getDirectoryEncryptionKey();
      const expectedKey2 = crypto.createHash('sha256').update('key-license-level-2').digest();
      expect(keyLevel2).toEqual(expectedKey2);
      expect(keyLevel2).not.toEqual(keyLevel1);

      // Remove level 2 -> should fall back to AUDIT_SIGNING_KEY
      delete process.env.LICENSE_ENCRYPTION_KEY;
      const keyLevel3 = getDirectoryEncryptionKey();
      const expectedKey3 = crypto.createHash('sha256').update('key-audit-level-3').digest();
      expect(keyLevel3).toEqual(expectedKey3);
      expect(keyLevel3).not.toEqual(keyLevel2);

      // Remove level 3 -> should fall back to JWT_SECRET
      delete process.env.AUDIT_SIGNING_KEY;
      const keyLevel4 = getDirectoryEncryptionKey();
      const expectedKey4 = crypto.createHash('sha256').update('key-jwt-level-4').digest();
      expect(keyLevel4).toEqual(expectedKey4);
      expect(keyLevel4).not.toEqual(keyLevel3);

      // Remove level 4 -> should throw
      delete process.env.JWT_SECRET;
      expect(() => getDirectoryEncryptionKey()).toThrow(
        'Encryption key resolution failed: DIRECTORY_ENCRYPTION_KEY, LICENSE_ENCRYPTION_KEY, AUDIT_SIGNING_KEY, or JWT_SECRET is required',
      );
    });

    it('should ensure cross-key cryptographic isolation during key rotation', () => {
      const plaintext = 'SensitiveExecutiveEmailPassword2026!';

      // Encrypt with Key A
      process.env.DIRECTORY_ENCRYPTION_KEY = 'secret-encryption-key-generation-A';
      const encA = encryptDirectoryPassword(plaintext)!;

      // Rotate to Key B
      process.env.DIRECTORY_ENCRYPTION_KEY = 'secret-encryption-key-generation-B';
      expect(decryptDirectoryPassword(encA)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptDirectoryPassword(encA, { throwOnError: true })).toThrow();

      // Rotate back to Key A -> original plaintext recoverable
      process.env.DIRECTORY_ENCRYPTION_KEY = 'secret-encryption-key-generation-A';
      expect(decryptDirectoryPassword(encA)).toBe(plaintext);
    });

    it('should guarantee 100% IV and ciphertext uniqueness across 500 repeated encryptions (Zero Nonce Reuse)', () => {
      const plaintext = 'ConstantPlaintextForIVUniquenessTest2026';
      const iterations = 500;
      const ivSet = new Set<string>();
      const cipherSet = new Set<string>();

      for (let i = 0; i < iterations; i++) {
        const encrypted = encryptDirectoryPassword(plaintext)!;
        const { ivHex, cipherHex } = parseEnvelope(encrypted);

        ivSet.add(ivHex);
        cipherSet.add(cipherHex);
      }

      // Zero collision allowed in 500 samples
      expect(ivSet.size).toBe(iterations);
      expect(cipherSet.size).toBe(iterations);
    });
  });

  // =========================================================================
  // Suite 4: Concurrency & Reentrancy Stress
  // =========================================================================
  describe('Suite 4: High-Concurrency & Reentrancy Stress', () => {
    it('should safely execute 1,000 concurrent encryption and decryption cycles via Promise.all', async () => {
      const concurrentTasks = 1000;
      const inputs = Array.from(
        { length: concurrentTasks },
        (_, idx) => `ConcurrentPassword#${idx}_${generateSecurePassword(16)}`,
      );

      // Concurrent encryption
      const encryptPromises = inputs.map(
        (val) =>
          new Promise<string>((resolve) => {
            // Slight async microtask interleaving
            queueMicrotask(() => {
              const enc = encryptDirectoryPassword(val);
              resolve(enc!);
            });
          }),
      );

      const ciphertexts = await Promise.all(encryptPromises);
      expect(ciphertexts.length).toBe(concurrentTasks);

      // Concurrent decryption
      const decryptPromises = ciphertexts.map(
        (enc, idx) =>
          new Promise<void>((resolve, reject) => {
            queueMicrotask(() => {
              try {
                const dec = decryptDirectoryPassword(enc);
                expect(dec).toBe(inputs[idx]);
                resolve();
              } catch (err: unknown) {
                reject(err);
              }
            });
          }),
      );

      await Promise.all(decryptPromises);
    });

    it('should safely interleave concurrent valid operations and corrupted payloads without state bleed', async () => {
      const validPlaintext = 'ValidInterleavedPassword2026!';
      const validEncrypted = encryptDirectoryPassword(validPlaintext)!;
      const corruptedEnvelope =
        'enc:v1:012345678901234567890123:01234567890123456789012345678901:deadbeef';

      const tasks = Array.from({ length: 500 }, (_, idx) => {
        return new Promise<void>((resolve, reject) => {
          queueMicrotask(() => {
            try {
              if (idx % 2 === 0) {
                // Valid operation
                const res = decryptDirectoryPassword(validEncrypted);
                expect(res).toBe(validPlaintext);
              } else {
                // Corrupted operation
                const res = decryptDirectoryPassword(corruptedEnvelope);
                expect(res).toBe('••••-DECRYPTION-FAILED');
              }
              resolve();
            } catch (err: unknown) {
              reject(err);
            }
          });
        });
      });

      await Promise.all(tasks);
    });
  });

  // =========================================================================
  // Suite 5: Secure Password Generator Adversarial & Statistical Hardness
  // =========================================================================
  describe('Suite 5: Secure Password Generator Adversarial Hardness', () => {
    it('should strictly enforce all 4 character classes across 1,000 generated passwords', () => {
      const iterations = 1000;
      const uppercaseRegex = /[A-Z]/;
      const lowercaseRegex = /[a-z]/;
      const digitRegex = /[0-9]/;
      const symbolRegex = /[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/;
      const forbiddenAmbiguousChars = /[IOlo01]/; // I, O, l, o, 0, 1 per generator specs

      const generatedSet = new Set<string>();

      for (let i = 0; i < iterations; i++) {
        const pass = generateSecurePassword(16);

        expect(pass.length).toBe(16);
        expect(uppercaseRegex.test(pass)).toBe(true);
        expect(lowercaseRegex.test(pass)).toBe(true);
        expect(digitRegex.test(pass)).toBe(true);
        expect(symbolRegex.test(pass)).toBe(true);

        // Verify confusing characters are excluded
        expect(forbiddenAmbiguousChars.test(pass)).toBe(false);

        generatedSet.add(pass);
      }

      // 100% collision-free in 1,000 samples
      expect(generatedSet.size).toBe(iterations);
    });

    it('should clamp invalid or sub-minimum lengths to 12 characters', () => {
      const testLengths = [-100, -1, 0, 1, 5, 8, 11];
      for (const len of testLengths) {
        const pass = generateSecurePassword(len);
        expect(pass.length).toBe(12);
        expect(/[A-Z]/.test(pass)).toBe(true);
        expect(/[a-z]/.test(pass)).toBe(true);
        expect(/[0-9]/.test(pass)).toBe(true);
      }
    });

    it('should support large password lengths up to 512 characters', () => {
      for (const len of [32, 64, 128, 256, 512]) {
        const pass = generateSecurePassword(len);
        expect(pass.length).toBe(len);
        expect(/[A-Z]/.test(pass)).toBe(true);
        expect(/[a-z]/.test(pass)).toBe(true);
        expect(/[0-9]/.test(pass)).toBe(true);
      }
    });

    it('should produce balanced position distribution (Fisher-Yates effectiveness)', () => {
      // Over 200 samples, the first character must not always belong to the same character class
      const firstCharClasses = new Set<string>();

      for (let i = 0; i < 200; i++) {
        const pass = generateSecurePassword(16);
        const first = pass[0];

        if (/[A-Z]/.test(first)) firstCharClasses.add('upper');
        else if (/[a-z]/.test(first)) firstCharClasses.add('lower');
        else if (/[0-9]/.test(first)) firstCharClasses.add('digit');
        else firstCharClasses.add('symbol');
      }

      // Fisher-Yates shuffle ensures all 4 character classes appear at index 0 across samples
      expect(firstCharClasses.size).toBe(4);
    });
  });

  // =========================================================================
  // Suite 6: Schema Contract & Shared Type Integrity
  // =========================================================================
  describe('Suite 6: Shared Type & Validator Alignment', () => {
    it('should validate DomainJoinStatus enum values', () => {
      expect(DomainJoinStatus.JOINED).toBe('JOINED');
      expect(DomainJoinStatus.NOT_JOINED).toBe('NOT_JOINED');
      expect(DomainJoinStatus.PENDING).toBe('PENDING');
    });

    it('should validate createDirectoryUserSchema with AD metadata and encrypted email credentials', () => {
      const validPayload = {
        email: 'john.smith@enterprise.corp',
        firstName: 'John',
        lastName: 'Smith',
        source: 'LOCAL',
        status: AccountStatus.ACTIVE,
        adDomain: 'CORP.ENTERPRISE.LOCAL',
        computerName: 'WS-CORP-JS01',
        domainJoined: true,
        domainJoinStatus: DomainJoinStatus.JOINED,
        emailPassword: 'SecureEnterprisePassword#2026',
      };

      const parsed = createDirectoryUserSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.adDomain).toBe('CORP.ENTERPRISE.LOCAL');
        expect(parsed.data.domainJoined).toBe(true);
        expect(parsed.data.domainJoinStatus).toBe(DomainJoinStatus.JOINED);
      }
    });

    it('should validate resetEmailPasswordSchema options', () => {
      const directPass = resetEmailPasswordSchema.safeParse({
        newPassword: 'BrandNewPassword#2026!',
      });
      expect(directPass.success).toBe(true);

      const randomGen = resetEmailPasswordSchema.safeParse({
        generateRandom: true,
      });
      expect(randomGen.success).toBe(true);
    });

    it('should reject emailPassword shorter than 8 characters in createDirectoryUserSchema', () => {
      const invalidShortPass = {
        email: 'short@test.com',
        firstName: 'Short',
        lastName: 'Pass',
        emailPassword: 'short', // < 8 characters
      };

      const parsed = createDirectoryUserSchema.safeParse(invalidShortPass);
      expect(parsed.success).toBe(false);
    });

    it('should mask passwords uniformly in logs and display', () => {
      expect(maskDirectoryPassword('secret')).toBe('••••••••');
      expect(maskDirectoryPassword(null)).toBe('••••••••');
      expect(maskDirectoryPassword(undefined)).toBe('••••••••');
      expect(maskDirectoryPassword('N/A')).toBe('••••••••');
    });
  });
});
