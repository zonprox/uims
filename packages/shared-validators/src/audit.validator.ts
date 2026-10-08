import { z } from 'zod';
import { dateSchema, emailSchema, uuidSchema } from './common.validator';
import { ipv4Regex, ipv6Regex } from './network.validator';

export const auditSeverityEnum = z.enum(['Info', 'Warning', 'Error', 'Critical']);
export const auditStatusEnum = z.enum(['Success', 'Failure', 'Warning', 'Pending']);

export const logEventSchema = z.object({
  userId: uuidSchema.nullable().optional(),
  userEmail: emailSchema.nullable().optional(),
  userName: z.string().trim().max(100).nullable().optional(),
  action: z.string().trim().min(1, 'Action is required').max(100),
  severity: auditSeverityEnum.default('Info').optional(),
  entity: z.string().trim().min(1, 'Entity is required').max(100),
  entityType: z.string().trim().max(100).nullable().optional(),
  entityId: z.string().trim().max(100).nullable().optional(),
  ipAddress: z
    .string()
    .trim()
    .refine(
      (val) =>
        ipv4Regex.test(val) ||
        ipv6Regex.test(val) ||
        val === 'unknown' ||
        val === '127.0.0.1' ||
        val === '::1',
      'Invalid IP address format',
    )
    .nullable()
    .optional(),
  status: auditStatusEnum.default('Success').optional(),
  statusCode: z.number().int().min(100).max(599).nullable().optional(),
  durationMs: z.number().min(0).nullable().optional(),
  details: z.string().trim().max(2000).nullable().optional(),
  diffPayload: z.record(z.string(), z.unknown()).nullable().optional(),
  oldValue: z.record(z.string(), z.unknown()).nullable().optional(),
  newValue: z.record(z.string(), z.unknown()).nullable().optional(),
  userAgent: z.string().trim().max(500).nullable().optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  action: z.string().trim().optional(),
  severity: z.string().trim().optional(),
  status: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  userId: uuidSchema.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

export type LogEventInput = z.infer<typeof logEventSchema>;
export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
