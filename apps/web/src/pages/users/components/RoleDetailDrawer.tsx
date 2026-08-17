import {
  EditOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { RoleAssignedUser, RoleDetailResponse } from '@uims/shared-types';
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Input,
  Row,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useMemo, useState } from 'react';

const { Text, Title } = Typography;

interface RoleDetailDrawerProps {
  open: boolean;
  roleDetail: RoleDetailResponse | null;
  loading: boolean;
  onClose: () => void;
  onOpenMatrix: () => void;
}

export const RoleDetailDrawer: React.FC<RoleDetailDrawerProps> = ({
  open,
  roleDetail,
  loading,
  onClose,
  onOpenMatrix,
}) => {
  const [userSearch, setUserSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!roleDetail?.users) return [];
    if (!userSearch) return roleDetail.users;
    const s = userSearch.toLowerCase();
    return roleDetail.users.filter(
      (u) =>
        u.name?.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.username.toLowerCase().includes(s) ||
        u.department?.toLowerCase().includes(s) ||
        u.jobTitle?.toLowerCase().includes(s),
    );
  }, [roleDetail, userSearch]);

  return (
    <Drawer
      title={
        <Flex align="center" justify="space-between" style={{ width: '100%', paddingRight: 12 }}>
          <Flex align="center" gap={8}>
            <SafetyCertificateOutlined style={{ color: '#1677ff', fontSize: 18 }} />
            <Title level={5} style={{ margin: 0, fontSize: 16 }}>
              Role Overview: {roleDetail?.name || 'Role'}
            </Title>
            {roleDetail?.isSystem ? (
              <Tag color="purple" style={{ margin: 0 }}>
                System Built-in
              </Tag>
            ) : (
              <Tag color="cyan" style={{ margin: 0 }}>
                Custom Role
              </Tag>
            )}
          </Flex>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              onClose();
              onOpenMatrix();
            }}
          >
            Configure Permissions
          </Button>
        </Flex>
      }
      open={open}
      onClose={onClose}
      width={720}
      styles={{
        body: { padding: '16px 20px', background: '#f8fafc' },
      }}
    >
      {/* Role KPI Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card
            size="small"
            style={{ borderRadius: 8, textAlign: 'center' }}
            styles={{ body: { padding: '10px 8px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}
            >
              Assigned Users
            </Text>
            <Text strong style={{ fontSize: 20, color: '#1677ff' }}>
              {roleDetail?.userCount ?? roleDetail?.users?.length ?? 0}
            </Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            size="small"
            style={{ borderRadius: 8, textAlign: 'center' }}
            styles={{ body: { padding: '10px 8px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}
            >
              Granted Permissions
            </Text>
            <Text strong style={{ fontSize: 20, color: '#059669' }}>
              {roleDetail?.name === 'Super Admin'
                ? 'All (*:*)'
                : (roleDetail?.permissionCount ?? roleDetail?.permissions?.length ?? 0)}
            </Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card
            size="small"
            style={{ borderRadius: 8, textAlign: 'center' }}
            styles={{ body: { padding: '10px 8px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, display: 'block', textTransform: 'uppercase' }}
            >
              Governance Tier
            </Text>
            <Text strong style={{ fontSize: 14, color: '#7c3aed', display: 'block', marginTop: 4 }}>
              {roleDetail?.isSystem ? 'Platform Core' : 'Custom Defined'}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Role Metadata */}
      <Card
        size="small"
        title="Role Details & Policy"
        style={{ borderRadius: 8, marginBottom: 16 }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Role Name">
            <Text strong>{roleDetail?.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Description">
            <Text type="secondary">{roleDetail?.description || 'No description provided.'}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Assigned Users Section */}
      <Card
        size="small"
        title={
          <Flex align="center" justify="space-between" style={{ width: '100%' }}>
            <Flex align="center" gap={6}>
              <TeamOutlined style={{ color: '#1677ff' }} />
              <span>Assigned Domain Users ({filteredUsers.length})</span>
            </Flex>
            <Input
              placeholder="Search user..."
              size="small"
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={userSearch}
              allowClear
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ width: 180 }}
            />
          </Flex>
        }
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={filteredUsers}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{ pageSize: 8, size: 'small', showTotal: (t) => `${t} users` }}
          columns={[
            {
              title: 'USER',
              dataIndex: 'name',
              key: 'name',
              render: (_: unknown, u: RoleAssignedUser) => (
                <Flex align="center" gap={8}>
                  <Avatar
                    size={26}
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#e0f2fe', color: '#0284c7', fontSize: 12 }}
                  />
                  <div>
                    <Text strong style={{ fontSize: 12.5, display: 'block' }}>
                      {u.name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {u.email}
                    </Text>
                  </div>
                </Flex>
              ),
            },
            {
              title: 'DEPARTMENT',
              dataIndex: 'department',
              key: 'department',
              render: (dept: string) => <Text style={{ fontSize: 12 }}>{dept || 'General'}</Text>,
            },
            {
              title: 'JOB TITLE',
              dataIndex: 'jobTitle',
              key: 'jobTitle',
              render: (title: string) => (
                <Text style={{ fontSize: 12 }}>{title || 'Employee'}</Text>
              ),
            },
            {
              title: 'STATUS',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const color =
                  status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'error' : 'default';
                return (
                  <Tag color={color} style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
                    {status}
                  </Tag>
                );
              },
            },
          ]}
          locale={{
            emptyText: <Empty description="No users currently assigned to this role." />,
          }}
        />
      </Card>
    </Drawer>
  );
};
