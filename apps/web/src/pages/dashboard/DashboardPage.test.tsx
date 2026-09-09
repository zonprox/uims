import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardOverview } from '../../services/dashboard.service';
import DashboardPage from './DashboardPage';

const mockNavigate = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();

const mockDashboardData: DashboardOverview = {
  kpi: {
    managedAssets: {
      total: 42,
      active: 32,
      growthMoM: '+8.4% MoM',
      inUse: 32,
      inStock: 7,
      inRepair: 2,
      decommissioned: 1,
    },
    licenses: {
      total: 15,
      totalSeats: 200,
      usedSeats: 168,
      seatUsagePercent: '84.0%',
      expiringCount: 2,
    },
    inventory: {
      totalItems: 58,
      lowStockCount: 4,
      totalUnits: 340,
      healthyCount: 54,
    },
    ipam: {
      used: 240,
      total: 512,
      free: 272,
      usagePercent: 46.9,
    },
    audit: {
      totalEvents: 320,
      recent24h: 48,
      securityAlerts: 1,
      complianceScore: 98,
      status: 'Warning',
    },
  },
  health: {
    uptimePercent: '99.99%',
    directory: {
      name: 'Active Directory / LDAP',
      status: 'Synced',
      usersCount: 142,
      syncTime: 'Real-time',
      percent: 100,
    },
    mail: {
      name: 'Hardware Assets',
      status: 'Operational',
      throughput: '42 Managed Units',
      latency: '32 In Service',
      percent: 93,
    },
    vpn: {
      name: 'Network Gateways & IPAM',
      status: 'Active',
      tunnels: 240,
      load: 'Normal',
      percent: 47,
    },
    backups: {
      name: 'Database Backups',
      status: 'Verified',
      snapshots: 'Complete',
      nextRun: '02:00 UTC',
      percent: 100,
    },
  },
  recentActivity: [
    {
      key: 'log-1',
      user: 'Sarah Connor',
      role: 'Admin',
      avatarColor: '#1677ff',
      action: 'PROVISIONED',
      entity: 'Asset AST-5001',
      entityType: 'Asset',
      details: 'Assigned MacBook Pro to Engineering',
      time: '10m ago',
      linkUrl: '/assets',
    },
    {
      key: 'log-2',
      user: 'John Smith',
      role: 'IT Tech',
      avatarColor: '#10b981',
      action: 'RESOLVED',
      entity: 'License LIC-802',
      entityType: 'License',
      details: 'Renewed JetBrains Enterprise license',
      time: '35m ago',
      linkUrl: '/licenses',
    },
    {
      key: 'log-3',
      user: 'Security Bot',
      role: 'Auditor',
      avatarColor: '#ef4444',
      action: 'WARNING',
      entity: 'User USR-901',
      entityType: 'User',
      details: 'Multiple failed MFA challenges',
      time: '1h ago',
      linkUrl: '/users',
    },
    {
      key: 'log-4',
      user: 'Admin Dave',
      role: 'Admin',
      avatarColor: '#dc2626',
      action: 'TERMINATED',
      entity: 'Asset AST-1004',
      entityType: 'Asset',
      details: 'Decommissioned legacy server unit',
      time: '2h ago',
      linkUrl: '/assets',
    },
  ],
  actionItems: [
    {
      id: 'inv-1',
      type: 'error',
      title: 'Low Stock Alert',
      tag: 'Critical',
      tagColor: 'error',
      description: 'Cat6 Ethernet Cables are below threshold (2 units remaining).',
      linkText: 'Restock Inventory',
      linkUrl: '/inventory',
    },
    {
      id: 'lic-1',
      type: 'warning',
      title: 'License Renewal Required',
      tag: 'Expiring Soon',
      tagColor: 'warning',
      description: 'Adobe Creative Cloud (30 seats) expires in 14 days.',
      linkText: 'View Licenses',
      linkUrl: '/licenses',
    },
    {
      id: 'war-1',
      type: 'warning',
      title: 'Warranty Expiration Alert',
      tag: 'Warranty Expiry',
      tagColor: 'warning',
      description: 'Dell XPS 15 (AST-2001) warranty expires within 30 days.',
      linkText: 'Review Assets',
      linkUrl: '/assets',
    },
    {
      id: 'orph-1',
      type: 'warning',
      title: 'Orphaned Asset Detected',
      tag: 'Unassigned',
      tagColor: 'orange',
      description: 'ThinkPad T14 (AST-3001) is in service without an assigned custodian.',
      linkText: 'Assign Custodian',
      linkUrl: '/assets',
    },
    {
      id: 'aud-1',
      type: 'error',
      title: 'Security Compliance Alert',
      tag: 'Security Warning',
      tagColor: 'error',
      description: 'LOGIN_FAILED: Suspicious auth attempt from unknown IP.',
      linkText: 'Inspect Audit Log',
      linkUrl: '/audit',
    },
  ],
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
    getOverview: vi.fn().mockImplementation(() => Promise.resolve(mockDashboardData)),
  },
}));

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: (selector: (state: { user: { name: string; role: string } }) => unknown) =>
    selector({ user: { name: 'Operations Commander', role: 'Admin' } }),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DashboardPage', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders high-density telemetry cards with hardware fleet, licenses, inventory, and audit pulse (R1)', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // R1: Telemetry Cards
    expect(container.textContent).toContain('Hardware Fleet');
    expect(container.textContent).toContain('42');
    expect(container.textContent).toContain('In Use: 32');
    expect(container.textContent).toContain('Stock: 7');
    expect(container.textContent).toContain('Repair: 2');
    expect(container.textContent).toContain('Retired: 1');

    expect(container.textContent).toContain('Software Licenses');
    expect(container.textContent).toContain('15');
    expect(container.textContent).toContain('84.0% Seat Usage');
    expect(container.textContent).toContain('2 Expiring Soon');

    expect(container.textContent).toContain('Inventory Stock');
    expect(container.textContent).toContain('340 Units');
    expect(container.textContent).toContain('58 Catalog Items');
    expect(container.textContent).toContain('4 Low Stock Alerts');

    expect(container.textContent).toContain('Audit & Compliance');
    expect(container.textContent).toContain('48 Events');
    expect(container.textContent).toContain('98% Integrity');
    expect(container.textContent).toContain('Elevated Audit Events');

    act(() => {
      root.unmount();
    });
  });

  it('renders prioritized action queue with urgent IT tasks and 1-click deep links (R2)', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // Check Action Items Queue
    expect(container.textContent).toContain('Action Items Queue');
    expect(container.textContent).toContain('Low Stock Alert');
    expect(container.textContent).toContain('License Renewal Required');
    expect(container.textContent).toContain('Warranty Expiration Alert');
    expect(container.textContent).toContain('Orphaned Asset Detected');
    expect(container.textContent).toContain('Security Compliance Alert');

    // Check deep link buttons
    const buttons = Array.from(container.querySelectorAll('button'));
    const restockBtn = buttons.find((b) => b.textContent?.includes('Restock Inventory'));
    expect(restockBtn).toBeDefined();

    await act(async () => {
      restockBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');

    const reviewAssetsBtn = buttons.find((b) => b.textContent?.includes('Review Assets'));
    expect(reviewAssetsBtn).toBeDefined();

    await act(async () => {
      reviewAssetsBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/assets');

    const inspectAuditBtn = buttons.find((b) => b.textContent?.includes('Inspect Audit Log'));
    expect(inspectAuditBtn).toBeDefined();

    await act(async () => {
      inspectAuditBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/audit');

    const scanQrQuickActionBtn = buttons.find((b) => b.textContent?.includes('Scan QR Code'));
    expect(scanQrQuickActionBtn).toBeDefined();

    await act(async () => {
      scanQrQuickActionBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/assets?scan=true');

    act(() => {
      root.unmount();
    });
  });

  it('renders live activity stream with role badges, action tags, and deep links (R2)', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    expect(container.textContent).toContain('Live Activity Stream');
    expect(container.textContent).toContain('Sarah Connor');
    expect(container.textContent).toContain('PROVISIONED');
    expect(container.textContent).toContain('RESOLVED');
    expect(container.textContent).toContain('WARNING');
    expect(container.textContent).toContain('TERMINATED');

    // Check target entity deep link buttons
    const buttons = Array.from(container.querySelectorAll('button'));
    const entityLinkBtn = buttons.find((b) => b.textContent?.includes('Asset AST-5001'));
    expect(entityLinkBtn).toBeDefined();

    await act(async () => {
      entityLinkBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/assets');

    act(() => {
      root.unmount();
    });
  });

  it('refreshes telemetry data and invokes App.useApp message notification', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // Find refresh button
    const buttons = Array.from(container.querySelectorAll('button'));
    const refreshBtn = buttons.find((b) => b.querySelector('.anticon-reload'));
    expect(refreshBtn).toBeDefined();

    await act(async () => {
      refreshBtn?.click();
    });

    expect(mockMessageSuccess).toHaveBeenCalledWith('Telemetry data refreshed');
    const { dashboardService } = await import('../../services/dashboard.service');
    expect(dashboardService.getOverview).toHaveBeenCalledWith('This Month', true);

    act(() => {
      root.unmount();
    });
  });

  it('filters action queue by critical vs warnings vs all', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // Find Segmented options in action items card
    const criticalOption = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
      (el) => el.textContent?.includes('Critical'),
    );
    expect(criticalOption).toBeDefined();

    await act(async () => {
      (criticalOption as HTMLElement).click();
    });

    // In critical filter, Low Stock Alert and Security Compliance Alert are shown (type error)
    expect(container.textContent).toContain('Low Stock Alert');
    expect(container.textContent).toContain('Security Compliance Alert');
    // Warning items should not appear in critical filter
    expect(container.textContent).not.toContain('Warranty Expiration Alert');

    act(() => {
      root.unmount();
    });
  });

  it('renders accurate empty state when filtered queue has no matching items', async () => {
    const onlyWarningsData: DashboardOverview = {
      ...mockDashboardData,
      actionItems: [
        {
          id: 'lic-1',
          type: 'warning',
          title: 'License Renewal Required',
          tag: 'Expiring Soon',
          tagColor: 'warning',
          description: 'Adobe Creative Cloud expires soon.',
          linkText: 'View Licenses',
          linkUrl: '/licenses',
        },
      ],
    };

    const { dashboardService } = await import('../../services/dashboard.service');
    vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(onlyWarningsData);

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // Switch to Critical filter where there are 0 items
    const criticalOption = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
      (el) => el.textContent?.includes('Critical'),
    );
    await act(async () => {
      (criticalOption as HTMLElement).click();
    });

    expect(container.textContent).toContain('No Matching Action Items');
    expect(container.textContent).toContain('No action items match the selected priority filter');

    act(() => {
      root.unmount();
    });
  });

  it('renders operational empty state when action items are completely empty', async () => {
    const emptyDashboardData: DashboardOverview = {
      ...mockDashboardData,
      actionItems: [],
      recentActivity: [],
    };

    const { dashboardService } = await import('../../services/dashboard.service');
    vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(emptyDashboardData);

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    expect(container.textContent).toMatch(/all systems operational/i);
    expect(container.textContent).toContain('No pending action items require immediate attention');
    expect(container.textContent).toContain('No recent activity records');

    act(() => {
      root.unmount();
    });
  });

  it('renders info type action item with correct styling and handles missing fields gracefully', async () => {
    const infoActionData: DashboardOverview = {
      ...mockDashboardData,
      kpi: {
        ...mockDashboardData.kpi,
        managedAssets: {
          ...mockDashboardData.kpi.managedAssets,
          growthMoM: '', // test empty growthMoM fallback
        },
        licenses: {
          ...mockDashboardData.kpi.licenses,
          seatUsagePercent: 'N/A', // test NaN seatUsagePercent fallback
        },
      },
      actionItems: [
        {
          id: 'info-1',
          type: 'info',
          title: 'System Firmware Scheduled',
          tag: 'Maintenance',
          tagColor: 'blue',
          description: 'Firmware maintenance scheduled for Sunday at 02:00 UTC.',
          linkText: 'View Schedule',
          linkUrl: '/audit',
        },
      ],
      recentActivity: [
        {
          key: 'log-edge',
          user: '',
          role: '',
          avatarColor: '',
          action: 'CUSTOM_SYNC_SUCCESS',
          entity: '',
          details: 'Background job completed successfully',
          time: 'Just now',
        },
      ],
    };

    const { dashboardService } = await import('../../services/dashboard.service');
    vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(infoActionData);

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // Check info item renders
    expect(container.textContent).toContain('System Firmware Scheduled');
    expect(container.textContent).toContain('0.0% MoM');

    // Check custom audit log action renders with semantic tag
    expect(container.textContent).toContain('CUSTOM_SYNC_SUCCESS');

    act(() => {
      root.unmount();
    });
  });

  it('handles negative fleet growth MoM with downward trend indicator and allows filtering notices', async () => {
    const negativeGrowthData: DashboardOverview = {
      ...mockDashboardData,
      kpi: {
        ...mockDashboardData.kpi,
        managedAssets: {
          ...mockDashboardData.kpi.managedAssets,
          growthMoM: '-2.4% MoM',
        },
      },
      actionItems: [
        {
          id: 'notice-1',
          type: 'info',
          title: 'Scheduled Cloud Maintenance',
          tag: 'Maintenance',
          tagColor: 'blue',
          description: 'Weekly backup snapshot will take place at 03:00 UTC.',
          linkText: 'View Window',
          linkUrl: '/audit',
        },
      ],
    };

    const { dashboardService } = await import('../../services/dashboard.service');
    vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(negativeGrowthData);

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // Check negative growth text and downward arrow
    expect(container.textContent).toContain('-2.4% MoM');
    expect(container.querySelector('.anticon-arrow-down')).not.toBeNull();

    // Check Notices filter tab appears when info items exist
    const noticeOption = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
      (el) => el.textContent?.includes('Notices'),
    );
    expect(noticeOption).toBeDefined();

    await act(async () => {
      (noticeOption as HTMLElement).click();
    });

    expect(container.textContent).toContain('Scheduled Cloud Maintenance');

    act(() => {
      root.unmount();
    });
  });

  it('resolves hardware and peripheral entity deep links and displays System role fallback when role is omitted', async () => {
    const customActivityData: DashboardOverview = {
      ...mockDashboardData,
      recentActivity: [
        {
          key: 'log-hw',
          user: 'IT Tech Joe',
          role: '', // empty role -> should fallback to 'System'
          avatarColor: '#1677ff',
          action: 'PROVISIONED',
          entity: 'MacBook Pro 16',
          entityType: 'Hardware',
          details: 'Deployed M3 Max unit to staff',
          time: '5m ago',
          linkUrl: '/audit', // generic fallback should be resolved to /assets
        },
        {
          key: 'log-inv',
          user: 'Inventory Lead',
          role: 'IT Tech',
          avatarColor: '#10b981',
          action: 'RESOLVED',
          entity: 'Logitech MX Master 3S',
          entityType: 'Peripheral',
          details: 'Restocked desk mouse units',
          time: '15m ago',
          linkUrl: '/audit', // generic fallback should be resolved to /inventory
        },
      ],
    };

    const { dashboardService } = await import('../../services/dashboard.service');
    vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(customActivityData);

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // Check fallback role 'System' renders
    expect(container.textContent).toContain('System');

    // Check deep links
    const buttons = Array.from(container.querySelectorAll('button'));
    const macbookBtn = buttons.find((b) => b.textContent?.includes('MacBook Pro 16'));
    expect(macbookBtn).toBeDefined();

    await act(async () => {
      macbookBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/assets');

    const mouseBtn = buttons.find((b) => b.textContent?.includes('Logitech MX Master 3S'));
    expect(mouseBtn).toBeDefined();

    await act(async () => {
      mouseBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');

    act(() => {
      root.unmount();
    });
  });

  it('renders failure state card with retry button when initial telemetry load throws error, and recovers upon retry', async () => {
    const { dashboardService } = await import('../../services/dashboard.service');
    vi.mocked(dashboardService.getOverview).mockRejectedValueOnce(new Error('Network error'));

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    expect(container.textContent).toContain('Telemetry Data Unavailable');
    expect(container.textContent).toContain('Retry Telemetry Sync');
    expect(mockMessageError).toHaveBeenCalledWith(
      'Failed to load dashboard overview. Please try again.',
    );

    // Click retry button, which should trigger a successful reload
    vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(mockDashboardData);
    const retryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Retry Telemetry Sync'),
    );
    expect(retryBtn).toBeDefined();

    await act(async () => {
      retryBtn?.click();
    });

    expect(container.textContent).toContain('Hardware Fleet');
    expect(container.textContent).toContain('Software Licenses');

    act(() => {
      root.unmount();
    });
  });

  it('dynamically reflects degraded and error subsystem health with appropriate badge status and stroke colors', async () => {
    const degradedHealthData: DashboardOverview = {
      ...mockDashboardData,
      health: {
        uptimePercent: '94.2%',
        directory: {
          name: 'Active Directory / LDAP',
          status: 'Offline',
          usersCount: 0,
          syncTime: 'Paused',
          percent: 0,
        },
        mail: {
          name: 'Hardware Assets',
          status: 'Degraded',
          throughput: '30 Units',
          latency: 'High Error Rate',
          percent: 50,
        },
        vpn: {
          name: 'Network Gateways & IPAM',
          status: 'Active',
          tunnels: 200,
          load: 'Normal',
          percent: 75,
        },
        backups: {
          name: 'Database Backups',
          status: 'Failed',
          snapshots: '0 Snapshots',
          nextRun: 'Manual Required',
          percent: 0,
        },
      },
    };

    const { dashboardService } = await import('../../services/dashboard.service');
    vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(degradedHealthData);

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    expect(container.textContent).toContain('Offline');
    expect(container.textContent).toContain('Degraded');
    expect(container.textContent).toContain('Failed');
    expect(container.textContent).toContain('94.2% Operational');

    // Error tag on uptime when < 95%
    const uptimeTag = Array.from(container.querySelectorAll('.ant-tag')).find((el) =>
      el.textContent?.includes('94.2% Operational'),
    );
    expect(uptimeTag?.className).toContain('ant-tag-error');

    act(() => {
      root.unmount();
    });
  });

  it('renders critical red stroke on audit integrity when audit status is Critical, and properly filters security and termination actions in activity stream', async () => {
    const criticalSecurityData: DashboardOverview = {
      ...mockDashboardData,
      kpi: {
        ...mockDashboardData.kpi,
        audit: {
          totalEvents: 400,
          recent24h: 80,
          securityAlerts: 15,
          complianceScore: 45,
          status: 'Critical',
        },
      },
      recentActivity: [
        {
          key: 'log-sec-1',
          user: 'Security Bot',
          role: 'Auditor',
          avatarColor: '#ef4444',
          action: 'BRUTE_FORCE_DETECTED',
          entity: 'Auth Gateway SAML',
          details: 'Firewall dropped IP 203.0.113.195',
          time: '2m ago',
          linkUrl: '/network',
        },
        {
          key: 'log-term-1',
          user: 'Admin Lead',
          role: 'Admin',
          avatarColor: '#dc2626',
          action: 'USER_SUSPEND',
          entity: 'David Kim',
          details: 'Account suspended for compliance violation',
          time: '12m ago',
          linkUrl: '/users',
        },
      ],
    };

    const { dashboardService } = await import('../../services/dashboard.service');
    vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(criticalSecurityData);

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(DashboardPage));
    });

    // Check critical integrity score text
    expect(container.textContent).toContain('45% Integrity');
    expect(container.textContent).toContain('Critical Security Alerts');

    // Switch activity filter to Warning -> BRUTE_FORCE_DETECTED must show
    const warningTab = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
      (el) => el.textContent === 'Warning',
    );
    expect(warningTab).toBeDefined();

    await act(async () => {
      (warningTab as HTMLElement).click();
    });
    expect(container.textContent).toContain('BRUTE_FORCE_DETECTED');
    expect(container.textContent).not.toContain('USER_SUSPEND');

    // Switch activity filter to Terminated -> USER_SUSPEND must show
    const termTab = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
      (el) => el.textContent === 'Terminated',
    );
    expect(termTab).toBeDefined();

    await act(async () => {
      (termTab as HTMLElement).click();
    });
    expect(container.textContent).toContain('USER_SUSPEND');
    expect(container.textContent).not.toContain('BRUTE_FORCE_DETECTED');

    act(() => {
      root.unmount();
    });
  });
});
