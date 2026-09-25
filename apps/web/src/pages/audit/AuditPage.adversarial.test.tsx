import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuditLog, type AuditStats, auditService } from '../../services/audit.service';
import AuditPage from './AuditPage';

const mockLogs: AuditLog[] = [
  {
    id: 'aud-adv-001',
    timestamp: '2026-09-22T08:00:00Z',
    user: 'Security Sentinel',
    userName: 'Security Sentinel',
    userEmail: 'sentinel@uims.internal',
    action: 'DELETE',
    severity: 'Critical',
    entity: 'Firewall Rule FW-901',
    entityType: 'Network',
    ipAddress: '192.168.10.50',
    status: 'Failed',
    statusCode: 403,
    durationMs: 12.4,
    details: 'Unauthorized attempt to delete border gateway policy.',
    diffPayload: { ruleId: 'FW-901', reason: 'Blocked by RBAC' },
  },
  {
    id: 'aud-adv-002',
    timestamp: '2026-09-22T09:15:00Z',
    user: 'Ops Engineer',
    userName: 'Ops Engineer',
    userEmail: 'ops@uims.internal',
    action: 'UPDATE',
    severity: 'Warning',
    entity: 'Database Replica',
    entityType: 'Infrastructure',
    ipAddress: '10.0.1.20',
    status: 'Blocked',
    statusCode: 429,
    durationMs: 85.0,
    details: 'Rate limit exceeded on failover trigger.',
  },
];

const mockStats: AuditStats = {
  totalEvents: 500,
  failedEvents: 42,
  criticalEvents: 18,
  errorRate: '8.4%',
  totalEventRecords: '500',
  securityAnomalies: '18 Alerts',
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
  modal: { confirm: vi.fn() },
  notification: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
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
    exportCsv: vi.fn().mockImplementation(() => Promise.resolve('ID,Timestamp\naud-adv-001,2026')),
  },
}));

