import { LicenseStatus, LicenseType } from '@uims/shared-types';
import { z } from 'zod';
import { currencySchema, dateSchema, emailSchema, normalizedEnum, uuidSchema } from './common.validator';

export const licenseTypeSynonyms: Record<string, LicenseType> = {
  OPENSOURCE: LicenseType.OPEN_SOURCE,
};

export const licenseStatusSynonyms: Record<string, LicenseStatus> = {
  EXPIRING: LicenseStatus.EXPIRING_SOON,
};

export const licenseTypeSchema = normalizedEnum(LicenseType, licenseTypeSynonyms);
export const licenseStatusSchema = normalizedEnum(LicenseStatus, licenseStatusSynonyms);

export const createLicenseSchema = z.object({
  name: z.string().trim().min(1, 'License name is required').max(100),
  vendor: z.string().trim().max(100).optional(),
  publisher: z.string().trim().max(100).optional(),
  vendorId: uuidSchema.nullable().optional(),
  licenseKey: z.string().trim().max(255).nullable().optional(),
  key: z.string().trim().max(255).nullable().optional(),
  type: licenseTypeSchema.default(LicenseType.SUBSCRIPTION),
  status: licenseStatusSchema.default(LicenseStatus.ACTIVE),
  totalSeats: z.coerce
    .number({ message: 'Total seats must be a number' })
    .int('Total seats must be an integer')
    .min(1, 'Total seats must be at least 1')
    .max(1_000_000, 'Total seats cannot exceed 1,000,000'),
  costPerSeat: currencySchema.nullable().optional(),
  cost: currencySchema.nullable().optional(),
  purchaseDate: dateSchema.nullable().optional(),
  expiryDate: dateSchema.nullable().optional(),
  autoRenew: z.boolean().default(true),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateLicenseSchema = createLicenseSchema.partial();

export const assignUserLicenseSchema = z
  .object({
    userId: uuidSchema.optional(),
    name: z.string().trim().max(100).optional(),
    email: emailSchema.optional(),
    department: z.string().trim().max(100).optional(),
  })
  .refine((data) => !!data.userId || !!data.email, {
    message: 'Either userId or email must be provided to assign a license',
    path: ['email'],
  });

export const batchAssignUserLicenseSchema = z.object({
  userIds: z
    .array(uuidSchema)
    .min(1, 'At least one user ID is required')
    .max(500, 'Cannot batch assign more than 500 users at once')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Duplicate user IDs are not allowed in batch assignment',
    }),
});

export const batchAssignLicensesToUserSchema = z.object({
  licenseIds: z
    .array(uuidSchema)
    .min(1, 'At least one license ID is required')
    .max(500, 'Cannot batch assign more than 500 licenses at once')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Duplicate license IDs are not allowed in batch assignment',
    }),
  userId: uuidSchema,
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

export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>;
export type AssignUserLicenseInput = z.infer<typeof assignUserLicenseSchema>;
export type BatchAssignUserLicenseInput = z.infer<typeof batchAssignUserLicenseSchema>;
export type BatchAssignLicensesToUserInput = z.infer<typeof batchAssignLicensesToUserSchema>;
export type LicenseQueryInput = z.infer<typeof licenseQuerySchema>;
