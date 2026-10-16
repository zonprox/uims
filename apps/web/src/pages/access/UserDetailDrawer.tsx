import {
  ClockCircleOutlined,
  EditOutlined,
  GlobalOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { AppUser } from '@uims/shared-types';
import { UserStatus } from '@uims/shared-types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Flex,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd';
import React from 'react';
import ActivityTimeline from '../../components/ActivityTimeline';
import AppDrawer from '../../components/AppDrawer';
import { FormattedDateTime } from '../../components/FormattedDate';

const { Text, Title } = Typography;

export interface UserDetailDrawerProps {
  open: boolean;
  user: AppUser | null;
  onClose: () => void;
  onEdit?: (user: AppUser) => void;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  open,
  user,
  onClose,
  onEdit,
}) => {
  const { token } = theme.useToken();

  if (!user) return null;

  const fullName =
    user.fullName ||
    user.displayName ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.username;

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.username.slice(0, 2).toUpperCase();

  const getStatusTag = (status: UserStatus, isLocked?: boolean) => {
    if (isLocked) {
      return (
        <Tag icon={<LockOutlined />} color="error">
          Locked
        </Tag>
      );
    }
    switch (status) {
      case UserStatus.ACTIVE:
        return <Tag color="success">Active</Tag>;
      case UserStatus.INACTIVE:
        return <Tag color="default">Inactive</Tag>;
      case UserStatus.SUSPENDED:
        return <Tag color="warning">Suspended</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  return (
    <AppDrawer
      title="User Profile Details"
      subtitle={`Account ID: ${user.id}`}
      icon={<UserOutlined />}
      open={open}
      onClose={onClose}
      size={560}
      extra={
        onEdit && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              onClose();
              onEdit(user);
            }}
          >
            Edit User
          </Button>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* User Identity Card */}
        <Card
          size="small"
          styles={{
            body: {
              padding: 16,
              background: token.colorFillAlter,
              borderRadius: token.borderRadiusLG,
            },
          }}
          variant="borderless"
        >
          <Flex align="center" gap={16}>
            <Avatar
              size={56}
              style={{
                backgroundColor: token.colorPrimary,
                fontSize: 20,
                fontWeight: 600,
              }}
              src={user.avatar || undefined}
            >
              {initials}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Flex align="center" gap={8} wrap>
                <Title level={4} style={{ margin: 0 }}>
                  {fullName}
                </Title>
                {getStatusTag(user.status, user.isLocked)}
              </Flex>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 2 }}>
                @{user.username}
              </Text>
              <Flex gap={16} style={{ marginTop: 6 }} wrap>
                <Text style={{ fontSize: 12 }}>
                  <MailOutlined style={{ marginRight: 6, color: token.colorTextSecondary }} />
                  {user.email}
                </Text>
                {user.phone && (
                  <Text style={{ fontSize: 12 }}>
                    <PhoneOutlined style={{ marginRight: 6, color: token.colorTextSecondary }} />
                    {user.phone}
                  </Text>
                )}
              </Flex>
            </div>
          </Flex>
        </Card>

        {/* Role & Permissions Section */}
        <AppDrawer.Section title="Role & Access Control">
          <Descriptions column={1} size="small" layout="horizontal">
            <Descriptions.Item label="Assigned Role">
              <Space orientation="horizontal" size={8}>
                <Tag color="purple" icon={<SafetyCertificateOutlined />}>
                  {user.role?.name || user.roleName || 'Unassigned'}
                </Tag>
                {user.role?.description && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {user.role.description}
                  </Text>
                )}
              </Space>
            </Descriptions.Item>
            {user.role?.permissions && (
              <Descriptions.Item label="Permissions">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {user.role.permissions.length} granular permission
                  {user.role.permissions.length === 1 ? '' : 's'} assigned
                </Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </AppDrawer.Section>

        {/* Security State Section */}
        <AppDrawer.Section title="Security & Authentication">
          <Descriptions column={2} size="small" layout="vertical">
            <Descriptions.Item label="Account Status">
              {getStatusTag(user.status, false)}
            </Descriptions.Item>
            <Descriptions.Item label="Lockout State">
              {user.isLocked ? (
                <Badge status="error" text="Locked Out" />
              ) : (
                <Badge status="success" text="Authorized" />
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Password Policy">
              {user.mustChangePassword ? (
                <Tag color="warning" icon={<KeyOutlined />}>
                  Must Change Password
                </Tag>
              ) : (
                <Tag color="success">Password Valid</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Failed Login Attempts">
              <Text type={user.failedLoginAttempts ? 'danger' : 'secondary'}>
                {user.failedLoginAttempts ?? 0} attempt(s)
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </AppDrawer.Section>

        {/* Activity & Timestamps Section */}
        <AppDrawer.Section title="Sign-In & Activity History">
          <Descriptions column={2} size="small" layout="vertical">
            <Descriptions.Item label="Last Sign In">
              <Space orientation="horizontal" size={4}>
                <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                {user.lastLoginAt ? (
                  <FormattedDateTime date={user.lastLoginAt} />
                ) : (
                  <Text type="secondary">Never</Text>
                )}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Last Sign In IP">
              <Space orientation="horizontal" size={4}>
                <GlobalOutlined style={{ color: token.colorTextSecondary }} />
                <Text type="secondary">{user.lastLoginIp || 'N/A'}</Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Account Created">
              {user.createdAt ? (
                <FormattedDateTime date={user.createdAt} />
              ) : (
                <Text type="secondary">N/A</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Last Modified">
              {user.updatedAt ? (
                <FormattedDateTime date={user.updatedAt} />
              ) : (
                <Text type="secondary">N/A</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
          <Divider style={{ margin: '16px 0' }} />
          <ActivityTimeline entityType="User" entityId={user.id} />
        </AppDrawer.Section>
      </div>
    </AppDrawer>
  );
};

export default UserDetailDrawer;