describe('AuditPage Adversarial Empirical Verification Suite', () => {
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

  const renderComponent = async () => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          MemoryRouter,
          null,
          createElement(ConfigProvider, null, createElement(App, null, createElement(AuditPage))),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  };

  describe('Adversarial Challenge 1: getStats Failure Invariant (Zero Approximations)', () => {
    it('surfaces explicit error and NEVER synthesizes metrics from table rows when getStats rejects', async () => {
      (auditService.getLogs as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockLogs);
      (auditService.getStats as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Audit telemetry aggregation timeout (504 Gateway Timeout)'),
      );

      await renderComponent();

      // 1. Error notification surfaced
      expect(mockMessageError).toHaveBeenCalledTimes(1);
      expect(mockMessageError).toHaveBeenCalledWith(
        'Audit telemetry aggregation timeout (504 Gateway Timeout)',
      );

      // 2. Table records ARE rendered
      expect(container.textContent).toContain('Security Sentinel');
      expect(container.textContent).toContain('Ops Engineer');

      // 3. Telemetry stat cards are completely omitted (undefined)
      expect(container.textContent).not.toContain('Total Recorded Events');
      expect(container.textContent).not.toContain('Failed Actions');
      expect(container.textContent).not.toContain('Security Alerts');
      expect(container.textContent).not.toContain('Error Rate');

      // 4. Specifically verify NO partial list fallback metrics (e.g. "2", "100.0%", "1 Alerts")
      expect(container.textContent).not.toContain('100.0%');
      expect(container.textContent).not.toContain('1 Alerts');
    });

    it('surfaces standardized fallback error when getStats rejects with non-Error object', async () => {
      (auditService.getStats as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
        status: 500,
        unhandled: true,
      });

      await renderComponent();

      expect(mockMessageError).toHaveBeenCalledWith(
        'Failed to load operational telemetry. Please try again.',
      );
      expect(container.textContent).not.toContain('Total Recorded Events');
    });
  });

  describe('Adversarial Challenge 2: getLogs Failure Invariant', () => {
    it('surfaces error and renders empty table state when getLogs rejects', async () => {
      (auditService.getLogs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('PostgreSQL audit log connection pool exhausted'),
      );
      (auditService.getStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockStats);

      await renderComponent();

      expect(mockMessageError).toHaveBeenCalledTimes(1);
      expect(mockMessageError).toHaveBeenCalledWith(
        'PostgreSQL audit log connection pool exhausted',
      );

      // Stats still rendered since getStats succeeded
      expect(container.textContent).toContain('Total Recorded Events');
      expect(container.textContent).toContain('500');

      // Table contains no log rows
      expect(container.textContent).not.toContain('Security Sentinel');
      expect(container.textContent).toContain('No data');
    });

    it('surfaces both errors when both getLogs and getStats reject simultaneously', async () => {
      (auditService.getLogs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Database network partition'),
      );
      (auditService.getStats as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Redis telemetry cache unreachable'),
      );

      await renderComponent();

      expect(mockMessageError).toHaveBeenCalledTimes(2);
      expect(mockMessageError).toHaveBeenCalledWith('Database network partition');
      expect(mockMessageError).toHaveBeenCalledWith('Redis telemetry cache unreachable');

      expect(container.textContent).not.toContain('Total Recorded Events');
      expect(container.textContent).toContain('No data');
    });
  });

  describe('Adversarial Challenge 3: Clipboard Copy Robustness & Fallback Protocol', () => {
    it('successfully falls back to document.execCommand when navigator.clipboard.writeText throws NotAllowedError', async () => {
      const originalClipboard = navigator.clipboard;
      const writeTextMock = vi
        .fn()
        .mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;

      try {
        await renderComponent();

        const inspectBtn = container.querySelector(
          'button[aria-label="Inspect event aud-adv-001"]',
        );
        expect(inspectBtn).toBeTruthy();

        await act(async () => {
          (inspectBtn as HTMLButtonElement).click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 60));
        });

        const copyBtn = document.querySelector('.ant-drawer button .anticon-copy')
          ?.parentElement as HTMLButtonElement | null;
        expect(copyBtn).toBeTruthy();

        await act(async () => {
          copyBtn?.click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 60));
        });

        // Verify writeText was attempted and failed
        expect(writeTextMock).toHaveBeenCalled();
        // Verify execCommand fallback was engaged and succeeded
        expect(execCommandMock).toHaveBeenCalledWith('copy');
        // Success notification
        expect(mockMessageSuccess).toHaveBeenCalledWith('Payload copied to clipboard.');
        expect(mockMessageError).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(navigator, 'clipboard', {
          value: originalClipboard,
          configurable: true,
          writable: true,
        });
      }
    });

    it('surfaces error notification if BOTH writeText and document.execCommand fail', async () => {
      const originalClipboard = navigator.clipboard;
      const writeTextMock = vi
        .fn()
        .mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));

      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      const execCommandMock = vi.fn().mockImplementation(() => {
        throw new Error('execCommand disabled in environment');
      });
      document.execCommand = execCommandMock;

      try {
        await renderComponent();

        const inspectBtn = container.querySelector(
          'button[aria-label="Inspect event aud-adv-001"]',
        );
        expect(inspectBtn).toBeTruthy();

        await act(async () => {
          (inspectBtn as HTMLButtonElement).click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 60));
        });

        const copyBtn = document.querySelector('.ant-drawer button .anticon-copy')
          ?.parentElement as HTMLButtonElement | null;
        expect(copyBtn).toBeTruthy();

        await act(async () => {
          copyBtn?.click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 60));
        });

        expect(writeTextMock).toHaveBeenCalled();
        expect(execCommandMock).toHaveBeenCalled();
        expect(mockMessageError).toHaveBeenCalledWith('Failed to copy payload to clipboard.');
        expect(mockMessageSuccess).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(navigator, 'clipboard', {
          value: originalClipboard,
          configurable: true,
          writable: true,
        });
      }
    });

    it('surfaces error notification if navigator.clipboard is undefined and execCommand returns false', async () => {
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      const execCommandMock = vi.fn().mockReturnValue(false);
      document.execCommand = execCommandMock;

      try {
        await renderComponent();

        const inspectBtn = container.querySelector(
          'button[aria-label="Inspect event aud-adv-001"]',
        );
        expect(inspectBtn).toBeTruthy();

        await act(async () => {
          (inspectBtn as HTMLButtonElement).click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 60));
        });

        const copyBtn = document.querySelector('.ant-drawer button .anticon-copy')
          ?.parentElement as HTMLButtonElement | null;
        expect(copyBtn).toBeTruthy();

        await act(async () => {
          copyBtn?.click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 60));
        });

        expect(execCommandMock).toHaveBeenCalledWith('copy');
        expect(mockMessageError).toHaveBeenCalledWith('Failed to copy payload to clipboard.');
        expect(mockMessageSuccess).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(navigator, 'clipboard', {
          value: originalClipboard,
          configurable: true,
          writable: true,
        });
      }
    });
  });

  describe('Adversarial Challenge 4: Export CSV Failure & Object URL Lifecycle', () => {
    it('surfaces error notification when exportCsv API endpoint fails', async () => {
      (auditService.exportCsv as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('CSV export stream terminated prematurely'),
      );

      await renderComponent();

      const buttons = Array.from(container.querySelectorAll('button'));
      const exportBtn = buttons.find((b) => b.textContent?.includes('Export CSV'));
      expect(exportBtn).toBeTruthy();

      await act(async () => {
        exportBtn?.click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      expect(mockMessageError).toHaveBeenCalledWith('CSV export stream terminated prematurely');
      expect(mockMessageSuccess).not.toHaveBeenCalled();
    });

    it('cleanly invokes URL.createObjectURL and URL.revokeObjectURL on export', async () => {
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
      const mockRevokeObjectURL = vi.fn();
      window.URL.createObjectURL = mockCreateObjectURL;
      window.URL.revokeObjectURL = mockRevokeObjectURL;

      (auditService.exportCsv as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        'ID,Timestamp\naud-adv-001,2026',
      );

      await renderComponent();

      const buttons = Array.from(container.querySelectorAll('button'));
      const exportBtn = buttons.find((b) => b.textContent?.includes('Export CSV'));

      await act(async () => {
        exportBtn?.click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
      expect(mockMessageSuccess).toHaveBeenCalledWith(
        'Activity logs exported successfully as RFC 4180 CSV.',
      );
    });
  });

  describe('Adversarial Challenge 5: Search & Filter State Reset', () => {
    it('clears query filter state when Reset button is clicked', async () => {
      await renderComponent();

      const searchInput = container.querySelector(
        'input[placeholder="Search by actor, entity, IP address, details..."]',
      ) as HTMLInputElement | null;
      expect(searchInput).toBeTruthy();

      await act(async () => {
        if (searchInput) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
          )?.set;
          setter?.call(searchInput, 'Firewall');
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Reset button should now be visible
      const buttons = Array.from(container.querySelectorAll('button'));
      const resetBtn = buttons.find((b) => b.textContent?.trim() === 'Reset');
      expect(resetBtn).toBeTruthy();

      await act(async () => {
        resetBtn?.click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Reset button disappears after resetting filters
      const updatedButtons = Array.from(container.querySelectorAll('button'));
      const resetBtnAfter = updatedButtons.find((b) => b.textContent?.trim() === 'Reset');
      expect(resetBtnAfter).toBeFalsy();
    });
  });
});
