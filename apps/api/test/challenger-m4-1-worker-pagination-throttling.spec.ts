import * as dotenv from 'dotenv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { ScheduledAlertsWorker } from '../src/modules/notifications/scheduled-alerts.worker';
import type { PrismaService } from '../src/database/prisma.service';
import type { NotificationsService } from '../src/modules/notifications/notifications.service';
import type { RedisService } from '../src/common/redis/redis.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

interface MockPrismaRecord {
  id: string;
  type: 'ASSIGNMENT' | 'RETURN';
  assetId: string;
  isPending: boolean;
  asset?: {
    id: string;
    assetTag?: string | null;
    subcode?: string | null;
    deviceModel?: {
      name: string;
      modelCode?: string | null;
    } | null;
  } | null;
  recipient?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
  } | null;
}

interface PrismaFindManyArgs {
  where?: { isPending?: boolean };
  take?: number;
  skip?: number;
  cursor?: { id: string };
  orderBy?: Array<{ id: 'asc' | 'desc' }>;
  include?: unknown;
}

describe('Milestone 4 Challenger 1 — ScheduledAlertsWorker Adversarial & Empirical Suite', () => {
  let worker: ScheduledAlertsWorker;
  let mockPrisma: {
    $queryRaw: ReturnType<typeof vi.fn>;
    license: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    asset: { findMany: ReturnType<typeof vi.fn> };
    deviceModel: { findMany: ReturnType<typeof vi.fn> };
    assetHandoverRecord: { findMany: ReturnType<typeof vi.fn> };
  };
  let mockNotificationsService: {
    notifyAdmins: ReturnType<typeof vi.fn>;
    pruneAllOldNotifications: ReturnType<typeof vi.fn>;
  };
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      license: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
      asset: { findMany: vi.fn().mockResolvedValue([]) },
      deviceModel: { findMany: vi.fn().mockResolvedValue([]) },
      assetHandoverRecord: { findMany: vi.fn().mockResolvedValue([]) },
    };

    mockNotificationsService = {
      notifyAdmins: vi.fn().mockResolvedValue([]),
      pruneAllOldNotifications: vi.fn().mockResolvedValue(0),
    };

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(1),
    };

    worker = new ScheduledAlertsWorker(
      mockPrisma as unknown as PrismaService,
      mockNotificationsService as unknown as NotificationsService,
      mockRedis as unknown as RedisService,
    );
  });

  // =========================================================================
  // MISSION 1: BOUNDED CURSOR PAGINATION & QUERY CEILINGS
  // =========================================================================
  describe('Mission 1: Bounded Cursor Pagination & Query Ceilings (AGENTS.md §6.3 & Feature F14)', () => {
    it('1.1 should execute exactly ceil(N / 100) queries for 250 pending records with take: 100', async () => {
      const TOTAL_RECORDS = 250;
      const BATCH_SIZE = 100;
      const expectedQueries = Math.ceil(TOTAL_RECORDS / BATCH_SIZE); // 3

      // Generate 250 records
      const allRecords: MockPrismaRecord[] = Array.from({ length: TOTAL_RECORDS }, (_, i) => ({
        id: `rec-${i.toString().padStart(4, '0')}`,
        type: i % 2 === 0 ? 'ASSIGNMENT' : 'RETURN',
        assetId: `ast-${i.toString().padStart(4, '0')}`,
        isPending: true,
        asset: {
          id: `ast-${i.toString().padStart(4, '0')}`,
          assetTag: `TAG-${i.toString().padStart(4, '0')}`,
          subcode: `SUB-${i.toString().padStart(4, '0')}`,
          deviceModel: { name: 'ThinkPad X1', modelCode: 'TP-X1' },
        },
        recipient: {
          id: `usr-${i}`,
          fullName: `Employee ${i}`,
          email: `emp${i}@company.com`,
        },
      }));

      // Simulate Prisma pagination responses based on cursor & skip
      mockPrisma.assetHandoverRecord.findMany.mockImplementation(
        async (args: PrismaFindManyArgs) => {
          const take = args?.take ?? 100;
          let startIndex = 0;
          if (args?.cursor?.id) {
            const cursorIdx = allRecords.findIndex((r) => r.id === args.cursor?.id);
            startIndex = cursorIdx + (args?.skip ?? 0);
          }
          return allRecords.slice(startIndex, startIndex + take);
        },
      );

      const result = await worker.scanPendingHandoverRecords();

      // Assert exactly ceil(250 / 100) = 3 queries executed
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(expectedQueries);
      expect(result.scanned).toBe(TOTAL_RECORDS);
      expect(result.notified).toBe(TOTAL_RECORDS);
      expect(result.throttled).toBe(0);

      // Verify Query 1
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { isPending: true },
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: [{ id: 'asc' }],
        }),
      );

      // Verify Query 2: cursor pointing to record 99 with skip 1
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { isPending: true },
          take: 100,
          skip: 1,
          cursor: { id: allRecords[99].id },
          orderBy: [{ id: 'asc' }],
        }),
      );

      // Verify Query 3: cursor pointing to record 199 with skip 1
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: { isPending: true },
          take: 100,
          skip: 1,
          cursor: { id: allRecords[199].id },
          orderBy: [{ id: 'asc' }],
        }),
      );
    });

    it('1.2 should strictly verify bounded take ceiling (never exceeding 100) across all calls', async () => {
      const records = Array.from({ length: 150 }, (_, i) => ({
        id: `rec-bound-${i}`,
        type: 'ASSIGNMENT' as const,
        assetId: `ast-bound-${i}`,
        isPending: true,
      }));

      mockPrisma.assetHandoverRecord.findMany
        .mockResolvedValueOnce(records.slice(0, 100))
        .mockResolvedValueOnce(records.slice(100, 150));

      await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(2);
      for (const call of mockPrisma.assetHandoverRecord.findMany.mock.calls) {
        const queryArgs = call[0] as PrismaFindManyArgs;
        expect(queryArgs.take).toBeLessThanOrEqual(100);
        expect(queryArgs.orderBy).toEqual([{ id: 'asc' }]);
      }
    });

    it('1.3 should execute exactly 1 query when database contains 0 pending records', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([]);

      const result = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(mockNotificationsService.notifyAdmins).not.toHaveBeenCalled();
    });

    it('1.4 should execute exactly 1 query when dataset has 75 records (N < BATCH_SIZE)', async () => {
      const records = Array.from({ length: 75 }, (_, i) => ({
        id: `rec-sub100-${i}`,
        type: 'RETURN' as const,
        assetId: `ast-sub100-${i}`,
        isPending: true,
      }));

      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);

      const result = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(1);
      expect(result.scanned).toBe(75);
      expect(result.notified).toBe(75);
      expect(result.throttled).toBe(0);
    });

    it('1.5 should execute exactly 1 query when database contains exactly 1 pending record', async () => {
      const records: MockPrismaRecord[] = [
        {
          id: 'rec-single-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-single-1',
          isPending: true,
        },
      ];

      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);

      const result = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPending: true },
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: [{ id: 'asc' }],
        }),
      );
      expect(result.scanned).toBe(1);
      expect(result.notified).toBe(1);
      expect(result.throttled).toBe(0);
    });

    it('1.6 should execute exactly 1 query when database contains 99 pending records (BATCH_SIZE - 1)', async () => {
      const records: MockPrismaRecord[] = Array.from({ length: 99 }, (_, i) => ({
        id: `rec-99-${i.toString().padStart(3, '0')}`,
        type: 'ASSIGNMENT' as const,
        assetId: `ast-99-${i}`,
        isPending: true,
      }));

      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);

      const result = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(1);
      expect(result.scanned).toBe(99);
      expect(result.notified).toBe(99);
      expect(result.throttled).toBe(0);
    });

    it('1.7 should execute exactly 2 queries when database contains exactly 100 pending records (exact batch boundary)', async () => {
      const records: MockPrismaRecord[] = Array.from({ length: 100 }, (_, i) => ({
        id: `rec-100-${i.toString().padStart(3, '0')}`,
        type: 'ASSIGNMENT' as const,
        assetId: `ast-100-${i}`,
        isPending: true,
      }));

      mockPrisma.assetHandoverRecord.findMany
        .mockResolvedValueOnce(records)
        .mockResolvedValueOnce([]);

      const result = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { isPending: true },
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: [{ id: 'asc' }],
        }),
      );
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { isPending: true },
          take: 100,
          skip: 1,
          cursor: { id: records[99].id },
          orderBy: [{ id: 'asc' }],
        }),
      );
      expect(result.scanned).toBe(100);
      expect(result.notified).toBe(100);
      expect(result.throttled).toBe(0);
    });

    it('1.8 should execute exactly 2 queries when database contains 101 pending records (BATCH_SIZE + 1)', async () => {
      const recordsBatch1: MockPrismaRecord[] = Array.from({ length: 100 }, (_, i) => ({
        id: `rec-101-${i.toString().padStart(3, '0')}`,
        type: 'ASSIGNMENT' as const,
        assetId: `ast-101-${i}`,
        isPending: true,
      }));
      const recordsBatch2: MockPrismaRecord[] = [
        {
          id: 'rec-101-100',
          type: 'RETURN',
          assetId: 'ast-101-100',
          isPending: true,
        },
      ];

      mockPrisma.assetHandoverRecord.findMany
        .mockResolvedValueOnce(recordsBatch1)
        .mockResolvedValueOnce(recordsBatch2);

      const result = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { isPending: true },
          take: 100,
          skip: 1,
          cursor: { id: recordsBatch1[99].id },
          orderBy: [{ id: 'asc' }],
        }),
      );
      expect(result.scanned).toBe(101);
      expect(result.notified).toBe(101);
      expect(result.throttled).toBe(0);
    });

    it('1.9 should execute exactly 3 queries when database contains exactly 200 pending records (2 * BATCH_SIZE)', async () => {
      const recordsBatch1: MockPrismaRecord[] = Array.from({ length: 100 }, (_, i) => ({
        id: `rec-200-${i.toString().padStart(3, '0')}`,
        type: 'ASSIGNMENT' as const,
        assetId: `ast-200-${i}`,
        isPending: true,
      }));
      const recordsBatch2: MockPrismaRecord[] = Array.from({ length: 100 }, (_, i) => ({
        id: `rec-200-${(i + 100).toString().padStart(3, '0')}`,
        type: 'RETURN' as const,
        assetId: `ast-200-${i + 100}`,
        isPending: true,
      }));

      mockPrisma.assetHandoverRecord.findMany
        .mockResolvedValueOnce(recordsBatch1)
        .mockResolvedValueOnce(recordsBatch2)
        .mockResolvedValueOnce([]);

      const result = await worker.scanPendingHandoverRecords();

      expect(mockPrisma.assetHandoverRecord.findMany).toHaveBeenCalledTimes(3);
      expect(result.scanned).toBe(200);
      expect(result.notified).toBe(200);
      expect(result.throttled).toBe(0);
    });
  });

  // =========================================================================
  // MISSION 2: ZERO DUPLICATE OR SKIPPED RECORDS ACROSS BATCHES
  // =========================================================================
  describe('Mission 2: Zero Duplicate or Skipped Records Across Batches', () => {
    it('2.1 should ensure 100% of 250 records are scanned with zero duplicates and zero skips', async () => {
      const TOTAL_COUNT = 250;
      const expectedIds: string[] = [];
      const allRecords: MockPrismaRecord[] = [];

      for (let i = 0; i < TOTAL_COUNT; i++) {
        const id = `rec-id-${i.toString().padStart(4, '0')}`;
        expectedIds.push(id);
        allRecords.push({
          id,
          type: i % 2 === 0 ? 'ASSIGNMENT' : 'RETURN',
          assetId: `ast-${i}`,
          isPending: true,
          asset: { id: `ast-${i}`, assetTag: `TAG-${i}` },
          recipient: { id: `usr-${i}`, fullName: `User ${i}` },
        });
      }

      // Sort by id asc to match database invariant
      allRecords.sort((a, b) => a.id.localeCompare(b.id));

      mockPrisma.assetHandoverRecord.findMany.mockImplementation(
        async (args: PrismaFindManyArgs) => {
          const take = args?.take ?? 100;
          let startIndex = 0;
          if (args?.cursor?.id) {
            const cursorIdx = allRecords.findIndex((r) => r.id === args.cursor?.id);
            startIndex = cursorIdx + (args?.skip ?? 0);
          }
          return allRecords.slice(startIndex, startIndex + take);
        },
      );

      const dispatchedKeys: string[] = [];
      mockRedis.set.mockImplementation(async (key: string) => {
        dispatchedKeys.push(key);
      });

      const res = await worker.scanPendingHandoverRecords();

      // Total scanned matches exact count
      expect(res.scanned).toBe(TOTAL_COUNT);
      expect(res.notified).toBe(TOTAL_COUNT);

      // Extract dispatched record IDs
      const dispatchedIds = dispatchedKeys.map((k) => k.replace('alert:handover:pending:', ''));

      // 1. Zero duplicate check: count distinct IDs
      const uniqueIds = new Set(dispatchedIds);
      expect(uniqueIds.size, 'Every dispatched record ID must be strictly unique').toBe(
        TOTAL_COUNT,
      );

      // 2. Zero skip check: all expected IDs must be present
      const missingIds = expectedIds.filter((id) => !uniqueIds.has(id));
      expect(missingIds, 'No record ID should be skipped across batch boundaries').toEqual([]);

      // 3. Order verification: IDs were dispatched in strictly ascending order
      for (let i = 0; i < dispatchedIds.length - 1; i++) {
        expect(dispatchedIds[i] < dispatchedIds[i + 1]).toBe(true);
      }
    });
  });

  // =========================================================================
  // MISSION 3: REDIS ALERT THROTTLING & 24-HOUR COOLDOWN WINDOW
  // =========================================================================
  describe('Mission 3: Redis Alert Throttling & 24-Hour Cooldown Window', () => {
    it('3.1 should set Redis throttle key with exact 24-hour TTL (86400 seconds) on initial scan', async () => {
      const records: MockPrismaRecord[] = [
        {
          id: 'rec-throttle-001',
          type: 'ASSIGNMENT',
          assetId: 'ast-thr-1',
          isPending: true,
          asset: { id: 'ast-thr-1', assetTag: 'TAG-THR-1' },
          recipient: { id: 'usr-1', fullName: 'Alice' },
        },
      ];

      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);

      await worker.scanPendingHandoverRecords();

      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'alert:handover:pending:rec-throttle-001',
        true,
        86400, // 24 hours in seconds
      );
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(1);
    });

    it('3.2 should completely suppress duplicate notifications on a second scan within 24 hours', async () => {
      const records: MockPrismaRecord[] = Array.from({ length: 10 }, (_, i) => ({
        id: `rec-repeat-${i}`,
        type: 'ASSIGNMENT' as const,
        assetId: `ast-rep-${i}`,
        isPending: true,
      }));

      // In-memory Redis simulation
      const redisStore = new Map<string, { value: unknown; ttl: number }>();
      mockRedis.get.mockImplementation(async (key: string) => {
        return redisStore.get(key)?.value ?? null;
      });
      mockRedis.set.mockImplementation(async (key: string, val: unknown, ttl: number) => {
        redisStore.set(key, { value: val, ttl });
      });

      // --- FIRST SCAN (Clean cache) ---
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);
      const scan1 = await worker.scanPendingHandoverRecords();

      expect(scan1.scanned).toBe(10);
      expect(scan1.notified).toBe(10);
      expect(scan1.throttled).toBe(0);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(10);

      // --- SECOND SCAN (Within 24 hours — all keys cached) ---
      mockNotificationsService.notifyAdmins.mockClear();
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);
      const scan2 = await worker.scanPendingHandoverRecords();

      expect(scan2.scanned).toBe(10);
      expect(scan2.notified).toBe(0);
      expect(scan2.throttled).toBe(10);
      // Zero admin notifications sent!
      expect(mockNotificationsService.notifyAdmins).not.toHaveBeenCalled();
    });

    it('3.3 should re-notify only records whose Redis throttle keys have expired or been cleared', async () => {
      const records: MockPrismaRecord[] = Array.from({ length: 6 }, (_, i) => ({
        id: `rec-partial-${i}`,
        type: 'ASSIGNMENT' as const,
        assetId: `ast-part-${i}`,
        isPending: true,
      }));

      const redisStore = new Map<string, boolean>();
      mockRedis.get.mockImplementation(async (key: string) => redisStore.get(key) ?? null);
      mockRedis.set.mockImplementation(async (key: string) => {
        redisStore.set(key, true);
      });

      // Scan 1: populate all 6 into Redis
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);
      await worker.scanPendingHandoverRecords();
      expect(redisStore.size).toBe(6);

      // Simulate admin uploading document or cache expiration for rec-partial-0 and rec-partial-2
      redisStore.delete('alert:handover:pending:rec-partial-0');
      redisStore.delete('alert:handover:pending:rec-partial-2');

      // Scan 2:
      mockNotificationsService.notifyAdmins.mockClear();
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);
      const scan2 = await worker.scanPendingHandoverRecords();

      expect(scan2.scanned).toBe(6);
      expect(scan2.notified).toBe(2);
      expect(scan2.throttled).toBe(4);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(2);
    });

    it('3.4 should fail-open and dispatch notification if Redis throws a connection failure', async () => {
      const records: MockPrismaRecord[] = [
        {
          id: 'rec-redis-err',
          type: 'RETURN',
          assetId: 'ast-err-1',
          isPending: true,
        },
      ];

      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);
      mockRedis.get.mockRejectedValueOnce(new Error('ECONNREFUSED Redis cluster unreachable'));

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(res.throttled).toBe(0);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(1);
    });

    it('3.5 should verify that NotificationsService.clearHandoverDocumentAlert invalidates throttle key and enables worker re-notification', async () => {
      const records: MockPrismaRecord[] = [
        {
          id: 'rec-clear-test-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-clear-1',
          isPending: true,
          asset: { id: 'ast-clear-1', assetTag: 'TAG-CLEAR-1' },
          recipient: { id: 'usr-clear-1', fullName: 'John Doe' },
        },
      ];

      const redisStore = new Map<string, unknown>();
      mockRedis.get.mockImplementation(async (key: string) => redisStore.get(key) ?? null);
      mockRedis.set.mockImplementation(async (key: string, val: unknown) => {
        redisStore.set(key, val);
      });
      mockRedis.del.mockImplementation(async (key: string) => {
        const deleted = redisStore.delete(key);
        return deleted ? 1 : 0;
      });

      // 1. Initial scan: worker dispatches alert and sets throttle key
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);
      const scan1 = await worker.scanPendingHandoverRecords();
      expect(scan1.notified).toBe(1);
      expect(scan1.throttled).toBe(0);
      expect(redisStore.get('alert:handover:pending:rec-clear-test-1')).toBe(true);

      // 2. Second scan: record is throttled within 24h
      mockNotificationsService.notifyAdmins.mockClear();
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);
      const scan2 = await worker.scanPendingHandoverRecords();
      expect(scan2.notified).toBe(0);
      expect(scan2.throttled).toBe(1);
      expect(mockNotificationsService.notifyAdmins).not.toHaveBeenCalled();

      // 3. User attaches signed document -> clearHandoverDocumentAlert is called
      const mockGateway = { emitCustodyEvent: vi.fn() };
      const { NotificationsService: RealNotificationsService } = await import(
        '../src/modules/notifications/notifications.service'
      );
      const notifService = new RealNotificationsService(
        mockPrisma as unknown as PrismaService,
        mockGateway as unknown as import('../src/modules/notifications/notifications.gateway').NotificationsGateway,
        mockRedis as unknown as RedisService,
      );

      const cleared = await notifService.clearHandoverDocumentAlert(
        'rec-clear-test-1',
        'ast-clear-1',
      );
      expect(cleared).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('alert:handover:pending:rec-clear-test-1');
      expect(redisStore.has('alert:handover:pending:rec-clear-test-1')).toBe(false);
      expect(mockGateway.emitCustodyEvent).toHaveBeenCalledWith(
        'handover_document_resolved',
        expect.objectContaining({
          recordId: 'rec-clear-test-1',
          assetId: 'ast-clear-1',
        }),
      );

      // 4. Third scan: worker immediately re-notifies because throttle key was invalidated
      mockNotificationsService.notifyAdmins.mockClear();
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce(records);
      const scan3 = await worker.scanPendingHandoverRecords();
      expect(scan3.notified).toBe(1);
      expect(scan3.throttled).toBe(0);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // MISSION 4: MISSING RELATION RESILIENCE & DEFENSIVE FORMATTING
  // =========================================================================
  describe('Mission 4: Missing Relation Resilience & Defensive Formatting', () => {
    it('4.1 should handle completely null asset relation without throwing TypeError', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-null-asset',
          type: 'ASSIGNMENT',
          assetId: 'ast-ghost-99',
          isPending: true,
          asset: null,
          recipient: {
            id: 'usr-1',
            displayName: 'Alice Wonderland',
            firstName: 'Alice',
            lastName: 'Wonderland',
            email: 'alice@company.com',
          },
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Pending Allocation Record: ast-ghost-99',
        message:
          'Signed document pending for Hardware Unit (ast-ghost-99) held by Alice Wonderland. Please upload the signed form.',
        type: 'WARNING',
        link: '/assets?drawer=ast-ghost-99',
      });
    });

    it('4.2 should handle completely null recipient relation without throwing TypeError', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-null-recipient',
          type: 'RETURN',
          assetId: 'ast-known-1',
          isPending: true,
          asset: {
            id: 'ast-known-1',
            assetTag: 'TAG-DELL-01',
            subcode: 'SUB-DELL-01',
            deviceModel: { name: 'Dell Latitude 5530', modelCode: 'LAT5530' },
          },
          recipient: null,
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Pending Return Record: TAG-DELL-01',
        message:
          'Signed document pending for Dell Latitude 5530 (TAG-DELL-01) held by Unknown Custodian. Please upload the signed form.',
        type: 'WARNING',
        link: '/assets?drawer=ast-known-1',
      });
    });

    it('4.3 should handle null deviceModel gracefully falling back to "Hardware Unit"', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-null-model',
          type: 'ASSIGNMENT',
          assetId: 'ast-nomodel-1',
          isPending: true,
          asset: {
            id: 'ast-nomodel-1',
            assetTag: 'TAG-GENERIC',
            subcode: null,
            deviceModel: null,
          },
          recipient: {
            id: 'usr-2',
            fullName: null,
            email: 'admin.fallback@company.com',
          },
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Pending Allocation Record: TAG-GENERIC',
        message:
          'Signed document pending for Hardware Unit (TAG-GENERIC) held by admin.fallback@company.com. Please upload the signed form.',
        type: 'WARNING',
        link: '/assets?drawer=ast-nomodel-1',
      });
    });

    it('4.4 should handle fallback to asset subcode when assetTag is empty or null', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-subcode-only',
          type: 'RETURN',
          assetId: 'ast-sub-only',
          isPending: true,
          asset: {
            id: 'ast-sub-only',
            assetTag: null,
            subcode: 'SUB-CODE-99',
            deviceModel: { name: 'Monitor 24"', modelCode: 'MON24' },
          },
          recipient: {
            id: 'usr-3',
            fullName: null,
            email: null,
          },
        },
      ]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(1);
      expect(res.notified).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledWith({
        title: 'Pending Return Record: SUB-CODE-99',
        message:
          'Signed document pending for Monitor 24" (SUB-CODE-99) held by Unknown Custodian. Please upload the signed form.',
        type: 'WARNING',
        link: '/assets?drawer=ast-sub-only',
      });
    });

    it('4.5 should stress-test a mixed adversarial batch of 150 records with corrupt relations', async () => {
      const records: MockPrismaRecord[] = [];
      for (let i = 0; i < 150; i++) {
        const scenario = i % 5;
        if (scenario === 0) {
          // Perfectly valid
          records.push({
            id: `rec-mixed-${i}`,
            type: 'ASSIGNMENT',
            assetId: `ast-${i}`,
            isPending: true,
            asset: { id: `ast-${i}`, assetTag: `TAG-${i}`, deviceModel: { name: `Model ${i}` } },
            recipient: { id: `usr-${i}`, fullName: `Person ${i}` },
          });
        } else if (scenario === 1) {
          // Null asset
          records.push({
            id: `rec-mixed-${i}`,
            type: 'RETURN',
            assetId: `ast-ghost-${i}`,
            isPending: true,
            asset: null,
            recipient: { id: `usr-${i}`, fullName: `Person ${i}` },
          });
        } else if (scenario === 2) {
          // Null recipient
          records.push({
            id: `rec-mixed-${i}`,
            type: 'ASSIGNMENT',
            assetId: `ast-${i}`,
            isPending: true,
            asset: { id: `ast-${i}`, assetTag: `TAG-${i}`, deviceModel: { name: `Model ${i}` } },
            recipient: null,
          });
        } else if (scenario === 3) {
          // Null model & null tags
          records.push({
            id: `rec-mixed-${i}`,
            type: 'RETURN',
            assetId: `ast-${i}`,
            isPending: true,
            asset: { id: `ast-${i}`, assetTag: null, subcode: null, deviceModel: null },
            recipient: { id: `usr-${i}`, fullName: null, email: `email${i}@corp.com` },
          });
        } else {
          // Null everything
          records.push({
            id: `rec-mixed-${i}`,
            type: 'ASSIGNMENT',
            assetId: `ast-${i}`,
            isPending: true,
            asset: null,
            recipient: null,
          });
        }
      }

      mockPrisma.assetHandoverRecord.findMany
        .mockResolvedValueOnce(records.slice(0, 100))
        .mockResolvedValueOnce(records.slice(100, 150));

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(150);
      expect(res.notified).toBe(150);
      expect(res.throttled).toBe(0);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(150);
    });
  });

  // =========================================================================
  // MISSION 5: EDGE CASES & DEGRADED OPERATION
  // =========================================================================
  describe('Mission 5: Edge Cases & Degraded Operation', () => {
    it('5.1 should degrade gracefully when assetHandoverRecord delegate is absent on PrismaService', async () => {
      (mockPrisma as Record<string, unknown>).assetHandoverRecord = undefined;

      const res = await worker.scanPendingHandoverRecords();

      expect(res).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(mockNotificationsService.notifyAdmins).not.toHaveBeenCalled();
    });

    it('5.2 should not crash the batch loop if notifyAdmins throws on an individual record', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-fail-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-1',
          isPending: true,
        },
        {
          id: 'rec-ok-2',
          type: 'RETURN',
          assetId: 'ast-2',
          isPending: true,
        },
      ]);

      mockNotificationsService.notifyAdmins
        .mockRejectedValueOnce(new Error('WebSocket broadcast pipe broken'))
        .mockResolvedValueOnce([]);

      const res = await worker.scanPendingHandoverRecords();

      expect(res.scanned).toBe(2);
      expect(res.notified).toBe(1); // 1 succeeded
      // Note: ScheduledAlertsWorker treats any un-notified record as throttled (sent === false -> throttled++)
      expect(res.throttled).toBe(1);
      expect(mockNotificationsService.notifyAdmins).toHaveBeenCalledTimes(2);

      // Verify Redis throttling key was set only for the successful delivery, not for the failed one
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith('alert:handover:pending:rec-ok-2', true, 86400);
      expect(mockRedis.set).not.toHaveBeenCalledWith(
        'alert:handover:pending:rec-fail-1',
        true,
        86400,
      );
    });

    it('5.3 should integrate pending handovers scan into runDailyAlertScans aggregated summary', async () => {
      mockPrisma.assetHandoverRecord.findMany.mockResolvedValueOnce([
        {
          id: 'rec-daily-1',
          type: 'ASSIGNMENT',
          assetId: 'ast-daily-1',
          isPending: true,
        },
      ]);

      const summary = await worker.runDailyAlertScans();

      expect(summary.pendingHandovers).toEqual({
        scanned: 1,
        notified: 1,
        throttled: 0,
      });
    });
  });

  // =========================================================================
  // MISSION 6: LIVE POSTGRESQL & REDIS EMPIRICAL INTEGRATION HARNESS
  // =========================================================================
  describe('Mission 6: Live PostgreSQL & Redis Empirical Integration Harness', () => {
    let livePrisma: PrismaClient | null = null;
    let isLiveAvailable = false;
    let liveRedis: RedisService | null = null;
    let createdRecordId: string | null = null;
    let createdAssetId: string | null = null;

    beforeAll(async () => {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) return;

      try {
        livePrisma = new PrismaClient({
          adapter: new PrismaPg({ connectionString }),
        });
        await livePrisma.$queryRaw`SELECT 1`;

        // Check if Redis is also reachable
        liveRedis = new (await import('../src/common/redis/redis.service')).RedisService();
        await liveRedis.onModuleInit();
        const redisHealthy = await liveRedis.isHealthy();

        if (redisHealthy) {
          isLiveAvailable = true;
        }
      } catch {
        isLiveAvailable = false;
      }
    });

    afterAll(async () => {
      if (livePrisma && createdRecordId) {
        try {
          await livePrisma.assetHandoverRecord.deleteMany({
            where: { id: createdRecordId },
          });
        } catch {
          // ignore
        }
      }
      if (livePrisma && createdAssetId) {
        try {
          await livePrisma.asset.deleteMany({
            where: { id: createdAssetId },
          });
        } catch {
          // ignore
        }
      }
      if (liveRedis && createdRecordId) {
        try {
          await liveRedis.del(`alert:handover:pending:${createdRecordId}`);
          await liveRedis.onModuleDestroy();
        } catch {
          // ignore
        }
      }
      if (livePrisma) {
        try {
          await livePrisma.$disconnect();
        } catch {
          // ignore
        }
      }
    });

    it('6.1 [DEFECT REMEDIATED] cleanly executes scanPendingHandoverRecords on live PostgreSQL with valid DirectoryUser fields', async (ctx) => {
      if (!isLiveAvailable || !livePrisma || !liveRedis) {
        ctx.skip();
        return;
      }

      // Find an existing device model
      const deviceModel = await livePrisma.deviceModel.findFirst();
      if (!deviceModel) {
        ctx.skip();
        return;
      }

      // Create a test physical unit
      const defaultDept = await livePrisma.department.findFirst({ select: { id: true } });
      const testAsset = await livePrisma.asset.create({
        data: {
          assetTag: `TAG-CHALLENGER-${Date.now()}`,
          serialNumber: `SN-CHALLENGER-${Date.now()}`,
          status: 'AVAILABLE',
          deviceModelId: deviceModel.id,
          departmentId: defaultDept?.id,
          hasPendingRecord: true,
        },
      });
      createdAssetId = testAsset.id;

      // Create a test pending handover record
      const testRecord = await livePrisma.assetHandoverRecord.create({
        data: {
          assetId: testAsset.id,
          type: 'ASSIGNMENT',
          isPending: true,
          notes: 'Adversarial Challenger Test Record',
        },
      });
      createdRecordId = testRecord.id;

      const liveWorker = new ScheduledAlertsWorker(
        livePrisma as unknown as PrismaService,
        mockNotificationsService as unknown as NotificationsService,
        liveRedis,
      );

      // Clean redis key first
      const cacheKey = `alert:handover:pending:${testRecord.id}`;
      await liveRedis.del(cacheKey);

      // EMPIRICAL VERIFICATION OF REMEDIATION:
      // When ScheduledAlertsWorker.scanPendingHandoverRecords() executes against real Prisma,
      // it succeeds cleanly without PrismaClientValidationError.
      const scanResult = await liveWorker.scanPendingHandoverRecords();
      expect(scanResult.scanned).toBeGreaterThanOrEqual(1);
      expect(scanResult.notified).toBeGreaterThanOrEqual(1);
    });
  });
});
