import { ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '../../stores/theme.store';
import { SidebarBrandHeader } from './SidebarBrandHeader';
import { SidebarContent } from './SidebarContent';
import { SidebarFooter } from './SidebarFooter';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock useSystemHealth to prevent network polling in test
vi.mock('../../hooks/useSystemHealth', () => ({
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

describe('Sidebar Light and Dark Mode Adaptation', () => {
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
      });
      currentRoot = null;
    }
    container.remove();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders SidebarContent with light theme background and light Menu when resolvedMode is light', async () => {
    await act(async () => {
      useThemeStore.setState({ mode: 'light', resolvedMode: 'light' });
    });

    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(SidebarContent, {
            collapsed: false,
            inDrawer: false,
            menuItems: [{ key: '/dashboard', label: 'Dashboard' }],
            pathname: '/dashboard',
            onNavigate: () => {},
            onCloseDrawer: () => {},
          }),
        ),
      );
    });

    const rootContainer = container.firstElementChild as HTMLElement;
    expect(rootContainer).toBeDefined();
    expect(['#ffffff', 'rgb(255, 255, 255)']).toContain(rootContainer.style.backgroundColor);

    const menuEl = container.querySelector('.ant-menu');
    expect(menuEl).toBeDefined();
    expect(menuEl?.classList.contains('ant-menu-light')).toBe(true);

    const scrollWrapper = container.querySelector('.sidebar-menu-scroll');
    expect(scrollWrapper?.classList.contains('sidebar-menu-light')).toBe(true);
  });

  it('renders SidebarContent with dark theme background and dark Menu when resolvedMode is dark', async () => {
    await act(async () => {
      useThemeStore.setState({ mode: 'dark', resolvedMode: 'dark' });
    });

    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(SidebarContent, {
            collapsed: false,
            inDrawer: false,
            menuItems: [{ key: '/dashboard', label: 'Dashboard' }],
            pathname: '/dashboard',
            onNavigate: () => {},
            onCloseDrawer: () => {},
          }),
        ),
      );
    });

    const rootContainer = container.firstElementChild as HTMLElement;
    expect(rootContainer).toBeDefined();
    expect(['#0c1017', 'rgb(12, 16, 23)']).toContain(rootContainer.style.backgroundColor);

    const menuEl = container.querySelector('.ant-menu');
    expect(menuEl).toBeDefined();
    expect(menuEl?.classList.contains('ant-menu-dark')).toBe(true);

    const scrollWrapper = container.querySelector('.sidebar-menu-scroll');
    expect(scrollWrapper?.classList.contains('sidebar-menu-dark')).toBe(true);
  });

  it('renders SidebarBrandHeader with appropriate background in light mode', async () => {
    await act(async () => {
      useThemeStore.setState({ mode: 'light', resolvedMode: 'light' });
    });

    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(SidebarBrandHeader, {
          collapsed: false,
          inDrawer: false,
          onNavigate: () => {},
          onCloseDrawer: () => {},
        }),
      );
    });

    const header = container.firstElementChild as HTMLElement;
    expect(['#ffffff', 'rgb(255, 255, 255)']).toContain(header.style.backgroundColor);
    expect(header.style.borderBottom).toBeTruthy();
  });

  it('renders SidebarContent without organization switcher or cluster dropdown in unified operational view', async () => {
    await act(async () => {
      useThemeStore.setState({ mode: 'light', resolvedMode: 'light' });
    });

    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(SidebarContent, {
            collapsed: false,
            inDrawer: false,
            menuItems: [{ key: '/dashboard', label: 'Dashboard' }],
            pathname: '/dashboard',
            onNavigate: () => {},
            onCloseDrawer: () => {},
          }),
        ),
      );
    });

    const orgSelector = container.querySelector('.sidebar-org-selector');
    expect(orgSelector).toBeNull();
    const clusterBtn = container.querySelector('button[aria-label*="cluster"]');
    expect(clusterBtn).toBeNull();
  });

  it('renders SidebarFooter with light background in light mode', async () => {
    await act(async () => {
      useThemeStore.setState({ mode: 'light', resolvedMode: 'light' });
    });

    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(SidebarFooter, {
          collapsed: false,
          inDrawer: false,
        }),
      );
    });

    const footer = container.firstElementChild as HTMLElement;
    expect(['#ffffff', 'rgb(255, 255, 255)']).toContain(footer.style.backgroundColor);
    expect(footer.style.borderTop).toBeTruthy();
  });
});
