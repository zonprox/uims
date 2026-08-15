import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  KeyOutlined,
  LaptopOutlined,
  LockOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  ShareAltOutlined,
  SyncOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Alert,
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
  InputNumber,
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
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import {
  type DirectoryGroup,
  type DirectoryStats,
  type DirectoryUser,
  directoryService,
} from '../../services/directory.service';

const { Text, Title } = Typography;
const { Option } = Select;

function generateStrongPassword(prefix: 'Ad' = 'Ad'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 4; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}#${randomStr}${digits}!`;
}

export default function DirectoryPage() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<Array<DirectoryUser>>([]);
  const [groups, setGroups] = useState<Array<DirectoryGroup>>([]);
  const [stats, setStats] = useState<DirectoryStats>({
    totalUsers: 0,
    activeUsers: 0,
    custodiansCount: 0,
    suspendedAccounts: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Password Visibility Toggle per row
  const [visibleAdPasswords, setVisibleAdPasswords] = useState<Record<string, boolean>>({});

  // Modals & Drawers
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);

  // Group Create Modal
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupSubmitting, setGroupSubmitting] = useState(false);

  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();

  const toggleAdPasswordVisibility = (userId: string) => {
    setVisibleAdPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${label} to clipboard!`);
  };

  const copyCredentials = (user: DirectoryUser) => {
    const adPass = user.adInitialPassword || `Ad#${user.username || 'User'}2026!`;
    const text = `Active Directory Domain Credentials for ${user.name}:
- AD Username: ${user.username || (user.email ? user.email.split('@')[0] : 'user')}
- Corporate Email: ${user.email}
- Initial Domain Password: ${adPass}`;
    navigator.clipboard.writeText(text);
    message.success(`Copied domain credentials for ${user.name}`);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userList, groupList, statsData] = await Promise.all([
        directoryService.getUsers({
          search: searchQuery || undefined,
          department: deptFilter !== 'all' ? deptFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        directoryService.getGroups(),
        directoryService.getStats().catch(() => null),
      ]);
      setUsers(userList);
      setGroups(groupList);
      if (statsData) {
        setStats(statsData);
      } else {
        const totalUsers = userList.length;
        const activeUsers = userList.filter((u) => u.status === 'Active').length;
        const custodians = userList.filter((u) => u.assignedAssetsCount > 0).length;
        const suspendedAccounts = userList.filter((u) => u.status === 'Suspended').length;
        setStats({
          totalUsers,
          activeUsers,
          custodiansCount: custodians,
          suspendedAccounts,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to load directory data from server.');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, message, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    const generatedAdPass = generateStrongPassword('Ad');
    form.setFieldsValue({
      role: 'Employee',
      status: 'Active',
      source: 'LOCAL',
      department: 'Engineering',
      location: 'HQ - Floor 4',
      twoFactorEnabled: true,
      adInitialPassword: generatedAdPass,
    });
    setUserModalOpen(true);
  };

  const handleOpenEditModal = (user: DirectoryUser) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      if (editingUser) {
        await directoryService.updateUser(editingUser.id, values);
        message.success(`Domain User "${values.name || values.email}" updated successfully.`);
      } else {
        await directoryService.createUser(values);
        message.success(
          `Domain User "${values.name || values.email}" onboarded with Active Directory credentials.`,
        );
      }

      setUserModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save directory user.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await directoryService.deleteUser(id);
      message.success('Domain user account removed successfully.');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete user.');
    }
  };

  const handleShowDetails = (user: DirectoryUser) => {
    setSelectedUser(user);
    setDetailDrawerOpen(true);
  };

  const handleSaveGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      setGroupSubmitting(true);
      await directoryService.createGroup(values);
      message.success(`Distribution Group "${values.name}" created successfully.`);
      setGroupModalOpen(false);
      groupForm.resetFields();
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to create distribution group.');
    } finally {
      setGroupSubmitting(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'LOCAL' && u.source !== 'LOCAL' && u.source !== undefined) return false;
      if (sourceFilter === 'AZURE_AD' && u.source !== 'AZURE_AD') return false;
      if (sourceFilter === 'LDAP' && u.source !== 'LDAP') return false;
    }
    return true;
  });

  const userColumns = [
    {
      title: 'Domain User & Corporate Email',
      dataIndex: 'name',
      key: 'name',
      width: 320,
      render: (name: string, record: DirectoryUser) => {
        const username = record.username || (record.email ? record.email.split('@')[0] : 'user');
        return (
          <Flex align="center" gap={12}>
            <Avatar
              size={40}
              style={{
                backgroundColor:
                  record.source === 'AZURE_AD'
                    ? '#0284c7'
                    : record.role === 'Super Admin'
                      ? '#dc2626'
                      : '#2563eb',
                fontWeight: 600,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Flex align="center" gap={6}>
                <Text
                  strong
                  style={{ fontSize: 13.5, cursor: 'pointer', color: '#1677ff' }}
                  onClick={() => handleShowDetails(record)}
                >
                  {name}
                </Text>
                {record.source === 'AZURE_AD' && (
                  <Tag color="cyan" style={{ fontSize: 9.5, padding: '0 4px', lineHeight: '16px' }}>
                    Azure AD
                  </Tag>
                )}
                {record.source === 'LOCAL' && (
                  <Tag
                    color="geekblue"
                    style={{ fontSize: 9.5, padding: '0 4px', lineHeight: '16px' }}
                  >
                    Local AD
                  </Tag>
                )}
              </Flex>
              <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>
                <KeyOutlined style={{ marginRight: 4, color: '#94a3b8' }} />@{username}
              </Text>
              <Flex align="center" gap={4} wrap style={{ marginTop: 2 }}>
                <MailOutlined style={{ color: '#0ea5e9', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                  {record.email}
                </Text>
                <Tooltip title="Copy Corporate Email">
                  <Button
                    type="text"
                    size="small"
                    style={{ width: 20, height: 20, padding: 0 }}
                    icon={<CopyOutlined style={{ fontSize: 11, color: '#64748b' }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(record.email, 'Email Address');
                    }}
                  />
                </Tooltip>
              </Flex>
            </div>
          </Flex>
        );
      },
    },
    {
      title: 'Initial Domain Password',
      key: 'credentials',
      width: 250,
      render: (_: unknown, record: DirectoryUser) => {
        const isAdVisible = visibleAdPasswords[record.id] || false;
        const adPass = record.adInitialPassword || `Ad#${record.username || 'User'}2026!`;

        return (
          <Flex
            align="center"
            justify="space-between"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11.5,
              maxWidth: 240,
            }}
          >
            <Tooltip title="Initial AD Password (Windows Domain & PC Logon)">
              <Flex align="center" gap={6}>
                <Tag
                  color="blue"
                  style={{ margin: 0, padding: '0 4px', fontSize: 10, fontWeight: 600 }}
                >
                  AD
                </Tag>
                <Text code style={{ fontSize: 11, fontWeight: 500 }}>
                  {isAdVisible ? adPass : '••••••••••'}
                </Text>
              </Flex>
            </Tooltip>
            <Flex gap={4}>
              <Button
                type="text"
                size="small"
                style={{ width: 22, height: 22, padding: 0 }}
                icon={isAdVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => toggleAdPasswordVisibility(record.id)}
              />
              <Tooltip title="Copy AD Password">
                <Button
                  type="text"
                  size="small"
                  style={{ width: 22, height: 22, padding: 0 }}
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(adPass, 'AD Password')}
                />
              </Tooltip>
            </Flex>
          </Flex>
        );
      },
    },
    {
      title: 'Department & Role',
      key: 'dept',
      width: 200,
      render: (_: unknown, record: DirectoryUser) => {
        let roleColor = 'default';
        if (record.role === 'Super Admin') roleColor = 'error';
        if (record.role === 'IT Specialist') roleColor = 'blue';
        if (record.role === 'Developer') roleColor = 'cyan';
        if (record.role === 'Manager') roleColor = 'purple';

        return (
          <div>
            <Text strong style={{ fontSize: 12.5, display: 'block' }}>
              {record.jobTitle}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {record.department}
            </Text>
            <Flex gap={6} style={{ marginTop: 4 }}>
              <Tag color={roleColor} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                {record.role}
              </Tag>
              <Tag
                color={
                  record.status === 'Active'
                    ? 'success'
                    : record.status === 'Suspended'
                      ? 'error'
                      : 'default'
                }
                style={{ fontSize: 10, margin: 0, padding: '0 4px' }}
              >
                {record.status}
              </Tag>
            </Flex>
          </div>
        );
      },
    },
    {
      title: 'Assigned Assets & Seats',
      key: 'assigned',
      width: 170,
      render: (_: unknown, record: DirectoryUser) => (
        <Flex vertical gap={4}>
          <Tooltip title="Hardware Checked Out">
            <Tag icon={<LaptopOutlined />} color="processing" style={{ margin: 0, fontSize: 11 }}>
              {record.assignedAssetsCount} Hardware
            </Tag>
          </Tooltip>
          <Tooltip title="Software SaaS Licenses Allocated">
            <Tag icon={<SafetyOutlined />} color="purple" style={{ margin: 0, fontSize: 11 }}>
              {record.assignedLicensesCount} SaaS Seats
            </Tag>
          </Tooltip>
        </Flex>
      ),
    },
    {
      title: 'Security & 2FA',
      key: 'security',
      width: 140,
      render: (_: unknown, record: DirectoryUser) => (
        <Tag
          color={record.twoFactorEnabled ? 'success' : 'warning'}
          icon={record.twoFactorEnabled ? <SafetyCertificateOutlined /> : <LockOutlined />}
          style={{ margin: 0, fontSize: 11 }}
        >
          {record.twoFactorEnabled ? '2FA Enforced' : '2FA Pending'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      fixed: 'right' as const,
      render: (_: unknown, record: DirectoryUser) => (
        <Space size="small">
          <Tooltip title="Copy Domain Credentials">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyCredentials(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Domain Account">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this domain account?"
            description="Remove from Active Directory and revoke all associated credentials?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete Account">
              <Button type="text" shape="circle" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Active Directory & Domain Accounts"
      subtitle="Unified enterprise identity and custodian management on corporate Domain Controller. Active Directory user accounts, domain credentials, and IT asset allocations."
      breadcrumbs={[{ title: 'Active Directory' }]}
      stats={[
        {
          title: 'Total Domain Accounts',
          value: stats.totalUsers,
          prefix: <TeamOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active Directory Users',
          value: stats.activeUsers,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Equipment Custodians',
          value: stats.custodiansCount ?? stats.activeUsers,
          prefix: <LaptopOutlined />,
          color: '#0ea5e9',
        },
        {
          title: 'Suspended Accounts',
          value: stats.suspendedAccounts,
          prefix: <LockOutlined />,
          color: stats.suspendedAccounts > 0 ? '#ef4444' : '#94a3b8',
        },
      ]}
      extra={
        <Flex gap={8}>
          <Tooltip title="Reload from Domain Controller">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button icon={<ApartmentOutlined />} onClick={() => setGroupModalOpen(true)}>
            New Distribution Group
          </Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={handleOpenCreateModal}>
            Onboard Domain User
          </Button>
        </Flex>
      }
    >
      {/* Domain Controller Architecture Info Banner */}
      <Alert
        type="info"
        showIcon
        icon={<SyncOutlined style={{ color: '#1677ff' }} />}
        style={{ marginBottom: 16, borderRadius: 8 }}
        title={
          <Flex justify="space-between" align="center" wrap gap={8}>
            <div>
              <Text strong>Enterprise Active Directory & Domain Architecture: </Text>
              <Text style={{ fontSize: 13 }}>
                User accounts and identity authentication are centrally governed on the Domain
                Controller. The platform provides managed credentials for{' '}
                <strong>Active Directory Logons</strong> (workstations, domain PCs, VPN, WiFi) and
                IT asset custodian tracking.
              </Text>
            </div>
            <Tag color="processing" style={{ margin: 0, fontWeight: 500 }}>
              Domain: uims.internal • Controller: DC01-PRIMARY
            </Tag>
          </Flex>
        }
      />

      <Tabs
        defaultActiveKey="users"
        items={[
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined /> Domain Users & Accounts ({filteredUsers.length})
              </span>
            ),
            children: (
              <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
                <Row
                  gutter={[14, 14]}
                  align="middle"
                  justify="space-between"
                  style={{ marginBottom: 16 }}
                >
                  <Col xs={24} md={8}>
                    <Input
                      placeholder="Search by name, username, email..."
                      prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} md={16}>
                    <Flex gap={10} justify="flex-end" wrap>
                      <Select
                        value={deptFilter}
                        onChange={setDeptFilter}
                        style={{ width: 170 }}
                        placeholder="Department"
                      >
                        <Option value="all">All Departments</Option>
                        <Option value="IT & Infrastructure">IT & Infrastructure</Option>
                        <Option value="Engineering">Engineering</Option>
                        <Option value="Product & Design">Product & Design</Option>
                        <Option value="Marketing">Marketing</Option>
                        <Option value="Finance">Finance</Option>
                        <Option value="Human Resources">Human Resources</Option>
                        <Option value="Sales">Sales</Option>
                        <Option value="Security & Compliance">Security & Compliance</Option>
                        <Option value="Legal & Governance">Legal & Governance</Option>
                      </Select>

                      <Select
                        value={sourceFilter}
                        onChange={setSourceFilter}
                        style={{ width: 130 }}
                        placeholder="Directory Source"
                      >
                        <Option value="all">All Sources</Option>
                        <Option value="LOCAL">Local AD</Option>
                        <Option value="AZURE_AD">Azure AD</Option>
                        <Option value="LDAP">LDAP</Option>
                      </Select>

                      <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 120 }}
                        placeholder="Status"
                      >
                        <Option value="all">All Status</Option>
                        <Option value="Active">Active</Option>
                        <Option value="Suspended">Suspended</Option>
                        <Option value="Inactive">Inactive</Option>
                      </Select>

                      {(searchQuery ||
                        deptFilter !== 'all' ||
                        sourceFilter !== 'all' ||
                        statusFilter !== 'all') && (
                        <Button
                          onClick={() => {
                            setSearchQuery('');
                            setDeptFilter('all');
                            setSourceFilter('all');
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
                  columns={userColumns}
                  dataSource={filteredUsers}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 1100 }}
                  pagination={{
                    pageSize: 8,
                    showTotal: (total) => `Total ${total} domain accounts`,
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'groups',
            label: (
              <span>
                <ShareAltOutlined /> Distribution & Security Groups ({groups.length})
              </span>
            ),
            children: (
              <div>
                <Flex justify="space-between" align="center" style={{ marginBottom: 14 }}>
                  <div>
                    <Title level={5} style={{ margin: 0 }}>
                      Active Directory Security & Mail Distribution Groups
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Synchronized email distribution lists and permission security groups on the
                      domain controller.
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setGroupModalOpen(true)}
                  >
                    Add Distribution Group
                  </Button>
                </Flex>

                <Row gutter={[14, 14]}>
                  {groups.map((group) => (
                    <Col xs={24} sm={12} lg={8} key={group.id}>
                      <Card
                        size="small"
                        title={
                          <Flex align="center" gap={8}>
                            <ApartmentOutlined style={{ color: '#1677ff' }} />
                            <span>{group.name}</span>
                          </Flex>
                        }
                        extra={<Tag color="blue">{group.scope || 'Internal Only'}</Tag>}
                        styles={{ body: { padding: '14px 16px' } }}
                      >
                        <Flex vertical gap={8}>
                          <Flex align="center" justify="space-between" gap={6}>
                            <Flex align="center" gap={6}>
                              <MailOutlined style={{ color: '#0ea5e9' }} />
                              <Text code style={{ fontSize: 12 }}>
                                {group.email}
                              </Text>
                            </Flex>
                            <Tooltip title="Copy Distribution Email">
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => copyToClipboard(group.email, 'Group Email')}
                              />
                            </Tooltip>
                          </Flex>

                          {group.description && (
                            <Text type="secondary" style={{ fontSize: 11.5, minHeight: 32 }}>
                              {group.description}
                            </Text>
                          )}

                          <Divider style={{ margin: '6px 0' }} />

                          <Flex justify="space-between" style={{ fontSize: 12 }}>
                            <Text type="secondary">Member Count:</Text>
                            <Badge
                              count={`${group.memberCount} members`}
                              style={{ backgroundColor: '#52c41a' }}
                            />
                          </Flex>
                          <Flex justify="space-between" style={{ fontSize: 12 }}>
                            <Text type="secondary">Managed By:</Text>
                            <Text strong style={{ fontSize: 11.5 }}>
                              {group.managedBy || 'IT Admin'}
                            </Text>
                          </Flex>
                        </Flex>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ),
          },
        ]}
      />

      {/* Add / Edit Domain User Modal */}
      <Modal
        title={
          <Flex align="center" gap={8}>
            <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
            <span>
              {editingUser
                ? `Edit Domain Account: ${editingUser.name}`
                : 'Onboard New Domain Account'}
            </span>
          </Flex>
        }
        open={userModalOpen}
        onOk={handleSaveUser}
        onCancel={() => setUserModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={720}
        okText={editingUser ? 'Save Changes' : 'Provision Domain User'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Tabs
            defaultActiveKey="identity"
            items={[
              {
                key: 'identity',
                label: (
                  <span>
                    <UserOutlined /> AD Identity & Org
                  </span>
                ),
                children: (
                  <>
                    <Row gutter={14}>
                      <Col span={12}>
                        <Form.Item
                          label="Full Name / Display Name"
                          name="name"
                          rules={[{ required: true, message: 'Please enter employee name' }]}
                        >
                          <Input placeholder="e.g. Alex Johnson" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="AD Username (sAMAccountName)"
                          name="username"
                          tooltip="Username used to login to Windows Domain and workstations"
                        >
                          <Input placeholder="e.g. alex.johnson" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={14}>
                      <Col span={12}>
                        <Form.Item
                          label="Corporate Email Address"
                          name="email"
                          rules={[
                            { required: true, type: 'email', message: 'Valid email required' },
                          ]}
                        >
                          <Input placeholder="e.g. alex.johnson@company.com" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="Job Title"
                          name="jobTitle"
                          rules={[{ required: true, message: 'Please enter job title' }]}
                        >
                          <Input placeholder="e.g. Senior Cloud Architect" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={14}>
                      <Col span={12}>
                        <Form.Item
                          label="Department"
                          name="department"
                          rules={[{ required: true, message: 'Please select department' }]}
                        >
                          <Select>
                            <Option value="IT & Infrastructure">IT & Infrastructure</Option>
                            <Option value="Engineering">Engineering</Option>
                            <Option value="Product & Design">Product & Design</Option>
                            <Option value="Marketing">Marketing</Option>
                            <Option value="Finance">Finance</Option>
                            <Option value="Human Resources">Human Resources</Option>
                            <Option value="Sales">Sales</Option>
                            <Option value="Security & Compliance">Security & Compliance</Option>
                            <Option value="Legal & Governance">Legal & Governance</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Domain Role" name="role" rules={[{ required: true }]}>
                          <Select>
                            <Option value="Super Admin">Super Admin</Option>
                            <Option value="IT Specialist">IT Specialist</Option>
                            <Option value="Developer">Developer</Option>
                            <Option value="Manager">Manager</Option>
                            <Option value="Employee">Employee</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={14}>
                      <Col span={12}>
                        <Form.Item label="Phone Number" name="phone">
                          <Input placeholder="e.g. +1 (555) 234-5678" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Office Location" name="location">
                          <Input placeholder="e.g. HQ - Floor 4" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={14}>
                      <Col span={8}>
                        <Form.Item
                          label="Account Status"
                          name="status"
                          rules={[{ required: true }]}
                        >
                          <Select>
                            <Option value="Active">Active</Option>
                            <Option value="Suspended">Suspended</Option>
                            <Option value="Inactive">Inactive</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="Directory Source" name="source">
                          <Select>
                            <Option value="LOCAL">Local AD</Option>
                            <Option value="AZURE_AD">Azure AD</Option>
                            <Option value="LDAP">LDAP</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          label="Require 2FA Auth"
                          name="twoFactorEnabled"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'credentials',
                label: (
                  <span>
                    <KeyOutlined /> Initial Password
                  </span>
                ),
                children: (
                  <>
                    <Card
                      size="small"
                      title={
                        <Flex align="center" gap={6}>
                          <Tag color="blue">AD</Tag>
                          <span>Initial Active Directory Password (Domain Logon)</span>
                        </Flex>
                      }
                      style={{ marginBottom: 14 }}
                    >
                      <Row gutter={10} align="middle">
                        <Col flex="auto">
                          <Form.Item
                            name="adInitialPassword"
                            style={{ margin: 0 }}
                            rules={[{ required: true, message: 'AD password required' }]}
                          >
                            <Input.Password placeholder="Initial AD password..." />
                          </Form.Item>
                        </Col>
                        <Col>
                          <Button
                            icon={<ThunderboltOutlined />}
                            onClick={() => {
                              form.setFieldsValue({
                                adInitialPassword: generateStrongPassword('Ad'),
                              });
                            }}
                          >
                            Generate AD Pass
                          </Button>
                        </Col>
                      </Row>
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, display: 'block', marginTop: 6 }}
                      >
                        Used for corporate workstation logon, VPN, Enterprise WiFi, and Active
                        Directory authentication.
                      </Text>
                    </Card>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>

      {/* Distribution Group Modal */}
      <Modal
        title="Create New Active Directory Distribution Group"
        open={groupModalOpen}
        onOk={handleSaveGroup}
        onCancel={() => setGroupModalOpen(false)}
        confirmLoading={groupSubmitting}
        okText="Create Group"
      >
        <Form form={groupForm} layout="vertical" style={{ marginTop: 14 }}>
          <Form.Item
            label="Group Name"
            name="name"
            rules={[{ required: true, message: 'Please enter group name' }]}
          >
            <Input placeholder="e.g. DevOps & SRE Team" />
          </Form.Item>

          <Form.Item
            label="Distribution Email Address"
            name="email"
            rules={[
              { required: true, type: 'email', message: 'Valid distribution email required' },
            ]}
          >
            <Input placeholder="e.g. devops-team@company.com" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Initial Member Count" name="memberCount" initialValue={5}>
                <InputNumber min={1} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Group Scope" name="scope" initialValue="Internal Only">
                <Select>
                  <Option value="Internal Only">Internal Only</Option>
                  <Option value="Global Distribution">Global Distribution</Option>
                  <Option value="Security Group">Security Group</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Purpose of this mail distribution list..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* User Details Drawer */}
      {selectedUser && (
        <Drawer
          title={
            <Flex align="center" gap={10}>
              <Avatar
                size="small"
                style={{
                  backgroundColor: '#1677ff',
                }}
                icon={<UserOutlined />}
              />
              <span>{selectedUser.name}</span>
              <Tag color={selectedUser.status === 'Active' ? 'success' : 'error'}>
                {selectedUser.status}
              </Tag>
            </Flex>
          }
          width={520}
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          extra={
            <Space>
              <Button
                icon={<CopyOutlined />}
                size="small"
                onClick={() => copyToClipboard(selectedUser.email, 'Email Address')}
              >
                Copy Email
              </Button>
              <Button
                icon={<KeyOutlined />}
                size="small"
                onClick={() => copyCredentials(selectedUser)}
              >
                Copy Credentials
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setDetailDrawerOpen(false);
                  handleOpenEditModal(selectedUser);
                }}
              >
                Edit
              </Button>
            </Space>
          }
        >
          {/* Credentials Card */}
          <Card
            size="small"
            title={
              <Flex align="center" gap={6}>
                <KeyOutlined style={{ color: '#1677ff' }} />
                <span>Domain Logon Credentials</span>
              </Flex>
            }
            style={{ marginBottom: 16, backgroundColor: '#f8fafc' }}
          >
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="AD Username">
                <Text code copyable>
                  {selectedUser.username || selectedUser.email.split('@')[0]}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="AD Initial Password">
                <Flex justify="space-between" align="center">
                  <Text code strong style={{ color: '#1677ff' }}>
                    {selectedUser.adInitialPassword || `Ad#${selectedUser.username || 'User'}2026!`}
                  </Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() =>
                      copyToClipboard(
                        selectedUser.adInitialPassword ||
                          `Ad#${selectedUser.username || 'User'}2026!`,
                        'AD Password',
                      )
                    }
                  >
                    Copy
                  </Button>
                </Flex>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Descriptions
            title="Active Directory Identity"
            size="small"
            column={1}
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Corporate Email">
              <Flex align="center" justify="space-between">
                <Text copyable strong>
                  {selectedUser.email}
                </Text>
                <Button
                  type="link"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyToClipboard(selectedUser.email, 'Email Address')}
                >
                  Copy
                </Button>
              </Flex>
            </Descriptions.Item>
            <Descriptions.Item label="Job Title">{selectedUser.jobTitle}</Descriptions.Item>
            <Descriptions.Item label="Department">{selectedUser.department}</Descriptions.Item>
            <Descriptions.Item label="Domain Access Role">
              <Tag color="blue">{selectedUser.role}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Office Location">{selectedUser.location}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selectedUser.phone || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Directory Source">
              <Tag color="cyan">{selectedUser.source || 'LOCAL'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="2FA Authentication">
              <Tag color={selectedUser.twoFactorEnabled ? 'success' : 'warning'}>
                {selectedUser.twoFactorEnabled ? 'Enabled & Enforced' : 'Not Configured'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Descriptions title="Allocated Equipment & Licenses" size="small" column={1} bordered>
            <Descriptions.Item label="Hardware Assets Checked Out">
              <Tag icon={<LaptopOutlined />} color="processing">
                {selectedUser.assignedAssetsCount} devices
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Software Seats Active">
              <Tag icon={<SafetyOutlined />} color="purple">
                {selectedUser.assignedLicensesCount} SaaS licenses
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Drawer>
      )}
    </PageContainer>
  );
}
