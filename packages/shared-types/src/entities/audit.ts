export interface AuditLog {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  severity: string;
  entity: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  status: string;
  details?: string | null;
  diffPayload?: Record<string, unknown> | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  userAgent?: string | null;
  timestamp: string;
}
