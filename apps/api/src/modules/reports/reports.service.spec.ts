import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockPrisma: {
    asset: { aggregate: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
    license: { findMany: ReturnType<typeof vi.fn> };
    reportSchedule: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      asset: { aggregate: vi.fn(), count: vi.fn() },
      license: { findMany: vi.fn() },
      reportSchedule: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    };
    service = new ReportsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('getStats', () => {
    it('should aggregate financial, SaaS, and hardware asset utilization KPIs', async () => {
      mockPrisma.reportSchedule.count.mockResolvedValue(4);
      mockPrisma.license.findMany.mockResolvedValue([
        { totalSeats: 100, usedSeats: 50, costPerSeat: 20 },
      ]);
      mockPrisma.asset.count
        .mockResolvedValueOnce(100) // totalAssets
        .mockResolvedValueOnce(95); // inUseAssets

      const stats = await service.getStats();

      expect(stats.scheduledReports).toBe('4 Active');
      expect(stats.globalSlaMet).toBe('95.0%');
      expect(stats.auditReadiness).toBe('100%');
    });

    it('should use $queryRaw database aggregate when available for SaaS spend in getStats', async () => {
      mockPrisma.reportSchedule.count.mockResolvedValue(2);
      (mockPrisma as Record<string, unknown>).$queryRaw = vi
        .fn()
        .mockResolvedValue([{ totalSpend: 50000 }]);
      mockPrisma.asset.count.mockResolvedValueOnce(50).mockResolvedValueOnce(45);

      const stats = await service.getStats();

      expect(stats.scheduledReports).toBe('2 Active');
      expect(stats.annualCostSavings).toBe('$7,500'); // 50000 * 0.15 = 7500
      expect(stats.globalSlaMet).toBe('90.0%');
    });
  });

  describe('getReportSuites', () => {
    it('should return system report definitions with dynamic stats', async () => {
      mockPrisma.asset.aggregate.mockResolvedValue({
        _sum: { purchaseCost: 200000 },
      });
      mockPrisma.license.findMany.mockResolvedValue([
        { totalSeats: 100, usedSeats: 80, costPerSeat: 30 },
      ]);

      const reports = await service.getReportSuites();

      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].id).toBe('r1');
      expect(reports[1].id).toBe('r2');
    });

    it('should use database aggregations for license seats and spend when available in getReportSuites', async () => {
      mockPrisma.asset.aggregate.mockResolvedValue({
        _sum: { purchaseCost: 350000 },
      });
      (mockPrisma as Record<string, unknown>).$queryRaw = vi
        .fn()
        .mockResolvedValue([{ totalSpend: 60000 }]);
      (mockPrisma.license as Record<string, unknown>).aggregate = vi.fn().mockResolvedValue({
        _sum: { totalSeats: 500, usedSeats: 400 },
      });

      const reports = await service.getReportSuites();

      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].stats.primary).toBe('$350,000');
      expect(reports[1].stats.secondary).toBe('80.0% Seat Usage');
    });
  });
});
