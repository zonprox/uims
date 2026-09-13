import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventorySpatialFiltering (InventoryService)', () => {
  let service: InventoryService;
  let mockPrisma: {
    location: {
      findMany: ReturnType<typeof vi.fn>;
    };
    inventoryItem: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  const sampleWarehouseLocations = [
    { id: 'loc-bsl-wh', parentId: null }, // Central Warehouse
    { id: 'loc-bsl-wh-raw', parentId: 'loc-bsl-wh' }, // Raw Materials Storage
    { id: 'loc-bsl-wh-rack1', parentId: 'loc-bsl-wh-raw' }, // Shelf Rack R-01
    { id: 'loc-bsl-wh-bin1', parentId: 'loc-bsl-wh-rack1' }, // Bin B-01
    { id: 'loc-bsl-wh-bin2', parentId: 'loc-bsl-wh-rack1' }, // Bin B-02
    { id: 'loc-bsl-wh-fg', parentId: 'loc-bsl-wh' }, // Finished Goods
    { id: 'loc-other-wh', parentId: null }, // Other warehouse
  ];

  beforeEach(() => {
    mockPrisma = {
      location: {
        findMany: vi.fn(),
      },
      inventoryItem: {
        findMany: vi.fn(),
      },
    };

    service = new InventoryService(mockPrisma as unknown as PrismaService);
  });

  describe('findAll with spatial location filtering', () => {
    it('should resolve all warehouse descendant IDs and query items within that facility tree', async () => {
      mockPrisma.location.findMany.mockResolvedValue(sampleWarehouseLocations);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'itm-1',
          name: 'Zebra Barcode Labels 100x150',
          sku: 'LBL-ZBR-100X150',
          quantity: 250,
          locationId: 'loc-bsl-wh-bin1',
          location: {
            id: 'loc-bsl-wh-bin1',
            name: 'Bin B-01',
            fullPath: 'Central Warehouse > Raw Materials Storage > Shelf Rack R-01 > Bin B-01',
          },
        },
        {
          id: 'itm-2',
          name: 'Raw Fabric Rolls Cotton White',
          sku: 'FAB-CTN-WHT',
          quantity: 40,
          locationId: 'loc-bsl-wh-raw',
          location: {
            id: 'loc-bsl-wh-raw',
            name: 'Raw Materials Storage',
            fullPath: 'Central Warehouse > Raw Materials Storage',
          },
        },
      ]);

      const items = await service.findAll({ locationId: 'loc-bsl-wh' });

      // Verify that getDescendantLocationIds queried locations with bounded query
      expect(mockPrisma.location.findMany).toHaveBeenCalledWith({
        select: { id: true, parentId: true },
        take: 100,
        orderBy: { id: 'asc' },
      });

      // Verify that inventoryItem.findMany filtered by all descendant location IDs
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locationId: {
              in: expect.arrayContaining([
                'loc-bsl-wh',
                'loc-bsl-wh-raw',
                'loc-bsl-wh-rack1',
                'loc-bsl-wh-bin1',
                'loc-bsl-wh-bin2',
                'loc-bsl-wh-fg',
              ]),
            },
          }),
        }),
      );

      // Verify returned items
      expect(items).toHaveLength(2);
      expect(items[0].sku).toBe('LBL-ZBR-100X150');
      expect(items[1].sku).toBe('FAB-CTN-WHT');
    });

    it('should filter items strictly by specific bin when leaf location is requested', async () => {
      mockPrisma.location.findMany.mockResolvedValue(sampleWarehouseLocations);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'itm-1',
          name: 'Zebra Barcode Labels 100x150',
          sku: 'LBL-ZBR-100X150',
          quantity: 250,
          locationId: 'loc-bsl-wh-bin1',
        },
      ]);

      await service.findAll({ locationId: 'loc-bsl-wh-bin1' });

      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locationId: {
              in: ['loc-bsl-wh-bin1'],
            },
          }),
        }),
      );
    });

    it('should return empty list when querying non-existent location ID', async () => {
      mockPrisma.location.findMany.mockResolvedValue(sampleWarehouseLocations);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);

      const items = await service.findAll({ locationId: 'unknown-wh-location' });

      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locationId: {
              in: [],
            },
          }),
        }),
      );
      expect(items).toEqual([]);
    });
  });
});
