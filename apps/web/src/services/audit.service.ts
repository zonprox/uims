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
  entityId?: string | null;
  ipAddress: string;
  status: string;
  statusCode?: number | null;
  durationMs?: number | null;
  userAgent?: string | null;
  details?: string;
  userName?: string;
  diffPayload?: Record<string, unknown> | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

export interface AuditStats {
  totalEvents: number;
  failedEvents: number;
  criticalEvents: number;
  errorRate: string;
  totalEventRecords?: string;
  securityAnomalies?: string;
}

export const auditService = {
  getLogs: async (params?: {
    search?: string;
    action?: string;
    severity?: string;
    status?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Array<AuditLog>> => {
    const res = await api.get('/audit', { params });
    return res.data.data;
  },
  getLog: async (id: string): Promise<AuditLog> => {
    const res = await api.get(`/audit/${id}`);
    return res.data.data;
  },
  exportCsv: async (params?: {
    search?: string;
    action?: string;
    severity?: string;
    status?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<string> => {
    const res = await api.get('/audit/export', { params, responseType: 'text' });
    return res.data;
  },
  getStats: async (): Promise<AuditStats> => {
    const res = await api.get('/audit/stats');
    return res.data.data;
  },
};
