import { api } from './api';

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  action: string;
  severity: string;
  entity: string;
  entityType: string;
  ipAddress: string;
  status: string;
  details?: string;
  userName?: string;
  diffPayload?: {
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    requestId?: string;
    userAgent?: string;
    ipAddress?: string;
    severity?: string;
    status?: string;
    [key: string]: unknown;
  } | null;
}

export interface AuditStats {
  soc2Score: string;
  isoReadiness: string;
  securityAnomalies: string;
  totalEventRecords: string;
}

export const auditService = {
  getLogs: async (params?: {
    search?: string;
    action?: string;
    severity?: string;
  }): Promise<Array<AuditLog>> => {
    const res = await api.get('/audit', { params });
    return res.data.data;
  },
  getLog: async (id: string): Promise<AuditLog> => {
    const res = await api.get(`/audit/${id}`);
    return res.data.data;
  },
  exportCsv: async (): Promise<string> => {
    const res = await api.get('/audit/export', { responseType: 'text' });
    return res.data;
  },
  getStats: async (): Promise<AuditStats> => {
    const res = await api.get('/audit/stats');
    return res.data.data;
  },
};
