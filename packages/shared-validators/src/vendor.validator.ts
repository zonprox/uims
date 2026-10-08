import { z } from 'zod';
import { emailSchema, phoneSchema, urlSchema } from './common.validator';

export const createVendorSchema = z.object({
  name: z.string().trim().min(1, 'Vendor name is required').max(100),
  contactEmail: emailSchema.nullable().optional(),
  contactPhone: phoneSchema.nullable().optional(),
  website: urlSchema.nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const vendorQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type VendorQueryInput = z.infer<typeof vendorQuerySchema>;
