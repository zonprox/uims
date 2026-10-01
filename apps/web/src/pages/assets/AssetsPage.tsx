import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  LaptopOutlined,
  PlusOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Badge, Button, Card, Flex, Form, Space, theme, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import PageContainer from '../../components/PageContainer';
import { AssetDetailDrawer } from './components/AssetDetailDrawer';
import { AssetFilterBar } from './components/AssetFilterBar';
import { AssetFormModal } from './components/AssetFormModal';
import { AssetQrModal } from './components/AssetQrModal';
import { AssetScannerModal } from './components/AssetScannerModal';
import { AssetTable } from './components/AssetTable';
import { BatchPrintModal } from './components/BatchPrintModal';
import { useAssetManagement } from './hooks/useAssetManagement';

const { Text } = Typography;

export default function AssetsPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
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
    locationFilter,
    setLocationFilter,
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
    handleExportXlsx,
    handleResetFilters,
    selectedRowKeys,
    selectedAssets,
    handleSelectionChange,
    handleClearSelection,
    batchDeleting,
    batchPrintModalOpen,
    handleOpenBatchPrint,
    handleCloseBatchPrint,
    handleBatchDelete,
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
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExportXlsx}>
            Export Excel
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
          locationFilter={locationFilter}
          onLocationChange={setLocationFilter}
          filterState={filterState}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          onScanQr={() => setScannerModalOpen(true)}
        />

        {selectedRowKeys.length > 0 && (
          <Flex
            justify="space-between"
            align="center"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              padding: '10px 16px',
              background: token.colorBgElevated,
              border: `1px solid ${token.colorPrimaryBorder}`,
              borderRadius: token.borderRadiusLG,
              boxShadow: token.boxShadowSecondary,
              marginBottom: 16,
            }}
          >
            <Flex align="center" gap={8}>
              <Badge
                count={selectedRowKeys.length}
                overflowCount={9999}
                style={{ backgroundColor: token.colorPrimary }}
              />
              <Text strong style={{ color: token.colorPrimary, fontSize: 13 }}>
                Selected {selectedRowKeys.length} asset{selectedRowKeys.length > 1 ? 's' : ''}
              </Text>
            </Flex>
            <Space size={8}>
              <Button icon={<PrinterOutlined />} onClick={handleOpenBatchPrint}>
                Batch Print QR
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={batchDeleting}
                onClick={handleBatchDelete}
              >
                Batch Delete
              </Button>
              <Button onClick={handleClearSelection}>Clear Selection</Button>
            </Space>
          </Flex>
        )}

        <AssetTable
          assets={assets}
          loading={loading}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={handleSelectionChange}
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
        onViewSwitchFaceplate={(switchId) => {
          setDetailDrawerOpen(false);
          navigate(`/network?tab=switches${switchId ? `&switchId=${switchId}` : ''}`);
        }}
        onViewRackElevation={(rackId, unit) => {
          setDetailDrawerOpen(false);
          navigate(
            `/network?tab=racks${rackId ? `&rackId=${rackId}` : ''}${unit ? `&unit=${unit}` : ''}`,
          );
        }}
      />

      <AssetQrModal open={qrModalOpen} qrAsset={qrAsset} onClose={() => setQrModalOpen(false)} />

      <AssetScannerModal
        open={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onScanSuccess={handleScanQr}
        onRegisterAsset={handleOpenCreateWithTag}
      />

      <BatchPrintModal
        open={batchPrintModalOpen}
        assets={selectedAssets}
        onClose={handleCloseBatchPrint}
      />
    </PageContainer>
  );
}
