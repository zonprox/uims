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
