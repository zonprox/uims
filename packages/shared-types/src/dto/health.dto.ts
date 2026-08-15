export interface SystemHealthDto {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  uptimeFormatted: string;
  uptimePercent: string;
  latencyMs: number;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs: number;
  };
  system: {
    nodeVersion: string;
    platform: string;
    memoryHeapUsedMb: number;
    memoryHeapTotalMb: number;
    memoryRssMb: number;
  };
}
