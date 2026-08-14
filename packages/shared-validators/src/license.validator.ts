import { LicenseStatus, LicenseType } from '@uims/shared-types';
import { z } from 'zod';
import { dateSchema } from './common.validator';

export const createLicenseSchema = z.object({
  name: z.string().min(1, 'License name is required').max(100),
  publisher: z.string().min(1, 'Publisher is required').max(100),
  type: z.nativeEnum(LicenseType),
  status: z.nativeEnum(LicenseStatus).default(LicenseStatus.ACTIVE),
  totalSeats: z.number().int().min(1),
  cost: z.number().min(0).nullable().optional(),
  purchaseDate: dateSchema.nullable().optional(),
  expiryDate: dateSchema.nullable().optional(),
  key: z.string().max(255).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateLicenseSchema = createLicenseSchema.partial();
