import { AppstoreOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Flex,
  Popconfirm,
  Progress,
  Space,
  Table,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useMemo } from 'react';
import type { NetworkRack, RackStatus } from '../../../services/network.service';

const { Text } = Typography;

export interface RackTableProps {
  racks: Array<NetworkRack>;
  loading?: boolean;
  onViewElevation?: (rack: NetworkRack) => void;
  onEdit?: (rack: NetworkRack) => void;
  onDelete?: (id: string) => void;
}

const getStatusTag = (status: RackStatus | `${RackStatus}` | undefined) => {
  switch (status) {
    case 'ACTIVE':
      return <Tag color="success">Active</Tag>;
    case 'PLANNED':
      return <Tag color="processing">Planned</Tag>;
    case 'MAINTENANCE':
      return <Tag color="warning">Maintenance</Tag>;
    case 'RETIRED':
      return <Tag color="default">Retired</Tag>;
    default:
      return <Tag color="default">{status || 'Active'}</Tag>;
  }
};

export const RackTable: React.FC<RackTableProps> = React.memo(
  ({ racks, loading = false, onViewElevation, onEdit, onDelete }) => {
    const { token } = theme.useToken();

    const columns: ColumnsType<NetworkRack> = useMemo(
      () => [
        {
          title: 'Rack Code & Name',
          key: 'codeName',
          sorter: (a, b) =>
            a.code.localeCompare(b.code) ||
            a.name.localeCompare(b.name) ||
            a.id.localeCompare(b.id),
          render: (_: unknown, record: NetworkRack) => (
            <Flex vertical gap={2}>
              <Flex align="center" gap={6}>
                <Tag
                  color="purple"
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    margin: 0,
                    cursor: onViewElevation ? 'pointer' : 'default',
                  }}
                  onClick={() => onViewElevation?.(record)}
                >
                  {record.code}
                </Tag>
                <Text
                  strong
                  style={{
                    cursor: onViewElevation ? 'pointer' : 'default',
                  }}
                  onClick={() => onViewElevation?.(record)}
                >
                  {record.name}
                </Text>
              </Flex>
              {record.notes && (
                <Text type="secondary" ellipsis style={{ fontSize: 11, maxWidth: 220 }}>
                  {record.notes}
                </Text>
              )}
            </Flex>
          ),
        },
        {
          title: 'Height',
          key: 'totalHeight',
          width: 90,
          sorter: (a, b) => a.totalHeight - b.totalHeight || a.id.localeCompare(b.id),
          render: (_: unknown, record: NetworkRack) => (
            <Tag color="blue" style={{ fontWeight: 600 }}>
              {record.totalHeight}U
            </Tag>
          ),
        },
        {
          title: 'Space Utilization',
          key: 'occupancy',
          width: 180,
          sorter: (a, b) => {
            const utilA =
              a.occupancyRate ??
              (a.usedUnits !== undefined && a.totalHeight
                ? (a.usedUnits / a.totalHeight) * 100
                : 0);
            const utilB =
              b.occupancyRate ??
              (b.usedUnits !== undefined && b.totalHeight
                ? (b.usedUnits / b.totalHeight) * 100
                : 0);
            return utilA - utilB || a.id.localeCompare(b.id);
          },
          render: (_: unknown, record: NetworkRack) => {
            const occupied =
              record.usedUnits ??
              record.switches
                ?.filter((s) => s.rackPosition !== null)
                .reduce((sum, s) => sum + (s.rackHeight || 1), 0) ??
              0;
            const total = record.totalHeight || 42;
            const percent = Number(((occupied / total) * 100).toFixed(1));

            return (
              <Flex vertical gap={2} style={{ width: '100%' }}>
                <Flex justify="space-between" style={{ fontSize: 11 }}>
                  <Text>
                    {occupied} / {total} U
                  </Text>
                  <Text strong>{percent}%</Text>
                </Flex>
                <Progress
                  percent={percent}
                  size="small"
                  strokeColor={
                    percent > 90
                      ? token.colorError
                      : percent > 75
                        ? token.colorWarning
                        : token.colorSuccess
                  }
                  showInfo={false}
                />
              </Flex>
            );
          },
        },
        {
          title: 'Switches',
          key: 'switchCount',
          width: 100,
          sorter: (a, b) =>
            (a.switches?.length || 0) - (b.switches?.length || 0) || a.id.localeCompare(b.id),
          render: (_: unknown, record: NetworkRack) => (
            <Tag color="cyan">{record.switches?.length ?? 0} devices</Tag>
          ),
        },
        {
          title: 'Status',
          key: 'status',
          width: 100,
          sorter: (a, b) =>
            (a.status || '').localeCompare(b.status || '') || a.id.localeCompare(b.id),
          render: (_: unknown, record: NetworkRack) => getStatusTag(record.status),
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 170,
          fixed: 'right',
          render: (_: unknown, record: NetworkRack) => (
            <Space size={4}>
              {onViewElevation && (
                <Tooltip title="View 2D Elevation">
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<AppstoreOutlined />}
                    onClick={() => onViewElevation(record)}
                    data-testid={`view-elevation-${record.name}`}
                    aria-label={`View Elevation for ${record.name}`}
                  >
                    Elevation
                  </Button>
                </Tooltip>
              )}
              {onEdit && (
                <Tooltip title="Edit Rack">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    aria-label="Edit Rack"
                    onClick={() => onEdit(record)}
                  />
                </Tooltip>
              )}
              {onDelete && (
                <Popconfirm
                  title="Delete Rack"
                  description={`Are you sure you want to delete rack "${record.name}"? Mounted devices will be unmounted.`}
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(record.id)}
                >
                  <Tooltip title="Delete Rack">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      aria-label="Delete Rack"
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          ),
        },
      ],
      [onViewElevation, onEdit, onDelete, token],
    );

    return (
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table<NetworkRack>
          rowKey="id"
          columns={columns}
          dataSource={racks}
          loading={loading}
          size="middle"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} racks`,
          }}
          scroll={{ x: 780 }}
          locale={{
            emptyText: 'No equipment racks found matching your search criteria.',
          }}
        />
      </Card>
    );
  },
);

RackTable.displayName = 'RackTable';
