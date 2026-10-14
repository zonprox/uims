/**
 * Adversarial Empirical Verification Suite: Detail Drawer Tab Integrations & Canonical Entity Types
 *
 * Validates:
 * 1. Hardware Assets: AssetDetailDrawer.tsx (Tab: Asset History, entityType: 'Hardware')
 * 2. Software Licenses: LicenseSeatsDrawer.tsx (Tab: License History, entityType: 'License')
 * 3. Consumable Inventory: InventoryDetailDrawer.tsx (Tab: Stock & Item Movement History, entityType: 'Inventory')
 * 4. Network: SubnetDetailDrawer.tsx (Tab: Configuration & IP Allocation History, entityType: 'Network')
 * 5. Users: UserDetailDrawer.tsx & EmployeesTab (Tab / Section: User History, entityType: 'User')
 * 6. Adversarial edge cases: null entity data, network failure fallback, clean React 19 unmount teardown
 */

import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type AppUser, UserStatus } from '@uims/shared-types';
import type { Asset } from '../services/assets.service';
import type { License } from '../services/licenses.service';
import { type InventoryItem, inventoryService } from '../services/inventory.service';
import type { IPAddress, Subnet } from '../services/network.service';
import { type AuditLog, auditService } from '../services/audit.service';
import { AssetDetailDrawer } from '../pages/assets/components/AssetDetailDrawer';
import { LicenseSeatsDrawer } from '../pages/licenses/components/LicenseSeatsDrawer';
import { InventoryDetailDrawer } from '../pages/inventory/components/InventoryDetailDrawer';
import InventoryPage from '../pages/inventory/InventoryPage';
import { SubnetDetailDrawer } from '../pages/network/components/SubnetDetailDrawer';
import { UserDetailDrawer } from '../pages/access/UserDetailDrawer';
import { organizationService } from '../services/organization.service';
import { vendorService } from '../services/vendor.service';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock('../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([]),
    updateAsset: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/inventory.service', () => ({
  inventoryService: {
    getItems: vi.fn().mockResolvedValue([]),
    getCategories: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({
      totalSkus: 0,
      totalUnits: 0,
      totalValuation: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    }),
  },
}));

