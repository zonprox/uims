export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, any>;
  createdAt: string;
}
