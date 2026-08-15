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
        create: vi.fn(),
      },
      location: {
        findFirst: vi.fn(),
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
});
