import { App } from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { type Asset, type AssetStats, assetsService } from '../../../services/assets.service';

export interface AssetFormValues {
  tag?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  category?: Asset['category'];
  status?: Asset['status'];
  assignedTo?: string;
  location?: string;
  purchaseDate?: dayjs.Dayjs;
  purchasePrice?: number;
  warrantyExpiry?: dayjs.Dayjs;
  cpu?: string;
  ram?: string;
  storage?: string;
  os?: string;
  notes?: string;
}

export function buildAssetSpecs(values: AssetFormValues) {
  return {
    cpu: values.cpu ?? 'N/A',
    ram: values.ram ?? 'N/A',
    storage: values.storage ?? 'N/A',
    os: values.os ?? 'N/A',
  };
}

export function buildAssetPayload(values: AssetFormValues): Partial<Asset> {
  const specs = buildAssetSpecs(values);
  const purchaseDate = values.purchaseDate?.format('YYYY-MM-DD');
  const warrantyExpiry = values.warrantyExpiry?.format('YYYY-MM-DD');

  return {
    tag: values.tag ?? '',
    name: values.name ?? '',
    manufacturer: values.manufacturer ?? '',
    model: values.model ?? '',
    serialNumber: values.serialNumber ?? '',
    category: values.category ?? 'Laptop',
    status: values.status ?? 'Active',
    assignedTo: values.assignedTo || 'Unassigned',
    location: values.location ?? '',
    purchaseDate,
    purchasePrice: values.purchasePrice ?? 0,
    warrantyExpiry,
    specs,
    notes: values.notes,
  };
}

export function useAssetManagement(form: FormInstance) {
  const { message } = App.useApp();
  const [assets, setAssets] = useState<Array<Asset>>([]);
  const [stats, setStats] = useState<AssetStats>({
    total: 0,
    active: 0,
    inRepair: 0,
    inStorage: 0,
    retired: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal / Drawer state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        assetsService.getAssets({
          search: searchQuery || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        assetsService.getStats().catch(() => null),
      ]);
      setAssets(list);
      if (statsData) {
        setStats(statsData);
      } else {
        setStats({
          total: list.length,
          active: list.filter((a) => a.status === 'Active').length,
          inRepair: list.filter((a) => a.status === 'In Repair').length,
          inStorage: list.filter((a) => a.status === 'In Storage').length,
          retired: list.filter((a) => a.status === 'Retired').length,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to load assets from server.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, message, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = useCallback(() => {
    setEditingAsset(null);
    form.resetFields();
    form.setFieldsValue({
      tag: `AST-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Active',
      category: 'Laptop',
      purchaseDate: dayjs(),
      warrantyExpiry: dayjs().add(3, 'year'),
      purchasePrice: 1500,
      location: 'NY Office - Floor 4',
    });
    setModalOpen(true);
  }, [form]);

  const handleOpenEditModal = useCallback(
    (asset: Asset) => {
      setEditingAsset(asset);
      form.setFieldsValue({
        ...asset,
        purchaseDate: asset.purchaseDate ? dayjs(asset.purchaseDate) : undefined,
        warrantyExpiry: asset.warrantyExpiry ? dayjs(asset.warrantyExpiry) : undefined,
        cpu: asset.specs?.cpu,
        ram: asset.specs?.ram,
        storage: asset.specs?.storage,
        os: asset.specs?.os,
      });
      setModalOpen(true);
    },
    [form],
  );

  const handleSaveAsset = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);
      const payload = buildAssetPayload(values);

      if (editingAsset) {
        await assetsService.updateAsset(editingAsset.id, payload);
        message.success(`Asset "${payload.tag}" updated successfully.`);
      } else {
        await assetsService.createAsset(payload);
        message.success(`Asset "${payload.tag}" added to database.`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save asset.');
    } finally {
      setModalSubmitting(false);
    }
  }, [editingAsset, form, loadData, message]);

  const handleDeleteAsset = useCallback(
    async (id: string) => {
      try {
        await assetsService.deleteAsset(id);
        message.success('Asset deleted successfully.');
        loadData();
      } catch (err: unknown) {
        console.error(err);
        message.error('Failed to delete asset.');
      }
    },
    [loadData, message],
  );

  const handleShowDetails = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setDetailDrawerOpen(true);
  }, []);

  const handleShowQr = useCallback((asset: Asset) => {
    setQrAsset(asset);
    setQrModalOpen(true);
  }, []);

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const csvData = await assetsService.exportCsv();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `assets_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Assets database exported successfully as CSV.');
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  }, [message]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
  }, []);

  return {
    assets,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    modalOpen,
    setModalOpen,
    modalSubmitting,
    editingAsset,
    detailDrawerOpen,
    setDetailDrawerOpen,
    selectedAsset,
    qrModalOpen,
    setQrModalOpen,
    qrAsset,
    exporting,
    loadData,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSaveAsset,
    handleDeleteAsset,
    handleShowDetails,
    handleShowQr,
    handleExportCSV,
    handleResetFilters,
  };
}
