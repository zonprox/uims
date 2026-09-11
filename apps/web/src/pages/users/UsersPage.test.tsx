import { App, ConfigProvider, theme } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser, Role } from '@uims/shared-types';
import UsersPage from './UsersPage';

const { mockUsers, mockRoles } = vi.hoisted(() => {
  const users: AppUser[] = [
    {
      id: 'usr-1',
      email: 'jordan.lee@company.com',
      username: 'jordan.lee',
      firstName: 'Jordan',
      lastName: 'Lee',
      fullName: 'Jordan Lee',
      displayName: 'Jordan Lee',
      role: { id: 'r-1', name: 'IT Admin', permissions: [] },
      roleName: 'IT Admin',
      status: 'ACTIVE' as AppUser['status'],
      isLocked: false,
      lastLoginAt: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr-2',
      email: 'alex.smith@company.com',
      username: 'alex.smith',
      firstName: 'Alex',
      lastName: 'Smith',
      fullName: 'Alex Smith',
      displayName: 'Alex Smith',
      role: { id: 'r-2', name: 'Employee', permissions: [] },
      roleName: 'Employee',
      status: 'ACTIVE' as AppUser['status'],
      isLocked: true,
      lastLoginAt: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const roles: Role[] = [
    { id: 'r-1', name: 'IT Admin', isSystem: true, permissions: [] },
    { id: 'r-2', name: 'Employee', isSystem: true, permissions: [] },
  ];

  return { mockUsers: users, mockRoles: roles };
});

const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();

vi.mock('../../services/users.service', () => ({
  usersService: {
    getUsers: vi.fn().mockResolvedValue({
      items: mockUsers,
      total: 2,
      page: 1,
      pageSize: 100,
      totalPages: 1,
    }),
    getGroups: vi.fn().mockResolvedValue([]),
    getOrganizationalUnits: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({
      totalUsers: 2,
      activeUsers: 2,
      adminUsers: 1,
      lockedUsers: 1,
      suspendedUsers: 0,
      recentActiveCount: 2,
    }),
    getUser: vi.fn().mockImplementation((id: string) => {
      const u = mockUsers.find((user) => user.id === id) || mockUsers[0];
      return Promise.resolve(u);
    }),
    createUser: vi.fn().mockResolvedValue(mockUsers[0]),
    updateUser: vi.fn().mockResolvedValue(mockUsers[0]),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    toggleLock: vi.fn().mockResolvedValue({ ...mockUsers[0], isLocked: true }),
    resetPassword: vi.fn().mockResolvedValue({ ...mockUsers[0] }),
  },
}));

vi.mock('../../services/roles.service', () => ({
  rolesService: {
    getRoles: vi.fn().mockResolvedValue(mockRoles),
    getStats: vi.fn().mockResolvedValue({ totalRoles: 2, systemRoles: 2, customRoles: 0 }),
    getCatalog: vi.fn().mockResolvedValue([]),
  },
}));

describe('UsersPage - Backward Compatibility & Access Control Wrapper', () => {
  let container: HTMLDivElement;
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockMessageSuccess.mockClear();
    mockMessageError.mockClear();
    mockWriteText.mockClear();

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  const renderComponent = async (isDark = false) => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(
            ConfigProvider,
            {
              theme: {
                algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
              },
            },
            createElement(App, null, createElement(UsersPage)),
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

  it('renders Users page via UsersPage', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Users');
    expect(container.textContent).toContain('Application Users');
    expect(container.textContent).toContain('Roles & Permissions');
    expect(container.textContent).toContain('Total Accounts');
    expect(container.textContent).toContain('Active Accounts');
    expect(container.textContent).toContain('Locked Accounts');
  });

  it('renders application users list without plaintext password columns', async () => {
    await renderComponent();

    expect(container.textContent).toContain('jordan.lee');
    expect(container.textContent).toContain('jordan.lee@company.com');
    expect(container.textContent).toContain('alex.smith');
    // Verify NO unhashed / initial password column exists
    expect(container.textContent).not.toContain('Initial Password');
    expect(container.textContent).not.toContain('Init#Secret2026!');
  });

  it('renders correctly under dark mode without crashing', async () => {
    await renderComponent(true);

    expect(container.textContent).toContain('Users');
    expect(container.textContent).toContain('jordan.lee');
  });
});
