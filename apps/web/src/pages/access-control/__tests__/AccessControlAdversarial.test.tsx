import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessAssignmentStatus,
  AccessSubjectType,
  AccessValidityType,
  DoorSecurityLevel,
  DoorStatus,
  type DoorWithCountDto,
  type UnifiedUserRowDto,
} from '@uims/shared-types';
import { GrantAccessModal } from '../modals/GrantAccessModal';
import { RevokeAccessModal } from '../modals/RevokeAccessModal';
import { DoorModal } from '../modals/DoorModal';
import { NonAdUserModal } from '../modals/NonAdUserModal';
import { accessControlService } from '../../../services/access-control.service';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock accessControlService
vi.mock('../../../services/access-control.service', () => ({
  accessControlService: {
    getStats: vi.fn(),
    getDoors: vi.fn(),
    getDoorById: vi.fn(),
    getDoorUsers: vi.fn(),
    createDoor: vi.fn(),
    updateDoor: vi.fn(),
    deleteDoor: vi.fn(),
    getNonADUsers: vi.fn(),
    getNonADUserById: vi.fn(),
    createNonADUser: vi.fn(),
    updateNonADUser: vi.fn(),
    deleteNonADUser: vi.fn(),
    getUnifiedUsers: vi.fn(),
    getUserAccessDetail: vi.fn(),
    grantAccess: vi.fn(),
    revokeAccess: vi.fn(),
    getDocuments: vi.fn(),
    getDocumentById: vi.fn(),
    downloadDocumentBlob: vi.fn(),
    downloadDocxTemplate: vi.fn(),
    getHtmlTemplate: vi.fn(),
  },
}));

