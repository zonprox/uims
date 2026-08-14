import { AssetStatus } from '@uims/shared-types';
import { z } from 'zod';
import { dateSchema, uuidSchema } from './common.validator';

export const createAssetSchema = z.object({
  name: z.string().min(1, 'Asset name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  status: z.nativeEnum(AssetStatus),
  categoryId: uuidSchema,
  locationId: uuidSchema.nullable().optional(),
  assignedToId: uuidSchema.nullable().optional(),
  purchaseDate: dateSchema.nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  warrantyExpiry: dateSchema.nullable().optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateAssetSchema = createAssetSchema.partial().extend({
  tag: z.string().min(1).max(50).optional(), // Only modifiable in update or admin contexts
});
