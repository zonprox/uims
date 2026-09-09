import { App, ConfigProvider } from 'antd';
import { act, createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AppUser,
  DirectoryGroup,
  DirectoryUser,
  OrganizationalUnit,
  Role,
} from '@uims/shared-types';
import CommandPalette from '../../components/CommandPalette';
import {
  getNavMenuItems,
  getOrgMenuItems,
  getQuickCreateMenu,
  getUserMenuItems,
} from '../../layouts/menuConfig';
import AccessControlPage from './AccessControlPage';
import DirectoryPage from '../directory/DirectoryPage';
import UsersPage from '../users/UsersPage';
import { router } from '../../app/router';
import { useAuthStore } from '../../stores/auth.store';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock hoisted data
const { mockAppUsers, mockDirectoryUsers, mockRoles, mockGroups, mockOus } = vi.hoisted(() => {
  const appUsers: AppUser[] = [
    {
      id: 'app-1',
      username: 'sysadmin',
      email: 'sysadmin@uims.internal',
      firstName: 'System',
      lastName: 'Admin',
      displayName: 'System Admin',
      role: { id: 'role-1', name: 'Super Admin', isSystem: true, permissions: [] },
      roleName: 'Super Admin',
      status: 'ACTIVE' as AppUser['status'],
      isLocked: false,
      lastLoginAt: '2026-09-09T08:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-09-09T08:00:00Z',
    },
    {
      id: 'app-2',
      username: 'auditor01',
      email: 'auditor01@uims.internal',
      firstName: 'Audit',
      lastName: 'User',
      displayName: 'Audit User',
      role: { id: 'role-2', name: 'Auditor', isSystem: true, permissions: [] },
      roleName: 'Auditor',
      status: 'ACTIVE' as AppUser['status'],
      isLocked: true,
      lastLoginAt: null,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
  ];

  const dirUsers: DirectoryUser[] = [
    {
      id: 'dir-1',
      employeeCode: '63020037',
      email: 'emp1@youngonevn.com',
      firstName: 'Nhu Y',
      lastName: 'Phung',
      fullName: 'Phung Nhu Y',
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
      id: 'dir-2',
      employeeCode: '30000930',
      email: 'emp2@youngonevn.com',
      firstName: 'Ha Vy',
      lastName: 'Lam',
      fullName: 'Lam Ha Vy',
      jobTitle: 'Junior Officer',
      company: 'BSL Others',
      plant: 'Plant 1',
      department: 'Finance',
      section: 'Sample',
      computerName: 'STOTHSAM04',
      adGroup: 'GR_BSLOTHSample',
      ouPath: 'OU=Finance,DC=uims,DC=internal',
      status: 'DISABLED' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      assignedAssetsCount: 0,
      assignedLicensesCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const roles: Role[] = [
    { id: 'role-1', name: 'Super Admin', isSystem: true, permissions: [] },
    { id: 'role-2', name: 'Auditor', isSystem: true, permissions: [] },
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

  return {
    mockAppUsers: appUsers,
    mockDirectoryUsers: dirUsers,
    mockRoles: roles,
    mockGroups: groups,
    mockOus: ous,
  };
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

vi.mock('../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({
      items: mockDirectoryUsers,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }),
    getGroups: vi.fn().mockResolvedValue(mockGroups),
    getOrganizationalUnits: vi.fn().mockResolvedValue(mockOus),
    getStats: vi.fn().mockResolvedValue({
      totalEmployees: 2,
      activeEmployees: 1,
      assignedWorkstations: 2,
      totalGroups: 1,
      totalOUs: 1,
      closedAccounts: 0,
    }),
    getEmployee: vi.fn().mockImplementation((id: string) => {
      const emp = mockDirectoryUsers.find((e) => e.id === id) || mockDirectoryUsers[0];
      return Promise.resolve(emp);
    }),
    createEmployee: vi.fn().mockResolvedValue(mockDirectoryUsers[0]),
    updateEmployee: vi.fn().mockResolvedValue(mockDirectoryUsers[0]),
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
        name: 'Phung Nhu Y',
        email: 'emp1@youngonevn.com',
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

// Helper location watcher component to observe route navigation inside MemoryRouter
let currentLocation = { pathname: '/' };
function LocationWatcher() {
  const loc = useLocation();
  useEffect(() => {
    currentLocation = loc;
  }, [loc]);
  return null;
}

describe('Adversarial Navigation & Router State Suite', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    currentLocation = { pathname: '/' };
    // Ensure auth state is authenticated by default
    useAuthStore.setState({
      token: 'fake-token-2026',
      user: {
        id: 'usr-admin',
        email: 'admin@uims.internal',
        name: 'Admin UIMS',
        role: 'Super Admin',
      },
      permissions: ['User:read', 'User:create', 'Directory:read', 'Directory:create'],
    });
  });

  afterEach(() => {
    container.remove();
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer-root')
      .forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  const renderWithRouter = async (initialEntries: string[]) => {
    const memRouter = createMemoryRouter(router.routes, { initialEntries });
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(RouterProvider, { router: memRouter })),
        ),
      );
    });
    // Wait for suspense and microtasks
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    return { root, memRouter };
  };

  describe('1. Routing & Redirect Invariants', () => {
    it('renders AccessControlPage when navigating directly to /access-control', async () => {
      const { root, memRouter } = await renderWithRouter(['/access-control']);

      expect(memRouter.state.location.pathname).toBe('/access-control');
      expect(container.textContent).toContain('Access Control');
      expect(container.textContent).toContain('Manage operator accounts');
      expect(container.textContent).toContain('Application Users (2)');

      act(() => root.unmount());
    });

    it('renders DirectoryPage when navigating directly to /directory', async () => {
      const { root, memRouter } = await renderWithRouter(['/directory']);

      expect(memRouter.state.location.pathname).toBe('/directory');
      expect(container.textContent).toContain('Directory');
      expect(container.textContent).toContain('Manage corporate employee records');
      expect(container.textContent).toContain('Active Directory Domain Federation');
      expect(container.textContent).toContain('Employees (2)');

      act(() => root.unmount());
    });

    it('cleanly redirects legacy /users to /access-control without infinite loops or white screen', async () => {
      const { root, memRouter } = await renderWithRouter(['/users']);

      // Router must replace path to /access-control
      expect(memRouter.state.location.pathname).toBe('/access-control');
      expect(container.textContent).toContain('Access Control');
      expect(container.textContent).toContain('Manage operator accounts');
      expect(container.textContent).not.toContain('Loading...');

      act(() => root.unmount());
    });

    it('redirects unauthenticated requests away from /directory and /access-control to /login', async () => {
      // Clear token to make unauthenticated
      useAuthStore.setState({ token: null, user: null });

      const { root: rootDir, memRouter: dirRouter } = await renderWithRouter(['/directory']);
      expect(dirRouter.state.location.pathname).toBe('/login');
      expect(dirRouter.state.location.state).toEqual({
        from: expect.objectContaining({ pathname: '/directory' }),
      });
      act(() => rootDir.unmount());

      const { root: rootAccess, memRouter: accessRouter } = await renderWithRouter([
        '/access-control',
      ]);
      expect(accessRouter.state.location.pathname).toBe('/login');
      expect(accessRouter.state.location.state).toEqual({
        from: expect.objectContaining({ pathname: '/access-control' }),
      });
      act(() => rootAccess.unmount());
    });

    it('verifies UsersPage backward compatibility wrapper renders AccessControlPage', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            null,
            createElement(ConfigProvider, null, createElement(App, null, createElement(UsersPage))),
          ),
        );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(container.textContent).toContain('Access Control');
      expect(container.textContent).toContain('Total Accounts');
      act(() => root.unmount());
    });
  });

  describe('2. CommandPalette Navigation & Filtering', () => {
    it('filters commands when typing "access" or "users" and navigates to /access-control', async () => {
      const mockClose = vi.fn();

      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            { initialEntries: ['/'] },
            createElement(
              ConfigProvider,
              null,
              createElement(
                App,
                null,
                createElement('div', null, [
                  createElement(LocationWatcher, { key: 'watcher' }),
                  createElement(CommandPalette, { key: 'palette', open: true, onClose: mockClose }),
                ]),
              ),
            ),
          ),
        );
      });

      // Find input inside modal
      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      expect(input).toBeDefined();

      // Type "users" to test searching for user management
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(input, 'users');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Verify Access Control appears because its description matches "users"
      const modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('Access Control');

      // Click the Access Control navigation item
      const accessControlOption = Array.from(
        document.querySelectorAll('.ant-modal [style*="cursor: pointer"]'),
      ).find((el) => el.textContent?.includes('Access Control'));
      expect(accessControlOption).toBeDefined();

      await act(async () => {
        (accessControlOption as HTMLElement).click();
      });

      expect(mockClose).toHaveBeenCalled();
      expect(currentLocation.pathname).toBe('/access-control');

      act(() => root.unmount());
    });

    it('filters commands when typing "directory" and navigates to /directory', async () => {
      const mockClose = vi.fn();

      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(
            MemoryRouter,
            { initialEntries: ['/'] },
            createElement(
              ConfigProvider,
              null,
              createElement(
                App,
                null,
                createElement('div', null, [
                  createElement(LocationWatcher, { key: 'watcher' }),
                  createElement(CommandPalette, { key: 'palette', open: true, onClose: mockClose }),
                ]),
              ),
            ),
          ),
        );
      });

      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      expect(input).toBeDefined();

      // Type "directory"
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(input, 'directory');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('Directory');
      expect(modalText).toContain('Corporate employee directory records');

      // Click the Directory navigation item
      const directoryOption = Array.from(
        document.querySelectorAll('.ant-modal [style*="cursor: pointer"]'),
      ).find(
        (el) =>
          el.textContent?.includes('Directory') &&
          el.textContent?.includes('Corporate employee directory records'),
      );
      expect(directoryOption).toBeDefined();

      await act(async () => {
        (directoryOption as HTMLElement).click();
      });

      expect(mockClose).toHaveBeenCalled();
      expect(currentLocation.pathname).toBe('/directory');

      act(() => root.unmount());
    });
  });

  describe('3. Navigation Menu Invariants & RBAC filtering', () => {
    it('shows both Directory and Access Control under group-org for super admin', () => {
      const items = getNavMenuItems(false, false);
      const orgGroup = items?.find((item) => (item as { key?: string })?.key === 'group-org') as {
        children?: Array<{ key: string }>;
      };
      expect(orgGroup).toBeDefined();
      expect(orgGroup.children?.some((c) => c.key === '/directory')).toBe(true);
      expect(orgGroup.children?.some((c) => c.key === '/access-control')).toBe(true);
    });

    it('isolates Directory from Access Control when user has only Directory:read', () => {
      const can = (action: string, subject: string) => action === 'read' && subject === 'Directory';
      const items = getNavMenuItems(false, false, undefined, can);
      const orgGroup = items?.find((item) => (item as { key?: string })?.key === 'group-org') as {
        children?: Array<{ key: string }>;
      };
      expect(orgGroup).toBeDefined();
      expect(orgGroup.children?.some((c) => c.key === '/directory')).toBe(true);
      expect(orgGroup.children?.some((c) => c.key === '/access-control')).toBe(false);
      expect(orgGroup.children?.some((c) => c.key === '/organization')).toBe(false);
    });

    it('isolates Access Control from Directory when user has only Role:read', () => {
      const can = (action: string, subject: string) => action === 'read' && subject === 'Role';
      const items = getNavMenuItems(false, false, undefined, can);
      const orgGroup = items?.find((item) => (item as { key?: string })?.key === 'group-org') as {
        children?: Array<{ key: string }>;
      };
      expect(orgGroup).toBeDefined();
      expect(orgGroup.children?.some((c) => c.key === '/access-control')).toBe(true);
      expect(orgGroup.children?.some((c) => c.key === '/directory')).toBe(false);
      expect(orgGroup.children?.some((c) => c.key === '/organization')).toBe(false);
    });

    it('completely hides group-org if user lacks all organization and user permissions', () => {
      const can = (action: string, subject: string) => action === 'read' && subject === 'Asset';
      const items = getNavMenuItems(false, false, undefined, can);
      const orgGroup = items?.find((item) => (item as { key?: string })?.key === 'group-org');
      expect(orgGroup).toBeUndefined();
    });

    it('provides distinct quick create actions for User vs Employee', () => {
      const navigate = vi.fn();
      const items = getQuickCreateMenu(navigate);
      const createUser = items?.find((i) => (i as { key?: string })?.key === 'new-user') as {
        onClick?: () => void;
      };
      const addEmployee = items?.find((i) => (i as { key?: string })?.key === 'new-employee') as {
        onClick?: () => void;
      };

      expect(createUser).toBeDefined();
      expect(addEmployee).toBeDefined();

      createUser.onClick?.();
      expect(navigate).toHaveBeenCalledWith('/access-control');

      addEmployee.onClick?.();
      expect(navigate).toHaveBeenCalledWith('/directory');
    });

    it('filters quick create menu actions when user lacks creation permissions', () => {
      const navigate = vi.fn();
      const can = (action: string, subject: string) =>
        action === 'create' && subject === 'Directory';
      const items = getQuickCreateMenu(navigate, can);

      expect(items?.some((i) => (i as { key?: string })?.key === 'new-user')).toBe(false);
      expect(items?.some((i) => (i as { key?: string })?.key === 'new-employee')).toBe(true);
    });

    it('switches active organization when clicking org menu item', () => {
      const setActiveOrg = vi.fn();
      const items = getOrgMenuItems(setActiveOrg);
      expect(items?.length).toBe(3);
      const firstOrg = items?.[0] as { onClick?: () => void };
      firstOrg?.onClick?.();
      expect(setActiveOrg).toHaveBeenCalledWith('Acme Enterprise Global HQ');
    });

    it('provides user profile dropdown menu items for Access Control and Directory', () => {
      const navigate = vi.fn();
      const handleLogout = vi.fn();
      const items = getUserMenuItems(
        { name: 'Admin', role: 'Super Admin', email: 'admin@uims.internal' },
        navigate,
        handleLogout,
      );

      const accessItem = items?.find((i) => (i as { key?: string })?.key === 'access-control') as {
        onClick?: () => void;
      };
      const dirItem = items?.find((i) => (i as { key?: string })?.key === 'directory') as {
        onClick?: () => void;
      };

      expect(accessItem).toBeDefined();
      expect(dirItem).toBeDefined();

      accessItem.onClick?.();
      expect(navigate).toHaveBeenCalledWith('/access-control');

      dirItem.onClick?.();
      expect(navigate).toHaveBeenCalledWith('/directory');
    });
  });

  describe('4. Component Stress Testing & State Invariants', () => {
    it('stresses AccessControlPage tab switching and search empty state', async () => {
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
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Initially on users tab
      const activeTab1 = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab1?.textContent).toContain('Application Users');

      // Switch to Roles tab
      const rolesTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((t) =>
        t.textContent?.includes('Roles & Permissions'),
      );
      expect(rolesTab).toBeDefined();
      await act(async () => {
        (rolesTab as HTMLElement).click();
      });

      const activeTab2 = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab2?.textContent).toContain('Roles & Permissions');

      // Switch back to Application Users tab
      const usersTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((t) =>
        t.textContent?.includes('Application Users'),
      );
      expect(usersTab).toBeDefined();
      await act(async () => {
        (usersTab as HTMLElement).click();
      });

      const activeTab3 = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab3?.textContent).toContain('Application Users');

      // Test search with unmatched query
      const searchInput = container.querySelector(
        'input[placeholder*="Search by username"]',
      ) as HTMLInputElement;
      expect(searchInput).toBeDefined();
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(searchInput, 'NO_MATCHING_USER_99999');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // The users table renders empty state "No data" and neither user row appears
      const tables = container.querySelectorAll('.ant-table');
      expect(tables.length).toBeGreaterThan(0);
      const userTable = tables[0];
      expect(userTable.textContent).toContain('No data');
      const userTableRows = userTable.querySelectorAll('.ant-table-row');
      expect(userTableRows.length).toBe(0);
      expect(userTable.textContent).not.toContain('sysadmin');

      act(() => root.unmount());
    });

    it('stresses DirectoryPage tab switching, OU filter banner, and empty state', async () => {
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
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Initially on Employees tab
      const activeTab1 = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab1?.textContent).toContain('Employees');

      // Verify Groups Tab
      const groupsTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((t) =>
        t.textContent?.includes('Groups'),
      );
      expect(groupsTab).toBeDefined();
      await act(async () => {
        (groupsTab as HTMLElement).click();
      });
      const activeTab2 = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab2?.textContent).toContain('Groups');

      // Verify Organizational Units Tab
      const ousTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((t) =>
        t.textContent?.includes('Organizational Units'),
      );
      expect(ousTab).toBeDefined();
      await act(async () => {
        (ousTab as HTMLElement).click();
      });
      const activeTab3 = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab3?.textContent).toContain('Organizational Units');

      // Click "View Members →" on the Production OU card to test OU filtering propagation
      const viewMembersBtn = Array.from(container.querySelectorAll('button, a')).find((el) =>
        el.textContent?.includes('View Members'),
      );
      expect(viewMembersBtn).toBeDefined();
      await act(async () => {
        (viewMembersBtn as HTMLElement).click();
      });

      // Should switch back to Employees tab and display the OU filter banner
      const activeTab4 = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab4?.textContent).toContain('Employees');
      expect(container.textContent).toContain(
        'Filtering directory employees by Organizational Unit',
      );
      expect(container.textContent).toContain('Production');

      // Click "Clear Filter" to reset
      const clearFilterBtn = Array.from(container.querySelectorAll('button, a')).find((el) =>
        el.textContent?.includes('Clear Filter'),
      );
      expect(clearFilterBtn).toBeDefined();
      await act(async () => {
        (clearFilterBtn as HTMLElement).click();
      });
      expect(container.textContent).not.toContain(
        'Filtering directory employees by Organizational Unit',
      );

      // Search with non-matching term
      const searchInput = container.querySelector(
        'input[placeholder*="Search by name"]',
      ) as HTMLInputElement;
      expect(searchInput).toBeDefined();
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(searchInput, 'NON_EXISTENT_STAFF_RECORD_404');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(container.textContent).toContain('No data');
      const tableRows = container.querySelectorAll('.ant-table-row');
      expect(tableRows.length).toBe(0);

      act(() => root.unmount());
    });

    it('strictly verifies ZERO password inputs in Directory Add Employee modal', async () => {
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
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const addBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Add Employee'),
      );
      expect(addBtn).toBeDefined();

      await act(async () => {
        addBtn?.click();
      });

      const modal = document.querySelector('.ant-modal');
      expect(modal).toBeDefined();
      expect(modal?.textContent).toContain('Add Employee Record');

      // Assert ZERO password fields in the entire DOM
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      expect(passwordInputs.length).toBe(0);

      // Assert no label contains password
      const labels = Array.from(document.querySelectorAll('.ant-form-item-label')).map(
        (l) => l.textContent,
      );
      expect(labels.some((l) => l?.toLowerCase().includes('password'))).toBe(false);

      act(() => root.unmount());
    });
  });
});
