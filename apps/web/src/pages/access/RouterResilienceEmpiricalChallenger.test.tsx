import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser, DirectoryGroup, DirectoryUser, Role } from '@uims/shared-types';
import PageLoader from '../../components/PageLoader';
import { router } from '../../app/router';
import { useAuthStore } from '../../stores/auth.store';
import './AccessControlPage';
import '../access-control/AccessControlPage';
import '../directory/DirectoryPage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock hoisted data for service mocks
const { mockAppUsers, mockDirectoryUsers, mockRoles, mockGroups } = vi.hoisted(() => {
  const appUsers: AppUser[] = [
    {
      id: 'app-admin-1',
      username: 'sysadmin',
      email: 'sysadmin@uims.internal',
      firstName: 'System',
      lastName: 'Admin',
      displayName: 'System Admin',
      role: { id: 'role-1', name: 'Super Admin', isSystem: true, permissions: [] },
      roleName: 'Super Admin',
      status: 'ACTIVE' as AppUser['status'],
      isLocked: false,
      lastLoginAt: '2026-10-15T08:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z',
    },
  ];

  const dirUsers: DirectoryUser[] = [
    {
      id: 'dir-1',
      employeeCode: 'EMP-001',
      email: 'admin@youngonevn.com',
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      departmentId: 'dept-1',
      positionId: 'pos-1',
      organizationId: 'org-1',
      status: 'ACTIVE' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      assignedAssetsCount: 0,
      assignedLicensesCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const roles: Role[] = [{ id: 'role-1', name: 'Super Admin', isSystem: true, permissions: [] }];

  const groups: DirectoryGroup[] = [];

  return {
    mockAppUsers: appUsers,
    mockDirectoryUsers: dirUsers,
    mockRoles: roles,
    mockGroups: groups,
  };
});

vi.mock('../../services/users.service', () => ({
  usersService: {
    getUsers: vi.fn().mockResolvedValue({
      items: mockAppUsers,
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }),
    getStats: vi.fn().mockResolvedValue({
      totalUsers: 1,
      activeUsers: 1,
      adminUsers: 1,
      lockedUsers: 0,
      suspendedUsers: 0,
      recentActiveCount: 1,
    }),
  },
}));

vi.mock('../../services/roles.service', () => ({
  rolesService: {
    getRoles: vi.fn().mockResolvedValue(mockRoles),
    getStats: vi.fn().mockResolvedValue({ totalRoles: 1, systemRoles: 1, customRoles: 0 }),
    getCatalog: vi.fn().mockResolvedValue([]),
    getRole: vi.fn().mockResolvedValue(mockRoles[0]),
  },
}));

vi.mock('../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({
      items: mockDirectoryUsers,
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    }),
    getGroups: vi.fn().mockResolvedValue(mockGroups),
    getStats: vi.fn().mockResolvedValue({
      totalEmployees: 1,
      activeEmployees: 1,
      assignedWorkstations: 0,
      totalGroups: 0,
      closedAccounts: 0,
    }),
  },
}));

vi.mock('../../services/access-control.service', () => ({
  accessControlService: {
    getStats: vi.fn().mockResolvedValue({
      totalDoors: 8,
      activeDoors: 7,
      maintenanceDoors: 1,
      totalNonADUsers: 5,
      activeNonADUsers: 4,
      directoryUserAssignments: 6,
      activeAssignments: 10,
      expiringAssignments: 2,
      totalScans: 4,
    }),
    getDoors: vi.fn().mockResolvedValue([]),
    getUsersMatrix: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getDocumentScans: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  },
}));

