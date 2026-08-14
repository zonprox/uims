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
  SafetyCertificateOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
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
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export interface IPAddress {
  id: string;
  ip: string;
  hostname: string;
  mac: string;
  vendor: string;
  subnet: string;
  vlan: string;
  deviceType: 'Server' | 'Workstation' | 'Switch' | 'Access Point' | 'Printer';
  status: 'Allocated' | 'Reserved' | 'Available';
  pingStatus: 'online' | 'offline' | 'warning';
  lastSeen: string;
}

export interface Subnet {
  id: string;
  cidr: string;
  name: string;
  vlan: string;
  gateway: string;
  totalIps: number;
  usedIps: number;
  location: string;
}

const INITIAL_IPS: IPAddress[] = [
  {
    id: '1',
    ip: '192.168.1.10',
    hostname: 'ny-dc-srv01.uims.lan',
    mac: '00:1B:44:11:3A:B7',
    vendor: 'Dell Enterprise',
    subnet: '192.168.1.0/24',
    vlan: 'VLAN 10 (Servers)',
    deviceType: 'Server',
    status: 'Allocated',
    pingStatus: 'online',
    lastSeen: '1 min ago (2ms)',
  },
  {
    id: '2',
    ip: '192.168.1.1',
    hostname: 'ny-core-gw01.uims.lan',
    mac: 'F0:5C:19:88:22:91',
    vendor: 'Cisco Systems',
    subnet: '192.168.1.0/24',
    vlan: 'VLAN 10 (Servers)',
    deviceType: 'Switch',
    status: 'Allocated',
    pingStatus: 'online',
    lastSeen: 'Real-time (0.4ms)',
  },
  {
    id: '3',
    ip: '192.168.10.45',
    hostname: 'macbook-marcus.uims.lan',
    mac: '9C:64:8B:2A:41:09',
    vendor: 'Apple Inc',
    subnet: '192.168.10.0/24',
    vlan: 'VLAN 20 (Workstations)',
    deviceType: 'Workstation',
    status: 'Allocated',
    pingStatus: 'online',
    lastSeen: '5 mins ago (8ms)',
  },
  {
    id: '4',
    ip: '192.168.10.150',
    hostname: 'ap-floor4-east.uims.lan',
    mac: '74:83:C2:55:61:FA',
    vendor: 'Ubiquiti UniFi',
    subnet: '192.168.10.0/24',
    vlan: 'VLAN 30 (Wi-Fi APs)',
    deviceType: 'Access Point',
    status: 'Allocated',
    pingStatus: 'online',
    lastSeen: 'Just now (1.2ms)',
  },
  {
    id: '5',
    ip: '192.168.1.50',
    hostname: 'backup-nas01.uims.lan',
    mac: '00:11:32:8A:4F:72',
    vendor: 'Synology NAS',
    subnet: '192.168.1.0/24',
    vlan: 'VLAN 10 (Servers)',
    deviceType: 'Server',
    status: 'Reserved',
    pingStatus: 'offline',
    lastSeen: 'Standby mode',
  },
];

const INITIAL_SUBNETS: Subnet[] = [
  {
    id: 's1',
    cidr: '192.168.1.0/24',
    name: 'NY Data Center & Core Servers',
    vlan: 'VLAN 10',
    gateway: '192.168.1.1',
    totalIps: 254,
    usedIps: 184,
    location: 'NY Floor 4',
  },
  {
    id: 's2',
    cidr: '192.168.10.0/24',
    name: 'HQ Employee Wired Workstations',
    vlan: 'VLAN 20',
    gateway: '192.168.10.1',
    totalIps: 254,
    usedIps: 212,
    location: 'NY Floor 4',
  },
  {
    id: 's3',
    cidr: '10.200.0.0/22',
    name: 'Corporate Wi-Fi DHCP Pool',
    vlan: 'VLAN 30',
    gateway: '10.200.0.1',
    totalIps: 1022,
    usedIps: 420,
    location: 'Global',
  },
  {
    id: 's4',
    cidr: '10.50.0.0/24',
    name: 'IoT, Badge Scanners & Security Cams',
    vlan: 'VLAN 50',
    gateway: '10.50.0.1',
    totalIps: 254,
    usedIps: 68,
    location: 'NY Facilities',
  },
];

