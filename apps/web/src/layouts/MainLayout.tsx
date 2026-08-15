import {
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  CloudServerOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  LaptopOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
  SyncOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Badge,
  Button,
  Divider,
  Drawer,
  Dropdown,
  Flex,
  Grid,
  Layout,
  Menu,
  type MenuProps,
  Popover,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import CommandPalette from '../components/CommandPalette';
import ErrorBoundary from '../components/ErrorBoundary';
import NotificationDrawer from '../components/NotificationDrawer';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { dashboardService } from '../services/dashboard.service';
import { notificationsService } from '../services/notifications.service';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

// Anti-clipping Pill Badge for menu item counts (Expanded state)
const MenuCountBadge: React.FC<{
  count: number | string;
  color?: string;
  textColor?: string;
}> = ({ count, color = '#ef4444', textColor = '#ffffff' }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 20,
      height: 18,
      padding: '0 6px',
      borderRadius: 10,
      backgroundColor: color,
      color: textColor,
      fontSize: 11,
      fontWeight: 700,
      lineHeight: '18px',
      flexShrink: 0,
      textAlign: 'center',
      userSelect: 'none',
      boxSizing: 'border-box',
    }}
  >
    {count}
  </span>
);

// Anti-clipping Nav Icon with Collapsed Badge Support
const NavIconWithBadge: React.FC<{
  icon: React.ReactNode;
  count?: number;
  dot?: boolean;
  color?: string;
  textColor?: string;
  isCollapsed: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  icon,
  count,
  dot,
  color = '#ef4444',
  textColor = '#ffffff',
  isCollapsed,
  className,
  style,
}) => {
  if (!isCollapsed || (!count && !dot)) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {icon}
      {dot && !count && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -3,
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
            border: '1.5px solid #0c1017',
          }}
        />
      )}
      {Boolean(count) && (
        <span
          style={{
            position: 'absolute',
            top: -5,
            right: -7,
            minWidth: 14,
            height: 14,
            padding: '0 3px',
            borderRadius: 7,
            backgroundColor: color,
            color: textColor,
            fontSize: 9,
            fontWeight: 800,
            lineHeight: '13px',
            textAlign: 'center',
            border: '1.5px solid #0c1017',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
};

const SidebarBrandHeader: React.FC<{
  collapsed: boolean;
  inDrawer: boolean;
  onNavigate: (path: string) => void;
  onCloseDrawer: () => void;
}> = ({ collapsed, inDrawer, onNavigate, onCloseDrawer }) => (
  <div
    style={{
      height: 56,
      display: 'flex',
      alignItems: 'center',
      padding: collapsed && !inDrawer ? '0 20px' : '0 16px',
      gap: 10,
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      backgroundColor: '#090d14',
      flexShrink: 0,
    }}
  >
    <button
      type="button"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        border: 'none',
        padding: 0,
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: 16,
        letterSpacing: '-0.02em',
        boxShadow: '0 2px 8px rgba(22, 119, 255, 0.35)',
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onClick={() => {
        onNavigate('/');
        if (inDrawer) onCloseDrawer();
      }}
    >
      U
    </button>
    {(!collapsed || inDrawer) && (
      <button
        type="button"
        style={{
          overflow: 'hidden',
          flex: 1,
          minWidth: 0,
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          padding: 0,
          textAlign: 'left',
        }}
        onClick={() => {
          onNavigate('/');
          if (inDrawer) onCloseDrawer();
        }}
      >
        <Flex align="center" gap={6}>
          <Text strong style={{ color: '#f8fafc', fontSize: 14.5, lineHeight: 1.2 }}>
            UIMS
          </Text>
          <Tag
            color="cyan"
            style={{
              fontSize: 9.5,
              padding: '0 4px',
              lineHeight: '14px',
              height: 16,
              margin: 0,
              flexShrink: 0,
              fontWeight: 700,
              borderRadius: 3,
            }}
          >
            v2.4
          </Tag>
        </Flex>
        <div
          style={{
            color: 'rgba(248, 250, 252, 0.45)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Asset Management
        </div>
      </button>
    )}
  </div>
);

const SidebarOrgSelector: React.FC<{
  activeOrg: string;
  orgMenuItems: MenuProps['items'];
}> = ({ activeOrg, orgMenuItems }) => (
  <div
    style={{
      padding: '8px 12px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      flexShrink: 0,
    }}
  >
    <Dropdown menu={{ items: orgMenuItems }} trigger={['click']}>
      <Tooltip title={`Cluster: ${activeOrg}`} placement="right" mouseEnterDelay={0.5}>
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            transition: 'all 0.2s',
          }}
          className="sidebar-org-selector"
        >
          <Flex align="center" gap={8} style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                flexShrink: 0,
              }}
            />
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              {activeOrg}
            </Text>
          </Flex>
          <DownOutlined
            style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.45)', flexShrink: 0 }}
          />
        </div>
      </Tooltip>
    </Dropdown>
  </div>
);

