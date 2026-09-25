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

    it('should safely ignore invalid dates without passing Invalid Date to Prisma', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.findAll({
        startDate: 'not-a-valid-date',
        endDate: 'invalid-end-date',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('should handle date range when startDate is later than endDate without throwing error', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.findAll({
        startDate: '2026-09-30T00:00:00Z',
        endDate: '2026-09-01T00:00:00Z',
      });

      expect(result).toEqual([]);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: {
              gte: new Date('2026-09-30T00:00:00Z'),
              lte: new Date('2026-09-01T00:00:00Z'),
            },
          },
        }),
      );
    });

    it('should clamp and sanitize pagination edge cases (page=0, page=-1, limit=0, limit=1000, NaN)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      // Test page=0 and limit=0 fallback
      await service.findAll({ page: 0, limit: 0 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );

      // Test page=-1 and limit=-5 clamping
      await service.findAll({ page: -1, limit: -5 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 1,
          skip: 0,
        }),
      );

      // Test limit ceiling clamping (limit=1000 capped to 100)
      await service.findAll({ page: 2, limit: 1000 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 100,
        }),
      );

      // Test NaN pagination fallback
      await service.findAll({ page: Number.NaN, limit: Number.NaN });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should ignore whitespace-only search queries without creating empty OR conditions', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.findAll({
        search: '    ',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
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
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        }),
      );
      expect(csv).toContain(
        'ID,Timestamp (UTC),User,Email,Action,Severity,Entity,IP Address,Status,Details',
      );
      // Verify doubled double-quotes for internal quotes
      expect(csv).toContain('"Vance, ""Special"" Ops"');
      expect(csv).toContain('"Firewall, Core-1"');
      expect(csv).toContain('"Updated rules: added ""allow 443"" & ""drop all""\nNew line note"');
    });

    it('should neutralize CSV formula injection characters (=, +, -, @, \\t)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '=cmd|calc!A0',
          userId: 'u-1',
          userName: '+Admin User',
          userEmail: '@injected.com',
          action: '-DELETE_DANGEROUS',
          severity: 'Critical',
          entity: '=HYPERLINK("http://evil.com")',
          ipAddress: '10.0.0.1',
          status: 'Failed',
          statusCode: 400,
          durationMs: 5.5,
          details: '\tTab indented text',
          timestamp: new Date('2026-09-02T10:00:00Z'),
        },
      ]);

      const csv = await service.exportCsv();
      expect(csv).toContain('"\'=cmd|calc!A0"');
      expect(csv).toContain('"\' +Admin User"'.replace(' ', ''));
      expect(csv).toContain('"\'@injected.com"');
      expect(csv).toContain('"\' -DELETE_DANGEROUS"'.replace(' ', ''));
      expect(csv).toContain('"\'=HYPERLINK(""http://evil.com"")"');
      expect(csv).toContain('"\'\tTab indented text"');
    });
  });
});
