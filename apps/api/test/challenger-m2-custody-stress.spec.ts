import 'dotenv/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { AssetStatus, HandoverRecordType, AccountStatus } from '@prisma/client';

/**
 * Challenger M2-1: Custody Lifecycle Workflows Empirical Stress Suite
 *
 * Scope:
 * 1. Allocate workflow (AVAILABLE -> IN_USE, assignedToId set, AssetHandoverRecord ASSIGNMENT)
 * 2. Return workflow (IN_USE -> AVAILABLE/MAINTENANCE/RETIRED, assignedToId cleared, AssetHandoverRecord RETURN)
 * 3. Transfer workflow (Custodian A -> Custodian B, atomic dual records RETURN + ASSIGNMENT, status IN_USE)
 * 4. attachHandoverDocument dynamic hasPendingRecord recalculation (count > 0 -> true, count === 0 -> false)
 * 5. Adversarial edge cases: invalid transitions, self-transfers, suspended users, batch transaction rollbacks
 */
describe('Challenger M2-1: Custody Lifecycle Workflows Stress Suite', () => {
  let prisma: PrismaService;
  let assetsService: AssetsService;

  const RUN_ID = Date.now();
  const PREFIX = `CHAL_M2_CUSTODY_${RUN_ID}`;

  // Entity tracking for clean teardown
  const createdAssetIds: string[] = [];
  const createdModelIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdDeptIds: string[] = [];

  let testModelId: string;
  let testDeptId: string;
  let custodianAId: string;
  let custodianBId: string;
  let suspendedUserId: string;
  let disabledUserId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assetsService = new AssetsService(prisma);

    // 1. Ensure an AssetCategory exists
    let cat = await prisma.assetCategory.findFirst();
    if (!cat) {
      cat = await prisma.assetCategory.create({
        data: { name: `${PREFIX}_Category` },
      });
    }

    // 2. Create test department & fetch default position & organization (must not pollute HOLDING root)
    const [defaultPos, defaultOrg] = await Promise.all([
      prisma.position.findFirst({ select: { id: true } }),
      prisma.organization
        .findFirst({ where: { code: 'BSL' }, select: { id: true } })
        .then(
          (o) =>
            o ||
            prisma.organization.findFirst({
              where: { code: { not: 'HOLDING' } },
              select: { id: true },
            }),
        ),
    ]);

    const dept = await prisma.department.create({
      data: {
        name: `${PREFIX} Department`,
        code: `DEPT_${RUN_ID}`,
        organizationId: defaultOrg?.id,
      },
    });
    testDeptId = dept.id;
    createdDeptIds.push(dept.id);

    // 3. Create test users with different statuses & valid foreign keys
    const userA = await prisma.directoryUser.create({
      data: {
        employeeCode: `EMP_A_${RUN_ID}`,
        firstName: 'Custodian',
        lastName: 'Alpha',
        displayName: 'Custodian Alpha',
        email: `custodian.alpha.${RUN_ID}@example.com`,
        status: AccountStatus.ACTIVE,
        departmentId: testDeptId,
        positionId: defaultPos?.id,
        organizationId: defaultOrg?.id,
      },
    });
    custodianAId = userA.id;
    createdUserIds.push(userA.id);

    const userB = await prisma.directoryUser.create({
      data: {
        employeeCode: `EMP_B_${RUN_ID}`,
        firstName: 'Custodian',
        lastName: 'Beta',
        displayName: 'Custodian Beta',
        email: `custodian.beta.${RUN_ID}@example.com`,
        status: AccountStatus.ACTIVE,
        departmentId: testDeptId,
        positionId: defaultPos?.id,
        organizationId: defaultOrg?.id,
      },
    });
    custodianBId = userB.id;
    createdUserIds.push(userB.id);

    const userSuspended = await prisma.directoryUser.create({
      data: {
        employeeCode: `EMP_SUSP_${RUN_ID}`,
        firstName: 'Suspended',
        lastName: 'User',
        displayName: 'Suspended User',
        email: `suspended.${RUN_ID}@example.com`,
        status: AccountStatus.SUSPENDED,
        departmentId: testDeptId,
        positionId: defaultPos?.id,
        organizationId: defaultOrg?.id,
      },
    });
    suspendedUserId = userSuspended.id;
    createdUserIds.push(userSuspended.id);

    const userDisabled = await prisma.directoryUser.create({
      data: {
        employeeCode: `EMP_DIS_${RUN_ID}`,
        firstName: 'Disabled',
        lastName: 'User',
        displayName: 'Disabled User',
        email: `disabled.${RUN_ID}@example.com`,
        status: AccountStatus.DISABLED,
        departmentId: testDeptId,
        positionId: defaultPos?.id,
        organizationId: defaultOrg?.id,
      },
    });
    disabledUserId = userDisabled.id;
    createdUserIds.push(userDisabled.id);

    // 4. Create master Device Model
    const model = await prisma.deviceModel.create({
      data: {
        name: `${PREFIX} ThinkPad T14s`,
        modelCode: `MOD_${RUN_ID}`,
        categoryId: cat.id,
        manufacturer: 'Lenovo',
        unitCost: 1450,
        minThreshold: 5,
      },
    });
    testModelId = model.id;
    createdModelIds.push(model.id);
  });

  afterAll(async () => {
    // Teardown created entities in reverse dependency order
    try {
      if (createdAssetIds.length > 0) {
        await prisma.assetHandoverRecord.deleteMany({
          where: { assetId: { in: createdAssetIds } },
        });
        await prisma.asset.deleteMany({
          where: { id: { in: createdAssetIds } },
        });
      }

      if (createdModelIds.length > 0) {
        await prisma.asset.deleteMany({
          where: { deviceModelId: { in: createdModelIds } },
        });
        await prisma.deviceModel.deleteMany({
          where: { id: { in: createdModelIds } },
        });
      }

      if (createdUserIds.length > 0) {
        await prisma.directoryUser.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }

      if (createdDeptIds.length > 0) {
        await prisma.department.deleteMany({
          where: { id: { in: createdDeptIds } },
        });
      }
    } catch (cleanupErr: unknown) {
      console.warn('Cleanup error:', cleanupErr);
    }

    await prisma.$disconnect();
    await (prisma as unknown as { pool?: { end: () => Promise<void> } }).pool?.end();
  });

  // Helper to create test physical units
  async function createUnit(
    suffix: string,
    status: AssetStatus = AssetStatus.AVAILABLE,
    assignedToId: string | null = null,
  ) {
    const subcode = `${PREFIX}_U_${suffix}_${Date.now().toString().slice(-4)}`;
    const unit = await prisma.asset.create({
      data: {
        deviceModelId: testModelId,
        subcode,
        assetTag: subcode,
        status,
        assignedToId,
        departmentId: assignedToId ? testDeptId : null,
      },
    });
    createdAssetIds.push(unit.id);
    return unit;
  }

  // =========================================================================
  // WORKFLOW 1: Allocate Workflow
  // =========================================================================
  describe('Workflow 1: Allocate Workflow (AVAILABLE -> IN_USE)', () => {
    it('1.1 should allocate AVAILABLE unit: set IN_USE, assignedToId, and create ASSIGNMENT record with isPending=true', async () => {
      const unit = await createUnit('AL_1');

      const result = await assetsService.allocate({
        assetIds: [unit.id],
        assignedToId: custodianAId,
        notes: 'Assigned for software development project',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.assignedToId).toBe(custodianAId);
      expect(result.hasPendingRecord).toBe(true);

      // Verify PostgreSQL state
      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit).not.toBeNull();
      expect(dbUnit?.status).toBe(AssetStatus.IN_USE);
      expect(dbUnit?.assignedToId).toBe(custodianAId);
      expect(dbUnit?.departmentId).toBe(testDeptId);
      expect(dbUnit?.hasPendingRecord).toBe(true);

      // Verify AssetHandoverRecord in DB
      const records = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit.id } });
      expect(records).toHaveLength(1);
      expect(records[0].type).toBe(HandoverRecordType.ASSIGNMENT);
      expect(records[0].recipientId).toBe(custodianAId);
      expect(records[0].isPending).toBe(true);
      expect(records[0].signedDocUrl).toBeNull();
      expect(records[0].notes).toBe('Assigned for software development project');
    });

    it('1.2 should allocate with signedDocUrl: isPending=false and hasPendingRecord=false', async () => {
      const unit = await createUnit('AL_2');
      const docUrl = 'https://storage.uims.local/records/signed_allocation.pdf';

      const result = await assetsService.allocate({
        assetIds: [unit.id],
        assignedToId: custodianAId,
        signedDocUrl: docUrl,
      });

      expect(result.hasPendingRecord).toBe(false);

      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit?.hasPendingRecord).toBe(false);
      expect(dbUnit?.status).toBe(AssetStatus.IN_USE);

      const record = await prisma.assetHandoverRecord.findFirst({ where: { assetId: unit.id } });
      expect(record?.isPending).toBe(false);
      expect(record?.signedDocUrl).toBe(docUrl);
    });

    it('1.3 should reject allocating an already IN_USE unit with ConflictException', async () => {
      const unit = await createUnit('AL_IN_USE', AssetStatus.IN_USE, custodianBId);

      await expect(
        assetsService.allocate({
          assetIds: [unit.id],
          assignedToId: custodianAId,
        }),
      ).rejects.toThrow(ConflictException);

      // Verify unit remains with original custodian B
      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit?.assignedToId).toBe(custodianBId);
      expect(dbUnit?.status).toBe(AssetStatus.IN_USE);
    });

    it('1.4 should reject allocating to SUSPENDED or DISABLED directory users with BadRequestException', async () => {
      const unit1 = await createUnit('AL_SUSP');
      const unit2 = await createUnit('AL_DIS');

      await expect(
        assetsService.allocate({
          assetIds: [unit1.id],
          assignedToId: suspendedUserId,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        assetsService.allocate({
          assetIds: [unit2.id],
          assignedToId: disabledUserId,
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify both units remain AVAILABLE and unassigned
      const check1 = await prisma.asset.findUnique({ where: { id: unit1.id } });
      const check2 = await prisma.asset.findUnique({ where: { id: unit2.id } });
      expect(check1?.status).toBe(AssetStatus.AVAILABLE);
      expect(check1?.assignedToId).toBeNull();
      expect(check2?.status).toBe(AssetStatus.AVAILABLE);
      expect(check2?.assignedToId).toBeNull();
    });

    it('1.5 should atomically roll back multi-unit allocation if one unit is unavailable', async () => {
      const unitAvail1 = await createUnit('AL_TX_1', AssetStatus.AVAILABLE);
      const unitBusy = await createUnit('AL_TX_BUSY', AssetStatus.IN_USE, custodianBId);
      const unitAvail2 = await createUnit('AL_TX_2', AssetStatus.AVAILABLE);

      await expect(
        assetsService.allocate({
          assetIds: [unitAvail1.id, unitBusy.id, unitAvail2.id],
          assignedToId: custodianAId,
        }),
      ).rejects.toThrow(ConflictException);

      // Atomic verification: unitAvail1 and unitAvail2 MUST NOT have been modified
      const check1 = await prisma.asset.findUnique({ where: { id: unitAvail1.id } });
      const check2 = await prisma.asset.findUnique({ where: { id: unitAvail2.id } });
      expect(check1?.status).toBe(AssetStatus.AVAILABLE);
      expect(check1?.assignedToId).toBeNull();
      expect(check2?.status).toBe(AssetStatus.AVAILABLE);
      expect(check2?.assignedToId).toBeNull();

      // Zero handover records created
      const recs1 = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unitAvail1.id },
      });
      const recs2 = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unitAvail2.id },
      });
      expect(recs1).toHaveLength(0);
      expect(recs2).toHaveLength(0);
    });
  });

  // =========================================================================
  // WORKFLOW 2: Return Workflow
  // =========================================================================
  describe('Workflow 2: Return Workflow (IN_USE -> AVAILABLE/MAINTENANCE/RETIRED)', () => {
    it('2.1 should return IN_USE unit to AVAILABLE: clear assignedToId, create RETURN record', async () => {
      const unit = await createUnit('RT_AVAIL', AssetStatus.IN_USE, custodianAId);

      const result = await assetsService.returnUnits({
        assetIds: [unit.id],
        targetStatus: 'AVAILABLE',
        conditionNotes: 'Returned in good working condition',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('AVAILABLE');
      expect(result.returnedIds).toContain(unit.id);
      expect(result.hasPendingRecord).toBe(true);

      // Verify PostgreSQL state
      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit?.status).toBe(AssetStatus.AVAILABLE);
      expect(dbUnit?.assignedToId).toBeNull();
      expect(dbUnit?.hasPendingRecord).toBe(true);
      expect(dbUnit?.notes).toContain('[Return');

      // Verify RETURN record in DB
      const records = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit.id } });
      expect(records).toHaveLength(1);
      expect(records[0].type).toBe(HandoverRecordType.RETURN);
      expect(records[0].recipientId).toBe(custodianAId); // Releasing custodian
      expect(records[0].isPending).toBe(true);
      expect(records[0].notes).toBe('Returned in good working condition');
    });

    it('2.2 should support returning to MAINTENANCE or RETIRED status', async () => {
      const unitMaint = await createUnit('RT_MAINT', AssetStatus.IN_USE, custodianAId);
      const unitRet = await createUnit('RT_RET', AssetStatus.IN_USE, custodianBId);

      await assetsService.returnUnits({
        assetIds: [unitMaint.id],
        targetStatus: 'MAINTENANCE',
        conditionNotes: 'Broken screen, needs LCD replacement',
      });

      const dbMaint = await prisma.asset.findUnique({ where: { id: unitMaint.id } });
      expect(dbMaint?.status).toBe(AssetStatus.MAINTENANCE);
      expect(dbMaint?.assignedToId).toBeNull();

      await assetsService.returnUnits({
        assetIds: [unitRet.id],
        targetStatus: 'RETIRED',
        conditionNotes: 'End of lifecycle 5 years old',
      });

      const dbRet = await prisma.asset.findUnique({ where: { id: unitRet.id } });
      expect(dbRet?.status).toBe(AssetStatus.RETIRED);
      expect(dbRet?.assignedToId).toBeNull();
    });

    it('2.3 should return single asset via returnAsset(id, dto) with signedDocUrl clearing pending', async () => {
      const unit = await createUnit('RT_SINGLE', AssetStatus.IN_USE, custodianAId);
      const docUrl = 'https://storage.uims.local/records/signed_return_direct.pdf';

      const result = await assetsService.returnAsset(unit.id, {
        targetStatus: 'AVAILABLE',
        signedDocUrl: docUrl,
        conditionNotes: 'Signed return verified by IT',
      });

      // returnAsset returns formatted asset with UI label ('In Storage')
      expect(result.status).toBe('In Storage');
      expect(result.assignedToId).toBeNull();
      expect(result.hasPendingRecord).toBe(false);

      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit?.status).toBe(AssetStatus.AVAILABLE);
      expect(dbUnit?.assignedToId).toBeNull();

      const record = await prisma.assetHandoverRecord.findFirst({ where: { assetId: unit.id } });
      expect(record?.type).toBe(HandoverRecordType.RETURN);
      expect(record?.isPending).toBe(false);
      expect(record?.signedDocUrl).toBe(docUrl);
    });

    it('2.4 should reject returning an unassigned AVAILABLE unit with ConflictException (batch) or BadRequestException (single)', async () => {
      const unit = await createUnit('RT_ALREADY_AVAIL', AssetStatus.AVAILABLE, null);

      await expect(
        assetsService.returnUnits({
          assetIds: [unit.id],
          targetStatus: 'AVAILABLE',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        assetsService.returnAsset(unit.id, {
          targetStatus: 'AVAILABLE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('2.5 should reject returning with targetStatus IN_USE with BadRequestException', async () => {
      const unit = await createUnit('RT_INV_STATUS', AssetStatus.IN_USE, custodianAId);

      await expect(
        assetsService.returnUnits({
          assetIds: [unit.id],
          targetStatus: 'IN_USE' as unknown as 'AVAILABLE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('2.6 should atomically roll back multi-unit return if one unit is not IN_USE', async () => {
      const unitInUse = await createUnit('RT_TX_INUSE', AssetStatus.IN_USE, custodianAId);
      const unitAvail = await createUnit('RT_TX_AVAIL', AssetStatus.AVAILABLE, null);

      await expect(
        assetsService.returnUnits({
          assetIds: [unitInUse.id, unitAvail.id],
          targetStatus: 'AVAILABLE',
        }),
      ).rejects.toThrow(ConflictException);

      // Verify unitInUse was NOT modified
      const check = await prisma.asset.findUnique({ where: { id: unitInUse.id } });
      expect(check?.status).toBe(AssetStatus.IN_USE);
      expect(check?.assignedToId).toBe(custodianAId);

      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unitInUse.id },
      });
      expect(records).toHaveLength(0);
    });

    it('2.7 should reject return with unparseable garbage targetStatus with BadRequestException', async () => {
      const unit = await createUnit('RT_GARBAGE', AssetStatus.IN_USE, custodianAId);

      await expect(
        assetsService.returnUnits({
          assetIds: [unit.id],
          targetStatus: 'GARBAGE_STATUS' as unknown as 'AVAILABLE',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        assetsService.returnAsset(unit.id, {
          targetStatus: 'GARBAGE_STATUS' as unknown as 'AVAILABLE',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // WORKFLOW 3: Transfer Workflow
  // =========================================================================
  describe('Workflow 3: Transfer Workflow (Custodian A -> Custodian B)', () => {
    it('3.1 should execute atomic transfer: assignedToId=B, status=IN_USE, creates BOTH RETURN and ASSIGNMENT records', async () => {
      const unit = await createUnit('TR_VALID', AssetStatus.IN_USE, custodianAId);

      const result = await assetsService.transfer({
        assetIds: [unit.id],
        toUserId: custodianBId,
        transferReason: 'Project transfer from Alpha to Beta',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.toUserId).toBe(custodianBId);
      expect(result.hasPendingRecord).toBe(true);

      // 1. Verify Asset state in PostgreSQL
      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit?.status).toBe(AssetStatus.IN_USE); // MUST REMAIN IN_USE
      expect(dbUnit?.assignedToId).toBe(custodianBId); // Updated to Custodian B
      expect(dbUnit?.hasPendingRecord).toBe(true);
      expect(dbUnit?.notes).toContain('[Transfer');

      // 2. Verify EXACTLY TWO AssetHandoverRecord rows in DB
      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unit.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(records).toHaveLength(2);

      // Record 1: RETURN for Custodian A
      const retRecord = records.find((r) => r.type === HandoverRecordType.RETURN);
      expect(retRecord).toBeDefined();
      expect(retRecord?.recipientId).toBe(custodianAId);
      expect(retRecord?.isPending).toBe(true);
      expect(retRecord?.signedDocUrl).toBeNull();
      expect(retRecord?.notes).toContain('Project transfer from Alpha to Beta');

      // Record 2: ASSIGNMENT for Custodian B
      const assignRecord = records.find((r) => r.type === HandoverRecordType.ASSIGNMENT);
      expect(assignRecord).toBeDefined();
      expect(assignRecord?.recipientId).toBe(custodianBId);
      expect(assignRecord?.isPending).toBe(true);
      expect(assignRecord?.signedDocUrl).toBeNull();
      expect(assignRecord?.notes).toContain('Project transfer from Alpha to Beta');
    });

    it('3.2 should support transfer with dual signedDocUrls setting isPending=false and hasPendingRecord=false', async () => {
      const unit = await createUnit('TR_SIGNED', AssetStatus.IN_USE, custodianAId);
      const retDoc = 'https://storage.uims.local/records/signed_tr_return.pdf';
      const assignDoc = 'https://storage.uims.local/records/signed_tr_assignment.pdf';

      const result = await assetsService.transfer({
        assetIds: [unit.id],
        toUserId: custodianBId,
        returnSignedDocUrl: retDoc,
        assignmentSignedDocUrl: assignDoc,
        signedDocUrl: assignDoc, // fallback
      });

      expect(result.hasPendingRecord).toBe(false);

      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit?.hasPendingRecord).toBe(false);
      expect(dbUnit?.assignedToId).toBe(custodianBId);

      const records = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit.id } });
      expect(records).toHaveLength(2);

      const ret = records.find((r) => r.type === HandoverRecordType.RETURN);
      expect(ret?.isPending).toBe(false);
      expect(ret?.signedDocUrl).toBe(retDoc);

      const assign = records.find((r) => r.type === HandoverRecordType.ASSIGNMENT);
      expect(assign?.isPending).toBe(false);
      expect(assign?.signedDocUrl).toBe(assignDoc);
    });

    it('3.3 should reject self-transfer (assignedToId === toUserId) with BadRequestException', async () => {
      const unit = await createUnit('TR_SELF', AssetStatus.IN_USE, custodianAId);

      await expect(
        assetsService.transfer({
          assetIds: [unit.id],
          toUserId: custodianAId,
        }),
      ).rejects.toThrow(BadRequestException);

      // Verify asset remains with Custodian A and zero records created
      const dbUnit = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbUnit?.assignedToId).toBe(custodianAId);
      const records = await prisma.assetHandoverRecord.findMany({ where: { assetId: unit.id } });
      expect(records).toHaveLength(0);
    });

    it('3.4 should reject transfer of unit not IN_USE (e.g. AVAILABLE) with BadRequestException', async () => {
      const unit = await createUnit('TR_AVAIL_FAIL', AssetStatus.AVAILABLE, null);

      await expect(
        assetsService.transfer({
          assetIds: [unit.id],
          toUserId: custodianBId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('3.5 should reject transfer to SUSPENDED or DISABLED recipient with BadRequestException', async () => {
      const unit1 = await createUnit('TR_SUSP_FAIL', AssetStatus.IN_USE, custodianAId);
      const unit2 = await createUnit('TR_DIS_FAIL', AssetStatus.IN_USE, custodianAId);

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

      // Verify both units remain with Custodian A
      const check1 = await prisma.asset.findUnique({ where: { id: unit1.id } });
      const check2 = await prisma.asset.findUnique({ where: { id: unit2.id } });
      expect(check1?.assignedToId).toBe(custodianAId);
      expect(check2?.assignedToId).toBe(custodianAId);
    });

    it('3.6 should atomically roll back multi-unit transfer if one unit is invalid', async () => {
      const unitValid = await createUnit('TR_TX_V', AssetStatus.IN_USE, custodianAId);
      const unitAlreadyB = await createUnit('TR_TX_B', AssetStatus.IN_USE, custodianBId);

      await expect(
        assetsService.transfer({
          assetIds: [unitValid.id, unitAlreadyB.id],
          toUserId: custodianBId,
        }),
      ).rejects.toThrow(BadRequestException);

      // unitValid must remain assigned to Custodian A with zero transfer records
      const check = await prisma.asset.findUnique({ where: { id: unitValid.id } });
      expect(check?.assignedToId).toBe(custodianAId);

      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unitValid.id },
      });
      expect(records).toHaveLength(0);
    });
  });

  // =========================================================================
  // WORKFLOW 4: attachHandoverDocument Dynamic hasPendingRecord Recalculation
  // =========================================================================
  describe('Workflow 4: attachHandoverDocument Dynamic Recalculation', () => {
    it('4.1 should dynamically update hasPendingRecord: stays true when pending > 0, transitions to false when pending === 0', async () => {
      // 1. Create a unit and execute a pending transfer -> creates 2 pending records
      const unit = await createUnit('DOC_MULTI', AssetStatus.IN_USE, custodianAId);

      await assetsService.transfer({
        assetIds: [unit.id],
        toUserId: custodianBId,
      });

      // Confirm DB state: 2 pending records, asset.hasPendingRecord = true
      let pendingCount = await prisma.assetHandoverRecord.count({
        where: { assetId: unit.id, isPending: true },
      });
      expect(pendingCount).toBe(2);

      const records = await prisma.assetHandoverRecord.findMany({
        where: { assetId: unit.id },
        orderBy: { createdAt: 'asc' },
      });
      const [returnRec, assignRec] = records;

      // 2. Attach document to Record #1 (RETURN record)
      const res1 = await assetsService.attachHandoverDocument(
        unit.id,
        'https://storage.uims.local/records/signed_ret.pdf',
        returnRec.id,
        'Custodian A signed return',
      );

      // Verification: 1 pending record remains -> hasPendingRecord MUST REMAIN TRUE
      expect(res1.hasPendingRecord).toBe(true);

      const dbAfter1 = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbAfter1?.hasPendingRecord).toBe(true);

      pendingCount = await prisma.assetHandoverRecord.count({
        where: { assetId: unit.id, isPending: true },
      });
      expect(pendingCount).toBe(1);

      // Verify record 1 is now resolved
      const checkRec1 = await prisma.assetHandoverRecord.findUnique({
        where: { id: returnRec.id },
      });
      expect(checkRec1?.isPending).toBe(false);
      expect(checkRec1?.signedDocUrl).toBe('https://storage.uims.local/records/signed_ret.pdf');

      // 3. Attach document to Record #2 (ASSIGNMENT record)
      const res2 = await assetsService.attachHandoverDocument(
        unit.id,
        'https://storage.uims.local/records/signed_asg.pdf',
        assignRec.id,
        'Custodian B signed receipt',
      );

      // Verification: 0 pending records remain -> hasPendingRecord MUST TRANSITION TO FALSE
      expect(res2.hasPendingRecord).toBe(false);

      const dbAfter2 = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbAfter2?.hasPendingRecord).toBe(false);

      pendingCount = await prisma.assetHandoverRecord.count({
        where: { assetId: unit.id, isPending: true },
      });
      expect(pendingCount).toBe(0);

      // Verify record 2 is now resolved
      const checkRec2 = await prisma.assetHandoverRecord.findUnique({
        where: { id: assignRec.id },
      });
      expect(checkRec2?.isPending).toBe(false);
      expect(checkRec2?.signedDocUrl).toBe('https://storage.uims.local/records/signed_asg.pdf');
    });

    it('4.2 should automatically target most recent pending record when recordId is omitted', async () => {
      const unit = await createUnit('DOC_AUTO', AssetStatus.AVAILABLE, null);

      // Create allocation without signed doc -> 1 pending record
      await assetsService.allocate({
        assetIds: [unit.id],
        assignedToId: custodianBId,
      });

      const initialPending = await prisma.assetHandoverRecord.count({
        where: { assetId: unit.id, isPending: true },
      });
      expect(initialPending).toBe(1);

      // Attach without recordId
      const res = await assetsService.attachHandoverDocument(
        unit.id,
        'https://storage.uims.local/records/auto_upload.pdf',
      );

      expect(res.hasPendingRecord).toBe(false);

      const dbCheck = await prisma.asset.findUnique({ where: { id: unit.id } });
      expect(dbCheck?.hasPendingRecord).toBe(false);

      const remainingPending = await prisma.assetHandoverRecord.count({
        where: { assetId: unit.id, isPending: true },
      });
      expect(remainingPending).toBe(0);
    });

    it('4.3 should reject attachHandoverDocument for non-existent asset ID with NotFoundException', async () => {
      await expect(
        assetsService.attachHandoverDocument(
          '00000000-0000-4000-8000-000000000999',
          'https://storage.uims.local/dummy.pdf',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
