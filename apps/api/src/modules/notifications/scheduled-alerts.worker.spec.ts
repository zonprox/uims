import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduledAlertsWorker } from './scheduled-alerts.worker';

describe('ScheduledAlertsWorker', () => {
  let worker: ScheduledAlertsWorker;
  let mockPrisma: {
    $queryRaw: ReturnType<typeof vi.fn>;
    license: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    asset: {
      findMany: ReturnType<typeof vi.fn>;
    };
    deviceModel: {
      findMany: ReturnType<typeof vi.fn>;
    };
    assetHandoverRecord: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockNotificationsService: {
    notifyAdmins: ReturnType<typeof vi.fn>;
    pruneAllOldNotifications?: ReturnType<typeof vi.fn>;
  };
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
  let mockGateway: {
    emitCustodyEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      license: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      asset: {
        findMany: vi.fn(),
      },
      deviceModel: {
        findMany: vi.fn(),
      },
      assetHandoverRecord: {
        findMany: vi.fn(),
      },
    };

    mockNotificationsService = {
      notifyAdmins: vi.fn().mockResolvedValue([]),
      pruneAllOldNotifications: vi.fn().mockResolvedValue(0),
    };

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    mockGateway = {
      emitCustodyEvent: vi.fn(),
    };

    worker = new ScheduledAlertsWorker(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      mockNotificationsService as unknown as import('./notifications.service').NotificationsService,
      mockRedis as unknown as import('../../common/redis/redis.service').RedisService,
      mockGateway as unknown as import('./notifications.gateway').NotificationsGateway,
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

      expect(mockPrisma.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
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
          link: '/licenses?drawer=lic-1',
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

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
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

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Overdue Maintenance Alert',
          type: 'WARNING',
          link: '/assets?drawer=ast-m1',
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
      mockPrisma.$queryRaw.mockResolvedValue([
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
      ]);

      const res = await worker.scanLowStock();

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();

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

    it('should continue pagination in fallback mode across batches even when a batch contains zero low-stock items', async () => {
      (mockPrisma as Record<string, unknown>).$queryRaw = undefined;

      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `batch1-dm-${i}`,
        name: `Device Model B1 ${i}`,
        modelCode: `MOD-B1-${i}`,
        minThreshold: 5,
        units: Array.from({ length: 10 }, (_, j) => ({ id: `asset-b1-${i}-${j}` })),
      }));

      const batch2 = [
        {
          id: 'batch2-dm-1',
          name: 'Low Stock Laptop',
          modelCode: 'MOD-B2-01',
          minThreshold: 5,
          units: [{ id: 'asset-b2-1' }], // 1 unit <= 5
        },
        {
          id: 'batch2-dm-2',
          name: 'Normal Monitor',
          modelCode: 'MOD-B2-02',
          minThreshold: 2,
          units: Array.from({ length: 10 }, (_, j) => ({ id: `asset-b2-2-${j}` })), // 10 units > 2
        },
      ];

      mockPrisma.deviceModel.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

      const res = await worker.scanLowStock();

      expect(mockPrisma.deviceModel.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.deviceModel.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          cursor: { id: 'batch1-dm-99' },
          skip: 1,
        }),
      );
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
    });
  });

  describe('scanPendingHandoverRecords', () => {
    it('should return zero result when no pending handover records exist', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValue([]);

      const res = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPending: true },
          take: 100,
          orderBy: [{ id: 'asc' }],
        }),
      );
      expect(res).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(mockNotificationsService.notifyAdmins).not.toHaveBeenCalled();
    });

    it('should notify admins for pending allocation and return records with formatted payload', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValue([
        {
          id: 'rec-alloc-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-101',
          isPending: true,
          asset: {
            id: 'ast-101',
            assetTag: 'TAG-LAPTOP-01',
            subcode: 'SUB-01',
            deviceModel: {
              name: 'ThinkPad X1 Carbon',
              modelCode: 'TP-X1-G10',
            },
          },
          recipient: {
            id: 'usr-1',
            firstName: 'John',
            lastName: 'Doe',
            displayName: 'John Doe',
            email: 'johndoe@company.com',
          },
        },
        {
          id: 'rec-return-2',
          type: 'RETURN',
          assetId: 'ast-102',
          isPending: true,
          asset: {
            id: 'ast-102',
            assetTag: 'TAG-MON-02',
            subcode: 'SUB-02',
            deviceModel: {
              name: 'Dell UltraSharp 27"',
              modelCode: 'U2723QE',
            },
          },
          recipient: {
            id: 'usr-2',
            firstName: 'Jane',
            lastName: 'Smith',
            displayName: 'Jane Smith',
            email: 'janesmith@company.com',
          },
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(2);
      expect(res.notified).toBe(2);
      expect(res.throttled).toBe(0);

      // Verify Redis throttle set with 24 hours TTL (86400s)
      expect(mockRedis.set).toHaveBeenCalledWith('alert:handover:pending:rec-alloc-1', true, 86400);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'alert:handover:pending:rec-return-2',
        true,
        86400,
      );

      // Verify notification format for Allocation
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Pending Allocation Record: TAG-LAPTOP-01',
        message:
          'Signed document pending for ThinkPad X1 Carbon (TAG-LAPTOP-01) held by John Doe. Please upload the signed form.',
        type: 'WARNING',
        link: '/assets?drawer=ast-101',
      });

      // Verify notification format for Return
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Pending Return Record: TAG-MON-02',
        message:
          'Signed document pending for Dell UltraSharp 27" (TAG-MON-02) held by Jane Smith. Please upload the signed form.',
        type: 'WARNING',
        link: '/assets?drawer=ast-102',
      });
    });

    it('should paginate through multiple batches using cursor-based pagination (take: 100)', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `rec-b1-${i.toString().padStart(3, '0')}`,
        type: 'ASSIGNMENT',
        assetId: `ast-b1-${i}`,
        isPending: true,
        asset: {
          id: `ast-b1-${i}`,
          assetTag: `TAG-B1-${i}`,
          subcode: `SUB-B1-${i}`,
          deviceModel: { name: 'MacBook Pro 16"', modelCode: 'MBP16' },
        },
        recipient: {
          id: `usr-b1-${i}`,
          firstName: 'Employee',
          lastName: `${i}`,
          displayName: `Employee ${i}`,
          email: `emp${i}@company.com`,
        },
      }));

      const batch2 = [
        {
          id: 'rec-b2-001',
          type: 'RETURN',
          assetId: 'ast-b2-1',
          isPending: true,
          asset: {
            id: 'ast-b2-1',
            assetTag: 'TAG-B2-1',
            subcode: 'SUB-B2-1',
            deviceModel: { name: 'Dell Precision', modelCode: 'PREC-5570' },
          },
          recipient: {
            id: 'usr-b2-1',
            firstName: 'Bob',
            lastName: 'Martin',
            displayName: 'Bob Martin',
            email: 'bob@company.com',
          },
        },
      ];

      mockPrisma.assetHandoverRecord.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2);

      const res = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
        }),
      );
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          take: 100,
          skip: 1,
          cursor: { id: 'rec-b1-099' },
        }),
      );
      expect(res.scanned).toBe(101);
      expect(res.notified).toBe(101);
    });

    it('should throttle alert when Redis throttle key is already active', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValue([
        {
          id: 'rec-throttled-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-thr-1',
          isPending: true,
          asset: {
            id: 'ast-thr-1',
            assetTag: 'TAG-THR-1',
            deviceModel: { name: 'Laptop', modelCode: 'LP-1' },
          },
          recipient: {
            id: 'usr-thr-1',
            firstName: 'Alice',
            lastName: 'Smith',
            displayName: 'Alice',
            email: 'alice@company.com',
          },
        },
      ]);

      // Mock Redis returning active cached key
      mockRedis.get.mockResolvedValue(true);

      const res = await worker.scanPendingHandoverRecords();

      expect(mockRedis.get).toHaveBeenCalledWith('alert:handover:pending:rec-throttled-1');
      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(0);
      expect(res.throttled).toBe(1);
      expect(mockNotificationsService.notifyAdmins).not.toHaveBeenCalled();
    });

    it('should NOT set Redis cache key if notifyAdmins fails', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValue([
        {
          id: 'rec-fail-dispatch-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-fail-1',
          isPending: true,
          asset: {
            id: 'ast-fail-1',
            assetTag: 'TAG-FAIL-1',
            deviceModel: { name: 'Monitor', modelCode: 'MON-1' },
          },
          recipient: {
            id: 'usr-fail',
            firstName: 'Test',
            lastName: 'User',
            displayName: 'Test User',
            email: 'test@company.com',
          },
        },
      ]);

      mockNotificationsService.notifyAdmins.mockRejectedValueOnce(
        new Error('Network transport error'),
      );

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(0);
      expect(res.throttled).toBe(1);
      // Redis.set must NOT have been called because delivery failed
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should handle records with null asset relations or recipient gracefully', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValue([
        {
          id: 'rec-orphan-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-missing',
          isPending: true,
          asset: null,
          recipient: null,
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Pending Allocation Record: ast-missing',
        message:
          'Signed document pending for Hardware Unit (ast-missing) held by Unknown Custodian. Please upload the signed form.',
        type: 'WARNING',
        link: '/assets?drawer=ast-missing',
      });
    });

    it('should return zero when assetHandoverRecord is not present on PrismaService', async () => {
      (mockPrisma as Record<string, unknown>).assetHandoverRecord = undefined;

      const res = await worker.scanPendingHandoverRecords();

      expect(res).toEqual({ scanned: 0, notified: 0, throttled: 0 });
    });

    it('should mark overdue records (>3 days) with severity ALERT and dispatch WebSocket event', async () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-overdue-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-overdue-1',
          isPending: true,
          createdAt: fiveDaysAgo,
          asset: {
            id: 'ast-overdue-1',
            assetTag: 'TAG-OVERDUE-01',
            subcode: 'SUB-OD-01',
            deviceModel: {
              name: 'ThinkPad T14',
              modelCode: 'TP-T14',
            },
          },
          recipient: {
            id: 'usr-od-1',
            firstName: 'David',
            lastName: 'Miller',
            displayName: 'David Miller',
            email: 'david@company.com',
          },
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);

      // Verify WebSocket emission
      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({
          recordId: 'rec-overdue-1',
          assetId: 'ast-overdue-1',
          assetTag: 'TAG-OVERDUE-01',
          modelName: 'ThinkPad T14',
          recipientName: 'David Miller',
          type: 'ASSIGNMENT',
          notificationType: 'ASSET_RECORD_OVERDUE',
          isOverdue: true,
          severity: 'HIGH',
        }),
      );

      // Verify Admin Notification has type ALERT and urgent overdue message
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Overdue Allocation Record: TAG-OVERDUE-01',
        message: expect.stringMatching(/Urgent: Signed document overdue by \d+ days/),
        type: 'ALERT',
        link: '/assets?drawer=ast-overdue-1',
      });
    });

    it('should mark recent records (<=3 days) with severity WARNING and dispatch WebSocket event', async () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-recent-1',
          type: 'RETURN',
          assetId: 'ast-recent-1',
          isPending: true,
          createdAt: oneDayAgo,
          asset: {
            id: 'ast-recent-1',
            assetTag: 'TAG-REC-01',
            subcode: 'SUB-REC-01',
            deviceModel: {
              name: 'Dell Precision',
              modelCode: 'DP-5570',
            },
          },
          recipient: {
            id: 'usr-rec-1',
            firstName: 'Elena',
            lastName: 'Rostova',
            displayName: 'Elena Rostova',
            email: 'elena@company.com',
          },
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);

      // Verify WebSocket emission for non-overdue record
      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({
          recordId: 'rec-recent-1',
          isOverdue: false,
          severity: 'WARNING',
          notificationType: 'ASSET_HANDOVER_PENDING',
        }),
      );

      // Verify Admin Notification has type WARNING
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Pending Return Record: TAG-REC-01',
        message:
          'Signed document pending for Dell Precision (TAG-REC-01) held by Elena Rostova. Please upload the signed form.',
        type: 'WARNING',
        link: '/assets?drawer=ast-recent-1',
      });
    });

    it('should handle gateway errors gracefully without interrupting the scan', async () => {
      mockGateway.emitCustodyEvent.mockImplementation(() => {
        throw new Error('Socket transport disconnect');
      });

      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-gw-err-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-gw-1',
          isPending: true,
          asset: { id: 'ast-gw-1', assetTag: 'TAG-GW-1' },
          recipient: { id: 'usr-gw-1', email: 'test@company.com' },
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(1);
    });
  });

  describe('runDailyAlertScans', () => {
    it('should coordinate all scans and return an aggregated summary', async () => {
      mockPrisma.license.findMany.mockResolvedValue([]);
      mockPrisma.asset.findMany.mockResolvedValue([]);
      mockPrisma.deviceModel.findMany.mockResolvedValue([]);
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValue([]);

      const summary = await worker.runDailyAlertScans();

      expect(summary.licenses).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(summary.warranties).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(summary.maintenance).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(summary.lowStock).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(summary.pendingHandovers).toEqual({ scanned: 0, notified: 0, throttled: 0 });
    });

    it('should execute through handleCronScan', async () => {
      mockPrisma.license.findMany.mockResolvedValue([]);
      mockPrisma.asset.findMany.mockResolvedValue([]);
      mockPrisma.deviceModel.findMany.mockResolvedValue([]);
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValue([]);

      const summary = await worker.handleCronScan();

      expect(summary).toBeDefined();
      expect(summary.licenses).toBeDefined();
      expect(summary.pendingHandovers).toBeDefined();
    });
  });
});
