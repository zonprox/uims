import type { AssetStatus } from '../entities/asset';

export interface CreateAssetDto {
  name: string;
  assetCode?: string;
  subcode?: string;
  assetTag?: string;
  tag?: string;
  description?: string | null;
  manufacturer?: string;
  model?: string;
  serialNumber?: string | null;
  specifications?: string | null;
  unitCost?: number | null;
  parentId?: string | null;
  costCenterId?: string | null;
  category?: string;
  categoryId?: string;
  departmentId?: string;
  assignedToId?: string;
  status?: string | AssetStatus;
  purchaseDate?: string | Date;
  warrantyExpiry?: string | Date;
  notes?: string;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {}

export interface CreateDeviceModelDto {
  assetCode: string;
  name: string;
  manufacturer?: string;
  model?: string;
  categoryId?: string;
  specifications?: string;
  unitCost?: number;
  notes?: string;
}

export interface UpdateDeviceModelDto extends Partial<CreateDeviceModelDto> {}

export interface CreateAssetUnitDto {
  subcode: string;
  parentId: string;
  serialNumber?: string;
  costCenterId?: string;
  departmentId?: string;
  purchaseDate?: string | Date;
  warrantyExpiry?: string | Date;
  notes?: string;
}
export type RegisterPhysicalUnitDto = CreateAssetUnitDto;

export interface UpdateAssetUnitDto {
  subcode?: string;
  serialNumber?: string;
  costCenterId?: string;
  departmentId?: string;
  purchaseDate?: string | Date;
  warrantyExpiry?: string | Date;
  notes?: string;
  status?: string | AssetStatus;
}
export type UpdatePhysicalUnitDto = UpdateAssetUnitDto;

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
  parentId?: string;
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
}

export interface BatchAssignAssetResultDto {
  count: number;
  assignedIds: string[];
}
