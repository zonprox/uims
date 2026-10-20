import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type DashboardOverview, dashboardService } from '../../services/dashboard.service';
import DashboardPage, { type AuditDeepLinkTarget, buildAuditDeepLink } from './DashboardPage';

const mockNavigate = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();

const baseDashboardData: DashboardOverview = {
  kpi: {
    managedAssets: {
      total: 10,
      active: 8,
      growthMoM: '+2.0%',
      inUse: 8,
      inStock: 2,
      inRepair: 0,
      decommissioned: 0,
    },
    licenses: {
      total: 5,
      totalSeats: 50,
      usedSeats: 40,
      seatUsagePercent: '80.0%',
      expiringCount: 0,
    },
    inventory: {
      totalItems: 10,
      lowStockCount: 0,
      totalUnits: 50,
      healthyCount: 10,
    },
    ipam: {
      used: 50,
      total: 100,
      free: 50,
      usagePercent: 50,
    },
    audit: {
      totalEvents: 100,
      recent24h: 10,
      securityAlerts: 0,
      complianceScore: 100,
      status: 'Compliant',
    },
  },
  health: {
    uptimePercent: '100%',
    directory: {
      name: 'LDAP',
      status: 'Synced',
      usersCount: 10,
      syncTime: 'Real-time',
      percent: 100,
    },
    mail: {
      name: 'Assets',
      status: 'Operational',
      throughput: '10 Units',
      latency: 'Normal',
      percent: 100,
    },
    vpn: {
      name: 'Network',
      status: 'Active',
      tunnels: 10,
      load: 'Normal',
      percent: 10,
    },
    backups: {
      name: 'Backups',
      status: 'Verified',
      snapshots: 'OK',
      nextRun: '00:00',
      percent: 100,
    },
  },
  recentActivity: [],
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
    getOverview: vi.fn().mockImplementation(() => Promise.resolve(baseDashboardData)),
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
    selector({ user: { name: 'Empirical Challenger', role: 'Super Admin' } }),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Empirical Challenger: Dashboard Activity Stream & buildAuditDeepLink Stress Harness', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    container.remove();
    document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover').forEach((el) => {
      el.remove();
    });
  });

  describe('Part 1: Adversarial buildAuditDeepLink Boundary & Fuzz Matrix', () => {
    it('handles null, undefined, empty object, and void calls safely returning /audit', () => {
      expect(buildAuditDeepLink(null)).toBe('/audit');
      expect(buildAuditDeepLink(undefined)).toBe('/audit');
      expect(buildAuditDeepLink()).toBe('/audit');
      expect(buildAuditDeepLink({})).toBe('/audit');
      expect(buildAuditDeepLink({ key: '' })).toBe('/audit');
      expect(buildAuditDeepLink({ id: '' })).toBe('/audit');
      expect(buildAuditDeepLink({ key: '', id: '' })).toBe('/audit');
    });

    it('validates key vs id precedence and falsy fallback logic', () => {
      // Key provided, id omitted
      expect(buildAuditDeepLink({ key: 'evt-k1' })).toBe('/audit?inspectId=evt-k1');

      // Id provided, key omitted
      expect(buildAuditDeepLink({ id: 'uuid-i1' })).toBe('/audit?inspectId=uuid-i1');

      // Both key and id provided: key takes precedence
      expect(buildAuditDeepLink({ key: 'evt-k1', id: 'uuid-i1' })).toBe('/audit?inspectId=evt-k1');

      // Falsy key (empty string) falls back to id
      expect(buildAuditDeepLink({ key: '', id: 'uuid-i1' })).toBe('/audit?inspectId=uuid-i1');
    });

    it('handles linkUrl short-circuit rules strictly', () => {
      // Valid /audit? query URL is passed through directly
      const validQuery = '/audit?entityType=Asset&entityId=AST-100&inspectId=custom-1';
      expect(buildAuditDeepLink({ linkUrl: validQuery, entity: 'OTHER-99' })).toBe(validQuery);

      // Plain '/audit' without '?' does NOT short-circuit to raw linkUrl, but builds params
      expect(buildAuditDeepLink({ linkUrl: '/audit', key: 'key-1' })).toBe(
        '/audit?inspectId=key-1',
      );

      // Non-/audit linkUrl (like /assets) does NOT short-circuit
      expect(buildAuditDeepLink({ linkUrl: '/assets', key: 'key-2', entity: 'AST-55' })).toBe(
        '/audit?entityId=AST-55&inspectId=key-2',
      );
    });

    it('extracts hardware tags, UUIDs, or fallback strings with suppression of generic names', () => {
      // Hardware tag pattern [A-Za-z]+-[0-9]+
      expect(buildAuditDeepLink({ entity: 'Dell Workstation AST-404' })).toBe(
        '/audit?entityId=AST-404',
      );
      expect(buildAuditDeepLink({ entity: 'Switch SW-9921 rack 4' })).toBe(
        '/audit?entityId=SW-9921',
      );

      // UUID 36-char pattern
      const testUuid = 'b7e2a901-4c56-789a-bcde-f0123456789a';
      expect(buildAuditDeepLink({ entity: `User session (${testUuid})` })).toBe(
        `/audit?entityId=${testUuid}`,
      );

      // Generic entity suppression
      expect(buildAuditDeepLink({ entity: 'System', key: 'sys-1' })).toBe('/audit?inspectId=sys-1');
      expect(buildAuditDeepLink({ entity: 'Authentication', key: 'auth-1' })).toBe(
        '/audit?inspectId=auth-1',
      );
      expect(buildAuditDeepLink({ entity: 'Audit', key: 'audit-1' })).toBe(
        '/audit?inspectId=audit-1',
      );

      // Custom non-generic string fallback
      expect(buildAuditDeepLink({ entity: 'Custom Service Worker' })).toBe(
        '/audit?entityId=Custom+Service+Worker',
      );
    });

    it('robustly URI-encodes special characters, punctuation, and Unicode in entity strings', () => {
      const specialEntity = 'Storage Pool #9 [100% Full] & Ready / Sub-Dir?';
      const result = buildAuditDeepLink({ entity: specialEntity, key: 'sp-1' });
      // URLSearchParams encodes spaces as + and special characters as %XX
      expect(result).toContain('Storage+Pool+%239+%5B100%25+Full%5D+%26+Ready+%2F+Sub-Dir%3F');
      expect(result).toContain('inspectId=sp-1');

      // Unicode / Multilingual test
      const unicodeEntity = 'Сервер База Данных 🚀';
      const unicodeResult = buildAuditDeepLink({ entity: unicodeEntity, key: 'ru-1' });
      expect(unicodeResult).toContain('inspectId=ru-1');
      // Should be decodable via URL
      const parsedUrl = new URL(`http://localhost${unicodeResult}`);
      expect(parsedUrl.searchParams.get('entityId')).toBe(unicodeEntity);
    });

    it('survives massive 50,000-character adversarial string without ReDoS or timeout', () => {
      const massiveString = 'A-'.repeat(25000);
      const start = performance.now();
      const result = buildAuditDeepLink({ entity: massiveString, key: 'stress-1' });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Must execute in <100ms
      expect(result).toContain('inspectId=stress-1');
    });

    it('fuzz tests 500 randomized parameter combinations without thrown exceptions', () => {
      const sampleKeys = [undefined, null, '', 'key-1', '0', '___special___'];
      const sampleIds = [undefined, null, '', 'id-1', '3c990261-2244-4f01-9921-66778899aabb'];
      const sampleEntityTypes = [undefined, null, '', 'Asset', 'User', 'Security', 'License'];
      const sampleEntities = [
        undefined,
        null,
        '',
        'System',
        'Authentication',
        'Audit',
        'AST-100',
        'c0a80101-1122-3344-5566-778899aabbcc',
        'Wild <script>alert(1)</script>',
        '../../etc/shadow',
      ];
      const sampleLinkUrls = [
        undefined,
        null,
        '',
        '/audit',
        '/audit?tab=logs',
        '/audit?entityType=Asset&inspectId=fuzz',
        '/assets/AST-100',
      ];

      for (let i = 0; i < 500; i++) {
        const payload: AuditDeepLinkTarget = {
          key: sampleKeys[i % sampleKeys.length] as string | undefined,
          id: sampleIds[(i * 3) % sampleIds.length] as string | undefined,
          entityType: sampleEntityTypes[(i * 7) % sampleEntityTypes.length] as string | undefined,
          entity: sampleEntities[(i * 11) % sampleEntities.length] as string | undefined,
          linkUrl: sampleLinkUrls[(i * 13) % sampleLinkUrls.length] as string | undefined,
        };

        expect(() => {
          const url = buildAuditDeepLink(payload);
          expect(typeof url).toBe('string');
          expect(url.startsWith('/audit')).toBe(true);
        }).not.toThrow();
      }
    });
  });

  describe('Part 2: Activity Stream Card Empty States, Filter Transitions, and Malformed Data', () => {
    it('renders "No recent activity records." when activities array is completely empty or undefined', async () => {
      const emptyData: DashboardOverview = {
        ...baseDashboardData,
        recentActivity: [],
      };
      vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(emptyData);

      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      expect(container.textContent).toContain('Live Activity Stream');
      expect(container.textContent).toContain('No recent activity records.');
      expect(container.textContent).not.toContain('No recent activity records match filter.');

      await act(async () => {
        root.unmount();
      });
    });

    it('renders "No recent activity records match filter." when activities exist but none match active filter', async () => {
      const singleItemData: DashboardOverview = {
        ...baseDashboardData,
        recentActivity: [
          {
            key: 'act-prov-only',
            user: 'SysAdmin',
            role: 'Admin',
            avatarColor: '#1677ff',
            action: 'PROVISION_HOST',
            entity: 'AST-7700',
            entityType: 'Asset',
            details: 'Provisioned host',
            time: '1m ago',
          },
        ],
      };
      vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(singleItemData);

      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      // Default All -> Shows item
      expect(container.textContent).toContain('AST-7700');

      // Click "Terminated" filter -> 0 matches -> Should show specific filter empty text
      const termTab = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
        (el) => el.textContent === 'Terminated',
      );
      expect(termTab).toBeDefined();

      await act(async () => {
        (termTab as HTMLElement).click();
      });

      expect(container.textContent).not.toContain('AST-7700');
      expect(container.textContent).toContain('No recent activity records match filter.');
      expect(container.textContent).not.toContain('No recent activity records.');

      // Switch back to "All" -> Item reappears, empty text gone
      const allTab = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
        (el) => el.textContent === 'All',
      );
      await act(async () => {
        (allTab as HTMLElement).click();
      });

      expect(container.textContent).toContain('AST-7700');
      expect(container.textContent).not.toContain('No recent activity records match filter.');

      await act(async () => {
        root.unmount();
      });
    });

    it('survives rapid consecutive Segmented filter toggles without state desynchronization', async () => {
      const multiData: DashboardOverview = {
        ...baseDashboardData,
        recentActivity: [
          {
            key: 'p1',
            user: 'Admin',
            role: 'Admin',
            avatarColor: '#1677ff',
            action: 'PROVISION_LAPTOP',
            entity: 'AST-10',
            entityType: 'Asset',
            details: 'Provision laptop',
            time: '1m ago',
          },
          {
            key: 'r1',
            user: 'Tech',
            role: 'IT Tech',
            avatarColor: '#10b981',
            action: 'RESOLVE_TICKET',
            entity: 'AST-20',
            entityType: 'Asset',
            details: 'Resolved ticket',
            time: '2m ago',
          },
          {
            key: 'w1',
            user: 'Sec',
            role: 'Auditor',
            avatarColor: '#ef4444',
            action: 'WARN_DISK_FULL',
            entity: 'SRV-30',
            entityType: 'Hardware',
            details: 'Disk space warning',
            time: '3m ago',
          },
          {
            key: 't1',
            user: 'Admin',
            role: 'Admin',
            avatarColor: '#dc2626',
            action: 'TERMINATE_USER',
            entity: 'User USR-40',
            entityType: 'User',
            details: 'Terminated employee account',
            time: '4m ago',
          },
        ],
      };
      vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(multiData);

      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      const labels = Array.from(container.querySelectorAll('.ant-segmented-item-label'));
      const provBtn = labels.find((l) => l.textContent === 'Provisioned') as HTMLElement;
      const resBtn = labels.find((l) => l.textContent === 'Resolved') as HTMLElement;
      const warnBtn = labels.find((l) => l.textContent === 'Warning') as HTMLElement;
      const termBtn = labels.find((l) => l.textContent === 'Terminated') as HTMLElement;
      const allBtn = labels.find((l) => l.textContent === 'All') as HTMLElement;

      // Rapidly toggle between all filters multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        await act(async () => {
          provBtn.click();
        });
        expect(container.textContent).toContain('AST-10');
        expect(container.textContent).not.toContain('AST-20');

        await act(async () => {
          resBtn.click();
        });
        expect(container.textContent).toContain('AST-20');
        expect(container.textContent).not.toContain('AST-10');

        await act(async () => {
          warnBtn.click();
        });
        expect(container.textContent).toContain('SRV-30');
        expect(container.textContent).not.toContain('AST-20');

        await act(async () => {
          termBtn.click();
        });
        expect(container.textContent).toContain('USR-40');
        expect(container.textContent).not.toContain('SRV-30');

        await act(async () => {
          allBtn.click();
        });
        expect(container.textContent).toContain('AST-10');
        expect(container.textContent).toContain('AST-20');
        expect(container.textContent).toContain('SRV-30');
        expect(container.textContent).toContain('USR-40');
      }

      await act(async () => {
        root.unmount();
      });
    });

    it('renders gracefully without crashing when activity records have missing or undefined properties', async () => {
      const partiallyUndefinedData: DashboardOverview = {
        ...baseDashboardData,
        recentActivity: [
          // Missing user, role, avatarColor
          {
            key: 'act-sparse-1',
            user: undefined as unknown as string,
            role: undefined as unknown as string,
            avatarColor: undefined as unknown as string,
            action: 'PROVISION_VM',
            entity: 'VM-991',
            entityType: 'VirtualMachine',
            details: 'Created sparse VM',
            time: '1m ago',
          },
          // Missing action, entity, details, time
          {
            key: 'act-sparse-2',
            user: 'Anonymous',
            role: 'Guest',
            avatarColor: '#1677ff',
            action: undefined as unknown as string,
            entity: undefined as unknown as string,
            details: undefined as unknown as string,
            time: undefined as unknown as string,
          },
        ],
      };
      vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(partiallyUndefinedData);

      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      // Default actor fallback is 'System'
      expect(container.textContent).toContain('System');
      // Default action fallback is 'Event'
      expect(container.textContent).toContain('Event');
      // Target entity 'VM-991' rendered
      expect(container.textContent).toContain('VM-991');

      // Click inspect button for act-sparse-1
      const inspectSparse1 = container.querySelector(
        '[data-testid="inspect-audit-act-sparse-1"]',
      ) as HTMLButtonElement | null;
      expect(inspectSparse1).not.toBeNull();

      await act(async () => {
        inspectSparse1?.click();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/audit?entityType=VirtualMachine&entityId=VM-991&inspectId=act-sparse-1',
      );

      await act(async () => {
        root.unmount();
      });
    });

    it('deduplicates 20 identical duplicate events down to 1 row in Live Activity Stream', async () => {
      const duplicateList = Array.from({ length: 20 }, (_, i) => ({
        key: `dup-key-${i % 2 === 0 ? 'same-key' : `unique-${i}`}`,
        user: 'Duplicate Bot',
        role: 'System',
        avatarColor: '#1677ff',
        action: 'HEARTBEAT_PROVISION',
        entity: 'Cluster NODE-1',
        entityType: 'Cluster',
        details: 'Identical heartbeat payload across cluster',
        time: 'Just now',
      }));

      const dupData: DashboardOverview = {
        ...baseDashboardData,
        recentActivity: duplicateList,
      };
      vi.mocked(dashboardService.getOverview).mockResolvedValueOnce(dupData);

      const root = createRoot(container);
      await act(async () => {
        root.render(createElement(DashboardPage));
      });

      // Because all 20 have identical signature `${user}-${action}-${entity}-${details}-${time}`,
      // deduplicatedActivities must compress them down to exactly 1 record!
      const rows = container.querySelectorAll('.ant-table-row');
      expect(rows.length).toBe(1);

      await act(async () => {
        root.unmount();
      });
    });
  });
});
