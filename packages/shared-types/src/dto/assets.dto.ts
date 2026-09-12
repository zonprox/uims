import type { AssetStatus } from '../entities/asset';

export interface CreateAssetDto {
  name: string;
  assetTag?: string;
  tag?: string;
  description?: string | null;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  category?: string;
  categoryId?: string;
  location?: string;
  locationId?: string;
  departmentId?: string;
  assignedToId?: string;
  status?: string | AssetStatus;
  purchaseDate?: string | Date;
  purchaseCost?: number | string;
  purchasePrice?: number | string;
  warrantyExpiry?: string | Date;
  specs?: Record<string, unknown>;
  notes?: string;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {}

export interface AssetQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  category?: string;
  categoryId?: string;
  locationId?: string;
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
