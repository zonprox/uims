#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve dependencies from apps/api
const require = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';

const pool = new Pool({
  connectionString,
  max: 3,
  connectionTimeoutMillis: 5000,
});

async function main() {
  console.log('=== UIMS M1 Rebuild: Database Invariants Verification ===\n');
  let failures = 0;

  // 1. Verify foreign key: inserting Asset without valid deviceModelId rejected
  try {
    process.stdout.write(
      '1. Testing FK Constraint: inserting Asset with invalid deviceModelId... ',
    );
    await pool.query(
      `INSERT INTO "Asset" (id, "deviceModelId", "assetTag", status, "hasPendingRecord", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'FK_FAIL_TAG', 'AVAILABLE', false, NOW(), NOW())`,
    );
    console.error('FAILED: PostgreSQL accepted invalid deviceModelId!');
    failures++;
  } catch (err) {
    if (err.code === '23503' && err.constraint === 'Asset_deviceModelId_fkey') {
      console.log(
        'PASS (PostgreSQL rejected with 23503 foreign_key_violation on Asset_deviceModelId_fkey)',
      );
    } else {
      console.error(`FAILED: Unexpected error code: ${err.code} / ${err.message}`);
      failures++;
    }
  }

  // 2. Verify Restrict rule: deleting DeviceModel with child Asset blocked
  let testModelId = null;
  let testAssetId = null;
  try {
    process.stdout.write('2. Testing RESTRICT Rule: deleting DeviceModel with child Asset... ');
    const catRes = await pool.query(`SELECT id FROM "AssetCategory" LIMIT 1;`);
    const catId = catRes.rows[0].id;

    const modelRes = await pool.query(
      `INSERT INTO "DeviceModel" (id, name, "modelCode", "categoryId", manufacturer, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'Test Restrict Model', 'RESTRICT_MC_TEST', $1, 'Dell', NOW(), NOW())
       RETURNING id;`,
      [catId],
    );
    testModelId = modelRes.rows[0].id;

    const assetRes = await pool.query(
      `INSERT INTO "Asset" (id, "deviceModelId", "assetTag", status, "hasPendingRecord", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'RESTRICT_ASSET_TAG', 'AVAILABLE', false, NOW(), NOW())
       RETURNING id;`,
      [testModelId],
    );
    testAssetId = assetRes.rows[0].id;

    // Attempt delete
    await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1;`, [testModelId]);
    console.error('FAILED: PostgreSQL permitted deleting DeviceModel that has child Asset!');
    failures++;
  } catch (err) {
    if (err.code === '23503' && err.constraint === 'Asset_deviceModelId_fkey') {
      console.log('PASS (PostgreSQL blocked with 23503 foreign_key_violation RESTRICT)');
    } else {
      console.error(`FAILED: Unexpected error: ${err.code} / ${err.message}`);
      failures++;
    }
  } finally {
    if (testAssetId) {
      await pool.query(`DELETE FROM "Asset" WHERE id = $1;`, [testAssetId]).catch(() => {});
    }
    if (testModelId) {
      await pool.query(`DELETE FROM "DeviceModel" WHERE id = $1;`, [testModelId]).catch(() => {});
    }
  }

  // 3. Verify Index Coverage
  process.stdout.write('3. Testing Index Coverage in pg_indexes:\n');
  const indexQueries = [
    { table: 'Asset', index: 'Asset_deviceModelId_idx', column: 'deviceModelId' },
    { table: 'DeviceModel', index: 'DeviceModel_categoryId_idx', column: 'categoryId' },
    { table: 'DeviceModel', index: 'DeviceModel_vendorId_idx', column: 'vendorId' },
    {
      table: 'AssetHandoverRecord',
      index: 'AssetHandoverRecord_isPending_createdAt_idx',
      column: 'isPending, createdAt',
    },
  ];

  for (const item of indexQueries) {
    const res = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2;`,
      [item.table, item.index],
    );
    if (res.rows.length === 1) {
      console.log(`   - [PASS] ${item.table}.${item.index} exists: ${res.rows[0].indexdef}`);
    } else {
      console.error(`   - [FAIL] ${item.table}.${item.index} NOT FOUND in pg_indexes!`);
      failures++;
    }
  }

  await pool.end();

  if (failures > 0) {
    console.error(`\nOVERALL VERDICT: FAILED (${failures} invariant checks failed)`);
    process.exit(1);
  } else {
    console.log('\nOVERALL VERDICT: ALL INVARIANTS PASS EMPIRICALLY (APPROVE)');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
