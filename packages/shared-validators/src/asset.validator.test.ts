import { AssetStatus } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import { assetQuerySchema, createAssetSchema, updateAssetSchema } from './asset.validator';

describe('asset.validator', () => {
  describe('createAssetSchema', () => {
    it('validates a valid asset with enum status and number costs', () => {
      const input = {
        name: 'MacBook Pro 16',
        assetTag: 'AST-0001',
        status: AssetStatus.AVAILABLE,
        purchaseCost: 2499.99,
        purchasePrice: 2499.99,
      };
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts string status values and string numeric costs', () => {
      const input = {
        name: 'Dell XPS 15',
        status: 'Active',
        purchaseCost: '1899.50',
        purchasePrice: '1899.50',
      };
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects asset when name is empty or missing', () => {
      const resultEmpty = createAssetSchema.safeParse({ name: '' });
      expect(resultEmpty.success).toBe(false);

      const resultMissing = createAssetSchema.safeParse({});
      expect(resultMissing.success).toBe(false);
    });

    it('rejects negative numeric purchaseCost', () => {
      const result = createAssetSchema.safeParse({
        name: 'Test Device',
        purchaseCost: -10,
      });
      expect(result.success).toBe(false);
    });

    it('validates partial updates via updateAssetSchema', () => {
      const result = updateAssetSchema.safeParse({
        status: 'In Storage',
        notes: 'Updated notes',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('assetQuerySchema', () => {
    it('accepts valid query parameters including organization and bounds <= 100', () => {
      const validQuery = {
        page: 2,
        pageSize: 50,
        limit: 100,
        search: 'ThinkPad',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        organization: 'Engineering',
        status: 'AVAILABLE',
      };
      const result = assetQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('coerces string numbers for pagination', () => {
      const result = assetQuerySchema.safeParse({
        page: '1',
        pageSize: '25',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(25);
        expect(result.data.limit).toBe(50);
      }
    });

    it('rejects pageSize and limit exceeding 100', () => {
      const resultPageSize = assetQuerySchema.safeParse({ pageSize: 101 });
      expect(resultPageSize.success).toBe(false);

      const resultLimit = assetQuerySchema.safeParse({ limit: 1000 });
      expect(resultLimit.success).toBe(false);
    });

    it('rejects invalid UUID for organizationId', () => {
      const result = assetQuerySchema.safeParse({ organizationId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });
});
