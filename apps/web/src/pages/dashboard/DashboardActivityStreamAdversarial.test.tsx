import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type DashboardOverview, dashboardService } from '../../services/dashboard.service';
import DashboardPage, { buildAuditDeepLink } from './DashboardPage';

const mockNavigate = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();

const adversarialDashboardData: DashboardOverview = {
  kpi: {
    managedAssets: {
      total: 50,
      active: 40,
      growthMoM: '+5.0%',
      inUse: 40,
      inStock: 8,
      inRepair: 2,
      decommissioned: 0,
    },
    licenses: {
      total: 10,
      totalSeats: 100,
      usedSeats: 80,
      seatUsagePercent: '80.0%',
      expiringCount: 1,
    },
    inventory: {
      totalItems: 30,
      lowStockCount: 2,
      totalUnits: 150,
      healthyCount: 28,
    },
    ipam: {
      used: 120,
      total: 256,
      free: 136,
      usagePercent: 46.8,
    },
    audit: {
      totalEvents: 500,
      recent24h: 60,
      securityAlerts: 3,
      complianceScore: 92,
      status: 'Warning',
    },
  },
  health: {
    uptimePercent: '99.95%',
    directory: {
      name: 'LDAP',
      status: 'Synced',
      usersCount: 100,
      syncTime: 'Real-time',
      percent: 100,
    },
    mail: {
      name: 'Assets',
      status: 'Operational',
      throughput: '50 Units',
      latency: 'Normal',
      percent: 95,
    },
    vpn: {
      name: 'Network',
      status: 'Active',
      tunnels: 120,
      load: 'Normal',
      percent: 50,
    },
    backups: {
      name: 'Backups',
      status: 'Verified',
      snapshots: 'OK',
      nextRun: '00:00',
      percent: 100,
    },
  },
  recentActivity: [
    {
      key: 'act-prov-1',
      user: 'Alice Admin',
      role: 'Admin',
      avatarColor: '#1677ff',
      action: 'PROVISION_DEVICE',
      entity: 'Asset AST-8812',
      entityType: 'Asset',
      details: 'Provisioned developer workstation',
      time: '5m ago',
      linkUrl: '/assets',
    },
    {
      key: 'act-prov-2',
      user: 'Bob Manager',
      role: 'Manager',
      avatarColor: '#1677ff',
      action: 'ASSIGN_LICENSE',
      entity: 'License LIC-301',
      entityType: 'License',
      details: 'Assigned seat to Engineering staff',
      time: '12m ago',
      linkUrl: '/licenses',
    },
    {
      key: 'act-res-1',
      user: 'Charlie Tech',
      role: 'IT Tech',
      avatarColor: '#10b981',
      action: 'RESOLVE_INCIDENT',
      entity: 'Device SW-204',
      entityType: 'Network',
      details: 'Resolved port flapping on access switch',
      time: '20m ago',
      linkUrl: '/network',
    },
    {
      key: 'act-res-2',
      user: 'David Ops',
      role: 'IT Tech',
      avatarColor: '#10b981',
      action: 'PATCH_CONFIG',
      entity: 'VLAN 100',
      entityType: 'Network',
      details: 'Applied QoS configuration patch',
      time: '30m ago',
      linkUrl: '/network',
    },
    {
      key: 'act-warn-1',
      user: 'Security Sentinel',
      role: 'Auditor',
      avatarColor: '#ef4444',
      action: 'BRUTE_FORCE_ATTEMPT',
      entity: 'Authentication',
      entityType: 'Security',
      details: 'Repeated failed logins from remote IP',
      time: '45m ago',
      linkUrl: '/audit',
    },
    {
      key: 'act-warn-2',
      user: 'Monitor Probe',
      role: 'System',
      avatarColor: '#ef4444',
      action: 'ANOMALY_DETECTED',
      entity: 'Core Router RT-01',
      entityType: 'Network',
      details: 'Interface throughput spike above threshold',
      time: '50m ago',
      linkUrl: '/network',
    },
    {
      key: 'act-term-1',
      user: 'Admin Lead',
      role: 'Admin',
      avatarColor: '#dc2626',
      action: 'DECOMMISSION_SERVER',
      entity: 'Asset AST-9900',
      entityType: 'Asset',
      details: 'Decommissioned legacy blade server',
      time: '1h ago',
      linkUrl: '/assets',
    },
    {
      key: 'act-term-2',
      user: 'SecOps Lead',
      role: 'Admin',
      avatarColor: '#dc2626',
      action: 'REVOKE_ACCESS_TOKEN',
      entity: '9e76f578-8cf9-42b4-93ab-b83c48a72bf4',
      entityType: 'User',
      details: 'Revoked administrative API token for user',
      time: '2h ago',
      linkUrl: '/users',
    },
  ],
  actionItems: [],
};

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockAppInstance = {
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: {
    confirm: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  notification: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => mockAppInstance,
    },
  };
});

