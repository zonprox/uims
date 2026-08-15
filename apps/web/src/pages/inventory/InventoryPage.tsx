import {
  AlertOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
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
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import {
  type InventoryItem,
  type InventoryStats,
  inventoryService,
} from '../../services/inventory.service';

const { Text } = Typography;
const { Option } = Select;

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
      const [list, statsData] = await Promise.all([
        inventoryService.getItems({
          search: searchQuery || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          stockStatus: stockFilter !== 'all' ? stockFilter : undefined,
        }),
        inventoryService.getStats().catch(() => null),
      ]);
      setItems(list);
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
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to load inventory items.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, message, searchQuery, stockFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Cables & Adapters',
      quantity: 10,
      minThreshold: 5,
      unitCost: 15,
      location: 'Storage Room A',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalOpen(true);
  };

  const handleSaveItem = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      const payload = {
        sku: values.sku,
        name: values.name,
        category: values.category,
        quantity: Number(values.quantity),
        minThreshold: Number(values.minThreshold),
        unitCost: Number(values.unitCost || 0),
        location: values.location,
        binNumber: values.binNumber || 'Unassigned',
        supplier: values.supplier || 'Direct Order',
        notes: values.notes,
      };

      if (editingItem) {
        await inventoryService.updateItem(editingItem.id, payload);
        message.success(`SKU "${payload.sku}" updated successfully.`);
      } else {
        await inventoryService.createItem(payload);
        message.success(`SKU "${payload.sku}" added to inventory.`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save inventory item.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await inventoryService.deleteItem(id);
      message.success('Inventory item deleted.');
      loadData();
    } catch (err: unknown) {
      console.error(err);
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
      message.success(`Restocked ${restockQty} units of ${restockItem.name}`);
      setRestockModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to restock item.');
    } finally {
      setRestocking(false);
    }
  };

  const handleShowDetails = (item: InventoryItem) => {
    handleOpenEditModal(item);
  };

  const columns = [
    {
      title: 'SKU & Item Name',
      key: 'name',
      render: (_: unknown, record: InventoryItem) => (
        <div>
          <Text code strong style={{ fontSize: 12.5, color: '#1677ff' }}>
            {record.sku}
          </Text>
          <Text
            strong
            style={{ fontSize: 13, display: 'block', cursor: 'pointer' }}
            onClick={() => handleShowDetails(record)}
          >
            {record.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.supplier}
          </Text>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: 'Stock Level & Threshold',
      key: 'stock',
      width: 200,
      render: (_: unknown, record: InventoryItem) => <StockLevelCell record={record} />,
    },
    {
      title: 'Unit Valuation',
      key: 'price',
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
            title="Delete this SKU?"
            description="Remove this consumable from inventory?"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="Delete"
            okType="danger"
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
      title="Consumables & Inventory Management"
      subtitle="Track stock levels, storage bins, suppliers, and automatic restock thresholds."
      breadcrumbs={[{ title: 'Inventory' }]}
      stats={[
        {
          title: 'Total Tracked SKUs',
          value: stats.totalSkus,
          prefix: <DatabaseOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Total Stocked Units',
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
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Add Inventory SKU
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
                style={{ width: 160 }}
                placeholder="Category"
              >
                <Option value="all">All Categories</Option>
                <Option value="Cables & Adapters">Cables & Adapters</Option>
                <Option value="Peripherals">Peripherals</Option>
                <Option value="Storage & RAM">Storage & RAM</Option>
                <Option value="Power & Battery">Power & Battery</Option>
                <Option value="Tooling">Tooling</Option>
              </Select>

              <Select
                value={stockFilter}
                onChange={setStockFilter}
                style={{ width: 140 }}
                placeholder="Stock Status"
              >
                <Option value="all">All Stock Status</Option>
                <Option value="in_stock">In Stock</Option>
                <Option value="low_stock">Low Stock Warning</Option>
                <Option value="out_of_stock">Out of Stock</Option>
              </Select>

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
          pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} SKUs` }}
        />
      </Card>

      {/* Add / Edit Inventory Modal */}
      <Modal
        title={editingItem ? `Edit SKU: ${editingItem.sku}` : 'Add Inventory SKU'}
        open={modalOpen}
        onOk={handleSaveItem}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={620}
        okText={editingItem ? 'Save Changes' : 'Create Item'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={10}>
              <Form.Item label="SKU Code" name="sku" rules={[{ required: true }]}>
                <Input placeholder="e.g. CAB-CAT6-2M" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item label="Item Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Cat6 Snagless RJ45 Patch Cable" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select>
                  <Option value="Cables & Adapters">Cables & Adapters</Option>
                  <Option value="Peripherals">Peripherals</Option>
                  <Option value="Storage & RAM">Storage & RAM</Option>
                  <Option value="Power & Battery">Power & Battery</Option>
                  <Option value="Tooling">Tooling</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Supplier / Vendor" name="supplier" rules={[{ required: true }]}>
                <Input placeholder="e.g. Monoprice / CDW" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={8}>
              <Form.Item label="Current Quantity" name="quantity" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Min Alert Threshold"
                name="minThreshold"
                rules={[{ required: true }]}
              >
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
              <Form.Item label="Storage Location" name="location">
                <Input placeholder="e.g. Storage Room A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Bin / Shelf Number" name="binNumber">
                <Input placeholder="e.g. Bin A-04" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes & Replenishment Info" name="notes">
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
          width={400}
          okText="Receive Stock"
        >
          <div style={{ padding: '8px 0' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Current stock: <b>{restockItem.quantity} units</b> ({restockItem.location} -{' '}
              {restockItem.binNumber})
            </Text>
            <Divider style={{ margin: '12px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Units to Add to Stock:
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
