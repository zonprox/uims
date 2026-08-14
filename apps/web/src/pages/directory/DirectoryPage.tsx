import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  KeyOutlined,
  LaptopOutlined,
  LockOutlined,
  MailOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  role: 'Super Admin' | 'IT Specialist' | 'Developer' | 'Manager' | 'Employee';
  status: 'Active' | 'Suspended' | 'Inactive';
  twoFactorEnabled: boolean;
  phone: string;
  location: string;
  assignedAssetsCount: number;
  assignedLicensesCount: number;
  lastLogin: string;
}

const INITIAL_USERS: DirectoryUser[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex.johnson@company.com',
    jobTitle: 'VP of Information Technology',
    department: 'IT & Infrastructure',
    role: 'Super Admin',
    status: 'Active',
    twoFactorEnabled: true,
    phone: '+1 (555) 234-5678',
    location: 'NY Office - Floor 4',
    assignedAssetsCount: 2,
    assignedLicensesCount: 4,
    lastLogin: 'Today, 10:14 AM',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    jobTitle: 'Senior Systems Administrator',
    department: 'IT & Infrastructure',
    role: 'IT Specialist',
    status: 'Active',
    twoFactorEnabled: true,
    phone: '+1 (555) 345-6789',
    location: 'SF HQ - Tech Bay',
    assignedAssetsCount: 3,
    assignedLicensesCount: 3,
    lastLogin: 'Today, 09:30 AM',
  },
  {
    id: '3',
    name: 'Marcus Vance',
    email: 'marcus.vance@company.com',
    jobTitle: 'Principal Product Designer',
    department: 'Product & Design',
    role: 'Employee',
    status: 'Active',
    twoFactorEnabled: true,
    phone: '+1 (555) 456-7890',
    location: 'NY Office - Floor 4',
    assignedAssetsCount: 2,
    assignedLicensesCount: 2,
    lastLogin: 'Yesterday, 04:12 PM',
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david.kim@company.com',
    jobTitle: 'Lead Cloud Architect',
    department: 'Engineering',
    role: 'Developer',
    status: 'Active',
    twoFactorEnabled: true,
    phone: '+1 (555) 567-8901',
    location: 'Remote - US East',
    assignedAssetsCount: 1,
    assignedLicensesCount: 3,
    lastLogin: '2 days ago',
  },
  {
    id: '5',
    name: 'Elena Rostova',
    email: 'elena.rostova@company.com',
    jobTitle: 'Director of Growth Marketing',
    department: 'Marketing',
    role: 'Manager',
    status: 'Active',
    twoFactorEnabled: false,
    phone: '+1 (555) 678-9012',
    location: 'London Hub',
    assignedAssetsCount: 1,
    assignedLicensesCount: 2,
    lastLogin: '3 days ago',
  },
  {
    id: '6',
    name: 'Thomas Wright',
    email: 'thomas.wright@company.com',
    jobTitle: 'Junior QA Engineer (Contractor)',
    department: 'Engineering',
    role: 'Employee',
    status: 'Suspended',
    twoFactorEnabled: false,
    phone: '+1 (555) 789-0123',
    location: 'Remote - EMEA',
    assignedAssetsCount: 0,
    assignedLicensesCount: 0,
    lastLogin: '3 weeks ago',
  },
];

