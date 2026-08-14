import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Badge, Button, Drawer, Empty, Flex, List, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';

const { Text, Title } = Typography;

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'alerts' | 'tasks' | 'general';
  time: string;
  read: boolean;
  link?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'License Expiration Notice',
    description: 'Adobe Creative Cloud subscription will expire in 14 days (May 15).',
    type: 'warning',
    category: 'alerts',
    time: '10 mins ago',
    read: false,
    link: '/licenses',
  },
  {
    id: '2',
    title: 'Hardware Stock Alert',
    description: 'Wireless Mouse stock level is below threshold (2 units remaining).',
    type: 'error',
    category: 'alerts',
    time: '45 mins ago',
    read: false,
    link: '/inventory',
  },
  {
    id: '3',
    title: 'High Priority Ticket Created',
    description: 'TKT-1001: "Cannot access VPN" requires immediate IT assignment.',
    type: 'warning',
    category: 'tasks',
    time: '2 hours ago',
    read: false,
    link: '/tickets',
  },
  {
    id: '4',
    title: 'Automated System Backup Completed',
    description: 'Daily PostgreSQL database backup finished successfully (Size: 420MB).',
    type: 'success',
    category: 'general',
    time: '5 hours ago',
    read: true,
    link: '/settings',
  },
  {
    id: '5',
    title: 'New Asset Assigned',
    description: 'MacBook Pro M2 (L-1024) was assigned to John Doe in NY Office.',
    type: 'info',
    category: 'general',
    time: 'Yesterday',
    read: true,
    link: '/assets',
  },
];

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const markSingleAsRead = (id: string, link?: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (link) {
      navigate(link);
      onClose();
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'alerts') return item.category === 'alerts';
    if (activeTab === 'tasks') return item.category === 'tasks';
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />;
      case 'error':
        return <AlertOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 18 }} />;
    }
  };

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          All{' '}
          {unreadCount > 0 && <Badge count={unreadCount} style={{ backgroundColor: '#1677ff' }} />}
        </span>
      ),
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
            <Title level={5} style={{ margin: 0 }}>
              Notifications
            </Title>
            {unreadCount > 0 && <Tag color="processing">{unreadCount} new</Tag>}
          </Flex>
          <Flex gap={8}>
            {unreadCount > 0 && (
              <Button type="link" size="small" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={clearAll}
                title="Clear all notifications"
              />
            )}
          </Flex>
        </Flex>
      }
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 12 }}
      />

      {filteredNotifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No notifications in this category"
          style={{ marginTop: 60 }}
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={filteredNotifications}
          renderItem={(item) => (
            <List.Item
              onClick={() => markSingleAsRead(item.id, item.link)}
              style={{
                cursor: 'pointer',
                padding: '12px 14px',
                marginBottom: 8,
                borderRadius: 8,
                background: item.read ? 'transparent' : 'rgba(22, 119, 255, 0.05)',
                border: item.read
                  ? '1px solid rgba(140, 140, 140, 0.1)'
                  : '1px solid rgba(22, 119, 255, 0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              <List.Item.Meta
                avatar={<div style={{ marginTop: 2 }}>{getIcon(item.type)}</div>}
                title={
                  <Flex justify="space-between" align="center">
                    <Text strong={!item.read} style={{ fontSize: 13 }}>
                      {item.title}
                    </Text>
                    {!item.read && <Badge status="processing" color="#1677ff" />}
                  </Flex>
                }
                description={
                  <div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                    >
                      {item.description}
                    </Text>
                    <Flex align="center" gap={4}>
                      <ClockCircleOutlined style={{ fontSize: 11, color: '#999' }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {item.time}
                      </Text>
                    </Flex>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}
