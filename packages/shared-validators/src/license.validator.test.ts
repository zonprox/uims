import { LicenseStatus, LicenseType } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  assignUserLicenseSchema,
  batchAssignUserLicenseSchema,
  createLicenseSchema,
  licenseQuerySchema,
  updateLicenseSchema,
} from './license.validator';

describe('license.validator', () => {
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
      };
      const result = createLicenseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts string type, string status, and string totalSeats/cost', () => {
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
    });
  });

  describe('assignUserLicenseSchema & batchAssignUserLicenseSchema', () => {
    it('validates single user assignment', () => {
      const valid = assignUserLicenseSchema.safeParse({
        email: 'dev@company.com',
        name: 'Jane Doe',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects invalid email in assignment', () => {
      const invalid = assignUserLicenseSchema.safeParse({
        email: 'not-an-email',
      });
      expect(invalid.success).toBe(false);
    });

    it('validates batch user assignment with uuids', () => {
      const valid = batchAssignUserLicenseSchema.safeParse({
        userIds: ['123e4567-e89b-12d3-a456-426614174000'],
      });
      expect(valid.success).toBe(true);
    });

    it('rejects empty batch userIds array', () => {
      const empty = batchAssignUserLicenseSchema.safeParse({
        userIds: [],
      });
      expect(empty.success).toBe(false);
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
