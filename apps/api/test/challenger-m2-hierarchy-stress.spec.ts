/**
 * Challenger M2-1: Adversarial Backend API Constraint & Workflow Stress Suite
 *
 * Target: apps/api/test/challenger-m2-hierarchy-stress.spec.ts
 *
 * Empirical verification of:
 * 1. Device model creation duplicate assetCode -> HTTP 409 ConflictException
 * 2. Physical unit registration duplicate subcode -> HTTP 409 ConflictException
 * 3. Physical unit registration invalid or non-existent parentId -> HTTP 400 / 404 rejection
 * 4. Device model assignment to DirectoryUser -> HTTP 400 BadRequestException rejection
 * 5. Physical unit issue and check-in lifecycle (AVAILABLE -> IN_USE with assignedToId -> AVAILABLE with null)
 * 6. Adversarial edge cases: case-insensitive uniqueness, nested parent rejections, in-use delete guards.
 */

import * as dotenv from 'dotenv';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { AssetsController } from '../src/modules/assets/assets.controller';
import { AssetsService } from '../src/modules/assets/assets.service';
import { DirectoryService } from '../src/modules/directory/directory.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Challenger M2-1: Backend API Constraints & Workflow Stress Suite', () => {
  let prisma: PrismaService;
  let assetsService: AssetsService;
  let assetsController: AssetsController;
  let directoryService: DirectoryService;
  let testUserId: string;

  const RUN_ID = Date.now();
  const PREFIX = `CHAL_M2_${RUN_ID}`;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assetsService = new AssetsService(prisma);
    assetsController = new AssetsController(assetsService);
    directoryService = new DirectoryService(prisma);

    // Find or seed a clean test directory user
    let user = await prisma.directoryUser.findFirst({
      where: { status: 'ACTIVE' },
    });

    if (!user) {
      user = await prisma.directoryUser.create({
        data: {
          employeeCode: `${PREFIX}_EMP`,
          email: `${PREFIX.toLowerCase()}@example.com`,
          firstName: 'Challenger',
          lastName: 'Tester',
          status: 'ACTIVE',
        },
      });
    }

    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up all assets created during this test suite
    try {
      await prisma.asset.deleteMany({
        where: {
          OR: [
            { assetCode: { startsWith: PREFIX } },
            { subcode: { startsWith: PREFIX } },
            { name: { startsWith: PREFIX } },
          ],
        },
      });
    } catch (error: unknown) {
      // Ignore cleanup error if already deleted
    }

    await prisma.$disconnect();
  });

  // =========================================================================
  // TASK 1.1: Device Model assetCode Uniqueness & Conflict Rejection
  // =========================================================================
  describe('Task 1.1: Device Model assetCode Uniqueness & Conflict Rejection', () => {
    const modelCode = `${PREFIX}_MOD_DELL`;

    it('successfully creates a device model with a unique assetCode', async () => {
      const model = await assetsService.createModel({
        assetCode: modelCode,
        name: `${PREFIX} Dell Latitude 5420`,
        specifications: '16GB RAM, 512GB SSD',
        unitCost: 1200,
      });

      expect(model).toBeDefined();
      expect(model.assetCode).toBe(modelCode);
      expect(model.parentId).toBeNull();
      expect(model.totalUnits).toBe(0);
    });

    it('rejects creating a device model with duplicate assetCode with HTTP 409 Conflict', async () => {
      await expect(
        assetsService.createModel({
          assetCode: modelCode,
          name: `${PREFIX} Dell Latitude Duplicate`,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects creating a device model with case-insensitive duplicate assetCode with HTTP 409 Conflict', async () => {
      await expect(
        assetsService.createModel({
          assetCode: modelCode.toLowerCase(),
          name: `${PREFIX} Dell Latitude Lowercase Duplicate`,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects creating a device model with empty or whitespace assetCode with HTTP 400 BadRequest', async () => {
      await expect(
        assetsService.createModel({
          assetCode: '   ',
          name: `${PREFIX} Invalid Model`,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects updating an existing model assetCode to collide with another model with HTTP 409 Conflict', async () => {
      const secondCode = `${PREFIX}_MOD_MBP`;
      const secondModel = await assetsService.createModel({
        assetCode: secondCode,
        name: `${PREFIX} MacBook Pro 14`,
      });

      await expect(
        assetsService.updateModel(secondModel.id, {
          assetCode: modelCode, // Collides with first model
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // TASK 1.2: Physical Unit subcode Uniqueness & Conflict Rejection
  // =========================================================================
  describe('Task 1.2: Physical Unit subcode Uniqueness & Conflict Rejection', () => {
    let parentModelId: string;
    const unitSubcode = `${PREFIX}_AST_001`;

    beforeAll(async () => {
      const model = await assetsService.createModel({
        assetCode: `${PREFIX}_MOD_SUB_TEST`,
        name: `${PREFIX} Subcode Test Model`,
      });
      parentModelId = model.id;
    });

    it('successfully registers a physical unit with a unique subcode under parent model', async () => {
      const unit = await assetsService.registerUnit({
        subcode: unitSubcode,
        parentId: parentModelId,
        serialNumber: `SN-${PREFIX}-001`,
      });

      expect(unit).toBeDefined();
      expect(unit.subcode).toBe(unitSubcode);
      expect(unit.parentId).toBe(parentModelId);
      expect(unit.status).toBe('In Storage'); // formatted label for AVAILABLE
    });

    it('rejects registering a physical unit with duplicate subcode with HTTP 409 Conflict', async () => {
      await expect(
        assetsService.registerUnit({
          subcode: unitSubcode,
          parentId: parentModelId,
          serialNumber: `SN-${PREFIX}-DUP`,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects registering a physical unit with case-insensitive duplicate subcode with HTTP 409 Conflict', async () => {
      await expect(
        assetsService.registerUnit({
          subcode: unitSubcode.toLowerCase(),
          parentId: parentModelId,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects registering a physical unit with empty or whitespace subcode with HTTP 400 BadRequest', async () => {
      await expect(
        assetsService.registerUnit({
          subcode: '   ',
          parentId: parentModelId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects updating an existing physical unit subcode to collide with another unit with HTTP 409 Conflict', async () => {
      const secondSubcode = `${PREFIX}_AST_002`;
      const secondUnit = await assetsService.registerUnit({
        subcode: secondSubcode,
        parentId: parentModelId,
      });

      await expect(
        assetsService.updateUnit(secondUnit.id, {
          subcode: unitSubcode, // Collides with first unit
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // TASK 1.3: Physical Unit parentId Validation (Invalid / Non-Existent parentId)
  // =========================================================================
  describe('Task 1.3: Physical Unit parentId Validation & Hierarchy Integrity', () => {
    it('rejects registering a physical unit with empty string parentId with HTTP 400 BadRequest', async () => {
      await expect(
        assetsService.registerUnit({
          subcode: `${PREFIX}_AST_NO_PARENT`,
          parentId: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects registering a physical unit with non-existent parentId with HTTP 404 NotFound', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      await expect(
        assetsService.registerUnit({
          subcode: `${PREFIX}_AST_ORPHAN`,
          parentId: nonExistentUuid,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects registering a unit under another physical unit (nested children) with HTTP 400 BadRequest', async () => {
      const model = await assetsService.createModel({
        assetCode: `${PREFIX}_MOD_NEST`,
        name: `${PREFIX} Nested Hierarchy Model`,
      });

      const childUnit = await assetsService.registerUnit({
        subcode: `${PREFIX}_AST_CHILD_1`,
        parentId: model.id,
      });

      // Attempting to register another unit with childUnit.id as parentId
      await expect(
        assetsService.registerUnit({
          subcode: `${PREFIX}_AST_GRANDCHILD`,
          parentId: childUnit.id, // childUnit has parentId !== null
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // TASK 1.4: Device Model Assignment Guard (Rejecting Blueprint Assignment)
  // =========================================================================
  describe('Task 1.4: Device Model Assignment Guards (Directory & Assets Services)', () => {
    let modelBlueprintId: string;

    beforeAll(async () => {
      const model = await assetsService.createModel({
        assetCode: `${PREFIX}_MOD_GUARD`,
        name: `${PREFIX} Model Guard Blueprint`,
      });
      modelBlueprintId = model.id;
    });

    it('DirectoryService.assignAsset rejects assigning a Device Model blueprint with HTTP 400 BadRequest', async () => {
      await expect(directoryService.assignAsset(testUserId, modelBlueprintId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('AssetsService.issueUnit rejects assigning a Device Model blueprint with HTTP 400 BadRequest', async () => {
      await expect(
        assetsService.issueUnit(modelBlueprintId, { assignedToId: testUserId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('DirectoryService.getAvailableAssets strictly filters out device models (only physical units)', async () => {
      const available = await directoryService.getAvailableAssets();
      expect(Array.isArray(available)).toBe(true);
      // Every available asset returned MUST have a non-null parentId (physical unit)
      for (const asset of available) {
        expect(asset.parentId).not.toBeNull();
      }
      // The newly created device model must not be present
      const foundBlueprint = available.find((a) => a.id === modelBlueprintId);
      expect(foundBlueprint).toBeUndefined();
    });
  });

  // =========================================================================
  // TASK 1.5: Physical Unit Issue and Check-in Lifecycle
  // =========================================================================
  describe('Task 1.5: Physical Unit Issue and Check-in Lifecycle', () => {
    let modelId: string;
    let unitId: string;
    const subcode = `${PREFIX}_AST_LIFECYCLE`;

    beforeAll(async () => {
      const model = await assetsService.createModel({
        assetCode: `${PREFIX}_MOD_LIFE`,
        name: `${PREFIX} Lifecycle Device Model`,
      });
      modelId = model.id;

      const unit = await assetsService.registerUnit({
        subcode,
        parentId: modelId,
        serialNumber: `SN-LIFE-${RUN_ID}`,
      });
      unitId = unit.id;
    });

    it('verifies initial registered state is AVAILABLE with assignedToId = null', async () => {
      const unit = await assetsService.getUnit(unitId);
      expect(unit.assignedToId).toBeNull();
      expect(unit.status).toBe('In Storage'); // formatted label for AVAILABLE

      const rawDb = await prisma.asset.findUnique({ where: { id: unitId } });
      expect(rawDb?.status).toBe('AVAILABLE');
      expect(rawDb?.assignedToId).toBeNull();
    });

    it('issues unit to directory user: transitions AVAILABLE -> IN_USE with assignedToId populated', async () => {
      const issued = await assetsService.issueUnit(unitId, {
        assignedToId: testUserId,
        notes: 'Issued to Challenger Tester',
      });

      expect(issued.assignedToId).toBe(testUserId);
      expect(issued.status).toBe('Active'); // formatted label for IN_USE

      const rawDb = await prisma.asset.findUnique({ where: { id: unitId } });
      expect(rawDb?.status).toBe('IN_USE');
      expect(rawDb?.assignedToId).toBe(testUserId);
    });

    it('rejects issuing an already in-use unit to another user with HTTP 409 Conflict', async () => {
      await expect(
        assetsService.issueUnit(unitId, {
          assignedToId: testUserId,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('checks in unit: transitions IN_USE -> AVAILABLE with assignedToId = null', async () => {
      const checkedIn = await assetsService.checkinUnit(unitId, 'Returned in pristine condition');

      expect(checkedIn.assignedToId).toBeNull();
      expect(checkedIn.status).toBe('In Storage'); // formatted label for AVAILABLE

      const rawDb = await prisma.asset.findUnique({ where: { id: unitId } });
      expect(rawDb?.status).toBe('AVAILABLE');
      expect(rawDb?.assignedToId).toBeNull();
    });

    it('verifies DirectoryService.assignAsset and unassignAsset execute the same lifecycle cleanly', async () => {
      // 1. Assign via DirectoryService
      const assigned = await directoryService.assignAsset(testUserId, unitId);
      expect(assigned.assignedToId).toBe(testUserId);
      expect(assigned.status).toBe('IN_USE');

      // 2. Reject re-assignment while assigned
      await expect(directoryService.assignAsset(testUserId, unitId)).rejects.toThrow(
        BadRequestException,
      );

      // 3. Unassign via DirectoryService
      const unassigned = await directoryService.unassignAsset(testUserId, unitId);
      expect(unassigned.success).toBe(true);
      expect(unassigned.asset.assignedToId).toBeNull();
      expect(unassigned.asset.status).toBe('AVAILABLE');
    });
  });

  // =========================================================================
  // TASK 1.6: Deletion and Relational Integrity Constraints
  // =========================================================================
  describe('Task 1.6: Deletion and Relational Integrity Guards', () => {
    it('rejects deleting a device model that has active child units with HTTP 409 Conflict', async () => {
      const model = await assetsService.createModel({
        assetCode: `${PREFIX}_MOD_DEL_TEST`,
        name: `${PREFIX} Model Delete Guard`,
      });

      await assetsService.registerUnit({
        subcode: `${PREFIX}_AST_DEL_GUARD`,
        parentId: model.id,
      });

      await expect(assetsService.deleteModel(model.id)).rejects.toThrow(ConflictException);
    });

    it('rejects deleting a physical unit that is currently IN_USE with HTTP 409 Conflict', async () => {
      const model = await assetsService.createModel({
        assetCode: `${PREFIX}_MOD_UNIT_DEL`,
        name: `${PREFIX} Unit Delete Guard Model`,
      });

      const unit = await assetsService.registerUnit({
        subcode: `${PREFIX}_AST_IN_USE_DEL`,
        parentId: model.id,
      });

      await assetsService.issueUnit(unit.id, { assignedToId: testUserId });

      await expect(assetsService.deleteUnit(unit.id)).rejects.toThrow(ConflictException);

      // Clean up by checking in and deleting
      await assetsService.checkinUnit(unit.id);
      await assetsService.deleteUnit(unit.id);
      await assetsService.deleteModel(model.id);
    });

    it('rejects checking in a device model blueprint with HTTP 400 BadRequest', async () => {
      const model = await assetsService.createModel({
        assetCode: `${PREFIX}_MOD_CHKIN_FAIL`,
        name: `${PREFIX} Checkin Blueprint Model`,
      });

      await expect(assetsService.checkinUnit(model.id)).rejects.toThrow(BadRequestException);
    });
  });
});
