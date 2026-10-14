import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardController } from './dashboard.controller';
import type { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockDashboardService: {
    getOverview: ReturnType<typeof vi.fn>;
    getPendingHandoversSummary: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDashboardService = {
      getOverview: vi.fn(),
      getPendingHandoversSummary: vi.fn(),
    };

    controller = new DashboardController(mockDashboardService as unknown as DashboardService);
  });

  describe('getOverview', () => {
    it('should delegate to dashboardService.getOverview with parsed refresh flag', async () => {
      const mockResult = { kpi: {}, health: {}, recentActivity: [], actionItems: [] };
      mockDashboardService.getOverview.mockResolvedValueOnce(mockResult);

      const res = await controller.getOverview('30d', 'true');

      expect(mockDashboardService.getOverview).toHaveBeenCalledWith('30d', true);
      expect(res).toEqual(mockResult);
    });

    it('should pass refresh false when refresh query param is omitted', async () => {
      mockDashboardService.getOverview.mockResolvedValueOnce({});

      await controller.getOverview(undefined, undefined);

      expect(mockDashboardService.getOverview).toHaveBeenCalledWith(undefined, false);
    });
  });

  describe('getPendingHandoversSummary', () => {
    it('should delegate to dashboardService.getPendingHandoversSummary', async () => {
      const mockSummary = {
        totalPending: 3,
        overdueCount: 1,
        pendingAssignments: 2,
        pendingReturns: 1,
        pendingTransfers: 0,
        breakdownByType: { assignment: 2, return: 1 },
        records: [],
      };
      mockDashboardService.getPendingHandoversSummary.mockResolvedValueOnce(mockSummary);

      const res = await controller.getPendingHandoversSummary();

      expect(mockDashboardService.getPendingHandoversSummary).toHaveBeenCalledTimes(1);
      expect(res).toEqual(mockSummary);
    });
  });
});
