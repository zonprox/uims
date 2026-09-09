import type { DashboardOverviewDto } from '@uims/shared-types';
import { api } from './api';

export type DashboardOverview = DashboardOverviewDto;

export const dashboardService = {
  getOverview: async (period?: string, refresh?: boolean): Promise<DashboardOverview> => {
    const res = await api.get('/dashboard/overview', {
      params: {
        period,
        refresh: refresh ? 'true' : undefined,
      },
    });
    return res.data.data;
  },
};
