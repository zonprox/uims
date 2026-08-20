import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type { Notification, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateNotificationDto, NotificationTypeEnum } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

export interface FormattedNotification {
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

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway?: NotificationsGateway,
  ) {}

  private timeAgo(date: Date): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  }

  private mapTypeToFrontend(type: NotificationType): 'info' | 'warning' | 'error' | 'success' {
    switch (type) {
      case 'ALERT':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
      default:
        return 'info';
    }
  }

  private mapCategory(title: string, message: string): 'alerts' | 'tasks' | 'general' {
    const combined = `${title} ${message}`.toLowerCase();
    if (
      combined.includes('task') ||
      combined.includes('approval') ||
      combined.includes('assignment')
    ) {
      return 'tasks';
    }
    if (
      combined.includes('alert') ||
      combined.includes('critical') ||
      combined.includes('expir') ||
      combined.includes('deplet') ||
      combined.includes('warn') ||
      combined.includes('low stock') ||
      combined.includes('out of stock')
    ) {
      return 'alerts';
    }
    return 'general';
  }

  private formatNotification(n: Notification): FormattedNotification {
    return {
      id: n.id,
      title: n.title,
      description: n.message,
      type: this.mapTypeToFrontend(n.type),
      category: this.mapCategory(n.title, n.message),
      time: this.timeAgo(n.createdAt),
      read: n.isRead,
      link: n.link || undefined,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async findAll(userId?: string): Promise<Array<FormattedNotification>> {
    const where: Prisma.NotificationWhereInput = {};
    if (userId) {
      where.userId = userId;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((n) => this.formatNotification(n));
  }

  async getUnreadCount(userId?: string): Promise<number> {
    const where: Prisma.NotificationWhereInput = { isRead: false };
    if (userId) {
      where.userId = userId;
    }
    return this.prisma.notification.count({ where });
  }

  async findOne(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException(`Notification with ID ${id} not found`);
    return this.formatNotification(notif);
  }

  /**
   * Create a notification record and dispatch it via WebSocket in real-time
   */
  async create(data: CreateNotificationDto) {
    const created = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: (data.type as NotificationType) || 'INFO',
        link: data.link || null,
        isRead: data.isRead ?? false,
      },
    });

    const formatted = this.formatNotification(created);

    // Real-time dispatch via WebSocket Gateway
    if (this.gateway) {
      this.gateway.sendToUser(data.userId, formatted);
      const unreadCount = await this.getUnreadCount(data.userId);
      this.gateway.sendCountToUser(data.userId, unreadCount);
    }

    return formatted;
  }

  /**
   * Helper to send notification to a single user
   */
  async notifyUser(
    userId: string,
    payload: {
      title: string;
      message: string;
      type?: NotificationTypeEnum | string;
      link?: string;
    },
  ) {
    return this.create({
      userId,
      title: payload.title,
      message: payload.message,
      type: (payload.type as NotificationTypeEnum) || 'INFO',
      link: payload.link,
    });
  }

  /**
   * Helper to send real-time notification to all Admin & Super Admin users
   */
  async notifyAdmins(payload: {
    title: string;
    message: string;
    type?: NotificationTypeEnum | string;
    link?: string;
  }) {
    try {
      const adminUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { roleName: { in: ['Admin', 'Super Admin'] } },
            { role: { name: { in: ['Admin', 'Super Admin'] } } },
          ],
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (adminUsers.length === 0) return [];

      const createdNotifications = await Promise.all(
        adminUsers.map((admin) =>
          this.create({
            userId: admin.id,
            title: payload.title,
            message: payload.message,
            type: (payload.type as NotificationTypeEnum) || 'INFO',
            link: payload.link,
          }),
        ),
      );

      return createdNotifications;
    } catch (err) {
      this.logger.error(`Failed to notify admins: ${(err as Error).message}`);
      return [];
    }
  }

  async markAsRead(id: string) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    const formatted = this.formatNotification(updated);

    if (this.gateway) {
      this.gateway.emitNotificationRead(updated.userId, id);
      const unreadCount = await this.getUnreadCount(updated.userId);
      this.gateway.sendCountToUser(updated.userId, unreadCount);
    }

    return formatted;
  }

  async markAllAsRead(userId?: string) {
    const where: Prisma.NotificationWhereInput = { isRead: false };
    if (userId) {
      where.userId = userId;
    }

    const res = await this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    if (this.gateway && userId) {
      this.gateway.sendCountToUser(userId, 0);
    }

    return { count: res.count, success: true };
  }

  async remove(id: string) {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    await this.prisma.notification.delete({ where: { id } });

    if (this.gateway && existing) {
      const unreadCount = await this.getUnreadCount(existing.userId);
      this.gateway.sendCountToUser(existing.userId, unreadCount);
    }

    return { success: true };
  }

  async clearAll(userId?: string) {
    const where: Prisma.NotificationWhereInput = {};
    if (userId) {
      where.userId = userId;
    }

    const res = await this.prisma.notification.deleteMany({ where });

    if (this.gateway) {
      this.gateway.emitNotificationsCleared(userId);
      if (userId) {
        this.gateway.sendCountToUser(userId, 0);
      }
    }

    return { count: res.count, success: true };
  }
}
