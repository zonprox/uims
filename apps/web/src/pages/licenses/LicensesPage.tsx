import {
  CheckCircleOutlined,
  DollarOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserDeleteOutlined,
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
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
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
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export interface AssignedUser {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedDate: string;
}

export interface License {
  id: string;
  name: string;
  vendor: string;
  type: 'Subscription' | 'Perpetual' | 'Volume' | 'OEM';
  totalSeats: number;
  usedSeats: number;
  costPerSeat: number;
  expiryDate: string;
  licenseKey: string;
  status: 'Active' | 'Expiring' | 'Expired';
  autoRenew: boolean;
  assignedUsers: AssignedUser[];
  notes?: string;
}

const INITIAL_LICENSES: License[] = [
  {
    id: '1',
    name: 'Microsoft 365 E5 Enterprise',
    vendor: 'Microsoft',
    type: 'Subscription',
    totalSeats: 150,
    usedSeats: 142,
    costPerSeat: 456,
    expiryDate: '2024-12-31',
    licenseKey: 'MS-E5-9921-8834-KKL9',
    status: 'Active',
    autoRenew: true,
    assignedUsers: [
      {
        id: 'u1',
        name: 'Alex Johnson',
        email: 'alex@company.com',
        department: 'Executive',
        assignedDate: '2023-01-01',
      },
      {
        id: 'u2',
        name: 'Sarah Chen',
        email: 'sarah@company.com',
        department: 'IT',
        assignedDate: '2023-01-01',
      },
      {
        id: 'u3',
        name: 'Marcus Vance',
        email: 'marcus@company.com',
        department: 'Design',
        assignedDate: '2023-02-15',
      },
    ],
    notes: 'Includes Advanced Threat Protection & Cloud App Security.',
  },
  {
    id: '2',
    name: 'Adobe Creative Cloud All Apps',
    vendor: 'Adobe',
    type: 'Subscription',
    totalSeats: 25,
    usedSeats: 24,
    costPerSeat: 780,
    expiryDate: '2024-05-15',
    licenseKey: 'ADB-CC-8392-1102-LKLM',
    status: 'Expiring',
    autoRenew: false,
    assignedUsers: [
      {
        id: 'u3',
        name: 'Marcus Vance',
        email: 'marcus@company.com',
        department: 'Design',
        assignedDate: '2023-05-15',
      },
      {
        id: 'u4',
        name: 'Elena Rostova',
        email: 'elena@company.com',
        department: 'Marketing',
        assignedDate: '2023-06-01',
      },
    ],
    notes: 'Renew via Adobe VIP enterprise reseller contract.',
  },
  {
    id: '3',
    name: 'JetBrains All Products Pack',
    vendor: 'JetBrains',
    type: 'Subscription',
    totalSeats: 40,
    usedSeats: 32,
    costPerSeat: 249,
    expiryDate: '2025-02-28',
    licenseKey: 'JB-ALL-7731-9941-PPX1',
    status: 'Active',
    autoRenew: true,
    assignedUsers: [
      {
        id: 'u5',
        name: 'David Kim',
        email: 'david.kim@company.com',
        department: 'Backend Eng',
        assignedDate: '2023-03-01',
      },
      {
        id: 'u6',
        name: 'Linda Watson',
        email: 'linda.w@company.com',
        department: 'Frontend Eng',
        assignedDate: '2023-03-10',
      },
    ],
  },
  {
    id: '4',
    name: 'Figma Enterprise Workspace',
    vendor: 'Figma',
    type: 'Subscription',
    totalSeats: 30,
    usedSeats: 28,
    costPerSeat: 540,
    expiryDate: '2024-11-30',
    licenseKey: 'FIG-ENT-1192-3381-YYE4',
    status: 'Active',
    autoRenew: true,
    assignedUsers: [
      {
        id: 'u3',
        name: 'Marcus Vance',
        email: 'marcus@company.com',
        department: 'Design',
        assignedDate: '2023-01-10',
      },
    ],
  },
  {
    id: '5',
    name: 'VMware vSphere Enterprise Plus',
    vendor: 'Broadcom / VMware',
    type: 'Perpetual',
    totalSeats: 8,
    usedSeats: 8,
    costPerSeat: 3500,
    expiryDate: '2026-08-01',
    licenseKey: 'VMW-VSP-4491-0021-HH82',
    status: 'Active',
    autoRenew: false,
    assignedUsers: [
      {
        id: 'u2',
        name: 'IT Infrastructure Core',
        email: 'infra-team@company.com',
        department: 'IT Ops',
        assignedDate: '2022-08-01',
      },
    ],
  },
];

export default function LicensesPage() {
  const { message } = App.useApp();
  const [licenses, setLicenses] = useState<License[]>(INITIAL_LICENSES);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [seatsDrawerOpen, setSeatsDrawerOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  const [form] = Form.useForm();

  // Calculations
  const totalAnnualSpend = licenses.reduce((sum, lic) => sum + lic.usedSeats * lic.costPerSeat, 0);
  const totalSeatsAll = licenses.reduce((sum, lic) => sum + lic.totalSeats, 0);
  const totalUsedSeatsAll = licenses.reduce((sum, lic) => sum + lic.usedSeats, 0);
  const overallUtilization =
    totalSeatsAll > 0 ? Math.round((totalUsedSeatsAll / totalSeatsAll) * 100) : 0;
  const expiringCount = licenses.filter((lic) => lic.status === 'Expiring').length;

  const filteredLicenses = licenses.filter((lic) => {
    const matchesSearch =
      lic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lic.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lic.licenseKey.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVendor = vendorFilter === 'all' || lic.vendor === vendorFilter;
    const matchesType = typeFilter === 'all' || lic.type === typeFilter;

    return matchesSearch && matchesVendor && matchesType;
  });

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
      const formattedLicense: License = {
        id: editingLicense ? editingLicense.id : String(Date.now()),
        name: values.name,
        vendor: values.vendor,
        type: values.type,
        totalSeats: values.totalSeats,
        usedSeats: editingLicense ? editingLicense.usedSeats : 0,
        costPerSeat: values.costPerSeat || 0,
        expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : '',
        licenseKey: values.licenseKey || 'N/A',
        status: values.status || 'Active',
        autoRenew: values.autoRenew ?? true,
        assignedUsers: editingLicense ? editingLicense.assignedUsers : [],
        notes: values.notes,
      };

      if (editingLicense) {
        setLicenses((prev) => prev.map((l) => (l.id === editingLicense.id ? formattedLicense : l)));
        message.success(`License "${formattedLicense.name}" updated successfully.`);
      } else {
        setLicenses((prev) => [formattedLicense, ...prev]);
        message.success(`License "${formattedLicense.name}" created.`);
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLicense = (id: string) => {
    setLicenses((prev) => prev.filter((l) => l.id !== id));
    message.success('License removed.');
  };

  const handleOpenSeatsDrawer = (license: License) => {
    setSelectedLicense(license);
    setSeatsDrawerOpen(true);
  };

  const handleAssignUser = () => {
    if (!newUserName || !newUserEmail || !selectedLicense) {
      message.warning('Please enter user name and email.');
      return;
    }
    if (selectedLicense.usedSeats >= selectedLicense.totalSeats) {
      message.error('All seats are currently allocated. Please upgrade seat count.');
      return;
    }

    const newUser: AssignedUser = {
      id: String(Date.now()),
      name: newUserName,
      email: newUserEmail,
      department: 'Engineering',
      assignedDate: dayjs().format('YYYY-MM-DD'),
    };

    const updatedLicense: License = {
      ...selectedLicense,
      usedSeats: selectedLicense.usedSeats + 1,
      assignedUsers: [newUser, ...selectedLicense.assignedUsers],
    };

    setSelectedLicense(updatedLicense);
    setLicenses((prev) => prev.map((l) => (l.id === selectedLicense.id ? updatedLicense : l)));
    setNewUserName('');
    setNewUserEmail('');
    message.success(`Seat allocated to ${newUser.name}`);
  };

  const handleRevokeSeat = (userId: string) => {
    if (!selectedLicense) return;
    const updatedUsers = selectedLicense.assignedUsers.filter((u) => u.id !== userId);
    const updatedLicense: License = {
      ...selectedLicense,
      usedSeats: Math.max(0, selectedLicense.usedSeats - 1),
      assignedUsers: updatedUsers,
    };

    setSelectedLicense(updatedLicense);
    setLicenses((prev) => prev.map((l) => (l.id === selectedLicense.id ? updatedLicense : l)));
    message.info('Seat revoked and returned to pool.');
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
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {record.vendor} • <span style={{ fontFamily: 'monospace' }}>{record.licenseKey}</span>
          </Text>
        </div>
      ),
    },
    {
      title: 'License Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'Subscription' ? 'blue' : 'purple'}>{type}</Tag>
      ),
    },
    {
      title: 'Seat Utilization',
      key: 'seats',
      width: 200,
      render: (_: any, record: License) => {
        const percent = Math.round((record.usedSeats / record.totalSeats) * 100);
        let strokeColor = '#52c41a';
        if (percent > 90) strokeColor = '#ff4d4f';
        else if (percent > 75) strokeColor = '#faad14';

        return (
          <div>
            <Flex justify="space-between" align="center" style={{ fontSize: 12, marginBottom: 2 }}>
              <Text strong>
                {record.usedSeats} / {record.totalSeats} seats
              </Text>
              <Text type="secondary">{percent}%</Text>
            </Flex>
            <Progress percent={percent} strokeColor={strokeColor} size="small" showInfo={false} />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.totalSeats - record.usedSeats} seats available
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Annual Spend',
      key: 'cost',
      render: (_: any, record: License) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            ${(record.usedSeats * record.costPerSeat).toLocaleString()}/yr
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            ${record.costPerSeat}/seat/yr
          </Text>
        </div>
      ),
    },
    {
      title: 'Expiration & Renewal',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (expiryDate: string, record: License) => {
        const diff = dayjs(expiryDate).diff(dayjs(), 'day');
        return (
          <div>
            <Text style={{ fontSize: 13 }}>{expiryDate}</Text>
            <div style={{ marginTop: 2 }}>
              {diff < 30 ? (
                <Tag color="error">Expires in {diff}d</Tag>
              ) : record.autoRenew ? (
                <Tag color="success">Auto-Renew ON</Tag>
              ) : (
                <Tag color="default">Manual</Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: License) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            ghost
            icon={<TeamOutlined />}
            onClick={() => handleOpenSeatsDrawer(record)}
          >
            Manage Seats
          </Button>
          <Tooltip title="Edit License">
            <Button
              type="text"
              shape="circle"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this license?"
            description="Are you sure you want to remove this software license record?"
            onConfirm={() => handleDeleteLicense(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button type="text" shape="circle" danger icon={<UserDeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Software License Governance"
      subtitle="Track active subscriptions, seat allocations, compliance meters, and auto-renewals."
      breadcrumbs={[{ title: 'Licenses' }]}
      stats={[
        {
          title: 'Total Subscriptions',
          value: licenses.length,
          prefix: <SafetyCertificateOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Total Annual Spend',
          value: `$${totalAnnualSpend.toLocaleString()}`,
          prefix: <DollarOutlined />,
          color: '#52c41a',
        },
        {
          title: 'Seat Utilization',
          value: `${overallUtilization}%`,
          prefix: <TeamOutlined />,
          color: '#722ed1',
        },
        {
          title: 'Expiring (<30 Days)',
          value: expiringCount,
          prefix: <WarningOutlined />,
          color: expiringCount > 0 ? '#ff4d4f' : '#8c8c8c',
        },
      ]}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
          Add Software License
        </Button>
      }
    >
      <Card styles={{ body: { padding: '20px 24px' } }}>
        {/* Search & Filter Toolbar */}
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={10}>
            <Input
              placeholder="Search software by title, vendor, or contract key..."
              prefix={<FilterOutlined style={{ color: '#8c8c8c' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Flex gap={12} justify="flex-end" wrap>
              <Select
                value={vendorFilter}
                onChange={setVendorFilter}
                style={{ width: 150 }}
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
                style={{ width: 140 }}
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

        <Divider style={{ margin: '16px 0' }} />

        {/* License Table */}
        <Table
          columns={columns}
          dataSource={filteredLicenses}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {/* Add / Edit License Modal */}
      <Modal
        title={editingLicense ? `Edit License: ${editingLicense.name}` : 'Add Software License'}
        open={modalOpen}
        onOk={handleSaveLicense}
        onCancel={() => setModalOpen(false)}
        width={680}
        okText={editingLicense ? 'Save Changes' : 'Create License'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label="Software Name"
                name="name"
                rules={[{ required: true, message: 'Name is required' }]}
              >
                <Input placeholder="e.g. Adobe Creative Cloud Enterprise" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Vendor / Publisher" name="vendor" rules={[{ required: true }]}>
                <Input placeholder="e.g. Adobe / Microsoft" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
              <Form.Item label="Cost per Seat / Year ($)" name="costPerSeat">
                <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="License Key / Contract ID" name="licenseKey">
                <Input placeholder="e.g. MS-E5-9921-8834-KKL9" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Renewal / Expiration Date" name="expiryDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
              <Form.Item label="Auto-Renewal Enabled" name="autoRenew" valuePropName="checked">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes & Reseller Contract Details" name="notes">
            <Input.TextArea
              rows={2}
              placeholder="Add procurement contract ID, VIP number, or support contact..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Seat Allocation Drawer */}
      {selectedLicense && (
        <Drawer
          title={
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {selectedLicense.name} — Seats
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selectedLicense.usedSeats} of {selectedLicense.totalSeats} seats allocated
              </Text>
            </div>
          }
          width={520}
          open={seatsDrawerOpen}
          onClose={() => setSeatsDrawerOpen(false)}
        >
          {/* Quick Assign Form */}
          <Card size="small" title="Assign Seat to User" style={{ marginBottom: 20 }}>
            <Flex vertical gap={10}>
              <Input
                placeholder="Employee Name (e.g. David Kim)"
                prefix={<UserOutlined />}
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
              <Input
                placeholder="Corporate Email (e.g. david.kim@company.com)"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAssignUser}>
                Allocate Seat
              </Button>
            </Flex>
          </Card>

          {/* Assigned Users List */}
          <Title level={5}>
            Active Assigned Employees ({selectedLicense.assignedUsers.length})
          </Title>
          <List
            dataSource={selectedLicense.assignedUsers}
            locale={{ emptyText: 'No employees currently assigned to this license.' }}
            renderItem={(user) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="revoke"
                    title="Revoke seat?"
                    description="This user will lose access to the software."
                    onConfirm={() => handleRevokeSeat(user.id)}
                    okText="Revoke"
                    okType="danger"
                  >
                    <Button type="link" danger size="small">
                      Revoke
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />}
                  title={<Text strong>{user.name}</Text>}
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {user.email} • {user.department}
                      </Text>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        Assigned: {user.assignedDate}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Drawer>
      )}
    </PageContainer>
  );
}
