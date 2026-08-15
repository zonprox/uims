import { api } from './api';

export interface GeneralSettings {
  companyName: string;
  supportEmail: string;
  timezone: string;
  dateFormat: string;
}

export interface SecuritySettings {
  enforce2FA: boolean;
  sessionTimeout: number;
  minPasswordLength: number;
  samlEntityId: string;
}

export interface HealthTelemetry {
  postgres: { status: string; latency: string };
  redis: { status: string; hitRate: string };
  smtp: { status: string; tlsVersion: string };
  backupStorage: { status: string; available: string };
}

export const settingsService = {
  getAllSettings: async (): Promise<Record<string, unknown>> => {
    const res = await api.get('/settings');
    return res.data.data;
  },
  getSetting: async (group: string) => {
    const res = await api.get(`/settings/${group}`);
    return res.data.data;
  },
  updateSetting: async (group: string, value: Record<string, unknown>) => {
    const res = await api.patch(`/settings/${group}`, value);
    return res.data.data;
  },
  runBackup: async () => {
    const res = await api.post('/settings/backup');
    return res.data.data;
  },
  getHealth: async (): Promise<HealthTelemetry> => {
    const res = await api.get('/settings/health');
    return res.data.data;
  },
};
