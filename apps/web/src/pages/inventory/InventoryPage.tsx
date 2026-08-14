import {
  AlertOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  ShoppingOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Badge,
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
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'Cables & Adapters' | 'Peripherals' | 'Storage & RAM' | 'Power & Battery' | 'Tooling';
  quantity: number;
  minThreshold: number;
  unitCost: number;
  location: string;
  binNumber: string;
  supplier: string;
  notes?: string;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    sku: 'CAB-CAT6-2M',
    name: 'Cat6 Snagless RJ45 Patch Cable (2m, Blue)',
    category: 'Cables & Adapters',
    quantity: 48,
    minThreshold: 15,
    unitCost: 4.5,
    location: 'Storage Room A',
    binNumber: 'Bin A-04',
    supplier: 'Monoprice B2B',
    notes: 'Standard deployment cable for desk setups.',
  },
  {
    id: '2',
    sku: 'ACC-MSE-MX3S',
    name: 'Logitech MX Master 3S Wireless Mouse',
    category: 'Peripherals',
    quantity: 2,
    minThreshold: 5,
    unitCost: 99.0,
    location: 'Storage Room A',
    binNumber: 'Shelf 2',
    supplier: 'CDW Direct',
    notes: 'Low stock warning! Restock order PO-9921 placed.',
  },
  {
    id: '3',
    sku: 'ACC-USB-C-DOCK',
    name: 'CalDigit TS4 Thunderbolt 4 Dock 18-Port',
    category: 'Peripherals',
    quantity: 6,
    minThreshold: 4,
    unitCost: 379.0,
    location: 'Storage Room B',
    binNumber: 'Cabinet Secure-1',
    supplier: 'B&H Photo Video',
  },
  {
    id: '4',
    sku: 'RAM-DDR5-32G',
    name: 'Crucial 32GB DDR5-5600 SODIMM Laptop RAM',
    category: 'Storage & RAM',
    quantity: 12,
    minThreshold: 6,
    unitCost: 110.0,
    location: 'IT Tech Lab',
    binNumber: 'Anti-Static Drawer 3',
    supplier: 'Newegg Business',
  },
  {
    id: '5',
    sku: 'PWR-APL-140W',
    name: 'Apple 140W USB-C Power Adapter + MagSafe 3',
    category: 'Power & Battery',
    quantity: 14,
    minThreshold: 5,
    unitCost: 99.0,
    location: 'Storage Room A',
    binNumber: 'Shelf 1',
    supplier: 'Apple Enterprise',
  },
  {
    id: '6',
    sku: 'ADP-TB-LAN',
    name: 'Belkin USB-C to 2.5Gbps Gigabit Ethernet Adapter',
    category: 'Cables & Adapters',
    quantity: 0,
    minThreshold: 5,
    unitCost: 35.0,
    location: 'Storage Room A',
    binNumber: 'Bin A-12',
    supplier: 'Amazon Business',
    notes: 'Completely depleted. Pending supplier restock.',
  },
];

