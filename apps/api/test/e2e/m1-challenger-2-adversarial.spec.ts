import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedisService } from '../../src/common/redis/redis.service';
import type { PrismaService } from '../../src/database/prisma.service';
import { HealthController } from '../../src/modules/health/health.controller';
import type { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { ScheduledAlertsWorker } from '../../src/modules/notifications/scheduled-alerts.worker';
import { SearchService } from '../../src/modules/search/search.service';

describe('Milestone 1 Challenger 2 — Empirical Adversarial Stress Suite', () => {
  // =========================================================================
  // MISSION SECTION 1: TD-002 Worker Cursor Pagination in ScheduledAlertsWorker
  // =========================================================================
  describe('Mission 1: TD-002 ScheduledAlertsWorker Cursor Pagination Stress Tests', () => {
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
        $queryRaw: vi.fn().mockResolvedValue([]),
        license: {
          findMany: vi.fn(),
          update: vi.fn().mockResolvedValue({}),
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
        mockPrisma as unknown as PrismaService,
        mockNotificationsService as unknown as NotificationsService,
        mockRedis as unknown as RedisService,
      );
    });

    // -----------------------------------------------------------------------
    // 1.1 Empty Sets Termination
    // -----------------------------------------------------------------------
    it('should terminate cleanly on empty sets without unnecessary queries or loops', async () => {
      // 1. Licenses empty
      mockPrisma.license.findMany.mockResolvedValueOnce([]);
      const licRes = await worker.scanExpiringLicenses();
      expect(licRes).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(mockPrisma.license.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.license.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: { id: 'asc' },
        }),
      );

      // 2. Warranties empty
      mockPrisma.asset.findMany.mockResolvedValueOnce([]);
      const warRes = await worker.scanExpiringWarranties();
      expect(warRes).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: { id: 'asc' },
        }),
      );

      // 3. Maintenance empty
      mockPrisma.asset.findMany.mockResolvedValueOnce([]);
      const maintRes = await worker.scanOverdueMaintenance();
      expect(maintRes).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(2); // 1 for warranty, 1 for maint
      expect(mockPrisma.asset.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: { id: 'asc' },
        }),
      );

      // 4. Low stock empty ($queryRaw)
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);
      const lowStockRes = await worker.scanLowStock();
      expect(lowStockRes).toEqual({ scanned: 0, notified: 0, throttled: 0 });
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // 1.2 Boundary Exact Match (100 items)
    // -----------------------------------------------------------------------
    it('should advance cursor across page boundary and terminate cleanly when exactly 100 records exist', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const batch100 = Array.from({ length: 100 }, (_, i) => ({
        id: `lic-${String(i).padStart(4, '0')}`,
        name: `Tool ${i}`,
        expiryDate: pastDate,
        status: 'ACTIVE',
      }));

      // Iteration 1 returns 100 records, Iteration 2 returns empty array
      mockPrisma.license.findMany.mockResolvedValueOnce(batch100).mockResolvedValueOnce([]);

      const result = await worker.scanExpiringLicenses();

      expect(result.scanned).toBe(100);
      expect(result.notified).toBe(100);
      expect(mockPrisma.license.findMany).toHaveBeenCalledTimes(2);

      // Verify Page 1 arguments
      expect(mockPrisma.license.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: { id: 'asc' },
        }),
      );

      // Verify Page 2 arguments (cursor must be last item of page 1, skip 1)
      expect(mockPrisma.license.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          take: 100,
          skip: 1,
          cursor: { id: 'lic-0099' },
          orderBy: { id: 'asc' },
        }),
      );
    });

    // -----------------------------------------------------------------------
    // 1.3 Boundary + 1 (101 items)
    // -----------------------------------------------------------------------
    it('should terminate cleanly on sub-batch size when 101 records exist (Page 1: 100, Page 2: 1)', async () => {
      const now = Date.now();
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `ast-${String(i).padStart(4, '0')}`,
        name: `Asset ${i}`,
        assetTag: `TAG-${i}`,
        warrantyExpiry: new Date(now + 2 * 24 * 60 * 60 * 1000),
      }));
      const batch2 = [
        {
          id: 'ast-0100',
          name: 'Asset 100',
          assetTag: 'TAG-100',
          warrantyExpiry: new Date(now + 2 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.asset.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

      const result = await worker.scanExpiringWarranties();

      expect(result.scanned).toBe(101);
      expect(result.notified).toBe(101);
      // Because batch2.length (1) < 100, loop breaks immediately without needing a 3rd query
      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(2);

      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          take: 100,
          skip: 1,
          cursor: { id: 'ast-0099' },
          orderBy: { id: 'asc' },
        }),
      );
    });

    // -----------------------------------------------------------------------
    // 1.4 Multi-Page Stress Test (250 items across 3 pages: 100, 100, 50)
    // -----------------------------------------------------------------------
    it('should stream through multiple pages with deterministic ordering and zero dropped records', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `maint-${String(i).padStart(4, '0')}`,
        name: `Asset ${i}`,
        assetTag: `TAG-${i}`,
        status: 'MAINTENANCE',
        updatedAt: twentyDaysAgo,
      }));
      const batch2 = Array.from({ length: 100 }, (_, i) => ({
        id: `maint-${String(i + 100).padStart(4, '0')}`,
        name: `Asset ${i + 100}`,
        assetTag: `TAG-${i + 100}`,
        status: 'MAINTENANCE',
        updatedAt: twentyDaysAgo,
      }));
      const batch3 = Array.from({ length: 50 }, (_, i) => ({
        id: `maint-${String(i + 200).padStart(4, '0')}`,
        name: `Asset ${i + 200}`,
        assetTag: `TAG-${i + 200}`,
        status: 'MAINTENANCE',
        updatedAt: twentyDaysAgo,
      }));

      mockPrisma.asset.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce(batch3);

      const result = await worker.scanOverdueMaintenance();

      expect(result.scanned).toBe(250);
      expect(result.notified).toBe(250);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(3);

      // Verify cursor transitions
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          cursor: undefined,
          skip: 0,
        }),
      );
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          cursor: { id: 'maint-0099' },
          skip: 1,
        }),
      );
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          cursor: { id: 'maint-0199' },
          skip: 1,
        }),
      );
    });

    // -----------------------------------------------------------------------
    // 1.5 Low Stock $queryRaw SQL Cursor Pagination (250 items)
    // -----------------------------------------------------------------------
    it('should paginate low stock inventory items via $queryRaw SQL template parameters', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `inv-${String(i).padStart(4, '0')}`,
        name: `Cable ${i}`,
        sku: `SKU-${i}`,
        quantity: 0,
        minThreshold: 10,
      }));
      const batch2 = Array.from({ length: 100 }, (_, i) => ({
        id: `inv-${String(i + 100).padStart(4, '0')}`,
        name: `Cable ${i + 100}`,
        sku: `SKU-${i + 100}`,
        quantity: 1,
        minThreshold: 10,
      }));
      const batch3 = Array.from({ length: 50 }, (_, i) => ({
        id: `inv-${String(i + 200).padStart(4, '0')}`,
        name: `Cable ${i + 200}`,
        sku: `SKU-${i + 200}`,
        quantity: 2,
        minThreshold: 10,
      }));

      mockPrisma.$queryRaw
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce(batch3);

      const result = await worker.scanLowStock();

      expect(result.scanned).toBe(250);
      expect(result.notified).toBe(250);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(3);

      // Verify that query 1 had no cursor and query 2 & 3 had the cursor appended
      const calls = mockPrisma.$queryRaw.mock.calls;
      // Inspect call parameters (Prisma.sql template strings)
      const call1Sql = JSON.stringify(calls[0]);
      const call2Sql = JSON.stringify(calls[1]);
      const call3Sql = JSON.stringify(calls[2]);

      expect(call1Sql).toContain('ORDER BY id ASC');
      expect(call2Sql).toContain('inv-0099');
      expect(call3Sql).toContain('inv-0199');
    });

    // -----------------------------------------------------------------------
    // 1.6 Non-Sequential Lexicographical Alphanumeric IDs (CUID / UUID simulation)
    // -----------------------------------------------------------------------
    it('should correctly paginate non-sequential string IDs without duplicate or missing alerts', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      // Simulate unordered CUIDs sorted lexicographically
      const cuids = [
        'cm1a0001',
        'cm1a0002',
        'cm1b0001',
        'cm1b0002',
        'cm1c0001',
        'cm1c0002',
        'cm1d0001',
        'cm1d0002',
      ].sort();

      const batch1 = cuids.slice(0, 4).map((id) => ({
        id,
        name: `App ${id}`,
        expiryDate: pastDate,
        status: 'ACTIVE',
      }));
      const batch2 = cuids.slice(4).map((id) => ({
        id,
        name: `App ${id}`,
        expiryDate: pastDate,
        status: 'ACTIVE',
      }));

      // Temporarily set BATCH_SIZE simulation by mocking
      mockPrisma.license.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

      // Since worker uses BATCH_SIZE = 100, batch1 length 4 is < 100 so it breaks after 1 call.
      // Let's verify that when batch1 is 100 items with CUIDs, it advances to batch2 with CUID cursor.
      const batch100Cuids = Array.from({ length: 100 }, (_, i) => ({
        id: `cuid_${String(i).padStart(4, '0')}`,
        name: `App ${i}`,
        expiryDate: pastDate,
        status: 'ACTIVE',
      }));
      const batchNextCuids = [
        {
          id: 'cuid_0100',
          name: 'App 100',
          expiryDate: pastDate,
          status: 'ACTIVE',
        },
      ];

      mockPrisma.license.findMany.mockReset();
      mockPrisma.license.findMany
        .mockResolvedValueOnce(batch100Cuids)
        .mockResolvedValueOnce(batchNextCuids);

      const result = await worker.scanExpiringLicenses();
      expect(result.scanned).toBe(101);
      expect(mockPrisma.license.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          cursor: { id: 'cuid_0099' },
          skip: 1,
          orderBy: { id: 'asc' },
        }),
      );
    });
  });

  // =========================================================================
  // MISSION SECTION 2: TD-004 & PERF-001 Search Sync Cursor Pagination
  // =========================================================================
  describe('Mission 2: TD-004 & PERF-001 SearchService Cursor Pagination Stress Tests', () => {
    let searchService: SearchService;
    let mockPrisma: {
      asset: { findMany: ReturnType<typeof vi.fn> };
      license: { findMany: ReturnType<typeof vi.fn> };
      directoryUser: { findMany: ReturnType<typeof vi.fn> };
    };
    let mockConfig: {
      get: ReturnType<typeof vi.fn>;
      getOrThrow: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockPrisma = {
        asset: { findMany: vi.fn().mockResolvedValue([]) },
        license: { findMany: vi.fn().mockResolvedValue([]) },
        directoryUser: { findMany: vi.fn().mockResolvedValue([]) },
      };

      mockConfig = {
        get: vi.fn((key: string) => {
          if (key === 'MEILISEARCH_HOST') return 'http://localhost:7700';
          if (key === 'MEILI_API_KEY') return 'test_valid_key';
          return undefined;
        }),
        getOrThrow: vi.fn((key: string) => {
          if (key === 'MEILI_API_KEY') return 'test_valid_key';
          throw new Error(`Missing ${key}`);
        }),
      };

      searchService = new SearchService(
        mockPrisma as unknown as PrismaService,
        mockConfig as unknown as ConfigService,
      );
    });

    // -----------------------------------------------------------------------
    // 2.1 Empty Database Search Sync
    // -----------------------------------------------------------------------
    it('should cleanly terminate syncAllToMeilisearch when all tables are empty', async () => {
      vi.spyOn(searchService, 'checkHealthAndInit').mockResolvedValue(true);
      (searchService as unknown as { isMeiliAvailable: boolean }).isMeiliAvailable = true;

      const result = await searchService.syncAllToMeilisearch();

      expect(result.success).toBe(true);
      expect(result.counts).toEqual({
        assets: 0,
        licenses: 0,
        users: 0,
      });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.license.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // 2.2 Boundary Exact Match (100 records per model)
    // -----------------------------------------------------------------------
    it('should paginate in batches of 100 and terminate after second empty query', async () => {
      vi.spyOn(searchService, 'checkHealthAndInit').mockResolvedValue(true);
      (searchService as unknown as { isMeiliAvailable: boolean }).isMeiliAvailable = true;

      const assets100 = Array.from({ length: 100 }, (_, i) => ({
        id: `ast-${String(i).padStart(4, '0')}`,
        name: `Asset ${i}`,
        assetTag: `TAG-${i}`,
        serialNumber: `SN-${i}`,
        model: 'Model',
        manufacturer: 'Dell',
        category: { name: 'Laptops' },
        status: 'IN_USE',
      }));

      mockPrisma.asset.findMany.mockResolvedValueOnce(assets100).mockResolvedValueOnce([]);

      const originalFetch = global.fetch;
      const sentBatches: Array<{ indexUid: string; count: number }> = [];
      global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('/indexes/') && urlStr.includes('/documents')) {
          const match = urlStr.match(/\/indexes\/([^/]+)\/documents/);
          const indexUid = match ? match[1] : 'unknown';
          const docs = JSON.parse(init?.body as string);
          sentBatches.push({ indexUid, count: docs.length });
          return { ok: true, json: async () => ({}) } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      try {
        const result = await searchService.syncAllToMeilisearch();

        expect(result.success).toBe(true);
        expect(result.counts?.assets).toBe(100);
        expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(2);

        // Page 1
        expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            take: 100,
            skip: 0,
            cursor: undefined,
            orderBy: { id: 'asc' },
          }),
        );

        // Page 2
        expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            take: 100,
            skip: 1,
            cursor: { id: 'ast-0099' },
            orderBy: { id: 'asc' },
          }),
        );

        // Verify sent document chunk
        const assetBatches = sentBatches.filter((b) => b.indexUid === 'assets');
        expect(assetBatches).toHaveLength(1);
        expect(assetBatches[0].count).toBe(100);
      } finally {
        global.fetch = originalFetch;
      }
    });

    // -----------------------------------------------------------------------
    // 2.3 Multi-Batch Streaming (205 Assets, 120 Licenses, 80 Users)
    // -----------------------------------------------------------------------
    it('should stream 205 assets across 3 batches (100, 100, 5) without loading all into memory', async () => {
      vi.spyOn(searchService, 'checkHealthAndInit').mockResolvedValue(true);
      (searchService as unknown as { isMeiliAvailable: boolean }).isMeiliAvailable = true;

      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `a-${String(i).padStart(4, '0')}`,
        name: `Asset ${i}`,
        assetTag: `TAG-${i}`,
        status: 'IN_USE',
      }));
      const batch2 = Array.from({ length: 100 }, (_, i) => ({
        id: `a-${String(i + 100).padStart(4, '0')}`,
        name: `Asset ${i + 100}`,
        assetTag: `TAG-${i + 100}`,
        status: 'IN_USE',
      }));
      const batch3 = Array.from({ length: 5 }, (_, i) => ({
        id: `a-${String(i + 200).padStart(4, '0')}`,
        name: `Asset ${i + 200}`,
        assetTag: `TAG-${i + 200}`,
        status: 'IN_USE',
      }));

      mockPrisma.asset.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce(batch3);

      const originalFetch = global.fetch;
      const sentChunks: number[] = [];
      global.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('/indexes/assets/documents')) {
          const docs = JSON.parse(init?.body as string);
          sentChunks.push(docs.length);
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      try {
        const result = await searchService.syncAllToMeilisearch();

        expect(result.success).toBe(true);
        expect(result.counts?.assets).toBe(205);
        expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(3);

        // Verify sent batch sizes: 100, 100, 5
        expect(sentChunks).toEqual([100, 100, 5]);

        // Verify cursor transitions
        expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({ cursor: { id: 'a-0099' }, skip: 1 }),
        );
        expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({ cursor: { id: 'a-0199' }, skip: 1 }),
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  // =========================================================================
  // MISSION SECTION 3: SEC-001 & SEC-002 Security Fallbacks
  // =========================================================================
  describe('Mission 3: SEC-001 & SEC-002 Security Fallbacks', () => {
    // -----------------------------------------------------------------------
    // 3.1 SEC-001: Redis Disconnected & HealthController Behavior
    // -----------------------------------------------------------------------
    describe('SEC-001: Redis Service Health Telemetry & Failure Resilience', () => {
      it('should report isHealthy=false and ping() must reject when Redis is disconnected', async () => {
        const disconnectedRedis = new RedisService();
        // Disconnected by default (no onModuleInit)

        expect(await disconnectedRedis.isHealthy()).toBe(false);
        await expect(disconnectedRedis.ping()).rejects.toThrow(
          'Redis client is disconnected (operating in in-memory fallback)',
        );

        // However, local operations must still succeed in-memory (resilience)
        await disconnectedRedis.set('cache-key', { healthy: true });
        expect(await disconnectedRedis.get('cache-key')).toEqual({ healthy: true });
      });

      it('HealthController should return HTTP 200 with status="degraded" when Redis fails but DB is healthy', async () => {
        const mockPrismaHealthy = {
          $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
        } as unknown as PrismaService;

        const mockRedisDown = {
          ping: vi.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:6381')),
        } as unknown as RedisService;

        const controller = new HealthController(mockPrismaHealthy, mockRedisDown);
        const result = await controller.check();

        // Must NOT return 'ok'
        expect(result.status).toBe('degraded');
        expect(result.database.status).toBe('connected');
        expect(result.redis.status).toBe('disconnected');
        expect(result.redis.latencyMs).toBe(0);
      });

      it('HealthController should throw ServiceUnavailableException (503) when DB is down, regardless of Redis state', async () => {
        const mockPrismaDown = {
          $queryRaw: vi.fn().mockRejectedValue(new Error('Connection lost to Postgres')),
        } as unknown as PrismaService;

        const mockRedisUp = {
          ping: vi.fn().mockResolvedValue('PONG'),
        } as unknown as RedisService;

        const controller = new HealthController(mockPrismaDown, mockRedisUp);

        await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
      });

      it('ScheduledAlertsWorker should not crash if Redis throws an exception during alert throttling check', async () => {
        const mockPrisma = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          license: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'lic-err',
                name: 'Error Tool',
                expiryDate: new Date(Date.now() - 1000),
                status: 'ACTIVE',
              },
            ]),
            update: vi.fn().mockResolvedValue({}),
          },
          asset: { findMany: vi.fn().mockResolvedValue([]) },
          inventoryItem: { findMany: vi.fn().mockResolvedValue([]) },
        };
        const mockNotifications = {
          notifyAdmins: vi.fn().mockResolvedValue([]),
        };
        const mockFailingRedis = {
          get: vi.fn().mockRejectedValue(new Error('Redis cluster unreachable')),
          set: vi.fn().mockRejectedValue(new Error('Redis cluster unreachable')),
        };

        const resilientWorker = new ScheduledAlertsWorker(
          mockPrisma as unknown as PrismaService,
          mockNotifications as unknown as NotificationsService,
          mockFailingRedis as unknown as RedisService,
        );

        // Must not throw uncaught error; must proceed to notify admins
        const result = await resilientWorker.scanExpiringLicenses();
        expect(result.scanned).toBe(1);
        expect(result.notified).toBe(1);
        expect(mockNotifications.notifyAdmins).toHaveBeenCalled();
      });
    });

    // -----------------------------------------------------------------------
    // 3.2 SEC-002: MeiliSearch Fail-Fast on Undefined API Key
    // -----------------------------------------------------------------------
    describe('SEC-002: MeiliSearch API Key Fail-Fast Enforcement', () => {
      it('should throw immediately if MEILI_API_KEY is undefined and getOrThrow throws', () => {
        const mockPrisma = {
          asset: { findMany: vi.fn() },
          license: { findMany: vi.fn() },
          directoryUser: { findMany: vi.fn() },
        };
        const failingConfig = {
          get: vi.fn(() => undefined),
          getOrThrow: vi.fn((key: string) => {
            throw new Error(`Configuration key "${key}" does not exist`);
          }),
        };

        expect(() => {
          new SearchService(
            mockPrisma as unknown as PrismaService,
            failingConfig as unknown as ConfigService,
          );
        }).toThrow('Configuration key "MEILI_API_KEY" does not exist');
      });

      it('should throw explicit error if ConfigService is absent and no environment API key is set', () => {
        const mockPrisma = {
          asset: { findMany: vi.fn() },
          license: { findMany: vi.fn() },
          directoryUser: { findMany: vi.fn() },
        };

        // Ensure env is clear
        const savedKey = process.env.MEILI_API_KEY;
        const savedMeiliKey = process.env.MEILISEARCH_API_KEY;
        delete process.env.MEILI_API_KEY;
        delete process.env.MEILISEARCH_API_KEY;

        try {
          expect(() => {
            new SearchService(mockPrisma as unknown as PrismaService, undefined);
          }).toThrow('MEILI_API_KEY environment variable is required and must not be empty');
        } finally {
          if (savedKey) process.env.MEILI_API_KEY = savedKey;
          if (savedMeiliKey) process.env.MEILISEARCH_API_KEY = savedMeiliKey;
        }
      });

      it('should never accept or fall back to prohibited hardcoded key "uims_meili_master_key_2026"', () => {
        const mockPrisma = {
          asset: { findMany: vi.fn() },
          license: { findMany: vi.fn() },
          directoryUser: { findMany: vi.fn() },
        };

        const configWithEmptyKey = {
          get: vi.fn(() => ''),
          getOrThrow: vi.fn(() => {
            throw new Error('Key is unset');
          }),
        };

        expect(() => {
          new SearchService(
            mockPrisma as unknown as PrismaService,
            configWithEmptyKey as unknown as ConfigService,
          );
        }).toThrow();
      });

      it('should successfully instantiate when a valid MEILI_API_KEY is supplied', () => {
        const mockPrisma = {
          asset: { findMany: vi.fn() },
          license: { findMany: vi.fn() },
          directoryUser: { findMany: vi.fn() },
        };
        const validConfig = {
          get: vi.fn((key: string) =>
            key === 'MEILI_API_KEY' ? 'production_secret_key' : undefined,
          ),
          getOrThrow: vi.fn(() => 'production_secret_key'),
        };

        const service = new SearchService(
          mockPrisma as unknown as PrismaService,
          validConfig as unknown as ConfigService,
        );

        expect(service).toBeDefined();
        expect((service as unknown as { meiliApiKey: string }).meiliApiKey).toBe(
          'production_secret_key',
        );
      });
    });
  });
});
