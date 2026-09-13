import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduledAlertsWorker } from '../../src/modules/notifications/scheduled-alerts.worker';
import { DirectoryService } from '../../src/modules/directory/directory.service';
import { RolesService } from '../../src/modules/roles/roles.service';
import type { PrismaService } from '../../src/database/prisma.service';
import type { NotificationsService } from '../../src/modules/notifications/notifications.service';
import type { RedisService } from '../../src/common/redis/redis.service';

describe('M2 Challenger 2 — Empirical Adversarial Verification', () => {
  // =========================================================================
  // 1. ScheduledAlertsWorker: Fallback Cursor Loop & Multi-Batch Traversal
  // =========================================================================
  describe('ScheduledAlertsWorker: Fallback Cursor Pagination & Termination', () => {
    let worker: ScheduledAlertsWorker;
    let mockPrisma: any;
    let mockNotificationsService: any;
    let mockRedis: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: undefined, // Enforce fallback mode
        license: { findMany: vi.fn(), update: vi.fn() },
        asset: { findMany: vi.fn() },
        inventoryItem: { findMany: vi.fn() },
      };
      mockNotificationsService = {
        notifyAdmins: vi.fn().mockResolvedValue([]),
      };
      mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
      };

      worker = new ScheduledAlertsWorker(
        mockPrisma as unknown as PrismaService,
        mockNotificationsService as unknown as NotificationsService,
        mockRedis as unknown as RedisService,
      );
    });

    it('Adversarial Test 1.1: Multi-batch scanning must NOT terminate when an intermediate batch has 0 low-stock items', async () => {
      // Batch 1: 100 items, ALL normal stock (quantity: 50, minThreshold: 10) -> 0 low stock
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `b1-inv-${i.toString().padStart(3, '0')}`,
        name: `Normal Item B1-${i}`,
        sku: `SKU-B1-${i}`,
        quantity: 50,
        minThreshold: 10,
      }));

      // Batch 2: 100 items, 3 low stock items, 97 normal
      const batch2 = Array.from({ length: 100 }, (_, i) => ({
        id: `b2-inv-${i.toString().padStart(3, '0')}`,
        name: `Item B2-${i}`,
        sku: `SKU-B2-${i}`,
        quantity: i < 3 ? 2 : 50,
        minThreshold: 10,
      }));

      // Batch 3: 100 items, ALL normal stock -> 0 low stock
      const batch3 = Array.from({ length: 100 }, (_, i) => ({
        id: `b3-inv-${i.toString().padStart(3, '0')}`,
        name: `Normal Item B3-${i}`,
        sku: `SKU-B3-${i}`,
        quantity: 80,
        minThreshold: 10,
      }));

      // Batch 4: 45 items (< 100 -> terminal batch), 2 out-of-stock items (quantity: 0)
      const batch4 = Array.from({ length: 45 }, (_, i) => ({
        id: `b4-inv-${i.toString().padStart(3, '0')}`,
        name: `Item B4-${i}`,
        sku: `SKU-B4-${i}`,
        quantity: i < 2 ? 0 : 40,
        minThreshold: 5,
      }));

      mockPrisma.inventoryItem.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce(batch3)
        .mockResolvedValueOnce(batch4);

      const result = await worker.scanLowStock();

      // Verify all 4 batches were fetched across the cursor chain
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledTimes(4);

      // Verify cursor chain progression
      // Call 1: no cursor, skip 0
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenNthCalledWith(1, {
        take: 100,
        skip: 0,
        cursor: undefined,
        orderBy: { id: 'asc' },
      });

      // Call 2: cursor from end of Batch 1 (b1-inv-099)
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenNthCalledWith(2, {
        take: 100,
        skip: 1,
        cursor: { id: 'b1-inv-099' },
        orderBy: { id: 'asc' },
      });

      // Call 3: cursor from end of Batch 2 (b2-inv-099)
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenNthCalledWith(3, {
        take: 100,
        skip: 1,
        cursor: { id: 'b2-inv-099' },
        orderBy: { id: 'asc' },
      });

      // Call 4: cursor from end of Batch 3 (b3-inv-099)
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenNthCalledWith(4, {
        take: 100,
        skip: 1,
        cursor: { id: 'b3-inv-099' },
        orderBy: { id: 'asc' },
      });

      // Total low-stock items scanned: 3 from batch 2 + 2 from batch 4 = 5
      expect(result.scanned).toBe(5);
      expect(result.notified).toBe(5);
      expect(result.throttled).toBe(0);

      // Verify out-of-stock vs low-stock notification payloads
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

    it('Adversarial Test 1.2: Clean termination when initial table is empty or exactly 100 records', async () => {
      // Scenario A: Table is empty from the start
      mockPrisma.inventoryItem.findMany.mockResolvedValueOnce([]);
      const emptyResult = await worker.scanLowStock();
      expect(emptyResult.scanned).toBe(0);
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledTimes(1);

      // Scenario B: Exactly 100 records in table (Batch 1 has 100, Batch 2 returns [])
      mockPrisma.inventoryItem.findMany.mockReset();
      const exactBatch = Array.from({ length: 100 }, (_, i) => ({
        id: `exact-inv-${i}`,
        name: `Item ${i}`,
        sku: `SKU-${i}`,
        quantity: 50,
        minThreshold: 10,
      }));
      mockPrisma.inventoryItem.findMany.mockResolvedValueOnce(exactBatch).mockResolvedValueOnce([]);

      const exactResult = await worker.scanLowStock();
      expect(exactResult.scanned).toBe(0);
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventoryItem.findMany).toHaveBeenNthCalledWith(2, {
        take: 100,
        skip: 1,
        cursor: { id: 'exact-inv-99' },
        orderBy: { id: 'asc' },
      });
    });

    it('Adversarial Test 1.3: SQL QueryRaw branch cursor progression when $queryRaw is active', async () => {
      const rawQueryMock = vi.fn();
      mockPrisma.$queryRaw = rawQueryMock;

      // Batch 1 returns 100 low-stock rows
      const sqlBatch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `sql-inv-${i}`,
        name: `Low Stock ${i}`,
        sku: `SKU-${i}`,
        quantity: 1,
        minThreshold: 10,
      }));
      // Batch 2 returns 2 low-stock rows (< 100 -> terminate)
      const sqlBatch2 = [
        { id: 'sql-inv-100', name: 'Low Stock 100', sku: 'SKU-100', quantity: 0, minThreshold: 5 },
        { id: 'sql-inv-101', name: 'Low Stock 101', sku: 'SKU-101', quantity: 2, minThreshold: 5 },
      ];

      rawQueryMock.mockResolvedValueOnce(sqlBatch1).mockResolvedValueOnce(sqlBatch2);

      const result = await worker.scanLowStock();

      expect(rawQueryMock).toHaveBeenCalledTimes(2);
      expect(result.scanned).toBe(102);
      expect(result.notified).toBe(102);
    });
  });

  // =========================================================================
  // 2. DirectoryService: Chunked Transactions & Deferred Group Updates
  // =========================================================================
  describe('DirectoryService: Chunked Transaction Boundaries & Group Consolidation', () => {
    let service: DirectoryService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
        directoryUser: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi
            .fn()
            .mockImplementation((args: any) =>
              Promise.resolve({ id: `usr-${Math.random().toString(36).slice(2)}`, ...args.data }),
            ),
          update: vi
            .fn()
            .mockImplementation((args: any) =>
              Promise.resolve({ id: args.where.id, ...args.data }),
            ),
          count: vi.fn().mockResolvedValue(0),
        },
        directoryGroup: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation((args: any) =>
            Promise.resolve({
              id: `grp-${args.data.name}`,
              name: args.data.name,
              memberCount: 0,
            }),
          ),
          update: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(0),
        },
        directoryMembership: {
          upsert: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(5),
        },
        department: { findMany: vi.fn().mockResolvedValue([]) },
        organization: { findMany: vi.fn().mockResolvedValue([]) },
        location: { findMany: vi.fn().mockResolvedValue([]) },
        position: { findMany: vi.fn().mockResolvedValue([]) },
      };

      service = new DirectoryService(mockPrisma as unknown as PrismaService);
    });

    it('Adversarial Test 2.1: 250 rows must be chunked into exactly 3 transactions (100, 100, 50)', async () => {
      // Generate 250 users across 2 AD groups
      const users = Array.from({ length: 250 }, (_, i) => ({
        email: `worker${i}@uims.local`,
        employeeCode: `EMP-${i.toString().padStart(4, '0')}`,
        name: `Worker ${i}`,
        adGroup: i % 2 === 0 ? 'AD-Engineering' : 'AD-Operations',
      }));

      const res = await service.importBatch({ users });

      expect(res.total).toBe(250);
      expect(res.created).toBe(250);
      expect(res.updated).toBe(0);
      expect(res.skipped).toBe(0);
      expect(res.errors).toHaveLength(0);

      // Verify EXACTLY 3 transactions were executed (100 rows, 100 rows, 50 rows)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);

      // Group update consolidation: In each of the 3 chunks, 2 unique groups were modified.
      // Total directoryGroup.update calls should be 3 chunks * 2 unique groups = 6 calls.
      // Without consolidation, it would have been 250 calls!
      expect(mockPrisma.directoryGroup.update).toHaveBeenCalledTimes(6);
    });

    it('Adversarial Test 2.2: Intra-chunk memory map synchronization (create followed by update in same chunk)', async () => {
      // Row 0 creates user 'duplicate@uims.local'
      // Row 5 updates the SAME user in the SAME chunk
      const users = [
        {
          email: 'duplicate@uims.local',
          employeeCode: 'EMP-DUP-1',
          name: 'Original Name',
          telephone: '111-1111',
        },
        {
          email: 'other1@uims.local',
          employeeCode: 'EMP-OTH-1',
          name: 'Other One',
        },
        {
          email: 'duplicate@uims.local',
          employeeCode: 'EMP-DUP-1',
          name: 'Updated Name',
          telephone: '222-2222',
        },
      ];

      const res = await service.importBatch({ users });

      expect(res.total).toBe(3);
      expect(res.created).toBe(2); // 'duplicate@uims.local' and 'other1@uims.local'
      expect(res.updated).toBe(1); // 'duplicate@uims.local' updated on second row
      expect(res.errors).toHaveLength(0);

      // Verify that the second row updated the record created by the first row
      expect(mockPrisma.directoryUser.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.directoryUser.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.directoryUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'Updated Name',
            phone: '222-2222',
          }),
        }),
      );
    });

    it('Adversarial Test 2.3: Chunk partial failure logs error and continues with remaining valid rows', async () => {
      // 3 rows: Row 1 valid, Row 2 throws DB constraint, Row 3 valid
      mockPrisma.directoryUser.create
        .mockResolvedValueOnce({ id: 'u-1', email: 'ok1@uims.local' })
        .mockRejectedValueOnce(new Error('Unique constraint violation on employeeCode'))
        .mockResolvedValueOnce({ id: 'u-3', email: 'ok3@uims.local' });

      const users = [
        { email: 'ok1@uims.local', employeeCode: 'EMP-01' },
        { email: 'fail@uims.local', employeeCode: 'EMP-DUP' },
        { email: 'ok3@uims.local', employeeCode: 'EMP-03' },
      ];

      const res = await service.importBatch({ users });

      expect(res.total).toBe(3);
      expect(res.created).toBe(2);
      expect(res.errors).toHaveLength(1);
      expect(res.errors[0]).toEqual({
        row: 2,
        email: 'fail@uims.local',
        error: 'Unique constraint violation on employeeCode',
      });
    });

    it('Adversarial Test 2.4: Relational entity cache reuse across multiple chunks', async () => {
      // Pre-fetch department and organization
      mockPrisma.department.findMany.mockResolvedValueOnce([
        { id: 'dept-dev', name: 'Software Development' },
      ]);
      mockPrisma.organization.findMany.mockResolvedValueOnce([
        { id: 'org-main', name: 'Main Corp' },
      ]);

      // 150 rows: 100 in chunk 1, 50 in chunk 2, all sharing "Software Development" and "Main Corp"
      const users = Array.from({ length: 150 }, (_, i) => ({
        email: `cached${i}@uims.local`,
        department: 'Software Development',
        company: 'Main Corp',
      }));

      const res = await service.importBatch({ users });

      expect(res.total).toBe(150);
      expect(res.created).toBe(150);

      // Verify department and organization were queried in Chunk 1, and reused in Chunk 2 without duplicate queries
      expect(mockPrisma.department.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.organization.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 3. RolesService: Direct Database Counts & Zero Table Scan
  // =========================================================================
  describe('RolesService: Direct Database Counts & Invariant Enforcement', () => {
    let service: RolesService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        role: {
          count: vi.fn(),
          findMany: vi.fn(),
        },
        rolePermission: {
          count: vi.fn(),
        },
        permission: {
          count: vi.fn(),
        },
        appUser: {
          count: vi.fn(),
        },
      };

      service = new RolesService(mockPrisma as unknown as PrismaService);
    });

    it('Adversarial Test 3.1: getStats must query count() directly with SYSTEM_ROLE_NAMES and zero findMany', async () => {
      mockPrisma.role.count
        .mockResolvedValueOnce(12) // totalRoles
        .mockResolvedValueOnce(5); // systemRolesCount

      mockPrisma.permission.count.mockResolvedValueOnce(48); // totalPermissions
      mockPrisma.appUser.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(3) // superAdminsCount
        .mockResolvedValueOnce(95); // assignedUsers

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalRoles: 12,
        systemRolesCount: 5,
        customRolesCount: 7, // 12 - 5
        totalPermissionsCount: 48,
        superAdminsCount: 3,
        assignedUsersCoverage: 95,
      });

      // Verify role.count filter uses system role names list
      expect(mockPrisma.role.count).toHaveBeenNthCalledWith(2, {
        where: {
          name: {
            in: expect.arrayContaining([
              'SUPER ADMIN',
              'ADMIN',
              'MANAGER',
              'USER',
              'VIEWER',
              'TECHNICIAN',
              'AUDITOR',
              'EMPLOYEE',
              'Super Admin',
              'Admin',
            ]),
          },
        },
      });

      // Invariant: ZERO role.findMany calls in production when count is present
      expect(mockPrisma.role.findMany).not.toHaveBeenCalled();
    });

    it('Adversarial Test 3.2: Fallback branch must enforce take: 100 ceiling and deterministic ordering if count is unavailable', async () => {
      mockPrisma.role.count = undefined; // Force fallback branch

      mockPrisma.role.findMany.mockResolvedValueOnce([
        { name: 'Admin', _count: { users: 2 } },
        { name: 'Custom Auditor', _count: { users: 5 } },
      ]);
      mockPrisma.permission.count.mockResolvedValueOnce(10);
      mockPrisma.appUser.count
        .mockResolvedValueOnce(7) // totalUsers
        .mockResolvedValueOnce(1) // superAdminsCount
        .mockResolvedValueOnce(7); // assignedUsers

      const stats = await service.getStats();

      expect(stats.totalRoles).toBe(2);
      expect(stats.systemRolesCount).toBe(1); // 'Admin' is system
      expect(stats.customRolesCount).toBe(1); // 'Custom Auditor' is custom

      // Verify bounded query and deterministic secondary ordering in fallback
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        take: 100,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        select: {
          name: true,
          _count: { select: { users: true } },
        },
      });
    });
  });
});
