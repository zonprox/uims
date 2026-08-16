import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockPrisma: {
    setting: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    asset: { count: ReturnType<typeof vi.fn> };
    user: { count: ReturnType<typeof vi.fn> };
    license: { count: ReturnType<typeof vi.fn> };
    inventoryItem: { count: ReturnType<typeof vi.fn> };
    subnet: { count: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      setting: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn().mockResolvedValue(10),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        count: vi.fn().mockResolvedValue(50),
      },
      asset: { count: vi.fn().mockResolvedValue(25) },
      user: { count: vi.fn().mockResolvedValue(12) },
      license: { count: vi.fn().mockResolvedValue(8) },
      inventoryItem: { count: vi.fn().mockResolvedValue(30) },
      subnet: { count: vi.fn().mockResolvedValue(4) },
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    service = new SettingsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('getServerTimeInfo', () => {
    it('should return server time, timezone and offset', () => {
      const timeInfo = service.getServerTimeInfo();

      expect(timeInfo.serverTimezone).toBe('UTC');
      expect(timeInfo.serverOffset).toBe('+00:00');
      expect(timeInfo.serverTimeIso).toBeDefined();
      expect(timeInfo.timestampMs).toBeGreaterThan(0);
    });
  });

  describe('getHealthTelemetry', () => {
    it('should return live process memory and operational telemetry', async () => {
      const health = await service.getHealthTelemetry();

      expect(health.postgres.status).toBe('Connected');
      expect(health.postgres.latency).toMatch(/ms$/);
      expect(health.redis.status).toBe('Operational');
      expect(health.assetStorage.status).toBe('Online');
      expect(health.system.nodeVersion).toBeDefined();
      expect(health.system.memoryHeapUsed).toBeDefined();
    });
  });

  describe('getAllSettings', () => {
    it('should return settings as a key-value dictionary', async () => {
      mockPrisma.setting.findMany.mockResolvedValue([
        { key: 'general', value: { orgName: 'Acme Corp' } },
        { key: 'security', value: { sessionTimeout: 30 } },
      ]);

      const settings = await service.getAllSettings();

      expect(settings.general).toEqual({ orgName: 'Acme Corp' });
      expect(settings.security).toEqual({ sessionTimeout: 30 });
    });
  });

  describe('runBackup', () => {
    it('should execute verified backup calculation across all core tables and log audit record', async () => {
      const backupResult = await service.runBackup();

      expect(backupResult.success).toBe(true);
      expect(backupResult.recordsBackedUp).toBe(139);
      expect(backupResult.tableSummary.assets).toBe(25);
      expect(backupResult.tableSummary.users).toBe(12);
      expect(backupResult.tableSummary.licenses).toBe(8);
      expect(backupResult.snapshot).toContain('uims-db-snapshot-');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });
});
