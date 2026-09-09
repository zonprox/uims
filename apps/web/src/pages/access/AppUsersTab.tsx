import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnlockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { AppUser, Role } from '@uims/shared-types';
import { UserStatus } from '@uims/shared-types';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
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
  theme,
} from 'antd';
import React, { useMemo, useState } from 'react';
import { FormattedDateTime } from '../../components/FormattedDate';
import { usersService } from '../../services/users.service';

const { Text } = Typography;
const { Option } = Select;

export interface AppUsersTabProps {
  users: AppUser[];
  roles: Role[];
  loading: boolean;
  onRefresh: () => void;
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Uims#${pass}1!`;
}

export const AppUsersTab: React.FC<AppUsersTabProps> = ({
  users,
  roles,
  loading,
  onRefresh,
  createModalOpen,
  setCreateModalOpen,
}) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Forms
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const safeRoles = useMemo(() => {
    if (Array.isArray(roles)) return roles;
    if (roles && Array.isArray((roles as unknown as { data?: Role[] }).data)) {
      return (roles as unknown as { data: Role[] }).data;
    }
    return [];
  }, [roles]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const s = search.toLowerCase().trim();
      const matchesSearch =
        !s ||
        user.username.toLowerCase().includes(s) ||
        user.email.toLowerCase().includes(s) ||
        (user.displayName && user.displayName.toLowerCase().includes(s)) ||
        (user.fullName && user.fullName.toLowerCase().includes(s));

      const matchesRole =
        roleFilter === 'all' ||
        user.roleId === roleFilter ||
        user.roleName?.toLowerCase() === roleFilter.toLowerCase();

      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    message.success(`Copied email to clipboard: ${email}`);
  };

  const handleCreateUser = async (values: {
    username: string;
    email: string;
    password?: string;
    displayName?: string;
    roleId?: string;
    status?: UserStatus;
  }) => {
    setModalSubmitting(true);
    try {
      const selectedRole = safeRoles.find((r) => r.id === values.roleId);
      await usersService.createUser({
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password || generateRandomPassword(),
        displayName: values.displayName?.trim(),
        roleId: values.roleId,
        roleName: selectedRole?.name || 'Employee',
        status: values.status || UserStatus.ACTIVE,
      });
      message.success('User account created successfully.');
      setCreateModalOpen(false);
      createForm.resetFields();
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to create user account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      displayName: user.displayName || user.fullName,
      email: user.email,
      roleId: user.roleId || undefined,
      status: user.status,
    });
  };

  const handleUpdateUser = async (values: {
    displayName?: string;
    email?: string;
    roleId?: string;
    status?: UserStatus;
  }) => {
    if (!editingUser) return;
    setModalSubmitting(true);
    try {
      const selectedRole = safeRoles.find((r) => r.id === values.roleId);
      await usersService.updateUser(editingUser.id, {
        displayName: values.displayName?.trim(),
        email: values.email?.trim(),
        roleId: values.roleId,
        roleName: selectedRole?.name,
        status: values.status,
      });
      message.success('User account updated successfully.');
      setEditingUser(null);
      editForm.resetFields();
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to update user account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleLock = async (user: AppUser) => {
    const nextLocked = !user.isLocked;
    try {
      await usersService.updateUser(user.id, { isLocked: nextLocked });
      message.success(
        nextLocked
          ? `Account for ${user.username} locked successfully.`
          : `Account for ${user.username} unlocked successfully.`,
      );
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to update account lock state.');
    }
  };

  const handleOpenResetPassword = (user: AppUser) => {
    setResetUser(user);
    resetForm.setFieldsValue({
      newPassword: generateRandomPassword(),
    });
  };

  const handleResetPassword = async (values: { newPassword: string }) => {
    if (!resetUser) return;
    setModalSubmitting(true);
    try {
      await usersService.updateUser(resetUser.id, { password: values.newPassword });
      message.success(`Password reset successfully for ${resetUser.username}.`);
      setResetUser(null);
      resetForm.resetFields();
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to reset password.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    try {
      await usersService.deleteUser(user.id);
      message.success(`User ${user.username} deleted successfully.`);
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to delete user.');
    }
  };

  const getRoleColor = (roleName?: string | null) => {
    if (!roleName) return 'default';
    switch (roleName.toLowerCase()) {
      case 'super admin':
        return 'magenta';
      case 'admin':
        return 'blue';
      case 'technician':
        return 'cyan';
      case 'manager':
        return 'purple';
      case 'auditor':
        return 'orange';
      default:
        return 'geekblue';
    }
  };

  const getStatusTag = (status: UserStatus, isLocked?: boolean) => {
    if (isLocked) {
      return (
        <Tag color="error" icon={<LockOutlined />}>
          Locked
        </Tag>
      );
    }
    switch (status) {
      case UserStatus.ACTIVE:
        return <Tag color="success">Active</Tag>;
      case UserStatus.SUSPENDED:
        return <Tag color="error">Suspended</Tag>;
      case UserStatus.INACTIVE:
        return <Tag color="warning">Inactive</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, record: AppUser) => (
        <Flex align="center" gap={10}>
          <Avatar
            style={{
              backgroundColor: record.isLocked ? '#ef4444' : '#1677ff',
              flexShrink: 0,
            }}
            icon={<UserOutlined />}
          >
            {(record.displayName || record.username || 'U')[0].toUpperCase()}
          </Avatar>
          <Flex vertical style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, lineHeight: '18px' }}>
              {record.displayName || record.fullName || record.username}
            </Text>
            <Text type="secondary" style={{ fontSize: 11.5 }}>
              @{record.username}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Flex align="center" gap={6}>
          <Text style={{ fontSize: 12.5 }}>{email}</Text>
          <Tooltip title="Copy email address">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined style={{ fontSize: 12, color: token.colorTextTertiary }} />}
              onClick={() => copyEmail(email)}
            />
          </Tooltip>
        </Flex>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'roleName',
      key: 'roleName',
      render: (roleName: string | null, record: AppUser) => (
        <Tag color={getRoleColor(roleName || record.role?.name)}>
          {roleName || record.role?.name || 'Standard'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: AppUser) => getStatusTag(record.status, record.isLocked),
    },
    {
      title: 'Security State',
      key: 'securityState',
      render: (_: unknown, record: AppUser) => (
        <Space orientation="horizontal" size={4}>
          {record.isLocked ? (
            <Badge status="error" text="Locked Out" />
          ) : (
            <Badge status="success" text="Authorized" />
          )}
        </Space>
      ),
    },
    {
      title: 'Last Sign In',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (lastLoginAt: string | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {lastLoginAt ? <FormattedDateTime date={lastLoginAt} /> : 'Never'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: AppUser) => (
        <Space orientation="horizontal" size={2}>
          <Tooltip title="Edit User">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>

          <Tooltip title={record.isLocked ? 'Unlock Account' : 'Lock Account'}>
            <Popconfirm
              title={record.isLocked ? 'Unlock Account' : 'Lock Account'}
              description={
                record.isLocked
                  ? `Are you sure you want to unlock access for ${record.username}?`
                  : `Locking this account will prevent ${record.username} from authenticating.`
              }
              onConfirm={() => handleToggleLock(record)}
              okText={record.isLocked ? 'Unlock' : 'Lock'}
              cancelText="Cancel"
            >
              <Button
                type="text"
                size="small"
                icon={
                  record.isLocked ? (
                    <UnlockOutlined style={{ color: '#10b981' }} />
                  ) : (
                    <LockOutlined style={{ color: '#ef4444' }} />
                  )
                }
              />
            </Popconfirm>
          </Tooltip>

          <Tooltip title="Reset Password">
            <Button
              type="text"
              size="small"
              icon={<KeyOutlined style={{ color: '#f59e0b' }} />}
              onClick={() => handleOpenResetPassword(record)}
            />
          </Tooltip>

          <Tooltip title="Delete Account">
            <Popconfirm
              title="Delete User Account"
              description={`Permanently remove application login for ${record.username}?`}
              onConfirm={() => handleDeleteUser(record)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Search and Filters Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: '12px 16px' } }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by username, email, or name..."
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={16}>
            <Flex justify="flex-end" gap={8} wrap>
              <Select
                value={roleFilter}
                onChange={setRoleFilter}
                style={{ width: 160 }}
                placeholder="Filter by Role"
              >
                <Option value="all">All Roles</Option>
                {safeRoles.map((r) => (
                  <Option key={r.id} value={r.id}>
                    {r.name}
                  </Option>
                ))}
              </Select>

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 140 }}
                placeholder="Filter by Status"
              >
                <Option value="all">All Statuses</Option>
                <Option value={UserStatus.ACTIVE}>Active</Option>
                <Option value={UserStatus.INACTIVE}>Inactive</Option>
                <Option value={UserStatus.SUSPENDED}>Suspended</Option>
              </Select>

              <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
                Refresh
              </Button>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Users Table */}
      <Table
        dataSource={filteredUsers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Total ${total} accounts`,
        }}
        size="middle"
      />

      {/* Create Account Modal */}
      <Modal
        title="Create User Account"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={modalSubmitting}
        okText="Create User"
        cancelText="Cancel"
        destroyOnHidden
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
          initialValues={{
            status: UserStatus.ACTIVE,
          }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Username is required.' },
              { min: 3, message: 'Username must be at least 3 characters.' },
            ]}
          >
            <Input placeholder="e.g. jsmith" autoFocus />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Email address is required.' },
              { type: 'email', message: 'Enter a valid email address.' },
            ]}
          >
            <Input placeholder="e.g. jsmith@uims.internal" />
          </Form.Item>

          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="e.g. John Smith" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Initial Password"
            extra="Leave blank to automatically generate a secure random password."
          >
            <Input.Password placeholder="Enter password (optional)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="roleId"
                label="System Role"
                rules={[{ required: true, message: 'Please assign a role.' }]}
              >
                <Select placeholder="Select role">
                  {safeRoles.map((r) => (
                    <Option key={r.id} value={r.id}>
                      {r.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Account Status">
                <Select>
                  <Option value={UserStatus.ACTIVE}>Active</Option>
                  <Option value={UserStatus.INACTIVE}>Inactive</Option>
                  <Option value={UserStatus.SUSPENDED}>Suspended</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        title={`Edit User: ${editingUser?.username}`}
        open={Boolean(editingUser)}
        onCancel={() => {
          setEditingUser(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={modalSubmitting}
        okText="Save Changes"
        cancelText="Cancel"
        destroyOnHidden
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateUser}>
          <Form.Item name="displayName" label="Display Name">
            <Input placeholder="Display Name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Email is required.' },
              { type: 'email', message: 'Enter a valid email address.' },
            ]}
          >
            <Input placeholder="user@uims.internal" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roleId" label="Assigned Role">
                <Select placeholder="Select role">
                  {safeRoles.map((r) => (
                    <Option key={r.id} value={r.id}>
                      {r.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Account Status">
                <Select>
                  <Option value={UserStatus.ACTIVE}>Active</Option>
                  <Option value={UserStatus.INACTIVE}>Inactive</Option>
                  <Option value={UserStatus.SUSPENDED}>Suspended</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`Reset Password: ${resetUser?.username}`}
        open={Boolean(resetUser)}
        onCancel={() => {
          setResetUser(null);
          resetForm.resetFields();
        }}
        onOk={() => resetForm.submit()}
        confirmLoading={modalSubmitting}
        okText="Update Password"
        cancelText="Cancel"
        destroyOnHidden
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form form={resetForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'New password is required.' },
              { min: 8, message: 'Password must be at least 8 characters long.' },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>

          <Flex justify="flex-end" style={{ marginTop: 8 }}>
            <Button
              type="link"
              size="small"
              onClick={() => {
                const generated = generateRandomPassword();
                resetForm.setFieldsValue({ newPassword: generated });
                navigator.clipboard.writeText(generated);
                message.info('Generated strong password and copied to clipboard.');
              }}
            >
              Generate Strong Password
            </Button>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
};
