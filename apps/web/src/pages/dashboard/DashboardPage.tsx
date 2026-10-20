import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  FileWordOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LaptopOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UploadOutlined,
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
  Upload,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import PageContainer from '../../components/PageContainer';
import { assetsService } from '../../services/assets.service';
import {
  type DashboardOverview,
  type PendingHandoverRecordItem,
  type PendingHandoverSummaryResponse,
  dashboardService,
} from '../../services/dashboard.service';
import { useAuthStore } from '../../stores/auth.store';
import { HandoverDocumentModal } from '../assets/components/HandoverDocumentModal';
import { downloadBlobFile } from '../assets/utils/printDocument';
import { formatErrorMessage } from '../../utils/feedback';
import { formatActionLabel } from '../../components/ActivityTimeline';

const { Title, Text } = Typography;

export type RecentActivityItem = DashboardOverview['recentActivity'][number];
export type AuditDeepLinkTarget = Partial<RecentActivityItem> & {
  key?: string;
  id?: string;
};
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

function getActionTagColor(action?: string): string {
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
    return 'error';
  }
  if (
    upper === 'TERMINATED' ||
    upper.includes('DECOMMISSION') ||
    upper.includes('DELET') ||
    upper.includes('REMOVE') ||
    upper.includes('REVOKE') ||
    upper.includes('RECLAIM') ||
    upper.includes('SUSPEND') ||
    upper.includes('BLOCKED') ||
    upper.includes('DESTROY') ||
    upper.includes('EXPIRE')
  ) {
    return 'error';
  }
  if (
    upper === 'RESOLVED' ||
    upper.includes('SUCCESS') ||
    upper.includes('COMPLETE') ||
    upper.includes('VERIF') ||
    upper.includes('APPROVE') ||
    upper.includes('OK')
  ) {
    return 'success';
  }
  if (
    upper === 'PROVISIONED' ||
    upper.includes('CREATE') ||
    upper.includes('ADD') ||
    upper.includes('ASSIGN') ||
    upper.includes('ALLOCAT') ||
    upper.includes('GRANT') ||
    upper.includes('RESTOCK') ||
    upper.includes('REORDER') ||
    upper.includes('REGISTER')
  ) {
    return 'processing';
  }
  if (
    upper === 'UPDATED' ||
    upper.includes('SYNC') ||
    upper.includes('EDIT') ||
    upper.includes('RESET') ||
    upper.includes('CONFIG') ||
    upper.includes('PATCH') ||
    upper.includes('MODIFY')
  ) {
    return 'warning';
  }
  if (upper.includes('RETURN')) return 'purple';
  return 'default';
}

function renderActionTag(action?: string) {
  const color = getActionTagColor(action);
  const upper = (action || '').toUpperCase();
  const humanized = formatActionLabel(action || '');
  return (
    <Tag
      color={color}
      data-action={action}
      style={{
        margin: 0,
        fontSize: 10.5,
        lineHeight: '16px',
        padding: '0 6px',
        fontWeight: 500,
      }}
    >
      {humanized || upper || 'Event'}
      <span style={{ display: 'none' }}>{upper || 'EVENT'}</span>
    </Tag>
  );
}

export function buildAuditDeepLink(record?: AuditDeepLinkTarget | null): string {
  if (!record) {
    return '/audit';
  }
  if (record.linkUrl && record.linkUrl.startsWith('/audit?')) {
    return record.linkUrl;
  }
  const params = new URLSearchParams();
  if (record.entityType) {
    params.set('entityType', record.entityType);
  }
  const entityStr = record.entity || '';
  const match =
    entityStr.match(/\b([A-Za-z]+-[0-9]+)\b/) || entityStr.match(/\b([0-9a-fA-F-]{36})\b/);
  const resolvedEntityId = match
    ? match[1]
    : entityStr && !['System', 'Authentication', 'Audit'].includes(entityStr)
      ? entityStr
      : undefined;
  if (resolvedEntityId) {
    params.set('entityId', resolvedEntityId);
  }
  const inspectId = record.key || record.id;
  if (inspectId) {
    params.set('inspectId', inspectId);
  }
  const query = params.toString();
  return query ? `/audit?${query}` : '/audit';
}

