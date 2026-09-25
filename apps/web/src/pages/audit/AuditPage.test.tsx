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
    id: 'aud-001',
    timestamp: '2026-09-20T10:00:00Z',
    user: 'Alex Vance',
    userName: 'Alex Vance',
    userEmail: 'alex.vance@uims.internal',
    action: 'CREATE',
    severity: 'Info',
    entity: 'Workstation WS-402',
    entityType: 'Asset',
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
    exportCsv: vi.fn().mockImplementation(() => Promise.resolve('ID,Timestamp\naud-001,2026')),
  },
}));

describe('AuditPage Component Tests', () => {
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
    // Clean up stray portals
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
    // Wait for initial async state updates
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  };

  it('renders PageContainer title, breadcrumbs, and genuine operational telemetry indicators', async () => {
    await renderComponent();

    expect(container.textContent).toContain('System Activity Logs');
    expect(container.textContent).toContain('Total Recorded Events');
    expect(container.textContent).toContain('Failed Actions');
    expect(container.textContent).toContain('Security Alerts');
    expect(container.textContent).toContain('Error Rate');

    // Strict invariant: verify mock compliance scores are NOT rendered
    expect(container.textContent).not.toContain('SOC2 Type II Adherence');
    expect(container.textContent).not.toContain('ISO 27001 Readiness');
    expect(container.textContent).not.toContain('98.4%');
    expect(container.textContent).not.toContain('96.0%');
  });

  it('renders Activity Logs table with records, actor identity, action tags, and status codes', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Alex Vance');
    expect(container.textContent).toContain('alex.vance@uims.internal');
    expect(container.textContent).toContain('CREATE');
    expect(container.textContent).toContain('Workstation WS-402');
    expect(container.textContent).toContain('10.232.100.15');

    expect(container.textContent).toContain('System Threat Defense');
    expect(container.textContent).toContain('LOGIN_FAILED');
    expect(container.textContent).toContain('89.248.163.2');
  });

  it('renders search bar, action filter, severity filter, status filter, and export button', async () => {
    await renderComponent();

    const searchInput = container.querySelector(
      'input[placeholder="Search by actor, entity, IP address, details..."]',
    );
    expect(searchInput).toBeTruthy();

    const buttons = Array.from(container.querySelectorAll('button'));
    const exportBtn = buttons.find((b) => b.textContent?.includes('Export CSV'));
    expect(exportBtn).toBeTruthy();
  });

  it('opens inspector drawer on inspect button click and displays sanitized request payload', async () => {
    await renderComponent();

    const inspectButtons = container.querySelectorAll('button[aria-label^="Inspect event"]');
    expect(inspectButtons.length).toBeGreaterThan(0);

    await act(async () => {
      (inspectButtons[0] as HTMLButtonElement).click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    // Verify drawer opened with details
    const drawer = document.querySelector('.ant-drawer');
    expect(drawer).toBeTruthy();
    expect(drawer?.textContent).toContain('aud-001');
    expect(drawer?.textContent).toContain('Alex Vance');
    expect(drawer?.textContent).toContain('Sanitized Request Payload & Diff');
    expect(drawer?.textContent).toContain('Dell Precision 3660');
  });

  it('renders DatePicker RangePicker in toolbar', async () => {
    await renderComponent();

    const rangePicker = container.querySelector('.ant-picker-range');
    expect(rangePicker).toBeTruthy();
  });

  it('renders before and after state cards in drawer when oldValue and newValue exist', async () => {
    const logWithDiff: AuditLog = {
      id: 'aud-003',
      timestamp: '2026-09-21T09:00:00Z',
      user: 'IT Admin',
      userEmail: 'it.admin@uims.internal',
      action: 'UPDATE',
      severity: 'Warning',
      entity: 'VLAN-100',
      entityType: 'Network',
      ipAddress: '10.0.0.1',
      status: 'Success',
      oldValue: { subnet: '192.168.1.0/24' },
      newValue: { subnet: '192.168.2.0/24' },
    };

    (auditService.getLogs as ReturnType<typeof vi.fn>).mockResolvedValueOnce([logWithDiff]);
    await renderComponent();

    const inspectBtn = container.querySelector('button[aria-label="Inspect event aud-003"]');
    expect(inspectBtn).toBeTruthy();

    await act(async () => {
      (inspectBtn as HTMLButtonElement).click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    const drawer = document.querySelector('.ant-drawer');
    expect(drawer?.textContent).toContain('Previous State (Before Mutation)');
    expect(drawer?.textContent).toContain('192.168.1.0/24');
    expect(drawer?.textContent).toContain('Updated State (After Mutation)');
    expect(drawer?.textContent).toContain('192.168.2.0/24');
  });

  it('triggers exportCsv on button click and handles successful CSV download', async () => {
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

    expect(auditService.exportCsv).toHaveBeenCalled();
  });

  it('displays user error notification when exportCsv fails', async () => {
    (auditService.exportCsv as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Export service unavailable'),
    );
    await renderComponent();

    const buttons = Array.from(container.querySelectorAll('button'));
    const exportBtn = buttons.find((b) => b.textContent?.includes('Export CSV'));
    expect(exportBtn).toBeTruthy();

    await act(async () => {
      exportBtn?.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });

    expect(auditService.exportCsv).toHaveBeenCalled();
    expect(mockMessageError).toHaveBeenCalledWith('Export service unavailable');
  });

  it('handles copying payload to clipboard in inspector drawer', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    try {
      await renderComponent();

      const inspectBtn = container.querySelector('button[aria-label="Inspect event aud-001"]');
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
      expect(mockMessageSuccess).toHaveBeenCalledWith('Payload copied to clipboard.');
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
        writable: true,
      });
    }
  });

  it('displays user error notification when getStats fails and avoids in-memory approximations', async () => {
    (auditService.getStats as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Operational telemetry service offline'),
    );
    await renderComponent();

    expect(auditService.getStats).toHaveBeenCalled();
    expect(mockMessageError).toHaveBeenCalledWith('Operational telemetry service offline');
    // Table should still render logs
    expect(container.textContent).toContain('Alex Vance');
    // Stats must not be populated with filtered slice approximation or fake metrics
    expect(container.textContent).not.toContain('Total Recorded Events');
    expect(container.textContent).not.toContain('2 Alerts');
  });

  it('displays user error notification when getLogs fails', async () => {
    (auditService.getLogs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Audit logs store unavailable'),
    );
    await renderComponent();

    expect(auditService.getLogs).toHaveBeenCalled();
    expect(mockMessageError).toHaveBeenCalledWith('Audit logs store unavailable');
  });

  it('renders stats and logs correctly when both succeed', async () => {
    await renderComponent();

    expect(auditService.getLogs).toHaveBeenCalled();
    expect(auditService.getStats).toHaveBeenCalled();
    expect(mockMessageError).not.toHaveBeenCalled();

    // Stats rendered correctly
    expect(container.textContent).toContain('Total Recorded Events');
    expect(container.textContent).toContain('142');
    expect(container.textContent).toContain('Failed Actions');
    expect(container.textContent).toContain('7');
    expect(container.textContent).toContain('Security Alerts');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Error Rate');
    expect(container.textContent).toContain('4.9%');

    // Logs rendered correctly
    expect(container.textContent).toContain('Alex Vance');
    expect(container.textContent).toContain('System Threat Defense');
  });

  it('falls back to document.execCommand when navigator.clipboard is unavailable', async () => {
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    try {
      await renderComponent();

      const inspectBtn = container.querySelector('button[aria-label="Inspect event aud-001"]');
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
      expect(mockMessageSuccess).toHaveBeenCalledWith('Payload copied to clipboard.');
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
        writable: true,
      });
    }
  });

  it('displays error notification when copying payload to clipboard fails completely', async () => {
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

      const inspectBtn = container.querySelector('button[aria-label="Inspect event aud-001"]');
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

      expect(mockMessageError).toHaveBeenCalledWith('Failed to copy payload to clipboard.');
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
        writable: true,
      });
    }
  });
});
