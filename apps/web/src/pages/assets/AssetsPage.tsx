import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
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
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
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
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { type Asset, type AssetStats, assetsService } from '../../services/assets.service';

const { Text, Title } = Typography;
const { Option } = Select;

interface AssetFormValues {
  tag?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  category?: Asset['category'];
  status?: Asset['status'];
  assignedTo?: string;
  location?: string;
  purchaseDate?: dayjs.Dayjs;
  purchasePrice?: number;
  warrantyExpiry?: dayjs.Dayjs;
  cpu?: string;
  ram?: string;
  storage?: string;
  os?: string;
  notes?: string;
}

function buildAssetSpecs(values: AssetFormValues) {
  return {
    cpu: values.cpu ?? 'N/A',
    ram: values.ram ?? 'N/A',
    storage: values.storage ?? 'N/A',
    os: values.os ?? 'N/A',
  };
}

function buildAssetPayload(values: AssetFormValues): Partial<Asset> {
  const specs = buildAssetSpecs(values);
  const purchaseDate = values.purchaseDate?.format('YYYY-MM-DD');
  const warrantyExpiry = values.warrantyExpiry?.format('YYYY-MM-DD');

  return {
    tag: values.tag ?? '',
    name: values.name ?? '',
    manufacturer: values.manufacturer ?? '',
    model: values.model ?? '',
    serialNumber: values.serialNumber ?? '',
    category: values.category ?? 'Laptop',
    status: values.status ?? 'Active',
    assignedTo: values.assignedTo || 'Unassigned',
    location: values.location ?? '',
    purchaseDate,
    purchasePrice: values.purchasePrice ?? 0,
    warrantyExpiry,
    specs,
    notes: values.notes,
  };
}