function getEntityLink(
  entity?: string,
  entityType?: string,
  explicitUrl?: string,
  record?: RecentActivityItem,
): string {
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
  if (record) {
    return buildAuditDeepLink(record);
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
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      title={
        <Flex align="center" gap={6}>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <span>Action Items Queue</span>
          {items.length > 0 && (
            <Badge
              count={items.length}
              size="small"
              style={{
                backgroundColor: criticalCount > 0 ? '#ff4d4f' : '#faad14',
                boxShadow: 'none',
              }}
            />
          )}
        </Flex>
      }
      styles={{
        header: { flexWrap: 'wrap', minHeight: 44, gap: 6, padding: '6px 12px' },
        body: {
          padding: '8px 10px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        },
      }}
      extra={
        <Segmented
          size="small"
          value={filter}
          onChange={(val) => setFilter(val as 'all' | 'error' | 'warning' | 'info')}
          options={filterOptions}
        />
      }
    >
      {filteredItems.length === 0 ? (
        <div
          style={{
            padding: '24px 0',
            textAlign: 'center',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 6 }} />
          <Text strong style={{ display: 'block', fontSize: 12.5 }}>
            {items.length === 0 ? 'All Systems Operational' : 'No Matching Action Items'}
          </Text>
          <Text type="secondary" style={{ fontSize: 11.5 }}>
            {items.length === 0
              ? 'No pending action items require immediate attention.'
              : 'No action items match the selected priority filter.'}
          </Text>
        </div>
      ) : (
        <Flex
          vertical
          gap={8}
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            paddingRight: 4,
            paddingBottom: 4,
          }}
        >
          {filteredItems.map((item) => {
            const isError = item.type === 'error';
            const isWarning = item.type === 'warning';
            return (
              <div
                key={item.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: isError
                    ? 'rgba(239, 68, 68, 0.05)'
                    : isWarning
                      ? 'rgba(245, 158, 11, 0.05)'
                      : 'rgba(22, 119, 255, 0.05)',
                  border: isError
                    ? '1px solid rgba(239, 68, 68, 0.18)'
                    : isWarning
                      ? '1px solid rgba(245, 158, 11, 0.18)'
                      : '1px solid rgba(22, 119, 255, 0.18)',
                }}
              >
                <Flex justify="space-between" align="center" gap={6}>
                  <Flex gap={6} align="center" style={{ minWidth: 0 }}>
                    {isError ? (
                      <AlertOutlined style={{ color: '#ef4444', fontSize: 13, flexShrink: 0 }} />
                    ) : isWarning ? (
                      <WarningOutlined style={{ color: '#f59e0b', fontSize: 13, flexShrink: 0 }} />
                    ) : (
                      <InfoCircleOutlined
                        style={{ color: '#1677ff', fontSize: 13, flexShrink: 0 }}
                      />
                    )}
                    <Text strong ellipsis style={{ fontSize: 12, lineHeight: 1.3 }}>
                      {item.title}
                    </Text>
                  </Flex>
                  <Tag
                    color={item.tagColor}
                    style={{
                      fontSize: 10.5,
                      lineHeight: '16px',
                      padding: '0 4px',
                      margin: 0,
                      flexShrink: 0,
                    }}
                  >
                    {item.tag}
                  </Tag>
                </Flex>
                <Flex justify="space-between" align="center" gap={8} style={{ marginTop: 4 }}>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.35,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {item.description}
                  </Text>
                  <Button
                    type="link"
                    size="small"
                    style={{
                      padding: '2px 0',
                      height: 'auto',
                      fontSize: 11.5,
                      fontWeight: 500,
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    onClick={() => onNavigate(item.linkUrl)}
                  >
                    <Space size={2}>
                      <span>{(item.linkText || '').replace(/[\s→←↑↓]+$/, '')}</span>
                      <RightOutlined style={{ fontSize: 8.5 }} />
                    </Space>
                  </Button>
                </Flex>
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

  const deduplicatedActivities = useMemo(() => {
    const seenKeys = new Set<string>();
    const seenSignatures = new Set<string>();
    return activities.filter((act) => {
      if (act.key) {
        if (seenKeys.has(act.key)) return false;
        seenKeys.add(act.key);
      }
      const sig = `${act.user || ''}-${act.action || ''}-${act.entity || ''}-${act.details || ''}-${act.time || ''}`;
      if (seenSignatures.has(sig)) return false;
      seenSignatures.add(sig);
      return true;
    });
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (actionFilter === 'ALL') return deduplicatedActivities;
    return deduplicatedActivities.filter((act) => {
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
  }, [deduplicatedActivities, actionFilter]);

  const columns = [
    {
      title: 'Actor',
      dataIndex: 'user',
      key: 'user',
      width: 140,
      render: (text: string, record: RecentActivityItem) => (
        <Flex align="center" gap={7}>
          <Avatar
            size={22}
            style={{
              backgroundColor: record.avatarColor || '#1677ff',
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {text ? text[0]?.toUpperCase() : 'U'}
          </Avatar>
          <Flex vertical gap={0} style={{ minWidth: 0 }}>
            <Text strong ellipsis style={{ fontSize: 12, lineHeight: 1.25 }}>
              {text || 'System'}
            </Text>
            <div>
              <Tag
                color={getRoleColor(record.role)}
                style={{ margin: 0, fontSize: 10, lineHeight: '14px', padding: '0 4px' }}
              >
                {record.role || 'System'}
              </Tag>
            </div>
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 115,
      render: renderActionTag,
    },
    {
      title: 'Target Entity & Details',
      dataIndex: 'entity',
      key: 'entity',
      align: 'left' as const,
      ellipsis: true,
      render: (entity: string, record: RecentActivityItem) => {
        const link = getEntityLink(entity, record.entityType, record.linkUrl, record);
        const auditDeepLink = buildAuditDeepLink(record);
        return (
          <Flex
            vertical
            justify="center"
            align="flex-start"
            gap={2}
            style={{ minWidth: 0, width: '100%', textAlign: 'left' }}
          >
            <Flex
              justify="space-between"
              align="center"
              style={{ width: '100%', gap: 6, minWidth: 0 }}
            >
              <Button
                type="link"
                size="small"
                style={{
                  padding: 0,
                  height: 'auto',
                  fontWeight: 600,
                  fontSize: 12,
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  minWidth: 0,
                  maxWidth: 'calc(100% - 64px)',
                }}
                onClick={() => onNavigate(link)}
              >
                <Space
                  size={2}
                  style={{
                    maxWidth: '100%',
                    overflow: 'hidden',
                    justifyContent: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      maxWidth: '100%',
                      textAlign: 'left',
                    }}
                    title={entity || 'System'}
                  >
                    {entity || 'System'}
                  </span>
                  <RightOutlined style={{ fontSize: 8.5, flexShrink: 0 }} />
                </Space>
              </Button>
              <Button
                type="link"
                size="small"
                icon={<AuditOutlined />}
                style={{
                  padding: '0 4px',
                  height: 'auto',
                  fontSize: 11,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                onClick={() => onNavigate(auditDeepLink)}
                title="Inspect in Full Audit Trail"
                data-testid={`inspect-audit-${record.key}`}
              >
                Inspect
              </Button>
            </Flex>
            <Text
              type="secondary"
              ellipsis={{ tooltip: record.details }}
              style={{
                fontSize: 11,
                lineHeight: 1.3,
                margin: 0,
                maxWidth: '100%',
                textAlign: 'left',
                display: 'block',
                cursor: 'pointer',
              }}
              onClick={() => onNavigate(auditDeepLink)}
              title="Click to inspect audit event in full detail"
            >
              {record.details}
            </Text>
          </Flex>
        );
      },
    },
    {
      title: 'Timestamp',
      dataIndex: 'time',
      key: 'time',
      width: 90,
      align: 'right' as const,
      render: (time: string, record: RecentActivityItem) => (
        <Tooltip title={record.timestamp || time}>
          <Text type="secondary" style={{ fontSize: 11, cursor: 'help', whiteSpace: 'nowrap' }}>
            {time}
          </Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <Card
      size="small"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      title={
        <Flex align="center" gap={6}>
          <HistoryOutlined style={{ color: '#1677ff' }} />
          <span>Live Activity Stream</span>
          {deduplicatedActivities.length > 0 && (
            <Badge
              count={deduplicatedActivities.length}
              size="small"
              style={{
                backgroundColor: '#e6f4ff',
                color: '#1677ff',
                boxShadow: 'none',
              }}
            />
          )}
        </Flex>
      }
      extra={
        <Flex gap={6} align="center" wrap="wrap">
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
          <Button
            type="link"
            size="small"
            icon={<AuditOutlined />}
            style={{ padding: '0 4px', fontSize: 12 }}
            onClick={() => onNavigate('/audit')}
            data-testid="dashboard-audit-trail-btn"
          >
            <Space size={2}>
              <span>Audit Trail</span>
              <RightOutlined style={{ fontSize: 9 }} />
            </Space>
          </Button>
        </Flex>
      }
      styles={{
        header: { flexWrap: 'wrap', minHeight: 44, gap: 6, padding: '6px 12px' },
        body: { padding: 0, overflow: 'hidden', flex: 1 },
      }}
    >
      <Table
        rowKey="key"
        columns={columns}
        dataSource={filteredActivities}
        pagination={false}
        size="small"
        tableLayout="fixed"
        locale={{
          emptyText:
            deduplicatedActivities.length === 0
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
  const [pendingHandovers, setPendingHandovers] = useState<PendingHandoverSummaryResponse | null>(
    null,
  );
  const [loadingHandovers, setLoadingHandovers] = useState(false);
  const [selectedRecordForPreview, setSelectedRecordForPreview] =
    useState<PendingHandoverRecordItem | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [downloadingDocxId, setDownloadingDocxId] = useState<string | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const activeFetchIdRef = useRef(0);

  const fetchPendingHandovers = useCallback(async () => {
    try {
      setLoadingHandovers(true);
      const res = await dashboardService.getPendingHandovers();
      setPendingHandovers(res);
    } catch (err: unknown) {
      messageRef.current.warning(formatErrorMessage(err, 'load pending handover documents'));
    } finally {
      setLoadingHandovers(false);
    }
  }, []);

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const fetchId = ++activeFetchIdRef.current;

      try {
        const [overview] = await Promise.all([
          dashboardService.getOverview(period, isManualRefresh),
          fetchPendingHandovers(),
        ]);
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
    [fetchPendingHandovers, period],
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time query invalidation when custody updates occur
  useEffect(() => {
    const handleCustodyEvent = () => {
      fetchPendingHandovers();
    };
    window.addEventListener('uims:handover-update', handleCustodyEvent);
    window.addEventListener('uims:notification', handleCustodyEvent);
    return () => {
      window.removeEventListener('uims:handover-update', handleCustodyEvent);
      window.removeEventListener('uims:notification', handleCustodyEvent);
    };
  }, [fetchPendingHandovers]);

  const handleDownloadDocx = async (record: PendingHandoverRecordItem) => {
    try {
      setDownloadingDocxId(record.id);
      const { blob, filename } = await assetsService.downloadHandoverDocx({
        assetIds: [record.assetId],
        type: ((record.type || record.handoverType || 'ASSIGNMENT') as string).toLowerCase() as
          | 'assignment'
          | 'return'
          | 'transfer',
        recipientId: record.recipientId,
      });
      const targetFilename =
        filename ||
        `Handover_${record.subcode || record.assetTag}_${new Date().toISOString().split('T')[0]}.docx`;
      downloadBlobFile(blob, targetFilename);
      messageRef.current.success('Handover document (.docx) downloaded successfully.');
    } catch (_err: unknown) {
      messageRef.current.error('Failed to download Word document. Please try again.');
    } finally {
      setDownloadingDocxId(null);
    }
  };

  const handlePreviewForm = async (record: PendingHandoverRecordItem) => {
    try {
      const res = await assetsService.generateHandoverDocument({
        assetIds: [record.assetId],
        type: ((record.type || record.handoverType || 'ASSIGNMENT') as string).toLowerCase() as
          | 'assignment'
          | 'return'
          | 'transfer',
        recipientId: record.recipientId,
      });
      setSelectedRecordForPreview(record);
      setPreviewHtml(res.html);
      setPreviewModalOpen(true);
    } catch (_err: unknown) {
      messageRef.current.error('Failed to generate document preview.');
    }
  };

  const handleUploadSignedCopy = async (file: File, record: PendingHandoverRecordItem) => {
    try {
      setUploadingDocId(record.id);
      const uploadRes = await assetsService.uploadHandoverDocument(file, record.assetId);
      const signedUrl = uploadRes.fileUrl;
      if (signedUrl && record.assetId) {
        await assetsService.attachHandoverDocument(record.assetId, { fileUrl: signedUrl });
      }
      messageRef.current.success(
        `Signed handover document uploaded for ${record.subcode || record.assetTag}.`,
      );
      fetchPendingHandovers();
    } catch (_err: unknown) {
      messageRef.current.error('Failed to upload signed handover document.');
    } finally {
      setUploadingDocId(null);
    }
    return false;
  };

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
          {pendingHandovers && pendingHandovers.totalPending > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              title={
                <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                  <span>
                    <strong>
                      {pendingHandovers.totalPending} Pending Handover Document
                      {pendingHandovers.totalPending > 1 ? 's' : ''} Require Action.
                    </strong>
                    {pendingHandovers.overdueCount > 0 && (
                      <span style={{ marginLeft: 8, color: '#cf1322', fontWeight: 600 }}>
                        ({pendingHandovers.overdueCount} overdue &gt; 3 days)
                      </span>
                    )}
                  </span>
                  <Button
                    size="small"
                    type="primary"
                    danger={pendingHandovers.overdueCount > 0}
                    onClick={() => navigate('/assets')}
                  >
                    View in Assets
                  </Button>
                </Flex>
              }
              description="Physical units were allocated, returned, or transferred without uploaded signed physical receipts. Download generated forms, acquire signatures, and upload scanned copies to achieve full compliance."
              style={{ marginBottom: 18 }}
            />
          )}

          <TelemetryCardsGrid data={data} onNavigate={navigate} />

          {pendingHandovers && pendingHandovers.totalPending > 0 && (
            <Card
              title={
                <Flex align="center" justify="space-between">
                  <Space>
                    <SafetyCertificateOutlined style={{ color: '#faad14' }} />
                    <span>Pending Handover Documents Compliance</span>
                    <Badge
                      count={pendingHandovers.totalPending}
                      overflowCount={999}
                      style={{
                        backgroundColor: pendingHandovers.overdueCount > 0 ? '#ff4d4f' : '#faad14',
                      }}
                    />
                  </Space>
                  <Tooltip title="Refresh compliance records">
                    <Button
                      size="small"
                      icon={<ReloadOutlined spin={loadingHandovers} />}
                      onClick={fetchPendingHandovers}
                    />
                  </Tooltip>
                </Flex>
              }
              size="small"
              styles={{ body: { padding: '12px 16px' } }}
              style={{ marginBottom: 18 }}
            >
              <Table
                size="small"
                loading={loadingHandovers}
                dataSource={pendingHandovers.records || []}
                rowKey={(r) => r.id || r.recordId || `${r.assetId}-${r.type}`}
                pagination={{
                  pageSize: 5,
                  showSizeChanger: true,
                  pageSizeOptions: ['5', '10', '25'],
                }}
                columns={[
                  {
                    title: 'Record & Asset',
                    key: 'asset',
                    width: 260,
                    render: (_: unknown, record: PendingHandoverRecordItem) => {
                      const t = (record.type || record.handoverType || '').toUpperCase();
                      const color =
                        t === 'ASSIGNMENT' ? 'blue' : t === 'RETURN' ? 'orange' : 'purple';
                      return (
                        <Flex vertical gap={3} align="flex-start">
                          <Flex align="center" gap={6}>
                            <Tag color={color} style={{ margin: 0, fontSize: 10 }}>
                              {t}
                            </Tag>
                            <Text
                              strong
                              code
                              style={{ cursor: 'pointer', color: '#1677ff', margin: 0 }}
                              onClick={() => navigate(`/assets?drawer=${record.assetId}`)}
                            >
                              {record.subcode || record.assetTag}
                            </Text>
                          </Flex>
                          {record.modelName && (
                            <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                              {record.modelName}
                            </Text>
                          )}
                          {record.serialNumber && (
                            <Text type="secondary" style={{ fontSize: 10.5 }}>
                              SN: {record.serialNumber}
                            </Text>
                          )}
                        </Flex>
                      );
                    },
                  },
                  {
                    title: 'Custodian',
                    key: 'custodian',
                    width: 200,
                    render: (_: unknown, record: PendingHandoverRecordItem) => (
                      <Flex vertical gap={2} align="flex-start">
                        <Text strong style={{ fontSize: 12 }}>
                          {record.recipientName || 'Unassigned'}
                        </Text>
                        {(record.department || record.departmentName) && (
                          <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>
                            {record.department || record.departmentName}
                          </Tag>
                        )}
                      </Flex>
                    ),
                  },
                  {
                    title: 'Status & Timeline',
                    key: 'status',
                    width: 200,
                    render: (_: unknown, record: PendingHandoverRecordItem) => (
                      <Flex vertical gap={3} align="flex-start">
                        <Tag
                          color={record.isOverdue ? 'error' : 'warning'}
                          icon={<WarningOutlined />}
                          style={{ margin: 0 }}
                        >
                          {record.isOverdue ? 'Overdue (>3d)' : 'Pending Scanned Copy'}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {record.createdAt ? record.createdAt.split('T')[0] : '—'} (
                          {record.timeAgo || `${record.daysPending || 0}d ago`})
                        </Text>
                      </Flex>
                    ),
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    width: 220,
                    render: (_: unknown, record: PendingHandoverRecordItem) => (
                      <Space size="small">
                        <Tooltip title="Preview & Print Form">
                          <Button
                            size="small"
                            icon={<FileTextOutlined />}
                            onClick={() => handlePreviewForm(record)}
                          />
                        </Tooltip>
                        <Tooltip title="Download Word (.docx) Form">
                          <Button
                            size="small"
                            icon={<FileWordOutlined />}
                            loading={downloadingDocxId === record.id}
                            onClick={() => handleDownloadDocx(record)}
                          />
                        </Tooltip>
                        <Upload
                          showUploadList={false}
                          beforeUpload={(file) => {
                            handleUploadSignedCopy(file, record);
                            return false;
                          }}
                        >
                          <Tooltip title="Upload Signed Physical Copy">
                            <Button
                              size="small"
                              type="primary"
                              icon={<UploadOutlined />}
                              loading={uploadingDocId === record.id}
                            >
                              Upload
                            </Button>
                          </Tooltip>
                        </Upload>
                        <Tooltip title="View Asset Details">
                          <Button
                            size="small"
                            type="text"
                            shape="circle"
                            icon={<RightOutlined />}
                            onClick={() => navigate(`/assets?drawer=${record.assetId}`)}
                          />
                        </Tooltip>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          <Row gutter={[14, 14]} style={{ marginBottom: 18 }}>
            <Col xs={24} md={24} lg={16}>
              <InfrastructureHealthCard health={data?.health} />
            </Col>
            <Col xs={24} md={24} lg={8}>
              <QuickActionHub onNavigate={navigate} />
            </Col>
          </Row>

          <Row gutter={[14, 14]}>
            <Col
              xs={24}
              md={24}
              lg={15}
              xl={15}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <ActivityStreamCard
                activities={data?.recentActivity}
                refreshing={refreshing}
                onRefresh={() => fetchDashboardData(true)}
                onNavigate={navigate}
              />
            </Col>

            <Col xs={24} md={24} lg={9} xl={9} style={{ display: 'flex', flexDirection: 'column' }}>
              <ActionQueueCard items={data?.actionItems} onNavigate={navigate} />
            </Col>
          </Row>
        </>
      )}

      {previewModalOpen && selectedRecordForPreview && (
        <HandoverDocumentModal
          open={previewModalOpen}
          title={`Handover Record Preview — ${selectedRecordForPreview.subcode || selectedRecordForPreview.assetTag}`}
          html={previewHtml}
          filename={`Handover_${selectedRecordForPreview.subcode || selectedRecordForPreview.assetTag}`}
          onClose={() => setPreviewModalOpen(false)}
          onDownloadDocx={() => handleDownloadDocx(selectedRecordForPreview)}
          downloadingDocx={downloadingDocxId === selectedRecordForPreview.id}
        />
      )}
    </PageContainer>
  );
}
