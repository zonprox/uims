/**
 * Challenger M5-1: Physical Access Control Adversarial Edge Cases & Security Harness
 *
 * Target: apps/api/test/challenger-m5-1-access-control-edge-cases.spec.ts
 *
 * Empirical verification of:
 * 1. Access Grants Edge Cases:
 *    - Invalid user IDs (Directory & Non-AD)
 *    - Invalid door IDs & INACTIVE doors
 *    - Blacklisted & Inactive Non-AD users
 *    - Duplicate active grants (idempotent upsert & count preservation)
 *    - Expired & invalid validity windows (past validTo, validFrom > validTo, missing validTo)
 *    - Missing or mismatched approval scans
 * 2. Access Revocations Edge Cases:
 *    - Idempotent revocation of already revoked assignments (preserving timestamps & original docs)
 *    - Revoking non-existent assignments
 *    - Missing or mismatched revocation scans
 * 3. File Streaming & Path Traversal Security:
 *    - Invalid document IDs on download
 *    - Path traversal attacks (../, %00, non-whitelisted extensions, non-existent files)
 *    - Upload size & mime restrictions
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

function createMockResponse(): {
  res: Response;
  headers: Record<string, string>;
  getStatusCode: () => number;
  getBuffer: () => Promise<Buffer>;
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
  };
}

describe('Challenger M5-1: Physical Access Control Adversarial Edge Cases & Security', () => {
  let prisma: PrismaService;
  let storageService: AccessControlStorageService;
  let service: AccessControlService;
  let controller: AccessControlController;

  const createdAssignmentIds: string[] = [];
  const createdScanDocIds: string[] = [];
  const createdScanFileNames: string[] = [];
  const createdDoorIds: string[] = [];
  const createdNonADUserIds: string[] = [];

  let testDoorId: string;
  let testInactiveDoorId: string;
  let testNonADUserId: string;
  let testBlacklistedUserId: string;
  let seededDirectoryUserId: string;
  let validGrantDocId: string;
  let validRevocationDocId: string;

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

    // Active Directory user from seed
    const directoryUser = await prisma.directoryUser.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { id: 'asc' },
    });
    if (!directoryUser) {
      throw new Error('DirectoryUser seed required');
    }
    seededDirectoryUserId = directoryUser.id;

    // AppUser for uploadedById
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

    // 1. Create Active Door
    const activeDoor = await controller.createDoor({
      doorCode: `DR-CH5-${Date.now().toString().slice(-5)}`,
      name: 'Challenger Active Server Vault',
      building: 'Building C5',
      floor: '3F',
      securityLevel: DoorSecurityLevel.HIGH,
      status: DoorStatus.ACTIVE,
    });
    testDoorId = activeDoor.id;
    createdDoorIds.push(activeDoor.id);

    // 2. Create Inactive Door
    const inactiveDoor = await controller.createDoor({
      doorCode: `DR-INACT-${Date.now().toString().slice(-5)}`,
      name: 'Challenger Inactive Vault',
      building: 'Building C5',
      floor: 'B1',
      securityLevel: DoorSecurityLevel.CONFIDENTIAL,
      status: DoorStatus.INACTIVE,
    });
    testInactiveDoorId = inactiveDoor.id;
    createdDoorIds.push(inactiveDoor.id);

    // 3. Create Active Non-AD User
    const activeUser = await controller.createNonADUser({
      fullName: 'Challenger Test Contractor',
      badgeNumber: `BADGE-CH5-${Date.now().toString().slice(-5)}`,
      identityNumber: `ID-CH5-${Date.now().toString().slice(-5)}`,
      company: 'Challenger Security Ltd',
      status: NonADUserStatus.ACTIVE,
    });
    testNonADUserId = activeUser.id;
    createdNonADUserIds.push(activeUser.id);

    // 4. Create Blacklisted Non-AD User
    const blacklistedUser = await controller.createNonADUser({
      fullName: 'Blacklisted Rogue User',
      badgeNumber: `BADGE-BLK-${Date.now().toString().slice(-5)}`,
      identityNumber: `ID-BLK-${Date.now().toString().slice(-5)}`,
      company: 'Banned Contractors Inc',
      status: NonADUserStatus.BLACKLISTED,
    });
    testBlacklistedUserId = blacklistedUser.id;
    createdNonADUserIds.push(blacklistedUser.id);

    // 5. Upload a genuine GRANT scan document for tests
    const grantDocBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Title (Challenger Valid Grant Document) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
    );
    const grantDocResult = await controller.uploadDocument(
      {
        documentType: DoorDocumentType.GRANT,
        approverName: 'Chief Security Officer',
        approverTitle: 'Head of Information Security',
        reason: 'Authorized baseline security assessment',
      },
      {
        originalname: 'challenger-grant-doc.pdf',
        mimetype: 'application/pdf',
        size: grantDocBuffer.length,
        buffer: grantDocBuffer,
      },
      mockAdminReq,
    );
    validGrantDocId = grantDocResult.id;
    createdScanDocIds.push(validGrantDocId);
    createdScanFileNames.push(grantDocResult.fileName);

    // 6. Upload a genuine REVOCATION scan document for tests
    const revokeDocBuffer = Buffer.from(
      '%PDF-1.4\n2 0 obj\n<< /Title (Challenger Valid Revocation Document) >>\nendobj\ntrailer\n<< /Root 2 0 R >>\n%%EOF\n',
    );
    const revokeDocResult = await controller.uploadDocument(
      {
        documentType: DoorDocumentType.REVOCATION,
        approverName: 'Chief Compliance Officer',
        approverTitle: 'VP of Compliance',
        reason: 'Authorized baseline revocation audit',
      },
      {
        originalname: 'challenger-revoke-doc.pdf',
        mimetype: 'application/pdf',
        size: revokeDocBuffer.length,
        buffer: revokeDocBuffer,
      },
      mockAdminReq,
    );
    validRevocationDocId = revokeDocResult.id;
    createdScanDocIds.push(validRevocationDocId);
    createdScanFileNames.push(revokeDocResult.fileName);
  });

  afterAll(async () => {
    // 1. Clean up assignments
    if (createdAssignmentIds.length > 0) {
      await prisma.doorAccessAssignment.deleteMany({
        where: { id: { in: createdAssignmentIds } },
      });
    }

    // 2. Clean up document scans
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

    // 4. Clean up non-AD users
    if (createdNonADUserIds.length > 0) {
      await prisma.nonADUser.deleteMany({
        where: { id: { in: createdNonADUserIds } },
      });
    }

    // 5. Unlink disk files
    for (const fileName of createdScanFileNames) {
      try {
        await storageService.deleteScanFile(fileName);
      } catch {
        // Ignored in cleanup
      }
    }

    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. ACCESS GRANTS EDGE CASES
  // =========================================================================
  describe('1. Access Grants Edge Cases & Adversarial Inputs', () => {
    it('1.1 should reject granting access with non-existent DIRECTORY_USER ID (HTTP 404)', async () => {
      const phantomUserId = '00000000-0000-0000-0000-ffffffffffff';
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.DIRECTORY_USER,
            subjectIds: [phantomUserId],
            doorIds: [testDoorId],
            accessType: AccessValidityType.PERMANENT,
            approverName: 'Security Lead',
            reason: 'Testing phantom directory employee',
            documentId: validGrantDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('1.2 should reject granting access with non-existent NON_AD_USER ID (HTTP 404)', async () => {
      const phantomUserId = '00000000-0000-0000-0000-eeeeeeeeeeee';
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [phantomUserId],
            doorIds: [testDoorId],
            accessType: AccessValidityType.PERMANENT,
            approverName: 'Security Lead',
            reason: 'Testing phantom external contractor',
            documentId: validGrantDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('1.3 should reject granting access with non-existent door ID (HTTP 404)', async () => {
      const phantomDoorId = '00000000-0000-0000-0000-dddddddddddd';
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testNonADUserId],
            doorIds: [phantomDoorId],
            accessType: AccessValidityType.PERMANENT,
            approverName: 'Security Lead',
            reason: 'Testing phantom physical door',
            documentId: validGrantDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('1.4 should reject granting access to an INACTIVE door (HTTP 400)', async () => {
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testNonADUserId],
            doorIds: [testInactiveDoorId],
            accessType: AccessValidityType.PERMANENT,
            approverName: 'Security Lead',
            reason: 'Attempting access to decommissioned vault',
            documentId: validGrantDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.5 should reject granting access to a BLACKLISTED Non-AD user (HTTP 400)', async () => {
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testBlacklistedUserId],
            doorIds: [testDoorId],
            accessType: AccessValidityType.PERMANENT,
            approverName: 'Security Lead',
            reason: 'Attempting access grant for blacklisted personnel',
            documentId: validGrantDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.6 should reject time-bound access when validTo is missing or in the past (HTTP 400)', async () => {
      // Missing validTo
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testNonADUserId],
            doorIds: [testDoorId],
            accessType: AccessValidityType.TIME_BOUND,
            approverName: 'Security Lead',
            reason: 'Missing validTo',
            documentId: validGrantDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);

      // validTo in the past
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testNonADUserId],
            doorIds: [testDoorId],
            accessType: AccessValidityType.TIME_BOUND,
            validTo: new Date(Date.now() - 3600000).toISOString(),
            approverName: 'Security Lead',
            reason: 'Expired validTo',
            documentId: validGrantDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);

      // validFrom > validTo
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testNonADUserId],
            doorIds: [testDoorId],
            accessType: AccessValidityType.TIME_BOUND,
            validFrom: new Date('2028-01-01').toISOString(),
            validTo: new Date('2027-01-01').toISOString(),
            approverName: 'Security Lead',
            reason: 'Inverted validity range',
            documentId: validGrantDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.7 should reject granting access referencing a REVOCATION scan document (type mismatch, HTTP 400)', async () => {
      await expect(
        controller.grantAccess(
          {
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [testNonADUserId],
            doorIds: [testDoorId],
            accessType: AccessValidityType.PERMANENT,
            approverName: 'Security Lead',
            reason: 'Referencing revocation scan for grant',
            documentId: validRevocationDocId, // Mismatched document type!
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.8 should handle duplicate active grants idempotently without duplicate records', async () => {
      // First grant
      const firstResult = await controller.grantAccess(
        {
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [testNonADUserId],
          doorIds: [testDoorId],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Security Lead',
          reason: 'Initial authorization',
          documentId: validGrantDocId,
        },
        undefined,
        mockAdminReq,
      );

      expect(firstResult.createdAssignmentsCount).toBe(1);
      const initialAssignmentId = firstResult.assignments[0].id;
      createdAssignmentIds.push(initialAssignmentId);

      // Door active count = 1
      const doorAfterFirst = await controller.getDoorById(testDoorId);
      expect(doorAfterFirst.activeUsersCount).toBe(1);

      // Upload a second grant scan document
      const secondDocBuffer = Buffer.from(
        '%PDF-1.4\n3 0 obj\n<< /Title (Second Grant Document) >>\nendobj\ntrailer\n<< /Root 3 0 R >>\n%%EOF\n',
      );
      const secondUpload = {
        originalname: 'second-grant-clearance.pdf',
        mimetype: 'application/pdf',
        size: secondDocBuffer.length,
        buffer: secondDocBuffer,
      };

      // Second grant on the same user and door
      const secondResult = await controller.grantAccess(
        {
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [testNonADUserId],
          doorIds: [testDoorId],
          accessType: AccessValidityType.PERMANENT,
          approverName: 'Executive Director',
          reason: 'Renewed and superseded grant document',
        },
        secondUpload,
        mockAdminReq,
      );

      expect(secondResult.createdAssignmentsCount).toBe(1);
      const updatedAssignment = secondResult.assignments[0];
      createdScanDocIds.push(updatedAssignment.grantDocumentId!);
      createdScanFileNames.push(secondResult.documentScan!.fileName);

      // Invariant: The same assignment row is updated (id preserved), no duplicate created
      expect(updatedAssignment.id).toBe(initialAssignmentId);
      expect(updatedAssignment.status).toBe(AccessAssignmentStatus.ACTIVE);
      expect(updatedAssignment.grantDocumentId).toBe(secondResult.documentScan!.id);

      // Database check: exactly 1 assignment exists for this user and door
      const dbAssignments = await prisma.doorAccessAssignment.findMany({
        where: {
          nonADUserId: testNonADUserId,
          doorId: testDoorId,
        },
      });
      expect(dbAssignments.length).toBe(1);

      // Door active count remains 1
      const doorAfterSecond = await controller.getDoorById(testDoorId);
      expect(doorAfterSecond.activeUsersCount).toBe(1);
    });
  });

  // =========================================================================
  // 2. ACCESS REVOCATIONS EDGE CASES
  // =========================================================================
  describe('2. Access Revocations Edge Cases & Adversarial Inputs', () => {
    let activeAssignmentId: string;

    beforeAll(async () => {
      // Find the active assignment created in test 1.8
      const assignment = await prisma.doorAccessAssignment.findFirst({
        where: {
          nonADUserId: testNonADUserId,
          doorId: testDoorId,
          status: AccessAssignmentStatus.ACTIVE,
        },
      });
      if (!assignment) {
        throw new Error('Expected active assignment from test 1.8');
      }
      activeAssignmentId = assignment.id;
    });

    it('2.1 should reject revoking access with non-existent assignment IDs (HTTP 404)', async () => {
      const phantomAssignmentId = '00000000-0000-0000-0000-cccccccccccc';
      await expect(
        controller.revokeAccess(
          {
            assignmentIds: [phantomAssignmentId],
            approverName: 'Compliance Officer',
            reason: 'Attempting revocation on non-existent assignment',
            documentId: validRevocationDocId,
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('2.2 should reject revoking access referencing a GRANT scan document (type mismatch, HTTP 400)', async () => {
      await expect(
        controller.revokeAccess(
          {
            assignmentIds: [activeAssignmentId],
            approverName: 'Compliance Officer',
            reason: 'Attempting revocation with grant scan reference',
            documentId: validGrantDocId, // Mismatched type!
          },
          undefined,
          mockAdminReq,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('2.3 should revoke an active assignment and preserve grantDocumentId while attaching revocationDocumentId', async () => {
      const initialAssignment = await prisma.doorAccessAssignment.findUnique({
        where: { id: activeAssignmentId },
      });
      const originalGrantDocId = initialAssignment!.grantDocumentId;
      expect(originalGrantDocId).toBeTruthy();

      const revokeResult = await controller.revokeAccess(
        {
          assignmentIds: [activeAssignmentId],
          approverName: 'Marcus Sterling',
          reason: 'Initial security decommissioning',
          documentId: validRevocationDocId,
        },
        undefined,
        mockAdminReq,
      );

      expect(revokeResult.revokedAssignmentsCount).toBe(1);
      const revoked = revokeResult.assignments[0];
      expect(revoked.id).toBe(activeAssignmentId);
      expect(revoked.status).toBe(AccessAssignmentStatus.REVOKED);
      expect(revoked.grantDocumentId).toBe(originalGrantDocId); // Preserved!
      expect(revoked.revocationDocumentId).toBe(validRevocationDocId); // Attached!
      expect(revoked.revokedAt).toBeDefined();

      // Door active count decremented to 0
      const door = await controller.getDoorById(testDoorId);
      expect(door.activeUsersCount).toBe(0);
    });

    it('2.4 should handle revoking an already-revoked assignment idempotently without overwriting original revocation data', async () => {
      // Fetch current state of revoked assignment
      const stateBefore = await prisma.doorAccessAssignment.findUnique({
        where: { id: activeAssignmentId },
      });
      expect(stateBefore!.status).toBe(AccessAssignmentStatus.REVOKED);
      const originalRevokedAt = stateBefore!.revokedAt;
      const originalRevocationDocId = stateBefore!.revocationDocumentId;

      // Upload a new revocation scan
      const newRevokeBuffer = Buffer.from(
        '%PDF-1.4\n4 0 obj\n<< /Title (Second Revocation Scan) >>\nendobj\ntrailer\n<< /Root 4 0 R >>\n%%EOF\n',
      );
      const secondRevokeUpload = {
        originalname: 'second-revocation-order.pdf',
        mimetype: 'application/pdf',
        size: newRevokeBuffer.length,
        buffer: newRevokeBuffer,
      };

      // Call revokeAccess again on already REVOKED assignment
      const secondRevokeResult = await controller.revokeAccess(
        {
          assignmentIds: [activeAssignmentId],
          approverName: 'Auditor General',
          reason: 'Redundant second revocation attempt',
        },
        secondRevokeUpload,
        mockAdminReq,
      );

      createdScanDocIds.push(secondRevokeResult.documentScan!.id);
      createdScanFileNames.push(secondRevokeResult.documentScan!.fileName);

      // Verify idempotency: status is REVOKED, original timestamp and doc are NOT mutated
      const stateAfter = await prisma.doorAccessAssignment.findUnique({
        where: { id: activeAssignmentId },
      });
      expect(stateAfter!.status).toBe(AccessAssignmentStatus.REVOKED);
      expect(stateAfter!.revokedAt?.toISOString()).toBe(originalRevokedAt?.toISOString());
      expect(stateAfter!.revocationDocumentId).toBe(originalRevocationDocId);

      // Door count remains 0
      const door = await controller.getDoorById(testDoorId);
      expect(door.activeUsersCount).toBe(0);
    });
  });

  // =========================================================================
  // 3. FILE STREAMING & PATH TRAVERSAL SECURITY
  // =========================================================================
  describe('3. File Streaming Security & Path Traversal Rejection', () => {
    it('3.1 should reject streaming with non-existent document ID on /documents/:id/download (HTTP 404)', async () => {
      const phantomDocId = '00000000-0000-0000-0000-bbbbbbbbbbbb';
      const { res } = createMockResponse();

      await expect(controller.downloadDocumentById(phantomDocId, res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('3.2 should strictly reject path traversal attempts via /documents/file/:filename (HTTP 404)', async () => {
      const maliciousPayloads = [
        '../../../../etc/passwd',
        '..\\..\\..\\..\\windows\\win.ini',
        '../../../../etc/shadow',
        '../../../src/main.ts',
        '..%2f..%2f..%2fetc%2fpasswd',
        '../package.json',
        'scan-grant-test.pdf/../../main.ts',
        'passwd\0.pdf',
        '/etc/passwd',
        'C:\\Windows\\System32\\cmd.exe',
      ];

      for (const payload of maliciousPayloads) {
        const { res } = createMockResponse();
        await expect(controller.getScanFile(payload, undefined, res)).rejects.toThrow(
          NotFoundException,
        );
      }
    });

    it('3.3 should reject streaming non-whitelisted file extensions (HTTP 404)', async () => {
      const nonWhitelistedFiles = [
        'malicious-script.sh',
        'exploit.exe',
        'database-backup.sql',
        'sensitive-config.env',
        'key.pem',
        'archive.zip',
      ];

      for (const fileName of nonWhitelistedFiles) {
        const { res } = createMockResponse();
        await expect(controller.getScanFile(fileName, undefined, res)).rejects.toThrow(
          NotFoundException,
        );
      }
    });

    it('3.4 should reject upload of unsupported MIME types or oversized buffers (HTTP 400)', async () => {
      // Disallowed MIME type
      await expect(
        storageService.saveScanFile({
          originalname: 'malicious.js',
          mimetype: 'application/javascript',
          size: 100,
          buffer: Buffer.from('console.log("evil")'),
        }),
      ).rejects.toThrow(BadRequestException);

      // Oversized buffer (> 10MB)
      const oversizedPayload = {
        originalname: 'huge-scan.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024,
        buffer: Buffer.alloc(10), // fake metadata size
      };
      await expect(storageService.saveScanFile(oversizedPayload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('3.5 should stream legitimate scan file with strict headers and binary fidelity', async () => {
      const doc = await controller.getDocumentById(validGrantDocId);
      const { res, headers, getBuffer } = createMockResponse();

      await controller.downloadDocumentById(doc.id, res);
      const buffer = await getBuffer();

      expect(headers['content-type']).toBe('application/pdf');
      expect(headers['content-disposition']).toContain(`attachment; filename="${doc.fileName}"`);
      expect(headers['cache-control']).toBe('private, max-age=86400');
      expect(buffer.length).toBe(doc.fileSize);

      const calculatedHash = crypto.createHash('sha256').update(buffer).digest('hex');
      expect(calculatedHash).toBe(doc.fileHash);
    });
  });
});
