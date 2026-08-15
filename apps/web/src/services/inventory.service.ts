import { api } from './api';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'Cables & Adapters' | 'Peripherals' | 'Storage & RAM' | 'Power & Battery' | 'Tooling';
  quantity: number;
  minThreshold: number;
  unitCost: number;
  location: string;
  binNumber: string;
  supplier: string;
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
    stockStatus?: string;
  }): Promise<Array<InventoryItem>> => {
    const res = await api.get('/inventory', { params });
    return res.data.data;
  },
  getItem: async (id: string): Promise<InventoryItem> => {
    const res = await api.get(`/inventory/${id}`);
    return res.data.data;
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
