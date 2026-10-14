import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuditLog, type AuditStats, auditService } from '../../services/audit.service';
import AuditPage from './AuditPage';

const mockLogs: Array<AuditLog> = [
  {
    id: 'aud-001',
    timestamp: '2026-09-20T10:00:00Z',
    user: 'Alex Vance',
    userName: 'Alex Vance',
    userEmail: 'alex.vance@uims.internal',
    action: 'CREATE',
    severity: 'Info',
    entity: 'Workstation WS-402',
    entityType: 'Asset',
    entityId: 'ast-402',
    ipAddress: '10.232.100.15',
    status: 'Success',
    statusCode: 201,
    durationMs: 42.5,
    userAgent: 'UIMS-Console/2.4',
    details: 'Provisioned new hardware workstation for R&D lab.',
    diffPayload: {
      serialNumber: 'SN-9941',
      model: 'Dell Precision 3660',
    },
    oldValue: null,
    newValue: { serialNumber: 'SN-9941', model: 'Dell Precision 3660' },
  },
  {
    id: 'aud-002',
    timestamp: '2026-09-20T11:30:00Z',
    user: 'System Threat Defense',
    userName: 'System Threat Defense',
    userEmail: 'threat-engine@uims.internal',
    action: 'LOGIN_FAILED',
    severity: 'Critical',
    entity: 'Authentication Gateway',
    entityType: 'Security',
    entityId: 'sec-auth',
    ipAddress: '89.248.163.2',
    status: 'Failed',
    statusCode: 401,
    durationMs: 1.8,
    userAgent: 'curl/7.88.1',
    details: 'Multiple invalid credentials received from unauthorized origin IP.',
    diffPayload: {
      attemptCount: 5,
      password: '[REDACTED]',
    },
  },
];

const mockStats: AuditStats = {
  totalEvents: 142,
  failedEvents: 7,
  criticalEvents: 3,
  errorRate: '4.9%',
  totalEventRecords: '142',
  securityAnomalies: '3 Alerts',
};

const mockMessageError = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageWarning = vi.fn();
const mockMessageInfo = vi.fn();

const mockAppInstance = {
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    warning: mockMessageWarning,
    info: mockMessageInfo,
  },
  modal: {
    confirm: vi.fn(),
  },
  notification: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    App: Object.assign(actual.App, {
      useApp: () => mockAppInstance,
    }),
  };
});

vi.mock('../../services/audit.service', () => ({
  auditService: {
    getLogs: vi.fn().mockImplementation(() => Promise.resolve(mockLogs)),
    getStats: vi.fn().mockImplementation(() => Promise.resolve(mockStats)),
    getLog: vi
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(mockLogs.find((l) => l.id === id) ?? null),
      ),
    exportCsv: vi.fn().mockImplementation(() => Promise.resolve('ID,Timestamp\naud-001,2026')),
  },
}));

// Helper component to inspect location and trigger programmatic navigation
let globalNavigate: ((to: string) => void) | null = null;
let globalLocation: { search: string; pathname: string } | null = null;

function LocationTracker() {
  const navigate = useNavigate();
  const location = useLocation();
  globalNavigate = navigate;
  globalLocation = { search: location.search, pathname: location.pathname };
  return null;
}

