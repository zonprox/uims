import { DeleteOutlined, EditOutlined, EnvironmentOutlined, EyeOutlined } from '@ant-design/icons';
import { Button, Flex, Popconfirm, Progress, Space, Table, Tag, Tooltip, Typography } from 'antd';
import React, { useMemo } from 'react';
import type { Subnet } from '../../../services/network.service';

const { Text } = Typography;

export interface SubnetTableProps {
  subnets: Array<Subnet>;
  loading: boolean;
  onOpenDetailDrawer: (subnet: Subnet) => void;
  onOpenEditModal: (subnet: Subnet) => void;
  onDeleteSubnet: (id: string) => void;
}

export const SubnetTable: React.FC<SubnetTableProps> = React.memo(
  ({ subnets, loading, onOpenDetailDrawer, onOpenEditModal, onDeleteSubnet }) => {
    const columns = useMemo(
      () => [
        {
          title: 'CIDR Block & Subnet Name',
          dataIndex: 'cidr',
          key: 'cidr',
          sorter: (a: Subnet, b: Subnet) => a.cidr.localeCompare(b.cidr),
          render: (cidr: string, record: Subnet) => (
            <div>
              <Text code strong style={{ fontSize: 13, color: '#1677ff' }}>
                {cidr}
              </Text>
              <Text
                strong
                style={{ display: 'block', fontSize: 12.5, color: '#1f2937', marginTop: 2 }}
              >
                {record.name}
              </Text>
              {record.description && (
                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                  {record.description}
                </Text>
              )}
            </div>
          ),
        },
        {
          title: 'VLAN & Location',
          key: 'vlanLocation',
          render: (_: unknown, record: Subnet) => (
            <div>
              {record.vlan ? (
                <Tag color="purple" style={{ fontSize: 11, marginBottom: 2 }}>
                  VLAN {record.vlan.vlanNumber} ({record.vlan.name})
                </Tag>
              ) : record.vlanName ? (
                <Tag color="purple" style={{ fontSize: 11, marginBottom: 2 }}>
                  {record.vlanName}
                </Tag>
              ) : (
                <Tag style={{ fontSize: 11, marginBottom: 2 }}>Unassigned</Tag>
              )}
              <Flex align="center" gap={4} style={{ marginTop: 2 }}>
                <EnvironmentOutlined style={{ color: '#64748b', fontSize: 11 }} />
                <Text type="secondary" style={{ fontSize: 11.5 }}>
                  {record.location?.name || record.locationName || 'HQ'}
                </Text>
              </Flex>
            </div>
          ),
        },
        {
          title: 'Technical Specs',
          key: 'specs',
          render: (_: unknown, record: Subnet) => (
            <div style={{ fontSize: 11.5 }}>
              <div>
                <Text type="secondary">Mask: </Text>
                <Text code style={{ fontSize: 11 }}>
                  {record.netmask || '255.255.255.0'}
                </Text>
              </div>
              <div>
                <Text type="secondary">Gateway: </Text>
                <Text code style={{ fontSize: 11 }}>
                  {record.gateway || '—'}
                </Text>
              </div>
              {record.startIp && record.endIp && (
                <div>
                  <Text type="secondary">Range: </Text>
                  <Text code style={{ fontSize: 11 }}>
                    {record.startIp} - {record.endIp}
                  </Text>
                </div>
              )}
            </div>
          ),
        },
        {
          title: 'IP Utilization',
          key: 'utilization',
          width: 220,
          sorter: (a: Subnet, b: Subnet) =>
            a.usedIps / (a.totalIps || 1) - b.usedIps / (b.totalIps || 1),
          render: (_: unknown, record: Subnet) => {
            const total = record.totalIps || 254;
            const used = record.usedIps || 0;
            const reserved = record.reservedIps || 0;
            const available = Math.max(0, total - used - reserved);
            const percent = total > 0 ? Math.round((used / total) * 100) : 0;

            return (
              <div style={{ minWidth: 170 }}>
                <Tooltip
                  title={`Allocated: ${used} | Reserved: ${reserved} | Available: ${available} (Total: ${total})`}
                >
                  <div>
                    <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                      <Text>
                        <span style={{ color: '#1677ff', fontWeight: 600 }}>{used} used</span> /{' '}
                        <span style={{ color: '#059669' }}>{available} free</span>
                      </Text>
                      <Text type="secondary">{percent}%</Text>
                    </Flex>
                    <Progress
                      percent={percent}
                      size="small"
                      showInfo={false}
                      strokeColor={percent > 85 ? '#ef4444' : percent > 60 ? '#f59e0b' : '#10b981'}
                    />
                  </div>
                </Tooltip>
              </div>
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 120,
          render: (_: unknown, record: Subnet) => (
            <Space size="small">
              <Tooltip title="View Details">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => onOpenDetailDrawer(record)}
                />
              </Tooltip>
              <Tooltip title="Edit Subnet">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenEditModal(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Delete Subnet?"
                description={`Delete subnet ${record.cidr}? Active IP allocations will be detached.`}
                onConfirm={() => onDeleteSubnet(record.id)}
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
      [onOpenDetailDrawer, onOpenEditModal, onDeleteSubnet],
    );

    return (
      <Table
        size="middle"
        columns={columns}
        dataSource={subnets}
        rowKey="id"
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          showTotal: (total) => `Total ${total} Subnets`,
        }}
      />
    );
  },
);

SubnetTable.displayName = 'SubnetTable';
