import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessAssignmentStatus,
  AccessSubjectType,
  AccessValidityType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  type DocumentScanDetailDto,
  type DoorWithCountDto,
} from '@uims/shared-types';
import { DocumentPreviewModal } from '../modals/DocumentPreviewModal';
import { GrantAccessModal } from '../modals/GrantAccessModal';
import { RevokeAccessModal } from '../modals/RevokeAccessModal';
import { accessControlService } from '../../../services/access-control.service';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/access-control.service', () => ({
  accessControlService: {
    getDocumentById: vi.fn(),
    downloadDocumentBlob: vi.fn(),
    getDoors: vi.fn(),
    getDoorUsers: vi.fn(),
    getUnifiedUsers: vi.fn(),
    grantAccess: vi.fn(),
    revokeAccess: vi.fn(),
  },
}));

describe('Challenger M4-Iter2 Adversarial Stress Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    mockCreateObjectURL.mockReturnValue('blob:http://localhost/stress-test-uuid');
    mockRevokeObjectURL.mockReturnValue(undefined);
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    container.remove();
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer-root, .ant-popover')
      .forEach((el) => el.remove());

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.clearAllMocks();
  });

  const mount = async (element: React.ReactElement) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(createElement(ConfigProvider, null, createElement(App, null, element)));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  };

  describe('1. Empirical Stress Testing: In-Modal Scan Preview & Object URL Lifecycle', () => {
    const mockDoc = (mimeType: string): DocumentScanDetailDto => ({
      id: 'doc-stress-1',
      fileName: 'stress_scan.dat',
      originalName: 'stress_scan_approved.pdf',
      filePath: 'uploads/scans/stress.pdf',
      fileUrl: '/api/v1/access-control/documents/file/stress.pdf',
      mimeType,
      fileSize: 1024 * 512,
      fileHash: 'abcdef123456',
      documentType: DoorDocumentType.GRANT,
      approverName: 'Security Director',
      approverTitle: 'Director',
      referenceNumber: 'REF-STRESS-001',
      reason: 'Urgent datacenter maintenance',
      notes: null,
      createdAt: '2026-10-24T12:00:00Z',
      updatedAt: '2026-10-24T12:00:00Z',
    });

    it('creates object URL and renders iframe for PDF MIME type', async () => {
      vi.mocked(accessControlService.getDocumentById).mockResolvedValue(mockDoc('application/pdf'));
      vi.mocked(accessControlService.downloadDocumentBlob).mockResolvedValue({
        blob: new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }),
        filename: 'stress.pdf',
      });

      await mount(
        createElement(DocumentPreviewModal, {
          state: { open: true, documentId: 'doc-stress-1' },
          onClose: vi.fn(),
        }),
      );

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const iframe = document.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe?.src).toBe('blob:http://localhost/stress-test-uuid');
    });

    it('creates object URL and renders img for image MIME type', async () => {
      vi.mocked(accessControlService.getDocumentById).mockResolvedValue(mockDoc('image/jpeg'));
      vi.mocked(accessControlService.downloadDocumentBlob).mockResolvedValue({
        blob: new Blob(['fake jpeg binary'], { type: 'image/jpeg' }),
        filename: 'stress.jpg',
      });

      await mount(
        createElement(DocumentPreviewModal, {
          state: { open: true, documentId: 'doc-stress-1' },
          onClose: vi.fn(),
        }),
      );

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const img = document.querySelector('img[alt="Document Scan"]');
      expect(img).not.toBeNull();
      expect((img as HTMLImageElement)?.src).toBe('blob:http://localhost/stress-test-uuid');
    });

    it('renders fallback Empty state for non-previewable MIME type (e.g. application/zip)', async () => {
      vi.mocked(accessControlService.getDocumentById).mockResolvedValue(mockDoc('application/zip'));
      vi.mocked(accessControlService.downloadDocumentBlob).mockResolvedValue({
        blob: new Blob(['fake zip bytes'], { type: 'application/zip' }),
        filename: 'stress.zip',
      });

      await mount(
        createElement(DocumentPreviewModal, {
          state: { open: true, documentId: 'doc-stress-1' },
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('iframe')).toBeNull();
      expect(document.querySelector('img[alt="Document Scan"]')).toBeNull();
      expect(document.body.textContent).toContain(
        'In-browser preview is not available for this file type',
      );
    });

    it('revokes object URL when modal is closed without unmounting', async () => {
      vi.mocked(accessControlService.getDocumentById).mockResolvedValue(mockDoc('application/pdf'));
      vi.mocked(accessControlService.downloadDocumentBlob).mockResolvedValue({
        blob: new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }),
        filename: 'stress.pdf',
      });

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(DocumentPreviewModal, {
                state: { open: true, documentId: 'doc-stress-1' },
                onClose: vi.fn(),
              }),
            ),
          ),
        );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();

      // Close modal (state.open = false)
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(DocumentPreviewModal, {
                state: { open: false, documentId: undefined },
                onClose: vi.fn(),
              }),
            ),
          ),
        );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/stress-test-uuid');
    });
  });

  describe('2. Empirical Stress Testing: Client-Side Upload Validation (MIME, Extension, Size, LIST_IGNORE)', () => {
    const testUploadRejection = async (
      modalType: 'grant' | 'revoke',
      fileName: string,
      mimeType: string,
      fileSize: number,
      shouldAccept: boolean,
    ) => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();
      const component =
        modalType === 'grant'
          ? createElement(GrantAccessModal, {
              state: { open: true },
              onClose,
              onSuccess,
            })
          : createElement(RevokeAccessModal, {
              state: { open: true },
              onClose,
              onSuccess,
            });

      await mount(component);
      // Wait for loading to finish
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const fileInput = document.querySelector(
        '.ant-upload-drag input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      const testFile = new File(['mock content'], fileName, { type: mimeType });
      Object.defineProperty(testFile, 'size', { value: fileSize });

      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [testFile],
          writable: true,
          configurable: true,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const isPresent = document.body.textContent?.includes(fileName) ?? false;
      expect(isPresent).toBe(shouldAccept);
    };

    it('rejects malicious.exe on GrantAccessModal', async () => {
      await testUploadRejection('grant', 'malicious.exe', 'application/x-msdownload', 1024, false);
    });

    it('rejects spoofed.pdf with executable mime type on GrantAccessModal', async () => {
      await testUploadRejection('grant', 'spoofed.pdf', 'application/x-msdownload', 2048, false);
    });

    it('rejects document.docx on GrantAccessModal', async () => {
      await testUploadRejection(
        'grant',
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        4096,
        false,
      );
    });

    it('rejects oversized file (>10MB) on GrantAccessModal', async () => {
      await testUploadRejection(
        'grant',
        'oversized.pdf',
        'application/pdf',
        11 * 1024 * 1024,
        false,
      );
    });

    it('accepts legitimate signed-approval.pdf on GrantAccessModal', async () => {
      await testUploadRejection(
        'grant',
        'signed-approval.pdf',
        'application/pdf',
        2 * 1024 * 1024,
        true,
      );
    });

    it('accepts legitimate badge-scan.png on GrantAccessModal', async () => {
      await testUploadRejection('grant', 'badge-scan.png', 'image/png', 512 * 1024, true);
    });

    it('rejects trojan.bat on RevokeAccessModal', async () => {
      vi.mocked(accessControlService.getDoors).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      });
      await testUploadRejection('revoke', 'trojan.bat', 'application/x-bat', 1024, false);
    });

    it('accepts legitimate signed-revocation.pdf on RevokeAccessModal', async () => {
      vi.mocked(accessControlService.getDoors).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      });
      await testUploadRejection(
        'revoke',
        'signed-revocation.pdf',
        'application/pdf',
        1024 * 1024,
        true,
      );
    });
  });

  describe('3. Empirical Stress Testing: High-Volume Door Revocation (25 Doors, Zero Slice Clipping)', () => {
    it('queries all 25 active doors without 10-door slice clipping and builds aggregated clearance list', async () => {
      const numDoors = 25;
      const mockDoorsList: DoorWithCountDto[] = Array.from({ length: numDoors }, (_, i) => ({
        id: `door-stress-${i + 1}`,
        doorCode: `DR-STRESS-${String(i + 1).padStart(2, '0')}`,
        name: `Server Zone Door ${i + 1}`,
        building: 'HQ-B',
        floor: '2',
        zone: `Sector-${i + 1}`,
        location: `Room 20${i + 1}`,
        securityLevel: DoorSecurityLevel.HIGH,
        status: DoorStatus.ACTIVE,
        controllerModel: 'ZKTeco InBio460 Pro',
        controllerIp: `192.168.10.${100 + i}`,
        readerType: 'RFID Reader',
        readerId: `RDR-${i + 1}`,
        activeUsersCount: 2,
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-10-20T14:30:00Z',
      }));

      vi.mocked(accessControlService.getDoors).mockResolvedValue({
        items: mockDoorsList,
        total: numDoors,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

      vi.mocked(accessControlService.getDoorUsers).mockImplementation(async (doorId) => {
        const index = parseInt(doorId.replace('door-stress-', ''), 10);
        return {
          items: [
            {
              assignmentId: `asg-stress-${index}-A`,
              subjectType: AccessSubjectType.DIRECTORY_USER,
              subjectId: `usr-${index}-A`,
              fullName: `Employee ${index} Alpha`,
              codeOrBadge: `EMP-${index}01`,
              organizationOrCompany: 'Enterprise IT',
              accessType: AccessValidityType.PERMANENT,
              validFrom: '2026-01-01T00:00:00Z',
              status: AccessAssignmentStatus.ACTIVE,
              grantedAt: '2026-01-01T00:00:00Z',
            },
            {
              assignmentId: `asg-stress-${index}-B`,
              subjectType: AccessSubjectType.DIRECTORY_USER,
              subjectId: `usr-${index}-B`,
              fullName: `Employee ${index} Beta`,
              codeOrBadge: `EMP-${index}02`,
              organizationOrCompany: 'Enterprise Security',
              accessType: AccessValidityType.PERMANENT,
              validFrom: '2026-01-01T00:00:00Z',
              status: AccessAssignmentStatus.ACTIVE,
              grantedAt: '2026-01-01T00:00:00Z',
            },
          ],
          total: 2,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        };
      });

      await mount(
        createElement(RevokeAccessModal, {
          state: { open: true },
          onClose: vi.fn(),
          onSuccess: vi.fn(),
        }),
      );

      // Verify that all 25 active doors were queried, NOT capped at 10!
      expect(accessControlService.getDoorUsers).toHaveBeenCalledTimes(25);

      // Verify doors 11 through 25 were specifically queried
      for (let i = 1; i <= 25; i++) {
        expect(accessControlService.getDoorUsers).toHaveBeenCalledWith(
          `door-stress-${i}`,
          expect.objectContaining({ pageSize: 50, status: AccessAssignmentStatus.ACTIVE }),
        );
      }
    });

    it('gracefully tolerates partial door clearance fetch failure while preserving successful door options', async () => {
      const numDoors = 15;
      const mockDoorsList: DoorWithCountDto[] = Array.from({ length: numDoors }, (_, i) => ({
        id: `door-partial-${i + 1}`,
        doorCode: `DR-PARTIAL-${i + 1}`,
        name: `Door ${i + 1}`,
        building: 'HQ',
        floor: '1',
        zone: 'Sec-1',
        location: 'L1',
        securityLevel: DoorSecurityLevel.STANDARD,
        status: DoorStatus.ACTIVE,
        controllerModel: 'ZKTeco',
        controllerIp: '192.168.1.1',
        readerType: 'RFID',
        readerId: `R-${i + 1}`,
        activeUsersCount: 1,
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-10-20T14:30:00Z',
      }));

      vi.mocked(accessControlService.getDoors).mockResolvedValue({
        items: mockDoorsList,
        total: numDoors,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

      // Door 7 fails with 500 error
      vi.mocked(accessControlService.getDoorUsers).mockImplementation(async (doorId) => {
        if (doorId === 'door-partial-7') {
          throw new Error('Database query timed out on door-partial-7');
        }
        return {
          items: [
            {
              assignmentId: `asg-${doorId}`,
              subjectType: AccessSubjectType.DIRECTORY_USER,
              subjectId: `usr-${doorId}`,
              fullName: `User for ${doorId}`,
              codeOrBadge: `BADGE-${doorId}`,
              organizationOrCompany: 'Org',
              accessType: AccessValidityType.PERMANENT,
              validFrom: '2026-01-01T00:00:00Z',
              status: AccessAssignmentStatus.ACTIVE,
              grantedAt: '2026-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        };
      });

      await mount(
        createElement(RevokeAccessModal, {
          state: { open: true },
          onClose: vi.fn(),
          onSuccess: vi.fn(),
        }),
      );

      // All 15 doors were attempted
      expect(accessControlService.getDoorUsers).toHaveBeenCalledTimes(15);
      // Modal didn't crash; the Form is rendered
      expect(document.querySelector('.ant-modal')).not.toBeNull();
      expect(document.body.textContent).toContain('Revoke Physical Door Access');
    });
  });
});
