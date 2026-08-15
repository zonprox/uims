import {
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { Role, User, UserStatus, UserSummaryStats } from '@uims/shared-types';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
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
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { usersService } from '../../services/users.service';

const { Text } = Typography;
const { Option } = Select;

export default function UsersPage() {
  const { message } = App.useApp();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<UserSummaryStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    suspendedUsers: 0,
    recentActiveCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Modals & Drawers
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, statsData, rolesList] = await Promise.all([
        usersService.getUsers({
          search: search || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          department: deptFilter !== 'all' ? deptFilter : undefined,
        }),
        usersService.getStats().catch(() => null),
        usersService.getRoles().catch(() => []),
      ]);

      setUsers(usersData.items || []);
      setRoles(rolesList);
      if (statsData) {
        setStats(statsData);
      } else {
        const total = usersData.items?.length || 0;
        const active = usersData.items?.filter((u) => u.status === 'ACTIVE').length || 0;
        const admins =
          usersData.items?.filter((u) => u.roleName === 'Super Admin' || u.roleName === 'Admin')
            .length || 0;
        const suspended = usersData.items?.filter((u) => u.status === 'SUSPENDED').length || 0;
        setStats({
          totalUsers: total,
          activeUsers: active,
          adminUsers: admins,
          suspendedUsers: suspended,
          recentActiveCount: active,
        });
      }
    } catch (err) {
      console.error('Failed to load system users:', err);
      message.error('Failed to load system login users from server');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, message, roleFilter, search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helpers
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = 'UIMS@';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'ACTIVE',
      roleName: 'Employee',
      password: generateRandomPassword(),
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
    });
    setUserModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleName: user.roleName || user.role?.name || 'Employee',
      status: user.status,
      phone: user.phone,
      department: user.department,
      location: user.location,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      if (editingUser) {
        await usersService.updateUser(editingUser.id, values);
        message.success(`User account "${values.email}" updated successfully.`);
      } else {
        await usersService.createUser(values);
        message.success(`User account "${values.email}" provisioned.`);
      }

      setUserModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save user account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenResetPassword = (user: User) => {
    setResettingUser(user);
    const pass = generateRandomPassword();
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
      message.success(`Password reset for ${resettingUser.email}`);
      setResetModalOpen(false);
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
        `User ${user.email} is now ${nextStatus === 'ACTIVE' ? 'Activated' : 'Suspended'}`,
      );
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await usersService.deleteUser(id);
      message.success('User account removed');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete user');
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
      title: 'User Identity & Email',
      dataIndex: 'email',
      key: 'user',
      render: (_: unknown, record: User) => {
        const name = `${record.firstName} ${record.lastName}`.trim() || 'User';
        const initial = record.firstName ? record.firstName[0].toUpperCase() : 'U';
        return (
          <Flex align="center" gap={10}>
            <Avatar
              size="small"
              src={record.avatar}
              style={{ backgroundColor: '#1677ff', fontSize: 11 }}
              icon={<UserOutlined />}
            >
              {initial}
            </Avatar>
            <div>
              <Text
                strong
                style={{ fontSize: 13, cursor: 'pointer', color: '#1677ff' }}
                onClick={() => handleShowDetails(record)}
              >
                {name}
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>
                {record.email}
              </Text>
            </div>
          </Flex>
        );
      },
    },
    {
      title: 'Assigned RBAC Role',
      dataIndex: 'roleName',
      key: 'role',
      render: (roleName: string, record: User) => {
        const role = roleName || record.role?.name || 'Employee';
        let color = 'default';
        if (role === 'Super Admin') color = 'error';
        else if (role === 'Admin') color = 'magenta';
        else if (role === 'IT Specialist' || role === 'Technician') color = 'blue';
        else if (role === 'Manager') color = 'purple';
        else if (role === 'Auditor') color = 'orange';
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: 'Department & Location',
      key: 'dept',
      render: (_: unknown, record: User) => (
        <div>
          <Text strong style={{ fontSize: 12.5, display: 'block' }}>
            {record.department || 'General'}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.location || 'HQ Office'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Login Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: UserStatus) => (
        <Tag color={status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'error' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Last Active Session',
      dataIndex: 'lastLoginAt',
      key: 'lastLogin',
      render: (lastLogin: string | null) => (
        <Text type="secondary" style={{ fontSize: 11.5 }}>
          {lastLogin ? new Date(lastLogin).toLocaleString() : 'Never logged in'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Tooltip title="View Detailed Profile">
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
                  ? 'Suspend this user account?'
                  : 'Activate this user account?'
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
            title="Permanently remove this user?"
            description="All session tokens will be revoked."
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
      title="System Users & Access Management"
      subtitle="Identity governance, console login accounts, RBAC role assignments, security status, and credential resets."
      breadcrumbs={[{ title: 'Users' }]}
      stats={[
        {
          title: 'Total System Users',
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
          title: 'Admin Privileged Accounts',
          value: stats.adminUsers,
          prefix: <SafetyCertificateOutlined />,
          color: '#722ed1',
        },
        {
          title: 'Suspended Logins',
          value: stats.suspendedUsers,
          prefix: <LockOutlined />,
          color: stats.suspendedUsers > 0 ? '#ef4444' : '#94a3b8',
        },
      ]}
      extra={
        <Flex gap={8} wrap>
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<UserAddOutlined />} onClick={handleOpenCreateModal}>
            New System User
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={9}>
            <Input
              placeholder="Search by name, email, phone..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={15}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: 150 }}
                placeholder="Role"
              >
                <Option value="all">All Roles</Option>
                <Option value="Super Admin">Super Admin</Option>
                <Option value="Admin">Admin</Option>
                <Option value="Technician">Technician</Option>
                <Option value="Manager">Manager</Option>
                <Option value="Auditor">Auditor</Option>
                <Option value="Employee">Employee</Option>
              </Select>

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 130 }}
                placeholder="Status"
              >
                <Option value="all">All Status</Option>
                <Option value="ACTIVE">Active</Option>
                <Option value="SUSPENDED">Suspended</Option>
                <Option value="INACTIVE">Inactive</Option>
              </Select>

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
                <Option value="Security & Compliance">Security & Compliance</Option>
                <Option value="Executive">Executive</Option>
              </Select>

              {(search ||
                roleFilter !== 'all' ||
                statusFilter !== 'all' ||
                deptFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                    setStatusFilter('all');
                    setDeptFilter('all');
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
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} accounts` }}
        />
      </Card>

      {/* Create / Edit User Modal */}
      <Modal
        title={editingUser ? `Edit Account: ${editingUser.email}` : 'Provision New System User'}
        open={userModalOpen}
        onOk={handleSaveUser}
        onCancel={() => setUserModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={620}
        okText={editingUser ? 'Save Changes' : 'Create User'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
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
              <Form.Item
                label="System Email Address"
                name="email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input placeholder="e.g. alex.johnson@company.com" disabled={!!editingUser} />
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
                      <Option value="Technician">Technician (Helpdesk & Field)</Option>
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
              <Col span={24}>
                <Form.Item
                  label="Initial Password"
                  name="password"
                  rules={[{ required: true, min: 6 }]}
                  extra="User will use this password to sign into UIMS console."
                >
                  <Input.Password placeholder="••••••••••••" />
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
                  <Option value="Security & Compliance">Security & Compliance</Option>
                  <Option value="Executive">Executive</Option>
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
            label="New Password"
            name="password"
            rules={[{ required: true, min: 6 }]}
            extra={
              <Flex align="center" gap={8} style={{ marginTop: 6 }}>
                <Button
                  size="small"
                  onClick={() => {
                    const pass = generateRandomPassword();
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
                    Copy
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
              <span>{`${selectedUser.firstName} ${selectedUser.lastName}`.trim()}</span>
              <Tag color={selectedUser.status === 'ACTIVE' ? 'success' : 'error'}>
                {selectedUser.status}
              </Tag>
            </Flex>
          }
          size={500}
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
            title="System User Credentials & Profile"
            size="small"
            column={1}
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Login Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Assigned Role">
              <Tag color="blue">
                {selectedUser.roleName || selectedUser.role?.name || 'Employee'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Department">{selectedUser.department}</Descriptions.Item>
            <Descriptions.Item label="Office Location">{selectedUser.location}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selectedUser.phone || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Last Login Session">
              {selectedUser.lastLoginAt
                ? new Date(selectedUser.lastLoginAt).toLocaleString()
                : 'Never'}
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
