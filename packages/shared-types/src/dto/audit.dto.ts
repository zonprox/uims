export interface LogEventDto {
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  severity?: string;
  entity: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  status?: string;
  statusCode?: number;
  durationMs?: number;
  details?: string;
  diffPayload?: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  userAgent?: string;
}

export interface AuditQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  action?: string;
  severity?: string;
  status?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditStatsDto {
  totalEvents: number;
  failedEvents: number;
  criticalEvents: number;
  errorRate: string;
  totalEventRecords?: string;
  securityAnomalies?: string;
}
