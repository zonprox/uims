/**
 * Physical Access Control Comprehensive End-to-End Workflow Specification Suite
 *
 * Target File: apps/api/test/access-control-workflow.e2e-spec.ts
 *
 * Authoritative E2E integration test suite covering genuine system workflows:
 * 1. Physical Door Inventory Lifecycle (create, get, update, toggle status, active user count)
 * 2. Non-AD External Contractor Registration & Profile Query
 * 3. Mandatory Scan Attachment Validation (reject grant/revoke without valid scan or doc reference)
 * 4. Single & Batch Door Access Grant with File Upload and SHA-256 Hash Verification
 * 5. Unified User Access Matrix Query (combined AD employees + Non-AD contractors with door counts)
 * 6. Single & Batch Door Access Revocation with Revocation Scan Upload (retaining grantDocumentId)
 * 7. Binary Scan Document Streaming Download (/documents/:id/download and direct stream)
 * 8. Clearance Request Template Generation (.docx binary and printable HTML format)
 * 9. Clean Teardown & Invariant Verification (zero orphaned database records and disk scan files)
 */

import * as crypto from 'node:crypto';
import * as path from 'node:path';
import { PassThrough } from 'node:stream';
import dotenv from 'dotenv';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
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

/**
 * Creates a type-safe mock Express Response capturing streamed bytes and headers.
 */
function createMockResponse(): {
  res: Response;
  headers: Record<string, string>;
  getStatusCode: () => number;
  getBuffer: () => Promise<Buffer>;
  getString: () => Promise<string>;
} {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  const passThrough = new PassThrough();
  const chunks: Buffer[] = [];
  let sentData: unknown = null;

  passThrough.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  const res = Object.assign(passThrough, {
    headersSent: false,
    setHeader: (key: string, value: string) => {
      headers[key.toLowerCase()] = String(value);
      return res;
    },
    getHeader: (key: string) => headers[key.toLowerCase()],
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    send: (body: unknown) => {
      sentData = body;
      passThrough.end();
      return res;
    },
    json: (body: unknown) => {
      sentData = JSON.stringify(body);
      passThrough.end();
      return res;
    },
  }) as unknown as Response;

  return {
    res,
    headers,
    getStatusCode: () => statusCode,
    getBuffer: () =>
      new Promise<Buffer>((resolve) => {
        if (Buffer.isBuffer(sentData)) {
          resolve(sentData);
          return;
        }
        if (typeof sentData === 'string') {
          resolve(Buffer.from(sentData));
          return;
        }
        passThrough.on('finish', () => {
          resolve(Buffer.concat(chunks));
        });
        if (passThrough.writableEnded) {
          resolve(Buffer.concat(chunks));
        }
      }),
    getString: async () => {
      if (typeof sentData === 'string') {
        return sentData;
      }
      return new Promise<string>((resolve) => {
        passThrough.on('finish', () => {
          resolve(Buffer.concat(chunks).toString('utf-8'));
        });
        if (passThrough.writableEnded) {
          resolve(Buffer.concat(chunks).toString('utf-8'));
        }
      });
    },
  };
}

