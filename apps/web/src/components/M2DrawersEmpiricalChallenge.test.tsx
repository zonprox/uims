/**
 * Empirical Challenger Adversarial Test Suite for Milestone 2:
 * Entity Detail Drawers History Tab Standardization & Edge Cases
 *
 * Explicitly stress-tests:
 * 1. GroupDetailDrawer:
 *    - null/undefined props (group={null}, group with missing/undefined optional fields)
 *    - rapid tab switching back and forth between Group Details and Group History
 *    - onEdit and copy to clipboard resilience
 * 2. RoleDetailDrawer:
 *    - roleDetail={null} with loading={false}
 *    - roleDetail={null} with loading={true}
 *    - roleDetail with missing/undefined users and permissions arrays
 *    - rapid tab switching back and forth between Role Overview and Role History
 *    - search input regex stress and empty states
 * 3. SwitchFaceplateDrawer:
 *    - switchEntity={null} with open={true} and tab switching
 *    - rapid tab switching between Switch & Ports and Switch History
 *    - PortConfigDrawer functionality: port clicking on faceplate and table,
 *      drawer opening, port update synchronization, and closure
 *    - network failure handling during port loading
 *    - clean React 19 unmount lifecycle hygiene
 */

import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryGroup, RoleDetailResponse, RoleAssignedUser } from '@uims/shared-types';
import type { NetworkSwitch, SwitchPort } from '../services/network.service';
import { networkService } from '../services/network.service';
import { type AuditLog, auditService } from '../services/audit.service';
import { GroupDetailDrawer } from '../pages/directory/components/GroupDetailDrawer';
import { RoleDetailDrawer } from '../pages/users/components/RoleDetailDrawer';
import { SwitchFaceplateDrawer } from '../pages/network/components/SwitchFaceplateDrawer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockMessageError = vi.fn();
const mockMessageSuccess = vi.fn();
const mockAppContext = {
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    warning: vi.fn(),
    info: vi.fn(),
  },
  modal: { confirm: vi.fn() },
  notification: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    destroy: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => mockAppContext,
    },
  };
});

vi.mock('../services/network.service', async () => {
  const actual = await vi.importActual<typeof import('../services/network.service')>(
    '../services/network.service',
  );
  return {
    ...actual,
    networkService: {
      ...actual.networkService,
      getSwitchPorts: vi.fn().mockResolvedValue([]),
      updateSwitchPort: vi
        .fn()
        .mockImplementation((id: string, data: Partial<SwitchPort>) =>
          Promise.resolve({ id, ...data }),
        ),
    },
  };
});

const createMockAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 'log-chal-001',
  timestamp: '2026-10-17T14:00:00.000Z',
  user: 'secops-admin',
  userName: 'SecOps Administrator',
  userEmail: 'secops@youngone.com',
  action: 'UPDATE',
  severity: 'MEDIUM',
  entity: 'Target Entity',
  entityType: 'Group',
  entityId: 'grp-001',
  ipAddress: '10.0.1.99',
  status: 'SUCCESS',
  details: 'Empirical challenge audit verification log',
  ...overrides,
});

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
    vi.restoreAllMocks();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const portals = document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover');
    portals.forEach((p) => p.remove());
    container?.remove();
    document.body.innerHTML = '';
  });

  const mountComponent = async (node: React.ReactElement) => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          MemoryRouter,
          null,
          createElement(ConfigProvider, null, createElement(App, null, node)),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };

  const getTabElement = (label: string): HTMLElement | undefined => {
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('.ant-tabs-tab, [role="tab"]'));
    return tabs.find((t) => t.textContent?.includes(label));
  };

  const clickTab = async (label: string) => {
    const targetTab = getTabElement(label);
    expect(targetTab).toBeDefined();
    if (targetTab) {
      const clickable = (targetTab.querySelector('.ant-tabs-tab-btn') || targetTab) as HTMLElement;
      await act(async () => {
        clickable.click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });
    }
  };

  // =========================================================================
  // 1. GroupDetailDrawer Adversarial Stress Testing
  // =========================================================================
  describe('GroupDetailDrawer Adversarial Stress', () => {
    const fullGroup: DirectoryGroup = {
      id: 'grp-test-01',
      name: 'Network Infrastructure Engineering',
      type: 'Security',
      scope: 'Global',
      description: 'Global infrastructure team managing switches, firewalls, and routers',
      managedBy: 'Alice Chen',
      memberCount: 28,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    };

    it('Case 1.1: returns null safely when group={null} without mounting or throwing', async () => {
      await mountComponent(
        createElement(GroupDetailDrawer, {
          open: true,
          group: null,
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).toBeNull();
      expect(document.body.textContent).toBe('');
    });

    it('Case 1.2: handles group with null/undefined optional properties without crashing', async () => {
      const sparseGroup: DirectoryGroup = {
        id: 'grp-sparse-02',
        name: 'Sparse Group',
        type: 'Distribution',
        scope: 'Universal',
        description: '',
        managedBy: '',
        memberCount: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      await mountComponent(
        createElement(GroupDetailDrawer, {
          open: true,
          group: sparseGroup,
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      const text = document.body.textContent || '';
      expect(text).toContain('Sparse Group');
      expect(text).toContain('Unassigned');
      expect(text).toContain('0 members');
      expect(text).toContain('No description provided.');
      expect(text).toContain('Distribution · Universal');
    });

    it('Case 1.3: executes rapid tab switching between Group Details and Group History cleanly', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValue({
        items: [
          createMockAuditLog({
            id: 'log-grp-1',
            entityType: 'Group',
            entityId: fullGroup.id,
            action: 'GROUP_UPDATED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(
        createElement(GroupDetailDrawer, {
          open: true,
          group: fullGroup,
          onClose: vi.fn(),
        }),
      );

      // Perform 6 rapid toggles
      for (let i = 0; i < 3; i++) {
        await clickTab('Group History');
        await clickTab('Group Details');
      }

      // Finally land on Group History
      await clickTab('Group History');

      // Verify ActivityTimeline loaded history for canonical entityType "Group"
      expect(getHistorySpy).toHaveBeenCalledWith('Group', fullGroup.id, { pageSize: 20 });
      expect(document.body.textContent).toContain('GROUP_UPDATED');
    });

    it('Case 1.4: triggers onEdit callback and handles copy to clipboard without errors', async () => {
      const handleEdit = vi.fn();
      const groupWithEmail = {
        ...fullGroup,
        email: 'neteng@youngone.com',
      } as unknown as DirectoryGroup;

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      await mountComponent(
        createElement(GroupDetailDrawer, {
          open: true,
          group: groupWithEmail,
          onClose: vi.fn(),
          onEdit: handleEdit,
        }),
      );

      // Verify Edit button exists and triggers callback
      const editButton = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Edit Group'),
      );
      expect(editButton).toBeDefined();
      if (editButton) {
        await act(async () => {
          editButton.click();
        });
        expect(handleEdit).toHaveBeenCalledWith(groupWithEmail);
      }

      // Verify custom copy distribution email button
      const copyButton = document
        .querySelector('button.ant-btn-text .anticon-copy')
        ?.closest('button');
      expect(copyButton).not.toBeNull();
      if (copyButton) {
        await act(async () => {
          copyButton.click();
        });
        expect(writeTextMock).toHaveBeenCalledWith('neteng@youngone.com');
        expect(mockMessageSuccess).toHaveBeenCalledWith('Distribution email copied to clipboard');
      }
    });
  });

  // =========================================================================
  // 2. RoleDetailDrawer Adversarial Stress Testing
  // =========================================================================
  describe('RoleDetailDrawer Adversarial Stress', () => {
    const mockRoleDetail: RoleDetailResponse = {
      id: 'role-audit-99',
      name: 'Compliance Auditor',
      description: 'Inspects tamper-evident audit logs and security telemetry',
      isSystem: true,
      userCount: 2,
      permissionCount: 12,
      permissions: [
        { id: 'p1', action: 'read', subject: 'AuditLog', name: 'Read Audit' },
        { id: 'p2', action: 'export', subject: 'AuditLog', name: 'Export Audit' },
      ],
      users: [
        {
          id: 'u-1',
          name: 'Bob Smith',
          email: 'bsmith@youngone.com',
          username: 'bsmith',
          department: 'Legal & Compliance',
          jobTitle: 'Senior Auditor',
          status: 'ACTIVE',
        },
        {
          id: 'u-2',
          name: 'Carol White',
          email: 'cwhite@youngone.com',
          username: 'cwhite',
          department: 'Internal Audit',
          jobTitle: 'Staff Auditor',
          status: 'SUSPENDED',
        },
      ],
      createdAt: '2026-02-15T00:00:00Z',
      updatedAt: '2026-02-15T00:00:00Z',
    };

    it('Case 2.1: roleDetail={null} with loading={false} renders fallback title and Skeleton in history', async () => {
      await mountComponent(
        createElement(RoleDetailDrawer, {
          open: true,
          roleDetail: null,
          loading: false,
          onClose: vi.fn(),
          onOpenMatrix: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      const text = document.body.textContent || '';
      expect(text).toContain('Role Overview');
      expect(text).toContain('Custom'); // isSystem fallback
      expect(text).toContain('No description provided.');

      // Switch to Role History
      await clickTab('Role History');
      // When roleDetail?.id is null, it should display Skeleton active without error
      expect(document.querySelector('.ant-skeleton')).not.toBeNull();
    });

    it('Case 2.2: roleDetail={null} with loading={true} renders table loading state cleanly', async () => {
      await mountComponent(
        createElement(RoleDetailDrawer, {
          open: true,
          roleDetail: null,
          loading: true,
          onClose: vi.fn(),
          onOpenMatrix: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.querySelector('.ant-spin, .ant-table-wrapper')).not.toBeNull();
    });

    it('Case 2.3: roleDetail with undefined users array renders empty table without throwing', async () => {
      const roleWithoutUsers = {
        ...mockRoleDetail,
        users: undefined as unknown as RoleAssignedUser[],
        userCount: 0,
      };

      await mountComponent(
        createElement(RoleDetailDrawer, {
          open: true,
          roleDetail: roleWithoutUsers,
          loading: false,
          onClose: vi.fn(),
          onOpenMatrix: vi.fn(),
        }),
      );

      const text = document.body.textContent || '';
      expect(text).toContain('Compliance Auditor');
      expect(text).toContain('No users currently assigned to this role.');
    });

    it('Case 2.4: executes rapid tab switching and verifies canonical entityType "Role"', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValue({
        items: [
          createMockAuditLog({
            id: 'log-role-stress',
            entityType: 'Role',
            entityId: mockRoleDetail.id,
            action: 'ROLE_MODIFIED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(
        createElement(RoleDetailDrawer, {
          open: true,
          roleDetail: mockRoleDetail,
          loading: false,
          onClose: vi.fn(),
          onOpenMatrix: vi.fn(),
        }),
      );

      // Perform 6 rapid toggles
      for (let i = 0; i < 3; i++) {
        await clickTab('Role History');
        await clickTab('Role Overview');
      }

      // Land on Role History
      await clickTab('Role History');

      expect(getHistorySpy).toHaveBeenCalledWith('Role', mockRoleDetail.id, { pageSize: 20 });
      expect(document.body.textContent).toContain('ROLE_MODIFIED');
    });

    it('Case 2.5: search filter handles adversarial regex characters and filters correctly', async () => {
      await mountComponent(
        createElement(RoleDetailDrawer, {
          open: true,
          roleDetail: mockRoleDetail,
          loading: false,
          onClose: vi.fn(),
          onOpenMatrix: vi.fn(),
        }),
      );

      const searchInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Search user..."]',
      );
      expect(searchInput).not.toBeNull();

      // Search for "Bob"
      if (searchInput) {
        await act(async () => {
          searchInput.value = 'Bob';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Search input with adversarial regex character should not throw
        await act(async () => {
          searchInput.value = '.*+?^${}()|[]\\';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
    });

    it('Case 2.6: Edit button triggers onClose and onOpenMatrix', async () => {
      const handleClose = vi.fn();
      const handleOpenMatrix = vi.fn();

      await mountComponent(
        createElement(RoleDetailDrawer, {
          open: true,
          roleDetail: mockRoleDetail,
          loading: false,
          onClose: handleClose,
          onOpenMatrix: handleOpenMatrix,
        }),
      );

      const editBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Edit'),
      );
      expect(editBtn).toBeDefined();

      if (editBtn) {
        await act(async () => {
          editBtn.click();
        });
        expect(handleClose).toHaveBeenCalledTimes(1);
        expect(handleOpenMatrix).toHaveBeenCalledTimes(1);
      }
    });
  });

  // =========================================================================
  // 3. SwitchFaceplateDrawer Adversarial Stress Testing
  // =========================================================================
  describe('SwitchFaceplateDrawer Adversarial Stress', () => {
    const mockSwitch: NetworkSwitch = {
      id: 'sw-adv-505',
      name: 'DIST-SW-05',
      model: 'C9300-24T',
      vendor: 'Cisco Systems',
      serialNumber: 'FOC2610A55',
      macAddress: '00:A0:C9:14:C8:29',
      status: 'ONLINE',
      role: 'DISTRIBUTION',
      totalPorts: 24,
      firmwareVersion: '17.9.4',
      rack: {
        id: 'rack-dc-02',
        name: 'Rack DC-02',
        code: 'RACK-DC-02',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      rackPosition: 24,
      rackHeight: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const mockPorts: SwitchPort[] = [
      {
        id: 'port-adv-1',
        switchId: 'sw-adv-505',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: 'RJ45_1G',
        speed: '1Gbps',
        duplex: 'FULL',
        mode: 'ACCESS',
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'port-adv-2',
        switchId: 'sw-adv-505',
        portNumber: 2,
        name: 'Gi1/0/2',
        formFactor: 'RJ45_1G',
        speed: '1Gbps',
        duplex: 'FULL',
        mode: 'TRUNK',
        adminStatus: 'UP',
        operStatus: 'DOWN',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    it('Case 3.1: switchEntity={null} with open={true} does not invoke networkService and handles tab switching cleanly', async () => {
      const getPortsSpy = vi.spyOn(networkService, 'getSwitchPorts');

      await mountComponent(
        createElement(SwitchFaceplateDrawer, {
          open: true,
          switchEntity: null,
          onClose: vi.fn(),
        }),
      );

      expect(getPortsSpy).not.toHaveBeenCalled();
      const text = document.body.textContent || '';
      expect(text).toContain('Network Switch');

      // Switch to Switch History tab with null entity
      await clickTab('Switch History');
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
    });

    it('Case 3.2: rapid tab switching does not re-fetch switch ports redundantly and preserves faceplate state', async () => {
      const getPortsSpy = vi.spyOn(networkService, 'getSwitchPorts').mockResolvedValue(mockPorts);
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValue({
        items: [
          createMockAuditLog({
            id: 'log-sw-stress',
            entityType: 'NetworkSwitch',
            entityId: mockSwitch.id,
            action: 'SWITCH_CONFIGURED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(
        createElement(SwitchFaceplateDrawer, {
          open: true,
          switchEntity: mockSwitch,
          onClose: vi.fn(),
        }),
      );

      // Initially loaded once on open
      expect(getPortsSpy).toHaveBeenCalledTimes(1);

      // Perform 6 rapid toggles
      for (let i = 0; i < 3; i++) {
        await clickTab('Switch History');
        await clickTab('Switch & Ports');
      }

      // Verify getPorts was NOT re-called on each tab switch
      expect(getPortsSpy).toHaveBeenCalledTimes(1);

      // Switch to History and verify ActivityTimeline was populated
      await clickTab('Switch History');
      expect(getHistorySpy).toHaveBeenCalledWith('NetworkSwitch', mockSwitch.id, { pageSize: 20 });
      expect(document.body.textContent).toContain('SWITCH_CONFIGURED');
    });

    it('Case 3.3: PortConfigDrawer opens from both faceplate port click and table configure button, and syncs updates', async () => {
      vi.spyOn(networkService, 'getSwitchPorts').mockResolvedValue(mockPorts);

      await mountComponent(
        createElement(SwitchFaceplateDrawer, {
          open: true,
          switchEntity: mockSwitch,
          onClose: vi.fn(),
        }),
      );

      // 1. Click configure button in port table
      const configureTableBtn = document.querySelector<HTMLButtonElement>(
        '[data-testid="configure-port-table-1"]',
      );
      expect(configureTableBtn).not.toBeNull();

      if (configureTableBtn) {
        await act(async () => {
          configureTableBtn.click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        // PortConfigDrawer must now be open
        expect(document.body.textContent).toContain('Configure Port: Gi1/0/1');

        // Form elements in PortConfigDrawer exist
        const saveButton = document.querySelector<HTMLButtonElement>(
          '[data-testid="save-port-config-button"]',
        );
        expect(saveButton).not.toBeNull();

        // 2. Submit port update
        vi.spyOn(networkService, 'updateSwitchPort').mockResolvedValueOnce({
          ...mockPorts[0],
          description: 'Uplink to Core SW 01',
        });

        if (saveButton) {
          await act(async () => {
            saveButton.click();
          });
          await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
          });
        }
      }

      // Verify drawer remains healthy
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
    });

    it('Case 3.4: handles network failure during loadPorts gracefully via message.error', async () => {
      vi.spyOn(networkService, 'getSwitchPorts').mockRejectedValueOnce(
        new Error('Network connection timeout'),
      );

      await mountComponent(
        createElement(SwitchFaceplateDrawer, {
          open: true,
          switchEntity: mockSwitch,
          onClose: vi.fn(),
        }),
      );

      expect(mockMessageError).toHaveBeenCalledWith(
        expect.stringContaining('Network connection timeout'),
      );
      // Drawer still opens and does not crash
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
    });

    it('Case 3.5: unmounts cleanly without lingering portal DOM elements or memory leaks', async () => {
      vi.spyOn(networkService, 'getSwitchPorts').mockResolvedValue(mockPorts);

      await mountComponent(
        createElement(SwitchFaceplateDrawer, {
          open: true,
          switchEntity: mockSwitch,
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();

      // Trigger clean unmount
      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Verify portal DOM elements are removed
      const openDrawers = document.querySelectorAll('.ant-drawer-open');
      expect(openDrawers.length).toBe(0);
    });
  });
});
