import { ExclamationCircleOutlined } from '@ant-design/icons';
import { IT_ASSET_CATEGORY_IDS } from '@uims/shared-types';
import { App, Button } from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { type Asset, type AssetStats, assetsService } from '../../../services/assets.service';
import { type Organization, organizationService } from '../../../services/organization.service';
import { api } from '../../../services/api';
import { formatErrorMessage } from '../../../utils/feedback';
import { isValidationError } from '../../../utils/formValidators';
import { parseAssetQrPayload, playSuccessChime, triggerHapticFeedback } from '../utils/qrDecoder';

export interface AssetFormValues {
  tag?: string;
  subcode?: string;
  parentId?: string;
  costCenterId?: string;
  costCenter?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  category?: Asset['category'];
  categoryId?: string;
  status?: Asset['status'];
  assignedTo?: string;
  assignedToId?: string;
  department?: string;
  departmentId?: string;
  purchaseDate?: dayjs.Dayjs;
  warrantyExpiry?: dayjs.Dayjs;
  notes?: string;
  [key: string]: unknown;
}

export interface AssetFilterState {
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  orgFilter: string;
}

export function buildAssetPayload(values: AssetFormValues): Partial<Asset> {
  const purchaseDate = values.purchaseDate?.format('YYYY-MM-DD');
  const warrantyExpiry = values.warrantyExpiry?.format('YYYY-MM-DD');

  const payload: Partial<Asset> & { subcode?: string; parentId?: string; costCenterId?: string } = {
    tag: values.tag ?? (values.subcode ? values.subcode.trim() : ''),
    name: values.name ?? '',
    manufacturer: values.manufacturer ?? '',
    model: values.model ?? '',
    serialNumber: values.serialNumber ?? '',
    category: values.category ?? 'Laptops / Notebooks',
    categoryId: values.categoryId || undefined,
    status: values.status ?? 'Active',
    assignedTo: values.assignedTo,
    assignedToId: values.assignedToId || undefined,
    department: values.department,
    departmentId: values.departmentId || undefined,
    purchaseDate,
    warrantyExpiry,
    notes: values.notes,
  };

  if (values.subcode) {
    payload.subcode = values.subcode.trim();
  }
  if (values.parentId) {
    payload.parentId = values.parentId;
  }
  if (values.costCenterId) {
    payload.costCenterId = values.costCenterId;
  }
  if (values.costCenter) {
    payload.costCenter = values.costCenter.trim();
  }

  return payload;
}

