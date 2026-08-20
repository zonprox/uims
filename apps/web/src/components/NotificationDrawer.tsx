import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Drawer,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import { TimeAgo } from './FormattedDate';
import { type NotificationItem } from '../services/notifications.service';

const { Text, Title } = Typography;

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: Array<NotificationItem>;
  unreadCount: number;
  loading: boolean;
  isConnected: boolean;
  onRefresh: () => void;
  onMarkAsRead: (id: string, link?: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export default function NotificationDrawer({
  open,
  onClose,
  notifications,
  unreadCount,
  loading,
  isConnected,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationDrawerProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = notifications.filter((item) => {
    // Tab filter
    if (activeTab === 'alerts' && item.category !== 'alerts') return false;
    if (activeTab === 'tasks' && item.category !== 'tasks') return false;
    if (activeTab === 'unread' && item.read) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(q);
      const matchesDesc = item.description.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDesc) return false;
    }

    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'warning':
        return <WarningOutlined style={{ color: '#f59e0b', fontSize: 16 }} />;
      case 'error':
        return <AlertOutlined style={{ color: '#ef4444', fontSize: 16 }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 16 }} />;
    }
  };

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          All{' '}
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ backgroundColor: '#1677ff', fontSize: 11 }} />
          )}
        </span>
      ),
    },
    {
      key: 'unread',
      label: 'Unread Only',
    },
    {
      key: 'alerts',
      label: 'Alerts',
    },
    {
      key: 'tasks',
      label: 'Tasks',
    },
  ];

  return (
    <Drawer
      title={
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={8}>
            <Title level={5} style={{ margin: 0, fontSize: 14 }}>
              Notifications
            </Title>
            <Badge
              status={isConnected ? 'success' : 'default'}
              text={
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: isConnected ? '#10b981' : '#94a3b8',
                  }}
                >
                  {isConnected ? 'LIVE' : 'SYNCING'}
                </span>
              }
            />
          </Flex>
          <Flex gap={6} align="center">
            <Tooltip title="Refresh notifications">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined spin={loading} />}
                onClick={onRefresh}
              />
            </Tooltip>
            {unreadCount > 0 && (
              <Button
                type="link"
                size="small"
                onClick={onMarkAllAsRead}
                style={{ padding: 0, fontSize: 12 }}
              >
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Popconfirm
                title="Clear all notifications?"
                description="This action cannot be undone."
                okText="Clear All"
                cancelText="Cancel"
                okButtonProps={{ danger: true, size: 'small' }}
                onConfirm={onClearAll}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  title="Clear all notifications"
                />
              </Popconfirm>
            )}
          </Flex>
        </Flex>
      }
      placement="right"
      styles={{ wrapper: { width: 440 } }}
      open={open}
      onClose={onClose}
    >
      {/* Search & Tabs */}
      <Input
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
        placeholder="Filter notifications by keyword..."
        allowClear
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{ marginBottom: 10, borderRadius: 6 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 12 }}
      />

      {loading && notifications.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Spin size="default" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            searchQuery
              ? `No notifications matching "${searchQuery}"`
              : 'No notifications at this time'
          }
          style={{ marginTop: 60 }}
        />
      ) : (
        <Flex vertical gap={6}>
          {filteredNotifications.map((item) => (
            <Flex
              key={item.id}
              onClick={() => {
                onMarkAsRead(item.id, item.link);
                if (item.link) onClose();
              }}
              justify="space-between"
              align="flex-start"
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: 6,
                background: item.read ? 'transparent' : 'rgba(22, 119, 255, 0.04)',
                border: item.read
                  ? '1px solid rgba(140, 140, 140, 0.12)'
                  : '1px solid rgba(22, 119, 255, 0.22)',
                transition: 'all 0.15s ease',
              }}
            >
              <Flex gap={12} align="flex-start" style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}>{getIcon(item.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
                    <Text strong={!item.read} style={{ fontSize: 12.5 }}>
                      {item.title}
                    </Text>
                    {!item.read && <Badge status="processing" color="#1677ff" />}
                  </Flex>
                  <Text
                    type="secondary"
                    style={{ fontSize: 11.5, display: 'block', marginBottom: 4 }}
                  >
                    {item.description}
                  </Text>
                  <Flex align="center" gap={8}>
                    {item.createdAt ? (
                      <TimeAgo
                        date={item.createdAt}
                        showIcon
                        style={{ fontSize: 10.5, color: '#94a3b8' }}
                      />
                    ) : (
                      <Flex align="center" gap={4}>
                        <ClockCircleOutlined style={{ fontSize: 10.5, color: '#94a3b8' }} />
                        <Text type="secondary" style={{ fontSize: 10.5 }}>
                          {item.time}
                        </Text>
                      </Flex>
                    )}
                    {item.link && (
                      <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                        Action Available
                      </Tag>
                    )}
                  </Flex>
                </div>
              </Flex>
              <div onClick={(e) => e.stopPropagation()}>
                <Popconfirm
                  title="Dismiss notification?"
                  description="Remove this notification permanently?"
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true, size: 'small' }}
                  cancelButtonProps={{ size: 'small' }}
                  onConfirm={(e) => {
                    if (e) e.stopPropagation();
                    onDelete(item.id);
                  }}
                >
                  <Button
                    key="del"
                    type="text"
                    shape="circle"
                    size="small"
                    icon={<DeleteOutlined style={{ fontSize: 12, color: '#94a3b8' }} />}
                  />
                </Popconfirm>
              </div>
            </Flex>
          ))}
        </Flex>
      )}
    </Drawer>
  );
}
