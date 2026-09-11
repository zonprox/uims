import type { Location } from './common';

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  category?: InventoryCategory | null;
  quantity: number;
  minThreshold: number;
  unitCost: number;
  locationId?: string | null;
  location?: Location | null;
  binNumber?: string | null;
  supplier?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
