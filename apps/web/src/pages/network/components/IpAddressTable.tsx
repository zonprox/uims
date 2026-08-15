import {
  ApiOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  HddOutlined,
  LaptopOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useMemo } from 'react';
import type { IPAddress } from '../../../services/network.service';

const { Text } = Typography;
const { Option } = Select;

export interface IpAddressTableProps {
  ips: Array<IPAddress>;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  vlanFilter: string;
  onVlanChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  onResetFilters: () => void;
  onPingTest: (ip: string) => void;
  onOpenEditModal: (ip: IPAddress) => void;
  onDeleteIp: (id: string) => void;
}

export const IpAddressTable: React.FC<IpAddressTableProps> = React.memo(
  ({
    ips,
    loading,
    searchQuery,
    onSearchChange,
    vlanFilter,
    onVlanChange,
    statusFilter,
    onStatusChange,
    onResetFilters,
    onPingTest,
    onOpenEditModal,
    onDeleteIp,
  }) => {
    const isFiltered = searchQuery || vlanFilter !== 'all' || statusFilter !== 'all';

    const columns = useMemo(
      () => [
        {
          title: 'IP Address & Hostname',
          dataIndex: 'ip',
          key: 'ip',
          render: (ip: string, record: IPAddress) => (
            <div>
              <Text code strong style={{ fontSize: 13, color: '#1677ff' }}>
                {ip}
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>
                {record.hostname}
              </Text>
            </div>
          ),
        },
        {
          title: 'MAC & Hardware Vendor',
          key: 'hardware',
          render: (_: unknown, record: IPAddress) => (
            <div>
              <Text code style={{ fontSize: 11.5 }}>
                {record.mac}
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                {record.vendor}
              </Text>
            </div>
          ),
        },
        {
          title: 'Subnet & VLAN',
          key: 'network',
          render: (_: unknown, record: IPAddress) => (
            <div>
              <Tag color="blue" style={{ fontSize: 11 }}>
                {record.subnet}
              </Tag>
              <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                {record.vlan}
              </Text>
            </div>
          ),
        },
        {
          title: 'Device Type',
          dataIndex: 'deviceType',
          key: 'deviceType',
          render: (deviceType: string) => {
            let icon = <LaptopOutlined />;
            if (deviceType === 'Server') icon = <HddOutlined />;
            if (deviceType === 'Switch') icon = <CloudServerOutlined />;
            if (deviceType === 'Access Point') icon = <WifiOutlined />;
            return (
              <Flex align="center" gap={4}>
                {icon}
                <Text style={{ fontSize: 12 }}>{deviceType}</Text>
              </Flex>
            );
          },
        },
        {
          title: 'ICMP & Status',
          key: 'status',
          render: (_: unknown, record: IPAddress) => (
            <div>
              <Badge
                status={record.pingStatus === 'online' ? 'success' : 'error'}
                text={
                  <Text strong style={{ fontSize: 12 }}>
                    {record.status}
                  </Text>
                }
              />
              <Text type="secondary" style={{ display: 'block', fontSize: 10.5 }}>
                {record.lastSeen}
              </Text>
            </div>
          ),
        },
        {
          title: 'Actions',
          key: 'actions',
          render: (_: unknown, record: IPAddress) => (
            <Space size="small">
              <Tooltip title="Send ICMP Ping Packet">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<ApiOutlined />}
                  onClick={() => onPingTest(record.ip)}
                />
              </Tooltip>
              <Tooltip title="Edit Allocation">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onOpenEditModal(record)}
                />
              </Tooltip>
              <Popconfirm
                title="Release this IP address?"
                description="Remove static reservation and return IP to DHCP pool?"
                onConfirm={() => onDeleteIp(record.id)}
                okText="Release"
                okType="danger"
              >
                <Tooltip title="Release">
                  <Button type="text" shape="circle" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </Space>
          ),
        },
      ],
      [onPingTest, onOpenEditModal, onDeleteIp],
    );

    return (
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Search by IP, hostname, MAC address, vendor..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={vlanFilter}
                onChange={onVlanChange}
                style={{ width: 170 }}
                placeholder="VLAN"
              >
                <Option value="all">All VLANs</Option>
                <Option value="Servers">VLAN 10 (Servers)</Option>
                <Option value="Workstations">VLAN 20 (Workstations)</Option>
                <Option value="Wi-Fi">VLAN 30 (Wi-Fi APs)</Option>
                <Option value="VLAN 50">VLAN 50 (IoT & Cams)</Option>
              </Select>

              <Select
                value={statusFilter}
                onChange={onStatusChange}
                style={{ width: 140 }}
                placeholder="Status"
              >
                <Option value="all">All Status</Option>
                <Option value="Allocated">Allocated</Option>
                <Option value="Reserved">Reserved</Option>
              </Select>

              {isFiltered && <Button onClick={onResetFilters}>Reset</Button>}
            </Flex>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={ips}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} IPs` }}
        />
      </Card>
    );
  },
);

IpAddressTable.displayName = 'IpAddressTable';
