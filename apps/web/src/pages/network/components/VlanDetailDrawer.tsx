import {
  ApartmentOutlined,
  CloudServerOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Flex,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useMemo } from 'react';
import type { Subnet, VLAN } from '../../../services/network.service';

const { Text, Title } = Typography;

export interface VlanDetailDrawerProps {
  open: boolean;
  vlan: VLAN | null;
  subnets: Subnet[];
  onClose: () => void;
  onFilterSubnetsByVlan?: (vlanId: string) => void;
  onFilterIpsByVlan?: (vlanId: string) => void;
}

export const VlanDetailDrawer: React.FC<VlanDetailDrawerProps> = React.memo(
  ({ open, vlan, subnets, onClose, onFilterSubnetsByVlan, onFilterIpsByVlan }) => {
    const associatedSubnets = useMemo(() => {
      if (!vlan) return [];
      return subnets.filter((s) => s.vlanId === vlan.id || (s.vlan && s.vlan.id === vlan.id));
    }, [vlan, subnets]);

    const totalIpsInVlan = useMemo(
      () => associatedSubnets.reduce((sum, s) => sum + (s.totalIps || 0), 0),
      [associatedSubnets],
    );

    const usedIpsInVlan = useMemo(
      () => associatedSubnets.reduce((sum, s) => sum + (s.usedIps || 0), 0),
      [associatedSubnets],
    );

    const overallUtilization =
      totalIpsInVlan > 0 ? Math.round((usedIpsInVlan / totalIpsInVlan) * 100) : 0;

    const subnetColumns = [
      {
        title: 'CIDR Block',
        dataIndex: 'cidr',
        key: 'cidr',
        render: (cidr: string) => (
          <Text code strong style={{ color: '#1677ff' }}>
            {cidr}
          </Text>
        ),
      },
      {
        title: 'Subnet Name',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'Gateway',
        dataIndex: 'gateway',
        key: 'gateway',
        render: (gw: string) => gw || '-',
      },
      {
        title: 'IP Capacity',
        key: 'capacity',
        render: (_: unknown, record: Subnet) => {
          const pct =
            record.totalIps > 0 ? Math.round((record.usedIps / record.totalIps) * 100) : 0;
          return (
            <div style={{ minWidth: 100 }}>
              <Flex justify="space-between" style={{ fontSize: 11 }}>
                <Text>
                  {record.usedIps} / {record.totalIps}
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
    ];

    if (!vlan) return null;

    return (
      <Drawer
        title={
          <Flex align="center" gap={10}>
            <ApartmentOutlined style={{ fontSize: 20, color: '#722ed1' }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>
                VLAN {vlan.vlanNumber} — {vlan.name}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Network Segregation Profile
              </Text>
            </div>
          </Flex>
        }
        open={open}
        onClose={onClose}
        size="large"
        styles={{ body: { padding: '20px 24px' } }}
        extra={
          <Space>
            {onFilterSubnetsByVlan && (
              <Button
                size="small"
                icon={<CloudServerOutlined />}
                onClick={() => {
                  onFilterSubnetsByVlan(vlan.id);
                  onClose();
                }}
              >
                View Subnets
              </Button>
            )}
            {onFilterIpsByVlan && (
              <Button
                size="small"
                type="primary"
                icon={<GlobalOutlined />}
                onClick={() => {
                  onFilterIpsByVlan(vlan.id);
                  onClose();
                }}
              >
                View IPs
              </Button>
            )}
          </Space>
        }
      >
        <Card size="small" styles={{ body: { padding: '14px 16px' } }} style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="VLAN ID">
              <Tag color="purple" style={{ fontWeight: 600 }}>
                VLAN {vlan.vlanNumber}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Badge
                status={
                  vlan.status === 'ACTIVE'
                    ? 'success'
                    : vlan.status === 'RESERVED'
                      ? 'warning'
                      : 'default'
                }
                text={vlan.status}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Location / Site" span={2}>
              <Flex align="center" gap={6}>
                <EnvironmentOutlined style={{ color: '#1677ff' }} />
                <Text strong>{vlan.location?.name || 'Unassigned / Global'}</Text>
                {vlan.location?.city && <Tag>{vlan.location.city}</Tag>}
              </Flex>
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              <Text>{vlan.description || 'No operational description provided.'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          size="small"
          title="IP Utilization & Pool Capacity"
          styles={{ body: { padding: '14px 16px' } }}
          style={{ marginBottom: 16 }}
        >
          <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
            <Text strong>Allocated vs Total Capacity</Text>
            <Text>
              {usedIpsInVlan} / {totalIpsInVlan} IPs ({overallUtilization}%)
            </Text>
          </Flex>
          <Progress
            percent={overallUtilization}
            strokeColor={
              overallUtilization > 85 ? '#ef4444' : overallUtilization > 60 ? '#f59e0b' : '#10b981'
            }
          />
        </Card>

        <Divider style={{ margin: '16px 0' }} />

        <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0 }}>
            Associated Subnets ({associatedSubnets.length})
          </Title>
        </Flex>

        {associatedSubnets.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No subnets currently mapped to this VLAN"
          />
        ) : (
          <Table
            columns={subnetColumns}
            dataSource={associatedSubnets}
            rowKey="id"
            size="small"
            pagination={false}
          />
        )}
      </Drawer>
    );
  },
);

VlanDetailDrawer.displayName = 'VlanDetailDrawer';
