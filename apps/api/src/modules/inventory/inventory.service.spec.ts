import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: {
    inventoryItem: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      inventoryItem: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
    };

    service = new InventoryService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('create', () => {
    it('should create an inventory item with auto SKU if not supplied', async () => {
      mockPrisma.inventoryItem.create.mockResolvedValue({
        id: 'itm-1',
        sku: 'ITM-9999',
        name: 'USB-C Multiport Hub',
        category: 'Peripherals',
        quantity: 20,
        minThreshold: 5,
        unitCost: 45,
        location: 'Storage Room B',
      });

      const item = await service.create({
        name: 'USB-C Multiport Hub',
        category: 'Peripherals',
        quantity: 20,
        minThreshold: 5,
        unitCost: 45,
        location: 'Storage Room B',
      });

      expect(item.id).toBe('itm-1');
      expect(item.name).toBe('USB-C Multiport Hub');
    });
  });

  describe('restock', () => {
    it('should increment quantity and trigger threshold check if still low stock', async () => {
      const mockNotificationsService = {
        notifyAdmins: vi.fn().mockResolvedValue([]),
      };
      const serviceWithNotif = new InventoryService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        mockNotificationsService as unknown as import('../notifications/notifications.service').NotificationsService,
      );

      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'itm-1',
        name: 'USB-C Multiport Hub',
        sku: 'SKU-001',
        quantity: 1,
        minThreshold: 5,
      });

      mockPrisma.inventoryItem.update.mockResolvedValue({
        id: 'itm-1',
        name: 'USB-C Multiport Hub',
        sku: 'SKU-001',
        quantity: 3,
        minThreshold: 5,
      });

      const updated = await serviceWithNotif.restock('itm-1', 2);

      expect(updated.quantity).toBe(3);
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'itm-1' },
        data: { quantity: { increment: 2 } },
      });
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Low Stock Alert',
          type: 'WARNING',
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should calculate valuation, low stock and out of stock counts', async () => {
      mockPrisma.inventoryItem.count
        .mockResolvedValueOnce(3) // totalSkus
        .mockResolvedValueOnce(1) // lowStockCount
        .mockResolvedValueOnce(1); // outOfStockCount
      mockPrisma.inventoryItem.aggregate.mockResolvedValue({
        _sum: { quantity: 12 },
      });
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        { quantity: 10, unitCost: 20 },
        { quantity: 2, unitCost: 50 },
        { quantity: 0, unitCost: 100 },
      ]);

      const stats = await service.getStats();

      expect(stats.totalSkus).toBe(3);
      expect(stats.totalUnits).toBe(12);
      expect(stats.totalValuation).toBe(300);
      expect(stats.lowStockCount).toBe(1);
      expect(stats.outOfStockCount).toBe(1);
    });
  });
});
