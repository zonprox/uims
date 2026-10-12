import { api } from './api';

export interface ReportSuite {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: string;
  stats?: {
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
  exportReport: async (domain: string, format: 'xlsx' | 'pdf'): Promise<Blob> => {
    const res = await api.get(`/reports/export/${domain}/${format}`, {
      responseType: 'blob',
    });
    const blob: Blob = res.data;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const createObjectURL = window.URL?.createObjectURL || URL?.createObjectURL;
        if (typeof createObjectURL === 'function') {
          const blobUrl = createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          const today = new Date().toISOString().slice(0, 10);
          link.setAttribute('download', `${domain}_report_${today}.${format}`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (typeof window.URL?.revokeObjectURL === 'function') {
            window.URL.revokeObjectURL(blobUrl);
          }
        }
      } catch (_err: unknown) {
        // Safe fallback in test environments without full DOM URL.createObjectURL support
      }
    }

    return blob;
  },
};
