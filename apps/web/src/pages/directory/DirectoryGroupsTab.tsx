import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShareAltOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  CreateDirectoryGroupDto,
  DirectoryGroup,
  UpdateDirectoryGroupDto,
} from '@uims/shared-types';
import {
  App,
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
  type TableColumnsType,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, { useMemo, useState } from 'react';
import { directoryService } from '../../services/directory.service';
import { formatErrorMessage } from '../../utils/feedback';
import { formRules, isValidationError } from '../../utils/formValidators';

const { Text } = Typography;

export interface DirectoryGroupsTabProps {
  groups: DirectoryGroup[];
  loading: boolean;
  onRefresh: () => void;
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
}

export const DirectoryGroupsTab: React.FC<DirectoryGroupsTabProps> = ({
  groups,
  loading,
  onRefresh,
  createModalOpen,
  setCreateModalOpen,
}) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [editingGroup, setEditingGroup] = useState<DirectoryGroup | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [createForm] = Form.useForm<CreateDirectoryGroupDto>();
  const [editForm] = Form.useForm<UpdateDirectoryGroupDto>();

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const matchesSearch =
          g.name.toLowerCase().includes(s) ||
          Boolean(g.description && g.description.toLowerCase().includes(s)) ||
          Boolean(g.managedBy && g.managedBy.toLowerCase().includes(s));
        if (!matchesSearch) return false;
      }
      if (typeFilter !== 'all' && g.type !== typeFilter) {
        return false;
      }
      if (scopeFilter !== 'all' && g.scope !== scopeFilter) {
        return false;
      }
      return true;
    });
  }, [groups, search, typeFilter, scopeFilter]);

  const handleCreateGroup = async (values: CreateDirectoryGroupDto) => {
    setSubmitting(true);
    try {
      await directoryService.createGroup(values);
      message.success('Directory group created successfully.');
      setCreateModalOpen(false);
      createForm.resetFields();
      onRefresh();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      message.error(formatErrorMessage(err, 'create directory group'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (group: DirectoryGroup) => {
    setEditingGroup(group);
    editForm.setFieldsValue({
      name: group.name,
      type: group.type ?? 'Security',
      scope: group.scope ?? 'Global',
      managedBy: group.managedBy ?? undefined,
      description: group.description ?? undefined,
    });
    setEditModalOpen(true);
  };

  const handleUpdateGroup = async (values: UpdateDirectoryGroupDto) => {
    if (!editingGroup) return;
    setSubmitting(true);
    try {
      await directoryService.updateGroup(editingGroup.id, values);
      message.success('Directory group updated successfully.');
      setEditModalOpen(false);
      editForm.resetFields();
      setEditingGroup(null);
      onRefresh();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      message.error(formatErrorMessage(err, 'update directory group'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (group: DirectoryGroup) => {
    try {
      await directoryService.deleteGroup(group.id);
      message.success(`Group "${group.name}" deleted successfully.`);
      onRefresh();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'delete directory group'));
    }
  };

  const columns: TableColumnsType<DirectoryGroup> = [
    {
      title: 'Group Name',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      sorter: (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      render: (_: unknown, record: DirectoryGroup) => (
        <Flex align="center" gap={8}>
          <ShareAltOutlined style={{ color: '#1677ff', fontSize: 16, flexShrink: 0 }} />
          <Flex vertical style={{ minWidth: 0 }}>
            <Text strong>{record.name}</Text>
            {record.description && (
              <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            )}
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      sorter: (a, b) =>
        (a.type || '').localeCompare(b.type || '') || a.id.localeCompare(b.id),
      render: (_: unknown, record: DirectoryGroup) => {
        const typeColor =
          record.type === 'Security'
            ? 'purple'
            : record.type === 'Distribution'
              ? 'blue'
              : record.type === 'Mail-Enabled Security'
                ? 'cyan'
                : 'default';
        return <Tag color={typeColor}>{record.type || 'Security'}</Tag>;
      },
    },
    {
      title: 'Scope',
      dataIndex: 'scope',
      key: 'scope',
      width: 130,
      sorter: (a, b) =>
        (a.scope || '').localeCompare(b.scope || '') || a.id.localeCompare(b.id),
      render: (_: unknown, record: DirectoryGroup) => {
        const scopeColor =
          record.scope === 'Global'
            ? 'green'
            : record.scope === 'Universal'
              ? 'geekblue'
              : record.scope === 'Domain Local'
                ? 'orange'
                : 'default';
        return <Tag color={scopeColor}>{record.scope || 'Global'}</Tag>;
      },
    },
    {
      title: 'Managed By',
      dataIndex: 'managedBy',
      key: 'managedBy',
      width: 220,
      sorter: (a, b) =>
        (a.managedBy || '').localeCompare(b.managedBy || '') || a.id.localeCompare(b.id),
      render: (_: unknown, record: DirectoryGroup) => (
        <Flex align="center" gap={6}>
          <UserOutlined style={{ color: token.colorTextTertiary }} />
          <Text strong>{record.managedBy || 'Unassigned'}</Text>
        </Flex>
      ),
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      key: 'members',
      width: 130,
      sorter: (a, b) =>
        (a.memberCount ?? 0) - (b.memberCount ?? 0) || a.id.localeCompare(b.id),
      render: (_: unknown, record: DirectoryGroup) => (
        <Badge
          count={`${record.memberCount ?? 0} members`}
          style={{ backgroundColor: '#10b981' }}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_: unknown, record: DirectoryGroup) => (
        <Space size={2}>
          <Tooltip title="Edit Group">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete Group">
            <Popconfirm
              title="Delete Directory Group"
              description={`Permanently remove group "${record.name}"?`}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
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
      {/* Filter Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: '12px 16px' } }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} sm={24} md={16} lg={16}>
            <Flex gap={8} wrap="wrap">
              <Input
                placeholder="Search groups by name, email, description, OU, or manager..."
                prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ minWidth: 220, flex: 1 }}
              />
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 150 }}
                options={[
                  { label: 'All Types', value: 'all' },
                  { label: 'Security', value: 'Security' },
                  { label: 'Distribution', value: 'Distribution' },
                  { label: 'Mail-Enabled Security', value: 'Mail-Enabled Security' },
                ]}
              />
              <Select
                value={scopeFilter}
                onChange={setScopeFilter}
                style={{ width: 150 }}
                options={[
                  { label: 'All Scopes', value: 'all' },
                  { label: 'Global', value: 'Global' },
                  { label: 'Universal', value: 'Universal' },
                  { label: 'Domain Local', value: 'Domain Local' },
                ]}
              />
            </Flex>
          </Col>
          <Col xs={24} sm={24} md={8} lg={8}>
            <Flex justify="flex-end" gap={8}>
              <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                Create Group
              </Button>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Standard Ant Design Table */}
      <Table<DirectoryGroup>
        columns={columns}
        dataSource={filteredGroups}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          showTotal: (total) => `Total ${total} groups`,
        }}
      />

      {/* Create Group Modal */}
      <Modal
        title="Create Directory Group"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={submitting}
        okText="Create Group"
        cancelText="Cancel"
        destroyOnHidden
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={createForm}
          layout="vertical"
          validateTrigger={['onChange', 'onBlur']}
          scrollToFirstError={true}
          onFinish={handleCreateGroup}
          initialValues={{
            type: 'Security',
            scope: 'Global',
          }}
        >
          <Form.Item
            name="name"
            label="Group Name"
            rules={[formRules.required('Group name'), formRules.maxString('Group name', 100)]}
          >
            <Input placeholder="e.g. GR_Engineering_Staff" autoFocus />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Group Type">
                <Select
                  options={[
                    { label: 'Security', value: 'Security' },
                    { label: 'Distribution', value: 'Distribution' },
                    { label: 'Mail-Enabled Security', value: 'Mail-Enabled Security' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scope" label="Group Scope">
                <Select
                  options={[
                    { label: 'Global', value: 'Global' },
                    { label: 'Universal', value: 'Universal' },
                    { label: 'Domain Local', value: 'Domain Local' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="managedBy"
            label="Managed By"
            rules={[formRules.maxString('Managed by', 100)]}
          >
            <Input placeholder="e.g. Domain Administrator" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[formRules.maxString('Description', 500)]}
          >
            <Input.TextArea rows={3} placeholder="Brief description of group purpose..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        title="Edit Directory Group"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
          setEditingGroup(null);
        }}
        onOk={() => editForm.submit()}
        confirmLoading={submitting}
        okText="Save Changes"
        cancelText="Cancel"
        destroyOnHidden
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={editForm}
          layout="vertical"
          validateTrigger={['onChange', 'onBlur']}
          scrollToFirstError={true}
          onFinish={handleUpdateGroup}
        >
          <Form.Item
            name="name"
            label="Group Name"
            rules={[formRules.required('Group name'), formRules.maxString('Group name', 100)]}
          >
            <Input placeholder="e.g. GR_Engineering_Staff" autoFocus />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Group Type">
                <Select
                  options={[
                    { label: 'Security', value: 'Security' },
                    { label: 'Distribution', value: 'Distribution' },
                    { label: 'Mail-Enabled Security', value: 'Mail-Enabled Security' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="scope" label="Group Scope">
                <Select
                  options={[
                    { label: 'Global', value: 'Global' },
                    { label: 'Universal', value: 'Universal' },
                    { label: 'Domain Local', value: 'Domain Local' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="managedBy"
            label="Managed By"
            rules={[formRules.maxString('Managed by', 100)]}
          >
            <Input placeholder="e.g. Domain Administrator" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[formRules.maxString('Description', 500)]}
          >
            <Input.TextArea rows={3} placeholder="Brief description of group purpose..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
