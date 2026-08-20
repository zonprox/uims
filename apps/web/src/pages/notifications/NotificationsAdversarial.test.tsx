import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationItem } from '../../services/notifications.service';
import NotificationsPage from './NotificationsPage';
import { useNotificationSettingsStore } from '../../stores/notification-settings.store';

const mockNavigate = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDeleteNotification = vi.fn();
const mockClearAll = vi.fn();
const mockRefreshNotifications = vi.fn();

const sampleNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Low Stock Alert: Cat6 Cables',
    description: 'Quantity is 3 (below safety minimum of 10).',
    type: 'warning',
    category: 'alerts',
    time: '10m ago',
    read: false,
    link: '/inventory?sku=SKU-CAT6-01',
    createdAt: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'notif-2',
    title: 'Critical: License Expired',
    description: 'Adobe Creative Cloud subscription has expired.',
    type: 'error',
    category: 'alerts',
    time: '2h ago',
    read: false,
    link: '/licenses?id=lic-adobe-01',
    createdAt: '2026-08-20T08:00:00.000Z',
  },
  {
    id: 'notif-3',
    title: 'Task Assigned: Laptop Handover',
    description: 'Prepare MacBook Pro AST-1042 for new hire.',
    type: 'info',
    category: 'tasks',
    time: '1d ago',
    read: true,
    link: '/assets?tag=AST-1042',
    createdAt: '2026-08-19T09:00:00.000Z',
  },
  {
    id: 'notif-4',
    title: 'System Maintenance Complete',
    description: 'Postgres maintenance sweep finished successfully.',
    type: 'success',
    category: 'general',
    time: '2d ago',
    read: true,
    createdAt: '2026-08-18T05:00:00.000Z',
  },
];

let activeNotifications = [...sampleNotifications];

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({
    notifications: activeNotifications,
    unreadCount: activeNotifications.filter((n) => !n.read).length,
    loading: false,
    isConnected: true,
    refreshNotifications: mockRefreshNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
    clearAll: mockClearAll,
  }),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('NotificationsPage Adversarial UI & Client State Suite', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    activeNotifications = [...sampleNotifications];
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('verifies multi-criteria search filtering across title and description', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(MemoryRouter, null, createElement(NotificationsPage)));
    });

    const searchInput = container.querySelector(
      'input[placeholder*="Search by title"]',
    ) as HTMLInputElement;
    expect(searchInput).toBeDefined();

    // Search for "Adobe"
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeInputValueSetter?.call(searchInput, 'Adobe');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Critical: License Expired');
    expect(container.textContent).not.toContain('Low Stock Alert');

    act(() => {
      root.unmount();
    });
  });

  it('handles empty state gracefully when filters match no notifications', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(MemoryRouter, null, createElement(NotificationsPage)));
    });

    const searchInput = container.querySelector(
      'input[placeholder*="Search by title"]',
    ) as HTMLInputElement;

    // Search for non-existent term
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeInputValueSetter?.call(searchInput, 'NON_EXISTENT_ALERT_QUERY_XYZ');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain(
      'No notifications found matching your filter criteria.',
    );

    act(() => {
      root.unmount();
    });
  });

  it('executes deep linking: unread item marks as read and navigates, read item navigates without marking read', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(MemoryRouter, null, createElement(NotificationsPage)));
    });

    const links = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('View Resource'),
    );
    expect(links.length).toBe(3);

    // Link 1 is notif-1 (unread)
    await act(async () => {
      links[0].click();
    });
    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
    expect(mockNavigate).toHaveBeenCalledWith('/inventory?sku=SKU-CAT6-01');

    // Link 3 is notif-3 (already read)
    mockMarkAsRead.mockClear();
    mockNavigate.mockClear();
    await act(async () => {
      links[2].click();
    });
    expect(mockMarkAsRead).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/assets?tag=AST-1042');

    act(() => {
      root.unmount();
    });
  });

  it('validates notification settings store volume and duration clamping bounds', () => {
    const store = useNotificationSettingsStore.getState();

    // Volume lower bound 0
    store.setSoundVolume(-0.5);
    expect(useNotificationSettingsStore.getState().soundVolume).toBe(0);

    // Volume upper bound 1
    store.setSoundVolume(1.5);
    expect(useNotificationSettingsStore.getState().soundVolume).toBe(1);

    // Duration lower bound 1s
    store.setToastDuration(0.2);
    expect(useNotificationSettingsStore.getState().toastDuration).toBe(1);

    // Duration upper bound 30s
    store.setToastDuration(60);
    expect(useNotificationSettingsStore.getState().toastDuration).toBe(30);

    // Category toggles
    store.setCategoryPreference('alerts', false);
    expect(useNotificationSettingsStore.getState().categories.alerts).toBe(false);

    // Reset to defaults
    store.resetToDefaults();
    expect(useNotificationSettingsStore.getState().soundVolume).toBe(0.5);
    expect(useNotificationSettingsStore.getState().toastDuration).toBe(4.5);
    expect(useNotificationSettingsStore.getState().categories.alerts).toBe(true);
  });
});
