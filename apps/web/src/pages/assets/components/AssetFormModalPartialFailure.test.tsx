import { Form } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset, AssetCategory } from '../../../services/assets.service';
import { assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import {
  type Department,
  type LocationBranch,
  type LocationTreeNode,
  organizationService,
} from '../../../services/organization.service';
import { AccountStatus, DirectorySource } from '@uims/shared-types';
import { AssetFormModal } from './AssetFormModal';

// Dynamic feedback spies for Ant Design v6 App.useApp()
const mockMessageSuccess = vi.fn();
const mockMessageWarning = vi.fn();
const mockMessageError = vi.fn();
const mockMessageInfo = vi.fn();

const stableMessage = {
  success: mockMessageSuccess,
  warning: mockMessageWarning,
  error: mockMessageError,
  info: mockMessageInfo,
};
const stableNotification = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
const stableModal = {
  confirm: vi.fn(),
};
const stableAppContext = {
  message: stableMessage,
  notification: stableNotification,
  modal: stableModal,
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => stableAppContext,
    },
  };
});

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn(),
  },
}));

vi.mock('../../../services/organization.service', () => ({
  organizationService: {
    getLocationTree: vi.fn(),
    getLocations: vi.fn(),
    getDepartments: vi.fn(),
  },
}));

