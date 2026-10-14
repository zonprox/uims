import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { AssetStatus } from '@uims/shared-types';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('Challenger M2-2: Empirical Inventory Stock Metrics & Intake Challenge Suite', () => {
  let prisma: PrismaService;
  let inventoryService: InventoryService;
  let assetsService: AssetsService;
  let authToken = '';
  let testCategoryId: string;
  let testDeptId: string | undefined;
  const createdModelIds: string[] = [];
  const createdAssetIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    inventoryService = new InventoryService(prisma);
    assetsService = new AssetsService(prisma);

    const cat = await prisma.assetCategory.findFirst();
    if (!cat) {
      throw new Error('Precondition failed: At least one AssetCategory must exist');
    }
    testCategoryId = cat.id;

    const dept = await prisma.department.findFirst();
    testDeptId = dept?.id;

    // Login as Admin to get live token for HTTP route testing
    try {
      const loginRes = await fetch('http://localhost:3002/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@youngonevn.com',
          password: process.env.INITIAL_ADMIN_PASSWORD || 'Youngone@2026',
        }),
      });
      if (loginRes.ok) {
        const data = (await loginRes.json()) as { data?: { accessToken?: string } };
        authToken = data.data?.accessToken || '';
      }
    } catch {
      // Live HTTP server might be tested conditionally
    }
  });

  afterAll(async () => {
    // Cleanup any created assets
    if (createdAssetIds.length > 0) {
      await prisma.asset.deleteMany({
        where: { id: { in: createdAssetIds } },
      });
    }
    // Cleanup created models and child assets
    if (createdModelIds.length > 0) {
      await prisma.asset.deleteMany({
        where: { deviceModelId: { in: createdModelIds } },
      });
      await prisma.deviceModel.deleteMany({
        where: { id: { in: createdModelIds } },
      });
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // TASK 1: GET /inventory/stats Live Aggregation in PostgreSQL
  // =========================================================================
  describe('Task 1: GET /inventory/stats Live Aggregation in PostgreSQL', () => {
    it('should aggregate totalUnits, availableUnits, assignedUnits, maintenanceUnits from live Asset table', async () => {
      // 1. Compute ground truth directly from PostgreSQL
      const [availRow] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int AS count FROM "Asset" WHERE status = 'AVAILABLE'
      `;
      const [assignedRow] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int AS count FROM "Asset" WHERE status = 'IN_USE'
      `;
      const [maintRow] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int AS count FROM "Asset" WHERE status = 'MAINTENANCE'
      `;
      const [modelCountRow] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int AS count FROM "DeviceModel" WHERE "deletedAt" IS NULL
      `;
      const [valuationRow] = await prisma.$queryRaw<Array<{ val: number | string | null }>>`
        SELECT COALESCE(SUM(dm."unitCost"), 0) AS val
        FROM "Asset" a
        JOIN "DeviceModel" dm ON a."deviceModelId" = dm.id
        WHERE a.status = 'AVAILABLE'
      `;

      const expectedAvail = Number(availRow.count);
      const expectedAssigned = Number(assignedRow.count);
      const expectedMaint = Number(maintRow.count);
      const expectedModels = Number(modelCountRow.count);
      const expectedVal = Number(valuationRow.val ?? 0);

      // 2. Query service
      const stats = await inventoryService.getStats();

      // 3. Verify exact parity
      expect(stats.totalModels).toBe(expectedModels);
      expect(stats.availableUnits).toBe(expectedAvail);
      expect(stats.assignedUnits).toBe(expectedAssigned);
      expect(stats.maintenanceUnits).toBe(expectedMaint);
      expect(stats.totalUnits).toBe(expectedAvail + expectedAssigned + expectedMaint);
      expect(stats.totalValuation).toBe(expectedVal);
    });

    it('should challenge stock partition invariant: inStockCount + lowStockCount + outOfStockCount === totalModels', async () => {
      const stats = await inventoryService.getStats();

      // PostgreSQL Ground Truth for partitioned breakdown:
      const [partitionRow] = await prisma.$queryRaw<
        Array<{
          healthy_in_stock: bigint | number;
          low_stock: bigint | number;
          out_of_stock: bigint | number;
        }>
      >`
        WITH model_avail AS (
          SELECT dm.id, dm."minThreshold", COUNT(a.id) FILTER (WHERE a.status = 'AVAILABLE') AS avail_count
          FROM "DeviceModel" dm
          LEFT JOIN "Asset" a ON a."deviceModelId" = dm.id
          WHERE dm."deletedAt" IS NULL
          GROUP BY dm.id, dm."minThreshold"
        )
        SELECT
          COUNT(*) FILTER (WHERE avail_count >= "minThreshold")::int AS healthy_in_stock,
          COUNT(*) FILTER (WHERE avail_count > 0 AND avail_count < "minThreshold")::int AS low_stock,
          COUNT(*) FILTER (WHERE avail_count = 0)::int AS out_of_stock
        FROM model_avail
      `;

      const trueHealthyInStock = Number(partitionRow.healthy_in_stock);
      const trueLowStock = Number(partitionRow.low_stock);
      const trueOutOfStock = Number(partitionRow.out_of_stock);

      // Note: The ground truth partition must sum to totalModels
      expect(trueHealthyInStock + trueLowStock + trueOutOfStock).toBe(stats.totalModels);

      // Verify that reported inStockCount matches healthy in-stock partition and sums exactly to totalModels
      const sumOfReportedCounts = stats.inStockCount + stats.lowStockCount + stats.outOfStockCount;
      expect(stats.inStockCount).toBe(trueHealthyInStock);
      expect(stats.lowStockCount).toBe(trueLowStock);
      expect(stats.outOfStockCount).toBe(trueOutOfStock);
      expect(sumOfReportedCounts).toBe(stats.totalModels);
    });
  });

  // =========================================================================
  // TASK 2: GET /inventory Stock Health Status Calculation
  // =========================================================================
  describe('Task 2: GET /inventory Stock Health Status Calculation', () => {
    it('should assign correct stockStatus and statusTag for every returned item', async () => {
      const result = await inventoryService.findAll({ limit: 100 });
      expect(result.items.length).toBeGreaterThan(0);

      for (const item of result.items) {
        if (item.availableUnits === 0) {
          expect(item.stockStatus).toBe('out_of_stock');
          expect(item.statusTag).toBe('Out of Stock');
        } else if (item.availableUnits < item.minThreshold) {
          expect(item.stockStatus).toBe('low_stock');
          expect(item.statusTag).toBe('Low Stock');
        } else {
          expect(item.stockStatus).toBe('in_stock');
          expect(item.statusTag).toBe('In Stock');
        }
      }
    });

    it('should challenge findAll({ stockStatus: "in_stock" }) filtering behavior', async () => {
      const inStockItems = await inventoryService.findAll({ stockStatus: 'in_stock', limit: 100 });

      // Identify any low-stock items returned by the in_stock filter
      const lowStockLeaked = inStockItems.items.filter((i) => i.stockStatus === 'low_stock');
      expect(lowStockLeaked).toHaveLength(0);

      // Every item matching stockStatus=in_stock SHOULD strictly have stockStatus === 'in_stock'
      const allGenuinelyInStock = inStockItems.items.every((i) => i.stockStatus === 'in_stock');
      expect(allGenuinelyInStock).toBe(true);
    });

    it('should verify findAll({ stockStatus: "out_of_stock" }) returns strictly out of stock items', async () => {
      const outOfStockItems = await inventoryService.findAll({
        stockStatus: 'out_of_stock',
        limit: 100,
      });
      for (const item of outOfStockItems.items) {
        expect(item.availableUnits).toBe(0);
        expect(item.stockStatus).toBe('out_of_stock');
      }
    });

    it('should verify findAll({ stockStatus: "low_stock" }) returns strictly low stock items', async () => {
      const lowStockItems = await inventoryService.findAll({
        stockStatus: 'low_stock',
        limit: 100,
      });
      for (const item of lowStockItems.items) {
        expect(item.availableUnits).toBeGreaterThan(0);
        expect(item.availableUnits).toBeLessThanOrEqual(item.minThreshold);
        expect(item.stockStatus).toBe('low_stock');
      }
    });
  });

  // =========================================================================
  // TASK 3: Batch Stock Intake (POST /inventory/intake & POST /assets/intake)
  // =========================================================================
  describe('Task 3: Batch Stock Intake (POST /inventory/intake & POST /assets/intake)', () => {
    let testModel: { id: string; modelCode: string; name: string };

    beforeAll(async () => {
      const modelCode = `CHL-MOD-${Date.now().toString(36).toUpperCase()}`;
      testModel = await prisma.deviceModel.create({
        data: {
          name: 'Challenger Test Monitor 27"',
          modelCode,
          categoryId: testCategoryId,
          manufacturer: 'Challenger Brand',
          unitCost: 350,
          minThreshold: 5,
          binNumber: 'BIN-TEST-01',
        },
      });
      createdModelIds.push(testModel.id);
    });

    it('should intake physical units via inventoryService.batchIntake with status = AVAILABLE linked to model', async () => {
      const intakeResult = await inventoryService.batchIntake({
        deviceModelId: testModel.id,
        count: 3,
        startSequence: 101,
        tagPrefix: `${testModel.modelCode}-`,
      });

      expect(intakeResult.success).toBe(true);
      expect(intakeResult.count).toBe(3);
      expect(intakeResult.modelId).toBe(testModel.id);
      expect(intakeResult.units).toHaveLength(3);

      for (const u of intakeResult.units) {
        createdAssetIds.push(u.id);
        expect(u.status).toBe(AssetStatus.AVAILABLE);

        // Verify in PostgreSQL database
        const dbAsset = await prisma.asset.findUnique({ where: { id: u.id } });
        expect(dbAsset).not.toBeNull();
        expect(dbAsset?.deviceModelId).toBe(testModel.id);
        expect(dbAsset?.status).toBe(AssetStatus.AVAILABLE);
      }

      // Verify stock stats updated immediately
      const modelDetails = await inventoryService.findOne(testModel.id);
      expect(modelDetails.availableUnits).toBe(3);
      expect(modelDetails.totalUnits).toBe(3);
      expect(modelDetails.stockStatus).toBe('low_stock'); // 3 <= minThreshold (5)
    });

    it('should intake physical units via assetsService.batchIntakeUnits with status = AVAILABLE linked to model', async () => {
      const intakeResult = await assetsService.batchIntakeUnits({
        deviceModelId: testModel.id,
        count: 4,
        startSequence: 201,
        tagPrefix: `${testModel.modelCode}-AST-`,
      });

      expect(intakeResult.success).toBe(true);
      expect(intakeResult.count).toBe(4);
      expect(intakeResult.modelId).toBe(testModel.id);
      expect(intakeResult.units).toHaveLength(4);

      for (const u of intakeResult.units) {
        createdAssetIds.push(u.id);
        expect(u.status).toBe(AssetStatus.AVAILABLE);

        const dbAsset = await prisma.asset.findUnique({ where: { id: u.id } });
        expect(dbAsset).not.toBeNull();
        expect(dbAsset?.deviceModelId).toBe(testModel.id);
        expect(dbAsset?.status).toBe(AssetStatus.AVAILABLE);
      }

      // Model now has 3 + 4 = 7 units. minThreshold is 5. Should now be IN_STOCK!
      const modelDetails = await inventoryService.findOne(testModel.id);
      expect(modelDetails.availableUnits).toBe(7);
      expect(modelDetails.stockStatus).toBe('in_stock');
    });

    it('should challenge explicit units array handling in POST /inventory/intake vs POST /assets/intake', async () => {
      // 1. In assetsService, explicit units array is supported
      const astExplicitResult = await assetsService.batchIntakeUnits({
        deviceModelId: testModel.id,
        units: [
          { subcode: `${testModel.modelCode}-EXP-01`, serialNumber: 'SN-EXP-01' },
          { subcode: `${testModel.modelCode}-EXP-02`, serialNumber: 'SN-EXP-02' },
        ],
      });

      expect(astExplicitResult.success).toBe(true);
      expect(astExplicitResult.count).toBe(2);
      for (const u of astExplicitResult.units) {
        createdAssetIds.push(u.id);
      }

      const exp1 = await prisma.asset.findFirst({
        where: { subcode: `${testModel.modelCode}-EXP-01` },
      });
      expect(exp1).not.toBeNull();
      expect(exp1?.serialNumber).toBe('SN-EXP-01');

      // 2. In inventoryService, test if explicit units array is supported or ignored
      const invExplicitPayload = {
        deviceModelId: testModel.id,
        units: [
          { subcode: `${testModel.modelCode}-INVEXP-01`, serialNumber: 'SN-INVEXP-01' },
          { subcode: `${testModel.modelCode}-INVEXP-02`, serialNumber: 'SN-INVEXP-02' },
        ],
      };

      const invExplicitResult = await inventoryService.batchIntake(invExplicitPayload);

      // Track created units for cleanup
      for (const u of invExplicitResult.units) {
        createdAssetIds.push(u.id);
      }

      // EMPIRICAL VERIFICATION: inventoryService creates the 2 explicit units from data.units
      const invExp1 = await prisma.asset.findFirst({
        where: { subcode: `${testModel.modelCode}-INVEXP-01` },
      });
      const droppedUnits = invExp1 === null || invExplicitResult.count !== 2;

      expect(droppedUnits).toBe(false);
      expect(invExp1).not.toBeNull();
      expect(invExp1?.serialNumber).toBe('SN-INVEXP-01');
      expect(invExplicitResult.count).toBe(2);
    });

    it('should atomically rollback transaction when subcode collision occurs during batch intake', async () => {
      const collidingSubcode = `${testModel.modelCode}-COLLIDE-001`;

      // Seed pre-existing colliding asset
      const preExisting = await prisma.asset.create({
        data: {
          deviceModelId: testModel.id,
          subcode: collidingSubcode,
          assetTag: collidingSubcode,
          status: AssetStatus.AVAILABLE,
          departmentId: testDeptId,
        },
      });
      createdAssetIds.push(preExisting.id);

      // Attempt batch intake where unit #2 has the colliding subcode
      // tagPrefix will generate:
      // seq 1: ${testModel.modelCode}-COLLIDE-000 (new)
      // seq 2: ${testModel.modelCode}-COLLIDE-001 (COLLISION!)
      await expect(
        inventoryService.batchIntake({
          deviceModelId: testModel.id,
          count: 3,
          startSequence: 0,
          tagPrefix: `${testModel.modelCode}-COLLIDE-`,
        }),
      ).rejects.toThrow(ConflictException);

      // Verify that unit #0 was rolled back and was NOT saved to the database!
      const rolledBackUnit = await prisma.asset.findFirst({
        where: { subcode: `${testModel.modelCode}-COLLIDE-000` },
      });
      expect(rolledBackUnit).toBeNull();
    });

    it('should throw NotFoundException on non-existent deviceModelId', async () => {
      await expect(
        inventoryService.batchIntake({
          deviceModelId: '00000000-0000-0000-0000-000000000000',
          count: 5,
        }),
      ).rejects.toThrow(NotFoundException);

      await expect(
        assetsService.batchIntakeUnits({
          deviceModelId: '00000000-0000-0000-0000-000000000000',
          count: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if deviceModelId is missing', async () => {
      await expect(inventoryService.batchIntake({ count: 5 })).rejects.toThrow(BadRequestException);

      await expect(assetsService.batchIntakeUnits({ count: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // TASK 4: Live HTTP API Route & Role Guard Testing
  // =========================================================================
  describe('Task 4: Live HTTP API Route & Role Guard Testing', () => {
    it('should reject unauthenticated POST /api/v1/inventory/intake with 401', async () => {
      if (!authToken) return;

      const res = await fetch('http://localhost:3002/api/v1/inventory/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 }),
      });

      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated POST /api/v1/assets/intake with 401', async () => {
      if (!authToken) return;

      const res = await fetch('http://localhost:3002/api/v1/assets/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 }),
      });

      expect(res.status).toBe(401);
    });

    it('should allow Admin to successfully perform intake via POST /api/v1/assets/intake', async () => {
      if (!authToken || createdModelIds.length === 0) return;

      const modelId = createdModelIds[0];
      const res = await fetch('http://localhost:3002/api/v1/assets/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceModelId: modelId,
          count: 2,
          startSequence: 8801,
          tagPrefix: 'HTTP-AST-',
        }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as {
        success: boolean;
        data: { units: Array<{ id: string }> };
      };
      expect(json.success).toBe(true);
      expect(json.data.units).toHaveLength(2);

      for (const u of json.data.units) {
        createdAssetIds.push(u.id);
      }
    });

    it('should allow Admin to successfully perform intake via POST /api/v1/inventory/intake', async () => {
      if (!authToken || createdModelIds.length === 0) return;

      const modelId = createdModelIds[0];
      const res = await fetch('http://localhost:3002/api/v1/inventory/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceModelId: modelId,
          count: 2,
          startSequence: 8851,
          tagPrefix: 'HTTP-INV-',
        }),
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as {
        success: boolean;
        data: { units: Array<{ id: string }> };
      };
      expect(json.success).toBe(true);
      expect(json.data.units).toHaveLength(2);

      for (const u of json.data.units) {
        createdAssetIds.push(u.id);
      }
    });
  });
});
