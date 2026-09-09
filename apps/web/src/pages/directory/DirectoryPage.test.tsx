import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryGroup, DirectoryUser, OrganizationalUnit } from '@uims/shared-types';
import DirectoryPage from './DirectoryPage';

const { mockEmployees, mockGroups, mockOus } = vi.hoisted(() => {
  const employees: DirectoryUser[] = [
    {
      id: 'dir-usr-1',
      employeeCode: '63020037',
      email: 'yptn.st@youngonevn.com',
      firstName: 'Phung Thi',
      lastName: 'Nhu Y',
      fullName: 'Phung Thi Nhu Y',
      jobTitle: 'Asst. Officer',
      company: 'BSL Others',
      plant: 'BSL Others',
      department: 'Production',
      section: 'Printing',
      computerName: 'STOTHPR102',
      adGroup: 'GR_BSLOTHPrinting',
      ouPath: 'OU=Production,DC=uims,DC=internal',
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
      jobTitle: 'Junior Officer',
      company: 'BSL Others',
      plant: 'BSL Others',
      department: 'Production',
      section: 'Sample',
      computerName: 'STOTHSAM04',
      adGroup: 'GR_BSLOTHSample',
      ouPath: 'OU=Production,DC=uims,DC=internal',
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
      email: 'printing@uims.internal',
      type: 'Security',
      scope: 'Global',
      memberCount: 12,
      managedBy: 'Domain Administrator',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const ous: OrganizationalUnit[] = [
    {
      id: 'ou-1',
      name: 'Production',
      dn: 'OU=Production,DC=uims,DC=internal',
      description: 'Manufacturing operations plant floor',
      userCount: 42,
      workstationCount: 38,
      groupCount: 4,
    },
  ];

  return { mockEmployees: employees, mockGroups: groups, mockOus: ous };
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
    getOrganizationalUnits: vi.fn().mockResolvedValue(mockOus),
    getStats: vi.fn().mockResolvedValue({
      totalEmployees: 2,
      activeEmployees: 2,
      assignedWorkstations: 2,
      totalGroups: 1,
      totalOUs: 1,
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

describe('DirectoryPage Component Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.querySelectorAll('.ant-modal-root, .ant-modal-wrap').forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  const renderComponent = async () => {
    const root = createRoot(container);
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
    expect(container.textContent).toContain('Organizational Units');
  });

  it('renders Active Directory Domain Federation alert banner', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Active Directory Domain Federation');
    expect(container.textContent).toContain('uims.internal');
    expect(container.textContent).toContain('DC01-PRIMARY');
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
    expect(container.textContent).toContain('STOTHPR102');
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

  it('renders tabs for Employees, Groups, and Organizational Units', async () => {
    await renderComponent();

    const tabElements = Array.from(container.querySelectorAll('.ant-tabs-tab'));
    const tabTexts = tabElements.map((el) => el.textContent);
    expect(tabTexts.some((t) => t?.includes('Employees'))).toBe(true);
    expect(tabTexts.some((t) => t?.includes('Groups'))).toBe(true);
    expect(tabTexts.some((t) => t?.includes('Organizational Units'))).toBe(true);
  });
});
