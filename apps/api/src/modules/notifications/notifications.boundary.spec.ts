import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import type { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsService - Adversarial & Boundary Stress Tests', () => {
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
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
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

  describe('1. Pagination & Boundary Limits Stress Matrix', () => {
    it('should normalize page=0 and negative pages to page=1', async () => {
      await service.findAll('user-1', { page: 0, limit: 10 });
      expect(mockPrisma.notification.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 10, skip: 0 }),
      );

      await service.findAll('user-1', { page: -99, limit: 10 });
      expect(mockPrisma.notification.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 10, skip: 0 }),
      );
    });

    it('should cap limit at 100 when client requests excessive limit=1000', async () => {
      const res = await service.findAll('user-1', { page: 1, limit: 1000 });
      expect(res.limit).toBe(100);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100, skip: 0 }),
      );
    });

    it('should normalize limit=0 or negative limit to valid bounds', async () => {
      const res0 = await service.findAll('user-1', { page: 1, limit: 0 });
      expect(res0.limit).toBe(50); // defaults to 50 when 0 is falsy
      expect(mockPrisma.notification.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 50 }),
      );

      const resNeg = await service.findAll('user-1', { page: 1, limit: -5 });
      expect(resNeg.limit).toBe(1); // Math.max(1, -5) -> 1
      expect(mockPrisma.notification.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('should respect pageSize alias when limit is omitted', async () => {
      const res = await service.findAll('user-1', { page: 3, pageSize: 25 });
      expect(res.limit).toBe(25);
      expect(res.page).toBe(3);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25, skip: 50 }),
      );
    });

    it('should handle large page numbers without arithmetic overflow', async () => {
      const res = await service.findAll('user-1', { page: 1000, limit: 20 });
      expect(res.page).toBe(1000);
      expect(res.limit).toBe(20);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20, skip: 19980 }),
      );
    });

    it('should apply custom sort field and order', async () => {
      await service.findAll('user-1', { sort: 'title', order: 'asc' });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
        }),
      );
    });
  });

  describe('2. Search Filter Boundary & Adversarial Strings', () => {
    it('should ignore empty search and whitespace-only search', async () => {
      await service.findAll('user-1', { search: '' });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }] },
        }),
      );

      await service.findAll('user-1', { search: '     ' });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }] },
        }),
      );
    });

    it('should trim search keywords and query both title and message with case-insensitivity', async () => {
      await service.findAll('user-1', { search: '  License Expiring  ' });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'user-1' },
              {
                OR: [
                  { title: { contains: 'License Expiring', mode: 'insensitive' } },
                  { message: { contains: 'License Expiring', mode: 'insensitive' } },
                ],
              },
            ],
          },
        }),
      );
    });

    it('should safely handle special characters and SQL injection payload strings in search', async () => {
      const maliciousPayload = "' OR 1=1 --; DROP TABLE notifications; <script>alert(1)</script>";
      await service.findAll('user-1', { search: maliciousPayload });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'user-1' },
              {
                OR: [
                  { title: { contains: maliciousPayload, mode: 'insensitive' } },
                  { message: { contains: maliciousPayload, mode: 'insensitive' } },
                ],
              },
            ],
          },
        }),
      );
    });
  });

  describe('3. Date Range Boundary Tests', () => {
    it('should expand YYYY-MM-DD endDate to 23:59:59.999 UTC', async () => {
      await service.findAll('user-1', {
        startDate: '2026-08-01',
        endDate: '2026-08-20',
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'user-1' },
              {
                createdAt: {
                  gte: new Date('2026-08-01'),
                  lte: new Date('2026-08-20T23:59:59.999Z'),
                },
              },
            ],
          },
        }),
      );
    });

    it('should preserve timestamp when full ISO string is provided for endDate', async () => {
      const isoEnd = '2026-08-20T14:30:00.000Z';
      await service.findAll('user-1', { endDate: isoEnd });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'user-1' },
              {
                createdAt: {
                  lte: new Date(isoEnd),
                },
              },
            ],
          },
        }),
      );
    });

    it('should handle only startDate provided', async () => {
      await service.findAll('user-1', { startDate: '2026-01-01' });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'user-1' },
              {
                createdAt: {
                  gte: new Date('2026-01-01'),
                },
              },
            ],
          },
        }),
      );
    });
  });

  describe('4. Category & Type Filter Stress Matrix', () => {
    it('should ignore category="all"', async () => {
      await service.findAll('user-1', { category: 'all' });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }] },
        }),
      );
    });

    it('should map type aliases: error -> ALERT, warn -> WARNING, success -> INFO', async () => {
      await service.findAll('user-1', { type: 'error' });
      expect(mockPrisma.notification.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }, { type: 'ALERT' }] },
        }),
      );

      await service.findAll('user-1', { type: 'warn' });
      expect(mockPrisma.notification.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }, { type: 'WARNING' }] },
        }),
      );

      await service.findAll('user-1', { type: 'success' });
      expect(mockPrisma.notification.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }, { type: 'INFO' }] },
        }),
      );
    });

    it('should ignore unrecognized type strings without crashing', async () => {
      await service.findAll('user-1', { type: 'UNKNOWN_TYPE_XYZ' });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }] },
        }),
      );
    });

    it('should prioritize isRead over read alias if both are supplied', async () => {
      await service.findAll('user-1', { isRead: true, read: false });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }, { isRead: true }] },
        }),
      );
    });

    it('should handle read=false alias when isRead is undefined', async () => {
      await service.findAll('user-1', { read: false });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ userId: 'user-1' }, { isRead: false }] },
        }),
      );
    });
  });

  describe('5. Full Combined Filter Stress Test', () => {
    it('should correctly combine all query parameters in AND clause', async () => {
      await service.findAll('user-1', {
        page: 2,
        limit: 25,
        category: 'alerts',
        type: 'ALERT',
        isRead: false,
        search: 'overdue maintenance',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        sort: 'createdAt',
        order: 'asc',
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { userId: 'user-1' },
              { isRead: false },
              { type: 'ALERT' },
              {
                OR: [
                  { title: { contains: 'overdue maintenance', mode: 'insensitive' } },
                  { message: { contains: 'overdue maintenance', mode: 'insensitive' } },
                ],
              },
              {
                createdAt: {
                  gte: new Date('2026-08-01'),
                  lte: new Date('2026-08-31T23:59:59.999Z'),
                },
              },
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { title: { contains: 'alert', mode: 'insensitive' } },
                  { type: 'ALERT' },
                ]),
              }),
            ],
          },
          orderBy: { createdAt: 'asc' },
          take: 25,
          skip: 25,
        }),
      );
    });
  });

  describe('6. Unread Count Accuracy & Super Admin Scoping', () => {
    it('should maintain user-isolated unreadCount independent of filter criteria', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count
        .mockResolvedValueOnce(0) // total matching filtered query
        .mockResolvedValueOnce(7); // global unread count for user-1

      const res = await service.findAll('user-1', {
        search: 'non-existent',
        category: 'tasks',
      });

      expect(res.total).toBe(0);
      expect(res.unreadCount).toBe(7);
      expect(mockPrisma.notification.count).toHaveBeenNthCalledWith(2, {
        where: { isRead: false, userId: 'user-1' },
      });
    });

    it('should query global notifications and global unreadCount when userId is undefined (Super Admin)', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count
        .mockResolvedValueOnce(50) // total system notifications
        .mockResolvedValueOnce(12); // global system unread count

      const res = await service.findAll(undefined, { page: 1, limit: 50 });

      expect(res.total).toBe(50);
      expect(res.unreadCount).toBe(12);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
      expect(mockPrisma.notification.count).toHaveBeenNthCalledWith(2, {
        where: { isRead: false },
      });
    });
  });

  describe('7. Output Data Formatting & Relative Time Oracle', () => {
    it('should properly format notification items and compute relative time', async () => {
      const now = Date.now();
      const mockItems = [
        {
          id: 'item-1',
          userId: 'u1',
          title: 'Stock Out Alert',
          message: 'Item has zero stock',
          type: 'ALERT',
          isRead: false,
          link: '/inventory/items/1',
          createdAt: new Date(now - 30 * 1000), // 30s ago -> 'Just now'
        },
        {
          id: 'item-2',
          userId: 'u1',
          title: 'Maintenance Task Assigned',
          message: 'Please review task #42',
          type: 'INFO',
          isRead: true,
          link: null,
          createdAt: new Date(now - 15 * 60 * 1000), // 15m ago -> '15m ago'
        },
        {
          id: 'item-3',
          userId: 'u1',
          title: 'General Update',
          message: 'System upgrade completed',
          type: 'INFO',
          isRead: false,
          link: null,
          createdAt: new Date(now - 5 * 3600 * 1000), // 5h ago -> '5h ago'
        },
        {
          id: 'item-4',
          userId: 'u1',
          title: 'Contract Expiration Warning',
          message: 'Contract will expire tomorrow',
          type: 'WARNING',
          isRead: false,
          link: null,
          createdAt: new Date(now - 25 * 3600 * 1000), // 25h ago -> 'Yesterday'
        },
        {
          id: 'item-5',
          userId: 'u1',
          title: 'Old Record',
          message: 'Old log message',
          type: 'INFO',
          isRead: true,
          link: null,
          createdAt: new Date(now - 72 * 3600 * 1000), // 3d ago -> '3d ago'
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockItems);
      mockPrisma.notification.count.mockResolvedValue(5);

      const res = await service.findAll('u1');

      expect(res.data).toHaveLength(5);

      expect(res.data[0]).toMatchObject({
        id: 'item-1',
        title: 'Stock Out Alert',
        description: 'Item has zero stock',
        type: 'error',
        category: 'alerts',
        time: 'Just now',
        read: false,
        link: '/inventory/items/1',
      });

      expect(res.data[1]).toMatchObject({
        id: 'item-2',
        title: 'Maintenance Task Assigned',
        type: 'info',
        category: 'tasks',
        time: '15m ago',
        read: true,
        link: undefined,
      });

      expect(res.data[2]).toMatchObject({
        id: 'item-3',
        type: 'info',
        category: 'general',
        time: '5h ago',
        read: false,
      });

      expect(res.data[3]).toMatchObject({
        id: 'item-4',
        type: 'warning',
        category: 'alerts',
        time: 'Yesterday',
      });

      expect(res.data[4]).toMatchObject({
        id: 'item-5',
        type: 'info',
        category: 'general',
        time: '3d ago',
      });
    });
  });
});
