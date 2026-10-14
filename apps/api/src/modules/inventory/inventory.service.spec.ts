import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryService } from './inventory.service';
import { AssetStatus } from '@uims/shared-types';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: {
    $transaction: ReturnType<typeof vi.fn>;
    $queryRaw: ReturnType<typeof vi.fn>;
    deviceModel: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    asset: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    assetCategory: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    department: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    vendor: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockPrisma)),
      $queryRaw: vi.fn(),
      deviceModel: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      asset: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      assetCategory: {
        findMany: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Peripherals' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Peripherals' }),
      },
      department: {
        findFirst: vi.fn().mockResolvedValue({ id: 'dept-1', name: 'IT' }),
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
    it('should create a device model and initial physical units inside transaction', async () => {
      const mockCreatedModel = {
        id: 'mdl-1',
        modelCode: 'USB-C-HUB',
        name: 'USB-C Multiport Hub',
        categoryId: 'cat-1',
        manufacturer: 'Generic',
        unitCost: 45,
        minThreshold: 5,
        binNumber: 'BIN-01',
        specifications: {},
        category: { id: 'cat-1', name: 'Peripherals' },
        vendor: null,
      };

      mockPrisma.deviceModel.findUnique.mockResolvedValueOnce(null); // uniqueness check
      mockPrisma.deviceModel.create.mockResolvedValue(mockCreatedModel);
      mockPrisma.asset.create.mockResolvedValue({ id: 'ast-1' });

      // for findOne in create
      mockPrisma.deviceModel.findUnique.mockResolvedValueOnce({
        ...mockCreatedModel,
        deletedAt: null,
      });
      mockPrisma.asset.groupBy.mockResolvedValue([
        { status: AssetStatus.AVAILABLE, _count: { _all: 2 } },
      ]);

      const item = await service.create({
        name: 'USB-C Multiport Hub',
        sku: 'USB-C-HUB',
        categoryId: 'cat-1',
        quantity: 2,
        minThreshold: 5,
        unitCost: 45,
        binNumber: 'BIN-01',
      });

      expect(item.id).toBe('mdl-1');
      expect(item.name).toBe('USB-C Multiport Hub');
      expect(item.sku).toBe('USB-C-HUB');
      expect(item.availableUnits).toBe(2);
      expect(mockPrisma.asset.create).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException if name or categoryId is missing', async () => {
      await expect(
        service.create({
          name: '',
          categoryId: 'cat-1',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create({
          name: 'USB Hub',
          categoryId: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if model code already exists', async () => {
      mockPrisma.deviceModel.findUnique.mockResolvedValue({ id: 'existing-mdl' });

      await expect(
        service.create({
          name: 'USB Hub',
          sku: 'EXISTING-CODE',
          categoryId: 'cat-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated device models with live aggregated stock metrics', async () => {
      const mockModels = [
        {
          id: 'mdl-1',
          name: 'Dell Monitor 27"',
          modelCode: 'DELL-P2720D',
          categoryId: 'cat-1',
          manufacturer: 'Dell',
          unitCost: 250,
          minThreshold: 5,
          binNumber: 'A-12',
          specifications: {},
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          category: { id: 'cat-1', name: 'Monitors' },
          vendor: null,
        },
      ];

      mockPrisma.deviceModel.count.mockResolvedValue(1);
      mockPrisma.deviceModel.findMany.mockResolvedValue(mockModels);
      mockPrisma.asset.groupBy.mockResolvedValue([
        {
          deviceModelId: 'mdl-1',
          status: AssetStatus.AVAILABLE,
          _count: { _all: 8 },
        },
        {
          deviceModelId: 'mdl-1',
          status: AssetStatus.IN_USE,
          _count: { _all: 12 },
        },
      ]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].availableUnits).toBe(8);
      expect(result.items[0].assignedUnits).toBe(12);
      expect(result.items[0].totalUnits).toBe(20);
      expect(result.items[0].stockStatus).toBe('in_stock');
    });
  });

  describe('findOne', () => {
    it('should return single device model with live stock metrics', async () => {
      mockPrisma.deviceModel.findUnique.mockResolvedValue({
        id: 'mdl-1',
        name: 'Dell Monitor 27"',
        modelCode: 'DELL-P2720D',
        categoryId: 'cat-1',
        manufacturer: 'Dell',
        unitCost: 250,
        minThreshold: 5,
        binNumber: 'A-12',
        specifications: {},
        deletedAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        category: { id: 'cat-1', name: 'Monitors' },
        vendor: null,
      });

      mockPrisma.asset.groupBy.mockResolvedValue([
        { status: AssetStatus.AVAILABLE, _count: { _all: 3 } },
        { status: AssetStatus.IN_USE, _count: { _all: 2 } },
      ]);

      const result = await service.findOne('mdl-1');

      expect(result.id).toBe('mdl-1');
      expect(result.availableUnits).toBe(3);
      expect(result.stockStatus).toBe('low_stock');
    });

    it('should throw NotFoundException if device model is missing or soft-deleted', async () => {
      mockPrisma.deviceModel.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restock', () => {
    it('should batch create AVAILABLE units and trigger threshold check', async () => {
      const mockNotificationsService = {
        notifyAdmins: vi.fn().mockResolvedValue([]),
      };
      const serviceWithNotif = new InventoryService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        mockNotificationsService as unknown as import('../notifications/notifications.service').NotificationsService,
      );

      mockPrisma.deviceModel.findUnique.mockResolvedValue({
        id: 'mdl-1',
        name: 'USB-C Cable',
        modelCode: 'CAB-USBC',
        minThreshold: 5,
        deletedAt: null,
        category: { id: 'cat-1', name: 'Peripherals' },
      });
      mockPrisma.asset.count.mockResolvedValue(2); // previous total units
      mockPrisma.asset.create.mockResolvedValue({ id: 'ast-new' });

      // for findOne (4 available < minThreshold 5 triggers low stock warning)
      mockPrisma.asset.groupBy.mockResolvedValue([
        { status: AssetStatus.AVAILABLE, _count: { _all: 4 } },
      ]);

      const result = await serviceWithNotif.restock('mdl-1', 3);

      expect(result.id).toBe('mdl-1');
      expect(mockPrisma.asset.create).toHaveBeenCalledTimes(3);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should calculate live valuation, stock status from direct PostgreSQL queries', async () => {
      mockPrisma.deviceModel.count.mockResolvedValue(5);
      mockPrisma.asset.groupBy.mockResolvedValue([
        { status: AssetStatus.AVAILABLE, _count: { _all: 20 } },
        { status: AssetStatus.IN_USE, _count: { _all: 30 } },
        { status: AssetStatus.MAINTENANCE, _count: { _all: 5 } },
      ]);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ totalValuation: 12500 }])
        .mockResolvedValueOnce([{ inStockCount: 2, lowStockCount: 2, outOfStockCount: 1 }]);

      const stats = await service.getStats();

      expect(stats.totalModels).toBe(5);
      expect(stats.totalUnits).toBe(55);
      expect(stats.availableUnits).toBe(20);
      expect(stats.assignedUnits).toBe(30);
      expect(stats.maintenanceUnits).toBe(5);
      expect(stats.totalValuation).toBe(12500);
      expect(stats.inStockCount).toBe(2);
      expect(stats.lowStockCount).toBe(2);
      expect(stats.outOfStockCount).toBe(1);
    });
  });

  describe('getCategories', () => {
    it('should query assetCategory and return bounded list of categories', async () => {
      const mockCats = [
        { id: 'cat-1', name: 'Cables & Adapters', description: 'Patch cables' },
        { id: 'cat-2', name: 'Peripherals', description: 'Mice and keyboards' },
      ];
      mockPrisma.assetCategory.findMany.mockResolvedValue(mockCats);

      const result = await service.getCategories();

      expect(mockPrisma.assetCategory.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          description: true,
          parentId: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 100,
      });
      expect(result).toEqual(mockCats);
    });
  });

  describe('findAllVendors & findOneVendor', () => {
    it('should query vendors with deterministic ordering', async () => {
      const mockVendorList = [
        {
          id: 'ven-1',
          name: 'Monoprice Inc',
          contactEmail: 'sales@monoprice.com',
          contactPhone: null,
          website: 'https://monoprice.com',
          notes: 'Standard cables vendor',
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
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Monoprice Inc');
    });

    it('should return vendor by ID or throw NotFoundException', async () => {
      mockPrisma.vendor.findUnique.mockResolvedValueOnce({
        id: 'ven-1',
        name: 'Monoprice Inc',
        contactEmail: 'sales@monoprice.com',
        contactPhone: null,
        website: 'https://monoprice.com',
        notes: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const vendor = await service.findOneVendor('ven-1');
      expect(vendor.id).toBe('ven-1');

      mockPrisma.vendor.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOneVendor('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete device model if no units exist', async () => {
      mockPrisma.deviceModel.findUnique.mockResolvedValue({
        id: 'mdl-del-1',
        name: 'Item to delete',
        deletedAt: null,
      });
      mockPrisma.asset.count.mockResolvedValue(0);
      mockPrisma.deviceModel.delete.mockResolvedValue({ id: 'mdl-del-1', name: 'Item to delete' });

      const result = await service.remove('mdl-del-1');

      expect(result.id).toBe('mdl-del-1');
      expect(result.name).toBe('Item to delete');
    });

    it('should throw ConflictException if child physical units exist', async () => {
      mockPrisma.deviceModel.findUnique.mockResolvedValue({
        id: 'mdl-del-2',
        name: 'Item with units',
        deletedAt: null,
      });
      mockPrisma.asset.count.mockResolvedValue(5);

      await expect(service.remove('mdl-del-2')).rejects.toThrow(ConflictException);
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
      const mockCreated = {
        id: 'mdl-aud-1',
        modelCode: 'AUD-100',
        name: 'Cat6 Cable',
        categoryId: 'cat-1',
        unitCost: 5,
        minThreshold: 20,
        specifications: {},
      };
      mockPrisma.deviceModel.findUnique.mockResolvedValueOnce(null);
      mockPrisma.deviceModel.create.mockResolvedValue(mockCreated);
      mockPrisma.deviceModel.findUnique.mockResolvedValueOnce({ ...mockCreated, deletedAt: null });
      mockPrisma.asset.groupBy.mockResolvedValue([]);

      await serviceWithAudit.create({
        name: 'Cat6 Cable',
        sku: 'AUD-100',
        categoryId: 'cat-1',
        quantity: 0,
        minThreshold: 20,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_CREATED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'mdl-aud-1',
        }),
      );
    });

    it('should log INVENTORY_ITEM_UPDATED on update', async () => {
      mockPrisma.deviceModel.findUnique.mockResolvedValue({
        id: 'mdl-aud-1',
        name: 'Cat6 Cable',
        modelCode: 'AUD-100',
        unitCost: 5,
        minThreshold: 20,
        deletedAt: null,
        category: { id: 'cat-1', name: 'Cables' },
      });
      mockPrisma.deviceModel.update.mockResolvedValue({
        id: 'mdl-aud-1',
        name: 'Cat6 Cable 3m',
        unitCost: 6,
        minThreshold: 30,
      });
      mockPrisma.asset.groupBy.mockResolvedValue([]);

      await serviceWithAudit.update('mdl-aud-1', {
        name: 'Cat6 Cable 3m',
        minThreshold: 30,
        unitCost: 6,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_UPDATED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'mdl-aud-1',
        }),
      );
    });

    it('should log INVENTORY_RESTOCKED on restock', async () => {
      mockPrisma.deviceModel.findUnique.mockResolvedValue({
        id: 'mdl-aud-1',
        name: 'Cat6 Cable',
        modelCode: 'AUD-100',
        minThreshold: 20,
        deletedAt: null,
        category: { id: 'cat-1', name: 'Cables' },
      });
      mockPrisma.asset.count.mockResolvedValue(50);
      mockPrisma.asset.create.mockResolvedValue({ id: 'ast-restock' });
      mockPrisma.asset.groupBy.mockResolvedValue([
        { status: AssetStatus.AVAILABLE, _count: { _all: 150 } },
      ]);

      await serviceWithAudit.restock('mdl-aud-1', 100);

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_RESTOCKED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'mdl-aud-1',
        }),
      );
    });

    it('should log INVENTORY_ITEM_DELETED on remove', async () => {
      mockPrisma.deviceModel.findUnique.mockResolvedValue({
        id: 'mdl-aud-1',
        modelCode: 'AUD-DEL',
        name: 'Old Cable',
        deletedAt: null,
      });
      mockPrisma.asset.count.mockResolvedValue(0);
      mockPrisma.deviceModel.delete.mockResolvedValue({ id: 'mdl-aud-1' });

      await serviceWithAudit.remove('mdl-aud-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_DELETED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'mdl-aud-1',
        }),
      );
    });
  });
});
