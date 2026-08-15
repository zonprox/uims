import type { SystemHealthDto } from '@uims/shared-types';
import { api } from './api';

export interface HealthState extends SystemHealthDto {
  clientLatencyMs: number;
}

export const healthService = {
  checkHealth: async (): Promise<HealthState> => {
    const start = performance.now();
    const res = await api.get('/health');
    const clientLatencyMs = Math.max(1, Math.round(performance.now() - start));
    const data: SystemHealthDto = res.data?.data ?? res.data;
    return {
      ...data,
      clientLatencyMs,
    };
  },
};
