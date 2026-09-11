import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LaptopOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import PageContainer from '../../components/PageContainer';
import { type DashboardOverview, dashboardService } from '../../services/dashboard.service';
import { useAuthStore } from '../../stores/auth.store';

const { Title, Text } = Typography;

type RecentActivityItem = DashboardOverview['recentActivity'][number];
type ActionItem = DashboardOverview['actionItems'][number];

function getRoleColor(role?: string): string {
  switch ((role || '').toLowerCase()) {
    case 'admin':
      return 'geekblue';
    case 'auditor':
      return 'purple';
    case 'it tech':
      return 'cyan';
    case 'employee':
      return 'default';
    default:
      return 'blue';
  }
}

function renderActionTag(action?: string) {
  let color = 'blue';
  const upper = (action || '').toUpperCase();
  if (
    upper.includes('FAIL') ||
    upper.includes('ERROR') ||
    upper.includes('ALERT') ||
    upper.includes('DENIED') ||
    upper.includes('CRITICAL') ||
    upper.includes('LOCKOUT') ||
    upper.includes('BRUTE') ||
    upper.includes('ANOMAL') ||
    upper.includes('UNAUTHORIZ') ||
    upper.includes('BREACH') ||
    upper.includes('SUSPICIOUS') ||
    upper.includes('VIOLAT') ||
    upper === 'WARNING' ||
    upper.includes('WARN')
  ) {
    color = 'error';
  } else if (
    upper === 'TERMINATED' ||
    upper.includes('DECOMMISSION') ||
    upper.includes('DELET') ||
    upper.includes('REVOKE') ||
    upper.includes('RECLAIM') ||
    upper.includes('SUSPEND') ||
    upper.includes('BLOCKED')
  ) {
    color = 'error';
  } else if (upper === 'RESOLVED' || upper.includes('SUCCESS') || upper.includes('COMPLETE')) {
    color = 'success';
  } else if (
    upper === 'PROVISIONED' ||
    upper.includes('CREATE') ||
    upper.includes('ASSIGN') ||
    upper.includes('ALLOCAT') ||
    upper.includes('GRANT') ||
    upper.includes('RESTOCK') ||
    upper.includes('REORDER')
  ) {
    color = 'processing';
  } else if (
    upper === 'UPDATED' ||
    upper.includes('SYNC') ||
    upper.includes('EDIT') ||
    upper.includes('RESET') ||
    upper.includes('CONFIG')
  ) {
    color = 'processing';
  }
  return <Tag color={color}>{upper || 'EVENT'}</Tag>;
}

function getEntityLink(entity?: string, entityType?: string, explicitUrl?: string): string {
  if (explicitUrl && explicitUrl !== '/audit') return explicitUrl;
  const target = `${entityType || ''} ${entity || ''}`.toLowerCase();
  if (
    target.includes('asset') ||
    target.includes('hardware') ||
    target.includes('laptop') ||
    target.includes('server') ||
    target.includes('workstation') ||
    target.includes('macbook') ||
    target.includes('thinkpad') ||
    target.includes('desktop') ||
    target.includes('monitor') ||
    target.includes('ast-')
  ) {
    return '/assets';
  }
  if (
    target.includes('licens') ||
    target.includes('saas') ||
    target.includes('subscription') ||
    target.includes('seat') ||
    target.includes('lic-')
  ) {
    return '/licenses';
  }
  if (
    target.includes('inventor') ||
    target.includes('item') ||
    target.includes('stock') ||
    target.includes('sku') ||
    target.includes('adapter') ||
    target.includes('cable') ||
    target.includes('peripheral') ||
    target.includes('mouse') ||
    target.includes('keyboard') ||
    target.includes('dock') ||
    target.includes('inv-')
  ) {
    return '/inventory';
  }
  if (
    target.includes('user') ||
    target.includes('account') ||
    target.includes('password') ||
    target.includes('mfa') ||
    target.includes('auth') ||
    target.includes('role') ||
    target.includes('usr-')
  ) {
    return '/users';
  }
  if (
    target.includes('subnet') ||
    target.includes('ip') ||
    target.includes('network') ||
    target.includes('vlan') ||
    target.includes('gateway') ||
    target.includes('firewall') ||
    target.includes('router') ||
    target.includes('switch')
  ) {
    return '/network';
  }
  return explicitUrl || '/audit';
}

