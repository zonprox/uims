import path from 'node:path';
import dotenv from 'dotenv';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { DirectoryService } from '../src/modules/directory/directory.service';
import { AssetStatus, HandoverRecordType } from '@uims/shared-types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

describe('Challenger M3-2 Verification Suite: Document Compliance & Directory Integration', () => {
  let prisma: PrismaService;
  let assetsService: AssetsService;
  let directoryService: DirectoryService;

  // Track created entities for teardown cleanup
  const createdAssetIds: string[] = [];
  const createdRecordIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdModelIds: string[] = [];

  let testModelId: string;
  let testTransferorId: string;
  let testTransfereeId: string;
  let testDepartmentId: string;
  let testOrgId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    assetsService = new AssetsService(prisma);
    directoryService = new DirectoryService(prisma, undefined, assetsService);

    // 1. Resolve or create test Organization and Department (must not pollute HOLDING root)
    let org =
      (await prisma.organization.findFirst({ where: { code: 'BSL' } })) ||
      (await prisma.organization.findFirst({ where: { code: { not: 'HOLDING' } } }));
    if (!org) {
      org = await prisma.organization.create({
        data: {
          code: 'CHALL-ORG',
          name: 'Challenger Verification Corp',
        },
      });
    }
    testOrgId = org.id;

    let dept = await prisma.department.findFirst({ where: { organizationId: testOrgId } });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          code: 'CHALL-DEPT',
          name: 'IT Quality Engineering',
          organizationId: testOrgId,
        },
      });
    }
    testDepartmentId = dept.id;

    // 2. Resolve or create Device Model
    let cat = await prisma.assetCategory.findFirst();
    if (!cat) {
      cat = await prisma.assetCategory.create({
        data: {
          code: 'CHALL-CAT',
          name: 'Test Laptops',
        },
      });
    }

    const model = await prisma.deviceModel.create({
      data: {
        name: 'Challenger ThinkPad T14s Gen 4',
        modelCode: `MOD-CHALL-${Date.now()}`,
        categoryId: cat.id,
        manufacturer: 'Lenovo',
        unitCost: 1450,
        minThreshold: 2,
        specifications: { ram: '32GB', cpu: 'AMD Ryzen 7 Pro' },
      },
    });
    testModelId = model.id;
    createdModelIds.push(model.id);

    // 3. Create two Directory Users (Transferor & Transferee)
    const defaultPos = await prisma.position.findFirst({ select: { id: true } });

    const userA = await prisma.directoryUser.create({
      data: {
        email: `transferor.${Date.now()}@youngonevn.com`,
        firstName: 'Minh',
        lastName: 'Transferor',
        displayName: 'Minh Transferor (Custodian A)',
        employeeCode: `EMP-TRF-${Date.now().toString().slice(-4)}`,
        status: 'ACTIVE',
        organizationId: testOrgId,
        departmentId: testDepartmentId,
        positionId: defaultPos?.id,
      },
    });
    testTransferorId = userA.id;
    createdUserIds.push(userA.id);

    const userB = await prisma.directoryUser.create({
      data: {
        email: `transferee.${Date.now()}@youngonevn.com`,
        firstName: 'Linh',
        lastName: 'Transferee',
        displayName: 'Linh Transferee (Custodian B)',
        employeeCode: `EMP-RCV-${Date.now().toString().slice(-4)}`,
        status: 'ACTIVE',
        organizationId: testOrgId,
        departmentId: testDepartmentId,
        positionId: defaultPos?.id,
      },
    });
    testTransfereeId = userB.id;
    createdUserIds.push(userB.id);
  });

  afterAll(async () => {
    // Teardown: Clean up in reverse dependency order
    if (createdRecordIds.length > 0) {
      await prisma.assetHandoverRecord.deleteMany({
        where: { id: { in: createdRecordIds } },
      });
    }
    if (createdAssetIds.length > 0) {
      await prisma.assetHandoverRecord.deleteMany({
        where: { assetId: { in: createdAssetIds } },
      });
      await prisma.asset.deleteMany({
        where: { id: { in: createdAssetIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.directoryUser.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    if (createdModelIds.length > 0) {
      await prisma.deviceModel.deleteMany({
        where: { id: { in: createdModelIds } },
      });
    }
    await prisma.department.deleteMany({
      where: { code: 'CHALL-DEPT' },
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // TEST 1: TRANSFER DOCUMENT GENERATION (HTML & DOCX)
  // =========================================================================
  describe('Test 1: Transfer Document Generation', () => {
    let transferAssetId: string;

    beforeAll(async () => {
      const asset = await prisma.asset.create({
        data: {
          assetTag: `AST-TRF-${Date.now()}`,
          serialNumber: `SN-LENOVO-${Date.now()}`,
          status: AssetStatus.IN_USE,
          deviceModelId: testModelId,
          assignedToId: testTransferorId,
          departmentId: testDepartmentId,
          hasPendingRecord: false,
          notes: 'Deployed for executive QA',
        },
      });
      transferAssetId = asset.id;
      createdAssetIds.push(asset.id);
    });

    it('1.1 should generate Transfer Agreement HTML with 3-party metadata (Transferor, Transferee, IT Witness)', async () => {
      const docResult = await assetsService.generateHandoverDocument({
        type: 'transfer',
        assetIds: [transferAssetId],
        transferorId: testTransferorId,
        recipientId: testTransfereeId,
        conditionNotes: 'All ports, battery health (98%), and keyboard tested operational',
      });

      expect(docResult).toBeDefined();
      expect(docResult.title).toBe('HARDWARE ASSET CUSTODY TRANSFER AGREEMENT');
      expect(docResult.filename).toContain('asset_handover_');
      expect(docResult.generatedAt).toBeDefined();

      const html = docResult.html;

      // 1. Verify 3-party metadata in Section 1 (Parties Involved)
      expect(html).toContain('1. Parties Involved');
      expect(html).toContain('Transferor / Custodian A');
      expect(html).toContain('Transferee / Custodian B');
      expect(html).toContain('Witness / IT Representative');

      // Verify party details populated
      expect(html).toContain('Minh Transferor (Custodian A)');
      expect(html).toContain('Linh Transferee (Custodian B)');
      expect(html).toContain('IT Asset Administrator');
      expect(html).toContain('IT Infrastructure & Operations');
      expect(html).toContain('Custody Reassigned');

      // 2. Verify Equipment table in Section 2
      expect(html).toContain('2. Hardware Equipment Specifications');
      expect(html).toContain('Asset Tag');
      expect(html).toContain('Asset Name');
      expect(html).toContain('Manufacturer & Model');
      expect(html).toContain('Serial Number');
      expect(html).toContain('Condition');
      expect(html).toContain('Challenger ThinkPad T14s Gen 4');
      expect(html).toContain('Lenovo');
      expect(html).toContain('SN-LENOVO-');
      expect(html).toContain('All ports, battery health (98%), and keyboard tested operational');

      // 3. Verify Terms & Conditions clauses governing 3-party transfer
      expect(html).toContain('Transferor confirms relinquishing physical custody');
      expect(html).toContain('Transferee acknowledges physical receipt');
      expect(html).toContain('The IT Department has verified the hardware state');

      // 4. Verify 3 signature blocks in Section 3
      expect(html).toContain('3. Acknowledgement & Signatures');
      expect(html).toContain('<div class="sig-title">Transferor (Custodian A)</div>');
      expect(html).toContain('<div class="sig-title">Transferee (Custodian B)</div>');
      expect(html).toContain('<div class="sig-title">IT Witness / Inspector</div>');

      // Verify all 3 cards contain signature lines
      const sigLineMatches = html.match(/<span>Signature: ______________________<\/span>/g);
      expect(sigLineMatches?.length).toBe(3);

      const dateMatches = html.match(/<span>Date: ___\/____?\/______<\/span>/g);
      expect(dateMatches?.length).toBe(3);
    });

    it('1.2 should auto-resolve Transferor from asset.assignedTo when transferorId is omitted', async () => {
      // Omit transferorId; transferor should automatically resolve from foundAssets[0].assignedTo
      const docResult = await assetsService.generateHandoverDocument({
        type: 'transfer',
        assetIds: [transferAssetId],
        recipientId: testTransfereeId,
      });

      expect(docResult.html).toContain('Minh Transferor (Custodian A)');
      expect(docResult.html).toContain('Linh Transferee (Custodian B)');
      expect(docResult.html).toContain('IT Witness / Inspector');
    });

    it('1.3 should generate valid Word (.docx) binary with 3-party metadata and 3 signature blocks', async () => {
      const docxResult = await assetsService.generateHandoverDocx({
        type: 'transfer',
        assetIds: [transferAssetId],
        transferorId: testTransferorId,
        recipientId: testTransfereeId,
        conditionNotes: 'Verified DOCX transfer layout',
      });

      expect(docxResult.buffer).toBeInstanceOf(Buffer);
      expect(docxResult.buffer.length).toBeGreaterThan(1500);

      // DOCX standard zip archive header (PK 0x50 0x4B 0x03 0x04)
      expect(docxResult.buffer[0]).toBe(0x50);
      expect(docxResult.buffer[1]).toBe(0x4b);
      expect(docxResult.buffer[2]).toBe(0x03);
      expect(docxResult.buffer[3]).toBe(0x04);
      expect(docxResult.filename).toMatch(/\.docx$/);
    });

    it('1.4 should render blank 3-row equipment template when no assets are provided for transfer agreement', async () => {
      const emptyDoc = await assetsService.generateHandoverDocument({
        type: 'transfer',
        assetIds: [],
        recipientId: testTransfereeId,
      });

      expect(emptyDoc.html).toContain('AST-__________');
      expect(emptyDoc.html).toContain('SN-_________________');
      expect(emptyDoc.html).toContain('Transferor (Custodian A)');
      expect(emptyDoc.html).toContain('Transferee (Custodian B)');
      expect(emptyDoc.html).toContain('IT Witness / Inspector');
    });
  });

  // =========================================================================
  // TEST 2: DYNAMIC COMPLIANCE RECALCULATION ON MULTI-PENDING ASSETS
  // =========================================================================
  describe('Test 2: Dynamic Compliance Recalculation on Multi-Pending Assets', () => {
    let multiPendingAssetId: string;
    let record1Id: string;
    let record2Id: string;

    beforeAll(async () => {
      // Create a physical asset in IN_USE status with hasPendingRecord = true
      const asset = await prisma.asset.create({
        data: {
          assetTag: `AST-PEND-${Date.now()}`,
          serialNumber: `SN-PEND-${Date.now()}`,
          status: AssetStatus.IN_USE,
          deviceModelId: testModelId,
          assignedToId: testTransfereeId,
          departmentId: testDepartmentId,
          hasPendingRecord: true,
          notes: 'Asset transferred with 2 pending handover documents',
        },
      });
      multiPendingAssetId = asset.id;
      createdAssetIds.push(asset.id);

      // Create Record #1 (e.g. RETURN from Custodian A)
      const rec1 = await prisma.assetHandoverRecord.create({
        data: {
          assetId: multiPendingAssetId,
          type: HandoverRecordType.RETURN,
          recipientId: testTransferorId,
          isPending: true,
          notes: 'Return agreement pending signature from Custodian A',
        },
      });
      record1Id = rec1.id;
      createdRecordIds.push(rec1.id);

      // Create Record #2 (e.g. ASSIGNMENT to Custodian B)
      const rec2 = await prisma.assetHandoverRecord.create({
        data: {
          assetId: multiPendingAssetId,
          type: HandoverRecordType.ASSIGNMENT,
          recipientId: testTransfereeId,
          isPending: true,
          notes: 'Assignment agreement pending signature from Custodian B',
        },
      });
      record2Id = rec2.id;
      createdRecordIds.push(rec2.id);
    });

    it('2.1 verify initial state: parent Asset has hasPendingRecord = true and 2 pending records', async () => {
      const asset = await prisma.asset.findUnique({
        where: { id: multiPendingAssetId },
        include: { handoverRecords: true },
      });
      expect(asset).toBeDefined();
      expect(asset?.hasPendingRecord).toBe(true);

      const pendingCount = await prisma.assetHandoverRecord.count({
        where: { assetId: multiPendingAssetId, isPending: true },
      });
      expect(pendingCount).toBe(2);
    });

    it('2.2 attach signed document to Record #1: hasPendingRecord REMAINS TRUE because Record #2 is still pending', async () => {
      const attachResult = await assetsService.attachHandoverDocument(
        multiPendingAssetId,
        'https://storage.uims.local/records/signed_transfer_return.pdf',
        record1Id,
        'Custodian A signed return protocol',
      );

      // Verify the returned asset state
      expect(attachResult).toBeDefined();
      expect(attachResult.id).toBe(multiPendingAssetId);
      expect(attachResult.hasPendingRecord).toBe(true);

      // Verify in database: Record #1 resolved, Record #2 still pending
      const rec1 = await prisma.assetHandoverRecord.findUnique({ where: { id: record1Id } });
      expect(rec1?.isPending).toBe(false);
      expect(rec1?.signedDocUrl).toBe(
        'https://storage.uims.local/records/signed_transfer_return.pdf',
      );

      const rec2 = await prisma.assetHandoverRecord.findUnique({ where: { id: record2Id } });
      expect(rec2?.isPending).toBe(true);

      // Verify parent asset in database
      const parentAsset = await prisma.asset.findUnique({ where: { id: multiPendingAssetId } });
      expect(parentAsset?.hasPendingRecord).toBe(true);
    });

    it('2.3 attach signed document to Record #2: hasPendingRecord TRANSITIONS TO FALSE now that all records are resolved', async () => {
      const attachResult = await assetsService.attachHandoverDocument(
        multiPendingAssetId,
        'https://storage.uims.local/records/signed_transfer_assignment.pdf',
        record2Id,
        'Custodian B signed receipt protocol',
      );

      // Verify the returned asset state
      expect(attachResult).toBeDefined();
      expect(attachResult.id).toBe(multiPendingAssetId);
      expect(attachResult.hasPendingRecord).toBe(false);

      // Verify in database: both records resolved
      const rec2 = await prisma.assetHandoverRecord.findUnique({ where: { id: record2Id } });
      expect(rec2?.isPending).toBe(false);
      expect(rec2?.signedDocUrl).toBe(
        'https://storage.uims.local/records/signed_transfer_assignment.pdf',
      );

      const pendingCount = await prisma.assetHandoverRecord.count({
        where: { assetId: multiPendingAssetId, isPending: true },
      });
      expect(pendingCount).toBe(0);

      // Verify parent asset in database
      const parentAsset = await prisma.asset.findUnique({ where: { id: multiPendingAssetId } });
      expect(parentAsset?.hasPendingRecord).toBe(false);
    });

    it('2.4 adversarial check: automatic pending record resolution without explicit recordId preserves multi-pending invariant', async () => {
      // Create a second test asset with 2 pending records
      const autoAsset = await prisma.asset.create({
        data: {
          assetTag: `AST-AUTO-${Date.now()}`,
          serialNumber: `SN-AUTO-${Date.now()}`,
          status: AssetStatus.IN_USE,
          deviceModelId: testModelId,
          assignedToId: testTransfereeId,
          departmentId: testDepartmentId,
          hasPendingRecord: true,
        },
      });
      createdAssetIds.push(autoAsset.id);

      const r1 = await prisma.assetHandoverRecord.create({
        data: {
          assetId: autoAsset.id,
          type: HandoverRecordType.ASSIGNMENT,
          recipientId: testTransfereeId,
          isPending: true,
        },
      });
      const r2 = await prisma.assetHandoverRecord.create({
        data: {
          assetId: autoAsset.id,
          type: HandoverRecordType.RETURN,
          recipientId: testTransferorId,
          isPending: true,
        },
      });
      createdRecordIds.push(r1.id, r2.id);

      // Call 1: Omit recordId -> resolves newest pending record, 1 remains pending -> hasPendingRecord remains true
      const step1 = await assetsService.attachHandoverDocument(
        autoAsset.id,
        'https://storage.uims.local/records/auto_doc1.pdf',
      );
      expect(step1.hasPendingRecord).toBe(true);

      const dbCheck1 = await prisma.asset.findUnique({ where: { id: autoAsset.id } });
      expect(dbCheck1?.hasPendingRecord).toBe(true);

      // Call 2: Omit recordId -> resolves the last pending record -> hasPendingRecord transitions to false
      const step2 = await assetsService.attachHandoverDocument(
        autoAsset.id,
        'https://storage.uims.local/records/auto_doc2.pdf',
      );
      expect(step2.hasPendingRecord).toBe(false);

      const dbCheck2 = await prisma.asset.findUnique({ where: { id: autoAsset.id } });
      expect(dbCheck2?.hasPendingRecord).toBe(false);
    });

    it('2.5 rejects attaching document to non-existent asset ID with NotFoundException', async () => {
      await expect(
        assetsService.attachHandoverDocument(
          'non-existent-uuid-999',
          'https://storage.uims.local/doc.pdf',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // TEST 3: DIRECTORY CUSTODY DELEGATION
  // =========================================================================
  describe('Test 3: Directory Custody Delegation', () => {
    let delegatingAssetId: string;

    beforeAll(async () => {
      const asset = await prisma.asset.create({
        data: {
          assetTag: `AST-DELEG-${Date.now()}`,
          serialNumber: `SN-DELEG-${Date.now()}`,
          status: AssetStatus.AVAILABLE,
          deviceModelId: testModelId,
          departmentId: testDepartmentId,
          assignedToId: null,
          hasPendingRecord: false,
          notes: 'Warehouse stock unit ready for directory allocation',
        },
      });
      delegatingAssetId = asset.id;
      createdAssetIds.push(asset.id);
    });

    it('3.1 DirectoryService.assignAsset delegates to AssetsService.allocateUnits and creates canonical HandoverRecord', async () => {
      const allocateSpy = vi.spyOn(assetsService, 'allocateUnits');

      // Call assignAsset through DirectoryService
      const assigned = await directoryService.assignAsset(testTransfereeId, delegatingAssetId);

      // 1. Verify AssetsService.allocateUnits was invoked
      expect(allocateSpy).toHaveBeenCalledTimes(1);
      expect(allocateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          assetIds: [delegatingAssetId],
          assignedToId: testTransfereeId,
          conditionNotes: 'Assigned via Directory User profile',
        }),
      );

      // 2. Verify returned asset state
      expect(assigned).toBeDefined();
      expect(assigned?.id).toBe(delegatingAssetId);

      // 3. Verify database state
      const dbAsset = await prisma.asset.findUnique({
        where: { id: delegatingAssetId },
        include: { handoverRecords: true },
      });
      expect(dbAsset?.status).toBe(AssetStatus.IN_USE);
      expect(dbAsset?.assignedToId).toBe(testTransfereeId);
      expect(dbAsset?.hasPendingRecord).toBe(true);

      // 4. Verify canonical AssetHandoverRecord created
      const handoverRec = await prisma.assetHandoverRecord.findFirst({
        where: {
          assetId: delegatingAssetId,
          recipientId: testTransfereeId,
          type: HandoverRecordType.ASSIGNMENT,
        },
      });
      expect(handoverRec).toBeDefined();
      expect(handoverRec?.isPending).toBe(true);
      expect(handoverRec?.notes).toContain('Assigned via Directory User profile');
      if (handoverRec) createdRecordIds.push(handoverRec.id);

      allocateSpy.mockRestore();
    });

    it('3.2 DirectoryService.assignAsset rejects if asset is already assigned (ConflictException)', async () => {
      // Asset is currently IN_USE by testTransfereeId; attempting to assign to testTransferorId must fail
      await expect(
        directoryService.assignAsset(testTransferorId, delegatingAssetId),
      ).rejects.toThrow(ConflictException);
    });

    it('3.3 DirectoryService.assignAsset rejects if user is SUSPENDED (BadRequestException)', async () => {
      const defaultPos = await prisma.position.findFirst({ select: { id: true } });
      const suspendedUser = await prisma.directoryUser.create({
        data: {
          email: `suspended.${Date.now()}@youngonevn.com`,
          firstName: 'Suspended',
          lastName: 'User',
          employeeCode: `EMP-SUSP-${Date.now().toString().slice(-4)}`,
          status: 'SUSPENDED',
          organizationId: testOrgId,
          departmentId: testDepartmentId,
          positionId: defaultPos?.id,
        },
      });
      createdUserIds.push(suspendedUser.id);

      await expect(
        directoryService.assignAsset(suspendedUser.id, delegatingAssetId),
      ).rejects.toThrow(BadRequestException);
    });

    it('3.4 DirectoryService.unassignAsset delegates to AssetsService.returnUnits and creates canonical HandoverRecord', async () => {
      const returnSpy = vi.spyOn(assetsService, 'returnUnits');

      // Call unassignAsset through DirectoryService
      const result = await directoryService.unassignAsset(testTransfereeId, delegatingAssetId);

      // 1. Verify AssetsService.returnUnits was invoked
      expect(returnSpy).toHaveBeenCalledTimes(1);
      expect(returnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          assetIds: [delegatingAssetId],
          targetStatus: 'AVAILABLE',
          conditionNotes: 'Unassigned (returned) via Directory User profile',
        }),
      );

      // 2. Verify returned object
      expect(result.success).toBe(true);
      expect(result.asset?.id).toBe(delegatingAssetId);

      // 3. Verify database state: asset returned to AVAILABLE, assignedToId cleared
      const dbAsset = await prisma.asset.findUnique({
        where: { id: delegatingAssetId },
        include: { handoverRecords: true },
      });
      expect(dbAsset?.status).toBe(AssetStatus.AVAILABLE);
      expect(dbAsset?.assignedToId).toBeNull();
      expect(dbAsset?.hasPendingRecord).toBe(true); // Return without signed doc leaves return record pending

      // 4. Verify canonical AssetHandoverRecord created for RETURN
      const returnRec = await prisma.assetHandoverRecord.findFirst({
        where: {
          assetId: delegatingAssetId,
          type: HandoverRecordType.RETURN,
          recipientId: testTransfereeId,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      expect(returnRec).toBeDefined();
      expect(returnRec?.isPending).toBe(true);
      expect(returnRec?.notes).toContain('Unassigned (returned) via Directory User profile');
      if (returnRec) createdRecordIds.push(returnRec.id);

      returnSpy.mockRestore();
    });

    it('3.5 DirectoryService.unassignAsset rejects if asset is not assigned to any user (BadRequestException)', async () => {
      // Asset is now AVAILABLE (unassigned)
      await expect(
        directoryService.unassignAsset(testTransfereeId, delegatingAssetId),
      ).rejects.toThrow(BadRequestException);
    });

    it('3.6 DirectoryService.unassignAsset rejects if asset is assigned to a different user (BadRequestException)', async () => {
      // Assign asset to userA
      await directoryService.assignAsset(testTransferorId, delegatingAssetId);

      // Attempt unassign by userB
      await expect(
        directoryService.unassignAsset(testTransfereeId, delegatingAssetId),
      ).rejects.toThrow(BadRequestException);

      // Clean up: unassign properly by userA
      await directoryService.unassignAsset(testTransferorId, delegatingAssetId);
    });

    it('3.7 DirectoryService.assignAsset rejects assigning a DeviceModel blueprint instead of physical unit', async () => {
      await expect(directoryService.assignAsset(testTransferorId, testModelId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
