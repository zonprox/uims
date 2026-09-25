import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '../../stores/theme.store';
import { NavbarRightSection } from './NavbarSections';
import { SidebarOrgSelector } from './SidebarOrgSelector';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Dropdown Triggers Decoupled from Tooltips (R1, R2)', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

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

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover, .ant-dropdown')
      .forEach((el) => el.remove());
    container.remove();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('NavbarRightSection Dropdown Triggers', () => {
    it('renders Quick create button with aria-label="Quick create" and aria-haspopup="menu" directly inside Dropdown without Tooltip, and opens menu on click', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(NavbarRightSection, {
            isXs: false,
            quickCreateMenu: [{ key: 'create-asset', label: 'Create Asset' }],
            userMenuItems: [],
            user: { name: 'Admin User' },
            unreadCount: 0,
            onOpenNotifications: vi.fn(),
          }),
        );
      });

      const quickCreateButton = container.querySelector('button[aria-label="Quick create"]');
      expect(quickCreateButton).not.toBeNull();
      expect(quickCreateButton?.getAttribute('aria-haspopup')).toBe('menu');

      // Ensure Quick create button is an immediate/direct child of the dropdown trigger container
      // and NOT wrapped by any tooltip container
      const tooltipWrapper = quickCreateButton?.closest('.ant-tooltip');
      expect(tooltipWrapper).toBeNull();

      // Verify that clicking opens the dropdown menu
      await act(async () => {
        (quickCreateButton as HTMLButtonElement).click();
      });
      expect(document.querySelectorAll('.ant-dropdown').length).toBeGreaterThan(0);
    });

    it('renders Switch theme button with aria-label="Theme switcher" and aria-haspopup="menu" directly inside Dropdown without Tooltip, and opens menu on click', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
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
      expect(themeButton).not.toBeNull();
      expect(themeButton?.getAttribute('aria-haspopup')).toBe('menu');

      // Ensure Theme button is not wrapped by any tooltip
      const tooltipWrapper = themeButton?.closest('.ant-tooltip');
      expect(tooltipWrapper).toBeNull();

      // Verify that clicking opens the theme dropdown menu
      await act(async () => {
        (themeButton as HTMLButtonElement).click();
      });
      expect(document.querySelectorAll('.ant-dropdown').length).toBeGreaterThan(0);
    });

    it('renders User profile trigger with aria-label="User profile" and aria-haspopup="menu" directly inside Dropdown without Tooltip, and opens menu on click', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(NavbarRightSection, {
            isXs: false,
            quickCreateMenu: [],
            userMenuItems: [{ key: 'profile', label: 'Profile' }],
            user: { name: 'Alex Johnson', email: 'alex@example.com', role: 'Super Admin' },
            unreadCount: 0,
            onOpenNotifications: vi.fn(),
          }),
        );
      });

      const profileTrigger = container.querySelector('[aria-label="User profile"]');
      expect(profileTrigger).not.toBeNull();
      expect(profileTrigger?.getAttribute('role')).toBe('button');
      expect(profileTrigger?.getAttribute('tabindex')).toBe('0');
      expect(profileTrigger?.getAttribute('aria-haspopup')).toBe('menu');

      // Ensure User profile trigger is not wrapped by any tooltip
      const tooltipWrapper = profileTrigger?.closest('.ant-tooltip');
      expect(tooltipWrapper).toBeNull();

      // Verify that clicking opens the user profile dropdown menu
      await act(async () => {
        (profileTrigger as HTMLDivElement).click();
      });
      expect(document.querySelectorAll('.ant-dropdown').length).toBeGreaterThan(0);
    });

    it('activates click on Enter and Space keydown for User profile keyboard accessibility', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(NavbarRightSection, {
            isXs: false,
            quickCreateMenu: [],
            userMenuItems: [{ key: 'profile', label: 'Profile' }],
            user: { name: 'Alex Johnson', email: 'alex@example.com', role: 'Super Admin' },
            unreadCount: 0,
            onOpenNotifications: vi.fn(),
          }),
        );
      });

      const profileTrigger = container.querySelector(
        '[aria-label="User profile"]',
      ) as HTMLDivElement;
      expect(profileTrigger).not.toBeNull();

      const clickSpy = vi.spyOn(profileTrigger, 'click');

      // Dispatch Enter
      await act(async () => {
        profileTrigger.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        );
      });
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Dispatch Space
      await act(async () => {
        profileTrigger.dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
        );
      });
      expect(clickSpy).toHaveBeenCalledTimes(2);

      clickSpy.mockRestore();
    });

    it('supports mobile responsive view (isXs=true) cleanly without tooltips or layout breaks', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(NavbarRightSection, {
            isXs: true,
            quickCreateMenu: [{ key: 'create-asset', label: 'Create Asset' }],
            userMenuItems: [{ key: 'profile', label: 'Profile' }],
            user: { name: 'Alex Johnson', role: 'Super Admin' },
            unreadCount: 0,
            onOpenNotifications: vi.fn(),
          }),
        );
      });

      // Quick create button has no text label in xs mode (only icon), but retains aria-label
      const quickCreateButton = container.querySelector('button[aria-label="Quick create"]');
      expect(quickCreateButton).not.toBeNull();
      expect(quickCreateButton?.textContent?.trim()).toBe('');

      // User profile trigger in xs mode renders only avatar, hiding name & role text blocks
      const profileTrigger = container.querySelector('[aria-label="User profile"]');
      expect(profileTrigger).not.toBeNull();
      expect(profileTrigger?.textContent?.trim()).toBe('A');

      // Ensure no conflicting tooltips exist around mobile triggers
      expect(container.querySelectorAll('.ant-tooltip').length).toBe(0);
    });
  });

  describe('SidebarOrgSelector Dropdown Trigger', () => {
    it('renders Organization selector trigger with aria-label="Organization selector" and aria-haspopup="menu" directly inside Dropdown without Tooltip, and opens menu on click', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(SidebarOrgSelector, {
            activeOrg: 'Global Operations',
            orgMenuItems: [{ key: 'org-1', label: 'Global Operations' }],
          }),
        );
      });

      const orgTrigger = container.querySelector('[aria-label="Organization selector"]');
      expect(orgTrigger).not.toBeNull();
      expect(orgTrigger?.getAttribute('role')).toBe('button');
      expect(orgTrigger?.getAttribute('tabindex')).toBe('0');
      expect(orgTrigger?.getAttribute('aria-haspopup')).toBe('menu');
      expect(orgTrigger?.textContent).toContain('Global Operations');

      // Ensure Organization selector trigger is not wrapped by any tooltip
      const tooltipWrapper = orgTrigger?.closest('.ant-tooltip');
      expect(tooltipWrapper).toBeNull();

      // Verify clicking opens the organization menu
      await act(async () => {
        (orgTrigger as HTMLDivElement).click();
      });
      expect(document.querySelectorAll('.ant-dropdown').length).toBeGreaterThan(0);
    });

    it('activates click on Enter and Space keydown for keyboard accessibility', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(SidebarOrgSelector, {
            activeOrg: 'Global Operations',
            orgMenuItems: [{ key: 'org-1', label: 'Global Operations' }],
          }),
        );
      });

      const orgTrigger = container.querySelector(
        '[aria-label="Organization selector"]',
      ) as HTMLDivElement;
      expect(orgTrigger).not.toBeNull();

      const clickSpy = vi.spyOn(orgTrigger, 'click');

      // Dispatch Enter
      await act(async () => {
        orgTrigger.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        );
      });
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Dispatch Space
      await act(async () => {
        orgTrigger.dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }),
        );
      });
      expect(clickSpy).toHaveBeenCalledTimes(2);

      clickSpy.mockRestore();
    });
  });
});
