import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuditLog, auditService } from '../services/audit.service';
import {
  ActivityTimeline,
  type ActivityTimelineProps,
  formatActionLabel,
  formatDiffValue,
  formatFieldName,
  getDiffChanges,
} from './ActivityTimeline';

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

  const renderComponent = async (props: ActivityTimelineProps) => {
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

    expect(container.textContent).toContain('Update Asset');
    expect(container.textContent).toContain('Administrator User');
    expect(container.textContent).toContain('admin@youngone.com');
    // Raw IP address must be omitted from compact drawer timeline view
    expect(container.textContent).not.toContain('192.168.1.50');
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

    // Human-readable Title Case field names
    expect(container.textContent).toContain('Cost Center:');
    expect(container.textContent).toContain('CC-101');
    expect(container.textContent).toContain('CC-202');
    // Clean diff pills without git-style - and + prefixes
    expect(container.textContent).not.toContain('-CC-101');
    expect(container.textContent).not.toContain('+CC-202');

    expect(container.textContent).toContain('Status:');
    expect(container.textContent).toContain('In Storage');
    expect(container.textContent).toContain('Active');
    expect(container.textContent).not.toContain('-In Storage');
    expect(container.textContent).not.toContain('+Active');

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

  it('navigates to /audit with inspectId when per-event Inspect button is clicked', async () => {
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

    const inspectBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) =>
        btn.textContent?.includes('Inspect') &&
        btn.getAttribute('title')?.includes('Inspect in Full Audit Trail'),
    );
    expect(inspectBtn).toBeDefined();

    await act(async () => {
      inspectBtn?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/audit?entityType=Hardware&entityId=ast-100&inspectId=log-1',
    );
  });

  it('calls onInspectEvent callback when provided and Inspect button is clicked', async () => {
    const mockLog = createMockLog();
    vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
      items: [mockLog],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const onInspectEvent = vi.fn();
    await renderComponent({
      entityType: 'Hardware',
      entityId: 'ast-100',
      onInspectEvent,
    });

    const inspectBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) =>
        btn.textContent?.includes('Inspect') &&
        btn.getAttribute('title')?.includes('Inspect in Full Audit Trail'),
    );
    expect(inspectBtn).toBeDefined();

    await act(async () => {
      inspectBtn?.click();
    });

    expect(onInspectEvent).toHaveBeenCalledWith('log-1');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders (none) for null, undefined, or empty diff values', async () => {
    const nullDiffLog = createMockLog({
      id: 'log-none',
      oldValue: { notes: '' },
      newValue: { notes: null },
    });

    vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
      items: [nullDiffLog],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    await renderComponent({ entityType: 'Hardware', entityId: 'ast-none' });

    const diffButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('View Diff'),
    );
    await act(async () => {
      diffButton?.click();
    });

    expect(container.textContent).toContain('Notes:');
    expect(container.textContent).toContain('(none)');
  });

  it('filters out noisy metadata keys like tenantId and organizationId from diffs', () => {
    const log = createMockLog({
      id: 'log-meta',
      oldValue: {
        id: 'uuid-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
        deletedAt: null,
        tenantId: 'tenant-123',
        organizationId: 'org-456',
        costCenter: 'Old CC',
      },
      newValue: {
        id: 'uuid-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-03',
        deletedAt: null,
        tenantId: 'tenant-123',
        organizationId: 'org-456',
        costCenter: 'New CC',
      },
    });

    const diffs = getDiffChanges(log);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.key).toBe('costCenter');
  });

  it('falls back to getLogs if getEntityHistory rejects', async () => {
    const mockLog = createMockLog();
    vi.spyOn(auditService, 'getEntityHistory').mockRejectedValueOnce(new Error('Endpoint 404'));
    vi.spyOn(auditService, 'getLogs').mockResolvedValueOnce([mockLog]);

    await renderComponent({
      entityType: 'Hardware',
      entityId: 'ast-100',
    });

    expect(container.textContent).toContain('Update Asset');
    expect(container.textContent).toContain('Administrator User');
  });
});

describe('ActivityTimeline Helper Functions', () => {
  describe('formatActionLabel helper', () => {
    it('converts uppercase action codes to Title Case labels and preserves acronyms', () => {
      expect(formatActionLabel('UPDATE_ASSET')).toBe('Update Asset');
      expect(formatActionLabel('CREATE_USER')).toBe('Create User');
      expect(formatActionLabel('INVENTORY_RESTOCKED')).toBe('Inventory Restocked');
      expect(formatActionLabel('LICENSE_SEAT_ASSIGNED')).toBe('License Seat Assigned');
      expect(formatActionLabel('IP_ALLOCATED')).toBe('IP Allocated');
      expect(formatActionLabel('VLAN_CREATED')).toBe('VLAN Created');
      expect(formatActionLabel('MAC_UPDATED')).toBe('MAC Updated');
      expect(formatActionLabel('')).toBe('');
    });
  });

  describe('formatFieldName helper', () => {
    it('converts camelCase and snake_case keys into Title Case labels with colons', () => {
      expect(formatFieldName('costCenter')).toBe('Cost Center:');
      expect(formatFieldName('purchaseDate')).toBe('Purchase Date:');
      expect(formatFieldName('assignedUserId')).toBe('Assigned User ID:');
      expect(formatFieldName('locationName')).toBe('Location Name:');
      expect(formatFieldName('ipAddress')).toBe('IP Address:');
      expect(formatFieldName('vlanId')).toBe('VLAN ID:');
      expect(formatFieldName('cidrBlock')).toBe('CIDR Block:');
      expect(formatFieldName('password')).toBe('Password:');
      expect(formatFieldName('apiToken')).toBe('API Token:');
      expect(formatFieldName('field_001')).toBe('Field 001:');
      expect(formatFieldName('field_100')).toBe('Field 100:');
      expect(formatFieldName('massiveDescription')).toBe('Massive Description:');
    });

    it('supports omitting the trailing colon when includeColon is false', () => {
      expect(formatFieldName('costCenter', false)).toBe('Cost Center');
      expect(formatFieldName('assignedUserId', false)).toBe('Assigned User ID');
    });
  });

  describe('formatDiffValue helper', () => {
    it('handles null, undefined, and empty string as (none)', () => {
      expect(formatDiffValue(null)).toBe('(none)');
      expect(formatDiffValue(undefined)).toBe('(none)');
      expect(formatDiffValue('')).toBe('(none)');
      expect(formatDiffValue(0)).toBe('0');
      expect(formatDiffValue(false)).toBe('false');
    });
  });
});
