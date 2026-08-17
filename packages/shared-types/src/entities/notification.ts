export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  ALERT = 'ALERT',
  SYSTEM = 'SYSTEM',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'alerts' | 'tasks' | 'general';
  time: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export enum NotificationSocketEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_COUNT = 'notification:count',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_CLEARED = 'notification:cleared',
  SUBSCRIBE_USER = 'subscribe:user',
}

export interface BroadcastNotificationDto {
  title: string;
  message: string;
  type?: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  targetRole?: 'All' | 'Admin' | 'Super Admin' | 'Employee';
  link?: string;
}
