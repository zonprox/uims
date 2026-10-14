import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryUser } from '../../../services/directory.service';
import type { License } from '../../../services/licenses.service';
import { BatchAssignLicensesModal } from './BatchAssignLicensesModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BatchAssignLicensesModal Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  const mockLicenses: License[] = [
    {
      id: 'lic-1',
      name: 'Figma Enterprise',
      vendor: 'Figma',
      type: 'Subscription',
      totalSeats: 10,
      usedSeats: 3,
      costPerSeat: 45,
      expiryDate: '2027-12-31',
      licenseKey: 'FIGMA-101',
      status: 'Active',
      autoRenew: true,
      assignedUsers: [],
    },
    {
      id: 'lic-2',
      name: 'JetBrains All Products Pack',
      vendor: 'JetBrains',
      type: 'Subscription',
      totalSeats: 5,
      usedSeats: 5, // Fully allocated
      costPerSeat: 150,
      expiryDate: '2026-10-15',
      licenseKey: 'JB-102',
      status: 'Active',
      autoRenew: false,
      assignedUsers: [],
    },
  ];

  const mockEmployees: DirectoryUser[] = [
    {
      id: 'usr-1',
      employeeCode: 'EMP-001',
      firstName: 'Sarah',
      lastName: 'Connor',
      fullName: 'Sarah Connor',
      email: 'sarah@corp.uims.internal',
      department: {
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        status: 'Active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      status: 'ACTIVE' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      organizationId: 'org-1',
      departmentId: 'dept-1',
      positionId: 'pos-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => {
        el.remove();
      });
  });

  const renderComponent = async (props: {
    open: boolean;
    licenses: License[];
    submitting: boolean;
    onAssign: (userId: string) => void;
    onCancel: () => void;
  }) => {
    if (!currentRoot) {
      currentRoot = createRoot(container);
    }
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(
            App,
            null,
            createElement(BatchAssignLicensesModal, { ...props, employees: mockEmployees }),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  it('renders drawer with selected licenses count and seats summary', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      licenses: mockLicenses,
      submitting: false,
      onAssign,
      onCancel,
    });

    const drawerTitle = document.querySelector('.ant-drawer-title, .ant-drawer-header');
    expect(drawerTitle?.textContent).toContain('Batch Assign Software Licenses');
    expect(document.body.textContent).toContain('Selected Software Licenses');
    expect(document.body.textContent).toContain('2 licenses to assign');
    expect(document.body.textContent).toContain('Figma Enterprise (7/10 seats)');
    expect(document.body.textContent).toContain('JetBrains All Products Pack (0/5 seats)');
    expect(document.body.textContent).toContain('Seat Capacity Warning');
  });

  it('triggers onCancel when clicking cancel button', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      licenses: mockLicenses,
      submitting: false,
      onAssign,
      onCancel,
    });

    const cancelBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-drawer-footer button'),
    ).find((b) => b.textContent?.includes('Cancel'));
    expect(cancelBtn).toBeDefined();

    await act(async () => {
      cancelBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(onCancel).toHaveBeenCalled();
  });

  it('renders correct singular pluralization for 1 license', async () => {
    await renderComponent({
      open: true,
      licenses: [mockLicenses[0]],
      submitting: false,
      onAssign: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(document.body.textContent).toContain('1 license to assign');
    expect(document.body.textContent).toContain('1 license selected');
    const okBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-drawer-footer button'),
    ).find((b) => b.textContent?.includes('Assign 1 License'));
    expect(okBtn).toBeDefined();
  });

  it('correctly formats employee name when fullName and lastName are undefined (no "Sarah undefined")', async () => {
    const singleNameEmployee: DirectoryUser = {
      ...mockEmployees[0],
      id: 'usr-lic-single',
      firstName: 'Sarah',
      lastName: undefined as unknown as string,
      fullName: undefined,
      email: 'sarah.single@corp.uims.internal',
    };

    if (!currentRoot) {
      currentRoot = createRoot(container);
    }
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(
            App,
            null,
            createElement(BatchAssignLicensesModal, {
              open: true,
              licenses: mockLicenses,
              submitting: false,
              onAssign: vi.fn(),
              onCancel: vi.fn(),
              employees: [singleNameEmployee],
              initialUserId: 'usr-lic-single',
            }),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.body.textContent).toContain('Recipient Employee Details');
    expect(document.body.textContent).toContain('Sarah');
    expect(document.body.textContent).not.toContain('Sarah undefined');
    expect(document.body.textContent).not.toContain('undefined');
  });

  it('catches and reports onAssign errors rather than failing silently', async () => {
    const onAssign = vi.fn().mockImplementation(() => {
      throw new Error('License seat allocation failed');
    });

    if (!currentRoot) {
      currentRoot = createRoot(container);
    }
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(
            App,
            null,
            createElement(BatchAssignLicensesModal, {
              open: true,
              licenses: mockLicenses,
              submitting: false,
              onAssign,
              onCancel: vi.fn(),
              employees: mockEmployees,
              initialUserId: 'usr-1',
            }),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const okBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-drawer-footer button'),
    ).find((b) => b.textContent?.includes('Assign 2 Licenses'));

    expect(okBtn).toBeDefined();
    await act(async () => {
      okBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(onAssign).toHaveBeenCalledWith('usr-1');
  });

  it('renders clean empty state and disabled button when licenses array is empty', async () => {
    await renderComponent({
      open: true,
      licenses: [],
      submitting: false,
      onAssign: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(document.body.textContent).toContain('No software licenses selected');
    const okBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-drawer-footer button'),
    ).find((b) => b.textContent?.includes('Assign 0 Licenses'));
    expect(okBtn).toBeDefined();
    expect(okBtn?.disabled).toBe(true);
  });

  it('truncates license tags beyond 15 with "+1 more item" badge', async () => {
    const sixteenLicenses: License[] = Array.from({ length: 16 }, (_, i) => ({
      ...mockLicenses[0],
      id: `lic-batch-${i + 1}`,
      name: `License ${i + 1}`,
    }));

    await renderComponent({
      open: true,
      licenses: sixteenLicenses,
      submitting: false,
      onAssign: vi.fn(),
      onCancel: vi.fn(),
    });

    expect(document.body.textContent).toContain('+1 more item');
  });

  it('formats select option label cleanly without duplicate email when employee has only email', async () => {
    const emailOnlyEmployee: DirectoryUser = {
      ...mockEmployees[0],
      id: 'usr-email-only',
      firstName: '',
      lastName: '',
      fullName: undefined,
      displayName: undefined,
      employeeCode: undefined,
      email: 'lic-contractor@corp.uims.internal',
    };

    const { formatUserSelectLabel } = await import('./BatchAssignLicensesModal');
    const label = formatUserSelectLabel(emailOnlyEmployee);
    expect(label).toBe('lic-contractor@corp.uims.internal');
    expect(label).not.toContain('(');
  });

  it('renders singular "1 License" in drawer header tag when exactly 1 license is selected', async () => {
    await renderComponent({
      open: true,
      licenses: [mockLicenses[0]],
      submitting: false,
      onAssign: vi.fn(),
      onCancel: vi.fn(),
    });

    const tags = Array.from(document.querySelectorAll('.ant-tag'));
    const licTag = tags.find((t) => t.textContent === '1 License');
    expect(licTag).toBeDefined();
  });
});
