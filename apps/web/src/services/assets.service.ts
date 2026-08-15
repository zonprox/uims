import { api } from './api';

export interface AssetSpecs {
  cpu: string;
  ram: string;
  storage: string;
  os: string;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  category: 'Laptop' | 'Desktop' | 'Server' | 'Monitor' | 'Networking' | 'Mobile';
  status: 'Active' | 'In Repair' | 'In Storage' | 'Retired';
  assignedTo: string;
  assignedEmail: string;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  warrantyExpiry: string;
  specs: AssetSpecs;
  notes?: string;
}

export interface AssetStats {
  total: number;
  active: number;
  inRepair: number;
  inStorage: number;
  retired: number;
}

export const assetsService = {
  getAssets: async (params?: {
    search?: string;
    category?: string;
    status?: string;
  }): Promise<Array<Asset>> => {
    const res = await api.get('/assets', { params });
    return res.data.data;
  },
  getAsset: async (id: string): Promise<Asset> => {
    const res = await api.get(`/assets/${id}`);
    return res.data.data;
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
      'Location',
      'Purchase Price',
    ];
    const rows = assets.map((a) => [
      a.tag,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      a.manufacturer,
      a.model,
      a.category,
      a.status,
      a.assignedTo || '',
      a.location || '',
      a.purchasePrice || 0,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};
