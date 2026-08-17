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
  StopOutlined,
  SyncOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  DirectoryGroup,
  PermissionCatalogSubject,
  Role,
  RoleSummaryStats,
  User,
  UserStatus,
  UserSummaryStats,
} from '@uims/shared-types';
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
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { FormattedDateTime } from '../../components/FormattedDate';
import { rolesService } from '../../services/roles.service';
import { usersService } from '../../services/users.service';
import { RolesTab } from './components/RolesTab';

const { Text, Title } = Typography;
const { Option } = Select;

function generateStrongPassword(prefix = 'Ad'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 4; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}#${randomStr}${digits}!`;
}

export default function UsersPage() {
  const { message } = App.useApp();

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesStats, setRolesStats] = useState<RoleSummaryStats | null>(null);
  const [rolesCatalog, setRolesCatalog] = useState<PermissionCatalogSubject[]>([]);
  const [stats, setStats] = useState<UserSummaryStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    custodiansCount: 0,
    suspendedUsers: 0,
    recentActiveCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Password Visibility Toggle per row
  const [visibleAdPasswords, setVisibleAdPasswords] = useState<Record<string, boolean>>({});

  // Modals & Drawers
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupSubmitting, setGroupSubmitting] = useState(false);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const toggleAdPasswordVisibility = (userId: string) => {
    setVisibleAdPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${label} to clipboard!`);
  };

  const copyCredentials = (user: User) => {
    const username = user.username || user.email.split('@')[0];
    const adPass = user.adInitialPassword || `Ad#${username}2026!`;
    const text = `Active Directory Domain Credentials for ${user.fullName || user.displayName || username}:
- AD Username: ${username}
- Corporate Email: ${user.email}
- Initial Domain Password: ${adPass}
- Domain: uims.internal`;
    navigator.clipboard.writeText(text);
    message.success(`Copied domain credentials for ${user.fullName || username}`);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, groupsData, statsData, rolesList, rStats, rCatalog] =
        await Promise.all([
          usersService.getUsers({
            search: search || undefined,
            role: roleFilter !== 'all' ? roleFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            department: deptFilter !== 'all' ? deptFilter : undefined,
            source: sourceFilter !== 'all' ? sourceFilter : undefined,
          }),
          usersService.getGroups().catch(() => []),
          usersService.getStats().catch(() => null),
          rolesService.getRoles().catch(() => []),
          rolesService.getStats().catch(() => null),
          rolesService.getCatalog().catch(() => []),
        ]);

      setUsers(usersData.items || []);
      setGroups(groupsData || []);
      setRoles(rolesList || []);
      setRolesStats(rStats);
      setRolesCatalog(rCatalog || []);

      if (statsData) {
        setStats(statsData);
      } else {
        const total = usersData.items?.length || 0;
        const active = usersData.items?.filter((u) => u.status === 'ACTIVE').length || 0;
        const admins =
          usersData.items?.filter((u) => u.roleName === 'Super Admin' || u.roleName === 'Admin')
            .length || 0;
        const suspended = usersData.items?.filter((u) => u.status === 'SUSPENDED').length || 0;
        const custodians =
          usersData.items?.filter((u) => (u.assignedAssetsCount || 0) > 0).length || 0;
        setStats({
          totalUsers: total,
          activeUsers: active,
          adminUsers: admins,
          custodiansCount: custodians,
          suspendedUsers: suspended,
          recentActiveCount: active,
        });
      }
    } catch (err) {
      console.error('Failed to load system users:', err);
      message.error('Failed to load accounts from Domain Controller');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, message, roleFilter, search, sourceFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    const generatedPass = generateStrongPassword('Ad');
    form.setFieldsValue({
      status: 'ACTIVE',
      roleName: 'Employee',
      source: 'LOCAL',
      adInitialPassword: generatedPass,
      password: generatedPass,
      department: 'Engineering',
      location: 'NY HQ - Floor 4',
    });
    setUserModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName || user.fullName,
      email: user.email,
      jobTitle: user.jobTitle,
      roleName: user.roleName || user.role?.name || 'Employee',
      status: user.status,
      source: user.source || 'LOCAL',
      phone: user.phone,
      department: user.department,
      location: user.location,
      adInitialPassword: user.adInitialPassword,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      if (editingUser) {
        await usersService.updateUser(editingUser.id, values);
        message.success(`Domain User "${values.email}" updated successfully.`);
      } else {
        await usersService.createUser(values);
        message.success(
          `Domain User "${values.email}" onboarded with Active Directory credentials.`,
        );
      }

      setUserModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save domain user account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleSaveGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      setGroupSubmitting(true);
      await usersService.createGroup(values);
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

  const handleOpenResetPassword = (user: User) => {
    setResettingUser(user);
    const pass = generateStrongPassword('Ad');
    setNewPassword(pass);
    resetForm.setFieldsValue({ password: pass });
    setResetModalOpen(true);
  };

  const handleSaveResetPassword = async () => {
    if (!resettingUser) return;
    try {
      const values = await resetForm.validateFields();
      setModalSubmitting(true);
      await usersService.resetPassword(resettingUser.id, values.password);
      message.success(`Password reset successfully for ${resettingUser.email}`);
      setResetModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to reset password');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus: UserStatus =
      user.status === 'ACTIVE' ? ('SUSPENDED' as UserStatus) : ('ACTIVE' as UserStatus);
    try {
      await usersService.toggleStatus(user.id, nextStatus);
      message.success(
        `Account ${user.email} is now ${nextStatus === 'ACTIVE' ? 'Activated' : 'Suspended'}`,
      );
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to update account status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await usersService.deleteUser(id);
      message.success('Account removed from domain');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete account');
    }
  };

  const handleShowDetails = async (user: User) => {
    try {
      const detailed = await usersService.getUser(user.id);
      setSelectedUser(detailed);
      setDetailDrawerOpen(true);
    } catch {
      setSelectedUser(user);
      setDetailDrawerOpen(true);
    }
  };

  const userColumns = [
    {
      title: 'DOMAIN USER & CORPORATE EMAIL',
      dataIndex: 'email',
      key: 'user',
      width: 320,
      render: (_: unknown, record: User) => {
        const name =
          record.displayName ||
          record.fullName ||
          `${record.firstName || ''} ${record.lastName || ''}`.trim() ||
          record.username;
        const initial = name ? name.charAt(0).toUpperCase() : 'U';
        const username = record.username || record.email.split('@')[0];

        return (
          <Flex align="center" gap={12}>
            <Avatar
              size={40}
              src={record.avatar}
              style={{
                backgroundColor:
                  record.source === 'AZURE_AD'
                    ? '#0284c7'
                    : record.roleName === 'Super Admin'
                      ? '#dc2626'
                      : '#1677ff',
                fontWeight: 600,
                fontSize: 14,
                flexShrink: 0,
              }}
              icon={<UserOutlined />}
            >
              {initial}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Flex align="center" gap={6} wrap>
                <Text
                  strong
                  style={{ fontSize: 13.5, cursor: 'pointer', color: '#1677ff' }}
                  onClick={() => handleShowDetails(record)}
                >
                  {name}
                </Text>
                {record.source === 'AZURE_AD' ? (
                  <Tag color="cyan" style={{ fontSize: 9.5, padding: '0 4px', lineHeight: '16px' }}>
                    Azure AD
                  </Tag>
                ) : (
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
      title: 'INITIAL DOMAIN PASSWORD',
      key: 'credentials',
      width: 240,
      render: (_: unknown, record: User) => {
        const isAdVisible = visibleAdPasswords[record.id] || false;
        const username = record.username || record.email.split('@')[0];
        const adPass = record.adInitialPassword || `Ad#${username}2026!`;

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
              maxWidth: 220,
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
      title: 'DEPARTMENT & ROLE',
      key: 'dept',
      width: 200,
      render: (_: unknown, record: User) => {
        const role = record.roleName || record.role?.name || 'Employee';
        let color = 'default';
        if (role === 'Super Admin') color = 'error';
        else if (role === 'Admin') color = 'magenta';
        else if (role === 'IT Specialist' || role === 'Technician') color = 'blue';
        else if (role === 'Manager') color = 'purple';
        else if (role === 'Auditor') color = 'orange';

        return (
          <div>
            <Text strong style={{ fontSize: 12.5, display: 'block' }}>
              {record.jobTitle || record.department || 'General'}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.location || 'HQ Office'}
            </Text>
            <Flex gap={6} style={{ marginTop: 4 }}>
              <Tag color={color} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                {role}
              </Tag>
            </Flex>
          </div>
        );
      },
    },
    {
      title: 'ASSIGNED ASSETS & SEATS',
      key: 'assigned',
      width: 170,
      render: (_: unknown, record: User) => (
        <Flex vertical gap={4}>
          <Tooltip title="Hardware Fleet checked out">
            <Tag icon={<LaptopOutlined />} color="processing" style={{ margin: 0, fontSize: 11 }}>
              {record.assignedAssetsCount || 0} Hardware
            </Tag>
          </Tooltip>
          <Tooltip title="Software SaaS Licenses Allocated">
            <Tag icon={<SafetyOutlined />} color="purple" style={{ margin: 0, fontSize: 11 }}>
              {record.assignedLicensesCount || 0} SaaS Seats
            </Tag>
          </Tooltip>
        </Flex>
      ),
    },
    {
      title: 'ACCOUNT STATUS',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: UserStatus) => (
        <Tag color={status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'error' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Tooltip title="Copy Complete Domain Credentials">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyCredentials(record)}
            />
          </Tooltip>
          <Tooltip title="View Profile & Details">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<UserOutlined />}
              onClick={() => handleShowDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Profile & Role">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="Reset Password">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<KeyOutlined style={{ color: '#f59e0b' }} />}
              onClick={() => handleOpenResetPassword(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}>
            <Popconfirm
              title={
                record.status === 'ACTIVE'
                  ? 'Suspend this domain account?'
                  : 'Activate this domain account?'
              }
              onConfirm={() => handleToggleStatus(record)}
            >
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={
                  record.status === 'ACTIVE' ? (
                    <StopOutlined style={{ color: '#ef4444' }} />
                  ) : (
                    <CheckCircleOutlined style={{ color: '#10b981' }} />
                  )
                }
              />
            </Popconfirm>
          </Tooltip>
          <Popconfirm
            title="Permanently remove this account?"
            description="All session tokens and domain credentials will be revoked."
            onConfirm={() => handleDeleteUser(record.id)}
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
      title="Active Directory & Users"
      subtitle="Unified corporate identity, Domain Controller credentials, RBAC role management, hardware custodians, and distribution groups."
      breadcrumbs={[{ title: 'Active Directory & Users' }]}
      stats={[
        {
          title: 'Total Domain Accounts',
          value: stats.totalUsers,
          prefix: <TeamOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active Logins',
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
          value: stats.suspendedUsers,
          prefix: <LockOutlined />,
          color: stats.suspendedUsers > 0 ? '#ef4444' : '#94a3b8',
        },
      ]}
      extra={
        <Flex gap={8} wrap>
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
              <Text strong>Enterprise Active Directory & Identity Governance: </Text>
              <Text style={{ fontSize: 13 }}>
                Centralized authentication and asset custodian records are unified on the Domain
                Controller. Single identity governs console access and workstation/domain logons.
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
                <TeamOutlined /> Domain Users & Accounts ({users.length})
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
                      placeholder="Search by name, username, email, phone..."
                      prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
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
                        value={roleFilter}
                        onChange={setRoleFilter}
                        style={{ width: 140 }}
                        placeholder="Role"
                      >
                        <Option value="all">All Roles</Option>
                        <Option value="Super Admin">Super Admin</Option>
                        <Option value="Admin">Admin</Option>
                        <Option value="IT Specialist">IT Specialist</Option>
                        <Option value="Developer">Developer</Option>
                        <Option value="Manager">Manager</Option>
                        <Option value="Auditor">Auditor</Option>
                        <Option value="Employee">Employee</Option>
                      </Select>

                      <Select
                        value={sourceFilter}
                        onChange={setSourceFilter}
                        style={{ width: 120 }}
                        placeholder="Source"
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
                        <Option value="ACTIVE">Active</Option>
                        <Option value="SUSPENDED">Suspended</Option>
                        <Option value="INACTIVE">Inactive</Option>
                      </Select>

                      {(search ||
                        roleFilter !== 'all' ||
                        statusFilter !== 'all' ||
                        deptFilter !== 'all' ||
                        sourceFilter !== 'all') && (
                        <Button
                          onClick={() => {
                            setSearch('');
                            setRoleFilter('all');
                            setStatusFilter('all');
                            setDeptFilter('all');
                            setSourceFilter('all');
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
                  dataSource={users}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 1100 }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '25', '50', '100'],
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
                                onClick={() => copyToClipboard(group.email || '', 'Group Email')}
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
          {
            key: 'roles',
            label: (
              <span>
                <SafetyCertificateOutlined /> RBAC Roles & Permission Matrix ({roles.length})
              </span>
            ),
            children: (
              <RolesTab
                roles={roles}
                stats={rolesStats}
                catalog={rolesCatalog}
                users={users}
                loading={loading}
                onRefresh={loadData}
              />
            ),
          },
        ]}
      />

      {/* Create / Edit User Modal */}
      <Modal
        title={editingUser ? `Edit Account: ${editingUser.email}` : 'Onboard New Domain User'}
        open={userModalOpen}
        onOk={handleSaveUser}
        onCancel={() => setUserModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={680}
        okText={editingUser ? 'Save Changes' : 'Provision User'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="AD Username (Logon ID)"
                name="username"
                rules={[{ required: true, message: 'Please enter AD username' }]}
                extra="Used for domain PC login and SSO."
              >
                <Input placeholder="e.g. alex.johnson" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Corporate Email Address"
                name="email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input placeholder="e.g. alex.johnson@company.com" disabled={!!editingUser} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="First Name" name="firstName" rules={[{ required: true }]}>
                <Input placeholder="e.g. Alex" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Last Name" name="lastName" rules={[{ required: true }]}>
                <Input placeholder="e.g. Johnson" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Job Title / Position" name="jobTitle">
                <Input placeholder="e.g. Senior Systems Administrator" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="RBAC Access Role" name="roleName" rules={[{ required: true }]}>
                <Select placeholder="Select role">
                  {roles.length > 0 ? (
                    roles.map((r) => (
                      <Option key={r.id} value={r.name}>
                        {r.name}
                      </Option>
                    ))
                  ) : (
                    <>
                      <Option value="Super Admin">Super Admin (Full Root Access)</Option>
                      <Option value="Admin">Admin (Infrastructure & Assets)</Option>
                      <Option value="IT Specialist">IT Specialist (Helpdesk & Field)</Option>
                      <Option value="Developer">Developer (Engineering)</Option>
                      <Option value="Manager">Manager (Team Lead)</Option>
                      <Option value="Auditor">Auditor (Read-Only SOC2)</Option>
                      <Option value="Employee">Employee (Standard Access)</Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item
                  label="Initial Domain Password (AD & Console)"
                  name="adInitialPassword"
                  rules={[{ required: true, min: 6 }]}
                  extra="Initial password for workstation and console logon."
                >
                  <Input.Password placeholder="••••••••••••" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Directory Source" name="source" rules={[{ required: true }]}>
                  <Select>
                    <Option value="LOCAL">Local Active Directory</Option>
                    <Option value="AZURE_AD">Azure Active Directory / Entra ID</Option>
                    <Option value="LDAP">LDAP Corporate Directory</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Department" name="department" rules={[{ required: true }]}>
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
              <Form.Item label="Office Location" name="location">
                <Input placeholder="e.g. NY HQ - Floor 4" />
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
              <Form.Item label="Account Status" name="status" rules={[{ required: true }]}>
                <Select>
                  <Option value="ACTIVE">ACTIVE</Option>
                  <Option value="SUSPENDED">SUSPENDED</Option>
                  <Option value="INACTIVE">INACTIVE</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
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
            <Input placeholder="e.g. DevOps Core Engineering" />
          </Form.Item>
          <Form.Item
            label="Distribution Email Address"
            name="email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="e.g. devops-core@company.com" />
          </Form.Item>
          <Form.Item label="Security Scope" name="scope" initialValue="Internal Only">
            <Select>
              <Option value="Internal Only">Internal Only (Staff & Contractors)</Option>
              <Option value="Public / External Allowed">Public / External Inbound Allowed</Option>
              <Option value="Restricted / Security High">Restricted / Security High</Option>
              <Option value="Confidential / Board Level">Confidential / Board Level</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Group Description & Purpose" name="description">
            <Input.TextArea
              rows={2}
              placeholder="Description of the group membership and responsibilities"
            />
          </Form.Item>
          <Form.Item label="Managed By (Lead / Contact)" name="managedBy" initialValue="IT Admin">
            <Input placeholder="e.g. Sarah Chen" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`Reset Password for ${resettingUser?.email}`}
        open={resetModalOpen}
        onOk={handleSaveResetPassword}
        onCancel={() => setResetModalOpen(false)}
        confirmLoading={modalSubmitting}
        okText="Update Password"
      >
        <Form form={resetForm} layout="vertical" style={{ marginTop: 14 }}>
          <Form.Item
            label="New Strong Password"
            name="password"
            rules={[{ required: true, min: 6 }]}
            extra={
              <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  onClick={() => {
                    const pass = generateStrongPassword('Ad');
                    setNewPassword(pass);
                    resetForm.setFieldsValue({ password: pass });
                  }}
                >
                  Generate Strong Password
                </Button>
                {newPassword && (
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      message.success('Password copied to clipboard');
                    }}
                  >
                    Copy Password
                  </Button>
                )}
              </Flex>
            }
          >
            <Input.Password placeholder="Enter new strong password" />
          </Form.Item>
        </Form>
      </Modal>

      {/* User Details Drawer */}
      {selectedUser && (
        <Drawer
          title={
            <Flex align="center" gap={8}>
              <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
              <span>
                {selectedUser.displayName ||
                  selectedUser.fullName ||
                  `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() ||
                  selectedUser.username}
              </span>
              <Tag color={selectedUser.status === 'ACTIVE' ? 'success' : 'error'}>
                {selectedUser.status}
              </Tag>
            </Flex>
          }
          width={500}
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          extra={
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setDetailDrawerOpen(false);
                handleOpenEditModal(selectedUser);
              }}
            >
              Edit Account
            </Button>
          }
        >
          <Descriptions
            title="Domain Credentials & Identity"
            size="small"
            column={1}
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="AD Username">
              <Text strong code>
                @{selectedUser.username}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Corporate Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Initial AD Password">
              <Text code>{selectedUser.adInitialPassword || '••••••••••'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Directory Source">
              <Tag color="blue">{selectedUser.source || 'LOCAL'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Job Title">
              {selectedUser.jobTitle || 'Employee'}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Role">
              <Tag color="blue">
                {selectedUser.roleName || selectedUser.role?.name || 'Employee'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Department">{selectedUser.department}</Descriptions.Item>
            <Descriptions.Item label="Office Location">{selectedUser.location}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selectedUser.phone || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Last Active Session">
              {selectedUser.lastLoginAt ? (
                <FormattedDateTime date={selectedUser.lastLoginAt} showOffset showTimezone />
              ) : (
                'Never logged in'
              )}
            </Descriptions.Item>
          </Descriptions>

          {selectedUser.role?.permissions && selectedUser.role.permissions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Granted RBAC Permissions ({selectedUser.role.permissions.length}):
              </Text>
              <Flex gap={6} wrap="wrap">
                {selectedUser.role.permissions.map((p, idx) => {
                  const perm = p as unknown as {
                    id?: string;
                    permissionId?: string;
                    name?: string;
                    action?: string;
                    resource?: string;
                    subject?: string;
                    permission?: {
                      action?: string;
                      subject?: string;
                      resource?: string;
                      name?: string;
                    };
                  };
                  const key = perm.id || perm.permissionId || String(idx);
                  const label =
                    perm.name ||
                    (perm.permission
                      ? `${perm.permission.action || ''} ${perm.permission.subject || perm.permission.resource || ''}`.trim()
                      : `${perm.action || ''} ${perm.subject || perm.resource || ''}`.trim()) ||
                    'Access Permission';

                  return (
                    <Tag key={key} color="purple">
                      {label}
                    </Tag>
                  );
                })}
              </Flex>
            </div>
          )}
        </Drawer>
      )}
    </PageContainer>
  );
}
