import { DeleteOutlined, EditOutlined, EyeOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Button, Flex, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

export interface AssetTableProps {
  assets: Array<Asset>;
  loading: boolean;
  onShowDetails: (asset: Asset) => void;
  onShowQr: (asset: Asset) => void;
  onOpenEditModal: (asset: Asset) => void;
  onDeleteAsset: (id: string) => void;
}

export const AssetTable: React.FC<AssetTableProps> = React.memo(
  ({ assets, loading, onShowDetails, onShowQr, onOpenEditModal, onDeleteAsset }) => {
    const columns = useMemo(
      () => [
        {
          title: 'Asset Tag & Name',
          key: 'tag',
          render: (_: unknown, record: Asset) => (
            <div>
              <Flex align="center" gap={8}>
                <Text code strong style={{ fontSize: 13, color: '#1677ff' }}>
                  {record.tag}
                </Text>
                <Tag color="geekblue" style={{ fontSize: 11 }}>
                  {record.category}
                </Tag>
              </Flex>
              <Text
                strong
                style={{ fontSize: 13, display: 'block', marginTop: 2, cursor: 'pointer' }}
                onClick={() => onShowDetails(record)}
              >
                {record.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.manufacturer} {record.model}
              </Text>
            </div>
          ),
        },
        {
          title: 'Serial Number',
          dataIndex: 'serialNumber',
          key: 'serialNumber',
          render: (serial: string) => (
            <Text code style={{ fontSize: 12 }}>
              {serial || 'N/A'}
            </Text>
          ),
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          render: (status: Asset['status']) => {
            let color = 'default';
            if (status === 'Active') color = 'success';
            if (status === 'In Repair') color = 'warning';
            if (status === 'In Storage') color = 'processing';
            if (status === 'Retired') color = 'error';
            return <Tag color={color}>{status}</Tag>;
          },
        },
        {
          title: 'Assigned User',
          dataIndex: 'assignedTo',
          key: 'assignedTo',
          render: (user: string) => (
            <Text style={{ fontSize: 13 }}>{user || 'Unassigned Pool'}</Text>
          ),
        },
        {
          title: 'Location',
          dataIndex: 'location',
          key: 'location',
          render: (loc: string) => <Text style={{ fontSize: 12.5 }}>{loc}</Text>,
        },
        {
          title: 'Warranty Expiry',
          dataIndex: 'warrantyExpiry',
          key: 'warrantyExpiry',
          render: (date: string) => {
            if (!date) return <Text type="secondary">N/A</Text>;
            const isExpiringSoon = dayjs(date).diff(dayjs(), 'day') < 90;
            return (
              <div>
                <Text style={{ fontSize: 12 }}>{date}</Text>
                {isExpiringSoon && (
                  <Tag
                    color="warning"
                    style={{ display: 'inline-block', marginTop: 2, fontSize: 10 }}
                  >
                    Expiring
                  </Tag>
                )}
              </div>
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          render: (_: unknown, record: Asset) => (
            <Space size="small">
              <Tooltip title="View Specs">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => onShowDetails(record)}
                />
              </Tooltip>
              <Tooltip title="QR Code">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<QrcodeOutlined />}
                  onClick={() => onShowQr(record)}
                />
              </Tooltip>
              <Tooltip title="Edit Asset">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenEditModal(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Delete this asset?"
                description="Remove this hardware asset from active inventory?"
                onConfirm={() => onDeleteAsset(record.id)}
                okText="Delete"
                okType="danger"
              >
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </Space>
          ),
        },
      ],
      [onShowDetails, onShowQr, onOpenEditModal, onDeleteAsset],
    );

    return (
      <Table
        columns={columns}
        dataSource={assets}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} items` }}
      />
    );
  },
);

AssetTable.displayName = 'AssetTable';
