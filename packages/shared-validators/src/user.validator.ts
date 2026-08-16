import { DirectorySource, UserStatus } from '@uims/shared-types';
import { z } from 'zod';
import { emailSchema } from './common.validator';

export const createUserSchema = z.object({
  username: z.string().min(1).max(100).optional(),
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  displayName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  source: z.nativeEnum(DirectorySource).optional(),
  adInitialPassword: z.string().optional(),
  roleId: z.string().optional(),
  roleName: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  avatar: z.string().nullable().optional(),
  phone: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  organizationId: z.string().optional(),
  locationId: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const toggleUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});
