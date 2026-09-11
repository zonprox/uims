import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser, Role } from '@uims/shared-types';
import AccessControlPage from './AccessControlPage';

const { mockAppUsers, mockRoles } = vi.hoisted(() => {
  const users: AppUser[] = [
    {
      id: 'app-usr-1',
      username: 'secadmin',
      email: 'secadmin@uims.internal',
      firstName: 'Security',
      lastName: 'Admin',
      displayName: 'Security Admin',
      role: { id: 'role-1', name: 'Super Admin', isSystem: true, permissions: [] },
      roleName: 'Super Admin',
      status: 'ACTIVE' as AppUser['status'],
      isLocked: false,
      lastLoginAt: '2026-09-09T08:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-09T08:00:00Z',
    },
    {
      id: 'app-usr-2',
      username: 'auditor01',
      email: 'auditor01@uims.internal',
      firstName: 'Compliance',
      lastName: 'Auditor',
      displayName: 'Compliance Auditor',
      role: { id: 'role-2', name: 'Auditor', isSystem: true, permissions: [] },
      roleName: 'Auditor',
      status: 'ACTIVE' as AppUser['status'],
      isLocked: true,
      lastLoginAt: null,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
  ];

  const roles: Role[] = [
    { id: 'role-1', name: 'Super Admin', isSystem: true, permissions: [] },
    { id: 'role-2', name: 'Auditor', isSystem: true, permissions: [] },
  ];

  return { mockAppUsers: users, mockRoles: roles };
});

vi.mock('../../services/users.service', () => ({
  usersService: {
    getUsers: vi.fn().mockResolvedValue({
      items: mockAppUsers,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }),
    getStats: vi.fn().mockResolvedValue({
      totalUsers: 2,
      activeUsers: 2,
      adminUsers: 1,
      lockedUsers: 1,
      suspendedUsers: 0,
      recentActiveCount: 1,
    }),
    createUser: vi.fn().mockResolvedValue(mockAppUsers[0]),
    updateUser: vi.fn().mockResolvedValue(mockAppUsers[0]),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    toggleLock: vi.fn().mockResolvedValue({ ...mockAppUsers[0], isLocked: true }),
    resetPassword: vi.fn().mockResolvedValue({ ...mockAppUsers[0] }),
  },
}));

vi.mock('../../services/roles.service', () => ({
  rolesService: {
    getRoles: vi.fn().mockResolvedValue(mockRoles),
    getStats: vi.fn().mockResolvedValue({ totalRoles: 2, systemRoles: 2, customRoles: 0 }),
    getCatalog: vi.fn().mockResolvedValue([]),
    getRole: vi.fn().mockResolvedValue(mockRoles[0]),
  },
}));

describe('AccessControlPage Component Tests', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
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
            createElement(App, null, createElement(AccessControlPage)),
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

  it('renders PageContainer title, breadcrumbs, and operator telemetry stats', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Users');
    expect(container.textContent).toContain('Manage system user accounts');
    expect(container.textContent).toContain('Total Accounts');
    expect(container.textContent).toContain('Active Accounts');
    expect(container.textContent).toContain('Locked Accounts');
    expect(container.textContent).toContain('System Roles');
  });

  it('renders primary action buttons "Create User" and "Create Role"', async () => {
    await renderComponent();

    const buttons = Array.from(container.querySelectorAll('button'));
    const buttonTexts = buttons.map((b) => b.textContent?.trim());
    expect(buttonTexts.some((t) => t?.includes('Create User'))).toBe(true);
    expect(buttonTexts.some((t) => t?.includes('Create Role'))).toBe(true);
  });

  it('renders Application Users table with AppUser rows', async () => {
    await renderComponent();

    expect(container.textContent).toContain('secadmin');
    expect(container.textContent).toContain('secadmin@uims.internal');
    expect(container.textContent).toContain('Super Admin');
    expect(container.textContent).toContain('auditor01');
    expect(container.textContent).toContain('auditor01@uims.internal');
    expect(container.textContent).toContain('Auditor');
  });

  it('displays locked out status badge for locked user', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Authorized');
    expect(container.textContent).toContain('Locked Out');
  });

  it('opens Create User modal when "Create User" button is clicked', async () => {
    await renderComponent();

    const createUserBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Create User'),
    );
    expect(createUserBtn).toBeDefined();

    await act(async () => {
      createUserBtn?.click();
    });

    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Create User Account');
  });

  it('renders tabs for Application Users and Roles & Permissions', async () => {
    await renderComponent();

    const tabElements = Array.from(container.querySelectorAll('.ant-tabs-tab'));
    const tabTexts = tabElements.map((el) => el.textContent);
    expect(tabTexts.some((t) => t?.includes('Application Users'))).toBe(true);
    expect(tabTexts.some((t) => t?.includes('Roles & Permissions'))).toBe(true);
  });
});
