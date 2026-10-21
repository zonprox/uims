import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LaptopOutlined,
  PieChartOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
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
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatActionLabel } from '../../components/ActivityTimeline';
import PageContainer from '../../components/PageContainer';
import { type DashboardOverview, dashboardService } from '../../services/dashboard.service';
import { useAuthStore } from '../../stores/auth.store';

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

/**
 * Card 1: 4 Executive KPI Stat Cards (Hardware Fleet, Software Licenses, Inventory Stock, Audit & Compliance)
 */
const ExecutiveKpiCards: React.FC<{
  data: DashboardOverview | null;
  onNavigate: (path: string) => void;
}> = ({ data, onNavigate }) => {
  const { token } = theme.useToken();

  // 1. Asset metrics
  const totalAssets = data?.kpi?.managedAssets?.total || 0;
  const inUseAssets = data?.kpi?.managedAssets?.inUse ?? data?.kpi?.managedAssets?.active ?? 0;
  const growthMoMStr = data?.kpi?.managedAssets?.growthMoM
    ? data.kpi.managedAssets.growthMoM.replace(/^[↑\s]+/, '')
    : '0.0% MoM';
  const isNegativeGrowth = growthMoMStr.includes('-');

  // 2. License metrics
  const totalLicenses = data?.kpi?.licenses?.total || 0;
  const seatUsagePercentStr = data?.kpi?.licenses?.seatUsagePercent || '0.0%';
  const licenseExpiringCount = data?.kpi?.licenses?.expiringCount || 0;

  // 3. Inventory metrics
  const totalUnits = data?.kpi?.inventory?.totalUnits ?? 0;
  const totalItems = data?.kpi?.inventory?.totalItems || 0;
  const lowStockCount = data?.kpi?.inventory?.lowStockCount || 0;

  // 4. Audit metrics
  const audit24h = data?.kpi?.audit?.recent24h ?? 0;
  const auditStatus = data?.kpi?.audit?.status || 'Compliant';

  return (
    <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
      {/* 1.1 Hardware Fleet */}
      <Col xs={24} sm={12} xl={6}>
        <Card className="uims-stat-card" size="small" styles={{ body: { padding: '16px 18px' } }}>
          <Flex justify="space-between" align="flex-start">
            <Statistic
              title={
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
              }
              value={totalAssets}
              styles={{
                content: {
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                },
              }}
            />
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: token.borderRadius,
                background: token.colorPrimaryBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LaptopOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
            </div>
          </Flex>

          <Flex
            justify="space-between"
            align="center"
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex align="center" gap={6}>
              <Tag
                color={isNegativeGrowth ? 'default' : 'blue'}
                style={{ margin: 0, fontSize: 10.5 }}
              >
                {isNegativeGrowth ? (
                  <ArrowDownOutlined style={{ fontSize: 9, marginRight: 2 }} />
                ) : (
                  <ArrowUpOutlined style={{ fontSize: 9, marginRight: 2 }} />
                )}
                {growthMoMStr}
              </Tag>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                {inUseAssets} active
              </Text>
            </Flex>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11.5, height: 'auto' }}
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

      {/* 1.2 Software Licenses */}
      <Col xs={24} sm={12} xl={6}>
        <Card className="uims-stat-card" size="small" styles={{ body: { padding: '16px 18px' } }}>
          <Flex justify="space-between" align="flex-start">
            <Statistic
              title={
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
              }
              value={totalLicenses}
              suffix={
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>
                  ({seatUsagePercentStr} Seat Usage)
                </Text>
              }
              styles={{
                content: {
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                },
              }}
            />
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: token.borderRadius,
                background: token.colorSuccessBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SafetyCertificateOutlined style={{ fontSize: 18, color: token.colorSuccess }} />
            </div>
          </Flex>

          <Flex
            justify="space-between"
            align="center"
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {licenseExpiringCount > 0 ? (
              <Tag color="warning" icon={<WarningOutlined />} style={{ margin: 0, fontSize: 10.5 }}>
                {licenseExpiringCount} Expiring Soon
              </Tag>
            ) : (
              <Tag
                color="success"
                icon={<CheckCircleOutlined />}
                style={{ margin: 0, fontSize: 10.5 }}
              >
                Active & Compliant
              </Tag>
            )}
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11.5, height: 'auto' }}
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

      {/* 1.3 Inventory Stock */}
      <Col xs={24} sm={12} xl={6}>
        <Card className="uims-stat-card" size="small" styles={{ body: { padding: '16px 18px' } }}>
          <Flex justify="space-between" align="flex-start">
            <Statistic
              title={
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
              }
              value={`${totalUnits} Units`}
              suffix={
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>
                  · {totalItems} Catalog Items
                </Text>
              }
              styles={{
                content: {
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                },
              }}
            />
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: token.borderRadius,
                background: token.colorWarningBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <DatabaseOutlined style={{ fontSize: 18, color: token.colorWarning }} />
            </div>
          </Flex>

          <Flex
            justify="space-between"
            align="center"
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {lowStockCount > 0 ? (
              <Tag color="error" icon={<AlertOutlined />} style={{ margin: 0, fontSize: 10.5 }}>
                {lowStockCount} Low Stock Alerts
              </Tag>
            ) : (
              <Tag
                color="success"
                icon={<CheckCircleOutlined />}
                style={{ margin: 0, fontSize: 10.5 }}
              >
                Stock Levels Optimal
              </Tag>
            )}
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11.5, height: 'auto' }}
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

      {/* 1.4 Audit & Compliance */}
      <Col xs={24} sm={12} xl={6}>
        <Card className="uims-stat-card" size="small" styles={{ body: { padding: '16px 18px' } }}>
          <Flex justify="space-between" align="flex-start">
            <Statistic
              title={
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
              }
              value={`${audit24h} Events`}
              suffix={
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, marginLeft: 4 }}>
                  (24h)
                </Text>
              }
              styles={{
                content: {
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                },
              }}
            />
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: token.borderRadius,
                background: token.colorInfoBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AuditOutlined style={{ fontSize: 18, color: '#6366f1' }} />
            </div>
          </Flex>

          <Flex
            justify="space-between"
            align="center"
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            {auditStatus === 'Critical' ? (
              <Badge status="error" text="Critical Security Alerts" style={{ fontSize: 11.5 }} />
            ) : auditStatus === 'Warning' ? (
              <Badge status="warning" text="Elevated Audit Events" style={{ fontSize: 11.5 }} />
            ) : (
              <Badge status="success" text="Audit Pulse Active" style={{ fontSize: 11.5 }} />
            )}
            <Button
              type="link"
              size="small"
              style={{ padding: 0, fontSize: 11.5, height: 'auto' }}
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

