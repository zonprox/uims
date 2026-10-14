import {
  AuditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SwapOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Button,
  Card,
  Empty,
  Flex,
  Skeleton,
  Tag,
  Timeline,
  Typography,
  theme,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { type AuditLog, auditService } from '../services/audit.service';
import { FormattedDateTime, TimeAgo } from './FormattedDate';

const { Text } = Typography;

export interface ActivityTimelineProps {
  entityType: string;
  entityId: string;
  maxItems?: number;
  onViewFullAudit?: (entityType: string, entityId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface DiffChange {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

export function formatDiffValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }
  return String(val);
}

export function getDiffChanges(log: AuditLog): DiffChange[] {
  const oldState = (log.oldValue as Record<string, unknown> | null | undefined) ?? {};
  const newState = (log.newValue as Record<string, unknown> | null | undefined) ?? {};
  const diffPayload = (log.diffPayload as Record<string, unknown> | null | undefined) ?? {};

  const allKeys = new Set<string>([...Object.keys(oldState), ...Object.keys(newState)]);

  if (allKeys.size === 0 && Object.keys(diffPayload).length > 0) {
    for (const key of Object.keys(diffPayload)) {
      allKeys.add(key);
    }
  }

  const results: DiffChange[] = [];
  for (const key of allKeys) {
    if (['createdAt', 'updatedAt', 'id'].includes(key)) continue;

    const oldVal =
      oldState[key] !== undefined
        ? oldState[key]
        : (diffPayload[key] as { old?: unknown } | undefined)?.old;
    const newVal =
      newState[key] !== undefined
        ? newState[key]
        : (diffPayload[key] as { new?: unknown } | undefined)?.new;

    results.push({ key, oldValue: oldVal, newValue: newVal });
  }

  return results.sort((a, b) => a.key.localeCompare(b.key));
}

export function getActionColor(action: string): string {
  const normalized = (action || '').toUpperCase();
  if (normalized.includes('CREATE') || normalized.includes('ADD')) return 'success';
  if (normalized.includes('UPDATE') || normalized.includes('EDIT') || normalized.includes('MODIFY'))
    return 'warning';
  if (
    normalized.includes('DELETE') ||
    normalized.includes('REMOVE') ||
    normalized.includes('REVOKE')
  )
    return 'error';
  if (
    normalized.includes('ASSIGN') ||
    normalized.includes('RESTOCK') ||
    normalized.includes('ALLOCATE')
  )
    return 'processing';
  if (normalized.includes('RETURN')) return 'purple';
  return 'default';
}

function getActionIcon(action: string) {
  const normalized = (action || '').toUpperCase();
  if (normalized.includes('CREATE') || normalized.includes('ADD')) {
    return <PlusCircleOutlined style={{ fontSize: 13, color: '#52c41a' }} />;
  }
  if (
    normalized.includes('UPDATE') ||
    normalized.includes('EDIT') ||
    normalized.includes('MODIFY')
  ) {
    return <EditOutlined style={{ fontSize: 13, color: '#faad14' }} />;
  }
  if (
    normalized.includes('DELETE') ||
    normalized.includes('REMOVE') ||
    normalized.includes('REVOKE')
  ) {
    return <CloseCircleOutlined style={{ fontSize: 13, color: '#ff4d4f' }} />;
  }
  if (
    normalized.includes('ASSIGN') ||
    normalized.includes('ALLOCATE') ||
    normalized.includes('TRANSFER')
  ) {
    return <SwapOutlined style={{ fontSize: 13, color: '#1677ff' }} />;
  }
  return <CheckCircleOutlined style={{ fontSize: 13, color: '#1677ff' }} />;
}

function getSeverityColor(severity: string): string {
  const normalized = (severity || '').toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'error';
  if (normalized === 'MEDIUM') return 'warning';
  return 'default';
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = React.memo(
  ({ entityType, entityId, maxItems = 20, onViewFullAudit, className, style }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const navigate = useNavigate();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});

    const fetchHistory = useCallback(async () => {
      if (!entityId || !entityType) {
        setLogs([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await auditService.getEntityHistory(entityType, entityId, {
          pageSize: maxItems,
        });
        const items = res?.items || [];
        setLogs(items);
        setTotal(res?.total ?? items.length);
      } catch (err: unknown) {
        // Fallback to getLogs query if getEntityHistory is unavailable
        try {
          const fallbackLogs = await auditService.getLogs({
            entityType,
            entityId,
            pageSize: maxItems,
          });
          const items = Array.isArray(fallbackLogs) ? fallbackLogs : [];
          setLogs(items);
          setTotal(items.length);
        } catch (_fallbackErr: unknown) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to load activity history';
          message.error(errorMsg);
          setLogs([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    }, [entityType, entityId, maxItems, message]);

    useEffect(() => {
      void fetchHistory();
    }, [fetchHistory]);

    const toggleDiff = useCallback((logId: string) => {
      setExpandedDiffs((prev) => ({
        ...prev,
        [logId]: !prev[logId],
      }));
    }, []);

    const handleViewFullAudit = useCallback(() => {
      if (onViewFullAudit) {
        onViewFullAudit(entityType, entityId);
      } else {
        const targetUrl = `/audit?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`;
        if (navigate) {
          navigate(targetUrl);
        } else if (typeof window !== 'undefined') {
          window.location.href = targetUrl;
        }
      }
    }, [onViewFullAudit, entityType, entityId, navigate]);

    const timelineItems = useMemo(() => {
      return logs.map((log) => {
        const diffChanges = getDiffChanges(log);
        const isExpanded = !!expandedDiffs[log.id];

        return {
          key: log.id,
          icon: getActionIcon(log.action),
          content: (
            <Card
              size="small"
              styles={{ body: { padding: '10px 14px' } }}
              style={{
                backgroundColor: token.colorFillAlter,
                borderColor: token.colorBorderSecondary,
                borderRadius: token.borderRadiusSM,
                marginBottom: 4,
              }}
            >
              <Flex vertical gap={6}>
                {/* Event Header */}
                <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                  <Flex align="center" gap={6} wrap="wrap">
                    <Tag color={getActionColor(log.action)} style={{ margin: 0, fontWeight: 500 }}>
                      {log.action}
                    </Tag>
                    {log.severity && log.severity !== 'LOW' && log.severity !== 'INFO' && (
                      <Tag
                        color={getSeverityColor(log.severity)}
                        style={{ margin: 0, fontSize: 11 }}
                      >
                        {log.severity}
                      </Tag>
                    )}
                  </Flex>
                  <Flex align="center" gap={8} style={{ fontSize: 12 }}>
                    <TimeAgo date={log.timestamp} showIcon />
                  </Flex>
                </Flex>

                {/* Actor attribution & exact timestamp */}
                <Flex justify="space-between" align="center" wrap="wrap" gap={6}>
                  <Flex align="center" gap={8} wrap="wrap" style={{ fontSize: 12 }}>
                    <Avatar
                      size={20}
                      icon={<UserOutlined />}
                      style={{
                        backgroundColor: token.colorPrimary,
                        fontSize: 10,
                      }}
                    >
                      {(log.userName || log.user || 'U')[0]?.toUpperCase()}
                    </Avatar>
                    <Text strong style={{ fontSize: 12 }}>
                      {log.userName || log.user || 'System'}
                    </Text>
                    {log.userEmail && (
                      <Text type="secondary" style={{ fontSize: 11.5 }}>
                        ({log.userEmail})
                      </Text>
                    )}
                    {log.ipAddress && (
                      <Text type="secondary" code style={{ fontSize: 11 }}>
                        {log.ipAddress}
                      </Text>
                    )}
                  </Flex>
                  <FormattedDateTime
                    date={log.timestamp}
                    style={{ fontSize: 11.5, color: token.colorTextTertiary }}
                  />
                </Flex>

                {/* Context / Details */}
                {log.details && (
                  <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
                    {log.details}
                  </Text>
                )}

                {/* Expandable Visual Diff Tags */}
                {diffChanges.length > 0 && (
                  <div style={{ marginTop: 2 }}>
                    <Button
                      type="link"
                      size="small"
                      icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                      style={{ padding: 0, height: 'auto', fontSize: 11.5 }}
                      onClick={() => toggleDiff(log.id)}
                    >
                      {isExpanded
                        ? 'Hide Changes'
                        : `View Diff (${diffChanges.length} change${diffChanges.length > 1 ? 's' : ''})`}
                    </Button>

                    {isExpanded && (
                      <Flex
                        vertical
                        gap={4}
                        style={{
                          marginTop: 6,
                          paddingLeft: 8,
                          borderLeft: `2px solid ${token.colorBorderSecondary}`,
                        }}
                      >
                        {diffChanges.map((change) => (
                          <Flex
                            key={change.key}
                            align="center"
                            gap={6}
                            wrap="wrap"
                            style={{ fontSize: 11.5 }}
                          >
                            <Text code style={{ fontSize: 11.5 }}>
                              {change.key}:
                            </Text>
                            <Tag
                              color="error"
                              style={{
                                textDecoration: 'line-through',
                                margin: 0,
                                fontSize: 11,
                              }}
                            >
                              -{formatDiffValue(change.oldValue)}
                            </Tag>
                            <span
                              style={{
                                color: token.colorTextTertiary,
                                fontSize: 11,
                              }}
                            >
                              -&gt;
                            </span>
                            <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
                              +{formatDiffValue(change.newValue)}
                            </Tag>
                          </Flex>
                        ))}
                      </Flex>
                    )}
                  </div>
                )}
              </Flex>
            </Card>
          ),
        };
      });
    }, [logs, expandedDiffs, token, toggleDiff]);

    return (
      <div className={className} style={{ width: '100%', ...style }}>
        {/* Header Toolbar */}
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={8}
          style={{ marginBottom: 16 }}
        >
          <Flex align="center" gap={6}>
            <HistoryOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
            <Text strong style={{ fontSize: 13 }}>
              Activity History
            </Text>
            {logs.length > 0 && (
              <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                {logs.length}
                {total > logs.length ? ` of ${total}` : ''}
              </Tag>
            )}
          </Flex>

          <Flex align="center" gap={8}>
            <Button
              icon={<ReloadOutlined spin={loading} />}
              size="small"
              type="text"
              onClick={fetchHistory}
              title="Refresh History"
            />
            <Button type="link" size="small" icon={<AuditOutlined />} onClick={handleViewFullAudit}>
              View in Full Audit Trail
            </Button>
          </Flex>
        </Flex>

        {/* Content Body */}
        {loading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : logs.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No activity history recorded for this entity."
            style={{ margin: '24px 0' }}
          />
        ) : (
          <div>
            <Timeline items={timelineItems} styles={{ root: { padding: '4px 0' } }} />
            <Flex justify="center" style={{ marginTop: 8 }}>
              <Button
                type="link"
                size="small"
                icon={<AuditOutlined />}
                onClick={handleViewFullAudit}
              >
                View in Full Audit Trail
              </Button>
            </Flex>
          </div>
        )}
      </div>
    );
  },
);

ActivityTimeline.displayName = 'ActivityTimeline';
export default ActivityTimeline;
