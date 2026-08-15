import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import type { RestockInventoryDto } from './dto/restock-inventory.dto';
import type { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryController } from './inventory.controller';
import type { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let mockInventoryService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockInventoryService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      getStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      restock: vi.fn(),
      remove: vi.fn(),
    };

    controller = new InventoryController(mockInventoryService as unknown as InventoryService);
  });

  it('should call findAll with query params', async () => {
    const mockItems = [{ id: 'inv-1', sku: 'CAB-CAT6A', name: 'Cat6a Cable' }];
    mockInventoryService.findAll.mockResolvedValue(mockItems);

    const result = await controller.findAll({ search: 'Cat6a' });

    expect(mockInventoryService.findAll).toHaveBeenCalledWith({ search: 'Cat6a' });
    expect(result).toBe(mockItems);
  });

  it('should call create with CreateInventoryItemDto', async () => {
    const dto: CreateInventoryItemDto = {
      sku: 'SSD-NVME-2TB',
      name: 'Samsung 990 Pro 2TB SSD',
      category: 'Storage & RAM',
      quantity: 8,
      minThreshold: 4,
      unitCost: 175,
      location: 'IT Lab',
    };
    const created = { id: 'inv-2', ...dto };
    mockInventoryService.create.mockResolvedValue(created);

    const result = await controller.create(dto);

    expect(mockInventoryService.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should call update with id and UpdateInventoryItemDto', async () => {
    const dto: UpdateInventoryItemDto = {
      quantity: 12,
    };
    const updated = { id: 'inv-1', quantity: 12 };
    mockInventoryService.update.mockResolvedValue(updated);

    const result = await controller.update('inv-1', dto);

    expect(mockInventoryService.update).toHaveBeenCalledWith('inv-1', dto);
    expect(result).toBe(updated);
  });

  it('should call restock with id and quantity from RestockInventoryDto', async () => {
    const dto: RestockInventoryDto = {
      quantity: 20,
      reason: 'Quarterly warehouse delivery',
    };
    const restocked = { id: 'inv-1', quantity: 32 };
    mockInventoryService.restock.mockResolvedValue(restocked);

    const result = await controller.restock('inv-1', dto);

    expect(mockInventoryService.restock).toHaveBeenCalledWith('inv-1', 20);
    expect(result).toBe(restocked);
  });

  it('should call remove with id', async () => {
    mockInventoryService.remove.mockResolvedValue({ success: true, id: 'inv-1' });

    const result = await controller.remove('inv-1');

    expect(mockInventoryService.remove).toHaveBeenCalledWith('inv-1');
    expect(result).toEqual({ success: true, id: 'inv-1' });
  });

  it('should return inventory stats', async () => {
    const stats = {
      totalSkus: 11,
      totalUnitsInStock: 192,
      depletedSkus: 1,
      lowStockAlertCount: 2,
    };
    mockInventoryService.getStats.mockResolvedValue(stats);

    const result = await controller.getStats();

    expect(mockInventoryService.getStats).toHaveBeenCalled();
    expect(result).toBe(stats);
  });
});