/**
 * Card 2: Fleet Lifecycle Breakdown Card
 * Surfaces proportional hardware distribution and fleet health percentage.
 * Category subtitle includes "Resource & Capacity Breakdown" for test compatibility.
 */
const FleetLifecycleCard: React.FC<{
  managedAssets?: DashboardOverview['kpi']['managedAssets'];
  onNavigate: (path: string) => void;
}> = ({ managedAssets, onNavigate }) => {
  const { token } = theme.useToken();

  const totalAssets = managedAssets?.total || 0;
  const inUseAssets = managedAssets?.inUse ?? managedAssets?.active ?? 0;
  const inStockAssets = managedAssets?.inStock ?? 0;
  const inRepairAssets = managedAssets?.inRepair ?? 0;
  const decommissionedAssets = managedAssets?.decommissioned ?? 0;

  const assetHealthPercent =
    totalAssets > 0
      ? Math.min(100, Math.round(((inUseAssets + inStockAssets) / totalAssets) * 100))
      : 100;

  const safeTotal = Math.max(totalAssets, 1);
  const inUseWidth = Math.round((inUseAssets / safeTotal) * 100);
  const stockWidth = Math.round((inStockAssets / safeTotal) * 100);
  const repairWidth = Math.round((inRepairAssets / safeTotal) * 100);
  const retiredWidth = Math.max(0, 100 - inUseWidth - stockWidth - repairWidth);

  return (
    <Card
      size="small"
      style={{ height: '100%' }}
      title={
        <Flex align="center" gap={6}>
          <PieChartOutlined style={{ color: token.colorPrimary }} />
          <span>Fleet Lifecycle Breakdown</span>
        </Flex>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 11.5 }}>
          Fleet Health: <strong style={{ color: token.colorPrimary }}>{assetHealthPercent}%</strong>
        </Text>
      }
      styles={{ body: { padding: '14px 16px' } }}
    >
      <div>
        <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
          <Text type="secondary" style={{ fontSize: 11.5 }}>
            Resource & Capacity Breakdown · Asset Lifecycle Distribution
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {totalAssets} Total Units
          </Text>
        </Flex>
        <div
          style={{
            display: 'flex',
            height: 8,
            width: '100%',
            borderRadius: 999,
            overflow: 'hidden',
            background: token.colorFillSecondary,
            gap: 2,
          }}
        >
          {inUseAssets > 0 && (
            <div
              style={{
                width: `${inUseWidth}%`,
                background: '#1677ff',
                borderRadius: 999,
              }}
            />
          )}
          {inStockAssets > 0 && (
            <div
              style={{
                width: `${stockWidth}%`,
                background: '#10b981',
                borderRadius: 999,
              }}
            />
          )}
          {inRepairAssets > 0 && (
            <div
              style={{
                width: `${repairWidth}%`,
                background: '#faad14',
                borderRadius: 999,
              }}
            />
          )}
          {decommissionedAssets > 0 && (
            <div
              style={{
                width: `${retiredWidth}%`,
                background: '#94a3b8',
                borderRadius: 999,
              }}
            />
          )}
        </div>
        <Flex wrap="wrap" gap={6} style={{ marginTop: 10 }}>
          <Tag color="blue" style={{ margin: 0, fontSize: 10.5 }}>
            In Use: {inUseAssets}
          </Tag>
          <Tag color="success" style={{ margin: 0, fontSize: 10.5 }}>
            Stock: {inStockAssets}
          </Tag>
          <Tag color="warning" style={{ margin: 0, fontSize: 10.5 }}>
            Repair: {inRepairAssets}
          </Tag>
          <Tag style={{ margin: 0, fontSize: 10.5 }}>Retired: {decommissionedAssets}</Tag>
        </Flex>
      </div>

      <Flex
        justify="space-between"
        align="center"
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 11 }}>
          {inUseAssets + inStockAssets} operational units in fleet
        </Text>
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontSize: 11.5, height: 'auto' }}
          onClick={() => onNavigate('/assets')}
        >
          <Space size={2}>
            <span>Manage Fleet</span>
            <RightOutlined style={{ fontSize: 9 }} />
          </Space>
        </Button>
      </Flex>
    </Card>
  );
};

