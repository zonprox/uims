import {
  ApartmentOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  EnvironmentOutlined,
  EyeOutlined,
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
import type { Subnet, SwitchPort, VLAN } from '../../../services/network.service';

const { Text, Title } = Typography;

export interface VlanDetailDrawerProps {
  open: boolean;
  vlan: VLAN | null;
  subnets: Subnet[];
  switchPorts?: SwitchPort[];
  ports?: SwitchPort[];
  onClose: () => void;
  onFilterSubnetsByVlan?: (vlanId: string) => void;
  onFilterIpsByVlan?: (vlanId: string) => void;
  onViewPort?: (switchId: string, portId: string) => void;
  onSelectSwitchPort?: (switchId: string, portId: string) => void;
}

export const VlanDetailDrawer: React.FC<VlanDetailDrawerProps> = React.memo(
  ({
    open,
    vlan,
    subnets,
    switchPorts,
    ports,
    onClose,
    onFilterSubnetsByVlan,
    onFilterIpsByVlan,
    onViewPort,
    onSelectSwitchPort,
  }) => {
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

    const associatedPorts = useMemo(() => {
      if (!vlan) return [];
      if (switchPorts || ports) {
        const pool = switchPorts || ports || [];
        return pool.filter((p) => {
          if (p.vlanId === vlan.id || p.vlan?.id === vlan.id) return true;
          if (String(p.vlanId) === String(vlan.vlanNumber)) return true;
          if (Array.isArray(p.taggedVlanIds)) {
            const taggedList: Array<string | number> = p.taggedVlanIds as Array<string | number>;
            return taggedList.some(
              (id) => String(id) === String(vlan.id) || String(id) === String(vlan.vlanNumber),
            );
          }
          return false;
        });
      }
      return vlan.switchPorts || [];
    }, [vlan, switchPorts, ports]);

    const switchPortColumns = useMemo(
      () => [
        {
          title: 'Switch Name & Vendor',
          key: 'switch',
          render: (_: unknown, record: SwitchPort) => {
            const switchName =
              record.switch?.name ||
              (record as unknown as { switchName?: string }).switchName ||
              'Switch';
            const vendor =
              record.switch?.vendor || (record as unknown as { vendor?: string }).vendor;
            return (
              <div>
                <Flex align="center" gap={4}>
                  <ClusterOutlined style={{ color: '#1677ff', fontSize: 12 }} />
                  <Text strong style={{ fontSize: 12 }}>
                    {switchName}
                  </Text>
                </Flex>
                {vendor && (
                  <Tag color="geekblue" style={{ fontSize: 10.5, marginTop: 2 }}>
                    {vendor}
                  </Tag>
                )}
              </div>
            );
          },
        },
        {
          title: 'Rack / Location',
          key: 'rackLocation',
          render: (_: unknown, record: SwitchPort) => {
            const rackName =
              record.switch?.rack?.name ||
              (record as unknown as { rackName?: string }).rackName ||
              record.switch?.location?.name ||
              '—';
            const rackPos = record.switch?.rackPosition;
            return (
              <div>
                <Flex align="center" gap={4}>
                  <EnvironmentOutlined style={{ color: '#1677ff', fontSize: 11 }} />
                  <Text style={{ fontSize: 12 }}>{rackName}</Text>
                </Flex>
                {rackPos != null && (
                  <Text type="secondary" style={{ display: 'block', fontSize: 10.5 }}>
                    Slot U{rackPos}
                  </Text>
                )}
              </div>
            );
          },
        },
        {
          title: 'Port Name',
          key: 'portName',
          render: (_: unknown, record: SwitchPort) => (
            <Text code strong style={{ fontSize: 12 }}>
              {record.name || `Port ${record.portNumber}`}
            </Text>
          ),
        },
        {
          title: 'Form Factor',
          key: 'formFactor',
          render: (_: unknown, record: SwitchPort) => {
            const raw = record.formFactor || 'RJ45_1G';
            const formatted = raw.replace('_', ' ').replace('PLUS', '+');
            return <Tag style={{ fontSize: 11 }}>{formatted}</Tag>;
          },
        },
        {
          title: 'Mode',
          key: 'mode',
          render: (_: unknown, record: SwitchPort) => {
            const mode = String(record.mode || 'ACCESS').toUpperCase();
            return (
              <Tag color={mode === 'ACCESS' ? 'purple' : 'geekblue'} style={{ fontSize: 11 }}>
                {mode}
              </Tag>
            );
          },
        },
        {
          title: 'Link Status',
          key: 'linkStatus',
          render: (_: unknown, record: SwitchPort) => {
            const oper = String(record.operStatus || 'DOWN').toUpperCase();
            let badgeStatus: 'success' | 'warning' | 'processing' | 'default' = 'default';
            let label = 'Down';
            if (oper === 'ACTIVE' || oper === 'UP') {
              badgeStatus = 'success';
              label = 'Active / Up';
            } else if (oper === 'CONNECTED_NO_SIGNAL') {
              badgeStatus = 'warning';
              label = 'Connected No Signal';
            } else if (oper === 'RESERVED') {
              badgeStatus = 'processing';
              label = 'Reserved';
            }
            return (
              <Badge status={badgeStatus} text={<span style={{ fontSize: 11.5 }}>{label}</span>} />
            );
          },
        },
        {
          title: 'Connected Endpoint',
          key: 'connectedEndpoint',
          render: (_: unknown, record: SwitchPort) => {
            const asset = record.connectedAsset;
            const endpoint = (record as unknown as { connectedEndpoint?: string })
              .connectedEndpoint;
            const ip = record.ipAddress?.address;
            if (asset) {
              return (
                <Tag color="cyan" style={{ fontSize: 11 }}>
                  {asset.assetTag ? `[${asset.assetTag}] ` : ''}
                  {asset.name}
                </Tag>
              );
            }
            if (endpoint) {
              return <Text style={{ fontSize: 11.5 }}>{endpoint}</Text>;
            }
            if (ip) {
              return (
                <Text code style={{ fontSize: 11 }}>
                  {ip}
                </Text>
              );
            }
            return <Text type="secondary">—</Text>;
          },
        },
        {
          title: 'Action',
          key: 'actions',
          render: (_: unknown, record: SwitchPort) => {
            const switchId = record.switchId || record.switch?.id || '';
            const portId = record.id;
            return (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  onViewPort?.(switchId, portId);
                  onSelectSwitchPort?.(switchId, portId);
                }}
              >
                View Port
              </Button>
            );
          },
        },
      ],
      [onViewPort, onSelectSwitchPort],
    );

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
        destroyOnHidden
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

        <Divider style={{ margin: '16px 0' }} />

        <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0 }}>
            Associated Switch Ports ({associatedPorts.length})
          </Title>
        </Flex>

        {associatedPorts.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No switch ports currently assigned to this VLAN"
          />
        ) : (
          <Table
            columns={switchPortColumns}
            dataSource={associatedPorts}
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
