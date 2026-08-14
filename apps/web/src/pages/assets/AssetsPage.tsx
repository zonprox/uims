import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  HistoryOutlined,
  LaptopOutlined,
  PlusOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  QRCode,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export interface Asset {
  id: string;
  tag: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  category: 'Laptop' | 'Desktop' | 'Server' | 'Monitor' | 'Networking' | 'Mobile';
  status: 'Active' | 'In Repair' | 'In Storage' | 'Retired';
  assignedTo: string;
  assignedEmail: string;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  warrantyExpiry: string;
  specs: {
    cpu: string;
    ram: string;
    storage: string;
    os: string;
  };
  notes?: string;
}

const INITIAL_ASSETS: Asset[] = [
  {
    id: '1',
    tag: 'AST-1024',
    name: 'MacBook Pro 16" M3 Max',
    manufacturer: 'Apple',
    model: 'MacBookPro18,2',
    serialNumber: 'C02G8392MD6R',
    category: 'Laptop',
    status: 'Active',
    assignedTo: 'Marcus Vance',
    assignedEmail: 'marcus.vance@company.com',
    location: 'NY Office - Floor 4',
    purchaseDate: '2024-01-15',
    purchasePrice: 3499,
    warrantyExpiry: '2027-01-15',
    specs: {
      cpu: 'Apple M3 Max (16-core)',
      ram: '64 GB Unified',
      storage: '1 TB NVMe SSD',
      os: 'macOS Sonoma 14.4',
    },
    notes: 'Issued for Lead Product Designer with multi-display hub.',
  },
  {
    id: '2',
    tag: 'AST-1025',
    name: 'Dell UltraSharp 32" 4K Monitor',
    manufacturer: 'Dell',
    model: 'U3223QE',
    serialNumber: 'CN-0N179F-74261',
    category: 'Monitor',
    status: 'Active',
    assignedTo: 'Marcus Vance',
    assignedEmail: 'marcus.vance@company.com',
    location: 'NY Office - Floor 4',
    purchaseDate: '2024-01-20',
    purchasePrice: 899,
    warrantyExpiry: '2027-01-20',
    specs: {
      cpu: 'N/A',
      ram: 'N/A',
      storage: 'N/A',
      os: 'Firmware v1.04',
    },
  },
  {
    id: '3',
    tag: 'AST-1026',
    name: 'Dell PowerEdge R750 Server',
    manufacturer: 'Dell',
    model: 'PowerEdge R750 2U',
    serialNumber: '8X9K3M2',
    category: 'Server',
    status: 'Active',
    assignedTo: 'IT Operations',
    assignedEmail: 'it-ops@company.com',
    location: 'Data Center Rack B-04',
    purchaseDate: '2023-05-10',
    purchasePrice: 8500,
    warrantyExpiry: '2028-05-10',
    specs: {
      cpu: '2x Intel Xeon Gold 6330',
      ram: '256 GB ECC DDR4',
      storage: '8x 3.84TB SAS SSD RAID 10',
      os: 'Ubuntu Server 22.04 LTS',
    },
    notes: 'Hosts primary internal Kubernetes cluster nodes.',
  },
  {
    id: '4',
    tag: 'AST-1027',
    name: 'Lenovo ThinkPad X1 Carbon Gen 11',
    manufacturer: 'Lenovo',
    model: 'ThinkPad 21HM',
    serialNumber: 'PF-39K21L',
    category: 'Laptop',
    status: 'In Repair',
    assignedTo: 'Sarah Chen',
    assignedEmail: 'sarah.chen@company.com',
    location: 'IT Repair Center',
    purchaseDate: '2023-08-14',
    purchasePrice: 1950,
    warrantyExpiry: '2026-08-14',
    specs: {
      cpu: 'Intel Core i7-1365U',
      ram: '32 GB LPDDR5',
      storage: '512 GB PCIe 4.0 SSD',
      os: 'Windows 11 Pro',
    },
    notes: 'Sent to Lenovo service center for battery replacement under warranty.',
  },
  {
    id: '5',
    tag: 'AST-1028',
    name: 'Cisco Catalyst 9300 48-Port Switch',
    manufacturer: 'Cisco',
    model: 'C9300-48P-A',
    serialNumber: 'FOC2438L0K4',
    category: 'Networking',
    status: 'Active',
    assignedTo: 'Network Team',
    assignedEmail: 'network-ops@company.com',
    location: 'SF HQ Server Room',
    purchaseDate: '2022-11-01',
    purchasePrice: 4200,
    warrantyExpiry: '2027-11-01',
    specs: {
      cpu: 'Cisco Quad-core x86',
      ram: '16 GB DRAM',
      storage: '16 GB Flash',
      os: 'Cisco IOS XE 17.9',
    },
  },
  {
    id: '6',
    tag: 'AST-1029',
    name: 'Apple iPad Pro 12.9" M2',
    manufacturer: 'Apple',
    model: 'iPadPro6,6',
    serialNumber: 'DMP8271LK3M',
    category: 'Mobile',
    status: 'In Storage',
    assignedTo: 'Unassigned',
    assignedEmail: '',
    location: 'IT Storage Vault A',
    purchaseDate: '2023-09-12',
    purchasePrice: 1199,
    warrantyExpiry: '2025-09-12',
    specs: {
      cpu: 'Apple M2 (8-core)',
      ram: '8 GB Unified',
      storage: '256 GB Storage',
      os: 'iPadOS 17.4',
    },
    notes: 'Available for immediate checkout by field sales team.',
  },
];

