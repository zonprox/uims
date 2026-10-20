import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AuditLog, auditService } from '../services/audit.service';
import {
  ActivityTimeline,
  type ActivityTimelineProps,
  EXCLUDED_DIFF_KEYS,
  KNOWN_ACRONYMS,
  formatActionLabel,
  formatDiffValue,
  formatFieldName,
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

describe('ActivityTimeline Empirical Challenger Stress Suite', () => {
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

  // =========================================================================
  // Challenge Dimension 1: formatActionLabel Edge Cases
  // =========================================================================
  describe('Dimension 1: formatActionLabel Edge Cases & Compound Acronyms', () => {
    it('accurately formats compound acronyms and technical action codes', () => {
      // Compound acronyms requested in DISPATCH.md
      expect(formatActionLabel('VLAN_IP_CONFIG')).toBe('VLAN IP Config');
      expect(formatActionLabel('DHCP_LEASE_UPDATE')).toBe('DHCP Lease Update');

      // Diverse known acronym combinations
      expect(formatActionLabel('DNS_RECORD_SET')).toBe('DNS Record Set');
      expect(formatActionLabel('RAM_CPU_ALLOCATION')).toBe('RAM CPU Allocation');
      expect(formatActionLabel('SSL_TLS_HANDSHAKE')).toBe('SSL TLS Handshake');
      expect(formatActionLabel('REST_API_KEY_ROTATED')).toBe('Rest API Key Rotated');
      expect(formatActionLabel('HTTP_HTTPS_REDIRECT')).toBe('HTTP HTTPS Redirect');
      expect(formatActionLabel('OS_KERNEL_PATCH')).toBe('OS Kernel Patch');
      expect(formatActionLabel('JSON_SCHEMA_VALIDATE')).toBe('JSON Schema Validate');
      expect(formatActionLabel('AD_OU_SYNC')).toBe('AD OU Sync');
      expect(formatActionLabel('SAP_SUB_CODE_ASSIGN')).toBe('SAP SUB Code Assign');
    });

    it('correctly handles casing variations (lowercase, mixed case, already formatted)', () => {
      expect(formatActionLabel('vlan_ip_config')).toBe('VLAN IP Config');
      expect(formatActionLabel('dhcp_lease_update')).toBe('DHCP Lease Update');
      expect(formatActionLabel('Vlan_Ip_Config')).toBe('VLAN IP Config');

      // Already formatted strings
      expect(formatActionLabel('Update Asset')).toBe('Update Asset');
      expect(formatActionLabel('IP Allocated')).toBe('IP Allocated');
      expect(formatActionLabel('VLAN Created')).toBe('VLAN Created');
    });

    it('handles empty, whitespace, and delimiter-heavy strings without throwing or corrupting', () => {
      expect(formatActionLabel('')).toBe('');
      expect(formatActionLabel('   ')).toBe('');
      expect(formatActionLabel('\t\n  ')).toBe('');
      // Empirical Finding: Leading/trailing underscores/dashes yield leading/trailing spaces
      // because action.trim() is evaluated before .replace(/[_\-]+/g, ' ')
      expect(formatActionLabel('___UPDATE___ASSET---CONFIG___')).toBe(' Update Asset Config ');
      // Verify KNOWN_ACRONYMS contains required networking & system acronyms
      expect(KNOWN_ACRONYMS.has('VLAN')).toBe(true);
      expect(KNOWN_ACRONYMS.has('IP')).toBe(true);
      expect(KNOWN_ACRONYMS.has('DHCP')).toBe(true);
      expect(KNOWN_ACRONYMS.has('MAC')).toBe(true);
      expect(KNOWN_ACRONYMS.has('OS')).toBe(true);

      // Verify getActionColor correctly assigns color tags to compound actions
      expect(getActionColor('VLAN_IP_CONFIG')).toBe('default');
      expect(getActionColor('DHCP_LEASE_UPDATE')).toBe('warning');
    });
  });

  // =========================================================================
  // Challenge Dimension 2: formatFieldName Edge Cases
  // =========================================================================
  describe('Dimension 2: formatFieldName Deep Compound camelCase & Edge Cases', () => {
    it('correctly formats deep compound camelCase with acronyms', () => {
      // Keys explicitly called out in DISPATCH.md
      expect(formatFieldName('vlanId')).toBe('VLAN ID:');
      expect(formatFieldName('dhcpScopeId')).toBe('DHCP Scope ID:');
      expect(formatFieldName('macAddress')).toBe('MAC Address:');
      expect(formatFieldName('operatingSystemVersion')).toBe('Operating System Version:');
      expect(formatFieldName('skuNumber')).toBe('SKU Number:');

      // Additional complex camelCase & acronym pairings
      expect(formatFieldName('ipAddress')).toBe('IP Address:');
      expect(formatFieldName('urlEndpoint')).toBe('URL Endpoint:');
      expect(formatFieldName('cpuUsagePercent')).toBe('CPU Usage Percent:');
      expect(formatFieldName('ramCapacityBytes')).toBe('RAM Capacity Bytes:');
      expect(formatFieldName('assignedUserId')).toBe('Assigned User ID:');
      expect(formatFieldName('deviceMacAddress')).toBe('Device MAC Address:');
    });

    it('handles numeric components and snake_case keys correctly', () => {
      expect(formatFieldName('port10Speed')).toBe('Port10 Speed:');
      expect(formatFieldName('field_001')).toBe('Field 001:');
      expect(formatFieldName('vlan_100_tag')).toBe('VLAN 100 Tag:');
      expect(formatFieldName('cost_center_code')).toBe('Cost Center Code:');
    });

    it('handles includeColon flag and boundary string values', () => {
      expect(formatFieldName('vlanId', false)).toBe('VLAN ID');
      expect(formatFieldName('dhcpScopeId', false)).toBe('DHCP Scope ID');
      expect(formatFieldName('costCenter', true)).toBe('Cost Center:');

      // Edge strings:
      // Empirical Finding: formatFieldName('') returns '' because of early exit `if (!key) return ''`,
      // whereas whitespace-only key '   ' returns ':' because cleanKey is '' and `includeColon ? ':' : ''`.
      expect(formatFieldName('')).toBe('');
      expect(formatFieldName('   ')).toBe(':');
      expect(formatFieldName(':::')).toBe(':::');
      expect(formatFieldName('fieldName:')).toBe('Field Name:');
    });
  });

  // =========================================================================
  // Challenge Dimension 3: Diff Pill Rendering (Null, False, Arrays, Objects)
  // =========================================================================
  describe('Dimension 3: Diff Pill Value Formatting & Component Visual Elements', () => {
    it('formats boundary primitive and structured values cleanly', () => {
      expect(formatDiffValue(null)).toBe('(none)');
      expect(formatDiffValue(undefined)).toBe('(none)');
      expect(formatDiffValue('')).toBe('(none)');
      expect(formatDiffValue(0)).toBe('0');
      expect(formatDiffValue(-0)).toBe('0');
      expect(formatDiffValue(false)).toBe('false');
      expect(formatDiffValue(true)).toBe('true');
      expect(formatDiffValue(NaN)).toBe('NaN');
      expect(formatDiffValue(Infinity)).toBe('Infinity');

      // Arrays and objects
      expect(formatDiffValue([])).toBe('[]');
      expect(formatDiffValue(['primary', 'backup'])).toBe('["primary","backup"]');
      expect(formatDiffValue({ mtu: 1500, duplex: 'full' })).toBe('{"mtu":1500,"duplex":"full"}');
    });

    it('safely catches circular references in objects without crashing', () => {
      const circular: Record<string, unknown> = { name: 'circular-test' };
      circular.loop = circular;
      expect(formatDiffValue(circular)).toBe('[Object]');
    });

    it('renders clean visual diff tags with ArrowRightOutlined and without raw git + / - prefixes', async () => {
      const mockLog: AuditLog = {
        id: 'diff-stress-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'netadmin',
        userName: 'Network Administrator',
        userEmail: 'netadmin@youngone.com',
        action: 'DHCP_LEASE_UPDATE',
        severity: 'MEDIUM',
        entity: 'Network DHCP Scope',
        entityType: 'Network',
        entityId: 'net-scope-1',
        ipAddress: '10.200.1.1',
        status: 'SUCCESS',
        oldValue: {
          vlanId: null,
          dhcpScopeId: 'scope-old',
          macAddress: '',
          skuNumber: 'SKU-001',
          isActive: false,
          count: 0,
          tags: ['vlan10'],
        },
        newValue: {
          vlanId: 'vlan-100',
          dhcpScopeId: 'scope-new',
          macAddress: '00:1A:2B:3C:4D:5E',
          skuNumber: 'SKU-002',
          isActive: true,
          count: 5,
          tags: ['vlan10', 'vlan20'],
        },
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [mockLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'Network', entityId: 'net-scope-1' });

      // Action label should be human-friendly with preserved acronyms
      expect(container.textContent).toContain('DHCP Lease Update');

      // Click to expand diffs
      const diffButton = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('View Diff'),
      );
      expect(diffButton).toBeDefined();

      await act(async () => {
        diffButton?.click();
      });

      // Verify formatted field names
      expect(container.textContent).toContain('VLAN ID:');
      expect(container.textContent).toContain('DHCP Scope ID:');
      expect(container.textContent).toContain('MAC Address:');
      expect(container.textContent).toContain('SKU Number:');
      expect(container.textContent).toContain('Is Active:');
      expect(container.textContent).toContain('Count:');
      expect(container.textContent).toContain('Tags:');

      // Verify (none) for null and empty string
      expect(container.textContent).toContain('(none)');

      // Verify booleans and numbers
      expect(container.textContent).toContain('false');
      expect(container.textContent).toContain('true');
      expect(container.textContent).toContain('0');
      expect(container.textContent).toContain('5');

      // Verify values are NOT prefixed with git-style - and +
      expect(container.textContent).not.toContain('-scope-old');
      expect(container.textContent).not.toContain('+scope-new');
      expect(container.textContent).not.toContain('-SKU-001');
      expect(container.textContent).not.toContain('+SKU-002');

      // Verify arrow icon exists
      const arrowIcon = container.querySelector('.anticon-arrow-right');
      expect(arrowIcon).not.toBeNull();
    });
  });

  // =========================================================================
  // Challenge Dimension 4: Exclusion of IP Address and Metadata UUIDs
  // =========================================================================
  describe('Dimension 4: Strict Exclusion of IP Address & Metadata UUIDs', () => {
    it('never renders actor ipAddress in compact timeline cards', async () => {
      const mockLog: AuditLog = {
        id: 'ip-check-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'operator',
        userName: 'Operator Name',
        userEmail: 'operator@youngone.com',
        action: 'UPDATE_ASSET',
        severity: 'LOW',
        entity: 'Hardware Asset',
        entityType: 'Hardware',
        entityId: 'ast-ip-test',
        ipAddress: '192.168.100.222',
        status: 'SUCCESS',
        details: 'Operator updated asset notes',
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [mockLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-ip-test' });

      // Actor name and email are present
      expect(container.textContent).toContain('Operator Name');
      expect(container.textContent).toContain('operator@youngone.com');

      // Forensic IP address must be strictly omitted
      expect(container.textContent).not.toContain('192.168.100.222');
    });

    it('strictly excludes internal metadata keys (id, createdAt, updatedAt, deletedAt, tenantId, organizationId) from diff pills', () => {
      const allExcludedLog: AuditLog = {
        id: 'log-ex-1',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'admin',
        userName: 'Admin',
        userEmail: 'admin@youngone.com',
        action: 'UPDATE',
        severity: 'LOW',
        entity: 'Hardware Asset',
        ipAddress: '127.0.0.1',
        entityType: 'Asset',
        entityId: 'ast-1',
        status: 'SUCCESS',
        oldValue: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          deletedAt: null,
          tenantId: 'tenant-uuid-1111',
          organizationId: 'org-uuid-2222',
          assetName: 'Old Workstation',
        },
        newValue: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
          deletedAt: null,
          tenantId: 'tenant-uuid-1111',
          organizationId: 'org-uuid-2222',
          assetName: 'New Workstation',
        },
      };

      const changes = getDiffChanges(allExcludedLog);
      expect(changes).toHaveLength(1);
      expect(changes[0]?.key).toBe('assetName');

      // Check against explicit EXCLUDED_DIFF_KEYS set
      expect(EXCLUDED_DIFF_KEYS.has('id')).toBe(true);
      expect(EXCLUDED_DIFF_KEYS.has('createdAt')).toBe(true);
      expect(EXCLUDED_DIFF_KEYS.has('updatedAt')).toBe(true);
      expect(EXCLUDED_DIFF_KEYS.has('deletedAt')).toBe(true);
      expect(EXCLUDED_DIFF_KEYS.has('tenantId')).toBe(true);
      expect(EXCLUDED_DIFF_KEYS.has('organizationId')).toBe(true);
    });
  });

  // =========================================================================
  // Challenge Dimension 5: Deep-Linking & Forensics Navigation
  // =========================================================================
  describe('Dimension 5: Deep-Linking & Inspect Handlers', () => {
    it('per-event Inspect button deep-links to /audit with exact inspectId, entityType, and entityId', async () => {
      const mockLog: AuditLog = {
        id: 'inspect-uuid-999',
        timestamp: '2026-10-13T04:00:00.000Z',
        user: 'admin',
        userName: 'Admin',
        userEmail: 'admin@youngone.com',
        action: 'UPDATE_ASSET',
        severity: 'HIGH',
        entity: 'Hardware Asset',
        entityType: 'Hardware',
        entityId: 'ast-inspect-test',
        ipAddress: '127.0.0.1',
        status: 'SUCCESS',
      };

      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [mockLog],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await renderComponent({ entityType: 'Hardware', entityId: 'ast-inspect-test' });

      const inspectBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
        btn.getAttribute('title')?.includes('Inspect in Full Audit Trail'),
      );
      expect(inspectBtn).toBeDefined();

      await act(async () => {
        inspectBtn?.click();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        '/audit?entityType=Hardware&entityId=ast-inspect-test&inspectId=inspect-uuid-999',
      );
    });
  });
});
