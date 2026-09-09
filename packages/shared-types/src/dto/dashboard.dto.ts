export interface DashboardOverviewDto {
  kpi: {
    managedAssets: {
      total: number;
      active: number;
      growthMoM: string;
      inUse: number;
      inStock: number;
      inRepair: number;
      decommissioned: number;
    };
    licenses: {
      total: number;
      totalSeats: number;
      usedSeats: number;
      seatUsagePercent: string;
      expiringCount: number;
    };
    inventory: {
      totalItems: number;
      lowStockCount: number;
      totalUnits: number;
      healthyCount: number;
    };
    ipam: {
      used: number;
      total: number;
      free: number;
      usagePercent: number;
    };
    audit: {
      totalEvents: number;
      recent24h: number;
      securityAlerts: number;
      complianceScore: number;
      status: 'Compliant' | 'Warning' | 'Critical';
    };
  };
  health: {
    uptimePercent: string;
    directory: {
      name: string;
      status: string;
      usersCount: number;
      syncTime: string;
      percent: number;
    };
    mail: {
      name: string;
      status: string;
      throughput: string;
      latency: string;
      percent: number;
    };
    vpn: {
      name: string;
      status: string;
      tunnels: number;
      load: string;
      percent: number;
    };
    backups: {
      name: string;
      status: string;
      snapshots: string;
      nextRun: string;
      percent: number;
    };
  };
  recentActivity: Array<{
    key: string;
    user: string;
    role: string;
    avatarColor: string;
    action: string;
    entity: string;
    entityType?: string;
    details: string;
    time: string;
    timestamp?: string;
    linkUrl?: string;
  }>;
  actionItems: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    tag: string;
    tagColor: string;
    description: string;
    linkText: string;
    linkUrl: string;
  }>;
}
