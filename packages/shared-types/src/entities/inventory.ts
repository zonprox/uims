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
  organizationId?: string | null;
  organization?: string | null;
  binNumber?: string | null;
  supplier?: string | null;
  status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | string;
  statusLabel?: string;
  statusTag?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
