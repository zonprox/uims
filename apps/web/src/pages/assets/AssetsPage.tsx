import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  LaptopOutlined,
  PlusOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Card, Flex, Form, Tooltip } from 'antd';
import { useMemo } from 'react';
import PageContainer from '../../components/PageContainer';
import { AssetDetailDrawer } from './components/AssetDetailDrawer';
import { AssetFilterBar } from './components/AssetFilterBar';
import { AssetFormModal } from './components/AssetFormModal';
import { AssetQrModal } from './components/AssetQrModal';
import { AssetScannerModal } from './components/AssetScannerModal';
import { AssetTable } from './components/AssetTable';
import { useAssetManagement } from './hooks/useAssetManagement';

export default function AssetsPage() {
  const [form] = Form.useForm();
  const {
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
    handleResetFilters,
  } = useAssetManagement(form);

  const statsItems = useMemo(
    () => [
      {
        title: 'Total Assets',
        value: stats.total,
        prefix: <LaptopOutlined />,
        color: '#1677ff',
      },
      {
        title: 'Active',
        value: stats.active,
        prefix: <CheckCircleOutlined />,
        color: '#10b981',
      },
      {
        title: 'In Repair',
        value: stats.inRepair,
        prefix: <WarningOutlined />,
        color: '#f59e0b',
      },
      {
        title: 'In Storage',
        value: stats.inStorage,
        prefix: <AppstoreOutlined />,
        color: '#6366f1',
      },
    ],
    [stats],
  );

  return (
    <PageContainer
      title="Hardware Assets"
      subtitle="Manage asset lifecycles, track allocations, and monitor depreciation across all hardware assets."
      breadcrumbs={[{ title: 'Hardware Assets' }]}
      stats={statsItems}
      extra={
        <Flex gap={8}>
          <Button icon={<QrcodeOutlined />} onClick={() => setScannerModalOpen(true)}>
            Scan QR
          </Button>
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Tooltip title="Refresh assets">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Create Asset
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <AssetFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          orgFilter={orgFilter}
          onOrgChange={setOrgFilter}
          orgOptions={orgOptions}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          onReset={handleResetFilters}
          onScanQr={() => setScannerModalOpen(true)}
        />

        <AssetTable
          assets={assets}
          loading={loading}
          onShowDetails={handleShowDetails}
          onShowQr={handleShowQr}
          onOpenEditModal={handleOpenEditModal}
          onDeleteAsset={handleDeleteAsset}
        />
      </Card>

      <AssetFormModal
        open={modalOpen}
        editingAsset={editingAsset}
        form={form}
        submitting={modalSubmitting}
        onSave={handleSaveAsset}
        onCancel={() => setModalOpen(false)}
      />

      <AssetDetailDrawer
        open={detailDrawerOpen}
        selectedAsset={selectedAsset}
        onClose={() => setDetailDrawerOpen(false)}
        onOpenEditModal={handleOpenEditModal}
      />

      <AssetQrModal open={qrModalOpen} qrAsset={qrAsset} onClose={() => setQrModalOpen(false)} />

      <AssetScannerModal
        open={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onScanSuccess={handleScanQr}
        onRegisterAsset={handleOpenCreateWithTag}
      />
    </PageContainer>
  );
}
