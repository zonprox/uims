import { UserStatus } from '@uims/shared-types';
import { z } from 'zod';
import { emailSchema, phoneSchema, uuidSchema } from './common.validator';

export const usernameRegex = /^[a-zA-Z0-9._-]+$/;

export const createAppUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .regex(
      usernameRegex,
      'Username can only contain alphanumeric characters, dots, hyphens, and underscores',
    ),
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .optional(),
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  displayName: z.string().trim().max(100).optional(),
  roleId: uuidSchema.nullable().optional(),
  roleName: z.string().trim().max(50).optional(),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE).optional(),
  avatar: z.string().trim().nullable().optional(),
  phone: phoneSchema.nullable().optional(),
  isLocked: z.boolean().default(false).optional(),
  mustChangePassword: z.boolean().default(false).optional(),
});

export const updateAppUserSchema = createAppUserSchema.partial();

export const toggleAppUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export const resetAppUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
});

export const appUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  roleId: uuidSchema.optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type CreateAppUserInput = z.infer<typeof createAppUserSchema>;
export type UpdateAppUserInput = z.infer<typeof updateAppUserSchema>;
export type ToggleAppUserStatusInput = z.infer<typeof toggleAppUserStatusSchema>;
export type ResetAppUserPasswordInput = z.infer<typeof resetAppUserPasswordSchema>;
export type AppUserQueryInput = z.infer<typeof appUserQuerySchema>;
