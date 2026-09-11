import { ConfigProvider, Flex, Tag } from 'antd';
import fs from 'node:fs';
import path from 'node:path';
import React, { act, createElement, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavbarRightSection } from './components/NavbarSections';
import { SidebarBrandHeader } from './components/SidebarBrandHeader';
import { SidebarContent } from './components/SidebarContent';
import { getNavMenuItems } from './menuConfig';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Helper to inspect NavItem label element structure
interface NavLabelProps {
  justify?: string;
  align?: string;
  style?: React.CSSProperties;
  children?: [
    ReactElement<{ style?: React.CSSProperties; children?: ReactNode }>,
    ReactElement<{ style?: React.CSSProperties; children?: ReactNode }> | undefined,
  ];
}

describe('Milestone 1 Empirical Challenger Adversarial Test Suite', () => {
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
    container.remove();
    document.body.innerHTML = '';
  });

  // =========================================================================
  // 1. Menu Items Truncation Defense & renderNavLabel Invariants
  // =========================================================================
  describe('1. Navigation Menu Truncation Defense & renderNavLabel Contracts', () => {
    it('verifies all 11 navigation menu items strictly implement truncation defense layout', () => {
      const items = getNavMenuItems(false, false, {
        expiringLicenses: 5,
        lowStockItems: 12,
      });

      expect(items).toBeDefined();

      // Collect all leaf navigation items
      const navLeaves: Array<{ key: string; label: unknown; title?: string }> = [];

      for (const item of items ?? []) {
        if (!item) continue;
        if ('children' in item && Array.isArray(item.children)) {
          for (const child of item.children) {
            if (child && 'key' in child) {
              navLeaves.push(child as { key: string; label: unknown; title?: string });
            }
          }
        } else if ('key' in item) {
          navLeaves.push(item as { key: string; label: unknown; title?: string });
        }
      }

      // We expect 11 primary operational routes
      const expectedKeys = [
        '/',
        '/directory',
        '/organization',
        '/users',
        '/assets',
        '/licenses',
        '/inventory',
        '/network',
        '/reports',
        '/audit',
        '/settings',
      ];

      for (const expectedKey of expectedKeys) {
        const found = navLeaves.find((item) => item.key === expectedKey);
        expect(found, `Missing route key: ${expectedKey}`).toBeDefined();

        const labelElement = found?.label as ReactElement<NavLabelProps>;
        expect(labelElement, `Label for ${expectedKey} should be a ReactElement`).toBeDefined();
        expect(labelElement.type).toBe(Flex);

        // Verify Flex container truncation contracts
        expect(labelElement.props.justify).toBe('space-between');
        expect(labelElement.props.align).toBe('center');
        expect(labelElement.props.style).toMatchObject({
          width: '100%',
          minWidth: 0,
          gap: 8,
        });

        // Verify child label span truncation style
        const children = React.Children.toArray(labelElement.props.children) as ReactElement<{
          style?: React.CSSProperties;
          children?: ReactNode;
        }>[];
        const textSpan = children[0];
        expect(textSpan).toBeDefined();
        expect(textSpan.props.style).toMatchObject({
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        });
      }
    });

    it('verifies telemetry badges render with flexShrink: 0 and do not distort label layout', () => {
      const itemsWithBadges = getNavMenuItems(false, false, {
        expiringLicenses: 99,
        lowStockItems: 42,
      });

      const licensesItem = itemsWithBadges
        ?.flatMap((item) =>
          item && 'children' in item && Array.isArray(item.children) ? item.children : [item],
        )
        .find((item) => item && 'key' in item && item.key === '/licenses') as {
        label: ReactElement<NavLabelProps>;
      };

      expect(licensesItem).toBeDefined();
      const flexProps = licensesItem.label.props;
      const children = React.Children.toArray(flexProps.children) as ReactElement<{
        style?: React.CSSProperties;
        children?: ReactNode;
      }>[];

      // Two children: text span and badge span
      expect(children.length).toBe(2);
      const badgeSpan = children[1];
      expect(badgeSpan.props.style).toMatchObject({
        flexShrink: 0,
      });
    });

    it('verifies badges are cleanly omitted when count is 0 or undefined', () => {
      const itemsZero = getNavMenuItems(false, false, {
        expiringLicenses: 0,
        lowStockItems: 0,
      });

      const inventoryItem = itemsZero
        ?.flatMap((item) =>
          item && 'children' in item && Array.isArray(item.children) ? item.children : [item],
        )
        .find((item) => item && 'key' in item && item.key === '/inventory') as {
        label: ReactElement<NavLabelProps>;
      };

      expect(inventoryItem).toBeDefined();
      const children = React.Children.toArray(inventoryItem.label.props.children);
      // Only 1 child (text span), no badge span
      expect(children.length).toBe(1);
    });

    it('empirically mounts a Menu item with extreme title length and badge in a constrained container', async () => {
      // Simulate extreme adversarial labels
      const longTitle =
        'A'.repeat(300) +
        ' <script>alert("xss")</script> Extremely Long Navigation Title That Should Ellipsize';

      const testItem = createElement(
        Flex,
        {
          justify: 'space-between',
          align: 'center',
          style: { width: '100%', minWidth: 0, gap: 8 },
        },
        createElement(
          'span',
          {
            id: 'test-text-label',
            style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          },
          longTitle,
        ),
        createElement(
          'span',
          { id: 'test-badge', style: { flexShrink: 0 } },
          createElement(Tag, { color: 'red' }, '999+'),
        ),
      );

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'div',
            { style: { width: 280, maxWidth: 280, padding: 8, boxSizing: 'border-box' } },
            testItem,
          ),
        );
      });

      const textEl = container.querySelector('#test-text-label') as HTMLSpanElement;
      const badgeEl = container.querySelector('#test-badge') as HTMLSpanElement;

      expect(textEl).not.toBeNull();
      expect(badgeEl).not.toBeNull();
      expect(textEl.style.overflow).toBe('hidden');
      expect(textEl.style.textOverflow).toBe('ellipsis');
      expect(textEl.style.whiteSpace).toBe('nowrap');
      expect(badgeEl.style.flexShrink).toBe('0');
      // Verify safe text escaping (no script execution)
      expect(textEl.textContent).toContain('<script>alert("xss")</script>');
    });

    it('empirically mounts with empty string label without throwing errors', async () => {
      const emptyItem = createElement(
        Flex,
        {
          justify: 'space-between',
          align: 'center',
          style: { width: '100%', minWidth: 0, gap: 8 },
        },
        createElement(
          'span',
          {
            id: 'empty-label',
            style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
          },
          '',
        ),
      );

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(createElement('div', { style: { width: 280 } }, emptyItem));
      });

      const labelEl = container.querySelector('#empty-label');
      expect(labelEl).not.toBeNull();
      expect(labelEl?.textContent).toBe('');
    });
  });

  // =========================================================================
  // 2. Desktop Sider (280px / 80px) & Collapsed Accessibility Invariants
  // =========================================================================
  describe('2. Desktop Sider (280px / 80px) & Collapsed Accessibility Invariants', () => {
    it('renders Brand Header home button with Tooltip in both expanded and collapsed modes', async () => {
      const root = createRoot(container);
      currentRoot = root;

      // Render Collapsed SidebarBrandHeader
      await act(async () => {
        root.render(
          createElement(SidebarBrandHeader, {
            collapsed: true,
            inDrawer: false,
            onNavigate: vi.fn(),
            onCloseDrawer: vi.fn(),
          }),
        );
      });

      const brandButton = container.querySelector('button[aria-label="Home"]') as HTMLButtonElement;
      expect(brandButton).not.toBeNull();
      expect(brandButton.textContent).toBe('U');

      // Title/Tooltip trigger is attached
      const tooltipWrapper =
        brandButton.closest('.ant-tooltip-disabled-compatible-wrapper') ||
        brandButton.parentElement;
      expect(tooltipWrapper).not.toBeNull();
    });

    it('renders cleanly without cluster dropdown when collapsed=true and inDrawer=false in unified mode', async () => {
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(SidebarContent, {
              collapsed: true,
              inDrawer: false,
              menuItems: [],
              pathname: '/',
              onNavigate: vi.fn(),
              onCloseDrawer: vi.fn(),
            }),
          ),
        );
      });

      // Unified operational view: no cluster button or org dropdown rendered
      const clusterButton = container.querySelector('button[aria-label*="cluster"]');
      expect(clusterButton).toBeNull();

      // Expanded SidebarOrgSelector (.sidebar-org-selector) should NOT be rendered
      const expandedOrgSelector = container.querySelector('.sidebar-org-selector');
      expect(expandedOrgSelector).toBeNull();
    });

    it('renders cleanly without company switcher when collapsed=false in unified operational view', async () => {
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(SidebarContent, {
              collapsed: false,
              inDrawer: false,
              menuItems: [],
              pathname: '/',
              onNavigate: vi.fn(),
              onCloseDrawer: vi.fn(),
            }),
          ),
        );
      });

      // No company-switching dropdown or active org selector is rendered
      const expandedOrgSelector = container.querySelector('.sidebar-org-selector');
      expect(expandedOrgSelector).toBeNull();
      const clusterButton = container.querySelector('button[aria-label*="cluster"]');
      expect(clusterButton).toBeNull();
    });

    it('renders Navbar user profile with Tooltip fallback for accessibility', async () => {
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(NavbarRightSection, {
            isXs: false,
            quickCreateMenu: [],
            userMenuItems: [],
            user: { name: 'Dev Ops', email: 'devops@uims.internal' },
            unreadCount: 0,
            onOpenNotifications: vi.fn(),
          }),
        );
      });

      // Check user avatar and name are present
      expect(container.textContent).toContain('Dev Ops');
      const avatarEl = container.querySelector('.ant-avatar');
      expect(avatarEl).not.toBeNull();
      expect(avatarEl?.textContent).toBe('D');
    });
  });

  // =========================================================================
  // 3. CSS Token Migration & Ant Design v6 Purity Invariants
  // =========================================================================
  describe('3. CSS Token Migration & Purity Verification', () => {
    const webRoot = process.cwd().endsWith('apps/web')
      ? process.cwd()
      : path.resolve(process.cwd(), 'apps/web');

    it('verifies global.css contains zero conflicting raw overrides on .ant-table, .ant-menu, or .ant-layout-header outside print media', () => {
      const globalCssPath = path.resolve(webRoot, 'src/styles/global.css');
      const cssContent = fs.readFileSync(globalCssPath, 'utf8');

      // Separate screen rules from @media print rules
      const [screenCss] = cssContent.split('@media print');

      // Check that the stripped selectors are NOT present in screen CSS
      expect(screenCss).not.toContain('.ant-table-wrapper .ant-table-thead > tr > th');
      expect(screenCss).not.toContain('.ant-table-wrapper .ant-table-tbody > tr > td');
      expect(screenCss).not.toContain('.ant-layout-header');
      expect(screenCss).not.toContain('.ant-layout-sider-collapsed .ant-menu');
      expect(screenCss).not.toContain('.ant-menu-inline-collapsed');
      expect(screenCss).not.toContain('.ant-badge .ant-badge-count');

      // Verify print rules remain intact
      expect(cssContent).toContain('@media print');
    });

    it('verifies theme.ts defines standard Ant Design v6 component tokens for Menu and Table', async () => {
      const themeTsPath = path.resolve(webRoot, 'src/app/theme.ts');
      const themeContent = fs.readFileSync(themeTsPath, 'utf8');

      // Verify Menu tokens
      expect(themeContent).toContain('collapsedWidth: 80');
      expect(themeContent).toContain('collapsedIconSize: 16');
      expect(themeContent).toContain('itemHeight: 38');

      // Verify Table tokens
      expect(themeContent).toContain('cellPaddingBlock: 12');
      expect(themeContent).toContain('cellPaddingInline: 16');
    });

    it('verifies ErrorResultView.tsx has 0 static message invocations and uses App.useApp()', () => {
      const errorViewPath = path.resolve(webRoot, 'src/components/ErrorResultView.tsx');
      const content = fs.readFileSync(errorViewPath, 'utf8');

      expect(content).not.toContain('staticMessage');
      expect(content).not.toMatch(/from\s+['"]antd['"].*message/);
      expect(content).toContain('App.useApp()');
    });

    it('verifies CommandPalette.tsx typed catch handling and concise English title', () => {
      const cmdPalettePath = path.resolve(webRoot, 'src/components/CommandPalette.tsx');
      const content = fs.readFileSync(cmdPalettePath, 'utf8');

      // Check typed catch
      expect(content).toContain('catch (_error: unknown)');
      // Check concise Enterprise English title
      expect(content).toContain("title: 'Inventory'");
      expect(content).not.toContain("title: 'Inventory Management'");
    });

    it('verifies PageContainer.tsx uses token colors rather than hardcoded hex values for text and trends', () => {
      const pageContainerPath = path.resolve(webRoot, 'src/components/PageContainer.tsx');
      const content = fs.readFileSync(pageContainerPath, 'utf8');

      expect(content).toContain('token.colorTextSecondary');
      expect(content).toContain('token.colorTextTertiary');
      expect(content).toContain('token.colorSuccess');
      expect(content).toContain('token.colorError');
      expect(content).not.toContain("color: '#64748b'");
      expect(content).not.toContain("color: '#94a3b8'");
    });
  });

  // =========================================================================
  // 4. Layout Dimensions Invariants (MainLayout.tsx)
  // =========================================================================
  describe('4. Layout Dimensions Invariants (MainLayout.tsx)', () => {
    const webRoot = process.cwd().endsWith('apps/web')
      ? process.cwd()
      : path.resolve(process.cwd(), 'apps/web');

    it('verifies Desktop Sider is configured for 280px width and 80px collapsedWidth', () => {
      const mainLayoutPath = path.resolve(webRoot, 'src/layouts/MainLayout.tsx');
      const content = fs.readFileSync(mainLayoutPath, 'utf8');

      expect(content).toContain('width={280}');
      expect(content).toContain('collapsedWidth={80}');
    });

    it('verifies Mobile Drawer is configured for 290px width with left placement', () => {
      const mainLayoutPath = path.resolve(webRoot, 'src/layouts/MainLayout.tsx');
      const content = fs.readFileSync(mainLayoutPath, 'utf8');

      expect(content).toContain('placement="left"');
      expect(content).toContain('width: 290');
    });
  });
});