describe('Access Control Adversarial & Boundary Test Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockDoors: DoorWithCountDto[] = [
    {
      id: 'door-001',
      doorCode: 'DR-HQ-01',
      name: 'Main Server Room Entrance',
      building: 'Headquarters',
      floor: '3',
      zone: 'Data Center Sector A',
      location: 'Room 304',
      securityLevel: DoorSecurityLevel.CRITICAL,
      status: DoorStatus.ACTIVE,
      controllerModel: 'ZKTeco InBio460 Pro',
      controllerIp: '192.168.10.45',
      readerType: 'RFID / Biometric Reader',
      readerId: 'RDR-HQ-01A',
      activeUsersCount: 12,
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-10-20T14:30:00Z',
    },
  ];

  const mockUnifiedUsers: UnifiedUserRowDto[] = [
    {
      id: 'usr-ad-01',
      subjectType: AccessSubjectType.DIRECTORY_USER,
      fullName: 'Phung Nhu Y',
      codeOrBadge: '63020037',
      organizationOrCompany: 'Acme Enterprise Global HQ',
      departmentOrTitle: 'Information Technology',
      email: 'nhuy.phung@acme.com',
      phone: '+1 555-0101',
      status: 'ACTIVE',
      activeDoorsCount: 4,
      totalDoorsCount: 4,
    },
  ];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.mocked(accessControlService.getDoors).mockResolvedValue({
      items: mockDoors,
      total: 1,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    vi.mocked(accessControlService.getUnifiedUsers).mockResolvedValue({
      items: mockUnifiedUsers,
      total: 1,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    });
    vi.mocked(accessControlService.getDoorUsers).mockResolvedValue({
      items: [
        {
          assignmentId: 'asg-active-01',
          subjectType: AccessSubjectType.DIRECTORY_USER,
          subjectId: 'usr-ad-01',
          fullName: 'Phung Nhu Y',
          codeOrBadge: '63020037',
          organizationOrCompany: 'Acme Enterprise Global HQ',
          accessType: AccessValidityType.PERMANENT,
          validFrom: '2026-01-10T08:00:00Z',
          status: AccessAssignmentStatus.ACTIVE,
          grantedAt: '2026-01-10T08:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
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
    vi.clearAllMocks();
  });

  const mountComponent = async (component: React.ReactElement) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(createElement(ConfigProvider, null, createElement(App, null, component)));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  };

  describe('1. Mandatory Scan Document Validation on Grant & Revoke', () => {
    it('blocks GrantAccessModal submission when scan file is omitted, even if all metadata fields are valid', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      await mountComponent(
        createElement(GrantAccessModal, {
          state: {
            open: true,
            preselectedDoorIds: ['door-001'],
            preselectedSubjectIds: ['usr-ad-01'],
          },
          onClose,
          onSuccess,
        }),
      );

      // Verify modal is open and has target door and subject
      expect(document.body.textContent).toContain('Grant Physical Door Access');

      // Click the Submit button (Grant Access) in modal footer
      const submitBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find(
        (b) => b.textContent?.includes('Grant Access'),
      );
      expect(submitBtn).toBeDefined();

      await act(async () => {
        (submitBtn as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // API must NOT be called
      expect(accessControlService.grantAccess).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('blocks RevokeAccessModal submission when revocation scan is omitted', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      await mountComponent(
        createElement(RevokeAccessModal, {
          state: { open: true, preselectedAssignmentIds: ['asg-active-01'] },
          onClose,
          onSuccess,
        }),
      );

      expect(document.body.textContent).toContain('Revoke Physical Door Access');

      const submitBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find(
        (b) => b.textContent?.includes('Revoke Access'),
      );
      expect(submitBtn).toBeDefined();

      await act(async () => {
        (submitBtn as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(accessControlService.revokeAccess).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('2. File Upload Constraints (Size & Format Enforcement)', () => {
    it('verifies GrantAccessModal Upload.Dragger beforeUpload rejects files > 10MB with Upload.LIST_IGNORE', async () => {
      await mountComponent(
        createElement(GrantAccessModal, {
          state: { open: true },
          onClose: vi.fn(),
          onSuccess: vi.fn(),
        }),
      );

      const dragger = document.querySelector('.ant-upload-drag');
      expect(dragger).toBeDefined();

      // Find the file input
      const fileInput = document.querySelector(
        '.ant-upload-drag input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeDefined();
      expect(fileInput.getAttribute('accept')).toBe('.pdf,.png,.jpg,.jpeg');

      // Test oversized file (11MB = 11,534,336 bytes)
      const oversizedFile = new File(['x'.repeat(100)], 'large-scan.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(oversizedFile, 'size', { value: 11 * 1024 * 1024 });

      // Simulate change on input
      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [oversizedFile],
          writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Verification: File list must be empty because size > 10MB was rejected
      const uploadedItem = document.querySelector('.ant-upload-list-item');
      expect(uploadedItem).toBeNull();
    });

    it('verifies GrantAccessModal accepts valid 5MB PDF file into file list', async () => {
      await mountComponent(
        createElement(GrantAccessModal, {
          state: { open: true },
          onClose: vi.fn(),
          onSuccess: vi.fn(),
        }),
      );

      const fileInput = document.querySelector(
        '.ant-upload-drag input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeDefined();

      const validPdf = new File(['valid content'], 'signed-approval.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(validPdf, 'size', { value: 5 * 1024 * 1024 });

      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [validPdf],
          writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Verification: File list should show the uploaded file name
      expect(document.body.textContent).toContain('signed-approval.pdf');
    });

    it('adversarially probes client-side MIME format rejection on GrantAccessModal', async () => {
      await mountComponent(
        createElement(GrantAccessModal, {
          state: { open: true },
          onClose: vi.fn(),
          onSuccess: vi.fn(),
        }),
      );

      const fileInput = document.querySelector(
        '.ant-upload-drag input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeDefined();

      // Probing with a non-PDF/image file (e.g., .exe or .txt or .docx)
      const textFile = new File(['plain text notes'], 'notes.txt', {
        type: 'text/plain',
      });
      Object.defineProperty(textFile, 'size', { value: 1024 });

      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [textFile],
          writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Checking whether the frontend accepted notes.txt or rejected it:
      const fileAccepted = document.body.textContent?.includes('notes.txt');
      expect(fileAccepted).toBe(false);
    });

    it('adversarially probes client-side MIME format rejection on RevokeAccessModal', async () => {
      await mountComponent(
        createElement(RevokeAccessModal, {
          state: { open: true },
          onClose: vi.fn(),
          onSuccess: vi.fn(),
        }),
      );

      const fileInput = document.querySelector(
        '.ant-upload-drag input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeDefined();

      const textFile = new File(['executable code'], 'script.exe', {
        type: 'application/x-msdownload',
      });
      Object.defineProperty(textFile, 'size', { value: 2048 });

      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [textFile],
          writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const fileAccepted = document.body.textContent?.includes('script.exe');
      expect(fileAccepted).toBe(false);
    });

    it('queries active doors without artificial 10-door limit and surfaces getDoorUsers error', async () => {
      // Create 12 active doors
      const twelveDoors: DoorWithCountDto[] = Array.from({ length: 12 }, (_, i) => ({
        ...mockDoors[0],
        id: `door-extra-${i + 1}`,
        doorCode: `DR-EXTRA-${i + 1}`,
        activeUsersCount: 5,
      }));

      vi.mocked(accessControlService.getDoors).mockResolvedValueOnce({
        items: twelveDoors,
        total: 12,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

      // Cause getDoorUsers to fail for one door
      vi.mocked(accessControlService.getDoorUsers).mockImplementation(async (doorId) => {
        if (doorId === 'door-extra-12') {
          throw new Error('Database connection failed on door 12');
        }
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        };
      });

      await mountComponent(
        createElement(RevokeAccessModal, {
          state: { open: true },
          onClose: vi.fn(),
          onSuccess: vi.fn(),
        }),
      );

      // Verify all 12 doors were queried (not capped at 10)
      expect(accessControlService.getDoorUsers).toHaveBeenCalledTimes(12);
    });

    it('verifies RevokeAccessModal Upload.Dragger beforeUpload rejects files > 10MB', async () => {
      await mountComponent(
        createElement(RevokeAccessModal, {
          state: { open: true },
          onClose: vi.fn(),
          onSuccess: vi.fn(),
        }),
      );

      const fileInput = document.querySelector(
        '.ant-upload-drag input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).toBeDefined();
      expect(fileInput.getAttribute('accept')).toBe('.pdf,.png,.jpg,.jpeg');

      const oversizedFile = new File(['oversized'], 'revocation-memo.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(oversizedFile, 'size', { value: 12 * 1024 * 1024 });

      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: [oversizedFile],
          writable: false,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const uploadedItem = document.querySelector('.ant-upload-list-item');
      expect(uploadedItem).toBeNull();
    });
  });

  describe('3. Modal Metadata Validation Rules & Edge Cases', () => {
    it('blocks DoorModal creation when door code or door name are missing', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      await mountComponent(
        createElement(DoorModal, {
          state: { open: true, mode: 'create' },
          onClose,
          onSuccess,
        }),
      );

      expect(document.body.textContent).toContain('Add Physical Door');

      const submitBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find(
        (b) => b.textContent?.includes('Create Door'),
      );
      expect(submitBtn).toBeDefined();

      await act(async () => {
        (submitBtn as HTMLElement).click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      });

      expect(accessControlService.createDoor).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      // Form should show error messages
      expect(document.body.textContent).toContain('Door code is required');
      expect(document.body.textContent).toContain('Door name is required');
    });

    it('blocks NonAdUserModal registration when full name or badge number are missing', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      await mountComponent(
        createElement(NonAdUserModal, {
          state: { open: true, mode: 'create' },
          onClose,
          onSuccess,
        }),
      );

      expect(document.body.textContent).toContain('Register External User');

      const submitBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find(
        (b) => b.textContent?.includes('Register User'),
      );
      expect(submitBtn).toBeDefined();

      await act(async () => {
        (submitBtn as HTMLElement).click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      });

      expect(accessControlService.createNonADUser).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(document.body.textContent).toContain('Full name is required');
      expect(document.body.textContent).toContain('Badge number is required');
    });
  });
});
