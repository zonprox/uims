import { AssetStatus } from '@uims/shared-types';
import { z } from 'zod';
import { currencySchema, dateSchema, normalizedEnum, uuidSchema } from './common.validator';

// ==========================================
// ASSET STATUS ENUM & SYNONYMS
// ==========================================

export const assetStatusSynonyms: Record<string, AssetStatus> = {
  ACTIVE: AssetStatus.IN_USE,
  IN_REPAIR: AssetStatus.MAINTENANCE,
  IN_STORAGE: AssetStatus.AVAILABLE,
  DISPOSED: AssetStatus.LOST,
};

export const assetStatusSchema = normalizedEnum(AssetStatus, assetStatusSynonyms);

// ==========================================
// COST CENTER & CATEGORY SCHEMAS
// ==========================================

export const createCostCenterSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Cost center code is required')
    .max(50, 'Cost center code cannot exceed 50 characters')
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Cost center code must contain only alphanumeric characters, underscores, or hyphens',
    ),
  name: z
    .string()
    .trim()
    .min(1, 'Cost center name is required')
    .max(100, 'Cost center name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .nullable()
    .optional(),
});

export const updateCostCenterSchema = createCostCenterSchema.partial();

export const createAssetCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(500).nullable().optional(),
  parentId: uuidSchema.nullable().optional(),
});

export const updateAssetCategorySchema = createAssetCategorySchema.partial();

// ==========================================
// MASTER CATALOG: DEVICE MODEL SCHEMAS
// ==========================================

export const createDeviceModelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Model name is required')
    .max(100, 'Model name cannot exceed 100 characters'),
  modelCode: z
    .string()
    .trim()
    .min(1, 'Model code is required')
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Model code must contain only alphanumeric characters, underscores, or hyphens',
    )
    .max(50, 'Model code cannot exceed 50 characters'),
  categoryId: z.string().trim().min(1, 'Category ID is required').max(100),
  manufacturer: z.string().trim().min(1, 'Manufacturer is required').max(100),
  vendorId: uuidSchema.nullable().optional(),
  specifications: z
    .union([
      z.record(z.string(), z.unknown()),
      z.string().max(2000, 'Specifications cannot exceed 2000 characters'),
    ])
    .nullable()
    .optional(),
  unitCost: currencySchema.optional(),
  minThreshold: z.coerce.number().int().min(0, 'Minimum threshold cannot be negative').default(5),
  binLocation: z.string().trim().max(100).nullable().optional(),
  binNumber: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const updateDeviceModelSchema = z.object({
  name: z.string().trim().min(1, 'Model name is required').max(100).optional(),
  modelCode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Model code must contain only alphanumeric characters, underscores, or hyphens',
    )
    .max(50)
    .optional(),
  categoryId: z.string().trim().max(100).optional(),
  manufacturer: z.string().trim().max(100).optional(),
  vendorId: uuidSchema.nullable().optional(),
  specifications: z
    .union([z.record(z.string(), z.unknown()), z.string()])
    .nullable()
    .optional(),
  unitCost: currencySchema.optional(),
  minThreshold: z.coerce.number().int().min(0).optional(),
  binLocation: z.string().trim().max(100).nullable().optional(),
  binNumber: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

// ==========================================
// PHYSICAL UNIT (STRICT deviceModelId REQUIRED)
// ==========================================

export const registerPhysicalUnitSchema = z.object({
  deviceModelId: z.string().trim().min(1, 'Device model ID is required'),
  subcode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Subcode must contain only alphanumeric characters, underscores, or hyphens',
    )
    .max(50, 'Subcode cannot exceed 50 characters')
    .optional(),
  assetTag: z.string().trim().max(100).optional(),
  serialNumber: z.string().max(100).nullable().optional(),
  costCenterId: uuidSchema.nullable().optional(),
  departmentId: uuidSchema.nullable().optional(),
  purchaseDate: dateSchema.nullable().optional(),
  warrantyExpiry: dateSchema.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: assetStatusSchema.optional(),
});

export const updatePhysicalUnitSchema = registerPhysicalUnitSchema.partial();

// ==========================================
// WAREHOUSE INTAKE & CUSTODY WORKFLOW SCHEMAS
// ==========================================

