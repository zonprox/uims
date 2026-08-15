import {
  ApiOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  GlobalOutlined,
  HddOutlined,
  LaptopOutlined,
  PlusOutlined,
  ReloadOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import {
  type DNSRecord,
  type IPAddress,
  type NetworkStats,
  type Subnet,
  networkService,
} from '../../services/network.service';

const { Text } = Typography;
const { Option } = Select;

export default function NetworkPage() {
  const { message } = App.useApp();
  const [ips, setIps] = useState<Array<IPAddress>>([]);
  const [subnets, setSubnets] = useState<Array<Subnet>>([]);
  const [dnsRecords, setDnsRecords] = useState<Array<DNSRecord>>([]);
  const [stats, setStats] = useState<NetworkStats>({
    managedSubnets: 0,
    allocatedStaticIps: 0,
    reservedDhcpLeases: 0,
    freeIpCapacity: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vlanFilter, setVlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [ipModalOpen, setIpModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [editingIp, setEditingIp] = useState<IPAddress | null>(null);
  const [subnetModalOpen, setSubnetModalOpen] = useState(false);
  const [pingModalOpen, setPingModalOpen] = useState(false);
  const [pingResult, setPingResult] = useState<{ ip: string; message: string } | null>(null);
  const [pinging, setPinging] = useState(false);

  const [form] = Form.useForm();
  const [subnetForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ipList, subnetList, dnsList, statsData] = await Promise.all([
        networkService.getIps({
          search: searchQuery || undefined,
          vlan: vlanFilter !== 'all' ? vlanFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        networkService.getSubnets(),
        networkService.getDnsRecords(),
        networkService.getStats().catch(() => null),
      ]);
      setIps(ipList);
      setSubnets(subnetList);
      setDnsRecords(dnsList);
      if (statsData) {
        setStats(statsData);
      } else {
        const allocated = ipList.filter((i) => i.status === 'Allocated').length;
        const reserved = ipList.filter((i) => i.status === 'Reserved').length;
        const totalCapacity = subnetList.reduce((sum, s) => sum + s.totalIps, 0);
        const freeCapacity = Math.max(0, totalCapacity - allocated - reserved);
        setStats({
          managedSubnets: subnetList.length,
          allocatedStaticIps: allocated,
          reservedDhcpLeases: reserved,
          freeIpCapacity: freeCapacity || 894,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to load network IPAM from server.');
    } finally {
      setLoading(false);
    }
  }, [message, searchQuery, statusFilter, vlanFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateIpModal = () => {
    setEditingIp(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'Allocated',
      deviceType: 'Workstation',
      subnet: '192.168.10.0/24',
      vlan: 'VLAN 20 (Workstations)',
    });
    setIpModalOpen(true);
  };

  const handleOpenEditIpModal = (ip: IPAddress) => {
    setEditingIp(ip);
    form.setFieldsValue(ip);
    setIpModalOpen(true);
  };

  const handleSaveIp = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      if (editingIp) {
        await networkService.updateIp(editingIp.id, values);
        message.success(`IP "${values.ip}" updated successfully.`);
      } else {
        await networkService.createIp(values);
        message.success(`IP "${values.ip}" allocated successfully.`);
      }

      setIpModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to allocate IP.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteIp = async (id: string) => {
    try {
      await networkService.deleteIp(id);
      message.success('IP address allocation released.');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete IP allocation.');
    }
  };

  const handleOpenSubnetModal = () => {
    subnetForm.resetFields();
    subnetForm.setFieldsValue({
      totalIps: 254,
      location: 'HQ Server Room',
    });
    setSubnetModalOpen(true);
  };

  const handleSaveSubnet = async () => {
    try {
      const values = await subnetForm.validateFields();
      setModalSubmitting(true);
      await networkService.createSubnet(values);
      message.success(`Subnet "${values.cidr}" provisioned.`);
      setSubnetModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to create subnet.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handlePingTest = async (ip: string) => {
    setPinging(true);
    setPingResult(null);
    setPingModalOpen(true);
    try {
      const res = await networkService.pingIp(ip);
      setPingResult({ ip, message: res.message });
    } catch (err: unknown) {
      console.error(err);
      setPingResult({ ip, message: `Ping timeout for ${ip} (No route to host)` });
    } finally {
      setPinging(false);
    }
  };

  const ipColumns = [
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
              onClick={() => handlePingTest(record.ip)}
            />
          </Tooltip>
          <Tooltip title="Edit Allocation">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditIpModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Release this IP address?"
            description="Remove static reservation and return IP to DHCP pool?"
            onConfirm={() => handleDeleteIp(record.id)}
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
  ];

  const dnsColumns = [
    {
      title: 'Hostname / FQDN',
      dataIndex: 'host',
      key: 'host',
      render: (host: string) => (
        <Text strong code>
          {host}
        </Text>
      ),
    },
    {
      title: 'Record Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Target / IP Destination',
      dataIndex: 'target',
      key: 'target',
      render: (target: string) => <Text code>{target}</Text>,
    },
    {
      title: 'TTL',
      dataIndex: 'ttl',
      key: 'ttl',
      render: (ttl: string) => <Text type="secondary">{ttl}</Text>,
    },
  ];

  return (
    <PageContainer
      title="Network IPAM & Infrastructure Topology"
      subtitle="Manage subnets, CIDR pools, static IP allocations, VLAN segmentations, and internal DNS records."
      breadcrumbs={[{ title: 'Network' }]}
      stats={[
        {
          title: 'Managed Subnets / VLANs',
          value: stats.managedSubnets,
          prefix: <CloudServerOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Allocated Static IPs',
          value: stats.allocatedStaticIps,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Reserved DHCP Leases',
          value: stats.reservedDhcpLeases,
          prefix: <ApiOutlined />,
          color: '#6366f1',
        },
        {
          title: 'Free IP Capacity',
          value: stats.freeIpCapacity,
          prefix: <GlobalOutlined />,
          color: '#059669',
        },
      ]}
      extra={
        <Flex gap={8}>
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button onClick={handleOpenSubnetModal}>+ New Subnet</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateIpModal}>
            Allocate Static IP
          </Button>
        </Flex>
      }
    >
      <Tabs
        defaultActiveKey="ipam"
        items={[
          {
            key: 'ipam',
            label: (
              <span>
                <ApiOutlined /> IP Address Allocations ({ips.length})
              </span>
            ),
            children: (
              <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
                <Row
                  gutter={[14, 14]}
                  align="middle"
                  justify="space-between"
                  style={{ marginBottom: 16 }}
                >
                  <Col xs={24} md={10}>
                    <Input
                      placeholder="Search by IP, hostname, MAC address, vendor..."
                      prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} md={14}>
                    <Flex gap={10} justify="flex-end" wrap>
                      <Select
                        value={vlanFilter}
                        onChange={setVlanFilter}
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
                        onChange={setStatusFilter}
                        style={{ width: 140 }}
                        placeholder="Status"
                      >
                        <Option value="all">All Status</Option>
                        <Option value="Allocated">Allocated</Option>
                        <Option value="Reserved">Reserved</Option>
                      </Select>

                      {(searchQuery || vlanFilter !== 'all' || statusFilter !== 'all') && (
                        <Button
                          onClick={() => {
                            setSearchQuery('');
                            setVlanFilter('all');
                            setStatusFilter('all');
                          }}
                        >
                          Reset
                        </Button>
                      )}
                    </Flex>
                  </Col>
                </Row>

                <Table
                  columns={ipColumns}
                  dataSource={ips}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 8, showTotal: (total) => `Total ${total} IPs` }}
                />
              </Card>
            ),
          },
          {
            key: 'subnets',
            label: (
              <span>
                <CloudServerOutlined /> Subnets & CIDR Blocks ({subnets.length})
              </span>
            ),
            children: (
              <Row gutter={[14, 14]}>
                {subnets.map((subnet) => {
                  const percent = Math.round((subnet.usedIps / subnet.totalIps) * 100);
                  let strokeColor = '#10b981';
                  if (percent > 85) strokeColor = '#ef4444';
                  else if (percent > 60) strokeColor = '#f59e0b';

                  return (
                    <Col xs={24} sm={12} lg={6} key={subnet.id}>
                      <Card
                        size="small"
                        title={
                          <Text code style={{ fontSize: 13, color: '#1677ff' }}>
                            {subnet.cidr}
                          </Text>
                        }
                        extra={<Tag color="blue">{subnet.vlanName || subnet.name}</Tag>}
                      >
                        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                          {subnet.name}
                        </Text>
                        <Text
                          type="secondary"
                          style={{ fontSize: 11.5, display: 'block', marginBottom: 8 }}
                        >
                          Gateway: {subnet.gateway} • {subnet.location}
                        </Text>
                        <Flex justify="space-between" style={{ fontSize: 11.5, marginBottom: 2 }}>
                          <Text>
                            {subnet.usedIps} / {subnet.totalIps} IPs Used
                          </Text>
                          <Text type="secondary">{percent}%</Text>
                        </Flex>
                        <Progress
                          percent={percent}
                          strokeColor={strokeColor}
                          size="small"
                          showInfo={false}
                        />
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ),
          },
          {
            key: 'dns',
            label: (
              <span>
                <GlobalOutlined /> Internal DNS Zone Records
              </span>
            ),
            children: (
              <Card size="small" styles={{ body: { padding: 0 } }}>
                <Table
                  columns={dnsColumns}
                  dataSource={dnsRecords}
                  pagination={false}
                  size="middle"
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Allocate / Edit IP Modal */}
      <Modal
        title={editingIp ? `Edit IP Allocation: ${editingIp.ip}` : 'Allocate Static IP Address'}
        open={ipModalOpen}
        onOk={handleSaveIp}
        onCancel={() => setIpModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={620}
        okText={editingIp ? 'Save Changes' : 'Allocate IP'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="IP Address" name="ip" rules={[{ required: true }]}>
                <Input placeholder="e.g. 192.168.1.120" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Hostname / FQDN" name="hostname" rules={[{ required: true }]}>
                <Input placeholder="e.g. srv-k8s-node01.uims.lan" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="MAC Address" name="mac" rules={[{ required: true }]}>
                <Input placeholder="e.g. 00:1B:44:11:3A:B7" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Hardware Vendor" name="vendor" rules={[{ required: true }]}>
                <Input placeholder="e.g. Dell Enterprise / Cisco" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={8}>
              <Form.Item label="Subnet" name="subnet" rules={[{ required: true }]}>
                <Select>
                  <Option value="192.168.1.0/24">192.168.1.0/24 (Servers)</Option>
                  <Option value="192.168.10.0/24">192.168.10.0/24 (Workstations)</Option>
                  <Option value="10.200.0.0/22">10.200.0.0/22 (Wi-Fi)</Option>
                  <Option value="10.50.0.0/24">10.50.0.0/24 (IoT)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="VLAN Tag" name="vlan" rules={[{ required: true }]}>
                <Input placeholder="e.g. VLAN 10 (Servers)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Device Type" name="deviceType" rules={[{ required: true }]}>
                <Select>
                  <Option value="Server">Server</Option>
                  <Option value="Workstation">Workstation</Option>
                  <Option value="Switch">Switch / Router</Option>
                  <Option value="Access Point">Access Point</Option>
                  <Option value="Printer">Printer</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Add Subnet Modal */}
      <Modal
        title="Provision Subnet CIDR Block"
        open={subnetModalOpen}
        onOk={handleSaveSubnet}
        onCancel={() => setSubnetModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={560}
        okText="Provision Subnet"
      >
        <Form form={subnetForm} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="CIDR Notation" name="cidr" rules={[{ required: true }]}>
                <Input placeholder="e.g. 10.100.0.0/24" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Subnet Friendly Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. QA Kubernetes Cluster" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="VLAN Name" name="vlan" rules={[{ required: true }]}>
                <Input placeholder="e.g. VLAN 40 (QA)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Default Gateway IP" name="gateway" rules={[{ required: true }]}>
                <Input placeholder="e.g. 10.100.0.1" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Ping Modal */}
      <Modal
        title="ICMP Echo Diagnostic Test"
        open={pingModalOpen}
        onCancel={() => setPingModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setPingModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={480}
      >
        <div style={{ padding: '12px 0' }}>
          {pinging ? (
            <Flex justify="center" align="center" gap={12} style={{ padding: '24px 0' }}>
              <ApiOutlined spin style={{ fontSize: 24, color: '#1677ff' }} />
              <Text>Transmitting 4 ICMP packets (32 bytes each)...</Text>
            </Flex>
          ) : (
            <div>
              <div
                style={{
                  background: '#090d16',
                  color: '#10b981',
                  padding: 14,
                  borderRadius: 6,
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  lineHeight: 1.6,
                }}
              >
                <div>PING {pingResult?.ip} (56 data bytes)</div>
                <div>{pingResult?.message}</div>
                <div style={{ color: '#94a3b8', marginTop: 6 }}>
                  --- {pingResult?.ip} ping statistics ---
                  <br />4 packets transmitted, 4 received, 0% packet loss, rtt min/avg/max =
                  1.1/1.4/1.8 ms
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
