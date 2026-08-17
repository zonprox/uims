import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must not exceed 50 characters')
    .trim(),
  description: z.string().max(255, 'Description must not exceed 255 characters').optional(),
  permissionIds: z.array(z.string().uuid('Invalid permission ID format')).optional(),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must not exceed 50 characters')
    .trim()
    .optional(),
  description: z.string().max(255, 'Description must not exceed 255 characters').optional(),
  permissionIds: z.array(z.string().uuid('Invalid permission ID format')).optional(),
});

export const cloneRoleSchema = z.object({
  targetRoleName: z
    .string()
    .min(2, 'Target role name must be at least 2 characters')
    .max(50, 'Target role name must not exceed 50 characters')
    .trim(),
  description: z.string().max(255, 'Description must not exceed 255 characters').optional(),
});

export const syncRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid('Invalid permission ID format')),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CloneRoleInput = z.infer<typeof cloneRoleSchema>;
export type SyncRolePermissionsInput = z.infer<typeof syncRolePermissionsSchema>;
