import type { DashboardOverviewDto } from '@uims/shared-types';
import { api } from './api';

export type DashboardOverview = DashboardOverviewDto;

export interface PendingHandoverRecordItem {
  id: string;
  recordId: string;
  assetId: string;
  assetTag: string;
  subcode: string;
  modelName: string;
  serialNumber: string;
  type: 'ASSIGNMENT' | 'RETURN' | 'TRANSFER' | string;
  handoverType: 'ASSIGNMENT' | 'RETURN' | 'TRANSFER' | string;
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  department: string;
  departmentName: string;
  createdAt: string;
  daysPending: number;
  isOverdue: boolean;
  docUrl?: string;
  timeAgo: string;
}

export interface PendingHandoverSummaryResponse {
  totalPending: number;
  overdueCount: number;
  pendingAssignments: number;
  pendingReturns: number;
  pendingTransfers: number;
  breakdownByType: {
    assignment: number;
    return: number;
    transfer?: number;
  };
  records: PendingHandoverRecordItem[];
}

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

  getPendingHandovers: async (): Promise<PendingHandoverSummaryResponse> => {
    const res = await api.get('/dashboard/pending-handovers');
    return res.data?.data ?? res.data;
  },
};
