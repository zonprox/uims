import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationsService } from './notifications.service';
import type { PrismaService } from '../../database/prisma.service';
import type { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from '@uims/shared-types';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: {
    notification: Record<string, ReturnType<typeof vi.fn>>;
    user: Record<string, ReturnType<typeof vi.fn>>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockGateway: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn((cb) => (typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb))),
    };

    mockGateway = {
      sendToUser: vi.fn(),
      sendCountToUser: vi.fn(),
      sendToRole: vi.fn(),
      sendCountToRole: vi.fn(),
      emitNotificationRead: vi.fn(),
      emitNotificationsCleared: vi.fn(),
    };

    service = new NotificationsService(
      mockPrisma as unknown as PrismaService,
      mockGateway as unknown as NotificationsGateway,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return formatted notifications for a user', async () => {
      const dbNotif = {
        id: 'n1',
        userId: 'u1',
        title: 'System Alert',
        message: 'Depleted stock alert on item',
        type: 'ALERT',
        isRead: false,
        link: '/inventory',
        createdAt: new Date(),
      };
      mockPrisma.notification.findMany.mockResolvedValue([dbNotif]);

      const result = await service.findAll('u1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('n1');
      expect(result[0].type).toBe('error');
      expect(result[0].category).toBe('alerts');
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);
      const count = await service.getUnreadCount('u1');
      expect(count).toBe(3);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { isRead: false, userId: 'u1' },
      });
    });
  });

  describe('create', () => {
    it('should create notification and emit real-time event via gateway', async () => {
      const createdDb = {
        id: 'n-new',
        userId: 'u1',
        title: 'Asset Assigned',
        message: 'New laptop assigned to you',
        type: 'INFO',
        isRead: false,
        link: '/assets',
        createdAt: new Date(),
      };
      mockPrisma.notification.create.mockResolvedValue(createdDb);
      mockPrisma.notification.count.mockResolvedValue(1);

      const res = await service.create({
        userId: 'u1',
        title: 'Asset Assigned',
        message: 'New laptop assigned to you',
        link: '/assets',
      });

      expect(res.id).toBe('n-new');
      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ id: 'n-new' }),
      );
      expect(mockGateway.sendCountToUser).toHaveBeenCalledWith('u1', 1);
    });
  });

  describe('notifyAdmins', () => {
    it('should find admin users and create notifications for each', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin1' }, { id: 'admin2' }]);
      mockPrisma.notification.create.mockImplementation(
        (args: {
          data: { userId: string; title: string; message: string; type: NotificationType };
        }) => ({
          id: `n-${args.data.userId}`,
          userId: args.data.userId,
          title: args.data.title,
          message: args.data.message,
          type: args.data.type,
          isRead: false,
          createdAt: new Date(),
        }),
      );
      mockPrisma.notification.count.mockResolvedValue(1);

      const results = await service.notifyAdmins({
        title: 'Critical Anomaly',
        message: 'Firewall detected anomaly',
        type: NotificationType.ALERT,
        link: '/audit',
      });

      expect(results).toHaveLength(2);
      expect(mockGateway.sendToUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('markAsRead', () => {
    it('should update status and emit real-time read event', async () => {
      const updated = {
        id: 'n1',
        userId: 'u1',
        title: 'Title',
        message: 'Message',
        type: 'INFO',
        isRead: true,
        createdAt: new Date(),
      };
      mockPrisma.notification.update.mockResolvedValue(updated);
      mockPrisma.notification.count.mockResolvedValue(0);

      const res = await service.markAsRead('n1');
      expect(res.read).toBe(true);
      expect(mockGateway.emitNotificationRead).toHaveBeenCalledWith('u1', 'n1');
      expect(mockGateway.sendCountToUser).toHaveBeenCalledWith('u1', 0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read and emit count 0', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
      const res = await service.markAllAsRead('u1');
      expect(res.count).toBe(5);
      expect(mockGateway.sendCountToUser).toHaveBeenCalledWith('u1', 0);
    });
  });

  describe('clearAll', () => {
    it('should clear notifications and emit cleared event', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 4 });
      const res = await service.clearAll('u1');
      expect(res.count).toBe(4);
      expect(mockGateway.emitNotificationsCleared).toHaveBeenCalledWith('u1');
    });
  });
});
