import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AppUser,
  type Role,
  type RoleSummaryStats,
  type UserSummaryStats,
  UserStatus,
} from '@uims/shared-types';
import AccessControlPage from './AccessControlPage';
import { RolesTab } from '../users/components/RolesTab';
import { AssetFilterBar } from '../assets/components/AssetFilterBar';
import { usersService } from '../../services/users.service';
import { rolesService } from '../../services/roles.service';
import { organizationService } from '../../services/organization.service';

// Mock message dispatch with reference-stable instance
const mockMessageError = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageWarning = vi.fn();

const stableAppInstance = {
  message: {
    error: mockMessageError,
    success: mockMessageSuccess,
    warning: mockMessageWarning,
    info: vi.fn(),
    loading: vi.fn(),
    open: vi.fn(),
    destroy: vi.fn(),
  },
  notification: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    open: vi.fn(),
    destroy: vi.fn(),
  },
  modal: {
    confirm: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => stableAppInstance,
    },
  };
});

// Mock services
vi.mock('../../services/users.service', () => ({
  usersService: {
    getUsers: vi.fn(),
    getStats: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    toggleLock: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('../../services/roles.service', () => ({
  rolesService: {
    getRoles: vi.fn(),
    getStats: vi.fn(),
    getCatalog: vi.fn(),
    getRole: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    cloneRole: vi.fn(),
    syncPermissions: vi.fn(),
  },
}));

vi.mock('../../services/organization.service', () => ({
  organizationService: {
    getLocationTree: vi.fn(),
    getLocations: vi.fn(),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Milestone 2 Empirical Challenger Adversarial Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

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
    container.remove();
    document.body.innerHTML = '';
  });

  const renderWithProviders = async (node: React.ReactElement) => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(ConfigProvider, null, createElement(App, null, node)),
        ),
      );
    });
    // Allow microtasks & async state updates to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    return root;
  };

  // =========================================================================
  // MISSION ITEM 1: AccessControlPage & Stats Rendering / Type Stability
  // =========================================================================
  describe('1. AccessControlPage Stats & Type Structure Verification', () => {
    const sampleUsers: AppUser[] = [
      {
        id: 'usr-1',
        username: 'alice',
        email: 'alice@bsl.internal',
        firstName: 'Alice',
        lastName: 'Security',
        displayName: 'Alice Security',
        status: UserStatus.ACTIVE,
        isLocked: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'usr-2',
        username: 'bob',
        email: 'bob@bsl.internal',
        firstName: 'Bob',
        lastName: 'Locked',
        displayName: 'Bob Locked',
        status: UserStatus.ACTIVE,
        isLocked: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const sampleRoles: Role[] = [
      { id: 'r-1', name: 'Super Admin', isSystem: true, permissions: [] },
      { id: 'r-2', name: 'Fleet Operator', isSystem: false, permissions: [] },
    ];

    it('empirically verifies stats rendering with unwrapped UserSummaryStats API payload', async () => {
      const mockStatsPayload: UserSummaryStats = {
        totalUsers: 142,
        activeUsers: 125,
        adminUsers: 10,
        lockedUsers: 17,
        suspendedUsers: 0,
        recentActiveCount: 125,
      };

      const mockRoleStatsPayload: RoleSummaryStats = {
        totalRoles: 8,
        systemRolesCount: 5,
        customRolesCount: 3,
        totalPermissionsCount: 64,
        superAdminsCount: 3,
        assignedUsersCoverage: 92,
      };

      vi.mocked(usersService.getUsers).mockResolvedValue({
        items: sampleUsers,
        total: sampleUsers.length,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      vi.mocked(usersService.getStats).mockResolvedValue(mockStatsPayload);
      vi.mocked(rolesService.getRoles).mockResolvedValue(sampleRoles);
      vi.mocked(rolesService.getCatalog).mockResolvedValue([]);
      vi.mocked(rolesService.getStats).mockResolvedValue(mockRoleStatsPayload);

      await renderWithProviders(createElement(AccessControlPage));

      const text = container.textContent || '';
      // Verify stats values derived from mockStatsPayload
      expect(text).toContain('Total Accounts');
      expect(text).toContain('142');
      expect(text).toContain('Active Accounts');
      expect(text).toContain('125');
      expect(text).toContain('Locked Accounts');
      expect(text).toContain('17');
      expect(text).toContain('System Roles');
      expect(text).toContain('2'); // roles.length = 2

      // Verify that no runtime error occurred due to undefined property access
      expect(mockMessageError).not.toHaveBeenCalled();
    });

    it('empirically verifies type fix: unwrapped API payload without .data does not throw undefined property error', async () => {
      // In strict mode, usersService.getStats() returns UserSummaryStats.
      // Prior bug tried to access statsRes?.data which is undefined at runtime and a compiler error in TS strict mode.
      const unwrappedStats: UserSummaryStats = {
        totalUsers: 99,
        activeUsers: 85,
        adminUsers: 5,
        lockedUsers: 14,
        suspendedUsers: 0,
        recentActiveCount: 85,
      };

      // Ensure that unwrappedStats does NOT have a .data property
      expect((unwrappedStats as unknown as { data?: unknown }).data).toBeUndefined();

      vi.mocked(usersService.getUsers).mockResolvedValue({
        items: sampleUsers,
        total: sampleUsers.length,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      vi.mocked(usersService.getStats).mockResolvedValue(unwrappedStats);
      vi.mocked(rolesService.getRoles).mockResolvedValue(sampleRoles);
      vi.mocked(rolesService.getCatalog).mockResolvedValue([]);
      vi.mocked(rolesService.getStats).mockResolvedValue({
        totalRoles: 2,
        systemRolesCount: 2,
        customRolesCount: 0,
        totalPermissionsCount: 50,
        superAdminsCount: 1,
        assignedUsersCoverage: 100,
      });

      await renderWithProviders(createElement(AccessControlPage));

      const text = container.textContent || '';
      expect(text).toContain('99');
      expect(text).toContain('85');
      expect(text).toContain('14');
    });

    it('empirically verifies graceful fallback when getStats rejects (null stats)', async () => {
      vi.mocked(usersService.getUsers).mockResolvedValue({
        items: sampleUsers,
        total: sampleUsers.length,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      // Simulate API endpoint failure caught in Promise.all
      vi.mocked(usersService.getStats).mockRejectedValue(new Error('Network offline 503'));
      vi.mocked(rolesService.getRoles).mockResolvedValue(sampleRoles);
      vi.mocked(rolesService.getCatalog).mockResolvedValue([]);
      vi.mocked(rolesService.getStats).mockRejectedValue(new Error('Roles stats 503'));

      await renderWithProviders(createElement(AccessControlPage));

      const text = container.textContent || '';
      // When stats is null, it falls back to users array metrics:
      // totalUsers = users.length (2)
      // activeUsers = 2 (both sample users are ACTIVE)
      // lockedUsers = 1 (Bob is locked)
      // systemRoles = roles.length (2)
      expect(text).toContain('Total Accounts');
      expect(text).toContain('Active Accounts');
      expect(text).toContain('Locked Accounts');
      expect(text).toContain('System Roles');
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('undefined');
    });

    it('empirically verifies RolesTab renders RoleSummaryStats accurately without undefined runtime errors', async () => {
      const mockRolesStats: RoleSummaryStats = {
        totalRoles: 11,
        systemRolesCount: 6,
        customRolesCount: 5,
        totalPermissionsCount: 78,
        superAdminsCount: 4,
        assignedUsersCoverage: 96,
      };

      await renderWithProviders(
        createElement(RolesTab, {
          roles: sampleRoles,
          stats: mockRolesStats,
          catalog: [],
          users: sampleUsers,
          loading: false,
          onRefresh: vi.fn(),
        }),
      );

      const text = container.textContent || '';
      expect(text).toContain('11'); // totalRoles
      expect(text).toContain('6'); // systemRolesCount
      expect(text).toContain('5'); // customRolesCount
      expect(text).toContain('78'); // totalPermissionsCount
      expect(text).toContain('4'); // superAdminsCount
      expect(text).toContain('96%'); // assignedUsersCoverage
    });

    it('empirically verifies RolesTab graceful fallback when stats is null', async () => {
      await renderWithProviders(
        createElement(RolesTab, {
          roles: sampleRoles,
          stats: null,
          catalog: [],
          users: sampleUsers,
          loading: false,
          onRefresh: vi.fn(),
        }),
      );

      const text = container.textContent || '';
      // Fallbacks in RolesTab:
      // stats?.totalRoles ?? roles.length => 2
      // stats?.systemRolesCount ?? 6 => 6
      // stats?.customRolesCount ?? 0 => 0
      // stats?.totalPermissionsCount ?? 52 => 52
      // stats?.superAdminsCount ?? 2 => 2
      // stats?.assignedUsersCoverage ?? 100 => 100%
      expect(text).toContain('2');
      expect(text).toContain('6');
      expect(text).toContain('52');
      expect(text).toContain('100%');
      expect(text).not.toContain('NaN');
    });
  });

  // =========================================================================
  // MISSION ITEM 2: AssetFilterBar Error Feedback Behavior on Catch
  // =========================================================================
  describe('2. AssetFilterBar Catch & Feedback Behavior', () => {
    it('dispatches message.error when both getLocationTree and getLocations fail', async () => {
      vi.mocked(organizationService.getLocationTree).mockRejectedValue(
        new Error('Location tree endpoint unreachable'),
      );
      vi.mocked(organizationService.getLocations).mockRejectedValue(
        new Error('Flat locations fallback failed'),
      );

      await renderWithProviders(
        createElement(AssetFilterBar, {
          onReset: vi.fn(),
        }),
      );

      expect(organizationService.getLocationTree).toHaveBeenCalled();
      expect(organizationService.getLocations).toHaveBeenCalled();
      expect(mockMessageError).toHaveBeenCalledWith('Failed to load locations.');
    });

    it('degrades gracefully without error toast when getLocationTree fails but getLocations succeeds', async () => {
      vi.mocked(organizationService.getLocationTree).mockRejectedValue(
        new Error('Tree query failed'),
      );
      vi.mocked(organizationService.getLocations).mockResolvedValue([
        {
          id: 'loc-1',
          name: 'Factory 1 Workshop',
          code: 'F1-WS',
          type: 'WORKSHOP',
          organizationId: 'org-1',
        },
      ]);

      await renderWithProviders(
        createElement(AssetFilterBar, {
          onReset: vi.fn(),
        }),
      );

      expect(organizationService.getLocationTree).toHaveBeenCalled();
      expect(organizationService.getLocations).toHaveBeenCalled();
      // No error message should be displayed because fallback succeeded!
      expect(mockMessageError).not.toHaveBeenCalled();
    });

    it('does not dispatch error toast when getLocationTree succeeds normally', async () => {
      vi.mocked(organizationService.getLocationTree).mockResolvedValue([
        {
          id: 'loc-root',
          key: 'loc-root',
          value: 'loc-root',
          title: 'BSL Plant Campus',
          label: 'BSL Plant Campus',
          name: 'BSL Plant Campus',
          fullPath: 'BSL Plant Campus',
          type: 'CAMPUS',
          organizationId: 'org-1',
          children: [],
        },
      ]);

      await renderWithProviders(
        createElement(AssetFilterBar, {
          onReset: vi.fn(),
        }),
      );

      expect(organizationService.getLocationTree).toHaveBeenCalled();
      expect(organizationService.getLocations).not.toHaveBeenCalled();
      expect(mockMessageError).not.toHaveBeenCalled();
    });

    it('protects against unmounted state updates and error toasts when unmounted mid-flight', async () => {
      let rejectTree: (err: unknown) => void = () => {};
      let rejectFallback: (err: unknown) => void = () => {};

      vi.mocked(organizationService.getLocationTree).mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectTree = reject;
          }),
      );
      vi.mocked(organizationService.getLocations).mockImplementation(
        () =>
          new Promise((_, reject) => {
            rejectFallback = reject;
          }),
      );

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(AssetFilterBar, {
                onReset: vi.fn(),
              }),
            ),
          ),
        );
      });

      // Unmount the component while request is still pending
      await act(async () => {
        root.unmount();
        currentRoot = null;
      });

      // Now reject both promises after unmount
      await act(async () => {
        rejectTree(new Error('Late network drop'));
        rejectFallback(new Error('Late fallback drop'));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Because mounted flag was set to false on cleanup, no message.error should be triggered
      expect(mockMessageError).not.toHaveBeenCalled();
    });

    it('re-triggers location fetch and handles failure when orgFilter changes', async () => {
      vi.mocked(organizationService.getLocationTree).mockResolvedValue([]);

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(AssetFilterBar, {
                orgFilter: 'org-bsl',
                onReset: vi.fn(),
              }),
            ),
          ),
        );
      });

      // Await microtasks to let useEffect trigger
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(organizationService.getLocationTree).toHaveBeenCalledWith('org-bsl');

      // Now change orgFilter to another org where request fails
      vi.mocked(organizationService.getLocationTree).mockRejectedValue(
        new Error('Org tree not found'),
      );
      vi.mocked(organizationService.getLocations).mockRejectedValue(
        new Error('Org fallback not found'),
      );

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(AssetFilterBar, {
                orgFilter: 'org-hcm',
                onReset: vi.fn(),
              }),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(organizationService.getLocationTree).toHaveBeenCalledWith('org-hcm');
      expect(mockMessageError).toHaveBeenCalledWith('Failed to load locations.');
    });
  });
});
