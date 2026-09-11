import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InventoryService } from './inventory.service';
import { VendorsController } from './vendors.controller';

describe('VendorsController', () => {
  let controller: VendorsController;
  let mockInventoryService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockInventoryService = {
      findAllVendors: vi.fn(),
      findOneVendor: vi.fn(),
    };

    controller = new VendorsController(mockInventoryService as unknown as InventoryService);
  });

  it('should call findAllVendors', async () => {
    const mockVendors = [
      {
        id: 'ven-1',
        name: 'Monoprice Inc',
        contactName: null,
        contactEmail: 'sales@monoprice.com',
        contactPhone: null,
        website: 'https://monoprice.com',
        notes: 'Standard cables and accessories vendor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    mockInventoryService.findAllVendors.mockResolvedValue(mockVendors);

    const result = await controller.findAll();

    expect(mockInventoryService.findAllVendors).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockVendors);
  });

  it('should call findOneVendor with id', async () => {
    const mockVendor = {
      id: 'ven-1',
      name: 'Monoprice Inc',
      contactName: null,
      contactEmail: 'sales@monoprice.com',
      contactPhone: null,
      website: 'https://monoprice.com',
      notes: 'Standard cables and accessories vendor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockInventoryService.findOneVendor.mockResolvedValue(mockVendor);

    const result = await controller.findOne('ven-1');

    expect(mockInventoryService.findOneVendor).toHaveBeenCalledWith('ven-1');
    expect(result).toBe(mockVendor);
  });
});
