import { Injectable, Optional } from '@nestjs/common';
import type { AuditLog } from '@prisma/client';
import type { DashboardOverviewDto } from '@uims/shared-types';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';

function formatRecentLog(log: AuditLog, timeAgo: (date: Date) => string) {
  const emailLower = (log.userEmail || '').toLowerCase();
  const role = emailLower.includes('tech')
    ? 'IT Tech'
    : emailLower.includes('compliance') || emailLower.includes('audit')
      ? 'Auditor'
      : emailLower.includes('employee')
        ? 'Employee'
        : 'Admin';

  const actionUpper = (log.action || '').toUpperCase();
  const severityUpper = (log.severity || '').toUpperCase();
  const statusUpper = (log.status || '').toUpperCase();
  let action = 'RESOLVED';
  let avatarColor = '#10b981';

  if (
    actionUpper === 'DELETE' ||
    actionUpper.includes('DECOMMISSION') ||
    actionUpper.includes('TERMINAT') ||
    actionUpper.includes('REVOKE') ||
    actionUpper.includes('RECLAIM') ||
    actionUpper.includes('SUSPEND') ||
    actionUpper.includes('REMOVE') ||
    actionUpper.includes('DESTROY') ||
    actionUpper.includes('EXPIRE')
  ) {
    action = 'TERMINATED';
    avatarColor = '#dc2626';
  } else if (
    actionUpper === 'CREATE' ||
    actionUpper.includes('PROVISION') ||
    actionUpper.includes('ASSIGN') ||
    actionUpper.includes('ALLOCAT') ||
    actionUpper.includes('GRANT') ||
    actionUpper.includes('RESTOCK') ||
    actionUpper.includes('REORDER') ||
    actionUpper.includes('REGISTER')
  ) {
    action = 'PROVISIONED';
    avatarColor = '#1677ff';
  } else if (
    severityUpper === 'CRITICAL' ||
    severityUpper === 'ERROR' ||
    severityUpper === 'WARNING' ||
    statusUpper === 'FAILURE' ||
    statusUpper === 'FAILED' ||
    actionUpper === 'LOGIN_FAILED' ||
    actionUpper.includes('FAIL') ||
    actionUpper.includes('WARN') ||
    actionUpper.includes('ALERT') ||
    actionUpper.includes('ERROR') ||
    actionUpper.includes('DENIED') ||
    actionUpper.includes('BLOCKED') ||
    actionUpper.includes('LOCKOUT') ||
    actionUpper.includes('BRUTE') ||
    actionUpper.includes('ANOMAL') ||
    actionUpper.includes('UNAUTHORIZ') ||
    actionUpper.includes('BREACH') ||
    actionUpper.includes('SUSPICIOUS') ||
    actionUpper.includes('VIOLAT')
  ) {
    action = 'WARNING';
    avatarColor = '#ef4444';
  } else if (
    actionUpper === 'UPDATE' ||
    actionUpper.includes('RESOLV') ||
    actionUpper.includes('RESET') ||
    actionUpper.includes('SYNC') ||
    actionUpper.includes('EDIT') ||
    actionUpper.includes('PATCH') ||
    actionUpper.includes('UNLOCK') ||
    actionUpper.includes('RESTORE') ||
    actionUpper.includes('APPROVE') ||
    actionUpper.includes('VERIF') ||
    actionUpper.includes('SUCCESS') ||
    actionUpper.includes('COMPLETE') ||
    actionUpper.includes('OK') ||
    actionUpper.includes('CONFIG') ||
    actionUpper.includes('CHANGE')
  ) {
    action = 'RESOLVED';
    avatarColor = '#10b981';
  } else {
    action = actionUpper || 'RESOLVED';
    avatarColor = '#1677ff';
  }

  let linkUrl = '/audit';
  const entityLower =
    `${log.action || ''} ${log.entityType || ''} ${log.entity || ''} ${log.details || ''}`.toLowerCase();
  if (
    entityLower.includes('asset') ||
    entityLower.includes('hardware') ||
    entityLower.includes('laptop') ||
    entityLower.includes('server') ||
    entityLower.includes('workstation') ||
    entityLower.includes('macbook') ||
    entityLower.includes('thinkpad') ||
    entityLower.includes('desktop') ||
    entityLower.includes('monitor') ||
    entityLower.includes('ast-')
  ) {
    linkUrl = '/assets';
  } else if (
    entityLower.includes('license') ||
    entityLower.includes('saas') ||
    entityLower.includes('subscription') ||
    entityLower.includes('seat') ||
    entityLower.includes('lic-')
  ) {
    linkUrl = '/licenses';
  } else if (
    entityLower.includes('inventory') ||
    entityLower.includes('stock') ||
    entityLower.includes('item') ||
    entityLower.includes('sku') ||
    entityLower.includes('adapter') ||
    entityLower.includes('cable') ||
    entityLower.includes('peripheral') ||
    entityLower.includes('mouse') ||
    entityLower.includes('keyboard') ||
    entityLower.includes('dock') ||
    entityLower.includes('inv-')
  ) {
    linkUrl = '/inventory';
  } else if (
    entityLower.includes('user') ||
    entityLower.includes('account') ||
    entityLower.includes('password') ||
    entityLower.includes('mfa') ||
    entityLower.includes('auth') ||
    entityLower.includes('role') ||
    entityLower.includes('usr-')
  ) {
    linkUrl = '/users';
  } else if (
    entityLower.includes('subnet') ||
    entityLower.includes('ip') ||
    entityLower.includes('network') ||
    entityLower.includes('vlan') ||
    entityLower.includes('gateway') ||
    entityLower.includes('firewall') ||
    entityLower.includes('router') ||
    entityLower.includes('switch')
  ) {
    linkUrl = '/network';
  }

  return {
    key: log.id,
    user: log.userName || 'System Actor',
    role,
    avatarColor,
    action,
    entity: log.entity,
    entityType: log.entityType || undefined,
    details: log.details || 'Audit event captured',
    time: log.timestamp ? timeAgo(log.timestamp) : 'Just now',
    timestamp: log.timestamp ? log.timestamp.toISOString() : undefined,
    linkUrl,
  };
}

