import type {
  AssetQueryDto,
  BatchAssignAssetDto,
  BatchAssignAssetResultDto,
  BatchDeleteResultDto,
} from '@uims/shared-types';
import dayjs from 'dayjs';
import { api } from './api';

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assets?: Asset[];
  linkedAssetCount?: number;
}

export interface AssetCategory {
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  parentId?: string | null;
}

export interface Asset {
  id: string;
  tag: string;
  assetCode?: string | null;
  subcode?: string | null;
  parentId?: string | null;
  parent?: (Asset & { manufacturer?: string; model?: string; assetCode?: string }) | null;
  children?: Asset[];
  costCenterId?: string | null;
  costCenter?: CostCenter | { id?: string; code?: string; name?: string } | string | null;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber?: string | null;
  category: string;
  categoryId?: string | null;
  specifications?: string | null;
  unitCost?: number | null;
  totalUnits?: number;
  availableUnits?: number;
  inUseUnits?: number;
  unitCounts?: {
    total: number;
    available: number;
    inUse: number;
  };
  status: 'Active' | 'In Repair' | 'In Storage' | 'Retired' | string;
  assignedTo: string;
  assignedToId?: string | null;
  assignedEmail: string;
  department?: string | null;
  departmentId?: string | null;
  organization?: string | null;
  organizationId?: string | null;
  purchaseDate: string;
  warrantyExpiry: string;
  notes?: string;
  networkConnectivity?: {
    upstreamSwitch: string;
    switchModel?: string | null;
    upstreamPort: string;
    linkStatus: string;
    rackName?: string | null;
    rackUnit?: number | string | null;
    vlan?: string | null;
    ipAddress?: string | null;
  } | null;
}

export interface AssetStats {
  total: number;
  active: number;
  inRepair: number;
  inStorage: number;
  retired: number;
}

export const assetsService = {
  getCostCenters: async (): Promise<CostCenter[]> => {
    const res = await api.get('/assets/cost-centers');
    return res.data.data;
  },

  getAssets: async (params?: {
    search?: string;
    category?: string;
    categoryId?: string;
    status?: string;
    assignedToId?: string;
    organizationId?: string;
    organization?: string;
  }): Promise<Array<Asset>> => {
    const res = await api.get('/assets', { params });
    return res.data.data;
  },

  getAsset: async (id: string): Promise<Asset> => {
    const res = await api.get(`/assets/${id}`);
    return res.data.data;
  },

  getCategories: async (): Promise<Array<AssetCategory>> => {
    try {
      const res = await api.get('/assets/categories');
      return res.data.data;
    } catch (_error: unknown) {
      return [
        { id: 'cat-laptop', name: 'Laptops / Notebooks' },
        { id: 'cat-desktop', name: 'Desktops & Workstations' },
        { id: 'cat-server', name: 'Servers (Rackmount / Host)' },
        { id: 'cat-switch', name: 'Network Switches' },
        { id: 'cat-router', name: 'Routers & Firewalls' },
        { id: 'cat-ap', name: 'Wireless Access Points (AP)' },
        { id: 'cat-monitor', name: 'Monitors & Displays' },
        { id: 'cat-printer', name: 'Printers & Scanners' },
        { id: 'cat-storage', name: 'Storage (NAS / SAN)' },
        { id: 'cat-ups', name: 'Power & UPS' },
        { id: 'cat-peripheral', name: 'Peripherals & Accessories' },
      ];
    }
  },

  createAsset: async (data: Partial<Asset>): Promise<Asset> => {
    const res = await api.post('/assets', data);
    return res.data.data;
  },

  updateAsset: async (id: string, data: Partial<Asset>): Promise<Asset> => {
    const res = await api.patch(`/assets/${id}`, data);
    return res.data.data;
  },

  deleteAsset: async (id: string): Promise<void> => {
    await api.delete(`/assets/${id}`);
  },

  getStats: async (): Promise<AssetStats> => {
    const res = await api.get('/assets/stats');
    return res.data.data;
  },

  exportCsv: async (): Promise<string> => {
    const assets = await assetsService.getAssets();
    const headers = [
      'Tag',
      'Name',
      'Manufacturer',
      'Model',
      'Category',
      'Status',
      'Assigned To',
    ];
    const rows = assets.map((a) => [
      a.tag,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      a.manufacturer,
      a.model,
      a.category,
      a.status,
      a.assignedTo || '',
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  exportXlsx: async (params?: AssetQueryDto): Promise<Blob> => {
    const res = await api.get('/assets/export.xlsx', {
      params,
      responseType: 'blob',
    });
    const blob: Blob = res.data;
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const createObjectURL = window.URL?.createObjectURL || URL?.createObjectURL;
        if (typeof createObjectURL === 'function') {
          const blobUrl = createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          const timestamp = dayjs().format('YYYY-MM-DD');
          link.setAttribute('download', `assets_export_${timestamp}.xlsx`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (typeof window.URL?.revokeObjectURL === 'function') {
            window.URL.revokeObjectURL(blobUrl);
          }
        }
      } catch (_err: unknown) {
        // Safe fallback in test environments without full URL.createObjectURL support
      }
    }
    return blob;
  },

  batchDeleteAssets: async (ids: string[]): Promise<BatchDeleteResultDto> => {
    const res = await api.post('/assets/batch-delete', { ids });
    return res.data?.data ?? res.data;
  },

  batchDelete: async (ids: string[]): Promise<BatchDeleteResultDto> => {
    return assetsService.batchDeleteAssets(ids);
  },

  batchAssignAssets: async (payload: BatchAssignAssetDto): Promise<BatchAssignAssetResultDto> => {
    const res = await api.post('/assets/batch-assign', payload);
    return res.data?.data ?? res.data;
  },
};
