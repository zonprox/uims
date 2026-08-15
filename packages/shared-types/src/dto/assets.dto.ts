import type { AssetStatus } from '../entities/asset';

export interface CreateAssetDto {
  name: string;
  assetTag?: string;
  tag?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  category?: string;
  categoryId?: string;
  location?: string;
  locationId?: string;
  status?: string | AssetStatus;
  purchaseDate?: string | Date;
  purchaseCost?: number | string;
  purchasePrice?: number | string;
  warrantyExpiry?: string | Date;
  specs?: Record<string, unknown>;
  notes?: string;
  assignedToId?: string;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {}

export interface AssetQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  category?: string;
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