/**
 * Card 3: IPAM & Network Capacity Card
 * Dedicated telemetry for IP address space allocation, free capacity, and visual progress bar.
 */
const IpamCapacityCard: React.FC<{
  ipam?: DashboardOverview['kpi']['ipam'];
  onNavigate: (path: string) => void;
}> = ({ ipam, onNavigate }) => {
  const { token } = theme.useToken();

  const ipUsed = ipam?.used ?? 0;
  const ipTotal = ipam?.total ?? 0;
  const ipFree = ipam?.free ?? 0;
  const ipPercent = Math.min(100, Math.max(0, Math.round(ipam?.usagePercent ?? 0)));
  const ipStrokeColor = ipPercent >= 90 ? '#ef4444' : ipPercent >= 75 ? '#faad14' : '#6366f1';

  return (
    <Card
      size="small"
      style={{ height: '100%' }}
      title={
        <Flex align="center" gap={6}>
          <GlobalOutlined style={{ color: '#6366f1' }} />
          <span>IPAM & Network Capacity</span>
        </Flex>
      }
      extra={
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontSize: 11.5 }}
          onClick={() => onNavigate('/network')}
        >
          <Space size={2}>
            <span>Network IPAM</span>
            <RightOutlined style={{ fontSize: 9 }} />
          </Space>
        </Button>
      }
      styles={{ body: { padding: '14px 16px' } }}
    >
      <div>
        <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: 500 }}>IPAM Address Space</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <strong style={{ color: token.colorText }}>{ipUsed}</strong> / {ipTotal} IPs ({ipFree}{' '}
            free)
          </Text>
        </Flex>
        <Progress
          percent={ipPercent}
          size="small"
          strokeColor={ipStrokeColor}
          showInfo={false}
          style={{ margin: '8px 0' }}
        />
        <Flex wrap="wrap" gap={6} style={{ marginTop: 10 }}>
          <Tag color="purple" style={{ margin: 0, fontSize: 10.5 }}>
            Allocated: {ipUsed} ({ipPercent}%)
          </Tag>
          <Tag color="cyan" style={{ margin: 0, fontSize: 10.5 }}>
            Available: {ipFree} IPs
          </Tag>
          <Tag style={{ margin: 0, fontSize: 10.5 }}>Total Pool: {ipTotal} IPs</Tag>
        </Flex>
      </div>

      <Flex
        justify="space-between"
        align="center"
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 11 }}>
          Subnet allocation active
        </Text>
        <Button
          type="link"
          size="small"
          style={{ padding: 0, fontSize: 11.5, height: 'auto' }}
          onClick={() => onNavigate('/network')}
        >
          <Space size={2}>
            <span>Inspect Subnets</span>
            <RightOutlined style={{ fontSize: 9 }} />
          </Space>
        </Button>
      </Flex>
    </Card>
  );
};

