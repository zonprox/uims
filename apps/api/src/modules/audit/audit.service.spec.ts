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
          statusCode: 201,
          durationMs: 45.2,
          details: 'Created asset MBP-001',
          timestamp: new Date('2026-08-15T00:00:00Z'),
        },
      ]);

      const result = await service.findAll({ search: 'Marcus', page: 1, limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].user).toBe('Marcus Vance');
      expect(result[0].action).toBe('CREATE');
      expect(result[0].statusCode).toBe(201);
      expect(result[0].durationMs).toBe(45.2);
    });

    it('should apply date range, status, and entity filters to where clause', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.findAll({
        action: 'UPDATE',
        severity: 'Warning',
        status: 'Failed',
        entity: 'Licenses',
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-08-31T23:59:59Z',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'UPDATE',
            severity: 'Warning',
            status: 'Failed',
            entity: { contains: 'Licenses', mode: 'insensitive' },
            timestamp: {
              gte: new Date('2026-08-01T00:00:00Z'),
              lte: new Date('2026-08-31T23:59:59Z'),
            },
          }),
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
          take: 50,
          skip: 0,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return formatted single log record', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue({
        id: 'log-100',
        userId: 'u-1',
        userName: 'Admin',
        userEmail: 'admin@company.com',
        action: 'DELETE',
        severity: 'Warning',
        entity: 'Asset',
        entityType: 'Asset',
        ipAddress: '10.0.0.1',
        status: 'Success',
        statusCode: 200,
        durationMs: 12.3,
        details: 'Deleted decommissioned server',
        diffPayload: { previousOwner: 'dept-finance' },
        timestamp: new Date('2026-08-20T12:00:00Z'),
      });

      const result = await service.findOne('log-100');
      expect(result.id).toBe('log-100');
      expect(result.action).toBe('DELETE');
      expect(result.diffPayload).toEqual({ previousOwner: 'dept-finance' });
    });

    it('should throw NotFoundException when log does not exist', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('getStats', () => {
    it('should calculate genuine operational telemetry metrics without mock compliance overhead', async () => {
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(500) // totalEvents
        .mockResolvedValueOnce(25) // failedEvents
        .mockResolvedValueOnce(5); // criticalEvents

      const stats = await service.getStats();

      expect(stats.totalEvents).toBe(500);
      expect(stats.failedEvents).toBe(25);
      expect(stats.criticalEvents).toBe(5);
      expect(stats.errorRate).toBe('5.0%');
      expect(stats.totalEventRecords).toBe('500');
      expect(stats.securityAnomalies).toBe('5 Alerts');
      expect((stats as Record<string, unknown>).soc2Score).toBeUndefined();
      expect((stats as Record<string, unknown>).isoReadiness).toBeUndefined();
    });
  });

  describe('exportCsv', () => {
    it('should export valid RFC 4180 CSV escaping quotes and commas', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-special',
          userId: 'u-9',
          userName: 'Vance, "Special" Ops',
          userEmail: 'vance@example.com',
          action: 'CONFIG_CHANGE',
          severity: 'Info',
          entity: 'Firewall, Core-1',
          ipAddress: '192.168.1.1',
          status: 'Success',
          statusCode: 200,
          durationMs: 34.56,
          details: 'Updated rules: added "allow 443" & "drop all"\nNew line note',
          timestamp: new Date('2026-09-01T10:00:00Z'),
        },
      ]);

      const csv = await service.exportCsv();
      expect(csv).toContain(
        'ID,Timestamp (UTC),User,Email,Action,Severity,Entity,IP Address,Status,Details',
      );
      // Verify doubled double-quotes for internal quotes
      expect(csv).toContain('"Vance, ""Special"" Ops"');
      expect(csv).toContain('"Firewall, Core-1"');
      expect(csv).toContain('"Updated rules: added ""allow 443"" & ""drop all""\nNew line note"');
    });
  });
});
