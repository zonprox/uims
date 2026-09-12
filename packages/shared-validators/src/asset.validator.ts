import { AssetStatus } from '@uims/shared-types';
import { z } from 'zod';
import { dateSchema, uuidSchema } from './common.validator';

export const createAssetSchema = z.object({
  name: z.string().min(1, 'Asset name is required').max(100),
  assetTag: z.string().max(100).optional(),
  tag: z.string().max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  categoryId: uuidSchema.nullable().optional(),
  category: z.string().max(100).optional(),
  locationId: uuidSchema.nullable().optional(),
  location: z.string().max(100).optional(),
  departmentId: uuidSchema.nullable().optional(),
  assignedToId: uuidSchema.nullable().optional(),
  status: z.union([z.nativeEnum(AssetStatus), z.string()]).optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  manufacturer: z.string().max(100).nullable().optional(),
  purchaseDate: dateSchema.nullable().optional(),
  purchaseCost: z
    .union([z.number().min(0), z.string()])
    .nullable()
    .optional(),
  purchasePrice: z
    .union([z.number().min(0), z.string()])
    .nullable()
    .optional(),
  warrantyExpiry: dateSchema.nullable().optional(),
  specs: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assetQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  categoryId: uuidSchema.optional(),
  category: z.string().optional(),
  locationId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
  assignedToId: uuidSchema.optional(),
  organizationId: uuidSchema.optional(),
  organization: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
