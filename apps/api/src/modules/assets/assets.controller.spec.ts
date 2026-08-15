import { beforeEach, describe, expect, it, vi } from 'vitest';
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
      getHistory: vi.fn(),
      exportCsv: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
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
      purchasePrice: 2000,
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
});
