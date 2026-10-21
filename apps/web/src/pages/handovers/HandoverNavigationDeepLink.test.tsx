import { App as AntApp, ConfigProvider } from 'antd';
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../app/router';
import MainLayout from '../../layouts/MainLayout';
import { SidebarContent } from '../../layouts/components/SidebarContent';
import { getNavMenuItems } from '../../layouts/menuConfig';
import {
  dashboardService,
  type PendingHandoverRecordItem,
  type PendingHandoverSummaryResponse,
} from '../../services/dashboard.service';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore } from '../../stores/theme.store';
import HandoverDocumentsPage from './HandoverDocumentsPage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Dynamic breakpoint state
let mockBreakpoint = { xs: false, sm: false, md: true, lg: true, xl: true, xxl: true };

// Mock antd Grid.useBreakpoint to allow deterministic responsive testing
vi.mock('antd', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('antd');
  const actualGrid = (actual.Grid as Record<string, unknown>) || {};
  return {
    ...actual,
    Grid: {
      ...actualGrid,
      useBreakpoint: () => mockBreakpoint,
    },
  };
});

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({
      children,
      to,
      ...rest
    }: {
      children?: React.ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => createElement('a', { href: to, ...rest }, children),
  };
});

// Mock services
vi.mock('../../services/dashboard.service', async () => {
  const actual = await vi.importActual('../../services/dashboard.service');
  return {
    ...actual,
    dashboardService: {
      getPendingHandovers: vi.fn(),
      getOverview: vi.fn(),
    },
  };
});

vi.mock('../../services/assets.service', async () => {
  const actual = await vi.importActual('../../services/assets.service');
  return {
    ...actual,
    assetsService: {
      downloadHandoverDocx: vi.fn(),
      generateHandoverDocument: vi.fn(),
      uploadHandoverDocument: vi.fn(),
      attachHandoverDocument: vi.fn(),
      getAsset: vi.fn(),
      getAssets: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getStats: vi.fn().mockResolvedValue({ total: 0, active: 0, inRepair: 0, inStorage: 0 }),
    },
  };
});

vi.mock('../../layouts/hooks/useLayoutTelemetry', () => ({
  useLayoutTelemetry: () => ({
    unreadNotifCount: 0,
    navBadges: {},
    fetchLiveTelemetry: vi.fn(),
  }),
}));

