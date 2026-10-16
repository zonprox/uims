import {
  AlertOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  UserSwitchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import PageContainer from '../../components/PageContainer';
import { api } from '../../services/api';
import { type Asset, assetsService } from '../../services/assets.service';
import {
  type InventoryCategory,
  type InventoryItem,
  type InventoryStats,
  inventoryService,
} from '../../services/inventory.service';
import { type Organization, organizationService } from '../../services/organization.service';
import { type Vendor, vendorService } from '../../services/vendor.service';
import { formatErrorMessage } from '../../utils/feedback';
import {
  BatchAssignModal,
  type BatchAssignFormValues,
} from '../assets/components/BatchAssignModal';
import { BatchStockIntakeDrawer } from './components/BatchStockIntakeDrawer';
import { DeviceModelDrawer } from './components/DeviceModelDrawer';
import { InventoryDetailDrawer } from './components/InventoryDetailDrawer';

const { Text } = Typography;

export const INVENTORY_CATEGORY_COLORS: Record<string, string> = {
  'Laptops / Notebooks': 'blue',
  'Desktops & Workstations': 'cyan',
  'Servers (Rackmount / Host)': 'purple',
  Servers: 'purple',
  'Network Switches': 'geekblue',
  'Routers & Firewalls': 'volcano',
  'Wireless Access Points (AP)': 'green',
  'Monitors & Displays': 'magenta',
  'Printers & Scanners': 'orange',
  'Storage (NAS / SAN)': 'gold',
  'Power & UPS': 'red',
  'Peripherals & Accessories': 'default',
  'Cables & Adapters': 'cyan',
  Peripherals: 'blue',
  'Storage & RAM': 'purple',
  'Power & Battery': 'orange',
  Tooling: 'geekblue',
  'General Supplies': 'default',
};

export const STOCK_STATUS_FILTER_OPTIONS = [
  { label: 'All Stock Status', value: 'all' },
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Low Stock Warning', value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
];

const StockLevelCell: React.FC<{ record: InventoryItem }> = ({ record }) => {
  const available = record.availableUnits ?? record.quantity ?? 0;
  const threshold = record.minThreshold || 5;
  const isDepleted = available === 0;
  const isLow = available > 0 && available < threshold;
  const strokeColor = isDepleted ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
  const status = isDepleted ? 'exception' : isLow ? 'active' : 'normal';
  const percent = Math.min(100, Math.round((available / Math.max(1, threshold * 2)) * 100));

  return (
    <div style={{ minWidth: 130 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
        <Text strong style={{ color: isDepleted ? '#ef4444' : isLow ? '#f59e0b' : undefined }}>
          {available} in stock
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Min: {threshold}
        </Text>
      </Flex>
      <Progress
        percent={percent}
        status={status}
        strokeColor={strokeColor}
        size="small"
        showInfo={false}
      />
      <div style={{ marginTop: 2 }}>
        {isDepleted && (
          <Tag color="error" style={{ fontSize: 10, margin: 0 }}>
            Out of Stock
          </Tag>
        )}
        {isLow && (
          <Tag color="warning" style={{ fontSize: 10, margin: 0 }}>
            Low Stock
          </Tag>
        )}
        {!isDepleted && !isLow && (
          <Tag color="success" style={{ fontSize: 10, margin: 0 }}>
            In Stock
          </Tag>
        )}
      </div>
    </div>
  );
};

export default function InventoryPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<Array<InventoryItem>>([]);
  const [categories, setCategories] = useState<Array<InventoryCategory>>([]);
  const [organizations, setOrganizations] = useState<Array<Organization>>([]);
  const [_vendors, setVendors] = useState<Array<Vendor>>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalModels: 0,
    totalSkus: 0,
    totalUnits: 0,
    totalValuation: 0,
    availableUnits: 0,
    assignedUnits: 0,
    inUseUnits: 0,
    maintenanceUnits: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  const [intakeDrawerOpen, setIntakeDrawerOpen] = useState(false);
  const [intakeTargetModel, setIntakeTargetModel] = useState<InventoryItem | null>(null);

  // Restock modal state
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restocking, setRestocking] = useState(false);

  // Allocate from stock states
  const [allocateDrawerOpen, setAllocateDrawerOpen] = useState(false);
  const [allocatingAssets, setAllocatingAssets] = useState<Asset[]>([]);
  const [allocateSubmitting, setAllocateSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsResult, statsResult, catsResult, vendsResult, orgsResult] =
        await Promise.allSettled([
          inventoryService.getItems({
            search: searchQuery || undefined,
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            stockStatus: stockFilter !== 'all' ? stockFilter : undefined,
            organizationId: orgFilter !== 'all' ? orgFilter : undefined,
          }),
          inventoryService.getStats(),
          inventoryService.getCategories(),
          vendorService.getVendors(),
          organizationService.getOrganizations(),
        ]);

      if (itemsResult.status === 'fulfilled') {
        setItems(itemsResult.value);
      } else {
        message.error('Failed to load inventory items.');
      }

      if (catsResult.status === 'fulfilled') {
        setCategories(catsResult.value);
      } else {
        message.warning('Failed to load inventory categories.');
      }

      if (vendsResult.status === 'fulfilled') {
        setVendors(vendsResult.value);
      } else {
        message.warning('Failed to load approved vendors.');
      }

      if (orgsResult.status === 'fulfilled') {
        setOrganizations(orgsResult.value);
      } else {
        message.warning('Failed to load organizations.');
      }

      if (statsResult.status === 'fulfilled' && statsResult.value) {
        setStats(statsResult.value);
      } else {
        message.warning('Failed to load inventory aggregate statistics.');
      }
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load inventory records'));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, message, orgFilter, searchQuery, stockFilter]);

  const [searchParams] = useSearchParams();
  const deepLinkSku = searchParams.get('sku') || searchParams.get('id');

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deep linking: auto-open item detail if sku or id is provided in URL
  useEffect(() => {
    if (deepLinkSku && items.length > 0) {
      const match = items.find(
        (i) =>
          (i.sku && i.sku.toLowerCase() === deepLinkSku.toLowerCase()) ||
          (i.modelCode && i.modelCode.toLowerCase() === deepLinkSku.toLowerCase()) ||
          i.id.toLowerCase() === deepLinkSku.toLowerCase() ||
          i.name.toLowerCase().includes(deepLinkSku.toLowerCase()),
      );
      if (match) {
        setDetailItem(match);
        setDetailDrawerOpen(true);
      }
    }
  }, [deepLinkSku, items]);

  const categoryOptions = useMemo(
    () => [
      { label: 'All Categories', value: 'all' },
      ...categories.map((c) => ({ label: c.name, value: c.id })),
    ],
    [categories],
  );

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ label: o.name, value: o.id })),
    [organizations],
  );

  const handleOpenCreateModel = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    setModalOpen(true);
  }, []);

  const handleDeleteModel = async (id: string, name: string) => {
    try {
      await inventoryService.deleteItem(id);
      message.success(`Item "${name}" deleted successfully.`);
      loadData();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'delete inventory item'));
    }
  };

  const handleOpenRestock = (item: InventoryItem) => {
    setRestockItem(item);
    setRestockQty(10);
    setRestockModalOpen(true);
  };

  const handleConfirmRestock = async () => {
    if (!restockItem) return;
    setRestocking(true);
    try {
      await inventoryService.restockItem(restockItem.id, restockQty);
      message.success(`Restocked ${restockQty} units for "${restockItem.name}".`);
      setRestockModalOpen(false);
      loadData();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'restock inventory item'));
    } finally {
      setRestocking(false);
    }
  };

  const handleOpenIntake = (modelRecord?: InventoryItem) => {
    setIntakeTargetModel(modelRecord || null);
    setIntakeDrawerOpen(true);
  };

  const handleAllocateFromStock = async (record: InventoryItem) => {
    try {
      const availableUnits = record.availableUnits ?? record.quantity ?? 0;
      if (availableUnits <= 0) {
        message.warning(`No units available in warehouse stock for model "${record.name}".`);
        return;
      }

      // Fetch available physical units for this model
      const res = await api.get('/assets', {
        params: {
          deviceModelId: record.id,
          status: 'AVAILABLE',
          pageSize: 50,
        },
      });
      const units: Asset[] = res.data?.data || [];

      if (!units.length) {
        // Fallback search with search parameter
        const fallbackRes = await assetsService.getAssets({
          search: record.sku || record.modelCode || record.name,
          status: 'AVAILABLE',
        });
        if (fallbackRes.length) {
          setAllocatingAssets(fallbackRes.slice(0, 5));
          setAllocateDrawerOpen(true);
          return;
        }
        message.warning(
          `Could not find individual serialized available units for "${record.name}". Please receive units first.`,
        );
        return;
      }

      setAllocatingAssets(units);
      setAllocateDrawerOpen(true);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'fetch available units for allocation'));
    }
  };

  const handleExecuteAllocation = async (values: BatchAssignFormValues) => {
    if (!values.assignedToId) {
      message.error('Please select an employee to allocate equipment to.');
      return;
    }
    setAllocateSubmitting(true);
    try {
      await assetsService.allocateAsset({
        assetIds: allocatingAssets.map((a) => a.id),
        assignedToId: values.assignedToId,
        signedDocUrl: values.signedDocUrl,
      });
      message.success(
        `Successfully allocated ${allocatingAssets.length} unit(s) from warehouse stock.`,
      );
      setAllocateDrawerOpen(false);
      loadData();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'allocate assets from stock'));
    } finally {
      setAllocateSubmitting(false);
    }
  };

  const statsItems = useMemo(
    () => [
      {
        title: 'Total Device Models (Total SKUs)',
        value: stats.totalModels ?? stats.totalSkus,
        prefix: <DatabaseOutlined />,
        color: '#1677ff',
      },
      {
        title: 'Warehouse Stock (Total Units)',
        value: stats.availableUnits ?? stats.totalUnits,
        prefix: <CheckCircleOutlined />,
        color: '#10b981',
      },
      {
        title: 'Deployed in Field',
        value: stats.assignedUnits ?? stats.inUseUnits ?? 0,
        prefix: <ShoppingOutlined />,
        color: '#6366f1',
      },
      {
        title: 'In Maintenance',
        value: stats.maintenanceUnits ?? 0,
        prefix: <AlertOutlined />,
        color: '#f59e0b',
      },
      {
        title: 'Stock Reorder Alerts',
        value: (stats.lowStockCount || 0) + (stats.outOfStockCount || 0),
        prefix: <WarningOutlined />,
        color: '#ef4444',
      },
    ],
    [stats],
  );

  const columns = useMemo(
    () => [
      {
        title: 'Item & SKU',
        key: 'item',
        sorter: (a: InventoryItem, b: InventoryItem) =>
          a.name.localeCompare(b.name) ||
          (a.sku || a.modelCode || '').localeCompare(b.sku || b.modelCode || ''),
        render: (_: unknown, record: InventoryItem) => {
          const code = record.sku || record.modelCode || 'N/A';
          const manufacturer = record.manufacturer || record.supplier || 'General';
          return (
            <Flex vertical gap={2} style={{ minWidth: 0 }}>
              <Text
                strong
                style={{ fontSize: 13, cursor: 'pointer' }}
                onClick={() => {
                  setDetailItem(record);
                  setDetailDrawerOpen(true);
                }}
                title={record.name}
                ellipsis
              >
                {record.name}
              </Text>
              <Flex align="center" gap={6} wrap="wrap">
                <Text
                  copyable
                  code
                  strong
                  style={{
                    fontSize: 12,
                    color: '#1677ff',
                    cursor: 'pointer',
                    margin: 0,
                  }}
                  onClick={() => {
                    setDetailItem(record);
                    setDetailDrawerOpen(true);
                  }}
                >
                  {code}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {manufacturer}
                </Text>
              </Flex>
            </Flex>
          );
        },
      },
      {
        title: 'Category & Bin',
        key: 'category',
        width: 180,
        sorter: (a: InventoryItem, b: InventoryItem) => {
          const catA = typeof a.category === 'string' ? a.category : a.category?.name || '';
          const catB = typeof b.category === 'string' ? b.category : b.category?.name || '';
          return catA.localeCompare(catB);
        },
        render: (_: unknown, record: InventoryItem) => {
          const catName =
            typeof record.category === 'string'
              ? record.category
              : record.category?.name || record.categoryName || 'General';
          const color = INVENTORY_CATEGORY_COLORS[catName] || 'blue';
          const bin = record.binNumber || record.binLocation || 'Unassigned';
          return (
            <Flex vertical gap={4} align="flex-start">
              <Tag color={color} icon={<AppstoreOutlined />} style={{ fontSize: 11, margin: 0 }}>
                {catName}
              </Tag>
              <Tag color="cyan" style={{ fontFamily: 'monospace', fontSize: 11, margin: 0 }}>
                {bin}
              </Tag>
            </Flex>
          );
        },
      },
      {
        title: 'Stock Level',
        key: 'stock',
        width: 175,
        sorter: (a: InventoryItem, b: InventoryItem) =>
          (a.availableUnits ?? a.quantity ?? 0) - (b.availableUnits ?? b.quantity ?? 0),
        render: (_: unknown, record: InventoryItem) => <StockLevelCell record={record} />,
      },
      {
        title: 'Unit Cost',
        dataIndex: 'unitCost',
        key: 'unitCost',
        width: 115,
        align: 'right' as const,
        sorter: (a: InventoryItem, b: InventoryItem) => (a.unitCost || 0) - (b.unitCost || 0),
        render: (cost: number) => (
          <Text strong style={{ color: '#059669', fontSize: 13, fontFamily: 'monospace' }}>
            ${(cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 210,
        render: (_: unknown, record: InventoryItem) => {
          const availableUnits = record.availableUnits ?? record.quantity ?? 0;
          return (
            <Space size={4}>
              <Button
                size="small"
                icon={<ShoppingOutlined />}
                onClick={() => handleOpenRestock(record)}
              >
                Restock
              </Button>
              <Tooltip title="View details">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setDetailItem(record);
                    setDetailDrawerOpen(true);
                  }}
                />
              </Tooltip>
              <Tooltip title="Receive batch physical units (Intake)">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<PlusOutlined />}
                  style={{ color: '#1677ff' }}
                  onClick={() => handleOpenIntake(record)}
                />
              </Tooltip>
              <Tooltip
                title={
                  availableUnits > 0
                    ? 'Allocate available unit to employee'
                    : 'No stock available to allocate'
                }
              >
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  disabled={availableUnits <= 0}
                  icon={<UserSwitchOutlined />}
                  style={{ color: availableUnits > 0 ? '#10b981' : undefined }}
                  onClick={() => handleAllocateFromStock(record)}
                />
              </Tooltip>
              <Tooltip title="Edit Item">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEditModal(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Delete inventory item?"
                description="This action cannot be undone."
                onConfirm={() => handleDeleteModel(record.id, record.name)}
                okText="Delete"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [handleOpenEditModal],
  );

  return (
    <PageContainer
      title="Warehouse Inventory"
      subtitle="Master Device Models catalog, real-time warehouse stockroom levels, and batch hardware intake."
      breadcrumbs={[{ title: 'Warehouse Inventory' }]}
      stats={statsItems}
      extra={
        <Flex gap={8}>
          <Tooltip title="Refresh stock levels">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenIntake()}>
            Receive Units (Intake)
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleOpenCreateModel}>
            Create Item
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search by SKU, item name, model, bin..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={16}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 180 }}
                placeholder="Category"
                options={categoryOptions}
              />
              <Select
                value={stockFilter}
                onChange={setStockFilter}
                style={{ width: 170 }}
                placeholder="Stock Status"
                options={STOCK_STATUS_FILTER_OPTIONS}
              />
              {organizations.length > 0 && (
                <Select
                  value={orgFilter}
                  onChange={setOrgFilter}
                  style={{ width: 160 }}
                  placeholder="Organization"
                  options={[{ label: 'All Organizations', value: 'all' }, ...orgOptions]}
                />
              )}
              {(Boolean(searchQuery) ||
                categoryFilter !== 'all' ||
                stockFilter !== 'all' ||
                orgFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStockFilter('all');
                    setOrgFilter('all');
                  }}
                >
                  Reset
                </Button>
              )}
            </Flex>
          </Col>
        </Row>

        <Table
          size="middle"
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `Total ${total} items`,
          }}
        />
      </Card>

      {/* Create / Edit Inventory Item / Model Drawer */}
      <DeviceModelDrawer
        open={modalOpen}
        model={editingItem}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Restock Modal */}
      <Modal
        title={restockItem ? `Restock: ${restockItem.name}` : 'Restock Item'}
        open={restockModalOpen}
        onOk={handleConfirmRestock}
        onCancel={() => setRestockModalOpen(false)}
        confirmLoading={restocking}
        destroyOnHidden={true}
        okText="Update Stock"
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            Current quantity:{' '}
            <strong>{restockItem?.quantity ?? restockItem?.availableUnits ?? 0} units</strong>
          </Text>
        </div>
        <Form layout="vertical">
          <Form.Item label="Quantity to Add" required>
            <InputNumber
              min={1}
              max={10000}
              value={restockQty}
              onChange={(val) => setRestockQty(val || 1)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Batch Stock Intake Drawer */}
      <BatchStockIntakeDrawer
        open={intakeDrawerOpen}
        model={intakeTargetModel}
        models={items}
        onClose={() => setIntakeDrawerOpen(false)}
        onSuccess={loadData}
      />

      {/* Allocate from Stock Drawer */}
      <BatchAssignModal
        open={allocateDrawerOpen}
        assets={allocatingAssets}
        submitting={allocateSubmitting}
        onAssign={handleExecuteAllocation}
        onCancel={() => setAllocateDrawerOpen(false)}
      />

      {/* Inventory Item / Model Detail Drawer */}
      <InventoryDetailDrawer
        open={detailDrawerOpen}
        item={detailItem}
        onClose={() => setDetailDrawerOpen(false)}
        onEdit={handleOpenEditModal}
        onRestock={handleOpenIntake}
      />
    </PageContainer>
  );
}
