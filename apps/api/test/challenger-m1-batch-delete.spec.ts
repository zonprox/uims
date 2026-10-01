import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import type { PrismaService } from '../src/database/prisma.service';
import { AssetsController } from '../src/modules/assets/assets.controller';
import { AssetsService } from '../src/modules/assets/assets.service';
import { BatchDeleteAssetDto } from '../src/modules/assets/dto/batch-delete-asset.dto';

interface MockTx {
  asset: {
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
}

describe('Challenger M1: Adversarial Stress & Route Precedence Suite for Batch Deletion API', () => {
  let service: AssetsService;
  let controller: AssetsController;
  let mockPrisma: {
    $transaction: ReturnType<typeof vi.fn>;
    asset: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: MockTx) => Promise<unknown>) =>
        cb({
          asset: {
            findMany: mockPrisma.asset.findMany,
            deleteMany: mockPrisma.asset.deleteMany,
          },
        }),
      ),
      asset: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        delete: vi.fn(),
      },
    };

    service = new AssetsService(mockPrisma as unknown as PrismaService);
    controller = new AssetsController(service);
  });

  // =========================================================================
  // DIMENSION 1: Boundary & Adversarial Malformed Inputs
  // =========================================================================
  describe('Dimension 1: Boundary & Adversarial Malformed Inputs', () => {
    it('should return { count: 0, deletedIds: [] } when input array is completely empty', async () => {
      const result = await service.batchDelete([]);

      expect(result).toEqual({ count: 0, deletedIds: [] });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.asset.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.asset.deleteMany).not.toHaveBeenCalled();
    });

    it('should handle array containing only empty or whitespace-only strings gracefully', async () => {
      const hostileInputs = ['', '   ', '\t', '\n\r', '      '];
      const result = await service.batchDelete(hostileInputs);

      expect(result).toEqual({ count: 0, deletedIds: [] });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.asset.findMany).not.toHaveBeenCalled();
    });

    it('should strip whitespace and deduplicate repeated IDs [id-1, id-1, id-2]', async () => {
      mockPrisma.asset.findMany.mockResolvedValueOnce([{ id: 'id-1' }, { id: 'id-2' }]);
      mockPrisma.asset.deleteMany.mockResolvedValueOnce({ count: 2 });

      const input = ['id-1', 'id-1', 'id-2'];
      const result = await service.batchDelete(input);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['id-1', 'id-2'] } },
        select: { id: true },
        take: 2,
        orderBy: [{ id: 'asc' }],
      });
      expect(mockPrisma.asset.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['id-1', 'id-2'] } },
      });
      expect(result).toEqual({ count: 2, deletedIds: ['id-1', 'id-2'] });
    });

    it('should handle dirty inputs with mixed padding, empty items, and duplicates', async () => {
      mockPrisma.asset.findMany.mockResolvedValueOnce([{ id: 'uuid-1' }, { id: 'uuid-2' }]);
      mockPrisma.asset.deleteMany.mockResolvedValueOnce({ count: 2 });

      const dirtyInput = ['  uuid-1  ', '', '   ', 'uuid-1', ' uuid-2 \t', '  uuid-2 '];
      const result = await service.batchDelete(dirtyInput);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['uuid-1', 'uuid-2'] } },
        select: { id: true },
        take: 2,
        orderBy: [{ id: 'asc' }],
      });
      expect(result).toEqual({ count: 2, deletedIds: ['uuid-1', 'uuid-2'] });
    });

    it('should safely handle runtime type errors (null, undefined, non-array) without throwing', async () => {
      const nullResult = await service.batchDelete(null as unknown as string[]);
      expect(nullResult).toEqual({ count: 0, deletedIds: [] });

      const undefinedResult = await service.batchDelete(undefined as unknown as string[]);
      expect(undefinedResult).toEqual({ count: 0, deletedIds: [] });

      const objectResult = await service.batchDelete({} as unknown as string[]);
      expect(objectResult).toEqual({ count: 0, deletedIds: [] });

      const stringResult = await service.batchDelete('ast-1' as unknown as string[]);
      expect(stringResult).toEqual({ count: 0, deletedIds: [] });

      const dirtyTypesResult = await service.batchDelete([null, undefined, 123, true, {}] as unknown as string[]);
      expect(dirtyTypesResult).toEqual({ count: 0, deletedIds: [] });
    });

    it('should collapse 1000 duplicate IDs into a single database query of 1 ID', async () => {
      mockPrisma.asset.findMany.mockResolvedValueOnce([{ id: 'ast-dupe' }]);
      mockPrisma.asset.deleteMany.mockResolvedValueOnce({ count: 1 });

      const massiveDupes = Array(1000).fill('ast-dupe');
      const result = await service.batchDelete(massiveDupes);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['ast-dupe'] } },
        select: { id: true },
        take: 1,
        orderBy: [{ id: 'asc' }],
      });
      expect(result).toEqual({ count: 1, deletedIds: ['ast-dupe'] });
    });

    describe('DTO Validation via class-validator', () => {
      it('should reject empty ids array with ArrayNotEmpty error', async () => {
        const dto = plainToInstance(BatchDeleteAssetDto, { ids: [] });
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('ids');
        expect(errors[0].constraints?.arrayNotEmpty).toBe('ids array must not be empty');
      });

      it('should reject array containing empty strings', async () => {
        const dto = plainToInstance(BatchDeleteAssetDto, { ids: ['ast-1', ''] });
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('ids');
        expect(errors[0].constraints?.isNotEmpty).toBe('Asset IDs must not be empty strings');
      });

      it('should reject array containing non-string elements (numbers, objects)', async () => {
        const dto = plainToInstance(BatchDeleteAssetDto, { ids: [123, { id: 'x' }] });
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('ids');
        expect(errors[0].constraints?.isString).toBe('Each asset ID must be a string');
      });

      it('should reject missing or non-array ids property', async () => {
        const dto = plainToInstance(BatchDeleteAssetDto, {});
        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('ids');
        expect(errors[0].constraints?.isArray).toBe('ids must be an array');
      });

      it('should accept valid array of non-empty string IDs', async () => {
        const dto = plainToInstance(BatchDeleteAssetDto, { ids: ['ast-1', 'ast-2', 'uuid-1234'] });
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      });
    });
  });

  // =========================================================================
  // DIMENSION 2: Non-Existent IDs & Exact Count Accounting
  // =========================================================================
  describe('Dimension 2: Non-Existent IDs & Exact Count Accounting', () => {
    it('should return count 0 and empty deletedIds when none of the IDs exist in the database', async () => {
      mockPrisma.asset.findMany.mockResolvedValueOnce([]);

      const result = await service.batchDelete(['ghost-1', 'ghost-2']);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['ghost-1', 'ghost-2'] } },
        select: { id: true },
        take: 2,
        orderBy: [{ id: 'asc' }],
      });
      // Crucial optimization: deleteMany MUST NOT be invoked when no assets exist
      expect(mockPrisma.asset.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0, deletedIds: [] });
    });

    it('should accurately delete only existing IDs and report exact count when given a mixed list', async () => {
      // 5 IDs provided: 2 exist, 3 do not exist
      const requestedIds = ['ast-exist-1', 'ghost-1', 'ast-exist-2', 'ghost-2', 'ghost-3'];
      mockPrisma.asset.findMany.mockResolvedValueOnce([
        { id: 'ast-exist-1' },
        { id: 'ast-exist-2' },
      ]);
      mockPrisma.asset.deleteMany.mockResolvedValueOnce({ count: 2 });

      const result = await service.batchDelete(requestedIds);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { id: { in: requestedIds } },
        select: { id: true },
        take: 5,
        orderBy: [{ id: 'asc' }],
      });
      // Only existing IDs are passed to deleteMany
      expect(mockPrisma.asset.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['ast-exist-1', 'ast-exist-2'] } },
      });
      expect(result).toEqual({
        count: 2,
        deletedIds: ['ast-exist-1', 'ast-exist-2'],
      });
    });

    it('should preserve database integrity when findMany returns records but deleteMany reports 0', async () => {
      // Concurrency edge case: asset was deleted by another process between findMany and deleteMany
      mockPrisma.asset.findMany.mockResolvedValueOnce([{ id: 'ast-concurrent' }]);
      mockPrisma.asset.deleteMany.mockResolvedValueOnce({ count: 0 });

      const result = await service.batchDelete(['ast-concurrent']);

      expect(result).toEqual({
        count: 0,
        deletedIds: ['ast-concurrent'],
      });
    });
  });

  // =========================================================================
  // DIMENSION 3: Large Batches & Multi-Chunk Chunking (>100 IDs)
  // =========================================================================
  describe('Dimension 3: Large Batches & Multi-Chunk Chunking (>100 IDs)', () => {
    it('should process exactly 100 IDs in a single transaction chunk', async () => {
      const ids100 = Array.from({ length: 100 }, (_, i) => `ast-${i + 1}`);
      mockPrisma.asset.findMany.mockResolvedValueOnce(ids100.map((id) => ({ id })));
      mockPrisma.asset.deleteMany.mockResolvedValueOnce({ count: 100 });

      const result = await service.batchDelete(ids100);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { id: { in: ids100 } },
        select: { id: true },
        take: 100,
        orderBy: [{ id: 'asc' }],
      });
      expect(result.count).toBe(100);
      expect(result.deletedIds).toHaveLength(100);
    });

    it('should split 101 IDs into exactly 2 transaction chunks (100 and 1)', async () => {
      const ids101 = Array.from({ length: 101 }, (_, i) => `ast-${i + 1}`);
      const chunk1Ids = ids101.slice(0, 100);
      const chunk2Ids = ids101.slice(100, 101);

      mockPrisma.asset.findMany
        .mockResolvedValueOnce(chunk1Ids.map((id) => ({ id })))
        .mockResolvedValueOnce(chunk2Ids.map((id) => ({ id })));

      mockPrisma.asset.deleteMany
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 1 });

      const result = await service.batchDelete(ids101);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);

      // Verify Chunk 1
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(1, {
        where: { id: { in: chunk1Ids } },
        select: { id: true },
        take: 100,
        orderBy: [{ id: 'asc' }],
      });

      // Verify Chunk 2
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(2, {
        where: { id: { in: chunk2Ids } },
        select: { id: true },
        take: 1,
        orderBy: [{ id: 'asc' }],
      });

      expect(result.count).toBe(101);
      expect(result.deletedIds).toHaveLength(101);
    });

    it('should partition 150 IDs into 2 transaction chunks (100 and 50) complying with AGENTS.md 16.2 & 16.5', async () => {
      const ids150 = Array.from({ length: 150 }, (_, i) => `ast-${i + 1}`);
      const chunk1Ids = ids150.slice(0, 100);
      const chunk2Ids = ids150.slice(100, 150);

      mockPrisma.asset.findMany
        .mockResolvedValueOnce(chunk1Ids.map((id) => ({ id })))
        .mockResolvedValueOnce(chunk2Ids.map((id) => ({ id })));

      mockPrisma.asset.deleteMany
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 50 });

      const result = await service.batchDelete(ids150);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);

      // Check take bounds: each chunk bounded to chunk.length <= 100
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(1, {
        where: { id: { in: chunk1Ids } },
        select: { id: true },
        take: 100,
        orderBy: [{ id: 'asc' }],
      });
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(2, {
        where: { id: { in: chunk2Ids } },
        select: { id: true },
        take: 50,
        orderBy: [{ id: 'asc' }],
      });

      expect(result.count).toBe(150);
      expect(result.deletedIds).toHaveLength(150);
      expect(result.deletedIds[0]).toBe('ast-1');
      expect(result.deletedIds[149]).toBe('ast-150');
    });

    it('should partition 250 IDs across 3 chunks with mixed existing and missing records', async () => {
      const ids250 = Array.from({ length: 250 }, (_, i) => `ast-${i + 1}`);
      const chunk1 = ids250.slice(0, 100);
      const chunk2 = ids250.slice(100, 200);
      const chunk3 = ids250.slice(200, 250);

      // Chunk 1: 80 exist, 20 missing
      const chunk1Existing = chunk1.slice(0, 80).map((id) => ({ id }));
      // Chunk 2: 0 exist (all missing)
      const chunk2Existing: { id: string }[] = [];
      // Chunk 3: 40 exist, 10 missing
      const chunk3Existing = chunk3.slice(0, 40).map((id) => ({ id }));

      mockPrisma.asset.findMany
        .mockResolvedValueOnce(chunk1Existing)
        .mockResolvedValueOnce(chunk2Existing)
        .mockResolvedValueOnce(chunk3Existing);

      mockPrisma.asset.deleteMany
        .mockResolvedValueOnce({ count: 80 })
        // Chunk 2 deleteMany should NOT be called
        .mockResolvedValueOnce({ count: 40 });

      const result = await service.batchDelete(ids250);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
      expect(mockPrisma.asset.deleteMany).toHaveBeenCalledTimes(2);

      expect(result.count).toBe(120);
      expect(result.deletedIds).toHaveLength(120);
    });

    it('should propagate database transaction failure immediately without silently swallowing', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => `ast-${i + 1}`);

      mockPrisma.asset.findMany.mockRejectedValueOnce(new Error('PostgreSQL connection terminated'));

      await expect(service.batchDelete(ids)).rejects.toThrow('PostgreSQL connection terminated');
    });
  });

  // =========================================================================
  // DIMENSION 4: Route Precedence & Controller Architecture
  // =========================================================================
  describe('Dimension 4: Route Precedence & Controller Architecture', () => {
    it('should declare export and batch endpoints prior to parameterized :id routes to prevent route shadowing', () => {
      const propertyNames = Object.getOwnPropertyNames(AssetsController.prototype);

      const exportIndex = propertyNames.indexOf('exportXlsx');
      const exportAliasIndex = propertyNames.indexOf('exportXlsxAlias');
      const batchDeleteIndex = propertyNames.indexOf('batchDelete');
      const batchDeleteAliasIndex = propertyNames.indexOf('batchDeleteAlias');
      const findOneIndex = propertyNames.indexOf('findOne');
      const removeIndex = propertyNames.indexOf('remove');

      expect(exportIndex).toBeGreaterThan(-1);
      expect(exportAliasIndex).toBeGreaterThan(-1);
      expect(batchDeleteIndex).toBeGreaterThan(-1);
      expect(batchDeleteAliasIndex).toBeGreaterThan(-1);
      expect(findOneIndex).toBeGreaterThan(-1);
      expect(removeIndex).toBeGreaterThan(-1);

      // Verify declaration order on prototype: static routes MUST precede :id
      expect(exportIndex).toBeLessThan(findOneIndex);
      expect(exportAliasIndex).toBeLessThan(findOneIndex);
      expect(batchDeleteIndex).toBeLessThan(removeIndex);
      expect(batchDeleteAliasIndex).toBeLessThan(removeIndex);
    });

    it('should register exact HTTP methods and paths for batch deletion and aliases', () => {
      // POST batch-delete
      const batchPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.batchDelete);
      const batchMethod = Reflect.getMetadata(METHOD_METADATA, AssetsController.prototype.batchDelete);
      expect(batchPath).toBe('batch-delete');
      expect(batchMethod).toBe(RequestMethod.POST);

      // DELETE batch
      const aliasPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.batchDeleteAlias);
      const aliasMethod = Reflect.getMetadata(METHOD_METADATA, AssetsController.prototype.batchDeleteAlias);
      expect(aliasPath).toBe('batch');
      expect(aliasMethod).toBe(RequestMethod.DELETE);

      // DELETE :id
      const removePath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.remove);
      const removeMethod = Reflect.getMetadata(METHOD_METADATA, AssetsController.prototype.remove);
      expect(removePath).toBe(':id');
      expect(removeMethod).toBe(RequestMethod.DELETE);
    });

    it('should guarantee DELETE /assets/batch resolves to batchDeleteAlias rather than remove("batch")', async () => {
      // Simulate router resolution by testing handler invocation with BatchDeleteAssetDto
      const mockResult = { count: 3, deletedIds: ['a1', 'a2', 'a3'] };
      const batchSpy = vi.spyOn(service, 'batchDelete').mockResolvedValue(mockResult);
      const removeSpy = vi.spyOn(service, 'remove');

      // Invoking batchDeleteAlias endpoint
      const result = await controller.batchDeleteAlias({ ids: ['a1', 'a2', 'a3'] });

      expect(batchSpy).toHaveBeenCalledWith(['a1', 'a2', 'a3']);
      expect(removeSpy).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should guarantee POST /assets/batch-delete resolves to batchDelete rather than any parameterized route', async () => {
      const mockResult = { count: 1, deletedIds: ['a1'] };
      const batchSpy = vi.spyOn(service, 'batchDelete').mockResolvedValue(mockResult);

      const result = await controller.batchDelete({ ids: ['a1'] });

      expect(batchSpy).toHaveBeenCalledWith(['a1']);
      expect(result).toEqual(mockResult);
    });

    it('should enforce JwtAuthGuard, RolesGuard and Admin roles on both batch delete endpoints', () => {
      for (const handler of [AssetsController.prototype.batchDelete, AssetsController.prototype.batchDeleteAlias]) {
        const guards = Reflect.getMetadata('__guards__', handler);
        expect(guards).toBeDefined();
        expect(guards).toContain(JwtAuthGuard);
        expect(guards).toContain(RolesGuard);

        const roles = Reflect.getMetadata('roles', handler);
        expect(roles).toEqual(['Admin', 'Super Admin']);
      }
    });
  });
});
