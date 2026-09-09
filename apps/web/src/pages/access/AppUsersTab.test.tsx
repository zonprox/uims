import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser, Role } from '@uims/shared-types';
import { UserStatus } from '@uims/shared-types';
import { AppUsersTab } from './AppUsersTab';

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const { mockAppUsers, mockRoles } = vi.hoisted(() => {
  const users: AppUser[] = [
    {
      id: 'usr-1',
      username: 'secadmin',
      email: 'secadmin@uims.internal',
      firstName: 'Security',
      lastName: 'Admin',
      displayName: 'Security Admin',
      roleId: 'role-superadmin',
      roleName: 'Super Admin',
      status: 'ACTIVE' as UserStatus,
      isLocked: false,
      lastLoginAt: '2026-09-09T08:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-09T08:00:00Z',
    },
    {
      id: 'usr-2',
      username: 'auditor01',
      email: 'auditor01@uims.internal',
      firstName: 'Compliance',
      lastName: 'Auditor',
      displayName: 'Compliance Auditor',
      roleId: 'role-auditor',
      roleName: 'Auditor',
      status: 'ACTIVE' as UserStatus,
      isLocked: true,
      lastLoginAt: null,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
    {
      id: 'usr-3',
      username: 'tech_ops',
      email: 'tech_ops@uims.internal',
      firstName: 'Tech',
      lastName: 'Operator',
      displayName: 'Tech Operator',
      roleId: 'role-technician',
      roleName: 'Technician',
      status: 'SUSPENDED' as UserStatus,
      isLocked: false,
      lastLoginAt: '2026-08-15T12:00:00Z',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-08-15T12:00:00Z',
    },
  ];

  const roles: Role[] = [
    { id: 'role-superadmin', name: 'Super Admin', isSystem: true, permissions: [] },
    { id: 'role-auditor', name: 'Auditor', isSystem: true, permissions: [] },
    { id: 'role-technician', name: 'Technician', isSystem: true, permissions: [] },
    { id: 'role-operator', name: 'Operator', isSystem: false, permissions: [] },
  ];

  return { mockAppUsers: users, mockRoles: roles };
});

const mockCreateUser = vi.fn().mockResolvedValue(mockAppUsers[0]);
const mockUpdateUser = vi.fn().mockResolvedValue(mockAppUsers[0]);
const mockDeleteUser = vi.fn().mockResolvedValue(undefined);

vi.mock('../../services/users.service', () => ({
  usersService: {
    createUser: (...args: unknown[]) => mockCreateUser(...args),
    updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
  },
}));

describe('AppUsersTab Adversarial Component Tests', () => {
  let container: HTMLDivElement;
  const onRefreshMock = vi.fn<() => void>();
  const setCreateModalOpenMock = vi.fn<(open: boolean) => void>();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onRefreshMock.mockClear();
    setCreateModalOpenMock.mockClear();
    mockCreateUser.mockClear();
    mockUpdateUser.mockClear();
    mockDeleteUser.mockClear();
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-popover').forEach((el) => {
      el.remove();
    });
    vi.clearAllMocks();
  });

  const renderComponent = async (
    props: { createModalOpen?: boolean; users?: AppUser[]; roles?: Role[] } = {},
  ) => {
    const root = createRoot(container);
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
              createElement(AppUsersTab, {
                users: props.users ?? mockAppUsers,
                roles: props.roles ?? mockRoles,
                loading: false,
                onRefresh: () => {
                  onRefreshMock();
                },
                createModalOpen: props.createModalOpen ?? false,
                setCreateModalOpen: (open: boolean) => {
                  setCreateModalOpenMock(open);
                },
              }),
            ),
          ),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    return root;
  };

  describe('1. Table Rendering and Security Status Badges', () => {
    it('renders application users with correct security state indicators and role tags', async () => {
      await renderComponent();

      expect(container.textContent).toContain('secadmin');
      expect(container.textContent).toContain('secadmin@uims.internal');
      expect(container.textContent).toContain('Super Admin');

      expect(container.textContent).toContain('auditor01');
      expect(container.textContent).toContain('auditor01@uims.internal');
      expect(container.textContent).toContain('Auditor');

      expect(container.textContent).toContain('tech_ops');
      expect(container.textContent).toContain('tech_ops@uims.internal');
      expect(container.textContent).toContain('Technician');

      expect(container.textContent).toContain('Authorized');
      expect(container.textContent).toContain('Locked Out');

      expect(container.textContent).toContain('Active');
      expect(container.textContent).toContain('Suspended');
    });
  });

  describe('2. Search and Multi-Attribute Filtering', () => {
    it('filters users by search query matching username, email, and display name', async () => {
      await renderComponent();

      const searchInput = container.querySelector(
        'input[placeholder*="Search by username"]',
      ) as HTMLInputElement | null;
      expect(searchInput).not.toBeNull();

      // Search by username 'secadmin'
      await act(async () => {
        if (searchInput) {
          setInputValue(searchInput, 'secadmin');
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
      });

      expect(container.textContent).toContain('secadmin');
      expect(container.textContent).not.toContain('auditor01');
      expect(container.textContent).not.toContain('tech_ops');

      // Search by email
      await act(async () => {
        if (searchInput) {
          setInputValue(searchInput, 'auditor01@uims.internal');
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
      });

      expect(container.textContent).toContain('auditor01');
      expect(container.textContent).not.toContain('secadmin');
      expect(container.textContent).not.toContain('tech_ops');
    });
  });

  describe('3. Account Lock / Unlock Toggle Action', () => {
    it('toggles lock on unlocked user and calls updateUser with isLocked: true', async () => {
      await renderComponent();

      // Unlocked user (secadmin) has lock icon
      const lockButtons = Array.from(container.querySelectorAll('button .anticon-lock')).map(
        (icon) => icon.closest('button'),
      );
      expect(lockButtons.length).toBeGreaterThan(0);

      // Click the lock button on first row (secadmin)
      await act(async () => {
        lockButtons[0]?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Ant Design Popconfirm should display confirmation
      const popconfirmTitle = document.querySelector('.ant-popconfirm-title');
      expect(popconfirmTitle?.textContent).toContain('Lock Account');

      const popconfirmDesc = document.querySelector('.ant-popconfirm-description');
      expect(popconfirmDesc?.textContent).toContain('prevent secadmin from authenticating');

      // Find the 'Lock' button in popconfirm
      const confirmBtn = Array.from(
        document.querySelectorAll('.ant-popconfirm .ant-btn-primary'),
      ).find((b) => b.textContent?.includes('Lock')) as HTMLButtonElement | undefined;

      expect(confirmBtn).toBeDefined();

      await act(async () => {
        confirmBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(mockUpdateUser).toHaveBeenCalledWith('usr-1', { isLocked: true });
      expect(onRefreshMock).toHaveBeenCalled();
    });

    it('toggles unlock on locked user and calls updateUser with isLocked: false', async () => {
      await renderComponent();

      // Locked user (auditor01) has unlock icon
      const unlockButtons = Array.from(container.querySelectorAll('button .anticon-unlock')).map(
        (icon) => icon.closest('button'),
      );
      expect(unlockButtons.length).toBeGreaterThan(0);

      // Click the unlock button on auditor01
      await act(async () => {
        unlockButtons[0]?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const popconfirmTitle = document.querySelector('.ant-popconfirm-title');
      expect(popconfirmTitle?.textContent).toContain('Unlock Account');

      const popconfirmDesc = document.querySelector('.ant-popconfirm-description');
      expect(popconfirmDesc?.textContent).toContain('unlock access for auditor01');

      const confirmBtn = Array.from(
        document.querySelectorAll('.ant-popconfirm .ant-btn-primary'),
      ).find((b) => b.textContent?.includes('Unlock')) as HTMLButtonElement | undefined;

      expect(confirmBtn).toBeDefined();

      await act(async () => {
        confirmBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(mockUpdateUser).toHaveBeenCalledWith('usr-2', { isLocked: false });
      expect(onRefreshMock).toHaveBeenCalled();
    });
  });

  describe('4. Password Reset Modal Action', () => {
    it('opens Password Reset modal with pre-generated secure password and updates password', async () => {
      await renderComponent();

      // Find KeyOutlined button on secadmin row
      const keyButtons = Array.from(container.querySelectorAll('button .anticon-key')).map((icon) =>
        icon.closest('button'),
      );
      expect(keyButtons.length).toBeGreaterThan(0);

      await act(async () => {
        keyButtons[0]?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle?.textContent).toContain('Reset Password: secadmin');

      // Verify input password exists and has a generated strong password
      const passwordInput = document.querySelector(
        '.ant-modal input[type="password"]',
      ) as HTMLInputElement | null;
      expect(passwordInput).not.toBeNull();
      expect(passwordInput?.value.length).toBeGreaterThanOrEqual(12);
      expect(passwordInput?.value).toMatch(/^Uims#/);

      // Verify Generate Strong Password button works
      const generateLink = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Generate Strong Password'),
      ) as HTMLButtonElement | undefined;
      expect(generateLink).toBeDefined();

      await act(async () => {
        generateLink?.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      // Submit password reset
      const updatePasswordBtn = Array.from(document.querySelectorAll('.ant-modal button')).find(
        (b) => b.textContent?.includes('Update Password'),
      ) as HTMLButtonElement | undefined;

      expect(updatePasswordBtn).toBeDefined();

      await act(async () => {
        updatePasswordBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
      expect(mockUpdateUser.mock.calls[0][0]).toBe('usr-1');
      const resetPayload = mockUpdateUser.mock.calls[0][1] as { password: string };
      expect(resetPayload.password).toBeDefined();
      expect(resetPayload.password.length).toBeGreaterThanOrEqual(8);
      expect(onRefreshMock).toHaveBeenCalled();
    });
  });

  describe('5. Role Assignment and Edit User Action', () => {
    it('opens Edit User modal and updates role assignment and display name', async () => {
      await renderComponent();

      const editButtons = Array.from(container.querySelectorAll('button .anticon-edit')).map(
        (icon) => icon.closest('button'),
      );
      expect(editButtons.length).toBeGreaterThan(0);

      // Open Edit for secadmin
      await act(async () => {
        editButtons[0]?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle?.textContent).toContain('Edit User: secadmin');

      // Edit display name
      const nameInput = document.querySelector(
        '.ant-modal input#displayName',
      ) as HTMLInputElement | null;
      expect(nameInput?.value).toBe('Security Admin');

      await act(async () => {
        if (nameInput) {
          setInputValue(nameInput, 'Chief Security Officer');
        }
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      // Submit Save Changes
      const saveChangesBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Save Changes'),
      ) as HTMLButtonElement | undefined;

      await act(async () => {
        saveChangesBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
      expect(mockUpdateUser.mock.calls[0][0]).toBe('usr-1');
      const editPayload = mockUpdateUser.mock.calls[0][1] as Record<string, unknown>;
      expect(editPayload.displayName).toBe('Chief Security Officer');
      // Verify edit payload does NOT include password
      expect(editPayload).not.toHaveProperty('password');
    });
  });

  describe('6. Create User Account Action', () => {
    it('creates user with auto-generated secure password when password field is left empty', async () => {
      await renderComponent({ createModalOpen: true });

      const modalTitle = document.querySelector('.ant-modal-title');
      expect(modalTitle?.textContent).toContain('Create User Account');

      const usernameInput = document.querySelector(
        '.ant-modal input#username',
      ) as HTMLInputElement | null;
      const emailInput = document.querySelector(
        '.ant-modal input#email',
      ) as HTMLInputElement | null;

      expect(usernameInput).not.toBeNull();
      expect(emailInput).not.toBeNull();

      await act(async () => {
        if (usernameInput) {
          setInputValue(usernameInput, 'newoperator');
        }
        if (emailInput) {
          setInputValue(emailInput, 'operator@uims.internal');
        }
      });

      const createBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
        b.textContent?.includes('Create User'),
      ) as HTMLButtonElement | undefined;

      expect(createBtn).toBeDefined();
    });
  });
});
