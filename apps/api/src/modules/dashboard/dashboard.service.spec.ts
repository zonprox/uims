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
        findMany: vi.fn().mockResolvedValue([]),
      },
      license: {
        aggregate: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventoryItem: {
        aggregate: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      subnet: {
        aggregate: vi.fn(),
      },
      iPAddress: {
        count: vi.fn(),
      },
      auditLog: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      directoryUser: {
        count: vi.fn(),
      },
      appUser: {
        count: vi.fn(),
      },
      user: {
        count: vi.fn(),
      },
    };
    mockPrisma.directoryUser = mockPrisma.user;
    mockPrisma.appUser = mockPrisma.user;

    service = new DashboardService(mockPrisma as unknown as PrismaService);
  });

  it('should return aggregated dashboard overview with KPIs, health metrics, and action items', async () => {
    mockPrisma.asset.count
      .mockResolvedValueOnce(25) // totalAssets
      .mockResolvedValueOnce(18) // activeAssets (inUse)
      .mockResolvedValueOnce(5) // inStockAssets
      .mockResolvedValueOnce(2) // inRepairAssets
      .mockResolvedValueOnce(0); // decommissionedAssets

    mockPrisma.license.aggregate.mockResolvedValue({
      _sum: { totalSeats: 150, usedSeats: 120 },
    });
    mockPrisma.license.count
      .mockResolvedValueOnce(12) // total licenses
      .mockResolvedValueOnce(2); // expiring licenses count
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

    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          id: 'log-1',
          userName: 'Alex Johnson',
          userEmail: 'admin@uims.internal',
          action: 'CREATE',
          entity: 'Asset AST-1001',
          entityType: 'Asset',
          details: 'Provisioned laptop',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
        },
      ])
      .mockResolvedValueOnce([]); // auditAlerts

    mockPrisma.inventoryItem.findMany.mockResolvedValue([
      { id: 'inv-1', name: 'USB-C Adapter', quantity: 1, minThreshold: 5 },
    ]);

    mockPrisma.asset.findMany
      .mockResolvedValueOnce([]) // expiringWarranties
      .mockResolvedValueOnce([]); // orphanedAssets

    mockPrisma.auditLog.count
      .mockResolvedValueOnce(150) // totalAuditLogs
      .mockResolvedValueOnce(42) // auditLogs24h
      .mockResolvedValueOnce(0); // securityAlertsCount

    mockPrisma.user.count.mockResolvedValue(148);

    const overview = await service.getOverview();

    expect(overview.kpi.managedAssets.total).toBe(25);
    expect(overview.kpi.managedAssets.active).toBe(18);
    expect(overview.kpi.managedAssets.inUse).toBe(18);
    expect(overview.kpi.managedAssets.inStock).toBe(5);
    expect(overview.kpi.managedAssets.inRepair).toBe(2);
    expect(overview.kpi.managedAssets.decommissioned).toBe(0);

    expect(overview.kpi.licenses.total).toBe(12);
    expect(overview.kpi.licenses.totalSeats).toBe(150);
    expect(overview.kpi.licenses.usedSeats).toBe(120);
    expect(overview.kpi.licenses.seatUsagePercent).toBe('80.0%');
    expect(overview.kpi.licenses.expiringCount).toBe(2);

    expect(overview.kpi.inventory.totalItems).toBe(45);
    expect(overview.kpi.inventory.lowStockCount).toBe(3);
    expect(overview.kpi.inventory.totalUnits).toBe(185);
    expect(overview.kpi.inventory.healthyCount).toBe(42);

    expect(overview.kpi.ipam.used).toBe(420);
    expect(overview.kpi.ipam.total).toBe(1024);
    expect(overview.kpi.ipam.free).toBe(604);

    expect(overview.kpi.audit.totalEvents).toBe(150);
    expect(overview.kpi.audit.recent24h).toBe(42);
    expect(overview.kpi.audit.securityAlerts).toBe(0);
    expect(overview.kpi.audit.status).toBe('Compliant');

    expect(overview.recentActivity).toHaveLength(1);
    expect(overview.recentActivity[0].user).toBe('Alex Johnson');
    expect(overview.recentActivity[0].action).toBe('PROVISIONED');
    expect(overview.recentActivity[0].linkUrl).toBe('/assets');

    expect(overview.actionItems).toHaveLength(2);
    expect(overview.actionItems[0].title).toBe('Low Stock Alert');
    expect(overview.actionItems[1].title).toBe('License Renewal Required');
  });

  it('should include expiring warranties and orphaned assets in action queue', async () => {
    mockPrisma.asset.count
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 50, usedSeats: 20 } });
    mockPrisma.license.count.mockResolvedValue(5);
    mockPrisma.license.findMany.mockResolvedValue([]);

    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    mockPrisma.inventoryItem.count.mockResolvedValueOnce(20).mockResolvedValueOnce(0);
    mockPrisma.inventoryItem.findMany.mockResolvedValue([]);

    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    mockPrisma.asset.findMany
      .mockResolvedValueOnce([
        { id: 'w-1', name: 'Dell XPS 15', assetTag: 'AST-2001', warrantyExpiry: new Date() },
      ])
      .mockResolvedValueOnce([
        {
          id: 'o-1',
          name: 'MacBook Pro',
          assetTag: 'AST-3001',
          status: 'IN_USE',
          assignedToId: null,
        },
      ]);

    mockPrisma.auditLog.count
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(0);

    mockPrisma.user.count.mockResolvedValue(30);

    const overview = await service.getOverview('urgent-items-test');

    expect(overview.actionItems).toHaveLength(2);
    expect(overview.actionItems[0].title).toBe('Warranty Expiration Alert');
    expect(overview.actionItems[0].linkUrl).toBe('/assets');
    expect(overview.actionItems[1].title).toBe('Orphaned Asset Detected');
    expect(overview.actionItems[1].linkUrl).toBe('/assets');
  });

  it('should return empty action items array when no warnings or low stock exist', async () => {
    mockPrisma.asset.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    mockPrisma.license.aggregate.mockResolvedValue({
      _sum: { totalSeats: 50, usedSeats: 30 },
    });
    mockPrisma.license.count.mockResolvedValue(5);
    mockPrisma.license.findMany.mockResolvedValue([]);

    mockPrisma.inventoryItem.aggregate.mockResolvedValue({
      _sum: { quantity: 100 },
    });
    mockPrisma.inventoryItem.count.mockResolvedValueOnce(20).mockResolvedValueOnce(0);

    mockPrisma.subnet.aggregate.mockResolvedValue({
      _sum: { totalIps: 256 },
    });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.inventoryItem.findMany.mockResolvedValue([]);
    mockPrisma.asset.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.user.count.mockResolvedValue(30);

    const overview = await service.getOverview('empty-test');

    expect(overview.actionItems).toEqual([]);
  });

  it('should serve subsequent requests from cache within TTL', async () => {
    mockPrisma.asset.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 50, usedSeats: 30 } });
    mockPrisma.license.count.mockResolvedValue(5);
    mockPrisma.license.findMany.mockResolvedValue([]);
    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    mockPrisma.inventoryItem.count.mockResolvedValueOnce(20).mockResolvedValueOnce(0);
    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.inventoryItem.findMany.mockResolvedValue([]);
    mockPrisma.asset.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.user.count.mockResolvedValue(30);

    const first = await service.getOverview('cached-period');
    expect(mockPrisma.asset.count).toHaveBeenCalledTimes(5);

    const second = await service.getOverview('cached-period');
    expect(second).toEqual(first);
    expect(mockPrisma.asset.count).toHaveBeenCalledTimes(5); // no extra db calls
  });

  it('should bypass cache and re-query database when bypassCache flag is true', async () => {
    mockPrisma.asset.count.mockResolvedValue(10);
    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 50, usedSeats: 30 } });
    mockPrisma.license.count.mockResolvedValue(5);
    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    mockPrisma.inventoryItem.count.mockResolvedValue(20);
    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.user.count.mockResolvedValue(30);

    await service.getOverview('refresh-period');
    expect(mockPrisma.asset.count).toHaveBeenCalledTimes(5);

    // Call with bypassCache = true
    await service.getOverview('refresh-period', true);
    expect(mockPrisma.asset.count).toHaveBeenCalledTimes(10);
  });

  it('should accurately compute compliance score below 90% during severe security breach', async () => {
    mockPrisma.asset.count.mockResolvedValue(10);
    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 50, usedSeats: 30 } });
    mockPrisma.license.count.mockResolvedValue(5);
    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    mockPrisma.inventoryItem.count.mockResolvedValue(20);
    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.user.count.mockResolvedValue(30);

    // 100 total audit logs, 60 security alerts in 24h
    mockPrisma.auditLog.count
      .mockResolvedValueOnce(100) // totalAuditLogs
      .mockResolvedValueOnce(70) // auditLogs24h
      .mockResolvedValueOnce(60); // securityAlertsCount

    const overview = await service.getOverview('breach-test', true);

    expect(overview.kpi.audit.complianceScore).toBe(40);
    expect(overview.kpi.audit.status).toBe('Critical');
  });

  it('should query expiring warranties with bounded lower date to exclude ancient expired assets', async () => {
    mockPrisma.asset.count.mockResolvedValue(10);
    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 50, usedSeats: 30 } });
    mockPrisma.license.count.mockResolvedValue(5);
    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 100 } });
    mockPrisma.inventoryItem.count.mockResolvedValue(20);
    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.user.count.mockResolvedValue(30);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await service.getOverview('warranty-query-test', true);

    expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          warrantyExpiry: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
          status: { not: 'RETIRED' },
        }),
      }),
    );
  });

  it('should report true total expiring license count even when queue is capped at 3 items', async () => {
    mockPrisma.asset.count.mockResolvedValue(10);
    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 100, usedSeats: 50 } });
    // Total 15 licenses, 8 expiring soon
    mockPrisma.license.count
      .mockResolvedValueOnce(15) // totalLicenses
      .mockResolvedValueOnce(8); // expiringLicensesCount

    // Action items queue returns only top 3
    mockPrisma.license.findMany.mockResolvedValueOnce([
      { id: 'l1', name: 'Lic 1', totalSeats: 10, status: 'EXPIRING_SOON' },
      { id: 'l2', name: 'Lic 2', totalSeats: 20, status: 'EXPIRING_SOON' },
      { id: 'l3', name: 'Lic 3', totalSeats: 30, status: 'EXPIRING_SOON' },
    ]);

    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 50 } });
    mockPrisma.inventoryItem.count.mockResolvedValue(10);
    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.user.count.mockResolvedValue(30);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const overview = await service.getOverview('expiring-count-test', true);

    expect(overview.kpi.licenses.total).toBe(15);
    expect(overview.kpi.licenses.expiringCount).toBe(8); // full count from count()
    expect(overview.actionItems.filter((i) => i.type === 'warning')).toHaveLength(3); // top 3 in queue
  });

  it('should prioritize critical security alerts ahead of routine warnings in action queue', async () => {
    mockPrisma.asset.count.mockResolvedValue(10);
    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 100, usedSeats: 50 } });
    mockPrisma.license.count.mockResolvedValue(10);
    mockPrisma.license.findMany.mockResolvedValueOnce([
      { id: 'l1', name: 'Zoom Enterprise', totalSeats: 50, status: 'EXPIRING_SOON' },
    ]);

    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });
    mockPrisma.inventoryItem.count.mockResolvedValue(5);
    mockPrisma.inventoryItem.findMany.mockResolvedValueOnce([
      { id: 'inv-1', name: 'Cat6 Cables', quantity: 1, minThreshold: 5 },
    ]);

    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.user.count.mockResolvedValue(30);
    mockPrisma.auditLog.count.mockResolvedValue(10);

    // 1 critical security alert
    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([]) // recentLogs
      .mockResolvedValueOnce([
        {
          id: 'aud-crit',
          action: 'LOGIN_FAILED',
          details: 'Repeated brute force attempt',
          userEmail: 'attacker@evil.com',
        },
      ]); // auditAlerts

    mockPrisma.asset.findMany
      .mockResolvedValueOnce([
        { id: 'ast-w', name: 'Workstation 1', assetTag: 'AST-99', warrantyExpiry: new Date() },
      ])
      .mockResolvedValueOnce([
        {
          id: 'ast-o',
          name: 'Orphaned Mac',
          assetTag: 'AST-88',
          status: 'IN_USE',
          assignedToId: null,
        },
      ]);

    const overview = await service.getOverview('priority-queue-test', true);

    // Expected order: Error items (Low Stock, Security Alert) -> Warning items (License, Warranty, Orphaned)
    expect(overview.actionItems).toHaveLength(5);
    expect(overview.actionItems[0].type).toBe('error');
    expect(overview.actionItems[0].title).toBe('Low Stock Alert');
    expect(overview.actionItems[1].type).toBe('error');
    expect(overview.actionItems[1].title).toBe('Security Compliance Alert');
    expect(overview.actionItems[2].type).toBe('warning');
    expect(overview.actionItems[2].title).toBe('License Renewal Required');
    expect(overview.actionItems[3].type).toBe('warning');
    expect(overview.actionItems[3].title).toBe('Warranty Expiration Alert');
    expect(overview.actionItems[4].type).toBe('warning');
    expect(overview.actionItems[4].title).toBe('Orphaned Asset Detected');
  });

  it('should normalize domain audit actions and map entity deep links for hardware and peripherals', async () => {
    mockPrisma.asset.count.mockResolvedValue(10);
    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 100, usedSeats: 50 } });
    mockPrisma.license.count.mockResolvedValue(10);
    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });
    mockPrisma.inventoryItem.count.mockResolvedValue(5);
    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.user.count.mockResolvedValue(30);
    mockPrisma.auditLog.count.mockResolvedValue(10);

    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          id: 'log-prov',
          userName: 'Admin',
          userEmail: 'admin@uims.internal',
          action: 'USER_PROVISION',
          entity: 'MacBook Pro 16',
          entityType: 'Hardware',
          details: 'Provisioned workstation',
          timestamp: new Date(),
        },
        {
          id: 'log-term',
          userName: 'Admin',
          userEmail: 'admin@uims.internal',
          action: 'ASSET_DECOMMISSION',
          entity: 'Dell PowerEdge Server',
          entityType: 'Hardware',
          details: 'Decommissioned server',
          timestamp: new Date(),
        },
        {
          id: 'log-stock',
          userName: 'Tech',
          userEmail: 'tech@uims.internal',
          action: 'INVENTORY_RESTOCK',
          entity: 'Logitech MX Master 3S',
          entityType: 'Peripheral',
          details: 'Restocked 10 units',
          timestamp: new Date(),
        },
      ])
      .mockResolvedValueOnce([]);

    const overview = await service.getOverview('action-mapping-test', true);

    expect(overview.recentActivity).toHaveLength(3);
    // USER_PROVISION -> PROVISIONED, linkUrl -> /assets
    expect(overview.recentActivity[0].action).toBe('PROVISIONED');
    expect(overview.recentActivity[0].linkUrl).toBe('/assets');
    // ASSET_DECOMMISSION -> TERMINATED, linkUrl -> /assets
    expect(overview.recentActivity[1].action).toBe('TERMINATED');
    expect(overview.recentActivity[1].linkUrl).toBe('/assets');
    // INVENTORY_RESTOCK -> PROVISIONED, linkUrl -> /inventory
    expect(overview.recentActivity[2].action).toBe('PROVISIONED');
    expect(overview.recentActivity[2].linkUrl).toBe('/inventory');
  });

  it('should query expiring licenses with orderBy expiryDate asc and format security severity/actions into WARNING and TERMINATED', async () => {
    mockPrisma.asset.count.mockResolvedValue(10);
    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 100, usedSeats: 50 } });
    mockPrisma.license.count.mockResolvedValue(10);
    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });
    mockPrisma.inventoryItem.count.mockResolvedValue(5);
    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.user.count.mockResolvedValue(30);
    mockPrisma.auditLog.count.mockResolvedValue(10);

    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          id: 'log-brute',
          userName: 'Security Bot',
          userEmail: 'sec@uims.internal',
          action: 'BRUTE_FORCE_DETECTED',
          severity: 'Critical',
          entity: 'Auth Gateway SAML',
          details: 'Firewall drop triggered',
          timestamp: new Date(),
        },
        {
          id: 'log-suspend',
          userName: 'Admin',
          userEmail: 'admin@uims.internal',
          action: 'USER_SUSPEND',
          severity: 'Warning',
          entity: 'Thomas Wright',
          entityType: 'User',
          details: 'Account suspended',
          timestamp: new Date(),
        },
      ])
      .mockResolvedValueOnce([]);

    const overview = await service.getOverview('ordering-and-security-test', true);

    // Verify license findMany called with orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }]
    expect(mockPrisma.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'EXPIRING_SOON' },
        take: 3,
        orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
      }),
    );

    // Verify BRUTE_FORCE_DETECTED is mapped to WARNING with #ef4444
    expect(overview.recentActivity[0].action).toBe('WARNING');
    expect(overview.recentActivity[0].avatarColor).toBe('#ef4444');

    // Verify USER_SUSPEND is mapped to TERMINATED with #dc2626
    expect(overview.recentActivity[1].action).toBe('TERMINATED');
    expect(overview.recentActivity[1].avatarColor).toBe('#dc2626');
  });

  it('should resolve deep links for asset tags AST-xxx, license IDs LIC-xxx, and network devices like firewalls and routers', async () => {
    mockPrisma.asset.count.mockResolvedValue(10);
    mockPrisma.license.aggregate.mockResolvedValue({ _sum: { totalSeats: 100, usedSeats: 50 } });
    mockPrisma.license.count.mockResolvedValue(10);
    mockPrisma.inventoryItem.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });
    mockPrisma.inventoryItem.count.mockResolvedValue(5);
    mockPrisma.subnet.aggregate.mockResolvedValue({ _sum: { totalIps: 256 } });
    mockPrisma.iPAddress.count.mockResolvedValue(50);
    mockPrisma.user.count.mockResolvedValue(30);
    mockPrisma.auditLog.count.mockResolvedValue(10);

    mockPrisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          id: 'log-ast',
          userName: 'Admin',
          action: 'DECOMMISSION',
          entity: 'AST-9999',
          details: 'Decommissioned laptop without entityType',
          timestamp: new Date(),
        },
        {
          id: 'log-firewall',
          userName: 'NetSec Lead',
          action: 'CONFIG_CHANGE',
          entity: 'FortiGate 200F Firewall',
          details: 'Ruleset updated',
          timestamp: new Date(),
        },
        {
          id: 'log-lic',
          userName: 'Ops Lead',
          action: 'SEAT_ALLOCATION',
          entity: 'LIC-9021',
          details: 'Allocated seat',
          timestamp: new Date(),
        },
      ])
      .mockResolvedValueOnce([]);

    const overview = await service.getOverview('prefix-deeplink-test', true);

    expect(overview.recentActivity[0].linkUrl).toBe('/assets');
    expect(overview.recentActivity[1].linkUrl).toBe('/network');
    expect(overview.recentActivity[2].linkUrl).toBe('/licenses');
  });
});
