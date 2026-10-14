import * as dotenv from 'dotenv';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../src/database/prisma.service';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { CreateAssetDto } from '../../src/modules/assets/dto/create-asset.dto';
import { RegisterPhysicalUnitDto } from '../../src/modules/assets/dto/register-physical-unit.dto';
import { UpdateAssetDto } from '../../src/modules/assets/dto/update-asset.dto';
import { ReportsService } from '../../src/modules/reports/reports.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Milestone 2 Challenger — Asset & Reports Backend Adversarial Verification', () => {
  let prisma: PrismaService;
  let assetsService: AssetsService;
  let reportsService: ReportsService;
  let isDbAvailable = false;
  let liveModelId: string | null = null;
  let liveDeptId: string | null = null;
  const createdTestAssetIds: string[] = [];

  beforeAll(async () => {
    try {
      prisma = new PrismaService();
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
      assetsService = new AssetsService(prisma);
      reportsService = new ReportsService(prisma);

      const existingModel = await prisma.deviceModel.findFirst();
      if (existingModel) {
        liveModelId = existingModel.id;
      } else {
        let category = await prisma.assetCategory.findFirst();
        if (!category) {
          category = await prisma.assetCategory.create({
            data: { name: 'Challenger Hardware Category' },
          });
        }
        const createdModel = await prisma.deviceModel.create({
          data: {
            name: 'Challenger Test Device Model',
            modelCode: `MOD-CHALLENGE-${Date.now()}`,
            categoryId: category.id,
            manufacturer: 'Dell',
            unitCost: 1500,
            minThreshold: 5,
          },
        });
        liveModelId = createdModel.id;
      }

      const existingDept = await prisma.department.findFirst();
      if (existingDept) {
        liveDeptId = existingDept.id;
      }
    } catch {
      isDbAvailable = false;
    }
  });

  afterEach(async () => {
    if (isDbAvailable && prisma && createdTestAssetIds.length > 0) {
      await prisma.asset.deleteMany({
        where: { id: { in: createdTestAssetIds } },
      });
      createdTestAssetIds.length = 0;
    }
  });

  afterAll(async () => {
    if (isDbAvailable && prisma) {
      if (createdTestAssetIds.length > 0) {
        await prisma.asset.deleteMany({
          where: { id: { in: createdTestAssetIds } },
        });
      }
      await prisma.$disconnect();
    }
  });

  // =========================================================================
  // 1. ASSET SERIAL NUMBER DTO VALIDATION & TYPE SAFETY
  // =========================================================================
  describe('1. Asset serialNumber DTO Validation & Edge Cases', () => {
    it('1.1 validates CreateAssetDto with serialNumber: null', async () => {
      const dto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
        serialNumber: null,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('1.2 validates CreateAssetDto with serialNumber: undefined', async () => {
      const dto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
        serialNumber: undefined,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('1.3 validates CreateAssetDto with serialNumber: "" (empty string)', async () => {
      const dto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
        serialNumber: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('1.4 validates CreateAssetDto with serialNumber: "ABC-123"', async () => {
      const dto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
        serialNumber: 'ABC-123',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('1.5 validates CreateAssetDto with omitted serialNumber', async () => {
      const dto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('1.6 rejects CreateAssetDto when serialNumber has invalid non-string types (number, boolean, object, array)', async () => {
      // Number
      const numDto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
        serialNumber: 12345,
      });
      const numErrors = await validate(numDto);
      expect(numErrors.length).toBeGreaterThan(0);
      expect(numErrors[0].property).toBe('serialNumber');

      // Boolean
      const boolDto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
        serialNumber: true,
      });
      const boolErrors = await validate(boolDto);
      expect(boolErrors.length).toBeGreaterThan(0);
      expect(boolErrors[0].property).toBe('serialNumber');

      // Object
      const objDto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
        serialNumber: { nested: 'sn' },
      });
      const objErrors = await validate(objDto);
      expect(objErrors.length).toBeGreaterThan(0);
      expect(objErrors[0].property).toBe('serialNumber');

      // Array
      const arrDto = plainToInstance(CreateAssetDto, {
        name: 'Dell Precision 5570',
        serialNumber: ['sn1', 'sn2'],
      });
      const arrErrors = await validate(arrDto);
      expect(arrErrors.length).toBeGreaterThan(0);
      expect(arrErrors[0].property).toBe('serialNumber');
    });

    it('1.7 validates UpdateAssetDto with optional and nullable serialNumber', async () => {
      const cases = [
        { serialNumber: null },
        { serialNumber: undefined },
        { serialNumber: '' },
        { serialNumber: 'XYZ-789' },
        {},
      ];

      for (const payload of cases) {
        const dto = plainToInstance(UpdateAssetDto, payload);
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }

      // Rejects invalid types
      const invalidDto = plainToInstance(UpdateAssetDto, { serialNumber: 99999 });
      const invalidErrors = await validate(invalidDto);
      expect(invalidErrors.length).toBeGreaterThan(0);
      expect(invalidErrors[0].property).toBe('serialNumber');
    });
  });

  // =========================================================================
  // 2. ASSET SERVICE SERIAL NUMBER NORMALIZATION & FORMATTING
  // =========================================================================
  describe('2. AssetService Normalization & formatAsset Invariants', () => {
    let mockPrisma: Record<string, unknown>;
    let mockService: AssetsService;

    beforeAll(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        asset: {
          create: vi.fn(),
          update: vi.fn(),
          findUnique: vi.fn(),
          count: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        deviceModel: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mod-1',
            name: 'Dell Precision 5570',
            deletedAt: null,
          }),
        },
        department: {
          findUnique: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        costCenter: {
          findUnique: vi.fn(),
        },
        assetCategory: { findFirst: vi.fn(), findUnique: vi.fn() },
        location: { findFirst: vi.fn(), findUnique: vi.fn() },
        directoryUser: { findUnique: vi.fn() },
      };
      mockService = new AssetsService(mockPrisma as unknown as PrismaService);
    });

    it('2.1 normalizes serialNumber to null when empty string, null, or undefined on create', async () => {
      const payloads = [
        { subcode: 'AST-SN-1', serialNumber: null },
        { subcode: 'AST-SN-2', serialNumber: '' },
        { subcode: 'AST-SN-3', serialNumber: undefined },
        { subcode: 'AST-SN-4' },
      ];

      for (const payload of payloads) {
        (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: `ast-${payload.subcode}`,
          deviceModelId: 'mod-1',
          subcode: payload.subcode,
          assetTag: payload.subcode,
          serialNumber: null,
          status: 'AVAILABLE',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: `ast-${payload.subcode}`,
          deviceModelId: 'mod-1',
          subcode: payload.subcode,
          assetTag: payload.subcode,
          serialNumber: null,
          status: 'AVAILABLE',
          deviceModel: { id: 'mod-1', name: 'Dell Precision 5570' },
          assignedTo: null,
          department: null,
          costCenter: null,
          handoverRecords: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await mockService.registerUnit({
          deviceModelId: 'mod-1',
          ...payload,
        });

        const lastCall = (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mock.calls.at(-1);
        expect(lastCall[0].data.serialNumber).toBeNull();
      }
    });

    it('2.2 trims valid serialNumber on create and stores string in DB', async () => {
      (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-trimmed',
        deviceModelId: 'mod-1',
        subcode: 'AST-TEST-2',
        assetTag: 'AST-TEST-2',
        serialNumber: 'SN-CLEAN-999',
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-trimmed',
        deviceModelId: 'mod-1',
        subcode: 'AST-TEST-2',
        assetTag: 'AST-TEST-2',
        serialNumber: 'SN-CLEAN-999',
        status: 'AVAILABLE',
        deviceModel: { id: 'mod-1', name: 'Dell Precision 5570' },
        assignedTo: null,
        department: null,
        costCenter: null,
        handoverRecords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await mockService.registerUnit({
        deviceModelId: 'mod-1',
        subcode: 'AST-TEST-2',
        serialNumber: '   SN-CLEAN-999   ',
      });

      const lastCall = (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(lastCall[0].data.serialNumber).toBe('SN-CLEAN-999');
    });

    it('2.3 normalizes serialNumber to null on update when set to null or empty string', async () => {
      (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ast-update-1',
        serialNumber: 'OLD-SN-123',
        status: 'AVAILABLE',
      });
      (mockPrisma.asset.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ast-update-1',
        assetTag: 'AST-UPD',
        name: 'Updated Asset',
        serialNumber: null,
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update with null
      await mockService.update('ast-update-1', { serialNumber: null });
      let lastCall = (mockPrisma.asset.update as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(lastCall[0].data.serialNumber).toBeNull();

      // Update with empty string ''
      await mockService.update('ast-update-1', { serialNumber: '' });
      lastCall = (mockPrisma.asset.update as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(lastCall[0].data.serialNumber).toBeNull();
    });

    it('2.4 does not modify serialNumber on update when serialNumber is undefined (omitted)', async () => {
      (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ast-update-2',
        serialNumber: 'PRESERVED-SN',
        status: 'AVAILABLE',
      });
      (mockPrisma.asset.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ast-update-2',
        assetTag: 'AST-UPD',
        name: 'Renamed Asset',
        serialNumber: 'PRESERVED-SN',
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await mockService.update('ast-update-2', { name: 'Renamed Asset' });
      const lastCall = (mockPrisma.asset.update as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(lastCall[0].data.serialNumber).toBeUndefined();
    });

    it('2.5 formatAsset returns null for missing or null serialNumber, strictly never "N/A"', async () => {
      (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-fmt-1',
        deviceModelId: 'mod-1',
        subcode: 'AST-FMT-1',
        assetTag: 'AST-FMT-1',
        serialNumber: null,
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-fmt-1',
        deviceModelId: 'mod-1',
        subcode: 'AST-FMT-1',
        assetTag: 'AST-FMT-1',
        serialNumber: null,
        status: 'AVAILABLE',
        deviceModel: { id: 'mod-1', name: 'Dell Precision 5570' },
        assignedTo: null,
        department: null,
        costCenter: null,
        handoverRecords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const formatted = await mockService.registerUnit({
        deviceModelId: 'mod-1',
        subcode: 'AST-FMT-1',
      });
      expect(formatted.serialNumber).toBeNull();
      expect(formatted.serialNumber).not.toBe('N/A');

      // Direct inspection of findOne format
      (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-fmt-2',
        assetTag: 'AST-FMT-2',
        name: 'Null SN Asset',
        serialNumber: null,
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const fetched = await mockService.findOne('ast-fmt-2');
      expect(fetched.serialNumber).toBeNull();
      expect(fetched.serialNumber).not.toBe('N/A');
    });

    it('2.6 evaluates whitespace-only serialNumber ("   ") during create and handles formatting', async () => {
      (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-ws',
        deviceModelId: 'mod-1',
        subcode: 'AST-WS',
        assetTag: 'AST-WS',
        serialNumber: null,
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-ws',
        deviceModelId: 'mod-1',
        subcode: 'AST-WS',
        assetTag: 'AST-WS',
        serialNumber: null,
        status: 'AVAILABLE',
        deviceModel: { id: 'mod-1', name: 'Dell Precision 5570' },
        assignedTo: null,
        department: null,
        costCenter: null,
        handoverRecords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const formatted = await mockService.registerUnit({
        deviceModelId: 'mod-1',
        subcode: 'AST-WS',
        serialNumber: '   ',
      });

      const lastCall = (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      // '   '.trim() produces '' which || null evaluates to null
      expect(lastCall[0].data.serialNumber).toBeNull();
      expect(formatted.serialNumber).toBeNull();
    });

    it('2.7 safely stores and formats adversarial payloads (SQLi, XSS, Unicode, long strings) in serialNumber', async () => {
      const securityPayloads = [
        '\'; DROP TABLE "Asset"; --',
        '<script>alert("XSS")</script>',
        '𝓤𝓝𝓘𝓒𝓞𝓓𝓔-Šëřïåł-№-001',
        'A'.repeat(500),
      ];

      for (let i = 0; i < securityPayloads.length; i++) {
        const payload = securityPayloads[i];
        (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: `ast-sec-${i}`,
          deviceModelId: 'mod-1',
          subcode: `AST-SEC-${i}`,
          assetTag: `AST-SEC-${i}`,
          serialNumber: payload.trim(),
          status: 'AVAILABLE',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: `ast-sec-${i}`,
          deviceModelId: 'mod-1',
          subcode: `AST-SEC-${i}`,
          assetTag: `AST-SEC-${i}`,
          serialNumber: payload.trim(),
          status: 'AVAILABLE',
          deviceModel: { id: 'mod-1', name: 'Dell Precision 5570' },
          assignedTo: null,
          department: null,
          costCenter: null,
          handoverRecords: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const formatted = await mockService.registerUnit({
          deviceModelId: 'mod-1',
          subcode: `AST-SEC-${i}`,
          serialNumber: payload,
        });

        const lastCall = (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mock.calls.at(-1);
        expect(lastCall[0].data.serialNumber).toBe(payload.trim());
        expect(formatted.serialNumber).toBe(payload.trim());
      }
    });
  });

  // =========================================================================
  // 3. ASSET COST PURGE EMPIRICAL VERIFICATION
  // =========================================================================
  describe('3. Asset Cost Purge & Payload Resilience', () => {
    let mockPrisma: Record<string, unknown>;
    let mockService: AssetsService;

    beforeAll(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        asset: {
          create: vi.fn(),
          update: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        deviceModel: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mod-1',
            name: 'Purged Cost Model',
            deletedAt: null,
          }),
        },
        department: {
          findUnique: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        costCenter: {
          findUnique: vi.fn(),
        },
        assetCategory: { findFirst: vi.fn(), findUnique: vi.fn() },
        location: { findFirst: vi.fn(), findUnique: vi.fn() },
      };
      mockService = new AssetsService(mockPrisma as unknown as PrismaService);
    });

    it('3.1 submitting { purchasePrice: 500, purchaseCost: 500 } to AssetsService.registerUnit does not crash, is not passed to DB, and is not returned', async () => {
      (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-cost-test',
        deviceModelId: 'mod-1',
        subcode: 'AST-COST-1',
        assetTag: 'AST-COST-1',
        serialNumber: 'SN-001',
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'ast-cost-test',
        deviceModelId: 'mod-1',
        subcode: 'AST-COST-1',
        assetTag: 'AST-COST-1',
        serialNumber: 'SN-001',
        status: 'AVAILABLE',
        deviceModel: { id: 'mod-1', name: 'Purged Cost Model' },
        assignedTo: null,
        department: null,
        costCenter: null,
        handoverRecords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Pass extraneous legacy financial fields
      const legacyPayload = {
        deviceModelId: 'mod-1',
        subcode: 'AST-COST-1',
        purchasePrice: 500,
        purchaseCost: 500,
      };

      const result = await mockService.registerUnit(
        legacyPayload as unknown as RegisterPhysicalUnitDto,
      );

      // Verify Prisma create payload NEVER received purchaseCost or purchasePrice
      const createArgs = (mockPrisma.asset.create as ReturnType<typeof vi.fn>).mock.calls.at(-1)[0];
      expect(createArgs.data).not.toHaveProperty('purchaseCost');
      expect(createArgs.data).not.toHaveProperty('purchasePrice');

      // Verify returned formatted object NEVER exposes purchaseCost or purchasePrice
      expect(result).not.toHaveProperty('purchaseCost');
      expect(result).not.toHaveProperty('purchasePrice');
    });

    it('3.2 submitting { purchasePrice: 500, purchaseCost: 500 } to AssetsService.update does not crash, is not passed to DB, and is not returned', async () => {
      (mockPrisma.asset.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ast-cost-update',
        status: 'AVAILABLE',
      });
      (mockPrisma.asset.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'ast-cost-update',
        assetTag: 'AST-COST-UPD',
        name: 'Updated Cost Asset',
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const legacyUpdatePayload = {
        name: 'Updated Cost Asset',
        purchasePrice: 750,
        purchaseCost: 750,
      };

      const result = await mockService.update(
        'ast-cost-update',
        legacyUpdatePayload as unknown as UpdateAssetDto,
      );

      const updateArgs = (mockPrisma.asset.update as ReturnType<typeof vi.fn>).mock.calls.at(-1)[0];
      expect(updateArgs.data).not.toHaveProperty('purchaseCost');
      expect(updateArgs.data).not.toHaveProperty('purchasePrice');
      expect(result).not.toHaveProperty('purchaseCost');
      expect(result).not.toHaveProperty('purchasePrice');
    });

    it('3.3 ValidationPipe with forbidNonWhitelisted strictly rejects legacy purchasePrice and purchaseCost payloads', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      });

      await expect(
        pipe.transform(
          {
            name: 'Test Device',
            purchasePrice: 500,
            purchaseCost: 500,
          },
          { type: 'body', metatype: CreateAssetDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('3.4 ValidationPipe with whitelist strips purchasePrice and purchaseCost without crashing when non-whitelisted are allowed', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      });

      const stripped = (await pipe.transform(
        {
          name: 'Test Device',
          purchasePrice: 500,
          purchaseCost: 500,
        },
        { type: 'body', metatype: CreateAssetDto },
      )) as Record<string, unknown>;

      expect(stripped.name).toBe('Test Device');
      expect(stripped).not.toHaveProperty('purchasePrice');
      expect(stripped).not.toHaveProperty('purchaseCost');
    });
  });

  // =========================================================================
  // 4. REPORTS SERVICE SUITE R1 SPECIFICATIONS
  // =========================================================================
  describe('4. Reports Service Suite R1 Telemetry & Zero Aggregate Invariant', () => {
    it('4.1 report r1 returns statistics with label "Managed Fleet" and accurate count from asset.count()', async () => {
      const testCounts = [0, 1, 42, 1250, 99999];

      for (const count of testCounts) {
        const mockPrismaInstance = {
          asset: {
            count: vi.fn().mockResolvedValue(count),
            aggregate: vi.fn().mockImplementation(() => {
              throw new Error('Forbidden call: asset.aggregate MUST NOT be called!');
            }),
          },
          license: {
            aggregate: vi.fn().mockResolvedValue({ _sum: { totalSeats: 100, usedSeats: 50 } }),
            findMany: vi.fn().mockResolvedValue([]),
          },
          $queryRaw: vi.fn().mockResolvedValue([{ totalSpend: 50000 }]),
        };

        const customReportsService = new ReportsService(
          mockPrismaInstance as unknown as PrismaService,
        );
        const suites = await customReportsService.getReportSuites();

        const r1 = suites.find((s) => s.id === 'r1');
        expect(r1).toBeDefined();
        expect(r1?.stats.label).toBe('Managed Fleet');
        expect(r1?.stats.primary).toBe(`${count.toLocaleString()} Assets`);
        expect(r1?.stats.secondary).toBe('3.4 yrs avg age');

        // Verify asset.count() was invoked
        expect(mockPrismaInstance.asset.count).toHaveBeenCalled();
        // Verify asset.aggregate was NEVER invoked
        expect(mockPrismaInstance.asset.aggregate).not.toHaveBeenCalled();
      }
    });

    it('4.2 getStats in ReportsService does NOT call asset.aggregate on purchaseCost', async () => {
      const mockPrismaInstance = {
        asset: {
          count: vi.fn().mockResolvedValue(100),
          aggregate: vi.fn().mockImplementation(() => {
            throw new Error('Forbidden call: asset.aggregate MUST NOT be called!');
          }),
        },
        license: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        reportSchedule: {
          count: vi.fn().mockResolvedValue(2),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ totalSpend: 40000 }]),
      };

      const customReportsService = new ReportsService(
        mockPrismaInstance as unknown as PrismaService,
      );
      const stats = await customReportsService.getStats();

      expect(stats.auditReadiness).toBe('100%');
      expect(mockPrismaInstance.asset.count).toHaveBeenCalled();
      expect(mockPrismaInstance.asset.aggregate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. LIVE POSTGRESQL DATABASE INTEGRATION & ROUNDTRIP VERIFICATION
  // =========================================================================
  describe('5. Live Database Integration & Roundtrip Verification', () => {
    it('5.1 verifies live DB creates asset with null serialNumber and stores actual null in PostgreSQL', async () => {
      if (!isDbAvailable || !liveModelId || !liveDeptId) return;

      const subcode = `LIVE-NULL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      let createdId: string | null = null;
      try {
        const created = await assetsService.registerUnit({
          deviceModelId: liveModelId,
          departmentId: liveDeptId,
          subcode,
          serialNumber: null,
        });
        createdId = created.id;

        expect(created.serialNumber).toBeNull();

        // Read raw record directly from Prisma
        const rawInDb = await prisma.asset.findUnique({
          where: { id: created.id },
        });
        expect(rawInDb).not.toBeNull();
        expect(rawInDb?.serialNumber).toBeNull();
      } finally {
        if (createdId) {
          await prisma.asset.deleteMany({ where: { id: createdId } });
        }
      }
    });

    it('5.2 verifies live DB creates asset with empty string "" serialNumber and stores null in PostgreSQL', async () => {
      if (!isDbAvailable || !liveModelId || !liveDeptId) return;

      const subcode = `LIVE-EMPTY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      let createdId: string | null = null;
      try {
        const created = await assetsService.registerUnit({
          deviceModelId: liveModelId,
          departmentId: liveDeptId,
          subcode,
          serialNumber: '',
        });
        createdId = created.id;

        expect(created.serialNumber).toBeNull();

        const rawInDb = await prisma.asset.findUnique({
          where: { id: created.id },
        });
        expect(rawInDb?.serialNumber).toBeNull();
      } finally {
        if (createdId) {
          await prisma.asset.deleteMany({ where: { id: createdId } });
        }
      }
    });

    it('5.3 verifies live DB creates asset with valid serialNumber and stores string in PostgreSQL', async () => {
      if (!isDbAvailable || !liveModelId || !liveDeptId) return;

      const validSn = `LIVE-SN-${Date.now()}`;
      const subcode = `LIVE-VALID-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      let createdId: string | null = null;
      try {
        const created = await assetsService.registerUnit({
          deviceModelId: liveModelId,
          departmentId: liveDeptId,
          subcode,
          serialNumber: validSn,
        });
        createdId = created.id;

        expect(created.serialNumber).toBe(validSn);

        const rawInDb = await prisma.asset.findUnique({
          where: { id: created.id },
        });
        expect(rawInDb?.serialNumber).toBe(validSn);
      } finally {
        if (createdId) {
          await prisma.asset.deleteMany({ where: { id: createdId } });
        }
      }
    });

    it('5.4 verifies live ReportsService reflects dynamic asset count in report r1', async () => {
      if (!isDbAvailable) return;

      const actualCount = await prisma.asset.count();
      const suites = await reportsService.getReportSuites();

      const r1 = suites.find((s) => s.id === 'r1');
      expect(r1).toBeDefined();
      expect(r1?.stats.label).toBe('Managed Fleet');
      expect(r1?.stats.primary).toBe(`${actualCount.toLocaleString()} Assets`);
    });
  });
});
