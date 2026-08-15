import { UserStatus } from '@uims/shared-types';
import { z } from 'zod';
import { emailSchema } from './common.validator';

export const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
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