const SidebarFooter: React.FC<{
  collapsed: boolean;
  inDrawer: boolean;
  onNavigate?: (path: string) => void;
}> = ({ collapsed, inDrawer, onNavigate }) => {
  const { health, isLoading, isRefreshing, isOnline, lastChecked, error, refresh } =
    useSystemHealth({ intervalMs: 10000 });

  const status = !isOnline || error ? 'error' : (health?.status ?? (isLoading ? 'loading' : 'ok'));

  const statusColor =
    status === 'ok'
      ? '#10b981'
      : status === 'degraded'
        ? '#f59e0b'
        : status === 'loading'
          ? '#94a3b8'
          : '#ef4444';

  const badgeStatus: 'success' | 'warning' | 'error' | 'default' =
    status === 'ok'
      ? 'success'
      : status === 'degraded'
        ? 'warning'
        : status === 'loading'
          ? 'default'
          : 'error';

  const statusLabel =
    status === 'ok'
      ? 'Operational'
      : status === 'degraded'
        ? 'Degraded'
        : status === 'loading'
          ? 'Connecting...'
          : 'Offline';

  const badgeText =
    status === 'loading'
      ? '...'
      : status === 'error'
        ? 'Offline'
        : health?.clientLatencyMs !== undefined
          ? `${health.clientLatencyMs}ms`
          : (health?.uptimePercent ?? '100%');

  const popoverContent = (
    <div style={{ width: 260, padding: '2px 0' }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
        <Flex align="center" gap={6}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: statusColor,
              display: 'inline-block',
              boxShadow: `0 0 6px ${statusColor}`,
            }}
          />
          <Text strong style={{ fontSize: 13, color: '#f8fafc' }}>
            Cluster Telemetry
          </Text>
        </Flex>
        <Tag
          color={status === 'ok' ? 'success' : status === 'degraded' ? 'warning' : 'error'}
          style={{ margin: 0, fontSize: 10.5, fontWeight: 600 }}
        >
          {statusLabel}
        </Tag>
      </Flex>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 11.5,
          padding: '8px 10px',
          borderRadius: 6,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 10,
        }}
      >
        <Flex justify="space-between" align="center">
          <Text style={{ fontSize: 11.5, color: '#94a3b8' }}>API Response:</Text>
          <Text strong style={{ fontSize: 11.5, color: statusColor }}>
            {health?.clientLatencyMs !== undefined
              ? `${health.clientLatencyMs} ms`
              : error
                ? 'Timeout'
                : 'Checking...'}
          </Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text style={{ fontSize: 11.5, color: '#94a3b8' }}>Database (Postgres):</Text>
          <Text
            strong
            style={{
              fontSize: 11.5,
              color: health?.database?.status === 'connected' ? '#10b981' : '#ef4444',
            }}
          >
            {health?.database?.status === 'connected'
              ? `Connected (${health.database.latencyMs}ms)`
              : health?.database?.status === 'disconnected'
                ? 'Disconnected'
                : 'Checking...'}
          </Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text style={{ fontSize: 11.5, color: '#94a3b8' }}>System Uptime:</Text>
          <Text strong style={{ fontSize: 11.5, color: '#e2e8f0' }}>
            {health?.uptimeFormatted ?? (isLoading ? 'Checking...' : 'N/A')}
          </Text>
        </Flex>
        <Flex justify="space-between" align="center">
          <Text style={{ fontSize: 11.5, color: '#94a3b8' }}>Memory Heap:</Text>
          <Text strong style={{ fontSize: 11.5, color: '#e2e8f0' }}>
            {health?.system?.memoryHeapUsedMb
              ? `${health.system.memoryHeapUsedMb} MB / ${health.system.memoryHeapTotalMb} MB`
              : 'N/A'}
          </Text>
        </Flex>
      </div>

      <Flex justify="space-between" align="center" style={{ fontSize: 11 }}>
        <Text style={{ fontSize: 10.5, color: '#64748b' }}>
          {lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : 'Live polling (10s)'}
        </Text>
        <Button
          type="text"
          size="small"
          icon={<SyncOutlined spin={isRefreshing} style={{ fontSize: 11, color: '#94a3b8' }} />}
          onClick={(e) => {
            e.stopPropagation();
            refresh();
          }}
          style={{ fontSize: 11, height: 22, padding: '0 6px', color: '#94a3b8' }}
        >
          Check Now
        </Button>
      </Flex>
    </div>
  );

  return (
    <div
      style={{
        padding: collapsed && !inDrawer ? '10px 8px' : '10px 12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#090d14',
        flexShrink: 0,
      }}
    >
      <Popover
        content={popoverContent}
        title={null}
        trigger="hover"
        placement={collapsed && !inDrawer ? 'rightBottom' : 'top'}
        styles={{
          container: {
            backgroundColor: '#161d2b',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            padding: 12,
          },
        }}
      >
        {!collapsed || inDrawer ? (
          <div
            onClick={() => onNavigate?.('/settings')}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            }}
          >
            <Flex justify="space-between" align="center" gap={8}>
              <Flex align="center" gap={6} style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                <CloudServerOutlined
                  style={{ color: statusColor, fontSize: 12.5, flexShrink: 0 }}
                />
                <Text
                  style={{
                    color: 'rgba(255, 255, 255, 0.75)',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Core Cluster Health
                </Text>
              </Flex>
              <Badge
                status={badgeStatus}
                text={
                  <span
                    style={{
                      color: statusColor,
                      fontSize: 10.5,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {badgeText}
                  </span>
                }
              />
            </Flex>
          </div>
        ) : (
          <div
            onClick={() => onNavigate?.('/settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 0',
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            }}
          >
            <Badge dot status={badgeStatus} offset={[-2, 2]}>
              <CloudServerOutlined style={{ color: statusColor, fontSize: 14 }} />
            </Badge>
          </div>
        )}
      </Popover>
    </div>
  );
};

const SidebarContent: React.FC<{
  collapsed: boolean;
  inDrawer: boolean;
  activeOrg: string;
  orgMenuItems: MenuProps['items'];
  menuItems: MenuProps['items'];
  pathname: string;
  onNavigate: (path: string) => void;
  onCloseDrawer: () => void;
}> = ({
  collapsed,
  inDrawer,
  activeOrg,
  orgMenuItems,
  menuItems,
  pathname,
  onNavigate,
  onCloseDrawer,
}) => (
  <div
    style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0c1017' }}
  >
    <SidebarBrandHeader
      collapsed={collapsed}
      inDrawer={inDrawer}
      onNavigate={onNavigate}
      onCloseDrawer={onCloseDrawer}
    />
    {(!collapsed || inDrawer) && (
      <SidebarOrgSelector activeOrg={activeOrg} orgMenuItems={orgMenuItems} />
    )}
    <div
      className="sidebar-menu-scroll"
      style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 0' }}
    >
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        onClick={({ key }) => {
          if (key.startsWith('/')) {
            onNavigate(key);
            if (inDrawer) onCloseDrawer();
          }
        }}
        style={{ backgroundColor: 'transparent', borderRight: 0, width: '100%' }}
      />
    </div>
    <SidebarFooter collapsed={collapsed} inDrawer={inDrawer} onNavigate={onNavigate} />
  </div>
);

function getOrgMenuItems(setActiveOrg: (org: string) => void): MenuProps['items'] {
  return [
    {
      key: 'org-1',
      label: (
        <Flex vertical style={{ padding: '2px 0' }}>
          <Text strong style={{ fontSize: 12.5 }}>
            Acme Enterprise HQ (US-East)
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Production • AWS us-east-1
          </Text>
        </Flex>
      ),
      onClick: () => setActiveOrg('Acme Enterprise HQ (US-East)'),
    },
    {
      key: 'org-2',
      label: (
        <Flex vertical style={{ padding: '2px 0' }}>
          <Text strong style={{ fontSize: 12.5 }}>
            Acme EMEA Region (Frankfurt)
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Production • AWS eu-central-1
          </Text>
        </Flex>
      ),
      onClick: () => setActiveOrg('Acme EMEA Region (Frankfurt)'),
    },
    {
      key: 'org-3',
      label: (
        <Flex vertical style={{ padding: '2px 0' }}>
          <Text strong style={{ fontSize: 12.5 }}>
            Staging / Sandbox Cluster
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Testbed • Isolated VPC
          </Text>
        </Flex>
      ),
      onClick: () => setActiveOrg('Staging / Sandbox Cluster'),
    },
  ];
}

function getQuickCreateMenu(navigate: (path: string) => void): MenuProps['items'] {
  return [
    {
      key: 'new-asset',
      icon: <LaptopOutlined style={{ color: '#1677ff' }} />,
      label: 'New Hardware Asset',
      onClick: () => navigate('/assets'),
    },
    {
      key: 'new-ticket',
      icon: <CustomerServiceOutlined style={{ color: '#f59e0b' }} />,
      label: 'Log Maintenance Ticket',
      onClick: () => navigate('/tickets'),
    },
    {
      key: 'new-user',
      icon: <TeamOutlined style={{ color: '#10b981' }} />,
      label: 'Onboard Asset Custodian',
      onClick: () => navigate('/directory'),
    },
    {
      key: 'new-license',
      icon: <SafetyCertificateOutlined style={{ color: '#6366f1' }} />,
      label: 'New SaaS License',
      onClick: () => navigate('/licenses'),
    },
  ];
}

function getUserMenuItems(
  user: { name?: string; role?: string; email?: string } | null,
  navigate: (path: string) => void,
  handleLogout: () => void,
): MenuProps['items'] {
  return [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0', cursor: 'default' }}>
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {user?.name || 'Administrator'}
          </Text>
          <Text type="secondary" style={{ fontSize: 11.5 }}>
            {user?.email || 'admin@uims.enterprise'}
          </Text>
          <Tag color="blue" style={{ marginTop: 6, fontSize: 10, padding: '0 6px' }}>
            {user?.role || 'Super Admin'}
          </Tag>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Theme & Preferences',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'audit-logs',
      icon: <AuditOutlined />,
      label: 'Asset Audit Trail',
      onClick: () => navigate('/audit'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#ef4444' }} />,
      label: <span style={{ color: '#ef4444', fontWeight: 600 }}>Sign Out Session</span>,
      onClick: handleLogout,
    },
  ];
}

interface NavBadgeCounts {
  expiringLicenses?: number;
  lowStockItems?: number;
  urgentTickets?: number;
}

function getNavMenuItems(
  collapsed: boolean,
  isMobile: boolean,
  counts?: NavBadgeCounts,
): MenuProps['items'] {
  const isCollapsedDesktop = collapsed && !isMobile;
  const showLabels = !collapsed || isMobile;

  const expiringCount = counts?.expiringLicenses ?? 0;
  const lowStockCount = counts?.lowStockItems ?? 0;
  const urgentCount = counts?.urgentTickets ?? 0;

  return [
    {
      key: '/',
      icon: <NavIconWithBadge icon={<DashboardOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Operations Center',
      title: 'Operations Center',
    },
    { type: 'divider' },
    {
      key: 'group-assets',
      type: 'group',
      label: showLabels ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}
        >
          CORE ASSETS & INVENTORY
        </span>
      ) : undefined,
      children: [
        {
          key: '/assets',
          icon: <NavIconWithBadge icon={<LaptopOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Hardware Fleet',
          title: 'Hardware Fleet',
        },
        {
          key: '/licenses',
          icon: (
            <NavIconWithBadge
              icon={<SafetyCertificateOutlined />}
              count={expiringCount > 0 ? expiringCount : undefined}
              color="#f59e0b"
              textColor="#000"
              isCollapsed={isCollapsedDesktop}
            />
          ),
          title: expiringCount > 0 ? `SaaS Licenses (${expiringCount} Expiring)` : 'SaaS Licenses',
          label: (
            <Flex
              justify="space-between"
              align="center"
              style={{ width: '100%', minWidth: 0, gap: 8 }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                SaaS Licenses
              </span>
              {showLabels && expiringCount > 0 && (
                <Tag
                  color="warning"
                  style={{
                    fontSize: 10,
                    margin: 0,
                    padding: '0 5px',
                    height: 18,
                    lineHeight: '16px',
                    borderRadius: 4,
                    flexShrink: 0,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {expiringCount} Expiring
                </Tag>
              )}
            </Flex>
          ),
        },
        {
          key: '/inventory',
          icon: (
            <NavIconWithBadge
              icon={<DatabaseOutlined />}
              count={lowStockCount > 0 ? lowStockCount : undefined}
              color="#f59e0b"
              textColor="#000"
              isCollapsed={isCollapsedDesktop}
            />
          ),
          title:
            lowStockCount > 0 ? `Spare Stockroom (${lowStockCount} Low Stock)` : 'Spare Stockroom',
          label: (
            <Flex
              justify="space-between"
              align="center"
              style={{ width: '100%', minWidth: 0, gap: 8 }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Spare Stockroom
              </span>
              {showLabels && lowStockCount > 0 && (
                <MenuCountBadge count={lowStockCount} color="#f59e0b" textColor="#000" />
              )}
            </Flex>
          ),
        },
        {
          key: '/network',
          icon: <NavIconWithBadge icon={<GlobalOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Network & IPAM',
          title: 'Network & IPAM',
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'group-ops',
      type: 'group',
      label: showLabels ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}
        >
          CUSTODIANS & SERVICING
        </span>
      ) : undefined,
      children: [
        {
          key: '/directory',
          icon: <NavIconWithBadge icon={<TeamOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Asset Custodians',
          title: 'Asset Custodians',
        },
        {
          key: '/tickets',
          icon: (
            <NavIconWithBadge
              icon={<CustomerServiceOutlined />}
              count={urgentCount > 0 ? urgentCount : undefined}
              color="#ef4444"
              textColor="#ffffff"
              isCollapsed={isCollapsedDesktop}
            />
          ),
          title:
            urgentCount > 0
              ? `Maintenance & Repairs (${urgentCount} Urgent)`
              : 'Maintenance & Repairs',
          label: (
            <Flex
              justify="space-between"
              align="center"
              style={{ width: '100%', minWidth: 0, gap: 8 }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Maintenance & Repairs
              </span>
              {showLabels && urgentCount > 0 && (
                <MenuCountBadge count={urgentCount} color="#ef4444" textColor="#ffffff" />
              )}
            </Flex>
          ),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'group-governance',
      type: 'group',
      label: showLabels ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}
        >
          ANALYTICS & GOVERNANCE
        </span>
      ) : undefined,
      children: [
        {
          key: '/reports',
          icon: <NavIconWithBadge icon={<BarChartOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Lifecycle & Valuation Reports',
          title: 'Lifecycle & Valuation Reports',
        },
        {
          key: '/audit',
          icon: <NavIconWithBadge icon={<AuditOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Asset Audit Trail',
          title: 'Asset Audit Trail',
        },
        {
          key: '/settings',
          icon: <NavIconWithBadge icon={<SettingOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'System Preferences',
          title: 'System Preferences',
        },
      ],
    },
  ];
}

const NavbarLeftSection: React.FC<{
  isMobile: boolean;
  collapsed: boolean;
  isXs: boolean;
  mode: string;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
}> = ({ isMobile, collapsed, isXs, mode, onToggleSidebar, onOpenCommandPalette }) => {
  const icon = isMobile ? (
    <MenuOutlined />
  ) : collapsed ? (
    <MenuUnfoldOutlined />
  ) : (
    <MenuFoldOutlined />
  );
  return (
    <Flex align="center" gap={isXs ? 8 : 12}>
      <Button type="text" icon={icon} onClick={onToggleSidebar} style={{ fontSize: 16 }} />
      <Button
        type="default"
        icon={<SearchOutlined style={{ color: '#94a3b8' }} />}
        onClick={onOpenCommandPalette}
        style={{
          borderRadius: 6,
          background: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
          borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
          color: mode === 'dark' ? '#94a3b8' : '#64748b',
          minWidth: isXs ? 120 : 220,
          height: 34,
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isXs ? '0 8px' : '0 12px',
        }}
      >
        <span style={{ fontSize: 12 }}>{isXs ? 'Search...' : 'Command Palette...'}</span>
        {!isXs && (
          <kbd
            style={{
              fontSize: 10.5,
              padding: '1px 5px',
              background: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              borderRadius: 4,
              color: mode === 'dark' ? '#cbd5e1' : '#64748b',
            }}
          >
            ⌘K
          </kbd>
        )}
      </Button>
    </Flex>
  );
};

const NavbarRightSection: React.FC<{
  isXs: boolean;
  mode: string;
  quickCreateMenu: MenuProps['items'];
  userMenuItems: MenuProps['items'];
  user: { name?: string } | null;
  unreadCount: number;
  onToggleMode: () => void;
  onOpenNotifications: () => void;
}> = ({
  isXs,
  mode,
  quickCreateMenu,
  userMenuItems,
  user,
  unreadCount,
  onToggleMode,
  onOpenNotifications,
}) => (
  <Flex align="center" gap={isXs ? 6 : 12}>
    <Dropdown menu={{ items: quickCreateMenu }} placement="bottomRight">
      <Button
        type="primary"
        size="small"
        icon={<PlusOutlined />}
        style={{ height: 32, borderRadius: 6, fontWeight: 600 }}
      >
        {!isXs ? 'Quick Action' : ''}
      </Button>
    </Dropdown>

    <Tooltip title={mode === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
      <Button
        type="text"
        shape="circle"
        size="small"
        icon={
          mode === 'dark' ? (
            <SunOutlined style={{ color: '#f59e0b' }} />
          ) : (
            <MoonOutlined style={{ color: '#64748b' }} />
          )
        }
        onClick={onToggleMode}
      />
    </Tooltip>

    <Tooltip title="Security & Telemetry Alerts">
      <Badge
        count={unreadCount}
        offset={[-2, 3]}
        size="small"
        styles={{
          indicator: {
            fontSize: 10,
            fontWeight: 700,
            height: 16,
            minWidth: 16,
            lineHeight: '16px',
            padding: '0 4px',
            boxShadow: mode === 'dark' ? '0 0 0 1.5px #090d16' : '0 0 0 1.5px #ffffff',
          },
        }}
      >
        <Button
          type="text"
          shape="circle"
          size="small"
          icon={<BellOutlined style={{ fontSize: 16 }} />}
          onClick={onOpenNotifications}
        />
      </Badge>
    </Tooltip>

    {!isXs && <Divider orientation="vertical" style={{ height: 20 }} />}

    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
      <div
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: isXs ? '2px' : '4px 8px',
          borderRadius: 6,
        }}
      >
        <Avatar
          size={28}
          style={{
            backgroundColor: '#1677ff',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {user?.name?.[0] || 'A'}
        </Avatar>
        {!isXs && (
          <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
            <Text strong style={{ fontSize: 12.5, display: 'block' }}>
              {user?.name || 'Alex Johnson'}
            </Text>
            <Text
              style={{
                fontSize: 10.5,
                color: mode === 'dark' ? '#94a3b8' : '#64748b',
                display: 'block',
              }}
            >
              Master Admin
            </Text>
          </div>
        )}
      </div>
    </Dropdown>
  </Flex>
);

const AppNavbarHeader: React.FC<{
  isMobile: boolean;
  collapsed: boolean;
  isXs: boolean;
  mode: string;
  quickCreateMenu: MenuProps['items'];
  userMenuItems: MenuProps['items'];
  user: { name?: string } | null;
  unreadCount: number;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
  onToggleMode: () => void;
  onOpenNotifications: () => void;
}> = ({
  isMobile,
  collapsed,
  isXs,
  mode,
  quickCreateMenu,
  userMenuItems,
  user,
  unreadCount,
  onToggleSidebar,
  onOpenCommandPalette,
  onToggleMode,
  onOpenNotifications,
}) => (
  <Header
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 99,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isXs ? '0 12px' : '0 24px',
      height: 56,
      borderBottom: mode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
      backgroundColor: mode === 'dark' ? '#090d16' : '#ffffff',
    }}
  >
    <NavbarLeftSection
      isMobile={isMobile}
      collapsed={collapsed}
      isXs={isXs}
      mode={mode}
      onToggleSidebar={onToggleSidebar}
      onOpenCommandPalette={onOpenCommandPalette}
    />
    <NavbarRightSection
      isXs={isXs}
      mode={mode}
      quickCreateMenu={quickCreateMenu}
      userMenuItems={userMenuItems}
      user={user}
      unreadCount={unreadCount}
      onToggleMode={onToggleMode}
      onOpenNotifications={onOpenNotifications}
    />
  </Header>
);

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { modal } = App.useApp();
  const screens = useBreakpoint();

  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  const isMobile = screens.md === false;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeOrg, setActiveOrg] = useState('Acme Enterprise HQ (US-East)');

  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [navBadges, setNavBadges] = useState<NavBadgeCounts>({});

  const fetchLiveTelemetry = useCallback(async () => {
    try {
      const notifs = await notificationsService.getNotifications().catch(() => []);
      setUnreadNotifCount(notifs.filter((n) => !n.read).length);

      const overview = await dashboardService.getOverview().catch(() => null);
      if (overview) {
        setNavBadges({
          expiringLicenses: overview.kpi?.licenses?.expiringCount ?? 0,
          lowStockItems: overview.actionItems?.filter((a) => a.type === 'error').length ?? 0,
          urgentTickets: overview.kpi?.helpdesk?.urgentCount ?? 0,
        });
      }
    } catch {
      // Telemetry will retry on next poll interval
    }
  }, []);

  useEffect(() => {
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveTelemetry]);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, []);

  const handleLogout = () => {
    modal.confirm({
      title: 'Sign Out of Enterprise Console',
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: 'Are you sure you want to end your active session in UIMS Enterprise?',
      okText: 'Sign Out',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        logout();
        navigate('/login');
      },
    });
  };

  const orgMenuItems = getOrgMenuItems(setActiveOrg);
  const menuItems = getNavMenuItems(collapsed, isMobile, navBadges);
  const quickCreateMenu = getQuickCreateMenu(navigate);
  const userMenuItems = getUserMenuItems(user, navigate, handleLogout);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          width={280}
          collapsedWidth={80}
          theme="dark"
          style={{
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 100,
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '2px 0 12px rgba(0, 0, 0, 0.25)',
          }}
        >
          <SidebarContent
            collapsed={collapsed}
            inDrawer={false}
            activeOrg={activeOrg}
            orgMenuItems={orgMenuItems}
            menuItems={menuItems}
            pathname={location.pathname}
            onNavigate={navigate}
            onCloseDrawer={() => setMobileDrawerOpen(false)}
          />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          styles={{ body: { padding: 0, backgroundColor: '#0c1017' } }}
          size={290}
          closable={false}
        >
          <SidebarContent
            collapsed={collapsed}
            inDrawer={true}
            activeOrg={activeOrg}
            orgMenuItems={orgMenuItems}
            menuItems={menuItems}
            pathname={location.pathname}
            onNavigate={navigate}
            onCloseDrawer={() => setMobileDrawerOpen(false)}
          />
        </Drawer>
      )}

      <Layout>
        <AppNavbarHeader
          isMobile={isMobile}
          collapsed={collapsed}
          isXs={screens.xs === true}
          mode={mode}
          quickCreateMenu={quickCreateMenu}
          userMenuItems={userMenuItems}
          user={user}
          unreadCount={unreadNotifCount}
          onToggleSidebar={() => {
            if (isMobile) setMobileDrawerOpen(!mobileDrawerOpen);
            else setCollapsed(!collapsed);
          }}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onToggleMode={toggleMode}
          onOpenNotifications={() => setNotificationsOpen(true)}
        />

        <Content style={{ margin: '16px 20px', minHeight: 'calc(100vh - 130px)' }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>

        <Footer
          style={{
            textAlign: 'center',
            padding: '16px 24px',
            color: '#94a3b8',
            fontSize: 12,
            borderTop: mode === 'dark' ? '1px solid #1e293b' : '1px solid #f1f5f9',
          }}
        >
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            <span>UIMS Enterprise v2.4 • Unified IT Infrastructure & Assets Management</span>
            <Space separator={<Divider orientation="vertical" />}>
              <a href="/help" style={{ color: 'inherit' }}>
                Help Center
              </a>
              <a href="/api/docs" style={{ color: 'inherit' }}>
                API Docs
              </a>
              <a href="/status" style={{ color: 'inherit' }}>
                System Status
              </a>
            </Space>
          </Flex>
        </Footer>
      </Layout>

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNotificationsChanged={fetchLiveTelemetry}
      />
    </Layout>
  );
}