const TelemetryCardsGrid: React.FC<{
  data: DashboardOverview | null;
  onNavigate: (path: string) => void;
}> = ({ data, onNavigate }) => {
  // 1. Asset calculations
  const totalAssets = data?.kpi?.managedAssets?.total || 0;
  const inUseAssets = data?.kpi?.managedAssets?.inUse ?? data?.kpi?.managedAssets?.active ?? 0;
  const inStockAssets = data?.kpi?.managedAssets?.inStock ?? 0;
  const inRepairAssets = data?.kpi?.managedAssets?.inRepair ?? 0;
  const decommissionedAssets = data?.kpi?.managedAssets?.decommissioned ?? 0;
  const assetHealthPercent =
    totalAssets > 0
      ? Math.min(100, Math.round(((inUseAssets + inStockAssets) / totalAssets) * 100))
      : 100;

  // 2. License calculations
  const totalLicenses = data?.kpi?.licenses?.total || 0;
  const parsedSeatUsage = parseFloat(
    data?.kpi?.licenses?.seatUsagePercent?.replace('%', '') || '0',
  );
  const seatUsagePercentNumber = isNaN(parsedSeatUsage)
    ? 0
    : Math.min(100, Math.max(0, parsedSeatUsage));
  const licenseExpiringCount = data?.kpi?.licenses?.expiringCount || 0;
  const licenseStrokeColor =
    seatUsagePercentNumber >= 95 ? '#ff4d4f' : seatUsagePercentNumber >= 85 ? '#faad14' : '#10b981';

  // 3. Inventory calculations
  const totalUnits = data?.kpi?.inventory?.totalUnits ?? 0;
  const totalItems = data?.kpi?.inventory?.totalItems || 0;
  const lowStockCount = data?.kpi?.inventory?.lowStockCount || 0;
  const healthyStockPercent =
    totalItems > 0
      ? Math.max(0, Math.min(100, Math.round(((totalItems - lowStockCount) / totalItems) * 100)))
      : 100;

  // 4. Audit calculations
  const audit24h = data?.kpi?.audit?.recent24h ?? 0;
  const auditStatus = data?.kpi?.audit?.status || 'Compliant';
  const complianceScore = data?.kpi?.audit?.complianceScore ?? 100;
  const auditStrokeColor =
    auditStatus === 'Critical' || complianceScore < 70
      ? '#ef4444'
      : auditStatus === 'Warning' || complianceScore < 90
        ? '#f59e0b'
        : '#6366f1';

  return (
    <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
      {/* 1. Hardware Asset Fleet */}
      <Col xs={24} sm={12} xl={6}>
        <Card className="uims-stat-card" size="small" styles={{ body: { padding: '14px 16px' } }}>
          <Flex justify="space-between" align="flex-start">
            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Hardware Fleet
              </Text>
              <Title
                level={3}
                style={{ margin: '2px 0 4px 0', fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                {totalAssets}
              </Title>
              {(() => {
                const growthMoMStr = data?.kpi?.managedAssets?.growthMoM
                  ? data.kpi.managedAssets.growthMoM.replace(/^[↑\s]+/, '')
                  : '0.0% MoM';
                const isNegative = growthMoMStr.includes('-');
                return (
                  <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
                    <Tag
                      color={isNegative ? 'default' : 'blue'}
                      style={{ margin: 0, fontSize: 10 }}
                    >
                      {isNegative ? (
                        <ArrowDownOutlined style={{ fontSize: 9, marginRight: 2 }} />
                      ) : (
                        <ArrowUpOutlined style={{ fontSize: 9, marginRight: 2 }} />
                      )}
                      {growthMoMStr}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {inUseAssets} active
                    </Text>
                  </Flex>
                );
              })()}
            </div>
            <LaptopOutlined style={{ fontSize: 22, color: '#1677ff' }} />
          </Flex>

          <div style={{ marginTop: 4 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Fleet Health
              </Text>
              <Text strong style={{ fontSize: 11, color: '#1677ff' }}>
                {assetHealthPercent}%
              </Text>
            </Flex>
            <Progress
              percent={assetHealthPercent}
              size="small"
              strokeColor="#1677ff"
              showInfo={false}
            />
            <Flex wrap="wrap" gap={4} style={{ marginTop: 8 }}>
              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                In Use: {inUseAssets}
              </Tag>
              <Tag color="success" style={{ margin: 0, fontSize: 10 }}>
                Stock: {inStockAssets}
              </Tag>
              {inRepairAssets > 0 ? (
                <Tag color="warning" style={{ margin: 0, fontSize: 10 }}>
                  Repair: {inRepairAssets}
                </Tag>
              ) : null}
              {decommissionedAssets > 0 ? (
                <Tag style={{ margin: 0, fontSize: 10 }}>Retired: {decommissionedAssets}</Tag>
              ) : null}
            </Flex>
          </div>

          <Flex justify="flex-end" style={{ marginTop: 8 }}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11.5 }}
              onClick={() => onNavigate('/assets')}
            >
              <Space size={2}>
                <span>Manage Fleet</span>
                <RightOutlined style={{ fontSize: 9 }} />
              </Space>
            </Button>
          </Flex>
        </Card>
      </Col>

      {/* 2. SaaS & Software Licenses */}
      <Col xs={24} sm={12} xl={6}>
        <Card className="uims-stat-card" size="small" styles={{ body: { padding: '14px 16px' } }}>
          <Flex justify="space-between" align="flex-start">
            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Software Licenses
              </Text>
              <Title
                level={3}
                style={{ margin: '2px 0 4px 0', fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                {totalLicenses}
              </Title>
              <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 11.5, color: licenseStrokeColor, fontWeight: 600 }}>
                  {data?.kpi?.licenses?.seatUsagePercent || '0.0%'} Seat Usage
                </Text>
              </Flex>
            </div>
            <SafetyCertificateOutlined style={{ fontSize: 22, color: '#10b981' }} />
          </Flex>

          <div style={{ marginTop: 4 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Seat Allocation
              </Text>
              <Text strong style={{ fontSize: 11, color: licenseStrokeColor }}>
                {data?.kpi?.licenses?.usedSeats ?? 0} / {data?.kpi?.licenses?.totalSeats ?? 0}
              </Text>
            </Flex>
            <Progress
              percent={seatUsagePercentNumber}
              size="small"
              strokeColor={licenseStrokeColor}
              showInfo={false}
            />
            <Flex style={{ marginTop: 8 }}>
              {licenseExpiringCount > 0 ? (
                <Tag color="warning" icon={<WarningOutlined />} style={{ margin: 0, fontSize: 10 }}>
                  {licenseExpiringCount} Expiring Soon
                </Tag>
              ) : (
                <Tag
                  color="success"
                  icon={<CheckCircleOutlined />}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  Active & Compliant
                </Tag>
              )}
            </Flex>
          </div>

          <Flex justify="flex-end" style={{ marginTop: 8 }}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11.5 }}
              onClick={() => onNavigate('/licenses')}
            >
              <Space size={2}>
                <span>Manage Licenses</span>
                <RightOutlined style={{ fontSize: 9 }} />
              </Space>
            </Button>
          </Flex>
        </Card>
      </Col>

      {/* 3. Low Stock & Inventory Thresholds */}
      <Col xs={24} sm={12} xl={6}>
        <Card className="uims-stat-card" size="small" styles={{ body: { padding: '14px 16px' } }}>
          <Flex justify="space-between" align="flex-start">
            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Inventory Stock
              </Text>
              <Title
                level={3}
                style={{ margin: '2px 0 4px 0', fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                {totalUnits} Units
              </Title>
              <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {totalItems} Catalog Items
                </Text>
              </Flex>
            </div>
            <DatabaseOutlined style={{ fontSize: 22, color: '#f59e0b' }} />
          </Flex>

          <div style={{ marginTop: 4 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Stock Threshold Compliance
              </Text>
              <Text
                strong
                style={{ fontSize: 11, color: lowStockCount > 0 ? '#faad14' : '#10b981' }}
              >
                {healthyStockPercent}%
              </Text>
            </Flex>
            <Progress
              percent={healthyStockPercent}
              size="small"
              strokeColor={lowStockCount > 0 ? '#faad14' : '#10b981'}
              showInfo={false}
            />
            <Flex style={{ marginTop: 8 }}>
              {lowStockCount > 0 ? (
                <Tag color="error" icon={<AlertOutlined />} style={{ margin: 0, fontSize: 10 }}>
                  {lowStockCount} Low Stock Alerts
                </Tag>
              ) : (
                <Tag
                  color="success"
                  icon={<CheckCircleOutlined />}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  Stock Levels Optimal
                </Tag>
              )}
            </Flex>
          </div>

          <Flex justify="flex-end" style={{ marginTop: 8 }}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11.5 }}
              onClick={() => onNavigate('/inventory')}
            >
              <Space size={2}>
                <span>Restock Catalog</span>
                <RightOutlined style={{ fontSize: 9 }} />
              </Space>
            </Button>
          </Flex>
        </Card>
      </Col>

      {/* 4. Compliance & Security Audit Pulse */}
      <Col xs={24} sm={12} xl={6}>
        <Card className="uims-stat-card" size="small" styles={{ body: { padding: '14px 16px' } }}>
          <Flex justify="space-between" align="flex-start">
            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Audit & Compliance
              </Text>
              <Title
                level={3}
                style={{ margin: '2px 0 4px 0', fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                {audit24h} Events
              </Title>
              <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Past 24h ({data?.kpi?.audit?.totalEvents || 0} total)
                </Text>
              </Flex>
            </div>
            <AuditOutlined style={{ fontSize: 22, color: '#6366f1' }} />
          </Flex>

          <div style={{ marginTop: 4 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Audit Pulse
              </Text>
              <Text strong style={{ fontSize: 11, color: auditStrokeColor }}>
                {complianceScore}% Integrity
              </Text>
            </Flex>
            <Progress
              percent={complianceScore}
              size="small"
              strokeColor={auditStrokeColor}
              showInfo={false}
            />
            <Flex style={{ marginTop: 8 }}>
              {auditStatus === 'Critical' ? (
                <Badge status="error" text="Critical Security Alerts" style={{ fontSize: 11 }} />
              ) : auditStatus === 'Warning' ? (
                <Badge status="warning" text="Elevated Audit Events" style={{ fontSize: 11 }} />
              ) : (
                <Badge status="success" text="Audit Pulse Active" style={{ fontSize: 11 }} />
              )}
            </Flex>
          </div>

          <Flex justify="flex-end" style={{ marginTop: 8 }}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11.5 }}
              onClick={() => onNavigate('/audit')}
            >
              <Space size={2}>
                <span>Inspect Audit Log</span>
                <RightOutlined style={{ fontSize: 9 }} />
              </Space>
            </Button>
          </Flex>
        </Card>
      </Col>
    </Row>
  );
};

function getSubsystemBadgeStatus(
  status?: string,
): 'success' | 'processing' | 'warning' | 'error' | 'default' {
  const s = (status || '').toLowerCase();
  if (s.includes('error') || s.includes('fail') || s.includes('down') || s.includes('offline')) {
    return 'error';
  }
  if (s.includes('warn') || s.includes('degrad')) {
    return 'warning';
  }
  if (s.includes('sync') || s.includes('load') || s.includes('running')) {
    return 'processing';
  }
  if (s.includes('active') || s.includes('operat') || s.includes('verif') || s.includes('ok')) {
    return 'success';
  }
  return 'default';
}

function getSubsystemStrokeColor(status?: string, fallback = '#10b981'): string {
  const badgeStatus = getSubsystemBadgeStatus(status);
  if (badgeStatus === 'error') return '#ef4444';
  if (badgeStatus === 'warning') return '#f59e0b';
  return fallback;
}

const SubsystemHealthBox: React.FC<{
  name: string;
  badgeStatus: 'success' | 'processing' | 'warning' | 'error' | 'default';
  badgeText: string;
  percent: number;
  strokeColor?: string;
  status?: 'success' | 'normal' | 'exception';
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

const InfrastructureHealthCard: React.FC<{
  health: DashboardOverview['health'] | undefined;
}> = ({ health }) => {
  const uptimeNum = parseFloat(health?.uptimePercent?.replace('%', '') || '100');
  const uptimeColor = uptimeNum < 95 ? 'error' : uptimeNum < 99 ? 'warning' : 'success';

  return (
    <Card
      size="small"
      title={
        <Flex align="center" gap={6}>
          <CloudServerOutlined style={{ color: '#1677ff' }} />
          <span>Infrastructure Health</span>
        </Flex>
      }
      extra={<Tag color={uptimeColor}>{health?.uptimePercent || '99.99%'} Operational</Tag>}
    >
      <Row gutter={[12, 12]}>
        <SubsystemHealthBox
          name={health?.directory?.name ?? 'Directory & Users'}
          badgeStatus={getSubsystemBadgeStatus(health?.directory?.status ?? 'Synced')}
          badgeText={health?.directory?.status ?? 'Synced'}
          percent={health?.directory?.percent ?? 100}
          strokeColor={getSubsystemStrokeColor(health?.directory?.status, '#10b981')}
          metric1={`${health?.directory?.usersCount ?? 0} Active Users`}
          metric2={`Sync: ${health?.directory?.syncTime ?? 'Real-time'}`}
        />
        <SubsystemHealthBox
          name={health?.mail?.name ?? 'Hardware Assets'}
          badgeStatus={getSubsystemBadgeStatus(health?.mail?.status ?? 'Operational')}
          badgeText={health?.mail?.status ?? 'Operational'}
          percent={health?.mail?.percent ?? 100}
          strokeColor={getSubsystemStrokeColor(health?.mail?.status, '#1677ff')}
          metric1={health?.mail?.throughput ?? 'Fleet Active'}
          metric2={`Service: ${health?.mail?.latency ?? 'In Service'}`}
        />
        <SubsystemHealthBox
          name={health?.vpn?.name ?? 'Network Gateways & IPAM'}
          badgeStatus={getSubsystemBadgeStatus(health?.vpn?.status ?? 'Active')}
          badgeText={health?.vpn?.status ?? 'Active'}
          percent={health?.vpn?.percent ?? 80}
          strokeColor={getSubsystemStrokeColor(health?.vpn?.status, '#6366f1')}
          metric1={`${health?.vpn?.tunnels ?? 0} Allocated IPs`}
          metric2={`Load: ${health?.vpn?.load ?? 'Normal'}`}
        />
        <SubsystemHealthBox
          name={health?.backups?.name ?? 'Database Backups'}
          badgeStatus={getSubsystemBadgeStatus(health?.backups?.status ?? 'Verified')}
          badgeText={health?.backups?.status ?? 'Verified'}
          percent={health?.backups?.percent ?? 100}
          strokeColor={getSubsystemStrokeColor(health?.backups?.status, '#10b981')}
          status={
            getSubsystemBadgeStatus(health?.backups?.status) === 'error'
              ? 'exception'
              : getSubsystemBadgeStatus(health?.backups?.status) === 'success'
                ? 'success'
                : 'normal'
          }
          metric1={`Snapshots: ${health?.backups?.snapshots ?? 'Complete'}`}
          metric2={`Next: ${health?.backups?.nextRun ?? '02:00 UTC'}`}
        />
      </Row>
    </Card>
  );
};

const QuickActionHub: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <Card size="small" title="Quick Actions">
    <Flex vertical gap={8}>
      <Button
        type="primary"
        icon={<LaptopOutlined />}
        block
        style={{
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          height: 34,
        }}
        onClick={() => onNavigate('/assets')}
      >
        Create Asset
      </Button>
      <Button
        icon={<SafetyCertificateOutlined />}
        block
        style={{
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          height: 34,
        }}
        onClick={() => onNavigate('/licenses')}
      >
        Create License
      </Button>
      <Button
        icon={<DatabaseOutlined />}
        block
        style={{
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          height: 34,
        }}
        onClick={() => onNavigate('/inventory')}
      >
        Create Item
      </Button>
      <Button
        icon={<QrcodeOutlined />}
        block
        style={{
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          height: 34,
        }}
        onClick={() => onNavigate('/assets?scan=true')}
      >
        Scan QR Code
      </Button>
      <Button
        icon={<TeamOutlined />}
        block
        style={{
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          height: 34,
        }}
        onClick={() => onNavigate('/users')}
      >
        Create User
      </Button>
    </Flex>
  </Card>
);

const ActionQueueCard: React.FC<{
  items: ActionItem[] | undefined;
  onNavigate: (path: string) => void;
}> = ({ items = [], onNavigate }) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  const criticalCount = items.filter((i) => i.type === 'error').length;
  const warningCount = items.filter((i) => i.type === 'warning').length;
  const infoCount = items.filter((i) => i.type === 'info').length;

  useEffect(() => {
    if (filter === 'info' && infoCount === 0) {
      setFilter('all');
    }
  }, [filter, infoCount]);

  const filterOptions = useMemo(() => {
    const opts = [
      { label: `All (${items.length})`, value: 'all' },
      { label: `Critical (${criticalCount})`, value: 'error' },
      { label: `Warnings (${warningCount})`, value: 'warning' },
    ];
    if (infoCount > 0) {
      opts.push({ label: `Notices (${infoCount})`, value: 'info' });
    }
    return opts;
  }, [items.length, criticalCount, warningCount, infoCount]);

  return (
    <Card
      size="small"
      title={
        <Flex align="center" gap={6}>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <span>Action Items Queue</span>
        </Flex>
      }
      styles={{
        header: { flexWrap: 'wrap', height: 'auto', gap: 6, padding: '8px 12px' },
      }}
      extra={
        <Space size={6}>
          <Segmented
            size="small"
            value={filter}
            onChange={(val) => setFilter(val as 'all' | 'error' | 'warning' | 'info')}
            options={filterOptions}
          />
        </Space>
      }
    >
      {filteredItems.length === 0 ? (
        <div style={{ padding: '28px 0', textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 26, color: '#52c41a', marginBottom: 8 }} />
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {items.length === 0 ? 'All Systems Operational' : 'No Matching Action Items'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {items.length === 0
              ? 'No pending action items require immediate attention.'
              : 'No action items match the selected priority filter.'}
          </Text>
        </div>
      ) : (
        <Flex vertical gap={10}>
          {filteredItems.map((item) => {
            const isError = item.type === 'error';
            const isWarning = item.type === 'warning';
            return (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  background: isError
                    ? 'rgba(239, 68, 68, 0.06)'
                    : isWarning
                      ? 'rgba(245, 158, 11, 0.06)'
                      : 'rgba(22, 119, 255, 0.06)',
                  border: isError
                    ? '1px solid rgba(239, 68, 68, 0.2)'
                    : isWarning
                      ? '1px solid rgba(245, 158, 11, 0.2)'
                      : '1px solid rgba(22, 119, 255, 0.2)',
                }}
              >
                <Flex justify="space-between" align="flex-start">
                  <Flex gap={6} align="center">
                    {isError ? (
                      <AlertOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                    ) : isWarning ? (
                      <WarningOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
                    ) : (
                      <InfoCircleOutlined style={{ color: '#1677ff', fontSize: 14 }} />
                    )}
                    <Text strong style={{ fontSize: 12.5 }}>
                      {item.title}
                    </Text>
                  </Flex>
                  <Tag color={item.tagColor} style={{ fontSize: 11, margin: 0 }}>
                    {item.tag}
                  </Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginTop: 4 }}>
                  {item.description}
                </Text>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, marginTop: 4, fontSize: 12, fontWeight: 500 }}
                  onClick={() => onNavigate(item.linkUrl)}
                >
                  <Space size={4}>
                    <span>{(item.linkText || '').replace(/[\s→←↑↓]+$/, '')}</span>
                    <RightOutlined style={{ fontSize: 9 }} />
                  </Space>
                </Button>
              </div>
            );
          })}
        </Flex>
      )}
    </Card>
  );
};

