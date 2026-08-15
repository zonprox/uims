import { api } from './api';

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PERMISSION_GRANT';
  severity: 'Info' | 'Warning' | 'Critical';
  entity: string;
  entityType: 'Asset' | 'License' | 'User' | 'Network' | 'Security';
  ipAddress: string;
  status: 'Success' | 'Failed' | 'Blocked';
  details?: string;
  userName?: string;
  diffPayload?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    requestId?: string;
    userAgent?: string;
  };
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
