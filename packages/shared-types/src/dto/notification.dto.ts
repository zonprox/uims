import type { NotificationItem, NotificationType } from '../entities/notification';

export type NotificationCategory = 'alerts' | 'tasks' | 'general' | 'all';

export interface NotificationQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  category?: NotificationCategory | string;
  type?: string;
  isRead?: boolean | string;
  read?: boolean | string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType | string;
  category?: 'alerts' | 'tasks' | 'general';
  link?: string;
  isRead?: boolean;
}

export interface MarkNotificationReadDto {
  isRead?: boolean;
}

export interface NotificationListResponseDto {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

export interface BulkNotificationActionDto {
  ids: string[];
}
