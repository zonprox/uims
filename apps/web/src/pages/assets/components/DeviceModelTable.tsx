import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Badge, Button, Flex, Popconfirm, Space, Table, Tag, Tooltip, Typography } from 'antd';
import React, { useMemo } from 'react';
import type { Asset } from '../../../services/assets.service';

const { Text } = Typography;

export interface DeviceModelTableProps {
  models: Array<Asset>;
  loading: boolean;
  onEditModel: (model: Asset) => void;
  onRegisterUnitUnderModel?: (model: Asset) => void;
  onRegisterUnit?: (model: Asset) => void;
  onDeleteModel: (id: string) => void;
  onShowDetails?: (model: Asset) => void;
}

export const DeviceModelTable: React.FC<DeviceModelTableProps> = React.memo(
  ({
    models,
    loading,
    onEditModel,
    onRegisterUnitUnderModel,
    onRegisterUnit,
    onDeleteModel,
    onShowDetails,
  }) => {
    const handleRegister = onRegisterUnitUnderModel || onRegisterUnit;

    const columns = useMemo(
      () => [
        {
          title: 'Asset Code / SAP Code',
          dataIndex: 'assetCode',
          key: 'assetCode',
          width: 160,
          sorter: (a: Asset, b: Asset) =>
            (a.modelCode || a.assetCode || a.tag || '').localeCompare(
              b.modelCode || b.assetCode || b.tag || '',
            ) || a.id.localeCompare(b.id),
          render: (_: unknown, record: Asset) => {
            const code = record.modelCode || record.assetCode || record.tag || 'N/A';
            const cc = record.costCenter;
            const costCenterCode =
              typeof cc === 'object' && cc !== null ? cc.code : typeof cc === 'string' ? cc : null;
            return (
              <Flex vertical gap={4} style={{ maxWidth: 160 }}>
                <Text
                  copyable
                  code
                  strong
                  style={{ fontSize: 13, color: '#1677ff', cursor: 'pointer' }}
                  onClick={() => onShowDetails?.(record)}
                >
                  {code}
                </Text>
                {costCenterCode && (
                  <Tag color="geekblue" style={{ fontSize: 10, margin: 0, width: 'fit-content' }}>
                    {costCenterCode}
                  </Tag>
                )}
              </Flex>
            );
          },
        },
        {
          title: 'Name / Model',
          key: 'name',
          width: 270,
          sorter: (a: Asset, b: Asset) =>
            a.name.localeCompare(b.name) || (a.model || '').localeCompare(b.model || ''),
          render: (_: unknown, record: Asset) => (
            <Flex vertical gap={2} style={{ maxWidth: 270 }}>
              <Text
                strong
                style={{ fontSize: 13, cursor: 'pointer' }}
                onClick={() => onShowDetails?.(record)}
              >
                {record.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.manufacturer ? `${record.manufacturer} ` : ''}
                {record.model || ''}
              </Text>
              {record.specifications ? (
                <Text
                  type="secondary"
                  ellipsis={{ tooltip: record.specifications }}
                  style={{ fontSize: 11, maxWidth: 260 }}
                >
                  {record.specifications}
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Standard Configuration
                </Text>
              )}
            </Flex>
          ),
        },
        {
          title: 'Category',
          dataIndex: 'category',
          key: 'category',
          width: 140,
          sorter: (a: Asset, b: Asset) => (a.category || '').localeCompare(b.category || ''),
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
          title: 'Unit Counts',
          key: 'unitCounts',
          width: 200,
          sorter: (a: Asset, b: Asset) => {
            const totalA = a.totalUnits ?? a.unitCounts?.total ?? 0;
            const totalB = b.totalUnits ?? b.unitCounts?.total ?? 0;
            return totalA - totalB || a.id.localeCompare(b.id);
          },
          render: (_: unknown, record: Asset) => {
            const counts = record.unitCounts;
            const total = record.totalUnits ?? counts?.total ?? 0;
            const available = record.availableUnits ?? counts?.available ?? 0;
            const inUse = record.inUseUnits ?? counts?.inUse ?? 0;
            const isLowStock =
              available <= ((record as unknown as { minThreshold?: number }).minThreshold ?? 5) &&
              total > 0;
            return (
              <Flex vertical gap={4}>
                <Flex gap={6} align="center" wrap="wrap">
                  <Tooltip title="Total registered physical units">
                    <Badge count={`Total: ${total}`} style={{ backgroundColor: '#1677ff' }} />
                  </Tooltip>
                  <Tooltip title="Available units in storage">
                    <Badge count={`Avail: ${available}`} style={{ backgroundColor: '#52c41a' }} />
                  </Tooltip>
                  <Tooltip title="Units assigned to employees">
                    <Badge count={`In Use: ${inUse}`} style={{ backgroundColor: '#722ed1' }} />
                  </Tooltip>
                </Flex>
                {isLowStock && (
                  <Tag
                    color="warning"
                    icon={<WarningOutlined />}
                    style={{ fontSize: 10.5, margin: 0 }}
                  >
                    Low Stock
                  </Tag>
                )}
              </Flex>
            );
          },
        },
        {
          title: 'Unit Cost',
          dataIndex: 'unitCost',
          key: 'unitCost',
          width: 110,
          align: 'right' as const,
          sorter: (a: Asset, b: Asset) => (a.unitCost || 0) - (b.unitCost || 0),
          render: (cost: number | null | undefined) => {
            if (cost == null) return <Text type="secondary">—</Text>;
            return (
              <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                $
                {cost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 150,
          fixed: 'end' as const,
          render: (_: unknown, record: Asset) => (
            <Space size="small">
              {onShowDetails && (
                <Tooltip title="View Details">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => onShowDetails(record)}
                  />
                </Tooltip>
              )}
              <Tooltip title="Register Physical Unit under this model">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  aria-label="Register Unit under model"
                  icon={<PlusCircleOutlined style={{ color: '#1677ff' }} />}
                  onClick={() => handleRegister?.(record)}
                />
              </Tooltip>
              <Tooltip title="Edit Device Model">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  aria-label="edit"
                  icon={<EditOutlined />}
                  onClick={() => onEditModel(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Delete device model?"
                description="This will permanently delete the model if no physical units exist."
                onConfirm={() => onDeleteModel(record.id)}
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
      [handleRegister, onDeleteModel, onEditModel, onShowDetails],
    );

    return (
      <Table
        size="middle"
        columns={columns}
        dataSource={models}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          showTotal: (total) => `Total ${total} models`,
        }}
      />
    );
  },
);

DeviceModelTable.displayName = 'DeviceModelTable';
