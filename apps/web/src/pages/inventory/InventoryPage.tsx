import {
  AlertOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Divider,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import PageContainer from '../../components/PageContainer';
import {
  type InventoryCategory,
  type InventoryItem,
  type InventoryStats,
  inventoryService,
} from '../../services/inventory.service';
import { type LocationBranch, organizationService } from '../../services/organization.service';
import { type Vendor, vendorService } from '../../services/vendor.service';

const { Text } = Typography;

export const INVENTORY_CATEGORY_COLORS: Record<string, string> = {
  'Cables & Adapters': 'cyan',
  Peripherals: 'blue',
  'Storage & RAM': 'purple',
  'Power & Battery': 'orange',
  Tooling: 'geekblue',
  'General Supplies': 'default',
};

const StockLevelCell: React.FC<{ record: InventoryItem }> = ({ record }) => {
  const isDepleted = record.quantity === 0;
  const isLow = record.quantity > 0 && record.quantity < record.minThreshold;
  const strokeColor = isDepleted ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
  const status = isDepleted ? 'exception' : isLow ? 'active' : 'normal';
  const percent = Math.min(100, (record.quantity / (record.minThreshold * 2)) * 100);

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
        <Text strong style={{ color: isDepleted ? '#ef4444' : isLow ? '#f59e0b' : undefined }}>
          {record.quantity} units
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Min: {record.minThreshold}
        </Text>
      </Flex>
      <Progress
        percent={percent}
        status={status}
        strokeColor={strokeColor}
        size="small"
        showInfo={false}
      />
      {isDepleted && (
        <Tag color="error" style={{ fontSize: 10, marginTop: 2 }}>
          Out of Stock
        </Tag>
      )}
      {isLow && (
        <Tag color="warning" style={{ fontSize: 10, marginTop: 2 }}>
          Low Stock
        </Tag>
      )}
    </div>
  );
};