const ActivityStreamCard: React.FC<{
  activities: RecentActivityItem[] | undefined;
  refreshing: boolean;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
}> = ({ activities = [], refreshing, onRefresh, onNavigate }) => {
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filteredActivities = useMemo(() => {
    if (actionFilter === 'ALL') return activities;
    return activities.filter((act) => {
      const actUpper = (act.action || '').toUpperCase();
      if (actUpper === actionFilter) return true;
      if (
        actionFilter === 'PROVISIONED' &&
        (actUpper.includes('PROVISION') ||
          actUpper.includes('CREATE') ||
          actUpper.includes('ASSIGN') ||
          actUpper.includes('ALLOCAT') ||
          actUpper.includes('GRANT') ||
          actUpper.includes('RESTOCK') ||
          actUpper.includes('REORDER') ||
          actUpper.includes('REGISTER'))
      ) {
        return true;
      }
      if (
        actionFilter === 'RESOLVED' &&
        (actUpper.includes('RESOLV') ||
          actUpper.includes('UPDATE') ||
          actUpper.includes('RESET') ||
          actUpper.includes('SYNC') ||
          actUpper.includes('EDIT') ||
          actUpper.includes('PATCH') ||
          actUpper.includes('UNLOCK') ||
          actUpper.includes('RESTORE') ||
          actUpper.includes('APPROVE') ||
          actUpper.includes('VERIF') ||
          actUpper.includes('SUCCESS') ||
          actUpper.includes('COMPLETE') ||
          actUpper.includes('CONFIG') ||
          actUpper.includes('CHANGE'))
      ) {
        return true;
      }
      if (
        actionFilter === 'WARNING' &&
        (actUpper.includes('WARN') ||
          actUpper.includes('FAIL') ||
          actUpper.includes('ALERT') ||
          actUpper.includes('ERROR') ||
          actUpper.includes('DENIED') ||
          actUpper.includes('BLOCKED') ||
          actUpper.includes('LOCKOUT') ||
          actUpper.includes('BRUTE') ||
          actUpper.includes('ANOMAL') ||
          actUpper.includes('UNAUTHORIZ') ||
          actUpper.includes('BREACH') ||
          actUpper.includes('SUSPICIOUS') ||
          actUpper.includes('VIOLAT'))
      ) {
        return true;
      }
      if (
        actionFilter === 'TERMINATED' &&
        (actUpper.includes('TERMINAT') ||
          actUpper.includes('DELET') ||
          actUpper.includes('DECOMMISSION') ||
          actUpper.includes('REVOKE') ||
          actUpper.includes('RECLAIM') ||
          actUpper.includes('SUSPEND') ||
          actUpper.includes('REMOVE') ||
          actUpper.includes('DESTROY') ||
          actUpper.includes('EXPIRE'))
      ) {
        return true;
      }
      return false;
    });
  }, [activities, actionFilter]);

  const columns = [
    {
      title: 'Actor',
      dataIndex: 'user',
      key: 'user',
      width: 170,
      render: (text: string, record: RecentActivityItem) => (
        <Flex align="center" gap={8}>
          <Avatar
            size="small"
            style={{ backgroundColor: record.avatarColor || '#1677ff', fontSize: 12 }}
          >
            {text ? text[0] : 'U'}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 12.5, display: 'block' }}>
              {text}
            </Text>
            <Tag
              color={getRoleColor(record.role)}
              style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}
            >
              {record.role || 'System'}
            </Tag>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: renderActionTag,
    },
    {
      title: 'Target Entity & Details',
      dataIndex: 'entity',
      key: 'entity',
      render: (entity: string, record: RecentActivityItem) => {
        const link = getEntityLink(entity, record.entityType, record.linkUrl);
        return (
          <div>
            <Button
              type="link"
              size="small"
              style={{
                padding: 0,
                height: 'auto',
                fontWeight: 600,
                fontSize: 12.5,
                textAlign: 'left',
              }}
              onClick={() => onNavigate(link)}
            >
              <Space size={3}>
                <span>{entity || 'System'}</span>
                <RightOutlined style={{ fontSize: 9 }} />
              </Space>
            </Button>
            <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 1 }}>
              {record.details}
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Timestamp',
      dataIndex: 'time',
      key: 'time',
      width: 100,
      render: (time: string, record: RecentActivityItem) => (
        <Tooltip title={record.timestamp || time}>
          <Text type="secondary" style={{ fontSize: 11.5, cursor: 'help' }}>
            {time}
          </Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title={
        <Flex align="center" gap={6}>
          <HistoryOutlined style={{ color: '#1677ff' }} />
          <span>Live Activity Stream</span>
        </Flex>
      }
      extra={
        <Flex gap={8} align="center" wrap="wrap">
          <Segmented
            size="small"
            value={actionFilter}
            onChange={(val) => setActionFilter(val as string)}
            options={[
              { label: 'All', value: 'ALL' },
              { label: 'Provisioned', value: 'PROVISIONED' },
              { label: 'Resolved', value: 'RESOLVED' },
              { label: 'Warning', value: 'WARNING' },
              { label: 'Terminated', value: 'TERMINATED' },
            ]}
          />
          <Tooltip title="Refresh activity stream">
            <Button
              size="small"
              icon={<ReloadOutlined spin={refreshing} />}
              disabled={refreshing}
              onClick={onRefresh}
            />
          </Tooltip>
          <Button type="link" size="small" onClick={() => onNavigate('/audit')}>
            <Space size={2}>
              <span>Audit Trail</span>
              <RightOutlined style={{ fontSize: 9 }} />
            </Space>
          </Button>
        </Flex>
      }
      styles={{
        header: { flexWrap: 'wrap', height: 'auto', gap: 6, padding: '8px 12px' },
        body: { padding: 0, overflowX: 'auto' },
      }}
    >
      <Table
        rowKey="key"
        columns={columns}
        dataSource={filteredActivities}
        pagination={false}
        size="middle"
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText:
            activities.length === 0
              ? 'No recent activity records.'
              : 'No recent activity records match filter.',
        }}
      />
    </Card>
  );
};

