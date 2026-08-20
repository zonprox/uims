import {
  AlertOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClearOutlined,
  DeleteOutlined,
  FilterOutlined,
  LinkOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  UndoOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Badge,
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  type TableProps,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { TimeAgo } from '../../components/FormattedDate';
import PageContainer from '../../components/PageContainer';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { type NotificationItem } from '../../services/notifications.service';

dayjs.extend(isBetween);

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function NotificationsPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useRealtimeNotifications();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  // Table selection & pagination state
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  // Filter logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'unread' && item.read) return false;
      if (statusFilter === 'read' && !item.read) return false;

      // Type/Severity filter
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Date range filter
      if (dateRange && dateRange[0] && dateRange[1]) {
        const itemDate = item.createdAt ? dayjs(item.createdAt) : dayjs(item.time);
        if (
          itemDate.isValid() &&
          !itemDate.isBetween(dateRange[0].startOf('day'), dateRange[1].endOf('day'), null, '[]')
        ) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, categoryFilter, statusFilter, typeFilter, searchQuery, dateRange]);

  // KPI statistics calculation
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const alerts = notifications.filter(
      (n) => n.category === 'alerts' || n.type === 'error' || n.type === 'warning',
    ).length;
    const tasks = notifications.filter((n) => n.category === 'tasks').length;

    return [
      {
        title: 'Total Notifications',
        value: total,
        prefix: <BellOutlined />,
        color: '#1677ff',
      },
      {
        title: 'Unread',
        value: unread,
        prefix: <AlertOutlined />,
        color: '#ef4444',
      },
      {
        title: 'Alerts',
        value: alerts,
        prefix: <WarningOutlined />,
        color: '#f59e0b',
      },
      {
        title: 'Tasks',
        value: tasks,
        prefix: <CheckCircleOutlined />,
        color: '#10b981',
      },
    ];
  }, [notifications]);

  // Batch actions
  const handleBatchMarkRead = async () => {
    if (selectedRowKeys.length === 0) return;
    setBatchLoading(true);
    try {
      await Promise.all(selectedRowKeys.map((id) => markAsRead(String(id))));
      message.success(`Marked ${selectedRowKeys.length} notifications as read.`);
      setSelectedRowKeys([]);
    } catch {
      message.error('Failed to mark selected notifications as read.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setBatchLoading(true);
    try {
      await Promise.all(selectedRowKeys.map((id) => deleteNotification(String(id))));
      message.success(`Deleted ${selectedRowKeys.length} notifications.`);
      setSelectedRowKeys([]);
    } catch {
      message.error('Failed to delete selected notifications.');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateRange(null);
  };

  // Severity badge helper
  const renderSeverityTag = (type: NotificationItem['type']) => {
    switch (type) {
      case 'error':
        return <Tag color="error">Alert</Tag>;
      case 'warning':
        return <Tag color="warning">Warning</Tag>;
      case 'success':
        return <Tag color="success">Success</Tag>;
      default:
        return <Tag color="processing">Info</Tag>;
    }
  };

  // Category tag helper
  const renderCategoryTag = (category: NotificationItem['category']) => {
    switch (category) {
      case 'alerts':
        return (
          <Tag color="volcano" style={{ textTransform: 'capitalize' }}>
            Alerts
          </Tag>
        );
      case 'tasks':
        return (
          <Tag color="blue" style={{ textTransform: 'capitalize' }}>
            Tasks
          </Tag>
        );
      default:
        return (
          <Tag color="default" style={{ textTransform: 'capitalize' }}>
            General
          </Tag>
        );
    }
  };

  const columns: TableProps<NotificationItem>['columns'] = [
    {
      title: 'Status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Tooltip title={record.read ? 'Read' : 'Unread'}>
          <Badge
            status={record.read ? 'default' : 'processing'}
            color={record.read ? '#cbd5e1' : '#1677ff'}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: NotificationItem['type']) => renderSeverityTag(type),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (category: NotificationItem['category']) => renderCategoryTag(category),
    },
    {
      title: 'Notification',
      key: 'title',
      render: (_, record) => (
        <div style={{ maxWidth: 460 }}>
          <Text strong={!record.read} style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
            {record.title}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Target Link',
      dataIndex: 'link',
      key: 'link',
      width: 150,
      render: (link?: string, record?: NotificationItem) =>
        link ? (
          <Button
            type="link"
            size="small"
            icon={<LinkOutlined />}
            style={{ padding: 0, fontSize: 12 }}
            onClick={() => {
              if (record && !record.read) {
                markAsRead(record.id);
              }
              navigate(link);
            }}
          >
            View Resource
          </Button>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            -
          </Text>
        ),
    },
    {
      title: 'Time',
      key: 'time',
      width: 160,
      render: (_, record) =>
        record.createdAt ? (
          <TimeAgo date={record.createdAt} showIcon style={{ fontSize: 12 }} />
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.time}
          </Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title={record.read ? 'Mark as unread' : 'Mark as read'}>
            <Button
              type="text"
              size="small"
              icon={record.read ? <UndoOutlined /> : <CheckOutlined />}
              onClick={() => markAsRead(record.id)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete notification?"
            description="Remove this notification permanently?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true, size: 'small' }}
            cancelButtonProps={{ size: 'small' }}
            onConfirm={() => deleteNotification(record.id)}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Notifications"
      subtitle="Manage system alerts, task assignments, and domain event notifications."
      breadcrumbs={[{ title: 'Notifications' }]}
      stats={stats}
      extra={
        <Flex gap={8} align="center">
          <Tooltip title="Configure notification preferences">
            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate('/settings?tab=notifications')}
            >
              Settings
            </Button>
          </Tooltip>
          <Tooltip title="Refresh notification feed">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={refreshNotifications}>
              Refresh
            </Button>
          </Tooltip>
          {unreadCount > 0 && (
            <Button icon={<CheckOutlined />} onClick={markAllAsRead}>
              Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Popconfirm
              title="Clear all notifications?"
              description="This will permanently remove all notifications for your account."
              okText="Clear All"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={clearAll}
            >
              <Button danger icon={<ClearOutlined />}>
                Clear All
              </Button>
            </Popconfirm>
          )}
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        {/* Filter Toolbar */}
        <Flex vertical gap={14} style={{ marginBottom: 16 }}>
          <Flex wrap justify="space-between" align="center" gap={12}>
            <Flex wrap align="center" gap={10} style={{ flex: 1, minWidth: 320 }}>
              <Input
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Search by title or description..."
                allowClear
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 280 }}
              />

              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 140 }}
                options={[
                  { label: 'All Categories', value: 'all' },
                  { label: 'Alerts', value: 'alerts' },
                  { label: 'Tasks', value: 'tasks' },
                  { label: 'General', value: 'general' },
                ]}
              />

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 130 }}
                options={[
                  { label: 'All Status', value: 'all' },
                  { label: 'Unread Only', value: 'unread' },
                  { label: 'Read Only', value: 'read' },
                ]}
              />

              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: 140 }}
                options={[
                  { label: 'All Severities', value: 'all' },
                  { label: 'Info', value: 'info' },
                  { label: 'Warning', value: 'warning' },
                  { label: 'Alert', value: 'error' },
                  { label: 'Success', value: 'success' },
                ]}
              />

              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                style={{ width: 240 }}
              />

              {(searchQuery ||
                categoryFilter !== 'all' ||
                statusFilter !== 'all' ||
                typeFilter !== 'all' ||
                dateRange) && (
                <Button icon={<FilterOutlined />} onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              )}
            </Flex>
          </Flex>

          {/* Batch Action Toolbar */}
          {selectedRowKeys.length > 0 && (
            <Flex
              justify="space-between"
              align="center"
              style={{
                padding: '8px 14px',
                background: 'rgba(22, 119, 255, 0.08)',
                border: '1px solid rgba(22, 119, 255, 0.25)',
                borderRadius: 6,
              }}
            >
              <Text strong style={{ color: '#1677ff', fontSize: 13 }}>
                Selected {selectedRowKeys.length} notification
                {selectedRowKeys.length > 1 ? 's' : ''}
              </Text>
              <Space size={8}>
                <Button
                  size="small"
                  icon={<CheckOutlined />}
                  loading={batchLoading}
                  onClick={handleBatchMarkRead}
                >
                  Mark as Read
                </Button>
                <Popconfirm
                  title={`Delete ${selectedRowKeys.length} selected notifications?`}
                  description="This action cannot be undone."
                  okText="Delete Selected"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true, size: 'small' }}
                  onConfirm={handleBatchDelete}
                >
                  <Button danger size="small" icon={<DeleteOutlined />} loading={batchLoading}>
                    Delete Selected
                  </Button>
                </Popconfirm>
                <Button size="small" onClick={() => setSelectedRowKeys([])}>
                  Deselect All
                </Button>
              </Space>
            </Flex>
          )}
        </Flex>

        {/* Notifications Table */}
        <Table<NotificationItem>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredNotifications}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredNotifications.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            showTotal: (total, range) =>
              `Showing ${range[0]}-${range[1]} of ${total} notifications`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || dateRange
                    ? 'No notifications found matching your filter criteria.'
                    : 'No notifications available.'
                }
              />
            ),
          }}
          size="middle"
          rowClassName={(record) => (record.read ? '' : 'ant-table-row-unread')}
        />
      </Card>
    </PageContainer>
  );
}
