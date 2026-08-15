import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockPrisma: {
    setting: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      setting: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };
    service = new SettingsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('getHealthTelemetry', () => {
    it('should return live process memory and operational telemetry', () => {
      const health = service.getHealthTelemetry();

      expect(health.postgres.status).toBe('Connected');
      expect(health.redis.status).toBe('Healthy');
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
});
