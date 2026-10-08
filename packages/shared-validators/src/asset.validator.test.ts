import { AssetStatus } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  assetQuerySchema,
  batchAssignAssetSchema,
  batchDeleteAssetSchema,
  createAssetCategorySchema,
  createAssetSchema,
  createAssetUnitSchema,
  createCostCenterSchema,
  createDeviceModelSchema,
  issueAssetUnitSchema,
  updateAssetCategorySchema,
  updateAssetSchema,
  updateAssetUnitSchema,
  updateCostCenterSchema,
  updateDeviceModelSchema,
} from './asset.validator';

describe('asset.validator', () => {
  describe('createAssetSchema', () => {
    it('validates a valid asset with enum status', () => {
      const input = {
        name: 'MacBook Pro 16',
        assetTag: 'AST-0001',
        status: AssetStatus.AVAILABLE,
      };
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts string status values and normalizes them', () => {
      const input = {
        name: 'Dell XPS 15',
        status: 'Active',
      };
      const result = createAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(AssetStatus.IN_USE);
      }
    });

    it('rejects arbitrary malformed status strings', () => {
      expect(createAssetSchema.safeParse({ name: 'Laptop', status: 'HACKED' }).success).toBe(
        false,
      );
      expect(createAssetSchema.safeParse({ name: 'Laptop', status: 'INVALID_STATUS' }).success).toBe(
        false,
      );
    });

    it('rejects asset when name is empty or missing', () => {
      const resultEmpty = createAssetSchema.safeParse({ name: '' });
      expect(resultEmpty.success).toBe(false);

      const resultMissing = createAssetSchema.safeParse({});
      expect(resultMissing.success).toBe(false);
    });

    it('validates assetCode and subcode regex constraints', () => {
      expect(
        createAssetSchema.safeParse({ name: 'Device', assetCode: 'AST-2026_01', subcode: 'SUB-001' })
          .success,
      ).toBe(true);

      // Rejects spaces or special chars
      expect(createAssetSchema.safeParse({ name: 'Device', assetCode: 'AST 01' }).success).toBe(
        false,
      );
      expect(createAssetSchema.safeParse({ name: 'Device', assetCode: 'AST@01' }).success).toBe(
        false,
      );
      expect(createAssetSchema.safeParse({ name: 'Device', subcode: 'SUB 01' }).success).toBe(
        false,
      );
    });

    it('validates relational UUID fields (costCenterId, vendorId, parentId, departmentId, assignedToId)', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(
        createAssetSchema.safeParse({
          name: 'Device',
          costCenterId: validUuid,
          vendorId: validUuid,
          parentId: validUuid,
          departmentId: validUuid,
          assignedToId: validUuid,
        }).success,
      ).toBe(true);

      expect(
        createAssetSchema.safeParse({ name: 'Device', costCenterId: 'not-a-uuid' }).success,
      ).toBe(false);
      expect(
        createAssetSchema.safeParse({ name: 'Device', vendorId: 'not-a-uuid' }).success,
      ).toBe(false);
    });

    it('validates unitCost currency bounds', () => {
      expect(createAssetSchema.safeParse({ name: 'Device', unitCost: 1500.5 }).success).toBe(true);
      expect(createAssetSchema.safeParse({ name: 'Device', unitCost: '1500.50' }).success).toBe(
        true,
      );
      expect(createAssetSchema.safeParse({ name: 'Device', unitCost: -50 }).success).toBe(false);
      expect(createAssetSchema.safeParse({ name: 'Device', unitCost: 1500.555 }).success).toBe(
        false,
      );
    });

    it('validates specifications string length boundary (max 2000)', () => {
      expect(
        createAssetSchema.safeParse({ name: 'Device', specifications: 'A'.repeat(2000) }).success,
      ).toBe(true);
      expect(
        createAssetSchema.safeParse({ name: 'Device', specifications: 'A'.repeat(2001) }).success,
      ).toBe(false);
    });

    it('confirms complete Physical Location purge: zero location fields on createAssetSchema', () => {
      expect('locationId' in createAssetSchema.shape).toBe(false);
      expect('location' in createAssetSchema.shape).toBe(false);
    });

    it('accepts null, undefined, valid string, and omitted for serialNumber', () => {
      expect(
        createAssetSchema.safeParse({ name: 'Asset Null SN', serialNumber: null }).success,
      ).toBe(true);
      expect(
        createAssetSchema.safeParse({ name: 'Asset Undefined SN', serialNumber: undefined })
          .success,
      ).toBe(true);
      expect(
        createAssetSchema.safeParse({ name: 'Asset Valid SN', serialNumber: 'SN-998822' }).success,
      ).toBe(true);
      expect(createAssetSchema.safeParse({ name: 'Asset Omitted SN' }).success).toBe(true);
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
      if (result.success) {
        expect(result.data.status).toBe(AssetStatus.AVAILABLE);
      }
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

    it('confirms zero locationId on assetQuerySchema', () => {
      expect('locationId' in assetQuerySchema.shape).toBe(false);
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

  describe('CostCenter, DeviceModel, and AssetUnit schemas', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('validates cost center creation and update', () => {
      expect(
        createCostCenterSchema.safeParse({
          code: 'CC-IT-01',
          name: 'IT Department Cost Center',
          description: 'IT infrastructure and licenses',
        }).success,
      ).toBe(true);

      expect(updateCostCenterSchema.safeParse({ name: 'Updated CC Name' }).success).toBe(true);
      expect(createCostCenterSchema.safeParse({ code: '', name: 'CC' }).success).toBe(false);
      expect(createCostCenterSchema.safeParse({ code: 'CC 01', name: 'CC' }).success).toBe(false);
    });

    it('validates device model creation and update', () => {
      expect(
        createDeviceModelSchema.safeParse({
          assetCode: 'MOD-DELL-5540',
          name: 'Dell Latitude 5540',
          manufacturer: 'Dell',
          model: '5540',
          unitCost: 1200,
        }).success,
      ).toBe(true);

      expect(updateDeviceModelSchema.safeParse({ unitCost: 1150.5 }).success).toBe(true);
      expect(createDeviceModelSchema.safeParse({ assetCode: 'MOD', name: '' }).success).toBe(false);
      expect(createDeviceModelSchema.safeParse({ assetCode: '', name: 'Model' }).success).toBe(
        false,
      );
    });

    it('validates asset unit creation and update (with zero location fields)', () => {
      expect(
        createAssetUnitSchema.safeParse({
          subcode: 'UNIT-001',
          parentId: validUuid,
          serialNumber: 'SN-12345',
        }).success,
      ).toBe(true);

      expect('locationId' in createAssetUnitSchema.shape).toBe(false);
      expect(updateAssetUnitSchema.safeParse({ serialNumber: 'SN-99999' }).success).toBe(true);
      expect(createAssetUnitSchema.safeParse({ subcode: 'UNIT 001', parentId: validUuid }).success).toBe(
        false,
      );
      expect(createAssetUnitSchema.safeParse({ subcode: 'UNIT-001', parentId: 'not-a-uuid' }).success).toBe(
        false,
      );
    });

    it('validates asset category creation and update', () => {
      expect(
        createAssetCategorySchema.safeParse({
          name: 'Laptops',
          description: 'Portable computers',
        }).success,
      ).toBe(true);

      expect(updateAssetCategorySchema.safeParse({ name: 'Workstations' }).success).toBe(true);
      expect(createAssetCategorySchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('validates issueAssetUnitSchema, batchAssignAssetSchema, batchDeleteAssetSchema', () => {
      expect(issueAssetUnitSchema.safeParse({ userId: validUuid, notes: 'Issued for WFH' }).success).toBe(
        true,
      );
      expect(batchAssignAssetSchema.safeParse({ ids: [validUuid], departmentId: validUuid }).success).toBe(
        true,
      );
      expect(batchAssignAssetSchema.safeParse({ ids: [] }).success).toBe(false);
      expect(batchDeleteAssetSchema.safeParse({ ids: [validUuid] }).success).toBe(true);
      expect(batchDeleteAssetSchema.safeParse({ ids: [] }).success).toBe(false);
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