export default function InventoryPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);

  const [form] = Form.useForm();

  // Metrics
  const totalStockUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValuation = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const lowStockCount = items.filter((i) => i.quantity > 0 && i.quantity < i.minThreshold).length;
  const outOfStockCount = items.filter((i) => i.quantity === 0).length;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;

    let matchesStock = true;
    if (stockStatusFilter === 'in_stock') matchesStock = item.quantity >= item.minThreshold;
    if (stockStatusFilter === 'low_stock')
      matchesStock = item.quantity > 0 && item.quantity < item.minThreshold;
    if (stockStatusFilter === 'out_of_stock') matchesStock = item.quantity === 0;

    return matchesSearch && matchesCat && matchesStock;
  });

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      sku: `ITM-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Cables & Adapters',
      quantity: 10,
      minThreshold: 5,
      unitCost: 25,
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
      const formattedItem: InventoryItem = {
        id: editingItem ? editingItem.id : String(Date.now()),
        sku: values.sku,
        name: values.name,
        category: values.category,
        quantity: values.quantity,
        minThreshold: values.minThreshold,
        unitCost: values.unitCost || 0,
        location: values.location,
        binNumber: values.binNumber || 'Unassigned',
        supplier: values.supplier || 'Direct Order',
        notes: values.notes,
      };

      if (editingItem) {
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? formattedItem : i)));
        message.success(`Item "${formattedItem.sku}" updated.`);
      } else {
        setItems((prev) => [formattedItem, ...prev]);
        message.success(`Item "${formattedItem.sku}" added to inventory.`);
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    message.success('Inventory SKU removed.');
  };

  const handleOpenRestock = (item: InventoryItem) => {
    setRestockTarget(item);
    setRestockQty(10);
    setRestockModalOpen(true);
  };

  const handleConfirmRestock = () => {
    if (!restockTarget) return;
    const updated = {
      ...restockTarget,
      quantity: restockTarget.quantity + restockQty,
    };
    setItems((prev) => prev.map((i) => (i.id === restockTarget.id ? updated : i)));
    message.success(
      `Restocked +${restockQty} units of ${restockTarget.sku}. New total: ${updated.quantity}`,
    );
    setRestockModalOpen(false);
  };

  const columns = [
    {
      title: 'SKU & Item Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: InventoryItem) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {name}
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            <Text code>{record.sku}</Text> • {record.supplier}
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
      width: 220,
      render: (_: any, record: InventoryItem) => {
        let tagColor = 'success';
        let statusLabel = 'In Stock';
        if (record.quantity === 0) {
          tagColor = 'error';
          statusLabel = 'Out of Stock';
        } else if (record.quantity < record.minThreshold) {
          tagColor = 'warning';
          statusLabel = 'Low Stock';
        }

        const maxScale = Math.max(record.minThreshold * 2, record.quantity);
        const percent =
          maxScale > 0 ? Math.min(100, Math.round((record.quantity / maxScale) * 100)) : 0;

        return (
          <div>
            <Flex justify="space-between" align="center" style={{ fontSize: 12, marginBottom: 2 }}>
              <Text strong>{record.quantity} units</Text>
              <Tag color={tagColor} style={{ margin: 0 }}>
                {statusLabel}
              </Tag>
            </Flex>
            <Progress
              percent={percent}
              size="small"
              strokeColor={
                record.quantity === 0
                  ? '#ff4d4f'
                  : record.quantity < record.minThreshold
                    ? '#faad14'
                    : '#52c41a'
              }
              showInfo={false}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Min Threshold: {record.minThreshold} units
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Unit Cost / Total Value',
      key: 'valuation',
      render: (_: any, record: InventoryItem) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            ${(record.quantity * record.unitCost).toLocaleString()}
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            ${record.unitCost} / unit
          </Text>
        </div>
      ),
    },
    {
      title: 'Storage Location',
      dataIndex: 'location',
      key: 'location',
      render: (location: string, record: InventoryItem) => (
        <div>
          <Text style={{ fontSize: 13 }}>{location}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            {record.binNumber}
          </Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: InventoryItem) => (
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
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this SKU?"
            description="Are you sure you want to remove this hardware stock item?"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button type="text" shape="circle" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Hardware & Consumables Inventory"
      subtitle="Track physical accessories, cables, docks, replacement parts, and storage bins."
      breadcrumbs={[{ title: 'Inventory' }]}
      stats={[
        {
          title: 'Total Catalog SKUs',
          value: items.length,
          prefix: <DatabaseOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Units in Stock',
          value: totalStockUnits,
          prefix: <CheckCircleOutlined />,
          color: '#52c41a',
        },
        {
          title: 'Total Stock Valuation',
          value: `$${totalValuation.toLocaleString()}`,
          prefix: <DollarOutlined />,
          color: '#722ed1',
        },
        {
          title: 'Low / Depleted Stock',
          value: lowStockCount + outOfStockCount,
          prefix: <AlertOutlined />,
          color: lowStockCount + outOfStockCount > 0 ? '#ff4d4f' : '#8c8c8c',
        },
      ]}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
          Add Inventory SKU
        </Button>
      }
    >
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Search by SKU, item name, bin, supplier..."
              prefix={<FilterOutlined style={{ color: '#8c8c8c' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Flex gap={12} justify="flex-end" wrap>
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 170 }}
                placeholder="Category"
              >
                <Option value="all">All Categories</Option>
                <Option value="Cables & Adapters">Cables & Adapters</Option>
                <Option value="Peripherals">Peripherals</Option>
                <Option value="Storage & RAM">Storage & RAM</Option>
                <Option value="Power & Battery">Power & Battery</Option>
              </Select>

              <Select
                value={stockStatusFilter}
                onChange={setStockStatusFilter}
                style={{ width: 150 }}
                placeholder="Stock Status"
              >
                <Option value="all">All Stock Levels</Option>
                <Option value="in_stock">In Stock Normal</Option>
                <Option value="low_stock">Low Stock Warning</Option>
                <Option value="out_of_stock">Out of Stock</Option>
              </Select>

              {(searchQuery || categoryFilter !== 'all' || stockStatusFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStockStatusFilter('all');
                  }}
                >
                  Reset
                </Button>
              )}
            </Flex>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        title={editingItem ? `Edit SKU: ${editingItem.sku}` : 'Add New Inventory SKU'}
        open={modalOpen}
        onOk={handleSaveItem}
        onCancel={() => setModalOpen(false)}
        width={680}
        okText={editingItem ? 'Save Changes' : 'Create Item'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
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

          <Row gutter={16}>
            <Col span={8}>
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
            <Col span={8}>
              <Form.Item
                label="Current Quantity in Stock"
                name="quantity"
                rules={[{ required: true }]}
              >
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
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Unit Cost ($)" name="unitCost">
                <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Storage Room / Lab" name="location" rules={[{ required: true }]}>
                <Input placeholder="e.g. Storage Room A" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Bin / Shelf Number" name="binNumber">
                <Input placeholder="e.g. Bin A-04" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Primary Supplier / Vendor" name="supplier">
            <Input placeholder="e.g. Monoprice B2B Direct" />
          </Form.Item>

          <Form.Item label="Notes & Technical Specs" name="notes">
            <Input.TextArea
              rows={2}
              placeholder="Add any details regarding manufacturer or compatibility..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Quick Restock Modal */}
      {restockTarget && (
        <Modal
          title={`Restock: ${restockTarget.name}`}
          open={restockModalOpen}
          onOk={handleConfirmRestock}
          onCancel={() => setRestockModalOpen(false)}
          okText="Confirm Restock"
        >
          <Flex vertical gap={12} style={{ padding: '12px 0' }}>
            <Text type="secondary">
              Current inventory on hand: <Text strong>{restockTarget.quantity} units</Text> (
              {restockTarget.location})
            </Text>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Quantity to Add:
              </Text>
              <InputNumber
                min={1}
                max={500}
                value={restockQty}
                onChange={(val) => setRestockQty(val || 1)}
                style={{ width: '100%' }}
              />
            </div>
            <Flex gap={8}>
              {[5, 10, 25, 50, 100].map((qty) => (
                <Button key={qty} size="small" onClick={() => setRestockQty(qty)}>
                  +{qty}
                </Button>
              ))}
            </Flex>
            <Divider style={{ margin: '8px 0' }} />
            <Text strong style={{ color: '#1677ff' }}>
              New stock level will be: {restockTarget.quantity + restockQty} units
            </Text>
          </Flex>
        </Modal>
      )}
    </PageContainer>
  );
}
