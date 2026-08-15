import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  LaptopOutlined,
  PlusOutlined,
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
        title: 'Active in Use',
        value: stats.active,
        prefix: <CheckCircleOutlined />,
        color: '#10b981',
      },
      {
        title: 'In Repair / RMA',
        value: stats.inRepair,
        prefix: <WarningOutlined />,
        color: '#f59e0b',
      },
      {
        title: 'In Storage Vault',
        value: stats.inStorage,
        prefix: <AppstoreOutlined />,
        color: '#6366f1',
      },
    ],
    [stats],
  );

  return (
    <PageContainer
      title="Hardware Asset Management"
      subtitle="Track full lifecycle, technical specifications, user assignments, and warranty status."
      breadcrumbs={[{ title: 'Assets' }]}
      stats={statsItems}
      extra={
        <Flex gap={8}>
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Provision Asset
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <AssetFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          onReset={handleResetFilters}
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
    </PageContainer>
  );
}