export default function AssetsPage() {
  const { message, modal } = App.useApp();
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal / Drawer state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);

  const [form] = Form.useForm();

  // Filtered Assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenCreateModal = () => {
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
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    form.setFieldsValue({
      ...asset,
      purchaseDate: asset.purchaseDate ? dayjs(asset.purchaseDate) : undefined,
      warrantyExpiry: asset.warrantyExpiry ? dayjs(asset.warrantyExpiry) : undefined,
      cpu: asset.specs.cpu,
      ram: asset.specs.ram,
      storage: asset.specs.storage,
      os: asset.specs.os,
    });
    setModalOpen(true);
  };

  const handleSaveAsset = async () => {
    try {
      const values = await form.validateFields();
      const formattedAsset: Asset = {
        id: editingAsset ? editingAsset.id : String(Date.now()),
        tag: values.tag,
        name: values.name,
        manufacturer: values.manufacturer,
        model: values.model,
        serialNumber: values.serialNumber,
        category: values.category,
        status: values.status,
        assignedTo: values.assignedTo || 'Unassigned',
        assignedEmail: values.assignedEmail || '',
        location: values.location,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : '',
        purchasePrice: values.purchasePrice || 0,
        warrantyExpiry: values.warrantyExpiry ? values.warrantyExpiry.format('YYYY-MM-DD') : '',
        specs: {
          cpu: values.cpu || 'N/A',
          ram: values.ram || 'N/A',
          storage: values.storage || 'N/A',
          os: values.os || 'N/A',
        },
        notes: values.notes,
      };

      if (editingAsset) {
        setAssets((prev) => prev.map((a) => (a.id === editingAsset.id ? formattedAsset : a)));
        message.success(`Asset "${formattedAsset.tag}" updated successfully.`);
      } else {
        setAssets((prev) => [formattedAsset, ...prev]);
        message.success(`Asset "${formattedAsset.tag}" added to inventory.`);
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    message.success('Asset deleted successfully.');
  };

  const handleShowDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setDetailDrawerOpen(true);
  };

  const handleShowQr = (asset: Asset) => {
    setQrAsset(asset);
    setQrModalOpen(true);
  };

  const columns = [
    {
      title: 'Asset Tag',
      dataIndex: 'tag',
      key: 'tag',
      render: (tag: string, record: Asset) => (
        <div>
          <Text
            code
            style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer' }}
            onClick={() => handleShowDetails(record)}
          >
            {tag}
          </Text>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>SN: {record.serialNumber}</div>
        </div>
      ),
    },
    {
      title: 'Device & Model',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Asset) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {name}
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {record.manufacturer} • {record.model}
          </Text>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        let icon = <LaptopOutlined />;
        if (category === 'Server') icon = <AppstoreOutlined />;
        return (
          <Space>
            {icon}
            <span>{category}</span>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Asset['status']) => {
        let color = 'success';
        if (status === 'In Repair') color = 'warning';
        if (status === 'In Storage') color = 'processing';
        if (status === 'Retired') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (assignedTo: string, record: Asset) =>
        assignedTo !== 'Unassigned' ? (
          <Flex align="center" gap={6}>
            <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
            <div>
              <Text style={{ fontSize: 13 }}>{assignedTo}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                {record.location}
              </Text>
            </div>
          </Flex>
        ) : (
          <Tag color="default">Unassigned</Tag>
        ),
    },
    {
      title: 'Warranty',
      dataIndex: 'warrantyExpiry',
      key: 'warrantyExpiry',
      render: (warrantyExpiry: string) => {
        const isExpiringSoon = dayjs(warrantyExpiry).diff(dayjs(), 'day') < 180;
        return (
          <div>
            <Text style={{ fontSize: 13 }}>{warrantyExpiry}</Text>
            {isExpiringSoon && (
              <Tag color="warning" style={{ fontSize: 10, display: 'inline-block', marginTop: 2 }}>
                Expires Soon
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Asset) => (
        <Space size="small">
          <Tooltip title="View Detailed Specs">
            <Button
              type="text"
              shape="circle"
              icon={<EyeOutlined />}
              onClick={() => handleShowDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Print QR Label">
            <Button
              type="text"
              shape="circle"
              icon={<QrcodeOutlined />}
              onClick={() => handleShowQr(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Asset">
            <Button
              type="text"
              shape="circle"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this asset?"
            description="Are you sure you want to permanently remove this asset from inventory?"
            onConfirm={() => handleDeleteAsset(record.id)}
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
      title="Hardware Asset Management"
      subtitle="Track full lifecycle, technical specifications, user assignments, and warranty status."
      breadcrumbs={[{ title: 'Assets' }]}
      stats={[
        {
          title: 'Total Assets',
          value: assets.length,
          prefix: <LaptopOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active in Use',
          value: assets.filter((a) => a.status === 'Active').length,
          prefix: <CheckCircleOutlined />,
          color: '#52c41a',
        },
        {
          title: 'In Repair / RMA',
          value: assets.filter((a) => a.status === 'In Repair').length,
          prefix: <WarningOutlined />,
          color: '#faad14',
        },
        {
          title: 'In Storage Vault',
          value: assets.filter((a) => a.status === 'In Storage').length,
          prefix: <AppstoreOutlined />,
          color: '#722ed1',
        },
      ]}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
          Provision New Asset
        </Button>
      }
    >
      <Card styles={{ body: { padding: '20px 24px' } }} style={{ marginBottom: 20 }}>
        {/* Filter and Search Bar */}
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Input
              placeholder="Search by asset tag, serial, model, user, or location..."
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
                style={{ width: 150 }}
                placeholder="Category"
              >
                <Option value="all">All Categories</Option>
                <Option value="Laptop">Laptops</Option>
                <Option value="Desktop">Desktops</Option>
                <Option value="Server">Servers</Option>
                <Option value="Monitor">Monitors</Option>
                <Option value="Networking">Networking</Option>
                <Option value="Mobile">Mobile Devices</Option>
              </Select>

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 140 }}
                placeholder="Status"
              >
                <Option value="all">All Statuses</Option>
                <Option value="Active">Active</Option>
                <Option value="In Repair">In Repair</Option>
                <Option value="In Storage">In Storage</Option>
                <Option value="Retired">Retired</Option>
              </Select>

              {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Reset
                </Button>
              )}
            </Flex>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        {/* Assets Data Table */}
        <Table
          columns={columns}
          dataSource={filteredAssets}
          rowKey="id"
          pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} assets` }}
        />
      </Card>

      {/* Create / Edit Asset Modal */}
      <Modal
        title={editingAsset ? `Edit Asset: ${editingAsset.tag}` : 'Provision New Hardware Asset'}
        open={modalOpen}
        onOk={handleSaveAsset}
        onCancel={() => setModalOpen(false)}
        width={760}
        okText={editingAsset ? 'Save Changes' : 'Create Asset'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Asset Tag"
                name="tag"
                rules={[{ required: true, message: 'Asset Tag is required' }]}
              >
                <Input placeholder="e.g. AST-1042" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Serial Number"
                name="serialNumber"
                rules={[{ required: true, message: 'Serial number is required' }]}
              >
                <Input placeholder="e.g. C02G8392MD6R" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Device / Model Name"
                name="name"
                rules={[{ required: true, message: 'Device name is required' }]}
              >
                <Input placeholder="e.g. MacBook Pro 16 M3 Max" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Manufacturer"
                name="manufacturer"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="e.g. Apple / Dell" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Model Code" name="model">
                <Input placeholder="e.g. A2991" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select>
                  <Option value="Laptop">Laptop</Option>
                  <Option value="Desktop">Desktop</Option>
                  <Option value="Server">Server</Option>
                  <Option value="Monitor">Monitor</Option>
                  <Option value="Networking">Networking</Option>
                  <Option value="Mobile">Mobile Device</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Status" name="status" rules={[{ required: true }]}>
                <Select>
                  <Option value="Active">Active</Option>
                  <Option value="In Repair">In Repair</Option>
                  <Option value="In Storage">In Storage</Option>
                  <Option value="Retired">Retired</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Purchase Price ($)" name="purchasePrice">
                <InputNumber style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Assigned User" name="assignedTo">
                <Input placeholder="e.g. Marcus Vance or Unassigned" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Deployment Location" name="location">
                <Input placeholder="e.g. NY Office - Floor 4" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Purchase Date" name="purchaseDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Warranty Expiration Date" name="warrantyExpiry">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0 16px 0' }}>Technical Specifications</Divider>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Processor (CPU)" name="cpu">
                <Input placeholder="e.g. M3 Max 16-Core" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Memory (RAM)" name="ram">
                <Input placeholder="e.g. 64 GB" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Storage (SSD)" name="storage">
                <Input placeholder="e.g. 1 TB NVMe" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Operating System" name="os">
                <Input placeholder="e.g. macOS Sonoma" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Internal Notes & Accessories" name="notes">
            <Input.TextArea
              rows={2}
              placeholder="Add any special accessories, dock serial, or deployment notes..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Asset Detail Drawer */}
      {selectedAsset && (
        <Drawer
          title={
            <Flex align="center" gap={8}>
              <LaptopOutlined style={{ color: '#1677ff' }} />
              <span>{selectedAsset.name}</span>
              <Tag color="blue">{selectedAsset.tag}</Tag>
            </Flex>
          }
          width={580}
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          extra={
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setDetailDrawerOpen(false);
                handleOpenEditModal(selectedAsset);
              }}
            >
              Edit Asset
            </Button>
          }
        >
          <Tabs
            defaultActiveKey="specs"
            items={[
              {
                key: 'specs',
                label: 'Specs & Overview',
                children: (
                  <div>
                    <Descriptions
                      title="Hardware Identification"
                      bordered
                      size="small"
                      column={1}
                      style={{ marginBottom: 20 }}
                    >
                      <Descriptions.Item label="Asset Tag">{selectedAsset.tag}</Descriptions.Item>
                      <Descriptions.Item label="Serial Number">
                        {selectedAsset.serialNumber}
                      </Descriptions.Item>
                      <Descriptions.Item label="Manufacturer">
                        {selectedAsset.manufacturer}
                      </Descriptions.Item>
                      <Descriptions.Item label="Model">{selectedAsset.model}</Descriptions.Item>
                      <Descriptions.Item label="Category">
                        {selectedAsset.category}
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <Tag color={selectedAsset.status === 'Active' ? 'success' : 'warning'}>
                          {selectedAsset.status}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>

                    <Descriptions
                      title="Hardware Specifications"
                      bordered
                      size="small"
                      column={1}
                      style={{ marginBottom: 20 }}
                    >
                      <Descriptions.Item label="Processor">
                        {selectedAsset.specs.cpu}
                      </Descriptions.Item>
                      <Descriptions.Item label="RAM / Memory">
                        {selectedAsset.specs.ram}
                      </Descriptions.Item>
                      <Descriptions.Item label="Storage Drive">
                        {selectedAsset.specs.storage}
                      </Descriptions.Item>
                      <Descriptions.Item label="Operating System">
                        {selectedAsset.specs.os}
                      </Descriptions.Item>
                    </Descriptions>

                    <Descriptions title="Financial & Warranty" bordered size="small" column={1}>
                      <Descriptions.Item label="Purchase Date">
                        {selectedAsset.purchaseDate}
                      </Descriptions.Item>
                      <Descriptions.Item label="Purchase Cost">
                        ${selectedAsset.purchasePrice.toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Warranty Expiration">
                        {selectedAsset.warrantyExpiry}
                      </Descriptions.Item>
                      <Descriptions.Item label="Current Location">
                        {selectedAsset.location}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                ),
              },
              {
                key: 'assignment',
                label: 'User Assignment',
                children: (
                  <Card size="small">
                    <Flex align="center" gap={12} style={{ marginBottom: 16 }}>
                      <Avatar
                        size={48}
                        style={{ backgroundColor: '#1677ff' }}
                        icon={<UserOutlined />}
                      />
                      <div>
                        <Title level={5} style={{ margin: 0 }}>
                          {selectedAsset.assignedTo}
                        </Title>
                        <Text type="secondary">
                          {selectedAsset.assignedEmail || 'No corporate email linked'}
                        </Text>
                      </div>
                    </Flex>
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="Assigned Location">
                        {selectedAsset.location}
                      </Descriptions.Item>
                      <Descriptions.Item label="Department">Engineering & Design</Descriptions.Item>
                      <Descriptions.Item label="Assignment Date">
                        {selectedAsset.purchaseDate}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ),
              },
              {
                key: 'label',
                label: 'QR Barcode Tag',
                children: (
                  <Flex
                    vertical
                    align="center"
                    justify="center"
                    gap={16}
                    style={{ padding: '24px 0' }}
                  >
                    <div
                      style={{
                        padding: 16,
                        border: '2px dashed #1677ff',
                        borderRadius: 12,
                        background: '#fff',
                        textAlign: 'center',
                      }}
                    >
                      <QRCode
                        value={`https://uims.internal/assets/${selectedAsset.tag}`}
                        size={160}
                      />
                      <div style={{ marginTop: 8, fontWeight: 700, fontSize: 16, color: '#000' }}>
                        {selectedAsset.tag}
                      </div>
                      <div style={{ fontSize: 11, color: '#666' }}>
                        {selectedAsset.serialNumber}
                      </div>
                    </div>
                    <Button icon={<QrcodeOutlined />} onClick={() => window.print()}>
                      Print Barcode Label
                    </Button>
                  </Flex>
                ),
              },
            ]}
          />
        </Drawer>
      )}

      {/* QR Code Modal */}
      {qrAsset && (
        <Modal
          title={`Asset Tag Label: ${qrAsset.tag}`}
          open={qrModalOpen}
          onCancel={() => setQrModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setQrModalOpen(false)}>
              Close
            </Button>,
            <Button key="print" type="primary" onClick={() => window.print()}>
              Print Physical Sticker
            </Button>,
          ]}
          width={380}
          centered
        >
          <Flex vertical align="center" justify="center" gap={12} style={{ padding: '20px 0' }}>
            <QRCode value={`https://uims.internal/assets/${qrAsset.tag}`} size={180} />
            <Text strong style={{ fontSize: 18 }}>
              {qrAsset.tag}
            </Text>
            <Text type="secondary">{qrAsset.name}</Text>
            <Text code>{qrAsset.serialNumber}</Text>
          </Flex>
        </Modal>
      )}
    </PageContainer>
  );
}
