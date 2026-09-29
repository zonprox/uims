import { App, Button } from 'antd';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { io, type Socket } from 'socket.io-client';
import { type NotificationItem, notificationsService } from '../services/notifications.service';
import { refreshAuthToken } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import {
  playNotificationChime,
  useNotificationSettingsStore,
} from '../stores/notification-settings.store';

// Helper to determine socket server URL dynamically
function getSocketUrl(): string {
  const envWsUrl = import.meta.env.VITE_WS_URL;
  if (envWsUrl) return envWsUrl;

  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.startsWith('http')) {
    return envApiUrl.replace(/\/api\/v1\/?$/, '');
  }

  // Seamlessly adapt to current window origin (any custom URL or port)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function useRealtimeNotifications() {
  const { token } = useAuthStore();
  const { message, notification: antNotification } = App.useApp();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Array<NotificationItem>>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);

  // Load initial notifications from database
  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await notificationsService.getNotifications();
      const list = Array.isArray(data) ? data : [];
      setNotifications(list);
      const count = list.filter((n) => !n.read).length;
      setUnreadCount(count);
    } catch (_err: unknown) {
      message.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [message, token]);

  // Initial load
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const antNotificationRef = useRef(antNotification);
  antNotificationRef.current = antNotification;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const hasToken = Boolean(token);
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;
  const prevTokenRef = useRef<string | null>(token);

  // Synchronize token updates with active WebSocket connection without tearing it down
  useEffect(() => {
    if (!token) {
      prevTokenRef.current = null;
      return;
    }

    if (prevTokenRef.current && prevTokenRef.current !== token && socketRef.current) {
      socketRef.current.auth = { token };
      if (socketRef.current.connected) {
        socketRef.current.emit?.('auth:refresh', { token });
      } else {
        socketRef.current.connect?.();
      }
    }
    prevTokenRef.current = token;
  }, [token]);

  // Establish real-time WebSocket connection
  useEffect(() => {
    if (!hasToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socketUrl = getSocketUrl();
    const socketEndpoint = socketUrl ? `${socketUrl}/notifications` : '/notifications';
    const socket: Socket = io(socketEndpoint, {
      auth: { token: tokenRef.current },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('auth:refreshed', () => {
      setIsConnected(true);
    });

    socket.on('connect_error', (err: Error) => {
      setIsConnected(false);
      const isAuthErr =
        err.message?.toLowerCase().includes('auth') ||
        err.message?.toLowerCase().includes('token') ||
        err.message?.toLowerCase().includes('jwt');

      if (isAuthErr) {
        socket.disconnect();
        // Proactively renew token using stored refresh token if available
        const hasRefreshToken = Boolean(useAuthStore.getState().refreshToken);
        if (hasRefreshToken) {
          refreshAuthToken().catch((_err: unknown) => {
            // Refresh failure will cleanly trigger handleAuthRedirect to /login
          });
        }
      }
    });

    // Handle real-time incoming notification
    socket.on('notification:new', (newNotif: NotificationItem) => {
      // 1. Prepend to state and auto-trim old notifications beyond limit (FIFO cap)
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === newNotif.id);
        if (exists) return prev;
        const updated = [newNotif, ...prev];
        const MAX_CLIENT_NOTIFICATIONS = 100;
        return updated.length > MAX_CLIENT_NOTIFICATIONS
          ? updated.slice(0, MAX_CLIENT_NOTIFICATIONS)
          : updated;
      });

      // 2. Increment unread count
      if (!newNotif.read) {
        setUnreadCount((c) => c + 1);
      }

      // Read current persistent user preferences
      const settings = useNotificationSettingsStore.getState();
      const catKey = (newNotif.category || 'general') as keyof typeof settings.categories;
      const isSubscribed = settings.categories?.[catKey] !== false;

      // 3. Display instant Ant Design toast popup if enabled and subscribed
      if (settings.toastEnabled && isSubscribed) {
        const toastType =
          newNotif.type === 'error'
            ? 'error'
            : newNotif.type === 'warning'
              ? 'warning'
              : newNotif.type === 'success'
                ? 'success'
                : 'info';

        antNotificationRef.current[toastType]({
          message: newNotif.title,
          description: newNotif.description,
          placement: 'topRight',
          duration: settings.toastDuration ?? 4.5,
          btn: newNotif.link
            ? createElement(
                Button,
                {
                  type: 'primary',
                  size: 'small',
                  onClick: () => {
                    if (newNotif.link) {
                      navigateRef.current(newNotif.link);
                    }
                    antNotificationRef.current.destroy();
                  },
                },
                'View Details',
              )
            : undefined,
        });
      }

      // 4. Trigger Web Audio subtle notification chime if enabled and subscribed
      if (settings.soundEnabled && isSubscribed) {
        playNotificationChime(settings.soundVolume ?? 0.5);
      }
    });

    // Handle real-time unread count update
    socket.on('notification:count', (payload: { unreadCount: number }) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(payload.unreadCount);
      }
    });

    // Handle single notification marked as read
    socket.on('notification:read', (payload: { id: string }) => {
      setNotifications((prev) => prev.map((n) => (n.id === payload.id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    });

    // Handle all notifications cleared
    socket.on('notification:cleared', () => {
      setNotifications([]);
      setUnreadCount(0);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [hasToken, userId]);

  const markAsRead = async (id: string, link?: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_err: unknown) {
      message.error('Failed to mark notification as read.');
    }

    if (link) {
      navigate(link);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_err: unknown) {
      message.error('Failed to mark all notifications as read.');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const target = notifications.find((n) => n.id === id);
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (_err: unknown) {
      message.error('Failed to delete notification.');
    }
  };

  const clearAll = async () => {
    try {
      await notificationsService.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (_err: unknown) {
      message.error('Failed to clear notifications.');
    }
  };

  return {
    notifications,
    unreadCount,
    isConnected,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
