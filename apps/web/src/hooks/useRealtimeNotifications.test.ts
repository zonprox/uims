import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notificationsService } from '../services/notifications.service';
import { useAuthStore } from '../stores/auth.store';
import { useRealtimeNotifications } from './useRealtimeNotifications';

// Mock socket.io-client
const mockSocketOn = vi.fn();
const mockSocketDisconnect = vi.fn();
const mockSocketEmit = vi.fn();

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: mockSocketOn,
    disconnect: mockSocketDisconnect,
    emit: mockSocketEmit,
  })),
}));

vi.mock('../services/notifications.service', () => ({
  notificationsService: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => ({
        notification: {
          open: vi.fn(),
          info: vi.fn(),
          warning: vi.fn(),
          error: vi.fn(),
          success: vi.fn(),
          destroy: vi.fn(),
        },
      }),
    },
  };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('useRealtimeNotifications Hook', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    useAuthStore.setState({
      token: 'jwt-test-token',
      user: { id: 'u1', email: 'admin@company.com', name: 'Alex', role: 'Admin' },
    });
  });

  it('should load initial notifications on mount and calculate unread count', async () => {
    vi.mocked(notificationsService.getNotifications).mockResolvedValueOnce([
      {
        id: 'n1',
        title: 'Low Stock Alert',
        description: 'Ethernet adapters low',
        type: 'warning',
        category: 'alerts',
        time: 'Just now',
        read: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n2',
        title: 'Asset Assigned',
        description: 'MacBook Pro assigned',
        type: 'info',
        category: 'general',
        time: '1h ago',
        read: true,
        createdAt: new Date().toISOString(),
      },
    ]);

    let hookResult: ReturnType<typeof useRealtimeNotifications> | null = null;
    function TestComponent() {
      const state = useRealtimeNotifications();
      hookResult = state;
      return createElement('div', null, `Unread: ${state.unreadCount}`);
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(hookResult!.notifications).toHaveLength(2);
    expect(hookResult!.unreadCount).toBe(1);

    act(() => {
      root.unmount();
    });
  });

  it('should mark notification as read and decrement unread count', async () => {
    vi.mocked(notificationsService.getNotifications).mockResolvedValueOnce([
      {
        id: 'n1',
        title: 'Test',
        description: 'Desc',
        type: 'info',
        category: 'general',
        time: 'Just now',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    vi.mocked(notificationsService.markAsRead).mockResolvedValueOnce({
      id: 'n1',
      title: 'Test',
      description: 'Desc',
      type: 'info',
      category: 'general',
      time: 'Just now',
      read: true,
      createdAt: new Date().toISOString(),
    });

    let hookResult: ReturnType<typeof useRealtimeNotifications> | null = null;
    function TestComponent() {
      const state = useRealtimeNotifications();
      hookResult = state;
      return createElement('div', null);
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(hookResult!.unreadCount).toBe(1);

    await act(async () => {
      await hookResult!.markAsRead('n1');
    });

    expect(hookResult!.notifications[0].read).toBe(true);
    expect(hookResult!.unreadCount).toBe(0);

    act(() => {
      root.unmount();
    });
  });

  it('should handle incoming socket notification:new and update state', async () => {
    vi.mocked(notificationsService.getNotifications).mockResolvedValueOnce([]);

    let hookResult: ReturnType<typeof useRealtimeNotifications> | null = null;
    function TestComponent() {
      const state = useRealtimeNotifications();
      hookResult = state;
      return createElement('div', null);
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(hookResult!.notifications).toHaveLength(0);
    expect(hookResult!.unreadCount).toBe(0);

    // Find registered notification:new handler
    const newNotifHandler = mockSocketOn.mock.calls.find(
      (call) => call[0] === 'notification:new',
    )?.[1];
    expect(newNotifHandler).toBeDefined();

    await act(async () => {
      newNotifHandler({
        id: 'new-1',
        title: 'New Alert',
        description: 'New Description',
        type: 'warning',
        category: 'alerts',
        time: 'Just now',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    expect(hookResult!.notifications).toHaveLength(1);
    expect(hookResult!.notifications[0].id).toBe('new-1');
    expect(hookResult!.unreadCount).toBe(1);

    act(() => {
      root.unmount();
    });
  });
});