vi.mock('../../services/dashboard.service', () => ({
  dashboardService: {
    getOverview: vi.fn().mockImplementation(() => Promise.resolve(adversarialDashboardData)),
    getPendingHandovers: vi.fn().mockResolvedValue({
      totalPending: 0,
      overdueCount: 0,
      pendingAssignments: 0,
      pendingReturns: 0,
      pendingTransfers: 0,
      breakdownByType: { assignment: 0, return: 0 },
      records: [],
    }),
  },
}));

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: { user: { name: string; role: string } }) => unknown) =>
    selector({ user: { name: 'Adversarial Challenger', role: 'Super Admin' } }),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createMockActivity(
  partial: Partial<DashboardOverview['recentActivity'][number]>,
): DashboardOverview['recentActivity'][number] {
  return {
    key: 'mock-key',
    user: 'System',
    role: 'System',
    avatarColor: '#1677ff',
    action: 'EVENT',
    entity: 'System',
    details: 'System event',
    time: 'Just now',
    ...partial,
  };
}

describe('DashboardActivityStreamAdversarial', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover').forEach((el) => {
      el.remove();
    });
  });

  describe('Adversarial Challenge 1: Segmented Filter Transitions & Table Re-Rendering', () => {
    it('accurately filters across all 5 states (All, Provisioned, Resolved, Warning, Terminated)', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      // State 1: Default 'All' filter -> All 8 activities rendered
      expect(container.textContent).toContain('Live Activity Stream');
      expect(container.textContent).toContain('AST-8812');
      expect(container.textContent).toContain('LIC-301');
      expect(container.textContent).toContain('SW-204');
      expect(container.textContent).toContain('VLAN 100');
      expect(container.textContent).toContain('Authentication');
      expect(container.textContent).toContain('RT-01');
      expect(container.textContent).toContain('AST-9900');
      expect(container.textContent).toContain('9e76f578-8cf9-42b4-93ab-b83c48a72bf4');

      const segmentedLabels = Array.from(container.querySelectorAll('.ant-segmented-item-label'));
      const provTab = segmentedLabels.find((el) => el.textContent === 'Provisioned');
      const resTab = segmentedLabels.find((el) => el.textContent === 'Resolved');
      const warnTab = segmentedLabels.find((el) => el.textContent === 'Warning');
      const termTab = segmentedLabels.find((el) => el.textContent === 'Terminated');
      const allTab = segmentedLabels.find((el) => el.textContent === 'All');

      expect(provTab).toBeDefined();
      expect(resTab).toBeDefined();
      expect(warnTab).toBeDefined();
      expect(termTab).toBeDefined();
      expect(allTab).toBeDefined();

      // State 2: Switch to 'Provisioned'
      await act(async () => {
        (provTab as HTMLElement).click();
      });
      expect(container.textContent).toContain('AST-8812');
      expect(container.textContent).toContain('LIC-301');
      // Others must NOT be present in table rows
      expect(container.textContent).not.toContain('SW-204');
      expect(container.textContent).not.toContain('VLAN 100');
      expect(container.textContent).not.toContain('BRUTE_FORCE_ATTEMPT');
      expect(container.textContent).not.toContain('AST-9900');

      // State 3: Switch to 'Resolved'
      await act(async () => {
        (resTab as HTMLElement).click();
      });
      expect(container.textContent).toContain('SW-204');
      expect(container.textContent).toContain('VLAN 100');
      expect(container.textContent).not.toContain('AST-8812');
      expect(container.textContent).not.toContain('LIC-301');
      expect(container.textContent).not.toContain('BRUTE_FORCE_ATTEMPT');
      expect(container.textContent).not.toContain('AST-9900');

      // State 4: Switch to 'Warning'
      await act(async () => {
        (warnTab as HTMLElement).click();
      });
      expect(container.textContent).toContain('BRUTE_FORCE_ATTEMPT');
      expect(container.textContent).toContain('ANOMALY_DETECTED');
      expect(container.textContent).not.toContain('AST-8812');
      expect(container.textContent).not.toContain('SW-204');
      expect(container.textContent).not.toContain('AST-9900');

      // State 5: Switch to 'Terminated'
      await act(async () => {
        (termTab as HTMLElement).click();
      });
      expect(container.textContent).toContain('AST-9900');
      expect(container.textContent).toContain('9e76f578-8cf9-42b4-93ab-b83c48a72bf4');
      expect(container.textContent).not.toContain('AST-8812');
      expect(container.textContent).not.toContain('SW-204');
      expect(container.textContent).not.toContain('BRUTE_FORCE_ATTEMPT');

      // State 6: Switch back to 'All'
      await act(async () => {
        (allTab as HTMLElement).click();
      });
      expect(container.textContent).toContain('AST-8812');
      expect(container.textContent).toContain('SW-204');
      expect(container.textContent).toContain('BRUTE_FORCE_ATTEMPT');
      expect(container.textContent).toContain('AST-9900');

      act(() => {
        root.unmount();
      });
    });

    it('renders specific empty message when a filter matches zero activities', async () => {
      // Dataset with only Provisioned events
      const onlyProvisionedData: DashboardOverview = {
        ...adversarialDashboardData,
        recentActivity: [
          createMockActivity({
            key: 'act-1',
            user: 'Admin',
            role: 'Admin',
            avatarColor: '#1677ff',
            action: 'PROVISION_SERVER',
            entity: 'AST-1001',
            entityType: 'Asset',
            details: 'Provisioned host',
            time: 'Just now',
          }),
        ],
      };

      vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(onlyProvisionedData);

      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      const warnTab = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
        (el) => el.textContent === 'Warning',
      );
      expect(warnTab).toBeDefined();

      await act(async () => {
        (warnTab as HTMLElement).click();
      });

      expect(container.textContent).toContain('No recent activity records match filter.');

      act(() => {
        root.unmount();
      });
    });
  });

  describe('Adversarial Challenge 2: Deep-Link Generation Across Boundary Edge Cases', () => {
    it('correctly constructs audit deep links when entityType is omitted', () => {
      const url = buildAuditDeepLink(
        createMockActivity({
          key: 'evt-no-type',
          user: 'Worker',
          action: 'UPDATE',
          entity: 'Asset AST-7744',
          entityType: undefined,
          details: 'Updated asset without entityType',
          time: '3m ago',
        }),
      );
      expect(url).toBe('/audit?entityId=AST-7744&inspectId=evt-no-type');
    });

    it('correctly extracts UUIDs when entity is pure UUID without prefixes', () => {
      const uuid = 'a3b8cd90-1234-5678-abcd-ef0123456789';
      const url = buildAuditDeepLink(
        createMockActivity({
          key: 'evt-uuid',
          user: 'System Bot',
          action: 'DELETE',
          entity: uuid,
          entityType: 'User',
          details: 'Deleted user session',
          time: '1m ago',
        }),
      );
      expect(url).toBe(`/audit?entityType=User&entityId=${uuid}&inspectId=evt-uuid`);
    });

    it('handles complex entity strings with embedded hyphenated identifiers', () => {
      const url = buildAuditDeepLink(
        createMockActivity({
          key: 'evt-srv',
          user: 'DevOps',
          action: 'REBOOT',
          entity: 'Production Server (SRV-9042)',
          entityType: 'Hardware',
          details: 'Graceful reboot completed',
          time: '10m ago',
        }),
      );
      expect(url).toBe('/audit?entityType=Hardware&entityId=SRV-9042&inspectId=evt-srv');
    });

    it('handles non-alphanumeric or unstandardized entity names cleanly', () => {
      const url = buildAuditDeepLink(
        createMockActivity({
          key: 'evt-custom-name',
          user: 'Admin',
          action: 'EDIT',
          entity: 'Custom Fleet Group Delta',
          entityType: 'Group',
          details: 'Modified membership',
          time: '15m ago',
        }),
      );
      expect(url).toBe(
        '/audit?entityType=Group&entityId=Custom+Fleet+Group+Delta&inspectId=evt-custom-name',
      );
    });

    it('suppresses generic entity keywords (System, Authentication, Audit) from entityId param', () => {
      const urlSystem = buildAuditDeepLink(
        createMockActivity({
          key: 'evt-sys',
          user: 'System',
          action: 'SYNC',
          entity: 'System',
          details: 'Global cron trigger',
          time: '1m ago',
        }),
      );
      expect(urlSystem).toBe('/audit?inspectId=evt-sys');

      const urlAuth = buildAuditDeepLink(
        createMockActivity({
          key: 'evt-auth',
          user: 'Security',
          action: 'LOGIN_FAILURE',
          entity: 'Authentication',
          details: 'Bad credentials',
          time: '2m ago',
        }),
      );
      expect(urlAuth).toBe('/audit?inspectId=evt-auth');

      const urlAudit = buildAuditDeepLink(
        createMockActivity({
          key: 'evt-audit',
          user: 'Security',
          action: 'VERIFY',
          entity: 'Audit',
          details: 'Chain verification',
          time: '5m ago',
        }),
      );
      expect(urlAudit).toBe('/audit?inspectId=evt-audit');
    });

    it('handles empty, null, or undefined entities and keys gracefully without crashing', () => {
      const urlEmpty = buildAuditDeepLink(
        createMockActivity({
          key: '',
          user: 'Ghost',
          action: 'IDLE',
          entity: '',
          details: 'No entity or key',
          time: 'Now',
        }),
      );
      expect(urlEmpty).toBe('/audit');

      const urlOnlyType = buildAuditDeepLink(
        createMockActivity({
          key: '',
          user: 'Ghost',
          action: 'IDLE',
          entity: '',
          entityType: 'Inventory',
          details: 'Inventory batch run',
          time: 'Now',
        }),
      );
      expect(urlOnlyType).toBe('/audit?entityType=Inventory');
    });

    it('preserves pre-formatted /audit? query URLs unchanged', () => {
      const explicit = '/audit?entityType=Network&entityId=sub-24&inspectId=custom-123';
      const url = buildAuditDeepLink(
        createMockActivity({
          key: 'fallback-key',
          user: 'Admin',
          action: 'CUSTOM',
          linkUrl: explicit,
          time: 'Now',
        }),
      );
      expect(url).toBe(explicit);
    });

    it('handles null, undefined, or partial records with id instead of key', () => {
      expect(buildAuditDeepLink(null)).toBe('/audit');
      expect(buildAuditDeepLink(undefined)).toBe('/audit');
      expect(buildAuditDeepLink()).toBe('/audit');

      const urlWithId = buildAuditDeepLink({
        id: 'audit-log-uuid-7788',
        entity: 'AST-3301',
        entityType: 'Asset',
      });
      expect(urlWithId).toBe(
        '/audit?entityType=Asset&entityId=AST-3301&inspectId=audit-log-uuid-7788',
      );
    });
  });

  describe('Adversarial Challenge 3: Interaction Clicks & URL Navigation Parameters', () => {
    it('verifies click events on header Audit Trail, per-event Inspect buttons, and summary details text', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      // 1. Click Header "Audit Trail" button -> navigates directly to /audit
      const auditTrailBtn = container.querySelector(
        '[data-testid="dashboard-audit-trail-btn"]',
      ) as HTMLButtonElement | null;
      expect(auditTrailBtn).toBeDefined();
      expect(auditTrailBtn).not.toBeNull();

      await act(async () => {
        auditTrailBtn?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/audit');

      // 2. Click per-event "Inspect" button for AST-8812 (key: act-prov-1)
      const inspectProv1 = container.querySelector(
        '[data-testid="inspect-audit-act-prov-1"]',
      ) as HTMLButtonElement | null;
      expect(inspectProv1).toBeDefined();
      expect(inspectProv1).not.toBeNull();

      await act(async () => {
        inspectProv1?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        '/audit?entityType=Asset&entityId=AST-8812&inspectId=act-prov-1',
      );

      // 3. Click per-event "Inspect" button for UUID user token revocation (key: act-term-2)
      const inspectTerm2 = container.querySelector(
        '[data-testid="inspect-audit-act-term-2"]',
      ) as HTMLButtonElement | null;
      expect(inspectTerm2).toBeDefined();
      expect(inspectTerm2).not.toBeNull();

      await act(async () => {
        inspectTerm2?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        '/audit?entityType=User&entityId=9e76f578-8cf9-42b4-93ab-b83c48a72bf4&inspectId=act-term-2',
      );

      // 4. Click event details secondary text summary (act-res-1: SW-204)
      const detailsElements = Array.from(
        container.querySelectorAll('[title="Click to inspect audit event in full detail"]'),
      );
      const targetDetailEl = detailsElements.find((el) =>
        el.textContent?.includes('Resolved port flapping on access switch'),
      );
      expect(targetDetailEl).toBeDefined();

      await act(async () => {
        (targetDetailEl as HTMLElement)?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        '/audit?entityType=Network&entityId=SW-204&inspectId=act-res-1',
      );

      // 5. Test entity link routing across various domain entities
      const buttons = Array.from(container.querySelectorAll('button'));
      const assetEntityBtn = buttons.find((b) => b.textContent?.includes('Asset AST-8812'));
      expect(assetEntityBtn).toBeDefined();
      await act(async () => {
        assetEntityBtn?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/assets');

      const licenseEntityBtn = buttons.find((b) => b.textContent?.includes('License LIC-301'));
      expect(licenseEntityBtn).toBeDefined();
      await act(async () => {
        licenseEntityBtn?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/licenses');

      const networkEntityBtn = buttons.find((b) => b.textContent?.includes('Device SW-204'));
      expect(networkEntityBtn).toBeDefined();
      await act(async () => {
        networkEntityBtn?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/network');

      act(() => {
        root.unmount();
      });
    });

    it('handles refresh button click in activity stream card header', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      const refreshBtn = container
        .querySelector('[aria-label="reload"], button.ant-btn .anticon-reload')
        ?.closest('button');
      expect(refreshBtn).toBeDefined();
      expect(refreshBtn).not.toBeNull();

      await act(async () => {
        refreshBtn?.click();
      });

      expect(dashboardService.getOverview).toHaveBeenCalled();

      act(() => {
        root.unmount();
      });
    });
  });

  describe('Adversarial Challenge 4: Edge Case Malformed Actions and Special Entities', () => {
    it('handles activities with lowercase, mixed-case, undefined, or empty actions without throwing', async () => {
      const edgeCaseActivitiesData: DashboardOverview = {
        ...adversarialDashboardData,
        recentActivity: [
          createMockActivity({
            key: 'act-edge-1',
            user: 'Edge Worker',
            role: 'IT Tech',
            avatarColor: '#1677ff',
            action: 'provisioned', // lowercase
            entity: 'Laptop AST-1100',
            entityType: 'Asset',
            details: 'Lowercase provisioned action',
            time: '1m ago',
          }),
          createMockActivity({
            key: 'act-edge-2',
            user: 'Edge Worker 2',
            role: 'Auditor',
            avatarColor: '#ef4444',
            action: 'Warning_High_Cpu', // mixed case with underscore
            entity: 'Server SRV-01',
            entityType: 'Asset',
            details: 'Mixed case warning action',
            time: '2m ago',
          }),
          createMockActivity({
            key: 'act-edge-3',
            user: 'System Bot',
            role: 'System',
            avatarColor: '#1677ff',
            action: '', // empty action
            entity: 'System Node',
            details: 'Empty string action',
            time: '3m ago',
          }),
          createMockActivity({
            key: 'act-edge-4',
            user: 'Ghost Worker',
            role: 'System',
            avatarColor: '#1677ff',
            action: undefined as unknown as string, // undefined action
            entity: 'Mystery Node',
            details: 'Undefined action',
            time: '4m ago',
          }),
        ],
      };

      vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(edgeCaseActivitiesData);

      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      // Default 'All' should render all 4 records without crashing
      expect(container.textContent).toContain('AST-1100');
      expect(container.textContent).toContain('SRV-01');
      expect(container.textContent).toContain('System Node');
      expect(container.textContent).toContain('Mystery Node');

      // Switch to 'Provisioned' -> should match lowercase 'provisioned'
      const provTab = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
        (el) => el.textContent === 'Provisioned',
      );
      await act(async () => {
        (provTab as HTMLElement)?.click();
      });
      expect(container.textContent).toContain('AST-1100');
      expect(container.textContent).not.toContain('SRV-01');

      // Switch to 'Warning' -> should match 'Warning_High_Cpu'
      const warnTab = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
        (el) => el.textContent === 'Warning',
      );
      await act(async () => {
        (warnTab as HTMLElement)?.click();
      });
      expect(container.textContent).toContain('SRV-01');
      expect(container.textContent).not.toContain('AST-1100');

      act(() => {
        root.unmount();
      });
    });

    it('handles special characters in entity IDs and encodes them safely in deep links', () => {
      const urlWithSpecial = buildAuditDeepLink(
        createMockActivity({
          key: 'evt-special-chars',
          user: 'DevOps',
          action: 'UPDATE',
          entity: 'Network Rack A#12 / Bay 4',
          entityType: 'Rack',
          details: 'Updated rack cable route',
          time: 'Now',
        }),
      );
      // Should encode special characters like # and / properly
      expect(urlWithSpecial).toContain(
        '/audit?entityType=Rack&entityId=Network+Rack+A%2312+%2F+Bay+4&inspectId=evt-special-chars',
      );
    });
  });
});
