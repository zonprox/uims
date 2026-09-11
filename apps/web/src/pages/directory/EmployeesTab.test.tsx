import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryUser } from '@uims/shared-types';
import { EmployeesTab } from './EmployeesTab';

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function setTextAreaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

const { mockEmployees } = vi.hoisted(() => {
  const employees: DirectoryUser[] = [
    {
      id: 'emp-1',
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
      locationId: 'loc-1',
      location: {
        id: 'loc-1',
        name: 'Plant 1',
        organizationId: 'org-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      ouPath: 'OU=Production,DC=uims,DC=internal',
      status: 'ACTIVE' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      assignedAssetsCount: 2,
      assignedLicensesCount: 3,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'emp-2',
      employeeCode: '30000930',
      email: 'wylnh.st@youngonevn.com',
      firstName: 'Lam Ngo',
      lastName: 'Ha Vy',
      fullName: 'Lam Ngo Ha Vy',
      departmentId: 'dept-2',
      department: {
        id: 'dept-2',
        name: 'Quality Assurance',
        code: 'QA',
        status: 'Active',
        organizationId: 'org-2',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      positionId: 'pos-2',
      position: {
        id: 'pos-2',
        title: 'Junior Officer',
        code: 'JO',
        status: 'Active',
        departmentId: 'dept-2',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      organizationId: 'org-2',
      organization: {
        id: 'org-2',
        name: 'BSL Corporate',
        code: 'CORP',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      locationId: 'loc-2',
      location: {
        id: 'loc-2',
        name: 'Plant 2',
        organizationId: 'org-2',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      ouPath: 'OU=Quality,DC=uims,DC=internal',
      status: 'DISABLED' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      assignedAssetsCount: 1,
      assignedLicensesCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'emp-3',
      employeeCode: '99001122',
      email: 'alex.chen@uims.internal',
      firstName: 'Alex',
      lastName: 'Chen',
      fullName: 'Alex Chen',
      departmentId: 'dept-3',
      department: {
        id: 'dept-3',
        name: 'Information Technology',
        code: 'IT',
        status: 'Active',
        organizationId: 'org-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      positionId: 'pos-3',
      position: {
        id: 'pos-3',
        title: 'Software Engineer',
        code: 'SE',
        status: 'Active',
        departmentId: 'dept-3',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      organizationId: 'org-1',
      organization: {
        id: 'org-1',
        name: 'BSL Tech',
        code: 'TECH',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      locationId: 'loc-1',
      location: {
        id: 'loc-1',
        name: 'Plant 1',
        organizationId: 'org-1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      ouPath: 'OU=Engineering,DC=uims,DC=internal',
      status: 'SUSPENDED' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      assignedAssetsCount: 0,
      assignedLicensesCount: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  return { mockEmployees: employees };
});

const mockCreateEmployee = vi.fn().mockResolvedValue(mockEmployees[0]);
const mockUpdateEmployee = vi.fn().mockResolvedValue(mockEmployees[0]);
const mockDeleteEmployee = vi.fn().mockResolvedValue(undefined);
const mockImportEmployees = vi.fn().mockResolvedValue({
  total: 1,
  created: 1,
  updated: 0,
  skipped: 0,
  errors: [],
});

vi.mock('../../services/directory.service', () => ({
  directoryService: {
    createEmployee: (...args: unknown[]) => mockCreateEmployee(...args),
    updateEmployee: (...args: unknown[]) => mockUpdateEmployee(...args),
    deleteEmployee: (...args: unknown[]) => mockDeleteEmployee(...args),
    importEmployees: (...args: unknown[]) => mockImportEmployees(...args),
  },
}));

vi.mock('../../services/organization.service', () => ({
  organizationService: {
    getOrganizations: vi.fn().mockResolvedValue([
      { id: 'org-1', name: 'BSL Others', code: 'BSL', status: 'Active' },
      { id: 'org-2', name: 'BSL Corporate', code: 'CORP', status: 'Active' },
    ]),
    getDepartments: vi.fn().mockResolvedValue([
      { id: 'dept-1', name: 'Production', code: 'PROD', organizationId: 'org-1', status: 'Active' },
      {
        id: 'dept-2',
        name: 'Quality Assurance',
        code: 'QA',
        organizationId: 'org-2',
        status: 'Active',
      },
      {
        id: 'dept-3',
        name: 'Information Technology',
        code: 'IT',
        organizationId: 'org-1',
        status: 'Active',
      },
    ]),
    getPositions: vi.fn().mockResolvedValue([
      { id: 'pos-1', title: 'Asst. Officer', code: 'AO', departmentId: 'dept-1', status: 'Active' },
      {
        id: 'pos-2',
        title: 'Junior Officer',
        code: 'JO',
        departmentId: 'dept-2',
        status: 'Active',
      },
      {
        id: 'pos-3',
        title: 'Software Engineer',
        code: 'SE',
        departmentId: 'dept-3',
        status: 'Active',
      },
    ]),
    getLocations: vi.fn().mockResolvedValue([
      { id: 'loc-1', name: 'Plant 1', organizationId: 'org-1' },
      { id: 'loc-2', name: 'Plant 2', organizationId: 'org-2' },
    ]),
  },
}));

describe('EmployeesTab Adversarial Component Tests', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  const onRefreshMock = vi.fn<() => void>();
  const setCreateModalOpenMock = vi.fn<(open: boolean) => void>();
  const setImportModalOpenMock = vi.fn<(open: boolean) => void>();
  const onClearOuFilterMock = vi.fn<() => void>();

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onRefreshMock.mockClear();
    setCreateModalOpenMock.mockClear();
    setImportModalOpenMock.mockClear();
    onClearOuFilterMock.mockClear();
    mockCreateEmployee.mockClear();
    mockUpdateEmployee.mockClear();
    mockDeleteEmployee.mockClear();
    mockImportEmployees.mockClear();
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
    vi.clearAllMocks();
  });

  const renderComponent = async (
    props: {
      createModalOpen?: boolean;
      importModalOpen?: boolean;
      ouFilter?: string;
      employees?: DirectoryUser[];
    } = {},
  ) => {
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
                employees: props.employees ?? mockEmployees,
                loading: false,
                onRefresh: () => {
                  onRefreshMock();
                },
                createModalOpen: props.createModalOpen ?? false,
                setCreateModalOpen: (open: boolean) => {
                  setCreateModalOpenMock(open);
                },
                importModalOpen: props.importModalOpen ?? false,
                setImportModalOpen: (open: boolean) => {
                  setImportModalOpenMock(open);
                },
                ouFilter: props.ouFilter ?? 'all',
                onClearOuFilter: () => {
                  onClearOuFilterMock();
                },
              }),
            ),
          ),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    return root;
  };

  describe('1. Employee Directory Form Verification & Zero Password Invariant', () => {
    it('verifies Add Employee modal strictly omits password fields, reveal toggles, and credentials', async () => {
      await renderComponent({ createModalOpen: true });

      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle?.textContent).toContain('Add Employee Record');

      // Check all input elements in the modal
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      expect(passwordInputs.length).toBe(0);

      // Check all input placeholders and names
      const allInputs = Array.from(document.querySelectorAll('.ant-modal input'));
      const dangerousInputs = allInputs.filter((input) => {
        const id = input.getAttribute('id') || '';
        const placeholder = input.getAttribute('placeholder') || '';
        const name = input.getAttribute('name') || '';
        return (
          id.toLowerCase().includes('pass') ||
          placeholder.toLowerCase().includes('pass') ||
          name.toLowerCase().includes('pass')
        );
      });
      expect(dangerousInputs).toHaveLength(0);

      // Check all Form.Item labels
      const labels = Array.from(document.querySelectorAll('.ant-form-item-label')).map((l) =>
        l.textContent?.trim(),
      );
      expect(labels.some((l) => l?.toLowerCase().includes('password'))).toBe(false);
      expect(labels.some((l) => l?.toLowerCase().includes('credential'))).toBe(false);
    });

    it('verifies submitting Add Employee invokes directoryService.createEmployee with zero password fields', async () => {
      await renderComponent({ createModalOpen: true });

      const firstNameInput = document.querySelector(
        '.ant-modal input#firstName',
      ) as HTMLInputElement | null;
      const lastNameInput = document.querySelector(
        '.ant-modal input#lastName',
      ) as HTMLInputElement | null;
      const emailInput = document.querySelector(
        '.ant-modal input#email',
      ) as HTMLInputElement | null;

      expect(firstNameInput).not.toBeNull();
      expect(lastNameInput).not.toBeNull();
      expect(emailInput).not.toBeNull();

      await act(async () => {
        if (firstNameInput) setInputValue(firstNameInput, 'David');
        if (lastNameInput) setInputValue(lastNameInput, 'Miller');
        if (emailInput) setInputValue(emailInput, 'dmiller@uims.internal');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Click Add Employee button in modal
      const modalOkBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Add Employee'),
      ) as HTMLButtonElement | undefined;

      expect(modalOkBtn).toBeDefined();

      await act(async () => {
        modalOkBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockCreateEmployee).toHaveBeenCalledTimes(1);
      const passedPayload = mockCreateEmployee.mock.calls[0][0] as Record<string, unknown>;
      expect(passedPayload.firstName).toBe('David');
      expect(passedPayload.lastName).toBe('Miller');
      expect(passedPayload.email).toBe('dmiller@uims.internal');
      expect(passedPayload.displayName).toBe('David Miller');
      // Assert zero credentials in payload
      expect(passedPayload).not.toHaveProperty('password');
      expect(passedPayload).not.toHaveProperty('passwordHash');
      expect(passedPayload).not.toHaveProperty('initialPassword');
      expect(passedPayload).not.toHaveProperty('adInitialPassword');
    });

    it('verifies editing employee details does not display or submit credentials', async () => {
      await renderComponent();

      // Find Edit button for the first employee
      const editButtons = Array.from(container.querySelectorAll('button .anticon-edit')).map(
        (icon) => icon.closest('button'),
      );

      expect(editButtons.length).toBeGreaterThan(0);

      await act(async () => {
        editButtons[0]?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Edit modal should now be open
      const editModalTitle = document.querySelector('.ant-modal-title');
      expect(editModalTitle?.textContent).toContain('Edit Employee: Phung Thi Nhu Y');

      // Verify no password fields exist in Edit modal
      const editPasswordInputs = document.querySelectorAll('input[type="password"]');
      expect(editPasswordInputs.length).toBe(0);

      // Verify form fields are pre-populated with employee data
      const editEmailInput = document.querySelector(
        '.ant-modal input#email',
      ) as HTMLInputElement | null;
      expect(editEmailInput?.value).toBe('yptn.st@youngonevn.com');

      // Click Save Changes
      const saveBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Save Changes'),
      ) as HTMLButtonElement | undefined;

      expect(saveBtn).toBeDefined();

      await act(async () => {
        saveBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockUpdateEmployee).toHaveBeenCalledTimes(1);
      const updateArgs = mockUpdateEmployee.mock.calls[0];
      expect(updateArgs[0]).toBe('emp-1');
      const updatePayload = updateArgs[1] as Record<string, unknown>;
      expect(updatePayload).not.toHaveProperty('password');
      expect(updatePayload).not.toHaveProperty('passwordHash');
      expect(updatePayload).not.toHaveProperty('adInitialPassword');
    });
  });

  describe('2. Employee Search and Multi-Attribute Filtering', () => {
    it('filters employees by search string matching employeeCode, position title, and email', async () => {
      await renderComponent();

      const searchInput = container.querySelector(
        'input[placeholder*="Search by name"]',
      ) as HTMLInputElement | null;
      expect(searchInput).not.toBeNull();

      // Search by employeeCode '63020037'
      await act(async () => {
        if (searchInput) {
          setInputValue(searchInput, '63020037');
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(container.textContent).toContain('Phung Thi Nhu Y');
      expect(container.textContent).not.toContain('Lam Ngo Ha Vy');
      expect(container.textContent).not.toContain('Alex Chen');

      // Search by position title 'Software Engineer'
      await act(async () => {
        if (searchInput) {
          setInputValue(searchInput, 'Software Engineer');
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(container.textContent).toContain('Alex Chen');
      expect(container.textContent).not.toContain('Phung Thi Nhu Y');

      // Search with leading/trailing whitespace and uppercase
      await act(async () => {
        if (searchInput) {
          setInputValue(searchInput, '   WYlnh.st@Youngonevn.com   ');
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(container.textContent).toContain('Lam Ngo Ha Vy');
      expect(container.textContent).not.toContain('Phung Thi Nhu Y');
    });

    it('renders OU filter banner when ouFilter is active and triggers onClearOuFilter', async () => {
      await renderComponent({ ouFilter: 'Production' });

      expect(container.textContent).toContain(
        'Filtering directory employees by Organizational Unit',
      );
      expect(container.textContent).toContain('Production');

      const clearFilterBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Clear Filter'),
      );
      expect(clearFilterBtn).toBeDefined();

      await act(async () => {
        clearFilterBtn?.click();
      });

      expect(onClearOuFilterMock).toHaveBeenCalledTimes(1);
    });

    it('handles edge cases: employee record with missing/null optional fields does not throw', async () => {
      const edgeCaseEmployee: DirectoryUser = {
        id: 'emp-edge',
        email: 'edge@uims.internal',
        firstName: 'Edge',
        lastName: 'Case',
        fullName: 'Edge Case',
        status: 'ACTIVE' as DirectoryUser['status'],
        source: 'LOCAL' as DirectoryUser['source'],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      await renderComponent({ employees: [edgeCaseEmployee] });

      expect(container.textContent).toContain('Edge Case');
      expect(container.textContent).toContain('Unassigned');
      expect(container.textContent).toContain('General');
    });
  });

  describe('3. CSV Batch Import Modal Behavior', () => {
    it('renders CSV Batch Import modal with guidelines and textarea', async () => {
      await renderComponent({ importModalOpen: true });

      const modal = document.querySelector('.ant-modal');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Import Employees from CSV');
      expect(modal?.textContent).toContain('CSV Format Guidelines');
      expect(modal?.textContent).toContain(
        'Initial passwords and application login capability are strictly prohibited',
      );

      const textarea = document.querySelector('.ant-modal textarea') as HTMLTextAreaElement | null;
      expect(textarea).not.toBeNull();
      expect(textarea?.placeholder).toContain('STT,HEmploy,HName,HDesignation');
    });

    it('shows warning and does not call API when import is submitted with empty or single header line', async () => {
      await renderComponent({ importModalOpen: true });

      const executeBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Execute Import'),
      ) as HTMLButtonElement | undefined;

      expect(executeBtn).toBeDefined();

      await act(async () => {
        executeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Nothing submitted since textarea was empty
      expect(mockImportEmployees).not.toHaveBeenCalled();
    });

    it('parses factory CSV format and submits batch to directoryService.importEmployees', async () => {
      await renderComponent({ importModalOpen: true });

      const validCsv = `STT,HEmploy,HName,HDesignation,HDepartment,Hcomp,Plant,Computer Name,HEmail,HTelephone,GR_GROUP USER
1,63020037,Phung Thi Nhu Y,Asst. Officer,Production,BSL Others,Plant 1,STOTHPR102,yptn.st@youngonevn.com,888152675,GR_BSLOTHPrinting`;

      const textarea = document.querySelector('.ant-modal textarea') as HTMLTextAreaElement | null;
      expect(textarea).not.toBeNull();

      await act(async () => {
        if (textarea) {
          setTextAreaValue(textarea, validCsv);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const executeBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Execute Import'),
      ) as HTMLButtonElement | undefined;

      await act(async () => {
        executeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockImportEmployees).toHaveBeenCalledTimes(1);
      const batchItems = mockImportEmployees.mock.calls[0][0];
      expect(batchItems).toHaveLength(1);
      expect(batchItems[0].name).toBe('Phung Thi Nhu Y');
      expect(batchItems[0].email).toBe('yptn.st@youngonevn.com');
      expect(batchItems[0].employeeCode).toBe('63020037');
      expect(batchItems[0].department).toBe('Production');
      expect(batchItems[0].computerName).toBe('STOTHPR102');
      // Assert zero credentials and pruned fields in parsed item
      expect(batchItems[0]).not.toHaveProperty('password');
      expect(batchItems[0]).not.toHaveProperty('initialPassword');
      expect(batchItems[0]).not.toHaveProperty('plant');
      expect(batchItems[0]).not.toHaveProperty('company');
      expect(batchItems[0]).not.toHaveProperty('section');
    });

    it('strips password or initial password columns if attempted in CSV input', async () => {
      await renderComponent({ importModalOpen: true });

      const csvWithInjectedCredentials = `Name,Email,ID,Designation,Department,Plant,Computer Name,Initial Pass,Password
Adversarial User,adv@uims.internal,99999999,Engineer,IT,Plant 1,PC01,SecretPass123!,AnotherSecret`;

      const textarea = document.querySelector('.ant-modal textarea') as HTMLTextAreaElement | null;
      await act(async () => {
        if (textarea) {
          setTextAreaValue(textarea, csvWithInjectedCredentials);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const executeBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Execute Import'),
      ) as HTMLButtonElement | undefined;

      await act(async () => {
        executeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockImportEmployees).toHaveBeenCalledTimes(1);
      const batchItems = mockImportEmployees.mock.calls[0][0];
      expect(batchItems[0].name).toBe('Adversarial User');
      expect(batchItems[0].email).toBe('adv@uims.internal');
      expect(batchItems[0]).not.toHaveProperty('password');
      expect(batchItems[0]).not.toHaveProperty('initialPassword');
      expect(batchItems[0]).not.toHaveProperty('Pass');
    });

    it('displays import execution summary and error reporting when API returns validation errors', async () => {
      mockImportEmployees.mockResolvedValueOnce({
        total: 2,
        created: 1,
        updated: 0,
        skipped: 1,
        errors: [{ row: 2, email: 'bad@uims.internal', error: 'Invalid plant assignment' }],
      });

      await renderComponent({ importModalOpen: true });

      const csvWithErrors = `Name,Email,ID,Designation,Department
Valid User,valid@uims.internal,1001,Staff,Production
Invalid User,bad@uims.internal,1002,Staff,Production`;

      const textarea = document.querySelector('.ant-modal textarea') as HTMLTextAreaElement | null;
      await act(async () => {
        if (textarea) {
          setTextAreaValue(textarea, csvWithErrors);
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const executeBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Execute Import'),
      ) as HTMLButtonElement | undefined;

      await act(async () => {
        executeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verify summary display inside modal
      const modal = document.querySelector('.ant-modal');
      expect(modal?.textContent).toContain('Import Execution Summary:');
      expect(modal?.textContent).toContain('Created: 1');
      expect(modal?.textContent).toContain('Skipped: 1');
      expect(modal?.textContent).toContain('Errors: 1');
      expect(modal?.textContent).toContain('Row 2: Invalid plant assignment');
    });
  });
});
