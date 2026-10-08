import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
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
}

export const DeviceModelTable: React.FC<DeviceModelTableProps> = React.memo(
  ({ models, loading, onEditModel, onRegisterUnitUnderModel, onRegisterUnit, onDeleteModel }) => {
    const handleRegister = onRegisterUnitUnderModel || onRegisterUnit;
    const columns = useMemo(
      () => [
        {
          title: 'Asset Code / SAP Code',
          dataIndex: 'assetCode',
          key: 'assetCode',
          width: 170,
          sorter: (a: Asset, b: Asset) =>
            (a.assetCode || a.tag || '').localeCompare(b.assetCode || b.tag || '') ||
            a.id.localeCompare(b.id),
          render: (_: unknown, record: Asset) => {
            const code = record.assetCode || record.tag || 'N/A';
            return (
              <Text copyable code strong style={{ fontSize: 13, color: '#1677ff' }}>
                {code}
              </Text>
            );
          },
        },
        {
          title: 'Name / Model',
          key: 'name',
          sorter: (a: Asset, b: Asset) =>
            a.name.localeCompare(b.name) || (a.model || '').localeCompare(b.model || ''),
          render: (_: unknown, record: Asset) => (
            <div>
              <Text strong style={{ fontSize: 13, display: 'block' }}>
                {record.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.manufacturer ? `${record.manufacturer} ` : ''}
                {record.model || ''}
              </Text>
            </div>
          ),
        },
        {
          title: 'Manufacturer',
          dataIndex: 'manufacturer',
          key: 'manufacturer',
          width: 130,
          sorter: (a: Asset, b: Asset) =>
            (a.manufacturer || '').localeCompare(b.manufacturer || '') ||
            a.name.localeCompare(b.name),
          render: (val: string) => val || <Text type="secondary">—</Text>,
        },
        {
          title: 'Category',
          dataIndex: 'category',
          key: 'category',
          width: 150,
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
          title: 'Specifications',
          dataIndex: 'specifications',
          key: 'specifications',
          render: (specs: string | null | undefined) => {
            if (!specs) return <Text type="secondary">Standard Configuration</Text>;
            return (
              <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: specs }}>
                {specs}
              </Text>
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
          title: 'Cost Center',
          key: 'costCenter',
          width: 120,
          render: (_: unknown, record: Asset) => {
            const cc = record.costCenter;
            const code =
              typeof cc === 'object' && cc !== null ? cc.code : typeof cc === 'string' ? cc : null;
            if (!code) return <Text type="secondary">—</Text>;
            return (
              <Tag color="geekblue" style={{ margin: 0 }}>
                {code}
              </Tag>
            );
          },
        },
        {
          title: 'Unit Counts',
          key: 'unitCounts',
          width: 220,
          render: (_: unknown, record: Asset) => {
            const counts = record.unitCounts;
            const total = record.totalUnits ?? counts?.total ?? 0;
            const available = record.availableUnits ?? counts?.available ?? 0;
            const inUse = record.inUseUnits ?? counts?.inUse ?? 0;
            return (
              <Flex gap={6} align="center">
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
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 140,
          fixed: 'end' as const,
          render: (_: unknown, record: Asset) => (
            <Space size="small">
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
      [onDeleteModel, onEditModel, onRegisterUnitUnderModel],
    );

    return (
      <Table
        size="middle"
        columns={columns}
        dataSource={models}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
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
