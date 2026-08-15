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
}

export interface AuditStatsDto {
  soc2Score: string;
  isoReadiness: string;
  securityAnomalies: string;
  totalEventRecords: string;
}
