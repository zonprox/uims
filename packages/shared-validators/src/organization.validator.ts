import { z } from 'zod';
import { emailSchema, phoneSchema, urlSchema, uuidSchema } from './common.validator';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required').max(100),
  code: z.string().trim().min(1, 'Organization code is required').max(50),
  taxId: z.string().trim().max(50).nullable().optional(),
  email: emailSchema.nullable().optional(),
  phone: phoneSchema.nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  website: urlSchema.nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  parentId: uuidSchema.nullable().optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(100),
  code: z.string().trim().min(1, 'Department code is required').max(50),
  description: z.string().trim().max(255).nullable().optional(),
  organizationId: uuidSchema.nullable().optional(),
  parentId: uuidSchema.nullable().optional(),
  managerName: z.string().trim().max(100).nullable().optional(),
  managerEmail: emailSchema.nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createPositionSchema = z.object({
  title: z.string().trim().min(1, 'Position title is required').max(100),
  code: z.string().trim().min(1, 'Position code is required').max(50),
  description: z.string().trim().max(255).nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  level: z.string().trim().max(50).default('Mid'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const updatePositionSchema = createPositionSchema.partial();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
