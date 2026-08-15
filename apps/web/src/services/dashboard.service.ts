import { api } from './api';

export interface DashboardOverview {
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
    type: string;
    title: string;
    tag: string;
    tagColor: string;
    description: string;
    linkText: string;
    linkUrl: string;
  }>;
}

export const dashboardService = {
  getOverview: async (period?: string): Promise<DashboardOverview> => {
    const res = await api.get('/dashboard/overview', { params: { period } });
    return res.data.data;
  },
};
