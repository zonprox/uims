import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationItem } from '../../services/notifications.service';
import NotificationsPage from './NotificationsPage';

const mockNavigate = vi.fn();
const mockMarkAsRead = vi.fn();
const mockMarkAllAsRead = vi.fn();
const mockDeleteNotification = vi.fn();
const mockClearAll = vi.fn();
const mockRefreshNotifications = vi.fn();

const mockNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Low Stock Alert',
    description:
      'Cat6 Ethernet Cables are running below minimum safety threshold (5 units remaining).',
    type: 'warning',
    category: 'alerts',
    time: '5m ago',
    read: false,
    link: '/inventory?sku=SKU-CAT6-01',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    title: 'License Renewal Required',
    description: 'Adobe Creative Cloud renewal is pending within 14 days.',
    type: 'error',
    category: 'alerts',
    time: '1h ago',
    read: false,
    link: '/licenses?id=lic-adobe-01',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'Hardware Allocation Completed',
    description: 'MacBook Pro AST-1042 has been successfully assigned to John Doe.',
    type: 'info',
    category: 'tasks',
    time: '3h ago',
    read: true,
    link: '/assets?id=ast-1042',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'notif-4',
    title: 'System Backup Success',
    description: 'Automated nightly snapshot of Redis and Postgres completed.',
    type: 'success',
    category: 'general',
    time: '1d ago',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
      createElement('a', { href: to }, children),
  };
});

vi.mock('../../hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: 2,
    loading: false,
    isConnected: true,
    refreshNotifications: mockRefreshNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
    deleteNotification: mockDeleteNotification,
    clearAll: mockClearAll,
  }),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => ({
        message: {
          success: vi.fn(),
          error: vi.fn(),
          info: vi.fn(),
          warning: vi.fn(),
        },
        notification: {
          info: vi.fn(),
          warning: vi.fn(),
          error: vi.fn(),
          success: vi.fn(),
        },
      }),
    },
  };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('NotificationsPage', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders page header, KPI statistics cards, and action buttons', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(NotificationsPage));
    });

    // Check title & KPI cards
    expect(container.textContent).toContain('Notifications');
    expect(container.textContent).toContain('Total Notifications');
    expect(container.textContent).toContain('Unread');
    expect(container.textContent).toContain('Alerts');
    expect(container.textContent).toContain('Tasks');

    // Check actions in header
    expect(container.textContent).toContain('Mark All Read');
    expect(container.textContent).toContain('Clear All');
    expect(container.textContent).toContain('Refresh');
    expect(container.textContent).toContain('Settings');

    act(() => {
      root.unmount();
    });
  });

  it('renders all notification items in high-density table', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(NotificationsPage));
    });

    expect(container.textContent).toContain('Low Stock Alert');
    expect(container.textContent).toContain('License Renewal Required');
    expect(container.textContent).toContain('Hardware Allocation Completed');
    expect(container.textContent).toContain('System Backup Success');

    // Check target link buttons
    const resourceLinks = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('View Resource'),
    );
    expect(resourceLinks.length).toBe(3);

    act(() => {
      root.unmount();
    });
  });

  it('clicks View Resource link and triggers navigation and markAsRead', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(NotificationsPage));
    });

    const resourceLinks = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('View Resource'),
    );
    expect(resourceLinks.length).toBeGreaterThan(0);

    // Click first link (notif-1 is unread)
    await act(async () => {
      resourceLinks[0].click();
    });

    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
    expect(mockNavigate).toHaveBeenCalledWith('/inventory?sku=SKU-CAT6-01');

    act(() => {
      root.unmount();
    });
  });

  it('triggers markAllAsRead when Mark All Read button is clicked', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(NotificationsPage));
    });

    const markAllBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Mark All Read'),
    );
    expect(markAllBtn).toBeDefined();

    await act(async () => {
      markAllBtn?.click();
    });

    expect(mockMarkAllAsRead).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });
});
