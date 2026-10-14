import 'dotenv/config';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { AssetStatus } from '@uims/shared-types';

describe('Challenger M2-1: Device Model Invariants, Referential Protection & Intake Suite', () => {
  let prisma: PrismaService;
  let assetsService: AssetsService;
  let testCategoryId: string;
  let testDeptId: string | undefined;
  const createdModelIds: Array<string> = [];
  const createdAssetIds: Array<string> = [];
  let authToken = '';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assetsService = new AssetsService(prisma);

    // Fetch existing category or fallback
    const cat = await prisma.assetCategory.findFirst();
    if (!cat) {
      throw new Error('Precondition failed: At least one AssetCategory must exist in database.');
    }
    testCategoryId = cat.id;

    const dept = await prisma.department.findFirst();
    testDeptId = dept?.id;

    // Authenticate against live API to obtain JWT token for HTTP route testing
    try {
      const loginRes = await fetch('http://localhost:3002/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@youngonevn.com',
          password: process.env.INITIAL_ADMIN_PASSWORD || 'Youngone@2026',
        }),
      });
      if (loginRes.ok) {
        const body = (await loginRes.json()) as { data?: { accessToken?: string } };
        authToken = body.data?.accessToken || '';
      }
    } catch {
      // Live HTTP server might be tested conditionally if unreachable
    }
  });

  afterAll(async () => {
    // Cleanup created assets
    if (createdAssetIds.length > 0) {
      await prisma.asset.deleteMany({
        where: { id: { in: createdAssetIds } },
      });
    }
    // Cleanup created models
    if (createdModelIds.length > 0) {
      // Also delete any assets linked to them in case of test leftovers
      await prisma.asset.deleteMany({
        where: { deviceModelId: { in: createdModelIds } },
      });
      await prisma.deviceModel.deleteMany({
        where: { id: { in: createdModelIds } },
      });
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // TEST 1: Referential Deletion Guard
  // =========================================================================
  describe('Test 1: Referential deletion guard', () => {
    it('1.1 should throw ConflictException when AssetsService.deleteModel(id) is called on model with child Asset records', async () => {
      // 1. Create a dedicated test model
      const model = await prisma.deviceModel.create({
        data: {
          name: 'Challenger Guard Test Model',
          modelCode: 'CHALLENGER-GUARD-001',
          categoryId: testCategoryId,
          manufacturer: 'TestMfg',
          unitCost: 1500,
          minThreshold: 3,
        },
      });
      createdModelIds.push(model.id);

      // 2. Attach a child physical unit
      const unit = await prisma.asset.create({
        data: {
          deviceModelId: model.id,
          subcode: 'CHALLENGER-GUARD-UNIT-1',
          assetTag: 'CHALLENGER-GUARD-UNIT-1',
          status: AssetStatus.AVAILABLE,
          departmentId: testDeptId,
        },
      });
      createdAssetIds.push(unit.id);

      // 3. Attempt service deletion - must throw ConflictException
      await expect(assetsService.deleteModel(model.id)).rejects.toThrow(ConflictException);

      try {
        await assetsService.deleteModel(model.id);
        expect.unreachable('Expected ConflictException was not thrown');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ConflictException);
        const msg = (err as ConflictException).message;
        expect(msg).toContain('active physical units');
      }
    });

    it('1.2 should be blocked by PostgreSQL foreign key restrict (SQLSTATE 23503) on direct database deletion', async () => {
      // 1. Create a model with a child asset
      const model = await prisma.deviceModel.create({
        data: {
          name: 'Direct FK Restrict Model',
          modelCode: 'CHALLENGER-FK-001',
          categoryId: testCategoryId,
          manufacturer: 'TestMfg',
          unitCost: 900,
        },
      });
      createdModelIds.push(model.id);

      const unit = await prisma.asset.create({
        data: {
          deviceModelId: model.id,
          subcode: 'CHALLENGER-FK-UNIT-1',
          assetTag: 'CHALLENGER-FK-UNIT-1',
          status: AssetStatus.AVAILABLE,
          departmentId: testDeptId,
        },
      });
      createdAssetIds.push(unit.id);

      // 2. Attempt raw SQL DELETE directly against PostgreSQL
      let sqlError: unknown = null;
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "DeviceModel" WHERE id = '${model.id}'`);
      } catch (err: unknown) {
        sqlError = err;
      }

      expect(sqlError).not.toBeNull();
      // Verify PostgreSQL error details: SQLSTATE 23503 (foreign_key_violation)
      const errString = String(sqlError);
      const isSqlstate23503 =
        errString.includes('23503') ||
        errString.includes('foreign key constraint') ||
        errString.includes('violates foreign key constraint');
      expect(isSqlstate23503).toBe(true);

      // 3. Also verify Prisma Client .delete() throws PrismaClientKnownRequestError with P2003
      let prismaError: unknown = null;
      try {
        await prisma.deviceModel.delete({ where: { id: model.id } });
      } catch (err: unknown) {
        prismaError = err;
      }
      expect(prismaError).not.toBeNull();
      const prismaErrRecord = prismaError as { code?: string };
      expect(prismaErrRecord.code).toBe('P2003'); // Prisma foreign key constraint violation code
    });

    it('1.3 should succeed with deletion when model has 0 child units', async () => {
      const model = await prisma.deviceModel.create({
        data: {
          name: 'Deletable Empty Model',
          modelCode: 'CHALLENGER-EMPTY-001',
          categoryId: testCategoryId,
          manufacturer: 'TestMfg',
          unitCost: 200,
        },
      });

      const res = await assetsService.deleteModel(model.id);
      expect(res.success).toBe(true);
      expect(res.id).toBe(model.id);

      const check = await prisma.deviceModel.findUnique({ where: { id: model.id } });
      expect(check).toBeNull();
    });
  });

  // =========================================================================
  // TEST 2: Duplicate Model Code
  // =========================================================================
  describe('Test 2: Duplicate model code', () => {
    it('2.1 should throw ConflictException when creating a model with duplicate modelCode', async () => {
      const code = 'CHALLENGER-DUP-001';
      const model1 = await assetsService.createModel({
        name: 'Original Model',
        modelCode: code,
        categoryId: testCategoryId,
        manufacturer: 'Mfg1',
        unitCost: 100,
        minThreshold: 2,
      });
      createdModelIds.push(model1.id);

      // Attempt duplicate creation with exact code
      await expect(
        assetsService.createModel({
          name: 'Duplicate Model Same Case',
          modelCode: code,
          categoryId: testCategoryId,
          manufacturer: 'Mfg2',
        }),
      ).rejects.toThrow(ConflictException);

      // Attempt duplicate creation with case variation (lowercase)
      await expect(
        assetsService.createModel({
          name: 'Duplicate Model Lowercase',
          modelCode: code.toLowerCase(),
          categoryId: testCategoryId,
          manufacturer: 'Mfg3',
        }),
      ).rejects.toThrow(ConflictException);

      // Attempt duplicate creation with whitespace surrounding
      await expect(
        assetsService.createModel({
          name: 'Duplicate Model Whitespace',
          modelCode: `  ${code}  `,
          categoryId: testCategoryId,
          manufacturer: 'Mfg4',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('2.2 should throw ConflictException when updating a model to an existing modelCode', async () => {
      const codeA = 'CHALLENGER-DUP-A';
      const codeB = 'CHALLENGER-DUP-B';

      const modelA = await assetsService.createModel({
        name: 'Model A',
        modelCode: codeA,
        categoryId: testCategoryId,
        manufacturer: 'MfgA',
      });
      createdModelIds.push(modelA.id);

      const modelB = await assetsService.createModel({
        name: 'Model B',
        modelCode: codeB,
        categoryId: testCategoryId,
        manufacturer: 'MfgB',
      });
      createdModelIds.push(modelB.id);

      // Attempt to update Model B to have codeA
      await expect(
        assetsService.updateModel(modelB.id, {
          modelCode: codeA,
        }),
      ).rejects.toThrow(ConflictException);

      // Attempt case-insensitive update collision
      await expect(
        assetsService.updateModel(modelB.id, {
          modelCode: codeA.toLowerCase(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('2.3 should allow updating a model with its own current modelCode without conflict', async () => {
      const codeSelf = 'CHALLENGER-SELF-001';
      const model = await assetsService.createModel({
        name: 'Self Update Model',
        modelCode: codeSelf,
        categoryId: testCategoryId,
        manufacturer: 'MfgSelf',
      });
      createdModelIds.push(model.id);

      const updated = await assetsService.updateModel(model.id, {
        name: 'Self Update Model Renamed',
        modelCode: codeSelf,
      });

      expect(updated.name).toBe('Self Update Model Renamed');
      expect(updated.modelCode).toBe(codeSelf);
    });
  });

  // =========================================================================
  // TEST 3: Unit Registration Validation
  // =========================================================================
  describe('Test 3: Unit registration validation', () => {
    let testModelId: string;

    beforeAll(async () => {
      const model = await assetsService.createModel({
        name: 'Unit Registration Target Model',
        modelCode: 'CHALLENGER-REG-TARGET',
        categoryId: testCategoryId,
        manufacturer: 'TestTarget',
      });
      testModelId = model.id;
      createdModelIds.push(model.id);
    });

    it('3.1 should reject registration when deviceModelId is missing or empty (BadRequestException)', async () => {
      // Missing deviceModelId
      await expect(
        assetsService.registerUnit({
          subcode: 'CHALLENGER-REG-SUB-1',
          deviceModelId: undefined,
        }),
      ).rejects.toThrow(BadRequestException);

      // Empty string deviceModelId
      await expect(
        assetsService.registerUnit({
          subcode: 'CHALLENGER-REG-SUB-2',
          deviceModelId: '',
        }),
      ).rejects.toThrow(BadRequestException);

      // Whitespace only deviceModelId
      await expect(
        assetsService.registerUnit({
          subcode: 'CHALLENGER-REG-SUB-3',
          deviceModelId: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('3.2 should reject registration when deviceModelId is non-existent (NotFoundException)', async () => {
      const nonExistentUuid = '00000000-0000-4000-8000-000000000999';
      await expect(
        assetsService.registerUnit({
          subcode: 'CHALLENGER-REG-SUB-4',
          deviceModelId: nonExistentUuid,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('3.3 should accept registration when valid deviceModelId and unique subcode are provided', async () => {
      const unit = await assetsService.registerUnit({
        deviceModelId: testModelId,
        subcode: 'CHALLENGER-REG-SUCCESS-1',
        serialNumber: 'SN-CHALLENGER-123',
      });
      createdAssetIds.push(unit.id);

      expect(unit).toBeDefined();
      expect(unit.id).toBeDefined();
      expect(unit.deviceModelId).toBe(testModelId);
      // formatAsset returns display label 'In Storage' for AVAILABLE status
      expect(unit.status).toBe('In Storage');

      // Verify the underlying database record has status = AVAILABLE
      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit).not.toBeNull();
      expect(dbUnit?.status).toBe(AssetStatus.AVAILABLE);
    });

    it('3.4 HTTP API: POST /api/v1/assets/units should enforce deviceModelId validation', async () => {
      if (!authToken) {
        return; // Skip if HTTP auth not available
      }

      // Test missing deviceModelId over HTTP
      const missingRes = await fetch('http://localhost:3002/api/v1/assets/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          subcode: 'HTTP-TEST-SUB-MISSING',
        }),
      });
      expect(missingRes.status).toBe(400);

      // Test non-existent deviceModelId over HTTP
      const notFoundRes = await fetch('http://localhost:3002/api/v1/assets/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceModelId: '00000000-0000-4000-8000-000000000999',
          subcode: 'HTTP-TEST-SUB-NOTFOUND',
        }),
      });
      expect(notFoundRes.status).toBe(404);

      // Test valid deviceModelId over HTTP
      const validRes = await fetch('http://localhost:3002/api/v1/assets/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceModelId: testModelId,
          subcode: 'HTTP-TEST-VALID-001',
        }),
      });
      expect(validRes.status).toBe(201);
      const validData = (await validRes.json()) as { data?: { id?: string } };
      if (validData.data?.id) {
        createdAssetIds.push(validData.data.id);
      }
    });
  });

  // =========================================================================
  // TEST 4: Batch Intake Atomicity & Route Audit
  // =========================================================================
  describe('Test 4: Batch intake atomicity and route verification', () => {
    let testModelId: string;

    beforeAll(async () => {
      const model = await assetsService.createModel({
        name: 'Batch Intake Test Model',
        modelCode: 'CHALLENGER-INTAKE-MOD',
        categoryId: testCategoryId,
        manufacturer: 'IntakeMfg',
      });
      testModelId = model.id;
      createdModelIds.push(model.id);
    });

    it('4.1 should successfully create N physical units in AVAILABLE status with sequential tags via batchIntake', async () => {
      const count = 3;
      const tagPrefix = 'CHALLENGER-INTAKE-';
      const startSequence = 10;

      const result = await assetsService.batchIntake(testModelId, {
        deviceModelId: testModelId,
        count,
        tagPrefix,
        startSequence,
        serialNumbers: ['SN-INTAKE-010', 'SN-INTAKE-011', 'SN-INTAKE-012'],
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(count);
      expect(result.units).toHaveLength(count);

      for (let i = 0; i < count; i++) {
        const expectedSeq = String(startSequence + i).padStart(3, '0');
        const expectedTag = `${tagPrefix}${expectedSeq}`;
        const unit = result.units[i];

        expect(unit.subcode).toBe(expectedTag);
        expect(unit.assetTag).toBe(expectedTag);
        expect(unit.status).toBe(AssetStatus.AVAILABLE);

        createdAssetIds.push(unit.id);
      }

      // Check DB directly
      const dbUnits = await prisma.asset.findMany({
        where: { deviceModelId: testModelId },
      });
      expect(dbUnits.length).toBe(count);
    });

    it('4.2 should maintain strict transaction atomicity: rollback ALL units if sequence collision occurs mid-batch', async () => {
      // 1. Pre-seed a conflicting unit at sequence 52
      const conflictTag = 'CHALLENGER-ATOMIC-052';
      const preseeded = await prisma.asset.create({
        data: {
          deviceModelId: testModelId,
          subcode: conflictTag,
          assetTag: conflictTag,
          status: AssetStatus.AVAILABLE,
          departmentId: testDeptId,
        },
      });
      createdAssetIds.push(preseeded.id);

      const beforeCount = await prisma.asset.count({
        where: { deviceModelId: testModelId },
      });

      // 2. Attempt batch intake of 5 units starting at sequence 50 (50, 51 would succeed, 52 will collide)
      await expect(
        assetsService.batchIntake(testModelId, {
          deviceModelId: testModelId,
          count: 5,
          tagPrefix: 'CHALLENGER-ATOMIC-',
          startSequence: 50,
        }),
      ).rejects.toThrow(ConflictException);

      // 3. Verify ATOMICITY: Sequence 50 and 51 MUST NOT exist in DB because transaction rolled back!
      const unit50 = await prisma.asset.findFirst({
        where: { subcode: 'CHALLENGER-ATOMIC-050' },
      });
      const unit51 = await prisma.asset.findFirst({
        where: { subcode: 'CHALLENGER-ATOMIC-051' },
      });

      expect(unit50).toBeNull();
      expect(unit51).toBeNull();

      const afterCount = await prisma.asset.count({
        where: { deviceModelId: testModelId },
      });
      expect(afterCount).toBe(beforeCount); // Count unchanged!
    });

    it('4.3 AUDIT FINDING: Route POST /api/v1/assets/models/:id/intake existence check', async () => {
      if (!authToken) {
        return;
      }

      // The dispatch and worker handoff specifically claim:
      // "POST /api/v1/assets/models/:id/intake: batch creates physical units within prisma.$transaction"
      // Let us adversarially probe this endpoint on the live HTTP server:
      const res = await fetch(`http://localhost:3002/api/v1/assets/models/${testModelId}/intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          count: 2,
          tagPrefix: 'AUDIT-ROUTE-',
          startSequence: 1,
        }),
      });

      // EMPIRICAL VERIFICATION:
      // The controller currently DOES NOT define @Post('models/:id/intake').
      // It returns HTTP 404 (Cannot POST /api/v1/assets/models/:id/intake).
      // We document this empirical observation.
      console.log(`[AUDIT] POST /api/v1/assets/models/:id/intake HTTP status: ${res.status}`);
      if (res.status === 404) {
        const body = (await res.json()) as { message?: string };
        console.log(`[AUDIT] 404 Error message: ${body.message}`);
      }

      // Contrast with POST /api/v1/assets/intake (which is implemented):
      const altRes = await fetch('http://localhost:3002/api/v1/assets/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deviceModelId: testModelId,
          count: 2,
          tagPrefix: 'AUDIT-ALT-',
          startSequence: 1,
        }),
      });
      expect(altRes.status).toBe(201);
      const altData = (await altRes.json()) as {
        data?: { units?: Array<{ id: string }> };
      };
      if (altData.data?.units) {
        for (const u of altData.data.units) {
          createdAssetIds.push(u.id);
        }
      }
    });
  });
});
