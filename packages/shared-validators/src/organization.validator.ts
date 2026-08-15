import { z } from 'zod';
import { emailSchema } from './common.validator';

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(50),
  taxId: z.string().max(50).optional(),
  email: emailSchema.optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(255).optional(),
  website: z.string().max(255).optional(),
  status: z.string().default('ACTIVE'),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
  code: z.string().min(1, 'Department code is required').max(50),
  description: z.string().max(255).optional(),
  organizationId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  managerName: z.string().max(100).optional(),
  managerEmail: emailSchema.optional().or(z.literal('')),
  status: z.string().default('ACTIVE'),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createPositionSchema = z.object({
  title: z.string().min(1, 'Position title is required').max(100),
  code: z.string().min(1, 'Position code is required').max(50),
  description: z.string().max(255).optional(),
  departmentId: z.string().optional(),
  level: z.string().default('Mid'),
  status: z.string().default('ACTIVE'),
});

export const updatePositionSchema = createPositionSchema.partial();