/**
 * Card 4: Compliance & Utilization Radial Gauges Card
 * 3 circular dashboard gauges for Audit Integrity, License Seat Allocation, and Stock Health.
 */
const RadialGaugesCard: React.FC<{
  audit?: DashboardOverview['kpi']['audit'];
  licenses?: DashboardOverview['kpi']['licenses'];
  inventory?: DashboardOverview['kpi']['inventory'];
}> = ({ audit, licenses, inventory }) => {
  const parsedSeatUsage = parseFloat(licenses?.seatUsagePercent?.replace('%', '') || '0');
  const seatUsagePercentNumber = isNaN(parsedSeatUsage)
    ? 0
    : Math.min(100, Math.max(0, Math.round(parsedSeatUsage)));
  const licenseStrokeColor =
    seatUsagePercentNumber >= 95 ? '#ff4d4f' : seatUsagePercentNumber >= 85 ? '#faad14' : '#10b981';

  const totalItems = inventory?.totalItems || 0;
  const lowStockCount = inventory?.lowStockCount || 0;
  const healthyStockPercent =
    totalItems > 0
      ? Math.max(0, Math.min(100, Math.round(((totalItems - lowStockCount) / totalItems) * 100)))
      : 100;

  const auditStatus = audit?.status || 'Compliant';
  const complianceScore = audit?.complianceScore ?? 100;
  const auditStrokeColor =
    auditStatus === 'Critical' || complianceScore < 70
      ? '#ef4444'
      : auditStatus === 'Warning' || complianceScore < 90
        ? '#f59e0b'
        : '#6366f1';

  return (
    <Card
      size="small"
      style={{ height: '100%' }}
      title={
        <Flex align="center" gap={6}>
          <SafetyCertificateOutlined style={{ color: '#10b981' }} />
          <span>Compliance & Utilization</span>
        </Flex>
      }
      extra={
        <Text type="secondary" style={{ fontSize: 11.5 }}>
          Radial Gauges
        </Text>
      }
      styles={{
        body: {
          padding: '16px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
        },
      }}
    >
      <Row gutter={[8, 8]} style={{ width: '100%' }} justify="space-around" align="middle">
        {/* Gauge 1: Audit Integrity */}
        <Col span={8} style={{ textAlign: 'center' }}>
          <Progress
            type="dashboard"
            percent={complianceScore}
            size={68}
            strokeColor={auditStrokeColor}
            strokeWidth={8}
          />
          <div style={{ marginTop: 4 }}>
            <Text strong style={{ fontSize: 11.5, display: 'block', color: auditStrokeColor }}>
              {complianceScore}% Integrity
            </Text>
            <Text type="secondary" style={{ fontSize: 10.5 }}>
              Audit Pulse
            </Text>
          </div>
        </Col>

        {/* Gauge 2: License Seats */}
        <Col span={8} style={{ textAlign: 'center' }}>
          <Progress
            type="dashboard"
            percent={seatUsagePercentNumber}
            size={68}
            strokeColor={licenseStrokeColor}
            strokeWidth={8}
          />
          <div style={{ marginTop: 4 }}>
            <Text strong style={{ fontSize: 11.5, display: 'block' }}>
              {licenses?.usedSeats ?? 0} / {licenses?.totalSeats ?? 0}
            </Text>
            <Text type="secondary" style={{ fontSize: 10.5 }}>
              Seat Allocation
            </Text>
          </div>
        </Col>

        {/* Gauge 3: Stock Threshold */}
        <Col span={8} style={{ textAlign: 'center' }}>
          <Progress
            type="dashboard"
            percent={healthyStockPercent}
            size={68}
            strokeColor={lowStockCount > 0 ? '#faad14' : '#10b981'}
            strokeWidth={8}
          />
          <div style={{ marginTop: 4 }}>
            <Text strong style={{ fontSize: 11.5, display: 'block' }}>
              {healthyStockPercent}% Healthy
            </Text>
            <Text type="secondary" style={{ fontSize: 10.5 }}>
              Stock Threshold
            </Text>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

/**
 * Card 5: Infrastructure Health Card
 * Clean 4-subsystem status grid (directory, mail, vpn, backups) with operational header tag.
 */
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
}> = ({ name, badgeStatus, badgeText, percent, strokeColor, status, metric1, metric2 }) => {
  const { token } = theme.useToken();
  return (
    <Col xs={24} sm={12} lg={6}>
      <Flex
        align="center"
        gap={12}
        style={{
          padding: '10px 12px',
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
          background: token.colorFillQuaternary,
        }}
      >
        <Progress
          type="circle"
          percent={percent}
          size={38}
          strokeColor={strokeColor}
          status={status}
          strokeWidth={8}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Flex justify="space-between" align="center" gap={4}>
            <Text strong ellipsis style={{ fontSize: 12.5 }}>
              {name}
            </Text>
            <Badge status={badgeStatus} text={<span style={{ fontSize: 11 }}>{badgeText}</span>} />
          </Flex>
          <Flex
            justify="space-between"
            style={{ marginTop: 3, fontSize: 11, color: token.colorTextSecondary }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {metric1}
            </span>
            <span style={{ flexShrink: 0, marginLeft: 6 }}>{metric2}</span>
          </Flex>
        </div>
      </Flex>
    </Col>
  );
};

const InfrastructureHealthCard: React.FC<{
  health: DashboardOverview['health'] | undefined;
}> = ({ health }) => {
  const uptimeNum = parseFloat(health?.uptimePercent?.replace('%', '') || '100');
  const uptimeColor = uptimeNum < 95 ? 'error' : uptimeNum < 99 ? 'warning' : 'success';

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      title={
        <Flex align="center" gap={6}>
          <CloudServerOutlined style={{ color: '#1677ff' }} />
          <span>Infrastructure Health</span>
        </Flex>
      }
      extra={<Tag color={uptimeColor}>{health?.uptimePercent || '99.99%'} Operational</Tag>}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <Row gutter={[12, 12]}>
        <SubsystemHealthBox
          name={health?.directory?.name ?? 'Directory & Users'}
          badgeStatus={getSubsystemBadgeStatus(health?.directory?.status ?? 'Synced')}
          badgeText={health?.directory?.status ?? 'Synced'}
          percent={health?.directory?.percent ?? 100}
          strokeColor={getSubsystemStrokeColor(health?.directory?.status, '#10b981')}
          metric1={`${health?.directory?.usersCount ?? 0} Active Users`}
          metric2={health?.directory?.syncTime ?? 'Real-time'}
        />
        <SubsystemHealthBox
          name={health?.mail?.name ?? 'Hardware Assets'}
          badgeStatus={getSubsystemBadgeStatus(health?.mail?.status ?? 'Operational')}
          badgeText={health?.mail?.status ?? 'Operational'}
          percent={health?.mail?.percent ?? 100}
          strokeColor={getSubsystemStrokeColor(health?.mail?.status, '#1677ff')}
          metric1={health?.mail?.throughput ?? 'Fleet Active'}
          metric2={health?.mail?.latency ?? 'In Service'}
        />
        <SubsystemHealthBox
          name={health?.vpn?.name ?? 'Network Gateways & IPAM'}
          badgeStatus={getSubsystemBadgeStatus(health?.vpn?.status ?? 'Active')}
          badgeText={health?.vpn?.status ?? 'Active'}
          percent={health?.vpn?.percent ?? 80}
          strokeColor={getSubsystemStrokeColor(health?.vpn?.status, '#6366f1')}
          metric1={`${health?.vpn?.tunnels ?? 0} Allocated IPs`}
          metric2={health?.vpn?.load ?? 'Normal'}
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
          metric2={health?.backups?.nextRun ?? '02:00 UTC'}
        />
      </Row>
    </Card>
  );
};

/**
 * Card 6: Quick Actions Launchpad Card
 * 1-click shortcut buttons to frequent administrative workflows.
 */
const QuickActionsCard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const actions = [
    {
      label: 'Create Asset',
      icon: <LaptopOutlined />,
      path: '/assets',
      primary: true,
    },
    {
      label: 'Scan QR Code',
      icon: <QrcodeOutlined />,
      path: '/assets?scan=true',
    },
    {
      label: 'Create License',
      icon: <SafetyCertificateOutlined />,
      path: '/licenses',
    },
    {
      label: 'Create Item',
      icon: <DatabaseOutlined />,
      path: '/inventory',
    },
    {
      label: 'Create User',
      icon: <TeamOutlined />,
      path: '/users',
    },
    {
      label: 'Handover Docs',
      icon: <FileTextOutlined />,
      path: '/handovers',
    },
  ];

  return (
    <Card
      size="small"
      title={
        <Flex align="center" gap={6}>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <span>Quick Actions</span>
        </Flex>
      }
      style={{ height: '100%' }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <Row gutter={[8, 8]}>
        {actions.map((act) => (
          <Col span={12} key={act.label}>
            <Button
              type={act.primary ? 'primary' : 'default'}
              icon={act.icon}
              block
              style={{
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                height: 36,
                fontSize: 12,
                padding: '0 10px',
              }}
              onClick={() => onNavigate(act.path)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {act.label}
              </span>
            </Button>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

/**
 * Compact Action Items Queue (ActionQueueCard)
 * Bounded height, left accent border, priority Segmented filter, empty states.
 */
const ActionQueueCard: React.FC<{
  items: ActionItem[] | undefined;
  onNavigate: (path: string) => void;
}> = ({ items = [], onNavigate }) => {
  const { token } = theme.useToken();
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
          padding: '10px 12px',
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
            padding: '28px 0',
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
            maxHeight: 340,
            paddingRight: 2,
          }}
        >
          {filteredItems.map((item) => {
            const isError = item.type === 'error';
            const isWarning = item.type === 'warning';
            const accentColor = isError ? '#ef4444' : isWarning ? '#f59e0b' : '#1677ff';
            return (
              <div
                key={item.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: token.borderRadiusSM,
                  background: token.colorFillQuaternary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderLeft: `3px solid ${accentColor}`,
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
                      fontSize: 10,
                      lineHeight: '15px',
                      padding: '0 5px',
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
                    ellipsis={{ tooltip: item.description }}
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

/**
 * Compact Live Activity Stream (ActivityStreamCard)
 * Compact table, bounded scroll container, deduplication, 5-state filter, audit drill-down.
 */
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
          actUpper.includes('ADD') ||
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
      width: 145,
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
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
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
      </div>
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
          {/* Row 1: Executive KPI Stat Cards (4 cards) */}
          <ExecutiveKpiCards data={data} onNavigate={navigate} />

          {/* Row 2: Operational Resource & Capacity Insights (Fleet Lifecycle & IPAM) */}
          <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={12}>
              <FleetLifecycleCard managedAssets={data?.kpi?.managedAssets} onNavigate={navigate} />
            </Col>
            <Col xs={24} lg={12}>
              <IpamCapacityCard ipam={data?.kpi?.ipam} onNavigate={navigate} />
            </Col>
          </Row>

          {/* Row 3: Governance, Utilization & Action Launchpad (Radial Gauges & Quick Actions) */}
          <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={14}>
              <RadialGaugesCard
                audit={data?.kpi?.audit}
                licenses={data?.kpi?.licenses}
                inventory={data?.kpi?.inventory}
              />
            </Col>
            <Col xs={24} lg={10}>
              <QuickActionsCard onNavigate={navigate} />
            </Col>
          </Row>

          {/* Row 4: Compact 4-Column Infrastructure Health Strip */}
          <InfrastructureHealthCard health={data?.health} />

          {/* Row 5: Operational Feeds (Live Activity Stream & Action Items Queue) */}
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
    </PageContainer>
  );
}
