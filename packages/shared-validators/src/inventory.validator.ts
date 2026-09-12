import { z } from 'zod';
import { uuidSchema } from './common.validator';

export const createInventoryCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).nullable().optional(),
});

export const updateInventoryCategorySchema = createInventoryCategorySchema.partial();

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(150),
  sku: z.string().max(100).optional(),
  categoryId: uuidSchema,
  quantity: z.number().int().min(0).default(0),
  minThreshold: z.number().int().min(0).default(5),
  unitCost: z.number().min(0).default(0),
  locationId: uuidSchema.nullable().optional(),
  binNumber: z.string().max(50).nullable().optional(),
  supplier: z.string().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const restockInventorySchema = z.object({
  quantity: z.number().int().positive('Restock quantity must be greater than 0'),
});

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  categoryId: uuidSchema.optional(),
  category: z.string().optional(),
  locationId: uuidSchema.optional(),
  location: z.string().optional(),
  organizationId: uuidSchema.optional(),
  organization: z.string().optional(),
  stockStatus: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).optional(),
});
