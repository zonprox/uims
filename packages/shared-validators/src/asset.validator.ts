import { AssetStatus } from '@uims/shared-types';
import { z } from 'zod';
import { currencySchema, dateSchema, normalizedEnum, uuidSchema } from './common.validator';

// Asset status synonyms mapping UI labels to authoritative Prisma enums
export const assetStatusSynonyms: Record<string, AssetStatus> = {
  ACTIVE: AssetStatus.IN_USE,
  IN_REPAIR: AssetStatus.MAINTENANCE,
  IN_STORAGE: AssetStatus.AVAILABLE,
  DISPOSED: AssetStatus.LOST,
};

export const assetStatusSchema = normalizedEnum(AssetStatus, assetStatusSynonyms);

export const createAssetSchema = z.object({
  name: z.string().trim().min(1, 'Asset name is required').max(100),
  assetCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]+$/, 'Asset code must contain only alphanumeric characters, underscores, or hyphens')
    .max(50, 'Asset code cannot exceed 50 characters')
    .optional(),
  subcode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]+$/, 'Subcode must contain only alphanumeric characters, underscores, or hyphens')
    .max(50, 'Subcode cannot exceed 50 characters')
    .optional(),
  assetTag: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  categoryId: z.string().trim().max(100).nullable().optional(),
  category: z.string().trim().max(100).optional(),
  costCenterId: uuidSchema.nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  assignedToId: uuidSchema.nullable().optional(),
  vendorId: uuidSchema.nullable().optional(),
  parentId: uuidSchema.nullable().optional(),
  status: assetStatusSchema.default(AssetStatus.AVAILABLE),
  serialNumber: z.string().max(100).nullable().optional(),
  model: z.string().trim().max(100).nullable().optional(),
  manufacturer: z.string().trim().max(100).nullable().optional(),
  specifications: z.string().trim().max(2000, 'Specifications cannot exceed 2000 characters').nullable().optional(),
  unitCost: currencySchema.nullable().optional(),
  purchaseDate: dateSchema.nullable().optional(),
  warrantyExpiry: dateSchema.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const createCostCenterSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Cost center code is required')
    .max(50, 'Cost center code cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Cost center code must contain only alphanumeric characters, underscores, or hyphens'),
  name: z
    .string()
    .trim()
    .min(1, 'Cost center name is required')
    .max(100, 'Cost center name cannot exceed 100 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').nullable().optional(),
});

export const updateCostCenterSchema = createCostCenterSchema.partial();

export const createAssetCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).nullable().optional(),
  parentId: uuidSchema.nullable().optional(),
});

export const updateAssetCategorySchema = createAssetCategorySchema.partial();

export const createDeviceModelSchema = z.object({
  assetCode: z
    .string()
    .trim()
    .min(1, 'Model asset code is required')
    .max(50, 'Model asset code cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Asset code must contain only alphanumeric characters, underscores, or hyphens'),
  name: z
    .string()
    .trim()
    .min(1, 'Model name is required')
    .max(100, 'Model name cannot exceed 100 characters'),
  manufacturer: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  categoryId: z.string().trim().max(100).optional(),
  specifications: z.string().trim().max(2000).optional(),
  unitCost: currencySchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const updateDeviceModelSchema = createDeviceModelSchema.partial();

export const createAssetUnitSchema = z.object({
  subcode: z
    .string()
    .trim()
    .min(1, 'Unit subcode is required')
    .max(50, 'Unit subcode cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Subcode must contain only alphanumeric characters, underscores, or hyphens'),
  parentId: uuidSchema,
  serialNumber: z.string().max(100).nullable().optional(),
  costCenterId: uuidSchema.nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  purchaseDate: dateSchema.nullable().optional(),
  warrantyExpiry: dateSchema.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateAssetUnitSchema = createAssetUnitSchema.partial();

export const issueAssetUnitSchema = z.object({
  assignedToId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const batchAssignAssetSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one asset ID is required'),
  assignedToId: uuidSchema.optional(),
  departmentId: uuidSchema.optional(),
});

export const batchDeleteAssetSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one asset ID is required'),
});

export const assetQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  categoryId: z.string().max(100).optional(),
  category: z.string().optional(),
  departmentId: uuidSchema.optional(),
  assignedToId: uuidSchema.optional(),
  organizationId: uuidSchema.optional(),
  organization: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type CreateCostCenterInput = z.infer<typeof createCostCenterSchema>;
export type UpdateCostCenterInput = z.infer<typeof updateCostCenterSchema>;
export type CreateDeviceModelInput = z.infer<typeof createDeviceModelSchema>;
export type UpdateDeviceModelInput = z.infer<typeof updateDeviceModelSchema>;
export type CreateAssetUnitInput = z.infer<typeof createAssetUnitSchema>;
export type UpdateAssetUnitInput = z.infer<typeof updateAssetUnitSchema>;
export type IssueAssetUnitInput = z.infer<typeof issueAssetUnitSchema>;
export type BatchAssignAssetInput = z.infer<typeof batchAssignAssetSchema>;
export type BatchDeleteAssetInput = z.infer<typeof batchDeleteAssetSchema>;
export type AssetQueryInput = z.infer<typeof assetQuerySchema>;
