import {
  CloudServerOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Flex,
  Progress,
  Row,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useMemo } from 'react';
import type { IPAddress, Subnet } from '../../../services/network.service';

const { Text, Title } = Typography;

export interface SubnetDetailDrawerProps {
  open: boolean;
  subnet: Subnet | null;
  ips: IPAddress[];
  onClose: () => void;
  onFilterIpsBySubnet?: (subnetId: string) => void;
}

export const SubnetDetailDrawer: React.FC<SubnetDetailDrawerProps> = React.memo(
  ({ open, subnet, ips, onClose, onFilterIpsBySubnet }) => {
    const subnetIps = useMemo(() => {
      if (!subnet) return [];
      return ips.filter(
        (ip) =>
          ip.subnetId === subnet.id ||
          ip.subnet?.cidr === subnet.cidr ||
          ip.subnetName === subnet.cidr,
      );
    }, [subnet, ips]);

    if (!subnet) return null;

    const total = subnet.totalIps || 254;
    const used = subnet.usedIps || subnetIps.length;
    const reserved = subnet.reservedIps || 0;
    const available = Math.max(0, total - used - reserved);
    const utilizationPct = total > 0 ? Math.round((used / total) * 100) : 0;

    const ipColumns = [
      {
        title: 'IP Address',
        dataIndex: 'address',
        key: 'address',
        render: (address: string, record: IPAddress) => (
          <Text code strong style={{ color: '#1677ff' }}>
            {address || record.ip}
          </Text>
        ),
      },
      {
        title: 'Hostname',
        dataIndex: 'hostname',
        key: 'hostname',
        render: (hostname: string) => hostname || '—',
      },
      {
        title: 'MAC Address & Vendor',
        key: 'hardware',
        render: (_: unknown, record: IPAddress) => (
          <div>
            <Text code style={{ fontSize: 11.5 }}>
              {record.macAddress || record.mac || '—'}
            </Text>
            {record.vendor && (
              <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                {record.vendor}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: 'Device Type',
        dataIndex: 'deviceType',
        key: 'deviceType',
        render: (type: string) => type || 'Workstation',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          let badgeStatus: 'success' | 'warning' | 'default' = 'default';
          if (status === 'ASSIGNED' || status === 'Allocated') badgeStatus = 'success';
          if (status === 'RESERVED' || status === 'Reserved') badgeStatus = 'warning';
          return <Badge status={badgeStatus} text={status} />;
        },
      },
    ];

    return (
      <Drawer
        title={
          <Flex align="center" gap={10}>
            <CloudServerOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {subnet.cidr} — {subnet.name}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                CIDR Specifications & IP Pool Capacity
              </Text>
            </div>
          </Flex>
        }
        open={open}
        onClose={onClose}
        size="large"
        styles={{ body: { padding: '20px 24px' } }}
        extra={
          onFilterIpsBySubnet && (
            <Button
              type="primary"
              size="small"
              icon={<GlobalOutlined />}
              onClick={() => {
                onFilterIpsBySubnet(subnet.id);
                onClose();
              }}
            >
              Filter in IP Allocations
            </Button>
          )
        }
      >
        {/* Technical CIDR Specifications Card */}
        <Card
          size="small"
          title={
            <Flex align="center" gap={6}>
              <ThunderboltOutlined style={{ color: '#fa8c16' }} />
              <span>Technical CIDR Parameters</span>
            </Flex>
          }
          styles={{ body: { padding: '14px 16px' } }}
          style={{ marginBottom: 16 }}
        >
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="CIDR Block">
              <Text code strong style={{ color: '#1677ff', fontSize: 13 }}>
                {subnet.cidr}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Subnet Mask">
              <Text code>{subnet.netmask || '255.255.255.0'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Network Address">
              <Text code>{subnet.networkAddress || '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Broadcast Address">
              <Text code>{subnet.broadcastAddress || '—'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Usable IP Range" span={2}>
              <Text code>
                {subnet.startIp && subnet.endIp
                  ? `${subnet.startIp} — ${subnet.endIp}`
                  : 'Derived from CIDR block'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Default Gateway">
              <Text code strong>
                {subnet.gateway || '—'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="VLAN Mapping">
              {subnet.vlan ? (
                <Tag color="purple">
                  VLAN {subnet.vlan.vlanNumber} ({subnet.vlan.name})
                </Tag>
              ) : subnet.vlanName ? (
                <Tag color="purple">{subnet.vlanName}</Tag>
              ) : (
                <Text type="secondary">Unassigned</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Location / Site" span={2}>
              <Flex align="center" gap={6}>
                <EnvironmentOutlined style={{ color: '#1677ff' }} />
                <Text strong>{subnet.location?.name || subnet.locationName || 'HQ'}</Text>
              </Flex>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 3-Segment IP Utilization Card */}
        <Card
          size="small"
          title="3-Segment IP Pool Allocation"
          styles={{ body: { padding: '14px 16px' } }}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16} style={{ marginBottom: 12 }}>
            <Col span={8}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  background: '#f0fdf4',
                  borderRadius: 6,
                }}
              >
                <Text strong style={{ fontSize: 16, color: '#15803d', display: 'block' }}>
                  {used}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Allocated IPs
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  background: '#fffbeb',
                  borderRadius: 6,
                }}
              >
                <Text strong style={{ fontSize: 16, color: '#b45309', display: 'block' }}>
                  {reserved}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Reserved IPs
                </Text>
              </div>
            </Col>
            <Col span={8}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  background: '#eff6ff',
                  borderRadius: 6,
                }}
              >
                <Text strong style={{ fontSize: 16, color: '#1d4ed8', display: 'block' }}>
                  {available}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Available IPs
                </Text>
              </div>
            </Col>
          </Row>

          <Flex justify="space-between" style={{ fontSize: 12, marginBottom: 4 }}>
            <Text strong>Overall Pool Utilization</Text>
            <Text>
              {utilizationPct}% ({used} / {total} Total Hosts)
            </Text>
          </Flex>
          <Progress
            percent={utilizationPct}
            strokeColor={
              utilizationPct > 85 ? '#ef4444' : utilizationPct > 60 ? '#f59e0b' : '#10b981'
            }
          />
        </Card>

        <Divider style={{ margin: '16px 0' }} />

        <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0 }}>
            Allocated IPs in this Subnet ({subnetIps.length})
          </Title>
        </Flex>

        {subnetIps.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No active IP address allocations recorded in this subnet."
          />
        ) : (
          <Table
            columns={ipColumns}
            dataSource={subnetIps}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 5, size: 'small' }}
          />
        )}
      </Drawer>
    );
  },
);

SubnetDetailDrawer.displayName = 'SubnetDetailDrawer';
