import {
  ApartmentOutlined,
  ApiOutlined,
  CloudServerOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Flex,
  Input,
  Radio,
  Space,
  Spin,
  Table,
  Tag,
  theme,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Asset } from '../../../services/assets.service';
import type { LocationBranch } from '../../../services/organization.service';
import type {
  IPAddress,
  NetworkSwitch,
  Subnet,
  SwitchPort,
  SwitchRole,
  SwitchStatus,
  VLAN,
} from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { PortConfigDrawer } from './PortConfigDrawer';
import { SwitchPortFaceplate, getPortStatusInfo } from './SwitchPortFaceplate';

const { Text, Title } = Typography;

export interface SwitchFaceplateDrawerProps {
  open: boolean;
  switchEntity: NetworkSwitch | null;
  onClose: () => void;
  onEditSwitch?: (switchEntity: NetworkSwitch) => void;
  onSelectRack?: (rackId: string) => void;
  locations?: Array<LocationBranch>;
  vlans?: Array<VLAN>;
  subnets?: Array<Subnet>;
  ips?: Array<IPAddress>;
  assets?: Array<Asset>;
}

export const SwitchFaceplateDrawer: React.FC<SwitchFaceplateDrawerProps> = React.memo(
  ({
    open,
    switchEntity,
    onClose,
    onEditSwitch,
    onSelectRack,
    locations: _locations = [],
    vlans = [],
    subnets = [],
    ips = [],
    assets = [],
  }) => {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [ports, setPorts] = useState<Array<SwitchPort>>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);
    const [portDrawerOpen, setPortDrawerOpen] = useState(false);
    const [portSearch, setPortSearch] = useState('');
    const [portFilterStatus, setPortFilterStatus] = useState<string>('all');

    // Fetch switch ports from backend API
    const loadPorts = useCallback(async () => {
      if (!switchEntity) return;
      setLoading(true);
      try {
        const portList = await networkService.getSwitchPorts(switchEntity.id);
        setPorts(portList || []);
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, `load ports for ${switchEntity.name}`));
      } finally {
        setLoading(false);
      }
    }, [switchEntity, message]);

    useEffect(() => {
      if (open && switchEntity) {
        loadPorts();
      } else {
        setPorts([]);
        setSelectedPort(null);
        setPortDrawerOpen(false);
      }
    }, [open, switchEntity, loadPorts]);

    const handleSelectPort = (port: SwitchPort) => {
      setSelectedPort(port);
      setPortDrawerOpen(true);
    };

    const handlePortUpdated = (updatedPort: SwitchPort) => {
      setPorts((prev) => prev.map((p) => (p.id === updatedPort.id ? updatedPort : p)));
      if (selectedPort?.id === updatedPort.id) {
        setSelectedPort(updatedPort);
      }
    };

    // Filter ports for the sub-table
    const filteredPorts = useMemo(() => {
      return ports.filter((p) => {
        const matchesSearch =
          !portSearch ||
          p.name.toLowerCase().includes(portSearch.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(portSearch.toLowerCase())) ||
          (p.vlan?.name && p.vlan.name.toLowerCase().includes(portSearch.toLowerCase())) ||
          (p.connectedAsset?.name &&
            p.connectedAsset.name.toLowerCase().includes(portSearch.toLowerCase())) ||
          (p.ipAddress?.address && p.ipAddress.address.includes(portSearch));

        const statusInfo = getPortStatusInfo(p);
        const matchesStatus = portFilterStatus === 'all' || statusInfo.status === portFilterStatus;

        return matchesSearch && matchesStatus;
      });
    }, [ports, portSearch, portFilterStatus]);

    const getRoleTag = (role: SwitchRole | `${SwitchRole}` | undefined) => {
      switch (role) {
        case 'CORE':
          return <Tag color="purple">Core</Tag>;
        case 'DISTRIBUTION':
          return <Tag color="geekblue">Distribution</Tag>;
        case 'ACCESS':
          return <Tag color="blue">Access</Tag>;
        case 'TOR':
          return <Tag color="cyan">Top of Rack (ToR)</Tag>;
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

    const portColumns: ColumnsType<SwitchPort> = useMemo(
      () => [
        {
          title: 'Port',
          key: 'portName',
          width: 90,
          sorter: (a, b) => a.portNumber - b.portNumber || a.id.localeCompare(b.id),
          render: (_: unknown, record: SwitchPort) => {
            const statusInfo = getPortStatusInfo(record);
            return (
              <Flex align="center" gap={6}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: statusInfo.color,
                    boxShadow: statusInfo.glow,
                  }}
                />
                <Text code strong style={{ fontSize: 12 }}>
                  {record.name}
                </Text>
              </Flex>
            );
          },
        },
        {
          title: 'Link Status',
          key: 'status',
          width: 140,
          render: (_: unknown, record: SwitchPort) => {
            const statusInfo = getPortStatusInfo(record);
            return (
              <Tag
                color={
                  statusInfo.status === 'ACTIVE'
                    ? 'success'
                    : statusInfo.status === 'CONNECTED_NO_SIGNAL'
                      ? 'warning'
                      : statusInfo.status === 'RESERVED'
                        ? 'blue'
                        : 'default'
                }
              >
                {statusInfo.label}
              </Tag>
            );
          },
        },
        {
          title: 'Type & Speed',
          key: 'type',
          width: 130,
          render: (_: unknown, record: SwitchPort) => (
            <Flex vertical gap={1}>
              <Text style={{ fontSize: 12 }}>{record.formFactor}</Text>
              <Text type="secondary" style={{ fontSize: 10.5 }}>
                {record.speed || 'Auto'} · {record.duplex || 'Full'}
              </Text>
            </Flex>
          ),
        },
        {
          title: 'Mode & VLAN',
          key: 'vlan',
          width: 150,
          render: (_: unknown, record: SwitchPort) => (
            <Flex vertical gap={2}>
              <Flex align="center" gap={4}>
                <Tag
                  color={record.mode === 'TRUNK' ? 'geekblue' : 'purple'}
                  style={{ fontSize: 10, margin: 0 }}
                >
                  {record.mode || 'ACCESS'}
                </Tag>
                {record.vlan?.vlanNumber && (
                  <Text code style={{ fontSize: 11 }}>
                    VLAN {record.vlan.vlanNumber}
                  </Text>
                )}
              </Flex>
              {record.vlan?.name && (
                <Text type="secondary" style={{ fontSize: 10.5 }}>
                  {record.vlan.name}
                </Text>
              )}
            </Flex>
          ),
        },
        {
          title: 'Connected Asset',
          key: 'asset',
          render: (_: unknown, record: SwitchPort) =>
            record.connectedAsset ? (
              <Flex vertical gap={1}>
                <Text strong style={{ fontSize: 12 }}>
                  {record.connectedAsset.name || record.connectedAsset.model}
                </Text>
                <Tag color="cyan" style={{ width: 'fit-content', fontSize: 10 }}>
                  {record.connectedAsset.assetTag}
                </Tag>
              </Flex>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                —
              </Text>
            ),
        },
        {
          title: 'Linked IP',
          key: 'ip',
          width: 130,
          render: (_: unknown, record: SwitchPort) =>
            record.ipAddress ? (
              <Text code style={{ fontSize: 11.5, color: token.colorPrimary }}>
                {record.ipAddress.address}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                —
              </Text>
            ),
        },
        {
          title: 'Action',
          key: 'action',
          width: 80,
          render: (_: unknown, record: SwitchPort) => (
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleSelectPort(record)}
              data-testid={`configure-port-table-${record.portNumber}`}
            />
          ),
        },
      ],
      [token],
    );

    return (
      <Drawer
        title={
          <Flex align="center" justify="space-between" style={{ width: '100%', paddingRight: 24 }}>
            <Flex align="center" gap={10}>
              <CloudServerOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
              <Title level={4} style={{ margin: 0 }}>
                {switchEntity?.name || 'Network Switch'}
              </Title>
              {switchEntity && getStatusTag(switchEntity.status)}
              {switchEntity && getRoleTag(switchEntity.role)}
            </Flex>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadPorts} loading={loading}>
                Refresh
              </Button>
              {onEditSwitch && switchEntity && (
                <Button icon={<EditOutlined />} onClick={() => onEditSwitch(switchEntity)}>
                  Edit Switch
                </Button>
              )}
            </Space>
          </Flex>
        }
        open={open}
        onClose={onClose}
        size={980}
        destroyOnHidden
        styles={{ body: { padding: '20px 24px', backgroundColor: token.colorBgLayout } }}
      >
        <Flex vertical gap={16}>
          {/* Switch Hardware Metadata Summary Card */}
          {switchEntity && (
            <Card styles={{ body: { padding: '16px 20px' } }}>
              <Descriptions size="small" column={{ xxl: 4, xl: 4, lg: 3, md: 2, sm: 1, xs: 1 }}>
                <Descriptions.Item label="Vendor / Make">
                  <Tag color="blue">{switchEntity.vendor}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hardware Model">
                  <Text strong>{switchEntity.model}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Serial Number">
                  <Text code>{switchEntity.serialNumber || '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="MAC Address">
                  <Text code>{switchEntity.macAddress || '—'}</Text>
                </Descriptions.Item>

                <Descriptions.Item label="Management IP">
                  {switchEntity.ipAddress ? (
                    <Tag icon={<ApiOutlined />} color="geekblue">
                      {switchEntity.ipAddress.address}
                    </Tag>
                  ) : (
                    <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Firmware Version">
                  <Text>{switchEntity.firmwareVersion || '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Rack Enclosure">
                  {switchEntity.rack ? (
                    <Flex align="center" gap={4}>
                      <Tag
                        icon={<ApartmentOutlined />}
                        color="purple"
                        style={{ cursor: onSelectRack ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (switchEntity.rack?.id && onSelectRack) {
                            onSelectRack(switchEntity.rack.id);
                          }
                        }}
                      >
                        {switchEntity.rack.code || switchEntity.rack.name}
                      </Tag>
                      {switchEntity.rackPosition && (
                        <Text strong style={{ fontSize: 11.5 }}>
                          U{switchEntity.rackPosition} ({switchEntity.rackHeight || 1}U)
                        </Text>
                      )}
                    </Flex>
                  ) : (
                    <Text type="secondary">Unmounted</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Location">
                  {switchEntity.location?.name ? (
                    <Flex align="center" gap={4}>
                      <EnvironmentOutlined style={{ color: token.colorTextQuaternary }} />
                      <Text>{switchEntity.location.name}</Text>
                    </Flex>
                  ) : (
                    <Text type="secondary">—</Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Interactive Visual Faceplate Section */}
          <Card
            title={
              <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                <Flex align="center" gap={8}>
                  <Title level={5} style={{ margin: 0 }}>
                    Physical Front Panel Faceplate
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Click any port to inspect or edit configuration
                  </Text>
                </Flex>
                {loading && <Spin size="small" />}
              </Flex>
            }
            styles={{ body: { padding: '16px' } }}
          >
            <SwitchPortFaceplate
              switchEntity={switchEntity}
              ports={ports}
              selectedPortId={selectedPort?.id}
              onSelectPort={handleSelectPort}
              loading={loading}
            />
          </Card>

          {/* Port Matrix & Searchable Sub-Table */}
          <Card
            title={
              <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                <Flex align="center" gap={8}>
                  <Title level={5} style={{ margin: 0 }}>
                    Port Matrix & Endpoint Directory
                  </Title>
                  <Tag color="cyan">{filteredPorts.length} Ports</Tag>
                </Flex>
                <Flex align="center" gap={8}>
                  <Input.Search
                    placeholder="Search ports, VLAN, IP, asset..."
                    allowClear
                    size="small"
                    style={{ width: 220 }}
                    value={portSearch}
                    onChange={(e) => setPortSearch(e.target.value)}
                  />
                  <Radio.Group
                    size="small"
                    value={portFilterStatus}
                    onChange={(e) => setPortFilterStatus(e.target.value)}
                  >
                    <Radio.Button value="all">All</Radio.Button>
                    <Radio.Button value="ACTIVE">Active</Radio.Button>
                    <Radio.Button value="DOWN">Down</Radio.Button>
                    <Radio.Button value="CONNECTED_NO_SIGNAL">No Signal</Radio.Button>
                  </Radio.Group>
                </Flex>
              </Flex>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table<SwitchPort>
              dataSource={filteredPorts}
              columns={portColumns}
              rowKey="id"
              size="small"
              pagination={{
                pageSize: 12,
                showSizeChanger: true,
                pageSizeOptions: ['12', '24', '48'],
              }}
            />
          </Card>
        </Flex>

        {/* Port Configuration Drawer (Nested) */}
        <PortConfigDrawer
          open={portDrawerOpen}
          port={selectedPort}
          switchEntity={switchEntity}
          vlans={vlans}
          subnets={subnets}
          ips={ips}
          assets={assets}
          onClose={() => setPortDrawerOpen(false)}
          onPortUpdated={handlePortUpdated}
        />
      </Drawer>
    );
  },
);

SwitchFaceplateDrawer.displayName = 'SwitchFaceplateDrawer';
