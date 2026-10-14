import * as dotenv from 'dotenv';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseError, Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

describe('Milestone 1 Rebuild — Database Referential Integrity & Invariants Suite (challenger_m1_2)', () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;
  let isDbAvailable = false;

  const TEST_PREFIX = `CHAL_INV_${Date.now()}`;

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
      adapter = new PrismaPg(pool);
      prisma = new PrismaClient({ adapter });
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch (err: unknown) {
      isDbAvailable = false;
      console.error('Database connection failed in beforeAll:', err);
    }
  });

  afterAll(async () => {
    if (!isDbAvailable) return;

    try {
      // Clean up any test records created during testing
      await pool.query(`
        DELETE FROM "AssetHandoverRecord" WHERE notes LIKE '${TEST_PREFIX}%';
        DELETE FROM "Asset" WHERE "assetTag" LIKE '${TEST_PREFIX}%' OR subcode LIKE '${TEST_PREFIX}%';
        DELETE FROM "DeviceModel" WHERE "modelCode" LIKE '${TEST_PREFIX}%';
        DELETE FROM "AssetCategory" WHERE name LIKE '${TEST_PREFIX}%';
        DELETE FROM "Vendor" WHERE name LIKE '${TEST_PREFIX}%';
      `);
    } catch (cleanErr: unknown) {
      console.warn('Cleanup warning:', cleanErr);
    }

    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  // =========================================================================
  // TASK 1: FOREIGN KEY CONSTRAINT ON Asset.deviceModelId
  // =========================================================================
  describe('1. Foreign Key Constraint on Asset(deviceModelId)', () => {
    it('PostgreSQL strictly rejects inserting an Asset with a non-existent deviceModelId (FK violation 23503)', async () => {
      const nonExistentModelId = '00000000-0000-0000-0000-000000000000';
      const fakeAssetTag = `${TEST_PREFIX}_TAG_FK_FAIL`;

      let pgError: DatabaseError | null = null;
      try {
        await pool.query(
          `INSERT INTO "Asset" (id, "deviceModelId", "assetTag", status, "hasPendingRecord", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, 'AVAILABLE', false, NOW(), NOW())`,
          [nonExistentModelId, fakeAssetTag],
        );
      } catch (err: unknown) {
        if (err instanceof DatabaseError) {
          pgError = err;
        }
      }

      expect(pgError).not.toBeNull();
      expect(pgError?.code).toBe('23503'); // foreign_key_violation
      expect(pgError?.constraint).toBe('Asset_deviceModelId_fkey');
      expect(pgError?.detail).toContain('is not present in table "DeviceModel"');
    });

    it('PostgreSQL strictly rejects inserting an Asset with NULL deviceModelId (NOT NULL violation 23502)', async () => {
      const fakeAssetTag = `${TEST_PREFIX}_TAG_NULL_FAIL`;

      let pgError: DatabaseError | null = null;
      try {
        await pool.query(
          `INSERT INTO "Asset" (id, "deviceModelId", "assetTag", status, "hasPendingRecord", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), NULL, $1, 'AVAILABLE', false, NOW(), NOW())`,
          [fakeAssetTag],
        );
      } catch (err: unknown) {
        if (err instanceof DatabaseError) {
          pgError = err;
        }
      }

      expect(pgError).not.toBeNull();
      expect(pgError?.code).toBe('23502'); // not_null_violation
      expect(pgError?.column).toBe('deviceModelId');
    });

    it('Prisma Client strictly throws PrismaClientKnownRequestError P2003 when inserting invalid deviceModelId', async () => {
      const nonExistentModelId = '11111111-1111-1111-1111-111111111111';

      await expect(
        prisma.asset.create({
          data: {
            deviceModelId: nonExistentModelId,
            assetTag: `${TEST_PREFIX}_PRISMA_FK_FAIL`,
            status: 'AVAILABLE',
          },
        }),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

      try {
        await prisma.asset.create({
          data: {
            deviceModelId: nonExistentModelId,
            assetTag: `${TEST_PREFIX}_PRISMA_FK_FAIL_CHECK`,
            status: 'AVAILABLE',
          },
        });
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        const prismaErr = err as Prisma.PrismaClientKnownRequestError;
        expect(prismaErr.code).toBe('P2003');
      }
    });

    it('PostgreSQL rejects updating an existing Asset to a non-existent deviceModelId', async () => {
      // Find any valid existing asset
      const validAsset = await prisma.asset.findFirst({
        select: { id: true, deviceModelId: true },
      });
      expect(validAsset).not.toBeNull();

      let pgError: DatabaseError | null = null;
      try {
        await pool.query(
          `UPDATE "Asset" SET "deviceModelId" = '99999999-9999-9999-9999-999999999999' WHERE id = $1`,
          [validAsset!.id],
        );
      } catch (err: unknown) {
        if (err instanceof DatabaseError) {
          pgError = err;
        }
      }

      expect(pgError).not.toBeNull();
      expect(pgError?.code).toBe('23503'); // foreign_key_violation
      expect(pgError?.constraint).toBe('Asset_deviceModelId_fkey');
    });
  });

  // =========================================================================
  // TASK 2: RESTRICT RULE ON DeviceModel DELETION WITH CHILD ASSETS
  // =========================================================================
  describe('2. Restrict Rule on DeviceModel Deletion with Child Assets', () => {
    let testCategoryId: string;
    let testModelId: string;
    let testAssetId: string;

    beforeAll(async () => {
      // Create a dedicated test category
      const catRes = await pool.query(
        `INSERT INTO "AssetCategory" (id, name, description)
         VALUES (gen_random_uuid(), '${TEST_PREFIX}_CAT', 'Test Category')
         RETURNING id`,
      );
      testCategoryId = catRes.rows[0].id;

      // Create a dedicated test device model
      const modelRes = await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "unitCost", "minThreshold", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), '${TEST_PREFIX}_Model', '${TEST_PREFIX}_MC01', $1, 'Dell', 1200, 5, NOW(), NOW())
         RETURNING id`,
        [testCategoryId],
      );
      testModelId = modelRes.rows[0].id;

      // Create a child physical unit with valid departmentId
      const deptRes = await pool.query(
        `SELECT id FROM "Department" WHERE code = 'DEPT-BSL-MGMT' OR code = 'DEPT-BSH-IT' LIMIT 1`,
      );
      const defaultDeptId = deptRes.rows[0]?.id;

      const assetRes = await pool.query(
        `INSERT INTO "Asset" (id, "deviceModelId", "assetTag", "departmentId", status, "hasPendingRecord", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, '${TEST_PREFIX}_ASSET_RESTRICT', $2, 'AVAILABLE', false, NOW(), NOW())
         RETURNING id`,
        [testModelId, defaultDeptId],
      );
      testAssetId = assetRes.rows[0].id;
    });

    it('PostgreSQL strictly blocks DELETE on DeviceModel having child Asset records with foreign key violation (23503)', async () => {
      let deleteError: DatabaseError | null = null;
      try {
        await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [testModelId]);
      } catch (err: unknown) {
        if (err instanceof DatabaseError) {
          deleteError = err;
        }
      }

      expect(deleteError).not.toBeNull();
      expect(deleteError?.code).toBe('23503'); // foreign_key_violation
      expect(deleteError?.constraint).toBe('Asset_deviceModelId_fkey');
      expect(deleteError?.table).toBe('Asset');
      expect(deleteError?.detail).toContain(`is still referenced from table "Asset"`);

      // Verify records are completely preserved
      const modelCheck = await pool.query(`SELECT id FROM "DeviceModel" WHERE id = $1`, [
        testModelId,
      ]);
      expect(modelCheck.rows.length).toBe(1);

      const assetCheck = await pool.query(`SELECT id FROM "Asset" WHERE id = $1`, [testAssetId]);
      expect(assetCheck.rows.length).toBe(1);
    });

    it('Prisma Client strictly throws P2003 when attempting to delete a DeviceModel with child units', async () => {
      try {
        await prisma.deviceModel.delete({
          where: { id: testModelId },
        });
        expect.unreachable('Should have thrown P2003');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        const pErr = err as Prisma.PrismaClientKnownRequestError;
        expect(pErr.code).toBe('P2003');
      }
    });

    it('allows clean deletion of DeviceModel ONLY after all child Assets are removed', async () => {
      // First delete the child asset
      await pool.query(`DELETE FROM "Asset" WHERE id = $1`, [testAssetId]);

      // Now deleting the DeviceModel must succeed cleanly
      const deleteResult = await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [
        testModelId,
      ]);
      expect(deleteResult.rowCount).toBe(1);

      // Verify it no longer exists
      const checkRes = await pool.query(`SELECT id FROM "DeviceModel" WHERE id = $1`, [
        testModelId,
      ]);
      expect(checkRes.rows.length).toBe(0);
    });
  });

  // =========================================================================
  // TASK 3: INDEX COVERAGE VERIFICATION IN POSTGRESQL CATALOGS (pg_indexes)
  // =========================================================================
  describe('3. PostgreSQL Index Coverage Verification', () => {
    let indexes: Array<{ tablename: string; indexname: string; indexdef: string }>;

    beforeAll(async () => {
      const res = await pool.query(`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('Asset', 'DeviceModel', 'AssetHandoverRecord')
        ORDER BY tablename, indexname;
      `);
      indexes = res.rows;
    });

    it('verifies index exists on Asset(deviceModelId)', () => {
      const match = indexes.find(
        (idx) =>
          idx.tablename === 'Asset' &&
          idx.indexname === 'Asset_deviceModelId_idx' &&
          idx.indexdef.includes('"deviceModelId"'),
      );
      expect(match).toBeDefined();
      expect(match?.indexdef).toMatch(
        /CREATE INDEX "?Asset_deviceModelId_idx"? ON public\."Asset".*\(.*"deviceModelId".*\)/,
      );
    });

    it('verifies index exists on DeviceModel(categoryId)', () => {
      const match = indexes.find(
        (idx) =>
          idx.tablename === 'DeviceModel' &&
          idx.indexname === 'DeviceModel_categoryId_idx' &&
          idx.indexdef.includes('"categoryId"'),
      );
      expect(match).toBeDefined();
      expect(match?.indexdef).toMatch(
        /CREATE INDEX "?DeviceModel_categoryId_idx"? ON public\."DeviceModel".*\(.*"categoryId".*\)/,
      );
    });

    it('verifies index exists on DeviceModel(vendorId)', () => {
      const match = indexes.find(
        (idx) =>
          idx.tablename === 'DeviceModel' &&
          idx.indexname === 'DeviceModel_vendorId_idx' &&
          idx.indexdef.includes('"vendorId"'),
      );
      expect(match).toBeDefined();
      expect(match?.indexdef).toMatch(
        /CREATE INDEX "?DeviceModel_vendorId_idx"? ON public\."DeviceModel".*\(.*"vendorId".*\)/,
      );
    });

    it('verifies composite index exists on AssetHandoverRecord(isPending, createdAt)', () => {
      const match = indexes.find(
        (idx) =>
          idx.tablename === 'AssetHandoverRecord' &&
          idx.indexname === 'AssetHandoverRecord_isPending_createdAt_idx' &&
          idx.indexdef.includes('"isPending"') &&
          idx.indexdef.includes('"createdAt"'),
      );
      expect(match).toBeDefined();
      expect(match?.indexdef).toMatch(
        /CREATE INDEX "?AssetHandoverRecord_isPending_createdAt_idx"? ON public\."AssetHandoverRecord".*\(.*"isPending",\s*"createdAt".*\)/,
      );
    });

    it('verifies complete index coverage on AssetHandoverRecord relations and filters', () => {
      const expectedHandoverIndexes = [
        'AssetHandoverRecord_assetId_idx',
        'AssetHandoverRecord_recipientId_idx',
        'AssetHandoverRecord_isPending_idx',
        'AssetHandoverRecord_type_idx',
        'AssetHandoverRecord_assetId_isPending_idx',
        'AssetHandoverRecord_isPending_createdAt_idx',
      ];

      for (const expectedName of expectedHandoverIndexes) {
        const found = indexes.find(
          (idx) => idx.tablename === 'AssetHandoverRecord' && idx.indexname === expectedName,
        );
        expect(found, `Expected index ${expectedName} on AssetHandoverRecord`).toBeDefined();
      }
    });

    it('verifies information_schema referential constraints confirm exact delete rules', async () => {
      const fkRes = await pool.query(`
        SELECT
          tc.table_name, kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule, tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON rc.unique_constraint_name = ccu.constraint_name
          AND rc.constraint_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name IN ('Asset', 'DeviceModel', 'AssetHandoverRecord')
        ORDER BY tc.table_name, kcu.column_name;
      `);

      const fks = fkRes.rows;

      // 1. Asset.deviceModelId -> DeviceModel.id (RESTRICT)
      const assetModelFk = fks.find(
        (f) => f.table_name === 'Asset' && f.column_name === 'deviceModelId',
      );
      expect(assetModelFk).toBeDefined();
      expect(assetModelFk.foreign_table_name).toBe('DeviceModel');
      expect(assetModelFk.delete_rule).toBe('RESTRICT');

      // 2. DeviceModel.categoryId -> AssetCategory.id (RESTRICT)
      const modelCatFk = fks.find(
        (f) => f.table_name === 'DeviceModel' && f.column_name === 'categoryId',
      );
      expect(modelCatFk).toBeDefined();
      expect(modelCatFk.foreign_table_name).toBe('AssetCategory');
      expect(modelCatFk.delete_rule).toBe('RESTRICT');

      // 3. DeviceModel.vendorId -> Vendor.id (SET NULL)
      const modelVendorFk = fks.find(
        (f) => f.table_name === 'DeviceModel' && f.column_name === 'vendorId',
      );
      expect(modelVendorFk).toBeDefined();
      expect(modelVendorFk.foreign_table_name).toBe('Vendor');
      expect(modelVendorFk.delete_rule).toBe('SET NULL');

      // 4. AssetHandoverRecord.assetId -> Asset.id (CASCADE)
      const handoverAssetFk = fks.find(
        (f) => f.table_name === 'AssetHandoverRecord' && f.column_name === 'assetId',
      );
      expect(handoverAssetFk).toBeDefined();
      expect(handoverAssetFk.foreign_table_name).toBe('Asset');
      expect(handoverAssetFk.delete_rule).toBe('CASCADE');
    });
  });

  // =========================================================================
  // TASK 4: ADVERSARIAL STRESS-TESTS & CASCADE / SET-NULL EDGE CASES
  // =========================================================================
  describe('4. Adversarial Stress-Tests & Additional Referential Invariants', () => {
    it('rejects duplicate modelCode on DeviceModel with unique violation (23505)', async () => {
      // Find an existing category
      const cat = await prisma.assetCategory.findFirst();
      expect(cat).not.toBeNull();

      const uniqueCode = `${TEST_PREFIX}_DUP_CODE`;

      // First insert
      await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Model 1', $1, $2, 'Dell', NOW(), NOW())`,
        [uniqueCode, cat!.id],
      );

      // Second insert with exact same modelCode must fail
      let dupError: DatabaseError | null = null;
      try {
        await pool.query(
          `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'Model 2', $1, $2, 'Lenovo', NOW(), NOW())`,
          [uniqueCode, cat!.id],
        );
      } catch (err: unknown) {
        if (err instanceof DatabaseError) {
          dupError = err;
        }
      }

      expect(dupError).not.toBeNull();
      expect(dupError?.code).toBe('23505'); // unique_violation
      expect(dupError?.constraint).toBe('DeviceModel_modelCode_key');
    });

    it('cascades deletion cleanly from Asset to child AssetHandoverRecord rows', async () => {
      // Create a temporary model
      const cat = await prisma.assetCategory.findFirst();
      const model = await prisma.deviceModel.create({
        data: {
          name: `${TEST_PREFIX} Cascade Parent`,
          modelCode: `${TEST_PREFIX}_CASCADE_MC`,
          categoryId: cat!.id,
          manufacturer: 'Apple',
        },
      });

      // Create an asset
      const asset = await prisma.asset.create({
        data: {
          deviceModelId: model.id,
          assetTag: `${TEST_PREFIX}_CASCADE_TAG`,
          status: 'AVAILABLE',
        },
      });

      // Create 3 handover records under this asset
      await pool.query(
        `INSERT INTO "AssetHandoverRecord" (id, "assetId", type, "isPending", notes, "createdAt", "updatedAt")
         VALUES
           (gen_random_uuid(), $1, 'ASSIGNMENT', true, '${TEST_PREFIX} note 1', NOW(), NOW()),
           (gen_random_uuid(), $1, 'RETURN', false, '${TEST_PREFIX} note 2', NOW(), NOW()),
           (gen_random_uuid(), $1, 'ASSIGNMENT', true, '${TEST_PREFIX} note 3', NOW(), NOW())`,
        [asset.id],
      );

      const handoverCountBefore = await pool.query(
        `SELECT COUNT(*) FROM "AssetHandoverRecord" WHERE "assetId" = $1`,
        [asset.id],
      );
      expect(Number(handoverCountBefore.rows[0].count)).toBe(3);

      // Now delete the asset
      await pool.query(`DELETE FROM "Asset" WHERE id = $1`, [asset.id]);

      // All 3 handover records MUST be cascaded and deleted automatically
      const handoverCountAfter = await pool.query(
        `SELECT COUNT(*) FROM "AssetHandoverRecord" WHERE "assetId" = $1`,
        [asset.id],
      );
      expect(Number(handoverCountAfter.rows[0].count)).toBe(0);

      // Clean up model
      await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [model.id]);
    });

    it('sets vendorId to NULL when referenced Vendor is deleted (SET NULL)', async () => {
      const cat = await prisma.assetCategory.findFirst();

      // Create a temporary vendor
      const vendorRes = await pool.query(
        `INSERT INTO "Vendor" (id, name, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), '${TEST_PREFIX}_Vendor', NOW(), NOW())
         RETURNING id`,
      );
      const vendorId = vendorRes.rows[0].id;

      // Create a DeviceModel linked to this vendor
      const modelRes = await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", "vendorId", manufacturer, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), '${TEST_PREFIX}_Vendor_Model', '${TEST_PREFIX}_VM01', $1, $2, 'HP', NOW(), NOW())
         RETURNING id`,
        [cat!.id, vendorId],
      );
      const modelId = modelRes.rows[0].id;

      // Delete the vendor
      await pool.query(`DELETE FROM "Vendor" WHERE id = $1`, [vendorId]);

      // DeviceModel must still exist, but vendorId must now be NULL
      const modelAfter = await pool.query(
        `SELECT id, "vendorId" FROM "DeviceModel" WHERE id = $1`,
        [modelId],
      );
      expect(modelAfter.rows.length).toBe(1);
      expect(modelAfter.rows[0].vendorId).toBeNull();

      // Clean up
      await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [modelId]);
    });

    it('blocks deleting AssetCategory if referenced by a DeviceModel (RESTRICT)', async () => {
      // Create a temporary category
      const catRes = await pool.query(
        `INSERT INTO "AssetCategory" (id, name, description)
         VALUES (gen_random_uuid(), '${TEST_PREFIX}_CAT_RESTRICT', 'Restricted Category')
         RETURNING id`,
      );
      const catId = catRes.rows[0].id;

      // Create a DeviceModel in this category
      const modelRes = await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), '${TEST_PREFIX}_Model_In_Cat', '${TEST_PREFIX}_MIC01', $1, 'Dell', NOW(), NOW())
         RETURNING id`,
        [catId],
      );
      const modelId = modelRes.rows[0].id;

      // Deleting category must be blocked by RESTRICT rule
      let catDeleteError: DatabaseError | null = null;
      try {
        await pool.query(`DELETE FROM "AssetCategory" WHERE id = $1`, [catId]);
      } catch (err: unknown) {
        if (err instanceof DatabaseError) {
          catDeleteError = err;
        }
      }

      expect(catDeleteError).not.toBeNull();
      expect(catDeleteError?.code).toBe('23503');
      expect(catDeleteError?.constraint).toBe('DeviceModel_categoryId_fkey');

      // Cleanup: delete model first, then category
      await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [modelId]);
      await pool.query(`DELETE FROM "AssetCategory" WHERE id = $1`, [catId]);
    });
  });
});
