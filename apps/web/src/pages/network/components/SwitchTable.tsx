import {
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
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
import type { NetworkSwitch, SwitchRole, SwitchStatus } from '../../../services/network.service';

const { Text } = Typography;

export interface SwitchTableProps {
  switches: Array<NetworkSwitch>;
  loading?: boolean;
  onViewFaceplate?: (sw: NetworkSwitch) => void;
  onEdit?: (sw: NetworkSwitch) => void;
  onDelete?: (id: string) => void;
  onSelectRack?: (rackId: string) => void;
}

export const SwitchTable: React.FC<SwitchTableProps> = React.memo(
  ({ switches, loading = false, onViewFaceplate, onEdit, onDelete, onSelectRack }) => {
    const { token } = theme.useToken();
    const getRoleTag = (role: SwitchRole | `${SwitchRole}` | undefined) => {
      switch (role) {
        case 'CORE':
          return <Tag color="purple">Core</Tag>;
        case 'DISTRIBUTION':
          return <Tag color="geekblue">Distribution</Tag>;
        case 'ACCESS':
          return <Tag color="blue">Access</Tag>;
        case 'TOR':
          return <Tag color="cyan">ToR</Tag>;
        default:
          return <Tag color="default">{role || 'Access'}</Tag>;
      }
    };

    const getStatusTag = (status: SwitchStatus | `${SwitchStatus}` | undefined) => {
      switch (status) {
        case 'ONLINE':
          return <Tag color="success">Online</Tag>;
        case 'OFFLINE':
          return <Tag color="error">Offline</Tag>;
        case 'MAINTENANCE':
          return <Tag color="warning">Maintenance</Tag>;
        default:
          return <Tag color="default">{status || 'Online'}</Tag>;
      }
    };

    const getVendorTag = (vendor: string | undefined) => {
      const v = (vendor || '').toLowerCase();
      if (v.includes('cisco')) return <Tag color="blue">Cisco</Tag>;
      if (v.includes('alcatel')) return <Tag color="magenta">Alcatel-Lucent</Tag>;
      if (v.includes('juniper')) return <Tag color="geekblue">Juniper</Tag>;
      if (v.includes('aruba')) return <Tag color="orange">Aruba</Tag>;
      if (v.includes('mikrotik')) return <Tag color="red">Mikrotik</Tag>;
      return <Tag color="default">{vendor || 'Other'}</Tag>;
    };

    const columns: ColumnsType<NetworkSwitch> = useMemo(
      () => [
        {
          title: 'Switch Name & Role',
          key: 'nameRole',
          sorter: (a, b) =>
            a.name.localeCompare(b.name) ||
            (a.role || '').localeCompare(b.role || '') ||
            a.id.localeCompare(b.id),
          render: (_: unknown, record: NetworkSwitch) => (
            <Flex vertical gap={2}>
              <Flex align="center" gap={6}>
                <Text
                  strong
                  style={{
                    fontSize: 13.5,
                    cursor: onViewFaceplate ? 'pointer' : 'default',
                    color: onViewFaceplate ? token.colorPrimary : undefined,
                  }}
                  onClick={() => onViewFaceplate?.(record)}
                  data-testid={`switch-name-${record.name}`}
                >
                  {record.name}
                </Text>
                {getRoleTag(record.role)}
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
          title: 'Vendor & Model',
          key: 'vendorModel',
          sorter: (a, b) =>
            a.vendor.localeCompare(b.vendor) ||
            a.model.localeCompare(b.model) ||
            a.id.localeCompare(b.id),
          render: (_: unknown, record: NetworkSwitch) => (
            <Flex vertical gap={1}>
              <Flex align="center" gap={4}>
                {getVendorTag(record.vendor)}
              </Flex>
              <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>
                {record.model}
              </Text>
            </Flex>
          ),
        },
        {
          title: 'Management IP',
          key: 'mgmtIp',
          width: 145,
          sorter: (a, b) => {
            const ipA = a.ipAddress?.address || '';
            const ipB = b.ipAddress?.address || '';
            return ipA.localeCompare(ipB) || a.id.localeCompare(b.id);
          },
          render: (_: unknown, record: NetworkSwitch) =>
            record.ipAddress ? (
              <Flex vertical gap={1}>
                <Tag
                  icon={<ApiOutlined />}
                  color="geekblue"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11.5,
                    width: 'fit-content',
                    margin: 0,
                  }}
                >
                  {record.ipAddress.address}
                </Tag>
                {record.ipAddress.hostname && (
                  <Text type="secondary" ellipsis style={{ fontSize: 10, maxWidth: 130 }}>
                    {record.ipAddress.hostname}
                  </Text>
                )}
              </Flex>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                —
              </Text>
            ),
        },
        {
          title: 'Rack Unit & Location',
          key: 'rackLocation',
          sorter: (a, b) => {
            const locA = a.location?.name || '';
            const locB = b.location?.name || '';
            return locA.localeCompare(locB) || a.id.localeCompare(b.id);
          },
          render: (_: unknown, record: NetworkSwitch) => (
            <Flex vertical gap={2}>
              {record.rack ? (
                <Flex align="center" gap={4}>
                  <Tag
                    icon={<ApartmentOutlined />}
                    color="purple"
                    style={{
                      cursor: onSelectRack ? 'pointer' : 'default',
                      fontSize: 11,
                      margin: 0,
                    }}
                    onClick={() => {
                      if (record.rack?.id && onSelectRack) {
                        onSelectRack(record.rack.id);
                      }
                    }}
                  >
                    {record.rack.code || record.rack.name}
                  </Tag>
                  {record.rackPosition && (
                    <Text code style={{ fontSize: 10.5 }}>
                      U{record.rackPosition}
                    </Text>
                  )}
                </Flex>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Unmounted
                </Text>
              )}
              {record.location && (
                <Text type="secondary" ellipsis style={{ fontSize: 11, maxWidth: 180 }}>
                  {record.location.name}
                </Text>
              )}
            </Flex>
          ),
        },
        {
          title: 'Port Summary',
          key: 'portSummary',
          width: 170,
          sorter: (a, b) =>
            (a.activePortsCount ?? 0) - (b.activePortsCount ?? 0) ||
            a.totalPorts - b.totalPorts ||
            a.id.localeCompare(b.id),
          render: (_: unknown, record: NetworkSwitch) => {
            const total = record.totalPorts || 24;
            let active = record.activePortsCount ?? 0;
            let down = 0;
            let noSignal = 0;
            let reserved = 0;

            if (record.ports && record.ports.length > 0) {
              active = record.ports.filter(
                (p) => String(p.operStatus).toUpperCase() === 'ACTIVE' && p.adminStatus === 'UP',
              ).length;
              down = record.ports.filter(
                (p) => String(p.operStatus).toUpperCase() === 'DOWN' || p.adminStatus === 'DOWN',
              ).length;
              noSignal = record.ports.filter(
                (p) => String(p.operStatus).toUpperCase() === 'CONNECTED_NO_SIGNAL',
              ).length;
              reserved = record.ports.filter(
                (p) => String(p.operStatus).toUpperCase() === 'RESERVED',
              ).length;
            } else if (record.activePortsCount !== undefined) {
              down = Math.max(0, total - active);
            }

            const activePercent = Number(((active / total) * 100).toFixed(0));

            return (
              <Flex vertical gap={3} style={{ width: '100%' }}>
                <Flex justify="space-between" align="center" style={{ fontSize: 11 }}>
                  <Text strong>
                    {active} / {total} Active
                  </Text>
                  <Text type="secondary">{activePercent}%</Text>
                </Flex>
                <Progress
                  percent={activePercent}
                  size="small"
                  strokeColor={token.colorSuccess}
                  railColor={token.colorFillSecondary}
                  showInfo={false}
                />
                <Flex gap={4} wrap="wrap" style={{ marginTop: 1 }}>
                  <Badge
                    count={`${active} Up`}
                    style={{ backgroundColor: token.colorSuccess, fontSize: 9.5 }}
                  />
                  {down > 0 && (
                    <Badge
                      count={`${down} Down`}
                      style={{ backgroundColor: token.colorTextQuaternary, fontSize: 9.5 }}
                    />
                  )}
                  {noSignal > 0 && (
                    <Badge
                      count={`${noSignal} No Sig`}
                      style={{ backgroundColor: token.colorWarning, fontSize: 9.5 }}
                    />
                  )}
                  {reserved > 0 && (
                    <Badge
                      count={`${reserved} Rsv`}
                      style={{ backgroundColor: token.colorPrimary, fontSize: 9.5 }}
                    />
                  )}
                </Flex>
              </Flex>
            );
          },
        },
        {
          title: 'Status',
          key: 'status',
          width: 105,
          sorter: (a, b) =>
            (a.status || '').localeCompare(b.status || '') || a.id.localeCompare(b.id),
          render: (_: unknown, record: NetworkSwitch) => getStatusTag(record.status),
        },
        {
          title: 'MAC & Firmware',
          key: 'hardwareDetails',
          width: 150,
          render: (_: unknown, record: NetworkSwitch) => (
            <Flex vertical gap={1}>
              <Text code style={{ fontSize: 11 }}>
                {record.macAddress || '—'}
              </Text>
              <Text type="secondary" style={{ fontSize: 10.5 }}>
                FW: {record.firmwareVersion || '—'}
              </Text>
            </Flex>
          ),
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 150,
          render: (_: unknown, record: NetworkSwitch) => (
            <Space size="small">
              <Tooltip title="View Interactive Port Faceplate">
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<AppstoreOutlined />}
                  onClick={() => onViewFaceplate?.(record)}
                  data-testid={`view-faceplate-${record.name}`}
                  aria-label={`View Faceplate for ${record.name}`}
                >
                  Faceplate
                </Button>
              </Tooltip>

              {onEdit && (
                <Tooltip title="Edit Switch">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                    data-testid={`edit-switch-${record.name}`}
                    aria-label={`Edit Switch ${record.name}`}
                  />
                </Tooltip>
              )}

              {onDelete && (
                <Popconfirm
                  title="Delete Switch"
                  description={`Are you sure you want to delete switch "${record.name}"?`}
                  onConfirm={() => onDelete(record.id)}
                  okText="Delete"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Delete Switch">
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      data-testid={`delete-switch-${record.name}`}
                      aria-label={`Delete Switch ${record.name}`}
                    />
                  </Tooltip>
                </Popconfirm>
              )}
            </Space>
          ),
        },
      ],
      [onViewFaceplate, onEdit, onDelete, onSelectRack, token],
    );

    return (
      <Table<NetworkSwitch>
        dataSource={switches}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="middle"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} switches`,
        }}
      />
    );
  },
);

SwitchTable.displayName = 'SwitchTable';
