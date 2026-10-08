import { AssetStatus, LicenseStatus } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  createAssetSchema,
  createCostCenterSchema,
  createDeviceModelSchema,
} from './asset.validator';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from './auth.validator';
import {
  createDirectoryGroupSchema,
  createDirectoryUserSchema,
} from './directory.validator';
import {
  antdRules,
  zodToAntdRule,
} from './index';
import {
  adjustInventorySchema,
  createInventoryItemSchema,
  restockInventorySchema,
} from './inventory.validator';
import {
  createLicenseSchema,
  updateLicenseSchema,
} from './license.validator';
import { createAppUserSchema, resetAppUserPasswordSchema } from './user.validator';
import { createVendorSchema } from './vendor.validator';

describe('Challenger M1-2 — Adversarial Domain & Rule Adapter Stress Harness', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  // =========================================================================
  // 1. DIRECTORY GROUP ADVERSARIAL STRESS
  // =========================================================================
  describe('DirectoryGroup Domain Validation', () => {
    it('accepts directory group when email is completely omitted or null', () => {
      const omittedEmail = {
        name: 'SecOps Team',
      };
      const res1 = createDirectoryGroupSchema.safeParse(omittedEmail);
      expect(res1.success).toBe(true);

      const nullEmail = {
        name: 'SecOps Team',
        email: null,
      };
      const res2 = createDirectoryGroupSchema.safeParse(nullEmail);
      expect(res2.success).toBe(true);
    });

    it('rejects invalid distribution email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@nodomain.com',
        'user@',
        'user@domain..com',
        'user space@domain.com',
        'user@.com',
        'user@domain.c',
        'plainaddress',
        '#@%^%#$@#$@#.com',
        'Joe Smith <email@domain.com>',
      ];

      for (const email of invalidEmails) {
        const res = createDirectoryGroupSchema.safeParse({
          name: 'Engineers',
          email,
        });
        expect(res.success, `Expected email "${email}" to be rejected`).toBe(false);
      }
    });

    it('normalizes valid distribution email by trimming and lowercasing', () => {
      const res = createDirectoryGroupSchema.safeParse({
        name: 'DevOps Team',
        email: '   DEVOPS-DIST@CORP.LOCAL   ',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe('devops-dist@corp.local');
      }
    });

    it('validates ouPath boundaries and constraints', () => {
      // Valid ouPath
      const resValid = createDirectoryGroupSchema.safeParse({
        name: 'Support Team',
        ouPath: 'OU=Support,OU=Operations,DC=corp,DC=internal',
      });
      expect(resValid.success).toBe(true);

      // Max length boundary: 255 chars
      const path255 = 'OU=' + 'A'.repeat(252);
      expect(path255.length).toBe(255);
      const res255 = createDirectoryGroupSchema.safeParse({
        name: 'Support Team',
        ouPath: path255,
      });
      expect(res255.success).toBe(true);

      // Exceeding 255 chars (256 chars)
      const path256 = 'OU=' + 'A'.repeat(253);
      expect(path256.length).toBe(256);
      const res256 = createDirectoryGroupSchema.safeParse({
        name: 'Support Team',
        ouPath: path256,
      });
      expect(res256.success).toBe(false);

      // Trims whitespace from ouPath
      const resTrim = createDirectoryGroupSchema.safeParse({
        name: 'Support Team',
        ouPath: '   OU=Support,DC=corp,DC=internal   ',
      });
      expect(resTrim.success).toBe(true);
      if (resTrim.success) {
        expect(resTrim.data.ouPath).toBe('OU=Support,DC=corp,DC=internal');
      }
    });
  });

  // =========================================================================
  // 2. ASSET ADVERSARIAL STRESS
  // =========================================================================
  describe('Asset Domain Validation', () => {
    it('rejects assetCode regex bypass attempts (spaces, special characters, injections, emoji)', () => {
      const bypassAttempts = [
        'ASSET 001',
        'ASSET\t001',
        'ASSET\n001',
        'ASSET$001',
        'ASSET#001',
        'ASSET/001',
        'ASSET\\001',
        'ASSET;DROP TABLE',
        '<script>alert(1)</script>',
        'ASSET:001',
        'ASSET@001',
        'ASSET!001',
        'ASSET.001', // dot not allowed in assetCode
        'ASSET🚀',
        'TÀI_SẢN_01', // Unicode diacritics
        'Аccount_01', // Cyrillic homoglyph A
        'ASSET\0001', // Null byte
      ];

      for (const assetCode of bypassAttempts) {
        const res = createAssetSchema.safeParse({
          name: 'Server Node',
          assetCode,
        });
        expect(res.success, `Expected assetCode "${assetCode}" to be rejected`).toBe(false);
      }
    });

    it('validates assetCode length boundary (50 chars allowed, 51 rejected)', () => {
      const code50 = 'A'.repeat(50);
      expect(createAssetSchema.safeParse({ name: 'Server', assetCode: code50 }).success).toBe(true);

      const code51 = 'A'.repeat(51);
      expect(createAssetSchema.safeParse({ name: 'Server', assetCode: code51 }).success).toBe(false);
    });

    it('rejects negative unitCost and malformed currencies', () => {
      const invalidCosts = [-1, -0.01, -100, '-50', '-0.5', 'invalid-currency', NaN, Infinity];

      for (const unitCost of invalidCosts) {
        const res = createAssetSchema.safeParse({
          name: 'Server Node',
          unitCost,
        });
        expect(res.success, `Expected unitCost ${unitCost} to be rejected`).toBe(false);
      }
    });

    it('rejects unitCost with more than 2 decimal places and over 100M', () => {
      expect(createAssetSchema.safeParse({ name: 'Server', unitCost: 10.999 }).success).toBe(false);
      expect(createAssetSchema.safeParse({ name: 'Server', unitCost: 100_000_001 }).success).toBe(false);

      // Valid precision cases
      expect(createAssetSchema.safeParse({ name: 'Server', unitCost: 0 }).success).toBe(true);
      expect(createAssetSchema.safeParse({ name: 'Server', unitCost: 0.07 }).success).toBe(true);
      expect(createAssetSchema.safeParse({ name: 'Server', unitCost: 0.29 }).success).toBe(true);
      expect(createAssetSchema.safeParse({ name: 'Server', unitCost: '450.50' }).success).toBe(true);
    });
  });

  // =========================================================================
  // 3. LICENSE ADVERSARIAL STRESS
  // =========================================================================
  describe('License Domain Validation', () => {
    it('rejects non-numeric string seat counts and malformed seat numbers', () => {
      const invalidSeats = ['five', 'abc', '', 'NaN', 0, -1, -100, 1.5, 2.7, 1_000_001];

      for (const totalSeats of invalidSeats) {
        const res = createLicenseSchema.safeParse({
          name: 'JetBrains All Products Pack',
          totalSeats,
        });
        expect(res.success, `Expected totalSeats ${totalSeats} to be rejected`).toBe(false);
      }
    });

    it('accepts valid integer seat counts and valid numeric strings', () => {
      expect(
        createLicenseSchema.safeParse({ name: 'JetBrains', totalSeats: 1 }).success,
      ).toBe(true);
      expect(
        createLicenseSchema.safeParse({ name: 'JetBrains', totalSeats: '25' }).success,
      ).toBe(true);
      expect(
        createLicenseSchema.safeParse({ name: 'JetBrains', totalSeats: 1_000_000 }).success,
      ).toBe(true);
    });

    it('rejects negative cost and negative costPerSeat', () => {
      expect(
        createLicenseSchema.safeParse({ name: 'IDE', totalSeats: 5, cost: -100 }).success,
      ).toBe(false);
      expect(
        createLicenseSchema.safeParse({ name: 'IDE', totalSeats: 5, costPerSeat: -20 }).success,
      ).toBe(false);
      expect(
        createLicenseSchema.safeParse({ name: 'IDE', totalSeats: 5, cost: '-50.00' }).success,
      ).toBe(false);
    });

    it('rejects invalid status values and accepts valid statuses and synonyms', () => {
      const invalidStatuses = ['INVALID_STATUS', 'UNKNOWN', 'DELETED', 'PENDING', 'foo', 123];

      for (const status of invalidStatuses) {
        const res = createLicenseSchema.safeParse({
          name: 'Microsoft 365',
          totalSeats: 10,
          status,
        });
        expect(res.success, `Expected status "${status}" to be rejected`).toBe(false);
      }

      // Valid statuses & synonyms
      expect(
        createLicenseSchema.safeParse({
          name: 'Microsoft 365',
          totalSeats: 10,
          status: 'ACTIVE',
        }).success,
      ).toBe(true);
      expect(
        createLicenseSchema.safeParse({
          name: 'Microsoft 365',
          totalSeats: 10,
          status: 'Active',
        }).success,
      ).toBe(true);
      expect(
        createLicenseSchema.safeParse({
          name: 'Microsoft 365',
          totalSeats: 10,
          status: 'EXPIRING',
        }).success,
      ).toBe(true);
    });
  });

  // =========================================================================
  // 4. INVENTORY ADVERSARIAL STRESS
  // =========================================================================
  describe('Inventory Domain Validation', () => {
    it('rejects invalid SKU formats (spaces, special characters, unicode, bounds)', () => {
      const invalidSkus = [
        'SKU 001',
        'SKU\t001',
        'SKU\n001',
        'SKU#001',
        'SKU$001',
        'SKU/001',
        'SKU*001',
        'SKU;001',
        'SKU🚀',
        'SKU-HÀNG',
        'A'.repeat(101),
      ];

      for (const sku of invalidSkus) {
        const res = createInventoryItemSchema.safeParse({
          name: 'Cat6 Patch Cable',
          categoryId: validUuid,
          sku,
        });
        expect(res.success, `Expected sku "${sku}" to be rejected`).toBe(false);
      }

      // Valid SKU
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Cat6 Patch Cable',
          categoryId: validUuid,
          sku: 'CAB.CAT6_1M-BLUE',
        }).success,
      ).toBe(true);
    });

    it('rejects negative minThreshold and non-integer values', () => {
      const invalidThresholds = [-1, -10, '-5', 2.5, 100_001];

      for (const minThreshold of invalidThresholds) {
        const res = createInventoryItemSchema.safeParse({
          name: 'RJ45 Connector',
          categoryId: validUuid,
          minThreshold,
        });
        expect(res.success, `Expected minThreshold ${minThreshold} to be rejected`).toBe(false);
      }

      expect(
        createInventoryItemSchema.safeParse({
          name: 'RJ45 Connector',
          categoryId: validUuid,
          minThreshold: 0,
        }).success,
      ).toBe(true);
      expect(
        createInventoryItemSchema.safeParse({
          name: 'RJ45 Connector',
          categoryId: validUuid,
          minThreshold: '50',
        }).success,
      ).toBe(true);
    });

    it('rejects negative adjustments and restock violations', () => {
      expect(
        adjustInventorySchema.safeParse({ quantity: -5, reason: 'Stock audit' }).success,
      ).toBe(false);
      expect(
        restockInventorySchema.safeParse({ quantity: 0 }).success,
      ).toBe(false);
      expect(
        restockInventorySchema.safeParse({ quantity: -10 }).success,
      ).toBe(false);
    });
  });

  // =========================================================================
  // 5. APP USER & AUTH ADVERSARIAL STRESS
  // =========================================================================
  describe('AppUser & Auth Password Bounds and Email Validation', () => {
    it('enforces password bounds strictly (< 8 chars, > 128 chars)', () => {
      const pass7 = 'Pass123';
      const pass8 = 'Pass1234';
      const pass128 = 'A'.repeat(128);
      const pass129 = 'A'.repeat(129);

      // loginSchema
      expect(loginSchema.safeParse({ email: 'admin@corp.com', password: '' }).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'admin@corp.com', password: pass7 }).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'admin@corp.com', password: pass8 }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'admin@corp.com', password: pass128 }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'admin@corp.com', password: pass129 }).success).toBe(false);

      // createAppUserSchema
      expect(
        createAppUserSchema.safeParse({
          username: 'admin_test',
          email: 'admin@corp.com',
          firstName: 'Admin',
          lastName: 'User',
          password: pass7,
        }).success,
      ).toBe(false);
      expect(
        createAppUserSchema.safeParse({
          username: 'admin_test',
          email: 'admin@corp.com',
          firstName: 'Admin',
          lastName: 'User',
          password: pass8,
        }).success,
      ).toBe(true);
      expect(
        createAppUserSchema.safeParse({
          username: 'admin_test',
          email: 'admin@corp.com',
          firstName: 'Admin',
          lastName: 'User',
          password: pass129,
        }).success,
      ).toBe(false);

      // resetAppUserPasswordSchema
      expect(resetAppUserPasswordSchema.safeParse({ newPassword: pass7 }).success).toBe(false);
      expect(resetAppUserPasswordSchema.safeParse({ newPassword: pass8 }).success).toBe(true);
      expect(resetAppUserPasswordSchema.safeParse({ newPassword: pass129 }).success).toBe(false);
    });

    it('rejects invalid email formats across auth and user domains', () => {
      const invalidEmails = [
        'plainaddress',
        '#@%^%#$@#$@#.com',
        '@example.com',
        'Joe Smith <email@example.com>',
        'email.example.com',
        'email@example@example.com',
        '.email@example.com',
        'email..email@example.com',
        'email@example',
        'a'.repeat(250) + '@b.com', // > 255 chars
      ];

      for (const email of invalidEmails) {
        expect(
          createAppUserSchema.safeParse({
            username: 'test_user',
            email,
            firstName: 'Test',
            lastName: 'User',
          }).success,
          `Expected AppUser email "${email}" to be rejected`,
        ).toBe(false);

        expect(
          forgotPasswordSchema.safeParse({ email }).success,
          `Expected ForgotPassword email "${email}" to be rejected`,
        ).toBe(false);
      }
    });
  });

  // =========================================================================
  // 6. CLIENT RULE ADAPTERS (zodToAntdRule)
  // =========================================================================
  describe('Client Rule Adapter (zodToAntdRule)', () => {
    it('resolves valid values correctly', async () => {
      // Required string
      const nameRule = zodToAntdRule(createVendorSchema.shape.name);
      await expect(nameRule.validator({}, 'Cisco Systems')).resolves.toBeUndefined();

      // Formatted email
      const emailRule = zodToAntdRule(createAppUserSchema.shape.email);
      await expect(emailRule.validator({}, 'admin@company.com')).resolves.toBeUndefined();

      // Number field
      const seatsRule = zodToAntdRule(createLicenseSchema.shape.totalSeats);
      await expect(seatsRule.validator({}, 25)).resolves.toBeUndefined();
    });

    it('rejects invalid values with descriptive error message', async () => {
      // Invalid email
      const emailRule = zodToAntdRule(createAppUserSchema.shape.email);
      await expect(emailRule.validator({}, 'not-an-email')).rejects.toThrow('Invalid email address');

      // Invalid number
      const seatsRule = zodToAntdRule(createLicenseSchema.shape.totalSeats);
      await expect(seatsRule.validator({}, 'five')).rejects.toThrow();
      await expect(seatsRule.validator({}, -10)).rejects.toThrow();

      // Required string missing
      const nameRule = zodToAntdRule(createVendorSchema.shape.name);
      await expect(nameRule.validator({}, '')).rejects.toThrow();
    });

    it('evaluates empty values (undefined, null, "") against schema optionality', async () => {
      // 1. Required field: name (must reject undefined, null, and "")
      const requiredRule = zodToAntdRule(createVendorSchema.shape.name);
      await expect(requiredRule.validator({}, undefined)).rejects.toThrow();
      await expect(requiredRule.validator({}, null)).rejects.toThrow();
      await expect(requiredRule.validator({}, '')).rejects.toThrow();

      // 2. Optional text field: notes (allows undefined, null, and "")
      const optionalNotesRule = zodToAntdRule(createVendorSchema.shape.notes);
      await expect(optionalNotesRule.validator({}, undefined)).resolves.toBeUndefined();
      await expect(optionalNotesRule.validator({}, null)).resolves.toBeUndefined();
      await expect(optionalNotesRule.validator({}, '')).resolves.toBeUndefined();
    });

    it('probes whitespace-only values against required vs optional fields', async () => {
      // Required field with .trim().min(1): must reject whitespace-only
      const requiredNameRule = zodToAntdRule(createVendorSchema.shape.name);
      await expect(requiredNameRule.validator({}, '   ')).rejects.toThrow();
      await expect(requiredNameRule.validator({}, '\t\n ')).rejects.toThrow();

      // Required group name with .trim().min(1)
      const groupNameRule = zodToAntdRule(createDirectoryGroupSchema.shape.name);
      await expect(groupNameRule.validator({}, '    ')).rejects.toThrow();

      // Optional unconstrained text: notes with .trim().max(1000)
      const notesRule = zodToAntdRule(createVendorSchema.shape.notes);
      await expect(notesRule.validator({}, '   ')).resolves.toBeUndefined();
    });

    it('probes behavior of optional formatted fields (DirectoryGroup.email, Vendor.contactEmail) on empty string and whitespace', async () => {
      // NOTE: When a user leaves an optional formatted field empty in an Ant Design form,
      // Ant Design supplies '' or whitespace '   '.
      // zodToAntdRule passes the value to schema.safeParse(value).
      // Since emailSchema does not match '', safeParse('') fails.
      const groupEmailRule = zodToAntdRule(createDirectoryGroupSchema.shape.email);
      const vendorEmailRule = zodToAntdRule(createVendorSchema.shape.contactEmail);

      // With undefined (initial state before touch): resolves
      await expect(groupEmailRule.validator({}, undefined)).resolves.toBeUndefined();
      await expect(vendorEmailRule.validator({}, undefined)).resolves.toBeUndefined();

      // With null: resolves
      await expect(groupEmailRule.validator({}, null)).resolves.toBeUndefined();
      await expect(vendorEmailRule.validator({}, null)).resolves.toBeUndefined();

      // With valid email: resolves
      await expect(groupEmailRule.validator({}, 'group@corp.com')).resolves.toBeUndefined();
      await expect(vendorEmailRule.validator({}, 'vendor@corp.com')).resolves.toBeUndefined();

      // With malformed email: rejects
      await expect(groupEmailRule.validator({}, 'bad-email')).rejects.toThrow('Invalid email address');
      await expect(vendorEmailRule.validator({}, 'bad-email')).rejects.toThrow('Invalid email address');

      // VERIFIED FIX:
      // When an optional formatted field is blank (empty string '' or whitespace '   '),
      // zodToAntdRule detects that the schema permits undefined/null and resolves cleanly.
      await expect(groupEmailRule.validator({}, '')).resolves.toBeUndefined();
      await expect(groupEmailRule.validator({}, '   ')).resolves.toBeUndefined();
      await expect(vendorEmailRule.validator({}, '')).resolves.toBeUndefined();
      await expect(vendorEmailRule.validator({}, '   ')).resolves.toBeUndefined();
    });
  });
});

