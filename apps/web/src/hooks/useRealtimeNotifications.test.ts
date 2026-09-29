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
const mockSocketConnect = vi.fn();
let mockSocketConnected = true;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    get connected() {
      return mockSocketConnected;
    },
    on: mockSocketOn,
    disconnect: mockSocketDisconnect,
    emit: mockSocketEmit,
    connect: mockSocketConnect,
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

const mockRefreshAuthToken = vi.fn().mockResolvedValue('refreshed-from-connect-error');
vi.mock('../services/api', () => ({
  refreshAuthToken: () => mockRefreshAuthToken(),
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
    mockSocketConnected = true;
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

  it('should resynchronize authentication with active socket when token refreshes without tearing down connection', async () => {
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

    expect(hookResult).not.toBeNull();
    mockSocketDisconnect.mockClear();

    // Simulate token refresh event in store
    await act(async () => {
      useAuthStore.getState().setTokens('refreshed-jwt-token-789');
    });

    // Verify token was updated on active socket without calling disconnect and auth:refresh was emitted
    expect(mockSocketDisconnect).not.toHaveBeenCalled();
    expect(mockSocketEmit).toHaveBeenCalledWith('auth:refresh', {
      token: 'refreshed-jwt-token-789',
    });

    act(() => {
      root.unmount();
    });
  });

  it('should reconnect disconnected socket when token refreshes instead of emitting to dead socket', async () => {
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

    expect(hookResult).not.toBeNull();
    mockSocketConnect.mockClear();
    mockSocketEmit.mockClear();

    // Simulate socket disconnecting due to 15-minute token expiry
    mockSocketConnected = false;

    // Simulate token refresh event in store
    await act(async () => {
      useAuthStore.getState().setTokens('new-fresh-access-token-999');
    });

    // Should call socket.connect() to re-establish connection
    expect(mockSocketConnect).toHaveBeenCalled();
    // Should NOT emit to the dead disconnected socket
    expect(mockSocketEmit).not.toHaveBeenCalledWith('auth:refresh', expect.anything());

    act(() => {
      root.unmount();
    });
  });

  it('should not emit spurious auth:refresh when user logs out and then logs in', async () => {
    vi.mocked(notificationsService.getNotifications).mockResolvedValue([]);

    function TestComponent() {
      useRealtimeNotifications();
      return createElement('div', null);
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    await act(async () => {
      await Promise.resolve();
    });

    mockSocketEmit.mockClear();

    // 1. User logs out
    await act(async () => {
      useAuthStore.getState().logout();
    });

    // 2. User logs in with new token
    await act(async () => {
      useAuthStore
        .getState()
        .login(
          'brand-new-user-token',
          { id: 'u2', email: 'user2@company.com', name: 'User 2', role: 'Staff' },
          ['*:*'],
          'brand-new-refresh-token',
        );
    });

    // Should NOT emit auth:refresh because new connection is initialized with brand-new-user-token
    expect(mockSocketEmit).not.toHaveBeenCalledWith('auth:refresh', expect.anything());

    act(() => {
      root.unmount();
    });
  });

  it('should proactively trigger refreshAuthToken on authentication connect_error when refresh token is present', async () => {
    vi.mocked(notificationsService.getNotifications).mockResolvedValue([]);

    useAuthStore.setState({
      token: 'jwt-stale-token',
      refreshToken: 'valid-refresh-token-present',
      user: { id: 'u1', email: 'admin@company.com', name: 'Alex', role: 'Admin' },
    });

    let connectErrorHandler: ((err: Error) => void) | undefined;
    mockSocketOn.mockImplementation((event: string, handler: unknown) => {
      if (event === 'connect_error') {
        connectErrorHandler = handler as (err: Error) => void;
      }
    });

    function TestComponent() {
      useRealtimeNotifications();
      return createElement('div', null);
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(connectErrorHandler).toBeDefined();
    mockRefreshAuthToken.mockClear();

    // Trigger connect_error with auth expiration error
    await act(async () => {
      connectErrorHandler?.(new Error('Authentication error: jwt expired'));
    });

    expect(mockSocketDisconnect).toHaveBeenCalled();
    expect(mockRefreshAuthToken).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });
});
