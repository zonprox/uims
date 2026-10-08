import {
  AlertOutlined,
  BankOutlined,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import PageContainer from '../../components/PageContainer';
import { formatErrorMessage } from '../../utils/feedback';
import { formRules, isValidationError } from '../../utils/formValidators';
import {
  type InventoryCategory,
  type InventoryItem,
  type InventoryStats,
  inventoryService,
} from '../../services/inventory.service';
import {
  type Organization,
  organizationService,
} from '../../services/organization.service';
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
  const [organizations, setOrganizations] = useState<Array<Organization>>([]);
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
  const [orgFilter, setOrgFilter] = useState<string>('all');

  const orgOptions = useMemo(
    () => organizations.map((o) => ({ label: o.name, value: o.id })),
    [organizations],
  );

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

  // Options for Relational Dropdowns
  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        label: c.name,
        value: c.id,
      })),
    [categories],
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
        vendorId:
          item.vendorId ||
          (item.vendor && typeof item.vendor === 'object' ? item.vendor.id : undefined),
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
        vendorId: values.vendorId,
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
      if (isValidationError(err)) return;
      message.error(formatErrorMessage(err, 'save inventory item'));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await inventoryService.deleteItem(id);
      message.success('Inventory item deleted successfully.');
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
      message.success(`Restocked ${restockQty} units of ${restockItem.name}.`);
      setRestockModalOpen(false);
      loadData();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'restock inventory item'));
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
      title: 'Storage Bin',
      key: 'binNumber',
      render: (_: unknown, record: InventoryItem) => {
        return (
          <Flex vertical gap={2}>
            {record.organization && (
              <Tag
                color="purple"
                icon={<BankOutlined />}
                style={{ fontSize: 10.5, width: 'fit-content' }}
              >
                {record.organization}
              </Tag>
            )}
            {record.binNumber && record.binNumber !== 'Unassigned' ? (
              <Tag color="cyan" style={{ fontSize: 11, width: 'fit-content' }}>
                {record.binNumber}
              </Tag>
            ) : (
              !record.organization && <Text type="secondary">—</Text>
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
      width: 170,
      fixed: 'right' as const,
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
      subtitle="Track parts, stock levels, consumables, and reorder thresholds."
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
                value={orgFilter}
                onChange={setOrgFilter}
                style={{ width: 160 }}
                placeholder="Organization"
                options={[{ label: 'All Organizations', value: 'all' }, ...orgOptions]}
              />

              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 170 }}
                placeholder="Category"
                options={[{ label: 'All Categories', value: 'all' }, ...categoryOptions]}
              />

              <Select
                value={stockFilter}
                onChange={setStockFilter}
                style={{ width: 145 }}
                placeholder="Stock Status"
                options={[
                  { label: 'All Stock Status', value: 'all' },
                  { label: 'In Stock', value: 'in_stock' },
                  { label: 'Low Stock Warning', value: 'low_stock' },
                  { label: 'Out of Stock', value: 'out_of_stock' },
                ]}
              />

              {(searchQuery ||
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

        {/* Data Table */}
        <Table
          size="middle"
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
        <Form
          form={form}
          layout="vertical"
          validateTrigger={['onChange', 'onBlur']}
          scrollToFirstError={true}
        >
          <Row gutter={14}>
            <Col span={10}>
              <Form.Item
                label="SKU"
                name="sku"
                rules={[
                  formRules.required('SKU'),
                  formRules.stringRange('SKU', 1, 50),
                  formRules.sku('SKU'),
                ]}
              >
                <Input placeholder="e.g. CAB-CAT6-2M" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                label="Item Name"
                name="name"
                rules={[
                  formRules.required('Item name'),
                  formRules.stringRange('Item name', 2, 200),
                ]}
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
                rules={[formRules.required('Category is required')]}
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
                rules={[formRules.required('Vendor is required')]}
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
              <Form.Item
                label="Quantity"
                name="quantity"
                rules={[
                  formRules.required('Quantity is required'),
                  formRules.integer(0, 1000000, 'Quantity must be a non-negative integer'),
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Minimum Threshold"
                name="minThreshold"
                rules={[
                  formRules.required('Minimum threshold is required'),
                  formRules.integer(0, 100000, 'Minimum threshold must be a non-negative integer'),
                ]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Unit Cost ($)"
                name="unitCost"
                rules={[
                  formRules.required('Unit cost is required'),
                  formRules.currency('Unit cost', 100000000, 'Unit cost must be a non-negative number'),
                ]}
              >
                <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={24}>
              <Form.Item label="Storage Bin" name="binNumber">
                <Input placeholder="e.g. BIN-A1-04" />
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
              Current stock: <b>{restockItem.quantity} units</b>
              {restockItem.binNumber && restockItem.binNumber !== 'Unassigned'
                ? ` (Bin: ${restockItem.binNumber})`
                : ''}
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
