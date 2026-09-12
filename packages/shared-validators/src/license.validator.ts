import { LicenseStatus, LicenseType } from '@uims/shared-types';
import { z } from 'zod';
import { dateSchema, uuidSchema } from './common.validator';

export const createLicenseSchema = z.object({
  name: z.string().min(1, 'License name is required').max(100),
  vendor: z.string().max(100).optional(),
  publisher: z.string().max(100).optional(),
  licenseKey: z.string().max(255).nullable().optional(),
  key: z.string().max(255).nullable().optional(),
  type: z.union([z.nativeEnum(LicenseType), z.string()]).default(LicenseType.SUBSCRIPTION),
  status: z.union([z.nativeEnum(LicenseStatus), z.string()]).default(LicenseStatus.ACTIVE),
  totalSeats: z.union([z.number().int().min(1, 'Total seats must be at least 1'), z.string()]),
  costPerSeat: z
    .union([z.number().min(0), z.string()])
    .nullable()
    .optional(),
  cost: z
    .union([z.number().min(0), z.string()])
    .nullable()
    .optional(),
  purchaseDate: dateSchema.nullable().optional(),
  expiryDate: dateSchema.nullable().optional(),
  autoRenew: z.boolean().default(true),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateLicenseSchema = createLicenseSchema.partial();

export const assignUserLicenseSchema = z.object({
  userId: uuidSchema.optional(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
});

export const batchAssignUserLicenseSchema = z.object({
  userIds: z.array(uuidSchema).min(1, 'At least one user ID is required'),
});

export const licenseQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  vendor: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
});
