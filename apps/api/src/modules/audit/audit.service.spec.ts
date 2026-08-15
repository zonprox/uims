import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: {
    auditLog: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
    };
    service = new AuditService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('findAll', () => {
    it('should query audit logs with pagination and search filter', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          userId: 'u-1',
          userName: 'Marcus Vance',
          userEmail: 'marcus@company.com',
          action: 'CREATE',
          severity: 'Info',
          entity: 'Asset',
          entityType: 'Asset',
          ipAddress: '10.0.0.1',
          status: 'Success',
          details: 'Created asset MBP-001',
          timestamp: new Date('2026-08-15T00:00:00Z'),
        },
      ]);

      const result = await service.findAll({ search: 'Marcus', page: 1, limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].user).toBe('Marcus Vance');
      expect(result[0].action).toBe('CREATE');
    });
  });

  describe('getStats', () => {
    it('should aggregate audit stats correctly', async () => {
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(500) // totalCount
        .mockResolvedValueOnce(12); // anomalyCount

      const stats = await service.getStats();

      expect(stats.totalEventRecords).toBe('500');
      expect(stats.securityAnomalies).toBe('12 Blocked');
      expect(stats.soc2Score).toBe('98.4%');
    });
  });
});
