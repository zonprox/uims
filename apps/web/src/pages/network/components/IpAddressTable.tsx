import {
  CameraOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  HddOutlined,
  IdcardOutlined,
  KeyOutlined,
  LaptopOutlined,
  LinkOutlined,
  PrinterOutlined,
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
import type { LocationBranch } from '../../../services/organization.service';
import type { IPAddress, Subnet, VLAN } from '../../../services/network.service';

const { Text } = Typography;
const { Option } = Select;

export interface IpAddressTableProps {
  ips: Array<IPAddress>;
  subnets: Array<Subnet>;
  vlans: Array<VLAN>;
  locations: Array<LocationBranch>;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  siteFilter: string;
  onSiteChange: (val: string) => void;
  vlanFilter: string;
  onVlanChange: (val: string) => void;
  subnetFilter: string;
  onSubnetChange: (val: string) => void;
  deviceTypeFilter: string;
  onDeviceTypeChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  onResetFilters: () => void;
  onOpenEditModal: (ip: IPAddress) => void;
  onRevealCredential?: (ip: IPAddress) => void;
  onDeleteIp: (id: string) => void;
}

export const IpAddressTable: React.FC<IpAddressTableProps> = React.memo(
  ({
    ips,
    subnets,
    vlans,
    locations,
    loading,
    searchQuery,
    onSearchChange,
    siteFilter,
    onSiteChange,
    vlanFilter,
    onVlanChange,
    subnetFilter,
    onSubnetChange,
    deviceTypeFilter,
    onDeviceTypeChange,
    statusFilter,
    onStatusChange,
    onResetFilters,
    onOpenEditModal,
    onRevealCredential,
    onDeleteIp,
  }) => {
    const isFiltered =
      searchQuery ||
      siteFilter !== 'all' ||
      vlanFilter !== 'all' ||
      subnetFilter !== 'all' ||
      deviceTypeFilter !== 'all' ||
      statusFilter !== 'all';

    const filteredIps = useMemo(() => {
      return ips.filter((ip) => {
        const ipAddr = ip.address || ip.ip || '';
        const host = ip.hostname || '';
        const mac = ip.macAddress || ip.mac || '';
        const vendor = ip.vendor || '';
        const model = ip.model || '';
        const assetTag = ip.asset?.assetTag || '';

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches =
            ipAddr.toLowerCase().includes(q) ||
            host.toLowerCase().includes(q) ||
            mac.toLowerCase().includes(q) ||
            vendor.toLowerCase().includes(q) ||
            model.toLowerCase().includes(q) ||
            assetTag.toLowerCase().includes(q);
          if (!matches) return false;
        }

        if (siteFilter !== 'all') {
          if (ip.locationId !== siteFilter) return false;
        }

        if (vlanFilter !== 'all') {
          if (ip.vlanId !== vlanFilter && ip.vlan?.id !== vlanFilter) return false;
        }

        if (subnetFilter !== 'all') {
          const matchSubnet =
            ip.subnetId === subnetFilter ||
            ip.subnet?.id === subnetFilter ||
            ip.subnet?.cidr === subnetFilter ||
            ip.subnetName === subnetFilter;
          if (!matchSubnet) return false;
        }

        if (deviceTypeFilter !== 'all') {
          if ((ip.deviceType || '').toLowerCase() !== deviceTypeFilter.toLowerCase()) return false;
        }

        if (statusFilter !== 'all') {
          const s = (ip.status || '').toUpperCase();
          const target = statusFilter.toUpperCase();
          if (s !== target && !s.includes(target) && !target.includes(s)) return false;
        }

        return true;
      });
    }, [ips, searchQuery, siteFilter, vlanFilter, subnetFilter, deviceTypeFilter, statusFilter]);

    const columns = useMemo(
      () => [
        {
          title: 'IP Address & Hostname',
          key: 'ipHostname',
          sorter: (a: IPAddress, b: IPAddress) =>
            (a.address || a.ip || '').localeCompare(b.address || b.ip || '', undefined, {
              numeric: true,
            }),
          render: (_: unknown, record: IPAddress) => {
            const ipStr = record.address || record.ip;
            return (
              <div>
                <Text code strong style={{ fontSize: 13, color: '#1677ff' }} copyable>
                  {ipStr}
                </Text>
                <Text
                  strong
                  style={{ display: 'block', fontSize: 12, color: '#1f2937', marginTop: 2 }}
                >
                  {record.hostname || 'unnamed-host'}
                </Text>
              </div>
            );
          },
        },
        {
          title: 'MAC Address & Vendor',
          key: 'hardware',
          render: (_: unknown, record: IPAddress) => {
            const macStr = record.macAddress || record.mac;
            return (
              <div>
                {macStr ? (
                  <Text code style={{ fontSize: 11.5 }}>
                    {macStr}
                  </Text>
                ) : (
                  <Text type="secondary">—</Text>
                )}
                {record.vendor && (
                  <div>
                    <Tag color="geekblue" style={{ fontSize: 10.5, marginTop: 2 }}>
                      {record.vendor}
                    </Tag>
                  </div>
                )}
              </div>
            );
          },
        },
        {
          title: 'Device Type & Model',
          key: 'device',
          sorter: (a: IPAddress, b: IPAddress) =>
            (a.deviceType || '').localeCompare(b.deviceType || ''),
          render: (_: unknown, record: IPAddress) => {
            const type = record.deviceType || 'Workstation';
            let icon = <LaptopOutlined />;
            if (type === 'Server') icon = <HddOutlined />;
            if (type === 'Switch' || type === 'Router') icon = <CloudServerOutlined />;
            if (type === 'Access Point') icon = <WifiOutlined />;
            if (type === 'Printer') icon = <PrinterOutlined />;
            if (type === 'Camera' || type === 'NVR') icon = <CameraOutlined />;
            if (type === 'Time Attendance' || type === 'Access Control') icon = <IdcardOutlined />;

            return (
              <div>
                <Flex align="center" gap={4}>
                  {icon}
                  <Text style={{ fontSize: 12 }}>{type}</Text>
                </Flex>
                {record.model && (
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                    {record.model}
                  </Text>
                )}
              </div>
            );
          },
        },
        {
          title: 'Subnet & VLAN',
          key: 'network',
          render: (_: unknown, record: IPAddress) => {
            const subnetDisplay = record.subnet?.cidr || record.subnetName || '';
            const vlanDisplay = record.vlan
              ? `VLAN ${record.vlan.vlanNumber}`
              : record.vlanName || '';
            return (
              <div>
                {subnetDisplay && (
                  <Tag color="blue" style={{ fontSize: 11, marginBottom: 2 }}>
                    {subnetDisplay}
                  </Tag>
                )}
                {vlanDisplay && (
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                    {vlanDisplay}
                  </Text>
                )}
              </div>
            );
          },
        },
        {
          title: 'Location & Section',
          key: 'location',
          render: (_: unknown, record: IPAddress) => {
            const loc = record.location?.name;
            return (
              <div>
                {loc ? (
                  <Flex align="center" gap={4}>
                    <EnvironmentOutlined style={{ color: '#1677ff', fontSize: 11 }} />
                    <Text style={{ fontSize: 11.5 }}>{loc}</Text>
                  </Flex>
                ) : (
                  <Text type="secondary">—</Text>
                )}
                {record.section && (
                  <Text type="secondary" style={{ display: 'block', fontSize: 10.5 }}>
                    {record.section}
                  </Text>
                )}
              </div>
            );
          },
        },
        {
          title: 'Linked Asset & Custodian',
          key: 'assetCustodian',
          render: (_: unknown, record: IPAddress) => {
            const asset = record.asset;
            const user = record.assignedUser;
            const tagStr =
              asset?.assetTag || (asset as unknown as { tag?: string } | undefined)?.tag;
            return (
              <div>
                {asset && tagStr ? (
                  <Tooltip title={`Asset: ${asset.name} (${tagStr})`}>
                    <Tag icon={<LinkOutlined />} color="cyan" style={{ fontSize: 11 }}>
                      {tagStr}
                    </Tag>
                  </Tooltip>
                ) : null}
                {user ? (
                  <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                    {user.firstName} {user.lastName}
                  </Text>
                ) : !asset ? (
                  <Text type="secondary">—</Text>
                ) : null}
              </div>
            );
          },
        },
        {
          title: 'Status',
          key: 'status',
          sorter: (a: IPAddress, b: IPAddress) => String(a.status).localeCompare(String(b.status)),
          render: (_: unknown, record: IPAddress) => {
            const statusStr = String(record.status).toUpperCase();
            const isAssigned = statusStr === 'ASSIGNED';
            const isReserved = statusStr === 'RESERVED';
            const lastSeenDisplay = record.lastSeen
              ? record.lastSeen instanceof Date
                ? record.lastSeen.toLocaleDateString()
                : String(record.lastSeen)
              : 'Real-time';
            return (
              <div>
                <Badge
                  status={isAssigned ? 'processing' : isReserved ? 'warning' : 'default'}
                  text={
                    <Text strong style={{ fontSize: 12 }}>
                      {record.status}
                    </Text>
                  }
                />
                <Text type="secondary" style={{ display: 'block', fontSize: 10.5 }}>
                  {lastSeenDisplay}
                </Text>
              </div>
            );
          },
        },
        {
          title: 'Actions',
          key: 'actions',
          width: 140,
          render: (_: unknown, record: IPAddress) => {
            const ipVal = record.address || record.ip || '';
            const hasCredential = Boolean(record.credentialId || record.credential);
            return (
              <Space size="small">
                <Tooltip title="Edit Allocation">
                  <Button
                    type="text"
                    shape="circle"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onOpenEditModal(record)}
                  />
                </Tooltip>
                {onRevealCredential && hasCredential && (
                  <Tooltip title="Reveal Admin Credential">
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      icon={<KeyOutlined style={{ color: '#fa8c16' }} />}
                      onClick={() => onRevealCredential(record)}
                    />
                  </Tooltip>
                )}
                <Popconfirm
                  title="Release IP address?"
                  description={`Release ${ipVal} and return it to the available subnet pool?`}
                  onConfirm={() => onDeleteIp(record.id)}
                  okText="Release"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Release">
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
            );
          },
        },
      ],
      [onOpenEditModal, onRevealCredential, onDeleteIp],
    );

    return (
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} lg={7}>
            <Input
              placeholder="Search by IP, hostname, MAC, vendor, model, asset tag..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} lg={17}>
            <Flex gap={8} justify="flex-end" wrap align="center">
              <Select
                value={siteFilter}
                onChange={onSiteChange}
                style={{ width: 140 }}
                placeholder="Site / Location"
              >
                <Option value="all">All Sites</Option>
                {locations.map((loc) => (
                  <Option key={loc.id} value={loc.id}>
                    {loc.name}
                  </Option>
                ))}
              </Select>

              <Select
                value={vlanFilter}
                onChange={onVlanChange}
                style={{ width: 150 }}
                placeholder="VLAN"
              >
                <Option value="all">All VLANs</Option>
                {vlans.map((vlan) => (
                  <Option key={vlan.id} value={vlan.id}>
                    VLAN {vlan.vlanNumber} ({vlan.name})
                  </Option>
                ))}
              </Select>

              <Select
                value={subnetFilter}
                onChange={onSubnetChange}
                style={{ width: 160 }}
                placeholder="Subnet"
              >
                <Option value="all">All Subnets</Option>
                {subnets.map((sub) => (
                  <Option key={sub.id} value={sub.id}>
                    {sub.cidr}
                  </Option>
                ))}
              </Select>

              <Select
                value={deviceTypeFilter}
                onChange={onDeviceTypeChange}
                style={{ width: 130 }}
                placeholder="Device Type"
              >
                <Option value="all">All Devices</Option>
                <Option value="Server">Server</Option>
                <Option value="Workstation">Workstation</Option>
                <Option value="Switch">Switch</Option>
                <Option value="Router">Router</Option>
                <Option value="Access Point">Wireless AP</Option>
                <Option value="Printer">Printer</Option>
                <Option value="Camera">Camera / CCTV</Option>
                <Option value="NVR">NVR</Option>
                <Option value="Time Attendance">Time Attendance</Option>
                <Option value="Access Control">Access Control</Option>
              </Select>

              <Select
                value={statusFilter}
                onChange={onStatusChange}
                style={{ width: 120 }}
                placeholder="Status"
              >
                <Option value="all">All Status</Option>
                <Option value="ASSIGNED">Assigned</Option>
                <Option value="RESERVED">Reserved</Option>
                <Option value="AVAILABLE">Available</Option>
              </Select>

              {isFiltered && <Button onClick={onResetFilters}>Reset</Button>}
            </Flex>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredIps}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `Total ${total} IPs`,
          }}
        />
      </Card>
    );
  },
);

IpAddressTable.displayName = 'IpAddressTable';
