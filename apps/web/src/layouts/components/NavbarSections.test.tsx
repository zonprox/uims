import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '../../stores/theme.store';
import { AppNavbarHeader, NavbarLeftSection, NavbarRightSection } from './NavbarSections';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('NavbarSections', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    useThemeStore.setState({
      mode: 'light',
      resolvedMode: 'light',
      compact: false,
      presetKey: 'blue',
      borderRadius: 6,
    });
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders NavbarRightSection with theme switcher button and default props', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(NavbarRightSection, {
          isXs: false,
          quickCreateMenu: [],
          userMenuItems: [],
          user: { name: 'Admin User' },
          unreadCount: 0,
          onOpenNotifications: vi.fn(),
        }),
      );
    });

    const themeButton = container.querySelector('button[aria-label="Theme switcher"]');
    expect(themeButton).toBeDefined();
    expect(themeButton).not.toBeNull();
    // Default light mode has SunOutlined
    expect(themeButton?.querySelector('.anticon-sun')).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it('dynamically reflects active theme state with appropriate icons', async () => {
    const root = createRoot(container);

    // Test Light mode -> SunOutlined
    await act(async () => {
      root.render(
        createElement(NavbarRightSection, {
          isXs: false,
          mode: 'light',
          quickCreateMenu: [],
          userMenuItems: [],
          user: { name: 'Admin User' },
          unreadCount: 0,
          onOpenNotifications: vi.fn(),
        }),
      );
    });
    let themeButton = container.querySelector('button[aria-label="Theme switcher"]');
    expect(themeButton?.querySelector('.anticon-sun')).not.toBeNull();

    // Test Dark mode -> MoonOutlined
    await act(async () => {
      root.render(
        createElement(NavbarRightSection, {
          isXs: false,
          mode: 'dark',
          quickCreateMenu: [],
          userMenuItems: [],
          user: { name: 'Admin User' },
          unreadCount: 0,
          onOpenNotifications: vi.fn(),
        }),
      );
    });
    themeButton = container.querySelector('button[aria-label="Theme switcher"]');
    expect(themeButton?.querySelector('.anticon-moon')).not.toBeNull();

    // Test System mode -> DesktopOutlined
    await act(async () => {
      root.render(
        createElement(NavbarRightSection, {
          isXs: false,
          mode: 'system',
          quickCreateMenu: [],
          userMenuItems: [],
          user: { name: 'Admin User' },
          unreadCount: 0,
          onOpenNotifications: vi.fn(),
        }),
      );
    });
    themeButton = container.querySelector('button[aria-label="Theme switcher"]');
    expect(themeButton?.querySelector('.anticon-desktop')).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it('renders NavbarLeftSection properly in desktop and mobile modes', async () => {
    const root = createRoot(container);
    const onToggleSidebar = vi.fn();
    const onOpenCommandPalette = vi.fn();

    await act(async () => {
      root.render(
        createElement(NavbarLeftSection, {
          isMobile: false,
          collapsed: false,
          isXs: false,
          mode: 'light',
          onToggleSidebar,
          onOpenCommandPalette,
        }),
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);

    // Click search/command palette button
    const searchBtn = buttons[1];
    searchBtn.click();
    expect(onOpenCommandPalette).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('renders AppNavbarHeader uniting left and right sections', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AppNavbarHeader, {
          isMobile: false,
          collapsed: false,
          isXs: false,
          mode: 'system',
          quickCreateMenu: [],
          userMenuItems: [],
          user: { name: 'Admin' },
          unreadCount: 2,
          onToggleSidebar: vi.fn(),
          onOpenCommandPalette: vi.fn(),
          onOpenNotifications: vi.fn(),
        }),
      );
    });

    expect(container.querySelector('header')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Theme switcher"]')).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  describe('Dynamic Role Display in NavbarRightSection', () => {
    it.each([
      { role: 'Security Lead', name: 'Sarah Connor' },
      { role: 'DevOps Engineer', name: 'Alex Rivera' },
      { role: 'Guest', name: 'Visitor One' },
    ])(
      'renders dynamic role "$role" and suppresses default "Super Admin"',
      async ({ role, name }) => {
        const root = createRoot(container);
        await act(async () => {
          root.render(
            createElement(NavbarRightSection, {
              isXs: false,
              quickCreateMenu: [],
              userMenuItems: [],
              user: { name, role },
              unreadCount: 0,
              onOpenNotifications: vi.fn(),
            }),
          );
        });

        const elements = Array.from(container.querySelectorAll('span, div'));
        const matchedRoleEl = elements.find((el) => el.textContent === role);
        expect(matchedRoleEl).toBeDefined();

        const superAdminEl = elements.find((el) => el.textContent === 'Super Admin');
        expect(superAdminEl).toBeUndefined();

        act(() => {
          root.unmount();
        });
      },
    );

    it('falls back to "Super Admin" when role is undefined', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(NavbarRightSection, {
            isXs: false,
            quickCreateMenu: [],
            userMenuItems: [],
            user: { name: 'John Doe', role: undefined },
            unreadCount: 0,
            onOpenNotifications: vi.fn(),
          }),
        );
      });

      const elements = Array.from(container.querySelectorAll('span, div'));
      const superAdminEl = elements.find((el) => el.textContent === 'Super Admin');
      expect(superAdminEl).toBeDefined();

      act(() => {
        root.unmount();
      });
    });

    it('falls back to "Super Admin" and "Alex Johnson" when user is null', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(NavbarRightSection, {
            isXs: false,
            quickCreateMenu: [],
            userMenuItems: [],
            user: null,
            unreadCount: 0,
            onOpenNotifications: vi.fn(),
          }),
        );
      });

      const elements = Array.from(container.querySelectorAll('span, div'));
      const superAdminEl = elements.find((el) => el.textContent === 'Super Admin');
      expect(superAdminEl).toBeDefined();

      const defaultNameEl = elements.find((el) => el.textContent === 'Alex Johnson');
      expect(defaultNameEl).toBeDefined();

      act(() => {
        root.unmount();
      });
    });

    it('hides role and name text on mobile viewports (isXs = true)', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(NavbarRightSection, {
            isXs: true,
            quickCreateMenu: [],
            userMenuItems: [],
            user: { name: 'Mobile User', role: 'Security Lead' },
            unreadCount: 0,
            onOpenNotifications: vi.fn(),
          }),
        );
      });

      const elements = Array.from(container.querySelectorAll('span, div'));
      const matchedRoleEl = elements.find((el) => el.textContent === 'Security Lead');
      expect(matchedRoleEl).toBeUndefined();

      const matchedNameEl = elements.find((el) => el.textContent === 'Mobile User');
      expect(matchedNameEl).toBeUndefined();

      // Avatar should still be rendered
      expect(container.querySelector('.ant-avatar')).not.toBeNull();

      act(() => {
        root.unmount();
      });
    });
  });
});