export default function AssetsPage() {
  const { message } = App.useApp();
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

  // Modal / Drawer state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [exporting, setExporting] = useState(false);

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        assetsService.getAssets({
          search: searchQuery || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        assetsService.getStats().catch(() => null),
      ]);
      setAssets(list);
      if (statsData) {
        setStats(statsData);
      } else {
        setStats({
          total: list.length,
          active: list.filter((a) => a.status === 'Active').length,
          inRepair: list.filter((a) => a.status === 'In Repair').length,
          inStorage: list.filter((a) => a.status === 'In Storage').length,
          retired: list.filter((a) => a.status === 'Retired').length,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to load assets from server.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, message, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      cpu: asset.specs?.cpu,
      ram: asset.specs?.ram,
      storage: asset.specs?.storage,
      os: asset.specs?.os,
    });
    setModalOpen(true);
  };

  const handleSaveAsset = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);
      const payload = buildAssetPayload(values);

      if (editingAsset) {
        await assetsService.updateAsset(editingAsset.id, payload);
        message.success(`Asset "${payload.tag}" updated successfully.`);
      } else {
        await assetsService.createAsset(payload);
        message.success(`Asset "${payload.tag}" added to database.`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save asset.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await assetsService.deleteAsset(id);
      message.success('Asset deleted successfully.');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete asset.');
    }
  };

  const handleShowDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setDetailDrawerOpen(true);
  };

  const handleShowQr = (asset: Asset) => {
    setQrAsset(asset);
    setQrModalOpen(true);
  };

  const handleExportCSV = async () => {
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
      message.success('Assets database exported successfully as CSV.');
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: 'Asset Tag & Name',
      key: 'tag',
      render: (_: unknown, record: Asset) => (
        <div>
          <Flex align="center" gap={8}>
            <Text code strong style={{ fontSize: 13, color: '#1677ff' }}>
              {record.tag}
            </Text>
            <Tag color="geekblue" style={{ fontSize: 11 }}>
              {record.category}
            </Tag>
          </Flex>
          <Text
            strong
            style={{ fontSize: 13, display: 'block', marginTop: 2, cursor: 'pointer' }}
            onClick={() => handleShowDetails(record)}
          >
            {record.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.manufacturer} {record.model}
          </Text>
        </div>
      ),
    },
    {
      title: 'Serial Number',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      render: (serial: string) => (
        <Text code style={{ fontSize: 12 }}>
          {serial || 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Asset['status']) => {
        let color = 'default';
        if (status === 'Active') color = 'success';
        if (status === 'In Repair') color = 'warning';
        if (status === 'In Storage') color = 'processing';
        if (status === 'Retired') color = 'error';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Assigned User',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (user: string) => <Text style={{ fontSize: 13 }}>{user || 'Unassigned Pool'}</Text>,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (loc: string) => <Text style={{ fontSize: 12.5 }}>{loc}</Text>,
    },
    {
      title: 'Warranty Expiry',
      dataIndex: 'warrantyExpiry',
      key: 'warrantyExpiry',
      render: (date: string) => {
        if (!date) return <Text type="secondary">N/A</Text>;
        const isExpiringSoon = dayjs(date).diff(dayjs(), 'day') < 90;
        return (
          <div>
            <Text style={{ fontSize: 12 }}>{date}</Text>
            {isExpiringSoon && (
              <Tag color="warning" style={{ display: 'inline-block', marginTop: 2, fontSize: 10 }}>
                Expiring
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Asset) => (
        <Space size="small">
          <Tooltip title="View Specs">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleShowDetails(record)}
            />
          </Tooltip>
          <Tooltip title="QR Code">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<QrcodeOutlined />}
              onClick={() => handleShowQr(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Asset">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this asset?"
            description="Remove this hardware asset from active inventory?"
            onConfirm={() => handleDeleteAsset(record.id)}
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
      title="Hardware Asset Management"
      subtitle="Track full lifecycle, technical specifications, user assignments, and warranty status."
      breadcrumbs={[{ title: 'Assets' }]}
      stats={[
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
      ]}
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
        {/* Filter and Search Bar */}
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Search tag, serial, model, user, location..."
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
                style={{ width: 140 }}
                placeholder="Category"
              >
                <Option value="all">All Categories</Option>
                <Option value="Laptop">Laptops</Option>
                <Option value="Desktop">Desktops</Option>
                <Option value="Server">Servers</Option>
                <Option value="Monitor">Monitors</Option>
                <Option value="Networking">Networking</Option>
                <Option value="Mobile">Mobile</Option>
              </Select>

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 130 }}
                placeholder="Status"
              >
                <Option value="all">All Status</Option>
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

        {/* Assets Data Table */}
        <Table
          columns={columns}
          dataSource={assets}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} items` }}
        />
      </Card>

      {/* Create / Edit Asset Modal */}
      <Modal
        title={editingAsset ? `Edit Asset: ${editingAsset.tag}` : 'Provision New Hardware Asset'}
        open={modalOpen}
        onOk={handleSaveAsset}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={680}
        okText={editingAsset ? 'Save Changes' : 'Create Asset'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
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

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Device Model Name"
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

          <Row gutter={14}>
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

          <Row gutter={14}>
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

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Purchase Date" name="purchaseDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Warranty Expiry Date" name="warrantyExpiry">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0 14px 0' }}>Technical Specifications</Divider>

          <Row gutter={14}>
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
              placeholder="Add deployment details or dock serial number..."
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
          size={540}
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          extra={
            <Button
              type="primary"
              size="small"
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
                      style={{ marginBottom: 16 }}
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
                      style={{ marginBottom: 16 }}
                    >
                      <Descriptions.Item label="Processor">
                        {selectedAsset.specs?.cpu || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="RAM / Memory">
                        {selectedAsset.specs?.ram || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Storage Drive">
                        {selectedAsset.specs?.storage || 'N/A'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Operating System">
                        {selectedAsset.specs?.os || 'N/A'}
                      </Descriptions.Item>
                    </Descriptions>

                    <Descriptions title="Financial & Warranty" bordered size="small" column={1}>
                      <Descriptions.Item label="Purchase Date">
                        {selectedAsset.purchaseDate}
                      </Descriptions.Item>
                      <Descriptions.Item label="Purchase Cost">
                        ${(selectedAsset.purchasePrice || 0).toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="Warranty Expiration">
                        {selectedAsset.warrantyExpiry || 'N/A'}
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
                        size={40}
                        style={{ backgroundColor: '#1677ff' }}
                        icon={<UserOutlined />}
                      />
                      <div>
                        <Title level={5} style={{ margin: 0 }}>
                          {selectedAsset.assignedTo}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedAsset.assignedEmail || 'No corporate email linked'}
                        </Text>
                      </div>
                    </Flex>
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="Assigned Location">
                        {selectedAsset.location}
                      </Descriptions.Item>
                      <Descriptions.Item label="Assignment Date">
                        {selectedAsset.purchaseDate || 'Recent'}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ),
              },
              {
                key: 'label',
                label: 'QR Barcode',
                children: (
                  <Flex
                    vertical
                    align="center"
                    justify="center"
                    gap={14}
                    style={{ padding: '20px 0' }}
                  >
                    <div
                      style={{
                        padding: 14,
                        border: '1px dashed #1677ff',
                        borderRadius: 8,
                        background: '#fff',
                        textAlign: 'center',
                      }}
                    >
                      <QRCode
                        value={`https://uims.internal/assets/${selectedAsset.tag}`}
                        size={150}
                      />
                      <div style={{ marginTop: 6, fontWeight: 700, fontSize: 15, color: '#000' }}>
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
          width={360}
          centered
        >
          <Flex vertical align="center" justify="center" gap={10} style={{ padding: '16px 0' }}>
            <QRCode value={`https://uims.internal/assets/${qrAsset.tag}`} size={160} />
            <Text strong style={{ fontSize: 16 }}>
              {qrAsset.tag}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {qrAsset.name}
            </Text>
            <Text code>{qrAsset.serialNumber}</Text>
          </Flex>
        </Modal>
      )}
    </PageContainer>
  );
}
