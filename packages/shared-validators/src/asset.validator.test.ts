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

    it('accepts string category slugs and notes', () => {
      const input = {
        name: 'Cisco Catalyst 9300',
        categoryId: 'cat-switch',
        notes: 'Core switch in server rack',
      };
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categoryId).toBe('cat-switch');
        expect(result.data.notes).toBe('Core switch in server rack');
      }
    });

    it('accepts UUID categoryId for createAssetSchema', () => {
      const input = {
        name: 'ThinkPad T14',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
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

    it('accepts both string category slugs and UUIDs in categoryId filter', () => {
      const slugResult = assetQuerySchema.safeParse({ categoryId: 'cat-switch' });
      expect(slugResult.success).toBe(true);

      const uuidResult = assetQuerySchema.safeParse({
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(uuidResult.success).toBe(true);
    });
  });

  describe('Notes field robustness and specs omission', () => {
    it('handles newlines in notes correctly', () => {
      const multiline = 'Line 1: Rack Unit 42\nLine 2: Connected to SW-01\r\nLine 3: 10GbE uplink';
      const result = createAssetSchema.safeParse({
        name: 'Core Switch',
        notes: multiline,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(multiline);
      }
    });

    it('handles Unicode and emoji in notes correctly', () => {
      const unicodeNotes =
        'Thiết bị cấp cho phòng CNTT — Youngone Nam Định 🇻🇳 💻 [Tủ Rack #04, Cổng 24]';
      const result = createAssetSchema.safeParse({
        name: 'Workstation',
        notes: unicodeNotes,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(unicodeNotes);
      }
    });

    it('accepts notes up to 1000 characters and rejects 1001 characters', () => {
      const validNotes = 'A'.repeat(1000);
      const invalidNotes = 'A'.repeat(1001);

      const passResult = createAssetSchema.safeParse({
        name: 'Device',
        notes: validNotes,
      });
      expect(passResult.success).toBe(true);

      const failResult = createAssetSchema.safeParse({
        name: 'Device',
        notes: invalidNotes,
      });
      expect(failResult.success).toBe(false);
    });

    it('handles null, undefined, empty, and whitespace-only notes gracefully', () => {
      const nullResult = createAssetSchema.safeParse({ name: 'Device', notes: null });
      expect(nullResult.success).toBe(true);
      if (nullResult.success) {
        expect(nullResult.data.notes).toBeNull();
      }

      const undefinedResult = createAssetSchema.safeParse({ name: 'Device', notes: undefined });
      expect(undefinedResult.success).toBe(true);
      if (undefinedResult.success) {
        expect(undefinedResult.data.notes).toBeUndefined();
      }

      const emptyResult = createAssetSchema.safeParse({ name: 'Device', notes: '' });
      expect(emptyResult.success).toBe(true);
      if (emptyResult.success) {
        expect(emptyResult.data.notes).toBe('');
      }

      const whitespaceResult = createAssetSchema.safeParse({ name: 'Device', notes: '   \t\n   ' });
      expect(whitespaceResult.success).toBe(true);
      if (whitespaceResult.success) {
        expect(whitespaceResult.data.notes).toBe('   \t\n   ');
      }
    });

    it('strips legacy specs property and does not include it in parsed data', () => {
      const input = {
        name: 'Legacy Specs Device',
        specs: { cpu: 'M3 Max', ram: '64GB' },
        notes: 'Remarks only',
      };
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect('specs' in result.data).toBe(false);
        expect(result.data.notes).toBe('Remarks only');
      }
    });
  });
});
