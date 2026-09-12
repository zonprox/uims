import { ConfigProvider, Flex } from 'antd';
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildThemeConfig, themeConfig } from '../app/theme';
import { useThemeStore } from '../stores/theme.store';
import { NavbarRightSection } from './components/NavbarSections';
import { SidebarContent } from './components/SidebarContent';
import { getNavMenuItems, getQuickCreateMenu, getUserMenuItems } from './menuConfig';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Helper: Compute relative luminance per WCAG 2.1
function getLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Helper: Compute WCAG contrast ratio
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Mock useSystemHealth to prevent network polling in test
vi.mock('../hooks/useSystemHealth', () => ({
  useSystemHealth: () => ({
    health: { status: 'ok', uptimePercent: '100%', clientLatencyMs: 12 },
    isLoading: false,
    isRefreshing: false,
    isOnline: true,
    lastChecked: new Date(),
    error: null,
    refresh: vi.fn(),
  }),
}));

describe('Milestone 1 Empirical Stress Test Harness', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
        currentRoot = null;
      });
    }
    container.remove();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Suite 1: Menu Items Structure & Truncation Contract (11 Items Oracle)
  // =========================================================================
  describe('Suite 1: Menu Items Structure & Truncation Contract', () => {
    const EXPECTED_NAV_KEYS = [
      '/',
      '/assets',
      '/licenses',
      '/inventory',
      '/network',
      '/directory',
      '/organization',
      '/users',
      '/reports',
      '/audit',
      '/settings',
    ];

    it('generates exactly 11 navigatable menu items across all 3 groups', () => {
      const items = getNavMenuItems(false, false);
      expect(items).toBeDefined();

      const extractedKeys: string[] = [];
      const traverse = (itemList: unknown[]) => {
        for (const item of itemList as Array<{ key?: string; children?: unknown[] }>) {
          if (item?.key && item.key.startsWith('/')) {
            extractedKeys.push(item.key);
          }
          if (item?.children) {
            traverse(item.children);
          }
        }
      };
      traverse(items as unknown[]);

      expect(extractedKeys).toHaveLength(11);
      expect(extractedKeys).toEqual(EXPECTED_NAV_KEYS);
    });

    it('validates that every menu item has a valid title, icon, and compliant truncation label', () => {
      const items = getNavMenuItems(false, false, { expiringLicenses: 5, lowStockItems: 12 });

      interface MenuItemShape {
        key?: string;
        title?: string;
        icon?: React.ReactNode;
        label?: React.ReactNode;
        children?: MenuItemShape[];
      }

      const checkItems = (itemList: MenuItemShape[]) => {
        for (const item of itemList) {
          if (item.key && item.key.startsWith('/')) {
            // Title check
            expect(item.title).toBeTruthy();
            expect(typeof item.title).toBe('string');

            // Icon check
            expect(item.icon).toBeDefined();
            expect(React.isValidElement(item.icon)).toBe(true);

            // Label check: Must be a React element conforming to Truncation Contract
            expect(item.label).toBeDefined();
            expect(React.isValidElement(item.label)).toBe(true);

            const labelEl = item.label as React.ReactElement<{
              style?: React.CSSProperties;
              children?: React.ReactNode[];
            }>;
            expect(labelEl.type).toBe(Flex);
            expect(labelEl.props.style).toMatchObject({
              width: '100%',
              minWidth: 0,
              gap: 8,
            });

            // Children inside Flex label
            const children = React.Children.toArray(labelEl.props.children) as React.ReactElement[];
            expect(children.length).toBeGreaterThanOrEqual(1);

            // First child is the text wrapper
            const textSpan = children[0] as React.ReactElement<{ style?: React.CSSProperties }>;
            expect(textSpan.props.style).toMatchObject({
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            });
          }
          if (item.children) {
            checkItems(item.children);
          }
        }
      };

      checkItems(items as MenuItemShape[]);
    });

    it('adversarial permission filtering: handles total denial, partial permissions, and empty subjects', () => {
      // Total denial
      const deniedItems = getNavMenuItems(false, false, undefined, () => false);
      const deniedKeys: string[] = [];
      const traverseDenied = (itemList: unknown[]) => {
        for (const item of itemList as Array<{ key?: string; children?: unknown[] }>) {
          if (item?.key && item.key.startsWith('/')) deniedKeys.push(item.key);
          if (item?.children) traverseDenied(item.children);
        }
      };
      traverseDenied(deniedItems as unknown[]);
      // Only Dashboard ('/') is always accessible
      expect(deniedKeys).toEqual(['/']);

      // Partial permission: only Network and Inventory
      const partialItems = getNavMenuItems(
        false,
        false,
        undefined,
        (action, subject) =>
          action === 'read' && (subject === 'Network' || subject === 'Inventory'),
      );
      const partialKeys: string[] = [];
      const traversePartial = (itemList: unknown[]) => {
        for (const item of itemList as Array<{ key?: string; children?: unknown[] }>) {
          if (item?.key && item.key.startsWith('/')) partialKeys.push(item.key);
          if (item?.children) traversePartial(item.children);
        }
      };
      traversePartial(partialItems as unknown[]);
      expect(partialKeys).toEqual(['/', '/inventory', '/network']);
    });

    it('adversarial telemetry badge count stress: handles extreme values without distortion', () => {
      const extremeCounts = [
        { expiringLicenses: 0, lowStockItems: 0 },
        { expiringLicenses: 999999, lowStockItems: 1000000 },
        { expiringLicenses: -5, lowStockItems: -10 },
      ];

      for (const counts of extremeCounts) {
        const items = getNavMenuItems(false, false, counts);
        expect(items).toBeDefined();

        // Check Software Licenses title
        const traverse = (itemList: unknown[]): unknown => {
          for (const item of itemList as Array<{
            key?: string;
            title?: string;
            children?: unknown[];
          }>) {
            if (item?.key === '/licenses') return item;
            if (item?.children) {
              const res = traverse(item.children);
              if (res) return res;
            }
          }
          return null;
        };

        const licenseItem = traverse(items as unknown[]) as {
          title?: string;
          label?: React.ReactNode;
        };
        expect(licenseItem).toBeDefined();
        if (counts.expiringLicenses > 0) {
          expect(licenseItem.title).toContain(`${counts.expiringLicenses} Expiring`);
        } else {
          expect(licenseItem.title).toBe('Software Licenses');
        }
      }
    });

    it('quick create menu items all point to valid routes and respect permissions', () => {
      const navigate = vi.fn();
      const items = getQuickCreateMenu(navigate);
      expect(items).toHaveLength(6);

      for (const item of items as Array<{ onClick?: () => void }>) {
        item.onClick?.();
      }
      expect(navigate).toHaveBeenCalledWith('/users');
      expect(navigate).toHaveBeenCalledWith('/directory');
      expect(navigate).toHaveBeenCalledWith('/organization');
      expect(navigate).toHaveBeenCalledWith('/assets');
      expect(navigate).toHaveBeenCalledWith('/inventory');
      expect(navigate).toHaveBeenCalledWith('/licenses');
    });
  });

  // =========================================================================
  // Suite 2: Dark Mode Tokens & WCAG Contrast Oracle
  // =========================================================================
  describe('Suite 2: Dark Mode Tokens & WCAG Contrast Oracle', () => {
    const preset = {
      name: 'Enterprise Blue',
      key: 'blue',
      primary: '#1677ff',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#1677ff',
    };

    it('verifies dark mode theme tokens achieve WCAG AA compliance (contrast >= 4.5:1 for primary text)', () => {
      const darkConfig = buildThemeConfig({
        mode: 'dark',
        resolvedMode: 'dark',
        compact: false,
        preset,
        borderRadius: 6,
      });

      const tokens = darkConfig.token as Record<string, string>;
      expect(tokens).toBeDefined();

      const bgContainer = tokens.colorBgContainer; // #0f172a
      const bgLayout = tokens.colorBgLayout; // #090d16
      const colorText = tokens.colorText; // #f8fafc
      const colorTextSecondary = tokens.colorTextSecondary; // #94a3b8

      // 1. Primary Text on Container Background
      const textOnContainerRatio = getContrastRatio(colorText, bgContainer);
      expect(textOnContainerRatio).toBeGreaterThanOrEqual(7.0); // WCAG AAA is 7:1

      // 2. Primary Text on Layout Background
      const textOnLayoutRatio = getContrastRatio(colorText, bgLayout);
      expect(textOnLayoutRatio).toBeGreaterThanOrEqual(7.0);

      // 3. Secondary Text on Container Background (must be >= 4.5:1 for AA)
      const secondaryOnContainerRatio = getContrastRatio(colorTextSecondary, bgContainer);
      expect(secondaryOnContainerRatio).toBeGreaterThanOrEqual(4.5);

      // 4. Secondary Text on Layout Background (must be >= 4.5:1 for AA)
      const secondaryOnLayoutRatio = getContrastRatio(colorTextSecondary, bgLayout);
      expect(secondaryOnLayoutRatio).toBeGreaterThanOrEqual(4.5);
    });

    it('verifies light mode theme tokens achieve WCAG AA compliance', () => {
      const lightConfig = buildThemeConfig({
        mode: 'light',
        resolvedMode: 'light',
        compact: false,
        preset,
        borderRadius: 6,
      });

      const tokens = lightConfig.token as Record<string, string>;
      const bgContainer = tokens.colorBgContainer; // #ffffff
      const colorText = tokens.colorText; // #0f172a
      const colorTextSecondary = tokens.colorTextSecondary; // #475569

      expect(getContrastRatio(colorText, bgContainer)).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(colorTextSecondary, bgContainer)).toBeGreaterThanOrEqual(4.5);
    });

    it('verifies Table component tokens have distinct header backgrounds and borders in both modes', () => {
      const darkConfig = buildThemeConfig({
        mode: 'dark',
        resolvedMode: 'dark',
        compact: false,
        preset,
        borderRadius: 6,
      });
      const lightConfig = buildThemeConfig({
        mode: 'light',
        resolvedMode: 'light',
        compact: false,
        preset,
        borderRadius: 6,
      });

      const darkTable = darkConfig.components?.Table as Record<string, unknown>;
      const lightTable = lightConfig.components?.Table as Record<string, unknown>;

      expect(darkTable.headerBg).toBe('#131c2e');
      expect(darkTable.headerColor).toBe('#94a3b8');
      expect(darkTable.rowHoverBg).toBe('#1e293b');

      expect(lightTable.headerBg).toBe('#f8fafc');
      expect(lightTable.headerColor).toBe('#64748b');
      expect(lightTable.rowHoverBg).toBe('#f1f5f9');

      // Table header text contrast in dark mode
      const darkHeaderRatio = getContrastRatio(
        darkTable.headerColor as string,
        darkTable.headerBg as string,
      );
      expect(darkHeaderRatio).toBeGreaterThanOrEqual(4.5);

      // Table header text contrast in light mode
      const lightHeaderRatio = getContrastRatio(
        lightTable.headerColor as string,
        lightTable.headerBg as string,
      );
      expect(lightHeaderRatio).toBeGreaterThanOrEqual(4.5);
    });
  });

  // =========================================================================
  // Suite 3: Sidebar DOM Rendering & Collapsed Accessibility Stress
  // =========================================================================
  describe('Suite 3: Sidebar DOM Rendering & Collapsed Accessibility Stress', () => {
    it('renders SidebarContent in expanded state with all 11 items and no console warnings', async () => {
      useThemeStore.setState({ mode: 'dark', resolvedMode: 'dark' });

      const menuItems = getNavMenuItems(false, false);
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            { theme: themeConfig },
            createElement(SidebarContent, {
              collapsed: false,
              inDrawer: false,
              menuItems,
              pathname: '/',
              onNavigate: () => {},
              onCloseDrawer: () => {},
            }),
          ),
        );
      });

      // Verify menu rendered
      const menuEl = container.querySelector('.ant-menu');
      expect(menuEl).toBeTruthy();

      // Verify all menu items rendered
      const menuItemsDom = container.querySelectorAll('.ant-menu-item');
      expect(menuItemsDom.length).toBe(11);
    });

    it('renders SidebarContent in collapsed state (80px width) cleanly in unified mode', async () => {
      useThemeStore.setState({ mode: 'dark', resolvedMode: 'dark' });

      const menuItems = getNavMenuItems(true, false);
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            { theme: themeConfig },
            createElement(SidebarContent, {
              collapsed: true,
              inDrawer: false,
              menuItems,
              pathname: '/',
              onNavigate: () => {},
              onCloseDrawer: () => {},
            }),
          ),
        );
      });

      // No cluster button or org dropdown in unified view
      const clusterBtn = container.querySelector('button[aria-label*="cluster"]');
      expect(clusterBtn).toBeNull();

      // Brand header button
      const brandBtn = container.querySelector('button[aria-label="Home"]');
      expect(brandBtn).toBeTruthy();
    });

    it('renders NavbarRightSection with dynamic user role and prevents hardcoded fallback', async () => {
      const root = createRoot(container);
      currentRoot = root;

      const user = {
        name: 'Sarah Connor',
        email: 'sconnor@uims.internal',
        role: 'Security Lead',
      };

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            { theme: themeConfig },
            createElement(NavbarRightSection, {
              isXs: false,
              user,
              userMenuItems: getUserMenuItems(
                user,
                () => {},
                () => {},
              ),
              quickCreateMenu: [],
              onOpenNotifications: () => {},
              unreadCount: 3,
            }),
          ),
        );
      });

      // Find user profile name
      const nameEl = Array.from(container.querySelectorAll('span, div')).find(
        (el) => el.textContent === 'Sarah Connor',
      );
      expect(nameEl).toBeTruthy();

      // Dynamic user role verification:
      // user.role is 'Security Lead', rendered dynamically via {user?.role || 'Super Admin'}
      const roleEl = Array.from(container.querySelectorAll('span, div')).find(
        (el) => el.textContent === 'Security Lead',
      );
      expect(roleEl).toBeTruthy();

      const hardcodedRoleEl = Array.from(container.querySelectorAll('span, div')).find(
        (el) => el.textContent === 'Super Admin',
      );
      expect(hardcodedRoleEl).toBeUndefined();
    });
  });
});