describe('AuditPage Adversarial & Stress Tests (Challenger M4-11-2)', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    mockMessageError.mockClear();
    mockMessageSuccess.mockClear();
    mockMessageWarning.mockClear();
    mockMessageInfo.mockClear();
    globalNavigate = null;
    globalLocation = null;
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
        currentRoot = null;
      });
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    const portals = document.querySelectorAll(
      '.ant-modal-root, .ant-drawer, .ant-popover, .ant-message',
    );
    for (const p of Array.from(portals)) {
      p.remove();
    }
    vi.clearAllMocks();
  });

  const renderComponent = async (initialEntries: Array<string> = ['/']) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          MemoryRouter,
          { initialEntries },
          createElement(
            ConfigProvider,
            null,
            createElement(App, null, createElement(LocationTracker), createElement(AuditPage)),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  };

  describe('Dimension 1: Scoped CSV Export Query Parameters', () => {
    it('passes only entityType when entityId is omitted from URL', async () => {
      await renderComponent(['/audit?entityType=SoftwareLicense']);

      const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Export CSV'),
      );
      expect(exportBtn).toBeTruthy();

      await act(async () => {
        exportBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      expect(auditService.exportCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'SoftwareLicense',
          entityId: undefined,
        }),
      );
    });

    it('passes only entityId when entityType is omitted from URL', async () => {
      await renderComponent(['/audit?entityId=ast-uuid-9999']);

      const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Export CSV'),
      );
      expect(exportBtn).toBeTruthy();

      await act(async () => {
        exportBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      expect(auditService.exportCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: undefined,
          entityId: 'ast-uuid-9999',
        }),
      );
    });

    it('preserves URL-encoded special characters and CIDR notations in entityId for CSV export', async () => {
      // e.g. entityId is a network CIDR like "192.168.10.0/24"
      await renderComponent(['/audit?entityType=Network&entityId=192.168.10.0%2F24']);

      const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Export CSV'),
      );
      expect(exportBtn).toBeTruthy();

      await act(async () => {
        exportBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      expect(auditService.exportCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Network',
          entityId: '192.168.10.0/24',
        }),
      );
    });

    it('sanitizes empty string parameters into undefined to prevent sending empty queries', async () => {
      await renderComponent(['/audit?entityType=&entityId=']);

      const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Export CSV'),
      );
      expect(exportBtn).toBeTruthy();

      await act(async () => {
        exportBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      expect(auditService.exportCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: undefined,
          entityId: undefined,
        }),
      );
      // Active Entity Filter Banner should NOT be displayed when both are empty
      expect(container.textContent).not.toContain('Filtered by Entity:');
    });

    it('combines entity scoping with user search and status filters in export', async () => {
      await renderComponent(['/audit?entityType=Asset&entityId=ast-402']);

      // Enter search query
      const searchInput = container.querySelector(
        'input[placeholder="Search by actor, entity, IP address, details..."]',
      ) as HTMLInputElement | null;
      expect(searchInput).toBeTruthy();

      await act(async () => {
        if (searchInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
          )?.set;
          nativeInputValueSetter?.call(searchInput, 'Alex Vance');
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Export CSV'),
      );

      await act(async () => {
        exportBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      expect(auditService.exportCsv).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Asset',
          entityId: 'ast-402',
          search: 'Alex Vance',
        }),
      );
    });
  });

  describe('Dimension 2: URL Query State Persistence & Navigation Transitions', () => {
    it('dynamically reloads data when URL transitions to a different entity scope in-place', async () => {
      await renderComponent(['/audit?entityType=Asset&entityId=ast-402']);

      expect(auditService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Asset',
          entityId: 'ast-402',
        }),
      );

      // Perform in-place navigation transition
      await act(async () => {
        globalNavigate?.('/audit?entityType=DirectoryUser&entityId=usr-888');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(auditService.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'DirectoryUser',
          entityId: 'usr-888',
        }),
      );
      expect(container.textContent).toContain('usr-888');
      expect(container.textContent).toContain('DirectoryUser');
    });

    it('clearing entity filter preserves other unrelated URL query parameters', async () => {
      await renderComponent(['/audit?entityType=Asset&entityId=ast-402&tab=overview&view=table']);

      const clearBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Clear Entity Filter'),
      );
      expect(clearBtn).toBeTruthy();

      await act(async () => {
        clearBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(container.textContent).not.toContain('Filtered by Entity:');
      expect(globalLocation?.search).toContain('tab=overview');
      expect(globalLocation?.search).toContain('view=table');
      expect(globalLocation?.search).not.toContain('entityType=Asset');
      expect(globalLocation?.search).not.toContain('entityId=ast-402');
    });

    it('closing inspector drawer cleanly removes inspectId from URL while preserving entity filters', async () => {
      await renderComponent(['/audit?inspectId=aud-001&entityType=Asset&entityId=ast-402']);

      const drawer = document.querySelector('.ant-drawer');
      expect(drawer).toBeTruthy();
      expect(globalLocation?.search).toContain('inspectId=aud-001');

      // Click drawer close button
      const closeBtn = document.querySelector(
        '.ant-drawer .ant-drawer-close',
      ) as HTMLButtonElement | null;
      expect(closeBtn).toBeTruthy();

      await act(async () => {
        closeBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      expect(globalLocation?.search).not.toContain('inspectId=aud-001');
      expect(globalLocation?.search).toContain('entityType=Asset');
      expect(globalLocation?.search).toContain('entityId=ast-402');
    });

    it('inspecting a different row while inspectId is in URL updates selectedLog cleanly', async () => {
      await renderComponent(['/audit?inspectId=aud-001']);

      let drawer = document.querySelector('.ant-drawer');
      expect(drawer?.textContent).toContain('aud-001');
      expect(drawer?.textContent).toContain('Workstation WS-402');

      // Now click inspect on row 2 (aud-002) in the table
      const inspectButtons = container.querySelectorAll('button[aria-label^="Inspect event"]');
      expect(inspectButtons.length).toBeGreaterThanOrEqual(2);

      await act(async () => {
        (inspectButtons[1] as HTMLButtonElement).click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      drawer = document.querySelector('.ant-drawer');
      expect(drawer?.textContent).toContain('aud-002');
      expect(drawer?.textContent).toContain('Authentication Gateway');
    });
  });

  describe('Dimension 3: Auto-open Inspect Drawer on inspectId Beyond Initial Batch', () => {
    it('asynchronously fetches and opens drawer when inspectId is not present in initial batch', async () => {
      const distantLog: AuditLog = {
        id: 'aud-deep-epoch',
        timestamp: '2026-08-01T08:15:00Z',
        user: 'Database Migrator',
        userName: 'Database Migrator',
        userEmail: 'migrator@uims.internal',
        action: 'CONFIG_CHANGE',
        severity: 'Warning',
        entity: 'PostgreSQL Cluster',
        entityType: 'Database',
        entityId: 'db-cluster-01',
        ipAddress: '10.232.0.1',
        status: 'Success',
        statusCode: 200,
        durationMs: 150.2,
        details: 'Applied schema migration and reindexed AuditLog table.',
        oldValue: { maxConnections: 100 },
        newValue: { maxConnections: 250 },
      };

      (auditService.getLog as ReturnType<typeof vi.fn>).mockResolvedValueOnce(distantLog);

      await renderComponent(['/audit?inspectId=aud-deep-epoch']);

      expect(auditService.getLog).toHaveBeenCalledWith('aud-deep-epoch');
      const drawer = document.querySelector('.ant-drawer');
      expect(drawer).toBeTruthy();
      expect(drawer?.textContent).toContain('aud-deep-epoch');
      expect(drawer?.textContent).toContain('PostgreSQL Cluster');
      expect(drawer?.textContent).toContain('maxConnections');
      expect(drawer?.textContent).toContain('-100');
      expect(drawer?.textContent).toContain('+250');
    });

    it('avoids redundant duplicate getLog calls when getLogs finishes before getLog resolves', async () => {
      (auditService.getLog as ReturnType<typeof vi.fn>).mockClear();
      (auditService.getLogs as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(mockLogs), 10)),
      );
      (auditService.getLog as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  id: 'aud-slow-deep',
                  timestamp: '2026-08-01T08:15:00Z',
                  user: 'Slow User',
                  userName: 'Slow User',
                  userEmail: 'slow@uims.internal',
                  action: 'CONFIG_CHANGE',
                  severity: 'Info',
                  entity: 'Slow Entity',
                  entityType: 'Database',
                  status: 'Success',
                }),
              80,
            ),
          ),
      );

      await renderComponent(['/audit?inspectId=aud-slow-deep']);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Does it call getLog once or duplicate?
      expect(auditService.getLog).toHaveBeenCalledTimes(1);
    });

    it('handles 404 Not Found gracefully without crashing when inspectId does not exist', async () => {
      (auditService.getLog as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Audit log with ID aud-ghost not found'),
      );

      await renderComponent(['/audit?inspectId=aud-ghost']);

      expect(auditService.getLog).toHaveBeenCalledWith('aud-ghost');
      expect(mockMessageError).toHaveBeenCalledWith('Audit log with ID aud-ghost not found');

      // Drawer should not be rendered open
      const drawer = document.querySelector('.ant-drawer.ant-drawer-open');
      expect(drawer).toBeNull();
    });

    it('discards obsolete responses if inspectId changes before slow network fetch completes', async () => {
      let resolveSlowLog: ((log: AuditLog) => void) | null = null;
      const slowPromise = new Promise<AuditLog>((resolve) => {
        resolveSlowLog = resolve;
      });

      const fastLog: AuditLog = {
        id: 'aud-fast-2',
        timestamp: '2026-09-22T10:00:00Z',
        user: 'Fast Operator',
        userName: 'Fast Operator',
        userEmail: 'fast@uims.internal',
        action: 'UPDATE',
        severity: 'Info',
        entity: 'Fast Entity',
        entityType: 'Asset',
        entityId: 'ast-fast',
        ipAddress: '10.0.0.99',
        status: 'Success',
      };

      (auditService.getLog as ReturnType<typeof vi.fn>).mockImplementation((id: string) => {
        if (id === 'aud-slow-1') return slowPromise;
        if (id === 'aud-fast-2') return Promise.resolve(fastLog);
        return Promise.resolve(null);
      });

      await renderComponent(['/audit?inspectId=aud-slow-1']);

      // Before slow fetch resolves, user navigates to aud-fast-2
      await act(async () => {
        globalNavigate?.('/audit?inspectId=aud-fast-2');
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Now slow fetch resolves late
      await act(async () => {
        resolveSlowLog?.({
          id: 'aud-slow-1',
          timestamp: '2026-09-20T10:00:00Z',
          user: 'Slow Ghost',
          userName: 'Slow Ghost',
          userEmail: 'slow@uims.internal',
          action: 'CREATE',
          severity: 'Critical',
          entity: 'Slow Ghost Entity',
          entityType: 'Security',
          ipAddress: '1.2.3.4',
          status: 'Failed',
        });
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Active drawer must display aud-fast-2, NOT aud-slow-1
      const drawer = document.querySelector('.ant-drawer');
      expect(drawer?.textContent).toContain('aud-fast-2');
      expect(drawer?.textContent).toContain('Fast Entity');
      expect(drawer?.textContent).not.toContain('Slow Ghost Entity');
    });
  });

  describe('Dimension 4: Stress, Resilience & Complex Payloads', () => {
    it('renders drawer with large diff payload (50+ modified fields) without crashing', async () => {
      const largeOldValue: Record<string, unknown> = {};
      const largeNewValue: Record<string, unknown> = {};
      for (let i = 1; i <= 60; i++) {
        largeOldValue[`metric_field_${i}`] = `old_value_data_${i}`;
        largeNewValue[`metric_field_${i}`] = `new_value_data_${i}`;
      }

      const stressLog: AuditLog = {
        id: 'aud-stress-50',
        timestamp: '2026-10-10T12:00:00Z',
        user: 'Bulk Engine',
        userName: 'Bulk Engine',
        userEmail: 'bulk@uims.internal',
        action: 'UPDATE',
        severity: 'Info',
        entity: 'Cluster MegaNode',
        entityType: 'Server',
        entityId: 'srv-001',
        ipAddress: '10.100.1.5',
        status: 'Success',
        oldValue: largeOldValue,
        newValue: largeNewValue,
      };

      (auditService.getLogs as ReturnType<typeof vi.fn>).mockResolvedValueOnce([stressLog]);

      await renderComponent();

      const inspectBtn = container.querySelector(
        'button[aria-label="Inspect event aud-stress-50"]',
      );
      expect(inspectBtn).toBeTruthy();

      await act(async () => {
        (inspectBtn as HTMLButtonElement).click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const drawer = document.querySelector('.ant-drawer');
      expect(drawer).toBeTruthy();
      expect(drawer?.textContent).toContain('metric_field_1:');
      expect(drawer?.textContent).toContain('metric_field_60:');
      expect(drawer?.textContent).toContain('-old_value_data_60');
      expect(drawer?.textContent).toContain('+new_value_data_60');
    });

    it('survives missing optional attributes gracefully in drawer descriptions', async () => {
      const minimalLog: AuditLog = {
        id: 'aud-min-001',
        timestamp: '2026-09-20T10:00:00Z',
        user: '',
        userEmail: '',
        action: '',
        severity: '',
        entity: 'Unknown Entity',
        entityType: '',
        ipAddress: '',
        status: '',
        statusCode: null,
        durationMs: null,
        userAgent: null,
        details: '',
      };

      (auditService.getLogs as ReturnType<typeof vi.fn>).mockResolvedValueOnce([minimalLog]);

      await renderComponent();

      const inspectBtn = container.querySelector('button[aria-label="Inspect event aud-min-001"]');
      expect(inspectBtn).toBeTruthy();

      await act(async () => {
        (inspectBtn as HTMLButtonElement).click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const drawer = document.querySelector('.ant-drawer');
      expect(drawer).toBeTruthy();
      expect(drawer?.textContent).toContain('aud-min-001');
      expect(drawer?.textContent).toContain('Unknown Entity');
      // Origin IP defaults to 127.0.0.1
      expect(drawer?.textContent).toContain('127.0.0.1');
    });

    it('safely handles circular references in selectedLog.oldValue when drawer opens', async () => {
      const circularOld: Record<string, unknown> = { name: 'Router-01' };
      circularOld.self = circularOld;

      const circularLog: AuditLog = {
        id: 'aud-circ-001',
        timestamp: '2026-09-20T10:00:00Z',
        user: 'NetAdmin',
        userEmail: 'netadmin@uims.internal',
        action: 'UPDATE',
        severity: 'Info',
        entity: 'Core Router',
        entityType: 'Network',
        ipAddress: '10.0.0.1',
        status: 'Success',
        oldValue: circularOld,
      };

      (auditService.getLogs as ReturnType<typeof vi.fn>).mockResolvedValueOnce([circularLog]);

      await renderComponent();

      const inspectBtn = container.querySelector('button[aria-label="Inspect event aud-circ-001"]');
      expect(inspectBtn).toBeTruthy();

      await act(async () => {
        (inspectBtn as HTMLButtonElement).click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      const drawer = document.querySelector('.ant-drawer');
      expect(drawer).toBeTruthy();
    });
  });
});