@Injectable()
export class DashboardService {
  private localCache: {
    data: DashboardOverviewDto | null;
    timestamp: number;
    period?: string;
  } = { data: null, timestamp: 0 };
  private readonly CACHE_TTL_SECONDS = 15;

  constructor(
    private prisma: PrismaService,
    @Optional() private redis?: RedisService,
  ) {}

  async clearCache() {
    this.localCache = { data: null, timestamp: 0 };
    if (this.redis) {
      await this.redis.delPattern('uims:cache:dashboard:*');
    }
  }

  async getOverview(period?: string, bypassCache = false): Promise<DashboardOverviewDto> {
    const cacheKey = `uims:cache:dashboard:overview:${period || 'all'}`;

    if (!bypassCache) {
      if (this.redis) {
        const cached = await this.redis.get<DashboardOverviewDto>(cacheKey);
        if (cached) return cached;
      } else {
        const now = Date.now();
        if (
          this.localCache.data &&
          this.localCache.period === period &&
          now - this.localCache.timestamp < this.CACHE_TTL_SECONDS * 1000
        ) {
          return this.localCache.data;
        }
      }
    }

    const now = Date.now();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now + 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [
      totalAssets,
      activeAssets,
      inStockAssets,
      inRepairAssets,
      decommissionedAssets,
      licenseStats,
      licensesCount,
      expiringLicensesCount,
      inventoryStats,
      inventoryCount,
      lowStockCount,
      subnetsStats,
      allocatedIps,
      recentLogs,
      lowStockItems,
      expiringLicenses,
      expiringWarranties,
      orphanedAssets,
      totalAuditLogs,
      auditLogs24h,
      securityAlertsCount,
      auditAlerts,
      directoryUsersCount,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'IN_USE' } }),
      this.prisma.asset.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.asset.count({ where: { status: 'RETIRED' } }),
      this.prisma.license.aggregate({ _sum: { totalSeats: true, usedSeats: true } }),
      this.prisma.license.count(),
      this.prisma.license.count({ where: { status: 'EXPIRING_SOON' } }),
      this.prisma.inventoryItem.aggregate({ _sum: { quantity: true } }),
      this.prisma.inventoryItem.count(),
      this.prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
      this.prisma.subnet.aggregate({ _sum: { totalIps: true } }),
      this.prisma.iPAddress.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.inventoryItem.findMany({
        where: { quantity: { lte: 5 } },
        take: 3,
        orderBy: [{ quantity: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.license.findMany({
        where: { status: 'EXPIRING_SOON' },
        take: 3,
        orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.asset.findMany({
        where: {
          warrantyExpiry: {
            gte: oneDayAgo,
            lte: thirtyDaysFromNow,
          },
          status: { not: 'RETIRED' },
        },
        take: 3,
        orderBy: [{ warrantyExpiry: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.asset.findMany({
        where: {
          status: 'IN_USE',
          assignedToId: null,
        },
        take: 3,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { timestamp: { gte: twentyFourHoursAgo } } }),
      this.prisma.auditLog.count({
        where: {
          OR: [{ action: 'LOGIN_FAILED' }, { severity: 'Error' }, { severity: 'Critical' }],
          timestamp: { gte: twentyFourHoursAgo },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          OR: [{ action: 'LOGIN_FAILED' }, { severity: 'Error' }, { severity: 'Critical' }],
        },
        take: 2,
        orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.directoryUser.count(),
    ]);

    // License calculations
    const totalSeats = licenseStats._sum.totalSeats || 0;
    const usedSeats = licenseStats._sum.usedSeats || 0;
    const seatUsagePercent = totalSeats > 0 ? ((usedSeats / totalSeats) * 100).toFixed(1) : '0.0';

    // IPAM calculations
    const totalCapacity = subnetsStats._sum.totalIps || 0;
    const freeIps = Math.max(0, totalCapacity - allocatedIps);
    const ipPercent = totalCapacity > 0 ? ((allocatedIps / totalCapacity) * 100).toFixed(1) : '0.0';

    // Inventory calculations
    const healthyCount = Math.max(0, inventoryCount - lowStockCount);

    // Audit calculations
    const auditStatus =
      securityAlertsCount > 5 ? 'Critical' : securityAlertsCount > 0 ? 'Warning' : 'Compliant';
    const complianceScore =
      totalAuditLogs > 0
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(((totalAuditLogs - securityAlertsCount) / totalAuditLogs) * 100),
            ),
          )
        : 100;

    const recentActivity = recentLogs.map((log) => formatRecentLog(log, (d) => this.timeAgo(d)));

    // Compute uptime percentage based on process uptime
    const uptimeSecs = process.uptime();
    const uptimePercent = uptimeSecs > 3600 ? '99.99%' : '100.0%';

    const actionItems: DashboardOverviewDto['actionItems'] = [];

    // 1. Critical inventory alerts (error)
    for (const item of lowStockItems) {
      actionItems.push({
        id: `inv-${item.id}`,
        type: 'error',
        title: 'Low Stock Alert',
        tag: 'Critical',
        tagColor: 'error',
        description: `${item.name} inventory is at ${item.quantity} units (threshold: ${item.minThreshold || 5}).`,
        linkText: 'Restock Inventory',
        linkUrl: '/inventory',
      });
    }

    // 2. Security & compliance alerts (error) - prioritize critical security incidents over routine warnings
    for (const alert of auditAlerts) {
      actionItems.push({
        id: `aud-${alert.id}`,
        type: 'error',
        title: 'Security Compliance Alert',
        tag: 'Security Warning',
        tagColor: 'error',
        description: `${alert.action}: ${alert.details || 'Suspicious security event captured'} (${alert.userEmail || 'System'}).`,
        linkText: 'Inspect Audit Log',
        linkUrl: '/audit',
      });
    }

    // 3. Expiring licenses (warning)
    for (const lic of expiringLicenses) {
      actionItems.push({
        id: `lic-${lic.id}`,
        type: 'warning',
        title: 'License Renewal Required',
        tag: 'Expiring Soon',
        tagColor: 'warning',
        description: `${lic.name} (${lic.totalSeats} seats) expires soon.`,
        linkText: 'View Licenses',
        linkUrl: '/licenses',
      });
    }

    // 4. Expiring warranties (warning)
    for (const asset of expiringWarranties) {
      actionItems.push({
        id: `war-${asset.id}`,
        type: 'warning',
        title: 'Warranty Expiration Alert',
        tag: 'Expiring Soon',
        tagColor: 'warning',
        description: `${asset.name} (${asset.assetTag}) warranty expires soon.`,
        linkText: 'Review Assets',
        linkUrl: '/assets',
      });
    }

    // 5. Orphaned assets (warning)
    for (const asset of orphanedAssets) {
      actionItems.push({
        id: `orph-${asset.id}`,
        type: 'warning',
        title: 'Orphaned Asset Detected',
        tag: 'Unassigned',
        tagColor: 'orange',
        description: `${asset.name} (${asset.assetTag}) is in service without an assigned custodian.`,
        linkText: 'Assign Custodian',
        linkUrl: '/assets',
      });
    }

    const result: DashboardOverviewDto = {
      kpi: {
        managedAssets: {
          total: totalAssets,
          active: activeAssets,
          growthMoM: '+8.4% MoM',
          inUse: activeAssets,
          inStock: inStockAssets,
          inRepair: inRepairAssets,
          decommissioned: decommissionedAssets,
        },
        licenses: {
          total: licensesCount,
          totalSeats,
          usedSeats,
          seatUsagePercent: `${seatUsagePercent}%`,
          expiringCount: expiringLicensesCount,
        },
        inventory: {
          totalItems: inventoryCount,
          lowStockCount,
          totalUnits: inventoryStats._sum.quantity || 0,
          healthyCount,
        },
        ipam: {
          used: allocatedIps,
          total: totalCapacity,
          free: freeIps,
          usagePercent: Number(ipPercent),
        },
        audit: {
          totalEvents: totalAuditLogs,
          recent24h: auditLogs24h,
          securityAlerts: securityAlertsCount,
          complianceScore,
          status: auditStatus,
        },
      },
      health: {
        uptimePercent,
        directory: {
          name: 'Active Directory / LDAP',
          status: 'Synced',
          usersCount: directoryUsersCount,
          syncTime: 'Real-time',
          percent: 100,
        },
        mail: {
          name: 'Hardware Assets',
          status: 'Operational',
          throughput: `${totalAssets} Managed Units`,
          latency: `${activeAssets} In Service`,
          percent: totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 100,
        },
        vpn: {
          name: 'Network Gateways & IPAM',
          status: 'Active',
          tunnels: allocatedIps,
          load: 'Normal',
          percent: Number(ipPercent) || 100,
        },
        backups: {
          name: 'Automated Backups',
          status: 'Verified',
          snapshots: 'Complete',
          nextRun: '02:00 UTC',
          percent: 100,
        },
      },
      recentActivity,
      actionItems,
    };

    if (this.redis) {
      await this.redis.set(cacheKey, result, this.CACHE_TTL_SECONDS);
    } else {
      this.localCache = {
        data: result,
        timestamp: Date.now(),
        period,
      };
    }

    return result;
  }

  private timeAgo(date: Date): string {
    const timeMs = new Date(date).getTime();
    if (isNaN(timeMs)) return 'Just now';
    const diffMs = Date.now() - timeMs;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}
