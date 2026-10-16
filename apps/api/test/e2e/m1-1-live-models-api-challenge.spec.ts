import * as path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../../src/common/filters/prisma-exception.filter';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { createValidationPipe } from '../../src/common/pipes/validation-pipe.factory';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DB_URL =
  process.env.DATABASE_URL || 'postgresql://uims:uims_secret_2026@localhost:5433/uims_db';

describe('Milestone 1 — Device Models API & Query Filter Empirical Challenge Suite', () => {
  let BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3002/api/v1';
  let accessToken: string;
  let pool: pg.Pool;
  let isApiLive = false;
  let ephemeralApp: INestApplication | null = null;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DB_URL });

    try {
      const healthRes = await fetch(`${BASE_URL}/health`);
      if (healthRes.ok) {
        isApiLive = true;
      }
    } catch {
      isApiLive = false;
    }

    if (!isApiLive) {
      ephemeralApp = await NestFactory.create(AppModule, { logger: false });
      ephemeralApp.setGlobalPrefix('api/v1');
      ephemeralApp.useGlobalPipes(createValidationPipe());
      ephemeralApp.useGlobalInterceptors(new TransformInterceptor());
      ephemeralApp.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());
      await ephemeralApp.listen(0, '127.0.0.1');
      const serverAddress = ephemeralApp.getHttpServer().address();
      const boundPort =
        typeof serverAddress === 'object' && serverAddress ? serverAddress.port : 3002;
      BASE_URL = `http://127.0.0.1:${boundPort}/api/v1`;
      isApiLive = true;
    }

    if (isApiLive) {
      const adminPassword =
        process.env.INITIAL_ADMIN_PASSWORD || process.env.INITIAL_DEMO_PASSWORD || 'Youngone@2026';
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@youngonevn.com', password: adminPassword }),
      });
      const loginData = (await loginRes.json()) as { data?: { accessToken?: string } };
      accessToken = loginData.data?.accessToken || '';
    }
  });

  afterAll(async () => {
    if (ephemeralApp) {
      await ephemeralApp.close();
    }
    if (pool) {
      await pool.end();
    }
  });

  describe('1. Challenge: GET /api/v1/assets/models?pageSize=100 & Unit Integrity', () => {
    it('returns HTTP 200 with standard envelope structure and total = 38', async () => {
      expect(isApiLive).toBe(true);
      expect(accessToken).toBeTruthy();

      const res = await fetch(`${BASE_URL}/assets/models?pageSize=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status).toBe(200);

      const json = (await res.json()) as {
        success: boolean;
        data: {
          items: Array<Record<string, unknown>>;
          total: number;
          page: number;
          pageSize: number;
        };
        timestamp: string;
      };

      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.items)).toBe(true);
      expect(json.data.total).toBe(38);
      expect(json.data.items.length).toBe(38);
      expect(json.timestamp).toBeDefined();
    });

    it('verifies all 38 models return with non-zero totalUnits exactly matching PostgreSQL counts', async () => {
      const res = await fetch(`${BASE_URL}/assets/models?pageSize=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = (await res.json()) as {
        data: {
          items: Array<{
            id: string;
            modelCode: string;
            totalUnits: number;
            availableUnits: number;
            inUseUnits: number;
            maintenanceUnits: number;
          }>;
        };
      };

      const models = json.data.items;
      expect(models.length).toBe(38);

      for (const m of models) {
        // Must be non-zero
        expect(m.totalUnits).toBeGreaterThan(0);

        // Ground-truth query in PostgreSQL
        const dbRes = await pool.query(
          `SELECT count(*) as total,
                  count(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available,
                  count(CASE WHEN status = 'IN_USE' THEN 1 END) as in_use,
                  count(CASE WHEN status = 'MAINTENANCE' THEN 1 END) as maintenance
           FROM "Asset" WHERE "deviceModelId" = $1`,
          [m.id],
        );

        const dbRow = dbRes.rows[0];
        const dbTotal = parseInt(dbRow.total, 10);
        const dbAvail = parseInt(dbRow.available, 10);
        const dbInUse = parseInt(dbRow.in_use, 10);
        const dbMaint = parseInt(dbRow.maintenance, 10);

        expect(m.totalUnits).toBe(dbTotal);
        expect(m.availableUnits).toBe(dbAvail);
        expect(m.inUseUnits).toBe(dbInUse);
        expect(m.maintenanceUnits).toBe(dbMaint);
      }
    });
  });

  describe('2. Challenge: GET /api/v1/assets?modelId=<id> Filtering & Alias Parity', () => {
    it('returns HTTP 200 (no 400 validation error) and accurately filters child units for all models', async () => {
      const modelsRes = await fetch(`${BASE_URL}/assets/models?pageSize=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const modelsJson = (await modelsRes.json()) as {
        data: { items: Array<{ id: string; totalUnits: number }> };
      };

      for (const m of modelsJson.data.items) {
        // 1. Query with modelId alias
        const resModelId = await fetch(`${BASE_URL}/assets?modelId=${m.id}&pageSize=100`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        expect(resModelId.status).toBe(200);

        const dataModelId = (await resModelId.json()) as {
          data: Array<{ id: string; deviceModelId: string }>;
        };
        const items = Array.isArray(dataModelId.data) ? dataModelId.data : [];

        expect(items.length).toBe(m.totalUnits);
        for (const unit of items) {
          expect(unit.deviceModelId).toBe(m.id);
        }

        // 2. Query with primary parameter deviceModelId
        const resDeviceModelId = await fetch(
          `${BASE_URL}/assets?deviceModelId=${m.id}&pageSize=100`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        expect(resDeviceModelId.status).toBe(200);

        const dataDeviceModelId = (await resDeviceModelId.json()) as {
          data: Array<{ id: string; deviceModelId: string }>;
        };
        const primaryItems = Array.isArray(dataDeviceModelId.data) ? dataDeviceModelId.data : [];

        expect(items.length).toBe(primaryItems.length);
      }
    });
  });

  describe('3. Challenge: Edge Case Queries & Security Boundaries', () => {
    it('rejects unauthenticated requests with HTTP 401 Unauthorized', async () => {
      const res1 = await fetch(`${BASE_URL}/assets/models`);
      expect(res1.status).toBe(401);

      const res2 = await fetch(`${BASE_URL}/assets/models`, {
        headers: { Authorization: 'Bearer forged.or.invalid.token' },
      });
      expect(res2.status).toBe(401);

      const res3 = await fetch(`${BASE_URL}/assets`);
      expect(res3.status).toBe(401);
    });

    it('rejects unwhitelisted query parameters with HTTP 400 Bad Request', async () => {
      const res = await fetch(`${BASE_URL}/assets?unwhitelistedParam=malicious`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status).toBe(400);

      const json = (await res.json()) as { message: string | string[] };
      expect(json.message).toBeDefined();
    });

    it('safely handles non-existent UUIDs returning empty array with HTTP 200', async () => {
      const res = await fetch(`${BASE_URL}/assets?modelId=00000000-0000-0000-0000-000000000000`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status).toBe(200);

      const json = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(0);
    });

    it('safely handles non-UUID strings returning empty array with HTTP 200', async () => {
      const res = await fetch(`${BASE_URL}/assets?modelId=non-existent-arbitrary-string`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.status).toBe(200);

      const json = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(0);
    });

    it('safely escapes SQL injection payloads without executing or leaking data', async () => {
      const res1 = await fetch(`${BASE_URL}/assets?modelId=%27%20OR%20%271%27=%271`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res1.status).toBe(200);
      const json1 = (await res1.json()) as { data: unknown[] };
      expect(json1.data.length).toBe(0);

      const res2 = await fetch(
        `${BASE_URL}/assets?modelId=%27;%20DROP%20TABLE%20%22Asset%22;%20--`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      expect(res2.status).toBe(200);
      const json2 = (await res2.json()) as { data: unknown[] };
      expect(json2.data.length).toBe(0);

      // Verify Asset table is intact in DB
      const dbRes = await pool.query('SELECT count(*) FROM "Asset"');
      expect(parseInt(dbRes.rows[0].count, 10)).toBeGreaterThan(0);
    });

    it('resolves conflicting modelId and deviceModelId deterministically in favor of deviceModelId', async () => {
      const dell5420Res = await pool.query(
        `SELECT id FROM "DeviceModel" WHERE "modelCode" = 'MOD-DELL-5420' LIMIT 1`,
      );
      const dell7420Res = await pool.query(
        `SELECT id FROM "DeviceModel" WHERE "modelCode" = 'MOD-DELL-7420' LIMIT 1`,
      );
      const modelDell5420 = dell5420Res.rows[0].id;
      const modelDell7420 = dell7420Res.rows[0].id;

      const res = await fetch(
        `${BASE_URL}/assets?deviceModelId=${modelDell5420}&modelId=${modelDell7420}&pageSize=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      expect(res.status).toBe(200);

      const json = (await res.json()) as { data: Array<{ deviceModelId: string }> };
      expect(json.data.length).toBe(20);
      for (const unit of json.data) {
        expect(unit.deviceModelId).toBe(modelDell5420);
      }
    });

    it('validates pageSize boundaries on /assets/models (rejects 0, -1, >100)', async () => {
      const resZero = await fetch(`${BASE_URL}/assets/models?pageSize=0`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(resZero.status).toBe(400);

      const resNeg = await fetch(`${BASE_URL}/assets/models?pageSize=-1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(resNeg.status).toBe(400);

      const resHuge = await fetch(`${BASE_URL}/assets/models?pageSize=1000`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(resHuge.status).toBe(400);
    });

    it('properly validates DeviceModel creation: requires modelCode or assetCode, rejects duplicates', async () => {
      // 1. Missing both modelCode and assetCode
      const resEmpty = await fetch(`${BASE_URL}/assets/models`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Challenger Empty Code Model',
          categoryId: 'cat-laptop',
        }),
      });
      expect(resEmpty.status).toBe(400);

      // 2. Duplicate modelCode
      const resDup = await fetch(`${BASE_URL}/assets/models`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Duplicate Model',
          modelCode: 'MOD-DELL-5420',
          categoryId: 'cat-laptop',
          manufacturer: 'Dell',
        }),
      });
      expect(resDup.status).toBe(409);

      // 3. Valid creation with assetCode alias
      const testCode = `TEST-CHALLENGE-${Date.now()}`;
      const resCreate = await fetch(`${BASE_URL}/assets/models`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Challenger Valid Model',
          assetCode: testCode,
          categoryId: 'cat-laptop',
          manufacturer: 'Challenger Corp',
        }),
      });
      expect(resCreate.status).toBe(201);
      const createdData = (await resCreate.json()) as {
        data?: { id?: string; modelCode?: string };
      };
      expect(createdData.data?.modelCode).toBe(testCode);

      // 4. Cleanup
      if (createdData.data?.id) {
        const delRes = await fetch(`${BASE_URL}/assets/models/${createdData.data.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        expect(delRes.status).toBe(200);
      }
    });
  });
});
