import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type { Notification, NotificationType, Prisma } from '@prisma/client';
import type {
  CreateNotificationDto as ICreateNotificationDto,
  NotificationItem,
  NotificationListResponseDto,
} from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';
import type { CreateNotificationDto, NotificationTypeEnum } from './dto/create-notification.dto';
import type { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsGateway } from './notifications.gateway';

export type FormattedNotification = NotificationItem;

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

  async findAll(
    userId?: string,
    query?: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    const conditions: Prisma.NotificationWhereInput[] = [];

    if (userId) {
      conditions.push({ userId });
    }

    const readFilter = query?.isRead !== undefined ? query.isRead : query?.read;
    if (typeof readFilter === 'boolean') {
      conditions.push({ isRead: readFilter });
    }

    if (query?.type) {
      const t = query.type.toUpperCase();
      let typeEnum: NotificationType | undefined;
      if (t === 'ERROR' || t === 'ALERT') {
        typeEnum = 'ALERT';
      } else if (t === 'WARNING' || t === 'WARN') {
        typeEnum = 'WARNING';
      } else if (t === 'INFO' || t === 'SUCCESS') {
        typeEnum = 'INFO';
      } else if (['INFO', 'WARNING', 'ALERT'].includes(t)) {
        typeEnum = t as NotificationType;
      }
      if (typeEnum) {
        conditions.push({ type: typeEnum });
      }
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      conditions.push({
        OR: [
          { title: { contains: s, mode: 'insensitive' } },
          { message: { contains: s, mode: 'insensitive' } },
        ],
      });
    }

    if (query?.startDate || query?.endDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        createdAtFilter.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (query.endDate.length === 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        createdAtFilter.lte = end;
      }
      conditions.push({ createdAt: createdAtFilter });
    }

    if (query?.category && query.category !== 'all') {
      if (query.category === 'tasks') {
        conditions.push({
          OR: [
            { title: { contains: 'task', mode: 'insensitive' } },
            { message: { contains: 'task', mode: 'insensitive' } },
            { title: { contains: 'approval', mode: 'insensitive' } },
            { message: { contains: 'approval', mode: 'insensitive' } },
            { title: { contains: 'assignment', mode: 'insensitive' } },
            { message: { contains: 'assignment', mode: 'insensitive' } },
          ],
        });
      } else if (query.category === 'alerts') {
        conditions.push({
          OR: [
            { title: { contains: 'alert', mode: 'insensitive' } },
            { message: { contains: 'alert', mode: 'insensitive' } },
            { title: { contains: 'critical', mode: 'insensitive' } },
            { message: { contains: 'critical', mode: 'insensitive' } },
            { title: { contains: 'expir', mode: 'insensitive' } },
            { message: { contains: 'expir', mode: 'insensitive' } },
            { title: { contains: 'deplet', mode: 'insensitive' } },
            { message: { contains: 'deplet', mode: 'insensitive' } },
            { title: { contains: 'warn', mode: 'insensitive' } },
            { message: { contains: 'warn', mode: 'insensitive' } },
            { title: { contains: 'low stock', mode: 'insensitive' } },
            { message: { contains: 'low stock', mode: 'insensitive' } },
            { title: { contains: 'out of stock', mode: 'insensitive' } },
            { message: { contains: 'out of stock', mode: 'insensitive' } },
            { type: 'ALERT' },
            { type: 'WARNING' },
          ],
        });
      } else if (query.category === 'general') {
        conditions.push({
          AND: [
            { title: { not: { contains: 'task' } } },
            { message: { not: { contains: 'task' } } },
            { title: { not: { contains: 'approval' } } },
            { message: { not: { contains: 'approval' } } },
            { title: { not: { contains: 'assignment' } } },
            { message: { not: { contains: 'assignment' } } },
            { title: { not: { contains: 'alert' } } },
            { message: { not: { contains: 'alert' } } },
            { title: { not: { contains: 'critical' } } },
            { message: { not: { contains: 'critical' } } },
            { title: { not: { contains: 'expir' } } },
            { message: { not: { contains: 'expir' } } },
            { title: { not: { contains: 'deplet' } } },
            { message: { not: { contains: 'deplet' } } },
            { title: { not: { contains: 'warn' } } },
            { message: { not: { contains: 'warn' } } },
            { title: { not: { contains: 'low stock' } } },
            { message: { not: { contains: 'low stock' } } },
            { title: { not: { contains: 'out of stock' } } },
            { message: { not: { contains: 'out of stock' } } },
            { type: 'INFO' },
          ],
        });
      }
    }

    const where: Prisma.NotificationWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const limit = Math.min(100, Math.max(1, Number(query?.limit || query?.pageSize) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * limit;

    const sortField = query?.sort || 'createdAt';
    const sortOrder = query?.order || 'desc';
    const orderBy = { [sortField]: sortOrder };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.notification.count({ where }),
      this.getUnreadCount(userId),
    ]);

    return {
      data: notifications.map((n) => this.formatNotification(n)),
      total,
      page,
      limit,
      unreadCount,
    };
  }

  async getUnreadCount(userId?: string): Promise<number> {
    const where: Prisma.NotificationWhereInput = { isRead: false };
    if (userId) {
      where.userId = userId;
    }
    return this.prisma.notification.count({ where });
  }

  async findOne(id: string): Promise<FormattedNotification> {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException(`Notification with ID ${id} not found`);
    return this.formatNotification(notif);
  }

  /**
   * Create a notification record and dispatch it via WebSocket in real-time
   */
  async create(
    data: CreateNotificationDto | ICreateNotificationDto,
  ): Promise<FormattedNotification> {
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

  async markAsRead(id: string): Promise<FormattedNotification> {
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

  async markAllAsRead(userId?: string): Promise<{ count: number; success: boolean }> {
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

  async remove(id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    await this.prisma.notification.delete({ where: { id } });

    if (this.gateway && existing) {
      const unreadCount = await this.getUnreadCount(existing.userId);
      this.gateway.sendCountToUser(existing.userId, unreadCount);
    }

    return { success: true };
  }

  async clearAll(userId?: string): Promise<{ count: number; success: boolean }> {
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
