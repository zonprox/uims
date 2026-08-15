import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Badge, Button, Drawer, Empty, Flex, Spin, Tabs, Tag, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { type NotificationItem, notificationsService } from '../services/notifications.service';

const { Text, Title } = Typography;

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  onNotificationsChanged?: () => void;
}

export default function NotificationDrawer({
  open,
  onClose,
  onNotificationsChanged,
}: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<Array<NotificationItem>>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onNotificationsChanged?.();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const clearAll = async () => {
    try {
      await notificationsService.clearAll();
      setNotifications([]);
      onNotificationsChanged?.();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const markSingleAsRead = async (id: string, link?: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      onNotificationsChanged?.();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }

    if (link) {
      navigate(link);
      onClose();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      onNotificationsChanged?.();
    } catch (err) {
      console.error('Failed to delete notification:', err);
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
              System Notifications
            </Title>
            {unreadCount > 0 && (
              <Tag color="blue" style={{ fontSize: 11 }}>
                {unreadCount} unread
              </Tag>
            )}
          </Flex>
          <Flex gap={8} align="center">
            <Tooltip title="Refresh notifications">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined spin={loading} />}
                onClick={loadNotifications}
              />
            </Tooltip>
            {unreadCount > 0 && (
              <Button
                type="link"
                size="small"
                onClick={markAllAsRead}
                style={{ padding: 0, fontSize: 12 }}
              >
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
      size={420}
      open={open}
      onClose={onClose}
    >
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
          description="No notifications"
          style={{ marginTop: 60 }}
        />
      ) : (
        <Flex vertical gap={6}>
          {filteredNotifications.map((item) => (
            <Flex
              key={item.id}
              onClick={() => markSingleAsRead(item.id, item.link)}
              justify="space-between"
              align="flex-start"
              style={{
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: 6,
                background: item.read ? 'transparent' : 'rgba(22, 119, 255, 0.04)',
                border: item.read
                  ? '1px solid rgba(140, 140, 140, 0.1)'
                  : '1px solid rgba(22, 119, 255, 0.18)',
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
                    style={{ fontSize: 11.5, display: 'block', marginBottom: 2 }}
                  >
                    {item.description}
                  </Text>
                  <Flex align="center" gap={4}>
                    <ClockCircleOutlined style={{ fontSize: 10.5, color: '#94a3b8' }} />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {item.time}
                    </Text>
                  </Flex>
                </div>
              </Flex>
              <Button
                key="del"
                type="text"
                shape="circle"
                size="small"
                icon={<DeleteOutlined style={{ fontSize: 12, color: '#94a3b8' }} />}
                onClick={(e) => handleDelete(e, item.id)}
              />
            </Flex>
          ))}
        </Flex>
      )}
    </Drawer>
  );
}
