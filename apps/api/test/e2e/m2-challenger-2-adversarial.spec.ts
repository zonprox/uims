import { NotFoundException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { LocationType, type OrgNode } from '@uims/shared-types';
import * as dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../src/database/prisma.service';
import { OrganizationService } from '../../src/modules/organization/organization.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Milestone 2 Challenger 2 — Empirical Adversarial Hierarchy & Seeder Suite', () => {
  let prisma: PrismaClient;
  let service: OrganizationService;
  let isDbAvailable = false;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      isDbAvailable = false;
      return;
    }
    try {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      });
      await prisma.$queryRaw`SELECT 1`;
      service = new OrganizationService(prisma as unknown as PrismaService);
      isDbAvailable = true;
    } catch {
      isDbAvailable = false;
    }
  });

  beforeEach((ctx) => {
    if (!isDbAvailable) {
      ctx.skip();
    }
  });

  afterAll(async () => {
    if (isDbAvailable && prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore
      }
    }
  });

  // =========================================================================
  // 1. CORPORATE HOLDING & SUBSIDIARY TOPOLOGY IN getHierarchyTree()
  // =========================================================================
  describe('Mission 1: OrganizationService.getHierarchyTree() Corporate Topology', () => {
    it('1.1 should return exactly 1 root holding organization with code HOLDING', async () => {
      const tree = await service.getHierarchyTree();
      expect(tree).toBeDefined();
      expect(tree).toHaveLength(1);

      const root = tree[0];
      expect(root.key).toBe('org-org-holding');
      expect(root.code).toBe('HOLDING');
      expect(root.title).toBe('Youngone / Broadpeak Group');
      expect(root.type).toBe('organization');
    });

    it('1.2 should nest BSH and BSL as the only direct child organizations under Holding', async () => {
      const tree = await service.getHierarchyTree();
      const root = tree[0];

      const childOrgs = (root.children || []).filter((c) => c.type === 'organization');
      expect(childOrgs).toHaveLength(2);

      const bsh = childOrgs.find((c) => c.code === 'BSH');
      const bsl = childOrgs.find((c) => c.code === 'BSL');

      expect(bsh).toBeDefined();
      expect(bsh?.key).toBe('org-org-bsh');
      expect(bsh?.title).toBe('Broadpeak Ho Chi Minh');

      expect(bsl).toBeDefined();
      expect(bsl?.key).toBe('org-org-bsl');
      expect(bsl?.title).toBe('Broadpeak Soc Trang');
    });

    it('1.3 Holding company itself should have 0 direct facilities and 0 direct departments', async () => {
      const tree = await service.getHierarchyTree();
      const root = tree[0];

      const nonOrgChildren = (root.children || []).filter((c) => c.type !== 'organization');
      expect(nonOrgChildren).toHaveLength(0);
    });
  });

  // =========================================================================
  // 2. BSH (HO CHI MINH) OFFICE-ONLY STANDARDIZATION & PRODUCTION PURITY
  // =========================================================================
  describe('Mission 2: BSH Office-Only Purity & Zero Production Locations', () => {
    it('2.1 BSH should show exactly 2 branch office locations and 0 production facilities', async () => {
      const tree = await service.getHierarchyTree();
      const holding = tree[0];
      const bsh = holding.children?.find((c) => c.code === 'BSH');
      expect(bsh).toBeDefined();

      const branchGroup = bsh?.children?.find((c) => c.code === 'BRANCHES');
      expect(branchGroup).toBeDefined();
      expect(branchGroup?.title).toBe('Facilities & Campuses (2)');

      const locs = branchGroup?.children || [];
      expect(locs).toHaveLength(2);

      const d3 = locs.find((l) => l.code === 'HCM-D3');
      const d7 = locs.find((l) => l.code === 'HCM-D7');

      expect(d3).toBeDefined();
      expect(d3?.key).toBe('loc-loc-bsh-d3');
      expect(d3?.title).toContain('(BRANCH)');

      expect(d7).toBeDefined();
      expect(d7?.key).toBe('loc-loc-bsh-d7');
      expect(d7?.title).toContain('(BRANCH)');

      // Empirical check directly in PostgreSQL for BSH locations
      const bshDbLocs = await prisma.location.findMany({
        where: { organizationId: 'org-bsh' },
      });
      expect(bshDbLocs).toHaveLength(2);
      for (const loc of bshDbLocs) {
        expect([LocationType.BRANCH, LocationType.SITE, LocationType.ROOM]).toContain(loc.type);
        expect(loc.type).not.toBe(LocationType.WORKSHOP);
        expect(loc.type).not.toBe(LocationType.WAREHOUSE);
        expect(loc.type).not.toBe(LocationType.LINE);
        expect(loc.type).not.toBe(LocationType.STATION);
        expect(loc.type).not.toBe(LocationType.RACK);
        expect(loc.type).not.toBe(LocationType.SHELF);
        expect(loc.type).not.toBe(LocationType.BIN);
      }
    });

    it('2.2 BSH should contain only corporate office departments (8 departments total)', async () => {
      const tree = await service.getHierarchyTree();
      const holding = tree[0];
      const bsh = holding.children?.find((c) => c.code === 'BSH');

      // Recursively collect all department codes under BSH
      const deptCodes: string[] = [];
      const collectDeptCodes = (nodes: OrgNode[]) => {
        for (const n of nodes) {
          if (n.type === 'department' || n.type === 'sub-department') {
            if (n.code) deptCodes.push(n.code);
            if (n.children) collectDeptCodes(n.children);
          }
        }
      };
      collectDeptCodes(bsh?.children || []);

      expect(deptCodes).toHaveLength(8);
      const expectedBshDepts = [
        'DEPT-BSH-EXEC',
        'DEPT-BSH-COMM',
        'DEPT-BSH-MERCH',
        'DEPT-BSH-SRC',
        'DEPT-BSH-CORP',
        'DEPT-BSH-IT',
        'DEPT-BSH-FIN',
        'DEPT-BSH-HR',
      ];
      for (const expected of expectedBshDepts) {
        expect(deptCodes).toContain(expected);
      }

      // Ensure no production, sewing, cutting, or packing departments belong to BSH
      for (const code of deptCodes) {
        expect(code).not.toContain('CUT');
        expect(code).not.toContain('SEW');
        expect(code).not.toContain('PCK');
        expect(code).not.toContain('MAINT');
      }
    });
  });

  // =========================================================================
  // 3. BSL (SOC TRANG) COMPLEX: BC, WAREHOUSE & 7 FACTORIES (9x9 MODELING)
  // =========================================================================
  describe('Mission 3: BSL Facilities & 7 Factories with 9 Functional Departments', () => {
    it('3.1 BSL should show BC Building, Central Warehouse, and 7 Factories under campus root', async () => {
      const tree = await service.getHierarchyTree();
      const holding = tree[0];
      const bsl = holding.children?.find((c) => c.code === 'BSL');
      expect(bsl).toBeDefined();

      const branchGroup = bsl?.children?.find((c) => c.code === 'BRANCHES');
      expect(branchGroup).toBeDefined();

      // Top level node in BSL branch group is BSL-ST Campus
      expect(branchGroup?.children).toHaveLength(1);
      const campus = branchGroup?.children?.[0];
      expect(campus?.key).toBe('loc-loc-bsl-st');
      expect(campus?.code).toBe('BSL-ST');

      // Under campus, direct sub-facilities must be exactly 9 (BC, WH, F1..F7)
      const subFacilities = campus?.children || [];
      expect(subFacilities).toHaveLength(9);

      const subCodes = subFacilities.map((s) => s.code);
      expect(subCodes).toContain('BSL-BC');
      expect(subCodes).toContain('BSL-WH');
      for (let f = 1; f <= 7; f++) {
        expect(subCodes).toContain(`BSL-F${f}`);
      }
    });

    it('3.2 BC Building should contain 6 sub-locations including HR & Compliance (loc-bsl-bc-hr)', async () => {
      const tree = await service.getHierarchyTree();
      const holding = tree[0];
      const bsl = holding.children?.find((c) => c.code === 'BSL');
      const branchGroup = bsl?.children?.find((c) => c.code === 'BRANCHES');
      const campus = branchGroup?.children?.[0];
      const bc = campus?.children?.find((s) => s.code === 'BSL-BC');

      expect(bc).toBeDefined();
      expect(bc?.children).toHaveLength(6);

      const bcCodes = (bc?.children || []).map((c) => c.code);
      expect(bcCodes).toContain('BC-F3-EXEC');
      expect(bcCodes).toContain('BC-F2-IMEX');
      expect(bcCodes).toContain('BC-F2-ACC');
      expect(bcCodes).toContain('BC-F1-ADMIN');
      expect(bcCodes).toContain('BC-F1-HR');
      expect(bcCodes).toContain('BC-F1-DC102');
    });

    it('3.3 Central Warehouse should contain 3 specialized zones (Raw, Finished Goods, Spare Parts)', async () => {
      const tree = await service.getHierarchyTree();
      const holding = tree[0];
      const bsl = holding.children?.find((c) => c.code === 'BSL');
      const branchGroup = bsl?.children?.find((c) => c.code === 'BRANCHES');
      const campus = branchGroup?.children?.[0];
      const wh = campus?.children?.find((s) => s.code === 'BSL-WH');

      expect(wh).toBeDefined();
      expect(wh?.children).toHaveLength(3);

      const whCodes = (wh?.children || []).map((c) => c.code);
      expect(whCodes).toContain('WH-RAW');
      expect(whCodes).toContain('WH-FG');
      expect(whCodes).toContain('WH-SP');
    });

    it('3.4 All 7 Factories must each contain all 9 functional departments in getHierarchyTree()', async () => {
      const tree = await service.getHierarchyTree();
      const holding = tree[0];
      const bsl = holding.children?.find((c) => c.code === 'BSL');

      // Recursively find department nodes
      const allDeptNodes: OrgNode[] = [];
      const collectDepts = (nodes: OrgNode[]) => {
        for (const n of nodes) {
          if (n.type === 'department' || n.type === 'sub-department') {
            allDeptNodes.push(n);
            if (n.children) collectDepts(n.children);
          }
        }
      };
      collectDepts(bsl?.children || []);

      const expectedSectionSuffixes = [
        'CUT',
        'PRT',
        'SEW',
        'MAINT',
        'MDC',
        'QA',
        'SMP',
        'SALE',
        'PCK',
      ];

      for (let f = 1; f <= 7; f++) {
        const factoryDept = allDeptNodes.find((d) => d.code === `DEPT-BSL-F${f}`);
        expect(factoryDept).toBeDefined();

        const childDeptCodes = (factoryDept?.children || [])
          .filter((c: OrgNode) => c.type === 'department' || c.type === 'sub-department')
          .map((c: OrgNode) => c.code);

        expect(childDeptCodes).toHaveLength(9);

        for (const suffix of expectedSectionSuffixes) {
          const targetCode = `DEPT-BSL-F${f}-${suffix}`;
          expect(childDeptCodes).toContain(targetCode);
        }
      }
    });

    it('3.5 All 7 Factories must each contain 9 physical functional sections in Location tree', async () => {
      const tree = await service.getHierarchyTree();
      const holding = tree[0];
      const bsl = holding.children?.find((c) => c.code === 'BSL');
      const branchGroup = bsl?.children?.find((c) => c.code === 'BRANCHES');
      const campus = branchGroup?.children?.[0];

      for (let f = 1; f <= 7; f++) {
        const factoryLoc = campus?.children?.find((s) => s.code === `BSL-F${f}`);
        expect(factoryLoc).toBeDefined();

        const subLocCodes = (factoryLoc?.children || []).map((c) => c.code);

        // Verify that QA, Cutting, Sewing/Prod, Printing, Maintenance, MDC, Packing, Sample, Sales are present
        expect(subLocCodes).toContain(`F${f}-QA`);
        expect(subLocCodes).toContain(`F${f}-CUT`);
        expect(subLocCodes).toContain(`F${f}-PROD`);
        expect(subLocCodes).toContain(`F${f}-PRINT`);
        expect(subLocCodes).toContain(`F${f}-MAINT`);
        expect(subLocCodes).toContain(`F${f}-MDC`);
        expect(subLocCodes).toContain(`F${f}-PACK`);
        expect(subLocCodes).toContain(`F${f}-SAMPLE`);
        expect(subLocCodes).toContain(`F${f}-SALES`);
      }
    });
  });

  // =========================================================================
  // 4. SPATIAL LOCATION LOOKUPS & DESCENDANT RESOLUTION (BACKWARD COMPATIBILITY)
  // =========================================================================
  describe('Mission 4: Backward Compatibility of Spatial Location Lookups', () => {
    it('4.1 should resolve loc-bsl-f1-sew-st1 with intact fullPath breadcrumbs and metadata', async () => {
      const loc = await service.findLocation('loc-bsl-f1-sew-st1');
      expect(loc).toBeDefined();
      expect(loc.name).toBe('Station 01 (Bàn may 01)');
      expect(loc.code).toBe('F1-S1-ST01');
      expect(loc.type).toBe(LocationType.STATION);
      expect(loc.parentId).toBe('loc-bsl-f1-sew');
      expect(loc.fullPath).toContain('BSL - Soc Trang Campus');
      expect(loc.fullPath).toContain('Factory 1 (Phân xưởng 1)');
      expect(loc.fullPath).toContain('Station 01');
    });

    it('4.2 should resolve loc-bsl-wh-bin1 in Central Warehouse fabric rack', async () => {
      const loc = await service.findLocation('loc-bsl-wh-bin1');
      expect(loc).toBeDefined();
      expect(loc.name).toBe('Bin B-01 (Cotton Twill)');
      expect(loc.code).toBe('WH-BIN-01');
      expect(loc.type).toBe(LocationType.BIN);
      expect(loc.parentId).toBe('loc-bsl-wh-shelf1');
      expect(loc.fullPath).toContain('Central Warehouse Building');
      expect(loc.fullPath).toContain('Raw Materials Storage');
      expect(loc.fullPath).toContain('Fabric Bay 01');
    });

    it('4.3 should resolve loc-bsl-bc-hr in Business Center Building', async () => {
      const loc = await service.findLocation('loc-bsl-bc-hr');
      expect(loc).toBeDefined();
      expect(loc.name).toBe('Human Resources & Compliance (Floor 1)');
      expect(loc.code).toBe('BC-F1-HR');
      expect(loc.type).toBe(LocationType.FLOOR);
      expect(loc.parentId).toBe('loc-bsl-bc');
      expect(loc.fullPath).toBe(
        'BSL - Soc Trang Campus > Business Center Building > Human Resources & Compliance (Floor 1)',
      );
    });

    it('4.4 should resolve legacy alias loc-bsl-f2-sew1-st1 for test and seeder continuity', async () => {
      const loc = await service.findLocation('loc-bsl-f2-sew1-st1');
      expect(loc).toBeDefined();
      expect(loc.code).toBe('F2-S1-ST01-LEGACY');
      expect(loc.parentId).toBe('loc-bsl-f2-sew');
    });

    it('4.5 should resolve newly modeled maintenance and sample workshop locations across factories', async () => {
      for (let f = 1; f <= 7; f++) {
        const maint = await service.findLocation(`loc-bsl-f${f}-maint`);
        expect(maint).toBeDefined();
        expect(maint.code).toBe(`F${f}-MAINT`);
        expect(maint.type).toBe(LocationType.WORKSHOP);
        expect(maint.parentId).toBe(`loc-bsl-f${f}`);

        const sample = await service.findLocation(`loc-bsl-f${f}-sample`);
        expect(sample).toBeDefined();
        expect(sample.code).toBe(`F${f}-SAMPLE`);
        expect(sample.type).toBe(LocationType.ROOM);
        expect(sample.parentId).toBe(`loc-bsl-f${f}`);
      }
    });

    it('4.6 should accurately compute descendant location IDs without cross-facility leakage', async () => {
      // 1. Factory 1 descendants
      const f1Desc = await service.getDescendantLocationIds('loc-bsl-f1');
      expect(f1Desc.length).toBeGreaterThanOrEqual(40);
      expect(f1Desc).toContain('loc-bsl-f1');
      expect(f1Desc).toContain('loc-bsl-f1-sew-st1');
      expect(f1Desc).toContain('loc-bsl-f1-maint');
      expect(f1Desc).toContain('loc-bsl-f1-sample');
      expect(f1Desc).toContain('loc-bsl-f1-qa');
      expect(f1Desc).toContain('loc-bsl-f1-mdc');

      // Crucial negative assertion: Factory 1 must NOT contain Factory 2 or Warehouse nodes
      expect(f1Desc).not.toContain('loc-bsl-f2');
      expect(f1Desc).not.toContain('loc-bsl-f2-sew1-st1');
      expect(f1Desc).not.toContain('loc-bsl-wh');
      expect(f1Desc).not.toContain('loc-bsl-wh-bin1');
      expect(f1Desc).not.toContain('loc-bsl-bc');

      // 2. Central Warehouse descendants
      const whDesc = await service.getDescendantLocationIds('loc-bsl-wh');
      expect(whDesc).toContain('loc-bsl-wh');
      expect(whDesc).toContain('loc-bsl-wh-raw');
      expect(whDesc).toContain('loc-bsl-wh-bin1');
      expect(whDesc).toContain('loc-bsl-wh-sp-bin01');
      expect(whDesc).not.toContain('loc-bsl-f1');
      expect(whDesc).not.toContain('loc-bsl-bc');

      // 3. Leaf Station descendants
      const stDesc = await service.getDescendantLocationIds('loc-bsl-f1-sew-st1');
      expect(stDesc).toEqual(['loc-bsl-f1-sew-st1']);
    });

    it('4.7 should reject non-existent location ID with NotFoundException', async () => {
      await expect(service.findLocation('loc-ghost-invalid-9999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
