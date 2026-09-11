import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryUser } from '../../services/directory.service';
import type { License, LicenseStats } from '../../services/licenses.service';
import LicensesPage from './LicensesPage';

const { mockLicenses, mockStats, mockEmployees } = vi.hoisted(() => {
  const licenses: Array<License> = [
    {
      id: 'lic-1',
      name: 'Adobe Creative Cloud Enterprise',
      vendor: 'Adobe',
      type: 'Subscription',
      totalSeats: 5,
      usedSeats: 2,
      costPerSeat: 80,
      expiryDate: '2027-01-01',
      licenseKey: 'ADOBE-CC-9922',
      status: 'Active',
      autoRenew: true,
      assignedUsers: [
        {
          id: 'asg-1',
          userId: 'usr-1',
          name: 'Sarah Connor',
          email: 'sarah@uims.internal',
          department: 'Design',
          assignedDate: '2026-01-10',
        },
        {
          id: 'asg-2',
          userId: 'usr-2',
          name: 'John Doe',
          email: 'john@uims.internal',
          department: 'Marketing',
          assignedDate: '2026-02-15',
        },
      ],
    },
    {
      id: 'lic-2',
      name: 'JetBrains All Products Pack',
      vendor: 'JetBrains',
      type: 'Subscription',
      totalSeats: 2,
      usedSeats: 2, // Capacity reached
      costPerSeat: 150,
      expiryDate: '2026-10-15',
      licenseKey: 'JB-ALL-8811',
      status: 'Expiring',
      autoRenew: false,
      assignedUsers: [
        {
          id: 'asg-3',
          userId: 'usr-3',
          name: 'Alex Rivera',
          email: 'alex@uims.internal',
          department: 'Engineering',
          assignedDate: '2026-01-01',
        },
        {
          id: 'asg-4',
          userId: 'usr-4',
          name: 'Elena Rostova',
          email: 'elena@uims.internal',
          department: 'Engineering',
          assignedDate: '2026-01-05',
        },
      ],
    },
    {
      id: 'lic-3',
      name: 'Figma Enterprise Workspace',
      vendor: 'Figma',
      type: 'Subscription',
      totalSeats: 10,
      usedSeats: 9, // 90% utilization (capacity near limit)
      costPerSeat: 45,
      expiryDate: '2027-12-31',
      licenseKey: 'FIGMA-ENT-9090',
      status: 'Active',
      autoRenew: true,
      assignedUsers: [],
    },
  ];

  const stats: LicenseStats = {
    total: 3,
    annualSpend: 505,
    utilization: 68,
    expiringCount: 1,
  };

  const employees: DirectoryUser[] = [
    {
      id: 'usr-1',
      employeeCode: 'EMP-001',
      firstName: 'Sarah',
      lastName: 'Connor',
      fullName: 'Sarah Connor',
      email: 'sarah.alt@uims.internal',
      department: {
        id: 'dept-1',
        name: 'Design',
        code: 'DSG',
        status: 'Active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      status: 'ACTIVE' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      organizationId: 'org-1',
      departmentId: 'dept-1',
      positionId: 'pos-1',
      locationId: 'loc-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'usr-5',
      employeeCode: 'EMP-005',
      firstName: 'Marcus',
      lastName: 'Vance',
      fullName: 'Marcus Vance',
      email: 'marcus@uims.internal',
      status: 'ACTIVE' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      organizationId: 'org-1',
      departmentId: 'dept-1',
      positionId: 'pos-1',
      locationId: 'loc-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  return { mockLicenses: licenses, mockStats: stats, mockEmployees: employees };
});

const mockGetLicenses = vi.fn().mockResolvedValue(mockLicenses);
const mockGetLicense = vi.fn().mockImplementation((id: string) => {
  const match = mockLicenses.find((l) => l.id === id);
  return Promise.resolve(match || mockLicenses[0]);
});
const mockGetStats = vi.fn().mockResolvedValue(mockStats);
const mockCreateLicense = vi.fn().mockResolvedValue(mockLicenses[0]);
const mockUpdateLicense = vi.fn().mockResolvedValue(mockLicenses[0]);
const mockDeleteLicense = vi.fn().mockResolvedValue(undefined);
const mockAssignUser = vi.fn().mockResolvedValue({ id: 'asg-new' });
const mockRevokeUser = vi.fn().mockResolvedValue({ success: true });

vi.mock('../../services/licenses.service', () => ({
  licensesService: {
    getLicenses: (...args: unknown[]) => mockGetLicenses(...args),
    getLicense: (...args: unknown[]) => mockGetLicense(...args),
    getStats: (...args: unknown[]) => mockGetStats(...args),
    createLicense: (...args: unknown[]) => mockCreateLicense(...args),
    updateLicense: (...args: unknown[]) => mockUpdateLicense(...args),
    deleteLicense: (...args: unknown[]) => mockDeleteLicense(...args),
    assignUser: (...args: unknown[]) => mockAssignUser(...args),
    revokeUser: (...args: unknown[]) => mockRevokeUser(...args),
  },
}));

vi.mock('../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({
      items: mockEmployees,
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    }),
  },
}));