export default function InventoryPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<Array<InventoryItem>>([]);
  const [categories, setCategories] = useState<Array<InventoryCategory>>([]);
  const [locations, setLocations] = useState<Array<LocationBranch>>([]);
  const [vendors, setVendors] = useState<Array<Vendor>>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalSkus: 0,
    totalUnits: 0,
    totalValuation: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restocking, setRestocking] = useState(false);

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData, cats, locs, vends] = await Promise.all([
        inventoryService.getItems({
          search: searchQuery || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          stockStatus: stockFilter !== 'all' ? stockFilter : undefined,
        }),
        inventoryService.getStats().catch((_error: unknown) => null),
        inventoryService.getCategories().catch((_error: unknown) => []),
        organizationService.getLocations().catch((_error: unknown) => []),
        vendorService.getVendors().catch((_error: unknown) => []),
      ]);
      setItems(list);
      setCategories(cats);
      setLocations(locs);
      setVendors(vends);

      if (statsData) {
        setStats(statsData);
      } else {
        const totalUnits = list.reduce((sum, i) => sum + i.quantity, 0);
        const totalValuation = list.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
        const lowStockCount = list.filter(
          (i) => i.quantity > 0 && i.quantity < i.minThreshold,
        ).length;
        const outOfStockCount = list.filter((i) => i.quantity === 0).length;
        setStats({
          totalSkus: list.length,
          totalUnits,
          totalValuation,
          lowStockCount,
          outOfStockCount,
        });
      }
    } catch (_err: unknown) {
      message.error('Failed to load inventory items.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, message, searchQuery, stockFilter]);

  const [searchParams] = useSearchParams();
  const deepLinkSku = searchParams.get('sku') || searchParams.get('id');

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Options for Relational Dropdowns
  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        label: c.name,
        value: c.id,
      })),
    [categories],
  );

  const locationOptions = useMemo(
    () =>
      locations.map((loc) => ({
        label: `${loc.name} ${loc.building ? `(${loc.building} - ${loc.floor})` : ''}`,
        value: loc.id,
      })),
    [locations],
  );

  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        label: `${v.name}${v.contactEmail ? ` (${v.contactEmail})` : ''}`,
        value: v.id,
      })),
    [vendors],
  );

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      categoryId: categories[0]?.id,
      quantity: 10,
      minThreshold: 5,
      unitCost: 15,
      locationId: locations[0]?.id,
      binNumber: 'Bin A-01',
      vendorId: vendors[0]?.id,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = useCallback(
    (item: InventoryItem) => {
      setEditingItem(item);
      form.setFieldsValue({
        sku: item.sku,
        name: item.name,
        categoryId:
          item.categoryId ||
          (item.category && typeof item.category === 'object' ? item.category.id : undefined),
        locationId:
          item.locationId ||
          (item.location && typeof item.location === 'object'
            ? (item.location as { id: string }).id
            : undefined),
        vendorId:
          item.vendorId ||
          (item.vendor && typeof item.vendor === 'object' ? item.vendor.id : undefined),
        binNumber: item.binNumber,
        quantity: item.quantity,
        minThreshold: item.minThreshold,
        unitCost: item.unitCost,
        supplier: item.supplier,
        notes: item.notes,
      });
      setModalOpen(true);
    },
    [form],
  );

  // Deep linking: auto-open item edit modal if sku or id is provided in URL
  useEffect(() => {
    if (deepLinkSku && items.length > 0) {
      const match = items.find(
        (i) =>
          i.sku.toLowerCase() === deepLinkSku.toLowerCase() ||
          i.id.toLowerCase() === deepLinkSku.toLowerCase() ||
          i.name.toLowerCase().includes(deepLinkSku.toLowerCase()),
      );
      if (match) {
        handleOpenEditModal(match);
      }
    }
  }, [deepLinkSku, items, handleOpenEditModal]);

  const handleSaveItem = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      // Resolve supplier name if vendor was chosen
      const selectedVendor = vendors.find((v) => v.id === values.vendorId);
      const supplierName = selectedVendor ? selectedVendor.name : values.supplier || 'Direct Order';

      // Resolve category name for backward compatibility
      const selectedCategory = categories.find((c) => c.id === values.categoryId);
      const categoryName = selectedCategory
        ? selectedCategory.name
        : values.category || 'General Supplies';

      const payload = {
        sku: values.sku,
        name: values.name,
        categoryId: values.categoryId,
        category: categoryName,
        quantity: Number(values.quantity),
        minThreshold: Number(values.minThreshold),
        unitCost: Number(values.unitCost || 0),
        locationId: values.locationId,
        vendorId: values.vendorId,
        binNumber: values.binNumber || 'Unassigned',
        supplier: supplierName,
        notes: values.notes,
      };

      if (editingItem) {
        await inventoryService.updateItem(editingItem.id, payload);
        message.success(`Item "${payload.sku}" updated successfully.`);
      } else {
        await inventoryService.createItem(payload);
        message.success(`Item "${payload.sku}" created successfully.`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save inventory item.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await inventoryService.deleteItem(id);
      message.success('Inventory item deleted successfully.');
      loadData();
    } catch (_err: unknown) {
      message.error('Failed to delete item.');
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
      message.success(`Restocked ${restockQty} units of ${restockItem.name}.`);
      setRestockModalOpen(false);
      loadData();
    } catch (_err: unknown) {
      message.error('Failed to restock item.');
    } finally {
      setRestocking(false);
    }
  };

  const columns = [
    {
      title: 'SKU & Item Name',
      key: 'name',
      sorter: (a: InventoryItem, b: InventoryItem) =>
        a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku),
      render: (_: unknown, record: InventoryItem) => {
        const vendorDisplay = record.vendor?.name || record.supplier;
        return (
          <div>
            <Text code strong style={{ fontSize: 12.5, color: '#1677ff' }}>
              {record.sku}
            </Text>
            <Text
              strong
              style={{ fontSize: 13, display: 'block', cursor: 'pointer' }}
              onClick={() => handleOpenEditModal(record)}
            >
              {record.name}
            </Text>
            {vendorDisplay && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {vendorDisplay}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Category',
      key: 'category',
      sorter: (a: InventoryItem, b: InventoryItem) => {
        const catA = typeof a.category === 'string' ? a.category : a.category?.name || '';
        const catB = typeof b.category === 'string' ? b.category : b.category?.name || '';
        return catA.localeCompare(catB);
      },
      render: (_: unknown, record: InventoryItem) => {
        const catName =
          typeof record.category === 'string'
            ? record.category
            : record.category?.name || 'General';
        const color = INVENTORY_CATEGORY_COLORS[catName] || 'default';
        return <Tag color={color}>{catName}</Tag>;
      },
    },
    {
      title: 'Location & Bin',
      key: 'locationBin',
      render: (_: unknown, record: InventoryItem) => {
        const locName =
          record.location && typeof record.location === 'object'
            ? (record.location as { name: string }).name
            : typeof record.location === 'string'
              ? record.location
              : record.locationName;
        return (
          <Flex vertical gap={2}>
            {locName ? (
              <Tag icon={<EnvironmentOutlined />} color="geekblue">
                {locName}
              </Tag>
            ) : (
              <Text type="secondary">—</Text>
            )}
            {record.binNumber && record.binNumber !== 'Unassigned' && (
              <Text code style={{ fontSize: 11 }}>
                {record.binNumber}
              </Text>
            )}
          </Flex>
        );
      },
    },
    {
      title: 'Stock Level & Threshold',
      key: 'stock',
      width: 200,
      sorter: (a: InventoryItem, b: InventoryItem) => a.quantity - b.quantity,
      render: (_: unknown, record: InventoryItem) => <StockLevelCell record={record} />,
    },
    {
      title: 'Total Value',
      key: 'price',
      sorter: (a: InventoryItem, b: InventoryItem) =>
        a.quantity * a.unitCost - b.quantity * b.unitCost,
      render: (_: unknown, record: InventoryItem) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            $
            {(record.quantity * record.unitCost).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            ${record.unitCost.toFixed(2)}/unit
          </Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: InventoryItem) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<ShoppingOutlined />}
            onClick={() => handleOpenRestock(record)}
          >
            Restock
          </Button>
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
            title="Delete item?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteItem(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" shape="circle" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Inventory"
      subtitle="Track parts, stock levels, and reorder thresholds."
      breadcrumbs={[{ title: 'Inventory' }]}
      stats={[
        {
          title: 'Total SKUs',
          value: stats.totalSkus,
          prefix: <DatabaseOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Total Units',
          value: stats.totalUnits,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Inventory Valuation',
          value: `$${stats.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          prefix: <DollarOutlined />,
          color: '#6366f1',
        },
        {
          title: 'Restock Required',
          value: stats.lowStockCount + stats.outOfStockCount,
          prefix: <AlertOutlined />,
          color: stats.lowStockCount + stats.outOfStockCount > 0 ? '#ef4444' : '#94a3b8',
        },
      ]}
      extra={
        <Flex gap={8}>
          <Tooltip title="Refresh inventory">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Create Item
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        {/* Search & Filter Toolbar */}
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Search by SKU, name, bin, supplier..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 180 }}
                placeholder="Category"
                options={[{ label: 'All Categories', value: 'all' }, ...categoryOptions]}
              />

              <Select
                value={stockFilter}
                onChange={setStockFilter}
                style={{ width: 150 }}
                placeholder="Stock Status"
                options={[
                  { label: 'All Stock Status', value: 'all' },
                  { label: 'In Stock', value: 'in_stock' },
                  { label: 'Low Stock Warning', value: 'low_stock' },
                  { label: 'Out of Stock', value: 'out_of_stock' },
                ]}
              />

              {(searchQuery || categoryFilter !== 'all' || stockFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStockFilter('all');
                  }}
                >
                  Reset
                </Button>
              )}
            </Flex>
          </Col>
        </Row>

        {/* Data Table */}
        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `Total ${total} SKUs`,
          }}
        />
      </Card>

      {/* Add / Edit Inventory Modal */}
      <Modal
        title={editingItem ? `Edit Item: ${editingItem.sku}` : 'Create Item'}
        open={modalOpen}
        onOk={handleSaveItem}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalSubmitting}
        destroyOnHidden={true}
        width={640}
        okText={editingItem ? 'Save Changes' : 'Create Item'}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={14}>
            <Col span={10}>
              <Form.Item
                label="SKU"
                name="sku"
                rules={[{ required: true, message: 'SKU is required' }]}
              >
                <Input placeholder="e.g. CAB-CAT6-2M" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                label="Item Name"
                name="name"
                rules={[{ required: true, message: 'Item name is required' }]}
              >
                <Input placeholder="e.g. Cat6 Snagless RJ45 Patch Cable" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Category"
                name="categoryId"
                rules={[{ required: true, message: 'Category is required' }]}
              >
                <Select
                  placeholder="Select category"
                  showSearch
                  allowClear
                  options={categoryOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Supplier / Vendor"
                name="vendorId"
                rules={[{ required: true, message: 'Vendor is required' }]}
              >
                <Select
                  placeholder="Select approved vendor"
                  showSearch
                  allowClear
                  options={vendorOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={8}>
              <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Minimum Threshold" name="minThreshold" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Unit Cost ($)" name="unitCost" rules={[{ required: true }]}>
                <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Storage Location" name="locationId">
                <Select
                  placeholder="Select warehouse or site location"
                  showSearch
                  allowClear
                  options={locationOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Bin / Shelf Number" name="binNumber">
                <Input placeholder="e.g. Bin A-04" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes & Specifications" name="notes">
            <Input.TextArea rows={2} placeholder="Add reorder notes or package specs..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Restock Quantity Modal */}
      {restockItem && (
        <Modal
          title={`Restock: ${restockItem.name}`}
          open={restockModalOpen}
          onOk={handleConfirmRestock}
          onCancel={() => setRestockModalOpen(false)}
          confirmLoading={restocking}
          destroyOnHidden={true}
          width={400}
          okText="Update Stock"
          styles={{ body: { paddingTop: 16 } }}
        >
          <div style={{ padding: '8px 0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Current stock: <b>{restockItem.quantity} units</b> (
              {typeof restockItem.location === 'object' && restockItem.location !== null
                ? restockItem.location.name
                : typeof restockItem.location === 'string'
                  ? restockItem.location
                  : 'Unassigned'}{' '}
              - {restockItem.binNumber})
            </Text>
            <Divider style={{ margin: '12px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Units to Add:
            </Text>
            <InputNumber
              min={1}
              max={10000}
              value={restockQty}
              onChange={(val) => setRestockQty(val || 1)}
              style={{ width: '100%' }}
              size="large"
            />
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
