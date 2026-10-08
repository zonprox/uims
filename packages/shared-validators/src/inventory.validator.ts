import { z } from 'zod';
import { currencySchema, uuidSchema } from './common.validator';

export const skuRegex = /^[A-Za-z0-9._-]+$/;

export const createInventoryCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updateInventoryCategorySchema = createInventoryCategorySchema.partial();

export const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(150),
  sku: z
    .string()
    .trim()
    .regex(skuRegex, 'SKU must contain only alphanumeric characters, dots, underscores, or hyphens')
    .max(100, 'SKU cannot exceed 100 characters')
    .optional(),
  categoryId: uuidSchema,
  quantity: z.coerce
    .number({ message: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .min(0, 'Quantity cannot be negative')
    .max(1_000_000, 'Quantity cannot exceed 1,000,000')
    .default(0),
  minThreshold: z.coerce
    .number({ message: 'Minimum threshold must be a number' })
    .int('Minimum threshold must be an integer')
    .min(0, 'Minimum threshold cannot be negative')
    .max(100_000, 'Minimum threshold cannot exceed 100,000')
    .default(5),
  unitCost: currencySchema.default(0),
  binNumber: z.string().trim().max(50).nullable().optional(),
  supplier: z.string().trim().max(100).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const restockInventorySchema = z.object({
  quantity: z.coerce
    .number({ message: 'Restock quantity must be a number' })
    .int('Restock quantity must be an integer')
    .positive('Restock quantity must be greater than 0')
    .max(100_000, 'Restock quantity cannot exceed 100,000'),
  notes: z.string().trim().max(500).optional(),
});

export const adjustInventorySchema = z.object({
  quantity: z.coerce
    .number({ message: 'Adjusted quantity must be a number' })
    .int('Adjusted quantity must be an integer')
    .min(0, 'Quantity cannot be negative')
    .max(1_000_000, 'Quantity cannot exceed 1,000,000'),
  reason: z.string().trim().min(1, 'Adjustment reason is required').max(255),
  notes: z.string().trim().max(500).optional(),
});

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  categoryId: uuidSchema.optional(),
  category: z.string().optional(),
  organizationId: uuidSchema.optional(),
  organization: z.string().optional(),
  stockStatus: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).optional(),
});

export type CreateInventoryCategoryInput = z.infer<typeof createInventoryCategorySchema>;
export type UpdateInventoryCategoryInput = z.infer<typeof updateInventoryCategorySchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type RestockInventoryInput = z.infer<typeof restockInventorySchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
