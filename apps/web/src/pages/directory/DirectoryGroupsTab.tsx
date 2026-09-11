import {
  CopyOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { CreateDirectoryGroupDto, DirectoryGroup } from '@uims/shared-types';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, { useMemo, useState } from 'react';
import { directoryService } from '../../services/directory.service';

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
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const s = search.toLowerCase().trim();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(s) ||
        (g.email && g.email.toLowerCase().includes(s)) ||
        (g.description && g.description.toLowerCase().includes(s)),
    );
  }, [groups, search]);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    message.success(`Copied group email: ${email}`);
  };

  const handleCreateGroup = async (values: CreateDirectoryGroupDto) => {
    setSubmitting(true);
    try {
      await directoryService.createGroup(values);
      message.success('Directory group created successfully.');
      setCreateModalOpen(false);
      form.resetFields();
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to create directory group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Action Header & Search */}
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: '12px 16px' } }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search groups by name, email, or description..."
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={16}>
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

      {/* Group Cards Grid */}
      {filteredGroups.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No directory groups found."
          style={{ margin: '40px 0' }}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredGroups.map((group) => (
            <Col xs={24} sm={12} lg={8} key={group.id}>
              <Card
                size="small"
                hoverable
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                styles={{
                  body: { padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' },
                }}
                title={
                  <Flex align="center" gap={8}>
                    <ShareAltOutlined style={{ color: '#1677ff' }} />
                    <span style={{ fontSize: 13.5 }}>{group.name}</span>
                  </Flex>
                }
                extra={
                  <Tag
                    color={
                      group.scope?.includes('Security') || group.type?.includes('Security')
                        ? 'purple'
                        : 'blue'
                    }
                  >
                    {group.scope || group.type || 'Security'}
                  </Tag>
                }
              >
                <Flex vertical gap={8} style={{ flex: 1 }}>
                  {group.email && (
                    <Flex align="center" justify="space-between" gap={6}>
                      <Flex align="center" gap={6}>
                        <MailOutlined style={{ color: '#0ea5e9', fontSize: 12 }} />
                        <Text code style={{ fontSize: 12 }}>
                          {group.email}
                        </Text>
                      </Flex>
                      <Tooltip title="Copy distribution email">
                        <Button
                          type="text"
                          size="small"
                          icon={
                            <CopyOutlined
                              style={{ fontSize: 12, color: token.colorTextTertiary }}
                            />
                          }
                          onClick={() => copyEmail(group.email || '')}
                        />
                      </Tooltip>
                    </Flex>
                  )}

                  {group.description && (
                    <Text type="secondary" style={{ fontSize: 12, minHeight: 34 }}>
                      {group.description}
                    </Text>
                  )}

                  <Divider style={{ margin: '6px 0' }} />

                  <Flex justify="space-between" style={{ fontSize: 12 }}>
                    <Text type="secondary">Members Count:</Text>
                    <Badge
                      count={`${group.memberCount ?? 0} members`}
                      style={{ backgroundColor: '#10b981' }}
                    />
                  </Flex>

                  {group.managedBy && (
                    <Flex justify="space-between" style={{ fontSize: 12 }}>
                      <Text type="secondary">Managed By:</Text>
                      <Text strong style={{ fontSize: 11.5 }}>
                        {group.managedBy}
                      </Text>
                    </Flex>
                  )}

                  {group.ouPath && (
                    <Flex justify="space-between" style={{ fontSize: 11 }}>
                      <Text type="secondary">OU Path:</Text>
                      <Text code style={{ fontSize: 10.5 }}>
                        {group.ouPath}
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create Group Modal */}
      <Modal
        title="Create Directory Group"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Create Group"
        cancelText="Cancel"
        destroyOnHidden
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateGroup}
          initialValues={{
            type: 'Security',
            scope: 'Global',
          }}
        >
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: 'Group name is required.' }]}
          >
            <Input placeholder="e.g. GR_Engineering_Staff" autoFocus />
          </Form.Item>

          <Form.Item
            name="email"
            label="Distribution Email"
            rules={[{ type: 'email', message: 'Enter a valid email.' }]}
          >
            <Input placeholder="e.g. engineering-staff@uims.internal" />
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

          <Form.Item name="managedBy" label="Managed By">
            <Input placeholder="e.g. Domain Administrator" />
          </Form.Item>

          <Form.Item name="ouPath" label="Organizational Unit Path">
            <Input placeholder="e.g. OU=Production,DC=uims,DC=internal" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Brief description of group purpose..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