export function useAssetManagement(form: FormInstance) {
  const { message, notification, modal } = App.useApp();
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
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [organizations, setOrganizations] = useState<Array<Organization>>([]);

  // Selection & Batch Action State
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchPrintModalOpen, setBatchPrintModalOpen] = useState(false);
  const [batchAssignModalOpen, setBatchAssignModalOpen] = useState(false);
  const [batchAssigning, setBatchAssigning] = useState(false);

  const handleSelectionChange = useCallback(
    (keys: React.Key[], rows?: Asset[]) => {
      setSelectedRowKeys(keys);
      setSelectedAssets((prev) => {
        const keySet = new Set(keys.map(String));
        const retained = prev.filter((a) => keySet.has(String(a.id)));
        const existingIds = new Set(retained.map((a) => String(a.id)));

        const candidateRows = rows && rows.length > 0 ? rows : assets;
        const candidateMap = new Map<string, Asset>();
        for (const item of candidateRows) {
          candidateMap.set(String(item.id), item);
        }

        const updatedRetained = retained.map((a) => candidateMap.get(String(a.id)) || a);
        const newItems = Array.from(candidateMap.values()).filter(
          (r) => keySet.has(String(r.id)) && !existingIds.has(String(r.id)),
        );

        return [...updatedRetained, ...newItems];
      });
    },
    [assets],
  );

  useEffect(() => {
    setSelectedAssets((prev) => {
      const keySet = new Set(selectedRowKeys.map(String));
      const retained = prev.filter((a) => keySet.has(String(a.id)));
      const existingIds = new Set(retained.map((a) => String(a.id)));
      const missingFromAssets = assets.filter(
        (a) => keySet.has(String(a.id)) && !existingIds.has(String(a.id)),
      );
      if (retained.length === prev.length && missingFromAssets.length === 0) {
        return prev;
      }
      return [...retained, ...missingFromAssets];
    });
  }, [assets, selectedRowKeys]);

  const handleClearSelection = useCallback(() => {
    setSelectedRowKeys([]);
    setSelectedAssets([]);
  }, []);

  const handleOpenBatchPrint = useCallback(() => {
    setBatchPrintModalOpen(true);
  }, []);

  const handleCloseBatchPrint = useCallback(() => {
    setBatchPrintModalOpen(false);
  }, []);

  // Load organizations
  useEffect(() => {
    organizationService
      .getOrganizations()
      .then((orgs) => setOrganizations(orgs))
      .catch((err: unknown) => {
        message.error(formatErrorMessage(err, 'load organizations'));
      });
  }, [message]);

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ label: o.name, value: o.id })),
    [organizations],
  );

  const filterState: AssetFilterState = useMemo(
    () => ({
      searchQuery,
      categoryFilter,
      statusFilter,
      orgFilter,
    }),
    [searchQuery, categoryFilter, statusFilter, orgFilter],
  );

  const handleFilterChange = useCallback(
    (key: keyof AssetFilterState | string, val: string | undefined) => {
      if (key === 'searchQuery') setSearchQuery(val || '');
      else if (key === 'categoryFilter') setCategoryFilter(val || 'all');
      else if (key === 'statusFilter') setStatusFilter(val || 'all');
      else if (key === 'orgFilter') setOrgFilter(val || 'all');
    },
    [],
  );

  // Modal / Drawer state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const isCategoryId =
        categoryFilter !== 'all' &&
        (categoryFilter.startsWith('cat-') || categoryFilter.includes('-'));

      const [list, statsData] = await Promise.all([
        assetsService.getAssets({
          search: searchQuery || undefined,
          categoryId: isCategoryId ? categoryFilter : undefined,
          category: categoryFilter !== 'all' && !isCategoryId ? categoryFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          organizationId: orgFilter !== 'all' ? orgFilter : undefined,
        }),
        assetsService.getStats().catch((_error: unknown) => null),
      ]);

      const filtered =
        orgFilter === 'all'
          ? list
          : list.filter(
              (a) =>
                a.organizationId === orgFilter ||
                a.organization === orgFilter ||
                organizations.some((o) => o.id === orgFilter && o.name === a.organization),
            );

      setAssets(filtered);
      if (statsData) {
        setStats(statsData);
      } else {
        setStats({
          total: filtered.length,
          active: filtered.filter((a) => a.status === 'Active').length,
          inRepair: filtered.filter((a) => a.status === 'In Repair').length,
          inStorage: filtered.filter((a) => a.status === 'In Storage').length,
          retired: filtered.filter((a) => a.status === 'Retired').length,
        });
      }
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load assets from server'));
    } finally {
      setLoading(false);
    }
  }, [
    categoryFilter,
    message,
    orgFilter,
    organizations,
    searchQuery,
    statusFilter,
  ]);

  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get('id') || searchParams.get('tag');
  const scanParam = searchParams.get('scan');

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deep linking: auto-open detail drawer if query parameter is present
  useEffect(() => {
    if (deepLinkId && assets.length > 0) {
      const match = assets.find(
        (a) => a.id === deepLinkId || a.tag.toLowerCase() === deepLinkId.toLowerCase(),
      );
      if (match) {
        setSelectedAsset(match);
        setDetailDrawerOpen(true);
      }
    }
  }, [deepLinkId, assets]);

  // Deep linking: auto-open scanner modal if ?scan=true
  useEffect(() => {
    if (scanParam === 'true') {
      setScannerModalOpen(true);
    }
  }, [scanParam]);

  const handleOpenCreateWithTag = useCallback(
    (tag: string) => {
      setEditingAsset(null);
      form.resetFields();
      form.setFieldsValue({
        tag,
        status: 'Active',
        categoryId: IT_ASSET_CATEGORY_IDS.LAPTOP,
        category: 'Laptops / Notebooks',
        purchaseDate: dayjs(),
        warrantyExpiry: dayjs().add(3, 'year'),
      });
      setModalOpen(true);
    },
    [form],
  );

  const handleScanQr = useCallback(
    async (scannedRaw: string) => {
      const parsedTag = parseAssetQrPayload(scannedRaw);
      if (!parsedTag) {
        message.warning('No valid asset tag found in the scanned payload.');
        return;
      }

      // 1. Check local assets list first for instant resolution
      let match = assets.find(
        (a) =>
          (a.tag || '').toLowerCase() === parsedTag.toLowerCase() ||
          (a.serialNumber || '').toLowerCase() === parsedTag.toLowerCase() ||
          (a.id || '').toLowerCase() === parsedTag.toLowerCase(),
      );

      // 2. Query server if not found in local state
      if (!match) {
        try {
          const results = await assetsService.getAssets({ search: parsedTag });
          match = results.find(
            (a) =>
              (a.tag || '').toLowerCase() === parsedTag.toLowerCase() ||
              (a.serialNumber || '').toLowerCase() === parsedTag.toLowerCase() ||
              (a.id || '').toLowerCase() === parsedTag.toLowerCase(),
          );
        } catch (_error: unknown) {
          message.error('Failed to verify asset with server. Please try again.');
          return;
        }
      }

      if (match) {
        playSuccessChime();
        triggerHapticFeedback();
        setScannerModalOpen(false);
        setSelectedAsset(match);
        setDetailDrawerOpen(true);
        message.success(`Asset "${match.tag}" (${match.name}) identified.`);
      } else {
        setScannerModalOpen(false);
        const notifKey = `asset-not-found-${parsedTag}`;
        notification.warning({
          key: notifKey,
          message: 'Asset Not Found',
          description: `Asset tag "${parsedTag}" was not found in inventory.`,
          btn: createElement(
            Button,
            {
              type: 'primary',
              size: 'small',
              onClick: () => {
                notification.destroy(notifKey);
                handleOpenCreateWithTag(parsedTag);
              },
            },
            'Register Asset',
          ),
          duration: 8,
        });
      }
    },
    [assets, handleOpenCreateWithTag, message, notification],
  );

  const handleOpenCreateModal = useCallback(() => {
    setEditingAsset(null);
    form.resetFields();
    form.setFieldsValue({
      tag: `AST-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Active',
      categoryId: IT_ASSET_CATEGORY_IDS.LAPTOP,
      category: 'Laptops / Notebooks',
      purchaseDate: dayjs(),
      warrantyExpiry: dayjs().add(3, 'year'),
    });
    setModalOpen(true);
  }, [form]);

  const handleOpenEditModal = useCallback(
    (asset: Asset) => {
      setEditingAsset(asset);
      const resolvedCategoryId =
        asset.categoryId || (typeof asset.category === 'string' ? asset.category : undefined);

      form.setFieldsValue({
        ...asset,
        categoryId: resolvedCategoryId,
        assignedToId: asset.assignedToId,
        departmentId: asset.departmentId,
        purchaseDate: asset.purchaseDate ? dayjs(asset.purchaseDate) : undefined,
        warrantyExpiry: asset.warrantyExpiry ? dayjs(asset.warrantyExpiry) : undefined,
        costCenter:
          typeof asset.costCenter === 'object' && asset.costCenter
            ? asset.costCenter.code || asset.costCenter.name
            : asset.costCenter,
        notes: asset.notes,
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
        message.success(`Asset "${payload.tag}" created successfully.`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      const anyErr = err as {
        response?: { status?: number; data?: { message?: string } };
        status?: number;
      };
      if (anyErr?.response?.status === 409 || anyErr?.status === 409) {
        const rawCode = (
          form.getFieldValue('subcode') ||
          form.getFieldValue('tag') ||
          ''
        ).toUpperCase();
        notification.error({
          message: 'Duplicate SUB Code',
          description: `Physical unit with subcode "${rawCode}" already exists. Please specify a unique SUB Code.`,
        });
      } else if (err instanceof Error && err.name !== 'ValidationError') {
        message.error(formatErrorMessage(err, 'save asset'));
      }
    } finally {
      setModalSubmitting(false);
    }
  }, [editingAsset, form, loadData, message, notification]);

  const handleDeleteAsset = useCallback(
    async (id: string) => {
      try {
        await assetsService.deleteAsset(id);
        message.success('Asset deleted successfully.');
        setSelectedRowKeys((prev) => prev.filter((k) => String(k) !== String(id)));
        setSelectedAssets((prev) => prev.filter((a) => String(a.id) !== String(id)));
        loadData();
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'delete asset'));
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
      message.success('Assets exported successfully.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'export assets'));
    } finally {
      setExporting(false);
    }
  }, [message]);

  const handleExportXlsx = useCallback(async () => {
    setExporting(true);
    try {
      const isCategoryId =
        categoryFilter !== 'all' &&
        (categoryFilter.startsWith('cat-') || categoryFilter.includes('-'));

      await assetsService.exportXlsx({
        search: searchQuery || undefined,
        categoryId: isCategoryId ? categoryFilter : undefined,
        category: categoryFilter !== 'all' && !isCategoryId ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        organizationId: orgFilter !== 'all' ? orgFilter : undefined,
      });
      message.success('Hardware assets exported to Excel successfully.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'export assets to Excel'));
    } finally {
      setExporting(false);
    }
  }, [categoryFilter, message, orgFilter, searchQuery, statusFilter]);

  const handleBatchDelete = useCallback(() => {
    const count = selectedRowKeys.length;
    if (count === 0) return;

    const tagsToDisplay = selectedAssets.map((a) => a.tag).filter(Boolean);
    const displayedTagsText =
      tagsToDisplay.slice(0, 10).join(', ') +
      (tagsToDisplay.length > 10 ? ` and ${tagsToDisplay.length - 10} more` : '');

    modal.confirm({
      title: `Delete ${count} Selected Asset${count > 1 ? 's' : ''}?`,
      icon: createElement(ExclamationCircleOutlined, { style: { color: '#ff4d4f' } }),
      content: createElement(
        'div',
        { style: { marginTop: 8 } },
        createElement(
          'p',
          { style: { marginBottom: 8 } },
          `This action cannot be undone. Are you sure you want to permanently delete ${count} asset${count > 1 ? 's' : ''}?`,
        ),
        tagsToDisplay.length > 0
          ? createElement(
              'p',
              { style: { fontSize: 12, color: '#64748b' } },
              `Asset tags: ${displayedTagsText}`,
            )
          : null,
      ),
      okText: `Delete ${count} Asset${count > 1 ? 's' : ''}`,
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setBatchDeleting(true);
          const ids = selectedRowKeys.map(String);
          const result = await assetsService.batchDeleteAssets(ids);
          message.success(
            `Successfully deleted ${result.count ?? count} asset${count > 1 ? 's' : ''}.`,
          );
          setSelectedRowKeys([]);
          setSelectedAssets([]);
          await loadData();
        } catch (err: unknown) {
          message.error(formatErrorMessage(err, 'delete selected assets'));
        } finally {
          setBatchDeleting(false);
        }
      },
    });
  }, [loadData, message, modal, selectedAssets, selectedRowKeys]);

  const handleOpenBatchAssign = useCallback(() => {
    setBatchAssignModalOpen(true);
  }, []);

  const handleCloseBatchAssign = useCallback(() => {
    setBatchAssignModalOpen(false);
  }, []);

  const handleBatchAssign = useCallback(
    async (values: {
      mode: 'assign' | 'unassign';
      assignedToId?: string | null;
      departmentId?: string | null;
      status?: string;
    }) => {
      if (selectedRowKeys.length === 0) return;
      try {
        setBatchAssigning(true);
        const assetIds = selectedRowKeys.map(String);
        const result = await assetsService.batchAssignAssets({
          assetIds,
          assignedToId: values.assignedToId,
          departmentId: values.departmentId,
          status: values.status,
        });

        const count = result.count ?? assetIds.length;
        if (values.mode === 'assign') {
          message.success(`Successfully assigned ${count} asset${count > 1 ? 's' : ''}.`);
        } else {
          message.success(`Successfully unassigned ${count} asset${count > 1 ? 's' : ''}.`);
        }

        setBatchAssignModalOpen(false);
        setSelectedRowKeys([]);
        setSelectedAssets([]);
        await loadData();
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'batch assign assets'));
      } finally {
        setBatchAssigning(false);
      }
    },
    [loadData, message, selectedRowKeys],
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setOrgFilter('all');
  }, []);

  // Device Models State
  const [activeTab, setActiveTab] = useState<string>('units');
  const [models, setModels] = useState<Array<Asset>>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [deviceModelDrawerOpen, setDeviceModelDrawerOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Asset | null>(null);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const res = await api.get('/assets/models');
      const modelList = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setModels(modelList);
    } catch (_err: unknown) {
      const derived = assets.filter(
        (a) => !a.parentId && (a.assetCode || a.tag.startsWith('MOD-')),
      );
      setModels(derived);
    } finally {
      setLoadingModels(false);
    }
  }, [assets]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleOpenCreateModel = useCallback(() => {
    setEditingModel(null);
    setDeviceModelDrawerOpen(true);
  }, []);

  const handleOpenEditModel = useCallback((model: Asset) => {
    setEditingModel(model);
    setDeviceModelDrawerOpen(true);
  }, []);

  const handleDeleteModel = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/assets/models/${id}`);
        message.success('Device model deleted successfully.');
        loadModels();
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'delete device model'));
      }
    },
    [loadModels, message],
  );

  const handleRegisterUnitUnderModel = useCallback(
    (model: Asset) => {
      setEditingAsset(null);
      form.resetFields();
      form.setFieldsValue({
        parentId: model.id,
        name: model.name,
        manufacturer: model.manufacturer,
        model: model.model,
        categoryId: model.categoryId,
        category: model.category,
        costCenterId:
          model.costCenterId ||
          (typeof model.costCenter === 'object' ? model.costCenter?.id : undefined),
        status: 'Active',
        purchaseDate: dayjs(),
        warrantyExpiry: dayjs().add(3, 'year'),
      });
      setModalOpen(true);
      setActiveTab('units');
    },
    [form],
  );

  return {
    assets,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    orgFilter,
    setOrgFilter,
    orgOptions,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    filterState,
    handleFilterChange,
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
    scannerModalOpen,
    setScannerModalOpen,
    handleScanQr,
    handleOpenCreateWithTag,
    exporting,
    loadData,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleSaveAsset,
    handleDeleteAsset,
    handleShowDetails,
    handleShowQr,
    handleExportCSV,
    handleExportXlsx,
    handleResetFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    selectedAssets,
    handleSelectionChange,
    handleClearSelection,
    batchDeleting,
    batchPrintModalOpen,
    setBatchPrintModalOpen,
    handleOpenBatchPrint,
    handleCloseBatchPrint,
    handleBatchDelete,
    batchAssignModalOpen,
    batchAssigning,
    handleOpenBatchAssign,
    handleCloseBatchAssign,
    handleBatchAssign,
    // Device Models & Tabs
    activeTab,
    setActiveTab,
    models,
    loadingModels,
    loadModels,
    deviceModelDrawerOpen,
    setDeviceModelDrawerOpen,
    editingModel,
    setEditingModel,
    handleOpenCreateModel,
    handleOpenEditModel,
    handleDeleteModel,
    handleRegisterUnitUnderModel,
  };
}
