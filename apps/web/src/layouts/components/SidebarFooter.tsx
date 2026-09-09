import { CloudServerOutlined, SyncOutlined } from '@ant-design/icons';
import { Badge, Button, Flex, Popover, Tag, Typography } from 'antd';
import React from 'react';
import { useSystemHealth } from '../../hooks/useSystemHealth';
import { useThemeStore } from '../../stores/theme.store';

const { Text } = Typography;

export interface SidebarFooterProps {
  collapsed: boolean;
  inDrawer: boolean;
  onNavigate?: (path: string) => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = React.memo(
  ({ collapsed, inDrawer, onNavigate }) => {
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const isDark = resolvedMode === 'dark';

    const { health, isLoading, isRefreshing, isOnline, lastChecked, error, refresh } =
      useSystemHealth({ intervalMs: 10000 });

    const status =
      !isOnline || error ? 'error' : (health?.status ?? (isLoading ? 'loading' : 'ok'));

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
            <Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a' }}>
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
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : '#f8fafc',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            marginBottom: 10,
          }}
        >
          <Flex justify="space-between" align="center">
            <Text style={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#64748b' }}>
              API Response:
            </Text>
            <Text strong style={{ fontSize: 11.5, color: statusColor }}>
              {health?.clientLatencyMs !== undefined
                ? `${health.clientLatencyMs} ms`
                : error
                  ? 'Timeout'
                  : 'Checking...'}
            </Text>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text style={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#64748b' }}>
              Database (Postgres):
            </Text>
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
            <Text style={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#64748b' }}>
              System Uptime:
            </Text>
            <Text strong style={{ fontSize: 11.5, color: isDark ? '#e2e8f0' : '#0f172a' }}>
              {health?.uptimeFormatted ?? (isLoading ? 'Checking...' : 'N/A')}
            </Text>
          </Flex>
          <Flex justify="space-between" align="center">
            <Text style={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#64748b' }}>
              Memory Heap:
            </Text>
            <Text strong style={{ fontSize: 11.5, color: isDark ? '#e2e8f0' : '#0f172a' }}>
              {health?.system?.memoryHeapUsedMb
                ? `${health.system.memoryHeapUsedMb} MB / ${health.system.memoryHeapTotalMb} MB`
                : 'N/A'}
            </Text>
          </Flex>
        </div>

        <Flex justify="space-between" align="center" style={{ fontSize: 11 }}>
          <Text style={{ fontSize: 10.5, color: isDark ? '#64748b' : '#94a3b8' }}>
            {lastChecked ? `Checked ${lastChecked.toLocaleTimeString()}` : 'Live polling (10s)'}
          </Text>
          <Button
            type="text"
            size="small"
            icon={
              <SyncOutlined
                spin={isRefreshing}
                style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#475569' }}
              />
            }
            onClick={(e) => {
              e.stopPropagation();
              refresh();
            }}
            style={{
              fontSize: 11,
              height: 22,
              padding: '0 6px',
              color: isDark ? '#94a3b8' : '#475569',
            }}
          >
            Check Now
          </Button>
        </Flex>
      </div>
    );

    return (
      <div
        style={{
          padding: collapsed && !inDrawer ? '10px 0' : '10px 12px',
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
          backgroundColor: isDark ? '#090d14' : '#ffffff',
          flexShrink: 0,
          display: 'flex',
          justifyContent: collapsed && !inDrawer ? 'center' : 'stretch',
        }}
      >
        <Popover
          content={popoverContent}
          title={null}
          trigger="hover"
          placement={collapsed && !inDrawer ? 'rightBottom' : 'top'}
          styles={{
            container: {
              backgroundColor: isDark ? '#161d2b' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
              borderRadius: 8,
              boxShadow: isDark
                ? '0 8px 24px rgba(0, 0, 0, 0.5)'
                : '0 8px 24px rgba(0, 0, 0, 0.12)',
              padding: 12,
            },
          }}
        >
          {!collapsed || inDrawer ? (
            <div
              onClick={() => onNavigate?.('/settings')}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : '#f1f5f9';
                e.currentTarget.style.borderColor = isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : '#f8fafc';
                e.currentTarget.style.borderColor = isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : '#e2e8f0';
              }}
            >
              <Flex justify="space-between" align="center" gap={8}>
                <Flex align="center" gap={6} style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                  <CloudServerOutlined
                    style={{ color: statusColor, fontSize: 12.5, flexShrink: 0 }}
                  />
                  <Text
                    style={{
                      color: isDark ? 'rgba(255, 255, 255, 0.75)' : '#475569',
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
                width: 44,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : '#f1f5f9';
                e.currentTarget.style.borderColor = isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark
                  ? 'rgba(255, 255, 255, 0.03)'
                  : '#f8fafc';
                e.currentTarget.style.borderColor = isDark
                  ? 'rgba(255, 255, 255, 0.06)'
                  : '#e2e8f0';
              }}
            >
              <Badge dot status={badgeStatus} offset={[-2, 2]}>
                <CloudServerOutlined style={{ color: statusColor, fontSize: 15 }} />
              </Badge>
            </div>
          )}
        </Popover>
      </div>
    );
  },
);

SidebarFooter.displayName = 'SidebarFooter';
