import * as dotenv from 'dotenv';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

describe('Challenger M1-1 — Adversarial Database Schema & Referential Invariants Stress Suite', () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;
  let isDbAvailable = false;

  const STRESS_PREFIX = `CHAL_STRESS_${Date.now()}`;

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
      await pool.query(`
        DELETE FROM "AssetHandoverRecord" WHERE notes LIKE '${STRESS_PREFIX}%';
        DELETE FROM "Asset" WHERE "assetTag" LIKE '${STRESS_PREFIX}%' OR subcode LIKE '${STRESS_PREFIX}%';
        DELETE FROM "DeviceModel" WHERE "modelCode" LIKE '${STRESS_PREFIX}%';
        DELETE FROM "AssetCategory" WHERE name LIKE '${STRESS_PREFIX}%';
        DELETE FROM "Vendor" WHERE name LIKE '${STRESS_PREFIX}%';
      `);
    } catch (cleanErr: unknown) {
      console.warn('Adversarial cleanup warning:', cleanErr);
    }

    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  // =========================================================================
  // 1. ADVERSARIAL CHALLENGE: FOREIGN KEY REJECTION ON Asset.deviceModelId
  // =========================================================================
  describe('1. Adversarial Challenge: Foreign Key Rejection on Asset(deviceModelId)', () => {
    it('rejects raw SQL insert with missing deviceModelId (NULL)', async () => {
      let err: any = null;
      try {
        await pool.query(
          `INSERT INTO "Asset" (id, "deviceModelId", "assetTag", status, "hasPendingRecord", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), NULL, '${STRESS_PREFIX}_NULL_MODEL', 'AVAILABLE', false, NOW(), NOW())`,
        );
      } catch (e: unknown) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(err.code).toBe('23502'); // not_null_violation
      expect(err.column).toBe('deviceModelId');
    });

    it('rejects raw SQL insert with random non-existent deviceModelId', async () => {
      let err: any = null;
      try {
        await pool.query(
          `INSERT INTO "Asset" (id, "deviceModelId", "assetTag", status, "hasPendingRecord", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'deadbeef-0000-0000-0000-000000000000', '${STRESS_PREFIX}_NON_EXISTENT', 'AVAILABLE', false, NOW(), NOW())`,
        );
      } catch (e: unknown) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(err.code).toBe('23503'); // foreign_key_violation
      expect(err.constraint).toBe('Asset_deviceModelId_fkey');
      expect(err.detail).toContain('is not present in table "DeviceModel"');
    });

    it('rejects raw SQL update attempting to set deviceModelId to NULL', async () => {
      const existing = await prisma.asset.findFirst({ select: { id: true } });
      expect(existing).not.toBeNull();

      let err: any = null;
      try {
        await pool.query(`UPDATE "Asset" SET "deviceModelId" = NULL WHERE id = $1`, [existing!.id]);
      } catch (e: unknown) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(err.code).toBe('23502');
      expect(err.column).toBe('deviceModelId');
    });

    it('rejects raw SQL update attempting to set deviceModelId to invalid ID', async () => {
      const existing = await prisma.asset.findFirst({ select: { id: true } });
      expect(existing).not.toBeNull();

      let err: any = null;
      try {
        await pool.query(
          `UPDATE "Asset" SET "deviceModelId" = 'ffffffff-ffff-ffff-ffff-ffffffffffff' WHERE id = $1`,
          [existing!.id],
        );
      } catch (e: unknown) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(err.code).toBe('23503');
      expect(err.constraint).toBe('Asset_deviceModelId_fkey');
    });

    it('transactionally aborts multi-row batch insert if any row has an invalid deviceModelId', async () => {
      const validModel = await prisma.deviceModel.findFirst({ select: { id: true } });
      expect(validModel).not.toBeNull();

      let batchErr: any = null;
      try {
        await pool.query(`
          INSERT INTO "Asset" (id, "deviceModelId", "assetTag", status, "hasPendingRecord", "createdAt", "updatedAt")
          VALUES
            (gen_random_uuid(), '${validModel!.id}', '${STRESS_PREFIX}_BATCH_OK', 'AVAILABLE', false, NOW(), NOW()),
            (gen_random_uuid(), '00000000-dead-beef-0000-000000000000', '${STRESS_PREFIX}_BATCH_FAIL', 'AVAILABLE', false, NOW(), NOW())
        `);
      } catch (e: unknown) {
        batchErr = e;
      }

      expect(batchErr).not.toBeNull();
      expect(batchErr.code).toBe('23503');

      // Verify the first row was NOT persisted (atomic transaction rollback)
      const checkRes = await pool.query(
        `SELECT id FROM "Asset" WHERE "assetTag" = '${STRESS_PREFIX}_BATCH_OK'`,
      );
      expect(checkRes.rows.length).toBe(0);
    });
  });

  // =========================================================================
  // 2. ADVERSARIAL CHALLENGE: RESTRICT DELETE ON DeviceModel WITH MULTIPLE ASSETS
  // =========================================================================
  describe('2. Adversarial Challenge: RESTRICT Delete on DeviceModel with Multiple Assets', () => {
    let testCatId: string;
    let testModelId: string;
    const testAssetIds: string[] = [];

    beforeAll(async () => {
      // Create category
      const cat = await pool.query(`
        INSERT INTO "AssetCategory" (id, name, description)
        VALUES (gen_random_uuid(), '${STRESS_PREFIX}_CAT_MULTI', 'Stress test category')
        RETURNING id
      `);
      testCatId = cat.rows[0].id;

      // Create model
      const model = await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), '${STRESS_PREFIX}_Model_Multi', '${STRESS_PREFIX}_MCODE_MULTI', $1, 'Dell', NOW(), NOW())
         RETURNING id`,
        [testCatId],
      );
      testModelId = model.rows[0].id;

      // Create 3 assets attached to this model with valid departmentId to preserve monorepo referential integrity
      const deptRes = await pool.query(
        `SELECT id FROM "Department" WHERE code = 'DEPT-BSL-MGMT' OR code = 'DEPT-BSH-IT' LIMIT 1`,
      );
      const defaultDeptId = deptRes.rows[0]?.id;

      for (let i = 1; i <= 3; i++) {
        const a = await pool.query(
          `INSERT INTO "Asset" (id, "deviceModelId", "assetTag", "departmentId", status, "hasPendingRecord", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, '${STRESS_PREFIX}_MULTI_TAG_${i}', $2, 'AVAILABLE', false, NOW(), NOW())
           RETURNING id`,
          [testModelId, defaultDeptId],
        );
        testAssetIds.push(a.rows[0].id);
      }
    });

    it('strictly blocks deletion of DeviceModel when 3 child assets exist (23503)', async () => {
      let err: any = null;
      try {
        await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [testModelId]);
      } catch (e: unknown) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(err.code).toBe('23503');
      expect(err.constraint).toBe('Asset_deviceModelId_fkey');
      expect(err.detail).toContain(`is still referenced from table "Asset"`);
    });

    it('blocks deletion of DeviceModel after deleting 1 of 3 assets (2 remaining)', async () => {
      await pool.query(`DELETE FROM "Asset" WHERE id = $1`, [testAssetIds[0]]);

      let err: any = null;
      try {
        await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [testModelId]);
      } catch (e: unknown) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(err.code).toBe('23503');
    });

    it('blocks deletion of DeviceModel after deleting 2 of 3 assets (1 remaining)', async () => {
      await pool.query(`DELETE FROM "Asset" WHERE id = $1`, [testAssetIds[1]]);

      let err: any = null;
      try {
        await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [testModelId]);
      } catch (e: unknown) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(err.code).toBe('23503');
    });

    it('allows clean deletion of DeviceModel only after ALL child assets are deleted', async () => {
      await pool.query(`DELETE FROM "Asset" WHERE id = $1`, [testAssetIds[2]]);

      const delRes = await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1`, [testModelId]);
      expect(delRes.rowCount).toBe(1);

      // Verify clean deletion
      const check = await pool.query(`SELECT id FROM "DeviceModel" WHERE id = $1`, [testModelId]);
      expect(check.rows.length).toBe(0);

      // Clean up category
      await pool.query(`DELETE FROM "AssetCategory" WHERE id = $1`, [testCatId]);
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL CHALLENGE: UNIQUE modelCode CONSTRAINT & INDEX PRESENCE
  // =========================================================================
  describe('3. Adversarial Challenge: Unique modelCode Constraint & Index Presence', () => {
    let catId: string;

    beforeAll(async () => {
      const cat = await prisma.assetCategory.findFirst({ select: { id: true } });
      expect(cat).not.toBeNull();
      catId = cat!.id;
    });

    it('rejects duplicate modelCode across active DeviceModels with unique violation (23505)', async () => {
      const code = `${STRESS_PREFIX}_UNIQ_1`;

      await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Model Unique 1', $1, $2, 'HP', NOW(), NOW())`,
        [code, catId],
      );

      let err: any = null;
      try {
        await pool.query(
          `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'Model Unique 2', $1, $2, 'Lenovo', NOW(), NOW())`,
          [code, catId],
        );
      } catch (e: unknown) {
        err = e;
      }

      expect(err).not.toBeNull();
      expect(err.code).toBe('23505'); // unique_violation
      expect(err.constraint).toBe('DeviceModel_modelCode_key');
    });

    it('rejects duplicate modelCode even when existing model has deletedAt set (unconditional unique constraint)', async () => {
      const code = `${STRESS_PREFIX}_UNIQ_SOFTDEL`;

      // Insert soft-deleted model
      await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "deletedAt", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Soft Deleted Model', $1, $2, 'HP', NOW(), NOW(), NOW())`,
        [code, catId],
      );

      // Attempt inserting active model with exact same code
      let err: any = null;
      try {
        await pool.query(
          `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), 'Active Model Same Code', $1, $2, 'HP', NOW(), NOW())`,
          [code, catId],
        );
      } catch (e: unknown) {
        err = e;
      }

      expect(err).not.toBeNull();
      expect(err.code).toBe('23505');
      expect(err.constraint).toBe('DeviceModel_modelCode_key');
    });

    it('rejects updating an existing model to collide with another modelCode', async () => {
      const codeA = `${STRESS_PREFIX}_COLLIDE_A`;
      const codeB = `${STRESS_PREFIX}_COLLIDE_B`;

      const m1 = await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Model A', $1, $2, 'HP', NOW(), NOW()) RETURNING id`,
        [codeA, catId],
      );
      await pool.query(
        `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Model B', $1, $2, 'HP', NOW(), NOW()) RETURNING id`,
        [codeB, catId],
      );

      let err: any = null;
      try {
        await pool.query(`UPDATE "DeviceModel" SET "modelCode" = $1 WHERE id = $2`, [
          codeB,
          m1.rows[0].id,
        ]);
      } catch (e: unknown) {
        err = e;
      }

      expect(err).not.toBeNull();
      expect(err.code).toBe('23505');
      expect(err.constraint).toBe('DeviceModel_modelCode_key');
    });

    it('confirms all required B-Tree indexes exist in pg_indexes', async () => {
      const idxRes = await pool.query(`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('Asset', 'DeviceModel', 'AssetHandoverRecord')
      `);

      const indexMap = new Set(idxRes.rows.map((r: { indexname: string }) => r.indexname));

      const mandatoryIndexes = [
        // DeviceModel
        'DeviceModel_pkey',
        'DeviceModel_modelCode_key',
        'DeviceModel_categoryId_idx',
        'DeviceModel_vendorId_idx',
        'DeviceModel_deletedAt_idx',

        // Asset
        'Asset_pkey',
        'Asset_deviceModelId_idx',
        'Asset_status_idx',
        'Asset_assignedToId_idx',
        'Asset_departmentId_idx',
        'Asset_hasPendingRecord_idx',
        'Asset_costCenterId_idx',
        'Asset_assetTag_idx',
        'Asset_assetTag_key',
        'Asset_subcode_idx',
        'Asset_subcode_key',
        'Asset_serialNumber_idx',
        'Asset_status_updatedAt_idx',
        'Asset_warrantyExpiry_idx',

        // AssetHandoverRecord
        'AssetHandoverRecord_pkey',
        'AssetHandoverRecord_assetId_idx',
        'AssetHandoverRecord_recipientId_idx',
        'AssetHandoverRecord_isPending_idx',
        'AssetHandoverRecord_type_idx',
        'AssetHandoverRecord_isPending_createdAt_idx',
        'AssetHandoverRecord_assetId_isPending_idx',
      ];

      for (const idx of mandatoryIndexes) {
        expect(indexMap.has(idx), `Missing mandatory index: ${idx}`).toBe(true);
      }
    });
  });

  // =========================================================================
  // 4. VERIFICATION OF ZERO RESIDUAL LEGACY INVENTORY TABLES
  // =========================================================================
  describe('4. Legacy Inventory Schema Elimination', () => {
    it('confirms zero tables with Inventory in public schema', async () => {
      const res = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE '%Inventory%'
      `);
      expect(res.rows.length).toBe(0);
    });

    it('confirms 100% of Asset records have a valid deviceModelId pointing to DeviceModel', async () => {
      const orphanRes = await pool.query(`
        SELECT count(*)
        FROM "Asset" a
        LEFT JOIN "DeviceModel" dm ON a."deviceModelId" = dm.id
        WHERE dm.id IS NULL
      `);
      expect(Number(orphanRes.rows[0].count)).toBe(0);
    });

    it('confirms database counts match expected canonical seed state', async () => {
      const dmCount = await prisma.deviceModel.count();
      const assetCount = await prisma.asset.count();
      const handoverCount = await prisma.assetHandoverRecord.count();

      expect(dmCount).toBeGreaterThanOrEqual(17);
      expect(assetCount).toBeGreaterThanOrEqual(100);
      expect(handoverCount).toBeGreaterThanOrEqual(50);
    });
  });
});
