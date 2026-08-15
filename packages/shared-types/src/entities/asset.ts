import type { Location } from './common';

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
  LOST = 'LOST',
}

export interface AssetCategory {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  category?: AssetCategory | null;
  status: AssetStatus;
  serialNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  assignedToId?: string | null;
  locationId?: string | null;
  location?: Location | null;
  specs?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  action: string;
  changedBy: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  timestamp: string;
}
