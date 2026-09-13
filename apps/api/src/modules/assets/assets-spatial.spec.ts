import { AssetStatus } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { AssetsService } from './assets.service';

describe('AssetsSpatialFiltering (AssetsService)', () => {
  let service: AssetsService;
  let mockPrisma: {
    location: {
      findMany: ReturnType<typeof vi.fn>;
    };
    asset: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  const sampleLocations = [
    { id: 'loc-bsl-st', parentId: null },
    { id: 'loc-bsl-bc', parentId: 'loc-bsl-st' },
    { id: 'loc-bsl-f1', parentId: 'loc-bsl-st' },
    { id: 'loc-bsl-f1-mdc', parentId: 'loc-bsl-f1' },
    { id: 'loc-bsl-f1-sew', parentId: 'loc-bsl-f1' },
    { id: 'loc-bsl-f1-sew-st1', parentId: 'loc-bsl-f1-sew' },
    { id: 'loc-bsl-f2', parentId: 'loc-bsl-st' },
  ];

  beforeEach(() => {
    mockPrisma = {
      location: {
        findMany: vi.fn(),
      },
      asset: {
        findMany: vi.fn(),
      },
    };

    service = new AssetsService(mockPrisma as unknown as PrismaService);
  });

  describe('findAll with spatial location filtering', () => {
    it('should resolve descendant location IDs and query where.locationId = { in: descendantIds } when parent facility is passed', async () => {
      mockPrisma.location.findMany.mockResolvedValue(sampleLocations);
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'ast-1',
          assetTag: 'AST-F1-001',
          name: 'Factory 1 Workshop PC',
          status: AssetStatus.IN_USE,
          locationId: 'loc-bsl-f1',
          location: {
            id: 'loc-bsl-f1',
            name: 'Factory 1',
            fullPath: 'BSL - Soc Trang Campus > Factory 1',
          },
        },
        {
          id: 'ast-2',
          assetTag: 'AST-F1-SEW-002',
          name: 'Sewing Terminal 01',
          status: AssetStatus.IN_USE,
          locationId: 'loc-bsl-f1-sew-st1',
          location: {
            id: 'loc-bsl-f1-sew-st1',
            name: 'Station 01',
            fullPath: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 01',
          },
        },
      ]);

      const results = await service.findAll({ locationId: 'loc-bsl-f1' });

      // Expect location.findMany to be called for descendant resolution with bounded query
      expect(mockPrisma.location.findMany).toHaveBeenCalledWith({
        select: { id: true, parentId: true },
        take: 100,
        orderBy: { id: 'asc' },
      });

      // Expect asset.findMany to query all descendant IDs of Factory 1:
      // ['loc-bsl-f1', 'loc-bsl-f1-mdc', 'loc-bsl-f1-sew', 'loc-bsl-f1-sew-st1']
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locationId: {
              in: expect.arrayContaining([
                'loc-bsl-f1',
                'loc-bsl-f1-mdc',
                'loc-bsl-f1-sew',
                'loc-bsl-f1-sew-st1',
              ]),
            },
          }),
        }),
      );

      // Verify locationPath is populated on formatted assets
      expect(results).toHaveLength(2);
      expect(results[0].locationPath).toBe('BSL - Soc Trang Campus > Factory 1');
      expect(results[1].locationPath).toBe(
        'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 01',
      );
    });

    it('should query only the single leaf node when leaf location is requested', async () => {
      mockPrisma.location.findMany.mockResolvedValue(sampleLocations);
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'ast-2',
          assetTag: 'AST-F1-SEW-002',
          name: 'Sewing Terminal 01',
          status: AssetStatus.IN_USE,
          locationId: 'loc-bsl-f1-sew-st1',
          location: {
            id: 'loc-bsl-f1-sew-st1',
            name: 'Station 01',
            fullPath: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 01',
          },
        },
      ]);

      await service.findAll({ locationId: 'loc-bsl-f1-sew-st1' });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locationId: {
              in: ['loc-bsl-f1-sew-st1'],
            },
          }),
        }),
      );
    });

    it('should query with empty in array when location does not exist in hierarchy', async () => {
      mockPrisma.location.findMany.mockResolvedValue(sampleLocations);
      mockPrisma.asset.findMany.mockResolvedValue([]);

      const results = await service.findAll({ locationId: 'non-existent-id' });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locationId: {
              in: [],
            },
          }),
        }),
      );
      expect(results).toEqual([]);
    });

    it('should fallback to location name if fullPath is null on asset location', async () => {
      mockPrisma.location.findMany.mockResolvedValue(sampleLocations);
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'ast-3',
          assetTag: 'AST-003',
          name: 'Standalone Laptop',
          status: AssetStatus.AVAILABLE,
          locationId: 'loc-bsl-bc',
          location: {
            id: 'loc-bsl-bc',
            name: 'Business Center Building',
            fullPath: null,
          },
        },
      ]);

      const results = await service.findAll({ locationId: 'loc-bsl-bc' });
      expect(results[0].locationPath).toBe('Business Center Building');
    });
  });
});
