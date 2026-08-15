import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    mockPrisma = {
      asset: {
        count: vi.fn(),
      },
      license: {
        aggregate: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      inventoryItem: {
        aggregate: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      subnet: {
        aggregate: vi.fn(),
      },
      iPAddress: {
        count: vi.fn(),
      },
      auditLog: {
        findMany: vi.fn(),
      },
      directoryUser: {
        count: vi.fn(),
      },
    };

    service = new DashboardService(mockPrisma as unknown as PrismaService);
  });

  it('should return aggregated dashboard overview with KPIs, health metrics, and action items', async () => {
    mockPrisma.asset.count
      .mockResolvedValueOnce(25) // totalAssets
      .mockResolvedValueOnce(18); // activeAssets

    mockPrisma.license.aggregate.mockResolvedValue({
      _sum: { totalSeats: 150, usedSeats: 120 },
    });
    mockPrisma.license.count.mockResolvedValue(12);
    mockPrisma.license.findMany.mockResolvedValue([
      { id: 'l1', name: 'Adobe Creative Cloud', totalSeats: 30, status: 'EXPIRING_SOON' },
    ]);

    mockPrisma.inventoryItem.aggregate.mockResolvedValue({
      _sum: { quantity: 185 },
    });
    mockPrisma.inventoryItem.count
      .mockResolvedValueOnce(45) // inventoryCount
      .mockResolvedValueOnce(3); // lowStockCount

    mockPrisma.subnet.aggregate.mockResolvedValue({
      _sum: { totalIps: 1024 },
    });
    mockPrisma.iPAddress.count.mockResolvedValue(420);

    mockPrisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        userName: 'Alex Johnson',
        userEmail: 'admin@uims.internal',
        action: 'CREATE',
        entity: 'Asset AST-1001',
        details: 'Provisioned laptop',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
      },
    ]);

    mockPrisma.inventoryItem.findMany.mockResolvedValue([
      { id: 'inv-1', name: 'USB-C Adapter', quantity: 1, minThreshold: 5 },
    ]);

    mockPrisma.directoryUser.count.mockResolvedValue(148);

    const overview = await service.getOverview();

    expect(overview.kpi.managedAssets.total).toBe(25);
    expect(overview.kpi.managedAssets.active).toBe(18);
    expect(overview.kpi.licenses.total).toBe(12);
    expect(overview.kpi.licenses.seatUsagePercent).toBe('80.0%');
    expect(overview.kpi.inventory.totalItems).toBe(45);
    expect(overview.kpi.inventory.lowStockCount).toBe(3);
    expect(overview.kpi.inventory.totalUnits).toBe(185);
    expect(overview.kpi.ipam.used).toBe(420);
    expect(overview.kpi.ipam.total).toBe(1024);
    expect(overview.kpi.ipam.free).toBe(604);

    expect(overview.recentActivity).toHaveLength(1);
    expect(overview.recentActivity[0].user).toBe('Alex Johnson');
    expect(overview.recentActivity[0].action).toBe('PROVISIONED');

    expect(overview.actionItems).toHaveLength(2);
    expect(overview.actionItems[0].title).toBe('License Renewal Required');
    expect(overview.actionItems[1].title).toBe('Hardware Stock Depleted');
  });
});
