import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuditLog, auditService } from '../services/audit.service';
import {
  ActivityTimeline,
  formatDiffValue,
  getActionColor,
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

describe('ActivityTimeline Empirical Adversarial Challenge', () => {
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
    const portals = document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover');
    portals.forEach((p) => {
      p.remove();
    });
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

  // =========================================================================
  // 1. Extreme Null and Undefined Robustness
  // =========================================================================
  describe('Mission 1: Null / Undefined / Corrupted Field Robustness', () => {
    it('renders cleanly when all optional fields are null or empty strings without throwing', async () => {
      const sparseLog: AuditLog = {
        id: 'sparse-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: '',
        userName: undefined,
        userEmail: '',
        action: '',
        severity: '',
        entity: '',
        entityType: 'Hardware',
        entityId: 'ast-sparse',
        ipAddress: '',
        status: 'SUCCESS',
        details: undefined,
        oldValue: null,
        newValue: null,
        diffPayload: null,
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [sparseLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-sparse' });

      // Should render fallback avatar "U" and name "System"
      expect(container.textContent).toContain('System');
      expect(container.textContent).toContain('Activity History');
      // Should not render undefined or null text in details
      expect(container.textContent).not.toContain('undefined');
      expect(container.textContent).not.toContain('NaN');
    });

    it('immediately aborts and renders empty state without network call if entityId or entityType is empty', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory');
      const getLogsSpy = vi.spyOn(auditService, 'getLogs');

      await renderComponent({ entityType: '', entityId: '' });

      expect(getHistorySpy).not.toHaveBeenCalled();
      expect(getLogsSpy).not.toHaveBeenCalled();
      expect(container.textContent).toContain('No activity history recorded for this entity.');
    });

    it('formatDiffValue helper handles extreme nullish and edge values correctly', () => {
      expect(formatDiffValue(null)).toBe('(none)');
      expect(formatDiffValue(undefined)).toBe('(none)');
      expect(formatDiffValue(0)).toBe('0');
      expect(formatDiffValue(false)).toBe('false');
      expect(formatDiffValue('')).toBe('(none)');
      expect(formatDiffValue(12345n)).toBe('12345');
    });
  });

  // =========================================================================
  // 2. Empty Diffs & Ignored Keys
  // =========================================================================
  describe('Mission 2: Empty Diffs and Ignored Keys Elimination', () => {
    it('filters out system audit metadata (createdAt, updatedAt, id) and suppresses diff button', async () => {
      const ignoredKeysLog: AuditLog = {
        id: 'ignored-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'admin',
        userName: 'Admin',
        userEmail: 'admin@youngone.com',
        action: 'UPDATE',
        severity: 'LOW',
        entity: 'Hardware Asset',
        entityType: 'Hardware',
        entityId: 'ast-meta',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        oldValue: {
          id: 'ast-meta',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        },
        newValue: {
          id: 'ast-meta',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-03T00:00:00Z',
        },
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [ignoredKeysLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-meta' });

      // No diff toggle button should exist because all keys were ignored
      const diffButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
        b.textContent?.includes('View Diff'),
      );
      expect(diffButtons.length).toBe(0);
      expect(getDiffChanges(ignoredKeysLog)).toEqual([]);
    });

    it('suppresses diff button when oldValue, newValue, and diffPayload are completely empty objects', async () => {
      const emptyDiffLog: AuditLog = {
        id: 'empty-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'admin',
        userName: 'Admin',
        userEmail: 'admin@youngone.com',
        action: 'VIEW',
        severity: 'INFO',
        entity: 'Hardware Asset',
        entityType: 'Hardware',
        entityId: 'ast-empty',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        oldValue: {},
        newValue: {},
        diffPayload: {},
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [emptyDiffLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-empty' });

      const diffButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
        b.textContent?.includes('View Diff'),
      );
      expect(diffButtons.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. Complex Data Shapes, Circular References & Formats
  // =========================================================================
  describe('Mission 3: Complex Data Types, Circular References & diffPayload', () => {
    it('safely renders nested objects, arrays, and circular references in diff without throwing', async () => {
      const circular: Record<string, unknown> = { key: 'val' };
      circular.self = circular;

      expect(formatDiffValue(circular)).toBe('[Object]');

      const complexLog: AuditLog = {
        id: 'complex-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'admin',
        userName: 'Admin',
        userEmail: 'admin@youngone.com',
        action: 'UPDATE_CONFIG',
        severity: 'MEDIUM',
        entity: 'Hardware Asset',
        entityType: 'Hardware',
        entityId: 'ast-complex',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        oldValue: {
          tags: ['hardware', 'legacy'],
          config: { timeout: 10, retries: 2 },
          active: false,
        },
        newValue: {
          tags: ['hardware', 'modernized'],
          config: { timeout: 30, retries: 5 },
          active: true,
        },
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [complexLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-complex' });

      const diffButton = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('View Diff (3 changes)'),
      );
      expect(diffButton).toBeDefined();

      await act(async () => {
        diffButton?.click();
      });

      expect(container.textContent).toContain('Active:');
      expect(container.textContent).toContain('false');
      expect(container.textContent).toContain('true');
      expect(container.textContent).toContain('Tags:');
      expect(container.textContent).toContain('["hardware","legacy"]');
      expect(container.textContent).toContain('["hardware","modernized"]');
      expect(container.textContent).toContain('Config:');
      expect(container.textContent).toContain('{"timeout":10,"retries":2}');
      expect(container.textContent).toContain('{"timeout":30,"retries":5}');
    });

    it('extracts changes from diffPayload when oldValue and newValue are absent', async () => {
      const diffPayloadLog: AuditLog = {
        id: 'payload-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'admin',
        userName: 'Admin',
        userEmail: 'admin@youngone.com',
        action: 'REASSIGN',
        severity: 'HIGH',
        entity: 'Hardware Asset',
        entityType: 'Hardware',
        entityId: 'ast-payload',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        oldValue: null,
        newValue: null,
        diffPayload: {
          assignedUserId: { old: 'usr-1', new: 'usr-2' },
          locationName: { old: 'Floor 1', new: 'Floor 3' },
        },
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [diffPayloadLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-payload' });

      const diffButton = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('View Diff (2 changes)'),
      );
      expect(diffButton).toBeDefined();

      await act(async () => {
        diffButton?.click();
      });

      expect(container.textContent).toContain('Assigned User ID:');
      expect(container.textContent).toContain('usr-1');
      expect(container.textContent).toContain('usr-2');
      expect(container.textContent).toContain('Location Name:');
      expect(container.textContent).toContain('Floor 1');
      expect(container.textContent).toContain('Floor 3');
    });
  });

  // =========================================================================
  // 4. Sensitive Redacted Tags
  // =========================================================================
  describe('Mission 4: Sensitive Redacted Tags Presentation', () => {
    it('cleanly presents [REDACTED] masks in diff tags without leaking secrets', async () => {
      const redactedLog: AuditLog = {
        id: 'redacted-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'security-officer',
        userName: 'Security Officer',
        userEmail: 'sec@youngone.com',
        action: 'UPDATE_CREDENTIALS',
        severity: 'CRITICAL',
        entity: 'User Account',
        entityType: 'User',
        entityId: 'usr-sec',
        ipAddress: '10.0.0.1',
        status: 'SUCCESS',
        oldValue: { password: '[REDACTED]', apiToken: '[REDACTED]' },
        newValue: { password: '[REDACTED]', apiToken: '[REDACTED]' },
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [redactedLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'User', entityId: 'usr-sec' });

      const diffButton = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('View Diff (2 changes)'),
      );
      expect(diffButton).toBeDefined();

      await act(async () => {
        diffButton?.click();
      });

      expect(container.textContent).toContain('Password:');
      expect(container.textContent).toContain('[REDACTED]');
      expect(container.textContent).toContain('API Token:');
    });
  });

  // =========================================================================
  // 5. Massive Payloads & Stress Test
  // =========================================================================
  describe('Mission 5: High Volume & Massive Diff Stress Test', () => {
    it('renders and toggles 100+ changed fields and long strings without crashing or freezing', async () => {
      const largeOld: Record<string, unknown> = {};
      const largeNew: Record<string, unknown> = {};

      const longString = 'A'.repeat(5000);
      largeOld.massiveDescription = `Old prefix ${longString}`;
      largeNew.massiveDescription = `New prefix ${longString}`;

      for (let i = 1; i <= 100; i++) {
        const key = `field_${String(i).padStart(3, '0')}`;
        largeOld[key] = `old_val_${i}`;
        largeNew[key] = `new_val_${i}`;
      }

      const stressLog: AuditLog = {
        id: 'stress-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'load-tester',
        userName: 'Load Tester',
        userEmail: 'tester@youngone.com',
        action: 'MASS_UPDATE',
        severity: 'HIGH',
        entity: 'Hardware Asset',
        entityType: 'Hardware',
        entityId: 'ast-stress',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
        oldValue: largeOld,
        newValue: largeNew,
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [stressLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const startTime = performance.now();
      await renderComponent({ entityType: 'Hardware', entityId: 'ast-stress' });

      const diffButton = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('View Diff (101 changes)'),
      );
      expect(diffButton).toBeDefined();

      await act(async () => {
        diffButton?.click();
      });

      const elapsed = performance.now() - startTime;
      expect(container.textContent).toContain('Field 001:');
      expect(container.textContent).toContain('Field 100:');
      expect(container.textContent).toContain('Massive Description:');
      // Rendering and expanding 101 changes in jsdom must complete without timeout (< 10000ms)
      expect(elapsed).toBeLessThan(10000);
    });

    it('renders 50 chronological timeline items cleanly with action badge coloring', async () => {
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'ASSIGN'];
      const bulkLogs: Array<AuditLog> = Array.from({ length: 50 }, (_, i) => ({
        id: `bulk-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        user: `user_${i}`,
        userName: `User ${i}`,
        userEmail: `user${i}@youngone.com`,
        action: actions[i % actions.length] ?? 'UPDATE',
        severity: i % 5 === 0 ? 'CRITICAL' : 'LOW',
        entity: `Hardware Asset AST-${i}`,
        entityType: 'Hardware',
        entityId: 'ast-bulk',
        ipAddress: `192.168.1.${i + 1}`,
        status: 'SUCCESS',
        details: `Event details for item ${i}`,
      }));

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: bulkLogs,
        total: 100,
        page: 1,
        pageSize: 50,
        totalPages: 2,
      });

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-bulk', maxItems: 50 });

      expect(container.textContent).toContain('Activity History');
      expect(container.textContent).toContain('50 of 100');
      expect(container.textContent).toContain('User 0');
      expect(container.textContent).toContain('User 49');
    });
  });

  // =========================================================================
  // 6. Network Failure & Fallback Resilience
  // =========================================================================
  describe('Mission 6: Network Resilience & Cascading Failure Handling', () => {
    it('dispatches message.error and stops loading when both primary and fallback APIs reject', async () => {
      vi.spyOn(auditService, 'getEntityHistory').mockRejectedValueOnce(
        new Error('Primary 503 Service Unavailable'),
      );
      vi.spyOn(auditService, 'getLogs').mockRejectedValueOnce(
        new Error('Fallback 500 Internal Server Error'),
      );

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-fail' });

      expect(mockMessageError).toHaveBeenCalledWith('Primary 503 Service Unavailable');
      expect(container.textContent).toContain('No activity history recorded for this entity.');
      // Skeleton loader should have disappeared
      expect(container.querySelector('.ant-skeleton')).toBeNull();
    });

    it('handles non-Error rejection payloads gracefully with fallback message', async () => {
      vi.spyOn(auditService, 'getEntityHistory').mockRejectedValueOnce(
        'Network connection timed out',
      );
      vi.spyOn(auditService, 'getLogs').mockRejectedValueOnce(404);

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-fail2' });

      expect(mockMessageError).toHaveBeenCalledWith('Failed to load activity history');
      expect(container.textContent).toContain('No activity history recorded for this entity.');
    });
  });

  // =========================================================================
  // 7. Deep-Link Navigation & URI Encoding
  // =========================================================================
  describe('Mission 7: Deep-Link Parameter Escaping & Navigation', () => {
    it('properly URI encodes complex entityType and entityId with slashes, ampersands, and hashes', async () => {
      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      await renderComponent({
        entityType: 'Hardware / Network & Storage',
        entityId: 'rack#12/switch?port=1&speed=1G',
      });

      const auditBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('View in Full Audit Trail'),
      );
      expect(auditBtn).toBeDefined();

      await act(async () => {
        auditBtn?.click();
      });

      const expectedUrl =
        '/audit?entityType=Hardware%20%2F%20Network%20%26%20Storage&entityId=rack%2312%2Fswitch%3Fport%3D1%26speed%3D1G';
      expect(mockNavigate).toHaveBeenCalledWith(expectedUrl);
    });

    it('passes unencoded raw parameters to custom onViewFullAudit callback when provided', async () => {
      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });

      const customCallback = vi.fn();
      await renderComponent({
        entityType: 'License / SaaS',
        entityId: 'lic-99',
        onViewFullAudit: customCallback,
      });

      const auditBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('View in Full Audit Trail'),
      );
      expect(auditBtn).toBeDefined();

      await act(async () => {
        auditBtn?.click();
      });

      expect(customCallback).toHaveBeenCalledWith('License / SaaS', 'lic-99');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. Action Color Mapping Helper
  // =========================================================================
  describe('Mission 8: Action Color Normalization', () => {
    it('maps all expected business actions and fallbacks accurately', () => {
      expect(getActionColor('CREATE')).toBe('success');
      expect(getActionColor('ADD_USER')).toBe('success');
      expect(getActionColor('UPDATE_ASSET')).toBe('warning');
      expect(getActionColor('EDIT_ROLE')).toBe('warning');
      expect(getActionColor('DELETE_RECORD')).toBe('error');
      expect(getActionColor('REVOKE_SEAT')).toBe('error');
      expect(getActionColor('ASSIGN_LICENSE')).toBe('processing');
      expect(getActionColor('ALLOCATE_IP')).toBe('processing');
      expect(getActionColor('RETURN_HARDWARE')).toBe('purple');
      expect(getActionColor('UNKNOWN_EVENT')).toBe('default');
      expect(getActionColor('')).toBe('default');
    });
  });
});
