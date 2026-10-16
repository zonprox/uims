import {
  AppstoreOutlined,
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PrinterOutlined,
  RollbackOutlined,
  SwapOutlined,
  UserOutlined,
  UserSwitchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Flex, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import React, { useMemo, useState } from 'react';
import type { Asset } from '../../../services/assets.service';
import { assetsService } from '../../../services/assets.service';
import { BatchAssignModal } from './BatchAssignModal';
import { ReturnAssetModal } from './ReturnAssetModal';
import { TransferAssetDrawer } from './TransferAssetDrawer';

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
  onReturnAsset?: (asset: Asset) => void;
  onAllocateAsset?: (asset: Asset) => void;
  onTransferAsset?: (asset: Asset) => void;
  onAssetUpdated?: () => void;
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
    onReturnAsset,
    onAllocateAsset,
    onTransferAsset,
    onAssetUpdated,
  }) => {
    const [returningAsset, setReturningAsset] = useState<Asset | null>(null);
    const [transferringAsset, setTransferringAsset] = useState<Asset | null>(null);
    const [allocatingAsset, setAllocatingAsset] = useState<Asset | null>(null);
    const [allocatingSubmitting, setAllocatingSubmitting] = useState(false);

    const handleReturnClick = (asset: Asset) => {
      if (onReturnAsset) {
        onReturnAsset(asset);
      } else {
        setReturningAsset(asset);
      }
    };

    const handleTransferClick = (asset: Asset) => {
      if (onTransferAsset) {
        onTransferAsset(asset);
      } else {
        setTransferringAsset(asset);
      }
    };

    const handleAllocateClick = (asset: Asset) => {
      if (onAllocateAsset) {
        onAllocateAsset(asset);
      } else {
        setAllocatingAsset(asset);
      }
    };

    const columns = useMemo(
      () => [
        {
          title: 'SUB Code',
          key: 'subcode',
          width: 250,
          sorter: (a: Asset, b: Asset) =>
            (a.subcode || a.tag || '').localeCompare(b.subcode || b.tag || '') ||
            (a.assetCode || a.parent?.assetCode || '').localeCompare(
              b.assetCode || b.parent?.assetCode || '',
            ) ||
            a.name.localeCompare(b.name) ||
            a.id.localeCompare(b.id),
          render: (_: unknown, record: Asset) => {
            const code = record.subcode || record.tag || 'N/A';
            const sapCode = record.assetCode || record.parent?.assetCode || null;
            return (
              <Flex vertical gap={2} style={{ maxWidth: 250 }}>
                <Flex align="center" gap={6} wrap="wrap">
                  <Text
                    copyable
                    code
                    strong
                    style={{
                      fontSize: 13,
                      color: '#1677ff',
                      cursor: 'pointer',
                      display: 'inline-block',
                    }}
                    onClick={() => onShowDetails(record)}
                  >
                    {code}
                  </Text>
                  {sapCode && (
                    <Tag
                      color="cyan"
                      style={{ fontSize: 10.5, margin: 0, padding: '0 4px', lineHeight: '18px' }}
                    >
                      SAP: {sapCode}
                    </Tag>
                  )}
                </Flex>
                <Text
                  strong
                  ellipsis={{ tooltip: record.name }}
                  style={{ fontSize: 13, cursor: 'pointer' }}
                  onClick={() => onShowDetails(record)}
                >
                  {record.name}
                </Text>
                {record.serialNumber ? (
                  <Text
                    type="secondary"
                    copyable={{ text: record.serialNumber }}
                    style={{ fontSize: 11 }}
                  >
                    S/N: {record.serialNumber}
                  </Text>
                ) : null}
              </Flex>
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
          render: (category: string, record: Asset) => {
            if (!category) return <Text type="secondary">—</Text>;
            return (
              <Flex vertical gap={4} align="flex-start">
                <Tag color="blue" icon={<AppstoreOutlined />} style={{ fontSize: 11, margin: 0 }}>
                  {category}
                </Tag>
                <Text
                  type="secondary"
                  ellipsis={{
                    tooltip:
                      `${record.manufacturer ? `${record.manufacturer} ` : ''}${record.model || ''}`.trim(),
                  }}
                  style={{ fontSize: 11, maxWidth: 130 }}
                >
                  {record.manufacturer ? `${record.manufacturer} ` : ''}
                  {record.model || ''}
                </Text>
              </Flex>
            );
          },
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          width: 130,
          sorter: (a: Asset, b: Asset) =>
            a.status.localeCompare(b.status) || a.tag.localeCompare(b.tag),
          render: (status: string, record: Asset) => {
            let color = 'default';
            const s = (status || '').toUpperCase();
            if (s === 'AVAILABLE' || s === 'ACTIVE') color = 'success';
            else if (s === 'IN_USE') color = 'processing';
            else if (s === 'MAINTENANCE' || s === 'IN REPAIR') color = 'warning';
            else if (s === 'IN STORAGE') color = 'cyan';
            else if (s === 'RETIRED') color = 'error';
            else if (s === 'LOST') color = 'default';
            return (
              <Flex vertical gap={4} align="flex-start">
                <Tag color={color}>{status}</Tag>
                {record.hasPendingRecord && (
                  <Tag
                    color="warning"
                    icon={<WarningOutlined />}
                    style={{ fontSize: 11, margin: 0 }}
                  >
                    Pending Record
                  </Tag>
                )}
              </Flex>
            );
          },
        },
        {
          title: 'Assignee',
          dataIndex: 'assignedTo',
          key: 'assignedTo',
          width: 170,
          sorter: (a: Asset, b: Asset) =>
            (a.assignedTo || '').localeCompare(b.assignedTo || '') || a.tag.localeCompare(b.tag),
          render: (user: string, record: Asset) => {
            if (!user || user === 'Unassigned') {
              return <Tag color="default">Unassigned</Tag>;
            }
            return (
              <Flex align="center" gap={8}>
                <Avatar
                  size={24}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
                />
                <Flex vertical gap={1} style={{ minWidth: 0 }}>
                  <Text strong ellipsis={{ tooltip: user }} style={{ fontSize: 12 }}>
                    {user}
                  </Text>
                  {record.assignedEmail ? (
                    <Text
                      type="secondary"
                      ellipsis={{ tooltip: record.assignedEmail }}
                      style={{ fontSize: 11 }}
                    >
                      {record.assignedEmail}
                    </Text>
                  ) : null}
                </Flex>
              </Flex>
            );
          },
        },
        {
          title: 'Organization',
          dataIndex: 'organization',
          key: 'organization',
          width: 140,
          sorter: (a: Asset, b: Asset) =>
            (a.organization || '').localeCompare(b.organization || '') ||
            a.tag.localeCompare(b.tag),
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
                {!record.department && !record.organization && <Text type="secondary">—</Text>}
              </Flex>
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 170,
          fixed: 'end' as const,
          render: (_: unknown, record: Asset) => {
            const s = (record.status || '').toUpperCase();
            const isAvailable = s === 'AVAILABLE' || s === 'IN STORAGE' || s === 'IN_STORAGE';
            const isAssigned =
              (s === 'IN_USE' ||
                s === 'ASSIGNED' ||
                s === 'IN USE' ||
                s === 'ACTIVE' ||
                (s !== 'IN STORAGE' && s !== 'AVAILABLE')) &&
              Boolean(
                record.assignedToId || (record.assignedTo && record.assignedTo !== 'Unassigned'),
              );

            return (
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
                {isAvailable && (
                  <Tooltip title="Allocate Asset">
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      icon={<UserSwitchOutlined />}
                      onClick={() => handleAllocateClick(record)}
                    />
                  </Tooltip>
                )}
                {isAssigned && (
                  <>
                    <Tooltip title="Transfer Asset">
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<SwapOutlined />}
                        onClick={() => handleTransferClick(record)}
                      />
                    </Tooltip>
                    <Tooltip title="Return Asset">
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<RollbackOutlined />}
                        onClick={() => handleReturnClick(record)}
                      />
                    </Tooltip>
                  </>
                )}
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
            );
          },
        },
      ],
      [
        onDeleteAsset,
        onOpenEditModal,
        onShowDetails,
        onShowQr,
        onReturnAsset,
        onAllocateAsset,
        onTransferAsset,
      ],
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
      <>
        <Table
          size="middle"
          columns={columns}
          dataSource={assets}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `Total ${total} units`,
          }}
        />
        {returningAsset && (
          <ReturnAssetModal
            open={Boolean(returningAsset)}
            asset={returningAsset}
            onCancel={() => setReturningAsset(null)}
            onSuccess={() => {
              setReturningAsset(null);
              onAssetUpdated?.();
            }}
          />
        )}
        {transferringAsset && (
          <TransferAssetDrawer
            open={Boolean(transferringAsset)}
            asset={transferringAsset}
            onClose={() => setTransferringAsset(null)}
            onSuccess={() => {
              setTransferringAsset(null);
              onAssetUpdated?.();
            }}
          />
        )}
        {allocatingAsset && (
          <BatchAssignModal
            open={Boolean(allocatingAsset)}
            assets={[allocatingAsset]}
            submitting={allocatingSubmitting}
            onCancel={() => setAllocatingAsset(null)}
            onAssign={async (values) => {
              try {
                setAllocatingSubmitting(true);
                await assetsService.batchAssignAssets({
                  assetIds: [allocatingAsset.id],
                  assignedToId: values.assignedToId,
                  status: values.status,
                  signedDocUrl: values.signedDocUrl,
                });
                setAllocatingAsset(null);
                onAssetUpdated?.();
              } finally {
                setAllocatingSubmitting(false);
              }
            }}
          />
        )}
      </>
    );
  },
);

AssetTable.displayName = 'AssetTable';
