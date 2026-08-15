import { api } from './api';

export interface ReportSuite {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: string;
  stats: {
    primary: string;
    label: string;
    secondary: string;
  };
}

export interface ReportStats {
  scheduledReports: string;
  annualCostSavings: string;
  globalSlaMet: string;
  auditReadiness: string;
}

export const reportsService = {
  getReportSuites: async (): Promise<Array<ReportSuite>> => {
    const res = await api.get('/reports');
    return res.data.data;
  },
  scheduleReport: async (data: {
    reportType: string;
    frequency: string;
    format?: string;
    recipients: string;
  }) => {
    const res = await api.post('/reports/schedule', data);
    return res.data.data;
  },
  getStats: async (): Promise<ReportStats> => {
    const res = await api.get('/reports/stats');
    return res.data.data;
  },
};
