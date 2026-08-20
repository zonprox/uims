import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduledAlertsWorker } from './scheduled-alerts.worker';

describe('ScheduledAlertsWorker', () => {
  let worker: ScheduledAlertsWorker;
  let mockPrisma: {
    license: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    asset: {
      findMany: ReturnType<typeof vi.fn>;
    };
    inventoryItem: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockNotificationsService: {
    notifyAdmins: ReturnType<typeof vi.fn>;
  };
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      license: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      asset: {
        findMany: vi.fn(),
      },
      inventoryItem: {
        findMany: vi.fn(),
      },
    };

    mockNotificationsService = {
      notifyAdmins: vi.fn().mockResolvedValue([]),
    };

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    worker = new ScheduledAlertsWorker(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      mockNotificationsService as unknown as import('./notifications.service').NotificationsService,
      mockRedis as unknown as import('../../common/redis/redis.service').RedisService,
    );
  });

  describe('scanExpiringLicenses', () => {
    it('should identify expired licenses, update status to EXPIRED and notify admins', async () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-1',
          name: 'Expired Tool',
          expiryDate: pastDate,
          status: 'ACTIVE',
        },
      ]);
      mockPrisma.license.update.mockResolvedValue({});

      const res = await worker.scanExpiringLicenses();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(res.throttled).toBe(0);
      expect(mockPrisma.license.update).toHaveBeenCalledWith({
        where: { id: 'lic-1' },
        data: { status: 'EXPIRED' },
      });
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'License Expired',
          type: 'ALERT',
          link: '/licenses',
        }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith('alert:license:expired:lic-1', true, 86400 * 7);
    });

    it('should trigger 1-day urgent alert and update status to EXPIRING_SOON', async () => {
      const tomorrow = new Date(Date.now() + 20 * 60 * 60 * 1000); // 20 hours ahead (~1 day)
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-2',
          name: 'Critical IDE',
          expiryDate: tomorrow,
          status: 'ACTIVE',
        },
      ]);
      mockPrisma.license.update.mockResolvedValue({});

      const res = await worker.scanExpiringLicenses();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockPrisma.license.update).toHaveBeenCalledWith({
        where: { id: 'lic-2' },
        data: { status: 'EXPIRING_SOON' },
      });
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Urgent: License Expiring Tomorrow',
          type: 'ALERT',
        }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith('alert:license:expiring:lic-2:1d', true, 86400);
    });

    it('should trigger 7-day critical alert', async () => {
      const fiveDaysFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-3',
          name: 'Figma Enterprise',
          expiryDate: fiveDaysFuture,
          status: 'ACTIVE',
        },
      ]);
      mockPrisma.license.update.mockResolvedValue({});

      const res = await worker.scanExpiringLicenses();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Critical: License Expiring Soon',
          type: 'ALERT',
        }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        'alert:license:expiring:lic-3:7d',
        true,
        86400 * 3,
      );
    });

    it('should trigger 15-day warning alert', async () => {
      const twelveDaysFuture = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-4',
          name: 'Postman Team',
          expiryDate: twelveDaysFuture,
          status: 'ACTIVE',
        },
      ]);

      const res = await worker.scanExpiringLicenses();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'License Expiring in 15 Days',
          type: 'WARNING',
        }),
      );
    });

    it('should trigger 30-day advance notice alert', async () => {
      const twentyFiveDaysFuture = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-5',
          name: 'Datadog Pro',
          expiryDate: twentyFiveDaysFuture,
          status: 'ACTIVE',
        },
      ]);

      const res = await worker.scanExpiringLicenses();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'License Expiration Notice (30 Days)',
          type: 'WARNING',
        }),
      );
    });

    it('should throttle and skip notification when Redis cache key exists', async () => {
      const twelveDaysFuture = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000);
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-4',
          name: 'Postman Team',
          expiryDate: twelveDaysFuture,
          status: 'ACTIVE',
        },
      ]);
      mockRedis.get.mockResolvedValue(true); // Already cached

      const res = await worker.scanExpiringLicenses();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(0);
      expect(res.throttled).toBe(1);
      expect(mockNotificationsService.notifyAdmins).not.toHaveBeenCalled();
    });
  });

  describe('scanExpiringWarranties', () => {
    it('should scan expiring warranties and notify admins across tiers', async () => {
      const now = Date.now();
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'ast-1',
          name: 'MacBook Pro 16',
          assetTag: 'AST-001',
          warrantyExpiry: new Date(now - 1000), // expired
        },
        {
          id: 'ast-2',
          name: 'Dell XPS 15',
          assetTag: 'AST-002',
          warrantyExpiry: new Date(now + 6 * 24 * 60 * 60 * 1000), // 6 days
        },
        {
          id: 'ast-3',
          name: 'LG UltraWide Monitor',
          assetTag: 'AST-003',
          warrantyExpiry: new Date(now + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
        {
          id: 'ast-4',
          name: 'Cisco Core Switch',
          assetTag: 'AST-004',
          warrantyExpiry: new Date(now + 28 * 24 * 60 * 60 * 1000), // 28 days
        },
      ]);

      const res = await worker.scanExpiringWarranties();

      expect(res.scanned).toBe(4);
      expect(res.notified).toBe(4);
      expect(res.throttled).toBe(0);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(4);
    });

    it('should throttle warranty alerts when previously dispatched', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'ast-1',
          name: 'MacBook Pro 16',
          assetTag: 'AST-001',
          warrantyExpiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      ]);
      mockRedis.get.mockResolvedValue(true);

      const res = await worker.scanExpiringWarranties();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(0);
      expect(res.throttled).toBe(1);
      expect(mockNotificationsService.notifyAdmins).not.toHaveBeenCalled();
    });
  });

  describe('scanOverdueMaintenance', () => {
    it('should find assets under maintenance for > 14 days and notify admins', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'ast-m1',
          name: 'Main Core Server',
          assetTag: 'AST-SRV-01',
          status: 'MAINTENANCE',
          updatedAt: twentyDaysAgo,
        },
      ]);

      const res = await worker.scanOverdueMaintenance();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Overdue Maintenance Alert',
          type: 'WARNING',
          link: '/assets',
        }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        'alert:asset:maintenance_overdue:ast-m1',
        true,
        86400 * 3,
      );
    });
  });

  describe('scanLowStock', () => {
    it('should alert on out-of-stock items and low stock threshold items', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          name: 'Cat6 Ethernet Patch Cable 2m',
          sku: 'SKU-ETH-01',
          quantity: 0,
          minThreshold: 10,
        },
        {
          id: 'inv-2',
          name: 'Wireless Ergonomic Mouse',
          sku: 'SKU-MOU-02',
          quantity: 3,
          minThreshold: 5,
        },
        {
          id: 'inv-3',
          name: 'HDMI 2.1 4K Cable',
          sku: 'SKU-HDM-03',
          quantity: 25,
          minThreshold: 5,
        },
      ]);

      const res = await worker.scanLowStock();

      expect(res.scanned).toBe(2);
      expect(res.notified).toBe(2);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Item Out of Stock',
          type: 'ALERT',
        }),
      );
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Low Stock Alert',
          type: 'WARNING',
        }),
      );
    });
  });

  describe('runDailyAlertScans', () => {
    it('should coordinate all scans and return an aggregated summary', async () => {
      mockPrisma.license.findMany.mockResolvedValue([]);
      mockPrisma.asset.findMany.mockResolvedValue([]);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);

      const summary = await worker.runDailyAlertScans();

      expect(summary.licenses).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(summary.warranties).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(summary.maintenance).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(summary.lowStock).toEqual({ scanned: 0, notified: 0, throttled: 0 });
    });

    it('should execute through handleCronScan', async () => {
      mockPrisma.license.findMany.mockResolvedValue([]);
      mockPrisma.asset.findMany.mockResolvedValue([]);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([]);

      const summary = await worker.handleCronScan();

      expect(summary).toBeDefined();
      expect(summary.licenses).toBeDefined();
    });
  });
});
