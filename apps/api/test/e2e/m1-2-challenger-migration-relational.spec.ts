import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

describe('Challenger M1-2 — Migration Baseline Cleanliness & Relational Integrity Adversarial Suite', () => {
  let prisma: PrismaClient;
  let pool: Pool;
  let isDbAvailable = false;

  const migrationsDir = path.resolve(__dirname, '../../prisma/migrations');

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';

    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    try {
      const adapter = new PrismaPg(pool);
      prisma = new PrismaClient({ adapter });
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;

      // Clean up any lingering test records
      await cleanupTestData();
    } catch (err: unknown) {
      isDbAvailable = false;
      console.warn('PostgreSQL database connection failed in test setup:', err);
    }
  });

  afterAll(async () => {
    if (isDbAvailable && prisma) {
      await cleanupTestData();
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  async function cleanupTestData() {
    try {
      await prisma.$executeRawUnsafe(`
        DELETE FROM "Asset" WHERE id LIKE 'test-challenger-%' OR "assetCode" LIKE 'MOD-CHALLENGER-%' OR subcode LIKE 'SUB-CHALLENGER-%';
        DELETE FROM "CostCenter" WHERE id LIKE 'test-challenger-%' OR code LIKE 'CC-CHALLENGER-%';
      `);
    } catch {
      // Ignore cleanup errors during teardown if tables are clean
    }
  }

  // ==========================================================================
  // 1. MIGRATION DIRECTORY CLEANLINESS
  // ==========================================================================
  describe('1. Migration Cleanliness & Baseline Consolidation', () => {
    it('guarantees no leftover legacy migration folders remain in apps/api/prisma/migrations/', () => {
      expect(fs.existsSync(migrationsDir)).toBe(true);

      const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });

      const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

      const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

      // Must contain migration_lock.toml
      expect(files).toContain('migration_lock.toml');

      // Must contain exactly ONE consolidated baseline migration directory
      expect(directories.length).toBe(1);

      const baselineDirName = directories[0];
      expect(baselineDirName).toMatch(/^\d{14}_init$/);

      // Verify old legacy migration directories are completely absent
      const bannedLegacyDirs = [
        '20260814080308_init',
        '20260910124500_m1_relational_models',
        '20260914061500_add_vendor_relations',
        '20260924103000_remove_asset_specs',
      ];
      for (const banned of bannedLegacyDirs) {
        expect(directories).not.toContain(banned);
      }

      // Verify baseline migration has migration.sql
      const migrationSqlPath = path.join(migrationsDir, baselineDirName, 'migration.sql');
      expect(fs.existsSync(migrationSqlPath)).toBe(true);
      const sqlContent = fs.readFileSync(migrationSqlPath, 'utf8');
      expect(sqlContent.length).toBeGreaterThan(1000);
      expect(sqlContent).toContain('CREATE TABLE "CostCenter"');
      expect(sqlContent).toContain('CREATE TABLE "Asset"');
      expect(sqlContent).toContain('Asset_parentId_fkey');
      expect(sqlContent).toContain('Asset_costCenterId_fkey');
    });
  });

  // ==========================================================================
  // 2. RELATIONAL INTEGRITY: CASCADE DELETION ON PARENT MODEL
  // ==========================================================================
  describe('2. Parent-Child Asset Hierarchy Cascade Deletion', () => {
    it('cascades deletion automatically when a parent model with child units is deleted', async () => {
      if (!isDbAvailable) {
        throw new Error('Database is not available for cascade testing');
      }

      const parentId = 'test-challenger-parent-cascade';
      const parentCode = 'MOD-CHALLENGER-CASCADE-01';
      const child1Id = 'test-challenger-child-cascade-1';
      const child2Id = 'test-challenger-child-cascade-2';
      const child3Id = 'test-challenger-child-cascade-3';

      // 1. Create parent model
      const parent = await prisma.asset.create({
        data: {
          id: parentId,
          assetCode: parentCode,
          name: 'Dell Latitude 5540 Parent Model',
          model: 'Latitude 5540',
          manufacturer: 'Dell',
          status: 'AVAILABLE',
        },
      });
      expect(parent.id).toBe(parentId);

      // 2. Create 3 physical child units linked to parent
      const child1 = await prisma.asset.create({
        data: {
          id: child1Id,
          parentId: parentId,
          subcode: 'SUB-CHALLENGER-CAS-01',
          name: 'Dell Unit 01',
          status: 'AVAILABLE',
        },
      });
      const child2 = await prisma.asset.create({
        data: {
          id: child2Id,
          parentId: parentId,
          subcode: 'SUB-CHALLENGER-CAS-02',
          name: 'Dell Unit 02',
          status: 'AVAILABLE',
        },
      });
      const child3 = await prisma.asset.create({
        data: {
          id: child3Id,
          parentId: parentId,
          subcode: 'SUB-CHALLENGER-CAS-03',
          name: 'Dell Unit 03',
          status: 'AVAILABLE',
        },
      });

      expect(child1.parentId).toBe(parentId);
      expect(child2.parentId).toBe(parentId);
      expect(child3.parentId).toBe(parentId);

      // 3. Verify children exist in DB
      const childrenBefore = await prisma.asset.findMany({
        where: { parentId: parentId },
      });
      expect(childrenBefore.length).toBe(3);

      // 4. Delete the parent model
      const deleteResult = await prisma.asset.delete({
        where: { id: parentId },
      });
      expect(deleteResult.id).toBe(parentId);

      // 5. Verify parent is deleted
      const parentAfter = await prisma.asset.findUnique({
        where: { id: parentId },
      });
      expect(parentAfter).toBeNull();

      // 6. Verify ALL child units were cascade deleted
      const childrenAfter = await prisma.asset.findMany({
        where: { id: { in: [child1Id, child2Id, child3Id] } },
      });
      expect(childrenAfter.length).toBe(0);
    });
  });

  // ==========================================================================
  // 3. RELATIONAL INTEGRITY: COSTCENTER RELATION & ON DELETE SETNULL
  // ==========================================================================
  describe('3. CostCenter Relation & OnDelete SetNull Behavior', () => {
    it('links an asset to a CostCenter and sets costCenterId to null when CostCenter is deleted', async () => {
      if (!isDbAvailable) {
        throw new Error('Database is not available for CostCenter testing');
      }

      const costCenterId = 'test-challenger-cc-setnull';
      const costCenterCode = 'CC-CHALLENGER-SETNULL-01';
      const assetId = 'test-challenger-asset-cc-setnull';
      const subcode = 'SUB-CHALLENGER-CC-SETNULL';

      // 1. Create CostCenter
      const costCenter = await prisma.costCenter.create({
        data: {
          id: costCenterId,
          code: costCenterCode,
          name: 'Engineering Research & Dev',
          description: 'R&D Cost Center for challenger verification',
        },
      });
      expect(costCenter.id).toBe(costCenterId);
      expect(costCenter.code).toBe(costCenterCode);

      // 2. Create Asset linked to CostCenter
      const asset = await prisma.asset.create({
        data: {
          id: assetId,
          subcode: subcode,
          name: 'Developer Laptop with Cost Center',
          costCenterId: costCenterId,
          status: 'AVAILABLE',
        },
      });
      expect(asset.id).toBe(assetId);
      expect(asset.costCenterId).toBe(costCenterId);

      // 3. Query asset with relation include
      const assetWithCc = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { costCenter: true },
      });
      expect(assetWithCc).not.toBeNull();
      expect(assetWithCc?.costCenter?.id).toBe(costCenterId);
      expect(assetWithCc?.costCenter?.code).toBe(costCenterCode);

      // 4. Delete the CostCenter
      const deletedCc = await prisma.costCenter.delete({
        where: { id: costCenterId },
      });
      expect(deletedCc.id).toBe(costCenterId);

      // 5. Verify CostCenter is gone
      const ccAfter = await prisma.costCenter.findUnique({
        where: { id: costCenterId },
      });
      expect(ccAfter).toBeNull();

      // 6. Verify Asset still exists, but costCenterId is set to NULL (onDelete: SetNull)
      const assetAfter = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { costCenter: true },
      });
      expect(assetAfter).not.toBeNull();
      expect(assetAfter?.costCenterId).toBeNull();
      expect(assetAfter?.costCenter).toBeNull();

      // Clean up asset
      await prisma.asset.delete({ where: { id: assetId } });
    });
  });

  // ==========================================================================
  // 4. UNIQUE CONSTRAINTS: ASSETCODE, SUBCODE, AND COSTCENTER CODE
  // ==========================================================================
  describe('4. Strict Unique Constraint Enforcement & Collision Resistance', () => {
    it('enforces strict unique constraint on assetCode (rejects duplicates)', async () => {
      if (!isDbAvailable) {
        throw new Error('Database is not available for unique constraint testing');
      }

      const duplicateCode = 'MOD-CHALLENGER-DUP-01';

      await prisma.asset.create({
        data: {
          id: 'test-challenger-dup-m1',
          assetCode: duplicateCode,
          name: 'Original Model',
          status: 'AVAILABLE',
        },
      });

      let threwError = false;
      try {
        await prisma.asset.create({
          data: {
            id: 'test-challenger-dup-m2',
            assetCode: duplicateCode,
            name: 'Duplicate Model',
            status: 'AVAILABLE',
          },
        });
      } catch (err: unknown) {
        threwError = true;
        expect(err).toBeDefined();
        // Prisma error code P2002 represents unique constraint violation
        if (err && typeof err === 'object' && 'code' in err) {
          expect((err as { code: string }).code).toBe('P2002');
        }
      }

      expect(threwError).toBe(true);
      await prisma.asset.delete({ where: { id: 'test-challenger-dup-m1' } });
    });

    it('enforces strict unique constraint on subcode (rejects duplicates)', async () => {
      if (!isDbAvailable) {
        throw new Error('Database is not available for unique constraint testing');
      }

      const duplicateSubcode = 'SUB-CHALLENGER-DUP-01';

      await prisma.asset.create({
        data: {
          id: 'test-challenger-dup-u1',
          subcode: duplicateSubcode,
          name: 'Original Unit',
          status: 'AVAILABLE',
        },
      });

      let threwError = false;
      try {
        await prisma.asset.create({
          data: {
            id: 'test-challenger-dup-u2',
            subcode: duplicateSubcode,
            name: 'Duplicate Unit',
            status: 'AVAILABLE',
          },
        });
      } catch (err: unknown) {
        threwError = true;
        expect(err).toBeDefined();
        if (err && typeof err === 'object' && 'code' in err) {
          expect((err as { code: string }).code).toBe('P2002');
        }
      }

      expect(threwError).toBe(true);
      await prisma.asset.delete({ where: { id: 'test-challenger-dup-u1' } });
    });

    it('enforces strict unique constraint on CostCenter.code (rejects duplicates)', async () => {
      if (!isDbAvailable) {
        throw new Error('Database is not available for unique constraint testing');
      }

      const duplicateCcCode = 'CC-CHALLENGER-DUP-01';

      await prisma.costCenter.create({
        data: {
          id: 'test-challenger-dup-c1',
          code: duplicateCcCode,
          name: 'Original Cost Center',
        },
      });

      let threwError = false;
      try {
        await prisma.costCenter.create({
          data: {
            id: 'test-challenger-dup-c2',
            code: duplicateCcCode,
            name: 'Duplicate Cost Center',
          },
        });
      } catch (err: unknown) {
        threwError = true;
        expect(err).toBeDefined();
        if (err && typeof err === 'object' && 'code' in err) {
          expect((err as { code: string }).code).toBe('P2002');
        }
      }

      expect(threwError).toBe(true);
      await prisma.costCenter.delete({ where: { id: 'test-challenger-dup-c1' } });
    });

    it('allows coexistence of multiple records with null assetCode and null subcode', async () => {
      if (!isDbAvailable) {
        throw new Error('Database is not available for nullability testing');
      }

      // Models have assetCode, subcode is null
      const m1 = await prisma.asset.create({
        data: {
          id: 'test-challenger-null-m1',
          assetCode: 'MOD-CHALLENGER-NULL-1',
          subcode: null,
          name: 'Model 1',
          status: 'AVAILABLE',
        },
      });
      const m2 = await prisma.asset.create({
        data: {
          id: 'test-challenger-null-m2',
          assetCode: 'MOD-CHALLENGER-NULL-2',
          subcode: null,
          name: 'Model 2',
          status: 'AVAILABLE',
        },
      });

      // Units have subcode, assetCode is null
      const u1 = await prisma.asset.create({
        data: {
          id: 'test-challenger-null-u1',
          assetCode: null,
          subcode: 'SUB-CHALLENGER-NULL-1',
          name: 'Unit 1',
          status: 'AVAILABLE',
        },
      });
      const u2 = await prisma.asset.create({
        data: {
          id: 'test-challenger-null-u2',
          assetCode: null,
          subcode: 'SUB-CHALLENGER-NULL-2',
          name: 'Unit 2',
          status: 'AVAILABLE',
        },
      });

      expect(m1.subcode).toBeNull();
      expect(m2.subcode).toBeNull();
      expect(u1.assetCode).toBeNull();
      expect(u2.assetCode).toBeNull();

      // Clean up
      await prisma.asset.deleteMany({
        where: {
          id: {
            in: [
              'test-challenger-null-m1',
              'test-challenger-null-m2',
              'test-challenger-null-u1',
              'test-challenger-null-u2',
            ],
          },
        },
      });
    });
  });

  // ==========================================================================
  // 5. POSTGRESQL INDEX CATALOG VERIFICATION
  // ==========================================================================
  describe('5. Database Index Catalog Verification in PostgreSQL', () => {
    it('verifies all foreign key and search indexes exist in pg_indexes catalog', async () => {
      if (!isDbAvailable) {
        throw new Error('Database is not available for index catalog verification');
      }

      interface PgIndexRow {
        tablename: string;
        indexname: string;
        indexdef: string;
      }

      const rows = await prisma.$queryRaw<PgIndexRow[]>`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename IN ('Asset', 'CostCenter')
        ORDER BY tablename, indexname;
      `;

      const assetIndexes = rows.filter((r) => r.tablename === 'Asset').map((r) => r.indexname);
      const costCenterIndexes = rows
        .filter((r) => r.tablename === 'CostCenter')
        .map((r) => r.indexname);

      // Verify Asset indexes
      expect(assetIndexes).toContain('Asset_pkey');
      expect(assetIndexes).toContain('Asset_parentId_idx');
      expect(assetIndexes).toContain('Asset_costCenterId_idx');
      expect(assetIndexes).toContain('Asset_assetCode_idx');
      expect(assetIndexes).toContain('Asset_assetCode_key');
      expect(assetIndexes).toContain('Asset_subcode_idx');
      expect(assetIndexes).toContain('Asset_subcode_key');
      expect(assetIndexes).toContain('Asset_serialNumber_idx');
      expect(assetIndexes).toContain('Asset_status_idx');
      expect(assetIndexes).toContain('Asset_warrantyExpiry_idx');

      // Verify CostCenter indexes
      expect(costCenterIndexes).toContain('CostCenter_pkey');
      expect(costCenterIndexes).toContain('CostCenter_code_idx');
      expect(costCenterIndexes).toContain('CostCenter_code_key');
    });
  });
});
