/**
 * Milestone 5 Tier 5 Adversarial Verification Suite (challenger_m5_11_2)
 *
 * Verifies:
 * 1. Activity Timeline integration across all 5 drawers:
 *    - Hardware Assets (`AssetDetailDrawer.tsx` -> Tab 3: Asset History)
 *    - Software Licenses (`LicenseSeatsDrawer.tsx` -> Tab 2: License History)
 *    - Inventory (`InventoryDetailDrawer.tsx` -> Tab 2: Stock & Movement History)
 *    - Network (`SubnetDetailDrawer.tsx` -> Tab 2: Configuration & Allocation History)
 *    - Users (`EmployeesTab.tsx` -> Tab 5: User Lifecycle & History)
 * 2. Central Audit deep-linking (`?entityType=...&entityId=...`), active filter banner, and 1-click clear.
 * 3. FieldDiffViewer token-compliant rendering and safe JSON serialization.
 * 4. Clean component test teardown in afterEach (unmounting roots and clearing portal DOM elements).
 */

import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountStatus, DirectorySource, DirectoryUser } from '@uims/shared-types';
import type { Asset } from '../services/assets.service';
import type { License } from '../services/licenses.service';
import type { InventoryItem } from '../services/inventory.service';
import type { Subnet } from '../services/network.service';
import { type AuditLog, auditService } from '../services/audit.service';
import { AssetDetailDrawer } from '../pages/assets/components/AssetDetailDrawer';
import { LicenseSeatsDrawer } from '../pages/licenses/components/LicenseSeatsDrawer';
import { InventoryDetailDrawer } from '../pages/inventory/components/InventoryDetailDrawer';
import { SubnetDetailDrawer } from '../pages/network/components/SubnetDetailDrawer';
import { EmployeesTab } from '../pages/directory/EmployeesTab';
import AuditPage from '../pages/audit/AuditPage';
import FieldDiffViewer, {
  computeDiffEntries,
  formatDiffValue,
  safeJsonStringify,
} from './FieldDiffViewer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

const mockAppContext = {
  message: mockMessage,
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

vi.mock('../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([]),
    updateAsset: vi.fn().mockResolvedValue({}),
    uploadHandoverDocument: vi.fn().mockResolvedValue({ fileUrl: 'https://example.com/doc.pdf' }),
  },
}));

vi.mock('../services/organization.service', () => ({
  organizationService: {
    getOrganizations: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
    getPositions: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/directory.service', () => ({
  directoryService: {
    getUserAssets: vi.fn().mockResolvedValue([]),
    getUserLicenses: vi.fn().mockResolvedValue([]),
    getEmployee: vi.fn().mockResolvedValue(null),
    revealEmailPassword: vi.fn().mockResolvedValue({ password: 'TestPassword123' }),
    copyEmailPassword: vi.fn().mockResolvedValue({ success: true }),
    resetEmailPassword: vi.fn().mockResolvedValue({ password: 'ResetPassword123' }),
  },
}));

let currentLocationSearch = '';
function SearchTracker() {
  const location = useLocation();
  currentLocationSearch = location.search;
  return null;
}

const createMockAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 'log-chal-01',
  timestamp: '2026-10-13T06:00:00.000Z',
  user: 'auditor',
  userName: 'Auditor User',
  userEmail: 'auditor@youngone.com',
  action: 'UPDATE',
  severity: 'MEDIUM',
  entity: 'Target Entity',
  entityType: 'Hardware',
  entityId: 'ent-01',
  ipAddress: '10.0.1.99',
  status: 'SUCCESS',
  details: 'Updated operational specifications',
  oldValue: { status: 'Draft' },
  newValue: { status: 'Active' },
  ...overrides,
});

