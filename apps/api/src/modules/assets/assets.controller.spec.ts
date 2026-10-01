import { PATH_METADATA } from '@nestjs/common/constants';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssetsController } from './assets.controller';
import type { AssetsService } from './assets.service';
import type { CreateAssetDto } from './dto/create-asset.dto';
import type { UpdateAssetDto } from './dto/update-asset.dto';

describe('AssetsController', () => {
  let controller: AssetsController;
  let mockAssetsService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockAssetsService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      getStats: vi.fn(),
      exportCsv: vi.fn(),
      exportXlsx: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      batchDelete: vi.fn(),
      getCategories: vi.fn(),
    };

    controller = new AssetsController(mockAssetsService as unknown as AssetsService);
  });

  it('should call findAll with query filters', async () => {
    const mockAssets = [{ id: 'a1', tag: 'AST-1001', name: 'MacBook Pro' }];
    mockAssetsService.findAll.mockResolvedValue(mockAssets);

    const result = await controller.findAll({ search: 'MacBook', status: 'ACTIVE' });

    expect(mockAssetsService.findAll).toHaveBeenCalledWith({ search: 'MacBook', status: 'ACTIVE' });
    expect(result).toBe(mockAssets);
  });

  it('should call findOne by id', async () => {
    const mockAsset = { id: 'a1', tag: 'AST-1001' };
    mockAssetsService.findOne.mockResolvedValue(mockAsset);

    const result = await controller.findOne('a1');

    expect(mockAssetsService.findOne).toHaveBeenCalledWith('a1');
    expect(result).toBe(mockAsset);
  });

  it('should call create with CreateAssetDto', async () => {
    const dto: CreateAssetDto = {
      tag: 'AST-1002',
      name: 'Dell XPS 15',
      serialNumber: 'SN99281',
      category: 'Laptop',
      status: 'Active',
    };
    const created = { id: 'a2', ...dto };
    mockAssetsService.create.mockResolvedValue(created);

    const result = await controller.create(dto);

    expect(mockAssetsService.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should call update with id and UpdateAssetDto', async () => {
    const dto: UpdateAssetDto = {
      status: 'In Repair',
    };
    const updated = { id: 'a1', tag: 'AST-1001', status: 'In Repair' };
    mockAssetsService.update.mockResolvedValue(updated);

    const result = await controller.update('a1', dto);

    expect(mockAssetsService.update).toHaveBeenCalledWith('a1', dto);
    expect(result).toBe(updated);
  });

  it('should call remove by id', async () => {
    mockAssetsService.remove.mockResolvedValue({ success: true, id: 'a1' });

    const result = await controller.remove('a1');

    expect(mockAssetsService.remove).toHaveBeenCalledWith('a1');
    expect(result).toEqual({ success: true, id: 'a1' });
  });

  it('should return asset stats', async () => {
    const stats = { total: 10, active: 8, inRepair: 1, inStorage: 1, retired: 0 };
    mockAssetsService.getStats.mockResolvedValue(stats);

    const result = await controller.getStats();

    expect(mockAssetsService.getStats).toHaveBeenCalled();
    expect(result).toBe(stats);
  });

  it('should call getCategories and return categories list', async () => {
    const mockCats = [{ id: 'cat-1', name: 'Laptops', code: 'LAPTOPS', parentId: null }];
    mockAssetsService.getCategories.mockResolvedValue(mockCats);

    const result = await controller.getCategories();

    expect(mockAssetsService.getCategories).toHaveBeenCalled();
    expect(result).toBe(mockCats);
  });

  describe('exportXlsx', () => {
    it('should forward export query and express response to service', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        end: vi.fn(),
      } as unknown as Response;

      mockAssetsService.exportXlsx.mockResolvedValue(undefined);

      await controller.exportXlsx({ status: 'ACTIVE' }, mockRes);

      expect(mockAssetsService.exportXlsx).toHaveBeenCalledWith(
        { status: 'ACTIVE' },
        mockRes,
      );
    });

    it('should support export/xlsx alias endpoint', async () => {
      const mockRes = {} as unknown as Response;
      mockAssetsService.exportXlsx.mockResolvedValue(undefined);

      await controller.exportXlsxAlias({}, mockRes);

      expect(mockAssetsService.exportXlsx).toHaveBeenCalledWith({}, mockRes);
    });
  });

  describe('batchDelete', () => {
    it('should call service batchDelete with array of IDs via POST batch-delete', async () => {
      const mockResult = { count: 2, deletedIds: ['a1', 'a2'] };
      mockAssetsService.batchDelete.mockResolvedValue(mockResult);

      const result = await controller.batchDelete({ ids: ['a1', 'a2'] });

      expect(mockAssetsService.batchDelete).toHaveBeenCalledWith(['a1', 'a2']);
      expect(result).toEqual(mockResult);
    });

    it('should call service batchDelete via DELETE batch alias', async () => {
      const mockResult = { count: 1, deletedIds: ['a1'] };
      mockAssetsService.batchDelete.mockResolvedValue(mockResult);

      const result = await controller.batchDeleteAlias({ ids: ['a1'] });

      expect(mockAssetsService.batchDelete).toHaveBeenCalledWith(['a1']);
      expect(result).toEqual(mockResult);
    });
  });

  describe('Route Precedence & Security Metadata', () => {
    it('should declare export and batch endpoints prior to parameterized :id routes to prevent shadowing', () => {
      const propertyNames = Object.getOwnPropertyNames(AssetsController.prototype);

      const exportIndex = propertyNames.indexOf('exportXlsx');
      const batchDeleteIndex = propertyNames.indexOf('batchDelete');
      const batchDeleteAliasIndex = propertyNames.indexOf('batchDeleteAlias');
      const findOneIndex = propertyNames.indexOf('findOne');
      const removeIndex = propertyNames.indexOf('remove');

      expect(exportIndex).toBeGreaterThan(-1);
      expect(batchDeleteIndex).toBeGreaterThan(-1);
      expect(batchDeleteAliasIndex).toBeGreaterThan(-1);
      expect(findOneIndex).toBeGreaterThan(-1);
      expect(removeIndex).toBeGreaterThan(-1);

      // Verify declaration order on prototype: static routes must precede :id
      expect(exportIndex).toBeLessThan(findOneIndex);
      expect(batchDeleteIndex).toBeLessThan(removeIndex);
      expect(batchDeleteAliasIndex).toBeLessThan(removeIndex);
    });

    it('should have correct route paths registered in NestJS metadata', () => {
      const batchPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.batchDelete);
      const aliasPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.batchDeleteAlias);
      const exportPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.exportXlsx);
      const exportAliasPath = Reflect.getMetadata(PATH_METADATA, AssetsController.prototype.exportXlsxAlias);

      expect(batchPath).toBe('batch-delete');
      expect(aliasPath).toBe('batch');
      expect(exportPath).toBe('export.xlsx');
      expect(exportAliasPath).toBe('export/xlsx');
    });

    it('should enforce JwtAuthGuard, RolesGuard and Admin roles on batch delete endpoints', () => {
      const guards = Reflect.getMetadata('__guards__', AssetsController.prototype.batchDelete);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);

      const roles = Reflect.getMetadata('roles', AssetsController.prototype.batchDelete);
      expect(roles).toEqual(['Admin', 'Super Admin']);

      const aliasGuards = Reflect.getMetadata('__guards__', AssetsController.prototype.batchDeleteAlias);
      expect(aliasGuards).toContain(JwtAuthGuard);
      expect(aliasGuards).toContain(RolesGuard);

      const aliasRoles = Reflect.getMetadata('roles', AssetsController.prototype.batchDeleteAlias);
      expect(aliasRoles).toEqual(['Admin', 'Super Admin']);
    });
  });
});