describe('LicensesPage Component Integration', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeAll(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    mockGetLicenses.mockClear();
    mockGetLicense.mockClear();
    mockGetStats.mockClear();
    mockCreateLicense.mockClear();
    mockUpdateLicense.mockClear();
    mockDeleteLicense.mockClear();
    mockAssignUser.mockClear();
    mockRevokeUser.mockClear();
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
      .querySelectorAll(
        '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-select-dropdown',
      )
      .forEach((el) => {
        el.remove();
      });
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
            createElement(App, null, createElement(LicensesPage)),
          ),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    return root;
  };

  it('renders software licenses table and telemetry cards cleanly', async () => {
    await renderComponent();

    expect(mockGetLicenses).toHaveBeenCalled();
    expect(mockGetStats).toHaveBeenCalled();

    expect(container.textContent).toContain('Software Licenses');
    expect(container.textContent).toContain('Adobe Creative Cloud Enterprise');
    expect(container.textContent).toContain('JetBrains All Products Pack');
  });

  it('renders progress bar and calculates remaining seats correctly', async () => {
    await renderComponent();

    // lic-1: 2 / 5 seats -> 3 seats free
    expect(container.textContent).toContain('2 / 5 seats');
    expect(container.textContent).toContain('3 seats free');

    // lic-2: 2 / 2 seats -> 0 seats free
    expect(container.textContent).toContain('2 / 2 seats');
    expect(container.textContent).toContain('0 seats free');
  });

  it('opens seat drawer and shows active assigned users', async () => {
    await renderComponent();

    const seatsButtons = container.querySelectorAll<HTMLButtonElement>('button');
    const seatsBtn = Array.from(seatsButtons).find((btn) => btn.textContent?.includes('Seats'));
    expect(seatsBtn).toBeDefined();

    await act(async () => {
      seatsBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    const drawerTitle = document.querySelector('.ant-drawer-title');
    expect(drawerTitle?.textContent).toContain('Adobe Creative Cloud Enterprise');
    expect(document.body.textContent).toContain('Sarah Connor');
    expect(document.body.textContent).toContain('John Doe');
  });

  it('revokes an assigned seat when clicking revoke button with popconfirm', async () => {
    await renderComponent();

    const seatsButtons = container.querySelectorAll<HTMLButtonElement>('button');
    const seatsBtn = Array.from(seatsButtons).find((btn) => btn.textContent?.includes('Seats'));

    await act(async () => {
      seatsBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    const revokeButtons = Array.from(document.querySelectorAll('.ant-drawer button')).filter((b) =>
      b.textContent?.includes('Revoke'),
    ) as HTMLButtonElement[];

    expect(revokeButtons.length).toBeGreaterThan(0);

    await act(async () => {
      revokeButtons[0]?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    const confirmRevokeBtn = Array.from(document.querySelectorAll('.ant-popconfirm button')).find(
      (b) => b.textContent?.includes('Revoke'),
    ) as HTMLButtonElement | undefined;

    expect(confirmRevokeBtn).toBeDefined();

    await act(async () => {
      confirmRevokeBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    expect(mockRevokeUser).toHaveBeenCalledWith('lic-1', 'asg-1');
  });

  it('disables assign user button when license is fully allocated (capacity reached)', async () => {
    await renderComponent();

    // Find the second license row (JetBrains All Products Pack: 2 / 2 seats)
    const seatsButtons = container.querySelectorAll<HTMLButtonElement>('button');
    const allSeatsBtns = Array.from(seatsButtons).filter((btn) =>
      btn.textContent?.includes('Seats'),
    );
    expect(allSeatsBtns.length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      allSeatsBtns[1]?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    const drawerTitle = document.querySelector('.ant-drawer-title');
    expect(drawerTitle?.textContent).toContain('JetBrains All Products Pack');

    // Verify "Capacity Reached" tag
    expect(document.body.textContent).toContain('Capacity Reached');

    // Verify Assign User button is disabled
    const assignBtn = Array.from(document.querySelectorAll('.ant-drawer button')).find((b) =>
      b.textContent?.includes('Assign User'),
    ) as HTMLButtonElement | undefined;
    expect(assignBtn?.disabled).toBe(true);
  });

  it('renders critical red alert when license capacity is near limit (>=90%)', async () => {
    await renderComponent();

    // lic-3: 9 / 10 seats -> 90% utilization (capacity near limit)
    expect(container.textContent).toContain('9 / 10 seats');
    expect(container.textContent).toContain('90%');
    expect(container.textContent).toContain('1 seats free');

    // Verify progress element renders critical red stroke (#ef4444)
    const progressTracks = Array.from(
      container.querySelectorAll('.ant-progress-track, .ant-progress-bg'),
    );
    const criticalTrack = progressTracks.find((el) => {
      const style = el.getAttribute('style') || '';
      return style.includes('#ef4444') || style.includes('rgb(239, 68, 68)');
    });
    expect(criticalTrack).toBeDefined();
  });

  it('opens assign user modal, selects employee and invokes licensesService.assignUser', async () => {
    await renderComponent();

    // 1. Open seats drawer for first license (lic-1)
    const seatsButtons = container.querySelectorAll<HTMLButtonElement>('button');
    const seatsBtn = Array.from(seatsButtons).find((btn) => btn.textContent?.includes('Seats'));
    expect(seatsBtn).toBeDefined();

    await act(async () => {
      seatsBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    // 2. Click "Assign User" in the active allocations drawer
    const assignBtn = Array.from(document.querySelectorAll('.ant-drawer button')).find((b) =>
      b.textContent?.includes('Assign User'),
    ) as HTMLButtonElement | undefined;
    expect(assignBtn).toBeDefined();

    await act(async () => {
      assignBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    // 3. Modal is open
    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Assign Seat: Adobe Creative Cloud Enterprise');

    // 4. Open the Select dropdown and focus input
    const input = document.querySelector('.ant-modal .ant-select input') as HTMLInputElement | null;
    const selectSelector = (document.querySelector('.ant-select-selector') ||
      document.querySelector('.ant-select')) as HTMLElement | null;

    await act(async () => {
      selectSelector?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      selectSelector?.click();
      if (input) {
        input.focus();
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        input.click();
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // 5. Select employee from dropdown options
    const option = Array.from(document.querySelectorAll('.ant-select-item-option')).find(
      (opt) =>
        opt.textContent?.includes('Sarah Connor') || opt.textContent?.includes('Marcus Vance'),
    ) as HTMLElement | undefined;

    if (option) {
      await act(async () => {
        option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        option.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
    }

    // 6. Click "Assign Seat" button in modal
    const assignSeatBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
      b.textContent?.includes('Assign Seat'),
    ) as HTMLButtonElement | undefined;
    expect(assignSeatBtn).toBeDefined();

    await act(async () => {
      assignSeatBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    expect(mockAssignUser).toHaveBeenCalledWith(
      'lic-1',
      expect.objectContaining({ userId: 'usr-1' }),
    );
  });
});
