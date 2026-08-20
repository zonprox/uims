import {
  DollarOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserDeleteOutlined,
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
  Drawer,
  Empty,
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
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import PageContainer from '../../components/PageContainer';
import { FormattedDate } from '../../components/FormattedDate';
import { type License, type LicenseStats, licensesService } from '../../services/licenses.service';

const { Text, Title } = Typography;
const { Option } = Select;

export default function LicensesPage() {
  const { message } = App.useApp();
  const [licenses, setLicenses] = useState<Array<License>>([]);
  const [stats, setStats] = useState<LicenseStats>({
    total: 0,
    annualSpend: 0,
    utilization: 0,
    expiringCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [seatsDrawerOpen, setSeatsDrawerOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [assigningSeat, setAssigningSeat] = useState(false);

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        licensesService.getLicenses({
          search: searchQuery || undefined,
          vendor: vendorFilter !== 'all' ? vendorFilter : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
        }),
        licensesService.getStats().catch(() => null),
      ]);
      setLicenses(list);
      if (statsData) {
        setStats(statsData);
      } else {
        const totalSpend = list.reduce((sum, l) => sum + l.usedSeats * l.costPerSeat, 0);
        const totalSeats = list.reduce((sum, l) => sum + l.totalSeats, 0);
        const usedSeats = list.reduce((sum, l) => sum + l.usedSeats, 0);
        const overallUtilization = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
        const expiringCount = list.filter((l) => l.status === 'Expiring').length;
        setStats({
          total: list.length,
          annualSpend: totalSpend,
          utilization: overallUtilization,
          expiringCount,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to load software licenses.');
    } finally {
      setLoading(false);
    }
  }, [message, searchQuery, typeFilter, vendorFilter]);

  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get('id') || searchParams.get('key');

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Deep linking: auto-open seats drawer if id or key param is provided
  useEffect(() => {
    if (deepLinkId && licenses.length > 0) {
      const match = licenses.find(
        (l) => l.id === deepLinkId || l.name.toLowerCase().includes(deepLinkId.toLowerCase()),
      );
      if (match) {
        setSelectedLicense(match);
        setSeatsDrawerOpen(true);
      }
    }
  }, [deepLinkId, licenses]);

  const handleOpenCreateModal = () => {
    setEditingLicense(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'Subscription',
      totalSeats: 10,
      costPerSeat: 120,
      autoRenew: true,
      expiryDate: dayjs().add(1, 'year'),
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (license: License) => {
    setEditingLicense(license);
    form.setFieldsValue({
      ...license,
      expiryDate: license.expiryDate ? dayjs(license.expiryDate) : undefined,
    });
    setModalOpen(true);
  };

  const handleSaveLicense = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      const payload = {
        name: values.name,
        vendor: values.vendor,
        type: values.type,
        totalSeats: Number(values.totalSeats),
        costPerSeat: Number(values.costPerSeat || 0),
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
        licenseKey: values.licenseKey || 'N/A',
        status: values.status || 'Active',
        autoRenew: values.autoRenew ?? true,
        notes: values.notes,
      };

      if (editingLicense) {
        await licensesService.updateLicense(editingLicense.id, payload);
        message.success(`License "${payload.name}" updated successfully.`);
      } else {
        await licensesService.createLicense(payload);
        message.success(`License "${payload.name}" created successfully.`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save license.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteLicense = async (id: string) => {
    try {
      await licensesService.deleteLicense(id);
      message.success('License deleted successfully.');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete license.');
    }
  };

  const handleOpenSeatsDrawer = (license: License) => {
    setSelectedLicense(license);
    setSeatsDrawerOpen(true);
  };

  const handleAssignUser = async () => {
    if (!newUserName || !newUserEmail || !selectedLicense) {
      message.warning('Please enter user name and email.');
      return;
    }
    if (selectedLicense.usedSeats >= selectedLicense.totalSeats) {
      message.error('All seats are currently allocated. Please upgrade seat count.');
      return;
    }

    setAssigningSeat(true);
    try {
      await licensesService.assignUser(selectedLicense.id, {
        name: newUserName,
        email: newUserEmail,
        department: 'Engineering',
      });
      message.success(`Seat assigned to ${newUserName}.`);
      setNewUserName('');
      setNewUserEmail('');

      // Reload fresh license details
      const freshLicense = await licensesService.getLicense(selectedLicense.id);
      setSelectedLicense(freshLicense);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to allocate seat.');
    } finally {
      setAssigningSeat(false);
    }
  };

  const handleRevokeSeat = async (assignmentId: string) => {
    if (!selectedLicense) return;
    try {
      await licensesService.revokeUser(selectedLicense.id, assignmentId);
      message.success('Seat revoked successfully.');

      const freshLicense = await licensesService.getLicense(selectedLicense.id);
      setSelectedLicense(freshLicense);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to revoke seat.');
    }
  };

  const columns = [
    {
      title: 'Software & Vendor',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: License) => (
        <div>
          <Text
            strong
            style={{ fontSize: 13, cursor: 'pointer', color: '#1677ff' }}
            onClick={() => handleOpenSeatsDrawer(record)}
          >
            {name}
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>
            {record.vendor} • {record.type}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          color={status === 'Active' ? 'success' : status === 'Expiring' ? 'warning' : 'default'}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Seat Utilization',
      key: 'seats',
      width: 190,
      render: (_: unknown, record: License) => {
        const percent =
          record.totalSeats > 0 ? Math.round((record.usedSeats / record.totalSeats) * 100) : 0;
        let strokeColor = '#10b981';
        if (percent > 90) strokeColor = '#ef4444';
        else if (percent > 75) strokeColor = '#f59e0b';

        return (
          <div>
            <Flex
              justify="space-between"
              align="center"
              style={{ fontSize: 11.5, marginBottom: 2 }}
            >
              <Text strong>
                {record.usedSeats} / {record.totalSeats} seats
              </Text>
              <Text type="secondary">{percent}%</Text>
            </Flex>
            <Progress percent={percent} strokeColor={strokeColor} size="small" showInfo={false} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {Math.max(0, record.totalSeats - record.usedSeats)} seats free
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Annual Spend',
      key: 'cost',
      render: (_: unknown, record: License) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            ${((record.usedSeats || 0) * (record.costPerSeat || 0)).toLocaleString()}/yr
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            ${record.costPerSeat || 0}/seat
          </Text>
        </div>
      ),
    },
    {
      title: 'Expiration Date',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (expiryDate: string, record: License) => {
        const diff = expiryDate ? dayjs(expiryDate).diff(dayjs(), 'day') : 999;
        return (
          <div>
            <FormattedDate date={expiryDate} style={{ fontSize: 12.5 }} />
            <div style={{ marginTop: 2 }}>
              {diff < 30 ? (
                <Tag color="error" style={{ fontSize: 10 }}>
                  Expires in {diff}d
                </Tag>
              ) : record.autoRenew ? (
                <Tag color="success" style={{ fontSize: 10 }}>
                  Auto-Renew
                </Tag>
              ) : (
                <Tag color="default" style={{ fontSize: 10 }}>
                  Manual
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: License) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<TeamOutlined />}
            onClick={() => handleOpenSeatsDrawer(record)}
          >
            Seats
          </Button>
          <Tooltip title="Edit License">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete license?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteLicense(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                shape="circle"
                size="small"
                danger
                icon={<UserDeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Software Licenses"
      subtitle="Track software seat utilization, upcoming renewals, and compliance across all software licenses."
      breadcrumbs={[{ title: 'Licenses' }]}
      stats={[
        {
          title: 'Total Licenses',
          value: stats.total,
          prefix: <SafetyCertificateOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Annual Spend',
          value: `$${stats.annualSpend.toLocaleString()}`,
          prefix: <DollarOutlined />,
          color: '#10b981',
        },
        {
          title: 'Seat Utilization',
          value: `${stats.utilization}%`,
          prefix: <TeamOutlined />,
          color: '#6366f1',
        },
        {
          title: 'Expiring (<30 Days)',
          value: stats.expiringCount,
          prefix: <WarningOutlined />,
          color: stats.expiringCount > 0 ? '#ef4444' : '#94a3b8',
        },
      ]}
      extra={
        <Flex gap={8}>
          <Tooltip title="Refresh licenses">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Create License
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        {/* Search & Filter Toolbar */}
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Search software by name, vendor, contract key..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={vendorFilter}
                onChange={setVendorFilter}
                style={{ width: 140 }}
                placeholder="Vendor"
              >
                <Option value="all">All Vendors</Option>
                <Option value="Microsoft">Microsoft</Option>
                <Option value="Adobe">Adobe</Option>
                <Option value="JetBrains">JetBrains</Option>
                <Option value="Figma">Figma</Option>
                <Option value="Broadcom / VMware">Broadcom / VMware</Option>
              </Select>

              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 130 }}
                placeholder="Type"
              >
                <Option value="all">All Types</Option>
                <Option value="Subscription">Subscription</Option>
                <Option value="Perpetual">Perpetual</Option>
                <Option value="Volume">Volume</Option>
              </Select>

              {(searchQuery || vendorFilter !== 'all' || typeFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setVendorFilter('all');
                    setTypeFilter('all');
                  }}
                >
                  Reset
                </Button>
              )}
            </Flex>
          </Col>
        </Row>

        {/* License Table */}
        <Table
          columns={columns}
          dataSource={licenses}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `Total ${total} licenses`,
          }}
        />
      </Card>

      {/* Add / Edit License Modal */}
      <Modal
        title={editingLicense ? `Edit License: ${editingLicense.name}` : 'Create License'}
        open={modalOpen}
        onOk={handleSaveLicense}
        onCancel={() => setModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={640}
        okText={editingLicense ? 'Save Changes' : 'Create License'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={14}>
              <Form.Item
                label="Software Name"
                name="name"
                rules={[{ required: true, message: 'Software name is required' }]}
              >
                <Input placeholder="e.g. Adobe Creative Cloud Enterprise" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                label="Vendor"
                name="vendor"
                rules={[{ required: true, message: 'Vendor is required' }]}
              >
                <Input placeholder="e.g. Adobe / Microsoft" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={8}>
              <Form.Item label="License Type" name="type" rules={[{ required: true }]}>
                <Select>
                  <Option value="Subscription">Subscription</Option>
                  <Option value="Perpetual">Perpetual</Option>
                  <Option value="Volume">Volume License</Option>
                  <Option value="OEM">OEM</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Total Seats" name="totalSeats" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Cost per Seat ($)" name="costPerSeat">
                <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="License Key" name="licenseKey">
                <Input placeholder="e.g. MS-E5-9921-8834-KKL9" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Expiration Date" name="expiryDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Status" name="status">
                <Select>
                  <Option value="Active">Active</Option>
                  <Option value="Expiring">Expiring Soon</Option>
                  <Option value="Expired">Expired</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Auto-Renewal" name="autoRenew" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea
              rows={2}
              placeholder="Add contract details, reseller agreement notes..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Seat Allocation Drawer */}
      {selectedLicense && (
        <Drawer
          title={
            <div>
              <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                {selectedLicense.name} — Seats
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedLicense.usedSeats} of {selectedLicense.totalSeats} seats allocated
              </Text>
            </div>
          }
          styles={{ wrapper: { width: 480 } }}
          open={seatsDrawerOpen}
          onClose={() => setSeatsDrawerOpen(false)}
        >
          {/* Quick Assign Form */}
          <Card size="small" title="Assign User" style={{ marginBottom: 16 }}>
            <Flex vertical gap={8}>
              <Input
                placeholder="User Name (e.g. David Kim)"
                prefix={<UserOutlined />}
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
              <Input
                placeholder="Corporate Email (e.g. david.kim@company.com)"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                loading={assigningSeat}
                onClick={handleAssignUser}
              >
                Assign Seat
              </Button>
            </Flex>
          </Card>

          {/* Assigned Users List */}
          <Title level={5} style={{ fontSize: 13.5 }}>
            Active Users ({selectedLicense.assignedUsers?.length || 0})
          </Title>
          {!selectedLicense.assignedUsers || selectedLicense.assignedUsers.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No users assigned to this license."
              style={{ margin: '24px 0' }}
            />
          ) : (
            <Flex vertical gap={8}>
              {selectedLicense.assignedUsers.map((user) => (
                <Flex
                  key={user.id}
                  justify="space-between"
                  align="center"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #f0f0f0',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Flex align="center" gap={10}>
                    <Avatar
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1677ff', fontSize: 11 }}
                      size="small"
                    />
                    <div>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>
                          {user.name}
                        </Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11.5 }}>
                        {user.email} • {user.department}
                      </Text>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                        Assigned: {user.assignedDate}
                      </div>
                    </div>
                  </Flex>
                  <Popconfirm
                    title="Revoke license seat?"
                    description="This user will lose access to this software license."
                    onConfirm={() => handleRevokeSeat(user.id)}
                    okText="Revoke"
                    okType="danger"
                  >
                    <Button type="link" danger size="small">
                      Revoke
                    </Button>
                  </Popconfirm>
                </Flex>
              ))}
            </Flex>
          )}
        </Drawer>
      )}
    </PageContainer>
  );
}
