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

    it('1.3 should verify BSH has exactly 8 corporate departments', async () => {
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
    });

    it.skip('1.4 should verify BSL has 1 BC Building, 1 Central Warehouse with FG items in export bays, and exactly 7 Factories (Purged)', async () => {
      // Skipped: Physical locations were purged per user directive
    });

    it('1.5 should verify every factory F1 to F7 has exactly 9 functional departments', async () => {
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

      for (let f = 1; f <= 7; f++) {
        // Functional Departments under Factory F{f}
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
      }
    });
  });

  // =========================================================================
  // 2. REFERENTIAL INTEGRITY & ZERO NULL ASSERTIONS
  // =========================================================================
  describe('Mission 2: Referential Integrity & Zero Null Invariants', () => {
    it('2.1 should assert 0 DirectoryUsers have NULL departmentId or positionId', async () => {
      const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count 
        FROM "DirectoryUser" 
        WHERE "departmentId" IS NULL OR "positionId" IS NULL;
      `;
      expect(Number(count), 'DirectoryUser must have zero null foreign keys').toBe(0);
    });

    it('2.2 should assert 0 Assets have NULL departmentId', async () => {
      const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count 
        FROM "Asset" 
        WHERE "departmentId" IS NULL;
      `;
      expect(Number(count), 'Asset must have zero null departmentId').toBe(0);
    });

    it.skip('2.3 should assert 0 InventoryItems have NULL locationId (Purged)', async () => {
      // Skipped: locationId was purged per user directive
    });

    it('2.4 should assert at least 35 PostgreSQL foreign key constraints exist in the public schema', async () => {
      const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
      `;
      expect(
        Number(count),
        'There must be at least 35 foreign key constraints',
      ).toBeGreaterThanOrEqual(35);
    });

    it('2.5 should assert 0 foreign key constraint violations across all constraints', async () => {
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

      expect(constraints.length).toBeGreaterThanOrEqual(35);

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

    it('2.6 should assert 0 cross-organization mismatches across DirectoryUsers and Assets', async () => {
      // 1. DirectoryUser org alignment
      const mismatchedUsers = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT u.id
        FROM "DirectoryUser" u
        LEFT JOIN "Department" d ON u."departmentId" = d.id
        WHERE d."organizationId" IS NOT NULL AND u."organizationId" != d."organizationId";
      `;
      expect(
        mismatchedUsers.length,
        'Zero DirectoryUsers should have mismatched organization IDs',
      ).toBe(0);

      // 2. User assigned asset org alignment
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

    it('3.3 should reject assigning DirectoryUser to non-existent department', async () => {
      await expect(
        prisma.directoryUser.create({
          data: {
            employeeCode: 'ERR-EMP-9999',
            firstName: 'Invalid',
            lastName: 'User',
            email: 'invalid.user@uims.internal',
            organizationId: 'org-bsl',
            departmentId: 'dept-invalid-404',
            positionId: 'pos-director',
          },
        }),
      ).rejects.toThrow();
    });

    it('3.4 should reject creating an Asset without valid departmentId', async () => {
      await expect(
        prisma.asset.create({
          data: {
            assetTag: 'AST-ERR-9999',
            name: 'Orphan Machine',
            status: 'AVAILABLE',
            departmentId: 'dept-invalid-404',
          },
        }),
      ).rejects.toThrow();
    });

    it.skip('3.5 should reject creating InventoryItem with non-existent locationId (Purged)', async () => {
      // Skipped: locationId was purged per user directive
    });
  });
});
