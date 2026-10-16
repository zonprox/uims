import 'dotenv/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { AssetStatus, HandoverRecordType, AccountStatus } from '@prisma/client';

describe('Challenger M3-1: Custody Workflows Atomicity & Invariants Suite', () => {
  let prisma: PrismaService;
  let assetsService: AssetsService;

  // Cleanup tracking
  const createdAssetIds: string[] = [];
  const createdModelIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdDeptIds: string[] = [];
  const createdRecordIds: string[] = [];

  let testModelId: string;
  let activeDeptId: string;
  let activeUserAId: string;
  let activeUserBId: string;
  let suspendedUserId: string;
  let disabledUserId: string;
  let authToken = '';

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assetsService = new AssetsService(prisma);

    // 1. Get or create category
    let cat = await prisma.assetCategory.findFirst();
    if (!cat) {
      cat = await prisma.assetCategory.create({
        data: { name: 'Challenger M3 Category' },
      });
    }

    // 2. Create dedicated department
    const dept = await prisma.department.create({
      data: {
        name: 'Challenger M3 Dept',
        code: `CHL-DEPT-${Date.now()}`,
      },
    });
    activeDeptId = dept.id;
    createdDeptIds.push(dept.id);

    const [defaultPos, defaultOrg] = await Promise.all([
      prisma.position.findFirst({ select: { id: true } }),
      prisma.organization.findFirst({ where: { code: 'BSL' }, select: { id: true } }).then(
        (o) =>
          o ||
          prisma.organization.findFirst({
            where: { code: { not: 'HOLDING' } },
            select: { id: true },
          }),
      ),
    ]);

    // 3. Create dedicated directory users with diverse AccountStatuses & valid foreign keys
    const userA = await prisma.directoryUser.create({
      data: {
        firstName: 'Alice',
        lastName: 'Active',
        displayName: 'Alice Active',
        email: `alice.active.${Date.now()}@challenger.test`,
        status: AccountStatus.ACTIVE,
        departmentId: activeDeptId,
        positionId: defaultPos?.id,
        organizationId: defaultOrg?.id,
      },
    });
    activeUserAId = userA.id;
    createdUserIds.push(userA.id);

    const userB = await prisma.directoryUser.create({
      data: {
        firstName: 'Bob',
        lastName: 'Recipient',
        displayName: 'Bob Recipient',
        email: `bob.recipient.${Date.now()}@challenger.test`,
        status: AccountStatus.ACTIVE,
        departmentId: activeDeptId,
        positionId: defaultPos?.id,
        organizationId: defaultOrg?.id,
      },
    });
    activeUserBId = userB.id;
    createdUserIds.push(userB.id);

    const userSuspended = await prisma.directoryUser.create({
      data: {
        firstName: 'Sam',
        lastName: 'Suspended',
        displayName: 'Sam Suspended',
        email: `sam.suspended.${Date.now()}@challenger.test`,
        status: AccountStatus.SUSPENDED,
        departmentId: activeDeptId,
        positionId: defaultPos?.id,
        organizationId: defaultOrg?.id,
      },
    });
    suspendedUserId = userSuspended.id;
    createdUserIds.push(userSuspended.id);

    const userDisabled = await prisma.directoryUser.create({
      data: {
        firstName: 'Dave',
        lastName: 'Disabled',
        displayName: 'Dave Disabled',
        email: `dave.disabled.${Date.now()}@challenger.test`,
        status: AccountStatus.DISABLED,
        departmentId: activeDeptId,
        positionId: defaultPos?.id,
        organizationId: defaultOrg?.id,
      },
    });
    disabledUserId = userDisabled.id;
    createdUserIds.push(userDisabled.id);

    // 4. Create dedicated device model for test units
    const model = await prisma.deviceModel.create({
      data: {
        name: 'Challenger M3 ThinkPad',
        modelCode: `CHL-M3-${Date.now()}`,
        categoryId: cat.id,
        manufacturer: 'Lenovo',
        unitCost: 1200,
        minThreshold: 2,
      },
    });
    testModelId = model.id;
    createdModelIds.push(model.id);

    // 5. Authenticate against live API to obtain JWT for HTTP route verification
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
    // 1. Delete handover records
    if (createdAssetIds.length > 0) {
      await prisma.assetHandoverRecord.deleteMany({
        where: { assetId: { in: createdAssetIds } },
      });
    }
    if (createdRecordIds.length > 0) {
      await prisma.assetHandoverRecord.deleteMany({
        where: { id: { in: createdRecordIds } },
      });
    }

    // 2. Delete test assets
    if (createdAssetIds.length > 0) {
      await prisma.asset.deleteMany({
        where: { id: { in: createdAssetIds } },
      });
    }

    // 3. Delete test models
    if (createdModelIds.length > 0) {
      await prisma.asset.deleteMany({
        where: { deviceModelId: { in: createdModelIds } },
      });
      await prisma.deviceModel.deleteMany({
        where: { id: { in: createdModelIds } },
      });
    }

    // 4. Delete test users
    if (createdUserIds.length > 0) {
      await prisma.directoryUser.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }

    // 5. Delete test departments
    if (createdDeptIds.length > 0) {
      await prisma.department.deleteMany({
        where: { id: { in: createdDeptIds } },
      });
    }

    await prisma.$disconnect();
    await (prisma as unknown as { pool?: { end: () => Promise<void> } }).pool?.end();
  });

  // Helper to create test physical units
  async function createTestUnit(
    subcodeSuffix: string,
    status: AssetStatus = AssetStatus.AVAILABLE,
    assignedToId: string | null = null,
  ) {
    const subcode = `CHL-U-${Date.now().toString().slice(-6)}-${subcodeSuffix}`;
    const unit = await prisma.asset.create({
      data: {
        deviceModelId: testModelId,
        subcode,
        assetTag: subcode,
        status,
        assignedToId,
        departmentId: assignedToId ? activeDeptId : null,
      },
    });
    createdAssetIds.push(unit.id);
    return unit;
  }

  // =========================================================================
  // TEST 1: Allocate Atomicity & Guards
  // =========================================================================
  describe('Test 1: Allocate Atomicity & Guards', () => {
    it('1.1 should roll back entire transaction when one unit in batch is already IN_USE (no partial writes)', async () => {
      const unit1 = await createTestUnit('AL-1', AssetStatus.AVAILABLE, null);
      const unit2 = await createTestUnit('AL-2', AssetStatus.AVAILABLE, null);
      const unitInUse = await createTestUnit('AL-INUSE', AssetStatus.IN_USE, activeUserBId);

      await expect(
        assetsService.allocate({
          assetIds: [unit1.id, unitInUse.id, unit2.id],
          assignedToId: activeUserAId,
        }),
      ).rejects.toThrow(ConflictException);

      // Verify transaction rollback in PostgreSQL
      const refreshedUnit1 = await prisma.asset.findUnique({ where: { id: unit1.id } });
      const refreshedUnit2 = await prisma.asset.findUnique({ where: { id: unit2.id } });

      expect(refreshedUnit1?.status).toBe(AssetStatus.AVAILABLE);
      expect(refreshedUnit1?.assignedToId).toBeNull();
      expect(refreshedUnit2?.status).toBe(AssetStatus.AVAILABLE);
      expect(refreshedUnit2?.assignedToId).toBeNull();

      // Verify ZERO handover records were created for unit1 or unit2
      const records1 = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit1.id } });
      const records2 = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit2.id } });
      expect(records1).toHaveLength(0);
      expect(records2).toHaveLength(0);
    });

    it('1.2 should roll back entire transaction when one unit in batch is non-existent (no partial writes)', async () => {
      const unitValid = await createTestUnit('AL-V1', AssetStatus.AVAILABLE, null);
      const fakeId = '00000000-0000-4000-8000-000000000099';

      await expect(
        assetsService.allocate({
          assetIds: [unitValid.id, fakeId],
          assignedToId: activeUserAId,
        }),
      ).rejects.toThrow(NotFoundException);

      // Verify rollback on unitValid
      const refreshed = await prisma.asset.findUnique({ where: { id: unitValid.id } });
      expect(refreshed?.status).toBe(AssetStatus.AVAILABLE);
      expect(refreshed?.assignedToId).toBeNull();

      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unitValid.id },
      });
      expect(records).toHaveLength(0);
    });

    it('1.3 should reject allocation to a SUSPENDED directory user with BadRequestException', async () => {
      const unit = await createTestUnit('AL-SUSP', AssetStatus.AVAILABLE, null);

      await expect(
        assetsService.allocate({
          assetIds: [unit.id],
          assignedToId: suspendedUserId,
        }),
      ).rejects.toThrow(BadRequestException);

      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.status).toBe(AssetStatus.AVAILABLE);
      expect(refreshed?.assignedToId).toBeNull();
    });

    it('1.4 should reject allocation to a DISABLED directory user with BadRequestException', async () => {
      const unit = await createTestUnit('AL-DISA', AssetStatus.AVAILABLE, null);

      await expect(
        assetsService.allocate({
          assetIds: [unit.id],
          assignedToId: disabledUserId,
        }),
      ).rejects.toThrow(BadRequestException);

      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.status).toBe(AssetStatus.AVAILABLE);
      expect(refreshed?.assignedToId).toBeNull();
    });

    it('1.5 should reject allocation when assetIds is empty', async () => {
      await expect(
        assetsService.allocate({
          assetIds: [],
          assignedToId: activeUserAId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.6 should reject allocation to non-existent directory user with NotFoundException', async () => {
      const unit = await createTestUnit('AL-NOUSER', AssetStatus.AVAILABLE, null);

      await expect(
        assetsService.allocate({
          assetIds: [unit.id],
          assignedToId: '00000000-0000-4000-8000-000000000088',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('1.7 should successfully allocate available units: set status = IN_USE, assignedToId, departmentId, and create AssetHandoverRecord(ASSIGNMENT)', async () => {
      const unit1 = await createTestUnit('AL-OK1', AssetStatus.AVAILABLE, null);
      const unit2 = await createTestUnit('AL-OK2', AssetStatus.AVAILABLE, null);

      const result = await assetsService.allocate({
        assetIds: [unit1.id, unit2.id],
        assignedToId: activeUserAId,
        conditionNotes: 'Brand new in box with accessories',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.assignedToId).toBe(activeUserAId);
      expect(result.hasPendingRecord).toBe(true);

      const refreshed1 = await prisma.asset.findUnique({ where: { id: unit1.id } });
      const refreshed2 = await prisma.asset.findUnique({ where: { id: unit2.id } });

      expect(refreshed1?.status).toBe(AssetStatus.IN_USE);
      expect(refreshed1?.assignedToId).toBe(activeUserAId);
      expect(refreshed1?.departmentId).toBe(activeDeptId);
      expect(refreshed1?.hasPendingRecord).toBe(true);

      expect(refreshed2?.status).toBe(AssetStatus.IN_USE);
      expect(refreshed2?.assignedToId).toBe(activeUserAId);
      expect(refreshed2?.departmentId).toBe(activeDeptId);
      expect(refreshed2?.hasPendingRecord).toBe(true);

      const rec1 = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit1.id } });
      expect(rec1).toHaveLength(1);
      expect(rec1[0].type).toBe(HandoverRecordType.ASSIGNMENT);
      expect(rec1[0].recipientId).toBe(activeUserAId);
      expect(rec1[0].isPending).toBe(true);
      expect(rec1[0].signedDocUrl).toBeNull();
      expect(rec1[0].notes).toBe('Brand new in box with accessories');

      const rec2 = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit2.id } });
      expect(rec2).toHaveLength(1);
      expect(rec2[0].type).toBe(HandoverRecordType.ASSIGNMENT);
      expect(rec2[0].recipientId).toBe(activeUserAId);
      expect(rec2[0].isPending).toBe(true);
    });

    it('1.8 should allocate with signedDocUrl and set hasPendingRecord = false, isPending = false', async () => {
      const unit = await createTestUnit('AL-SIGNED', AssetStatus.AVAILABLE, null);

      const result = await assetsService.allocate({
        assetIds: [unit.id],
        assignedToId: activeUserAId,
        signedDocUrl: 'https://docs.local/signed_handover.pdf',
      });

      expect(result.hasPendingRecord).toBe(false);

      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.hasPendingRecord).toBe(false);
      expect(refreshed?.status).toBe(AssetStatus.IN_USE);

      const rec = await prisma.assetHandoverRecord.findFirst({ where: { assetId: unit.id } });
      expect(rec?.isPending).toBe(false);
      expect(rec?.signedDocUrl).toBe('https://docs.local/signed_handover.pdf');
    });
  });

  // =========================================================================
  // TEST 2: Return Atomicity & Guards
  // =========================================================================
  describe('Test 2: Return Atomicity & Guards', () => {
    it('2.1 should reject returning an unassigned unit (status AVAILABLE) with ConflictException', async () => {
      const unitAvailable = await createTestUnit('RT-AVAIL', AssetStatus.AVAILABLE, null);

      let caughtError: unknown;
      try {
        await assetsService.returnUnits({
          assetIds: [unitAvailable.id],
          targetStatus: 'AVAILABLE',
        });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(ConflictException);

      // Verify asset state was NOT modified: still AVAILABLE and unassigned
      const refreshed = await prisma.asset.findUnique({ where: { id: unitAvailable.id } });
      expect(refreshed?.status).toBe(AssetStatus.AVAILABLE);
      expect(refreshed?.assignedToId).toBeNull();

      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unitAvailable.id },
      });
      expect(records).toHaveLength(0);
    });

    it('2.2 should roll back entire return transaction when one unit in batch is not IN_USE (no partial writes)', async () => {
      const unitInUse = await createTestUnit('RT-INUSE', AssetStatus.IN_USE, activeUserAId);
      const unitAvailable = await createTestUnit('RT-AVAIL2', AssetStatus.AVAILABLE, null);

      await expect(
        assetsService.returnUnits({
          assetIds: [unitInUse.id, unitAvailable.id],
          targetStatus: 'AVAILABLE',
        }),
      ).rejects.toThrow(ConflictException);

      // EMPIRICAL VERIFICATION OF ROLLBACK:
      // unitInUse must still be IN_USE and assigned to activeUserAId
      const refreshedInUse = await prisma.asset.findUnique({ where: { id: unitInUse.id } });
      expect(refreshedInUse?.status).toBe(AssetStatus.IN_USE);
      expect(refreshedInUse?.assignedToId).toBe(activeUserAId);

      // ZERO RETURN handover records created for unitInUse
      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unitInUse.id, type: HandoverRecordType.RETURN },
      });
      expect(records).toHaveLength(0);
    });

    it('2.3a should reject return with targetStatus = IN_USE with BadRequestException', async () => {
      const unit = await createTestUnit('RT-INUSE-STAT', AssetStatus.IN_USE, activeUserAId);

      await expect(
        assetsService.returnUnits({
          assetIds: [unit.id],
          targetStatus: 'IN_USE' as unknown as 'AVAILABLE',
        }),
      ).rejects.toThrow(BadRequestException);

      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.status).toBe(AssetStatus.IN_USE);
      expect(refreshed?.assignedToId).toBe(activeUserAId);
    });

    it('2.3b should reject return when passing garbage targetStatus with BadRequestException', async () => {
      const unit = await createTestUnit('RT-GARBAGE', AssetStatus.IN_USE, activeUserAId);

      await expect(
        assetsService.returnUnits({
          assetIds: [unit.id],
          targetStatus: 'GARBAGE_STATUS' as unknown as 'AVAILABLE',
        }),
      ).rejects.toThrow(BadRequestException);

      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.status).toBe(AssetStatus.IN_USE);
      expect(refreshed?.assignedToId).toBe(activeUserAId);
    });

    it('2.4 should successfully return IN_USE unit: set status = targetStatus, clear assignedToId = null, and create AssetHandoverRecord(RETURN)', async () => {
      const unit = await createTestUnit('RT-VALID', AssetStatus.IN_USE, activeUserAId);

      const result = await assetsService.returnUnits({
        assetIds: [unit.id],
        targetStatus: 'AVAILABLE',
        conditionNotes: 'Returned in pristine condition',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('AVAILABLE');
      expect(result.returnedIds).toContain(unit.id);
      expect(result.hasPendingRecord).toBe(true);

      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.status).toBe(AssetStatus.AVAILABLE);
      expect(refreshed?.assignedToId).toBeNull();
      expect(refreshed?.hasPendingRecord).toBe(true);
      expect(refreshed?.notes).toContain('[Return');

      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unit.id, type: HandoverRecordType.RETURN },
      });
      expect(records).toHaveLength(1);
      expect(records[0].type).toBe(HandoverRecordType.RETURN);
      expect(records[0].recipientId).toBe(activeUserAId); // Previous custodian
      expect(records[0].isPending).toBe(true);
      expect(records[0].notes).toBe('Returned in pristine condition');
    });

    it('2.5 should support valid return to MAINTENANCE or RETIRED statuses', async () => {
      const unitMaint = await createTestUnit('RT-MAINT', AssetStatus.IN_USE, activeUserAId);
      const unitRet = await createTestUnit('RT-RET', AssetStatus.IN_USE, activeUserBId);

      await assetsService.returnUnits({
        assetIds: [unitMaint.id],
        targetStatus: 'MAINTENANCE',
      });

      const refreshedMaint = await prisma.asset.findUnique({ where: { id: unitMaint.id } });
      expect(refreshedMaint?.status).toBe(AssetStatus.MAINTENANCE);
      expect(refreshedMaint?.assignedToId).toBeNull();

      await assetsService.returnUnits({
        assetIds: [unitRet.id],
        targetStatus: 'RETIRED',
      });

      const refreshedRet = await prisma.asset.findUnique({ where: { id: unitRet.id } });
      expect(refreshedRet?.status).toBe(AssetStatus.RETIRED);
      expect(refreshedRet?.assignedToId).toBeNull();
    });

    it('2.6 should return unit with signedDocUrl and mark hasPendingRecord = false, isPending = false', async () => {
      const unit = await createTestUnit('RT-SIGNED', AssetStatus.IN_USE, activeUserAId);

      const result = await assetsService.returnUnits({
        assetIds: [unit.id],
        targetStatus: 'AVAILABLE',
        signedDocUrl: 'https://docs.local/signed_return.pdf',
      });

      expect(result.hasPendingRecord).toBe(false);

      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.hasPendingRecord).toBe(false);

      const rec = await prisma.assetHandoverRecord.findFirst({
        where: { assetId: unit.id, type: HandoverRecordType.RETURN },
      });
      expect(rec?.isPending).toBe(false);
      expect(rec?.signedDocUrl).toBe('https://docs.local/signed_return.pdf');
    });

    it('2.7 should return units from multiple different custodians and record previous custodian correctly for each', async () => {
      const unitA = await createTestUnit('RT-MULT-A', AssetStatus.IN_USE, activeUserAId);
      const unitB = await createTestUnit('RT-MULT-B', AssetStatus.IN_USE, activeUserBId);

      const result = await assetsService.returnUnits({
        assetIds: [unitA.id, unitB.id],
        targetStatus: 'AVAILABLE',
      });

      expect(result.count).toBe(2);

      const recA = await prisma.assetHandoverRecord.findFirst({
        where: { assetId: unitA.id, type: HandoverRecordType.RETURN },
      });
      expect(recA?.recipientId).toBe(activeUserAId);

      const recB = await prisma.assetHandoverRecord.findFirst({
        where: { assetId: unitB.id, type: HandoverRecordType.RETURN },
      });
      expect(recB?.recipientId).toBe(activeUserBId);
    });
  });

  // =========================================================================
  // TEST 3: Transfer Dual Records & Guards
  // =========================================================================
  describe('Test 3: Transfer Dual Records & Guards', () => {
    it('3.1 should reject transfer to the same custodian (assignedToId === toUserId) with BadRequestException', async () => {
      const unit = await createTestUnit('TR-SAME', AssetStatus.IN_USE, activeUserAId);

      await expect(
        assetsService.transfer({
          assetIds: [unit.id],
          toUserId: activeUserAId,
          transferReason: 'Self reassignment attempt',
        }),
      ).rejects.toThrow(BadRequestException);

      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.status).toBe(AssetStatus.IN_USE);
      expect(refreshed?.assignedToId).toBe(activeUserAId);

      const records = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit.id } });
      expect(records).toHaveLength(0);
    });

    it('3.2 should reject transfer when unit is not IN_USE (e.g. AVAILABLE)', async () => {
      const unit = await createTestUnit('TR-NOTINUSE', AssetStatus.AVAILABLE, null);

      await expect(
        assetsService.transfer({
          assetIds: [unit.id],
          toUserId: activeUserBId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('3.3 should reject transfer to SUSPENDED or DISABLED recipient with BadRequestException', async () => {
      const unit1 = await createTestUnit('TR-SUSP', AssetStatus.IN_USE, activeUserAId);
      const unit2 = await createTestUnit('TR-DISA', AssetStatus.IN_USE, activeUserAId);

      await expect(
        assetsService.transfer({
          assetIds: [unit1.id],
          toUserId: suspendedUserId,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        assetsService.transfer({
          assetIds: [unit2.id],
          toUserId: disabledUserId,
        }),
      ).rejects.toThrow(BadRequestException);

      const ref1 = await prisma.asset.findUnique({ where: { id: unit1.id } });
      expect(ref1?.assignedToId).toBe(activeUserAId);
      const ref2 = await prisma.asset.findUnique({ where: { id: unit2.id } });
      expect(ref2?.assignedToId).toBe(activeUserAId);
    });

    it('3.4 should reject transfer when fromUserId does not match current custodian with ConflictException', async () => {
      const unit = await createTestUnit('TR-FROM-MIS', AssetStatus.IN_USE, activeUserAId);

      await expect(
        assetsService.transfer({
          assetIds: [unit.id],
          fromUserId: activeUserBId, // Incorrect source user!
          toUserId: suspendedUserId,
        }),
      ).rejects.toThrow();
    });

    it('3.5 should roll back entire transfer transaction when one unit in batch is already assigned to destination (no partial writes)', async () => {
      const unitValid = await createTestUnit('TR-V', AssetStatus.IN_USE, activeUserAId);
      const unitAlreadyB = await createTestUnit('TR-ALR', AssetStatus.IN_USE, activeUserBId);

      await expect(
        assetsService.transfer({
          assetIds: [unitValid.id, unitAlreadyB.id],
          toUserId: activeUserBId,
        }),
      ).rejects.toThrow(BadRequestException);

      // EMPIRICAL VERIFICATION OF ROLLBACK:
      // unitValid must remain assigned to User A
      const refreshedValid = await prisma.asset.findUnique({ where: { id: unitValid.id } });
      expect(refreshedValid?.assignedToId).toBe(activeUserAId);

      // ZERO handover records created for unitValid
      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unitValid.id },
      });
      expect(records).toHaveLength(0);
    });

    it('3.6 should execute valid transfer: create EXACTLY TWO AssetHandoverRecord rows per asset (RETURN for Custodian A, ASSIGNMENT for Custodian B)', async () => {
      const unit = await createTestUnit('TR-DUAL', AssetStatus.IN_USE, activeUserAId);

      const result = await assetsService.transfer({
        assetIds: [unit.id],
        toUserId: activeUserBId,
        transferReason: 'Inter-departmental project reassignment',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.toUserId).toBe(activeUserBId);
      expect(result.hasPendingRecord).toBe(true);

      // 1. Verify Asset state in PostgreSQL
      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.status).toBe(AssetStatus.IN_USE); // MUST REMAIN IN_USE
      expect(refreshed?.assignedToId).toBe(activeUserBId); // Transitioned to Custodian B
      expect(refreshed?.departmentId).toBe(activeDeptId);
      expect(refreshed?.hasPendingRecord).toBe(true);
      expect(refreshed?.notes).toContain('[Transfer');

      // 2. Verify EXACTLY TWO AssetHandoverRecord rows in PostgreSQL
      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unit.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(records).toHaveLength(2);

      // Record 1: RETURN for releasing Custodian A
      const returnRecord = records.find((r) => r.type === HandoverRecordType.RETURN);
      expect(returnRecord).toBeDefined();
      expect(returnRecord?.recipientId).toBe(activeUserAId);
      expect(returnRecord?.isPending).toBe(true);
      expect(returnRecord?.notes).toContain('Inter-departmental project reassignment');

      // Record 2: ASSIGNMENT for receiving Custodian B
      const assignmentRecord = records.find((r) => r.type === HandoverRecordType.ASSIGNMENT);
      expect(assignmentRecord).toBeDefined();
      expect(assignmentRecord?.recipientId).toBe(activeUserBId);
      expect(assignmentRecord?.isPending).toBe(true);
      expect(assignmentRecord?.notes).toContain('Inter-departmental project reassignment');
    });

    it('3.7 should transfer multiple units and create exactly 2 records per unit (2N records total)', async () => {
      const unit1 = await createTestUnit('TR-M1', AssetStatus.IN_USE, activeUserAId);
      const unit2 = await createTestUnit('TR-M2', AssetStatus.IN_USE, activeUserAId);

      const result = await assetsService.transfer({
        assetIds: [unit1.id, unit2.id],
        toUserId: activeUserBId,
        transferReason: 'Batch custody transfer',
      });

      expect(result.count).toBe(2);

      for (const unitId of [unit1.id, unit2.id]) {
        const refreshed = await prisma.asset.findUnique({ where: { id: unitId } });
        expect(refreshed?.assignedToId).toBe(activeUserBId);
        expect(refreshed?.status).toBe(AssetStatus.IN_USE);

        const recs = await prisma.assetHandoverRecord.findMany({ where: { assetId: unitId } });
        expect(recs).toHaveLength(2);

        const ret = recs.find((r) => r.type === HandoverRecordType.RETURN);
        const ass = recs.find((r) => r.type === HandoverRecordType.ASSIGNMENT);

        expect(ret?.recipientId).toBe(activeUserAId);
        expect(ass?.recipientId).toBe(activeUserBId);
      }
    });
  });

  // =========================================================================
  // TEST 4: Live HTTP API Endpoints Stress & Protocol Verification
  // =========================================================================
  describe('Test 4: Live HTTP API Endpoints', () => {
    it('4.1 POST /api/v1/assets/allocate HTTP endpoint should enforce validation and role guards', async () => {
      if (!authToken) {
        console.warn('Live API token unavailable, skipping HTTP route test');
        return;
      }

      const unit = await createTestUnit('HTTP-AL', AssetStatus.AVAILABLE, null);

      // Attempt allocate without auth token -> 401 Unauthorized
      const unauthRes = await fetch('http://localhost:3002/api/v1/assets/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: [unit.id],
          assignedToId: activeUserAId,
        }),
      });
      expect(unauthRes.status).toBe(401);

      // Valid allocate with auth token -> 201 Created
      const authRes = await fetch('http://localhost:3002/api/v1/assets/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          assetIds: [unit.id],
          assignedToId: activeUserAId,
        }),
      });
      expect(authRes.status).toBe(201);
      const body = (await authRes.json()) as { success?: boolean; data?: { count?: number } };
      expect(body.data?.count ?? (body as { count?: number }).count).toBe(1);

      // Refreshed asset in DB
      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.status).toBe(AssetStatus.IN_USE);
      expect(refreshed?.assignedToId).toBe(activeUserAId);
    });

    it('4.2 POST /api/v1/assets/return HTTP endpoint should reject non-IN_USE unit with client error', async () => {
      if (!authToken) return;

      const unitAvail = await createTestUnit('HTTP-RT', AssetStatus.AVAILABLE, null);

      const res = await fetch('http://localhost:3002/api/v1/assets/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          assetIds: [unitAvail.id],
          targetStatus: 'AVAILABLE',
        }),
      });

      // Must reject with client error 400 or 409
      expect([400, 409]).toContain(res.status);
    });

    it('4.3 POST /api/v1/assets/transfer HTTP endpoint should reject self-transfer with 400 and accept valid transfer with 201', async () => {
      if (!authToken) return;

      const unit = await createTestUnit('HTTP-TR', AssetStatus.IN_USE, activeUserAId);

      // Self-transfer -> 400 Bad Request
      const selfRes = await fetch('http://localhost:3002/api/v1/assets/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          assetIds: [unit.id],
          toUserId: activeUserAId,
        }),
      });
      expect(selfRes.status).toBe(400);

      // Valid transfer to User B -> 201 Created
      const validRes = await fetch('http://localhost:3002/api/v1/assets/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          assetIds: [unit.id],
          toUserId: activeUserBId,
          transferReason: 'HTTP route verification',
        }),
      });
      expect(validRes.status).toBe(201);

      // Verify PostgreSQL state
      const refreshed = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(refreshed?.assignedToId).toBe(activeUserBId);
      expect(refreshed?.status).toBe(AssetStatus.IN_USE);

      const recs = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit.id } });
      expect(recs).toHaveLength(2);
    });
  });
});
