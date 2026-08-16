import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrisma: Record<string, { findMany: ReturnType<typeof vi.fn> }>;
  let mockConfig: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      asset: { findMany: vi.fn().mockResolvedValue([]) },
      license: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
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
});