export default function DashboardPage() {
  const { message } = App.useApp();
  const messageRef = useRef(message);
  messageRef.current = message;

  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>('This Month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeFetchIdRef = useRef(0);

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const fetchId = ++activeFetchIdRef.current;

      try {
        const overview = await dashboardService.getOverview(period, isManualRefresh);
        if (fetchId !== activeFetchIdRef.current) return;
        setData(overview);
        if (isManualRefresh) {
          messageRef.current.success('Telemetry data refreshed');
        }
      } catch (_error: unknown) {
        if (fetchId !== activeFetchIdRef.current) return;
        setError('Failed to load dashboard overview. Please try again.');
        messageRef.current.error('Failed to load dashboard overview. Please try again.');
      } finally {
        if (fetchId === activeFetchIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [period],
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <PageContainer
      title="Dashboard"
      subtitle={`Welcome back, ${user?.name || 'Operations Lead'}. Real-time fleet health, license utilization, and security audit telemetry.`}
      tag={<Tag color="success">Operational</Tag>}
      extra={
        <Flex gap={8} align="center" wrap="wrap">
          <Segmented
            options={['Today', 'This Week', 'This Month', 'Quarter']}
            value={period}
            onChange={(val) => setPeriod(val as string)}
            size="small"
          />
          <Tooltip title="Refresh metrics">
            <Button
              size="small"
              icon={<ReloadOutlined spin={refreshing || loading} />}
              disabled={refreshing || loading}
              onClick={() => fetchDashboardData(true)}
            />
          </Tooltip>
        </Flex>
      }
    >
      <Alert
        title="Asset Fleet & Inventory Audit"
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
      ) : error && !data ? (
        <Card
          size="small"
          styles={{ body: { textAlign: 'center', padding: '36px 0' } }}
          style={{ margin: '20px 0' }}
        >
          <WarningOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 12 }} />
          <Title level={4} style={{ margin: '0 0 8px 0' }}>
            Telemetry Data Unavailable
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {error}
          </Text>
          <Button type="primary" onClick={() => fetchDashboardData()}>
            Retry Telemetry Sync
          </Button>
        </Card>
      ) : (
        <>
          <TelemetryCardsGrid data={data} onNavigate={navigate} />

          <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
            <Col xs={24} md={24} lg={16}>
              <InfrastructureHealthCard health={data?.health} />
            </Col>
            <Col xs={24} md={24} lg={8}>
              <QuickActionHub onNavigate={navigate} />
            </Col>
          </Row>

          <Row gutter={[14, 14]}>
            <Col xs={24} md={24} lg={15} xl={15}>
              <ActivityStreamCard
                activities={data?.recentActivity}
                refreshing={refreshing}
                onRefresh={() => fetchDashboardData(true)}
                onNavigate={navigate}
              />
            </Col>

            <Col xs={24} md={24} lg={9} xl={9}>
              <ActionQueueCard items={data?.actionItems} onNavigate={navigate} />
            </Col>
          </Row>
        </>
      )}
    </PageContainer>
  );
}
