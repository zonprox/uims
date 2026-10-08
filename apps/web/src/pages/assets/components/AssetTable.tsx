import {
  AppstoreOutlined,
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PrinterOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Flex, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import React, { useMemo } from 'react';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

export interface AssetTableProps {
  assets: Array<Asset>;
  loading: boolean;
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (selectedRowKeys: React.Key[], selectedRows: Asset[]) => void;
  onShowDetails: (asset: Asset) => void;
  onShowQr?: (asset: Asset) => void;
  onOpenEditModal: (asset: Asset) => void;
  onDeleteAsset: (id: string) => void;
}

export const AssetTable: React.FC<AssetTableProps> = React.memo(
  ({
    assets,
    loading,
    selectedRowKeys,
    onSelectionChange,
    onShowDetails,
    onShowQr,
    onOpenEditModal,
    onDeleteAsset,
  }) => {
    const columns = useMemo(
      () => [
        {
          title: 'SUB Code',
          key: 'subcode',
          width: 160,
          sorter: (a: Asset, b: Asset) =>
            (a.subcode || a.tag || '').localeCompare(b.subcode || b.tag || '') ||
            a.name.localeCompare(b.name) ||
            a.id.localeCompare(b.id),
          render: (_: unknown, record: Asset) => {
            const code = record.subcode || record.tag || 'N/A';
            return (
              <div>
                <Text
                  copyable
                  code
                  strong
                  style={{ fontSize: 13, color: '#1677ff', cursor: 'pointer' }}
                  onClick={() => onShowDetails(record)}
                >
                  {code}
                </Text>
              </div>
            );
          },
        },
        {
          title: 'Device Model',
          key: 'deviceModel',
          sorter: (a: Asset, b: Asset) =>
            a.name.localeCompare(b.name) || (a.model || '').localeCompare(b.model || ''),
          render: (_: unknown, record: Asset) => {
            const sapCode = record.parent?.assetCode || (record.parentId ? record.assetCode : null);
            return (
              <div>
                <Text
                  strong
                  style={{ fontSize: 13, cursor: 'pointer' }}
                  onClick={() => onShowDetails(record)}
                >
                  {record.name}
                </Text>
                {sapCode && (
                  <Tag color="cyan" style={{ fontSize: 10.5, marginLeft: 6 }}>
                    [{sapCode}]
                  </Tag>
                )}
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {record.manufacturer ? `${record.manufacturer} ` : ''}
                  {record.model || ''}
                </Text>
              </div>
            );
          },
        },
        {
          title: 'Serial Number',
          dataIndex: 'serialNumber',
          key: 'serialNumber',
          width: 140,
          sorter: (a: Asset, b: Asset) =>
            (a.serialNumber || '').localeCompare(b.serialNumber || ''),
          render: (sn: string | null | undefined) => {
            if (!sn) return <Text type="secondary">—</Text>;
            return (
              <Text copyable code style={{ fontSize: 11 }}>
                {sn}
              </Text>
            );
          },
        },
        {
          title: 'Cost Center',
          key: 'costCenter',
          width: 110,
          render: (_: unknown, record: Asset) => {
            const cc = record.costCenter;
            const code =
              typeof cc === 'object' && cc !== null ? cc.code : typeof cc === 'string' ? cc : null;
            if (!code) return <Text type="secondary">—</Text>;
            return (
              <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
                {code}
              </Tag>
            );
          },
        },
        {
          title: 'Category',
          dataIndex: 'category',
          key: 'category',
          width: 140,
          sorter: (a: Asset, b: Asset) =>
            (a.category || '').localeCompare(b.category || '') || a.tag.localeCompare(b.tag),
          render: (category: string) => {
            if (!category) return <Text type="secondary">—</Text>;
            return (
              <Tag color="blue" icon={<AppstoreOutlined />} style={{ fontSize: 11, margin: 0 }}>
                {category}
              </Tag>
            );
          },
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          width: 120,
          sorter: (a: Asset, b: Asset) =>
            a.status.localeCompare(b.status) || a.tag.localeCompare(b.tag),
          render: (status: string) => {
            let color = 'default';
            const s = (status || '').toUpperCase();
            if (s === 'AVAILABLE' || s === 'ACTIVE') color = 'success';
            else if (s === 'IN_USE') color = 'processing';
            else if (s === 'MAINTENANCE' || s === 'IN REPAIR') color = 'warning';
            else if (s === 'IN STORAGE') color = 'cyan';
            else if (s === 'RETIRED') color = 'error';
            else if (s === 'LOST') color = 'default';
            return <Tag color={color}>{status}</Tag>;
          },
        },
        {
          title: 'Assignee',
          dataIndex: 'assignedTo',
          key: 'assignedTo',
          width: 150,
          sorter: (a: Asset, b: Asset) =>
            (a.assignedTo || '').localeCompare(b.assignedTo || '') || a.tag.localeCompare(b.tag),
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
          title: 'Organization',
          dataIndex: 'organization',
          key: 'organization',
          sorter: (a: Asset, b: Asset) =>
            (a.organization || '').localeCompare(b.organization || '') || a.tag.localeCompare(b.tag),
          render: (_: unknown, record: Asset) => {
            return (
              <Flex vertical gap={4}>
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
                {!record.department && !record.organization && (
                  <Text type="secondary">—</Text>
                )}
              </Flex>
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 160,
          fixed: 'end' as const,
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
              {onShowQr && (
                <Tooltip title="Print QR Label">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    icon={<PrinterOutlined />}
                    onClick={() => onShowQr(record)}
                  />
                </Tooltip>
              )}
              <Tooltip title="Edit Unit">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenEditModal(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Delete physical unit?"
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
      [onDeleteAsset, onOpenEditModal, onShowDetails, onShowQr],
    );

    const rowSelection = useMemo(() => {
      if (!onSelectionChange) return undefined;
      return {
        selectedRowKeys,
        onChange: onSelectionChange,
        preserveSelectedRowKeys: true,
      };
    }, [selectedRowKeys, onSelectionChange]);

    return (
      <Table
        size="middle"
        columns={columns}
        dataSource={assets}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          showTotal: (total) => `Total ${total} units`,
        }}
      />
    );
  },
);

AssetTable.displayName = 'AssetTable';
