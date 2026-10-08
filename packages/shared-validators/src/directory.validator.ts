import { AccountStatus, DirectorySource, DomainJoinStatus } from '@uims/shared-types';
import { z } from 'zod';
import { dateSchema, emailSchema, phoneSchema, uuidSchema } from './common.validator';

export const createDirectoryUserSchema = z.object({
  employeeCode: z.string().trim().max(50).optional(),
  email: emailSchema,
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  displayName: z.string().trim().max(100).optional(),
  phone: phoneSchema.nullable().optional(),
  avatar: z.string().trim().nullable().optional(),
  managerName: z.string().trim().max(100).optional(),
  source: z.nativeEnum(DirectorySource).default(DirectorySource.LOCAL),
  status: z.nativeEnum(AccountStatus).default(AccountStatus.ACTIVE),
  accountExpiresAt: dateSchema.optional(),
  departmentId: uuidSchema.nullable().optional(),
  positionId: uuidSchema.nullable().optional(),
  organizationId: uuidSchema.nullable().optional(),

  // AD Metadata & Credentials
  adDomain: z.string().trim().max(100).optional(),
  computerName: z.string().trim().max(100).optional(),
  domainJoined: z.boolean().default(false),
  domainJoinStatus: z.nativeEnum(DomainJoinStatus).default(DomainJoinStatus.NOT_JOINED).optional(),
  emailPassword: z.string().min(8).max(128).optional(),
});

export const updateDirectoryUserSchema = createDirectoryUserSchema.partial();

export const resetEmailPasswordSchema = z.object({
  password: z.string().min(8).max(128).optional(),
  newPassword: z.string().min(8).max(128).optional(),
  generateRandom: z.boolean().optional(),
});

export const assignAssetSchema = z.object({
  assetId: uuidSchema,
});

export const assignLicenseSchema = z.object({
  licenseId: uuidSchema,
});

export const directoryUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  organizationId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  positionId: uuidSchema.optional(),
  source: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export const createDirectoryGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(100),
  email: emailSchema.nullable().optional(), // Distribution email per user request R1
  description: z.string().trim().max(500).nullable().optional(),
  type: z.string().trim().max(50).optional(),
  scope: z.string().trim().max(50).default('Internal Only').optional(),
  ouPath: z.string().trim().max(255).nullable().optional(), // Container / OU path per user request R1
  managedBy: z.string().trim().max(100).nullable().optional(),
  memberCount: z.coerce.number().int().min(0).default(0).optional(),
});

export const updateDirectoryGroupSchema = createDirectoryGroupSchema.partial();

export const manageGroupMembershipSchema = z.object({
  userId: uuidSchema,
  groupId: uuidSchema,
});

export const batchGroupMembershipSchema = z.object({
  userIds: z.array(uuidSchema).min(1, 'At least one user ID is required'),
});

export const batchImportDirectoryItemSchema = z.object({
  stt: z.union([z.number(), z.string()]).optional(),
  employeeCode: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Name is required'),
  email: emailSchema,
  designation: z.string().trim().optional(),
  groupCompany: z.string().trim().optional(),
  company: z.string().trim().optional(),
  plant: z.string().trim().optional(),
  department: z.string().trim().optional(),
  section: z.string().trim().optional(),
  subSection: z.string().trim().optional(),
  telephone: phoneSchema.optional(),
  computerName: z.string().trim().optional(),
  computerName2: z.string().trim().optional(),
  adGroup: z.string().trim().optional(),
  managerName: z.string().trim().optional(),
  isClosed: z.union([z.boolean(), z.string()]).optional(),
  status: z.string().trim().optional(),
});

export const batchImportDirectoryUsersSchema = z.object({
  users: z.array(batchImportDirectoryItemSchema),
});

export type CreateDirectoryUserInput = z.infer<typeof createDirectoryUserSchema>;
export type UpdateDirectoryUserInput = z.infer<typeof updateDirectoryUserSchema>;
export type ResetEmailPasswordInput = z.infer<typeof resetEmailPasswordSchema>;
export type AssignAssetInput = z.infer<typeof assignAssetSchema>;
export type AssignLicenseInput = z.infer<typeof assignLicenseSchema>;
export type DirectoryUserQueryInput = z.infer<typeof directoryUserQuerySchema>;
export type CreateDirectoryGroupInput = z.infer<typeof createDirectoryGroupSchema>;
export type UpdateDirectoryGroupInput = z.infer<typeof updateDirectoryGroupSchema>;
export type ManageGroupMembershipInput = z.infer<typeof manageGroupMembershipSchema>;
export type BatchGroupMembershipInput = z.infer<typeof batchGroupMembershipSchema>;
export type BatchImportDirectoryItemInput = z.infer<typeof batchImportDirectoryItemSchema>;
export type BatchImportDirectoryUsersInput = z.infer<typeof batchImportDirectoryUsersSchema>;
