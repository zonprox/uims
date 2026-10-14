import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryUser } from '@uims/shared-types';
import { assetsService } from '../../services/assets.service';
import {
  type DashboardOverview,
  type PendingHandoverSummaryResponse,
} from '../../services/dashboard.service';
import { directoryService } from '../../services/directory.service';
import { EmployeesTab } from '../directory/EmployeesTab';
import DashboardPage from './DashboardPage';

const mockNavigate = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

const mockAppInstance = {
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: {
    confirm: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  notification: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('antd');
  const ActualApp = actual.App as (props: Record<string, unknown>) => React.ReactNode;
  const MockApp = (props: Record<string, unknown>) => createElement(ActualApp, props);
  MockApp.useApp = () => mockAppInstance;

  return {
    ...actual,
    App: MockApp,
  };
});

const { mockPendingSummary, mockDashboardData, mockDirectoryUser } = vi.hoisted(() => {
  const pendingSummary: PendingHandoverSummaryResponse = {
    totalPending: 3,
    overdueCount: 1,
    pendingAssignments: 1,
    pendingReturns: 1,
    pendingTransfers: 1,
    breakdownByType: { assignment: 1, return: 1, transfer: 1 },
    records: [
      {
        id: 'rec-assign-1',
        recordId: 'rec-assign-1',
        assetId: 'ast-dell-101',
        assetTag: 'AST-DELL-101',
        subcode: 'AST-DELL-101',
        modelName: 'Dell Latitude 5540',
        serialNumber: 'SN-DELL-101',
        type: 'ASSIGNMENT',
        handoverType: 'ASSIGNMENT',
        recipientId: 'usr-alice-1',
        recipientName: 'Alice Cooper',
        recipientEmail: 'alice@uims.internal',
        department: 'Engineering',
        departmentName: 'Engineering',
        createdAt: '2026-10-10T08:00:00Z',
        daysPending: 4,
        isOverdue: true,
        timeAgo: '4d ago',
      },
      {
        id: 'rec-return-2',
        recordId: 'rec-return-2',
        assetId: 'ast-hp-202',
        assetTag: 'AST-HP-202',
        subcode: 'AST-HP-202',
        modelName: 'HP EliteBook 840',
        serialNumber: 'SN-HP-202',
        type: 'RETURN',
        handoverType: 'RETURN',
        recipientId: 'usr-bob-2',
        recipientName: 'Bob Builder',
        recipientEmail: 'bob@uims.internal',
        department: 'Operations',
        departmentName: 'Operations',
        createdAt: '2026-10-12T10:00:00Z',
        daysPending: 2,
        isOverdue: false,
        timeAgo: '2d ago',
      },
      {
        id: 'rec-transfer-3',
        recordId: 'rec-transfer-3',
        assetId: 'ast-len-303',
        assetTag: 'AST-LEN-303',
        subcode: 'AST-LEN-303',
        modelName: 'ThinkPad X1 Carbon',
        serialNumber: 'SN-LEN-303',
        type: 'TRANSFER',
        handoverType: 'TRANSFER',
        recipientId: 'usr-charlie-3',
        recipientName: 'Charlie Brown',
        recipientEmail: 'charlie@uims.internal',
        department: 'Finance',
        departmentName: 'Finance',
        createdAt: '2026-10-13T14:00:00Z',
        daysPending: 1,
        isOverdue: false,
        timeAgo: '1d ago',
      },
    ],
  };

  const dashboardData: DashboardOverview = {
    kpi: {
      managedAssets: {
        total: 42,
        active: 32,
        growthMoM: '+8.4% MoM',
        inUse: 32,
        inStock: 7,
        inRepair: 2,
        decommissioned: 1,
      },
      licenses: {
        total: 15,
        totalSeats: 200,
        usedSeats: 168,
        seatUsagePercent: '84.0%',
        expiringCount: 2,
      },
      inventory: {
        totalItems: 58,
        lowStockCount: 4,
        totalUnits: 340,
        healthyCount: 54,
      },
      ipam: {
        used: 240,
        total: 512,
        free: 272,
        usagePercent: 46.9,
      },
      audit: {
        totalEvents: 320,
        recent24h: 48,
        securityAlerts: 1,
        complianceScore: 98,
        status: 'Compliant',
      },
    },
    health: {
      uptimePercent: '99.99%',
      directory: {
        name: 'Directory & Users',
        status: 'Synced',
        usersCount: 142,
        syncTime: 'Real-time',
        percent: 100,
      },
      mail: {
        name: 'Hardware Assets',
        status: 'Operational',
        throughput: '42 Managed Units',
        latency: '32 In Service',
        percent: 93,
      },
      vpn: {
        name: 'Network Gateways & IPAM',
        status: 'Active',
        tunnels: 240,
        load: 'Normal',
        percent: 47,
      },
      backups: {
        name: 'Database Backups',
        status: 'Verified',
        snapshots: 'Complete',
        nextRun: '02:00 UTC',
        percent: 100,
      },
    },
    recentActivity: [],
    actionItems: [],
  };

  const directoryUser: DirectoryUser = {
    id: 'emp-yptn',
    employeeCode: '63020037',
    email: 'yptn.st@youngonevn.com',
    firstName: 'Phung Thi',
    lastName: 'Nhu Y',
    fullName: 'Phung Thi Nhu Y',
    departmentId: 'dept-prod',
    department: {
      id: 'dept-prod',
      name: 'Production',
      code: 'PROD',
      status: 'Active',
      organizationId: 'org-bsl',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    positionId: 'pos-ao',
    position: {
      id: 'pos-ao',
      title: 'Asst. Officer',
      code: 'AO',
      status: 'Active',
      departmentId: 'dept-prod',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    organizationId: 'org-bsl',
    organization: {
      id: 'org-bsl',
      name: 'BSL Others',
      code: 'BSL',
      status: 'Active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    status: 'ACTIVE' as unknown as DirectoryUser['status'],
    source: 'LOCAL' as unknown as DirectoryUser['source'],
    assignedAssetsCount: 1,
    assignedLicensesCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  return {
    mockPendingSummary: pendingSummary,
    mockDashboardData: dashboardData,
    mockDirectoryUser: directoryUser,
  };
});

vi.mock('../../services/dashboard.service', () => ({
  dashboardService: {
    getOverview: vi.fn().mockImplementation(() => Promise.resolve(mockDashboardData)),
    getPendingHandovers: vi.fn().mockImplementation(() => Promise.resolve(mockPendingSummary)),
  },
}));

vi.mock('../../services/assets.service', () => ({
  assetsService: {
    downloadHandoverDocx: vi.fn().mockResolvedValue({
      blob: new Blob(['mock-docx-data'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      filename: 'Handover_AST-DELL-101_2026-10-14.docx',
    }),
    uploadHandoverDocument: vi.fn().mockResolvedValue({
      fileUrl: '/uploads/signed-rec-1.pdf',
      fileName: 'signed-rec-1.pdf',
      originalName: 'signed.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    }),
    attachHandoverDocument: vi.fn().mockResolvedValue({
      id: 'ast-dell-101',
      tag: 'AST-DELL-101',
      hasPendingRecord: false,
    }),
    generateHandoverDocument: vi.fn().mockResolvedValue({
      html: '<html><body>Preview Document</body></html>',
      title: 'Handover Record Preview',
      filename: 'preview.html',
    }),
    batchAssignAssets: vi.fn().mockResolvedValue({ success: true, count: 1 }),
    returnAsset: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [mockDirectoryUser], total: 1 }),
    getUserAssets: vi.fn().mockResolvedValue([
      {
        id: 'asset-pending-1',
        assetTag: 'AST-NB-999',
        subcode: 'AST-NB-999',
        name: 'ThinkPad T14 Gen 4',
        model: 'T14 Gen 4',
        serialNumber: 'SN-TP-99999',
        status: 'IN_USE',
        hasPendingRecord: true,
      },
    ]),
    getUserLicenses: vi.fn().mockResolvedValue([]),
    getAvailableAssets: vi.fn().mockResolvedValue([
      {
        id: 'asset-avail-1',
        assetTag: 'AST-AVAIL-100',
        subcode: 'AST-AVAIL-100',
        name: 'Dell UltraSharp 27',
        model: 'U2723QE',
        status: 'AVAILABLE',
      },
    ]),
    getAvailableLicenses: vi.fn().mockResolvedValue([]),
    assignAsset: vi.fn().mockResolvedValue({}),
    unassignAsset: vi.fn().mockResolvedValue({}),
    createEmployee: vi.fn().mockResolvedValue(mockDirectoryUser),
    updateEmployee: vi.fn().mockResolvedValue(mockDirectoryUser),
    deleteEmployee: vi.fn().mockResolvedValue(undefined),
    importEmployees: vi.fn().mockResolvedValue({ total: 0, created: 0, updated: 0, skipped: 0 }),
  },
}));

vi.mock('../../services/organization.service', () => ({
  organizationService: {
    getOrganizations: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
    getPositions: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: { user: { name: string; role: string } }) => unknown) =>
    selector({ user: { name: 'Operations Lead', role: 'Admin' } }),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Challenger M5 Empirical Test Harness: Dashboard Compliance & Directory Custody', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => {
        el.remove();
      });
  });

  describe('Test 1: Dashboard Compliance Table Badges, Download & Upload', () => {
    it('verifies that pending handover records render with proper badges (Assignment, Return, Transfer)', async () => {
      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(App, null, createElement(DashboardPage)),
            ),
          ),
        );
      });

      // Verify Compliance table exists
      expect(container.textContent).toContain('Pending Handover Documents Compliance');
      expect(container.textContent).toContain('3 Pending Handover Documents Require Action');

      // Verify badges for all 3 record types: ASSIGNMENT, RETURN, TRANSFER
      const tags = Array.from(container.querySelectorAll('.ant-tag'));
      const tagTexts = tags.map((t) => t.textContent?.trim());

      expect(tagTexts).toContain('ASSIGNMENT');
      expect(tagTexts).toContain('RETURN');
      expect(tagTexts).toContain('TRANSFER');

      // Check badge styling/colors: blue for ASSIGNMENT, orange for RETURN, purple for TRANSFER
      const assignTag = tags.find((t) => t.textContent?.trim() === 'ASSIGNMENT');
      expect(assignTag?.className).toContain('ant-tag-blue');

      const returnTag = tags.find((t) => t.textContent?.trim() === 'RETURN');
      expect(returnTag?.className).toContain('ant-tag-orange');

      const transferTag = tags.find((t) => t.textContent?.trim() === 'TRANSFER');
      expect(transferTag?.className).toContain('ant-tag-purple');

      // Check that all 3 assets are rendered
      expect(container.textContent).toContain('AST-DELL-101');
      expect(container.textContent).toContain('AST-HP-202');
      expect(container.textContent).toContain('AST-LEN-303');
    });

    it('verifies that 1-click Download button triggers document generation (assetsService.downloadHandoverDocx)', async () => {
      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(App, null, createElement(DashboardPage)),
            ),
          ),
        );
      });

      // Find all file-word icons (Download Word Form buttons)
      const downloadWordButtons = Array.from(
        container.querySelectorAll('button .anticon-file-word'),
      ).map((icon) => icon.closest('button'));

      expect(downloadWordButtons.length).toBeGreaterThanOrEqual(3);

      // Click the Download button for Record 1 (Assignment: ast-dell-101)
      await act(async () => {
        downloadWordButtons[0]?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Verify assetsService.downloadHandoverDocx was invoked with exact required parameters
      expect(assetsService.downloadHandoverDocx).toHaveBeenCalledTimes(1);
      expect(assetsService.downloadHandoverDocx).toHaveBeenCalledWith({
        assetIds: ['ast-dell-101'],
        type: 'assignment',
        recipientId: 'usr-alice-1',
      });
      expect(mockMessageSuccess).toHaveBeenCalledWith(
        'Handover document (.docx) downloaded successfully.',
      );
    });

    it('verifies that direct upload invokes uploadHandoverDocument and attachHandoverDocument', async () => {
      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(App, null, createElement(DashboardPage)),
            ),
          ),
        );
      });

      // Find the file inputs inside the Upload components
      const fileInputs = Array.from(
        container.querySelectorAll('.ant-upload input[type="file"]'),
      ) as HTMLInputElement[];

      expect(fileInputs.length).toBeGreaterThanOrEqual(3);

      // Create a test signed file
      const testFile = new File(['mock-signed-receipt'], 'signed-receipt.pdf', {
        type: 'application/pdf',
      });

      // Trigger file upload on the first record (ast-dell-101)
      await act(async () => {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(testFile);
        fileInputs[0].files = dataTransfer.files;
        fileInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Verify uploadHandoverDocument was invoked with the file and assetId
      expect(assetsService.uploadHandoverDocument).toHaveBeenCalledWith(testFile, 'ast-dell-101');

      // Verify attachHandoverDocument was invoked with assetId and fileUrl
      expect(assetsService.attachHandoverDocument).toHaveBeenCalledWith('ast-dell-101', {
        fileUrl: '/uploads/signed-rec-1.pdf',
      });

      // Verify success notification was shown
      expect(mockMessageSuccess).toHaveBeenCalledWith(
        'Signed handover document uploaded for AST-DELL-101.',
      );
    });
  });

  describe('Test 2: Deep-linking to /assets?drawer=<id>', () => {
    it('verifies that clicking View Asset button deep-links to /assets?drawer=<id>', async () => {
      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(App, null, createElement(DashboardPage)),
            ),
          ),
        );
      });

      // Find the View Asset Details circle buttons (with RightOutlined icon in Actions column)
      const actionRows = container.querySelectorAll('.ant-table-row');
      expect(actionRows.length).toBe(3);

      // Find the arrow button in the first row
      const firstRowArrowBtn = actionRows[0].querySelector('button.ant-btn-circle');
      expect(firstRowArrowBtn).not.toBeNull();

      await act(async () => {
        (firstRowArrowBtn as HTMLButtonElement)?.click();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-dell-101');

      // Test deep link on the second row arrow button
      const secondRowArrowBtn = actionRows[1].querySelector('button.ant-btn-circle');
      expect(secondRowArrowBtn).not.toBeNull();

      await act(async () => {
        (secondRowArrowBtn as HTMLButtonElement)?.click();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-hp-202');
    });

    it('verifies that clicking the asset code link deep-links to /assets?drawer=<id>', async () => {
      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(App, null, createElement(DashboardPage)),
            ),
          ),
        );
      });

      // Find the asset code element for AST-LEN-303
      const assetCodeSpans = Array.from(container.querySelectorAll('code, .ant-typography'));
      const lenovoCode = assetCodeSpans.find((el) => el.textContent?.trim() === 'AST-LEN-303');
      expect(lenovoCode).toBeDefined();

      await act(async () => {
        (lenovoCode as HTMLElement)?.click();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-len-303');
    });
  });

  describe('Test 3: Directory Custody Sync', () => {
    it('verifies that assigned equipment with hasPendingRecord === true displays the <Tag color="warning">Pending Record</Tag>', async () => {
      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(
                App,
                null,
                createElement(EmployeesTab, {
                  employees: [mockDirectoryUser],
                  loading: false,
                  onRefresh: vi.fn(),
                  createModalOpen: false,
                  setCreateModalOpen: vi.fn(),
                  importModalOpen: false,
                  setImportModalOpen: vi.fn(),
                }),
              ),
            ),
          ),
        );
      });

      // Open detail drawer for the employee
      const eyeBtn = container.querySelector('button .anticon-eye')?.closest('button');
      expect(eyeBtn).toBeDefined();

      await act(async () => {
        eyeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Switch to Devices tab
      const devicesTab = Array.from(document.querySelectorAll('.ant-tabs-tab')).find((tab) =>
        tab.textContent?.includes('Devices'),
      );
      expect(devicesTab).toBeDefined();

      await act(async () => {
        (devicesTab as HTMLElement)?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const drawer = document.querySelector('.ant-drawer');
      expect(drawer).not.toBeNull();

      // Check equipment table has rendered AST-NB-999
      expect(drawer?.textContent).toContain('AST-NB-999');

      // Verify Pending Record warning tag is rendered
      const warningTags = Array.from(drawer?.querySelectorAll('.ant-tag-warning') || []);
      const pendingTag = warningTags.find((t) => t.textContent?.includes('Pending Record'));
      expect(pendingTag).toBeDefined();
    });

    it('verifies that clicking Assign Device in EmployeesTab opens canonical BatchAssignModal with initialUserId pre-selected', async () => {
      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(
                App,
                null,
                createElement(EmployeesTab, {
                  employees: [mockDirectoryUser],
                  loading: false,
                  onRefresh: vi.fn(),
                  createModalOpen: false,
                  setCreateModalOpen: vi.fn(),
                  importModalOpen: false,
                  setImportModalOpen: vi.fn(),
                }),
              ),
            ),
          ),
        );
      });

      // Open detail drawer for the employee
      const eyeBtn = container.querySelector('button .anticon-eye')?.closest('button');
      await act(async () => {
        eyeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Switch to Devices tab
      const devicesTab = Array.from(document.querySelectorAll('.ant-tabs-tab')).find((tab) =>
        tab.textContent?.includes('Devices'),
      );
      await act(async () => {
        (devicesTab as HTMLElement)?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Find "Assign Device" button
      const assignDeviceBtn = Array.from(document.querySelectorAll('.ant-drawer button')).find(
        (b) => b.textContent?.includes('Assign Device'),
      ) as HTMLButtonElement | undefined;
      expect(assignDeviceBtn).toBeDefined();

      // Click "Assign Device"
      await act(async () => {
        assignDeviceBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Check that directoryService.getAvailableAssets was called
      expect(directoryService.getAvailableAssets).toHaveBeenCalled();

      // BatchAssignModal renders as a Drawer with title "Batch Assign Hardware Assets"
      const drawers = Array.from(document.querySelectorAll('.ant-drawer'));
      const batchAssignDrawer = drawers.find((d) =>
        d.textContent?.includes('Batch Assign Hardware Assets'),
      );
      expect(batchAssignDrawer).toBeDefined();

      // Verify initialUserId (emp-yptn) was pre-selected -> Recipient Details card shows employee name
      expect(batchAssignDrawer?.textContent).toContain('Recipient Details');
      expect(batchAssignDrawer?.textContent).toContain('Phung Thi Nhu Y');
      expect(batchAssignDrawer?.textContent).toContain('yptn.st@youngonevn.com');
    });

    it('verifies that clicking Return opens ReturnAssetModal', async () => {
      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(
                App,
                null,
                createElement(EmployeesTab, {
                  employees: [mockDirectoryUser],
                  loading: false,
                  onRefresh: vi.fn(),
                  createModalOpen: false,
                  setCreateModalOpen: vi.fn(),
                  importModalOpen: false,
                  setImportModalOpen: vi.fn(),
                }),
              ),
            ),
          ),
        );
      });

      // Open detail drawer for the employee
      const eyeBtn = container.querySelector('button .anticon-eye')?.closest('button');
      await act(async () => {
        eyeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Switch to Devices tab
      const devicesTab = Array.from(document.querySelectorAll('.ant-tabs-tab')).find((tab) =>
        tab.textContent?.includes('Devices'),
      );
      await act(async () => {
        (devicesTab as HTMLElement)?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Find "Return" button on the asset row
      const returnBtn = Array.from(document.querySelectorAll('.ant-drawer button')).find(
        (b) => b.textContent?.trim() === 'Return',
      ) as HTMLButtonElement | undefined;
      expect(returnBtn).toBeDefined();

      // Click "Return"
      await act(async () => {
        returnBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // ReturnAssetModal opens as a Drawer with title "Return Hardware Asset"
      const drawers = Array.from(document.querySelectorAll('.ant-drawer'));
      const returnDrawer = drawers.find((d) => d.textContent?.includes('Return Hardware Asset'));
      expect(returnDrawer).toBeDefined();
      expect(returnDrawer?.textContent).toContain('AST-NB-999');
      expect(returnDrawer?.textContent).toContain('Check-In Details');
      expect(returnDrawer?.textContent).toContain('Confirm Return');
    });
  });
});