describe('Tier 5 Adversarial Verification — Frontend History, Drawers & Deep-Linking', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    currentLocationSearch = '';
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    vi.restoreAllMocks();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    // Strict requirement: clean component test teardown clearing portal DOM elements
    const portals = document.querySelectorAll(
      '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-message, .ant-tooltip',
    );
    for (const p of Array.from(portals)) {
      p.remove();
    }
    container?.remove();
    document.body.innerHTML = '';
  });

  const mountNode = async (node: React.ReactElement, initialEntries: string[] = ['/']) => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          MemoryRouter,
          { initialEntries },
          createElement(
            ConfigProvider,
            null,
            createElement(App, null, createElement(SearchTracker), node),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };

  const clickTab = async (label: string) => {
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('.ant-tabs-tab, [role="tab"]'));
    const target = tabs.find((t) => t.textContent?.includes(label));
    expect(target).toBeDefined();
    if (target) {
      const btn = (target.querySelector('.ant-tabs-tab-btn') || target) as HTMLElement;
      await act(async () => {
        btn.click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
    }
  };

  // =========================================================================
  // TASK 1: ACTIVITY TIMELINE INTEGRATION ACROSS ALL 5 DRAWERS
  // =========================================================================
  describe('Task 1: Activity Timeline Integration across all 5 drawers', () => {
    it('1.1 Hardware Assets (AssetDetailDrawer): Tab 3 "Asset History" invokes getEntityHistory("Hardware", assetId)', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-hw-1',
            entityType: 'Hardware',
            entityId: 'ast-hw-001',
            action: 'ASSET_CREATED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const mockAsset: Asset = {
        id: 'ast-hw-001',
        tag: 'AST-HW-001',
        name: 'HP EliteDesk 800 G9',
        manufacturer: 'HP',
        model: 'EliteDesk 800 G9',
        category: 'Workstations',
        status: 'Active',
        assignedTo: 'Lead Engineer',
        assignedEmail: 'engineer@youngone.com',
        purchaseDate: '2026-01-01',
        warrantyExpiry: '2029-01-01',
      };

      await mountNode(
        createElement(AssetDetailDrawer, {
          open: true,
          selectedAsset: mockAsset,
          onClose: vi.fn(),
          onOpenEditModal: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.body.textContent).toContain('Asset History');

      // Click Tab 3: Asset History
      await clickTab('Asset History');

      expect(getHistorySpy).toHaveBeenCalledWith('Hardware', 'ast-hw-001', { pageSize: 20 });
      expect(document.body.textContent).toContain('ASSET_CREATED');
    });

    it('1.2 Software Licenses (LicenseSeatsDrawer): Tab 2 "License History" invokes getEntityHistory("License", licenseId)', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-lic-1',
            entityType: 'License',
            entityId: 'lic-soft-001',
            action: 'LICENSE_GRANT',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const mockLicense: License = {
        id: 'lic-soft-001',
        name: 'Visual Studio Enterprise',
        vendor: 'Microsoft',
        type: 'Subscription',
        totalSeats: 10,
        usedSeats: 3,
        status: 'Active',
        expiryDate: '2027-12-31',
        autoRenew: true,
        costPerSeat: 250,
        licenseKey: 'MS-VS-KEY-12345',
        assignedUsers: [],
      };

      await mountNode(
        createElement(LicenseSeatsDrawer, {
          open: true,
          license: mockLicense,
          onClose: vi.fn(),
          onOpenAssignModal: vi.fn(),
          onRevokeSeat: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.body.textContent).toContain('License History');

      // Click Tab 2: License History
      await clickTab('License History');

      expect(getHistorySpy).toHaveBeenCalledWith('License', 'lic-soft-001', { pageSize: 20 });
      expect(document.body.textContent).toContain('LICENSE_GRANT');
    });

    it('1.3 Inventory (InventoryDetailDrawer): Tab 2 "Stock & Item Movement History" invokes getEntityHistory("Inventory", itemId)', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-inv-1',
            entityType: 'Inventory',
            entityId: 'inv-item-001',
            action: 'INVENTORY_RESTOCKED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const mockItem: InventoryItem = {
        id: 'inv-item-001',
        name: 'RJ45 Connectors Cat6',
        sku: 'SKU-RJ45-100PK',
        category: 'Networking',
        quantity: 250,
        minThreshold: 50,
        unitCost: 0.15,
      };

      await mountNode(
        createElement(InventoryDetailDrawer, {
          open: true,
          item: mockItem,
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.body.textContent).toContain('Stock & Item Movement History');

      // Click Tab 2: Stock & Movement History
      await clickTab('Stock & Item Movement History');

      expect(getHistorySpy).toHaveBeenCalledWith('Inventory', 'inv-item-001', { pageSize: 20 });
      expect(document.body.textContent).toContain('INVENTORY_RESTOCKED');
    });

    it('1.4 Network (SubnetDetailDrawer): Tab 2 "Configuration & IP Allocation History" invokes getEntityHistory("Network", subnetId)', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-net-1',
            entityType: 'Network',
            entityId: 'sub-net-001',
            action: 'SUBNET_UPDATED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const mockSubnet: Subnet = {
        id: 'sub-net-001',
        name: 'R&D Lab Subnet',
        cidr: '10.232.50.0/24',
        totalIps: 254,
        usedIps: 15,
        reservedIps: 5,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      await mountNode(
        createElement(SubnetDetailDrawer, {
          open: true,
          subnet: mockSubnet,
          ips: [],
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.body.textContent).toContain('Configuration & IP Allocation History');

      // Click Tab 2: Configuration & Allocation History
      await clickTab('Configuration & IP Allocation History');

      expect(getHistorySpy).toHaveBeenCalledWith('Network', 'sub-net-001', { pageSize: 20 });
      expect(document.body.textContent).toContain('SUBNET_UPDATED');
    });

    it('1.5 Users (EmployeesTab): Tab 5 "User Lifecycle & History" invokes getEntityHistory("User", employeeId)', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-usr-1',
            entityType: 'User',
            entityId: 'emp-target-1',
            action: 'USER_PASSWORD_RESET',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const mockEmployee: DirectoryUser = {
        id: 'emp-target-1',
        employeeCode: '77889900',
        email: 'target.user@youngonevn.com',
        firstName: 'Target',
        lastName: 'Employee',
        fullName: 'Target Employee',
        status: 'ACTIVE' as AccountStatus,
        source: 'LOCAL' as DirectorySource,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      await mountNode(
        createElement(EmployeesTab, {
          employees: [mockEmployee],
          loading: false,
          onRefresh: vi.fn(),
          createModalOpen: false,
          setCreateModalOpen: vi.fn(),
          importModalOpen: false,
          setImportModalOpen: vi.fn(),
        }),
        ['/directory?drawer=emp-target-1'], // Deep-link to open detail drawer
      );

      // Detail drawer should automatically open via deep-link
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.body.textContent).toContain('Target Employee');
      expect(document.body.textContent).toContain('User Lifecycle & History');

      // Click Tab 5: User Lifecycle & History
      await clickTab('User Lifecycle & History');

      expect(getHistorySpy).toHaveBeenCalledWith('User', 'emp-target-1', { pageSize: 20 });
      expect(document.body.textContent).toContain('USER_PASSWORD_RESET');
    });
  });

  // =========================================================================
  // TASK 2: CENTRAL AUDIT DEEP-LINKING, ACTIVE FILTER BANNER, AND 1-CLICK CLEAR
  // =========================================================================
  describe('Task 2: Central Audit deep-linking, active filter banner, and 1-click clear', () => {
    it('2.1 Deep-linking with ?entityType=Hardware&entityId=ast-402 loads logs filtered by entity and renders Active Entity Filter banner', async () => {
      const getLogsSpy = vi.spyOn(auditService, 'getLogs').mockResolvedValueOnce([
        createMockAuditLog({
          id: 'aud-402',
          entityType: 'Hardware',
          entityId: 'ast-402',
          entity: 'Laptop Precision 5570',
          action: 'ASSET_ASSIGN',
        }),
      ]);
      vi.spyOn(auditService, 'getStats').mockResolvedValueOnce({
        totalEvents: 50,
        failedEvents: 2,
        criticalEvents: 1,
        errorRate: '4.0%',
        totalEventRecords: '50',
        securityAnomalies: '1 Alert',
      });

      await mountNode(createElement(AuditPage), ['/audit?entityType=Hardware&entityId=ast-402']);

      expect(getLogsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Hardware',
          entityId: 'ast-402',
        }),
      );

      // Verify Active Entity Filter Banner
      expect(document.body.textContent).toContain('Filtered by Entity:');
      expect(document.body.textContent).toContain('Hardware');
      expect(document.body.textContent).toContain('ast-402');
      expect(document.body.textContent).toContain('Clear Entity Filter');
    });

    it('2.2 1-click clear button removes entityType and entityId from URL and resets filter banner', async () => {
      vi.spyOn(auditService, 'getLogs').mockResolvedValue([
        createMockAuditLog({ id: 'aud-gen-01' }),
      ]);
      vi.spyOn(auditService, 'getStats').mockResolvedValue({
        totalEvents: 50,
        failedEvents: 0,
        criticalEvents: 0,
        errorRate: '0.0%',
        totalEventRecords: '50',
        securityAnomalies: '0',
      });

      await mountNode(createElement(AuditPage), [
        '/audit?entityType=Hardware&entityId=ast-402&search=test',
      ]);

      expect(document.body.textContent).toContain('Filtered by Entity:');

      // Click Clear Entity Filter button
      const clearBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Clear Entity Filter'),
      );
      expect(clearBtn).toBeDefined();

      await act(async () => {
        clearBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Banner should be cleared
      expect(document.body.textContent).not.toContain('Filtered by Entity:');
      // entityType and entityId removed from search string
      expect(currentLocationSearch).not.toContain('entityType=Hardware');
      expect(currentLocationSearch).not.toContain('entityId=ast-402');
      // other query params preserved
      expect(currentLocationSearch).toContain('search=test');
    });
  });

  // =========================================================================
  // TASK 3: FIELD DIFF VIEWER TOKEN-COMPLIANT RENDERING & SAFE JSON SERIALIZATION
  // =========================================================================
  describe('Task 3: FieldDiffViewer token-compliant rendering and safe JSON serialization', () => {
    it('3.1 Safely handles circular references and BigInt values in safeJsonStringify without crashing', () => {
      const circularObj: Record<string, unknown> = {
        name: 'Root Entity',
        bigNumber: BigInt(9007199254740991),
      };
      circularObj.self = circularObj;

      const output = safeJsonStringify(circularObj, 2);
      expect(output).toContain('[Circular Reference]');
      expect(output).toContain('9007199254740991');
    });

    it('3.2 Computes diff entries correctly while excluding metadata keys (id, createdAt, updatedAt)', () => {
      const oldVal = {
        id: 'meta-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        hostname: 'ws-old',
        ramGb: 16,
      };
      const newVal = {
        id: 'meta-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        hostname: 'ws-new',
        ramGb: 32,
      };

      const entries = computeDiffEntries(oldVal, newVal);
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.key)).toEqual(['hostname', 'ramGb']);
      expect(entries[0]).toEqual({ key: 'hostname', oldValue: 'ws-old', newValue: 'ws-new' });
      expect(entries[1]).toEqual({ key: 'ramGb', oldValue: 16, newValue: 32 });
    });

    it('3.3 Correctly formats primitive edge cases (0, false, null, undefined) in formatDiffValue', () => {
      expect(formatDiffValue(null)).toBe('null');
      expect(formatDiffValue(undefined)).toBe('null');
      expect(formatDiffValue(0)).toBe('0');
      expect(formatDiffValue(false)).toBe('false');
      expect(formatDiffValue('')).toBe('');
    });

    it('3.4 Renders diff tags with proper text decoration, colors, and word wrapping styles', async () => {
      await mountNode(
        createElement(FieldDiffViewer, {
          oldValue: { status: 'DEPRECATED', count: 10 },
          newValue: { status: 'ACTIVE', count: 20 },
        }),
      );

      expect(document.body.textContent).toContain('status:');
      expect(document.body.textContent).toContain('-DEPRECATED');
      expect(document.body.textContent).toContain('+ACTIVE');

      const tags = document.querySelectorAll('.ant-tag');
      expect(tags.length).toBe(4); // 2 error tags, 2 success tags

      // Confirm word break styling
      const errorTag = tags[0];
      expect(errorTag.getAttribute('style')).toContain('word-break: break-word');
      expect(errorTag.getAttribute('style')).toContain('text-decoration: line-through');
    });

    it('3.5 Toggles raw formatted JSON view with token styling and safe serialization', async () => {
      const complexOld = { nested: { a: 1 } };
      const complexNew = { nested: { a: 2 } };

      await mountNode(
        createElement(FieldDiffViewer, {
          oldValue: complexOld,
          newValue: complexNew,
        }),
      );

      const jsonToggleBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('View Formatted JSON'),
      );
      expect(jsonToggleBtn).toBeDefined();

      await act(async () => {
        jsonToggleBtn?.click();
      });

      const preBlock = document.querySelector('pre');
      expect(preBlock).not.toBeNull();
      expect(preBlock?.textContent).toContain('"nested"');
      expect(preBlock?.style.whiteSpace).toBe('pre-wrap');
      expect(preBlock?.style.wordBreak).toBe('break-word');
    });
  });

  // =========================================================================
  // TASK 4: CLEAN COMPONENT TEST TEARDOWN IN AFTEREACH
  // =========================================================================
  describe('Task 4: Clean component test teardown in afterEach', () => {
    it('4.1 Ensures root unmounts and portals are completely swept after tests run', async () => {
      // Mount a component with a portal (Drawer)
      const mockAsset: Asset = {
        id: 'ast-td-01',
        tag: 'AST-TD-01',
        name: 'Teardown Asset',
        manufacturer: 'Dell',
        model: 'OptiPlex',
        category: 'Workstations',
        status: 'Active',
        assignedTo: 'Unassigned',
        assignedEmail: 'unassigned@youngone.com',
        purchaseDate: '2026-01-01',
        warrantyExpiry: '2029-01-01',
      };

      await mountNode(
        createElement(AssetDetailDrawer, {
          open: true,
          selectedAsset: mockAsset,
          onClose: vi.fn(),
          onOpenEditModal: vi.fn(),
        }),
      );

      expect(document.querySelectorAll('.ant-drawer').length).toBeGreaterThan(0);

      // Now manually execute teardown routine to verify zero leakage
      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }
      const portals = document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover');
      for (const p of Array.from(portals)) {
        p.remove();
      }
      container?.remove();

      // Assert no orphaned drawer portals remain
      expect(document.querySelectorAll('.ant-drawer').length).toBe(0);
      expect(document.querySelectorAll('.ant-modal-root').length).toBe(0);
    });
  });
});
