import { AccountStatus, DirectorySource } from '@uims/shared-types';
import { z } from 'zod';
import { dateSchema, emailSchema, uuidSchema } from './common.validator';

export const createDirectoryUserSchema = z.object({
  employeeCode: z.string().max(50).trim().optional(),
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required').max(50).trim(),
  lastName: z.string().min(1, 'Last name is required').max(50).trim(),
  displayName: z.string().max(100).trim().optional(),
  phone: z.string().max(50).trim().optional(),
  avatar: z.string().nullable().optional(),
  ouPath: z.string().max(255).trim().optional(),
  managerName: z.string().max(100).trim().optional(),
  source: z.nativeEnum(DirectorySource).default(DirectorySource.LOCAL),
  status: z.nativeEnum(AccountStatus).default(AccountStatus.ACTIVE),
  accountExpiresAt: dateSchema.optional(),
  departmentId: uuidSchema.nullable().optional(),
  positionId: uuidSchema.nullable().optional(),
  organizationId: uuidSchema.nullable().optional(),
  locationId: uuidSchema.nullable().optional(),
});

export const updateDirectoryUserSchema = createDirectoryUserSchema.partial();

export const directoryUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  organizationId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  positionId: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  ouPath: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
});

export const createDirectoryGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100).trim(),
  email: emailSchema.optional(),
  description: z.string().max(255).trim().optional(),
  type: z.string().max(50).optional(),
  scope: z.string().max(50).optional(),
  ouPath: z.string().max(255).optional(),
  managedBy: z.string().max(100).optional(),
});

export const batchImportDirectoryItemSchema = z.object({
  stt: z.union([z.number(), z.string()]).optional(),
  employeeCode: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: emailSchema,
  designation: z.string().optional(),
  groupCompany: z.string().optional(),
  company: z.string().optional(),
  plant: z.string().optional(),
  department: z.string().optional(),
  section: z.string().optional(),
  subSection: z.string().optional(),
  telephone: z.string().optional(),
  computerName: z.string().optional(),
  computerName2: z.string().optional(),
  adGroup: z.string().optional(),
  ouPath: z.string().optional(),
  managerName: z.string().optional(),
  isClosed: z.union([z.boolean(), z.string()]).optional(),
  status: z.string().optional(),
});

export const batchImportDirectoryUsersSchema = z.object({
  users: z.array(batchImportDirectoryItemSchema),
});
