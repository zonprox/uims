import { UserStatus } from '@uims/shared-types';
import { z } from 'zod';
import { emailSchema } from './common.validator';

export const createAppUserSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  displayName: z.string().max(100).optional(),
  roleId: z.string().optional(),
  roleName: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  avatar: z.string().nullable().optional(),
  phone: z.string().max(50).optional(),
  isLocked: z.boolean().optional(),
});

export const updateAppUserSchema = createAppUserSchema.partial();

export const toggleAppUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export const resetAppUserPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

// Backward-compatible exports
export const createUserSchema = createAppUserSchema.extend({
  employeeCode: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  groupCompany: z.string().optional(),
  plant: z.string().optional(),
  section: z.string().optional(),
  subSection: z.string().optional(),
  computerName: z.string().optional(),
  computerName2: z.string().optional(),
  adGroup: z.string().optional(),
  telephone: z.string().optional(),
  isClosed: z.boolean().optional(),
  ouPath: z.string().optional(),
  managerName: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  organizationId: z.string().optional(),
  locationId: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial();
export const toggleUserStatusSchema = toggleAppUserStatusSchema;
