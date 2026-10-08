import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Input,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useMemo } from 'react';
import type { Subnet, VLAN } from '../../../services/network.service';

const { Text } = Typography;

export interface VlanTableProps {
  vlans: Array<VLAN>;
  subnets: Array<Subnet>;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  onResetFilters: () => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (vlan: VLAN) => void;
  onOpenDetailDrawer: (vlan: VLAN) => void;
  onDeleteVlan: (id: string) => void;
}

export const VlanTable: React.FC<VlanTableProps> = React.memo(
  ({
    vlans,
    subnets,
    loading,
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusChange,
    onResetFilters,
    onOpenCreateModal,
    onOpenEditModal,
    onOpenDetailDrawer,
    onDeleteVlan,
  }) => {
    const isFiltered = searchQuery || statusFilter !== 'all';

    // Map subnets per VLAN for quick count and tags
    const subnetsByVlanId = useMemo(() => {
      const map = new Map<string, Subnet[]>();
      for (const subnet of subnets) {
        const vlanId = subnet.vlanId || subnet.vlan?.id;
        if (vlanId) {
          const list = map.get(vlanId) || [];
          list.push(subnet);
          map.set(vlanId, list);
        }
      }
      return map;
    }, [subnets]);

    const filteredVlans = useMemo(() => {
      return vlans.filter((vlan) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchNum = String(vlan.vlanNumber).includes(q);
          const matchName = vlan.name.toLowerCase().includes(q);
          const matchDesc = (vlan.description || '').toLowerCase().includes(q);
          if (!matchNum && !matchName && !matchDesc) return false;
        }
        if (statusFilter !== 'all') {
          if (vlan.status !== statusFilter) return false;
        }
        return true;
      });
    }, [vlans, searchQuery, statusFilter]);

    const columns = useMemo(
      () => [
        {
          title: 'VLAN ID',
          dataIndex: 'vlanNumber',
          key: 'vlanNumber',
          width: 110,
          sorter: (a: VLAN, b: VLAN) => a.vlanNumber - b.vlanNumber,
          render: (vlanNumber: number) => (
            <Tag color="purple" style={{ fontWeight: 600, fontSize: 12 }}>
              VLAN {vlanNumber}
            </Tag>
          ),
        },
        {
          title: 'VLAN Name',
          dataIndex: 'name',
          key: 'name',
          sorter: (a: VLAN, b: VLAN) => a.name.localeCompare(b.name),
          render: (name: string, record: VLAN) => (
            <div>
              <Text strong style={{ fontSize: 13, color: '#1f2937' }}>
                {name}
              </Text>
              {record.description && (
                <Text
                  type="secondary"
                  ellipsis={{ tooltip: record.description }}
                  style={{ display: 'block', fontSize: 11.5, maxWidth: 280 }}
                >
                  {record.description}
                </Text>
              )}
            </div>
          ),
        },
        {
          title: 'Associated Subnets',
          key: 'subnets',
          render: (_: unknown, record: VLAN) => {
            const associated = subnetsByVlanId.get(record.id) || record.subnets || [];
            if (associated.length === 0) {
              return <Text type="secondary">None</Text>;
            }
            return (
              <Flex wrap gap={4} align="center">
                {associated.slice(0, 3).map((s) => (
                  <Tag key={s.id} color="blue" style={{ fontSize: 11 }}>
                    {s.cidr}
                  </Tag>
                ))}
                {associated.length > 3 && (
                  <Tag style={{ fontSize: 11 }}>+{associated.length - 3} more</Tag>
                )}
              </Flex>
            );
          },
        },
        {
          title: 'IP Utilization',
          key: 'utilization',
          width: 170,
          render: (_: unknown, record: VLAN) => {
            const associated = subnetsByVlanId.get(record.id) || record.subnets || [];
            const total = associated.reduce((acc, s) => acc + (s.totalIps || 0), 0);
            const used = associated.reduce((acc, s) => acc + (s.usedIps || 0), 0);
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            return (
              <div style={{ minWidth: 120 }}>
                <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                  <Text>
                    {used} / {total} IPs
                  </Text>
                  <Text type="secondary">{pct}%</Text>
                </Flex>
                <Progress
                  percent={pct}
                  size="small"
                  showInfo={false}
                  strokeColor={pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981'}
                />
              </div>
            );
          },
        },
        {
          title: 'Status',
          dataIndex: 'status',
          key: 'status',
          width: 120,
          sorter: (a: VLAN, b: VLAN) => a.status.localeCompare(b.status),
          render: (status: string) => {
            let badgeStatus: 'success' | 'warning' | 'default' = 'default';
            if (status === 'ACTIVE') badgeStatus = 'success';
            if (status === 'RESERVED') badgeStatus = 'warning';
            return (
              <Badge status={badgeStatus} text={<Text style={{ fontSize: 12 }}>{status}</Text>} />
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 120,
          fixed: 'right' as const,
          render: (_: unknown, record: VLAN) => (
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
              <Tooltip title="Edit VLAN">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenEditModal(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Delete VLAN?"
                description={`Are you sure you want to delete VLAN ${record.vlanNumber} (${record.name})? Subnets must be unlinked first.`}
                onConfirm={() => onDeleteVlan(record.id)}
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
      [subnetsByVlanId, onOpenDetailDrawer, onOpenEditModal, onDeleteVlan],
    );

    return (
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search VLAN by name, number, or purpose..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={16}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={statusFilter}
                onChange={onStatusChange}
                style={{ width: 130 }}
                placeholder="Status"
                options={[
                  { label: 'All Status', value: 'all' },
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Reserved', value: 'RESERVED' },
                  { label: 'Deprecated', value: 'DEPRECATED' },
                ]}
              />

              {isFiltered && <Button onClick={onResetFilters}>Reset</Button>}

              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenCreateModal}>
                Create VLAN
              </Button>
            </Flex>
          </Col>
        </Row>

        <Table
          size="middle"
          columns={columns}
          dataSource={filteredVlans}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `Total ${total} VLANs`,
          }}
        />
      </Card>
    );
  },
);

VlanTable.displayName = 'VlanTable';
