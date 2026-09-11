import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AssetsService } from './assets.service';
import { AssetStatus } from '@uims/shared-types';

describe('AssetsService', () => {
  let service: AssetsService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
      asset: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      assetCategory: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      location: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      directoryUser: {
        findUnique: vi.fn(),
      },
      assetHistory: {
        create: vi.fn(),
      },
    };

    service = new AssetsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('create', () => {
    it('should create an asset with atomic category and location lookup within transaction', async () => {
      mockPrisma.assetCategory.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', name: 'HQ Storage' });

      mockPrisma.asset.create.mockResolvedValue({
        id: 'ast-1',
        assetTag: 'AST-1001',
        name: 'MacBook Pro 16',
        manufacturer: 'Apple',
        model: 'M3 Max',
        serialNumber: 'C02XYZ123',
        status: AssetStatus.IN_USE,
        purchaseDate: new Date('2026-01-15'),
        purchaseCost: 3499,
        warrantyExpiry: new Date('2029-01-15'),
        categoryId: 'cat-1',
        locationId: 'loc-1',
        category: { name: 'Laptops' },
        location: { name: 'HQ Storage' },
        assignedTo: { firstName: 'Alex', lastName: 'Johnson', email: 'alex@company.com' },
        specs: { cpu: 'M3 Max', ram: '64GB' },
        notes: 'Lead engineer laptop',
      });

      const result = await service.create({
        name: 'MacBook Pro 16',
        category: 'Laptops',
        location: 'HQ Storage',
        status: 'Active',
        purchasePrice: 3499,
        serialNumber: 'C02XYZ123',
        manufacturer: 'Apple',
        model: 'M3 Max',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe('ast-1');
      expect(result.status).toBe('Active');
      expect(result.assignedTo).toBe('Alex Johnson');
      expect(result.purchasePrice).toBe(3499);
      expect(result.categoryId).toBe('cat-1');
      expect(result.locationId).toBe('loc-1');
    });

    it('should automatically set status to IN_USE when assignedToId is provided', async () => {
      mockPrisma.assetCategory.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.location.findUnique.mockResolvedValue({ id: 'loc-1', name: 'HQ Storage' });
      mockPrisma.directoryUser.findUnique.mockResolvedValue({ id: 'dir-1' });

      mockPrisma.asset.create.mockResolvedValue({
        id: 'ast-2',
        assetTag: 'AST-1002',
        name: 'ThinkPad T14',
        status: AssetStatus.IN_USE,
        assignedToId: 'dir-1',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        category: { id: 'cat-1', name: 'Laptops' },
        location: { id: 'loc-1', name: 'HQ Storage' },
        assignedTo: { firstName: 'Alex', lastName: 'Johnson', email: 'alex@company.com' },
      });

      const asset = await service.create({
        name: 'ThinkPad T14',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        assignedToId: 'dir-1',
      });

      expect(asset.status).toBe('Active');
      expect(mockPrisma.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: AssetStatus.IN_USE, assignedToId: 'dir-1' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should transition status to AVAILABLE when asset is unassigned', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.IN_USE,
        assignedToId: 'dir-1',
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
        category: { name: 'Laptops' },
        location: { name: 'Storage' },
      });

      const updated = await service.update('ast-1', { assignedToId: null });
      expect(updated.status).toBe('In Storage');
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssetStatus.AVAILABLE,
            assignedTo: { disconnect: true },
          }),
        }),
      );
    });

    it('should transition status to IN_USE when available asset is assigned to a user', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.IN_USE,
        assignedToId: 'dir-1',
        category: { name: 'Laptops' },
        location: { name: 'Storage' },
        assignedTo: { firstName: 'Alice', lastName: 'Engineer', email: 'alice@company.com' },
      });

      const updated = await service.update('ast-1', { assignedToId: 'dir-1' });
      expect(updated.status).toBe('Active');
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssetStatus.IN_USE,
            assignedTo: { connect: { id: 'dir-1' } },
          }),
        }),
      );
    });

    it('should respect explicit status overrides (e.g. MAINTENANCE) during user assignment', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.MAINTENANCE,
        assignedToId: 'dir-1',
        category: { name: 'Laptops' },
        location: { name: 'Storage' },
        assignedTo: { firstName: 'Alice', lastName: 'Engineer', email: 'alice@company.com' },
      });

      const updated = await service.update('ast-1', {
        assignedToId: 'dir-1',
        status: 'In Repair',
      });
      expect(updated.status).toBe('In Repair');
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssetStatus.MAINTENANCE,
            assignedTo: { connect: { id: 'dir-1' } },
          }),
        }),
      );
    });

    it('should preserve MAINTENANCE status when unassigning an asset without explicit status', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.MAINTENANCE,
        assignedToId: 'dir-1',
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.MAINTENANCE,
        assignedToId: null,
        category: { name: 'Laptops' },
        location: { name: 'Storage' },
      });

      await service.update('ast-1', { assignedToId: null });
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            status: AssetStatus.AVAILABLE,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should query assets with search query and pagination bounds', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'ast-1',
          assetTag: 'AST-1001',
          name: 'Dell XPS 15',
          status: AssetStatus.AVAILABLE,
          category: { name: 'Laptops' },
          location: { name: 'Floor 3' },
          assignedTo: null,
          purchaseCost: 1999,
        },
      ]);

      const result = await service.findAll({ search: 'Dell', page: 1, pageSize: 20 });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('In Storage');
    });
  });

  describe('getStats', () => {
    it('should aggregate asset counts across statuses', async () => {
      mockPrisma.asset.count
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(110) // IN_USE
        .mockResolvedValueOnce(15) // MAINTENANCE
        .mockResolvedValueOnce(20) // AVAILABLE
        .mockResolvedValueOnce(5); // RETIRED

      const stats = await service.getStats();

      expect(stats.total).toBe(150);
      expect(stats.active).toBe(110);
      expect(stats.inRepair).toBe(15);
      expect(stats.inStorage).toBe(20);
      expect(stats.retired).toBe(5);
    });
  });

  describe('getCategories', () => {
    it('should query assetCategory and return categories with derived code', async () => {
      const mockCats = [
        { id: 'cat-1', name: 'Laptops', description: 'Laptops', parentId: null },
        { id: 'cat-2', name: 'Network Switches', description: 'Switches', parentId: null },
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
        orderBy: { name: 'asc' },
        take: 100,
      });
      expect(result).toEqual([
        { id: 'cat-1', name: 'Laptops', code: 'LAPTOPS', parentId: null },
        { id: 'cat-2', name: 'Network Switches', code: 'NETWORK_SWITCHES', parentId: null },
      ]);
    });
  });
});
