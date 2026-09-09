import { AccountStatus, DirectorySource } from '@uims/shared-types';
import { z } from 'zod';
import { emailSchema } from './common.validator';

export const createDirectoryUserSchema = z.object({
  employeeCode: z.string().max(50).trim().optional(),
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required').max(50).trim(),
  lastName: z.string().min(1, 'Last name is required').max(50).trim(),
  displayName: z.string().max(100).trim().optional(),
  jobTitle: z.string().max(100).trim().optional(),
  company: z.string().max(100).trim().optional(),
  groupCompany: z.string().max(100).trim().optional(),
  plant: z.string().max(100).trim().optional(),
  department: z.string().max(100).trim().optional(),
  section: z.string().max(100).trim().optional(),
  subSection: z.string().max(100).trim().optional(),
  telephone: z.string().max(50).trim().optional(),
  phone: z.string().max(50).trim().optional(),
  avatar: z.string().nullable().optional(),
  computerName: z.string().max(100).trim().optional(),
  computerName2: z.string().max(100).trim().optional(),
  adGroup: z.string().max(100).trim().optional(),
  ouPath: z.string().max(255).trim().optional(),
  managerName: z.string().max(100).trim().optional(),
  source: z.nativeEnum(DirectorySource).default(DirectorySource.LOCAL),
  status: z.nativeEnum(AccountStatus).default(AccountStatus.ACTIVE),
  isClosed: z.boolean().default(false),
  accountExpiresAt: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

export const updateDirectoryUserSchema = createDirectoryUserSchema.partial();

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
