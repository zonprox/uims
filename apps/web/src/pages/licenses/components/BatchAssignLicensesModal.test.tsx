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
      await new Promise((resolve) => setTimeout(resolve, 0));
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
    currentRoot = createRoot(container);
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

  it('renders modal with selected licenses count and seats summary', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      licenses: mockLicenses,
      submitting: false,
      onAssign,
      onCancel,
    });

    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Batch Assign Software Licenses');
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
      document.querySelectorAll<HTMLButtonElement>('.ant-modal-footer button'),
    ).find((b) => b.textContent?.includes('Cancel'));
    expect(cancelBtn).toBeDefined();

    await act(async () => {
      cancelBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(onCancel).toHaveBeenCalled();
  });
});
