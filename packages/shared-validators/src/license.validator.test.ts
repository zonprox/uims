import { LicenseStatus, LicenseType } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  assignUserLicenseSchema,
  batchAssignLicensesToUserSchema,
  batchAssignUserLicenseSchema,
  createLicenseSchema,
  licenseQuerySchema,
  updateLicenseSchema,
} from './license.validator';

describe('license.validator', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const validUuid2 = '223e4567-e89b-12d3-a456-426614174000';

  describe('createLicenseSchema', () => {
    it('validates a license with enum type, status, and numeric values', () => {
      const input = {
        name: 'IntelliJ IDEA Ultimate',
        vendor: 'JetBrains',
        type: LicenseType.SUBSCRIPTION,
        status: LicenseStatus.ACTIVE,
        totalSeats: 50,
        costPerSeat: 150,
        cost: 7500,
        vendorId: validUuid,
      };
      const result = createLicenseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts string type, string status, and string totalSeats/cost and normalizes enums', () => {
      const input = {
        name: 'GitHub Enterprise',
        type: 'Perpetual',
        status: 'Active',
        totalSeats: '100',
        costPerSeat: '21.00',
        cost: '2100.00',
      };
      const result = createLicenseSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(LicenseType.PERPETUAL);
        expect(result.data.status).toBe(LicenseStatus.ACTIVE);
        expect(result.data.totalSeats).toBe(100);
        expect(result.data.costPerSeat).toBe(21);
        expect(result.data.cost).toBe(2100);
      }
    });

    it('rejects invalid or unauthorized type and status strings', () => {
      expect(createLicenseSchema.safeParse({ name: 'App', totalSeats: 10, type: 'INVALID' }).success).toBe(
        false,
      );
      expect(createLicenseSchema.safeParse({ name: 'App', totalSeats: 10, status: 'UNKNOWN' }).success).toBe(
        false,
      );
    });

    it('rejects totalSeats with float, negative, non-numeric, or exceeding 1,000,000', () => {
      expect(createLicenseSchema.safeParse({ name: 'App', totalSeats: 10.5 }).success).toBe(false);
      expect(createLicenseSchema.safeParse({ name: 'App', totalSeats: -5 }).success).toBe(false);
      expect(createLicenseSchema.safeParse({ name: 'App', totalSeats: 'abc' }).success).toBe(false);
      expect(createLicenseSchema.safeParse({ name: 'App', totalSeats: 1_000_001 }).success).toBe(
        false,
      );
    });

    it('rejects invalid currency amounts in cost and costPerSeat', () => {
      expect(createLicenseSchema.safeParse({ name: 'App', totalSeats: 10, costPerSeat: -1 }).success).toBe(
        false,
      );
      expect(createLicenseSchema.safeParse({ name: 'App', totalSeats: 10, cost: 99.999 }).success).toBe(
        false,
      );
    });

    it('validates vendorId UUID format', () => {
      expect(
        createLicenseSchema.safeParse({ name: 'App', totalSeats: 10, vendorId: validUuid }).success,
      ).toBe(true);
      expect(
        createLicenseSchema.safeParse({ name: 'App', totalSeats: 10, vendorId: 'invalid-uuid' })
          .success,
      ).toBe(false);
    });

    it('applies default type and status when omitted', () => {
      const input = {
        name: 'Slack Pro',
        totalSeats: 25,
      };
      const result = createLicenseSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(LicenseType.SUBSCRIPTION);
        expect(result.data.status).toBe(LicenseStatus.ACTIVE);
      }
    });

    it('rejects missing or empty license name', () => {
      const emptyName = createLicenseSchema.safeParse({ name: '', totalSeats: 10 });
      expect(emptyName.success).toBe(false);

      const missingName = createLicenseSchema.safeParse({ totalSeats: 10 });
      expect(missingName.success).toBe(false);
    });

    it('rejects totalSeats less than 1', () => {
      const zeroSeats = createLicenseSchema.safeParse({ name: 'App', totalSeats: 0 });
      expect(zeroSeats.success).toBe(false);
    });

    it('validates partial update via updateLicenseSchema', () => {
      const result = updateLicenseSchema.safeParse({
        totalSeats: 75,
        status: 'Expiring',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(LicenseStatus.EXPIRING_SOON);
      }
    });
  });

  describe('assignUserLicenseSchema & batchAssignUserLicenseSchema', () => {
    it('validates single user assignment with email', () => {
      const valid = assignUserLicenseSchema.safeParse({
        email: 'dev@company.com',
        name: 'Jane Doe',
      });
      expect(valid.success).toBe(true);
    });

    it('validates single user assignment with userId', () => {
      const valid = assignUserLicenseSchema.safeParse({
        userId: validUuid,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects assignment when BOTH userId and email are omitted', () => {
      expect(assignUserLicenseSchema.safeParse({ name: 'Jane Doe' }).success).toBe(false);
      expect(assignUserLicenseSchema.safeParse({}).success).toBe(false);
    });

    it('rejects invalid email in assignment', () => {
      const invalid = assignUserLicenseSchema.safeParse({
        email: 'not-an-email',
      });
      expect(invalid.success).toBe(false);
    });

    it('validates batch user assignment with uuids', () => {
      const valid = batchAssignUserLicenseSchema.safeParse({
        userIds: [validUuid, validUuid2],
      });
      expect(valid.success).toBe(true);
    });

    it('rejects duplicate user IDs in batch assignment', () => {
      expect(
        batchAssignUserLicenseSchema.safeParse({
          userIds: [validUuid, validUuid],
        }).success,
      ).toBe(false);
    });

    it('rejects empty batch userIds array', () => {
      const empty = batchAssignUserLicenseSchema.safeParse({
        userIds: [],
      });
      expect(empty.success).toBe(false);
    });

    it('validates batchAssignLicensesToUserSchema', () => {
      expect(
        batchAssignLicensesToUserSchema.safeParse({
          licenseIds: [validUuid, validUuid2],
          userId: validUuid,
        }).success,
      ).toBe(true);

      // Rejects duplicate license IDs
      expect(
        batchAssignLicensesToUserSchema.safeParse({
          licenseIds: [validUuid, validUuid],
          userId: validUuid,
        }).success,
      ).toBe(false);

      // Rejects missing userId
      expect(
        batchAssignLicensesToUserSchema.safeParse({
          licenseIds: [validUuid],
        }).success,
      ).toBe(false);
    });
  });

  describe('licenseQuerySchema', () => {
    it('validates bounded query parameters <= 100', () => {
      const valid = licenseQuerySchema.safeParse({
        page: 1,
        pageSize: 100,
        limit: 100,
        search: 'Office',
        type: 'SUBSCRIPTION',
        status: 'ACTIVE',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects pageSize and limit exceeding 100', () => {
      expect(licenseQuerySchema.safeParse({ pageSize: 150 }).success).toBe(false);
      expect(licenseQuerySchema.safeParse({ limit: 1000 }).success).toBe(false);
    });
  });
});
