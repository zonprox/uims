import * as crypto from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decryptLicenseKey,
  encryptLicenseKey,
  getLicenseEncryptionKey,
  isLicenseKeyEncrypted,
  maskLicenseKey,
} from '../../src/common/crypto/license-crypto';
import { UsersService, generateSecureRandomPassword } from '../../src/modules/users/users.service';
import type { PrismaService } from '../../src/database/prisma.service';
import * as SharedUtils from '@uims/shared-utils';

describe('Milestone 2 Challenger 2 — Adversarial Verification of Crypto, Security & Shared Utils', () => {
  // =========================================================================
  // 1. LICENSE CRYPTO ADVERSARIAL CHALLENGES
  // =========================================================================
  describe('1. License Cryptography Robustness & Tamper Rejection', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.LICENSE_ENCRYPTION_KEY = 'm2-challenger-secure-key-32-chars-long!';
      delete process.env.AUDIT_SIGNING_KEY;
      delete process.env.JWT_SECRET;
    });

    it('1.1 should derive 32-byte key following exact secret precedence hierarchy', () => {
      // Precedence 1: LICENSE_ENCRYPTION_KEY
      process.env.LICENSE_ENCRYPTION_KEY = 'primary-key-secret-32-chars-test';
      process.env.AUDIT_SIGNING_KEY = 'audit-key-secret-32-chars-test';
      process.env.JWT_SECRET = 'jwt-key-secret-32-chars-test';

      const expectedPrimary = crypto
        .createHash('sha256')
        .update('primary-key-secret-32-chars-test')
        .digest();
      expect(getLicenseEncryptionKey()).toEqual(expectedPrimary);

      // Precedence 2: AUDIT_SIGNING_KEY when primary missing
      delete process.env.LICENSE_ENCRYPTION_KEY;
      const expectedAudit = crypto
        .createHash('sha256')
        .update('audit-key-secret-32-chars-test')
        .digest();
      expect(getLicenseEncryptionKey()).toEqual(expectedAudit);

      // Precedence 3: JWT_SECRET when primary & audit missing
      delete process.env.AUDIT_SIGNING_KEY;
      const expectedJwt = crypto
        .createHash('sha256')
        .update('jwt-key-secret-32-chars-test')
        .digest();
      expect(getLicenseEncryptionKey()).toEqual(expectedJwt);

      // Fail-fast when all missing
      delete process.env.JWT_SECRET;
      expect(() => getLicenseEncryptionKey()).toThrow(/Encryption key resolution failed/);

      // Fail-fast when whitespace only
      process.env.LICENSE_ENCRYPTION_KEY = '   \t  \n ';
      expect(() => getLicenseEncryptionKey()).toThrow(/Encryption key resolution failed/);
    });

    it('1.2 should strictly reject unencrypted plaintext strings (no passthrough) returning ••••-DECRYPTION-FAILED or throwing', () => {
      const unencryptedInputs = [
        'MS-E5-YON-9921-8834-KKL9',
        'SAP-S4H-YON-8849-0192-PROD',
        'PLAIN_TEXT_LICENSE_KEY_1234',
        'key:with:colons:but:not:prefix',
        'enc:v2:future:key:format',
        'enc:v1',
        'enc:v1:',
        'ENC:V1:UPPERCASE:PREFIX:TEST',
        '12345678901234567890',
        '{"json":"key","payload":123}',
        'SELECT * FROM "License"; DROP TABLE "License";',
      ];

      for (const input of unencryptedInputs) {
        // Must NEVER pass through plaintext
        const result = decryptLicenseKey(input);
        expect(result).toBe('••••-DECRYPTION-FAILED');
        expect(result).not.toBe(input);

        // When throwOnError is true, must throw an Error
        expect(() => decryptLicenseKey(input, { throwOnError: true })).toThrow();
      }
    });

    it('1.3 should reject malformed enc:v1 payloads (wrong parts count, invalid IV/tag lengths)', () => {
      const malformedPayloads = [
        'enc:v1:',
        'enc:v1:singlepart',
        'enc:v1:two:parts',
        'enc:v1:one:two:three:four',
        'enc:v1:one:two:three:four:five',
        'enc:v1:::empty',
        // IV too short (10 hex characters instead of 24)
        'enc:v1:1234567890:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d:aabbccdd',
        // AuthTag too short (20 hex characters instead of 32)
        'enc:v1:123456789012345678901234:1a2b3c4d5e6f7a8b9c0d:aabbccdd',
        // IV too long (28 hex characters)
        'enc:v1:1234567890123456789012345678:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d:aabbccdd',
        // Non-hex chars in IV
        'enc:v1:zzzzzzzzzzzzzzzzzzzzzzzz:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d:aabbccdd',
      ];

      for (const payload of malformedPayloads) {
        expect(decryptLicenseKey(payload)).toBe('••••-DECRYPTION-FAILED');
        expect(() => decryptLicenseKey(payload, { throwOnError: true })).toThrow();
      }
    });

    it('1.4 should reject corrupted or tampered ciphertext with NIST AES-GCM authentication failure', () => {
      const plaintext = 'HIGHLY-CONFIDENTIAL-ENTERPRISE-KEY-9876';
      const validEnc = encryptLicenseKey(plaintext);
      expect(validEnc.startsWith('enc:v1:')).toBe(true);

      const parts = validEnc.slice('enc:v1:'.length).split(':');
      const [ivHex, tagHex, cipherHex] = parts;

      const flipHexByte = (hex: string, index = 0): string => {
        const byte = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
        const flipped = (byte ^ 0xff).toString(16).padStart(2, '0');
        return `${hex.slice(0, index * 2)}${flipped}${hex.slice(index * 2 + 2)}`;
      };

      // 1. Bit-flip in IV
      const corruptedIv = flipHexByte(ivHex);
      const tamperedIvPayload = `enc:v1:${corruptedIv}:${tagHex}:${cipherHex}`;
      expect(decryptLicenseKey(tamperedIvPayload)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(tamperedIvPayload, { throwOnError: true })).toThrow();

      // 2. Bit-flip in AuthTag
      const corruptedTag = flipHexByte(tagHex);
      const tamperedTagPayload = `enc:v1:${ivHex}:${corruptedTag}:${cipherHex}`;
      expect(decryptLicenseKey(tamperedTagPayload)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(tamperedTagPayload, { throwOnError: true })).toThrow();

      // 3. Bit-flip in Ciphertext
      const corruptedCipher = flipHexByte(cipherHex);
      const tamperedCipherPayload = `enc:v1:${ivHex}:${tagHex}:${corruptedCipher}`;
      expect(decryptLicenseKey(tamperedCipherPayload)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(tamperedCipherPayload, { throwOnError: true })).toThrow();

      // 4. Truncated Ciphertext
      const truncatedCipherPayload = `enc:v1:${ivHex}:${tagHex}:${cipherHex.slice(0, -2)}`;
      expect(decryptLicenseKey(truncatedCipherPayload)).toBe('••••-DECRYPTION-FAILED');
      expect(() => decryptLicenseKey(truncatedCipherPayload, { throwOnError: true })).toThrow();
    });

    it('1.5 Fuzz Stress Test: 1,000 randomized corrupt/adversarial strings must NEVER leak plaintext or crash', () => {
      const randomStrings: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const randLen = Math.floor(Math.random() * 80) + 1;
        const randBytes = crypto.randomBytes(randLen);
        const choice = i % 5;
        if (choice === 0) {
          randomStrings.push(randBytes.toString('hex'));
        } else if (choice === 1) {
          randomStrings.push(randBytes.toString('base64'));
        } else if (choice === 2) {
          randomStrings.push(`enc:v1:${randBytes.toString('hex')}`);
        } else if (choice === 3) {
          randomStrings.push(`enc:v1:${randBytes.toString('hex')}:${randBytes.toString('hex')}`);
        } else {
          randomStrings.push(
            `enc:v1:${randBytes.toString('hex')}:${randBytes.toString('hex')}:${randBytes.toString('hex')}`,
          );
        }
      }

      for (const randInput of randomStrings) {
        let decResult: string | null = null;
        expect(() => {
          decResult = decryptLicenseKey(randInput);
        }).not.toThrow();

        // Must either fail gracefully or (astronomically unlikely) decrypt if it happened to be valid GCM
        if (decResult !== '••••-DECRYPTION-FAILED') {
          // If not failed, it must not be the raw input string
          expect(decResult).not.toBe(randInput);
        }
      }
    });

    it('1.6 should preserve empty and sentinel values exactly as-is', () => {
      expect(encryptLicenseKey('')).toBe('');
      expect(decryptLicenseKey('')).toBe('');
      expect(encryptLicenseKey('N/A')).toBe('N/A');
      expect(decryptLicenseKey('N/A')).toBe('N/A');
      expect(encryptLicenseKey(null)).toBeNull();
      expect(decryptLicenseKey(null)).toBeNull();
      expect(encryptLicenseKey(undefined)).toBeNull();
      expect(decryptLicenseKey(undefined)).toBeNull();
    });

    it('1.7 should correctly mask license keys exposing only the trailing 4 characters', () => {
      expect(maskLicenseKey(null)).toBe('N/A');
      expect(maskLicenseKey(undefined)).toBe('N/A');
      expect(maskLicenseKey('')).toBe('N/A');
      expect(maskLicenseKey('N/A')).toBe('N/A');
      expect(maskLicenseKey('KEY123')).toBe('KEY123'); // <= 8 chars returned as is
      expect(maskLicenseKey('12345678')).toBe('12345678');
      expect(maskLicenseKey('123456789')).toBe('••••-••••-6789');
      expect(maskLicenseKey('MS-OFFICE-365-PRO-9876')).toBe('••••-••••-9876');
    });
  });

  // =========================================================================
  // 2. BCRYPT PASSWORD HASHING (12 ROUNDS) ADVERSARIAL CHALLENGES
  // =========================================================================
  describe('2. Enterprise Password Hashing: Strict 12 Bcrypt Rounds', () => {
    let usersService: UsersService;
    let mockPrisma: {
      appUser: {
        findFirst: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
      };
      role: {
        findFirst: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        appUser: {
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          findUnique: vi.fn(),
        },
        role: {
          findFirst: vi.fn().mockResolvedValue({ id: 'role-emp-id', name: 'Employee' }),
        },
      };

      usersService = new UsersService(mockPrisma as unknown as PrismaService);
    });

    it('2.1 UsersService.create with explicit password MUST hash with exactly 12 bcrypt rounds', async () => {
      mockPrisma.appUser.findFirst.mockResolvedValueOnce(null);
      mockPrisma.appUser.create.mockImplementation(async ({ data }) => ({
        id: 'usr-adv-1',
        ...data,
      }));

      const explicitPassword = 'SuperSecretEnterprisePassword2026!';
      const res = await usersService.create({
        email: 'adv-test@uims.internal',
        username: 'adv.test',
        password: explicitPassword,
      });

      expect(res.id).toBe('usr-adv-1');
      // Password hash must NOT be returned in safe user response
      expect((res as Record<string, unknown>).passwordHash).toBeUndefined();

      // Inspect data passed to prisma.appUser.create
      const createCall = mockPrisma.appUser.create.mock.calls[0][0];
      const savedHash = createCall.data.passwordHash;
      expect(savedHash).toBeDefined();

      // EMPIRICAL ORACLE: Inspect bcrypt cost factor directly via bcrypt.getRounds()
      const rounds = bcrypt.getRounds(savedHash);
      expect(rounds).toBe(12);

      // Verify the bcrypt string prefix contains $12$
      expect(savedHash).toMatch(/^\$2[aby]?\$12\$/);

      // Verify password verification succeeds against the generated hash
      const matches = await bcrypt.compare(explicitPassword, savedHash);
      expect(matches).toBe(true);

      const wrongMatches = await bcrypt.compare('WrongPassword123!', savedHash);
      expect(wrongMatches).toBe(false);
    });

    it('2.2 UsersService.create with auto-generated password MUST hash with exactly 12 bcrypt rounds', async () => {
      mockPrisma.appUser.findFirst.mockResolvedValueOnce(null);
      mockPrisma.appUser.create.mockImplementation(async ({ data }) => ({
        id: 'usr-adv-2',
        ...data,
      }));

      const res = await usersService.create({
        email: 'auto-pass@uims.internal',
        username: 'auto.pass',
      });

      expect(res.id).toBe('usr-adv-2');
      expect(res.mustChangePassword).toBe(true);
      expect((res as Record<string, unknown>).passwordHash).toBeUndefined();
      expect((res as Record<string, unknown>).adInitialPassword).toBeUndefined();

      const createCall = mockPrisma.appUser.create.mock.calls[0][0];
      const savedHash = createCall.data.passwordHash;
      expect(savedHash).toBeDefined();

      // Verify 12 rounds on auto-generated password hash
      const rounds = bcrypt.getRounds(savedHash);
      expect(rounds).toBe(12);
      expect(savedHash).toMatch(/^\$2[aby]?\$12\$/);
    });

    it('2.3 UsersService.update with new password MUST hash with exactly 12 bcrypt rounds', async () => {
      mockPrisma.appUser.findUnique.mockResolvedValueOnce({
        id: 'usr-adv-update',
        email: 'update-target@uims.internal',
      });
      mockPrisma.appUser.update.mockImplementation(async ({ data }) => ({
        id: 'usr-adv-update',
        email: 'update-target@uims.internal',
        ...data,
      }));

      const newPassword = 'NewlyChangedPassword2026!#';
      const updated = await usersService.update('usr-adv-update', {
        password: newPassword,
      });

      expect(updated.id).toBe('usr-adv-update');
      expect((updated as Record<string, unknown>).passwordHash).toBeUndefined();

      const updateCall = mockPrisma.appUser.update.mock.calls[0][0];
      const savedHash = updateCall.data.passwordHash;
      expect(savedHash).toBeDefined();

      // Verify 12 rounds on update password hash
      const rounds = bcrypt.getRounds(savedHash);
      expect(rounds).toBe(12);
      expect(savedHash).toMatch(/^\$2[aby]?\$12\$/);

      const matches = await bcrypt.compare(newPassword, savedHash);
      expect(matches).toBe(true);
    });

    it('2.4 generateSecureRandomPassword must produce high entropy passwords meeting enterprise policy', () => {
      const generated = Array.from({ length: 100 }, () => generateSecureRandomPassword(20));

      // All passwords must be unique (0 collisions in 100)
      const uniqueSet = new Set(generated);
      expect(uniqueSet.size).toBe(100);

      for (const pwd of generated) {
        expect(pwd.length).toBe(20);
        expect(/[A-Z]/.test(pwd)).toBe(true); // Uppercase
        expect(/[a-z]/.test(pwd)).toBe(true); // Lowercase
        expect(/[0-9]/.test(pwd)).toBe(true); // Digit
        expect(/[!@#$%^&*()_+\-=]/.test(pwd)).toBe(true); // Special char
      }
    });
  });

  // =========================================================================
  // 3. SHARED UTILS DEAD CODE ELIMINATION & ACTIVE UTILITIES
  // =========================================================================
  describe('3. Shared Utils Elimination & Active Contracts Verification', () => {
    it('3.1 Dead functions must be completely absent from @uims/shared-utils exports', () => {
      const utils = SharedUtils as Record<string, unknown>;

      // Dead string utilities
      expect(utils.slugify).toBeUndefined();
      expect(utils.truncate).toBeUndefined();
      expect(utils.capitalize).toBeUndefined();
      expect(utils.generateCode).toBeUndefined();

      // Dead validation utilities
      expect(utils.isValidEmail).toBeUndefined();
      expect(utils.isValidIP).toBeUndefined();
      expect(utils.isValidCIDR).toBeUndefined();
      expect(utils.isValidMAC).toBeUndefined();
      expect(utils.isValidUUID).toBeUndefined();

      // Dead format utilities
      expect(utils.formatBytes).toBeUndefined();
      expect(utils.formatDuration).toBeUndefined();
    });

    it('3.2 Active formatting utilities must operate flawlessly', () => {
      // Currency formatting
      expect(SharedUtils.formatCurrency(1500)).toContain('1,500');
      expect(SharedUtils.formatCurrency(0)).toContain('0');

      // Date formatting
      expect(SharedUtils.formatDate('2026-09-25')).toBe('2026-09-25');
      expect(SharedUtils.formatDate(null)).toBe('');
      expect(SharedUtils.formatDate(undefined)).toBe('');

      // DateTime formatting
      expect(SharedUtils.formatDateTime('2026-09-25T14:30:00Z')).toContain('2026-09-25');
      expect(SharedUtils.formatDateTime(null)).toBe('');

      // Time formatting
      expect(SharedUtils.formatTime('2026-09-25T14:30:00Z')).toBeDefined();
      expect(SharedUtils.formatTime(null)).toBe('');

      // Relative time
      expect(SharedUtils.fromNow('2026-01-01')).toBeDefined();
      expect(SharedUtils.fromNow(null)).toBe('');
    });

    it('3.3 Active enum and network utilities must operate flawlessly', () => {
      // Enum mapping
      expect(SharedUtils.mapLicenseType('Subscription')).toBe('SUBSCRIPTION');
      expect(SharedUtils.mapLicenseType('Perpetual')).toBe('PERPETUAL');
      expect(SharedUtils.mapLicenseStatus('Active')).toBe('ACTIVE');
      expect(
        SharedUtils.mapLicenseStatusToLabel('ACTIVE' as import('@uims/shared-types').LicenseStatus),
      ).toBe('Active');

      // Network utilities
      expect(SharedUtils.isValidIp('192.168.1.1')).toBe(true);
      expect(SharedUtils.isValidIp('999.999.999.999')).toBe(false);
      expect(SharedUtils.isValidCidr('10.0.0.0/24')).toBe(true);
      expect(SharedUtils.isValidCidr('invalid-cidr')).toBe(false);
      expect(SharedUtils.normalizeMac('001a2b3c4d5e')).toBe('00:1A:2B:3C:4D:5E');

      const calc = SharedUtils.calculateSubnet('10.0.0.0/24');
      expect(calc.networkAddress).toBe('10.0.0.0');
      expect(calc.prefix).toBe(24);
      expect(calc.totalHosts).toBe(256);
      expect(calc.usableHosts).toBe(254);
    });
  });
});
