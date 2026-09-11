import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrisma: Record<string, { findMany: ReturnType<typeof vi.fn> }>;
  let mockConfig: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const userMock = { findMany: vi.fn().mockResolvedValue([]) };
    mockPrisma = {
      asset: { findMany: vi.fn().mockResolvedValue([]) },
      license: { findMany: vi.fn().mockResolvedValue([]) },
      user: userMock,
      directoryUser: userMock,
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'MEILISEARCH_HOST') return 'http://localhost:7700';
        if (key === 'MEILISEARCH_API_KEY') return 'test_key';
        return undefined;
      }),
    };

    service = new SearchService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
    );
  });

  describe('searchDatabaseFallback', () => {
    it('should search across assets, licenses, and users and format results', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'a1',
          name: 'ThinkPad T14',
          assetTag: 'AST-1005',
          manufacturer: 'Lenovo',
          model: 'T14 Gen 4',
          category: { name: 'Laptops' },
          status: 'IN_USE',
        },
      ]);
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'l1',
          name: 'Microsoft 365',
          vendor: 'Microsoft',
          totalSeats: 100,
          type: 'SUBSCRIPTION',
          status: 'ACTIVE',
        },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          displayName: 'Sarah Chen',
          firstName: 'Sarah',
          lastName: 'Chen',
          email: 'sarah.chen@company.com',
          username: 'sarah.chen',
          jobTitle: 'Systems Admin',
          department: 'IT',
          status: 'ACTIVE',
        },
      ]);

      const response = await service.searchDatabaseFallback('test', 10);

      expect(response.query).toBe('test');
      expect(response.total).toBe(3);
      expect(response.results).toHaveLength(3);

      // Verify asset formatting
      expect(response.results[0]).toEqual({
        id: 'a1',
        title: 'ThinkPad T14 (AST-1005)',
        subtitle: 'Lenovo T14 Gen 4 • Laptops',
        category: 'Asset',
        path: '/assets',
        status: 'IN_USE',
      });

      // Verify license formatting
      expect(response.results[1]).toEqual({
        id: 'l1',
        title: 'Microsoft 365 (Microsoft)',
        subtitle: '100 seats • SUBSCRIPTION',
        category: 'License',
        path: '/licenses',
        status: 'ACTIVE',
      });

      // Verify directory user formatting
      expect(response.results[2]).toEqual({
        id: 'u1',
        title: 'Sarah Chen',
        subtitle: 'sarah.chen@company.com • Systems Admin',
        category: 'Directory',
        path: '/users',
        status: 'ACTIVE',
      });
    });

    it('should respect the limit parameter', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'a1',
          name: 'Asset 1',
          assetTag: 'AST-1',
          manufacturer: 'Dell',
          model: 'XPS',
          category: { name: 'Laptops' },
          status: 'ACTIVE',
        },
        {
          id: 'a2',
          name: 'Asset 2',
          assetTag: 'AST-2',
          manufacturer: 'Apple',
          model: 'MBP',
          category: { name: 'Laptops' },
          status: 'ACTIVE',
        },
      ]);

      const response = await service.searchDatabaseFallback('Asset', 1);
      expect(response.results).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('should return empty results for blank query', async () => {
      const response = await service.search({ q: '   ' });
      expect(response.total).toBe(0);
      expect(response.results).toEqual([]);
      expect(mockPrisma.asset.findMany).not.toHaveBeenCalled();
    });

    it('should fall back to database search when Meilisearch is not available', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'a1',
          name: 'Dell XPS 15',
          assetTag: 'AST-1001',
          manufacturer: 'Dell',
          model: 'XPS 15',
          category: { name: 'Laptops' },
          status: 'ACTIVE',
        },
      ]);

      const response = await service.search({ q: 'Dell' });
      expect(response.query).toBe('Dell');
      expect(response.total).toBe(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalled();
    });

    it('should clamp limit to between 1 and 50', async () => {
      await service.search({ q: 'test', limit: 100 });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );

      await service.search({ q: 'test', limit: -5 });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        }),
      );
    });
  });

  describe('configuration security and fail-fast', () => {
    it('should throw immediately if no API key is provided and getOrThrow throws', () => {
      const emptyConfig = {
        get: vi.fn(() => undefined),
        getOrThrow: vi.fn(() => {
          throw new Error('Config missing');
        }),
      };
      expect(() => {
        new SearchService(
          mockPrisma as unknown as PrismaService,
          emptyConfig as unknown as ConfigService,
        );
      }).toThrow();
    });
  });

  describe('syncAllToMeilisearch', () => {
    it('should process assets, licenses, and directory users using cursor pagination in batches of 100', async () => {
      // Mock health check
      vi.spyOn(service, 'checkHealthAndInit').mockResolvedValue(true);
      (service as unknown as { isMeiliAvailable: boolean }).isMeiliAvailable = true;

      // First batch: 100 items, second batch: 1 item, third batch: empty
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `a-${i}`,
        name: `Asset ${i}`,
        assetTag: `TAG-${i}`,
        serialNumber: `SN-${i}`,
        model: `Model-${i}`,
        manufacturer: 'Lenovo',
        status: 'IN_USE',
      }));
      const batch2 = [
        {
          id: 'a-100',
          name: 'Asset 100',
          assetTag: 'TAG-100',
          serialNumber: 'SN-100',
          model: 'Model-100',
          manufacturer: 'Lenovo',
          status: 'IN_USE',
        },
      ];

      mockPrisma.asset.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: 'lic-1',
          name: 'Office 365',
          vendor: 'MS',
          type: 'SUBSCRIPTION',
          totalSeats: 50,
          status: 'ACTIVE',
        },
      ]);

      mockPrisma.directoryUser.findMany.mockResolvedValueOnce([
        {
          id: 'user-1',
          displayName: 'Jane Doe',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@company.com',
          status: 'ACTIVE',
        },
      ]);

      // Mock fetch
      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

      try {
        const res = await service.syncAllToMeilisearch();
        expect(res.success).toBe(true);
        expect(res.counts).toEqual({
          assets: 101,
          licenses: 1,
          users: 1,
        });

        // Verify cursor pagination calls on asset
        expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(2);
        expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            take: 100,
            skip: 0,
            orderBy: { id: 'asc' },
          }),
        );
        expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            take: 100,
            skip: 1,
            cursor: { id: 'a-99' },
            orderBy: { id: 'asc' },
          }),
        );
      } finally {
        global.fetch = globalFetch;
      }
    });
  });
});