export default function NetworkPage() {
  const { message } = App.useApp();
  const [ips, setIps] = useState<IPAddress[]>(INITIAL_IPS);
  const [subnets, setSubnets] = useState<Subnet[]>(INITIAL_SUBNETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [vlanFilter, setVlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('ipam');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIp, setEditingIp] = useState<IPAddress | null>(null);
  const [subnetModalOpen, setSubnetModalOpen] = useState(false);

  const [form] = Form.useForm();
  const [subnetForm] = Form.useForm();

  // Metrics
  const totalAllocatedIps = ips.filter((i) => i.status === 'Allocated').length;
  const totalReservedIps = ips.filter((i) => i.status === 'Reserved').length;

  const filteredIps = ips.filter((item) => {
    const matchesSearch =
      item.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.mac.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVlan = vlanFilter === 'all' || item.vlan.includes(vlanFilter);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesVlan && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setEditingIp(null);
    form.resetFields();
    form.setFieldsValue({
      ip: '192.168.1.120',
      subnet: '192.168.1.0/24',
      vlan: 'VLAN 10 (Servers)',
      deviceType: 'Server',
      status: 'Allocated',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (ipRecord: IPAddress) => {
    setEditingIp(ipRecord);
    form.setFieldsValue(ipRecord);
    setModalOpen(true);
  };

  const handleSaveIp = async () => {
    try {
      const values = await form.validateFields();
      const formattedIp: IPAddress = {
        id: editingIp ? editingIp.id : String(Date.now()),
        ip: values.ip,
        hostname: values.hostname,
        mac: values.mac,
        vendor: values.vendor || 'Generic Device',
        subnet: values.subnet,
        vlan: values.vlan,
        deviceType: values.deviceType,
        status: values.status,
        pingStatus: 'online',
        lastSeen: 'Just assigned (0.8ms)',
      };

      if (editingIp) {
        setIps((prev) => prev.map((i) => (i.id === editingIp.id ? formattedIp : i)));
        message.success(`IP assignment for "${formattedIp.ip}" updated.`);
      } else {
        setIps((prev) => [formattedIp, ...prev]);
        message.success(`IP address ${formattedIp.ip} allocated in IPAM.`);
      }

      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIp = (id: string) => {
    setIps((prev) => prev.filter((i) => i.id !== id));
    message.success('IP address unassigned and returned to free pool.');
  };

  const handlePingTest = (ip: string) => {
    message.loading(`ICMP Echo Ping to ${ip}...`, 1).then(() => {
      message.success(`Reply from ${ip}: bytes=32 time=1.4ms TTL=64 (100% reachable)`);
    });
  };

  const handleCreateSubnet = async () => {
    try {
      const values = await subnetForm.validateFields();
      const newSubnet: Subnet = {
        id: String(Date.now()),
        cidr: values.cidr,
        name: values.name,
        vlan: values.vlan,
        gateway: values.gateway,
        totalIps: values.totalIps || 254,
        usedIps: 1,
        location: values.location || 'HQ Server Room',
      };
      setSubnets((prev) => [newSubnet, ...prev]);
      message.success(`Subnet ${newSubnet.cidr} provisioned.`);
      setSubnetModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      title: 'IP Address & Ping',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip: string, record: IPAddress) => (
        <Flex align="center" gap={8}>
          <Badge
            status={
              record.pingStatus === 'online'
                ? 'success'
                : record.pingStatus === 'warning'
                  ? 'warning'
                  : 'default'
            }
          />
          <div>
            <Text code style={{ fontWeight: 700, fontSize: 13, color: '#1677ff' }}>
              {ip}
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {record.lastSeen}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Hostname & Device',
      dataIndex: 'hostname',
      key: 'hostname',
      render: (hostname: string, record: IPAddress) => {
        let icon = <HddOutlined />;
        if (record.deviceType === 'Server') icon = <CloudServerOutlined />;
        if (record.deviceType === 'Workstation') icon = <LaptopOutlined />;
        if (record.deviceType === 'Access Point') icon = <WifiOutlined />;
        return (
          <div>
            <Space>
              {icon}
              <Text strong style={{ fontSize: 13 }}>
                {hostname}
              </Text>
            </Space>
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {record.vendor} • {record.deviceType}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'MAC Hardware Address',
      dataIndex: 'mac',
      key: 'mac',
      render: (mac: string) => (
        <Text code style={{ fontSize: 12 }}>
          {mac}
        </Text>
      ),
    },
    {
      title: 'Subnet & VLAN',
      dataIndex: 'subnet',
      key: 'subnet',
      render: (subnet: string, record: IPAddress) => (
        <div>
          <Text style={{ fontSize: 13 }}>{subnet}</Text>
          <Tag color="geekblue" style={{ fontSize: 10, display: 'inline-block', marginTop: 2 }}>
            {record.vlan}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: IPAddress['status']) => {
        let color = 'success';
        if (status === 'Reserved') color = 'warning';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: IPAddress) => (
        <Space size="small">
          <Tooltip title="Send ICMP Ping">
            <Button size="small" icon={<ApiOutlined />} onClick={() => handlePingTest(record.ip)}>
              Ping
            </Button>
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              shape="circle"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Release this IP address?"
            description="The DNS PTR record will be cleaned up automatically."
            onConfirm={() => handleDeleteIp(record.id)}
            okText="Release"
            okType="danger"
          >
            <Tooltip title="Release">
              <Button type="text" shape="circle" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Network Infrastructure & IPAM"
      subtitle="IP Address Management (IPAM), Subnet CIDR visualizers, VLAN scopes, and DNS records."
      breadcrumbs={[{ title: 'Network' }]}
      stats={[
        {
          title: 'Managed Subnets',
          value: subnets.length,
          prefix: <GlobalOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Allocated Static IPs',
          value: totalAllocatedIps,
          prefix: <CheckCircleOutlined />,
          color: '#52c41a',
        },
        {
          title: 'Reserved DHCP Leases',
          value: totalReservedIps,
          prefix: <HddOutlined />,
          color: '#faad14',
        },
        { title: 'Total Free IP Capacity', value: 894, prefix: <ApiOutlined />, color: '#722ed1' },
      ]}
      extra={
        <Space>
          <Button icon={<GlobalOutlined />} onClick={() => setSubnetModalOpen(true)}>
            Add Subnet CIDR
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Allocate Static IP
          </Button>
        </Space>
      }
    >
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'ipam',
              label: (
                <Space>
                  <ApiOutlined />
                  <span>IP Address Management</span>
                </Space>
              ),
              children: (
                <div>
                  <Row
                    gutter={[16, 16]}
                    align="middle"
                    justify="space-between"
                    style={{ marginBottom: 16 }}
                  >
                    <Col xs={24} md={10}>
                      <Input
                        placeholder="Search IP, hostname, MAC address, vendor..."
                        prefix={<FilterOutlined style={{ color: '#8c8c8c' }} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                      />
                    </Col>
                    <Col xs={24} md={14}>
                      <Flex gap={12} justify="flex-end" wrap>
                        <Select
                          value={vlanFilter}
                          onChange={setVlanFilter}
                          style={{ width: 170 }}
                          placeholder="VLAN"
                        >
                          <Option value="all">All VLANs</Option>
                          <Option value="10">VLAN 10 (Servers)</Option>
                          <Option value="20">VLAN 20 (Workstations)</Option>
                          <Option value="30">VLAN 30 (Wi-Fi)</Option>
                        </Select>

                        <Select
                          value={statusFilter}
                          onChange={setStatusFilter}
                          style={{ width: 130 }}
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
                    columns={columns}
                    dataSource={filteredIps}
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                  />
                </div>
              ),
            },
            {
              key: 'subnets',
              label: (
                <Space>
                  <GlobalOutlined />
                  <span>Subnets & CIDR Blocks ({subnets.length})</span>
                </Space>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  {subnets.map((sub) => {
                    const percent = Math.round((sub.usedIps / sub.totalIps) * 100);
                    return (
                      <Col xs={24} sm={12} key={sub.cidr}>
                        <Card
                          size="small"
                          title={
                            <Flex justify="space-between" align="center">
                              <Text strong style={{ fontSize: 14 }}>
                                {sub.name}
                              </Text>
                              <Tag color="purple">{sub.vlan}</Tag>
                            </Flex>
                          }
                        >
                          <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
                            <Descriptions.Item label="Subnet CIDR">
                              <Text code strong>
                                {sub.cidr}
                              </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Default Gateway">
                              <Text code>{sub.gateway}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Location">{sub.location}</Descriptions.Item>
                          </Descriptions>

                          <Flex justify="space-between" style={{ fontSize: 12, marginBottom: 4 }}>
                            <span>IP Pool Usage:</span>
                            <Text strong>
                              {sub.usedIps} / {sub.totalIps} IPs ({percent}%)
                            </Text>
                          </Flex>
                          <Progress
                            percent={percent}
                            status={percent > 85 ? 'exception' : 'active'}
                            strokeColor={percent > 85 ? '#ff4d4f' : '#1677ff'}
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
                <Space>
                  <CloudServerOutlined />
                  <span>Internal DNS & Records</span>
                </Space>
              ),
              children: (
                <Table
                  pagination={false}
                  columns={[
                    {
                      title: 'DNS Record Host',
                      dataIndex: 'host',
                      key: 'host',
                      render: (t: string) => <Text strong>{t}</Text>,
                    },
                    {
                      title: 'Type',
                      dataIndex: 'type',
                      key: 'type',
                      render: (t: string) => <Tag color="blue">{t}</Tag>,
                    },
                    {
                      title: 'Target IP / Resolution',
                      dataIndex: 'target',
                      key: 'target',
                      render: (t: string) => <Text code>{t}</Text>,
                    },
                    { title: 'TTL', dataIndex: 'ttl', key: 'ttl' },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: () => <Badge status="success" text="Active" />,
                    },
                  ]}
                  dataSource={[
                    {
                      key: '1',
                      host: 'uims.internal',
                      type: 'A',
                      target: '192.168.1.10',
                      ttl: '300s',
                    },
                    {
                      key: '2',
                      host: 'api.uims.internal',
                      type: 'CNAME',
                      target: 'uims.internal',
                      ttl: '300s',
                    },
                    {
                      key: '3',
                      host: 'auth.uims.internal',
                      type: 'A',
                      target: '192.168.1.15',
                      ttl: '300s',
                    },
                    {
                      key: '4',
                      host: 'mail.company.com',
                      type: 'MX',
                      target: 'mail.protection.outlook.com',
                      ttl: '3600s',
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Allocate Static IP Modal */}
      <Modal
        title={editingIp ? `Edit IP: ${editingIp.ip}` : 'Allocate Static IP Address'}
        open={modalOpen}
        onOk={handleSaveIp}
        onCancel={() => setModalOpen(false)}
        width={640}
        okText={editingIp ? 'Save Changes' : 'Allocate IP'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="IP Address"
                name="ip"
                rules={[{ required: true, message: 'Valid IPv4 is required' }]}
              >
                <Input placeholder="e.g. 192.168.1.120" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Hostname (FQDN)" name="hostname" rules={[{ required: true }]}>
                <Input placeholder="e.g. server-db02.uims.lan" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="MAC Hardware Address" name="mac" rules={[{ required: true }]}>
                <Input placeholder="e.g. 00:1B:44:11:3A:B7" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Hardware Vendor / Manufacturer" name="vendor">
                <Input placeholder="e.g. Dell Enterprise / Apple" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
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
            <Col span={8}>
              <Form.Item label="Subnet" name="subnet" rules={[{ required: true }]}>
                <Select>
                  <Option value="192.168.1.0/24">192.168.1.0/24 (Servers)</Option>
                  <Option value="192.168.10.0/24">192.168.10.0/24 (Workstations)</Option>
                  <Option value="10.200.0.0/22">10.200.0.0/22 (Wi-Fi)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="VLAN Tag" name="vlan" rules={[{ required: true }]}>
                <Select>
                  <Option value="VLAN 10 (Servers)">VLAN 10 (Servers)</Option>
                  <Option value="VLAN 20 (Workstations)">VLAN 20 (Workstations)</Option>
                  <Option value="VLAN 30 (Wi-Fi APs)">VLAN 30 (Wi-Fi)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Allocation Status" name="status" rules={[{ required: true }]}>
            <Select>
              <Option value="Allocated">Allocated & In Production</Option>
              <Option value="Reserved">Reserved for Staging</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Subnet Modal */}
      <Modal
        title="Provision Subnet CIDR"
        open={subnetModalOpen}
        onOk={handleCreateSubnet}
        onCancel={() => setSubnetModalOpen(false)}
        okText="Create Subnet"
      >
        <Form
          form={subnetForm}
          layout="vertical"
          initialValues={{ totalIps: 254 }}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="Subnet Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. London Office VLAN" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="CIDR Block" name="cidr" rules={[{ required: true }]}>
                <Input placeholder="e.g. 192.168.40.0/24" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Default Gateway" name="gateway" rules={[{ required: true }]}>
                <Input placeholder="e.g. 192.168.40.1" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="VLAN Tag" name="vlan" rules={[{ required: true }]}>
                <Input placeholder="e.g. VLAN 40" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Location" name="location">
                <Input placeholder="e.g. London Hub Server Room" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </PageContainer>
  );
}
