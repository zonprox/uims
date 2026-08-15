import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  LaptopOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
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

const { Text } = Typography;
const { Option } = Select;

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

  // Modals & Drawers
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);

  const [form] = Form.useForm();

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
      message.error('Failed to load directory from server.');
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
    form.setFieldsValue({
      role: 'Employee',
      status: 'Active',
      department: 'Engineering',
      location: 'NY Office - Floor 4',
    });
    setUserModalOpen(true);
  };

  const handleOpenEditModal = (user: DirectoryUser) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      if (editingUser) {
        await directoryService.updateUser(editingUser.id, values);
        message.success(`User "${values.name}" updated successfully.`);
      } else {
        await directoryService.createUser(values);
        message.success(`User "${values.name}" onboarded into directory.`);
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
      message.success('User account removed.');
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

  const userColumns = [
    {
      title: 'Employee Name & Email',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DirectoryUser) => (
        <Flex align="center" gap={10}>
          <Avatar
            size="small"
            style={{ backgroundColor: '#1677ff', fontSize: 11 }}
            icon={<UserOutlined />}
          >
            {name ? name[0] : 'U'}
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
      ),
    },
    {
      title: 'Job Title & Dept',
      key: 'title',
      render: (_: unknown, record: DirectoryUser) => (
        <div>
          <Text strong style={{ fontSize: 12.5 }}>
            {record.jobTitle}
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            {record.department} • {record.location}
          </Text>
        </div>
      ),
    },
    {
      title: 'Role & Perms',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        let color = 'default';
        if (role === 'Super Admin') color = 'error';
        if (role === 'IT Specialist') color = 'blue';
        if (role === 'Developer') color = 'cyan';
        if (role === 'Manager') color = 'purple';
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: 'Account Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: DirectoryUser['status']) => (
        <Tag color={status === 'Active' ? 'success' : status === 'Suspended' ? 'error' : 'default'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Assigned Equipment & Assets',
      key: 'assigned',
      render: (_: unknown, record: DirectoryUser) => (
        <Flex gap={8}>
          <Tooltip title="Hardware Assets Checked Out">
            <Tag icon={<LaptopOutlined />} color="processing">
              {record.assignedAssetsCount} Assets
            </Tag>
          </Tooltip>
          <Tooltip title="Software SaaS Seats Allocated">
            <Tag icon={<SafetyOutlined />} color="purple">
              {record.assignedLicensesCount} Seats
            </Tag>
          </Tooltip>
        </Flex>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: DirectoryUser) => (
        <Space size="small">
          <Tooltip title="Edit Profile">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this user account?"
            description="Remove from directory and unassign all held equipment?"
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
      title="Asset Custodians & Employee Directory"
      subtitle="Directory of employees, equipment holders, hardware assignments, and software seat allocation."
      breadcrumbs={[{ title: 'Custodians' }]}
      stats={[
        {
          title: 'Total Employees',
          value: stats.totalUsers,
          prefix: <TeamOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active Accounts',
          value: stats.activeUsers,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Equipment Custodians',
          value: stats.custodiansCount ?? stats.activeUsers,
          prefix: <LaptopOutlined />,
          color: '#6366f1',
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
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button type="primary" icon={<UserAddOutlined />} onClick={handleOpenCreateModal}>
            Onboard Custodian
          </Button>
        </Flex>
      }
    >
      <Tabs
        defaultActiveKey="users"
        items={[
          {
            key: 'users',
            label: (
              <span>
                <UserOutlined /> Employees & Custodians ({users.length})
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
                  <Col xs={24} md={10}>
                    <Input
                      placeholder="Search by name, email, job title..."
                      prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} md={14}>
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
                        <Option value="Security & Compliance">Security & Compliance</Option>
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

                      {(searchQuery || deptFilter !== 'all' || statusFilter !== 'all') && (
                        <Button
                          onClick={() => {
                            setSearchQuery('');
                            setDeptFilter('all');
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
                  dataSource={users}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} employees` }}
                />
              </Card>
            ),
          },
          {
            key: 'departments',
            label: (
              <span>
                <ApartmentOutlined /> Departmental Groups ({groups.length})
              </span>
            ),
            children: (
              <Row gutter={[14, 14]}>
                {groups.map((group) => (
                  <Col xs={24} sm={12} lg={6} key={group.id}>
                    <Card
                      size="small"
                      title={group.name}
                      extra={<Tag color="blue">{group.scope}</Tag>}
                    >
                      <Flex vertical gap={6}>
                        <Text code style={{ fontSize: 11 }}>
                          {group.email}
                        </Text>
                        <Flex justify="space-between" style={{ marginTop: 6, fontSize: 12 }}>
                          <Text type="secondary">Members:</Text>
                          <Text strong>{group.memberCount} active</Text>
                        </Flex>
                        <Flex justify="space-between" style={{ fontSize: 12 }}>
                          <Text type="secondary">Managed By:</Text>
                          <Text>{group.managedBy}</Text>
                        </Flex>
                      </Flex>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
        ]}
      />

      {/* Add / Edit User Modal */}
      <Modal
        title={editingUser ? `Edit Custodian: ${editingUser.name}` : 'Onboard New Asset Custodian'}
        open={userModalOpen}
        onOk={handleSaveUser}
        onCancel={() => setUserModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={620}
        okText={editingUser ? 'Save Changes' : 'Create Custodian'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Full Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Alex Johnson" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Corporate Email"
                name="email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input placeholder="e.g. alex.johnson@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Job Title" name="jobTitle" rules={[{ required: true }]}>
                <Input placeholder="e.g. Senior Cloud Architect" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Department" name="department" rules={[{ required: true }]}>
                <Select>
                  <Option value="IT & Infrastructure">IT & Infrastructure</Option>
                  <Option value="Engineering">Engineering</Option>
                  <Option value="Product & Design">Product & Design</Option>
                  <Option value="Marketing">Marketing</Option>
                  <Option value="Security & Compliance">Security & Compliance</Option>
                  <Option value="Executive">Executive</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Access Role" name="role" rules={[{ required: true }]}>
                <Select>
                  <Option value="Super Admin">Super Admin</Option>
                  <Option value="IT Specialist">IT Specialist</Option>
                  <Option value="Developer">Developer</Option>
                  <Option value="Manager">Manager</Option>
                  <Option value="Employee">Employee</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Account Status" name="status" rules={[{ required: true }]}>
                <Select>
                  <Option value="Active">Active</Option>
                  <Option value="Suspended">Suspended</Option>
                  <Option value="Inactive">Inactive</Option>
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
                <Input placeholder="e.g. NY Office - Floor 4" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* User Details Drawer */}
      {selectedUser && (
        <Drawer
          title={
            <Flex align="center" gap={8}>
              <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
              <span>{selectedUser.name}</span>
              <Tag color={selectedUser.status === 'Active' ? 'success' : 'error'}>
                {selectedUser.status}
              </Tag>
            </Flex>
          }
          size={480}
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
              Edit Profile
            </Button>
          }
        >
          <Descriptions
            title="Custodian & Employee Details"
            size="small"
            column={1}
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Corporate Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Job Title">{selectedUser.jobTitle}</Descriptions.Item>
            <Descriptions.Item label="Department">{selectedUser.department}</Descriptions.Item>
            <Descriptions.Item label="Access Role">{selectedUser.role}</Descriptions.Item>
            <Descriptions.Item label="Office Location">{selectedUser.location}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selectedUser.phone || 'N/A'}</Descriptions.Item>
          </Descriptions>

          <Descriptions title="Allocated Equipment & Software" size="small" column={1} bordered>
            <Descriptions.Item label="Hardware Assets Checked Out">
              {selectedUser.assignedAssetsCount} devices
            </Descriptions.Item>
            <Descriptions.Item label="Software Seats Active">
              {selectedUser.assignedLicensesCount} SaaS licenses
            </Descriptions.Item>
          </Descriptions>
        </Drawer>
      )}
    </PageContainer>
  );
}
