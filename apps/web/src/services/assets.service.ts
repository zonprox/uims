import type {
  AllocateAssetDto,
  AssetQueryDto,
  BatchAssignAssetDto,
  BatchAssignAssetResultDto,
  BatchDeleteResultDto,
  RegisterPhysicalUnitDto,
  ReturnAssetDto,
  TransferAssetDto,
  UpdatePhysicalUnitDto,
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
  deviceModelId?: string | null;
  deviceModel?: {
    id: string;
    name: string;
    modelCode: string;
    manufacturer: string;
    unitCost?: number;
    binLocation?: string | null;
  } | null;
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
  status:
    | 'AVAILABLE'
    | 'IN_USE'
    | 'MAINTENANCE'
    | 'RETIRED'
    | 'LOST'
    | 'Active'
    | 'In Repair'
    | 'In Storage'
    | string;
  hasPendingRecord?: boolean;
  signedDocUrl?: string | null;
  latestHandoverRecord?: {
    id: string;
    type: string;
    signedDocUrl?: string | null;
    isPending: boolean;
    notes?: string | null;
    createdAt?: string;
  } | null;
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
    modelId?: string;
    assignedToId?: string;
    departmentId?: string;
    hasPendingRecord?: boolean | string;
    organizationId?: string;
    organization?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Array<Asset>> => {
    const res = await api.get('/assets', { params });
    return res.data.data;
  },

  getAsset: async (id: string): Promise<Asset> => {
    const res = await api.get(`/assets/${id}`);
    return res.data.data;
  },

  getCategories: async (): Promise<Array<AssetCategory>> => {
    const res = await api.get('/assets/categories');
    return res.data?.data ?? res.data ?? [];
  },

  registerUnit: async (data: RegisterPhysicalUnitDto): Promise<Asset> => {
    const res = await api.post('/assets/units', data);
    return res.data.data;
  },

  createAsset: async (data: Partial<Asset> | RegisterPhysicalUnitDto): Promise<Asset> => {
    return assetsService.registerUnit(data as RegisterPhysicalUnitDto);
  },

  updateAsset: async (id: string, data: Partial<Asset> | UpdatePhysicalUnitDto): Promise<Asset> => {
    const res = await api.patch(`/assets/units/${id}`, data);
    return res.data.data;
  },

  deleteAsset: async (id: string): Promise<void> => {
    await api.delete(`/assets/units/${id}`);
  },

  getStats: async (): Promise<AssetStats> => {
    const res = await api.get('/assets/stats');
    return res.data.data;
  },

  exportCsv: async (): Promise<string> => {
    const assets = await assetsService.getAssets();
    const headers = ['Tag', 'Name', 'Manufacturer', 'Model', 'Category', 'Status', 'Assigned To'];
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

  allocateAsset: async (payload: AllocateAssetDto): Promise<{ count: number; assets: Asset[] }> => {
    const res = await api.post('/assets/allocate', payload);
    return res.data?.data ?? res.data;
  },

  batchAssignAssets: async (payload: BatchAssignAssetDto): Promise<BatchAssignAssetResultDto> => {
    const res = await api.post('/assets/batch-assign', payload);
    return res.data?.data ?? res.data;
  },

  returnAsset: async (
    idOrDto: string | ReturnAssetDto,
    data?: {
      status?: string;
      conditionNotes?: string;
      signedDocUrl?: string;
    },
  ): Promise<Asset | { count: number; assets: Asset[] }> => {
    if (typeof idOrDto === 'string') {
      const targetStatus = (data?.status?.toUpperCase() || 'AVAILABLE') as
        | 'AVAILABLE'
        | 'MAINTENANCE'
        | 'RETIRED';
      const res = await api.post('/assets/return', {
        assetIds: [idOrDto],
        targetStatus,
        inspectionNotes: data?.conditionNotes,
        signedDocUrl: data?.signedDocUrl,
      });
      return res.data?.data ?? res.data;
    }
    const res = await api.post('/assets/return', idOrDto);
    return res.data?.data ?? res.data;
  },

  returnUnits: async (payload: ReturnAssetDto): Promise<{ count: number; assets: Asset[] }> => {
    const res = await api.post('/assets/return', payload);
    return res.data?.data ?? res.data;
  },

  transferAsset: async (payload: TransferAssetDto): Promise<{ count: number; assets: Asset[] }> => {
    const res = await api.post('/assets/transfer', payload);
    return res.data?.data ?? res.data;
  },

  generateHandoverDocument: async (payload: {
    type: 'assignment' | 'return' | 'transfer';
    assetIds?: string[];
    recipientId?: string;
    transferorId?: string;
    conditionNotes?: string;
  }): Promise<{ html: string; title: string; filename: string; generatedAt: string }> => {
    const res = await api.post('/assets/handover-documents/generate', payload);
    return res.data?.data ?? res.data;
  },

  downloadHandoverDocx: async (payload: {
    type: 'assignment' | 'return' | 'transfer';
    assetIds?: string[];
    recipientId?: string;
    transferorId?: string;
    conditionNotes?: string;
  }): Promise<{ blob: Blob; filename: string }> => {
    const res = await api.post('/assets/handover-documents/docx', payload, {
      responseType: 'blob',
    });
    const disposition = (res.headers && (res.headers['content-disposition'] as string)) || '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match ? match[1] : `asset_${payload.type}_record.docx`;
    return { blob: res.data as Blob, filename };
  },

  uploadHandoverDocument: async (
    file: File | Blob,
    assetId?: string,
  ): Promise<{
    fileUrl: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    asset?: Asset;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (assetId) {
      formData.append('assetId', assetId);
    }
    const res = await api.post('/assets/handover-documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
    return res.data?.data ?? res.data;
  },

  attachHandoverDocument: async (
    id: string,
    payload: { fileUrl: string; notes?: string },
  ): Promise<Asset> => {
    const res = await api.post(`/assets/${id}/handover-document`, payload);
    return res.data?.data ?? res.data;
  },
};