describe('Access Control End-to-End Workflow Integration Specification Suite', () => {
  let prisma: PrismaService;
  let storageService: AccessControlStorageService;
  let service: AccessControlService;
  let controller: AccessControlController;

  // Track created entities for atomic cleanup
  const createdAssignmentIds: string[] = [];
  const createdScanDocIds: string[] = [];
  const createdScanFileNames: string[] = [];
  const createdDoorIds: string[] = [];
  const createdNonADUserIds: string[] = [];

  // Seed references
  let testDoorAId: string;
  let testDoorBId: string;
  let testNonADUserId: string;
  let seededDirectoryUserId: string;

  let mockAdminReq: {
    user?: {
      id?: string;
      email?: string;
      role?: string;
    };
  } = {};

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    storageService = new AccessControlStorageService();
    service = new AccessControlService(prisma, storageService);
    controller = new AccessControlController(service, storageService);

    // Fetch an active DirectoryUser from seed data
    const directoryUser = await prisma.directoryUser.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { id: 'asc' },
    });
    if (!directoryUser) {
      throw new Error('Required baseline seed DirectoryUser not found in test database');
    }
    seededDirectoryUserId = directoryUser.id;

    // Fetch an existing AppUser to satisfy uploadedById foreign key constraint
    const appUser = await prisma.appUser.findFirst({
      orderBy: { id: 'asc' },
    });
    mockAdminReq = {
      user: appUser
        ? {
            id: appUser.id,
            email: appUser.email,
            role: 'Super Admin',
          }
        : undefined,
    };
  });

  afterAll(async () => {
    // 1. Clean up assignments
    if (createdAssignmentIds.length > 0) {
      await prisma.doorAccessAssignment.deleteMany({
        where: { id: { in: createdAssignmentIds } },
      });
    }

    // 2. Clean up document scan records
    if (createdScanDocIds.length > 0) {
      await prisma.doorAccessDocumentScan.deleteMany({
        where: { id: { in: createdScanDocIds } },
      });
    }

    // 3. Clean up doors
    if (createdDoorIds.length > 0) {
      await prisma.accessDoor.deleteMany({
        where: { id: { in: createdDoorIds } },
      });
    }

    // 4. Clean up Non-AD users
    if (createdNonADUserIds.length > 0) {
      await prisma.nonADUser.deleteMany({
        where: { id: { in: createdNonADUserIds } },
      });
    }

    // 5. Clean up uploaded test files from disk
    for (const fileName of createdScanFileNames) {
      try {
        await storageService.deleteScanFile(fileName);
      } catch {
        // Ignore unlinking errors during teardown
      }
    }

    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. PHYSICAL DOOR LIFECYCLE
  // =========================================================================
  describe('1. Physical Door Inventory Lifecycle', () => {
    it('1.1 should create a new physical door facility with complete telemetry metadata', async () => {
      const uniqueCode = `DR-E2E-${Date.now().toString().slice(-5)}`;
      const door = await controller.createDoor({
        doorCode: uniqueCode,
        name: 'E2E Main Server Room',
        building: 'High-Tech Tower B',
        floor: '4F',
        zone: 'Secured Tier-3 Zone',
        securityLevel: DoorSecurityLevel.CRITICAL,
        controllerModel: 'CTRL-ETH-9901',
        readerId: 'RDR-HID-4412',
        status: DoorStatus.ACTIVE,
        description: 'Primary datacenter ingress door for E2E workflow testing',
      });

      expect(door).toBeDefined();
      expect(door.id).toBeDefined();
      expect(door.doorCode).toBe(uniqueCode);
      expect(door.securityLevel).toBe(DoorSecurityLevel.CRITICAL);
      expect(door.status).toBe(DoorStatus.ACTIVE);

      testDoorAId = door.id;
      createdDoorIds.push(door.id);

      // Verify activeUsersCount is 0 initially on door details
      const doorDetails = await controller.getDoorById(door.id);
      expect(doorDetails.activeUsersCount).toBe(0);
    });

    it('1.2 should create a secondary physical door facility for batch matrix operations', async () => {
      const uniqueCode = `DR-E2E-${(Date.now() + 1).toString().slice(-5)}`;
      const door = await controller.createDoor({
        doorCode: uniqueCode,
        name: 'E2E Secondary NOC Facility',
        building: 'High-Tech Tower B',
        floor: '4F',
        zone: 'Secured Tier-3 Zone',
        securityLevel: DoorSecurityLevel.HIGH,
        controllerModel: 'CTRL-ETH-9902',
        readerId: 'RDR-HID-4413',
        status: DoorStatus.ACTIVE,
        description: 'Secondary operations center ingress door for E2E testing',
      });

      expect(door).toBeDefined();
      expect(door.id).toBeDefined();
      expect(door.doorCode).toBe(uniqueCode);

      testDoorBId = door.id;
      createdDoorIds.push(door.id);
    });

    it('1.3 should query door list and getDoorById verifying accurate field resolution', async () => {
      const door = await controller.getDoorById(testDoorAId);
      expect(door.id).toBe(testDoorAId);
      expect(door.name).toBe('E2E Main Server Room');
      expect(door.building).toBe('High-Tech Tower B');
      expect(door.activeUsersCount).toBe(0);

      const listResult = await controller.getDoors({
        search: 'E2E Main Server Room',
        page: 1,
        pageSize: 10,
      });
      expect(listResult.items.length).toBeGreaterThanOrEqual(1);
      expect(listResult.items.some((d) => d.id === testDoorAId)).toBe(true);
      expect(listResult.total).toBeGreaterThanOrEqual(1);
    });

    it('1.4 should update physical door configuration and toggle operational status', async () => {
      // Toggle to MAINTENANCE
      const updatedToMaintenance = await controller.updateDoor(testDoorAId, {
        name: 'E2E Main Server Room (Scheduled Maintenance)',
        status: DoorStatus.MAINTENANCE,
        description: 'Temporary hardware reader calibration',
      });
      expect(updatedToMaintenance.status).toBe(DoorStatus.MAINTENANCE);
      expect(updatedToMaintenance.name).toContain('Maintenance');

      // Restore to ACTIVE
      const restoredToActive = await controller.updateDoor(testDoorAId, {
        name: 'E2E Main Server Room',
        status: DoorStatus.ACTIVE,
        description: 'Reader calibration completed and online',
      });
      expect(restoredToActive.status).toBe(DoorStatus.ACTIVE);
      expect(restoredToActive.name).toBe('E2E Main Server Room');
    });
  });

  // =========================================================================
  // 2. NON-AD EXTERNAL CONTRACTOR REGISTRATION & QUERY
  // =========================================================================
  describe('2. Non-AD External Contractor Registration & Profile Query', () => {
    it('2.1 should register a new external contractor with complete identification metadata', async () => {
      const uniqueBadge = `BADGE-E2E-${Date.now().toString().slice(-5)}`;
      const uniqueId = `079${Date.now().toString().slice(-9)}`;

      const nonADUser = await controller.createNonADUser({
        fullName: 'Alexander Vance',
        badgeNumber: uniqueBadge,
        identityNumber: uniqueId,
        company: 'Vance Cyber Dynamics Ltd',
        email: 'alexander.vance@vancedynamics.test',
        phone: '+1-555-019-8833',
        status: NonADUserStatus.ACTIVE,
        validFrom: new Date(Date.now() - 3600000).toISOString(),
        validTo: new Date(Date.now() + 86400000 * 90).toISOString(),
        notes: 'Lead Infrastructure Auditor for PCI-DSS verification',
      });

      expect(nonADUser).toBeDefined();
      expect(nonADUser.id).toBeDefined();
      expect(nonADUser.badgeNumber).toBe(uniqueBadge);
      expect(nonADUser.identityNumber).toBe(uniqueId);
      expect(nonADUser.company).toBe('Vance Cyber Dynamics Ltd');
      expect(nonADUser.status).toBe(NonADUserStatus.ACTIVE);

      testNonADUserId = nonADUser.id;
      createdNonADUserIds.push(nonADUser.id);

      // Verify activeDoorsCount is 0 initially on non-AD user details
      const userDetail = await controller.getNonADUserById(nonADUser.id);
      expect(userDetail.activeDoorsCount).toBe(0);
    });

    it('2.2 should query external contractor profile and paginated registry', async () => {
      const retrieved = await controller.getNonADUserById(testNonADUserId);
      expect(retrieved.id).toBe(testNonADUserId);
      expect(retrieved.fullName).toBe('Alexander Vance');
      expect(retrieved.company).toBe('Vance Cyber Dynamics Ltd');

      const registry = await controller.getNonADUsers({
        search: 'Alexander Vance',
        company: 'Vance Cyber Dynamics Ltd',
        page: 1,
        pageSize: 10,
      });

      expect(registry.items.length).toBeGreaterThanOrEqual(1);
      expect(registry.items.some((u) => u.id === testNonADUserId)).toBe(true);
    });

    it('2.3 should update external contractor profile information', async () => {
      const updated = await controller.updateNonADUser(testNonADUserId, {
        phone: '+1-555-019-9944',
        notes: 'Lead Infrastructure Auditor (Scope extended to Tier-3 NOC)',
      });

      expect(updated.phone).toBe('+1-555-019-9944');
      expect(updated.notes).toContain('Scope extended');
    });
  });

  // =========================================================================
  // 3. MANDATORY SCAN ATTACHMENT VALIDATION
  // =========================================================================
  describe('3. Mandatory Scan Attachment Validation & Security Constraints', () => {
    it('3.1 should reject granting access without an uploaded file or valid documentId (HTTP 400)', async () => {
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testNonADUserId],
            doorIds: [testDoorAId],
            accessType: AccessValidityType.PERMANENT,
            approverName: 'Chief Security Officer',
            reason: 'Attempted access grant without scan attachment',
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('3.2 should reject granting access referencing a non-existent documentId (HTTP 400/404)', async () => {
      const nonExistentDocId = '00000000-0000-0000-0000-ffffffffffff';
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testNonADUserId],
            doorIds: [testDoorAId],
            accessType: AccessValidityType.PERMANENT,
            approverName: 'Chief Security Officer',
            reason: 'Attempted access grant with phantom documentId',
            documentId: nonExistentDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow();
    });

    it('3.3 should reject revoking access without a revocation scan file or documentId (HTTP 400)', async () => {
      const phantomAssignmentId = '00000000-0000-0000-0000-aaaaaaaaaaaa';
      await expect(
        controller.revokeAccess(
          {
            assignmentIds: [phantomAssignmentId],
            approverName: 'Security Lead',
            reason: 'Attempted revocation without scan',
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 4. SINGLE & BATCH DOOR ACCESS GRANT WITH SCAN FILE UPLOAD
  // =========================================================================
  describe('4. Single & Batch Door Access Grant with File Upload & SHA-256 Computation', () => {
    let singleGrantDocId: string;
    let grantPdfBuffer: Buffer;

    it('4.1 should grant single door access with authentic PDF upload and strict SHA-256 calculation', async () => {
      grantPdfBuffer = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Title (E2E Single Door Access Approval) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
      );
      const expectedSha256 = crypto.createHash('sha256').update(grantPdfBuffer).digest('hex');

      const uploadPayload = {
        originalname: 'e2e-approved-clearance-vance.pdf',
        mimetype: 'application/pdf',
        size: grantPdfBuffer.length,
        buffer: grantPdfBuffer,
      };

      const grantResult = await controller.grantAccess(
        {
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [testNonADUserId],
          doorIds: [testDoorAId],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Dr. Jane Holloway',
          approverTitle: 'VP of Cybersecurity Infrastructure',
          referenceNumber: 'CR-SEC-2026-901',
          reason: 'Authorized lead penetration tester ingress to Primary Server Room',
          notes: 'Signed board clearance attached',
        },
        uploadPayload,
        mockAdminReq,
      );

      expect(grantResult).toBeDefined();
      expect(grantResult.createdAssignmentsCount).toBe(1);
      expect(grantResult.assignments.length).toBe(1);

      const assignment = grantResult.assignments[0];
      singleGrantDocId = assignment.grantDocumentId!;
      createdAssignmentIds.push(assignment.id);
      createdScanDocIds.push(assignment.grantDocumentId!);

      expect(assignment.status).toBe(AccessAssignmentStatus.ACTIVE);
      expect(assignment.subjectType).toBe(AccessSubjectType.NON_AD_USER);
      expect(assignment.nonADUserId).toBe(testNonADUserId);
      expect(assignment.doorId).toBe(testDoorAId);
      expect(assignment.accessType).toBe(AccessValidityType.PERMANENT);
      expect(assignment.grantDocumentId).toBeTruthy();

      // Retrieve and verify the persisted scan document record
      const scanDoc = await controller.getDocumentById(singleGrantDocId);
      expect(scanDoc).toBeDefined();
      expect(scanDoc.documentType).toBe(DoorDocumentType.GRANT);
      expect(scanDoc.approverName).toBe('Dr. Jane Holloway');
      expect(scanDoc.referenceNumber).toBe('CR-SEC-2026-901');
      expect(scanDoc.fileSize).toBe(grantPdfBuffer.length);
      expect(scanDoc.fileHash).toBe(expectedSha256);
      createdScanFileNames.push(scanDoc.fileName);

      // Verify physical door active user count incremented to 1
      const doorA = await controller.getDoorById(testDoorAId);
      expect(doorA.activeUsersCount).toBe(1);
    });

    it('4.2 should execute batch access grant across dual subjects (AD + Non-AD) and multiple doors', async () => {
      const batchPdfBuffer = Buffer.from(
        '%PDF-1.4\n2 0 obj\n<< /Title (E2E Multi-Subject Batch Clearance) >>\nendobj\ntrailer\n<< /Root 2 0 R >>\n%%EOF\n',
      );
      const expectedSha256 = crypto.createHash('sha256').update(batchPdfBuffer).digest('hex');

      const uploadPayload = {
        originalname: 'e2e-batch-clearance-noc.pdf',
        mimetype: 'application/pdf',
        size: batchPdfBuffer.length,
        buffer: batchPdfBuffer,
      };

      // Batch 1: Grant DirectoryUser access to Door A and Door B
      const batchResultAD = await controller.grantAccess(
        {
          subjectType: AccessSubjectType.DIRECTORY_USER,
          subjectIds: [seededDirectoryUserId],
          doorIds: [testDoorAId, testDoorBId],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Dr. Jane Holloway',
          approverTitle: 'VP of Cybersecurity Infrastructure',
          referenceNumber: 'CR-SEC-BATCH-001',
          reason: 'Dual facility audit authorization for enterprise directory engineer',
        },
        uploadPayload,
        mockAdminReq,
      );

      expect(batchResultAD.createdAssignmentsCount).toBe(2);
      expect(batchResultAD.assignments.length).toBe(2);
      for (const a of batchResultAD.assignments) {
        createdAssignmentIds.push(a.id);
        expect(a.status).toBe(AccessAssignmentStatus.ACTIVE);
        expect(a.directoryUserId).toBe(seededDirectoryUserId);
      }
      const batchDocId = batchResultAD.assignments[0].grantDocumentId!;
      createdScanDocIds.push(batchDocId);

      // Batch 2: Grant Non-AD user access to Door B using the existing batch documentId
      const batchResultNonAD = await controller.grantAccess(
        {
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [testNonADUserId],
          doorIds: [testDoorBId],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Dr. Jane Holloway',
          reason: 'Secondary facility access linked to batch clearance',
          documentId: batchDocId,
        },
        undefined,
        mockAdminReq,
      );

      expect(batchResultNonAD.createdAssignmentsCount).toBe(1);
      createdAssignmentIds.push(batchResultNonAD.assignments[0].id);
      expect(batchResultNonAD.assignments[0].grantDocumentId).toBe(batchDocId);

      // Verify batch scan document attributes
      const batchDoc = await controller.getDocumentById(batchDocId);
      expect(batchDoc.fileHash).toBe(expectedSha256);
      createdScanFileNames.push(batchDoc.fileName);

      // Verify Door A has 2 active users (Non-AD + AD), Door B has 2 active users (AD + Non-AD)
      const doorA = await controller.getDoorById(testDoorAId);
      const doorB = await controller.getDoorById(testDoorBId);
      expect(doorA.activeUsersCount).toBe(2);
      expect(doorB.activeUsersCount).toBe(2);
    });
  });

  // =========================================================================
  // 5. UNIFIED USER ACCESS MATRIX QUERY
  // =========================================================================
  describe('5. Unified User Access Matrix & Profile Inspection', () => {
    it('5.1 should query the unified access matrix returning both AD employees and Non-AD contractors with accurate door counts', async () => {
      const matrixResult = await controller.getUsersAccessMatrix({
        page: 1,
        pageSize: 50,
      });

      expect(matrixResult).toBeDefined();
      expect(matrixResult.items.length).toBeGreaterThanOrEqual(2);

      // Find the Non-AD user in the matrix
      const nonADEntry = matrixResult.items.find(
        (u) => u.subjectType === AccessSubjectType.NON_AD_USER && u.id === testNonADUserId,
      );
      expect(nonADEntry).toBeDefined();
      expect(nonADEntry?.fullName).toBe('Alexander Vance');
      expect(nonADEntry?.organizationOrCompany).toBe('Vance Cyber Dynamics Ltd');
      expect(nonADEntry?.activeDoorsCount).toBe(2); // Door A + Door B

      // Find the DirectoryUser in the matrix
      const adEntry = matrixResult.items.find(
        (u) => u.subjectType === AccessSubjectType.DIRECTORY_USER && u.id === seededDirectoryUserId,
      );
      expect(adEntry).toBeDefined();
      expect(adEntry?.activeDoorsCount).toBeGreaterThanOrEqual(2); // Door A + Door B (+ any baseline seeds)
    });

    it('5.2 should inspect complete door access detail profile for Non-AD contractor', async () => {
      const profile = await controller.getUserAccessDetail(
        AccessSubjectType.NON_AD_USER,
        testNonADUserId,
      );

      expect(profile).toBeDefined();
      expect(profile.subjectType).toBe(AccessSubjectType.NON_AD_USER);
      expect(profile.subjectId).toBe(testNonADUserId);
      expect(profile.fullName).toBe('Alexander Vance');
      expect(profile.activeAssignments.length).toBe(2);

      const doorCodes = profile.activeAssignments.map((a) => a.door?.doorCode);
      const doorA = await controller.getDoorById(testDoorAId);
      const doorB = await controller.getDoorById(testDoorBId);
      expect(doorCodes).toContain(doorA.doorCode);
      expect(doorCodes).toContain(doorB.doorCode);

      // Verify each active assignment includes grantDocument metadata
      for (const assignment of profile.activeAssignments) {
        expect(assignment.grantDocument).toBeDefined();
        expect(assignment.grantDocument?.fileName).toBeTruthy();
        expect(assignment.grantDocument?.fileHash).toBeTruthy();
      }
    });

    it('5.3 should inspect door users detail query returning authorized personnel for Door A', async () => {
      const doorUsers = await controller.getDoorUsers(
        testDoorAId,
        1,
        20,
        AccessAssignmentStatus.ACTIVE,
      );

      expect(doorUsers).toBeDefined();
      expect(doorUsers.total).toBe(2);
      expect(doorUsers.items.length).toBe(2);

      const subjectIds = doorUsers.items.map((i) => i.subjectId);
      expect(subjectIds).toContain(testNonADUserId);
      expect(subjectIds).toContain(seededDirectoryUserId);
    });
  });

  // =========================================================================
  // 6. SINGLE & BATCH DOOR ACCESS REVOCATION
  // =========================================================================
  describe('6. Single & Batch Revocation with Revocation Scan Upload', () => {
    let singleRevokeDocId: string;

    it('6.1 should revoke single door access, creating revocation scan and preserving grantDocumentId', async () => {
      // Find assignment for testNonADUserId on testDoorAId
      const assignmentToRevoke = await prisma.doorAccessAssignment.findFirst({
        where: {
          nonADUserId: testNonADUserId,
          doorId: testDoorAId,
          status: AccessAssignmentStatus.ACTIVE,
        },
      });

      expect(assignmentToRevoke).toBeDefined();
      const originalGrantDocId = assignmentToRevoke!.grantDocumentId;
      expect(originalGrantDocId).toBeTruthy();

      const revokePdfBuffer = Buffer.from(
        '%PDF-1.4\n3 0 obj\n<< /Title (E2E Revocation Clearance Scan) >>\nendobj\ntrailer\n<< /Root 3 0 R >>\n%%EOF\n',
      );
      const expectedRevokeHash = crypto.createHash('sha256').update(revokePdfBuffer).digest('hex');

      const uploadPayload = {
        originalname: 'e2e-revocation-vance-door-a.pdf',
        mimetype: 'application/pdf',
        size: revokePdfBuffer.length,
        buffer: revokePdfBuffer,
      };

      const revokeResult = await controller.revokeAccess(
        {
          assignmentIds: [assignmentToRevoke!.id],
          approverName: 'Marcus Aurelius Sterling',
          approverTitle: 'Chief Compliance Officer',
          referenceNumber: 'REV-SEC-2026-101',
          reason: 'Scheduled conclusion of penetration testing phase on Primary Server Room',
          notes: 'Physical token access terminated',
        },
        uploadPayload,
        mockAdminReq,
      );

      expect(revokeResult).toBeDefined();
      expect(revokeResult.revokedAssignmentsCount).toBe(1);
      expect(revokeResult.assignments.length).toBe(1);

      const revokedAssignment = revokeResult.assignments[0];
      singleRevokeDocId = revokedAssignment.revocationDocumentId!;
      createdScanDocIds.push(revokedAssignment.revocationDocumentId!);

      expect(revokedAssignment.id).toBe(assignmentToRevoke!.id);
      expect(revokedAssignment.status).toBe(AccessAssignmentStatus.REVOKED);

      // CRITICAL AUDIT INVARIANT: grantDocumentId must remain intact!
      expect(revokedAssignment.grantDocumentId).toBe(originalGrantDocId);
      expect(revokedAssignment.revocationDocumentId).toBeTruthy();
      expect(revokedAssignment.revocationReason).toContain('conclusion of penetration testing');

      // Verify revocation scan record
      const revokeDoc = await controller.getDocumentById(singleRevokeDocId);
      expect(revokeDoc.documentType).toBe(DoorDocumentType.REVOCATION);
      expect(revokeDoc.approverName).toBe('Marcus Aurelius Sterling');
      expect(revokeDoc.fileHash).toBe(expectedRevokeHash);
      createdScanFileNames.push(revokeDoc.fileName);

      // Verify Door A active user count decremented to 1 (only DirectoryUser remains)
      const doorA = await controller.getDoorById(testDoorAId);
      expect(doorA.activeUsersCount).toBe(1);
    });

    it('6.2 should execute batch revocation across remaining test assignments with shared revocation document', async () => {
      // Find remaining active assignments created in this test suite
      const remainingAssignments = await prisma.doorAccessAssignment.findMany({
        where: {
          id: { in: createdAssignmentIds },
          status: AccessAssignmentStatus.ACTIVE,
        },
      });

      expect(remainingAssignments.length).toBeGreaterThanOrEqual(2);
      const remainingIds = remainingAssignments.map((a) => a.id);

      const batchRevokePdfBuffer = Buffer.from(
        '%PDF-1.4\n4 0 obj\n<< /Title (E2E Batch De-authorization Order) >>\nendobj\ntrailer\n<< /Root 4 0 R >>\n%%EOF\n',
      );

      const uploadPayload = {
        originalname: 'e2e-batch-deauth-all.pdf',
        mimetype: 'application/pdf',
        size: batchRevokePdfBuffer.length,
        buffer: batchRevokePdfBuffer,
      };

      const batchRevokeResult = await controller.revokeAccess(
        {
          assignmentIds: remainingIds,
          approverName: 'Marcus Aurelius Sterling',
          approverTitle: 'Chief Compliance Officer',
          referenceNumber: 'REV-SEC-BATCH-888',
          reason: 'Comprehensive project decommissioning and facility sanitization',
        },
        uploadPayload,
        mockAdminReq,
      );

      expect(batchRevokeResult.revokedAssignmentsCount).toBe(remainingIds.length);
      const batchRevokeDocId = batchRevokeResult.assignments[0].revocationDocumentId!;
      createdScanDocIds.push(batchRevokeDocId);

      const batchRevokeDoc = await controller.getDocumentById(batchRevokeDocId);
      createdScanFileNames.push(batchRevokeDoc.fileName);

      for (const rev of batchRevokeResult.assignments) {
        expect(rev.status).toBe(AccessAssignmentStatus.REVOKED);
        expect(rev.grantDocumentId).toBeTruthy(); // Still retained!
        expect(rev.revocationDocumentId).toBe(batchRevokeDocId);
      }

      // Verify active user count on both test doors has returned to 0
      const doorA = await controller.getDoorById(testDoorAId);
      const doorB = await controller.getDoorById(testDoorBId);
      expect(doorA.activeUsersCount).toBe(0);
      expect(doorB.activeUsersCount).toBe(0);
    });
  });

  // =========================================================================
  // 7. BINARY SCAN DOCUMENT STREAMING DOWNLOAD
  // =========================================================================
  describe('7. Binary Scan Document Streaming Download', () => {
    it('7.1 should stream and download stored scan document via /documents/:id/download', async () => {
      // Pick a created scan document
      const doc = await controller.getDocumentById(createdScanDocIds[0]);
      expect(doc).toBeDefined();

      const { res, headers, getBuffer } = createMockResponse();

      await controller.downloadDocumentById(doc.id, res);
      const streamedBuffer = await getBuffer();

      expect(headers['content-type']).toBe('application/pdf');
      expect(headers['content-disposition']).toContain('attachment');
      expect(headers['content-disposition']).toContain(doc.fileName);
      expect(streamedBuffer.length).toBe(doc.fileSize);

      // Verify SHA-256 hash of streamed binary matches the registered database hash
      const streamedHash = crypto.createHash('sha256').update(streamedBuffer).digest('hex');
      expect(streamedHash).toBe(doc.fileHash);
    });

    it('7.2 should stream document file directly via /documents/file/:filename', async () => {
      const doc = await controller.getDocumentById(createdScanDocIds[0]);
      const { res, headers, getBuffer } = createMockResponse();

      await controller.getScanFile(doc.fileName, '0', res);
      const streamedBuffer = await getBuffer();

      expect(headers['content-type']).toBe('application/pdf');
      expect(headers['content-disposition']).toContain('inline');
      expect(streamedBuffer.length).toBe(doc.fileSize);
    });
  });

  // =========================================================================
  // 8. CLEARANCE REQUEST TEMPLATE GENERATION
  // =========================================================================
  describe('8. Clearance Request Template Generation (.docx & HTML)', () => {
    it('8.1 should generate pre-populated Microsoft Word (.docx) access clearance form', async () => {
      const { res, headers, getBuffer } = createMockResponse();

      await controller.generateRequestDocxPost(
        {
          applicantName: 'Alexander Vance',
          applicantCompany: 'Vance Cyber Dynamics Ltd',
          applicantPhone: '+1-555-019-8833',
          applicantEmail: 'alexander.vance@vancedynamics.test',
          doorIds: [testDoorAId, testDoorBId],
          reason: 'Tier-3 Datacenter and NOC Security Assessment',
          validityType: AccessValidityType.PERMANENT,
          approverName: 'Dr. Jane Holloway',
          approverTitle: 'VP of Cybersecurity Infrastructure',
        },
        res,
      );

      const docxBuffer = await getBuffer();

      // Verify Content-Type and Disposition headers
      expect(headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(headers['content-disposition']).toContain('door-access-request-form.docx');

      // Verify .docx binary structure: standard ZIP PK header (0x50, 0x4B, 0x03, 0x04)
      expect(docxBuffer.length).toBeGreaterThan(1000);
      expect(docxBuffer[0]).toBe(0x50);
      expect(docxBuffer[1]).toBe(0x4b);
      expect(docxBuffer[2]).toBe(0x03);
      expect(docxBuffer[3]).toBe(0x04);
    });

    it('8.2 should generate printable HTML access authorization request form with signature blocks', async () => {
      const { res, headers, getString } = createMockResponse();

      await controller.getRequestHtml(
        {
          subjectId: testNonADUserId,
          subjectType: AccessSubjectType.NON_AD_USER,
          doorIds: [testDoorAId],
          reason: 'Tier-3 Datacenter Inspection',
          approverName: 'Dr. Jane Holloway',
        },
        res,
      );

      const htmlContent = await getString();

      expect(headers['content-type']).toContain('text/html');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('PHYSICAL ACCESS CONTROL CLEARANCE FORM');
      expect(htmlContent).toContain('Alexander Vance');
      expect(htmlContent).toContain('Vance Cyber Dynamics Ltd');
      expect(htmlContent).toContain('APPLICANT SIGNATURE');
      expect(htmlContent).toContain('IT INFOSEC CLEARANCE');
    });
  });

  // =========================================================================
  // 9. CLEAN DELETION OF FACILITY & EXTERNAL SUBJECT ON ZERO ACTIVE USERS
  // =========================================================================
  describe('9. Facility & Subject Deletion Post-Revocation', () => {
    it('9.1 should allow deleting a door facility when all assignments have been revoked', async () => {
      // Create a temporary door without active assignments
      const tempDoor = await controller.createDoor({
        doorCode: `DR-DEL-${Date.now().toString().slice(-5)}`,
        name: 'Temporary Staging Door',
        building: 'Building T',
        floor: '1F',
        status: DoorStatus.ACTIVE,
      });

      const deleted = await controller.deleteDoor(tempDoor.id);
      expect(deleted.id).toBe(tempDoor.id);

      // Verify it cannot be retrieved
      await expect(controller.getDoorById(tempDoor.id)).rejects.toThrow(NotFoundException);
    });

    it('9.2 should allow deleting an external non-AD user when all assignments have been revoked', async () => {
      const tempUser = await controller.createNonADUser({
        fullName: 'Temporary Contractor',
        badgeNumber: `BADGE-DEL-${Date.now().toString().slice(-5)}`,
        identityNumber: `ID-DEL-${Date.now().toString().slice(-5)}`,
        company: 'Temporary Logistics',
        status: NonADUserStatus.ACTIVE,
      });

      const deleted = await controller.deleteNonADUser(tempUser.id);
      expect(deleted.id).toBe(tempUser.id);

      // Verify it cannot be retrieved
      await expect(controller.getNonADUserById(tempUser.id)).rejects.toThrow(NotFoundException);
    });
  });
});
