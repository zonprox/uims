import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrisma: Record<string, unknown>;
  let mockConfig: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      asset: { findMany: vi.fn() },
      ticket: { findMany: vi.fn() },
      license: { findMany: vi.fn() },
      directoryUser: { findMany: vi.fn() },
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'MEILISEARCH_HOST') return 'http://localhost:7700';
        if (key === 'MEILISEARCH_API_KEY') return 'test_key';
        return undefined;
      }),
    };

    service = new SearchService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      mockConfig as unknown as import('@nestjs/config').ConfigService,
    );
  });

  describe('searchDatabaseFallback', () => {
    it('should search across assets, tickets, licenses, and directory users and format results', async () => {
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
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.license.findMany.mockResolvedValue([]);
      mockPrisma.directoryUser.findMany.mockResolvedValue([]);

      const response = await service.searchDatabaseFallback('ThinkPad', 10);

      expect(response.query).toBe('ThinkPad');
      expect(response.total).toBe(1);
      expect(response.results[0].category).toBe('Asset');
      expect(response.results[0].path).toBe('/assets');
    });

    it('should return empty results for blank query', async () => {
      const response = await service.search({ q: '   ' });
      expect(response.total).toBe(0);
      expect(response.results).toEqual([]);
    });
  });
});
