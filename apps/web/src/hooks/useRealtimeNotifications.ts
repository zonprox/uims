import { App, Button } from 'antd';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { io, type Socket } from 'socket.io-client';
import { type NotificationItem, notificationsService } from '../services/notifications.service';
import { useAuthStore } from '../stores/auth.store';

// Helper to determine socket server URL
function getSocketUrl(): string {
  const envWsUrl = import.meta.env.VITE_WS_URL;
  if (envWsUrl) return envWsUrl;

  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.startsWith('http')) {
    return envApiUrl.replace(/\/api\/v1\/?$/, '');
  }

  // Default to current origin so it seamlessly routes through Vite HTTPS proxy
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3002';
}

export function useRealtimeNotifications() {
  const { token, user } = useAuthStore();
  const { notification: antNotification } = App.useApp();
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
      setNotifications(data);
      const count = data.filter((n) => !n.read).length;
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Establish real-time WebSocket connection
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const socketUrl = getSocketUrl();
    const socket: Socket = io(`${socketUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
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

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    // Handle real-time incoming notification
    socket.on('notification:new', (newNotif: NotificationItem) => {
      // 1. Prepend to state
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === newNotif.id);
        if (exists) return prev;
        return [newNotif, ...prev];
      });

      // 2. Increment unread count
      if (!newNotif.read) {
        setUnreadCount((c) => c + 1);
      }

      // 3. Display instant Ant Design toast popup
      const toastType =
        newNotif.type === 'error'
          ? 'error'
          : newNotif.type === 'warning'
            ? 'warning'
            : newNotif.type === 'success'
              ? 'success'
              : 'info';

      antNotification[toastType]({
        message: newNotif.title,
        description: newNotif.description,
        placement: 'topRight',
        duration: 6,
        btn: newNotif.link
          ? createElement(
              Button,
              {
                type: 'primary',
                size: 'small',
                onClick: () => {
                  if (newNotif.link) {
                    navigate(newNotif.link);
                  }
                  antNotification.destroy();
                },
              },
              'View Details',
            )
          : undefined,
      });

      // 4. Trigger Web Audio subtle notification chime if supported
      try {
        if (
          typeof AudioContext !== 'undefined' ||
          typeof (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext !== 'undefined'
        ) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch {
        // Audio optional
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
  }, [token, user, antNotification, navigate]);

  const markAsRead = async (id: string, link?: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
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
    } catch (err) {
      console.error('Failed to mark all as read:', err);
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
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const clearAll = async () => {
    try {
      await notificationsService.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
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
