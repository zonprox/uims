import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuditLog, auditService } from '../services/audit.service';
import { ActivityTimeline } from './ActivityTimeline';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockMessageError = vi.fn();
const mockAppContext = {
  message: {
    success: vi.fn(),
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

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createMockLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 'log-1',
  timestamp: '2026-10-13T04:00:00.000Z',
  user: 'admin',
  userName: 'Administrator User',
  userEmail: 'admin@youngone.com',
  action: 'UPDATE_ASSET',
  severity: 'MEDIUM',
  entity: 'Hardware Asset AST-100',
  entityType: 'Hardware',
  entityId: 'ast-100',
  ipAddress: '192.168.1.50',
  status: 'SUCCESS',
  details: 'Updated asset status and owner department',
  oldValue: { status: 'In Storage', costCenter: 'CC-101' },
  newValue: { status: 'Active', costCenter: 'CC-202' },
  ...overrides,
});

describe('ActivityTimeline Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

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
    const portals = document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover');
    portals.forEach((p) => p.remove());
    container?.remove();
    document.body.innerHTML = '';
  });

  const renderComponent = async (props: {
    entityType: string;
    entityId: string;
    maxItems?: number;
    onViewFullAudit?: (type: string, id: string) => void;
  }) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          MemoryRouter,
          null,
          createElement(
            ConfigProvider,
            null,
            createElement(App, null, createElement(ActivityTimeline, props)),
          ),
        ),
      );
    });
  };

  it('renders empty state when no activity history is recorded', async () => {
    vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    await renderComponent({ entityType: 'Hardware', entityId: 'ast-empty' });

    expect(container.textContent).toContain('Activity History');
    expect(container.textContent).toContain('No activity history recorded for this entity.');
  });

  it('renders timeline event cards with action, actor attribution, and timestamps', async () => {
    const mockLog = createMockLog();
    vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
      items: [mockLog],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    await renderComponent({ entityType: 'Hardware', entityId: 'ast-100' });

    expect(container.textContent).toContain('UPDATE_ASSET');
    expect(container.textContent).toContain('Administrator User');
    expect(container.textContent).toContain('admin@youngone.com');
    expect(container.textContent).toContain('192.168.1.50');
    expect(container.textContent).toContain('Updated asset status and owner department');
  });

  it('renders and toggles expandable visual diff tags when oldValue and newValue exist', async () => {
    const mockLog = createMockLog();
    vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
      items: [mockLog],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    await renderComponent({ entityType: 'Hardware', entityId: 'ast-100' });

    // Diff toggle button should be visible
    const diffButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('View Diff (2 changes)'),
    );
    expect(diffButton).toBeDefined();

    // Click to expand diffs
    await act(async () => {
      diffButton?.click();
    });

    expect(container.textContent).toContain('costCenter:');
    expect(container.textContent).toContain('-CC-101');
    expect(container.textContent).toContain('+CC-202');
    expect(container.textContent).toContain('status:');
    expect(container.textContent).toContain('-In Storage');
    expect(container.textContent).toContain('+Active');

    // Toggle button text should change to "Hide Changes"
    expect(container.textContent).toContain('Hide Changes');

    // Click again to collapse
    const hideButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Hide Changes'),
    );
    await act(async () => {
      hideButton?.click();
    });

    expect(container.textContent).toContain('View Diff (2 changes)');
  });

  it('calls onViewFullAudit custom callback or navigates to /audit with query params', async () => {
    const mockLog = createMockLog();
    vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
      items: [mockLog],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const customOnViewFullAudit = vi.fn();
    await renderComponent({
      entityType: 'Hardware',
      entityId: 'ast-100',
      onViewFullAudit: customOnViewFullAudit,
    });

    const auditBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('View in Full Audit Trail'),
    );
    expect(auditBtn).toBeDefined();

    await act(async () => {
      auditBtn?.click();
    });

    expect(customOnViewFullAudit).toHaveBeenCalledWith('Hardware', 'ast-100');
  });

  it('navigates to /audit?entityType=...&entityId=... when onViewFullAudit is not supplied', async () => {
    const mockLog = createMockLog();
    vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
      items: [mockLog],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    await renderComponent({
      entityType: 'Hardware',
      entityId: 'ast-100',
    });

    const auditBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('View in Full Audit Trail'),
    );
    expect(auditBtn).toBeDefined();

    await act(async () => {
      auditBtn?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/audit?entityType=Hardware&entityId=ast-100');
  });

  it('falls back to getLogs if getEntityHistory rejects', async () => {
    const mockLog = createMockLog();
    vi.spyOn(auditService, 'getEntityHistory').mockRejectedValueOnce(new Error('Endpoint 404'));
    vi.spyOn(auditService, 'getLogs').mockResolvedValueOnce([mockLog]);

    await renderComponent({
      entityType: 'Hardware',
      entityId: 'ast-100',
    });

    expect(container.textContent).toContain('UPDATE_ASSET');
    expect(container.textContent).toContain('Administrator User');
  });
});
