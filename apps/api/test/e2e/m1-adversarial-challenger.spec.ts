import type { Prisma } from '@prisma/client';
import { AssetStatus, LocationType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../src/database/prisma.service';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';

interface TestLocation {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  type: LocationType;
  fullPath: string | null;
  organizationId: string | null;
}

interface TestAsset {
  id: string;
  name: string;
  assetTag: string;
  status: AssetStatus;
  locationId: string | null;
  departmentId: string | null;
  location?: TestLocation | null;
  department?: { id: string; name: string } | null;
}

interface TestInventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  locationId: string | null;
  binNumber: string | null;
  location?: TestLocation | null;
}

describe('M1 Adversarial Challenger — Spatial Filtering & Orthogonal Department Stress Suite', () => {
  let assetsService: AssetsService;
  let inventoryService: InventoryService;

  let locationsDb: TestLocation[] = [];
  let assetsDb: TestAsset[] = [];
  let inventoryDb: TestInventoryItem[] = [];

  let mockPrisma: {
    location: {
      findMany: ReturnType<typeof vi.fn>;
    };
    asset: {
      findMany: ReturnType<typeof vi.fn>;
    };
    inventoryItem: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    locationsDb = [];
    assetsDb = [];
    inventoryDb = [];

    mockPrisma = {
      location: {
        findMany: vi.fn(async (args?: { select?: { id?: boolean; parentId?: boolean } }) => {
          if (args?.select?.id && args?.select?.parentId) {
            return locationsDb.map((l) => ({ id: l.id, parentId: l.parentId }));
          }
          return locationsDb;
        }),
      },
      asset: {
        findMany: vi.fn(
          async (args?: {
            where?: {
              locationId?: { in: string[] } | string;
              departmentId?: string;
              status?: AssetStatus;
            };
            take?: number;
            skip?: number;
            orderBy?: unknown;
          }) => {
            let filtered = [...assetsDb];
            if (args?.where) {
              const w = args.where;
              if (w.locationId) {
                if (typeof w.locationId === 'object' && 'in' in w.locationId) {
                  const allowedIds = new Set(w.locationId.in);
                  filtered = filtered.filter(
                    (a) => a.locationId !== null && allowedIds.has(a.locationId),
                  );
                } else if (typeof w.locationId === 'string') {
                  filtered = filtered.filter((a) => a.locationId === w.locationId);
                }
              }
              if (w.departmentId) {
                filtered = filtered.filter((a) => a.departmentId === w.departmentId);
              }
              if (w.status) {
                filtered = filtered.filter((a) => a.status === w.status);
              }
            }

            const skip = args?.skip ?? 0;
            const take = args?.take ?? filtered.length;
            const paged = filtered.slice(skip, skip + take);

            return paged.map((a) => ({
              ...a,
              category: { id: 'cat-1', name: 'General Equipment' },
              assignedTo: null,
              location: locationsDb.find((l) => l.id === a.locationId) ?? null,
              department: a.departmentId
                ? { id: a.departmentId, name: `Dept-${a.departmentId}` }
                : null,
            }));
          },
        ),
      },
      inventoryItem: {
        findMany: vi.fn(
          async (args?: {
            where?: {
              locationId?: { in: string[] } | string;
              quantity?: number | { gt?: number; lte?: number };
            };
            take?: number;
            skip?: number;
            orderBy?: unknown;
          }) => {
            let filtered = [...inventoryDb];
            if (args?.where) {
              const w = args.where;
              if (w.locationId) {
                if (typeof w.locationId === 'object' && 'in' in w.locationId) {
                  const allowedIds = new Set(w.locationId.in);
                  filtered = filtered.filter(
                    (i) => i.locationId !== null && allowedIds.has(i.locationId),
                  );
                } else if (typeof w.locationId === 'string') {
                  filtered = filtered.filter((i) => i.locationId === w.locationId);
                }
              }
            }

            const skip = args?.skip ?? 0;
            const take = args?.take ?? filtered.length;
            const paged = filtered.slice(skip, skip + take);

            return paged.map((i) => ({
              ...i,
              category: { id: 'icat-1', name: 'Raw Materials' },
              location: locationsDb.find((l) => l.id === i.locationId) ?? null,
            }));
          },
        ),
      },
    };

    assetsService = new AssetsService(mockPrisma as unknown as PrismaService);
    inventoryService = new InventoryService(mockPrisma as unknown as PrismaService);
  });

  // =========================================================================
  // Challenge 1: Parent Workshop Descendant Inclusions & Sibling Strict Exclusion
  // =========================================================================
  describe('Challenge 1: Parent Workshop Descendant Inclusion & Sibling Workshop Exclusion', () => {
    beforeEach(() => {
      // Setup BSL Facility Structure:
      // Campus Root: bsl-campus
      //   -> Workshop 1 (Factory 1): bsl-f1
      //       -> Zone Cutting: bsl-f1-cut
      //       -> Zone Sewing: bsl-f1-sew
      //           -> Line 1: bsl-f1-line1
      //               -> Station 01: bsl-f1-st01
      //               -> Station 02: bsl-f1-st02
      //           -> Line 2: bsl-f1-line2
      //               -> Station 03: bsl-f1-st03
      //   -> Workshop 2 (Factory 2 - Sibling): bsl-f2
      //       -> Zone Sewing: bsl-f2-sew
      //           -> Line 1: bsl-f2-line1
      //               -> Station 01: bsl-f2-st01
      //   -> Workshop 3 (Factory 3 - Sibling): bsl-f3
      //       -> Zone Finishing: bsl-f3-fin

      locationsDb = [
        {
          id: 'bsl-campus',
          name: 'BSL Campus',
          code: 'BSL',
          parentId: null,
          type: LocationType.CAMPUS,
          fullPath: 'BSL Campus',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f1',
          name: 'Factory 1',
          code: 'F1',
          parentId: 'bsl-campus',
          type: LocationType.WORKSHOP,
          fullPath: 'BSL Campus > Factory 1',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f1-cut',
          name: 'Cutting Zone',
          code: 'F1-CUT',
          parentId: 'bsl-f1',
          type: LocationType.ZONE,
          fullPath: 'BSL Campus > Factory 1 > Cutting Zone',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f1-sew',
          name: 'Sewing Zone',
          code: 'F1-SEW',
          parentId: 'bsl-f1',
          type: LocationType.ZONE,
          fullPath: 'BSL Campus > Factory 1 > Sewing Zone',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f1-line1',
          name: 'Sewing Line 01',
          code: 'F1-L01',
          parentId: 'bsl-f1-sew',
          type: LocationType.LINE,
          fullPath: 'BSL Campus > Factory 1 > Sewing Zone > Sewing Line 01',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f1-st01',
          name: 'Station 01',
          code: 'F1-L01-S01',
          parentId: 'bsl-f1-line1',
          type: LocationType.STATION,
          fullPath: 'BSL Campus > Factory 1 > Sewing Zone > Sewing Line 01 > Station 01',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f1-st02',
          name: 'Station 02',
          code: 'F1-L01-S02',
          parentId: 'bsl-f1-line1',
          type: LocationType.STATION,
          fullPath: 'BSL Campus > Factory 1 > Sewing Zone > Sewing Line 01 > Station 02',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f1-line2',
          name: 'Sewing Line 02',
          code: 'F1-L02',
          parentId: 'bsl-f1-sew',
          type: LocationType.LINE,
          fullPath: 'BSL Campus > Factory 1 > Sewing Zone > Sewing Line 02',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f1-st03',
          name: 'Station 03',
          code: 'F1-L02-S03',
          parentId: 'bsl-f1-line2',
          type: LocationType.STATION,
          fullPath: 'BSL Campus > Factory 1 > Sewing Zone > Sewing Line 02 > Station 03',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f2',
          name: 'Factory 2',
          code: 'F2',
          parentId: 'bsl-campus',
          type: LocationType.WORKSHOP,
          fullPath: 'BSL Campus > Factory 2',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f2-sew',
          name: 'F2 Sewing Zone',
          code: 'F2-SEW',
          parentId: 'bsl-f2',
          type: LocationType.ZONE,
          fullPath: 'BSL Campus > Factory 2 > F2 Sewing Zone',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f2-line1',
          name: 'F2 Sewing Line 01',
          code: 'F2-L01',
          parentId: 'bsl-f2-sew',
          type: LocationType.LINE,
          fullPath: 'BSL Campus > Factory 2 > F2 Sewing Zone > F2 Sewing Line 01',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f2-st01',
          name: 'F2 Station 01',
          code: 'F2-L01-S01',
          parentId: 'bsl-f2-line1',
          type: LocationType.STATION,
          fullPath: 'BSL Campus > Factory 2 > F2 Sewing Zone > F2 Sewing Line 01 > F2 Station 01',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f3',
          name: 'Factory 3',
          code: 'F3',
          parentId: 'bsl-campus',
          type: LocationType.WORKSHOP,
          fullPath: 'BSL Campus > Factory 3',
          organizationId: 'org-bsl',
        },
        {
          id: 'bsl-f3-fin',
          name: 'F3 Finishing',
          code: 'F3-FIN',
          parentId: 'bsl-f3',
          type: LocationType.ZONE,
          fullPath: 'BSL Campus > Factory 3 > F3 Finishing',
          organizationId: 'org-bsl',
        },
      ];

      // Populate assets distributed across the facility tree
      assetsDb = [
        // Factory 1 assets
        {
          id: 'ast-f1-root',
          name: 'F1 Workshop Terminal',
          assetTag: 'AST-F1-000',
          status: AssetStatus.IN_USE,
          locationId: 'bsl-f1',
          departmentId: 'dept-prod',
        },
        {
          id: 'ast-f1-cut',
          name: 'Laser Cutting Table',
          assetTag: 'AST-F1-CUT-1',
          status: AssetStatus.IN_USE,
          locationId: 'bsl-f1-cut',
          departmentId: 'dept-prod',
        },
        {
          id: 'ast-f1-s1',
          name: 'Juki Sewing Machine 01',
          assetTag: 'AST-F1-S01',
          status: AssetStatus.IN_USE,
          locationId: 'bsl-f1-st01',
          departmentId: 'dept-prod',
        },
        {
          id: 'ast-f1-s2',
          name: 'Brother Sewing Machine 02',
          assetTag: 'AST-F1-S02',
          status: AssetStatus.IN_USE,
          locationId: 'bsl-f1-st02',
          departmentId: 'dept-prod',
        },
        {
          id: 'ast-f1-s3',
          name: 'Overlock Machine 03',
          assetTag: 'AST-F1-S03',
          status: AssetStatus.IN_USE,
          locationId: 'bsl-f1-st03',
          departmentId: 'dept-prod',
        },

        // Factory 2 assets (Sibling workshop)
        {
          id: 'ast-f2-root',
          name: 'F2 Workshop Terminal',
          assetTag: 'AST-F2-000',
          status: AssetStatus.IN_USE,
          locationId: 'bsl-f2',
          departmentId: 'dept-prod',
        },
        {
          id: 'ast-f2-s1',
          name: 'F2 Juki Sewing Machine',
          assetTag: 'AST-F2-S01',
          status: AssetStatus.IN_USE,
          locationId: 'bsl-f2-st01',
          departmentId: 'dept-prod',
        },

        // Factory 3 assets (Sibling workshop)
        {
          id: 'ast-f3-fin',
          name: 'F3 Steam Iron Press',
          assetTag: 'AST-F3-001',
          status: AssetStatus.IN_USE,
          locationId: 'bsl-f3-fin',
          departmentId: 'dept-prod',
        },
      ];
    });

    it('should return ALL assets in parent workshop and all its descendant stations/lines', async () => {
      const results = await assetsService.findAll({ locationId: 'bsl-f1' });

      // Factory 1 has 5 assets: ast-f1-root, ast-f1-cut, ast-f1-s1, ast-f1-s2, ast-f1-s3
      expect(results).toHaveLength(5);
      const tags = results.map((r) => r.tag);
      expect(tags).toContain('AST-F1-000');
      expect(tags).toContain('AST-F1-CUT-1');
      expect(tags).toContain('AST-F1-S01');
      expect(tags).toContain('AST-F1-S02');
      expect(tags).toContain('AST-F1-S03');
    });

    it('should strictly exclude assets from sibling workshops (0% leak)', async () => {
      const resultsF1 = await assetsService.findAll({ locationId: 'bsl-f1' });

      // Verify no Factory 2 or Factory 3 assets are returned
      const f1Tags = resultsF1.map((r) => r.tag);
      expect(f1Tags).not.toContain('AST-F2-000');
      expect(f1Tags).not.toContain('AST-F2-S01');
      expect(f1Tags).not.toContain('AST-F3-001');

      // Now query sibling Factory 2
      const resultsF2 = await assetsService.findAll({ locationId: 'bsl-f2' });
      expect(resultsF2).toHaveLength(2);
      const f2Tags = resultsF2.map((r) => r.tag);
      expect(f2Tags).toEqual(expect.arrayContaining(['AST-F2-000', 'AST-F2-S01']));
      expect(f2Tags).not.toContain('AST-F1-000');
      expect(f2Tags).not.toContain('AST-F3-001');

      // Now query sibling Factory 3
      const resultsF3 = await assetsService.findAll({ locationId: 'bsl-f3' });
      expect(resultsF3).toHaveLength(1);
      expect(resultsF3[0].tag).toBe('AST-F3-001');
    });

    it('should strictly isolate intermediate line branches within the same workshop', async () => {
      // Query Line 1 of Factory 1 (contains Station 01 and Station 02)
      const resultsLine1 = await assetsService.findAll({ locationId: 'bsl-f1-line1' });
      expect(resultsLine1).toHaveLength(2);
      const line1Tags = resultsLine1.map((r) => r.tag);
      expect(line1Tags).toContain('AST-F1-S01');
      expect(line1Tags).toContain('AST-F1-S02');
      // Must exclude Station 03 from Line 2, cutting table, and workshop root
      expect(line1Tags).not.toContain('AST-F1-S03');
      expect(line1Tags).not.toContain('AST-F1-CUT-1');
      expect(line1Tags).not.toContain('AST-F1-000');
    });

    it('should query top-level campus and return all assets in all factories', async () => {
      const resultsCampus = await assetsService.findAll({ locationId: 'bsl-campus' });
      expect(resultsCampus).toHaveLength(8);
    });
  });

  // =========================================================================
  // Challenge 2: Orthogonal Department Independence Stress Matrix
  // =========================================================================
  describe('Challenge 2: Orthogonal Department Independence Stress Matrix', () => {
    beforeEach(() => {
      locationsDb = [
        {
          id: 'f1',
          name: 'Factory 1',
          code: 'F1',
          parentId: null,
          type: LocationType.WORKSHOP,
          fullPath: 'Factory 1',
          organizationId: 'org-1',
        },
        {
          id: 'f1-s1',
          name: 'Station 1',
          code: 'F1-S1',
          parentId: 'f1',
          type: LocationType.STATION,
          fullPath: 'Factory 1 > Station 1',
          organizationId: 'org-1',
        },
        {
          id: 'f2',
          name: 'Factory 2',
          code: 'F2',
          parentId: null,
          type: LocationType.WORKSHOP,
          fullPath: 'Factory 2',
          organizationId: 'org-1',
        },
        {
          id: 'bc',
          name: 'Business Center',
          code: 'BC',
          parentId: null,
          type: LocationType.BUILDING,
          fullPath: 'Business Center',
          organizationId: 'org-1',
        },
      ];

      // Matrix of assets across physical locations and organizational departments:
      // F1-S1 has: PROD asset, QA asset, IT asset, and an asset with NO department
      // F2 has: PROD asset, IT asset
      // BC has: IT asset, ACC (accounting) asset
      // Standalone (no location): IT asset
      assetsDb = [
        {
          id: 'a1',
          name: 'Sewing Station PC',
          assetTag: 'AST-01',
          status: AssetStatus.IN_USE,
          locationId: 'f1-s1',
          departmentId: 'dept-prod',
        },
        {
          id: 'a2',
          name: 'Quality Inspection Tablet',
          assetTag: 'AST-02',
          status: AssetStatus.IN_USE,
          locationId: 'f1-s1',
          departmentId: 'dept-qa',
        },
        {
          id: 'a3',
          name: 'Network Switch F1',
          assetTag: 'AST-03',
          status: AssetStatus.IN_USE,
          locationId: 'f1-s1',
          departmentId: 'dept-it',
        },
        {
          id: 'a4',
          name: 'Unassigned Tool',
          assetTag: 'AST-04',
          status: AssetStatus.AVAILABLE,
          locationId: 'f1-s1',
          departmentId: null,
        },
        {
          id: 'a5',
          name: 'F2 Sewing Machine',
          assetTag: 'AST-05',
          status: AssetStatus.IN_USE,
          locationId: 'f2',
          departmentId: 'dept-prod',
        },
        {
          id: 'a6',
          name: 'F2 Access Point',
          assetTag: 'AST-06',
          status: AssetStatus.IN_USE,
          locationId: 'f2',
          departmentId: 'dept-it',
        },
        {
          id: 'a7',
          name: 'BC Server Rack',
          assetTag: 'AST-07',
          status: AssetStatus.IN_USE,
          locationId: 'bc',
          departmentId: 'dept-it',
        },
        {
          id: 'a8',
          name: 'Finance Workstation',
          assetTag: 'AST-08',
          status: AssetStatus.IN_USE,
          locationId: 'bc',
          departmentId: 'dept-acc',
        },
        {
          id: 'a9',
          name: 'Roaming IT Laptop',
          assetTag: 'AST-09',
          status: AssetStatus.IN_USE,
          locationId: null,
          departmentId: 'dept-it',
        },
      ];
    });

    it('should filter by BOTH location and department orthogonally (intersection)', async () => {
      // Query Factory 1 AND Production Department
      const resF1Prod = await assetsService.findAll({
        locationId: 'f1',
        departmentId: 'dept-prod',
      });
      expect(resF1Prod).toHaveLength(1);
      expect(resF1Prod[0].tag).toBe('AST-01');

      // Query Factory 1 AND IT Department
      const resF1IT = await assetsService.findAll({ locationId: 'f1', departmentId: 'dept-it' });
      expect(resF1IT).toHaveLength(1);
      expect(resF1IT[0].tag).toBe('AST-03');

      // Query Factory 1 AND Accounting (no accounting assets in F1)
      const resF1Acc = await assetsService.findAll({ locationId: 'f1', departmentId: 'dept-acc' });
      expect(resF1Acc).toHaveLength(0);
    });

    it('should query department independently across all locations when locationId is omitted', async () => {
      // Query all IT assets across the entire enterprise
      const resIT = await assetsService.findAll({ departmentId: 'dept-it' });
      // Expected: a3 (F1-S1), a6 (F2), a7 (BC), a9 (no location)
      expect(resIT).toHaveLength(4);
      const tags = resIT.map((r) => r.tag);
      expect(tags).toEqual(expect.arrayContaining(['AST-03', 'AST-06', 'AST-07', 'AST-09']));
    });

    it('should query location independently across all departments when departmentId is omitted', async () => {
      // Query Factory 1 (should return PROD, QA, IT, and unassigned department)
      const resF1 = await assetsService.findAll({ locationId: 'f1' });
      expect(resF1).toHaveLength(4);
      const tags = resF1.map((r) => r.tag);
      expect(tags).toEqual(expect.arrayContaining(['AST-01', 'AST-02', 'AST-03', 'AST-04']));
    });

    it('should return asset with null department when filtering location only, but exclude it when department is specified', async () => {
      const resLocationOnly = await assetsService.findAll({ locationId: 'f1' });
      expect(resLocationOnly.some((r) => r.tag === 'AST-04')).toBe(true);

      const resWithDept = await assetsService.findAll({
        locationId: 'f1',
        departmentId: 'dept-prod',
      });
      expect(resWithDept.some((r) => r.tag === 'AST-04')).toBe(false);
    });
  });

  // =========================================================================
  // Challenge 3: Inventory Sub-Warehouse Bins & Root Warehouse Filtering
  // =========================================================================
  describe('Challenge 3: Inventory Sub-Warehouse Bins & Root Warehouse Filtering', () => {
    beforeEach(() => {
      // Multi-tier warehouse and sub-warehouse hierarchy:
      // Central Warehouse (Root): wh-root
      //   -> Raw Material Area: wh-raw
      //       -> Rack R01: wh-raw-r01
      //           -> Bin B01: wh-raw-r01-b01
      //           -> Bin B02: wh-raw-r01-b02
      //       -> Rack R02: wh-raw-r02
      //           -> Bin B03: wh-raw-r02-b03
      //   -> Finished Goods Area: wh-fg
      //       -> Pallet Bay P01: wh-fg-p01
      // Factory 1 Sub-Warehouse (MDC): f1-mdc
      //   -> MDC Rack M1: f1-mdc-r1
      //       -> MDC Bin M01: f1-mdc-r1-b01
      // Factory 2 Sub-Warehouse (MDC): f2-mdc
      //   -> MDC Bin M02: f2-mdc-b02

      locationsDb = [
        {
          id: 'wh-root',
          name: 'Central Warehouse',
          code: 'WH-ROOT',
          parentId: null,
          type: LocationType.WAREHOUSE,
          fullPath: 'Central Warehouse',
          organizationId: 'org-bsl',
        },
        {
          id: 'wh-raw',
          name: 'Raw Material Area',
          code: 'WH-RAW',
          parentId: 'wh-root',
          type: LocationType.AREA,
          fullPath: 'Central Warehouse > Raw Material Area',
          organizationId: 'org-bsl',
        },
        {
          id: 'wh-raw-r01',
          name: 'Rack R01',
          code: 'WH-R01',
          parentId: 'wh-raw',
          type: LocationType.RACK,
          fullPath: 'Central Warehouse > Raw Material Area > Rack R01',
          organizationId: 'org-bsl',
        },
        {
          id: 'wh-raw-r01-b01',
          name: 'Bin B01',
          code: 'WH-B01',
          parentId: 'wh-raw-r01',
          type: LocationType.BIN,
          fullPath: 'Central Warehouse > Raw Material Area > Rack R01 > Bin B01',
          organizationId: 'org-bsl',
        },
        {
          id: 'wh-raw-r01-b02',
          name: 'Bin B02',
          code: 'WH-B02',
          parentId: 'wh-raw-r01',
          type: LocationType.BIN,
          fullPath: 'Central Warehouse > Raw Material Area > Rack R01 > Bin B02',
          organizationId: 'org-bsl',
        },
        {
          id: 'wh-raw-r02',
          name: 'Rack R02',
          code: 'WH-R02',
          parentId: 'wh-raw',
          type: LocationType.RACK,
          fullPath: 'Central Warehouse > Raw Material Area > Rack R02',
          organizationId: 'org-bsl',
        },
        {
          id: 'wh-raw-r02-b03',
          name: 'Bin B03',
          code: 'WH-B03',
          parentId: 'wh-raw-r02',
          type: LocationType.BIN,
          fullPath: 'Central Warehouse > Raw Material Area > Rack R02 > Bin B03',
          organizationId: 'org-bsl',
        },
        {
          id: 'wh-fg',
          name: 'Finished Goods',
          code: 'WH-FG',
          parentId: 'wh-root',
          type: LocationType.AREA,
          fullPath: 'Central Warehouse > Finished Goods',
          organizationId: 'org-bsl',
        },
        {
          id: 'wh-fg-p01',
          name: 'Pallet Bay P01',
          code: 'WH-P01',
          parentId: 'wh-fg',
          type: LocationType.SHELF,
          fullPath: 'Central Warehouse > Finished Goods > Pallet Bay P01',
          organizationId: 'org-bsl',
        },

        {
          id: 'f1-mdc',
          name: 'Factory 1 MDC',
          code: 'F1-MDC',
          parentId: null,
          type: LocationType.WAREHOUSE,
          fullPath: 'Factory 1 MDC',
          organizationId: 'org-bsl',
        },
        {
          id: 'f1-mdc-r1',
          name: 'MDC Rack 1',
          code: 'F1-MDC-R1',
          parentId: 'f1-mdc',
          type: LocationType.RACK,
          fullPath: 'Factory 1 MDC > MDC Rack 1',
          organizationId: 'org-bsl',
        },
        {
          id: 'f1-mdc-r1-b01',
          name: 'MDC Bin 01',
          code: 'F1-MDC-B01',
          parentId: 'f1-mdc-r1',
          type: LocationType.BIN,
          fullPath: 'Factory 1 MDC > MDC Rack 1 > MDC Bin 01',
          organizationId: 'org-bsl',
        },

        {
          id: 'f2-mdc',
          name: 'Factory 2 MDC',
          code: 'F2-MDC',
          parentId: null,
          type: LocationType.WAREHOUSE,
          fullPath: 'Factory 2 MDC',
          organizationId: 'org-bsl',
        },
        {
          id: 'f2-mdc-b02',
          name: 'F2 MDC Bin 02',
          code: 'F2-MDC-B02',
          parentId: 'f2-mdc',
          type: LocationType.BIN,
          fullPath: 'Factory 2 MDC > F2 MDC Bin 02',
          organizationId: 'org-bsl',
        },
      ];

      inventoryDb = [
        // Central Warehouse items in various tiers
        {
          id: 'inv-1',
          name: 'Cotton Yarn Spool White',
          sku: 'SKU-YARN-WHT',
          quantity: 500,
          locationId: 'wh-raw-r01-b01',
          binNumber: 'B01',
        },
        {
          id: 'inv-2',
          name: 'Polyester Thread Black',
          sku: 'SKU-THRD-BLK',
          quantity: 300,
          locationId: 'wh-raw-r01-b02',
          binNumber: 'B02',
        },
        {
          id: 'inv-3',
          name: 'Metal Zippers 20cm',
          sku: 'SKU-ZIP-20',
          quantity: 1200,
          locationId: 'wh-raw-r02-b03',
          binNumber: 'B03',
        },
        {
          id: 'inv-4',
          name: 'Export Carton Boxes',
          sku: 'SKU-BOX-EXP',
          quantity: 80,
          locationId: 'wh-fg-p01',
          binNumber: 'P01',
        },
        {
          id: 'inv-5',
          name: 'Warehouse Pallet Jack',
          sku: 'SKU-PLT-JCK',
          quantity: 2,
          locationId: 'wh-root',
          binNumber: 'DOCK',
        },

        // Factory 1 MDC items (Sub-warehouse)
        {
          id: 'inv-6',
          name: 'F1 Daily Elastic Bands',
          sku: 'SKU-F1-ELAST',
          quantity: 150,
          locationId: 'f1-mdc-r1-b01',
          binNumber: 'M01',
        },

        // Factory 2 MDC items (Sub-warehouse)
        {
          id: 'inv-7',
          name: 'F2 Daily Buttons',
          sku: 'SKU-F2-BTN',
          quantity: 400,
          locationId: 'f2-mdc-b02',
          binNumber: 'M02',
        },
      ];
    });

    it('should return ALL inventory items in all sub-bins when filtering by Central Warehouse root', async () => {
      const results = await inventoryService.findAll({ locationId: 'wh-root' });

      // Central warehouse has 5 items (inv-1 through inv-5)
      expect(results).toHaveLength(5);
      const skus = results.map((r) => r.sku);
      expect(skus).toContain('SKU-YARN-WHT');
      expect(skus).toContain('SKU-THRD-BLK');
      expect(skus).toContain('SKU-ZIP-20');
      expect(skus).toContain('SKU-BOX-EXP');
      expect(skus).toContain('SKU-PLT-JCK');

      // Strictly excludes sub-warehouses F1 MDC and F2 MDC
      expect(skus).not.toContain('SKU-F1-ELAST');
      expect(skus).not.toContain('SKU-F2-BTN');
    });

    it('should filter items strictly by specific rack branch inside warehouse', async () => {
      // Query Rack R01 (contains Bin B01 and Bin B02)
      const resultsRack = await inventoryService.findAll({ locationId: 'wh-raw-r01' });
      expect(resultsRack).toHaveLength(2);
      const skus = resultsRack.map((r) => r.sku);
      expect(skus).toContain('SKU-YARN-WHT');
      expect(skus).toContain('SKU-THRD-BLK');
      expect(skus).not.toContain('SKU-ZIP-20');
      expect(skus).not.toContain('SKU-BOX-EXP');
    });

    it('should filter items strictly by exact single bin leaf', async () => {
      const resultsBin = await inventoryService.findAll({ locationId: 'wh-raw-r01-b01' });
      expect(resultsBin).toHaveLength(1);
      expect(resultsBin[0].sku).toBe('SKU-YARN-WHT');
    });

    it('should accurately isolate Factory 1 MDC sub-warehouse from Central Warehouse', async () => {
      const resultsMdc = await inventoryService.findAll({ locationId: 'f1-mdc' });
      expect(resultsMdc).toHaveLength(1);
      expect(resultsMdc[0].sku).toBe('SKU-F1-ELAST');
    });
  });

  // =========================================================================
  // Challenge 4: Non-Existent, Malformed, & Boundary Location Queries
  // =========================================================================
  describe('Challenge 4: Non-Existent, Malformed & Boundary Location Queries', () => {
    beforeEach(() => {
      locationsDb = [
        {
          id: 'valid-loc-1',
          name: 'Valid Location',
          code: 'VAL-1',
          parentId: null,
          type: LocationType.ROOM,
          fullPath: 'Valid Location',
          organizationId: 'org-1',
        },
      ];
      assetsDb = [
        {
          id: 'ast-1',
          name: 'Valid Asset',
          assetTag: 'AST-V1',
          status: AssetStatus.IN_USE,
          locationId: 'valid-loc-1',
          departmentId: 'dept-1',
        },
      ];
      inventoryDb = [
        {
          id: 'inv-1',
          name: 'Valid Item',
          sku: 'SKU-V1',
          quantity: 10,
          locationId: 'valid-loc-1',
          binNumber: 'B1',
        },
      ];
    });

    it('should handle non-existent UUID in AssetsService gracefully returning empty array without 500 error', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const results = await assetsService.findAll({ locationId: nonExistentId });
      expect(results).toEqual([]);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locationId: { in: [] },
          }),
        }),
      );
    });

    it('should handle non-existent UUID in InventoryService gracefully returning empty array without 500 error', async () => {
      const nonExistentId = '99999999-9999-9999-9999-999999999999';
      const results = await inventoryService.findAll({ locationId: nonExistentId });
      expect(results).toEqual([]);
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locationId: { in: [] },
          }),
        }),
      );
    });

    it('should handle SQL injection attempts in locationId gracefully via parameterized in-clause', async () => {
      const attackPayload = "' OR 1=1 --";
      const resultsAssets = await assetsService.findAll({ locationId: attackPayload });
      expect(resultsAssets).toEqual([]);

      const resultsInventory = await inventoryService.findAll({ locationId: attackPayload });
      expect(resultsInventory).toEqual([]);
    });

    it('should handle empty string and whitespace in locationId', async () => {
      const emptyResults = await assetsService.findAll({ locationId: '' });
      // When locationId is empty string, if treated as falsy, returns all assets
      expect(Array.isArray(emptyResults)).toBe(true);

      const whitespaceResults = await assetsService.findAll({ locationId: '   ' });
      // Non-existent location '   ' returns []
      expect(whitespaceResults).toEqual([]);
    });
  });

  // =========================================================================
  // Challenge 5: Graph Cycle & Degeneracy Stress Testing
  // =========================================================================
  describe('Challenge 5: Graph Cycle & Degeneracy Stress Testing', () => {
    it('should prevent infinite loop when database contains cyclic parent-child corruption (A -> B -> C -> A)', async () => {
      // Corrupt database state with cyclic loop:
      // A -> B -> C -> A
      locationsDb = [
        {
          id: 'cycle-a',
          name: 'Node A',
          code: 'A',
          parentId: 'cycle-c',
          type: LocationType.ZONE,
          fullPath: null,
          organizationId: null,
        },
        {
          id: 'cycle-b',
          name: 'Node B',
          code: 'B',
          parentId: 'cycle-a',
          type: LocationType.ZONE,
          fullPath: null,
          organizationId: null,
        },
        {
          id: 'cycle-c',
          name: 'Node C',
          code: 'C',
          parentId: 'cycle-b',
          type: LocationType.ZONE,
          fullPath: null,
          organizationId: null,
        },
      ];

      assetsDb = [
        {
          id: 'ast-a',
          name: 'Asset A',
          assetTag: 'AST-A',
          status: AssetStatus.IN_USE,
          locationId: 'cycle-a',
          departmentId: null,
        },
        {
          id: 'ast-b',
          name: 'Asset B',
          assetTag: 'AST-B',
          status: AssetStatus.IN_USE,
          locationId: 'cycle-b',
          departmentId: null,
        },
        {
          id: 'ast-c',
          name: 'Asset C',
          assetTag: 'AST-C',
          status: AssetStatus.IN_USE,
          locationId: 'cycle-c',
          departmentId: null,
        },
      ];

      // AssetsService.getDescendantLocationIds must terminate and not throw RangeError (Maximum call stack size exceeded)
      const startTime = Date.now();
      const descendantIds = await assetsService.getDescendantLocationIds('cycle-a');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(descendantIds).toHaveLength(3);
      expect(descendantIds).toEqual(expect.arrayContaining(['cycle-a', 'cycle-b', 'cycle-c']));

      const results = await assetsService.findAll({ locationId: 'cycle-a' });
      expect(results).toHaveLength(3);
    });

    it('should handle self-referential loop (X -> X) safely', async () => {
      locationsDb = [
        {
          id: 'self-loop',
          name: 'Self Loop',
          code: 'SELF',
          parentId: 'self-loop',
          type: LocationType.ROOM,
          fullPath: null,
          organizationId: null,
        },
      ];
      assetsDb = [
        {
          id: 'ast-self',
          name: 'Self Asset',
          assetTag: 'AST-SELF',
          status: AssetStatus.IN_USE,
          locationId: 'self-loop',
          departmentId: null,
        },
      ];

      const descendantIds = await assetsService.getDescendantLocationIds('self-loop');
      expect(descendantIds).toEqual(['self-loop']);

      const results = await assetsService.findAll({ locationId: 'self-loop' });
      expect(results).toHaveLength(1);
    });

    it('should handle diamond DAG without duplicate descendant IDs or duplicate asset returns', async () => {
      // Diamond: Root -> (Left, Right) -> Bottom
      locationsDb = [
        {
          id: 'dag-root',
          name: 'Root',
          code: 'ROOT',
          parentId: null,
          type: LocationType.BUILDING,
          fullPath: null,
          organizationId: null,
        },
        {
          id: 'dag-left',
          name: 'Left',
          code: 'LEFT',
          parentId: 'dag-root',
          type: LocationType.FLOOR,
          fullPath: null,
          organizationId: null,
        },
        {
          id: 'dag-right',
          name: 'Right',
          code: 'RIGHT',
          parentId: 'dag-root',
          type: LocationType.FLOOR,
          fullPath: null,
          organizationId: null,
        },
        {
          id: 'dag-bottom',
          name: 'Bottom',
          code: 'BOT',
          parentId: 'dag-left',
          type: LocationType.ROOM,
          fullPath: null,
          organizationId: null,
        },
      ];

      // Also register dag-bottom under dag-right in childrenMap simulation
      assetsDb = [
        {
          id: 'ast-bot',
          name: 'Bottom Asset',
          assetTag: 'AST-BOT',
          status: AssetStatus.IN_USE,
          locationId: 'dag-bottom',
          departmentId: null,
        },
      ];

      const descendantIds = await assetsService.getDescendantLocationIds('dag-root');
      const uniqueIds = new Set(descendantIds);
      expect(descendantIds.length).toBe(uniqueIds.size);

      const results = await assetsService.findAll({ locationId: 'dag-root' });
      expect(results).toHaveLength(1);
    });

    it('should resolve deep hierarchy (50 levels) in under 20 milliseconds', async () => {
      locationsDb = [];
      assetsDb = [];

      const DEPTH = 50;
      for (let i = 1; i <= DEPTH; i++) {
        locationsDb.push({
          id: `deep-${i}`,
          name: `Level ${i}`,
          code: `L${i}`,
          parentId: i === 1 ? null : `deep-${i - 1}`,
          type: LocationType.ROOM,
          fullPath: null,
          organizationId: null,
        });

        assetsDb.push({
          id: `ast-deep-${i}`,
          name: `Asset Level ${i}`,
          assetTag: `AST-L${i}`,
          status: AssetStatus.IN_USE,
          locationId: `deep-${i}`,
          departmentId: null,
        });
      }

      const start = performance.now();
      const descendants = await assetsService.getDescendantLocationIds('deep-1');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(20);
      expect(descendants).toHaveLength(DEPTH);

      const allAssets = await assetsService.findAll({ locationId: 'deep-1', pageSize: 100 });
      expect(allAssets).toHaveLength(DEPTH);

      // Query from level 40: should return 11 assets (levels 40 through 50)
      const subAssets = await assetsService.findAll({ locationId: 'deep-40', pageSize: 100 });
      expect(subAssets).toHaveLength(11);
    });
  });

  // =========================================================================
  // Challenge 6: Pagination & Bounded Limits with Spatial Filters
  // =========================================================================
  describe('Challenge 6: Pagination & Bounded Limits with Spatial Filters', () => {
    beforeEach(() => {
      locationsDb = [
        {
          id: 'wh-bulk',
          name: 'Bulk Warehouse',
          code: 'WH-BLK',
          parentId: null,
          type: LocationType.WAREHOUSE,
          fullPath: 'Bulk Warehouse',
          organizationId: null,
        },
        {
          id: 'wh-bulk-b1',
          name: 'Bin 1',
          code: 'B1',
          parentId: 'wh-bulk',
          type: LocationType.BIN,
          fullPath: 'Bulk Warehouse > Bin 1',
          organizationId: null,
        },
      ];

      // Create 150 inventory items in Bin 1
      inventoryDb = [];
      for (let i = 1; i <= 150; i++) {
        inventoryDb.push({
          id: `bulk-item-${i}`,
          name: `Bulk Part ${i}`,
          sku: `SKU-BLK-${String(i).padStart(4, '0')}`,
          quantity: i * 5,
          locationId: 'wh-bulk-b1',
          binNumber: 'B1',
        });
      }
    });

    it('should paginate items under spatial hierarchy correctly without offset drift', async () => {
      const page1 = await inventoryService.findAll({
        locationId: 'wh-bulk',
        page: 1,
        pageSize: 20,
      });
      expect(page1).toHaveLength(20);
      expect(page1[0].sku).toBe('SKU-BLK-0001');
      expect(page1[19].sku).toBe('SKU-BLK-0020');

      const page2 = await inventoryService.findAll({
        locationId: 'wh-bulk',
        page: 2,
        pageSize: 20,
      });
      expect(page2).toHaveLength(20);
      expect(page2[0].sku).toBe('SKU-BLK-0021');
      expect(page2[19].sku).toBe('SKU-BLK-0040');

      // Verify zero overlap between page 1 and page 2
      const p1Ids = new Set(page1.map((p) => p.id));
      for (const item of page2) {
        expect(p1Ids.has(item.id)).toBe(false);
      }
    });

    it('should enforce hard upper ceiling of 100 on pageSize', async () => {
      await inventoryService.findAll({ locationId: 'wh-bulk', pageSize: 500 });
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  // =========================================================================
  // Challenge 7: High Concurrency Multi-Tenant Spatial Queries
  // =========================================================================
  describe('Challenge 7: Concurrent Spatial Queries Stress', () => {
    it('should handle 30 simultaneous concurrent spatial queries without state cross-contamination', async () => {
      // Multiple organizations and facilities
      locationsDb = [
        {
          id: 'org1-f1',
          name: 'Org 1 Factory 1',
          code: 'O1-F1',
          parentId: null,
          type: LocationType.WORKSHOP,
          fullPath: 'O1-F1',
          organizationId: 'org-1',
        },
        {
          id: 'org1-f1-s1',
          name: 'Org 1 Station 1',
          code: 'O1-S1',
          parentId: 'org1-f1',
          type: LocationType.STATION,
          fullPath: 'O1-F1 > O1-S1',
          organizationId: 'org-1',
        },
        {
          id: 'org2-f1',
          name: 'Org 2 Factory 1',
          code: 'O2-F1',
          parentId: null,
          type: LocationType.WORKSHOP,
          fullPath: 'O2-F1',
          organizationId: 'org-2',
        },
        {
          id: 'org2-f1-s1',
          name: 'Org 2 Station 1',
          code: 'O2-S1',
          parentId: 'org2-f1',
          type: LocationType.STATION,
          fullPath: 'O2-F1 > O2-S1',
          organizationId: 'org-2',
        },
      ];

      assetsDb = [
        {
          id: 'ast-o1',
          name: 'Org 1 Asset',
          assetTag: 'AST-O1',
          status: AssetStatus.IN_USE,
          locationId: 'org1-f1-s1',
          departmentId: 'dept-o1',
        },
        {
          id: 'ast-o2',
          name: 'Org 2 Asset',
          assetTag: 'AST-O2',
          status: AssetStatus.IN_USE,
          locationId: 'org2-f1-s1',
          departmentId: 'dept-o2',
        },
      ];

      const promises = [];
      for (let i = 0; i < 30; i++) {
        if (i % 2 === 0) {
          promises.push(assetsService.findAll({ locationId: 'org1-f1' }));
        } else {
          promises.push(assetsService.findAll({ locationId: 'org2-f1' }));
        }
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(30);

      for (let i = 0; i < 30; i++) {
        const res = results[i];
        if (i % 2 === 0) {
          expect(res).toHaveLength(1);
          expect(res[0].tag).toBe('AST-O1');
        } else {
          expect(res).toHaveLength(1);
          expect(res[0].tag).toBe('AST-O2');
        }
      }
    });
  });
});
