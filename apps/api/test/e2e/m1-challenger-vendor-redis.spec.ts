import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { envSchema, getAppConfig } from '../../src/config/app.config';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

interface PgIndexRow {
  indexname: string;
  tablename: string;
  indexdef: string;
}

interface FkConstraintRow {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  constraint_name: string;
  delete_rule: string;
  update_rule: string;
}

interface PostgresDatabaseError {
  code: string;
  constraint?: string;
  detail?: string;
  message: string;
}

const isPostgresError = (error: unknown): error is PostgresDatabaseError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
};

describe('Milestone 1 Challenger M1-2 — Vendor Relational Integrity & Production Redis Validation Suite', () => {
  let prisma: PrismaClient;
  let pgPool: Pool;
  let isDbAvailable = false;

  const validBaseConfig = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public',
    JWT_SECRET: 'jwt-secret-minimum-32-characters-secure-key-2026',
    JWT_REFRESH_SECRET: 'jwt-refresh-secret-minimum-32-characters-2026',
    AUDIT_SIGNING_KEY: 'audit-signing-key-minimum-32-characters-2026',
  };

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';

    try {
      pgPool = new Pool({ connectionString });
      const adapter = new PrismaPg(pgPool);
      prisma = new PrismaClient({ adapter });

      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch {
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (isDbAvailable) {
      if (prisma) {
        await prisma.$disconnect();
      }
      if (pgPool) {
        await pgPool.end();
      }
    }
  });

  // =========================================================================
  // EXPERIMENT 1: VENDOR RELATIONAL INTEGRITY
  // =========================================================================
  describe('Experiment 1: Vendor Relational Integrity', () => {
    // -----------------------------------------------------------------------
    // 1.1 Index Verification in PostgreSQL Catalog
    // -----------------------------------------------------------------------
    describe('1.1 PostgreSQL Catalog Index Verification', () => {
      it('should verify Asset_vendorId_idx exists on Asset table with btree method', async () => {
        if (!isDbAvailable) return;

        const indexes = await prisma.$queryRaw<Array<PgIndexRow>>`
          SELECT indexname, tablename, indexdef 
          FROM pg_indexes 
          WHERE tablename = 'Asset' AND indexname = 'Asset_vendorId_idx';
        `;

        expect(indexes.length).toBe(1);
        expect(indexes[0].indexname).toBe('Asset_vendorId_idx');
        expect(indexes[0].tablename).toBe('Asset');
        expect(indexes[0].indexdef).toContain('USING btree ("vendorId")');
      });

      it('should verify License_vendorId_idx exists on License table with btree method', async () => {
        if (!isDbAvailable) return;

        const indexes = await prisma.$queryRaw<Array<PgIndexRow>>`
          SELECT indexname, tablename, indexdef 
          FROM pg_indexes 
          WHERE tablename = 'License' AND indexname = 'License_vendorId_idx';
        `;

        expect(indexes.length).toBe(1);
        expect(indexes[0].indexname).toBe('License_vendorId_idx');
        expect(indexes[0].tablename).toBe('License');
        expect(indexes[0].indexdef).toContain('USING btree ("vendorId")');
      });

      it('should verify Vendor_name_idx exists on Vendor table with btree method', async () => {
        if (!isDbAvailable) return;

        const indexes = await prisma.$queryRaw<Array<PgIndexRow>>`
          SELECT indexname, tablename, indexdef 
          FROM pg_indexes 
          WHERE tablename = 'Vendor' AND indexname = 'Vendor_name_idx';
        `;

        expect(indexes.length).toBe(1);
        expect(indexes[0].indexname).toBe('Vendor_name_idx');
        expect(indexes[0].tablename).toBe('Vendor');
        expect(indexes[0].indexdef).toContain('USING btree (name)');
      });

      it('should verify Foreign Key definitions in PostgreSQL referential_constraints catalog', async () => {
        if (!isDbAvailable) return;

        const fkRows = await prisma.$queryRaw<Array<FkConstraintRow>>`
          SELECT 
            tc.table_name,
            kcu.column_name,
            ccu.table_name as foreign_table_name,
            ccu.column_name as foreign_column_name,
            tc.constraint_name,
            rc.delete_rule,
            rc.update_rule
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON rc.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('Asset', 'License')
            AND kcu.column_name = 'vendorId'
          ORDER BY tc.table_name;
        `;

        expect(fkRows.length).toBe(2);

        const assetFk = fkRows.find((r) => r.table_name === 'Asset');
        expect(assetFk).toBeDefined();
        expect(assetFk?.column_name).toBe('vendorId');
        expect(assetFk?.foreign_table_name).toBe('Vendor');
        expect(assetFk?.foreign_column_name).toBe('id');
        expect(assetFk?.constraint_name).toBe('Asset_vendorId_fkey');
        expect(assetFk?.delete_rule).toBe('SET NULL');
        expect(assetFk?.update_rule).toBe('CASCADE');

        const licenseFk = fkRows.find((r) => r.table_name === 'License');
        expect(licenseFk).toBeDefined();
        expect(licenseFk?.column_name).toBe('vendorId');
        expect(licenseFk?.foreign_table_name).toBe('Vendor');
        expect(licenseFk?.foreign_column_name).toBe('id');
        expect(licenseFk?.constraint_name).toBe('License_vendorId_fkey');
        expect(licenseFk?.delete_rule).toBe('SET NULL');
        expect(licenseFk?.update_rule).toBe('CASCADE');
      });
    });

    // -----------------------------------------------------------------------
    // 1.2 Foreign Key Rejection (PostgreSQL 23503 and Prisma P2003)
    // -----------------------------------------------------------------------
    describe('1.2 Foreign Key Constraint Violation Defense', () => {
      it('should reject Asset insertion with non-existent vendorId in PostgreSQL with SQLSTATE 23503', async () => {
        if (!isDbAvailable) return;

        const nonExistentVendorId = '00000000-dead-beef-0000-000000000001';
        let caughtError: unknown = null;

        try {
          await pgPool.query(
            `INSERT INTO "Asset" (id, "assetTag", name, "updatedAt", "vendorId")
             VALUES (gen_random_uuid(), $1, 'Adversarial FK Asset', NOW(), $2)`,
            [`TAG-FK-TEST-${Date.now()}`, nonExistentVendorId],
          );
        } catch (error: unknown) {
          caughtError = error;
        }

        expect(caughtError).not.toBeNull();
        expect(isPostgresError(caughtError)).toBe(true);
        if (isPostgresError(caughtError)) {
          expect(caughtError.code).toBe('23503'); // foreign_key_violation
          expect(caughtError.constraint).toBe('Asset_vendorId_fkey');
          expect(caughtError.detail).toContain(nonExistentVendorId);
          expect(caughtError.detail).toContain('is not present in table "Vendor"');
        }
      });

      it('should reject License insertion with non-existent vendorId in PostgreSQL with SQLSTATE 23503', async () => {
        if (!isDbAvailable) return;

        const nonExistentVendorId = '00000000-dead-beef-0000-000000000002';
        let caughtError: unknown = null;

        try {
          await pgPool.query(
            `INSERT INTO "License" (id, name, "totalSeats", "updatedAt", "vendorId")
             VALUES (gen_random_uuid(), 'Adversarial FK License', 10, NOW(), $1)`,
            [nonExistentVendorId],
          );
        } catch (error: unknown) {
          caughtError = error;
        }

        expect(caughtError).not.toBeNull();
        expect(isPostgresError(caughtError)).toBe(true);
        if (isPostgresError(caughtError)) {
          expect(caughtError.code).toBe('23503'); // foreign_key_violation
          expect(caughtError.constraint).toBe('License_vendorId_fkey');
          expect(caughtError.detail).toContain(nonExistentVendorId);
          expect(caughtError.detail).toContain('is not present in table "Vendor"');
        }
      });

      it('should reject Asset creation via Prisma ORM when vendorId does not exist (P2003)', async () => {
        if (!isDbAvailable) return;

        const nonExistentVendorId = '00000000-dead-beef-0000-000000000003';
        let caughtError: unknown = null;

        try {
          await prisma.asset.create({
            data: {
              assetTag: `TAG-PRISMA-FK-${Date.now()}`,
              name: 'Prisma FK Asset',
              vendorId: nonExistentVendorId,
            },
          });
        } catch (error: unknown) {
          caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        if (caughtError instanceof Prisma.PrismaClientKnownRequestError) {
          expect(caughtError.code).toBe('P2003');
          expect(caughtError.message).toContain(
            'Foreign key constraint violated on the constraint: `Asset_vendorId_fkey`',
          );
        }
      });

      it('should reject License creation via Prisma ORM when vendorId does not exist (P2003)', async () => {
        if (!isDbAvailable) return;

        const nonExistentVendorId = '00000000-dead-beef-0000-000000000004';
        let caughtError: unknown = null;

        try {
          await prisma.license.create({
            data: {
              name: 'Prisma FK License',
              totalSeats: 5,
              vendorId: nonExistentVendorId,
            },
          });
        } catch (error: unknown) {
          caughtError = error;
        }

        expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        if (caughtError instanceof Prisma.PrismaClientKnownRequestError) {
          expect(caughtError.code).toBe('P2003');
          expect(caughtError.message).toContain(
            'Foreign key constraint violated on the constraint: `License_vendorId_fkey`',
          );
        }
      });

      it('should reject updating existing Asset to invalid vendorId with SQLSTATE 23503', async () => {
        if (!isDbAvailable) return;

        const testAsset = await prisma.asset.create({
          data: {
            assetTag: `TAG-UPDATE-ASSET-${Date.now()}`,
            name: 'Asset For FK Update Test',
          },
        });

        const nonExistentVendorId = '00000000-dead-beef-0000-000000000005';
        let assetUpdateError: unknown = null;

        try {
          await pgPool.query('UPDATE "Asset" SET "vendorId" = $1 WHERE id = $2', [
            nonExistentVendorId,
            testAsset.id,
          ]);
        } catch (error: unknown) {
          assetUpdateError = error;
        }

        expect(isPostgresError(assetUpdateError)).toBe(true);
        if (isPostgresError(assetUpdateError)) {
          expect(assetUpdateError.code).toBe('23503');
        }

        await prisma.asset.delete({ where: { id: testAsset.id } });
      });

      it('should reject updating existing License to invalid vendorId with SQLSTATE 23503', async () => {
        if (!isDbAvailable) return;

        const testLicense = await prisma.license.create({
          data: {
            name: 'License For FK Update Test',
            totalSeats: 1,
          },
        });

        const nonExistentVendorId = '00000000-dead-beef-0000-000000000006';
        let licenseUpdateError: unknown = null;

        try {
          await pgPool.query('UPDATE "License" SET "vendorId" = $1 WHERE id = $2', [
            nonExistentVendorId,
            testLicense.id,
          ]);
        } catch (error: unknown) {
          licenseUpdateError = error;
        }

        expect(isPostgresError(licenseUpdateError)).toBe(true);
        if (isPostgresError(licenseUpdateError)) {
          expect(licenseUpdateError.code).toBe('23503');
        }

        await prisma.license.delete({ where: { id: testLicense.id } });
      });
    });

    // -----------------------------------------------------------------------
    // 1.3 Cascade / SetNull on Vendor Deletion
    // -----------------------------------------------------------------------
    describe('1.3 Cascade / SetNull Validation on Vendor Deletion', () => {
      it('should set vendorId to null on both Asset and License when Vendor is deleted, preserving child rows', async () => {
        if (!isDbAvailable) return;

        // 1. Create a dedicated vendor
        const testVendor = await prisma.vendor.create({
          data: {
            name: `SetNull-Test-Vendor-${Date.now()}`,
            contactEmail: 'setnull-test@vendor.com',
          },
        });

        // 2. Associate an Asset and a License with this Vendor
        const testAsset = await prisma.asset.create({
          data: {
            assetTag: `TAG-SETNULL-${Date.now()}`,
            name: 'Asset Associated With Vendor',
            vendorId: testVendor.id,
          },
        });

        const testLicense = await prisma.license.create({
          data: {
            name: 'License Associated With Vendor',
            totalSeats: 15,
            vendorId: testVendor.id,
          },
        });

        // Verify initial associations
        expect(testAsset.vendorId).toBe(testVendor.id);
        expect(testLicense.vendorId).toBe(testVendor.id);

        // 3. Delete the Vendor
        await prisma.vendor.delete({
          where: { id: testVendor.id },
        });

        // Verify Vendor is deleted
        const foundVendor = await prisma.vendor.findUnique({
          where: { id: testVendor.id },
        });
        expect(foundVendor).toBeNull();

        // 4. Verify Asset is preserved and its vendorId became null
        const preservedAsset = await prisma.asset.findUnique({
          where: { id: testAsset.id },
        });
        expect(preservedAsset).not.toBeNull();
        expect(preservedAsset?.id).toBe(testAsset.id);
        expect(preservedAsset?.vendorId).toBeNull();

        // 5. Verify License is preserved and its vendorId became null
        const preservedLicense = await prisma.license.findUnique({
          where: { id: testLicense.id },
        });
        expect(preservedLicense).not.toBeNull();
        expect(preservedLicense?.id).toBe(testLicense.id);
        expect(preservedLicense?.vendorId).toBeNull();

        // 6. Cleanup test records
        await prisma.asset.delete({ where: { id: testAsset.id } });
        await prisma.license.delete({ where: { id: testLicense.id } });
      });

      it('should set vendorId to null across multiple assets and licenses concurrently upon vendor deletion', async () => {
        if (!isDbAvailable) return;

        const vendor = await prisma.vendor.create({
          data: {
            name: `Multi-Child-Vendor-${Date.now()}`,
          },
        });

        // Create 3 assets and 3 licenses
        const assetIds: Array<string> = [];
        const licenseIds: Array<string> = [];

        for (let i = 0; i < 3; i++) {
          const a = await prisma.asset.create({
            data: {
              assetTag: `TAG-MULTI-SETNULL-${Date.now()}-${i}`,
              name: `Multi-Child Asset ${i}`,
              vendorId: vendor.id,
            },
          });
          assetIds.push(a.id);

          const l = await prisma.license.create({
            data: {
              name: `Multi-Child License ${i}`,
              totalSeats: 5,
              vendorId: vendor.id,
            },
          });
          licenseIds.push(l.id);
        }

        // Verify all 6 records reference the vendor
        const preAssets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
        const preLicenses = await prisma.license.findMany({ where: { id: { in: licenseIds } } });
        expect(preAssets.every((a) => a.vendorId === vendor.id)).toBe(true);
        expect(preLicenses.every((l) => l.vendorId === vendor.id)).toBe(true);

        // Delete the parent vendor
        await prisma.vendor.delete({ where: { id: vendor.id } });

        // Verify all 3 assets still exist and have vendorId === null
        const postAssets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
        expect(postAssets.length).toBe(3);
        expect(postAssets.every((a) => a.vendorId === null)).toBe(true);

        // Verify all 3 licenses still exist and have vendorId === null
        const postLicenses = await prisma.license.findMany({ where: { id: { in: licenseIds } } });
        expect(postLicenses.length).toBe(3);
        expect(postLicenses.every((l) => l.vendorId === null)).toBe(true);

        // Cleanup
        await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
        await prisma.license.deleteMany({ where: { id: { in: licenseIds } } });
      });
    });
  });

  // =========================================================================
  // EXPERIMENT 2: PRODUCTION REDIS VALIDATION INVARIANT
  // =========================================================================
  describe('Experiment 2: Production Redis Validation Invariant', () => {
    it('should fail-fast in production mode when REDIS_URL is omitted with exact error message', () => {
      const config = {
        ...validBaseConfig,
        NODE_ENV: 'production',
      };

      const result = envSchema.safeParse(config);
      expect(result.success).toBe(false);

      if (!result.success) {
        const redisIssue = result.error.issues.find((issue) => issue.path.includes('REDIS_URL'));
        expect(redisIssue).toBeDefined();
        expect(redisIssue?.message).toBe('REDIS_URL is required in production environment');
      }

      expect(() => getAppConfig(config)).toThrow('Invalid environment variables');
    });

    it('should fail-fast in production mode when REDIS_URL is empty string with exact error message', () => {
      const config = {
        ...validBaseConfig,
        NODE_ENV: 'production',
        REDIS_URL: '',
      };

      const result = envSchema.safeParse(config);
      expect(result.success).toBe(false);

      if (!result.success) {
        const redisIssue = result.error.issues.find((issue) => issue.path.includes('REDIS_URL'));
        expect(redisIssue).toBeDefined();
        expect(redisIssue?.message).toBe('REDIS_URL is required in production environment');
      }
    });

    it('should fail-fast in production mode when REDIS_URL is whitespace-only with exact error message', () => {
      const config = {
        ...validBaseConfig,
        NODE_ENV: 'production',
        REDIS_URL: '   \t  \n  ',
      };

      const result = envSchema.safeParse(config);
      expect(result.success).toBe(false);

      if (!result.success) {
        const redisIssue = result.error.issues.find((issue) => issue.path.includes('REDIS_URL'));
        expect(redisIssue).toBeDefined();
        expect(redisIssue?.message).toBe('REDIS_URL is required in production environment');
      }
    });

    it('should pass validation in production mode when valid REDIS_URL is provided', () => {
      const redisUrl = 'redis://:prod_password@redis.internal.net:6379/0';
      const config = {
        ...validBaseConfig,
        NODE_ENV: 'production',
        REDIS_URL: redisUrl,
      };

      const result = envSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.REDIS_URL).toBe(redisUrl);
      }

      const parsedConfig = getAppConfig(config);
      expect(parsedConfig.NODE_ENV).toBe('production');
      expect(parsedConfig.REDIS_URL).toBe(redisUrl);
    });

    it('should pass validation in development mode without REDIS_URL', () => {
      const config = {
        ...validBaseConfig,
        NODE_ENV: 'development',
      };

      const result = envSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.REDIS_URL).toBeUndefined();
      }

      const parsedConfig = getAppConfig(config);
      expect(parsedConfig.NODE_ENV).toBe('development');
      expect(parsedConfig.REDIS_URL).toBeUndefined();
    });

    it('should pass validation in test mode without REDIS_URL', () => {
      const config = {
        ...validBaseConfig,
        NODE_ENV: 'test',
      };

      const result = envSchema.safeParse(config);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.NODE_ENV).toBe('test');
        expect(result.data.REDIS_URL).toBeUndefined();
      }

      const parsedConfig = getAppConfig(config);
      expect(parsedConfig.NODE_ENV).toBe('test');
      expect(parsedConfig.REDIS_URL).toBeUndefined();
    });

    it('should pass validation when NODE_ENV is omitted and defaults to development without REDIS_URL', () => {
      const { NODE_ENV: _env, ...configWithoutNodeEnv } = validBaseConfig;

      const result = envSchema.safeParse(configWithoutNodeEnv);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.REDIS_URL).toBeUndefined();
      }
    });

    it('should accept valid REDIS_URL in development or test modes when provided', () => {
      const devWithRedis = {
        ...validBaseConfig,
        NODE_ENV: 'development',
        REDIS_URL: 'redis://localhost:6381',
      };
      const testWithRedis = {
        ...validBaseConfig,
        NODE_ENV: 'test',
        REDIS_URL: 'redis://localhost:6381',
      };

      expect(envSchema.safeParse(devWithRedis).success).toBe(true);
      expect(envSchema.safeParse(testWithRedis).success).toBe(true);
    });
  });
});
