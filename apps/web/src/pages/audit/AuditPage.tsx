import {
  AuditOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Flex,
  Input,
  Row,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { FormattedDateTime } from '../../components/FormattedDate';
import { type AuditLog, type AuditStats, auditService } from '../../services/audit.service';
import { formatErrorMessage } from '../../utils/feedback';

const { Text, Title } = Typography;

export default function AuditPage() {
  const { message } = App.useApp();
  const [logs, setLogs] = useState<Array<AuditLog>>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalEvents: 0,
    failedEvents: 0,
    criticalEvents: 0,
    errorRate: '0.0%',
    totalEventRecords: '0',
    securityAnomalies: '0 Alerts',
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Inspector Drawer
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, statsData] = await Promise.all([
        auditService.getLogs({
          search: searchQuery || undefined,
          action: actionFilter !== 'all' ? actionFilter : undefined,
          severity: severityFilter !== 'all' ? severityFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        auditService.getStats().catch((_error: unknown) => null),
      ]);
      setLogs(list);
      if (statsData) {
        setStats(statsData);
      } else {
        const failedCount = list.filter(
          (l) =>
            l.status === 'Failed' ||
            l.status === 'Blocked' ||
            (l.statusCode && l.statusCode >= 400),
        ).length;
        const criticalCount = list.filter((l) => l.severity === 'Critical').length;
        const errorPct =
          list.length > 0 ? `${((failedCount / list.length) * 100).toFixed(1)}%` : '0.0%';
        setStats({
          totalEvents: list.length,
          failedEvents: failedCount,
          criticalEvents: criticalCount,
          errorRate: errorPct,
          totalEventRecords: list.length.toString(),
          securityAnomalies: `${criticalCount} Alerts`,
        });
      }
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load activity logs'));
    } finally {
      setLoading(false);
    }
  }, [actionFilter, message, searchQuery, severityFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const csvData = await auditService.exportCsv({
        search: searchQuery || undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Activity logs exported successfully as RFC 4180 CSV.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'export activity logs'));
    } finally {
      setExporting(false);
    }
  };

  const handleInspectLog = (log: AuditLog) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: (a: AuditLog, b: AuditLog) => a.timestamp.localeCompare(b.timestamp),
      render: (ts: string) => <FormattedDateTime date={ts} showOffset monospace />,
    },
    {
      title: 'Actor',
      key: 'user',
      sorter: (a: AuditLog, b: AuditLog) =>
        (a.userName || a.user || '').localeCompare(b.userName || b.user || ''),
      render: (_: unknown, record: AuditLog) => {
        const actorName = record.userName || record.user || 'System Engine';
        return (
          <Flex align="center" gap={8}>
            <Avatar size="small" style={{ backgroundColor: '#1890ff', fontSize: 11 }}>
              {actorName[0] || 'S'}
            </Avatar>
            <div>
              <Text strong style={{ fontSize: 12.5, display: 'block' }}>
                {actorName}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.userEmail || 'system@youngonevn.com'}
              </Text>
            </div>
          </Flex>
        );
      },
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      sorter: (a: AuditLog, b: AuditLog) => a.action.localeCompare(b.action),
      render: (action: string) => {
        let color = 'default';
        if (action.includes('DELETE') || action.includes('REVOKE') || action.includes('FAILED')) {
          color = 'error';
        } else if (action.includes('CREATE') || action.includes('GRANT')) {
          color = 'processing';
        } else if (action.includes('UPDATE') || action.includes('ROTATE')) {
          color = 'warning';
        } else if (action === 'LOGIN_SUCCESS') {
          color = 'success';
        }
        return <Tag color={color}>{action}</Tag>;
      },
    },
    {
      title: 'Target Entity & Details',
      key: 'details',
      render: (_: unknown, record: AuditLog) => (
        <div>
          <Flex align="center" gap={6}>
            <Tag color="geekblue" style={{ fontSize: 11 }}>
              {record.entityType || 'General'}
            </Tag>
            <Text strong style={{ fontSize: 12.5 }}>
              {record.entity}
            </Text>
          </Flex>
          <Text type="secondary" style={{ display: 'block', fontSize: 11.5, marginTop: 2 }}>
            {record.details}
          </Text>
        </div>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      render: (ip: string) => (
        <Text code style={{ fontSize: 11.5 }}>
          {ip || '127.0.0.1'}
        </Text>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      sorter: (a: AuditLog, b: AuditLog) => a.severity.localeCompare(b.severity),
      render: (sev: string) => {
        let color = 'default';
        if (sev === 'Critical') color = 'error';
        if (sev === 'Warning') color = 'warning';
        if (sev === 'Info') color = 'blue';
        return <Tag color={color}>{sev}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a: AuditLog, b: AuditLog) => a.status.localeCompare(b.status),
      render: (status: string, record: AuditLog) => (
        <Flex align="center" gap={4}>
          <Tag color={status === 'Success' ? 'success' : status === 'Blocked' ? 'error' : 'error'}>
            {status}
          </Tag>
          {record.statusCode && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              ({record.statusCode})
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: (durationMs: number | null | undefined) =>
        durationMs != null ? (
          <Text style={{ fontSize: 11.5, fontFamily: 'monospace' }}>
            {durationMs.toFixed(1)} ms
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 11.5 }}>
            -
          </Text>
        ),
    },
    {
      title: 'Inspect',
      key: 'inspect',
      render: (_: unknown, record: AuditLog) => (
        <Button
          size="small"
          type="text"
          shape="circle"
          icon={<EyeOutlined />}
          aria-label={`Inspect event ${record.id}`}
          onClick={() => handleInspectLog(record)}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="System Activity Logs"
      subtitle="Track real-time system mutations, operational events, and security access telemetry."
      breadcrumbs={[{ title: 'Activity Logs' }]}
      stats={[
        {
          title: 'Total Recorded Events',
          value: stats.totalEvents,
          prefix: <AuditOutlined />,
          color: '#6366f1',
        },
        {
          title: 'Failed Actions',
          value: stats.failedEvents,
          prefix: <CloseCircleOutlined />,
          color: stats.failedEvents > 0 ? '#ef4444' : '#10b981',
        },
        {
          title: 'Security Alerts',
          value: stats.criticalEvents,
          prefix: <SafetyCertificateOutlined />,
          color: stats.criticalEvents > 0 ? '#f59e0b' : '#10b981',
        },
        {
          title: 'Error Rate',
          value: stats.errorRate,
          prefix: <WarningOutlined />,
          color: '#0ea5e9',
        },
      ]}
      extra={
        <Flex gap={8}>
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExportCSV}>
            Export CSV
          </Button>
        </Flex>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        {/* Search & Filter Toolbar */}
        <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={9}>
            <Input
              placeholder="Search by actor, entity, IP address, details..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={15}>
            <Flex gap={10} justify="flex-end" wrap>
              <Select
                value={actionFilter}
                onChange={setActionFilter}
                style={{ width: 190 }}
                placeholder="Action"
                showSearch
                options={[
                  { label: 'All Actions', value: 'all' },
                  { label: 'CREATE', value: 'CREATE' },
                  { label: 'UPDATE', value: 'UPDATE' },
                  { label: 'DELETE', value: 'DELETE' },
                  { label: 'LOGIN_SUCCESS', value: 'LOGIN_SUCCESS' },
                  { label: 'LOGIN_FAILED', value: 'LOGIN_FAILED' },
                  { label: 'USER_PROVISION', value: 'USER_PROVISION' },
                  { label: 'USER_PASSWORD_RESET', value: 'USER_PASSWORD_RESET' },
                  { label: 'USER_SUSPEND', value: 'USER_SUSPEND' },
                  { label: 'ROLE_ASSIGNMENT_CHANGE', value: 'ROLE_ASSIGNMENT_CHANGE' },
                  { label: 'ASSET_ASSIGN', value: 'ASSET_ASSIGN' },
                  { label: 'LICENSE_GRANT', value: 'LICENSE_GRANT' },
                  { label: 'CONFIG_CHANGE', value: 'CONFIG_CHANGE' },
                ]}
              />

              <Select
                value={severityFilter}
                onChange={setSeverityFilter}
                style={{ width: 130 }}
                placeholder="Severity"
                options={[
                  { label: 'All Severities', value: 'all' },
                  { label: 'Info', value: 'Info' },
                  { label: 'Warning', value: 'Warning' },
                  { label: 'Critical', value: 'Critical' },
                ]}
              />

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 130 }}
                placeholder="Status"
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Success', value: 'Success' },
                  { label: 'Failed', value: 'Failed' },
                  { label: 'Blocked', value: 'Blocked' },
                ]}
              />

              {(searchQuery ||
                actionFilter !== 'all' ||
                severityFilter !== 'all' ||
                statusFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setActionFilter('all');
                    setSeverityFilter('all');
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
          dataSource={logs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `Total ${total} activity records`,
          }}
        />
      </Card>

      {/* JSON Payload Inspector Drawer */}
      {selectedLog && (
        <Drawer
          title={
            <div>
              <Flex align="center" gap={8}>
                <Tag color={selectedLog.severity === 'Critical' ? 'error' : 'blue'}>
                  {selectedLog.severity}
                </Tag>
                <Text code strong>
                  {selectedLog.action}
                </Text>
              </Flex>
              <Title level={5} style={{ margin: '4px 0 0 0', fontSize: 13.5 }}>
                {selectedLog.entity}
              </Title>
            </div>
          }
          size="large"
          open={drawerOpen}
          destroyOnHidden
          styles={{ body: { padding: '20px' } }}
          onClose={() => setDrawerOpen(false)}
        >
          <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Event ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              <FormattedDateTime date={selectedLog.timestamp} showOffset showTimezone />
            </Descriptions.Item>
            <Descriptions.Item label="Actor">
              {selectedLog.userName || selectedLog.user} ({selectedLog.userEmail})
            </Descriptions.Item>
            <Descriptions.Item label="Target Entity">
              {selectedLog.entity} ({selectedLog.entityType || 'General'})
            </Descriptions.Item>
            <Descriptions.Item label="Origin IP">
              {selectedLog.ipAddress || '127.0.0.1'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={selectedLog.status === 'Success' ? 'success' : 'error'}>
                {selectedLog.status}
              </Tag>
              {selectedLog.statusCode && (
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                  (HTTP {selectedLog.statusCode})
                </Text>
              )}
            </Descriptions.Item>
            {selectedLog.durationMs != null && (
              <Descriptions.Item label="Execution Latency">
                <Text code>{selectedLog.durationMs.toFixed(2)} ms</Text>
              </Descriptions.Item>
            )}
            {selectedLog.userAgent && (
              <Descriptions.Item label="User Agent">
                <Text style={{ fontSize: 11.5 }}>{selectedLog.userAgent}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Details Summary">{selectedLog.details}</Descriptions.Item>
          </Descriptions>

          <Card
            size="small"
            title="Sanitized Request Payload & Diff"
            styles={{ body: { padding: 12 } }}
          >
            <pre
              style={{
                background: '#090d16',
                color: '#38bdf8',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'monospace',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {JSON.stringify(
                selectedLog.diffPayload || selectedLog.newValue || { details: selectedLog.details },
                null,
                2,
              )}
            </pre>
          </Card>
        </Drawer>
      )}
    </PageContainer>
  );
}
