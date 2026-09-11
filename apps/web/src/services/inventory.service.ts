import { api } from './api';
import type { LocationBranch } from './organization.service';
import type { Vendor } from './vendor.service';

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId?: string | null;
  category?: InventoryCategory | string | null;
  quantity: number;
  minThreshold: number;
  unitCost: number;
  locationId?: string | null;
  location?: (LocationBranch & { fullPath?: string | null }) | string | null;
  locationName?: string;
  locationPath?: string;
  organizationId?: string | null;
  organization?: string | null;
  binNumber?: string;
  supplier?: string;
  vendorId?: string | null;
  vendor?: Vendor | null;
  notes?: string;
}

export interface InventoryStats {
  totalSkus: number;
  totalUnits: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export const inventoryService = {
  getItems: async (params?: {
    search?: string;
    category?: string;
    categoryId?: string;
    stockStatus?: string;
    organizationId?: string;
    organization?: string;
    locationId?: string;
  }): Promise<Array<InventoryItem>> => {
    const res = await api.get('/inventory', { params });
    return res.data.data;
  },
  getItem: async (id: string): Promise<InventoryItem> => {
    const res = await api.get(`/inventory/${id}`);
    return res.data.data;
  },
  getCategories: async (): Promise<Array<InventoryCategory>> => {
    try {
      const res = await api.get('/inventory/categories');
      return res.data.data;
    } catch (_error: unknown) {
      return [
        { id: 'cat-1', name: 'Cables & Adapters', description: 'Patch cables and adapters' },
        { id: 'cat-2', name: 'Peripherals', description: 'Mice, keyboards, headsets' },
        { id: 'cat-3', name: 'Storage & RAM', description: 'SSDs, HDDs, RAM sticks' },
        { id: 'cat-4', name: 'Power & Battery', description: 'Chargers, power strips, UPS' },
        { id: 'cat-5', name: 'Tooling', description: 'Crimpers, testers, screwdrivers' },
        { id: 'cat-6', name: 'General Supplies', description: 'Zip ties, thermal paste, cleaning' },
      ];
    }
  },
  createItem: async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const res = await api.post('/inventory', data);
    return res.data.data;
  },
  updateItem: async (id: string, data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const res = await api.patch(`/inventory/${id}`, data);
    return res.data.data;
  },
  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },
  restockItem: async (id: string, quantity: number): Promise<InventoryItem> => {
    const res = await api.post(`/inventory/${id}/restock`, { quantity });
    return res.data.data;
  },
  getStats: async (): Promise<InventoryStats> => {
    const res = await api.get('/inventory/stats');
    return res.data.data;
  },
};
