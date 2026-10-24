import path from 'node:path';
import dotenv from 'dotenv';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AccessAssignmentStatus,
  AccessSubjectType,
  AccessValidityType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  NonADUserStatus,
} from '@uims/shared-types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { AccessControlStorageService } from '../src/modules/access-control/access-control-storage.service';
import { AccessControlService } from '../src/modules/access-control/access-control.service';
import { AccessControlController } from '../src/modules/access-control/access-control.controller';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

describe('Challenger M3-2: Physical Access Control Empirical Stress Harness', () => {
  let prisma: PrismaService;
  let storageService: AccessControlStorageService;
  let service: AccessControlService;
  let controller: AccessControlController;

  // Track created entities for clean teardown
  const createdAssignmentIds: string[] = [];
  const createdScanDocIds: string[] = [];
  const createdDoorIds: string[] = [];
  const createdNonADUserIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    storageService = new AccessControlStorageService();
    service = new AccessControlService(prisma, storageService);
    controller = new AccessControlController(service, storageService);
  });

  afterAll(async () => {
    // Teardown created test entities
    if (createdAssignmentIds.length > 0) {
      await prisma.doorAccessAssignment.deleteMany({
        where: { id: { in: createdAssignmentIds } },
      });
    }
    if (createdScanDocIds.length > 0) {
      await prisma.doorAccessDocumentScan.deleteMany({
        where: { id: { in: createdScanDocIds } },
      });
    }
    if (createdDoorIds.length > 0) {
      await prisma.accessDoor.deleteMany({
        where: { id: { in: createdDoorIds } },
      });
    }
    if (createdNonADUserIds.length > 0) {
      await prisma.nonADUser.deleteMany({
        where: { id: { in: createdNonADUserIds } },
      });
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. DUAL-SUBJECT RETRIEVAL EMPIRICAL VERIFICATION
  // =========================================================================
  describe('1. Dual-Subject Access Profile Retrieval', () => {
    it('1.1 should query access profile of an AD user (DIRECTORY_USER) and verify exact accessible doors & grant docs', async () => {
      // Find an AD user with seeded assignments (e.g. BSL-002: Pham Hoang Nam or BSH-002: Dang Thanh Phong)
      const adUser = await prisma.directoryUser.findFirst({
        where: {
          employeeCode: { in: ['BSL-002', 'BSH-002'] },
          doorAssignments: { some: { status: AccessAssignmentStatus.ACTIVE } },
        },
        include: {
          doorAssignments: {
            where: { status: AccessAssignmentStatus.ACTIVE },
            include: { door: true, grantDocument: true },
          },
        },
      });

      expect(adUser).toBeDefined();
      expect(adUser?.id).toBeDefined();

      const profile = await controller.getUserAccessDetail('DIRECTORY_USER', adUser!.id);

      // Verify subject identification
      expect(profile.subjectType).toBe(AccessSubjectType.DIRECTORY_USER);
      expect(profile.subjectId).toBe(adUser!.id);
      expect(profile.fullName).toBeTruthy();
      expect(profile.codeOrBadge).toBeTruthy();
      expect(profile.organizationOrCompany).toBeTruthy();

      // Verify active assignments match database ground truth
      expect(profile.activeAssignments.length).toBeGreaterThanOrEqual(1);
      for (const assignment of profile.activeAssignments) {
        expect(assignment.doorId).toBeDefined();
        expect(assignment.door).toBeDefined();
        expect(assignment.door?.doorCode).toBeTruthy();
        expect(assignment.status).toBe(AccessAssignmentStatus.ACTIVE);

        // Verify grant document link
        expect(assignment.grantDocumentId).toBeTruthy();
        expect(assignment.grantDocument).toBeDefined();
        expect(assignment.grantDocument?.documentType).toBe(DoorDocumentType.GRANT);
        expect(assignment.grantDocument?.fileName).toMatch(/\.pdf$/i);
        expect(assignment.grantDocument?.fileHash).toHaveLength(64);
        expect(assignment.grantDocument?.approverName).toBeTruthy();
      }

      // Verify 'AD' alias also works identically
      const profileAlias = await controller.getUserAccessDetail('AD', adUser!.id);
      expect(profileAlias.subjectId).toBe(profile.subjectId);
      expect(profileAlias.activeAssignments.length).toBe(profile.activeAssignments.length);
    });

    it('1.2 should query access profile of a Non-AD user (NON_AD_USER) and verify exact accessible doors & grant docs', async () => {
      // Find a Non-AD contractor with active assignments (e.g. EXT-B0892: Michael Chen)
      const nonADUser = await prisma.nonADUser.findFirst({
        where: {
          badgeNumber: 'EXT-B0892',
          assignments: { some: { status: AccessAssignmentStatus.ACTIVE } },
        },
        include: {
          assignments: {
            where: { status: AccessAssignmentStatus.ACTIVE },
            include: { door: true, grantDocument: true },
          },
        },
      });

      expect(nonADUser).toBeDefined();
      expect(nonADUser?.id).toBeDefined();

      const profile = await controller.getUserAccessDetail('NON_AD_USER', nonADUser!.id);

      // Verify subject identification
      expect(profile.subjectType).toBe(AccessSubjectType.NON_AD_USER);
      expect(profile.subjectId).toBe(nonADUser!.id);
      expect(profile.fullName).toBe(nonADUser!.fullName);
      expect(profile.codeOrBadge).toBe(nonADUser!.badgeNumber);
      expect(profile.organizationOrCompany).toBe(nonADUser!.company);

      // Verify active assignments
      expect(profile.activeAssignments.length).toBeGreaterThanOrEqual(1);
      for (const assignment of profile.activeAssignments) {
        expect(assignment.doorId).toBeDefined();
        expect(assignment.door).toBeDefined();
        expect(assignment.status).toBe(AccessAssignmentStatus.ACTIVE);

        // Verify grant document relation is fully populated
        expect(assignment.grantDocumentId).toBeTruthy();
        expect(assignment.grantDocument).toBeDefined();
        expect(assignment.grantDocument?.documentType).toBe(DoorDocumentType.GRANT);
        expect(assignment.grantDocument?.fileName).toMatch(/\.pdf$/i);
        expect(assignment.grantDocument?.fileHash).toHaveLength(64);
        expect(assignment.grantDocument?.approverName).toBeTruthy();
      }
    });

    it('1.3 should reject access profile queries for non-existent users with NotFoundException', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      await expect(
        controller.getUserAccessDetail('DIRECTORY_USER', nonExistentUuid),
      ).rejects.toThrow(NotFoundException);
      await expect(controller.getUserAccessDetail('NON_AD_USER', nonExistentUuid)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // 2. DUAL-DOCUMENT RETENTION ON REVOKED ASSIGNMENTS
  // =========================================================================
  describe('2. Dual-Document Retention Verification', () => {
    it('2.1 should verify existing seeded revoked assignments retain BOTH grantDocument AND revocationDocument', async () => {
      // Find seeded revoked assignment (David Miller - VIS-1044)
      const revokedUser = await prisma.nonADUser.findFirst({
        where: { badgeNumber: 'VIS-1044' },
      });
      expect(revokedUser).toBeDefined();

      const profile = await controller.getUserAccessDetail('NON_AD_USER', revokedUser!.id);
      expect(profile.revokedAssignments.length).toBeGreaterThanOrEqual(1);

      for (const assignment of profile.revokedAssignments) {
        expect(assignment.status).toBe(AccessAssignmentStatus.REVOKED);
        expect(assignment.revokedAt).toBeTruthy();
        expect(assignment.revocationReason).toBeTruthy();

        // 1. Grant Document must be retained
        expect(assignment.grantDocumentId).toBeTruthy();
        expect(assignment.grantDocument).toBeDefined();
        expect(assignment.grantDocument?.documentType).toBe(DoorDocumentType.GRANT);
        expect(assignment.grantDocument?.fileName).toMatch(/\.pdf$/i);
        expect(assignment.grantDocument?.fileHash).toHaveLength(64);
        expect(assignment.grantDocument?.approverName).toBeTruthy();

        // 2. Revocation Document must be retained simultaneously
        expect(assignment.revocationDocumentId).toBeTruthy();
        expect(assignment.revocationDocument).toBeDefined();
        expect(assignment.revocationDocument?.documentType).toBe(DoorDocumentType.REVOCATION);
        expect(assignment.revocationDocument?.fileName).toMatch(/\.pdf$/i);
        expect(assignment.revocationDocument?.fileHash).toHaveLength(64);
        expect(assignment.revocationDocument?.approverName).toBeTruthy();

        // Documents must be distinct records
        expect(assignment.grantDocumentId).not.toBe(assignment.revocationDocumentId);
      }
    });

    it('2.2 should execute a live grant -> revoke lifecycle and empirically prove dual-document coexistence', async () => {
      // Create a test door
      const testDoor = await prisma.accessDoor.create({
        data: {
          doorCode: `DR-CHALL-${Date.now().toString().slice(-6)}`,
          name: 'Challenger Test Vault Door',
          building: 'Test Facility Alpha',
          floor: 'Basement 1',
          securityLevel: DoorSecurityLevel.CRITICAL,
          status: DoorStatus.ACTIVE,
        },
      });
      createdDoorIds.push(testDoor.id);

      // Create a test non-AD contractor
      const testUser = await prisma.nonADUser.create({
        data: {
          badgeNumber: `CHALL-${Date.now().toString().slice(-5)}`,
          fullName: 'Test Auditor Subject',
          company: 'KPMG Verification',
          identityNumber: '001122334455',
          userType: 'AUDITOR',
          status: NonADUserStatus.ACTIVE,
        },
      });
      createdNonADUserIds.push(testUser.id);

      // Create Grant Document Scan
      const grantDoc = await prisma.doorAccessDocumentScan.create({
        data: {
          documentType: DoorDocumentType.GRANT,
          fileName: `grant-chall-${Date.now()}.pdf`,
          originalName: 'Audit_Grant_Authorization.pdf',
          filePath: `/uploads/access-control/scans/grant-chall-${Date.now()}.pdf`,
          fileUrl: `/api/v1/access-control/documents/file/grant-chall-${Date.now()}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 4096,
          fileHash: '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
          approverName: 'CISO Doan Minh Tri',
          reason: 'Initial compliance inspection grant',
        },
      });
      createdScanDocIds.push(grantDoc.id);

      // 1. Perform Grant Access with mandatory scan
      const grantResult = await service.grantAccess({
        subjectType: AccessSubjectType.NON_AD_USER,
        subjectIds: [testUser.id],
        doorIds: [testDoor.id],
        accessType: AccessValidityType.PERMANENT,
        approverName: 'CISO Doan Minh Tri',
        reason: 'Temporary audit inspection',
        documentId: grantDoc.id,
      });

      expect(grantResult.createdAssignmentsCount).toBe(1);
      const createdAssignment = grantResult.assignments[0];
      createdAssignmentIds.push(createdAssignment.id);

      expect(createdAssignment.status).toBe(AccessAssignmentStatus.ACTIVE);
      expect(createdAssignment.grantDocumentId).toBe(grantDoc.id);
      expect(createdAssignment.revocationDocumentId).toBeNull();

      // Create Revocation Document Scan
      const revokeDoc = await prisma.doorAccessDocumentScan.create({
        data: {
          documentType: DoorDocumentType.REVOCATION,
          fileName: `revoke-chall-${Date.now()}.pdf`,
          originalName: 'Audit_Revoke_Authorization.pdf',
          filePath: `/uploads/access-control/scans/revoke-chall-${Date.now()}.pdf`,
          fileUrl: `/api/v1/access-control/documents/file/revoke-chall-${Date.now()}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 5120,
          fileHash: 'ffff222233334444555566667777888899990000aaaabbbbccccddddeeee1111',
          approverName: 'CISO Doan Minh Tri',
          reason: 'Audit cycle concluded, revoke physical access',
        },
      });
      createdScanDocIds.push(revokeDoc.id);

      // 2. Perform Revoke Access with mandatory scan
      const revokeResult = await service.revokeAccess({
        assignmentIds: [createdAssignment.id],
        approverName: 'CISO Doan Minh Tri',
        reason: 'Audit concluded successfully',
        documentId: revokeDoc.id,
      });

      expect(revokeResult.revokedAssignmentsCount).toBe(1);
      const revokedAssignment = revokeResult.assignments[0];
      expect(revokedAssignment.status).toBe(AccessAssignmentStatus.REVOKED);
      expect(revokedAssignment.grantDocumentId).toBe(grantDoc.id);
      expect(revokedAssignment.revocationDocumentId).toBe(revokeDoc.id);

      // 3. Query User Access Profile and verify BOTH relations simultaneously
      const userProfile = await controller.getUserAccessDetail('NON_AD_USER', testUser.id);
      expect(userProfile.activeAssignments.length).toBe(0);
      expect(userProfile.revokedAssignments.length).toBe(1);

      const auditAssignment = userProfile.revokedAssignments[0];
      expect(auditAssignment.id).toBe(createdAssignment.id);
      expect(auditAssignment.status).toBe(AccessAssignmentStatus.REVOKED);

      // Verify Grant Document is still fully retained and populated
      expect(auditAssignment.grantDocumentId).toBe(grantDoc.id);
      expect(auditAssignment.grantDocument).toBeDefined();
      expect(auditAssignment.grantDocument?.fileName).toBe(grantDoc.fileName);
      expect(auditAssignment.grantDocument?.fileHash).toBe(grantDoc.fileHash);
      expect(auditAssignment.grantDocument?.documentType).toBe(DoorDocumentType.GRANT);

      // Verify Revocation Document is attached and populated
      expect(auditAssignment.revocationDocumentId).toBe(revokeDoc.id);
      expect(auditAssignment.revocationDocument).toBeDefined();
      expect(auditAssignment.revocationDocument?.fileName).toBe(revokeDoc.fileName);
      expect(auditAssignment.revocationDocument?.fileHash).toBe(revokeDoc.fileHash);
      expect(auditAssignment.revocationDocument?.documentType).toBe(DoorDocumentType.REVOCATION);
    });
  });

  // =========================================================================
  // 3. BOUNDED PAGINATION EMPIRICAL STRESS TESTS
  // =========================================================================
  describe('3. Bounded Pagination Clamping (AGENTS.md Directive)', () => {
    it('3.1 should clamp GET /doors pageSize=1000 and take=500 to <= 100', async () => {
      // Test via Controller with pageSize=1000
      const res1000 = await controller.getDoors({ pageSize: 1000 });
      expect(res1000.pageSize).toBeLessThanOrEqual(100);
      expect(res1000.pageSize).toBe(100);
      expect(res1000.items.length).toBeLessThanOrEqual(100);

      // Test with pageSize=500
      const res500 = await controller.getDoors({ pageSize: 500 });
      expect(res500.pageSize).toBeLessThanOrEqual(100);
      expect(res500.pageSize).toBe(100);
      expect(res500.items.length).toBeLessThanOrEqual(100);

      // Test with string "1000"
      const resStr = await controller.getDoors({ pageSize: '1000' as unknown as number });
      expect(resStr.pageSize).toBeLessThanOrEqual(100);
      expect(resStr.pageSize).toBe(100);

      // Test boundary: pageSize=100
      const res100 = await controller.getDoors({ pageSize: 100 });
      expect(res100.pageSize).toBe(100);

      // Test valid smaller pageSize
      const res25 = await controller.getDoors({ pageSize: 25 });
      expect(res25.pageSize).toBe(25);

      // Test zero or negative input clamps to minimum 1
      const resZero = await controller.getDoors({ pageSize: 0 });
      expect(resZero.pageSize).toBe(20); // Default fallback when 0

      const resNeg = await controller.getDoors({ pageSize: -5 });
      expect(resNeg.pageSize).toBe(1); // Math.max(1, -5) clamps to 1
    });

    it('3.2 should clamp GET /non-ad-users pageSize=1000 and take=500 to <= 100', async () => {
      // Test via Controller with pageSize=1000
      const res1000 = await controller.getNonADUsers({ pageSize: 1000 });
      expect(res1000.pageSize).toBeLessThanOrEqual(100);
      expect(res1000.pageSize).toBe(100);
      expect(res1000.items.length).toBeLessThanOrEqual(100);

      // Test with pageSize=500
      const res500 = await controller.getNonADUsers({ pageSize: 500 });
      expect(res500.pageSize).toBeLessThanOrEqual(100);
      expect(res500.pageSize).toBe(100);
      expect(res500.items.length).toBeLessThanOrEqual(100);

      // Test with string "1000"
      const resStr = await controller.getNonADUsers({ pageSize: '1000' as unknown as number });
      expect(resStr.pageSize).toBeLessThanOrEqual(100);
      expect(resStr.pageSize).toBe(100);

      // Test valid smaller pageSize
      const res15 = await controller.getNonADUsers({ pageSize: 15 });
      expect(res15.pageSize).toBe(15);
    });

    it('3.3 should clamp door users sub-resource pagination to <= 100', async () => {
      const anyDoor = await prisma.accessDoor.findFirst();
      expect(anyDoor).toBeDefined();

      const res = await controller.getDoorUsers(anyDoor!.id, 1, 1000);
      expect(res.pageSize).toBeLessThanOrEqual(100);
      expect(res.pageSize).toBe(100);
      expect(res.items.length).toBeLessThanOrEqual(100);
    });

    it('3.4 should clamp unified users directory pagination to <= 100', async () => {
      const res = await controller.getUnifiedUsers({ pageSize: 1000 });
      expect(res.pageSize).toBeLessThanOrEqual(100);
      expect(res.pageSize).toBe(100);
      expect(res.items.length).toBeLessThanOrEqual(100);
    });
  });

  // =========================================================================
  // 4. ADVERSARIAL ATTACK SURFACE & SECURITY INVARIANTS
  // =========================================================================
  describe('4. Adversarial Edge Cases & Security Mitigations', () => {
    it('4.1 should reject granting door access without a signed approval scan', async () => {
      const door = await prisma.accessDoor.findFirst({ where: { status: DoorStatus.ACTIVE } });
      const user = await prisma.nonADUser.findFirst({ where: { status: NonADUserStatus.ACTIVE } });

      await expect(
        service.grantAccess({
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [user!.id],
          doorIds: [door!.id],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Security Director',
          reason: 'Attempted grant without scan',
          // documentId omitted, file omitted
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.2 should reject revoking door access without a signed revocation scan', async () => {
      const assignment = await prisma.doorAccessAssignment.findFirst({
        where: { status: AccessAssignmentStatus.ACTIVE },
      });
      expect(assignment).toBeDefined();

      await expect(
        service.revokeAccess({
          assignmentIds: [assignment!.id],
          approverName: 'Security Director',
          reason: 'Attempted revoke without scan',
          // documentId omitted, file omitted
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.3 should reject time-bound access with past or missing validTo date', async () => {
      const door = await prisma.accessDoor.findFirst({ where: { status: DoorStatus.ACTIVE } });
      const user = await prisma.nonADUser.findFirst({ where: { status: NonADUserStatus.ACTIVE } });
      const grantDoc = await prisma.doorAccessDocumentScan.findFirst({
        where: { documentType: DoorDocumentType.GRANT },
      });

      // Missing validTo
      await expect(
        service.grantAccess({
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [user!.id],
          doorIds: [door!.id],
          accessType: AccessValidityType.TIME_BOUND,
          approverName: 'Security Director',
          reason: 'Testing missing validTo',
          documentId: grantDoc!.id,
        }),
      ).rejects.toThrow(BadRequestException);

      // Expired validTo in the past
      await expect(
        service.grantAccess({
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [user!.id],
          doorIds: [door!.id],
          accessType: AccessValidityType.TIME_BOUND,
          validTo: new Date(Date.now() - 86400000).toISOString(),
          approverName: 'Security Director',
          reason: 'Testing past validTo',
          documentId: grantDoc!.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.4 should reject time-bound access where validFrom precedes validTo in inverted order', async () => {
      const door = await prisma.accessDoor.findFirst({ where: { status: DoorStatus.ACTIVE } });
      const user = await prisma.nonADUser.findFirst({ where: { status: NonADUserStatus.ACTIVE } });
      const grantDoc = await prisma.doorAccessDocumentScan.findFirst({
        where: { documentType: DoorDocumentType.GRANT },
      });

      await expect(
        service.grantAccess({
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [user!.id],
          doorIds: [door!.id],
          accessType: AccessValidityType.TIME_BOUND,
          validFrom: new Date(Date.now() + 86400000 * 10).toISOString(),
          validTo: new Date(Date.now() + 86400000 * 5).toISOString(), // validTo < validFrom
          approverName: 'Security Director',
          reason: 'Inverted date bounds',
          documentId: grantDoc!.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.5 should reject granting access to an INACTIVE door facility', async () => {
      const inactiveDoor = await prisma.accessDoor.create({
        data: {
          doorCode: `DR-OFF-${Date.now().toString().slice(-6)}`,
          name: 'Decommissioned Vault Door',
          building: 'Facility B',
          floor: '1F',
          status: DoorStatus.INACTIVE,
        },
      });
      createdDoorIds.push(inactiveDoor.id);

      const user = await prisma.nonADUser.findFirst({ where: { status: NonADUserStatus.ACTIVE } });
      const grantDoc = await prisma.doorAccessDocumentScan.findFirst({
        where: { documentType: DoorDocumentType.GRANT },
      });

      await expect(
        service.grantAccess({
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [user!.id],
          doorIds: [inactiveDoor.id],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Security Director',
          reason: 'Attempted access on inactive door',
          documentId: grantDoc!.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.6 should reject granting access to a BLACKLISTED external subject', async () => {
      const blacklistedUser = await prisma.nonADUser.create({
        data: {
          badgeNumber: `BL-${Date.now().toString().slice(-5)}`,
          fullName: 'Blacklisted Contractor',
          company: 'Disqualified Vendor',
          identityNumber: '998877665544',
          status: NonADUserStatus.BLACKLISTED,
        },
      });
      createdNonADUserIds.push(blacklistedUser.id);

      const door = await prisma.accessDoor.findFirst({ where: { status: DoorStatus.ACTIVE } });
      const grantDoc = await prisma.doorAccessDocumentScan.findFirst({
        where: { documentType: DoorDocumentType.GRANT },
      });

      await expect(
        service.grantAccess({
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [blacklistedUser.id],
          doorIds: [door!.id],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Security Director',
          reason: 'Attempted access on blacklisted subject',
          documentId: grantDoc!.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.7 should reject referencing a REVOCATION scan document when performing grant access', async () => {
      const door = await prisma.accessDoor.findFirst({ where: { status: DoorStatus.ACTIVE } });
      const user = await prisma.nonADUser.findFirst({ where: { status: NonADUserStatus.ACTIVE } });
      const revokeDoc = await prisma.doorAccessDocumentScan.findFirst({
        where: { documentType: DoorDocumentType.REVOCATION },
      });
      expect(revokeDoc).toBeDefined();

      await expect(
        service.grantAccess({
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [user!.id],
          doorIds: [door!.id],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Security Director',
          reason: 'Mismatched doc type (revocation used for grant)',
          documentId: revokeDoc!.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.8 should reject referencing a GRANT scan document when performing revoke access', async () => {
      const assignment = await prisma.doorAccessAssignment.findFirst({
        where: { status: AccessAssignmentStatus.ACTIVE },
      });
      const grantDoc = await prisma.doorAccessDocumentScan.findFirst({
        where: { documentType: DoorDocumentType.GRANT },
      });
      expect(assignment).toBeDefined();
      expect(grantDoc).toBeDefined();

      await expect(
        service.revokeAccess({
          assignmentIds: [assignment!.id],
          approverName: 'Security Director',
          reason: 'Mismatched doc type (grant used for revoke)',
          documentId: grantDoc!.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4.9 should prevent deleting a door that has active assignments', async () => {
      const doorWithActive = await prisma.accessDoor.findFirst({
        where: { assignments: { some: { status: AccessAssignmentStatus.ACTIVE } } },
      });
      expect(doorWithActive).toBeDefined();

      await expect(service.deleteDoor(doorWithActive!.id)).rejects.toThrow(BadRequestException);
    });

    it('4.10 should prevent deleting a non-AD user that has active assignments', async () => {
      const userWithActive = await prisma.nonADUser.findFirst({
        where: { assignments: { some: { status: AccessAssignmentStatus.ACTIVE } } },
      });
      expect(userWithActive).toBeDefined();

      await expect(service.deleteNonADUser(userWithActive!.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
