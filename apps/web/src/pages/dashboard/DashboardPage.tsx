import {
  AlertOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LaptopOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
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
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import PageContainer from '../../components/PageContainer';
import { WorldClockWidget } from '../../components/WorldClockWidget';
import { type DashboardOverview, dashboardService } from '../../services/dashboard.service';
import { useTimezoneStore } from '../../stores/timezone.store';
import { useAuthStore } from '../../stores/auth.store';

const { Title, Text } = Typography;

type RecentActivityItem = DashboardOverview['recentActivity'][number];

function renderActionTag(action: string) {
  let color = 'blue';
  if (action === 'DELETED' || action === 'TERMINATED' || action === 'BLOCKED') color = 'error';
  if (action === 'RESOLVED' || action === 'PROVISIONED') color = 'success';
  if (action === 'WARNING') color = 'warning';
  return <Tag color={color}>{action}</Tag>;
}

const activityColumns = [
  {
    title: 'ACTOR',
    dataIndex: 'user',
    key: 'user',
    render: (text: string, record: RecentActivityItem) => (
      <Flex align="center" gap={8}>
        <Avatar
          size="small"
          style={{ backgroundColor: record.avatarColor || '#1677ff', fontSize: 12 }}
        >
          {text ? text[0] : 'U'}
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
    title: 'ACTION',
    dataIndex: 'action',
    key: 'action',
    render: renderActionTag,
  },
  {
    title: 'TARGET ENTITY',
    dataIndex: 'entity',
    key: 'entity',
    render: (entity: string, record: RecentActivityItem) => (
      <div>
        <Text strong style={{ fontSize: 13 }}>
          {entity}
        </Text>
        <Text type="secondary" style={{ display: 'block', fontSize: 11.5 }}>
          {record.details}
        </Text>
      </div>
    ),
  },
  {
    title: 'TIME',
    dataIndex: 'time',
    key: 'time',
    render: (time: string) => (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {time}
      </Text>
    ),
  },
];

const KpiCardsGrid: React.FC<{ data: DashboardOverview | null }> = ({ data }) => (
  <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
    {/* Total Assets */}
    <Col xs={24} sm={12} lg={6}>
      <Card className="uims-stat-card" size="small" styles={{ body: { padding: '14px 16px' } }}>
        <Flex justify="space-between" align="flex-start">
          <div>
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Managed Assets
            </Text>
            <Title
              level={3}
              style={{ margin: '2px 0 4px 0', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {data?.kpi?.managedAssets?.total || 0}
            </Title>
            <Flex align="center" gap={4}>
              <Text
                style={{
                  fontSize: 11.5,
                  color: '#10b981',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <ArrowUpOutlined style={{ fontSize: 10 }} />
                {data?.kpi?.managedAssets?.growthMoM
                  ? data.kpi.managedAssets.growthMoM.replace(/^[↑\s]+/, '')
                  : '8.4% MoM'}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                • {data?.kpi?.managedAssets?.active || 0} active
              </Text>
            </Flex>
          </div>
          <LaptopOutlined style={{ fontSize: 20, color: '#1677ff' }} />
        </Flex>
      </Card>
    </Col>

    {/* License Utilization */}
    <Col xs={24} sm={12} lg={6}>
      <Card className="uims-stat-card" size="small" styles={{ body: { padding: '14px 16px' } }}>
        <Flex justify="space-between" align="flex-start">
          <div>
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Active Licenses
            </Text>
            <Title
              level={3}
              style={{ margin: '2px 0 4px 0', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {data?.kpi?.licenses?.total || 0}
            </Title>
            <Flex align="center" gap={4}>
              <Text style={{ fontSize: 11.5, color: '#10b981', fontWeight: 600 }}>
                {data?.kpi?.licenses?.seatUsagePercent || '88.5%'} Seat Usage
              </Text>
              {data?.kpi?.licenses?.expiringCount ? (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  ({data.kpi.licenses.expiringCount} expiring)
                </Text>
              ) : null}
            </Flex>
          </div>
          <SafetyCertificateOutlined style={{ fontSize: 20, color: '#10b981' }} />
        </Flex>
      </Card>
    </Col>

    {/* Spare Stockroom */}
    <Col xs={24} sm={12} lg={6}>
      <Card className="uims-stat-card" size="small" styles={{ body: { padding: '14px 16px' } }}>
        <Flex justify="space-between" align="flex-start">
          <div>
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Spare Stockroom
            </Text>
            <Title
              level={3}
              style={{ margin: '2px 0 4px 0', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {data?.kpi?.inventory?.totalUnits ?? 0} Units
            </Title>
            <Flex align="center" gap={4}>
              {data?.kpi?.inventory?.lowStockCount ? (
                <Tag color="warning" style={{ margin: 0, fontSize: 10 }}>
                  {data.kpi.inventory.lowStockCount} Low Stock
                </Tag>
              ) : null}
              <Text type="secondary" style={{ fontSize: 11 }}>
                • {data?.kpi?.inventory?.totalItems || 0} items
              </Text>
            </Flex>
          </div>
          <DatabaseOutlined style={{ fontSize: 20, color: '#f59e0b' }} />
        </Flex>
      </Card>
    </Col>

    {/* Network & IP Usage */}
    <Col xs={24} sm={12} lg={6}>
      <Card className="uims-stat-card" size="small" styles={{ body: { padding: '14px 16px' } }}>
        <Flex justify="space-between" align="flex-start">
          <div>
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Network IPAM
            </Text>
            <Title
              level={3}
              style={{ margin: '2px 0 4px 0', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {data?.kpi?.ipam?.used || 0} / {data?.kpi?.ipam?.total || 512}
            </Title>
            <Flex align="center" gap={4}>
              <Progress
                percent={data?.kpi?.ipam?.usagePercent || 80}
                size="small"
                style={{ width: 80 }}
                showInfo={false}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {data?.kpi?.ipam?.free || 0} free
              </Text>
            </Flex>
          </div>
          <GlobalOutlined style={{ fontSize: 20, color: '#6366f1' }} />
        </Flex>
      </Card>
    </Col>
  </Row>
);

const SubsystemHealthBox: React.FC<{
  name: string;
  badgeStatus: 'success' | 'processing';
  badgeText: string;
  percent: number;
  strokeColor?: string;
  status?: 'success' | 'normal';
  metric1: string;
  metric2: string;
}> = ({ name, badgeStatus, badgeText, percent, strokeColor, status, metric1, metric2 }) => (
  <Col xs={24} sm={12}>
    <div style={{ padding: 12, border: '1px solid rgba(140, 140, 140, 0.12)', borderRadius: 6 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
        <Text strong style={{ fontSize: 13 }}>
          {name}
        </Text>
        <Badge status={badgeStatus} text={badgeText} />
      </Flex>
      <Progress percent={percent} strokeColor={strokeColor} status={status} size="small" />
      <Flex justify="space-between" style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
        <span>{metric1}</span>
        <span>{metric2}</span>
      </Flex>
    </div>
  </Col>
);

interface SubsystemItem {
  id: string;
  name: string;
  badgeStatus: 'success' | 'processing';
  badgeText: string;
  percent: number;
  strokeColor?: string;
  status?: 'success' | 'normal';
  metric1: string;
  metric2: string;
}

function getDirSubsystem(dir: DashboardOverview['health']['directory']): SubsystemItem {
  return {
    id: 'dir',
    name: dir?.name ?? 'Asset Custodians & Directory',
    badgeStatus: 'success',
    badgeText: dir?.status ?? 'Synced',
    percent: dir?.percent ?? 99.4,
    strokeColor: '#10b981',
    metric1: `${dir?.usersCount ?? 6} Active Custodians`,
    metric2: `Sync: ${dir?.syncTime ?? '4m ago'}`,
  };
}

function getAssetFleetSubsystem(mail: DashboardOverview['health']['mail']): SubsystemItem {
  return {
    id: 'assets',
    name: mail?.name ?? 'Hardware Fleet & Asset Tagging',
    badgeStatus: 'success',
    badgeText: mail?.status ?? 'Operational',
    percent: mail?.percent ?? 98.6,
    strokeColor: '#1677ff',
    metric1: mail?.throughput ?? 'Fleet Tagged & Verified',
    metric2: `Service: ${mail?.latency ?? '99.4% In Service'}`,
  };
}

function getVpnSubsystem(vpn: DashboardOverview['health']['vpn']): SubsystemItem {
  return {
    id: 'vpn',
    name: vpn?.name ?? 'Network Gateways & IPAM',
    badgeStatus: 'processing',
    badgeText: vpn?.status ?? 'Active',
    percent: vpn?.percent ?? 76.0,
    strokeColor: '#6366f1',
    metric1: `${vpn?.tunnels ?? 342} Connected Devices`,
    metric2: `Subnets: ${vpn?.load ?? 'Optimal'}`,
  };
}

function getBackupsSubsystem(backups: DashboardOverview['health']['backups']): SubsystemItem {
  return {
    id: 'backups',
    name: backups?.name ?? 'Encrypted Asset Snapshots',
    badgeStatus: 'success',
    badgeText: backups?.status ?? 'Verified',
    percent: backups?.percent ?? 100,
    status: 'success',
    metric1: `Snapshots: ${backups?.snapshots ?? 'Complete'}`,
    metric2: `Next: ${backups?.nextRun ?? '02:00 UTC'}`,
  };
}

function getSubsystemList(health: DashboardOverview['health'] | undefined): Array<SubsystemItem> {
  return [
    getDirSubsystem(health?.directory),
    getAssetFleetSubsystem(health?.mail),
    getVpnSubsystem(health?.vpn),
    getBackupsSubsystem(health?.backups),
  ];
}

const InfrastructureHealthCard: React.FC<{ health: DashboardOverview['health'] | undefined }> = ({
  health,
}) => {
  const subsystems = getSubsystemList(health);

  return (
    <Card
      size="small"
      title={
        <Flex align="center" gap={6}>
          <CloudServerOutlined style={{ color: '#1677ff' }} />
          <span>Asset Fleet & Infrastructure Telemetry</span>
        </Flex>
      }
      extra={<Tag color="success">{health?.uptimePercent || '99.98%'} Available</Tag>}
    >
      <Row gutter={[12, 12]}>
        {subsystems.map((sub) => (
          <SubsystemHealthBox
            key={sub.id}
            name={sub.name}
            badgeStatus={sub.badgeStatus}
            badgeText={sub.badgeText}
            percent={sub.percent}
            strokeColor={sub.strokeColor}
            status={sub.status}
            metric1={sub.metric1}
            metric2={sub.metric2}
          />
        ))}
      </Row>
    </Card>
  );
};

const QuickActionHub: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <Card size="small" title="Quick Action Center">
    <Flex vertical gap={8}>
      <Button
        type="primary"
        icon={<LaptopOutlined />}
        block
        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', height: 34 }}
        onClick={() => onNavigate('/assets')}
      >
        Provision New Hardware Asset
      </Button>
      <Button
        icon={<SafetyCertificateOutlined />}
        block
        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', height: 34 }}
        onClick={() => onNavigate('/licenses')}
      >
        Assign Software License
      </Button>
      <Button
        icon={<DatabaseOutlined />}
        block
        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', height: 34 }}
        onClick={() => onNavigate('/inventory')}
      >
        Manage Stockroom Inventory
      </Button>
      <Button
        icon={<TeamOutlined />}
        block
        style={{ textAlign: 'left', display: 'flex', alignItems: 'center', height: 34 }}
        onClick={() => onNavigate('/directory')}
      >
        Onboard Asset Custodian
      </Button>
    </Flex>
  </Card>
);

const ActionItemsCard: React.FC<{
  items: DashboardOverview['actionItems'] | undefined;
  onNavigate: (path: string) => void;
}> = ({ items = [], onNavigate }) => (
  <Card
    size="small"
    title="Action Items & Warnings"
    extra={
      <Badge
        count={items.length}
        style={{
          backgroundColor: items.length > 0 ? '#faad14' : '#52c41a',
          color: items.length > 0 ? '#000' : '#fff',
        }}
      />
    }
  >
    {items.length === 0 ? (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
        <Text type="secondary" style={{ display: 'block', fontSize: 12.5 }}>
          All systems operational. No active warnings or replenishment actions required.
        </Text>
      </div>
    ) : (
      <Flex vertical gap={10}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: 10,
              borderRadius: 6,
              background:
                item.type === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border:
                item.type === 'error'
                  ? '1px solid rgba(239, 68, 68, 0.2)'
                  : '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <Flex justify="space-between" align="flex-start">
              <Flex gap={6} align="center">
                {item.type === 'error' ? (
                  <AlertOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                ) : (
                  <WarningOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
                )}
                <Text strong style={{ fontSize: 12.5 }}>
                  {item.title}
                </Text>
              </Flex>
              <Tag color={item.tagColor} style={{ fontSize: 11 }}>
                {item.tag}
              </Tag>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginTop: 3 }}>
              {item.description}
            </Text>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, marginTop: 2, fontSize: 12 }}
              onClick={() => onNavigate(item.linkUrl)}
            >
              <Space size={4}>
                <span>{item.linkText.replace(/[\s→←↑↓]+$/, '')}</span>
                <RightOutlined style={{ fontSize: 10 }} />
              </Space>
            </Button>
          </div>
        ))}
      </Flex>
    )}
  </Card>
);

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>('This Month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardOverview | null>(null);

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const overview = await dashboardService.getOverview(period);
        setData(overview);
      } catch (err) {
        console.error('Failed to load dashboard overview:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period],
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <PageContainer
      title="Asset Operations Center"
      subtitle={`Welcome back, ${user?.name || 'Administrator'}. Enterprise IT asset fleet, hardware inventory, and lifecycle telemetry.`}
      tag={<Tag color="success">Fleet Operational</Tag>}
      extra={
        <Flex gap={8} align="center">
          <Segmented
            options={['Today', 'This Week', 'This Month', 'Quarter']}
            value={period}
            onChange={(val) => setPeriod(val as string)}
            size="small"
          />
          <Tooltip title="Refresh metrics">
            <Button
              size="small"
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={() => fetchDashboardData(true)}
            />
          </Tooltip>
        </Flex>
      }
    >
      <Alert
        title="Scheduled Hardware Fleet Audit"
        description="Physical asset inventory audit and barcode verification scheduled for Saturday at 09:00 AM. Estimated duration: 2 hours."
        type="info"
        showIcon
        closable
        style={{ marginBottom: 16, borderRadius: 6, fontSize: 13 }}
      />

      {loading && !data ? (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <KpiCardsGrid data={data} />

          <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
            <Col xs={24} lg={16}>
              <InfrastructureHealthCard health={data?.health} />
            </Col>
            <Col xs={24} lg={8}>
              <QuickActionHub onNavigate={navigate} />
            </Col>
          </Row>

          <WorldClockWidget systemTimezone={useTimezoneStore.getState().systemTimezone} />

          <Row gutter={[14, 14]}>
            <Col xs={24} lg={16}>
              <Card
                size="small"
                title="Real-time Audit Activity Stream"
                extra={
                  <Button type="link" size="small" onClick={() => navigate('/audit')}>
                    <Space size={4}>
                      <span>View Audit Trail</span>
                      <RightOutlined style={{ fontSize: 10 }} />
                    </Space>
                  </Button>
                }
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  columns={activityColumns}
                  dataSource={data?.recentActivity || []}
                  pagination={false}
                  size="middle"
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: 'No recent audit events.' }}
                />
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <ActionItemsCard items={data?.actionItems} onNavigate={navigate} />
            </Col>
          </Row>
        </>
      )}
    </PageContainer>
  );
}
