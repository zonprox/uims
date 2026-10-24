import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessAssignmentStatus,
  AccessSubjectType,
  AccessValidityType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  type AccessControlStatsDto,
  type DoorAccessDocumentScanDto,
  type DoorDetailDto,
  type DoorWithCountDto,
  type UnifiedUserRowDto,
  type UserAccessDetailDto,
} from '@uims/shared-types';
import AccessControlPage from '../AccessControlPage';
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

describe('AccessControlPage Component Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockStats: AccessControlStatsDto = {
    totalDoors: 8,
    activeDoors: 7,
    maintenanceDoors: 1,
    totalNonADUsers: 5,
    activeNonADUsers: 4,
    totalActiveAssignments: 12,
    directoryUserAssignments: 8,
    nonADUserAssignments: 4,
    expiringSoonAssignments: 1,
    criticalDoorAssignments: 2,
  };

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
    {
      id: 'door-002',
      doorCode: 'DR-HQ-02',
      name: 'Executive Boardroom',
      building: 'Headquarters',
      floor: '7',
      zone: 'Executive Suite',
      securityLevel: DoorSecurityLevel.RESTRICTED,
      status: DoorStatus.ACTIVE,
      activeUsersCount: 5,
      createdAt: '2026-01-15T09:00:00Z',
      updatedAt: '2026-10-18T11:00:00Z',
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
    {
      id: 'usr-nonad-01',
      subjectType: AccessSubjectType.NON_AD_USER,
      fullName: 'Alex Vance',
      codeOrBadge: 'EXT-2026-004',
      organizationOrCompany: 'Black Mesa Facilities',
      departmentOrTitle: 'HVAC Specialist',
      email: 'avance@blackmesa.com',
      phone: '+1 555-0199',
      status: 'ACTIVE',
      activeDoorsCount: 2,
      totalDoorsCount: 2,
    },
  ];

  const mockDocuments: DoorAccessDocumentScanDto[] = [
    {
      id: 'doc-scan-01',
      documentType: DoorDocumentType.GRANT,
      fileName: 'signed_clearance_dar_0042.pdf',
      originalName: 'DAR-2026-10-0042_Signed_Clearance.pdf',
      filePath: '/uploads/access-control/scans/signed_clearance_dar_0042.pdf',
      fileUrl: '/api/v1/access-control/documents/file/signed_clearance_dar_0042.pdf',
      mimeType: 'application/pdf',
      fileSize: 1854200,
      approverName: 'Jane Smith',
      approverTitle: 'Chief Information Security Officer',
      referenceNumber: 'DAR-2026-10-0042',
      reason: 'Bi-annual datacenter hardware overhaul team access',
      createdAt: '2026-10-22T09:15:00Z',
      updatedAt: '2026-10-22T09:15:00Z',
    },
  ];

  const mockDoorDetail: DoorDetailDto = {
    ...mockDoors[0],
    recentAssignments: [],
  };

  const mockUserDetail: UserAccessDetailDto = {
    subjectType: AccessSubjectType.DIRECTORY_USER,
    subjectId: 'usr-ad-01',
    fullName: 'Phung Nhu Y',
    codeOrBadge: '63020037',
    organizationOrCompany: 'Acme Enterprise Global HQ',
    departmentOrTitle: 'Information Technology',
    email: 'nhuy.phung@acme.com',
    phone: '+1 555-0101',
    status: 'ACTIVE',
    activeAssignments: [
      {
        id: 'asg-01',
        doorId: 'door-001',
        subjectType: AccessSubjectType.DIRECTORY_USER,
        directoryUserId: 'usr-ad-01',
        accessType: AccessValidityType.PERMANENT,
        validFrom: '2026-01-10T08:00:00Z',
        validTo: null,
        status: AccessAssignmentStatus.ACTIVE,
        grantedAt: '2026-01-10T08:00:00Z',
        grantDocumentId: 'doc-scan-01',
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-01-10T08:00:00Z',
        door: mockDoors[0],
      },
    ],
    revokedAssignments: [],
    expiredAssignments: [],
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.mocked(accessControlService.getStats).mockResolvedValue(mockStats);
    vi.mocked(accessControlService.getDoors).mockResolvedValue({
      items: mockDoors,
      total: mockDoors.length,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    vi.mocked(accessControlService.getUnifiedUsers).mockResolvedValue({
      items: mockUnifiedUsers,
      total: mockUnifiedUsers.length,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    vi.mocked(accessControlService.getDocuments).mockResolvedValue({
      items: mockDocuments,
      total: mockDocuments.length,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    vi.mocked(accessControlService.getDoorById).mockResolvedValue(mockDoorDetail);
    vi.mocked(accessControlService.getDoorUsers).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
    vi.mocked(accessControlService.getUserAccessDetail).mockResolvedValue(mockUserDetail);
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

  const renderComponent = async () => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          MemoryRouter,
          null,
          createElement(
            ConfigProvider,
            null,
            createElement(App, null, createElement(AccessControlPage)),
          ),
        ),
      );
    });

    // Flush microtasks and state resolution
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  };

  describe('1. Page Header & KPI Telemetry', () => {
    it('renders page header title, subtitle, breadcrumbs, and 4 KPI stat cards', async () => {
      await renderComponent();

      // Page Title & Subtitle
      expect(container.textContent).toContain('Access Control');
      expect(container.textContent).toContain('Manage physical doors');

      // 4 KPI Stat Cards
      expect(container.textContent).toContain('Total Doors');
      expect(container.textContent).toContain('Active Doors');
      expect(container.textContent).toContain('Registered Users');
      expect(container.textContent).toContain('Active Access Grants');

      // Telemetry values
      expect(container.textContent).toContain('8'); // Total Doors
      expect(container.textContent).toContain('7'); // Active Doors
      expect(container.textContent).toContain('12'); // Active Access Grants
    });

    it('renders 4 primary header action buttons', async () => {
      await renderComponent();

      expect(container.textContent).toContain('Grant Access');
      expect(container.textContent).toContain('Revoke Access');
      expect(container.textContent).toContain('Add Door');
      expect(container.textContent).toContain('Add External User');
    });
  });

  describe('2. Tab Navigation & Views', () => {
    it('renders Doors inventory table by default with door items and active user count badges', async () => {
      await renderComponent();

      // Tab labels
      expect(container.textContent).toContain('Doors (8)');
      expect(container.textContent).toContain('Users & Access Matrix');
      expect(container.textContent).toContain('Approval Documents & Scans');

      // Table records
      expect(container.textContent).toContain('DR-HQ-01');
      expect(container.textContent).toContain('Main Server Room Entrance');
      expect(container.textContent).toContain('CRITICAL');
      expect(container.textContent).toContain('DR-HQ-02');
      expect(container.textContent).toContain('Executive Boardroom');
    });

    it('switches to Users & Access Matrix tab and displays unified personnel records', async () => {
      await renderComponent();

      // Find tab button for Users & Access Matrix
      const tabElements = container.querySelectorAll('.ant-tabs-tab');
      const usersTab = Array.from(tabElements).find((t) =>
        t.textContent?.includes('Users & Access Matrix'),
      );
      expect(usersTab).toBeDefined();

      await act(async () => {
        (usersTab as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Verify users table content
      expect(container.textContent).toContain('Phung Nhu Y');
      expect(container.textContent).toContain('AD Employee');
      expect(container.textContent).toContain('Alex Vance');
      expect(container.textContent).toContain('External / Non-AD');
      expect(container.textContent).toContain('Black Mesa Facilities');
    });

    it('switches to Approval Documents & Scans tab and displays audit history records', async () => {
      await renderComponent();

      const tabElements = container.querySelectorAll('.ant-tabs-tab');
      const docsTab = Array.from(tabElements).find((t) =>
        t.textContent?.includes('Approval Documents & Scans'),
      );
      expect(docsTab).toBeDefined();

      await act(async () => {
        (docsTab as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Verify documents table content
      expect(container.textContent).toContain('DAR-2026-10-0042');
      expect(container.textContent).toContain('GRANT');
      expect(container.textContent).toContain('Jane Smith');
      expect(container.textContent).toContain('DAR-2026-10-0042_Signed_Clearance.pdf');
    });
  });

  describe('3. Action Modals & Strict Mandatory Scan Upload Enforcement', () => {
    it('opens Add Door modal when clicking Add Door button', async () => {
      await renderComponent();

      const addDoorBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add Door'),
      );
      expect(addDoorBtn).toBeDefined();

      await act(async () => {
        addDoorBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle?.textContent).toContain('Add Physical Door');
      expect(document.body.textContent).toContain('Door Code');
      expect(document.body.textContent).toContain('Door Name');
      expect(document.body.textContent).toContain('Building / Facility');
      expect(document.body.textContent).toContain('Security Clearance Level');
    });

    it('opens Add External User modal when clicking Add External User button', async () => {
      await renderComponent();

      const addExternalBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add External User'),
      );
      expect(addExternalBtn).toBeDefined();

      await act(async () => {
        addExternalBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle?.textContent).toContain('Register External User');
      expect(document.body.textContent).toContain('Full Name');
      expect(document.body.textContent).toContain('Company / Vendor');
      expect(document.body.textContent).toContain('Badge / Card #');
      expect(document.body.textContent).toContain('National ID / Passport #');
    });

    it('opens Grant Access modal and strictly blocks submission without mandatory scan upload', async () => {
      await renderComponent();

      const grantBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Grant Access'),
      );
      expect(grantBtn).toBeDefined();

      await act(async () => {
        grantBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(document.body.textContent).toContain('Grant Physical Door Access');
      expect(document.body.textContent).toContain('Target Doors (Select 1 or more)');
      expect(document.body.textContent).toContain('Mandatory Signed Scan Document Attachment');
      expect(document.body.textContent).toContain('Template (.docx)');
      expect(document.body.textContent).toContain('Print HTML');

      // Click submit without uploading scan
      const submitBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find(
        (b) => b.textContent?.includes('Grant Access'),
      );
      expect(submitBtn).toBeDefined();

      await act(async () => {
        (submitBtn as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Verification: grantAccess service MUST NOT be invoked because file is missing
      expect(accessControlService.grantAccess).not.toHaveBeenCalled();
    });

    it('opens Revoke Access modal and strictly blocks submission without mandatory scan upload', async () => {
      await renderComponent();

      const revokeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Revoke Access'),
      );
      expect(revokeBtn).toBeDefined();

      await act(async () => {
        revokeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(document.body.textContent).toContain('Revoke Physical Door Access');
      expect(document.body.textContent).toContain('Active Access Clearances to Revoke');
      expect(document.body.textContent).toContain('Mandatory Signed Revocation Scan Document');

      // Click revoke without uploading scan
      const submitBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find(
        (b) => b.textContent?.includes('Revoke Access'),
      );
      expect(submitBtn).toBeDefined();

      await act(async () => {
        (submitBtn as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Verification: revokeAccess service MUST NOT be invoked because file is missing
      expect(accessControlService.revokeAccess).not.toHaveBeenCalled();
    });
  });

  describe('4. Inspection Drawers', () => {
    it('opens DoorDetailDrawer when clicking door code tag', async () => {
      await renderComponent();

      const doorCodeTag = Array.from(container.querySelectorAll('.ant-tag')).find((t) =>
        t.textContent?.includes('DR-HQ-01'),
      );
      expect(doorCodeTag).toBeDefined();

      await act(async () => {
        (doorCodeTag as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(accessControlService.getDoorById).toHaveBeenCalledWith('door-001');
      expect(document.body.textContent).toContain('Door Specifications');
      expect(document.body.textContent).toContain('Controller Model');
      expect(document.body.textContent).toContain('ZKTeco InBio460 Pro');
    });

    it('opens UserAccessDetailDrawer when clicking individual name in users matrix', async () => {
      await renderComponent();

      // Switch to users tab
      const tabElements = container.querySelectorAll('.ant-tabs-tab');
      const usersTab = Array.from(tabElements).find((t) =>
        t.textContent?.includes('Users & Access Matrix'),
      );
      await act(async () => {
        (usersTab as HTMLElement)?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const userLink = Array.from(container.querySelectorAll('a')).find((a) =>
        a.textContent?.includes('Phung Nhu Y'),
      );
      expect(userLink).toBeDefined();

      await act(async () => {
        userLink?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(accessControlService.getUserAccessDetail).toHaveBeenCalledWith(
        AccessSubjectType.DIRECTORY_USER,
        'usr-ad-01',
      );
      expect(document.body.textContent).toContain('Personnel Profile');
      expect(document.body.textContent).toContain('63020037');
      expect(document.body.textContent).toContain('Physical Door Clearances & History');
    });
  });
});
