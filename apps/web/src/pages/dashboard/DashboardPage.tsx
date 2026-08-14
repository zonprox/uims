import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  CustomerServiceOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LaptopOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Segmented,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import PageContainer from '../../components/PageContainer';
import { useAuthStore } from '../../stores/auth.store';

const { Title, Text, Paragraph } = Typography;

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>('This Month');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const activityColumns = [
    {
      title: 'Actor',
      dataIndex: 'user',
      key: 'user',
      render: (text: string, record: any) => (
        <Flex align="center" gap={8}>
          <Avatar size="small" style={{ backgroundColor: record.avatarColor }}>
            {text[0]}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>
              {text}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.role}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        let color = 'blue';
        if (action === 'DELETED' || action === 'TERMINATED') color = 'error';
        if (action === 'RESOLVED' || action === 'PROVISIONED') color = 'success';
        if (action === 'WARNING') color = 'warning';
        return <Tag color={color}>{action}</Tag>;
      },
    },
    {
      title: 'Target Entity',
      dataIndex: 'entity',
      key: 'entity',
      render: (entity: string, record: any) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {entity}
          </Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
            {record.details}
          </Text>
        </div>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {time}
        </Text>
      ),
    },
  ];

  const recentActivityData = [
    {
      key: '1',
      user: 'Sarah Chen',
      role: 'IT Tech',
      avatarColor: '#1677ff',
      action: 'PROVISIONED',
      entity: 'MacBook Pro 16" (L-1082)',
      details: 'Assigned to Marcus Vance (Design Team)',
      time: '12 minutes ago',
    },
    {
      key: '2',
      user: 'Alex Johnson',
      role: 'Admin',
      avatarColor: '#52c41a',
      action: 'RESOLVED',
      entity: 'Ticket TKT-1044',
      details: 'Fixed VPN WireGuard routing gateway issue',
      time: '45 minutes ago',
    },
    {
      key: '3',
      user: 'System Engine',
      role: 'Automated Sync',
      avatarColor: '#722ed1',
      action: 'UPDATED',
      entity: 'Adobe CC Enterprise',
      details: 'Synchronized 18 active user seats with Entra ID',
      time: '2 hours ago',
    },
    {
      key: '4',
      user: 'Marcus Bell',
      role: 'Auditor',
      avatarColor: '#fa8c16',
      action: 'AUDITED',
      entity: 'SOC2 Access Logs',
      details: 'Exported quarterly security compliance report',
      time: '4 hours ago',
    },
  ];

  return (
    <PageContainer
      title={`Hello, ${user?.name || 'Administrator'} 👋`}
      subtitle="Here's a comprehensive real-time overview of your IT infrastructure and operations."
      tag={<Tag color="processing">System Status: Optimal</Tag>}
      extra={
        <Flex gap={8} align="center">
          <Segmented
            options={['Today', 'This Week', 'This Month', 'Quarter']}
            value={period}
            onChange={(val) => setPeriod(val as string)}
          />
          <Tooltip title="Refresh metrics">
            <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} />
          </Tooltip>
        </Flex>
      }
    >
      {/* Alert Banner for pending tasks */}
      <Alert
        message="System Maintenance Window Scheduled"
        description="Core Switch Firmware update will occur this Saturday at 02:00 AM UTC. Estimated downtime: 15 minutes."
        type="info"
        showIcon
        closable
        style={{ marginBottom: 20, borderRadius: 8 }}
      />

      {/* KPI Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Total Assets */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="uims-stat-card" size="small" styles={{ body: { padding: 18 } }}>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Total Managed Assets
                </Text>
                <Title level={3} style={{ margin: '4px 0 6px 0', fontWeight: 700 }}>
                  1,248
                </Title>
                <Flex align="center" gap={4}>
                  <Tag color="success" icon={<ArrowUpOutlined />} style={{ margin: 0 }}>
                    8.4% MoM
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    1,180 active
                  </Text>
                </Flex>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'rgba(22, 119, 255, 0.1)',
                  color: '#1677ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <LaptopOutlined />
              </div>
            </Flex>
          </Card>
        </Col>

        {/* License Utilization */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="uims-stat-card" size="small" styles={{ body: { padding: 18 } }}>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Active Software Licenses
                </Text>
                <Title level={3} style={{ margin: '4px 0 6px 0', fontWeight: 700 }}>
                  86
                </Title>
                <Flex align="center" gap={4}>
                  <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
                    88.5% Seat Usage
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    (3 expiring)
                  </Text>
                </Flex>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'rgba(82, 196, 26, 0.1)',
                  color: '#52c41a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <SafetyCertificateOutlined />
              </div>
            </Flex>
          </Card>
        </Col>

        {/* Open Tickets */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="uims-stat-card" size="small" styles={{ body: { padding: 18 } }}>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Open Helpdesk Tickets
                </Text>
                <Title level={3} style={{ margin: '4px 0 6px 0', fontWeight: 700 }}>
                  14
                </Title>
                <Flex align="center" gap={4}>
                  <Tag color="error" style={{ margin: 0 }}>
                    3 Urgent
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    96% SLA Met
                  </Text>
                </Flex>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'rgba(250, 173, 20, 0.12)',
                  color: '#faad14',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <CustomerServiceOutlined />
              </div>
            </Flex>
          </Card>
        </Col>

        {/* Network & IP Usage */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="uims-stat-card" size="small" styles={{ body: { padding: 18 } }}>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Network IP Allocation
                </Text>
                <Title level={3} style={{ margin: '4px 0 6px 0', fontWeight: 700 }}>
                  428 / 512
                </Title>
                <Flex align="center" gap={4}>
                  <Progress percent={83.6} size="small" style={{ width: 100 }} showInfo={false} />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    84 free
                  </Text>
                </Flex>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: 'rgba(114, 46, 209, 0.1)',
                  color: '#722ed1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <GlobalOutlined />
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Middle Grid: Infrastructure Status & Quick Hub */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Left: Infrastructure Health */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <CloudServerOutlined style={{ color: '#1677ff' }} />
                <span>Infrastructure & Directory Health</span>
              </Flex>
            }
            extra={<Tag color="success">99.98% Healthy</Tag>}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div
                  style={{
                    padding: 14,
                    border: '1px solid rgba(140, 140, 140, 0.12)',
                    borderRadius: 8,
                  }}
                >
                  <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                    <Text strong>Active Directory / LDAP</Text>
                    <Badge status="success" text="Synced" />
                  </Flex>
                  <Progress percent={99.4} status="active" strokeColor="#52c41a" size="small" />
                  <Flex
                    justify="space-between"
                    style={{ marginTop: 6, fontSize: 11, color: '#8c8c8c' }}
                  >
                    <span>892 Directory Users</span>
                    <span>Sync: 4m ago</span>
                  </Flex>
                </div>
              </Col>

              <Col xs={24} sm={12}>
                <div
                  style={{
                    padding: 14,
                    border: '1px solid rgba(140, 140, 140, 0.12)',
                    borderRadius: 8,
                  }}
                >
                  <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                    <Text strong>Mail Exchange & Routing</Text>
                    <Badge status="success" text="Operational" />
                  </Flex>
                  <Progress percent={94.2} strokeColor="#1677ff" size="small" />
                  <Flex
                    justify="space-between"
                    style={{ marginTop: 6, fontSize: 11, color: '#8c8c8c' }}
                  >
                    <span>2.4k Msgs/Hour</span>
                    <span>Latency: 14ms</span>
                  </Flex>
                </div>
              </Col>

              <Col xs={24} sm={12}>
                <div
                  style={{
                    padding: 14,
                    border: '1px solid rgba(140, 140, 140, 0.12)',
                    borderRadius: 8,
                  }}
                >
                  <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                    <Text strong>VPN & Zero Trust Gateways</Text>
                    <Badge status="processing" text="Active" />
                  </Flex>
                  <Progress percent={76.0} strokeColor="#722ed1" size="small" />
                  <Flex
                    justify="space-between"
                    style={{ marginTop: 6, fontSize: 11, color: '#8c8c8c' }}
                  >
                    <span>342 Connected Tunnels</span>
                    <span>Load: Normal</span>
                  </Flex>
                </div>
              </Col>

              <Col xs={24} sm={12}>
                <div
                  style={{
                    padding: 14,
                    border: '1px solid rgba(140, 140, 140, 0.12)',
                    borderRadius: 8,
                  }}
                >
                  <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                    <Text strong>Automated Daily Backups</Text>
                    <Badge status="success" text="Verified" />
                  </Flex>
                  <Progress percent={100} status="success" size="small" />
                  <Flex
                    justify="space-between"
                    style={{ marginTop: 6, fontSize: 11, color: '#8c8c8c' }}
                  >
                    <span>Snapshots: Complete</span>
                    <span>Next: 02:00 UTC</span>
                  </Flex>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Right: Quick Action Hub */}
        <Col xs={24} lg={8}>
          <Card title="Quick Action Center">
            <Flex vertical gap={10}>
              <Button
                type="primary"
                icon={<LaptopOutlined />}
                block
                style={{ height: 40, textAlign: 'left', display: 'flex', alignItems: 'center' }}
                onClick={() => navigate('/assets')}
              >
                Provision New IT Asset
              </Button>
              <Button
                icon={<SafetyCertificateOutlined />}
                block
                style={{ height: 40, textAlign: 'left', display: 'flex', alignItems: 'center' }}
                onClick={() => navigate('/licenses')}
              >
                Assign Software License
              </Button>
              <Button
                icon={<CustomerServiceOutlined />}
                block
                style={{ height: 40, textAlign: 'left', display: 'flex', alignItems: 'center' }}
                onClick={() => navigate('/tickets')}
              >
                Open Support Ticket
              </Button>
              <Button
                icon={<TeamOutlined />}
                block
                style={{ height: 40, textAlign: 'left', display: 'flex', alignItems: 'center' }}
                onClick={() => navigate('/directory')}
              >
                Onboard Employee / User
              </Button>
              <Button
                icon={<GlobalOutlined />}
                block
                style={{ height: 40, textAlign: 'left', display: 'flex', alignItems: 'center' }}
                onClick={() => navigate('/network')}
              >
                Allocate Static IP Address
              </Button>
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Bottom Row: Recent Audit Stream & Urgent Items */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="Real-time Audit & Activity Stream"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/audit')}>
                View Full Audit Logs →
              </Button>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={activityColumns}
              dataSource={recentActivityData}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="Action Items & Warnings"
            extra={<Badge count={2} style={{ backgroundColor: '#faad14' }} />}
          >
            <Flex vertical gap={12}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(250, 173, 20, 0.08)',
                  border: '1px solid rgba(250, 173, 20, 0.25)',
                }}
              >
                <Flex justify="space-between" align="flex-start">
                  <Flex gap={8} align="center">
                    <WarningOutlined style={{ color: '#faad14', fontSize: 16 }} />
                    <Text strong style={{ fontSize: 13 }}>
                      License Renewal
                    </Text>
                  </Flex>
                  <Tag color="warning">14 Days</Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  Adobe Creative Cloud (20 seats) expires May 15. Review unassigned seats.
                </Text>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, marginTop: 4 }}
                  onClick={() => navigate('/licenses')}
                >
                  Manage Subscription →
                </Button>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(255, 77, 79, 0.08)',
                  border: '1px solid rgba(255, 77, 79, 0.25)',
                }}
              >
                <Flex justify="space-between" align="flex-start">
                  <Flex gap={8} align="center">
                    <AlertOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                    <Text strong style={{ fontSize: 13 }}>
                      Hardware Stock Depleted
                    </Text>
                  </Flex>
                  <Tag color="error">Critical</Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  Wireless Mouse inventory is at 2 units (Threshold: 5). Restock advised.
                </Text>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, marginTop: 4 }}
                  onClick={() => navigate('/inventory')}
                >
                  Create Restock Order →
                </Button>
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
