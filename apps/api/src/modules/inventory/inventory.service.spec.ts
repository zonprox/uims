import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: {
    $queryRaw: ReturnType<typeof vi.fn>;
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
      $queryRaw: vi.fn(),
      inventoryItem: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      inventoryCategory: {
        findMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Peripherals' }),
        create: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Peripherals' }),
      },
      vendor: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
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
      });

      const item = await service.create({
        name: 'USB-C Multiport Hub',
        category: 'Peripherals',
        quantity: 20,
        minThreshold: 5,
        unitCost: 45,
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
        include: { category: true },
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
      mockPrisma.$queryRaw.mockResolvedValue([{ totalValuation: 300 }]);

      const stats = await service.getStats();

      expect(stats.totalSkus).toBe(3);
      expect(stats.totalUnits).toBe(12);
      expect(stats.totalValuation).toBe(300);
      expect(stats.lowStockCount).toBe(1);
      expect(stats.outOfStockCount).toBe(1);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('getCategories', () => {
    it('should query inventoryCategory and return bounded list of categories', async () => {
      const mockCats = [
        { id: 'cat-1', name: 'Cables & Adapters', description: 'Patch cables' },
        { id: 'cat-2', name: 'Peripherals', description: 'Mice and keyboards' },
      ];
      mockPrisma.inventoryCategory.findMany.mockResolvedValue(mockCats);

      const result = await service.getCategories();

      expect(mockPrisma.inventoryCategory.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 100,
      });
      expect(result).toEqual(mockCats);
    });
  });

  describe('findAllVendors', () => {
    it('should query vendors and map response with contactName null and formatted dates', async () => {
      const mockVendorList = [
        {
          id: 'ven-1',
          name: 'Monoprice Inc',
          contactEmail: 'sales@monoprice.com',
          contactPhone: null,
          website: 'https://monoprice.com',
          notes: 'Standard cables and accessories vendor',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ];
      mockPrisma.vendor.findMany.mockResolvedValue(mockVendorList);

      const result = await service.findAllVendors();

      expect(mockPrisma.vendor.findMany).toHaveBeenCalledWith({
        take: 100,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      });
      expect(result).toEqual([
        {
          id: 'ven-1',
          name: 'Monoprice Inc',
          contactName: null,
          contactEmail: 'sales@monoprice.com',
          contactPhone: null,
          website: 'https://monoprice.com',
          notes: 'Standard cables and accessories vendor',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('findOneVendor', () => {
    it('should return vendor if found', async () => {
      const mockVendor = {
        id: 'ven-1',
        name: 'Monoprice Inc',
        contactEmail: 'sales@monoprice.com',
        contactPhone: null,
        website: 'https://monoprice.com',
        notes: 'Standard cables and accessories vendor',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      mockPrisma.vendor.findUnique.mockResolvedValue(mockVendor);

      const result = await service.findOneVendor('ven-1');

      expect(mockPrisma.vendor.findUnique).toHaveBeenCalledWith({
        where: { id: 'ven-1' },
      });
      expect(result).toEqual({
        id: 'ven-1',
        name: 'Monoprice Inc',
        contactName: null,
        contactEmail: 'sales@monoprice.com',
        contactPhone: null,
        website: 'https://monoprice.com',
        notes: 'Standard cables and accessories vendor',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValue(null);

      await expect(service.findOneVendor('ven-999')).rejects.toThrow(
        'Vendor with ID "ven-999" not found',
      );
    });
  });

  describe('update', () => {
    it('should update inventory item and return formatted record', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'itm-1',
        name: 'USB-C Cable',
        quantity: 10,
        minThreshold: 5,
      });
      mockPrisma.inventoryItem.update.mockResolvedValue({
        id: 'itm-1',
        name: 'USB-C Cable Pro',
        quantity: 15,
        minThreshold: 5,
      });

      const result = await service.update('itm-1', {
        name: 'USB-C Cable Pro',
        quantity: 15,
      });

      expect(result.id).toBe('itm-1');
      expect(result.name).toBe('USB-C Cable Pro');
      expect(result.quantity).toBe(15);
    });
  });

  describe('remove', () => {
    it('should delete inventory item from database', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'itm-del-1',
        name: 'Item to delete',
      });
      mockPrisma.inventoryItem.delete.mockResolvedValue({
        id: 'itm-del-1',
        name: 'Item to delete',
      });

      const result = await service.remove('itm-del-1');

      expect(mockPrisma.inventoryItem.delete).toHaveBeenCalledWith({
        where: { id: 'itm-del-1' },
      });
      expect(result).toEqual({ id: 'itm-del-1', name: 'Item to delete' });
    });
  });

  describe('Audit Logging Integration', () => {
    let mockAuditService: { logEvent: ReturnType<typeof vi.fn> };
    let serviceWithAudit: InventoryService;

    beforeEach(() => {
      mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud-inv-1' }),
      };
      serviceWithAudit = new InventoryService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        undefined,
        mockAuditService as unknown as import('../audit/audit.service').AuditService,
      );
    });

    it('should log INVENTORY_ITEM_CREATED on create', async () => {
      mockPrisma.inventoryItem.create.mockResolvedValue({
        id: 'itm-aud-1',
        sku: 'SKU-AUD-100',
        name: 'Cat6 Cable',
        quantity: 100,
        minThreshold: 20,
      });

      await serviceWithAudit.create({
        name: 'Cat6 Cable',
        quantity: 100,
        minThreshold: 20,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_CREATED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'itm-aud-1',
          newValue: expect.objectContaining({ id: 'itm-aud-1', name: 'Cat6 Cable' }),
        }),
      );
    });

    it('should log INVENTORY_ITEM_UPDATED with field diff on update', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'itm-aud-1',
        name: 'Cat6 Cable',
        quantity: 100,
        minThreshold: 20,
        unitCost: 5,
      });
      mockPrisma.inventoryItem.update.mockResolvedValue({
        id: 'itm-aud-1',
        name: 'Cat6 Cable 3m',
        quantity: 100,
        minThreshold: 30,
        unitCost: 6,
      });

      await serviceWithAudit.update('itm-aud-1', {
        name: 'Cat6 Cable 3m',
        minThreshold: 30,
        unitCost: 6,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_UPDATED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'itm-aud-1',
          oldValue: expect.objectContaining({ name: 'Cat6 Cable', minThreshold: 20, unitCost: 5 }),
          newValue: expect.objectContaining({
            name: 'Cat6 Cable 3m',
            minThreshold: 30,
            unitCost: 6,
          }),
        }),
      );
    });

    it('should log INVENTORY_RESTOCKED with quantity diff on restock', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'itm-aud-1',
        sku: 'SKU-100',
        name: 'Cat6 Cable',
        quantity: 50,
        minThreshold: 20,
      });
      mockPrisma.inventoryItem.update.mockResolvedValue({
        id: 'itm-aud-1',
        sku: 'SKU-100',
        name: 'Cat6 Cable',
        quantity: 150,
        minThreshold: 20,
      });

      await serviceWithAudit.restock('itm-aud-1', 100);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_RESTOCKED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'itm-aud-1',
          oldValue: { quantity: 50 },
          newValue: { quantity: 150 },
        }),
      );
    });

    it('should log INVENTORY_ITEM_DELETED on remove', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'itm-aud-1',
        sku: 'SKU-DEL',
        name: 'Old Cable',
      });
      mockPrisma.inventoryItem.delete.mockResolvedValue({
        id: 'itm-aud-1',
        sku: 'SKU-DEL',
        name: 'Old Cable',
      });

      await serviceWithAudit.remove('itm-aud-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_DELETED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'itm-aud-1',
        }),
      );
    });
  });
});
