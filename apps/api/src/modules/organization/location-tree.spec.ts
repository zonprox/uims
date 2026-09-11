import { LocationType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { OrganizationService } from './organization.service';

interface MockLocation {
  id: string;
  name: string;
  code?: string | null;
  type: LocationType;
  parentId?: string | null;
  fullPath?: string | null;
  description?: string | null;
  organizationId?: string | null;
  organization?: { id: string; name: string; code: string } | null;
  _count?: {
    assets: number;
    inventoryItems: number;
    users: number;
    children: number;
  };
}

describe('LocationTree & Spatial Hierarchy (OrganizationService)', () => {
  let service: OrganizationService;
  let mockPrisma: {
    location: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };

  const sampleBslLocations: MockLocation[] = [
    {
      id: 'loc-bsl-st',
      name: 'BSL - Soc Trang Campus',
      code: 'BSL-ST',
      type: LocationType.CAMPUS,
      parentId: null,
      fullPath: 'BSL - Soc Trang Campus',
      _count: { assets: 120, inventoryItems: 450, users: 85, children: 2 },
    },
    {
      id: 'loc-bsl-bc',
      name: 'Business Center Building',
      code: 'BSL-BC',
      type: LocationType.BUILDING,
      parentId: 'loc-bsl-st',
      fullPath: 'BSL - Soc Trang Campus > Business Center Building',
      _count: { assets: 40, inventoryItems: 10, users: 50, children: 1 },
    },
    {
      id: 'loc-bsl-bc-server',
      name: 'Factory IT Hub & Server Room',
      code: 'BSL-BC-SRV',
      type: LocationType.ROOM,
      parentId: 'loc-bsl-bc',
      fullPath: 'BSL - Soc Trang Campus > Business Center Building > Factory IT Hub & Server Room',
      _count: { assets: 25, inventoryItems: 5, users: 4, children: 0 },
    },
    {
      id: 'loc-bsl-f1',
      name: 'Factory 1',
      code: 'BSL-F1',
      type: LocationType.WORKSHOP,
      parentId: 'loc-bsl-st',
      fullPath: 'BSL - Soc Trang Campus > Factory 1',
      _count: { assets: 60, inventoryItems: 200, users: 300, children: 2 },
    },
    {
      id: 'loc-bsl-f1-mdc',
      name: 'MDC Sub-Warehouse',
      code: 'BSL-F1-MDC',
      type: LocationType.WAREHOUSE,
      parentId: 'loc-bsl-f1',
      fullPath: 'BSL - Soc Trang Campus > Factory 1 > MDC Sub-Warehouse',
      _count: { assets: 5, inventoryItems: 180, users: 10, children: 1 },
    },
    {
      id: 'loc-bsl-f1-mdc-bin1',
      name: 'Bin B-01',
      code: 'BSL-F1-BIN01',
      type: LocationType.BIN,
      parentId: 'loc-bsl-f1-mdc',
      fullPath: 'BSL - Soc Trang Campus > Factory 1 > MDC Sub-Warehouse > Bin B-01',
      _count: { assets: 0, inventoryItems: 50, users: 0, children: 0 },
    },
    {
      id: 'loc-bsl-f1-sew',
      name: 'Sewing Line 01',
      code: 'BSL-F1-L01',
      type: LocationType.LINE,
      parentId: 'loc-bsl-f1',
      fullPath: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01',
      _count: { assets: 30, inventoryItems: 15, users: 60, children: 1 },
    },
    {
      id: 'loc-bsl-f1-sew-st1',
      name: 'Station 01',
      code: 'BSL-F1-L01-ST01',
      type: LocationType.STATION,
      parentId: 'loc-bsl-f1-sew',
      fullPath: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 01',
      _count: { assets: 2, inventoryItems: 0, users: 1, children: 0 },
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      location: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    service = new OrganizationService(mockPrisma as unknown as PrismaService);
  });

  describe('getLocationTree', () => {
    it('should build a nested multi-tier tree from flat location records', async () => {
      mockPrisma.location.findMany.mockResolvedValue(sampleBslLocations);

      const tree = await service.getLocationTree();

      expect(tree).toHaveLength(1);
      const campus = tree[0];
      expect(campus.id).toBe('loc-bsl-st');
      expect(campus.title).toBe('BSL - Soc Trang Campus');
      expect(campus.key).toBe('loc-bsl-st');
      expect(campus.value).toBe('loc-bsl-st');
      expect(campus.label).toBe('BSL - Soc Trang Campus');
      expect(campus.fullPath).toBe('BSL - Soc Trang Campus');

      // Campus has 2 direct children: Business Center & Factory 1
      expect(campus.children).toHaveLength(2);
      const businessCenter = campus.children?.find((c) => c.id === 'loc-bsl-bc');
      const factory1 = campus.children?.find((c) => c.id === 'loc-bsl-f1');
      expect(businessCenter).toBeDefined();
      expect(factory1).toBeDefined();

      // Factory 1 has MDC Sub-Warehouse and Sewing Line 01
      expect(factory1?.children).toHaveLength(2);
      const mdc = factory1?.children?.find((c) => c.id === 'loc-bsl-f1-mdc');
      expect(mdc?.fullPath).toBe('BSL - Soc Trang Campus > Factory 1 > MDC Sub-Warehouse');

      // MDC has Bin B-01 leaf node
      expect(mdc?.children).toHaveLength(1);
      expect(mdc?.children?.[0].id).toBe('loc-bsl-f1-mdc-bin1');
      expect(mdc?.children?.[0].fullPath).toBe(
        'BSL - Soc Trang Campus > Factory 1 > MDC Sub-Warehouse > Bin B-01',
      );
    });

    it('should compute fullPath dynamically even if stored fullPath is null', async () => {
      const locationsWithoutPath: MockLocation[] = sampleBslLocations.map((loc) => ({
        ...loc,
        fullPath: null,
      }));
      mockPrisma.location.findMany.mockResolvedValue(locationsWithoutPath);

      const tree = await service.getLocationTree();
      const campus = tree[0];
      const factory1 = campus.children?.find((c) => c.id === 'loc-bsl-f1');
      const sew = factory1?.children?.find((c) => c.id === 'loc-bsl-f1-sew');
      const st1 = sew?.children?.find((c) => c.id === 'loc-bsl-f1-sew-st1');

      expect(st1?.fullPath).toBe(
        'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 01',
      );
    });

    it('should handle disconnected or orphan roots gracefully', async () => {
      const disconnected: MockLocation[] = [
        {
          id: 'orphan-1',
          name: 'Orphan Facility',
          type: LocationType.SITE,
          parentId: 'non-existent-parent',
          _count: { assets: 0, inventoryItems: 0, users: 0, children: 0 },
        },
        {
          id: 'root-1',
          name: 'Root Campus',
          type: LocationType.CAMPUS,
          parentId: null,
          _count: { assets: 0, inventoryItems: 0, users: 0, children: 0 },
        },
      ];
      mockPrisma.location.findMany.mockResolvedValue(disconnected);

      const tree = await service.getLocationTree();
      expect(tree).toHaveLength(2);
      const ids = tree.map((n) => n.id);
      expect(ids).toContain('orphan-1');
      expect(ids).toContain('root-1');
    });

    it('should handle circular references without infinite loops or stack overflow', async () => {
      const cyclicLocations: MockLocation[] = [
        {
          id: 'node-a',
          name: 'Cyclic Node A',
          type: LocationType.BUILDING,
          parentId: 'node-b',
          _count: { assets: 0, inventoryItems: 0, users: 0, children: 1 },
        },
        {
          id: 'node-b',
          name: 'Cyclic Node B',
          type: LocationType.FLOOR,
          parentId: 'node-a',
          _count: { assets: 0, inventoryItems: 0, users: 0, children: 1 },
        },
      ];
      mockPrisma.location.findMany.mockResolvedValue(cyclicLocations);

      const tree = await service.getLocationTree();
      // Should not throw, cycles broken safely
      expect(tree).toBeDefined();
      expect(tree.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getDescendantLocationIds', () => {
    it('should return root ID + all descendants for top-level campus', async () => {
      mockPrisma.location.findMany.mockResolvedValue(
        sampleBslLocations.map((l) => ({ id: l.id, parentId: l.parentId })),
      );

      const ids = await service.getDescendantLocationIds('loc-bsl-st');
      expect(ids).toHaveLength(8);
      expect(ids).toContain('loc-bsl-st');
      expect(ids).toContain('loc-bsl-bc');
      expect(ids).toContain('loc-bsl-bc-server');
      expect(ids).toContain('loc-bsl-f1');
      expect(ids).toContain('loc-bsl-f1-mdc');
      expect(ids).toContain('loc-bsl-f1-mdc-bin1');
      expect(ids).toContain('loc-bsl-f1-sew');
      expect(ids).toContain('loc-bsl-f1-sew-st1');
    });

    it('should return branch root ID + sub-tree descendants for Factory 1', async () => {
      mockPrisma.location.findMany.mockResolvedValue(
        sampleBslLocations.map((l) => ({ id: l.id, parentId: l.parentId })),
      );

      const ids = await service.getDescendantLocationIds('loc-bsl-f1');
      expect(ids).toHaveLength(5);
      expect(ids).toContain('loc-bsl-f1');
      expect(ids).toContain('loc-bsl-f1-mdc');
      expect(ids).toContain('loc-bsl-f1-mdc-bin1');
      expect(ids).toContain('loc-bsl-f1-sew');
      expect(ids).toContain('loc-bsl-f1-sew-st1');
      // Should NOT contain Business Center or Campus
      expect(ids).not.toContain('loc-bsl-st');
      expect(ids).not.toContain('loc-bsl-bc');
    });

    it('should return exactly [leafId] for a leaf node', async () => {
      mockPrisma.location.findMany.mockResolvedValue(
        sampleBslLocations.map((l) => ({ id: l.id, parentId: l.parentId })),
      );

      const ids = await service.getDescendantLocationIds('loc-bsl-f1-mdc-bin1');
      expect(ids).toEqual(['loc-bsl-f1-mdc-bin1']);
    });

    it('should return [] for non-existent location ID', async () => {
      mockPrisma.location.findMany.mockResolvedValue(
        sampleBslLocations.map((l) => ({ id: l.id, parentId: l.parentId })),
      );

      const ids = await service.getDescendantLocationIds('unknown-id');
      expect(ids).toEqual([]);
    });

    it('should handle cyclic parent-child links gracefully without crashing', async () => {
      const cyclicNodes = [
        { id: 'c-1', parentId: 'c-2' },
        { id: 'c-2', parentId: 'c-3' },
        { id: 'c-3', parentId: 'c-1' },
      ];
      mockPrisma.location.findMany.mockResolvedValue(cyclicNodes);

      const ids = await service.getDescendantLocationIds('c-1');
      expect(ids).toHaveLength(3);
      expect(ids).toEqual(expect.arrayContaining(['c-1', 'c-2', 'c-3']));
    });

    it('should resolve deep 20-level hierarchy without issues', async () => {
      const deepNodes: { id: string; parentId: string | null }[] = [
        { id: 'depth-0', parentId: null },
      ];
      for (let i = 1; i <= 20; i++) {
        deepNodes.push({ id: `depth-${i}`, parentId: `depth-${i - 1}` });
      }
      mockPrisma.location.findMany.mockResolvedValue(deepNodes);

      const ids = await service.getDescendantLocationIds('depth-0');
      expect(ids).toHaveLength(21);
      expect(ids).toContain('depth-20');
    });
  });

  describe('computeFullPath', () => {
    it('should traverse up to root and persist computed breadcrumb path', async () => {
      mockPrisma.location.findMany.mockResolvedValue([
        { id: 'loc-1', name: 'Plant', parentId: null },
        { id: 'loc-2', name: 'Workshop A', parentId: 'loc-1' },
        { id: 'loc-3', name: 'Line 01', parentId: 'loc-2' },
      ]);
      mockPrisma.location.update.mockResolvedValue({
        id: 'loc-3',
        fullPath: 'Plant > Workshop A > Line 01',
      });

      const path = await service.computeFullPath('loc-3');
      expect(path).toBe('Plant > Workshop A > Line 01');
      expect(mockPrisma.location.update).toHaveBeenCalledWith({
        where: { id: 'loc-3' },
        data: { fullPath: 'Plant > Workshop A > Line 01' },
      });
    });
  });
});