vi.mock('../../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn(),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssetFormModal Partial Failure & Error State Empirical Challenge', () => {
  let host: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockCategories: AssetCategory[] = [
    { id: 'cat-server', name: 'Server Rack' },
    { id: 'cat-laptop', name: 'Developer Laptop' },
  ];

  const mockLocations: LocationBranch[] = [
    {
      id: 'loc-dc-01',
      name: 'Primary Data Center',
      building: 'Bldg A',
      floor: 'Basement 1',
      organizationId: 'org-1',
    },
  ];

  const mockLocationTree: LocationTreeNode[] = [
    {
      id: 'loc-dc-01',
      key: 'loc-dc-01',
      value: 'loc-dc-01',
      name: 'Primary Data Center',
      title: 'Primary Data Center',
      label: 'Primary Data Center',
      fullPath: 'Primary Data Center',
      type: 'CAMPUS',
      children: [],
    },
  ];

  const mockDepartments: Department[] = [
    {
      id: 'dept-infrastructure',
      name: 'Cloud Infrastructure',
      code: 'CLOUD-INFRA',
      status: 'ACTIVE',
      organizationId: 'org-1',
      organization: {
        id: 'org-1',
        name: 'UIMS Global Enterprise',
        code: 'UIMS-HQ',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const mockEmployees: DirectoryUser[] = [
    {
      id: 'usr-dev-01',
      firstName: 'Alice',
      lastName: 'Wong',
      fullName: 'Alice Wong',
      email: 'alice.wong@uims.io',
      employeeCode: 'EMP-9001',
      status: AccountStatus.ACTIVE,
      source: DirectorySource.LOCAL,
      organizationId: 'org-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  function TestWrapper({
    editingAsset = null,
    onSave = vi.fn(),
    onCancel = vi.fn(),
  }: {
    editingAsset?: Asset | null;
    onSave?: () => void;
    onCancel?: () => void;
  }) {
    const [form] = Form.useForm();
    return createElement(AssetFormModal, {
      open: true,
      editingAsset,
      form,
      submitting: false,
      onSave,
      onCancel,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);

    // Default healthy mocks
    vi.mocked(assetsService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(organizationService.getLocationTree).mockResolvedValue(mockLocationTree);
    vi.mocked(organizationService.getLocations).mockResolvedValue(mockLocations);
    vi.mocked(organizationService.getDepartments).mockResolvedValue(mockDepartments);
    vi.mocked(directoryService.getEmployees).mockResolvedValue({
      items: mockEmployees,
      total: 1,
      page: 1,
      pageSize: 100,
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
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  it('Challenge 1: Categories endpoint rejects -> component renders without crash and warns user', async () => {
    vi.mocked(assetsService.getCategories).mockRejectedValueOnce(
      new Error('ETIMEDOUT: Category microservice unavailable'),
    );

    currentRoot = createRoot(host);
    await act(async () => {
      currentRoot?.render(createElement(TestWrapper));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    // 1. Modal renders cleanly
    expect(document.body.textContent).toContain('Create Asset');

    // 2. Warning dispatched via App.useApp().message.warning
    expect(mockMessageWarning).toHaveBeenCalledTimes(1);
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load options for: categories.');

    // 3. Other fields (Department, Employee) loaded successfully
    expect(vi.mocked(organizationService.getDepartments)).toHaveBeenCalled();
    expect(vi.mocked(directoryService.getEmployees)).toHaveBeenCalled();

    // 4. Form inputs remain interactive
    const tagInput = document.body.querySelector('input#tag') as HTMLInputElement | null;
    expect(tagInput).not.toBeNull();
  });

  it('Challenge 2: Departments endpoint rejects -> component renders without crash and warns user', async () => {
    vi.mocked(organizationService.getDepartments).mockRejectedValueOnce(
      new Error('503 Service Unavailable: Department directory failure'),
    );

    currentRoot = createRoot(host);
    await act(async () => {
      currentRoot?.render(createElement(TestWrapper));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(document.body.textContent).toContain('Create Asset');
    expect(mockMessageWarning).toHaveBeenCalledTimes(1);
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load options for: departments.');
    expect(vi.mocked(assetsService.getCategories)).toHaveBeenCalled();
  });

  it('Challenge 3: Employees directory endpoint rejects -> component renders without crash and warns user', async () => {
    vi.mocked(directoryService.getEmployees).mockRejectedValueOnce(
      new Error('500 Internal Server Error: Directory LDAP lookup failure'),
    );

    currentRoot = createRoot(host);
    await act(async () => {
      currentRoot?.render(createElement(TestWrapper));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(document.body.textContent).toContain('Create Asset');
    expect(mockMessageWarning).toHaveBeenCalledTimes(1);
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load options for: employees.');
  });

  it('Challenge 4: LocationTree rejects but flat getLocations fallback succeeds -> no warning dispatched for locations', async () => {
    vi.mocked(organizationService.getLocationTree).mockRejectedValueOnce(
      new Error('Spatial tree indexing unavailable'),
    );
    vi.mocked(organizationService.getLocations).mockResolvedValueOnce(mockLocations);

    currentRoot = createRoot(host);
    await act(async () => {
      currentRoot?.render(createElement(TestWrapper));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(document.body.textContent).toContain('Create Asset');
    expect(vi.mocked(organizationService.getLocations)).toHaveBeenCalled();
    // No warning should be emitted because fallback succeeded
    expect(mockMessageWarning).not.toHaveBeenCalled();
  });

  it('Challenge 5: Both LocationTree AND getLocations fallback reject -> warns user for locations', async () => {
    vi.mocked(organizationService.getLocationTree).mockRejectedValueOnce(
      new Error('Spatial tree failure'),
    );
    vi.mocked(organizationService.getLocations).mockRejectedValueOnce(
      new Error('Flat locations fallback failure'),
    );

    currentRoot = createRoot(host);
    await act(async () => {
      currentRoot?.render(createElement(TestWrapper));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(document.body.textContent).toContain('Create Asset');
    expect(mockMessageWarning).toHaveBeenCalledTimes(1);
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load options for: locations.');
  });

  it('Challenge 6: Multi-endpoint partial failure (Categories + Departments reject)', async () => {
    vi.mocked(assetsService.getCategories).mockRejectedValueOnce(new Error('Cat 500'));
    vi.mocked(organizationService.getDepartments).mockRejectedValueOnce(new Error('Dept 500'));

    currentRoot = createRoot(host);
    await act(async () => {
      currentRoot?.render(createElement(TestWrapper));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    expect(document.body.textContent).toContain('Create Asset');
    expect(mockMessageWarning).toHaveBeenCalledTimes(1);
    expect(mockMessageWarning).toHaveBeenCalledWith(
      'Failed to load options for: categories, departments.',
    );
  });

  it('Challenge 7: Total auxiliary failure (All 4 endpoints reject) -> modal remains fully operational for direct inputs', async () => {
    vi.mocked(assetsService.getCategories).mockRejectedValueOnce(new Error('Cat error'));
    vi.mocked(organizationService.getLocationTree).mockRejectedValueOnce(new Error('Tree error'));
    vi.mocked(organizationService.getLocations).mockRejectedValueOnce(new Error('Fallback error'));
    vi.mocked(organizationService.getDepartments).mockRejectedValueOnce(new Error('Dept error'));
    vi.mocked(directoryService.getEmployees).mockRejectedValueOnce(new Error('Emp error'));

    const onSaveSpy = vi.fn();
    currentRoot = createRoot(host);
    await act(async () => {
      currentRoot?.render(createElement(TestWrapper, { onSave: onSaveSpy }));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    // Modal renders cleanly
    expect(document.body.textContent).toContain('Create Asset');

    // Consolidated warning message emitted
    expect(mockMessageWarning).toHaveBeenCalledWith(
      'Failed to load options for: categories, locations, departments, employees.',
    );

    // Assert that submit button triggers onSave callback
    const submitBtn = Array.from(document.body.querySelectorAll('.ant-modal-footer button')).find(
      (b) => b.textContent?.includes('Create Asset') || b.classList.contains('ant-btn-primary'),
    ) as HTMLButtonElement | undefined;
    expect(submitBtn).toBeDefined();

    await act(async () => {
      submitBtn?.click();
    });

    expect(onSaveSpy).toHaveBeenCalled();
  });

  it('Challenge 8: Component unmount before promises settle -> clean abort with zero warnings after unmount', async () => {
    let resolveSlowCategories: (val: AssetCategory[]) => void = () => {};
    const slowCategoriesPromise = new Promise<AssetCategory[]>((resolve) => {
      resolveSlowCategories = resolve;
    });
    vi.mocked(assetsService.getCategories).mockImplementationOnce(() => slowCategoriesPromise);

    currentRoot = createRoot(host);
    await act(async () => {
      currentRoot?.render(createElement(TestWrapper));
    });

    // Unmount component immediately
    await act(async () => {
      currentRoot?.unmount();
      currentRoot = null;
    });

    // Settle promise after unmount
    await act(async () => {
      resolveSlowCategories(mockCategories);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    // No warning or errors dispatched on unmounted instance
    expect(mockMessageWarning).not.toHaveBeenCalled();
    expect(mockMessageError).not.toHaveBeenCalled();
  });
});
