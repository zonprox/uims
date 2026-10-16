import type { BatchStockIntakeDto, DeviceModel } from '@uims/shared-types';
import { api } from './api';
import type { Vendor } from './vendor.service';

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryItem
  extends Omit<
    Partial<DeviceModel>,
    'categoryId' | 'category' | 'vendor' | 'specifications' | 'stockStatus'
  > {
  id: string;
  sku: string;
  modelCode?: string;
  name: string;
  categoryId?: string | null;
  category?: InventoryCategory | { id: string; name: string } | string | null;
  categoryName?: string;
  manufacturer?: string;
  quantity: number;
  totalUnits?: number;
  availableUnits?: number;
  assignedUnits?: number;
  inUseUnits?: number;
  maintenanceUnits?: number;
  minThreshold: number;
  unitCost: number;
  organizationId?: string | null;
  organization?: string | null;
  binNumber?: string;
  binLocation?: string | null;
  supplier?: string;
  vendorId?: string | null;
  vendor?: Vendor | null;
  notes?: string;
  specifications?: Record<string, unknown> | string | null;
  stockStatus?:
    | 'IN_STOCK'
    | 'LOW_STOCK'
    | 'OUT_OF_STOCK'
    | 'in_stock'
    | 'low_stock'
    | 'out_of_stock'
    | string;
  status?: string;
}

export interface InventoryStats {
  totalModels?: number;
  totalSkus: number;
  totalUnits: number;
  totalValuation: number;
  availableUnits?: number;
  assignedUnits?: number;
  inUseUnits?: number;
  maintenanceUnits?: number;
  inStockCount?: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export const inventoryService = {
  getModels: async (params?: {
    search?: string;
    category?: string;
    categoryId?: string;
    stockStatus?: string;
    organizationId?: string;
    organization?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Array<InventoryItem>> => {
    try {
      const res = await api.get('/assets/models', { params });
      const raw = res.data?.data ?? res.data;
      const rawList = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
      return rawList.map(
        (m: DeviceModel & { sku?: string; quantity?: number; binNumber?: string }) => ({
          ...m,
          sku: m.modelCode || m.sku || m.id,
          quantity: m.availableUnits ?? m.quantity ?? 0,
          binNumber: m.binLocation || m.binNumber || 'Unassigned',
        }),
      );
    } catch (_err: unknown) {
      const res = await api.get('/inventory', { params });
      return res.data?.data ?? res.data ?? [];
    }
  },

  getItems: async (params?: {
    search?: string;
    category?: string;
    categoryId?: string;
    stockStatus?: string;
    organizationId?: string;
    organization?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Array<InventoryItem>> => {
    try {
      const res = await api.get('/assets/models', { params });
      const raw = res.data?.data ?? res.data;
      const rawList = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
      return rawList.map(
        (m: DeviceModel & { sku?: string; quantity?: number; binNumber?: string }) => ({
          ...m,
          sku: m.modelCode || m.sku || m.id,
          quantity: m.availableUnits ?? m.quantity ?? 0,
          binNumber: m.binLocation || m.binNumber || 'Unassigned',
        }),
      );
    } catch (_err: unknown) {
      const res = await api.get('/inventory', { params });
      return res.data?.data ?? res.data ?? [];
    }
  },

  getItem: async (id: string): Promise<InventoryItem> => {
    try {
      const res = await api.get(`/assets/models/${id}`);
      const m = res.data?.data ?? res.data;
      return {
        ...m,
        sku: m.modelCode || m.sku || m.id,
        quantity: m.availableUnits ?? m.quantity ?? 0,
        binNumber: m.binLocation || m.binNumber || 'Unassigned',
      };
    } catch (_err: unknown) {
      const res = await api.get(`/inventory/${id}`);
      return res.data?.data ?? res.data;
    }
  },

  getCategories: async (): Promise<Array<InventoryCategory>> => {
    const res = await api.get('/assets/categories');
    return res.data?.data ?? res.data ?? [];
  },

  createModel: async (data: Partial<DeviceModel>): Promise<InventoryItem> => {
    const res = await api.post('/assets/models', data);
    return res.data?.data ?? res.data;
  },

  updateModel: async (id: string, data: Partial<DeviceModel>): Promise<InventoryItem> => {
    const res = await api.patch(`/assets/models/${id}`, data);
    return res.data?.data ?? res.data;
  },

  deleteModel: async (id: string): Promise<void> => {
    await api.delete(`/assets/models/${id}`);
  },

  createItem: async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const res = await api.post('/assets/models', data);
    return res.data?.data ?? res.data;
  },

  updateItem: async (id: string, data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const res = await api.patch(`/assets/models/${id}`, data);
    return res.data?.data ?? res.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/assets/models/${id}`);
  },

  batchIntake: async (
    modelId: string,
    data: BatchStockIntakeDto,
  ): Promise<{ count: number; assets: unknown[] }> => {
    const res = await api.post(`/assets/models/${modelId}/intake`, data);
    return res.data?.data ?? res.data;
  },

  restockItem: async (id: string, quantity: number): Promise<InventoryItem> => {
    const res = await api.post(`/inventory/${id}/restock`, { quantity });
    return res.data?.data ?? res.data;
  },

  getStats: async (): Promise<InventoryStats> => {
    const res = await api.get('/inventory/stats');
    return res.data?.data ?? res.data;
  },
};
