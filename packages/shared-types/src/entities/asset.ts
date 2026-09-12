import type { Location } from './common';
import type { DirectoryUser } from './directory';
import type { IPAddress } from './network';
import type { Department } from './organization';

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
  code?: string;
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
  status: AssetStatus | `${AssetStatus}` | string;
  serialNumber?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  assignedToId?: string | null;
  assignedTo?: DirectoryUser | null;
  assignedUser?: string;
  assignedEmail?: string;
  departmentId?: string | null;
  department?: Department | null;
  locationId?: string | null;
  location?: Location | null;
  locationPath?: string;
  organizationId?: string | null;
  organization?: string | null;
  ipAddresses?: IPAddress[];
  specs?: Record<string, unknown> | null;
  notes?: string | null;
  // UI legacy aliases
  tag?: string;
  purchasePrice?: number | null;
  createdAt: string;
  updatedAt: string;
}