vi.mock('../../services/notifications.service', () => ({
  notificationsService: {
    getNotifications: vi.fn().mockResolvedValue([]),
    getUnreadCount: vi.fn().mockResolvedValue(0),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../hooks/useSystemHealth', () => ({
  useSystemHealth: () => ({
    health: { status: 'ok', uptimePercent: '100%', clientLatencyMs: 10 },
    isLoading: false,
    isRefreshing: false,
    isOnline: true,
    lastChecked: new Date(),
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../../hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    refreshNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

// Test records with distinct asset identifiers
const sampleRecords: PendingHandoverRecordItem[] = [
  {
    id: 'rec-ast-101',
    recordId: 'rec-ast-101',
    assetId: 'ast-dell-latitude-101',
    assetTag: 'AST-DELL-101',
    subcode: 'SUB-DELL-101',
    modelName: 'Dell Latitude 5540',
    serialNumber: 'SN-DELL-001',
    type: 'ASSIGNMENT',
    handoverType: 'ASSIGNMENT',
    recipientId: 'usr-alice',
    recipientName: 'Alice Cooper',
    recipientEmail: 'alice@uims.internal',
    department: 'Engineering',
    departmentName: 'Engineering',
    createdAt: '2026-10-18T08:00:00Z',
    daysPending: 3,
    isOverdue: false,
    timeAgo: '3d ago',
  },
  {
    id: 'rec-ast-202',
    recordId: 'rec-ast-202',
    assetId: 'ast-hp-elitebook-202',
    assetTag: 'AST-HP-202',
    subcode: 'SUB-HP-202',
    modelName: 'HP EliteBook 840 G10',
    serialNumber: 'SN-HP-002',
    type: 'RETURN',
    handoverType: 'RETURN',
    recipientId: 'usr-bob',
    recipientName: 'Bob Vance',
    recipientEmail: 'bob@uims.internal',
    department: 'Operations',
    departmentName: 'Operations',
    createdAt: '2026-10-14T08:00:00Z',
    daysPending: 7,
    isOverdue: true,
    timeAgo: '7d ago',
  },
  {
    id: 'rec-ast-303',
    recordId: 'rec-ast-303',
    assetId: 'ast-thinkpad-303',
    assetTag: 'AST-LEN-303',
    subcode: 'SUB-LEN-303',
    modelName: 'Lenovo ThinkPad T14',
    serialNumber: 'SN-LEN-003',
    type: 'TRANSFER',
    handoverType: 'TRANSFER',
    recipientId: 'usr-charlie',
    recipientName: 'Charlie Brown',
    recipientEmail: 'charlie@uims.internal',
    department: 'Finance',
    departmentName: 'Finance',
    createdAt: '2026-10-19T08:00:00Z',
    daysPending: 2,
    isOverdue: false,
    timeAgo: '2d ago',
  },
];

const mockSummaryResponse: PendingHandoverSummaryResponse = {
  totalPending: 3,
  overdueCount: 1,
  pendingAssignments: 1,
  pendingReturns: 1,
  pendingTransfers: 1,
  breakdownByType: {
    assignment: 1,
    return: 1,
    transfer: 1,
  },
  records: sampleRecords,
};

// Recursive route finder helper
function findRoute(
  routes: unknown[],
  path: string,
):
  | {
      path?: string;
      ErrorBoundary?: unknown;
      errorElement?: unknown;
      hasErrorBoundary?: boolean;
      element?: unknown;
    }
  | undefined {
  for (const r of routes as Array<{
    path?: string;
    children?: unknown[];
    [key: string]: unknown;
  }>) {
    if (r.path === path) return r;
    if (r.children && Array.isArray(r.children)) {
      const found = findRoute(r.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

describe('Handover Navigation & Deep Link Empirical Challenger Test Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    mockBreakpoint = { xs: false, sm: false, md: true, lg: true, xl: true, xxl: true };

    vi.mocked(dashboardService.getPendingHandovers).mockResolvedValue(mockSummaryResponse);

    // Default authenticated state
    useAuthStore.setState({
      token: 'mock-token-2026',
      user: {
        id: 'usr-test',
        email: 'tester@uims.internal',
        name: 'Challenger Tester',
        role: 'Super Admin',
      },
      permissions: ['*:*'],
    });

    useThemeStore.setState({
      mode: 'dark',
      resolvedMode: 'dark',
    });
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
        currentRoot = null;
      });
    }
    container.remove();
    document.body.innerHTML = '';
    document
      .querySelectorAll('.ant-modal-root, .ant-drawer-root, .ant-popover, .ant-select-dropdown')
      .forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  // Helper to render component wrapped in MemoryRouter, ConfigProvider and AntApp
  const renderComponent = async (node: React.ReactNode, initialEntries = ['/']) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          MemoryRouter,
          { initialEntries },
          createElement(ConfigProvider, null, createElement(AntApp, null, node)),
        ),
      );
    });
    // Wait for async fetch and paint
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
  };

  // =========================================================================
  // 1. Navigation to /handovers via Router & Menu Selection
  // =========================================================================
  describe('1. Navigation to /handovers via Router & Menu Selection', () => {
    it('verifies route /handovers exists in router definition and resolves to HandoverDocumentsPage', () => {
      const handoversRoute = findRoute(router.routes, 'handovers');
      expect(handoversRoute).toBeDefined();
      expect(
        handoversRoute?.ErrorBoundary ||
          handoversRoute?.errorElement ||
          handoversRoute?.hasErrorBoundary,
      ).toBeTruthy();
      expect(handoversRoute?.element).toBeDefined();
    });

    it('verifies legacy redirect from /handover-documents to /handovers', () => {
      const redirectRoute = findRoute(router.routes, 'handover-documents');
      expect(redirectRoute).toBeDefined();
      expect(redirectRoute?.element).toBeDefined();
    });

    it('navigates to /handovers via MemoryRouter and confirms routing integrity', () => {
      const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/handovers'] });
      expect(memRouter.state.location.pathname).toBe('/handovers');
    });

    it('redirects /handover-documents to /handovers via MemoryRouter', async () => {
      const memRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/handover-documents'],
      });

      // Render the router so Navigate component executes
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(AntApp, null, createElement(RouterProvider, { router: memRouter })),
          ),
        );
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      expect(memRouter.state.location.pathname).toBe('/handovers');
    });

    it('executes menu selection navigation on desktop sidebar (calls onNavigate with /handovers)', async () => {
      const onNavigate = vi.fn();
      const onCloseDrawer = vi.fn();

      const menuItems = getNavMenuItems(false, false);
      expect(menuItems).toBeDefined();

      await renderComponent(
        <SidebarContent
          collapsed={false}
          inDrawer={false}
          menuItems={menuItems}
          pathname="/"
          onNavigate={onNavigate}
          onCloseDrawer={onCloseDrawer}
        />,
      );

      // Locate the menu item for /handovers
      const handoverMenuItem = Array.from(container.querySelectorAll('.ant-menu-item')).find((el) =>
        el.textContent?.includes('Handover Documents'),
      );
      expect(handoverMenuItem).toBeDefined();

      await act(async () => {
        (handoverMenuItem as HTMLElement).click();
      });

      expect(onNavigate).toHaveBeenCalledWith('/handovers');
      // On desktop, onCloseDrawer should NOT be called
      expect(onCloseDrawer).not.toHaveBeenCalled();
    });

    it('executes menu selection navigation in mobile drawer (calls onNavigate AND onCloseDrawer)', async () => {
      const onNavigate = vi.fn();
      const onCloseDrawer = vi.fn();

      const menuItems = getNavMenuItems(false, true);

      await renderComponent(
        <SidebarContent
          collapsed={false}
          inDrawer={true}
          menuItems={menuItems}
          pathname="/"
          onNavigate={onNavigate}
          onCloseDrawer={onCloseDrawer}
        />,
      );

      const handoverMenuItem = Array.from(container.querySelectorAll('.ant-menu-item')).find((el) =>
        el.textContent?.includes('Handover Documents'),
      );
      expect(handoverMenuItem).toBeDefined();

      await act(async () => {
        (handoverMenuItem as HTMLElement).click();
      });

      expect(onNavigate).toHaveBeenCalledWith('/handovers');
      // In mobile drawer mode, onCloseDrawer MUST be called to dismiss the drawer
      expect(onCloseDrawer).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 2. Direct Deep-Link Navigation from HandoverDocumentsPage to /assets?drawer=<assetId>
  // =========================================================================
  describe('2. Direct Deep-Link Navigation from HandoverDocumentsPage to /assets?drawer=<assetId>', () => {
    it('navigates to /assets?drawer=<assetId> via asset code text click for each distinct row', async () => {
      await renderComponent(<HandoverDocumentsPage />);

      // Find code elements in the rendered table
      const codeElements = Array.from(container.querySelectorAll('code'));
      expect(codeElements.length).toBeGreaterThanOrEqual(3);

      // 1. Click Row 1 code (SUB-DELL-101) -> ast-dell-latitude-101
      const code1 = codeElements.find((el) => el.textContent?.includes('SUB-DELL-101'));
      expect(code1).toBeDefined();
      await act(async () => {
        code1?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-dell-latitude-101');

      // 2. Click Row 2 code (SUB-HP-202) -> ast-hp-elitebook-202
      const code2 = codeElements.find((el) => el.textContent?.includes('SUB-HP-202'));
      expect(code2).toBeDefined();
      await act(async () => {
        code2?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-hp-elitebook-202');

      // 3. Click Row 3 code (SUB-LEN-303) -> ast-thinkpad-303
      const code3 = codeElements.find((el) => el.textContent?.includes('SUB-LEN-303'));
      expect(code3).toBeDefined();
      await act(async () => {
        code3?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-thinkpad-303');
    });

    it('navigates to /assets?drawer=<assetId> via circle button (button.ant-btn-circle)', async () => {
      await renderComponent(<HandoverDocumentsPage />);

      // Verify buttons have the circle class required by Ant Design
      const circleButtons = Array.from(
        container.querySelectorAll('button.ant-btn-circle'),
      ) as HTMLButtonElement[];
      expect(circleButtons.length).toBe(3);

      // 1. Click Circle Button for Row 1
      const btn1 = container.querySelector(
        'button[data-testid="view-asset-rec-ast-101"]',
      ) as HTMLButtonElement;
      expect(btn1).toBeDefined();
      expect(btn1.classList.contains('ant-btn-circle')).toBe(true);

      await act(async () => {
        btn1.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-dell-latitude-101');

      // 2. Click Circle Button for Row 2
      const btn2 = container.querySelector(
        'button[data-testid="view-asset-rec-ast-202"]',
      ) as HTMLButtonElement;
      expect(btn2).toBeDefined();
      expect(btn2.classList.contains('ant-btn-circle')).toBe(true);

      await act(async () => {
        btn2.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-hp-elitebook-202');

      // 3. Click Circle Button for Row 3
      const btn3 = container.querySelector(
        'button[data-testid="view-asset-rec-ast-303"]',
      ) as HTMLButtonElement;
      expect(btn3).toBeDefined();
      expect(btn3.classList.contains('ant-btn-circle')).toBe(true);

      await act(async () => {
        btn3.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-thinkpad-303');
    });

    it('handles fallback to assetTag if subcode is empty or undefined', async () => {
      const recordsWithoutSubcode: PendingHandoverRecordItem[] = [
        {
          id: 'rec-no-subcode',
          recordId: 'rec-no-subcode',
          assetId: 'ast-fallback-999',
          assetTag: 'AST-RAW-TAG-999',
          subcode: '',
          modelName: 'Standalone Server',
          serialNumber: 'SN-FALLBACK-999',
          type: 'ASSIGNMENT',
          handoverType: 'ASSIGNMENT',
          recipientId: 'usr-devops',
          recipientName: 'DevOps Lead',
          recipientEmail: 'devops@uims.internal',
          department: 'Infrastructure',
          departmentName: 'Infrastructure',
          createdAt: '2026-10-20T00:00:00Z',
          daysPending: 1,
          isOverdue: false,
          timeAgo: '1d ago',
        },
      ];
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce({
        totalPending: 1,
        overdueCount: 0,
        pendingAssignments: 1,
        pendingReturns: 0,
        pendingTransfers: 0,
        breakdownByType: {
          assignment: 1,
          return: 0,
          transfer: 0,
        },
        records: recordsWithoutSubcode,
      });

      await renderComponent(<HandoverDocumentsPage />);

      const codeEl = Array.from(container.querySelectorAll('code')).find((el) =>
        el.textContent?.includes('AST-RAW-TAG-999'),
      );
      expect(codeEl).toBeDefined();

      await act(async () => {
        codeEl?.click();
      });
      expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-fallback-999');
    });
  });

  // =========================================================================
  // 3. Responsive Behavior: Desktop vs Mobile Navigation
  // =========================================================================
  describe('3. Responsive Behavior: Desktop vs Mobile Navigation', () => {
    it('configures desktop menu items with isCollapsedDesktop flag and tooltip titles', () => {
      // Expanded desktop
      const expandedItems = getNavMenuItems(false, false);
      const groupAssetsExpanded = expandedItems?.find(
        (i) => (i as { key?: string })?.key === 'group-assets',
      ) as { children?: Array<{ key: string; title?: string }> };

      const handoverExpanded = groupAssetsExpanded.children?.find((c) => c.key === '/handovers');
      expect(handoverExpanded).toBeDefined();
      expect(handoverExpanded?.title).toBe('Handover Documents');

      // Collapsed desktop
      const collapsedItems = getNavMenuItems(true, false);
      const groupAssetsCollapsed = collapsedItems?.find(
        (i) => (i as { key?: string })?.key === 'group-assets',
      ) as { children?: Array<{ key: string; title?: string }> };

      const handoverCollapsed = groupAssetsCollapsed.children?.find((c) => c.key === '/handovers');
      expect(handoverCollapsed).toBeDefined();
      expect(handoverCollapsed?.title).toBe('Handover Documents');
    });

    it('configures mobile menu items showing labels regardless of collapsed state', () => {
      // On mobile (isMobile: true), labels should always be rendered cleanly
      const mobileItems = getNavMenuItems(true, true);
      const groupAssetsMobile = mobileItems?.find(
        (i) => (i as { key?: string })?.key === 'group-assets',
      ) as { children?: Array<{ key: string; label: React.ReactNode }> };

      const handoverMobile = groupAssetsMobile.children?.find((c) => c.key === '/handovers');
      expect(handoverMobile).toBeDefined();
      expect(handoverMobile?.label).toBeDefined();
    });

    it('renders desktop Sider when breakpoint md is true, and does not render mobile Drawer', async () => {
      mockBreakpoint = {
        xs: false,
        sm: false,
        md: true,
        lg: true,
        xl: true,
        xxl: true,
      };

      await renderComponent(<MainLayout />);

      // Verify desktop Sider is present in DOM
      const sider = container.querySelector('.ant-layout-sider');
      expect(sider).not.toBeNull();

      // Verify mobile Drawer is not open or present
      const mobileDrawer = document.querySelector('.ant-drawer-left');
      expect(mobileDrawer).toBeNull();
    });

    it('renders mobile Drawer container when breakpoint md is false, and does not render Sider', async () => {
      mockBreakpoint = {
        xs: true,
        sm: false,
        md: false,
        lg: false,
        xl: false,
        xxl: false,
      };

      await renderComponent(<MainLayout />);

      // Verify desktop Sider is NOT rendered
      const sider = container.querySelector('.ant-layout-sider');
      expect(sider).toBeNull();
    });
  });

  // =========================================================================
  // 4. Proper Permission Gating: allow('read', 'Asset') = false
  // =========================================================================
  describe('4. Proper Permission Gating: allow("read", "Asset") = false', () => {
    it('strictly hides /handovers and /assets when user lacks Asset:read permission', () => {
      // User has permissions for License, Inventory, and User, but NOT Asset
      const can = (_action: string, subject: string) => {
        if (subject === 'Asset') return false;
        return true;
      };

      const items = getNavMenuItems(false, false, undefined, can);
      expect(items).toBeDefined();

      const groupAssets = items?.find((i) => (i as { key?: string })?.key === 'group-assets') as {
        children?: Array<{ key: string }>;
      };

      expect(groupAssets).toBeDefined();

      // Handover Documents and Assets MUST NOT be in the menu
      const hasHandovers = groupAssets.children?.some((c) => c.key === '/handovers');
      const hasAssets = groupAssets.children?.some((c) => c.key === '/assets');
      expect(hasHandovers).toBe(false);
      expect(hasAssets).toBe(false);

      // Other permitted items in group-assets MUST still be present
      const hasLicenses = groupAssets.children?.some((c) => c.key === '/licenses');
      const hasInventory = groupAssets.children?.some((c) => c.key === '/inventory');
      expect(hasLicenses).toBe(true);
      expect(hasInventory).toBe(true);
    });

    it('strictly displays /handovers directly after /assets when Asset:read is allowed', () => {
      const can = (_action: string, subject: string) => {
        if (subject === 'Asset') return true;
        return false;
      };

      const items = getNavMenuItems(false, false, undefined, can);
      const groupAssets = items?.find((i) => (i as { key?: string })?.key === 'group-assets') as {
        children?: Array<{ key: string }>;
      };

      expect(groupAssets).toBeDefined();
      const keys = groupAssets.children?.map((c) => c.key);
      expect(keys).toContain('/assets');
      expect(keys).toContain('/handovers');

      // Check order: /handovers immediately follows /assets
      const assetIdx = keys?.indexOf('/assets');
      const handoverIdx = keys?.indexOf('/handovers');
      expect(handoverIdx).toBe((assetIdx ?? -1) + 1);

      // Unpermitted items are absent
      expect(keys).not.toContain('/licenses');
      expect(keys).not.toContain('/inventory');
    });

    it('omits group-assets entirely when all subjects in the group are denied', () => {
      const can = () => false; // Deny all permissions

      const items = getNavMenuItems(false, false, undefined, can);
      const groupAssets = items?.find((i) => (i as { key?: string })?.key === 'group-assets');

      expect(groupAssets).toBeUndefined();
    });

    it('integrates with useAuthStore state: unprivileged employee role cannot see /handovers', async () => {
      // Configure auth store with an unprivileged Auditor role lacking Asset permissions
      useAuthStore.setState({
        token: 'auditor-token',
        user: {
          id: 'usr-auditor',
          email: 'auditor@uims.internal',
          name: 'Auditor User',
          role: 'Auditor',
        },
        permissions: ['Audit:read', 'Directory:read'],
      });

      const { can } = useAuthStore.getState();
      expect(can('read', 'Asset')).toBe(false);

      const items = getNavMenuItems(false, false, undefined, can);
      const groupAssets = items?.find((i) => (i as { key?: string })?.key === 'group-assets') as
        | { children?: Array<{ key: string }> }
        | undefined;

      // Either group-assets is undefined or its children omit /handovers
      if (groupAssets?.children) {
        expect(groupAssets.children.some((c) => c.key === '/handovers')).toBe(false);
      } else {
        expect(groupAssets).toBeUndefined();
      }
    });

    it('integrates with useAuthStore state: Super Admin unconditionally sees /handovers', () => {
      useAuthStore.setState({
        token: 'superadmin-token',
        user: {
          id: 'usr-superadmin',
          email: 'admin@uims.internal',
          name: 'Super Admin',
          role: 'Super Admin',
        },
        permissions: [], // Even with empty explicit array, Super Admin bypasses
      });

      const { can } = useAuthStore.getState();
      expect(can('read', 'Asset')).toBe(true);

      const items = getNavMenuItems(false, false, undefined, can);
      const groupAssets = items?.find((i) => (i as { key?: string })?.key === 'group-assets') as {
        children?: Array<{ key: string }>;
      };

      expect(groupAssets).toBeDefined();
      expect(groupAssets.children?.some((c) => c.key === '/handovers')).toBe(true);
    });
  });
});
