import 'dotenv/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { AssetStatus } from '@uims/shared-types';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('Challenger M2-2: Live Stock Aggregation Engine & Zero In-Memory Scan Suite', () => {
  let prisma: PrismaService;
  let service: InventoryService;

  beforeEach(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new InventoryService(prisma);
  });

  // =========================================================================
  // TEST 1: Zero In-Memory Table Scan & Aggregation Audit (AGENTS.md Section 6)
  // =========================================================================
  describe('Test 1: Zero In-Memory Table Scan Audit (AGENTS.md Section 6)', () => {
    it('should verify getStats uses SQL CTE and groupBy, never loading all assets into Node memory', async () => {
      // Spy on prisma methods
      const assetFindManySpy = vi.spyOn(prisma.asset, 'findMany');
      const deviceModelFindManySpy = vi.spyOn(prisma.deviceModel, 'findMany');
      const groupBySpy = vi.spyOn(prisma.asset, 'groupBy');
      const queryRawSpy = vi.spyOn(prisma, '$queryRaw');

      const stats = await service.getStats();

      // In-memory scans prohibited: findMany on Asset or DeviceModel must NOT be called by getStats()
      expect(assetFindManySpy).not.toHaveBeenCalled();
      expect(deviceModelFindManySpy).not.toHaveBeenCalled();

      // Database engine aggregations: groupBy and $queryRaw MUST be called
      expect(groupBySpy).toHaveBeenCalledWith({
        by: ['status'],
        _count: { _all: true },
      });
      expect(queryRawSpy).toHaveBeenCalled();
      expect(stats).toBeDefined();

      assetFindManySpy.mockRestore();
      deviceModelFindManySpy.mockRestore();
      groupBySpy.mockRestore();
      queryRawSpy.mockRestore();
    });

    it('should verify findAll enforces bounded take and uses asset.groupBy for model metrics', async () => {
      const assetFindManySpy = vi.spyOn(prisma.asset, 'findMany');
      const deviceModelFindManySpy = vi.spyOn(prisma.deviceModel, 'findMany');
      const groupBySpy = vi.spyOn(prisma.asset, 'groupBy');

      const result = await service.findAll({ page: 1, limit: 10 });

      // Assets must never be loaded via findMany in findAll
      expect(assetFindManySpy).not.toHaveBeenCalled();

      // DeviceModel findMany must be bounded with take <= 100 and deterministic ordering
      expect(deviceModelFindManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        }),
      );

      // Asset metrics must be computed via database groupBy for only the returned model IDs
      expect(groupBySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['deviceModelId', 'status'],
          where: { deviceModelId: { in: expect.any(Array) } },
          _count: { _all: true },
        }),
      );

      expect(result.items.length).toBeLessThanOrEqual(10);

      assetFindManySpy.mockRestore();
      deviceModelFindManySpy.mockRestore();
      groupBySpy.mockRestore();
    });

    it('should verify findOne uses asset.groupBy rather than loading all asset records', async () => {
      const models = await prisma.deviceModel.findMany({ take: 1, where: { deletedAt: null } });
      expect(models.length).toBeGreaterThan(0);
      const testModel = models[0];

      const assetFindManySpy = vi.spyOn(prisma.asset, 'findMany');
      const groupBySpy = vi.spyOn(prisma.asset, 'groupBy');

      const result = await service.findOne(testModel.id);

      expect(assetFindManySpy).not.toHaveBeenCalled();
      expect(groupBySpy).toHaveBeenCalledWith({
        by: ['status'],
        where: { deviceModelId: testModel.id },
        _count: { _all: true },
      });
      expect(result.id).toBe(testModel.id);

      assetFindManySpy.mockRestore();
      groupBySpy.mockRestore();
    });

    it('should verify pagination upper ceiling enforces Math.min(limit, 100)', async () => {
      const deviceModelFindManySpy = vi.spyOn(prisma.deviceModel, 'findMany');

      // Attempt to request 1000 items (exceeding ceiling)
      await service.findAll({ page: 1, limit: 1000 });

      expect(deviceModelFindManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Capped at 100
        }),
      );

      deviceModelFindManySpy.mockRestore();
    });
  });

  // =========================================================================
  // TEST 2: Accuracy of Stock Metrics (100% Mathematical Parity with PostgreSQL)
  // =========================================================================
  describe('Test 2: Accuracy of Stock Metrics vs PostgreSQL Ground Truth', () => {
    it('should verify 100% mathematical parity between getStats() and direct PostgreSQL queries', async () => {
      // 1. Query PostgreSQL ground truth directly
      const [groundTruthModels] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int AS count FROM "DeviceModel" WHERE "deletedAt" IS NULL
      `;
      const [groundTruthAvailable] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int AS count FROM "Asset" WHERE status = 'AVAILABLE'
      `;
      const [groundTruthAssigned] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int AS count FROM "Asset" WHERE status = 'IN_USE'
      `;
      const [groundTruthMaintenance] = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::int AS count FROM "Asset" WHERE status = 'MAINTENANCE'
      `;
      const [groundTruthValuation] = await prisma.$queryRaw<
        Array<{ valuation: number | string | null }>
      >`
        SELECT COALESCE(SUM(dm."unitCost"), 0) AS valuation
        FROM "Asset" a
        JOIN "DeviceModel" dm ON a."deviceModelId" = dm.id
        WHERE a.status = 'AVAILABLE'
      `;
      const [groundTruthStockLevels] = await prisma.$queryRaw<
        Array<{ low_stock: bigint | number; out_of_stock: bigint | number }>
      >`
        WITH model_avail AS (
          SELECT dm.id, dm."minThreshold", COUNT(a.id) FILTER (WHERE a.status = 'AVAILABLE') AS avail_count
          FROM "DeviceModel" dm
          LEFT JOIN "Asset" a ON a."deviceModelId" = dm.id
          WHERE dm."deletedAt" IS NULL
          GROUP BY dm.id, dm."minThreshold"
        )
        SELECT
          COUNT(*) FILTER (WHERE avail_count > 0 AND avail_count < "minThreshold")::int AS low_stock,
          COUNT(*) FILTER (WHERE avail_count = 0)::int AS out_of_stock
        FROM model_avail
      `;

      const expectedTotalModels = Number(groundTruthModels.count);
      const expectedAvailable = Number(groundTruthAvailable.count);
      const expectedAssigned = Number(groundTruthAssigned.count);
      const expectedMaintenance = Number(groundTruthMaintenance.count);
      const expectedLowStock = Number(groundTruthStockLevels.low_stock);
      const expectedOutOfStock = Number(groundTruthStockLevels.out_of_stock);
      const expectedValuation = Number(groundTruthValuation.valuation ?? 0);

      // 2. Call InventoryService.getStats()
      const stats = await service.getStats();

      // 3. Verify exact parity
      expect(stats.totalModels).toBe(expectedTotalModels);
      expect(stats.totalSkus).toBe(expectedTotalModels);
      expect(stats.availableUnits).toBe(expectedAvailable);
      expect(stats.assignedUnits).toBe(expectedAssigned);
      expect(stats.inUseUnits).toBe(expectedAssigned);
      expect(stats.maintenanceUnits).toBe(expectedMaintenance);
      expect(stats.totalUnits).toBe(expectedAvailable + expectedAssigned + expectedMaintenance);
      expect(stats.lowStockCount).toBe(expectedLowStock);
      expect(stats.outOfStockCount).toBe(expectedOutOfStock);
      expect(stats.totalValuation).toBe(expectedValuation);
    });
  });

  // =========================================================================
  // TEST 3: Stock Status Logic (Depleted, Low Stock, In Stock)
  // =========================================================================
  describe('Test 3: Stock Status Logic & Boundary Behavior', () => {
    it('should verify models with 0 available units report OUT_OF_STOCK', async () => {
      const result = await service.findAll({ limit: 100 });
      const zeroAvailModels = result.items.filter((m) => m.availableUnits === 0);

      expect(zeroAvailModels.length).toBeGreaterThan(0);
      for (const model of zeroAvailModels) {
        expect(model.stockStatus).toBe('out_of_stock');
        expect(model.status).toBe('OUT_OF_STOCK');
        expect(model.statusTag).toBe('Out of Stock');
      }
    });

    it('should verify models with 0 < available < minThreshold report LOW_STOCK', async () => {
      const result = await service.findAll({ limit: 100 });
      const strictlyLowModels = result.items.filter(
        (m) => m.availableUnits > 0 && m.availableUnits < m.minThreshold,
      );

      expect(strictlyLowModels.length).toBeGreaterThan(0);
      for (const model of strictlyLowModels) {
        expect(model.stockStatus).toBe('low_stock');
        expect(model.status).toBe('LOW_STOCK');
        expect(model.statusTag).toBe('Low Stock');
      }
    });

    it('should verify models with available >= minThreshold report IN_STOCK', async () => {
      const result = await service.findAll({ limit: 100 });
      const healthyModels = result.items.filter((m) => m.availableUnits >= m.minThreshold);

      expect(healthyModels.length).toBeGreaterThan(0);
      for (const model of healthyModels) {
        expect(model.stockStatus).toBe('in_stock');
        expect(model.status).toBe('IN_STOCK');
        expect(model.statusTag).toBe('In Stock');
      }
    });

    it('should document and verify boundary case when available === minThreshold is IN_STOCK', async () => {
      const result = await service.findAll({ limit: 100 });
      const exactThresholdModels = result.items.filter(
        (m) => m.availableUnits === m.minThreshold && m.availableUnits > 0,
      );

      expect(exactThresholdModels.length).toBeGreaterThan(0);
      for (const model of exactThresholdModels) {
        expect(model.stockStatus).toBe('in_stock');
        expect(model.status).toBe('IN_STOCK');
        expect(model.statusTag).toBe('In Stock');
      }
    });

    it('should test stockStatus filtering in findAll query', async () => {
      const outOfStockQuery = await service.findAll({ stockStatus: 'out_of_stock', limit: 100 });
      for (const item of outOfStockQuery.items) {
        expect(item.availableUnits).toBe(0);
        expect(item.stockStatus).toBe('out_of_stock');
      }

      const lowStockQuery = await service.findAll({ stockStatus: 'low_stock', limit: 100 });
      for (const item of lowStockQuery.items) {
        expect(item.availableUnits).toBeGreaterThan(0);
        expect(item.availableUnits).toBeLessThan(item.minThreshold);
        expect(item.stockStatus).toBe('low_stock');
      }
    });
  });

  // =========================================================================
  // TEST 4: Relational Integrity & Deletion Protection (Adversarial)
  // =========================================================================
  describe('Test 4: Deletion Blocking on Existing Child Units', () => {
    it('should block deletion of device models that have physical units', async () => {
      const modelWithUnits = await prisma.deviceModel.findFirst({
        where: {
          deletedAt: null,
          units: { some: {} },
        },
      });

      expect(modelWithUnits).not.toBeNull();
      if (!modelWithUnits) return;

      await expect(service.remove(modelWithUnits.id)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException on non-existent or soft-deleted model', async () => {
      await expect(service.findOne('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
