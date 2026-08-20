import { api } from './api';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'alerts' | 'tasks' | 'general';
  time: string;
  read: boolean;
  link?: string;
  createdAt?: string;
}

export const notificationsService = {
  getNotifications: async (): Promise<Array<NotificationItem>> => {
    const res = await api.get('/notifications');
    return res.data?.data ?? res.data ?? [];
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/notifications/unread-count');
    const data = res.data?.data ?? res.data;
    return typeof data?.count === 'number' ? data.count : 0;
  },

  markAsRead: async (id: string): Promise<NotificationItem> => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data?.data ?? res.data;
  },

  markAllAsRead: async (): Promise<{ count: number; success: boolean }> => {
    const res = await api.post('/notifications/mark-all-read');
    return res.data?.data ?? res.data;
  },

  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data?.data ?? res.data;
  },

  clearAll: async (): Promise<{ count: number; success: boolean }> => {
    const res = await api.delete('/notifications');
    return res.data?.data ?? res.data;
  },
};