export const stockIntakeUnitSchema = z.object({
  serialNumber: z.string().trim().max(100).optional(),
  assetTag: z.string().trim().max(100).optional(),
  subcode: z.string().trim().max(50).optional(),
  costCenterId: uuidSchema.nullable().optional(),
  purchaseDate: dateSchema.nullable().optional(),
  warrantyExpiry: dateSchema.nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const stockIntakeSchema = z
  .object({
    deviceModelId: z.string().trim().min(1, 'Device model ID is required'),
    count: z.coerce.number().int().min(1, 'Count must be at least 1').max(500).optional(),
    tagPrefix: z.string().trim().max(20).optional(),
    startSequence: z.coerce.number().int().min(1).optional(),
    serialNumbers: z.array(z.string().trim().max(100)).optional(),
    units: z
      .array(stockIntakeUnitSchema)
      .min(1, 'At least one physical unit is required')
      .optional(),
    purchaseDate: dateSchema.nullable().optional(),
    warrantyExpiry: dateSchema.nullable().optional(),
    costCenterId: uuidSchema.nullable().optional(),
    initialBinLocation: z.string().trim().max(100).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    (data) => data.count !== undefined || (data.units !== undefined && data.units.length > 0),
    {
      message: 'Either count or non-empty units array must be provided',
    },
  );

export const batchStockIntakeSchema = stockIntakeSchema;

export const allocateAssetSchema = z.object({
  assetIds: z.array(uuidSchema).min(1, 'At least one asset ID is required'),
  assignedToId: uuidSchema,
  departmentId: z.string().trim().optional(),
  costCenterId: uuidSchema.nullable().optional(),
  conditionNotes: z.string().trim().max(1000).optional(),
  signedDocUrl: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const returnAssetSchema = z.object({
  assetIds: z.array(uuidSchema).min(1, 'At least one asset ID is required'),
  targetStatus: z.enum(['AVAILABLE', 'MAINTENANCE', 'RETIRED']),
  signedDocUrl: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
  inspectionNotes: z.string().trim().max(1000).optional(),
});

export const transferAssetSchema = z.object({
  assetIds: z.array(uuidSchema).min(1, 'At least one asset ID is required'),
  toUserId: uuidSchema,
  toDepartmentId: z.string().trim().optional(),
  transferReason: z.string().trim().max(1000).optional(),
  signedDocUrl: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
});

// ==========================================
// ASSET OPERATIONS & QUERIES
// ==========================================

export const issueAssetUnitSchema = z.object({
  assignedToId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const batchAssignAssetSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one asset ID is required'),
  assignedToId: uuidSchema.optional(),
  departmentId: z.string().trim().optional(),
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
  deviceModelId: z.string().optional(),
  departmentId: z.string().trim().optional(),
  assignedToId: uuidSchema.optional(),
  organizationId: uuidSchema.optional(),
  organization: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// ==========================================
// TYPE INFERENCES
// ==========================================

export type CreateCostCenterInput = z.infer<typeof createCostCenterSchema>;
export type UpdateCostCenterInput = z.infer<typeof updateCostCenterSchema>;
export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>;
export type CreateDeviceModelInput = z.infer<typeof createDeviceModelSchema>;
export type UpdateDeviceModelInput = z.infer<typeof updateDeviceModelSchema>;
export type RegisterPhysicalUnitInput = z.infer<typeof registerPhysicalUnitSchema>;
export type UpdatePhysicalUnitInput = z.infer<typeof updatePhysicalUnitSchema>;
export type StockIntakeUnitInput = z.infer<typeof stockIntakeUnitSchema>;
export type StockIntakeInput = z.infer<typeof stockIntakeSchema>;
export type AllocateAssetInput = z.infer<typeof allocateAssetSchema>;
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;
export type TransferAssetInput = z.infer<typeof transferAssetSchema>;
export type IssueAssetUnitInput = z.infer<typeof issueAssetUnitSchema>;
export type BatchAssignAssetInput = z.infer<typeof batchAssignAssetSchema>;
export type BatchDeleteAssetInput = z.infer<typeof batchDeleteAssetSchema>;
export type AssetQueryInput = z.infer<typeof assetQuerySchema>;
