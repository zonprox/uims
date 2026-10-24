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
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../database/prisma.service';
import {
  AccessControlStorageService,
  type UploadedFilePayload,
} from '../access-control-storage.service';
import { AccessControlService } from '../access-control.service';
import {
  type AccessRequestTemplateParams,
  buildAccessRequestDocx,
  buildAccessRequestHtml,
} from '../access-request-template.builder';

describe('Empirical Challenge: Access Control Module Verification', () => {
  let service: AccessControlService;
  let storageService: AccessControlStorageService;
  const testUploadDir = path.resolve(
    process.cwd(),
    'apps/api/uploads/access-control/empirical-test-scans',
  );

  let mockPrisma: {
    accessDoor: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    nonADUser: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    directoryUser: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    doorAccessDocumentScan: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    doorAccessAssignment: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  let mockStorageService: {
    saveScanFile: ReturnType<typeof vi.fn>;
    streamScanFile: ReturnType<typeof vi.fn>;
    deleteScanFile: ReturnType<typeof vi.fn>;
    getUploadDir: ReturnType<typeof vi.fn>;
  };

  const activeDoor = {
    id: 'door-active-01',
    doorCode: 'DR-SERVER-01',
    name: 'Server Vault North',
    building: 'Broadpeak Headquarters',
    floor: '4F',
    zone: 'Data Center',
    securityLevel: DoorSecurityLevel.CRITICAL,
    status: DoorStatus.ACTIVE,
    installedAt: new Date('2026-01-01'),
    metadata: {},
    notes: 'Secure server room',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    organizationId: null,
    organization: null,
    _count: { assignments: 0 },
  };

  const inactiveDoor = {
    ...activeDoor,
    id: 'door-inactive-02',
    doorCode: 'DR-DECOM-02',
    name: 'Decommissioned Storage Room',
    status: DoorStatus.INACTIVE,
  };

  const activeNonADUser = {
    id: 'nonad-active-01',
    fullName: 'Robert Sterling',
    badgeNumber: 'EXT-S9910',
    identityNumber: '079200001234',
    company: 'Fortinet Vietnam',
    phone: '+84 908 776 554',
    email: 'rsterling@fortinet.com',
    userType: 'VENDOR',
    status: NonADUserStatus.ACTIVE,
    validFrom: new Date('2026-10-01'),
    validTo: new Date('2026-12-31'),
    notes: 'Security vendor engineer',
    metadata: {},
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
    _count: { assignments: 0 },
  };

  const blacklistedNonADUser = {
    ...activeNonADUser,
    id: 'nonad-blacklisted-02',
    fullName: 'John Malicious',
    badgeNumber: 'EXT-BAD-01',
    status: NonADUserStatus.BLACKLISTED,
    notes: 'Revoked due to security incident',
  };

  const grantScanDoc = {
    id: 'doc-grant-01',
    documentType: DoorDocumentType.GRANT,
    fileName: 'scan-grant-1729789200-a1f9e2.pdf',
    originalName: 'dar-approval.pdf',
    filePath: '/uploads/access-control/scans/scan-grant-1729789200-a1f9e2.pdf',
    fileUrl: '/api/v1/access-control/documents/file/scan-grant-1729789200-a1f9e2.pdf',
    mimeType: 'application/pdf',
    fileSize: 102400,
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    approverName: 'Doan Minh Tri',
    approverTitle: 'VP of InfoSec',
    referenceNumber: 'DAR-2026-10-001',
    reason: 'Data center access',
    notes: null,
    uploadedById: 'user-admin-1',
    createdAt: new Date('2026-10-24'),
    updatedAt: new Date('2026-10-24'),
  };

  const revokeScanDoc = {
    ...grantScanDoc,
    id: 'doc-revoke-01',
    documentType: DoorDocumentType.REVOCATION,
    fileName: 'scan-revocation-1729789200-b2e8d1.pdf',
    originalName: 'revocation-approval.pdf',
  };

  beforeEach(() => {
    storageService = new AccessControlStorageService();
    vi.spyOn(storageService, 'getUploadDir').mockReturnValue(testUploadDir);
    if (!fs.existsSync(testUploadDir)) {
      fs.mkdirSync(testUploadDir, { recursive: true });
    }

    mockPrisma = {
      accessDoor: {
        count: vi.fn().mockResolvedValue(5),
        findMany: vi.fn().mockResolvedValue([activeDoor]),
        findUnique: vi.fn().mockResolvedValue(activeDoor),
        create: vi.fn().mockResolvedValue(activeDoor),
        update: vi.fn().mockResolvedValue(activeDoor),
        delete: vi.fn().mockResolvedValue(activeDoor),
      },
      nonADUser: {
        count: vi.fn().mockResolvedValue(3),
        findMany: vi.fn().mockResolvedValue([activeNonADUser]),
        findUnique: vi.fn().mockResolvedValue(activeNonADUser),
        create: vi.fn().mockResolvedValue(activeNonADUser),
        update: vi.fn().mockResolvedValue(activeNonADUser),
        delete: vi.fn().mockResolvedValue(activeNonADUser),
      },
      directoryUser: {
        count: vi.fn().mockResolvedValue(20),
        findMany: vi.fn().mockResolvedValue([{ id: 'ad-user-1', employeeCode: 'EMP-001' }]),
        findUnique: vi.fn().mockResolvedValue({
          id: 'ad-user-1',
          employeeCode: 'EMP-001',
          displayName: 'Pham Hoang Nam',
          firstName: 'Nam',
          lastName: 'Pham',
          email: 'nam.pham@youngone.com',
          status: 'ACTIVE',
          organization: { name: 'Youngone Group' },
          department: { name: 'IT Infrastructure' },
          doorAssignments: [],
        }),
      },
      doorAccessDocumentScan: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue([grantScanDoc]),
        findUnique: vi.fn().mockResolvedValue(grantScanDoc),
        create: vi.fn().mockResolvedValue(grantScanDoc),
      },
      doorAccessAssignment: {
        count: vi.fn().mockResolvedValue(8),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'assignment-01',
          doorId: activeDoor.id,
          subjectType: AccessSubjectType.NON_AD_USER,
          nonADUserId: activeNonADUser.id,
          directoryUserId: null,
          accessType: AccessValidityType.PERMANENT,
          validFrom: new Date(),
          validTo: null,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Authorized vendor access',
          grantedAt: new Date(),
          grantedById: 'admin-1',
          grantDocumentId: grantScanDoc.id,
          door: activeDoor,
          nonADUser: activeNonADUser,
          grantDocument: grantScanDoc,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'assignment-01',
          doorId: activeDoor.id,
          status: AccessAssignmentStatus.REVOKED,
          revokedAt: new Date(),
          revokedById: 'admin-1',
          revocationReason: 'Terminated',
          revocationDocumentId: revokeScanDoc.id,
          grantDocumentId: grantScanDoc.id,
          door: activeDoor,
        }),
      },
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockPrisma)),
    };

    mockStorageService = {
      saveScanFile: vi.fn().mockResolvedValue({
        fileName: 'scan-grant-1729789200-a1f9e2.pdf',
        originalName: 'dar-approval.pdf',
        filePath: '/uploads/access-control/scans/scan-grant-1729789200-a1f9e2.pdf',
        fileUrl: '/api/v1/access-control/documents/file/scan-grant-1729789200-a1f9e2.pdf',
        mimeType: 'application/pdf',
        fileSize: 102400,
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      }),
      streamScanFile: vi.fn().mockResolvedValue(undefined),
      deleteScanFile: vi.fn().mockResolvedValue(true),
      getUploadDir: vi.fn().mockReturnValue(testUploadDir),
    };

    service = new AccessControlService(
      mockPrisma as unknown as PrismaService,
      mockStorageService as unknown as AccessControlStorageService,
    );
  });

  afterEach(async () => {
    if (fs.existsSync(testUploadDir)) {
      await fs.promises.rm(testUploadDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  // =========================================================================
  // CHALLENGE 1: Mandatory Scan Enforcement on Grant & Revoke
  // =========================================================================
  describe('Mandatory Scan Enforcement', () => {
    it('GRANT: rejects access grant without scan file and without documentId (400 Bad Request)', async () => {
      await expect(
        service.grantAccess({
          doorIds: [activeDoor.id],
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [activeNonADUser.id],
          approverName: 'Doan Minh Tri',
          reason: 'Routine maintenance',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('GRANT: rejects access grant if referenced documentId does not exist (404 NotFound)', async () => {
      mockPrisma.accessDoor.findMany.mockResolvedValueOnce([activeDoor]);
      mockPrisma.nonADUser.findMany.mockResolvedValueOnce([activeNonADUser]);
      mockPrisma.doorAccessDocumentScan.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.grantAccess({
          doorIds: [activeDoor.id],
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [activeNonADUser.id],
          approverName: 'Doan Minh Tri',
          reason: 'Routine maintenance',
          documentId: 'non-existent-doc-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('GRANT: rejects access grant if referenced document is REVOCATION type (400 Bad Request)', async () => {
      mockPrisma.accessDoor.findMany.mockResolvedValueOnce([activeDoor]);
      mockPrisma.nonADUser.findMany.mockResolvedValueOnce([activeNonADUser]);
      mockPrisma.doorAccessDocumentScan.findUnique.mockResolvedValueOnce(revokeScanDoc);

      await expect(
        service.grantAccess({
          doorIds: [activeDoor.id],
          subjectType: AccessSubjectType.NON_AD_USER,
          subjectIds: [activeNonADUser.id],
          approverName: 'Doan Minh Tri',
          reason: 'Routine maintenance',
          documentId: revokeScanDoc.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('REVOKE: rejects access revocation without scan file and without documentId (400 Bad Request)', async () => {
      await expect(
        service.revokeAccess({
          assignmentIds: ['assignment-01'],
          approverName: 'Doan Minh Tri',
          reason: 'Vendor departure',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('REVOKE: rejects access revocation if referenced document is GRANT type (400 Bad Request)', async () => {
      mockPrisma.doorAccessAssignment.findMany.mockResolvedValueOnce([
        { id: 'assignment-01', status: AccessAssignmentStatus.ACTIVE },
      ]);
      mockPrisma.doorAccessDocumentScan.findUnique.mockResolvedValueOnce(grantScanDoc);

      await expect(
        service.revokeAccess({
          assignmentIds: ['assignment-01'],
          approverName: 'Doan Minh Tri',
          reason: 'Vendor departure',
          documentId: grantScanDoc.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // CHALLENGE 2: Time-Bound Validity Checks
  // =========================================================================
  describe('Time-Bound Validity Checks', () => {
    it('GRANT: rejects time-bound access when validTo is in the past (400 Bad Request)', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      await expect(
        service.grantAccess(
          {
            doorIds: [activeDoor.id],
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [activeNonADUser.id],
            accessType: AccessValidityType.TIME_BOUND,
            validTo: pastDate,
            approverName: 'Doan Minh Tri',
            reason: 'Audit inspection',
            documentId: grantScanDoc.id,
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('GRANT: rejects time-bound access when validTo is missing or invalid (400 Bad Request)', async () => {
      await expect(
        service.grantAccess(
          {
            doorIds: [activeDoor.id],
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [activeNonADUser.id],
            accessType: AccessValidityType.TIME_BOUND,
            validTo: 'invalid-date-string',
            approverName: 'Doan Minh Tri',
            reason: 'Audit inspection',
            documentId: grantScanDoc.id,
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('GRANT: rejects access when validFrom is greater than validTo (400 Bad Request)', async () => {
      const validFrom = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const validTo = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

      await expect(
        service.grantAccess(
          {
            doorIds: [activeDoor.id],
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [activeNonADUser.id],
            validFrom,
            validTo,
            approverName: 'Doan Minh Tri',
            reason: 'Inverted date interval test',
            documentId: grantScanDoc.id,
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // CHALLENGE 3: Inactive Door or Blacklisted User Protection
  // =========================================================================
  describe('Inactive Door and Blacklisted User Protection', () => {
    it('GRANT: rejects access grant targeting an INACTIVE door (400 Bad Request)', async () => {
      mockPrisma.accessDoor.findMany.mockResolvedValueOnce([inactiveDoor]);
      mockPrisma.nonADUser.findMany.mockResolvedValueOnce([activeNonADUser]);

      await expect(
        service.grantAccess(
          {
            doorIds: [inactiveDoor.id],
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [activeNonADUser.id],
            approverName: 'Doan Minh Tri',
            reason: 'Attempting to access inactive door',
            documentId: grantScanDoc.id,
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(/because its status is INACTIVE/);
    });

    it('GRANT: rejects access grant targeting a BLACKLISTED external user (400 Bad Request)', async () => {
      mockPrisma.accessDoor.findMany.mockResolvedValueOnce([activeDoor]);
      mockPrisma.nonADUser.findMany.mockResolvedValueOnce([blacklistedNonADUser]);

      await expect(
        service.grantAccess(
          {
            doorIds: [activeDoor.id],
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [blacklistedNonADUser.id],
            approverName: 'Doan Minh Tri',
            reason: 'Attempting to grant blacklisted user',
            documentId: grantScanDoc.id,
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(/because account is BLACKLISTED/);
    });

    it('GRANT: rejects access grant targeting an INACTIVE external user (400 Bad Request)', async () => {
      const inactiveUser = { ...activeNonADUser, status: NonADUserStatus.INACTIVE };
      mockPrisma.accessDoor.findMany.mockResolvedValueOnce([activeDoor]);
      mockPrisma.nonADUser.findMany.mockResolvedValueOnce([inactiveUser]);

      await expect(
        service.grantAccess(
          {
            doorIds: [activeDoor.id],
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: [inactiveUser.id],
            approverName: 'Doan Minh Tri',
            reason: 'Attempting to grant inactive user',
            documentId: grantScanDoc.id,
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(/because account is INACTIVE/);
    });
  });

  // =========================================================================
  // CHALLENGE 4: Door Deletion Protection with Active Assignments
  // =========================================================================
  describe('Door Deletion Integrity', () => {
    it('DELETE: rejects deleting door with active assignments (400 Bad Request)', async () => {
      mockPrisma.accessDoor.findUnique.mockResolvedValueOnce({
        ...activeDoor,
        _count: { assignments: 3 },
      });

      await expect(service.deleteDoor(activeDoor.id)).rejects.toThrow(
        /Cannot delete door 'DR-SERVER-01' with active access registrations/,
      );
      expect(mockPrisma.accessDoor.delete).not.toHaveBeenCalled();
    });

    it('DELETE: allows deleting door when active assignments count is 0', async () => {
      mockPrisma.accessDoor.findUnique.mockResolvedValueOnce({
        ...activeDoor,
        _count: { assignments: 0 },
      });

      const res = await service.deleteDoor(activeDoor.id);
      expect(res.id).toBe(activeDoor.id);
      expect(mockPrisma.accessDoor.delete).toHaveBeenCalledWith({ where: { id: activeDoor.id } });
    });
  });

  // =========================================================================
  // CHALLENGE 5: Storage Service Security & Resilience
  // =========================================================================
  describe('Storage Service Security', () => {
    it('STORAGE: rejects file upload exceeding 10MB limit with BadRequestException', async () => {
      const oversizedPayload: UploadedFilePayload = {
        originalname: 'huge_document.pdf',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024 + 1,
        buffer: Buffer.alloc(10),
      };

      await expect(storageService.saveScanFile(oversizedPayload)).rejects.toThrow(
        /File exceeds the maximum permitted size of 10MB/,
      );
    });

    it('STORAGE: rejects executable or disallowed extensions (.exe, .sh, .js)', async () => {
      const maliciousFiles: UploadedFilePayload[] = [
        {
          originalname: 'trojan.exe',
          mimetype: 'application/x-msdownload',
          size: 1024,
          buffer: Buffer.from('binary-payload'),
        },
        {
          originalname: 'script.sh',
          mimetype: 'application/x-sh',
          size: 512,
          buffer: Buffer.from('#!/bin/sh\nrm -rf /'),
        },
        {
          originalname: 'exploit.js',
          mimetype: 'application/javascript',
          size: 256,
          buffer: Buffer.from('alert(1)'),
        },
      ];

      for (const badFile of maliciousFiles) {
        await expect(storageService.saveScanFile(badFile)).rejects.toThrow(
          /Invalid file type. Only PDF, PNG, JPG, and JPEG documents are permitted/,
        );
      }
    });

    it('STORAGE: rejects path traversal attempts in streaming and unlinking', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      // Traversal using relative path
      await expect(storageService.streamScanFile('../../etc/passwd', mockRes)).rejects.toThrow(
        NotFoundException,
      );

      // Traversal using nested relative path with allowed extension
      await expect(
        storageService.streamScanFile('../../../var/log/secret.pdf', mockRes),
      ).rejects.toThrow(NotFoundException);

      // Traversal attempt in deleteScanFile
      const unlinked = await storageService.deleteScanFile('../../etc/passwd');
      expect(unlinked).toBe(false);
    });

    it('STORAGE: sanitizes directory traversal in originalname and saves safe file', async () => {
      const filePayload: UploadedFilePayload = {
        originalname: '../../../../etc/shadow.pdf',
        mimetype: 'application/pdf',
        size: 48,
        buffer: Buffer.from('Sample genuine PDF header & content %PDF-1.4'),
      };

      const result = await storageService.saveScanFile(filePayload, 'GRANT');
      expect(result.originalName).toBe('shadow.pdf');
      expect(result.fileName).toMatch(/^scan-grant-\d+-[a-f0-9]+\.pdf$/);
      expect(fs.existsSync(result.filePath)).toBe(true);

      // Verify SHA-256 calculation
      expect(result.fileHash).toHaveLength(64);

      // Clean up
      await storageService.deleteScanFile(result.fileName);
      expect(fs.existsSync(result.filePath)).toBe(false);
    });
  });

  // =========================================================================
  // CHALLENGE 6: Template Generator (.docx and HTML)
  // =========================================================================
  describe('Template Generator', () => {
    const templateParams: AccessRequestTemplateParams = {
      refId: 'EMPIRICAL-CHALLENGE-2026',
      currentDate: '2026-10-24',
      subject: {
        fullName: 'Dr. Evelyn Vance',
        codeOrBadge: 'AUD-8899',
        subjectType: 'NON_AD_USER',
        companyOrOrg: 'KPMG Cyber Risk',
        departmentOrTitle: 'Lead Auditor',
        email: 'evance@kpmg.com',
        phone: '+84 901 223 344',
      },
      doors: [
        {
          doorCode: 'DR-CRITICAL-01',
          name: 'Core Cryptographic Vault',
          building: 'Tower 1',
          floor: 'B2',
          zone: 'HSM Vault',
          securityLevel: 'CRITICAL',
          accessType: 'TIME_BOUND',
          validFrom: '2026-10-25',
          validTo: '2026-10-31',
        },
      ],
      reason: 'ISO 27001 and SOC 2 Type II Annual Security Audit',
      accessType: 'TIME_BOUND',
      validFrom: '2026-10-25',
      validTo: '2026-10-31',
    };

    it('DOCX: generates valid Word .docx buffer with ZIP/PK signature', async () => {
      const docxBuffer = await buildAccessRequestDocx(templateParams);

      expect(Buffer.isBuffer(docxBuffer)).toBe(true);
      expect(docxBuffer.length).toBeGreaterThan(1000);

      // Verify PK zip header signature [0x50, 0x4B, 0x03, 0x04]
      expect(docxBuffer[0]).toBe(0x50);
      expect(docxBuffer[1]).toBe(0x4b);
      expect(docxBuffer[2]).toBe(0x03);
      expect(docxBuffer[3]).toBe(0x04);
    });

    it('DOCX: handles empty subject and doors gracefully without crashing', async () => {
      const emptyParams: AccessRequestTemplateParams = {
        refId: 'EMPTY-REF-001',
        currentDate: '2026-10-24',
        doors: [],
      };

      const docxBuffer = await buildAccessRequestDocx(emptyParams);
      expect(Buffer.isBuffer(docxBuffer)).toBe(true);
      expect(docxBuffer.length).toBeGreaterThan(500);
    });

    it('HTML: generates well-formed printable HTML markup with print styles', () => {
      const htmlOutput = buildAccessRequestHtml(templateParams);

      expect(typeof htmlOutput).toBe('string');
      expect(htmlOutput).toContain('<!DOCTYPE html>');
      expect(htmlOutput).toContain('<html lang="en">');
      expect(htmlOutput).toContain('@media print');
      expect(htmlOutput).toContain('PHYSICAL ACCESS CONTROL CLEARANCE FORM');
      expect(htmlOutput).toContain('EMPIRICAL-CHALLENGE-2026');
      expect(htmlOutput).toContain('Dr. Evelyn Vance');
      expect(htmlOutput).toContain('KPMG Cyber Risk');
      expect(htmlOutput).toContain('DR-CRITICAL-01');
      expect(htmlOutput).toContain('Core Cryptographic Vault');
      expect(htmlOutput).toContain('CRITICAL');
      expect(htmlOutput).toContain('ISO 27001 and SOC 2 Type II Annual Security Audit');
      expect(htmlOutput).toContain('</html>');
    });

    it('HTML: handles missing optional fields gracefully with fallbacks', () => {
      const minimalHtml = buildAccessRequestHtml({
        refId: 'MINIMAL-001',
        currentDate: '2026-10-24',
        doors: [],
      });

      expect(minimalHtml).toContain('<!DOCTYPE html>');
      expect(minimalHtml).toContain('MINIMAL-001');
      expect(minimalHtml).toContain('DR-SAMPLE-01'); // Default sample door row fallback
      expect(minimalHtml).toContain('Youngone / Broadpeak Group');
    });
  });
});
