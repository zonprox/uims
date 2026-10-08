import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryGroup, DirectoryUser } from '@uims/shared-types';
import DirectoryPage from './DirectoryPage';

const { mockEmployees, mockGroups } = vi.hoisted(() => {
  const employees: DirectoryUser[] = [
    {
      id: 'dir-usr-1',
      employeeCode: '63020037',
      email: 'yptn.st@youngonevn.com',
      firstName: 'Phung Thi',
      lastName: 'Nhu Y',
      fullName: 'Phung Thi Nhu Y',
      departmentId: 'dept-1',
      department: {
        id: 'dept-1',
        name: 'Production',
        code: 'PROD',
        status: 'Active',
        organizationId: 'org-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      positionId: 'pos-1',
      position: {
        id: 'pos-1',
        title: 'Asst. Officer',
        code: 'AO',
        status: 'Active',
        departmentId: 'dept-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      organizationId: 'org-1',
      organization: {
        id: 'org-1',
        name: 'BSL Others',
        code: 'BSL',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      status: 'ACTIVE' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      assignedAssetsCount: 2,
      assignedLicensesCount: 3,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'dir-usr-2',
      employeeCode: '30000930',
      email: 'wylnh.st@youngonevn.com',
      firstName: 'Lam Ngo',
      lastName: 'Ha Vy',
      fullName: 'Lam Ngo Ha Vy',
      departmentId: 'dept-1',
      department: {
        id: 'dept-1',
        name: 'Production',
        code: 'PROD',
        status: 'Active',
        organizationId: 'org-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      positionId: 'pos-2',
      position: {
        id: 'pos-2',
        title: 'Junior Officer',
        code: 'JO',
        status: 'Active',
        departmentId: 'dept-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      organizationId: 'org-1',
      organization: {
        id: 'org-1',
        name: 'BSL Others',
        code: 'BSL',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      status: 'ACTIVE' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      assignedAssetsCount: 1,
      assignedLicensesCount: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const groups: DirectoryGroup[] = [
    {
      id: 'grp-1',
      name: 'GR_BSLOTHPrinting',
      type: 'Security',
      scope: 'Global',
      memberCount: 12,
      managedBy: 'Domain Administrator',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  return { mockEmployees: employees, mockGroups: groups };
});

vi.mock('../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({
      items: mockEmployees,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }),
    getGroups: vi.fn().mockResolvedValue(mockGroups),
    getStats: vi.fn().mockResolvedValue({
      totalEmployees: 2,
      activeEmployees: 2,
      assignedWorkstations: 2,
      totalGroups: 1,
      closedAccounts: 0,
    }),
    getEmployee: vi.fn().mockImplementation((id: string) => {
      const emp = mockEmployees.find((e) => e.id === id) || mockEmployees[0];
      return Promise.resolve(emp);
    }),
    createEmployee: vi.fn().mockResolvedValue(mockEmployees[0]),
    updateEmployee: vi.fn().mockResolvedValue(mockEmployees[0]),
    deleteEmployee: vi.fn().mockResolvedValue(undefined),
    createGroup: vi.fn().mockResolvedValue(mockGroups[0]),
    syncDomain: vi.fn().mockResolvedValue({
      domain: 'uims.internal',
      controller: 'DC01-PRIMARY',
      status: 'HEALTHY',
      latencyMs: 16,
      replicatedObjects: 105,
      activeIdentities: 240,
      lastSyncTimestamp: '2026-09-09T08:30:00Z',
    }),
    exportEmployees: vi.fn().mockResolvedValue([
      {
        employeeCode: '63020037',
        name: 'Phung Thi Nhu Y',
        email: 'yptn.st@youngonevn.com',
        department: 'Production',
        computerName: 'STOTHPR102',
      },
    ]),
    importEmployees: vi.fn().mockResolvedValue({
      total: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      errors: [],
    }),
  },
}));

vi.mock('../../services/organization.service', () => ({
  organizationService: {
    getOrganizations: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
    getPositions: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DirectoryPage Component Tests', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
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
      .forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  const renderComponent = async () => {
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
            createElement(App, null, createElement(DirectoryPage)),
          ),
        ),
      );
    });
    // Allow state updates to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    return root;
  };

  it('renders PageContainer title, breadcrumbs, and directory telemetry stats', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Directory');
    expect(container.textContent).toContain('Manage corporate employee records');
    expect(container.textContent).toContain('Total Employees');
    expect(container.textContent).toContain('Active Records');
    expect(container.textContent).toContain('Assigned Workstations');
    expect(container.textContent).toContain('Directory Groups');
    expect(container.textContent).not.toContain('Organizational Units');
  });

  it('confirms complete removal of Active Directory Domain Federation alert banner', async () => {
    await renderComponent();

    expect(container.textContent).not.toContain('Active Directory Domain Federation');
    expect(container.textContent).not.toContain('DC01-PRIMARY');
  });

  it('renders all primary directory action buttons', async () => {
    await renderComponent();

    const buttons = Array.from(container.querySelectorAll('button'));
    const buttonTexts = buttons.map((b) => b.textContent?.trim());
    expect(buttonTexts.some((t) => t?.includes('Sync Directory'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Export CSV'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Import CSV'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Create Group'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Add Employee'))).toBe(true);
  });

  it('renders Employees table with DirectoryUser records and workstation assignments', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Phung Thi Nhu Y');
    expect(container.textContent).toContain('63020037');
    expect(container.textContent).toContain('yptn.st@youngonevn.com');
    expect(container.textContent).toContain('BSL Others');
    expect(container.textContent).toContain('2 Assets');
    expect(container.textContent).toContain('3 Licenses');
  });

  it('opens Add Employee modal with STRICTLY NO password field', async () => {
    await renderComponent();

    const addEmployeeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add Employee'),
    );
    expect(addEmployeeBtn).toBeDefined();

    await act(async () => {
      addEmployeeBtn?.click();
    });

    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Add Employee Record');

    // Confirm that NO password input exists in the modal or document
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(0);

    // Confirm form labels in modal do not contain password
    const labels = Array.from(document.querySelectorAll('.ant-form-item-label')).map(
      (l) => l.textContent,
    );
    expect(labels.some((l) => l?.toLowerCase().includes('password'))).toBe(false);
  });

  it('renders exactly 2 tabs for Employees and Groups with zero Organizational Units tab', async () => {
    await renderComponent();

    const tabElements = Array.from(container.querySelectorAll('.ant-tabs-tab'));
    const tabTexts = tabElements.map((el) => el.textContent);
    expect(tabTexts.some((t) => t?.includes('Employees'))).toBe(true);
    expect(tabTexts.some((t) => t?.includes('Groups'))).toBe(true);
    expect(tabTexts.some((t) => t?.includes('Organizational Units'))).toBe(false);
    expect(tabElements.length).toBe(2);
  });
});
