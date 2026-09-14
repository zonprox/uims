import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  decryptLicenseKey,
  encryptLicenseKey,
  maskLicenseKey,
} from '../../src/common/crypto/license-crypto';
import type { PrismaService } from '../../src/database/prisma.service';
import { LicensesService } from '../../src/modules/licenses/licenses.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Milestone 1 Challenger M1-1 — Empirical License Key Cryptography Stress Suite', () => {
  let prisma: PrismaClient;
  let pgPool: Pool;
  let isDbAvailable = false;

  beforeAll(async () => {
    process.env.LICENSE_ENCRYPTION_KEY =
      process.env.LICENSE_ENCRYPTION_KEY || 'challenger-secure-key-32-chars-long-2026!';

    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';

    try {
      pgPool = new Pool({ connectionString });
      const adapter = new PrismaPg(pgPool);
      prisma = new PrismaClient({ adapter });

      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch {
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (isDbAvailable) {
      if (prisma) {
        await prisma.$disconnect();
      }
      if (pgPool) {
        await pgPool.end();
      }
    }
  });

  // =========================================================================
  // EXPERIMENT 1: Randomness & IV Uniqueness (5,000 iterations)
  // =========================================================================
  describe('Experiment 1: Randomness & IV Uniqueness (5,000 iterations)', () => {
    it('should verify 5,000 encryptions produce 5,000 distinct IVs, ciphertexts, and authTags (0 collisions)', () => {
      const ITERATIONS = 5000;
      const plaintext = 'ENTERPRISE-PROD-KEY-2026-X99Z-AUTHENTICATED';

      const ivSet = new Set<string>();
      const cipherSet = new Set<string>();
      const authTagSet = new Set<string>();
      let totalBitsCount = 0;
      let oneBitsCount = 0;

      for (let i = 0; i < ITERATIONS; i++) {
        const enc = encryptLicenseKey(plaintext);
        expect(enc.startsWith('enc:v1:')).toBe(true);

        const parts = enc.slice('enc:v1:'.length).split(':');
        expect(parts.length).toBe(3);

        const [ivHex, tagHex, cipherHex] = parts;
        expect(ivHex.length).toBe(24); // 12 bytes = 24 hex characters
        expect(tagHex.length).toBe(32); // 16 bytes = 32 hex characters

        // Bit entropy tracking
        const ivBuf = Buffer.from(ivHex, 'hex');
        for (const byte of ivBuf) {
          for (let bit = 0; bit < 8; bit++) {
            totalBitsCount++;
            if ((byte >> bit) & 1) {
              oneBitsCount++;
            }
          }
        }

        ivSet.add(ivHex);
        authTagSet.add(tagHex);
        cipherSet.add(cipherHex);

        const dec = decryptLicenseKey(enc);
        expect(dec).toBe(plaintext);
      }

      // Assert 0 collisions across 5,000 executions
      expect(ivSet.size).toBe(ITERATIONS);
      expect(cipherSet.size).toBe(ITERATIONS);
      expect(authTagSet.size).toBe(ITERATIONS);

      // Verify uniform bit distribution (approx 50% 1s)
      const bitRatio = oneBitsCount / totalBitsCount;
      expect(bitRatio).toBeGreaterThanOrEqual(0.48);
      expect(bitRatio).toBeLessThanOrEqual(0.52);
    });
  });

  // =========================================================================
  // EXPERIMENT 2: Tamper Resistance (Bit-level mutations & Malformed Payloads)
  // =========================================================================
  describe('Experiment 2: Tamper Resistance', () => {
    const basePlaintext = 'TAMPER-RESISTANT-LICENSE-KEY-GCM-2026';
    const baseEnc = encryptLicenseKey(basePlaintext);
    const baseParts = baseEnc.slice('enc:v1:'.length).split(':');
    const baseIvHex = baseParts[0];
    const baseTagHex = baseParts[1];
    const baseCipherHex = baseParts[2];

    const baseIvBuf = Buffer.from(baseIvHex, 'hex');
    const baseTagBuf = Buffer.from(baseTagHex, 'hex');
    const baseCipherBuf = Buffer.from(baseCipherHex, 'hex');

    it('should reject all 96 single-bit mutations across all 12 bytes of IV', () => {
      let rejectedCount = 0;
      for (let byteIdx = 0; byteIdx < baseIvBuf.length; byteIdx++) {
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
          const tamperedIv = Buffer.from(baseIvBuf);
          tamperedIv[byteIdx] ^= 1 << bitIdx;
          const tamperedEnc = `enc:v1:${tamperedIv.toString('hex')}:${baseTagHex}:${baseCipherHex}`;

          const dec = decryptLicenseKey(tamperedEnc);
          expect(dec).toBe('••••-DECRYPTION-FAILED');
          expect(() => decryptLicenseKey(tamperedEnc, { throwOnError: true })).toThrow();
          rejectedCount++;
        }
      }
      expect(rejectedCount).toBe(96);
    });

    it('should reject all 128 single-bit mutations across all 16 bytes of AuthTag', () => {
      let rejectedCount = 0;
      for (let byteIdx = 0; byteIdx < baseTagBuf.length; byteIdx++) {
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
          const tamperedTag = Buffer.from(baseTagBuf);
          tamperedTag[byteIdx] ^= 1 << bitIdx;
          const tamperedEnc = `enc:v1:${baseIvHex}:${tamperedTag.toString('hex')}:${baseCipherHex}`;

          const dec = decryptLicenseKey(tamperedEnc);
          expect(dec).toBe('••••-DECRYPTION-FAILED');
          expect(() => decryptLicenseKey(tamperedEnc, { throwOnError: true })).toThrow();
          rejectedCount++;
        }
      }
      expect(rejectedCount).toBe(128);
    });

    it('should reject all single-bit mutations across all bytes of Ciphertext', () => {
      let rejectedCount = 0;
      const totalBits = baseCipherBuf.length * 8;
      for (let byteIdx = 0; byteIdx < baseCipherBuf.length; byteIdx++) {
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
          const tamperedCipher = Buffer.from(baseCipherBuf);
          tamperedCipher[byteIdx] ^= 1 << bitIdx;
          const tamperedEnc = `enc:v1:${baseIvHex}:${baseTagHex}:${tamperedCipher.toString('hex')}`;

          const dec = decryptLicenseKey(tamperedEnc);
          expect(dec).toBe('••••-DECRYPTION-FAILED');
          expect(() => decryptLicenseKey(tamperedEnc, { throwOnError: true })).toThrow();
          rejectedCount++;
        }
      }
      expect(rejectedCount).toBe(totalBits);
    });

    it('should reject truncation and extension attacks on IV, Tag, and Ciphertext', () => {
      const truncatedIv = `enc:v1:${baseIvHex.slice(0, -2)}:${baseTagHex}:${baseCipherHex}`;
      expect(decryptLicenseKey(truncatedIv)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(truncatedIv, { throwOnError: true })).toThrow();

      const extendedIv = `enc:v1:${baseIvHex}ff:${baseTagHex}:${baseCipherHex}`;
      expect(decryptLicenseKey(extendedIv)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(extendedIv, { throwOnError: true })).toThrow();

      const truncatedTag = `enc:v1:${baseIvHex}:${baseTagHex.slice(0, -2)}:${baseCipherHex}`;
      expect(decryptLicenseKey(truncatedTag)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(truncatedTag, { throwOnError: true })).toThrow();

      const extendedTag = `enc:v1:${baseIvHex}:${baseTagHex}ff:${baseCipherHex}`;
      expect(decryptLicenseKey(extendedTag)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(extendedTag, { throwOnError: true })).toThrow();

      const truncatedCipher = `enc:v1:${baseIvHex}:${baseTagHex}:${baseCipherHex.slice(0, -2)}`;
      expect(decryptLicenseKey(truncatedCipher)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(truncatedCipher, { throwOnError: true })).toThrow();

      const extendedCipher = `enc:v1:${baseIvHex}:${baseTagHex}:${baseCipherHex}aabb`;
      expect(decryptLicenseKey(extendedCipher)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(extendedCipher, { throwOnError: true })).toThrow();
    });

    it('should safely handle malformed structures and non-hex inputs without crashing', () => {
      const malformedCases = [
        'enc:v1:',
        'enc:v1:onlyonepart',
        'enc:v1:part1:part2',
        'enc:v1:part1:part2:part3:part4',
        'enc:v1:::empty',
        `enc:v1:${baseIvHex}::${baseCipherHex}`,
        `enc:v1:${baseIvHex}:${baseTagHex}:`,
        `enc:v1:nonhex!@#$nonhex!@#$nonh:${baseTagHex}:${baseCipherHex}`,
        `enc:v1:${baseIvHex}:nonhex!@#$nonhex!@#$nonhex!@#$no:${baseCipherHex}`,
        `enc:v1:${baseIvHex}:${baseTagHex}:invalid-hex-here`,
      ];

      for (const tc of malformedCases) {
        expect(decryptLicenseKey(tc)).toBe('••••-DECRYPTION-FAILED');
        expect(() => decryptLicenseKey(tc, { throwOnError: true })).toThrow();
      }
    });

    it('should reject decryption when a different key is configured', () => {
      const origKey = process.env.LICENSE_ENCRYPTION_KEY;
      const keyA_enc = encryptLicenseKey('CONFIDENTIAL-KEY-DATA');

      process.env.LICENSE_ENCRYPTION_KEY = 'alternate-encryption-key-for-mismatch!';
      expect(decryptLicenseKey(keyA_enc)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(keyA_enc, { throwOnError: true })).toThrow();

      process.env.LICENSE_ENCRYPTION_KEY = origKey;
    });
  });

  // =========================================================================
  // EXPERIMENT 3: Edge Case Inputs (Empty, Whitespace, Unicode, 100KB+)
  // =========================================================================
  describe('Experiment 3: Edge Case Inputs', () => {
    it('should preserve empty strings and sentinel values as-is', () => {
      expect(encryptLicenseKey('')).toBe('');
      expect(decryptLicenseKey('')).toBe('');
      expect(encryptLicenseKey('N/A')).toBe('N/A');
      expect(decryptLicenseKey('N/A')).toBe('N/A');
      expect(encryptLicenseKey(null)).toBeNull();
      expect(decryptLicenseKey(null)).toBeNull();
      expect(encryptLicenseKey(undefined)).toBeNull();
      expect(decryptLicenseKey(undefined)).toBeNull();
    });

    it('should preserve whitespace exactness during encryption and decryption', () => {
      const whitespaceInputs = [
        ' ',
        '          ',
        '\t\n\r\n\t',
        '   LEADING-AND-TRAILING   ',
        'INSIDE \t\n SPACES',
      ];
      for (const ws of whitespaceInputs) {
        const enc = encryptLicenseKey(ws);
        const dec = decryptLicenseKey(enc);
        expect(dec).toBe(ws);
      }
    });

    it('should preserve full roundtrip integrity for multi-language non-Latin Unicode', () => {
      const unicodeInputs = [
        'マイクロソフト-ライセンス-東京-2026-製品-エンタープライズ', // Japanese
        'Giấy phép bản quyền UIMS 2026 - Doanh nghiệp Việt Nam - Đặng Quốc Bảo', // Vietnamese
        'مفتاح ترخيص نظام تكنولوجيا المعلومات الموحد ٢٠٢٦ - نسخة أصلية', // Arabic
        'Лицензионный ключ программного обеспечения предприятия 2026', // Russian
        '统一IT管理系统企业版软件许可证密钥-2026-繁體中文-測試', // Chinese
        '엔터프라이즈 소프트웨어 라이선스 키 2026 - 대한민국', // Korean
        'รหัสใบอนุญาตซอฟต์แวร์ระดับองค์กร 2026 - ประเทศไทย', // Thai
        'एंटरप्राइज सॉफ्टवेयर लाइसेंस कुंजी 2026 - भारत', // Hindi
        'Κλειδί άδειας χρήσης λογισμικού 2026', // Greek
        'מפתח רישיון תוכנה ארגוני 2026', // Hebrew
      ];

      for (const text of unicodeInputs) {
        const enc = encryptLicenseKey(text);
        const dec = decryptLicenseKey(enc);
        expect(dec).toBe(text);
      }
    });

    it('should handle complex emojis, surrogate pairs, and embedded control bytes', () => {
      const complexInputs = [
        '🔑🛡️💻🚀🔥⚡🌟🎉',
        '👨‍💻👩‍💼🏳️‍🌈👨‍👩‍👧‍👦',
        '𝔘ℑ𝔐𝔖-𝟚𝟘𝟚𝟞-∑∏∫-√π',
        'BINARY\x00NULL\x00BYTE\x00TEST',
        'CONTROL\x01\x02\x03\x1f\x7fTEST',
      ];

      for (const text of complexInputs) {
        const enc = encryptLicenseKey(text);
        const dec = decryptLicenseKey(enc);
        expect(dec).toBe(text);
      }
    });

    it('should efficiently encrypt and decrypt large payloads (1KB to 500KB)', () => {
      const sizes = [1024, 10 * 1024, 100 * 1024, 500 * 1024];
      for (const size of sizes) {
        const payload = 'X'.repeat(size / 2) + '🚀'.repeat(size / 8) + 'Y'.repeat(size / 4);
        const enc = encryptLicenseKey(payload);
        const dec = decryptLicenseKey(enc);
        expect(dec).toBe(payload);
      }
    });

    it('should ensure encryptLicenseKey is idempotent (prevents double encryption)', () => {
      const raw = 'IDEMPOTENT-CHECK-KEY';
      const enc1 = encryptLicenseKey(raw);
      const enc2 = encryptLicenseKey(enc1);
      expect(enc2).toBe(enc1);
    });

    it('should properly mask license keys in various formats', () => {
      expect(maskLicenseKey(null)).toBe('N/A');
      expect(maskLicenseKey(undefined)).toBe('N/A');
      expect(maskLicenseKey('')).toBe('N/A');
      expect(maskLicenseKey('N/A')).toBe('N/A');
      expect(maskLicenseKey('SHORT')).toBe('SHORT');
      expect(maskLicenseKey('12345678')).toBe('12345678');
      expect(maskLicenseKey('123456789')).toBe('••••-••••-6789');
      expect(maskLicenseKey('MS-E5-YON-9921-8834-KKL9')).toBe('••••-••••-KKL9');
    });
  });

  // =========================================================================
  // EXPERIMENT 4: Legacy / Plaintext Compatibility
  // =========================================================================
  describe('Experiment 4: Legacy / Plaintext Compatibility', () => {
    const legacyKeys = [
      'MS-E5-YON-9921-8834-KKL9',
      'SAP-S4H-YON-8849-0192-PROD',
      'PERPETUAL-LEGACY-2021',
      '123e4567-e89b-12d3-a456-426614174000',
      'KEY:WITH:COLONS:1234:ABCD',
      'enc:v2:future-unsupported-format',
      'encryption-legacy-prefix',
      'enc:',
      'enc:v1',
    ];

    it('should return legacy plaintext as-is on decryption and upgrade cleanly on encryption', () => {
      for (const lk of legacyKeys) {
        // Safe fallback: return as-is
        expect(decryptLicenseKey(lk)).toBe(lk);

        // Upgrade
        const upgraded = encryptLicenseKey(lk);
        expect(upgraded.startsWith('enc:v1:')).toBe(true);

        // Decrypt upgraded
        const decUpgraded = decryptLicenseKey(upgraded);
        expect(decUpgraded).toBe(lk);
      }
    });
  });

  // =========================================================================
  // EXPERIMENT 5: Service Integration & Real PostgreSQL Verification
  // =========================================================================
  describe('Experiment 5: Service Integration & PostgreSQL Verification', () => {
    it('should encrypt keys at rest in PostgreSQL, decrypt on retrieval, and handle DB corruption safely', async () => {
      if (!isDbAvailable) return;

      const licensesService = new LicensesService(prisma as unknown as PrismaService);
      const testPlaintextKey = 'CHALLENGER-AUDIT-KEY-9999-ABCD';
      const testLicenseName = `Challenger-Test-License-${Date.now()}`;

      // 1. Create License via Service
      const created = await licensesService.create({
        name: testLicenseName,
        vendor: 'Challenger Security Labs',
        type: 'Subscription',
        totalSeats: 25,
        costPerSeat: 150,
        licenseKey: testPlaintextKey,
        notes: 'Ephemeral test license for challenger verification',
      });

      expect(created.id).toBeDefined();
      expect(created.licenseKey).toBe(testPlaintextKey);
      expect(created.maskedKey).toBe('••••-••••-ABCD');

      // 2. Direct PostgreSQL Inspection
      const rawDbRow = await prisma.license.findUnique({
        where: { id: created.id },
      });

      expect(rawDbRow).not.toBeNull();
      expect(rawDbRow!.licenseKey).not.toBe(testPlaintextKey);
      expect(rawDbRow!.licenseKey!.startsWith('enc:v1:')).toBe(true);

      const parts = rawDbRow!.licenseKey!.slice('enc:v1:'.length).split(':');
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBe(24);
      expect(parts[1].length).toBe(32);

      // 3. Service findOne
      const fetched = await licensesService.findOne(created.id);
      expect(fetched.licenseKey).toBe(testPlaintextKey);
      expect(fetched.maskedKey).toBe('••••-••••-ABCD');

      // 4. Service findAll with search
      const searchByName = await licensesService.findAll({ search: testLicenseName });
      expect(searchByName.some((l) => l.id === created.id)).toBe(true);

      const searchByCipher = await licensesService.findAll({ search: parts[2].slice(0, 10) });
      expect(searchByCipher.some((l) => l.id === created.id)).toBe(false);

      // 5. Service update with new key
      const updatedKey = 'CHALLENGER-NEW-KEY-8888-WXYZ';
      const updated = await licensesService.update(created.id, {
        licenseKey: updatedKey,
      });

      expect(updated.licenseKey).toBe(updatedKey);
      expect(updated.maskedKey).toBe('••••-••••-WXYZ');

      const updatedDbRow = await prisma.license.findUnique({
        where: { id: created.id },
      });
      expect(updatedDbRow!.licenseKey).not.toBe(rawDbRow!.licenseKey);
      expect(updatedDbRow!.licenseKey!.startsWith('enc:v1:')).toBe(true);

      // 6. Direct DB corruption and graceful handling
      await prisma.license.update({
        where: { id: created.id },
        data: {
          licenseKey:
            'enc:v1:00112233445566778899aabb:00112233445566778899aabbccddeeff:deadbeefcafebabe',
        },
      });

      const corrupted = await licensesService.findOne(created.id);
      expect(corrupted.licenseKey).toBe('••••-DECRYPTION-FAILED');
      expect(corrupted.maskedKey).toBeDefined();

      // 7. Cleanup
      await licensesService.remove(created.id);
      const verifyDeleted = await prisma.license.findUnique({ where: { id: created.id } });
      expect(verifyDeleted).toBeNull();
    });
  });
});
