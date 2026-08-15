import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateNotificationDto } from './dto/create-notification.dto';

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
  constructor(private prisma: PrismaService) {}

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
      combined.includes('warn')
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

  async findOne(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    return this.formatNotification(notif);
  }

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

    return this.formatNotification(created);
  }

  async markAsRead(id: string) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return this.formatNotification(updated);
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

    return { count: res.count, success: true };
  }

  async remove(id: string) {
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  async clearAll(userId?: string) {
    const where: Prisma.NotificationWhereInput = {};
    if (userId) {
      where.userId = userId;
    }

    const res = await this.prisma.notification.deleteMany({ where });
    return { count: res.count, success: true };
  }
}