vi.mock('../services/vendor.service', () => ({
  vendorService: {
    getVendors: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/organization.service', () => ({
  organizationService: {
    getLocations: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
    getOrganizations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

const createMockAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 'log-101',
  timestamp: '2026-10-13T04:15:00.000Z',
  user: 'admin',
  userName: 'SecOps Administrator',
  userEmail: 'secops@youngone.com',
  action: 'UPDATE',
  severity: 'MEDIUM',
  entity: 'Target Entity',
  entityType: 'Hardware',
  entityId: 'ent-1',
  ipAddress: '10.0.1.55',
  status: 'SUCCESS',
  details: 'Configuration parameter updated via admin drawer',
  oldValue: { status: 'Inactive', code: 'C-01' },
  newValue: { status: 'Active', code: 'C-02' },
  ...overrides,
});

describe('Empirical Adversarial Challenge — Detail Drawer Tab Integrations & Canonical Entity Types', () => {
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
    vi.restoreAllMocks();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const portals = document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover');
    portals.forEach((p) => p.remove());
    container?.remove();
    document.body.innerHTML = '';
  });

  const mountComponent = async (node: React.ReactElement) => {
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
          null,
          createElement(ConfigProvider, null, createElement(App, null, node)),
        ),
      );
    });
    // Allow promises and microtasks to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  };

  const switchToTab = async (label: string) => {
    const tabs = Array.from(document.querySelectorAll<HTMLElement>('.ant-tabs-tab, [role="tab"]'));
    const targetTab = tabs.find((t) => t.textContent?.includes(label));
    expect(targetTab).toBeDefined();
    if (targetTab) {
      const clickable = (targetTab.querySelector('.ant-tabs-tab-btn') || targetTab) as HTMLElement;
      await act(async () => {
        clickable.click();
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });
    }
  };

  // =========================================================================
  // DOMAIN 1: HARDWARE ASSETS (AssetDetailDrawer)
  // =========================================================================
  describe('Domain 1: Hardware Assets (AssetDetailDrawer)', () => {
    const mockAsset: Asset = {
      id: 'ast-hw-999',
      tag: 'AST-HW-999',
      name: 'Dell Precision 7960 Workstation',
      manufacturer: 'Dell',
      model: '7960',
      serialNumber: 'SN-DELL-999',
      category: 'Desktops & Workstations',
      categoryId: 'cat-desktop',
      status: 'Active',
      assignedTo: 'Lead Designer',
      assignedEmail: 'designer@youngone.com',
      purchaseDate: '2026-02-01',
      warrantyExpiry: '2029-02-01',
    };

    it('renders AssetDetailDrawer with Tab 3 "Asset History" passing canonical entityType "Hardware"', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-ast-1',
            entityType: 'Hardware',
            entityId: 'ast-hw-999',
            action: 'ASSET_UPDATED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(
        createElement(AssetDetailDrawer, {
          open: true,
          selectedAsset: mockAsset,
          onClose: vi.fn(),
          onOpenEditModal: vi.fn(),
        }),
      );

      // Verify drawer opened
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      const bodyText = document.body.textContent || '';
      expect(bodyText).toContain('Dell Precision 7960 Workstation');
      expect(bodyText).toContain('Asset History');

      // Click on the "Asset History" tab to activate lazy tab pane
      await switchToTab('Asset History');

      // Verify canonical entityType "Hardware" called
      expect(getHistorySpy).toHaveBeenCalledWith('Hardware', 'ast-hw-999', { pageSize: 20 });
    });

    it('returns null and leaves DOM clean when selectedAsset is null', async () => {
      await mountComponent(
        createElement(AssetDetailDrawer, {
          open: true,
          selectedAsset: null,
          onClose: vi.fn(),
          onOpenEditModal: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).toBeNull();
    });
  });

  // =========================================================================
  // DOMAIN 2: SOFTWARE LICENSES (LicenseSeatsDrawer)
  // =========================================================================
  describe('Domain 2: Software Licenses (LicenseSeatsDrawer)', () => {
    const mockLicense: License = {
      id: 'lic-soft-888',
      name: 'JetBrains All Products Pack',
      vendor: 'JetBrains s.r.o.',
      type: 'Subscription',
      licenseKey: 'JB-XXXX-YYYY',
      totalSeats: 25,
      usedSeats: 12,
      expiryDate: '2027-01-01',
      costPerSeat: 499.0,
      status: 'Active',
      autoRenew: true,
      assignedUsers: [
        {
          id: 'user-seat-1',
          name: 'Nguyen Van A',
          email: 'nva@youngonevn.com',
          department: 'IT Systems',
          assignedDate: '2026-03-01',
        },
      ],
    };

    it('renders LicenseSeatsDrawer with Tab 2 "License History" passing canonical entityType "License"', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-lic-1',
            entityType: 'License',
            entityId: 'lic-soft-888',
            action: 'LICENSE_SEAT_ASSIGNED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(
        createElement(LicenseSeatsDrawer, {
          open: true,
          license: mockLicense,
          onClose: vi.fn(),
          onOpenAssignModal: vi.fn(),
          onRevokeSeat: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      const bodyText = document.body.textContent || '';
      expect(bodyText).toContain('JetBrains All Products Pack');
      expect(bodyText).toContain('Seat Allocations');
      expect(bodyText).toContain('License History');

      await switchToTab('License History');

      expect(getHistorySpy).toHaveBeenCalledWith('License', 'lic-soft-888', { pageSize: 20 });
    });

    it('returns null safely when license is null', async () => {
      await mountComponent(
        createElement(LicenseSeatsDrawer, {
          open: true,
          license: null,
          onClose: vi.fn(),
          onOpenAssignModal: vi.fn(),
          onRevokeSeat: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).toBeNull();
    });
  });

  // =========================================================================
  // DOMAIN 3: CONSUMABLE INVENTORY (InventoryDetailDrawer)
  // =========================================================================
  describe('Domain 3: Consumable Inventory (InventoryDetailDrawer)', () => {
    const mockItem: InventoryItem = {
      id: 'inv-item-777',
      name: 'Cat6 UTP Patch Cable 3m',
      sku: 'SKU-CAB-CAT6-3M',
      category: 'Cabling & Interconnects',
      quantity: 45,
      minThreshold: 15,
      unitCost: 4.5,
      binNumber: 'BIN-NET-12',
      supplier: 'An Phat Computer',
    };

    it('renders InventoryDetailDrawer with Tab 2 "Stock & Item Movement History" passing canonical entityType "Inventory"', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-inv-1',
            entityType: 'Inventory',
            entityId: 'inv-item-777',
            action: 'INVENTORY_RESTOCKED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(
        createElement(InventoryDetailDrawer, {
          open: true,
          item: mockItem,
          onClose: vi.fn(),
          onEdit: vi.fn(),
          onRestock: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      const bodyText = document.body.textContent || '';
      expect(bodyText).toContain('Cat6 UTP Patch Cable 3m');
      expect(bodyText).toContain('Item Overview');
      expect(bodyText).toContain('Stock & Item Movement History');

      await switchToTab('Stock & Item Movement History');

      expect(getHistorySpy).toHaveBeenCalledWith('Inventory', 'inv-item-777', { pageSize: 20 });
    });

    it('displays Out of Stock badge when quantity is 0 and Low Stock when below threshold', async () => {
      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      // Out of Stock item
      await mountComponent(
        createElement(InventoryDetailDrawer, {
          open: true,
          item: { ...mockItem, quantity: 0 },
          onClose: vi.fn(),
        }),
      );
      expect(document.body.textContent).toContain('Out of Stock');

      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }

      // Low Stock item
      await mountComponent(
        createElement(InventoryDetailDrawer, {
          open: true,
          item: { ...mockItem, quantity: 5, minThreshold: 10 },
          onClose: vi.fn(),
        }),
      );
      expect(document.body.textContent).toContain('Low Stock');
    });

    it('opens InventoryDetailDrawer and loads history when clicking row action in InventoryPage', async () => {
      vi.spyOn(inventoryService, 'getItems').mockResolvedValueOnce([mockItem]);
      vi.spyOn(inventoryService, 'getCategories').mockResolvedValueOnce([
        { id: 'cat-1', name: 'Cabling & Interconnects' },
      ]);
      vi.spyOn(inventoryService, 'getStats').mockResolvedValueOnce({
        totalSkus: 1,
        totalUnits: 45,
        totalValuation: 202.5,
        lowStockCount: 0,
        outOfStockCount: 0,
      });
      vi.spyOn(organizationService, 'getOrganizations').mockResolvedValueOnce([]);
      vi.spyOn(vendorService, 'getVendors').mockResolvedValueOnce([]);

      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-page-inv-1',
            entityType: 'Inventory',
            entityId: mockItem.id,
            action: 'INVENTORY_RESTOCKED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(createElement(InventoryPage));

      // Wait for table to populate
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Find eye action button for View Details & History
      const eyeButtons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.ant-table tbody button'),
      ).filter((b) => b.querySelector('.anticon-eye'));
      expect(eyeButtons.length).toBeGreaterThan(0);

      await act(async () => {
        eyeButtons[0].click();
      });

      // Verify drawer opened
      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.body.textContent).toContain('Stock & Item Movement History');

      // Switch to history tab
      await switchToTab('Stock & Item Movement History');

      // Verify canonical entityType "Inventory" and item id
      expect(getHistorySpy).toHaveBeenCalledWith('Inventory', mockItem.id, { pageSize: 20 });
    });

    it('returns null safely when item is null', async () => {
      await mountComponent(
        createElement(InventoryDetailDrawer, {
          open: true,
          item: null,
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).toBeNull();
    });
  });

  // =========================================================================
  // DOMAIN 4: NETWORK SUBNETS (SubnetDetailDrawer)
  // =========================================================================
  describe('Domain 4: Network Subnets (SubnetDetailDrawer)', () => {
    const mockSubnet: Subnet = {
      id: 'sub-net-666',
      name: 'Server Farm Subnet',
      cidr: '192.168.100.0/24',
      vlanId: 'vlan-100',
      totalIps: 254,
      usedIps: 42,
      reservedIps: 10,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const mockIps: IPAddress[] = [
      {
        id: 'ip-1',
        address: '192.168.100.10',
        subnetId: 'sub-net-666',
        status: 'ASSIGNED',
        macAddress: '00:1A:2B:3C:4D:5E',
        description: 'dc01.youngone.internal',
        vendor: 'Cisco Systems',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    it('renders SubnetDetailDrawer with Tab 2 "Configuration & IP Allocation History" passing canonical entityType "Network"', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-net-1',
            entityType: 'Network',
            entityId: 'sub-net-666',
            action: 'IP_ALLOCATED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(
        createElement(SubnetDetailDrawer, {
          open: true,
          subnet: mockSubnet,
          ips: mockIps,
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      const bodyText = document.body.textContent || '';
      expect(bodyText).toContain('Server Farm Subnet');
      expect(bodyText).toContain('Configuration & IP Pool');
      expect(bodyText).toContain('Configuration & IP Allocation History');

      await switchToTab('Configuration & IP Allocation History');

      expect(getHistorySpy).toHaveBeenCalledWith('Network', 'sub-net-666', { pageSize: 20 });
    });

    it('returns null safely when subnet is null', async () => {
      await mountComponent(
        createElement(SubnetDetailDrawer, {
          open: true,
          subnet: null,
          ips: [],
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).toBeNull();
    });
  });

  // =========================================================================
  // DOMAIN 5: USERS (UserDetailDrawer)
  // =========================================================================
  describe('Domain 5: Users (UserDetailDrawer)', () => {
    const mockUser: AppUser = {
      id: 'usr-sys-555',
      username: 'sysadmin',
      firstName: 'System',
      lastName: 'Administrator',
      fullName: 'System Administrator',
      email: 'sysadmin@youngone.com',
      role: {
        id: 'r1',
        name: 'Super Admin',
        isSystem: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      status: UserStatus.ACTIVE,
      isLocked: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
      lastLoginAt: '2026-10-12T14:30:00Z',
    };

    it('renders UserDetailDrawer embedding ActivityTimeline passing canonical entityType "User"', async () => {
      const getHistorySpy = vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-usr-1',
            entityType: 'User',
            entityId: 'usr-sys-555',
            action: 'USER_ROLE_ASSIGNED',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      await mountComponent(
        createElement(UserDetailDrawer, {
          open: true,
          user: mockUser,
          onClose: vi.fn(),
          onEdit: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      const bodyText = document.body.textContent || '';
      expect(bodyText).toContain('System Administrator');
      expect(bodyText).toContain('Activity History');

      expect(getHistorySpy).toHaveBeenCalledWith('User', 'usr-sys-555', { pageSize: 20 });
    });

    it('returns null safely when user is null', async () => {
      await mountComponent(
        createElement(UserDetailDrawer, {
          open: true,
          user: null,
          onClose: vi.fn(),
        }),
      );

      expect(document.querySelector('.ant-drawer-open')).toBeNull();
    });
  });

  // =========================================================================
  // ADVERSARIAL STRESS & RESILIENCE: DEEP-LINKING & FALLBACK
  // =========================================================================
  describe('Adversarial Stress & Resilience: Deep-Linking & Fallbacks', () => {
    it('deep-linking navigates with exact canonical entityType and entityId query parameters', async () => {
      vi.spyOn(auditService, 'getEntityHistory').mockResolvedValueOnce({
        items: [
          createMockAuditLog({
            id: 'log-dl-1',
            entityType: 'Hardware',
            entityId: 'ast-dl-01',
          }),
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const mockAsset: Asset = {
        id: 'ast-dl-01',
        tag: 'AST-DL-01',
        name: 'Dell Server',
        manufacturer: 'Dell',
        model: 'R740',
        serialNumber: 'SN-01',
        category: 'Servers',
        categoryId: 'cat-server',
        status: 'Active',
        assignedTo: 'Lead Designer',
        assignedEmail: 'designer@youngone.com',
        purchaseDate: '2026-02-01',
        warrantyExpiry: '2029-02-01',
      };

      await mountComponent(
        createElement(AssetDetailDrawer, {
          open: true,
          selectedAsset: mockAsset,
          onClose: vi.fn(),
          onOpenEditModal: vi.fn(),
        }),
      );

      // Switch to Asset History tab first
      await switchToTab('Asset History');

      // Find "View in Full Audit Trail" button and click it
      const viewFullButtons = Array.from(document.querySelectorAll('button')).filter((b) =>
        b.textContent?.includes('View in Full Audit Trail'),
      );
      expect(viewFullButtons.length).toBeGreaterThan(0);

      await act(async () => {
        viewFullButtons[0].click();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/audit?entityType=Hardware&entityId=ast-dl-01');
    });

    it('falls back to getLogs query when getEntityHistory endpoint fails', async () => {
      vi.spyOn(auditService, 'getEntityHistory').mockRejectedValue(
        new Error('Endpoint temporarily unavailable'),
      );

      const getLogsSpy = vi.spyOn(auditService, 'getLogs').mockResolvedValue([
        createMockAuditLog({
          id: 'log-fallback-1',
          entityType: 'License',
          entityId: 'lic-fallback-01',
          action: 'FALLBACK_ACTION',
        }),
      ]);

      const mockLicense: License = {
        id: 'lic-fallback-01',
        name: 'Autodesk AutoCAD',
        vendor: 'Autodesk',
        type: 'Perpetual',
        licenseKey: 'ACAD-01',
        totalSeats: 10,
        usedSeats: 2,
        costPerSeat: 1500,
        expiryDate: '2028-01-01',
        status: 'Active',
        autoRenew: false,
        assignedUsers: [],
      };

      await mountComponent(
        createElement(LicenseSeatsDrawer, {
          open: true,
          license: mockLicense,
          onClose: vi.fn(),
          onOpenAssignModal: vi.fn(),
          onRevokeSeat: vi.fn(),
        }),
      );

      // Switch to License History tab
      await switchToTab('License History');
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(getLogsSpy).toHaveBeenCalledWith({
        entityType: 'License',
        entityId: 'lic-fallback-01',
        pageSize: 20,
      });

      expect(document.body.textContent).toContain('FALLBACK_ACTION');
    });

    it('survives dual failure gracefully without throwing unhandled exceptions', async () => {
      vi.spyOn(auditService, 'getEntityHistory').mockRejectedValue(new Error('Fatal 500'));
      vi.spyOn(auditService, 'getLogs').mockRejectedValue(new Error('Secondary 503'));

      const mockItem: InventoryItem = {
        id: 'inv-err-1',
        name: 'SSD 1TB M.2',
        sku: 'SSD-1TB',
        category: 'Storage',
        quantity: 10,
        minThreshold: 2,
        unitCost: 80,
      };

      await mountComponent(
        createElement(InventoryDetailDrawer, {
          open: true,
          item: mockItem,
          onClose: vi.fn(),
        }),
      );

      // Switch to Stock & Item Movement History tab
      await switchToTab('Stock & Item Movement History');
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verify user feedback emitted
      expect(mockMessageError).toHaveBeenCalledWith('Fatal 500');
      // Verify empty state rendered gracefully
      expect(document.body.textContent).toContain('No activity history recorded for this entity.');
    });
  });
});
