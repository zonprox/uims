import { z } from 'zod';
import { UserStatus } from '@uims/shared-types';
import { emailSchema, uuidSchema } from './common.validator';

export const createUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  roleId: uuidSchema,
  status: z.nativeEnum(UserStatus).optional(),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  roleId: uuidSchema.optional(),
  status: z.nativeEnum(UserStatus).optional(),
  avatar: z.string().url('Invalid URL format').nullable().optional(),
});
