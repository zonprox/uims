import type { AssetStatus } from '../entities/asset';

export interface CreateDeviceModelDto {
  name: string;
  modelCode: string;
  assetCode?: string;
  categoryId: string;
  manufacturer: string;
  model?: string;
  vendorId?: string;
  specifications?: Record<string, unknown> | string;
  unitCost?: number;
  minThreshold?: number;
  binNumber?: string;
  binLocation?: string;
  notes?: string;
}

export interface UpdateDeviceModelDto extends Partial<CreateDeviceModelDto> {}

export type {
  StockIntakeDto,
  BatchStockIntakeDto,
  AllocateAssetDto,
  ReturnAssetDto,
  TransferAssetDto,
  RegisterPhysicalUnitDto,
  CreateAssetUnitDto,
  UpdatePhysicalUnitDto,
  UpdateAssetUnitDto,
} from '../assets';

export interface IssueAssetUnitDto {
  assignedToId?: string;
  userId?: string;
  notes?: string;
}

export interface CreateCostCenterDto {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateCostCenterDto extends Partial<CreateCostCenterDto> {}

export interface AssetResponseDto extends Record<string, unknown> {
  id: string;
  assetCode?: string | null;
  subcode?: string | null;
  assetTag: string;
  name: string;
  status: string;
  totalUnits?: number;
  availableUnits?: number;
  inUseUnits?: number;
}

export interface AssetQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  type?: 'model' | 'unit' | 'all';
  deviceModelId?: string;
  costCenterId?: string;
  category?: string;
  categoryId?: string;
  departmentId?: string;
  assignedToId?: string;
  organizationId?: string;
  organization?: string;
  status?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AssetStatsDto {
  total: number;
  active: number;
  inRepair: number;
  inStorage: number;
  retired: number;
}

export interface BatchDeleteAssetDto {
  ids: string[];
}

export interface BatchDeleteResultDto {
  count: number;
  deletedIds: string[];
}

export interface BatchAssignAssetDto {
  assetIds: string[];
  assignedToId?: string | null;
  departmentId?: string | null;
  status?: string | AssetStatus;
  signedDocUrl?: string;
}

export interface BatchAssignAssetResultDto {
  count: number;
  assignedIds: string[];
}

export interface PendingHandoverSummaryDto {
  totalPending: number;
  pendingAssignments: number;
  pendingReturns: number;
  pendingTransfers: number;
  records: Array<{
    id: string;
    assetId: string;
    assetTag: string;
    serialNumber: string;
    modelName: string;
    type: 'ASSIGNMENT' | 'RETURN';
    recipientName: string;
    recipientEmail: string;
    createdAt: string;
  }>;
}

export interface GenerateHandoverDocumentDto {
  type: 'assignment' | 'return';
  assetIds?: string[];
  recipientId?: string;
  conditionNotes?: string;
}

export interface HandoverDocumentResultDto {
  html: string;
  title: string;
  filename: string;
  generatedAt: string;
}

export interface UploadHandoverDocumentResultDto {
  fileUrl: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
}
