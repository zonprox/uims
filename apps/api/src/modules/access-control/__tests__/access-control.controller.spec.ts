import { BadRequestException } from '@nestjs/common';
import {
  AccessSubjectType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  NonADUserStatus,
} from '@uims/shared-types';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessControlController } from '../access-control.controller';
import type { AccessControlStorageService } from '../access-control-storage.service';
import type { AccessControlService } from '../access-control.service';

describe('AccessControlController', () => {
  let controller: AccessControlController;
  let mockService: {
    getAccessControlStats: ReturnType<typeof vi.fn>;
    getDoors: ReturnType<typeof vi.fn>;
    getDoorById: ReturnType<typeof vi.fn>;
    getDoorUsers: ReturnType<typeof vi.fn>;
    createDoor: ReturnType<typeof vi.fn>;
    updateDoor: ReturnType<typeof vi.fn>;
    deleteDoor: ReturnType<typeof vi.fn>;
    getNonADUsers: ReturnType<typeof vi.fn>;
    getNonADUserById: ReturnType<typeof vi.fn>;
    createNonADUser: ReturnType<typeof vi.fn>;
    updateNonADUser: ReturnType<typeof vi.fn>;
    deleteNonADUser: ReturnType<typeof vi.fn>;
    getUnifiedUsers: ReturnType<typeof vi.fn>;
    getUserAccessDetail: ReturnType<typeof vi.fn>;
    grantAccess: ReturnType<typeof vi.fn>;
    revokeAccess: ReturnType<typeof vi.fn>;
    uploadDocument: ReturnType<typeof vi.fn>;
    getDocuments: ReturnType<typeof vi.fn>;
    getDocumentById: ReturnType<typeof vi.fn>;
    generateDocxTemplate: ReturnType<typeof vi.fn>;
    generateHtmlTemplate: ReturnType<typeof vi.fn>;
  };
  let mockStorage: {
    streamScanFile: ReturnType<typeof vi.fn>;
  };

  const sampleDoor = {
    id: 'door-uuid-1',
    doorCode: 'DR-DC-01',
    name: 'Main Data Center',
    building: 'Broadpeak Tower',
    floor: '3F',
    securityLevel: DoorSecurityLevel.CRITICAL,
    status: DoorStatus.ACTIVE,
  };

  const sampleNonADUser = {
    id: 'nonad-uuid-1',
    fullName: 'Michael Chen',
    badgeNumber: 'EXT-B0892',
    identityNumber: '079090001882',
    company: 'Cisco Systems',
    status: NonADUserStatus.ACTIVE,
  };

  beforeEach(() => {
    mockService = {
      getAccessControlStats: vi.fn().mockResolvedValue({
        totalDoors: 8,
        activeDoors: 7,
        maintenanceDoors: 1,
        totalNonADUsers: 5,
        activeNonADUsers: 5,
        totalActiveAssignments: 12,
        directoryUserAssignments: 7,
        nonADUserAssignments: 5,
        expiringSoonAssignments: 2,
        criticalDoorAssignments: 4,
      }),
      getDoors: vi.fn().mockResolvedValue({
        items: [sampleDoor],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      getDoorById: vi.fn().mockResolvedValue(sampleDoor),
      getDoorUsers: vi
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }),
      createDoor: vi.fn().mockResolvedValue(sampleDoor),
      updateDoor: vi.fn().mockResolvedValue(sampleDoor),
      deleteDoor: vi.fn().mockResolvedValue({ id: 'door-uuid-1', message: 'Door removed' }),
      getNonADUsers: vi.fn().mockResolvedValue({
        items: [sampleNonADUser],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
      getNonADUserById: vi.fn().mockResolvedValue(sampleNonADUser),
      createNonADUser: vi.fn().mockResolvedValue(sampleNonADUser),
      updateNonADUser: vi.fn().mockResolvedValue(sampleNonADUser),
      deleteNonADUser: vi.fn().mockResolvedValue({ id: 'nonad-uuid-1', message: 'User deleted' }),
      getUnifiedUsers: vi
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }),
      getUserAccessDetail: vi.fn().mockResolvedValue({
        subjectType: AccessSubjectType.NON_AD_USER,
        subjectId: 'nonad-uuid-1',
        fullName: 'Michael Chen',
        activeAssignments: [],
        revokedAssignments: [],
        expiredAssignments: [],
      }),
      grantAccess: vi.fn().mockResolvedValue({ createdAssignmentsCount: 1, assignments: [] }),
      revokeAccess: vi.fn().mockResolvedValue({ revokedAssignmentsCount: 1, assignments: [] }),
      uploadDocument: vi.fn().mockResolvedValue({ id: 'doc-uuid-1', fileName: 'scan.pdf' }),
      getDocuments: vi
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }),
      getDocumentById: vi.fn().mockResolvedValue({ id: 'doc-uuid-1', fileName: 'scan.pdf' }),
      generateDocxTemplate: vi.fn().mockResolvedValue(Buffer.from('mock docx')),
      generateHtmlTemplate: vi.fn().mockResolvedValue('<html><body>Print Form</body></html>'),
    };

    mockStorage = {
      streamScanFile: vi.fn().mockResolvedValue(undefined),
    };

    controller = new AccessControlController(
      mockService as unknown as AccessControlService,
      mockStorage as unknown as AccessControlStorageService,
    );
  });

  it('GET /stats should return aggregated access metrics', async () => {
    const result = await controller.getStats();
    expect(result.totalDoors).toBe(8);
    expect(mockService.getAccessControlStats).toHaveBeenCalled();
  });

  it('GET /doors should query doors with parameters', async () => {
    const result = await controller.getDoors({ page: 1, pageSize: 10 });
    expect(result.items).toHaveLength(1);
    expect(mockService.getDoors).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it('POST /doors should forward payload to service', async () => {
    const dto = {
      doorCode: 'DR-DC-01',
      name: 'Main Data Center',
      building: 'Broadpeak Tower',
      floor: '3F',
    };
    const result = await controller.createDoor(dto);
    expect(result).toEqual(sampleDoor);
    expect(mockService.createDoor).toHaveBeenCalledWith(dto);
  });

  it('PATCH /doors/:id and PUT /doors/:id should update door', async () => {
    const dto = { name: 'Updated Door' };
    await controller.updateDoor('door-uuid-1', dto);
    expect(mockService.updateDoor).toHaveBeenCalledWith('door-uuid-1', dto);

    await controller.updateDoorPut('door-uuid-1', dto);
    expect(mockService.updateDoor).toHaveBeenCalledWith('door-uuid-1', dto);
  });

  it('DELETE /doors/:id should call deleteDoor', async () => {
    const result = await controller.deleteDoor('door-uuid-1');
    expect(result.id).toBe('door-uuid-1');
    expect(mockService.deleteDoor).toHaveBeenCalledWith('door-uuid-1');
  });

  it('GET /non-ad-users should return external personnel', async () => {
    const result = await controller.getNonADUsers({ page: 1 });
    expect(result.items[0]?.fullName).toBe('Michael Chen');
    expect(mockService.getNonADUsers).toHaveBeenCalledWith({ page: 1 });
  });

  it('POST /grants should pass file and user ID to service', async () => {
    const dto = {
      doorIds: ['door-uuid-1'],
      subjectType: AccessSubjectType.NON_AD_USER,
      subjectIds: ['nonad-uuid-1'],
      approverName: 'Doan Minh Tri',
      reason: 'Network install',
    };
    const mockFile = {
      originalname: 'scan.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    };
    const mockReq = { user: { id: 'admin-1' } };

    await controller.grantAccess(dto, mockFile, mockReq);
    expect(mockService.grantAccess).toHaveBeenCalledWith(dto, mockFile, 'admin-1');
  });

  it('POST /revocations should pass file and user ID to service', async () => {
    const dto = {
      assignmentIds: ['assignment-uuid-1'],
      approverName: 'Dang Thanh Phong',
      reason: 'Contract completion',
    };
    const mockReq = { user: { id: 'admin-1' } };

    await controller.revokeAccess(dto, undefined, mockReq);
    expect(mockService.revokeAccess).toHaveBeenCalledWith(dto, undefined, 'admin-1');
  });

  it('POST /documents/upload should reject when file is omitted', async () => {
    const dto = {
      documentType: DoorDocumentType.GRANT,
      approverName: 'Approver',
      reason: 'Reason',
    };
    const mockReq = { user: { id: 'admin-1' } };

    expect(() => controller.uploadDocument(dto, undefined, mockReq)).toThrow(BadRequestException);
  });

  it('GET /documents/file/:filename should stream file via storage service', async () => {
    const mockRes = {} as Response;
    await controller.getScanFile('scan.pdf', 'true', mockRes);
    expect(mockStorage.streamScanFile).toHaveBeenCalledWith('scan.pdf', mockRes, true);
  });

  it('GET /templates/request.docx should set headers and send binary buffer', async () => {
    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    } as unknown as Response;

    await controller.downloadRequestDocx({ subjectId: 'nonad-uuid-1' }, mockRes);
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="door-access-request-form.docx"',
    );
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('GET /templates/request.html should set headers and send HTML text', async () => {
    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    } as unknown as Response;

    await controller.getRequestHtml({ subjectId: 'nonad-uuid-1' }, mockRes);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
    expect(mockRes.send).toHaveBeenCalledWith('<html><body>Print Form</body></html>');
  });
});