export default function DirectoryPage() {
  const { message, modal } = App.useApp();
  const [users, setUsers] = useState<DirectoryUser[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('users');

  // Modals & Drawers
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);

  const [form] = Form.useForm();

  // Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const twoFactorRate = Math.round(
    (users.filter((u) => u.twoFactorEnabled).length / totalUsers) * 100,
  );

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === 'all' || user.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      department: 'Engineering',
      role: 'Employee',
      status: 'Active',
      twoFactorEnabled: true,
      location: 'NY Office - Floor 4',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (user: DirectoryUser) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      const formattedUser: DirectoryUser = {
        id: editingUser ? editingUser.id : String(Date.now()),
        name: values.name,
        email: values.email,
        jobTitle: values.jobTitle,
        department: values.department,
        role: values.role,
        status: values.status,
        twoFactorEnabled: values.twoFactorEnabled ?? false,
        phone: values.phone || '',
        location: values.location || 'HQ',
        assignedAssetsCount: editingUser ? editingUser.assignedAssetsCount : 0,
        assignedLicensesCount: editingUser ? editingUser.assignedLicensesCount : 0,
        lastLogin: editingUser ? editingUser.lastLogin : 'Never',
      };

      if (editingUser) {
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? formattedUser : u)));
        message.success(`User profile "${formattedUser.name}" updated.`);
      } else {
        setUsers((prev) => [formattedUser, ...prev]);
        message.success(`User "${formattedUser.name}" created and invitation sent.`);
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    message.success('User account removed from directory.');
  };

  const handleResetPassword = (user: DirectoryUser) => {
    modal.confirm({
      title: `Reset Password for ${user.name}?`,
      icon: <KeyOutlined />,
      content: `A temporary password and reset link will be dispatched to ${user.email}.`,
      okText: 'Send Reset Link',
      onOk: () => {
        message.success(`Password reset email dispatched to ${user.email}`);
      },
    });
  };

  const handleShowDetails = (user: DirectoryUser) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: 'Employee',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DirectoryUser) => (
        <Flex align="center" gap={10}>
          <Avatar style={{ backgroundColor: '#1677ff', fontWeight: 600 }} size="default">
            {name[0]}
          </Avatar>
          <div>
            <Text
              strong
              style={{ fontSize: 13, cursor: 'pointer', color: '#1677ff' }}
              onClick={() => handleShowDetails(record)}
            >
              {name}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {record.email}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Role & Title',
      key: 'role',
      render: (_: any, record: DirectoryUser) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {record.jobTitle}
          </Text>
          <div style={{ marginTop: 2 }}>
            <Tag
              color={
                record.role === 'Super Admin'
                  ? 'red'
                  : record.role === 'IT Specialist'
                    ? 'blue'
                    : 'default'
              }
            >
              {record.role}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Department & Location',
      dataIndex: 'department',
      key: 'department',
      render: (dept: string, record: DirectoryUser) => (
        <div>
          <Text style={{ fontSize: 13 }}>{dept}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            {record.location}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status & Security',
      key: 'status',
      render: (_: any, record: DirectoryUser) => (
        <div>
          <Tag
            color={
              record.status === 'Active'
                ? 'success'
                : record.status === 'Suspended'
                  ? 'error'
                  : 'default'
            }
          >
            {record.status}
          </Tag>
          <div style={{ marginTop: 2 }}>
            {record.twoFactorEnabled ? (
              <Tag color="cyan" style={{ fontSize: 10 }}>
                2FA Active
              </Tag>
            ) : (
              <Tag color="warning" style={{ fontSize: 10 }}>
                No 2FA
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Assigned IT Resources',
      key: 'resources',
      render: (_: any, record: DirectoryUser) => (
        <Space size="small">
          <Tag icon={<LaptopOutlined />} color="blue">
            {record.assignedAssetsCount} Assets
          </Tag>
          <Tag icon={<SafetyCertificateOutlined />} color="purple">
            {record.assignedLicensesCount} Lic
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: DirectoryUser) => (
        <Space size="small">
          <Tooltip title="Reset Password">
            <Button
              type="text"
              shape="circle"
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record)}
            />
          </Tooltip>
          <Tooltip title="Edit User">
            <Button
              type="text"
              shape="circle"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this user?"
            description="All single-sign-on sessions will be invalidated immediately."
            onConfirm={() => handleDeleteUser(record.id)}
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
      title="Identity & Directory Services"
      subtitle="Corporate employee directory, access control roles, departments, and credentials."
      breadcrumbs={[{ title: 'Directory' }]}
      stats={[
        {
          title: 'Total Directory Users',
          value: totalUsers,
          prefix: <TeamOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active Accounts',
          value: activeUsers,
          prefix: <CheckCircleOutlined />,
          color: '#52c41a',
        },
        {
          title: '2FA Adoption Rate',
          value: `${twoFactorRate}%`,
          prefix: <SafetyCertificateOutlined />,
          color: '#722ed1',
        },
        {
          title: 'Suspended Accounts',
          value: users.filter((u) => u.status === 'Suspended').length,
          prefix: <LockOutlined />,
          color: users.filter((u) => u.status === 'Suspended').length > 0 ? '#faad14' : '#8c8c8c',
        },
      ]}
      extra={
        <Button type="primary" icon={<UserAddOutlined />} onClick={handleOpenCreateModal}>
          Add Employee User
        </Button>
      }
    >
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: (
                <Space>
                  <UserOutlined />
                  <span>Users & Accounts</span>
                </Space>
              ),
              children: (
                <div>
                  {/* Search and Filters */}
                  <Row
                    gutter={[16, 16]}
                    align="middle"
                    justify="space-between"
                    style={{ marginBottom: 16 }}
                  >
                    <Col xs={24} md={10}>
                      <Input
                        placeholder="Search users by name, email, or job title..."
                        prefix={<FilterOutlined style={{ color: '#8c8c8c' }} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} md={14}>
                      <Flex gap={12} justify="flex-end" wrap>
                        <Select
                          value={departmentFilter}
                          onChange={setDepartmentFilter}
                          style={{ width: 170 }}
                          placeholder="Department"
                        >
                          <Option value="all">All Departments</Option>
                          <Option value="IT & Infrastructure">IT & Infrastructure</Option>
                          <Option value="Engineering">Engineering</Option>
                          <Option value="Product & Design">Product & Design</Option>
                          <Option value="Marketing">Marketing</Option>
                        </Select>

                        <Select
                          value={statusFilter}
                          onChange={setStatusFilter}
                          style={{ width: 130 }}
                          placeholder="Status"
                        >
                          <Option value="all">All Status</Option>
                          <Option value="Active">Active</Option>
                          <Option value="Suspended">Suspended</Option>
                          <Option value="Inactive">Inactive</Option>
                        </Select>

                        {(searchQuery || departmentFilter !== 'all' || statusFilter !== 'all') && (
                          <Button
                            onClick={() => {
                              setSearchQuery('');
                              setDepartmentFilter('all');
                              setStatusFilter('all');
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
                    dataSource={filteredUsers}
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },
            {
              key: 'departments',
              label: (
                <Space>
                  <ApartmentOutlined />
                  <span>Departments & Teams</span>
                </Space>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  {[
                    {
                      name: 'IT & Infrastructure',
                      head: 'Alex Johnson',
                      members: 12,
                      budget: '$180,000',
                      leadColor: '#1677ff',
                    },
                    {
                      name: 'Engineering',
                      head: 'David Kim',
                      members: 48,
                      budget: '$650,000',
                      leadColor: '#52c41a',
                    },
                    {
                      name: 'Product & Design',
                      head: 'Marcus Vance',
                      members: 16,
                      budget: '$220,000',
                      leadColor: '#722ed1',
                    },
                    {
                      name: 'Marketing & Growth',
                      head: 'Elena Rostova',
                      members: 22,
                      budget: '$340,000',
                      leadColor: '#fa8c16',
                    },
                    {
                      name: 'Finance & Legal',
                      head: 'Sophia Taylor',
                      members: 8,
                      budget: '$150,000',
                      leadColor: '#13c2c2',
                    },
                    {
                      name: 'Human Resources',
                      head: 'Karen Miller',
                      members: 6,
                      budget: '$95,000',
                      leadColor: '#eb2f96',
                    },
                  ].map((dept) => (
                    <Col xs={24} sm={12} lg={8} key={dept.name}>
                      <Card
                        size="small"
                        title={
                          <Flex align="center" gap={8}>
                            <ApartmentOutlined style={{ color: dept.leadColor }} />
                            <span>{dept.name}</span>
                          </Flex>
                        }
                        extra={<Tag color="blue">{dept.members} Members</Tag>}
                      >
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="Department Head">
                            <Text strong>{dept.head}</Text>
                          </Descriptions.Item>
                          <Descriptions.Item label="IT Hardware Allocation">
                            {Math.round(dept.members * 1.5)} Devices
                          </Descriptions.Item>
                          <Descriptions.Item label="Software Budget">
                            {dept.budget}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ),
            },
            {
              key: 'roles',
              label: (
                <Space>
                  <SafetyOutlined />
                  <span>Roles & Permission Matrix</span>
                </Space>
              ),
              children: (
                <Table
                  pagination={false}
                  columns={[
                    {
                      title: 'System Role',
                      dataIndex: 'role',
                      key: 'role',
                      render: (text: string) => <Text strong>{text}</Text>,
                    },
                    {
                      title: 'Asset Mgmt',
                      dataIndex: 'assets',
                      key: 'assets',
                      render: (val: string) => (
                        <Tag color={val === 'Full' ? 'green' : val === 'Read' ? 'blue' : 'default'}>
                          {val}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Licenses',
                      dataIndex: 'licenses',
                      key: 'licenses',
                      render: (val: string) => (
                        <Tag color={val === 'Full' ? 'green' : val === 'Read' ? 'blue' : 'default'}>
                          {val}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Directory',
                      dataIndex: 'directory',
                      key: 'directory',
                      render: (val: string) => (
                        <Tag color={val === 'Full' ? 'green' : val === 'Read' ? 'blue' : 'default'}>
                          {val}
                        </Tag>
                      ),
                    },
                    {
                      title: 'IPAM / Network',
                      dataIndex: 'network',
                      key: 'network',
                      render: (val: string) => (
                        <Tag color={val === 'Full' ? 'green' : val === 'Read' ? 'blue' : 'default'}>
                          {val}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Audit Logs',
                      dataIndex: 'audit',
                      key: 'audit',
                      render: (val: string) => (
                        <Tag color={val === 'Full' ? 'green' : val === 'Read' ? 'blue' : 'default'}>
                          {val}
                        </Tag>
                      ),
                    },
                  ]}
                  dataSource={[
                    {
                      key: '1',
                      role: 'Super Admin',
                      assets: 'Full',
                      licenses: 'Full',
                      directory: 'Full',
                      network: 'Full',
                      audit: 'Full',
                    },
                    {
                      key: '2',
                      role: 'IT Specialist',
                      assets: 'Full',
                      licenses: 'Full',
                      directory: 'Full',
                      network: 'Full',
                      audit: 'Read',
                    },
                    {
                      key: '3',
                      role: 'Lead Auditor',
                      assets: 'Read',
                      licenses: 'Read',
                      directory: 'Read',
                      network: 'Read',
                      audit: 'Full',
                    },
                    {
                      key: '4',
                      role: 'Manager',
                      assets: 'Read',
                      licenses: 'Read',
                      directory: 'Read',
                      network: 'None',
                      audit: 'None',
                    },
                    {
                      key: '5',
                      role: 'Standard Employee',
                      assets: 'None',
                      licenses: 'None',
                      directory: 'None',
                      network: 'None',
                      audit: 'None',
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Add / Edit User Modal */}
      <Modal
        title={editingUser ? `Edit Employee: ${editingUser.name}` : 'Onboard New Employee'}
        open={modalOpen}
        onOk={handleSaveUser}
        onCancel={() => setModalOpen(false)}
        width={680}
        okText={editingUser ? 'Save Changes' : 'Create User'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Full Name" name="name" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder="e.g. Marcus Vance" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Corporate Email"
                name="email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="e.g. marcus@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Job Title" name="jobTitle" rules={[{ required: true }]}>
                <Input placeholder="e.g. Principal Product Designer" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Department" name="department" rules={[{ required: true }]}>
                <Select>
                  <Option value="IT & Infrastructure">IT & Infrastructure</Option>
                  <Option value="Engineering">Engineering</Option>
                  <Option value="Product & Design">Product & Design</Option>
                  <Option value="Marketing">Marketing</Option>
                  <Option value="Finance">Finance</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="System Role" name="role" rules={[{ required: true }]}>
                <Select>
                  <Option value="Super Admin">Super Admin</Option>
                  <Option value="IT Specialist">IT Specialist</Option>
                  <Option value="Developer">Developer</Option>
                  <Option value="Manager">Manager</Option>
                  <Option value="Employee">Employee</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Account Status" name="status" rules={[{ required: true }]}>
                <Select>
                  <Option value="Active">Active</Option>
                  <Option value="Suspended">Suspended</Option>
                  <Option value="Inactive">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Office Location" name="location">
                <Input placeholder="e.g. NY Office - Floor 4" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Direct Phone" name="phone">
                <Input placeholder="+1 (555) 000-0000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Enforce 2-Factor Authentication (2FA)"
                name="twoFactorEnabled"
                valuePropName="checked"
              >
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* User Profile Detail Drawer */}
      {selectedUser && (
        <Drawer
          title={
            <Flex align="center" gap={10}>
              <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  {selectedUser.name}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedUser.jobTitle}
                </Text>
              </div>
            </Flex>
          }
          width={520}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Descriptions
            title="Profile Details"
            bordered
            size="small"
            column={1}
            style={{ marginBottom: 20 }}
          >
            <Descriptions.Item label="Email Address">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Department">{selectedUser.department}</Descriptions.Item>
            <Descriptions.Item label="Role">{selectedUser.role}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedUser.status === 'Active' ? 'success' : 'error'}>
                {selectedUser.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="2FA Authentication">
              {selectedUser.twoFactorEnabled ? (
                <Tag color="success">Enabled</Tag>
              ) : (
                <Tag color="warning">Not Configured</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Location">{selectedUser.location}</Descriptions.Item>
            <Descriptions.Item label="Last Active">{selectedUser.lastLogin}</Descriptions.Item>
          </Descriptions>

          <Title level={5}>Assigned Company Hardware</Title>
          <List
            size="small"
            bordered
            style={{ marginBottom: 20 }}
            dataSource={[
              { name: 'MacBook Pro 16" M3 Max', tag: 'AST-1024', sn: 'C02G8392MD6R' },
              { name: 'Dell UltraSharp 32" 4K Monitor', tag: 'AST-1025', sn: 'CN-0N179F-74261' },
            ]}
            renderItem={(item) => (
              <List.Item>
                <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                  <div>
                    <Text strong>{item.name}</Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                      SN: {item.sn}
                    </Text>
                  </div>
                  <Tag color="blue">{item.tag}</Tag>
                </Flex>
              </List.Item>
            )}
          />

          <Title level={5}>Assigned Software Licenses</Title>
          <List
            size="small"
            bordered
            dataSource={[
              { name: 'Microsoft 365 E5 Enterprise', type: 'Subscription' },
              { name: 'Adobe Creative Cloud All Apps', type: 'Subscription' },
              { name: 'Figma Enterprise Workspace', type: 'Subscription' },
            ]}
            renderItem={(item) => (
              <List.Item>
                <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                  <Text strong>{item.name}</Text>
                  <Tag color="purple">{item.type}</Tag>
                </Flex>
              </List.Item>
            )}
          />
        </Drawer>
      )}
    </PageContainer>
  );
}
