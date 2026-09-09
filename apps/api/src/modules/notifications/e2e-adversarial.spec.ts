import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduledAlertsWorker, type ScanResult } from './scheduled-alerts.worker';
import { NotificationsService } from './notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { LicensesService } from '../licenses/licenses.service';
import { AssetsService } from '../assets/assets.service';
import type { PrismaService } from '../../database/prisma.service';
import type { NotificationsGateway } from './notifications.gateway';
import type { RedisService } from '../../common/redis/redis.service';

interface MockPrismaClient {
  notification: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  user: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  appUser: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  directoryUser: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  license: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  licenseAssignment: {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  asset: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  assetCategory: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  location: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  assetHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  inventoryItem: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
}

interface MockGateway {
  sendToUser: ReturnType<typeof vi.fn>;
  sendCountToUser: ReturnType<typeof vi.fn>;
  sendToRole: ReturnType<typeof vi.fn>;
  sendCountToRole: ReturnType<typeof vi.fn>;
  emitNotificationRead: ReturnType<typeof vi.fn>;
  emitNotificationsCleared: ReturnType<typeof vi.fn>;
}

interface MockRedis {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  flush: () => void;
}

function isScanResult(res: ScanResult | { error: unknown }): res is ScanResult {
  return typeof res === 'object' && res !== null && 'scanned' in res;
}

describe('Adversarial E2E Integration & Stress Testing', () => {
  let mockPrisma: MockPrismaClient;
  let mockGateway: MockGateway;
  let mockRedis: MockRedis;
  let notificationsService: NotificationsService;
  let scheduledWorker: ScheduledAlertsWorker;
  let inventoryService: InventoryService;
  let licensesService: LicensesService;
  let assetsService: AssetsService;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi
          .fn()
          .mockImplementation(({ data }: { data: { isRead?: boolean; [key: string]: unknown } }) =>
            Promise.resolve({
              id: `notif-${Math.random().toString(36).substring(7)}`,
              ...data,
              isRead: data.isRead ?? false,
              createdAt: new Date(),
            }),
          ),
        update: vi
          .fn()
          .mockImplementation(
            ({
              where,
              data,
            }: {
              where: { id: string };
              data: { isRead?: boolean; [key: string]: unknown };
            }) =>
              Promise.resolve({
                id: where.id,
                userId: 'user-1',
                title: 'Test',
                message: 'Test message',
                type: 'INFO',
                isRead: data.isRead ?? true,
                createdAt: new Date(),
              }),
          ),
        updateMany: vi.fn().mockResolvedValue({ count: 3 }),
        delete: vi.fn().mockResolvedValue({ id: 'notif-1' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
        count: vi.fn().mockResolvedValue(0),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'admin-1', roleName: 'Admin' },
          { id: 'admin-2', roleName: 'Super Admin' },
        ]),
        findUnique: vi.fn().mockResolvedValue({ id: 'employee-42', email: 'alice@company.com' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'employee-42', email: 'alice@company.com' }),
      },
      appUser: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'admin-1', roleName: 'Admin' },
          { id: 'admin-2', roleName: 'Super Admin' },
        ]),
        findUnique: vi.fn().mockResolvedValue({ id: 'employee-42', email: 'alice@company.com' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'employee-42', email: 'alice@company.com' }),
      },
      directoryUser: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'admin-1', roleName: 'Admin' },
          { id: 'admin-2', roleName: 'Super Admin' },
        ]),
        findUnique: vi.fn().mockResolvedValue({ id: 'employee-42', email: 'alice@company.com' }),
        findFirst: vi.fn().mockResolvedValue({ id: 'employee-42', email: 'alice@company.com' }),
      },
      license: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi
          .fn()
          .mockImplementation(
            ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
              Promise.resolve({ id: where.id, ...data }),
          ),
      },
      licenseAssignment: {
        create: vi
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'assign-1', ...data }),
          ),
        delete: vi.fn().mockResolvedValue({ id: 'assign-1' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      asset: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(10),
      },
      assetCategory: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Laptop' }),
      },
      location: {
        findFirst: vi.fn().mockResolvedValue({ id: 'loc-1', name: 'HQ' }),
      },
      assetHistory: {
        create: vi.fn().mockResolvedValue({ id: 'hist-1' }),
      },
      inventoryItem: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn().mockImplementation(
          ({
            data,
          }: {
            data: {
              sku?: string;
              name: string;
              category?: string;
              quantity: number;
              minThreshold?: number;
              unitCost?: number;
              location?: string;
              binNumber?: string;
              supplier?: string;
              notes?: string;
            };
          }) =>
            Promise.resolve({
              id: 'inv-item-1',
              sku: data.sku || 'SKU-001',
              name: data.name,
              category: data.category,
              quantity: data.quantity,
              minThreshold: data.minThreshold,
              unitCost: data.unitCost,
              location: data.location,
              binNumber: data.binNumber,
              supplier: data.supplier,
              notes: data.notes,
              createdAt: new Date(),
            }),
        ),
        update: vi
          .fn()
          .mockImplementation(
            ({
              where,
              data,
            }: {
              where: { id: string };
              data: { quantity?: number | { increment: number }; [key: string]: unknown };
            }) =>
              Promise.resolve({
                id: where.id,
                sku: 'SKU-001',
                name: 'Item 1',
                quantity:
                  typeof data.quantity === 'object' && data.quantity !== null
                    ? data.quantity.increment
                    : data.quantity,
                minThreshold: 5,
                unitCost: 10,
              }),
          ),
        delete: vi.fn(),
        count: vi.fn().mockResolvedValue(5),
        aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: 50 } }),
      },
      $transaction: vi.fn((cb: ((tx: unknown) => Promise<unknown>) | Promise<unknown>[]) =>
        typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb),
      ),
    };

    mockGateway = {
      sendToUser: vi.fn(),
      sendCountToUser: vi.fn(),
      sendToRole: vi.fn(),
      sendCountToRole: vi.fn(),
      emitNotificationRead: vi.fn(),
      emitNotificationsCleared: vi.fn(),
    };

    const redisStore = new Map<string, { value: unknown; expiresAt: number }>();
    mockRedis = {
      get: vi.fn().mockImplementation((key: string) => {
        const item = redisStore.get(key);
        if (!item) return Promise.resolve(null);
        if (Date.now() > item.expiresAt) {
          redisStore.delete(key);
          return Promise.resolve(null);
        }
        return Promise.resolve(item.value);
      }),
      set: vi.fn().mockImplementation((key: string, value: unknown, ttlSec: number) => {
        redisStore.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
        return Promise.resolve(undefined);
      }),
      del: vi.fn().mockImplementation((key: string) => {
        redisStore.delete(key);
        return Promise.resolve(1);
      }),
      flush: () => redisStore.clear(),
    };

    notificationsService = new NotificationsService(
      mockPrisma as unknown as PrismaService,
      mockGateway as unknown as NotificationsGateway,
    );
    scheduledWorker = new ScheduledAlertsWorker(
      mockPrisma as unknown as PrismaService,
      notificationsService,
      mockRedis as unknown as RedisService,
    );
    inventoryService = new InventoryService(
      mockPrisma as unknown as PrismaService,
      notificationsService,
    );
    licensesService = new LicensesService(
      mockPrisma as unknown as PrismaService,
      notificationsService,
    );
    assetsService = new AssetsService(mockPrisma as unknown as PrismaService, notificationsService);
  });

  describe('1. ScheduledAlertsWorker Complete Tier Progression & Throttling', () => {
    it('progresses seamlessly through 30d -> 15d -> 7d -> 1d -> Expired tiers with exact cache keys and TTLs', async () => {
      const now = new Date();
      const licId = 'lic-progression-test';

      // Day 35: No alerts dispatched
      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: licId,
          name: 'Enterprise Cloud Suite',
          expiryDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      ]);
      let res = await scheduledWorker.scanExpiringLicenses();
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(0);
      expect(res.throttled).toBe(0);

      // Day 30: 30-day tier alert dispatched
      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: licId,
          name: 'Enterprise Cloud Suite',
          expiryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      ]);
      res = await scheduledWorker.scanExpiringLicenses();
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `alert:license:expiring:${licId}:30d`,
        true,
        86400 * 14,
      );

      // Day 28 (within 30d cooldown): Throttled
      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: licId,
          name: 'Enterprise Cloud Suite',
          expiryDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      ]);
      res = await scheduledWorker.scanExpiringLicenses();
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(0);
      expect(res.throttled).toBe(1);

      // Day 15: 15-day tier alert dispatched
      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: licId,
          name: 'Enterprise Cloud Suite',
          expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      ]);
      res = await scheduledWorker.scanExpiringLicenses();
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        `alert:license:expiring:${licId}:15d`,
        true,
        86400 * 7,
      );

      // Day 7: 7-day critical alert dispatched & status updated to EXPIRING_SOON
      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: licId,
          name: 'Enterprise Cloud Suite',
          expiryDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      ]);
      res = await scheduledWorker.scanExpiringLicenses();
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockPrisma.license.update).toHaveBeenCalledWith({
        where: { id: licId },
        data: { status: 'EXPIRING_SOON' },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        `alert:license:expiring:${licId}:7d`,
        true,
        86400 * 3,
      );

      // Day 1: 1-day urgent alert dispatched
      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: licId,
          name: 'Enterprise Cloud Suite',
          expiryDate: new Date(now.getTime() + 20 * 60 * 60 * 1000), // 20 hours remaining (~1 day)
          status: 'EXPIRING_SOON',
        },
      ]);
      res = await scheduledWorker.scanExpiringLicenses();
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockRedis.set).toHaveBeenCalledWith(`alert:license:expiring:${licId}:1d`, true, 86400);

      // Day 0: Expired alert dispatched & status updated to EXPIRED
      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: licId,
          name: 'Enterprise Cloud Suite',
          expiryDate: new Date(now.getTime() - 1000),
          status: 'EXPIRING_SOON',
        },
      ]);
      res = await scheduledWorker.scanExpiringLicenses();
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockPrisma.license.update).toHaveBeenCalledWith({
        where: { id: licId },
        data: { status: 'EXPIRED' },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(`alert:license:expired:${licId}`, true, 86400 * 7);
    });

    it('handles multiple expiring items across different categories concurrently in runDailyAlertScans', async () => {
      const now = new Date();
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-1',
          name: 'L1',
          expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
        {
          id: 'lic-2',
          name: 'L2',
          expiryDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        },
      ]);
      mockPrisma.asset.findMany.mockImplementation(
        ({
          where,
        }: {
          where: { warrantyExpiry?: unknown; status?: string; [key: string]: unknown };
        }) => {
          if (where.warrantyExpiry) {
            return Promise.resolve([
              {
                id: 'ast-1',
                name: 'A1',
                assetTag: 'TAG-1',
                warrantyExpiry: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
              },
            ]);
          }
          if (where.status === 'MAINTENANCE') {
            return Promise.resolve([
              {
                id: 'ast-m',
                name: 'Server Rack',
                assetTag: 'TAG-SRV',
                status: 'MAINTENANCE',
                updatedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
              },
            ]);
          }
          return Promise.resolve([]);
        },
      );
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        { id: 'inv-1', name: 'Item Low', sku: 'SKU-LOW', quantity: 2, minThreshold: 5 },
        { id: 'inv-2', name: 'Item Out', sku: 'SKU-OUT', quantity: 0, minThreshold: 5 },
      ]);

      const summary = await scheduledWorker.runDailyAlertScans();

      expect(isScanResult(summary.licenses)).toBe(true);
      if (isScanResult(summary.licenses)) {
        expect(summary.licenses.scanned).toBe(2);
        expect(summary.licenses.notified).toBe(2);
      }
      expect(isScanResult(summary.warranties)).toBe(true);
      if (isScanResult(summary.warranties)) {
        expect(summary.warranties.scanned).toBe(1);
        expect(summary.warranties.notified).toBe(1);
      }
      expect(isScanResult(summary.maintenance)).toBe(true);
      if (isScanResult(summary.maintenance)) {
        expect(summary.maintenance.scanned).toBe(1);
        expect(summary.maintenance.notified).toBe(1);
      }
      expect(isScanResult(summary.lowStock)).toBe(true);
      if (isScanResult(summary.lowStock)) {
        expect(summary.lowStock.scanned).toBe(2);
        expect(summary.lowStock.notified).toBe(2);
      }
    });

    it('isolates scanner failure and returns error summary without throwing unhandled exceptions', async () => {
      mockPrisma.license.findMany.mockRejectedValue(new Error('Database timeout on license query'));
      mockPrisma.asset.findMany.mockResolvedValue([]);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);

      const summary = await scheduledWorker.runDailyAlertScans();

      expect('error' in summary.licenses && summary.licenses.error).toBeDefined();
      expect(isScanResult(summary.warranties)).toBe(true);
      if (isScanResult(summary.warranties)) {
        expect(summary.warranties.scanned).toBe(0);
      }
      expect(isScanResult(summary.maintenance)).toBe(true);
      if (isScanResult(summary.maintenance)) {
        expect(summary.maintenance.scanned).toBe(0);
      }
      expect(isScanResult(summary.lowStock)).toBe(true);
      if (isScanResult(summary.lowStock)) {
        expect(summary.lowStock.scanned).toBe(0);
      }
    });
  });

  describe('2. Domain Event Triggers to WebSocket Broadcast Lifecycle', () => {
    it('triggers admin alerts when inventory item quantity drops below threshold on create & update', async () => {
      // 1. Create item with low quantity
      await inventoryService.create({
        name: 'USB-C Adapters',
        sku: 'SKU-USBC-01',
        quantity: 3,
        minThreshold: 10,
        unitCost: 15,
      });

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({
          title: 'Low Stock Alert',
          type: 'warning',
        }),
      );
      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        'admin-2',
        expect.objectContaining({
          title: 'Low Stock Alert',
          type: 'warning',
        }),
      );

      // 2. Update item to 0 quantity (Out of Stock)
      mockGateway.sendToUser.mockClear();
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'inv-item-1',
        name: 'USB-C Adapters',
        sku: 'SKU-USBC-01',
      });
      mockPrisma.inventoryItem.update.mockResolvedValue({
        id: 'inv-item-1',
        name: 'USB-C Adapters',
        sku: 'SKU-USBC-01',
        quantity: 0,
        minThreshold: 10,
      });

      await inventoryService.update('inv-item-1', { quantity: 0 });

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({
          title: 'Item Out of Stock',
          type: 'error',
        }),
      );
    });

    it('triggers seat capacity alerts at 90% and 100% threshold on license assignment', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-zoom',
        name: 'Zoom Pro',
        totalSeats: 10,
        usedSeats: 8,
      });

      // 1. Assign 9th seat (90% capacity)
      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-zoom',
        name: 'Zoom Pro',
        totalSeats: 10,
        usedSeats: 9,
      });

      await licensesService.assignUser('lic-zoom', {
        name: 'Alice Smith',
        email: 'alice@company.com',
      });

      // User gets assignment notification
      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        'employee-42',
        expect.objectContaining({
          title: 'License Assigned',
        }),
      );

      // Admins get 90% threshold alert
      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({
          title: 'License Capacity Near Limit',
          type: 'warning',
        }),
      );

      // 2. Assign 10th seat (100% capacity)
      mockGateway.sendToUser.mockClear();
      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-zoom',
        name: 'Zoom Pro',
        totalSeats: 10,
        usedSeats: 10,
      });

      await licensesService.assignUser('lic-zoom', {
        name: 'Bob Jones',
        email: 'alice@company.com',
      });

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({
          title: 'License Capacity Reached',
          type: 'warning',
        }),
      );
    });

    it('triggers critical alert when asset status transitions to MAINTENANCE or LOST', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-mac-101',
        name: 'MacBook Pro M3 Max',
        assetTag: 'AST-M3-01',
        status: 'AVAILABLE',
        category: { name: 'Laptop' },
        location: { name: 'HQ' },
      });

      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-mac-101',
        name: 'MacBook Pro M3 Max',
        assetTag: 'AST-M3-01',
        status: 'MAINTENANCE',
        category: { name: 'Laptop' },
        location: { name: 'HQ' },
      });

      await assetsService.update('ast-mac-101', { status: 'MAINTENANCE' });

      expect(mockGateway.sendToUser).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({
          title: 'Asset Alert: MacBook Pro M3 Max',
          type: 'error',
        }),
      );
    });
  });

  describe('3. NotificationsService Query Engine & Persistence Resilience', () => {
    it('correctly maps and filters multi-criteria queries with edge boundaries', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'n-1',
          userId: 'user-1',
          title: 'Critical DB Alert',
          message: 'PostgreSQL connection pool depleted',
          type: 'ALERT',
          isRead: false,
          link: '/audit',
          createdAt: new Date('2026-08-20T10:00:00Z'),
        },
      ]);
      mockPrisma.notification.count.mockResolvedValueOnce(1);
      mockPrisma.notification.count.mockResolvedValueOnce(1);

      const res = await notificationsService.findAll('user-1', {
        search: 'connection',
        category: 'alerts',
        isRead: false,
        type: 'ALERT',
        startDate: '2026-08-01',
        endDate: '2026-08-20',
        page: 1,
        limit: 10,
      });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].category).toBe('alerts');
      expect(res.data[0].type).toBe('error');
      expect(res.total).toBe(1);
      expect(res.unreadCount).toBe(1);
    });

    it('gracefully handles markAllAsRead and clearAll with real-time socket events', async () => {
      // Mark all read
      const markRes = await notificationsService.markAllAsRead('user-1');
      expect(markRes.success).toBe(true);
      expect(mockGateway.sendCountToUser).toHaveBeenCalledWith('user-1', 0);

      // Clear all
      const clearRes = await notificationsService.clearAll('user-1');
      expect(clearRes.success).toBe(true);
      expect(mockGateway.emitNotificationsCleared).toHaveBeenCalledWith('user-1');
      expect(mockGateway.sendCountToUser).toHaveBeenCalledWith('user-1', 0);
    });
  });
});
