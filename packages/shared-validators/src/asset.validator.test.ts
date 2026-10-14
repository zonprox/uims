import { AssetStatus } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  allocateAssetSchema,
  assetQuerySchema,
  batchAssignAssetSchema,
  batchDeleteAssetSchema,
  createAssetCategorySchema,
  createCostCenterSchema,
  createDeviceModelSchema,
  issueAssetUnitSchema,
  registerPhysicalUnitSchema,
  returnAssetSchema,
  stockIntakeSchema,
  transferAssetSchema,
  updateAssetCategorySchema,
  updateCostCenterSchema,
  updateDeviceModelSchema,
  updatePhysicalUnitSchema,
} from './asset.validator';

describe('asset.validator', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const validUuid2 = '223e4567-e89b-12d3-a456-426614174000';

  describe('createDeviceModelSchema & updateDeviceModelSchema', () => {
    it('validates a valid device model with modelCode', () => {
      const input = {
        name: 'Dell Latitude 5420',
        modelCode: 'MOD-DELL-5420',
        categoryId: 'cat-laptop',
        manufacturer: 'Dell',
        unitCost: 1150.0,
        minThreshold: 5,
        binNumber: 'BIN-A01',
      };
      const result = createDeviceModelSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Dell Latitude 5420');
        expect(result.data.modelCode).toBe('MOD-DELL-5420');
        expect(result.data.unitCost).toBe(1150.0);
      }
    });

    it('requires modelCode, categoryId, and manufacturer on createDeviceModelSchema and rejects legacy assetCode', () => {
      // Fails when modelCode is missing
      expect(
        createDeviceModelSchema.safeParse({
          name: 'MacBook Pro 14',
          categoryId: 'cat-laptop',
          manufacturer: 'Apple',
        }).success,
      ).toBe(false);

      // Fails when categoryId is missing
      expect(
        createDeviceModelSchema.safeParse({
          name: 'MacBook Pro 14',
          modelCode: 'MOD-MBP-14',
          manufacturer: 'Apple',
        }).success,
      ).toBe(false);

      // Fails when manufacturer is missing
      expect(
        createDeviceModelSchema.safeParse({
          name: 'MacBook Pro 14',
          modelCode: 'MOD-MBP-14',
          categoryId: 'cat-laptop',
        }).success,
      ).toBe(false);

      // Fails when using legacy assetCode alias without modelCode
      const legacyInput = {
        name: 'MacBook Pro 14',
        assetCode: 'MOD-MBP-14',
        categoryId: 'cat-laptop',
        manufacturer: 'Apple',
      };
      expect(createDeviceModelSchema.safeParse(legacyInput).success).toBe(false);
    });

    it('rejects device model when name is empty', () => {
      expect(
        createDeviceModelSchema.safeParse({
          name: '',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
        }).success,
      ).toBe(false);
    });

    it('validates modelCode regex constraints', () => {
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-2026_01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
        }).success,
      ).toBe(true);

      // Rejects spaces or special chars
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD 01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
        }).success,
      ).toBe(false);
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD@01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
        }).success,
      ).toBe(false);
    });

    it('validates relational vendorId UUID field', () => {
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          vendorId: validUuid,
        }).success,
      ).toBe(true);

      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          vendorId: 'not-a-uuid',
        }).success,
      ).toBe(false);
    });

    it('validates unitCost currency bounds', () => {
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          unitCost: 1500.5,
        }).success,
      ).toBe(true);
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          unitCost: '1500.50',
        }).success,
      ).toBe(true);
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          unitCost: -50,
        }).success,
      ).toBe(false);
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          unitCost: 1500.555,
        }).success,
      ).toBe(false);
    });

    it('validates specifications string length boundary (max 2000)', () => {
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          specifications: 'A'.repeat(2000),
        }).success,
      ).toBe(true);
      expect(
        createDeviceModelSchema.safeParse({
          name: 'Device',
          modelCode: 'MOD-01',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          specifications: 'A'.repeat(2001),
        }).success,
      ).toBe(false);
    });

    it('validates partial updates via updateDeviceModelSchema', () => {
      const result = updateDeviceModelSchema.safeParse({
        unitCost: 1250.0,
        minThreshold: 10,
        notes: 'Updated inventory threshold',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unitCost).toBe(1250.0);
        expect(result.data.minThreshold).toBe(10);
      }
    });
  });

  describe('stockIntakeSchema', () => {
    it('validates batch stock intake with multiple serialized physical units', () => {
      const input = {
        deviceModelId: validUuid,
        units: [
          {
            serialNumber: 'SN-001',
            assetTag: 'AST-001',
            subcode: 'SUB-001',
            costCenterId: validUuid,
            purchaseDate: '2026-01-15',
            warrantyExpiry: '2029-01-15',
            notes: 'Batch intake Q1',
          },
          {
            serialNumber: 'SN-002',
            assetTag: 'AST-002',
          },
        ],
      };
      const result = stockIntakeSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deviceModelId).toBe(validUuid);
        expect(result.data.units.length).toBe(2);
      }
    });

    it('rejects stock intake when units array is empty', () => {
      const input = {
        deviceModelId: validUuid,
        units: [],
      };
      expect(stockIntakeSchema.safeParse(input).success).toBe(false);
    });

    it('rejects stock intake when deviceModelId is missing', () => {
      const input = {
        units: [{ serialNumber: 'SN-001' }],
      };
      expect(stockIntakeSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('Lifecycle Custody Workflows: allocateAssetSchema, returnAssetSchema, transferAssetSchema', () => {
    it('validates allocateAssetSchema', () => {
      const input = {
        assetIds: [validUuid, validUuid2],
        assignedToId: validUuid,
        departmentId: validUuid2,
        notes: 'Assigned for engineering project',
      };
      const result = allocateAssetSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects allocateAssetSchema with empty assetIds', () => {
      expect(
        allocateAssetSchema.safeParse({
          assetIds: [],
          assignedToId: validUuid,
        }).success,
      ).toBe(false);
    });

    it('validates returnAssetSchema', () => {
      const input = {
        assetIds: [validUuid],
        targetStatus: 'AVAILABLE' as const,
        signedDocUrl: '/uploads/return-doc.pdf',
        notes: 'Returned in pristine condition',
      };
      const result = returnAssetSchema.safeParse(input);
      expect(result.success).toBe(true);

      // Rejects return missing targetStatus
      expect(returnAssetSchema.safeParse({ assetIds: [validUuid] }).success).toBe(false);
    });

    it('validates transferAssetSchema', () => {
      const input = {
        assetIds: [validUuid],
        toUserId: validUuid2,
        toDepartmentId: validUuid,
        notes: 'Transferred from IT to Finance',
      };
      const result = transferAssetSchema.safeParse(input);
      expect(result.success).toBe(true);

      // Rejects transfer missing toUserId
      expect(transferAssetSchema.safeParse({ assetIds: [validUuid] }).success).toBe(false);
    });
  });

  describe('assetQuerySchema', () => {
    it('validates query params with filters and sorting', () => {
      const validQuery = {
        page: 1,
        pageSize: 20,
        limit: 100,
        search: 'ThinkPad',
        organizationId: validUuid,
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
      expect(assetQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
      expect(assetQuerySchema.safeParse({ limit: 1000 }).success).toBe(false);
    });

    it('rejects invalid UUID for organizationId', () => {
      expect(assetQuerySchema.safeParse({ organizationId: 'not-a-uuid' }).success).toBe(false);
    });

    it('accepts both string category slugs and UUIDs in categoryId filter', () => {
      expect(assetQuerySchema.safeParse({ categoryId: 'cat-switch' }).success).toBe(true);
      expect(assetQuerySchema.safeParse({ categoryId: validUuid }).success).toBe(true);
    });
  });

  describe('CostCenter, DeviceModel, and AssetUnit schemas', () => {
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
          modelCode: 'MOD-DELL-5540',
          name: 'Dell Latitude 5540',
          categoryId: 'cat-laptop',
          manufacturer: 'Dell',
          model: '5540',
          unitCost: 1200,
        }).success,
      ).toBe(true);

      expect(updateDeviceModelSchema.safeParse({ unitCost: 1150.5 }).success).toBe(true);
      expect(
        createDeviceModelSchema.safeParse({
          modelCode: 'MOD',
          name: '',
          categoryId: 'cat-laptop',
          manufacturer: 'Dell',
        }).success,
      ).toBe(false);
    });

    it('validates physical unit registration and update (with zero location or parentId fields)', () => {
      expect(
        registerPhysicalUnitSchema.safeParse({
          deviceModelId: validUuid,
          subcode: 'UNIT-001',
          serialNumber: 'SN-12345',
        }).success,
      ).toBe(true);

      expect('locationId' in registerPhysicalUnitSchema.shape).toBe(false);
      expect('parentId' in registerPhysicalUnitSchema.shape).toBe(false);
      expect(updatePhysicalUnitSchema.safeParse({ serialNumber: 'SN-99999' }).success).toBe(true);
      expect(
        registerPhysicalUnitSchema.safeParse({ deviceModelId: validUuid, subcode: 'UNIT 001' })
          .success,
      ).toBe(false);
      expect(registerPhysicalUnitSchema.safeParse({ subcode: 'UNIT-001' }).success).toBe(false);
    });

    it('strictly requires deviceModelId on registerPhysicalUnitSchema and rejects parentId', () => {
      // Passes when deviceModelId is valid
      const valid = registerPhysicalUnitSchema.safeParse({
        deviceModelId: validUuid,
        subcode: 'UNIT-VALID',
        serialNumber: 'SN-12345',
      });
      expect(valid.success).toBe(true);

      // Rejects when deviceModelId is omitted
      const missingModel = registerPhysicalUnitSchema.safeParse({
        subcode: 'UNIT-NOMODEL',
        serialNumber: 'SN-12345',
      });
      expect(missingModel.success).toBe(false);

      // Rejects when deviceModelId is empty string
      const emptyModel = registerPhysicalUnitSchema.safeParse({
        deviceModelId: '   ',
        subcode: 'UNIT-EMPTYMODEL',
      });
      expect(emptyModel.success).toBe(false);

      // Rejects parentId under strict mode
      expect(
        registerPhysicalUnitSchema.strict().safeParse({
          deviceModelId: validUuid,
          subcode: 'UNIT-VALID',
          parentId: validUuid,
        }).success,
      ).toBe(false);

      // Updates can be partial
      expect(updatePhysicalUnitSchema.safeParse({ serialNumber: 'SN-UPDATED' }).success).toBe(true);
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
      expect(
        issueAssetUnitSchema.safeParse({ userId: validUuid, notes: 'Issued for WFH' }).success,
      ).toBe(true);
      expect(
        batchAssignAssetSchema.safeParse({ ids: [validUuid], departmentId: validUuid }).success,
      ).toBe(true);
      expect(batchAssignAssetSchema.safeParse({ ids: [] }).success).toBe(false);
      expect(batchDeleteAssetSchema.safeParse({ ids: [validUuid] }).success).toBe(true);
      expect(batchDeleteAssetSchema.safeParse({ ids: [] }).success).toBe(false);
    });
  });

  describe('Notes field robustness and specs omission', () => {
    const baseModel = {
      modelCode: 'MOD-01',
      categoryId: 'cat-1',
      manufacturer: 'Dell',
    };

    it('handles newlines in notes correctly', () => {
      const multiline = 'Line 1: Rack Unit 42\nLine 2: Connected to SW-01\r\nLine 3: 10GbE uplink';
      const result = createDeviceModelSchema.safeParse({
        ...baseModel,
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
      const result = createDeviceModelSchema.safeParse({
        ...baseModel,
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

      const passResult = createDeviceModelSchema.safeParse({
        ...baseModel,
        name: 'Device',
        notes: validNotes,
      });
      expect(passResult.success).toBe(true);

      const failResult = createDeviceModelSchema.safeParse({
        ...baseModel,
        name: 'Device',
        notes: invalidNotes,
      });
      expect(failResult.success).toBe(false);
    });

    it('handles null, undefined, empty, and whitespace-only notes gracefully', () => {
      const nullResult = createDeviceModelSchema.safeParse({
        ...baseModel,
        name: 'Device',
        notes: null,
      });
      expect(nullResult.success).toBe(true);
      if (nullResult.success) {
        expect(nullResult.data.notes).toBeNull();
      }

      const undefinedResult = createDeviceModelSchema.safeParse({
        ...baseModel,
        name: 'Device',
        notes: undefined,
      });
      expect(undefinedResult.success).toBe(true);
      if (undefinedResult.success) {
        expect(undefinedResult.data.notes).toBeUndefined();
      }

      const emptyResult = createDeviceModelSchema.safeParse({
        ...baseModel,
        name: 'Device',
        notes: '',
      });
      expect(emptyResult.success).toBe(true);

      const whitespaceResult = createDeviceModelSchema.safeParse({
        ...baseModel,
        name: 'Device',
        notes: '   \t\n   ',
      });
      expect(whitespaceResult.success).toBe(true);
    });
  });
});
