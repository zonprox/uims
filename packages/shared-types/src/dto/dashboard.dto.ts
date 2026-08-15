export interface DashboardOverviewDto {
  kpi: {
    managedAssets: {
      total: number;
      active: number;
      growthMoM: string;
    };
    licenses: {
      total: number;
      seatUsagePercent: string;
      expiringCount: number;
    };
    helpdesk: {
      openCount: number;
      urgentCount: number;
      slaMetPercent: string;
    };
    ipam: {
      used: number;
      total: number;
      free: number;
      usagePercent: number;
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
    details: string;
    time: string;
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
