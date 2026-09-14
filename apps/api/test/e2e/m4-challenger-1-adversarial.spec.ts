import * as dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Milestone 4 Challenger 1 — Empirical Database Integrity & Corporate Structure Adversarial Suite', () => {
  let prisma: PrismaClient;
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
  // 1. CORPORATE STRUCTURE ASSERTIONS
  // =========================================================================
  describe('Mission 1: Corporate Structure Topology Assertions', () => {
    it('1.1 should verify exactly 1 Holding Company with code HOLDING and parentId IS NULL', async () => {
      const holdings = await prisma.organization.findMany({
        where: { parentId: null },
      });

      expect(holdings.length, 'There must be exactly 1 top-level Holding company').toBe(1);
      const holding = holdings[0];
      expect(holding.id).toBe('org-holding');
      expect(holding.code).toBe('HOLDING');
      expect(holding.name).toBe('Youngone / Broadpeak Group');
      expect(holding.parentId).toBeNull();
    });

    it('1.2 should verify exactly 2 subsidiaries (BSH and BSL) with parentId = org-holding', async () => {
      const subsidiaries = await prisma.organization.findMany({
        where: { parentId: 'org-holding' },
        orderBy: { code: 'asc' },
      });

      expect(subsidiaries.length, 'Holding must have exactly 2 direct subsidiaries').toBe(2);
      const [bsh, bsl] = subsidiaries;

      expect(bsh.id).toBe('org-bsh');
      expect(bsh.code).toBe('BSH');
      expect(bsh.name).toBe('Broadpeak Ho Chi Minh');
      expect(bsh.parentId).toBe('org-holding');

      expect(bsl.id).toBe('org-bsl');
      expect(bsl.code).toBe('BSL');
      expect(bsl.name).toBe('Broadpeak Soc Trang');
      expect(bsl.parentId).toBe('org-holding');

      // Total organizations across the entire DB must be exactly 3
      const totalOrgs = await prisma.organization.count();
      expect(totalOrgs, 'Total organizations in the database must be exactly 3').toBe(3);
    });

    it('1.3 should verify BSH has exactly 8 corporate departments and exactly 2 office branch locations, 0 factories/workshops/warehouses', async () => {
      // 1. Departments count
      const bshDepts = await prisma.department.findMany({
        where: { organizationId: 'org-bsh' },
        orderBy: { code: 'asc' },
      });
      expect(bshDepts.length, 'BSH must have exactly 8 corporate departments').toBe(8);

      const bshDeptCodes = bshDepts.map((d) => d.code);
      expect(bshDeptCodes).toContain('DEPT-BSH-EXEC');
      expect(bshDeptCodes).toContain('DEPT-BSH-CORP');
      expect(bshDeptCodes).toContain('DEPT-BSH-COMM');
      expect(bshDeptCodes).toContain('DEPT-BSH-FIN');
      expect(bshDeptCodes).toContain('DEPT-BSH-HR');
      expect(bshDeptCodes).toContain('DEPT-BSH-IT');
      expect(bshDeptCodes).toContain('DEPT-BSH-MERCH');
      expect(bshDeptCodes).toContain('DEPT-BSH-SRC');

      // 2. Physical locations count
      const bshLocations = await prisma.location.findMany({
        where: { organizationId: 'org-bsh' },
      });
      expect(bshLocations.length, 'BSH must have exactly 2 branch office locations').toBe(2);
      const bshLocCodes = bshLocations.map((l) => l.code);
      expect(bshLocCodes).toContain('HCM-D3');
      expect(bshLocCodes).toContain('HCM-D7');

      // 3. Zero factories/workshops/warehouses in BSH
      const industrialLocations = await prisma.location.findMany({
        where: {
          organizationId: 'org-bsh',
          OR: [
            { type: { in: ['WORKSHOP', 'WAREHOUSE'] } },
            { name: { contains: 'factory', mode: 'insensitive' } },
            { name: { contains: 'xưởng', mode: 'insensitive' } },
            { name: { contains: 'warehouse', mode: 'insensitive' } },
            { name: { contains: 'kho', mode: 'insensitive' } },
          ],
        },
      });
      expect(
        industrialLocations.length,
        'BSH must contain 0 industrial facilities or workshops',
      ).toBe(0);
    });

    it('1.4 should verify BSL has 1 BC Building, 1 Central Warehouse with FG items in export bays, and exactly 7 Factories', async () => {
      // 1. BC Building
      const bcBuilding = await prisma.location.findUnique({
        where: { id: 'loc-bsl-bc' },
      });
      expect(bcBuilding, 'BSL must have Business Center Building (loc-bsl-bc)').toBeDefined();
      expect(bcBuilding?.type).toBe('BUILDING');
      expect(bcBuilding?.code).toBe('BSL-BC');

      // 2. Central Warehouse
      const warehouse = await prisma.location.findUnique({
        where: { id: 'loc-bsl-wh' },
      });
      expect(warehouse, 'BSL must have Central Warehouse Building (loc-bsl-wh)').toBeDefined();
      expect(warehouse?.type).toBe('WAREHOUSE');
      expect(warehouse?.code).toBe('BSL-WH');

      // Finished Goods items in export bays
      const exportBayInventory = await prisma.$queryRaw<
        Array<{ sku: string; name: string; quantity: number; loc_code: string; loc_name: string }>
      >`
        SELECT i.sku, i.name, i.quantity, l.code as loc_code, l.name as loc_name
        FROM "InventoryItem" i
        JOIN "Location" l ON i."locationId" = l.id
        WHERE l.code IN ('WH-FG-01', 'WH-FG-02') OR l.name ILIKE '%Export%'
        ORDER BY i.sku;
      `;
      expect(
        exportBayInventory.length,
        'Central Warehouse must contain Finished Goods items in export bays',
      ).toBeGreaterThanOrEqual(4);
      const fgSkus = exportBayInventory.map((i) => i.sku);
      expect(fgSkus).toContain('FG-ACT-HDY-03');
      expect(fgSkus).toContain('FG-CRG-PNT-02');
      expect(fgSkus).toContain('FG-DRS-SHT-04');
      expect(fgSkus).toContain('FG-OUT-JKT-01');

      // 3. Exactly 7 Factories (loc-bsl-f1 to loc-bsl-f7)
      const expectedFactoryIds = [
        'loc-bsl-f1',
        'loc-bsl-f2',
        'loc-bsl-f3',
        'loc-bsl-f4',
        'loc-bsl-f5',
        'loc-bsl-f6',
        'loc-bsl-f7',
      ];
      const factories = await prisma.location.findMany({
        where: { id: { in: expectedFactoryIds } },
        orderBy: { code: 'asc' },
      });
      expect(factories.length, 'BSL must have exactly 7 factories').toBe(7);
      for (let i = 0; i < 7; i++) {
        const factory = factories[i];
        expect(factory.type).toBe('WORKSHOP');
        expect(factory.code).toBe(`BSL-F${i + 1}`);
        expect(factory.name).toBe(`Factory ${i + 1} (Phân xưởng ${i + 1})`);
      }
    });

    it('1.5 should verify every factory F1 to F7 has exactly 9 functional departments and exactly 9 direct physical locations', async () => {
      const requiredDeptSuffixes = [
        'QA',
        'CUT',
        'SEW',
        'PRT',
        'MAINT',
        'MDC',
        'PCK',
        'SMP',
        'SALE',
      ];
      const requiredLocCodes = [
        'qa',
        'cut',
        'prod',
        'print',
        'maint',
        'mdc',
        'pack',
        'sample',
        'sales',
      ];

      for (let f = 1; f <= 7; f++) {
        // 1. Functional Departments under Factory F{f}
        const factoryDept = await prisma.department.findUnique({
          where: { code: `DEPT-BSL-F${f}` },
        });
        expect(
          factoryDept,
          `Factory ${f} master department DEPT-BSL-F${f} must exist`,
        ).toBeDefined();

        const functionalDepts = await prisma.department.findMany({
          where: { parentId: factoryDept?.id },
        });
        expect(
          functionalDepts.length,
          `Factory ${f} must have exactly 9 functional departments`,
        ).toBe(9);

        const currentDeptCodes = functionalDepts.map((d) => d.code);
        for (const suffix of requiredDeptSuffixes) {
          const expectedCode = `DEPT-BSL-F${f}-${suffix}`;
          expect(
            currentDeptCodes,
            `Factory ${f} must include department ${expectedCode}`,
          ).toContain(expectedCode);
        }

        // 2. Direct Physical Locations under Factory F{f}
        const directLocations = await prisma.location.findMany({
          where: { parentId: `loc-bsl-f${f}` },
        });
        expect(
          directLocations.length,
          `Factory ${f} must have exactly 9 direct physical locations`,
        ).toBe(9);

        const currentLocIds = directLocations.map((l) => l.id);
        for (const code of requiredLocCodes) {
          const expectedLocId = `loc-bsl-f${f}-${code}`;
          expect(
            currentLocIds,
            `Factory ${f} must include direct location ${expectedLocId}`,
          ).toContain(expectedLocId);
        }
      }
    });
  });

  // =========================================================================
  // 2. REFERENTIAL INTEGRITY & ZERO NULL ASSERTIONS
  // =========================================================================
  describe('Mission 2: Referential Integrity & Zero Null Invariants', () => {
    it('2.1 should assert 0 DirectoryUsers have NULL departmentId, positionId, or locationId', async () => {
      const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count 
        FROM "DirectoryUser" 
        WHERE "departmentId" IS NULL OR "positionId" IS NULL OR "locationId" IS NULL;
      `;
      expect(Number(count), 'DirectoryUser must have zero null foreign keys').toBe(0);
    });

    it('2.2 should assert 0 Assets have NULL departmentId or locationId', async () => {
      const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count 
        FROM "Asset" 
        WHERE "departmentId" IS NULL OR "locationId" IS NULL;
      `;
      expect(Number(count), 'Asset must have zero null departmentId or locationId').toBe(0);
    });

    it('2.3 should assert 0 InventoryItems have NULL locationId', async () => {
      const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count 
        FROM "InventoryItem" 
        WHERE "locationId" IS NULL;
      `;
      expect(Number(count), 'InventoryItem must have zero null locationId').toBe(0);
    });

    it('2.4 should assert exactly 40 PostgreSQL foreign key constraints exist in the public schema', async () => {
      const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
      `;
      expect(Number(count), 'There must be exactly 40 foreign key constraints').toBe(40);
    });

    it('2.5 should assert 0 foreign key constraint violations across all 40 constraints', async () => {
      const constraints = await prisma.$queryRaw<
        Array<{
          child_table: string;
          child_column: string;
          parent_table: string;
          parent_column: string;
          constraint_name: string;
        }>
      >`
        SELECT 
            tc.table_name as child_table,
            kcu.column_name as child_column,
            ccu.table_name as parent_table,
            ccu.column_name as parent_column,
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
      `;

      expect(constraints.length).toBe(40);

      for (const c of constraints) {
        const query = `
          SELECT count(*) as count 
          FROM "${c.child_table}" c 
          WHERE c."${c.child_column}" IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM "${c.parent_table}" p WHERE p."${c.parent_column}" = c."${c.child_column}");
        `;
        const [{ count }] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(query);
        expect(
          Number(count),
          `Constraint ${c.constraint_name} (${c.child_table}.${c.child_column} -> ${c.parent_table}.${c.parent_column}) has orphaned rows`,
        ).toBe(0);
      }
    });

    it('2.6 should assert 0 cross-organization mismatches across DirectoryUsers, Assets, and Inventory', async () => {
      // 1. DirectoryUser org alignment
      const mismatchedUsers = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT u.id
        FROM "DirectoryUser" u
        LEFT JOIN "Location" l ON u."locationId" = l.id
        LEFT JOIN "Department" d ON u."departmentId" = d.id
        WHERE (l."organizationId" IS NOT NULL AND u."organizationId" != l."organizationId")
           OR (d."organizationId" IS NOT NULL AND u."organizationId" != d."organizationId");
      `;
      expect(
        mismatchedUsers.length,
        'Zero DirectoryUsers should have mismatched organization IDs',
      ).toBe(0);

      // 2. Asset org alignment (dept org vs location org)
      const mismatchedAssets = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT a.id
        FROM "Asset" a
        JOIN "Department" d ON a."departmentId" = d.id
        JOIN "Location" l ON a."locationId" = l.id
        WHERE d."organizationId" != l."organizationId";
      `;
      expect(
        mismatchedAssets.length,
        'Zero Assets should have department org != location org',
      ).toBe(0);

      // 3. User assigned asset org alignment
      const mismatchedAssignments = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT a.id
        FROM "Asset" a
        JOIN "DirectoryUser" u ON a."assignedToId" = u.id
        JOIN "Department" d ON a."departmentId" = d.id
        WHERE u."organizationId" != d."organizationId";
      `;
      expect(
        mismatchedAssignments.length,
        'Zero assigned Assets should have user org != asset dept org',
      ).toBe(0);
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL MUTATION & BOUNDARY INTEGRITY
  // =========================================================================
  describe('Mission 3: Adversarial Mutation & Boundary Defense', () => {
    it('3.1 should reject creating a second top-level holding organization or duplicate code', async () => {
      // Creating duplicate code 'HOLDING' must be rejected by unique constraint
      await expect(
        prisma.organization.create({
          data: {
            name: 'Rogue Holding Group',
            code: 'HOLDING',
            parentId: null,
          },
        }),
      ).rejects.toThrow();
    });

    it('3.2 should reject setting organization parentId to non-existent organization', async () => {
      await expect(
        prisma.organization.create({
          data: {
            name: 'Orphan Org',
            code: 'ORPHAN-ORG',
            parentId: 'non-existent-parent-uuid-99999',
          },
        }),
      ).rejects.toThrow();
    });

    it('3.3 should reject assigning DirectoryUser to non-existent department or location', async () => {
      await expect(
        prisma.directoryUser.create({
          data: {
            employeeCode: 'ERR-EMP-9999',
            firstName: 'Invalid',
            lastName: 'User',
            email: 'invalid.user@uims.internal',
            organizationId: 'org-bsl',
            departmentId: 'dept-invalid-404',
            locationId: 'loc-bsl-st',
            positionId: 'pos-director',
          },
        }),
      ).rejects.toThrow();
    });

    it('3.4 should reject creating an Asset without valid departmentId or locationId', async () => {
      await expect(
        prisma.asset.create({
          data: {
            assetTag: 'AST-ERR-9999',
            name: 'Orphan Machine',
            status: 'AVAILABLE',
            departmentId: 'dept-invalid-404',
            locationId: 'loc-bsl-st',
          },
        }),
      ).rejects.toThrow();
    });

    it('3.5 should reject creating InventoryItem with non-existent locationId', async () => {
      await expect(
        prisma.inventoryItem.create({
          data: {
            sku: 'SKU-ERR-9999',
            name: 'Orphan Consumable',
            quantity: 10,
            locationId: 'loc-invalid-404',
          },
        }),
      ).rejects.toThrow();
    });
  });
});
