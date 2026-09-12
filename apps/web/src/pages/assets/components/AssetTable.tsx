import {
  AppstoreOutlined,
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  QrcodeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Flex, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { FormattedDate } from '../../../components/FormattedDate';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

declare module '../../../services/assets.service' {
  interface Asset {
    locationPath?: string | null;
  }
}

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
          sorter: (a: Asset, b: Asset) =>
            a.tag.localeCompare(b.tag) || a.name.localeCompare(b.name),
          render: (_: unknown, record: Asset) => (
            <div>
              <Flex align="center" gap={6} wrap="wrap">
                <Text code strong style={{ fontSize: 13, color: '#1677ff' }}>
                  {record.tag}
                </Text>
                <Tag color="blue" icon={<AppstoreOutlined />} style={{ fontSize: 11, margin: 0 }}>
                  {record.category}
                </Tag>
                {record.organization && (
                  <Tag color="purple" icon={<BankOutlined />} style={{ fontSize: 10.5, margin: 0 }}>
                    {record.organization}
                  </Tag>
                )}
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
          sorter: (a: Asset, b: Asset) => a.status.localeCompare(b.status),
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
          sorter: (a: Asset, b: Asset) => (a.assignedTo || '').localeCompare(b.assignedTo || ''),
          render: (user: string) => {
            if (!user || user === 'Unassigned') {
              return <Tag color="default">Unassigned</Tag>;
            }
            return (
              <Tag icon={<UserOutlined />} color="blue">
                {user}
              </Tag>
            );
          },
        },
        {
          title: 'Location & Facility',
          dataIndex: 'location',
          key: 'location',
          sorter: (a: Asset, b: Asset) => (a.location || '').localeCompare(b.location || ''),
          render: (loc: string, record: Asset) => {
            const fullPath = record.locationPath || record.location || 'Storage Vault';
            const leafName = loc ? loc.split(' > ').pop() || loc : 'Storage Vault';

            return (
              <Flex vertical gap={4}>
                <Tooltip title={fullPath}>
                  <Tag
                    icon={<EnvironmentOutlined />}
                    color="geekblue"
                    style={{ margin: 0, cursor: 'pointer' }}
                  >
                    {leafName}
                  </Tag>
                </Tooltip>
                {record.department && (
                  <Tag color="cyan" style={{ margin: 0, fontSize: 10.5 }}>
                    {record.department}
                  </Tag>
                )}
                {record.organization && (
                  <Tag color="purple" icon={<BankOutlined />} style={{ margin: 0, fontSize: 10.5 }}>
                    {record.organization}
                  </Tag>
                )}
              </Flex>
            );
          },
        },
        {
          title: 'Warranty Expiration',
          dataIndex: 'warrantyExpiry',
          key: 'warrantyExpiry',
          sorter: (a: Asset, b: Asset) =>
            (a.warrantyExpiry || '').localeCompare(b.warrantyExpiry || ''),
          render: (date: string) => {
            if (!date) return <Text type="secondary">N/A</Text>;
            const isExpiringSoon = dayjs(date).diff(dayjs(), 'day') < 90;
            return (
              <div>
                <FormattedDate date={date} style={{ fontSize: 12 }} />
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
              <Tooltip title="View Details">
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
                title="Delete asset?"
                description="This action cannot be undone."
                onConfirm={() => onDeleteAsset(record.id)}
                okText="Delete"
                okButtonProps={{ danger: true }}
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
        size="middle"
        columns={columns}
        dataSource={assets}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          showTotal: (total) => `Total ${total} items`,
        }}
      />
    );
  },
);

AssetTable.displayName = 'AssetTable';