describe('Empirical Challenger: Router Resilience & PageLoader Spinners', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    useAuthStore.setState({
      token: 'valid-session-jwt-2026',
      user: {
        id: 'usr-admin',
        email: 'admin@uims.internal',
        name: 'Super Admin',
        role: 'Super Admin',
      },
      permissions: ['User:read', 'Directory:read', 'Asset:read', 'License:read'],
    });
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    container.remove();
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer-root')
      .forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  const renderWithRouter = async (initialEntries: string[]) => {
    const memRouter = createMemoryRouter(router.routes, { initialEntries });
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(RouterProvider, { router: memRouter })),
        ),
      );
    });
    // Flush microtasks and lazy component dynamic imports
    for (let i = 0; i < 30; i++) {
      if (
        container.textContent &&
        !container.textContent.includes('Loading Users...') &&
        !container.textContent.includes('Loading Directory...') &&
        !container.textContent.includes('Loading Access Control...')
      ) {
        break;
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
    }
    return { root, memRouter };
  };

  describe('1. Router Redirect Invariants (/access -> /access-control)', () => {
    it('empirically verifies navigating to /access successfully redirects to /access-control', async () => {
      const { memRouter } = await renderWithRouter(['/access']);

      // 1. Router state must reflect redirected canonical path /access-control
      expect(memRouter.state.location.pathname).toBe('/access-control');

      // 2. DOM text must contain target Access Control view and not white screen
      expect(container.textContent).toContain('Access Control');
    });

    it('empirically verifies navigating to /access-control successfully mounts access-control route', async () => {
      const { memRouter } = await renderWithRouter(['/access-control']);

      expect(memRouter.state.location.pathname).toBe('/access-control');
      expect(container.textContent).toContain('Access Control');
    });

    it('empirically verifies navigating to /dashboard successfully redirects to /', async () => {
      const { memRouter } = await renderWithRouter(['/dashboard']);

      expect(memRouter.state.location.pathname).toBe('/');
    });
  });

  describe('2. Suspense PageLoader Spinners Resilience', () => {
    // The 7 simplified PageLoader suspense tips modified in router.tsx
    const simplifiedTips = [
      'Loading Assets...',
      'Loading Licenses...',
      'Loading Directory...',
      'Loading Organization...',
      'Loading Audit...',
      'Loading Audit...',
      'Loading Reports...',
    ];

    it.each(simplifiedTips)(
      'renders PageLoader with tip "%s" without crashing under native AntD v6 ConfigProvider',
      async (tip) => {
        const root = createRoot(container);
        currentRoot = root;

        await act(async () => {
          root.render(
            createElement(
              ConfigProvider,
              null,
              createElement(App, null, createElement(PageLoader, { tip })),
            ),
          );
        });

        // Verify Spin component is rendered
        const spinEl = container.querySelector('.ant-spin');
        expect(spinEl).not.toBeNull();
        expect(spinEl?.classList.contains('ant-spin-lg')).toBe(true);

        // Verify tip text is rendered and matches exactly
        const textEl = container.querySelector('.ant-typography');
        expect(textEl).not.toBeNull();
        expect(textEl?.textContent).toBe(tip);
      },
    );

    it('renders all 7 PageLoader suspense spinners concurrently in an adversarial grid without DOM collision', async () => {
      const root = createRoot(container);
      currentRoot = root;

      const loaders = simplifiedTips.map((tip, idx) =>
        createElement(PageLoader, { key: `loader-${idx}`, tip }),
      );

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(App, null, createElement('div', { id: 'loader-grid' }, loaders)),
          ),
        );
      });

      const spins = container.querySelectorAll('.ant-spin');
      expect(spins.length).toBe(7);

      const typographyElements = container.querySelectorAll('#loader-grid .ant-typography');
      expect(typographyElements.length).toBe(7);

      const renderedTexts = Array.from(typographyElements).map((el) => el.textContent);
      expect(renderedTexts).toEqual(simplifiedTips);
    });

    it('renders PageLoader with default fallback when tip is undefined', async () => {
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(App, null, createElement(PageLoader, {})),
          ),
        );
      });

      const textEl = container.querySelector('.ant-typography');
      expect(textEl?.textContent).toBe('Loading workspace...');
    });
  });
});
