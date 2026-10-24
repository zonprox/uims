import { BadRequestException } from '@nestjs/common';
import {
  AccessAssignmentStatus,
  AccessSubjectType,
  AccessValidityType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  NonADUserStatus,
} from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../database/prisma.service';
import type { AccessControlStorageService } from '../access-control-storage.service';
import { AccessControlService } from '../access-control.service';

describe('AccessControlService', () => {
  let service: AccessControlService;
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

  const sampleDoor = {
    id: 'door-uuid-1',
    doorCode: 'DR-DC-01',
    name: 'Main Data Center',
    building: 'Broadpeak Tower',
    floor: '3F',
    zone: 'IT Core',
    securityLevel: DoorSecurityLevel.CRITICAL,
    status: DoorStatus.ACTIVE,
    installedAt: new Date('2026-01-01'),
    metadata: {},
    notes: 'Primary entrance',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    organizationId: null,
    organization: null,
    _count: { assignments: 2 },
  };

  const sampleNonADUser = {
    id: 'nonad-uuid-1',
    fullName: 'Michael Chen',
    badgeNumber: 'EXT-B0892',
    identityNumber: '079090001882',
    company: 'Cisco Systems',
    phone: '+84 903 112 334',
    email: 'mchen@cisco.com',
    userType: 'CONTRACTOR',
    status: NonADUserStatus.ACTIVE,
    validFrom: new Date('2026-10-01'),
    validTo: new Date('2026-11-30'),
    notes: 'Network contractor',
    metadata: {},
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
    _count: { assignments: 1 },
  };

  const sampleScanDoc = {
    id: 'doc-uuid-1',
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
    reason: 'Server maintenance',
    notes: null,
    uploadedById: 'user-admin-1',
    createdAt: new Date('2026-10-24'),
    updatedAt: new Date('2026-10-24'),
  };

  beforeEach(() => {
    mockPrisma = {
      accessDoor: {
        count: vi.fn().mockResolvedValue(8),
        findMany: vi.fn().mockResolvedValue([sampleDoor]),
        findUnique: vi.fn().mockResolvedValue(sampleDoor),
        create: vi.fn().mockResolvedValue(sampleDoor),
        update: vi.fn().mockResolvedValue(sampleDoor),
        delete: vi.fn().mockResolvedValue(sampleDoor),
      },
      nonADUser: {
        count: vi.fn().mockResolvedValue(5),
        findMany: vi.fn().mockResolvedValue([sampleNonADUser]),
        findUnique: vi.fn().mockResolvedValue(sampleNonADUser),
        create: vi.fn().mockResolvedValue(sampleNonADUser),
        update: vi.fn().mockResolvedValue(sampleNonADUser),
        delete: vi.fn().mockResolvedValue(sampleNonADUser),
      },
      directoryUser: {
        count: vi.fn().mockResolvedValue(25),
        findMany: vi.fn().mockResolvedValue([]),
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
        count: vi.fn().mockResolvedValue(4),
        findMany: vi.fn().mockResolvedValue([sampleScanDoc]),
        findUnique: vi.fn().mockResolvedValue(sampleScanDoc),
        create: vi.fn().mockResolvedValue(sampleScanDoc),
      },
      doorAccessAssignment: {
        count: vi.fn().mockResolvedValue(12),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'assignment-uuid-1',
          doorId: 'door-uuid-1',
          subjectType: AccessSubjectType.DIRECTORY_USER,
          directoryUserId: 'ad-user-1',
          nonADUserId: null,
          accessType: AccessValidityType.PERMANENT,
          validFrom: new Date(),
          validTo: null,
          status: AccessAssignmentStatus.ACTIVE,
          grantReason: 'Authorized IT staff',
          grantedAt: new Date(),
          grantedById: 'admin-1',
          grantDocumentId: 'doc-uuid-1',
          revokedAt: null,
          revokedById: null,
          revocationReason: null,
          revocationDocumentId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          door: sampleDoor,
          directoryUser: {
            id: 'ad-user-1',
            employeeCode: 'EMP-001',
            displayName: 'Pham Hoang Nam',
            email: 'nam.pham@youngone.com',
          },
          nonADUser: null,
          grantDocument: sampleScanDoc,
          revocationDocument: null,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'assignment-uuid-1',
          doorId: 'door-uuid-1',
          status: AccessAssignmentStatus.REVOKED,
          revokedAt: new Date(),
          revokedById: 'admin-1',
          revocationReason: 'Contract finished',
          revocationDocumentId: 'doc-uuid-2',
          grantDocumentId: 'doc-uuid-1',
          door: sampleDoor,
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
      getUploadDir: vi.fn().mockReturnValue('/uploads/access-control/scans'),
    };

    service = new AccessControlService(
      mockPrisma as unknown as PrismaService,
      mockStorageService as unknown as AccessControlStorageService,
    );
  });

  // ==========================================
  // DOOR INVENTORY TESTS
  // ==========================================

  describe('Door Management', () => {
    it('should return paginated doors with bounded query limits', async () => {
      const result = await service.getDoors({ page: 1, pageSize: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(8);
      expect(result.items[0]?.doorCode).toBe('DR-DC-01');
      expect(result.items[0]?.activeUsersCount).toBe(2);
      expect(mockPrisma.accessDoor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
      );
    });

    it('should cap high pageSize to 100 per AGENTS.md invariant', async () => {
      await service.getDoors({ page: 1, pageSize: 5000 });
      expect(mockPrisma.accessDoor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should create door when doorCode is unique', async () => {
      mockPrisma.accessDoor.findUnique.mockResolvedValueOnce(null);
      const result = await service.createDoor({
        doorCode: 'DR-NOC-01',
        name: 'Network Operations Center',
        building: 'Broadpeak Tower',
        floor: '2F',
        securityLevel: DoorSecurityLevel.HIGH,
      });

      expect(result.doorCode).toBe('DR-DC-01');
      expect(mockPrisma.accessDoor.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when creating door with duplicate doorCode', async () => {
      mockPrisma.accessDoor.findUnique.mockResolvedValueOnce(sampleDoor);
      await expect(
        service.createDoor({
          doorCode: 'DR-DC-01',
          name: 'Duplicate Door',
          building: 'Broadpeak Tower',
          floor: '3F',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent deleting door with active access assignments', async () => {
      mockPrisma.accessDoor.findUnique.mockResolvedValueOnce({
        ...sampleDoor,
        _count: { assignments: 3 },
      });

      await expect(service.deleteDoor('door-uuid-1')).rejects.toThrow(
        /Cannot delete door 'DR-DC-01' with active access registrations/,
      );
    });

    it('should allow deleting door with zero active access assignments', async () => {
      mockPrisma.accessDoor.findUnique.mockResolvedValueOnce({
        ...sampleDoor,
        _count: { assignments: 0 },
      });

      const result = await service.deleteDoor('door-uuid-1');
      expect(result.id).toBe('door-uuid-1');
      expect(mockPrisma.accessDoor.delete).toHaveBeenCalledWith({ where: { id: 'door-uuid-1' } });
    });
  });

  // ==========================================
  // NON-AD USER REGISTRY TESTS
  // ==========================================

  describe('Non-AD Personnel Registry', () => {
    it('should create non-AD user when badgeNumber is unique', async () => {
      mockPrisma.nonADUser.findUnique.mockResolvedValueOnce(null);
      const result = await service.createNonADUser({
        fullName: 'David Miller',
        badgeNumber: 'VIS-1044',
        identityNumber: 'P8892019A',
        company: 'KPMG',
      });

      expect(result.fullName).toBe('Michael Chen');
      expect(mockPrisma.nonADUser.create).toHaveBeenCalled();
    });

    it('should reject non-AD user creation with duplicate badgeNumber', async () => {
      mockPrisma.nonADUser.findUnique.mockResolvedValueOnce(sampleNonADUser);
      await expect(
        service.createNonADUser({
          fullName: 'Another Contractor',
          badgeNumber: 'EXT-B0892',
          identityNumber: '999999',
          company: 'Acme',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject deleting non-AD user with active assignments', async () => {
      mockPrisma.nonADUser.findUnique.mockResolvedValueOnce({
        ...sampleNonADUser,
        _count: { assignments: 2 },
      });

      await expect(service.deleteNonADUser('nonad-uuid-1')).rejects.toThrow(
        /Cannot delete external user 'Michael Chen' with active door access registrations/,
      );
    });
  });

  // ==========================================
  // MANDATORY SCAN ENFORCEMENT ON GRANT & REVOKE
  // ==========================================

  describe('Mandatory Scan Enforcement', () => {
    it('GRANT: should throw BadRequestException if both uploadedFile and documentId are missing', async () => {
      await expect(
        service.grantAccess({
          doorIds: ['door-uuid-1'],
          subjectType: AccessSubjectType.DIRECTORY_USER,
          subjectIds: ['ad-user-1'],
          approverName: 'Doan Minh Tri',
          reason: 'Access request',
        }),
      ).rejects.toThrow(
        /A signed approval scan document \(PDF or image\) is mandatory for granting physical door access/,
      );
    });

    it('GRANT: should throw BadRequestException if time-bound access has past or missing validTo', async () => {
      await expect(
        service.grantAccess(
          {
            doorIds: ['door-uuid-1'],
            subjectType: AccessSubjectType.DIRECTORY_USER,
            subjectIds: ['ad-user-1'],
            accessType: AccessValidityType.TIME_BOUND,
            validTo: new Date(Date.now() - 3600000).toISOString(), // 1 hour in past
            approverName: 'Doan Minh Tri',
            reason: 'Temporary audit',
            documentId: 'doc-uuid-1',
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(/A future expiration date \(validTo\) is required for time-bound access/);
    });

    it('GRANT: should succeed when valid file buffer is provided and create audit scan record', async () => {
      const mockFile = {
        originalname: 'approval.pdf',
        mimetype: 'application/pdf',
        size: 51200,
        buffer: Buffer.from('fake pdf content'),
      };

      mockPrisma.accessDoor.findMany.mockResolvedValueOnce([sampleDoor]);
      mockPrisma.directoryUser.findMany.mockResolvedValueOnce([{ id: 'ad-user-1' }]);

      const result = await service.grantAccess(
        {
          doorIds: ['door-uuid-1'],
          subjectType: AccessSubjectType.DIRECTORY_USER,
          subjectIds: ['ad-user-1'],
          approverName: 'Doan Minh Tri',
          approverTitle: 'VP of InfoSec',
          referenceNumber: 'DAR-2026-10-001',
          reason: 'Data center access for audit',
        },
        mockFile,
        'admin-1',
      );

      expect(result.createdAssignmentsCount).toBe(1);
      expect(result.documentScan).toBeDefined();
      expect(mockStorageService.saveScanFile).toHaveBeenCalledWith(mockFile, 'GRANT');
      expect(mockPrisma.doorAccessDocumentScan.create).toHaveBeenCalled();
    });

    it('GRANT: should reject grant to door with INACTIVE status', async () => {
      mockPrisma.accessDoor.findMany.mockResolvedValueOnce([
        { ...sampleDoor, status: DoorStatus.INACTIVE },
      ]);
      mockPrisma.directoryUser.findMany.mockResolvedValueOnce([{ id: 'ad-user-1' }]);

      await expect(
        service.grantAccess(
          {
            doorIds: ['door-uuid-1'],
            subjectType: AccessSubjectType.DIRECTORY_USER,
            subjectIds: ['ad-user-1'],
            approverName: 'Doan Minh Tri',
            reason: 'Test',
            documentId: 'doc-uuid-1',
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(/Cannot grant access to door 'DR-DC-01' because its status is INACTIVE/);
    });

    it('GRANT: should reject grant to non-AD user with BLACKLISTED status', async () => {
      mockPrisma.accessDoor.findMany.mockResolvedValueOnce([sampleDoor]);
      mockPrisma.nonADUser.findMany.mockResolvedValueOnce([
        { ...sampleNonADUser, status: NonADUserStatus.BLACKLISTED },
      ]);

      await expect(
        service.grantAccess(
          {
            doorIds: ['door-uuid-1'],
            subjectType: AccessSubjectType.NON_AD_USER,
            subjectIds: ['nonad-uuid-1'],
            approverName: 'Doan Minh Tri',
            reason: 'Contract work',
            documentId: 'doc-uuid-1',
          },
          undefined,
          'admin-1',
        ),
      ).rejects.toThrow(
        /Cannot grant door access to external user 'Michael Chen' because account is BLACKLISTED/,
      );
    });

    it('REVOKE: should throw BadRequestException if both uploadedFile and documentId are missing', async () => {
      await expect(
        service.revokeAccess({
          assignmentIds: ['assignment-uuid-1'],
          approverName: 'Dang Thanh Phong',
          reason: 'Access termination',
        }),
      ).rejects.toThrow(
        /A signed revocation approval scan document \(PDF or image\) is mandatory for revoking physical door access/,
      );
    });

    it('REVOKE: should succeed and transition status to REVOKED with dual-document retention', async () => {
      const mockFile = {
        originalname: 'revocation.pdf',
        mimetype: 'application/pdf',
        size: 40960,
        buffer: Buffer.from('fake revocation pdf'),
      };

      const existingAssignment = {
        id: 'assignment-uuid-1',
        doorId: 'door-uuid-1',
        status: AccessAssignmentStatus.ACTIVE,
        grantDocumentId: 'doc-uuid-1',
        notes: 'Original note',
      };

      mockPrisma.doorAccessAssignment.findMany.mockResolvedValueOnce([existingAssignment]);
      mockPrisma.doorAccessDocumentScan.create.mockResolvedValueOnce({
        ...sampleScanDoc,
        id: 'doc-revoke-2',
        documentType: DoorDocumentType.REVOCATION,
      });

      const result = await service.revokeAccess(
        {
          assignmentIds: ['assignment-uuid-1'],
          approverName: 'Dang Thanh Phong',
          reason: 'Audit cycle ended',
          notes: 'Revoked per schedule',
        },
        mockFile,
        'admin-1',
      );

      expect(result.revokedAssignmentsCount).toBe(1);
      expect(result.documentScan?.id).toBe('doc-revoke-2');
      expect(mockStorageService.saveScanFile).toHaveBeenCalledWith(mockFile, 'REVOCATION');
      expect(mockPrisma.doorAccessAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'assignment-uuid-1' },
          data: expect.objectContaining({
            status: AccessAssignmentStatus.REVOKED,
            revocationDocumentId: 'doc-revoke-2',
          }),
        }),
      );
    });
  });

  // ==========================================
  // DASHBOARD STATS TESTS
  // ==========================================

  describe('Telemetry & Stats', () => {
    it('should aggregate all 10 physical access metrics using database counts', async () => {
      const stats = await service.getAccessControlStats();
      expect(stats.totalDoors).toBe(8);
      expect(stats.totalNonADUsers).toBe(5);
      expect(stats.totalActiveAssignments).toBe(12);
      expect(mockPrisma.accessDoor.count).toHaveBeenCalledTimes(3);
      expect(mockPrisma.nonADUser.count).toHaveBeenCalledTimes(2);
      expect(mockPrisma.doorAccessAssignment.count).toHaveBeenCalledTimes(5);
    });
  });

  // ==========================================
  // TEMPLATE BUILDER TESTS
  // ==========================================

  describe('Template Generation', () => {
    it('should generate valid .docx buffer with clearance table and signature blocks', async () => {
      const buffer = await service.generateDocxTemplate({
        subjectType: AccessSubjectType.NON_AD_USER,
        subjectId: 'nonad-uuid-1',
        doorIds: ['door-uuid-1'],
        reason: 'Authorized security inspection',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it('should generate valid printable HTML with print CSS styles', async () => {
      const html = await service.generateHtmlTemplate({
        subjectType: AccessSubjectType.NON_AD_USER,
        subjectId: 'nonad-uuid-1',
        doorIds: ['door-uuid-1'],
        reason: 'Authorized security inspection',
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('PHYSICAL ACCESS CONTROL CLEARANCE FORM');
      expect(html).toContain('@media print');
      expect(html).toContain('Michael Chen');
      expect(html).toContain('DR-DC-01');
    });
  });
});
