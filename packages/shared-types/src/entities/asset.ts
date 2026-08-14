import { Location } from './common';

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED',
}

export interface AssetCategory {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  description: string | null;
  status: AssetStatus;
  categoryId: string;
  category?: AssetCategory;
  locationId: string | null;
  location?: Location;
  assignedToId: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  warrantyExpiry: string | null;
  serialNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  action: string;
  userId: string;
  details: Record<string, any>;
  createdAt: string;
}
