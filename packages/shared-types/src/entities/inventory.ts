export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unitCost: number;
  location: string;
  binNumber?: string | null;
  supplier?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
