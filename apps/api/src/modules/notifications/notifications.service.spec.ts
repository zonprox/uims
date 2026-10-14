import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationType } from '@uims/shared-types';
import type { PrismaService } from '../../database/prisma.service';
import type { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: {
    notification: Record<string, ReturnType<typeof vi.fn>>;
    user: Record<string, ReturnType<typeof vi.fn>>;
    appUser: Record<string, ReturnType<typeof vi.fn>>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockGateway: Record<string, ReturnType<typeof vi.fn>>;
  let mockRedis: {
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    const userMock = {
      findMany: vi.fn(),
      findUnique: vi
        .fn()
        .mockImplementation((args: { where: { id: string } }) =>
          Promise.resolve({ id: args?.where?.id || 'u2' }),
        ),
      findFirst: vi
        .fn()
        .mockImplementation((_args: { where?: { email?: { equals: string } } }) =>
          Promise.resolve({ id: 'app-user-found' }),
        ),
    };
    const directoryUserMock = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    };
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
        groupBy: vi.fn(),
      },
      user: userMock,
      appUser: userMock,
      directoryUser: directoryUserMock,
      $transaction: vi.fn((cb) => (typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb))),
    };

    mockGateway = {
      sendToUser: vi.fn(),
      sendCountToUser: vi.fn(),
      sendToRole: vi.fn(),
      sendCountToRole: vi.fn(),
      emitNotificationRead: vi.fn(),
      emitNotificationsCleared: vi.fn(),
      emitCustodyEvent: vi.fn(),
    };

    mockRedis = {
      del: vi.fn().mockResolvedValue(undefined),
    };

    service = new NotificationsService(
      mockPrisma as unknown as PrismaService,
      mockGateway as unknown as NotificationsGateway,
      mockRedis as unknown as import('../../common/redis/redis.service').RedisService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated formatted notifications for a user', async () => {
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
      mockPrisma.notification.count.mockResolvedValueOnce(1); // count for where
      mockPrisma.notification.count.mockResolvedValueOnce(1); // unread count

      const result = await service.findAll('u1');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('n1');
      expect(result.data[0].type).toBe('error');
      expect(result.data[0].category).toBe('alerts');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.unreadCount).toBe(1);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'u1' }] },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should apply pagination and search query filters', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.findAll('u1', {
        page: 2,
        limit: 15,
        search: 'license',
        sort: 'createdAt',
        order: 'asc',
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(15);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'u1' },
              {
                OR: [
                  { title: { contains: 'license', mode: 'insensitive' } },
                  { message: { contains: 'license', mode: 'insensitive' } },
                ],
              },
            ],
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 15,
          skip: 15,
        }),
      );
    });

    it('should filter by isRead and category', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll('u1', {
        isRead: false,
        category: 'tasks',
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'u1' },
              { isRead: false },
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { title: { contains: 'task', mode: 'insensitive' } },
                  { message: { contains: 'task', mode: 'insensitive' } },
                ]),
              }),
            ],
          },
        }),
      );
    });

    it('should filter by type and date range', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll('u1', {
        type: 'warning',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'u1' },
              { type: 'WARNING' },
              {
                createdAt: {
                  gte: new Date('2026-08-01'),
                  lte: expect.any(Date),
                },
              },
            ],
          },
        }),
      );
    });

    it('should support general category filter', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll('u1', {
        category: 'general',
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'u1' },
              expect.objectContaining({
                AND: expect.arrayContaining([{ type: 'INFO' }]),
              }),
            ],
          },
        }),
      );
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

  describe('findOne', () => {
    it('should return formatted notification when found', async () => {
      const dbNotif = {
        id: 'n1',
        userId: 'u1',
        title: 'Task Assigned',
        message: 'You have a new task approval pending',
        type: 'INFO',
        isRead: false,
        link: '/tasks',
        createdAt: new Date(),
      };
      mockPrisma.notification.findUnique.mockResolvedValue(dbNotif);

      const res = await service.findOne('n1');
      expect(res.id).toBe('n1');
      expect(res.category).toBe('tasks');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.findOne('n-missing')).rejects.toThrowError();
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

  describe('resolveAppUserId', () => {
    it('should resolve directly by AppUser ID', async () => {
      mockPrisma.appUser.findUnique.mockResolvedValueOnce({ id: 'app-user-1' });
      const id = await service.resolveAppUserId('app-user-1');
      expect(id).toBe('app-user-1');
    });

    it('should resolve DirectoryUser ID to AppUser via email match', async () => {
      mockPrisma.appUser.findUnique.mockResolvedValueOnce(null);
      (mockPrisma.directoryUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        email: 'emp@youngonevn.com',
      });
      mockPrisma.appUser.findFirst.mockResolvedValueOnce({ id: 'app-user-matched' });

      const id = await service.resolveAppUserId('dir-user-1');
      expect(id).toBe('app-user-matched');
    });

    it('should resolve by corporate email directly', async () => {
      mockPrisma.appUser.findUnique.mockResolvedValueOnce(null);
      (mockPrisma.directoryUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      mockPrisma.appUser.findFirst.mockResolvedValueOnce({ id: 'app-user-email' });

      const id = await service.resolveAppUserId('admin@youngonevn.com');
      expect(id).toBe('app-user-email');
    });

    it('should return null when no matching AppUser is found', async () => {
      mockPrisma.appUser.findUnique.mockResolvedValueOnce(null);
      (mockPrisma.directoryUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      mockPrisma.appUser.findFirst.mockResolvedValueOnce(null);

      const id = await service.resolveAppUserId('unknown-user');
      expect(id).toBeNull();
    });
  });

  describe('notifyUser', () => {
    it('should delegate to create for specific user', async () => {
      const createdDb = {
        id: 'n-user',
        userId: 'u2',
        title: 'Alert',
        message: 'Msg',
        type: 'WARNING',
        isRead: false,
        createdAt: new Date(),
      };
      mockPrisma.appUser.findUnique.mockResolvedValueOnce({ id: 'u2' });
      mockPrisma.notification.create.mockResolvedValue(createdDb);
      mockPrisma.notification.count.mockResolvedValue(1);

      const res = await service.notifyUser('u2', {
        title: 'Alert',
        message: 'Msg',
        type: 'WARNING',
      });

      expect(res?.id).toBe('n-user');
    });

    it('should skip notification when AppUser cannot be resolved', async () => {
      mockPrisma.appUser.findUnique.mockResolvedValueOnce(null);
      (mockPrisma.directoryUser.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      mockPrisma.appUser.findFirst.mockResolvedValueOnce(null);

      const res = await service.notifyUser('non-existent', {
        title: 'Alert',
        message: 'Msg',
      });

      expect(res).toBeNull();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
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

  describe('remove', () => {
    it('should delete notification and emit unread count update', async () => {
      const existing = { id: 'n1', userId: 'u1' };
      mockPrisma.notification.findUnique.mockResolvedValue(existing);
      mockPrisma.notification.delete.mockResolvedValue(existing);
      mockPrisma.notification.count.mockResolvedValue(2);

      const res = await service.remove('n1');
      expect(res).toEqual({ success: true });
      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({ where: { id: 'n1' } });
      expect(mockGateway.sendCountToUser).toHaveBeenCalledWith('u1', 2);
    });
  });

  describe('clearAll', () => {
    it('should clear notifications and emit cleared event', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 4 });
      const res = await service.clearAll('u1');
      expect(res.count).toBe(4);
      expect(mockGateway.emitNotificationsCleared).toHaveBeenCalledWith('u1');
      expect(mockGateway.sendCountToUser).toHaveBeenCalledWith('u1', 0);
    });
  });

  describe('pruneOldNotifications', () => {
    it('should not delete anything when count <= maxLimit', async () => {
      mockPrisma.notification.count.mockResolvedValue(50);
      const pruned = await service.pruneOldNotifications('u1', 100);
      expect(pruned).toBe(0);
      expect(mockPrisma.notification.deleteMany).not.toHaveBeenCalled();
    });

    it('should auto-delete oldest excess notifications when count exceeds maxLimit', async () => {
      mockPrisma.notification.count.mockResolvedValue(105);
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: 'old-1' },
        { id: 'old-2' },
        { id: 'old-3' },
        { id: 'old-4' },
        { id: 'old-5' },
      ]);
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 5 });

      const pruned = await service.pruneOldNotifications('u1', 100);
      expect(pruned).toBe(5);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 5,
        select: { id: true },
      });
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['old-1', 'old-2', 'old-3', 'old-4', 'old-5'] } },
      });
    });
  });

  describe('pruneAllOldNotifications', () => {
    it('should group by user and prune oldest notifications for users exceeding cap', async () => {
      mockPrisma.notification.groupBy.mockResolvedValue([{ userId: 'u1', _count: { id: 103 } }]);
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: 'old-1' },
        { id: 'old-2' },
        { id: 'old-3' },
      ]);
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 3 });

      const pruned = await service.pruneAllOldNotifications(100);
      expect(pruned).toBe(3);
      expect(mockPrisma.notification.groupBy).toHaveBeenCalled();
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['old-1', 'old-2', 'old-3'] } },
      });
    });
  });

  describe('Custody Lifecycle Events and Alert Invalidation', () => {
    it('should emit custody lifecycle events via gateway', () => {
      const payload = { assetId: 'ast-1', status: 'IN_USE' };
      service.emitCustodyEvent('asset_allocated', payload);
      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith('asset_allocated', payload);
    });

    it('should notify admins and emit events on notifyAssetAllocated', async () => {
      mockPrisma.appUser.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n-alloc',
        userId: 'admin-1',
        title: 'Pending Asset Handover Record',
        message: '1 unit(s) allocated to Alice pending signed handover document.',
        type: 'WARNING',
        isRead: false,
        createdAt: new Date(),
      });

      await service.notifyAssetAllocated({
        assetIds: ['ast-1'],
        recipientId: 'usr-1',
        recipientName: 'Alice',
        isPending: true,
        count: 1,
      });

      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'asset_allocated',
        expect.objectContaining({ recipientName: 'Alice' }),
      );
      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({ type: 'ASSIGNMENT' }),
      );
      expect(mockPrisma.appUser.findMany).toHaveBeenCalled();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Pending Asset Handover Record',
            type: 'WARNING',
          }),
        }),
      );
    });

    it('should notify admins and emit events on notifyAssetReturned', async () => {
      mockPrisma.appUser.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n-ret',
        userId: 'admin-1',
        title: 'Pending Asset Return Record',
        message: 'Asset TAG-1 returned (AVAILABLE) pending signed return document.',
        type: 'WARNING',
        isRead: false,
        createdAt: new Date(),
      });

      await service.notifyAssetReturned({
        assetId: 'ast-1',
        assetTag: 'TAG-1',
        previousCustodianId: 'usr-1',
        isPending: true,
        status: 'AVAILABLE',
      });

      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'asset_returned',
        expect.objectContaining({ assetTag: 'TAG-1' }),
      );
      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({ type: 'RETURN' }),
      );
    });

    it('should notify admins and emit events on notifyAssetTransferred', async () => {
      mockPrisma.appUser.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n-trans',
        userId: 'admin-1',
        title: 'Pending Asset Transfer Records',
        message: 'Asset TAG-1 transferred pending signed handover records.',
        type: 'WARNING',
        isRead: false,
        createdAt: new Date(),
      });

      await service.notifyAssetTransferred({
        assetId: 'ast-1',
        assetTag: 'TAG-1',
        fromCustodianId: 'usr-1',
        toCustodianId: 'usr-2',
        isPending: true,
      });

      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'asset_transferred',
        expect.objectContaining({ fromCustodianId: 'usr-1', toCustodianId: 'usr-2' }),
      );
      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({ type: 'ASSIGNMENT' }),
      );
    });

    it('should notify admins and emit event on notifyHandoverDocumentPending', async () => {
      mockPrisma.appUser.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n-doc-pending',
        userId: 'admin-1',
        title: 'Pending Allocation Record: TAG-1',
        message:
          'Signed document pending for asset TAG-1 held by Bob. Please upload the signed form.',
        type: 'WARNING',
        isRead: false,
        createdAt: new Date(),
      });

      await service.notifyHandoverDocumentPending({
        recordId: 'rec-1',
        assetId: 'ast-1',
        assetTag: 'TAG-1',
        recipientName: 'Bob',
        type: 'ASSIGNMENT',
      });

      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({ recordId: 'rec-1' }),
      );
    });

    it('should clear Redis throttle key and broadcast handover_document_resolved on clearHandoverDocumentAlert', async () => {
      const res = await service.clearHandoverDocumentAlert('rec-123', 'ast-456');

      expect(res).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('alert:handover:pending:rec-123');
      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'handover_document_resolved',
        expect.objectContaining({ recordId: 'rec-123', assetId: 'ast-456' }),
      );
    });

    it('should invoke clearHandoverDocumentAlert via clearHandoverAlert alias', async () => {
      const res = await service.clearHandoverAlert('rec-789', 'ast-999');

      expect(res).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('alert:handover:pending:rec-789');
    });
  });
});
