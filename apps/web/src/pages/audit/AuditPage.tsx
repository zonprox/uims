import {
  AuditOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilterOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PERMISSION_GRANT';
  severity: 'Info' | 'Warning' | 'Critical';
  entity: string;
  entityType: 'Asset' | 'License' | 'User' | 'Network' | 'Security';
  ipAddress: string;
  status: 'Success' | 'Failed' | 'Blocked';
  details: string;
  diffPayload?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    requestId: string;
    userAgent: string;
  };
}

const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'aud-8891',
    timestamp: '2024-03-15 10:14:22',
    user: 'Alex Johnson',
    userEmail: 'alex.johnson@company.com',
    action: 'CREATE',
    severity: 'Info',
    entity: 'Asset AST-1024',
    entityType: 'Asset',
    ipAddress: '192.168.1.15 (NY Office)',
    status: 'Success',
    details: 'Provisioned new MacBook Pro 16" M3 Max to Marcus Vance.',
    diffPayload: {
      requestId: 'req_88a91b2c',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) UIMS-Client/2.4',
      after: {
        tag: 'AST-1024',
        model: 'MacBook Pro 16 M3 Max',
        assignedTo: 'Marcus Vance',
        price: 3499,
      },
    },
  },
  {
    id: 'aud-8892',
    timestamp: '2024-03-15 09:45:10',
    user: 'Sarah Chen',
    userEmail: 'sarah.chen@company.com',
    action: 'UPDATE',
    severity: 'Info',
    entity: 'License Adobe CC',
    entityType: 'License',
    ipAddress: '192.168.10.12 (SF HQ)',
    status: 'Success',
    details: 'Allocated 1 user seat to Elena Rostova (Marketing).',
    diffPayload: {
      requestId: 'req_99c81a1d',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      before: { usedSeats: 23 },
      after: { usedSeats: 24, assignedUser: 'Elena Rostova' },
    },
  },
  {
    id: 'aud-8893',
    timestamp: '2024-03-15 04:12:00',
    user: 'Unknown IP (89.248.163.2)',
    userEmail: 'admin@company.com',
    action: 'LOGIN_FAILED',
    severity: 'Critical',
    entity: 'Authentication Gateway',
    entityType: 'Security',
    ipAddress: '89.248.163.2 (St. Petersburg, RU)',
    status: 'Blocked',
    details:
      'Failed password attempt with invalid SAML assertion signature. IP blocked by firewall rate-limiter.',
    diffPayload: {
      requestId: 'sec_block_4482',
      userAgent: 'python-requests/2.28.1',
      before: { geoCountry: 'RU', riskScore: 98 },
      after: { actionTaken: 'GEO_IP_DROP_RULE_ENGAGED' },
    },
  },
  {
    id: 'aud-8894',
    timestamp: '2024-03-14 16:30:19',
    user: 'Alex Johnson',
    userEmail: 'alex.johnson@company.com',
    action: 'PERMISSION_GRANT',
    severity: 'Warning',
    entity: 'Role Super Admin',
    entityType: 'User',
    ipAddress: '192.168.1.15 (NY Office)',
    status: 'Success',
    details:
      'Granted temporary Super Admin elevated privileges to Sarah Chen for network maintenance window.',
    diffPayload: {
      requestId: 'req_elevation_331',
      userAgent: 'UIMS-AdminConsole/2.4.0',
      before: { role: 'IT Specialist' },
      after: { role: 'Super Admin', expiresAt: '2024-03-16 00:00 UTC' },
    },
  },
  {
    id: 'aud-8895',
    timestamp: '2024-03-14 11:15:00',
    user: 'System Cron',
    userEmail: 'daemon@uims.internal',
    action: 'UPDATE',
    severity: 'Info',
    entity: 'Automated Snapshot',
    entityType: 'Security',
    ipAddress: '127.0.0.1 (Localhost)',
    status: 'Success',
    details: 'Nightly database snapshot sha256 checksum verified.',
  },
];

export default function AuditPage() {
  const { message } = App.useApp();
  const [logs, setLogs] = useState<AuditLog[]>(INITIAL_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog[] | null>(null);
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;

    return matchesSearch && matchesAction && matchesSeverity;
  });

  const handleExportCSV = () => {
    message.loading('Generating signed tamper-proof audit export...', 1.2).then(() => {
      message.success('Audit_Compliance_Log_2024.csv successfully downloaded.');
    });
  };

  const handleInspect = (log: AuditLog) => {
    setActiveLog(log);
    setDrawerOpen(true);
  };

  const columns = [
    {
      title: 'Timestamp (UTC)',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {timestamp}
          </Text>
        </div>
      ),
    },
    {
      title: 'Actor / User',
      dataIndex: 'user',
      key: 'user',
      render: (user: string, record: AuditLog) => (
        <Flex align="center" gap={8}>
          <Avatar
            size="small"
            style={{ backgroundColor: record.severity === 'Critical' ? '#ff4d4f' : '#1677ff' }}
            icon={<UserOutlined />}
          />
          <div>
            <Text style={{ fontSize: 13 }}>{user}</Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
              {record.ipAddress}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Event Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: AuditLog['action'], record: AuditLog) => {
        let color = 'blue';
        if (action === 'DELETE' || action === 'LOGIN_FAILED') color = 'error';
        if (action === 'CREATE' || action === 'LOGIN_SUCCESS') color = 'success';
        if (action === 'PERMISSION_GRANT') color = 'purple';
        return (
          <Space>
            <Tag color={color}>{action}</Tag>
            {record.severity === 'Critical' && <Tag color="red">Critical</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Target Entity',
      dataIndex: 'entity',
      key: 'entity',
      render: (entity: string, record: AuditLog) => (
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
      title: 'Outcome',
      dataIndex: 'status',
      key: 'status',
      render: (status: AuditLog['status']) => {
        let color = 'success';
        if (status === 'Blocked') color = 'error';
        if (status === 'Failed') color = 'warning';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Payload Diff',
      key: 'inspect',
      render: (_: any, record: AuditLog) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleInspect(record)}>
          Inspect JSON
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Audit Trail & Regulatory Compliance"
      subtitle="Immutable event logs, privilege escalations, authentication failures, and compliance telemetry."
      breadcrumbs={[{ title: 'Audit Logs' }]}
      stats={[
        {
          title: 'SOC2 Compliance Score',
          value: '98.4%',
          prefix: <SafetyOutlined />,
          color: '#52c41a',
        },
        {
          title: 'ISO 27001 Readiness',
          value: '96.0%',
          prefix: <SafetyCertificateOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Security Anomalies (24h)',
          value: '1 Blocked',
          prefix: <WarningOutlined />,
          color: '#faad14',
        },
        {
          title: 'Total Event Records',
          value: '14,892',
          prefix: <AuditOutlined />,
          color: '#722ed1',
        },
      ]}
      extra={
        <Button icon={<DownloadOutlined />} type="primary" onClick={handleExportCSV}>
          Export Audit Trail (CSV)
        </Button>
      }
    >
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search by actor, entity, IP address, or details..."
              prefix={<FilterOutlined style={{ color: '#8c8c8c' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={16}>
            <Flex gap={12} justify="flex-end" wrap>
              <Select
                value={actionFilter}
                onChange={setActionFilter}
                style={{ width: 170 }}
                placeholder="Action"
              >
                <Option value="all">All Action Types</Option>
                <Option value="CREATE">CREATE</Option>
                <Option value="UPDATE">UPDATE</Option>
                <Option value="DELETE">DELETE</Option>
                <Option value="PERMISSION_GRANT">PERMISSION_GRANT</Option>
                <Option value="LOGIN_FAILED">LOGIN_FAILED</Option>
              </Select>

              <Select
                value={severityFilter}
                onChange={setSeverityFilter}
                style={{ width: 140 }}
                placeholder="Severity"
              >
                <Option value="all">All Severities</Option>
                <Option value="Info">Info</Option>
                <Option value="Warning">Warning</Option>
                <Option value="Critical">Critical</Option>
              </Select>

              {(searchQuery || actionFilter !== 'all' || severityFilter !== 'all') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setActionFilter('all');
                    setSeverityFilter('all');
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
          dataSource={filteredLogs}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {/* JSON Diff Drawer */}
      {activeLog && (
        <Drawer
          title={
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Audit Event: {activeLog.id}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {activeLog.timestamp} UTC • {activeLog.ipAddress}
              </Text>
            </div>
          }
          width={540}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Descriptions size="small" bordered column={1} style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Actor">
              {activeLog.user} ({activeLog.userEmail})
            </Descriptions.Item>
            <Descriptions.Item label="Action Type">
              <Tag color={activeLog.action === 'LOGIN_FAILED' ? 'error' : 'blue'}>
                {activeLog.action}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Severity">
              <Tag color={activeLog.severity === 'Critical' ? 'red' : 'default'}>
                {activeLog.severity}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Target Entity">{activeLog.entity}</Descriptions.Item>
            <Descriptions.Item label="Outcome Status">
              <Tag color={activeLog.status === 'Success' ? 'success' : 'error'}>
                {activeLog.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Event Description">{activeLog.details}</Descriptions.Item>
          </Descriptions>

          <Title level={5}>Payload & Execution Context</Title>
          <div
            style={{
              padding: 16,
              background: '#1a1a1a',
              borderRadius: 8,
              color: '#4ade80',
              fontFamily: 'monospace',
              fontSize: 12,
              overflowX: 'auto',
            }}
          >
            <pre style={{ margin: 0 }}>
              {JSON.stringify(
                {
                  eventId: activeLog.id,
                  timestamp: activeLog.timestamp,
                  actor: activeLog.user,
                  ip: activeLog.ipAddress,
                  context: activeLog.diffPayload || { note: 'Standard database commit' },
                },
                null,
                2,
              )}
            </pre>
          </div>
          <Button
            style={{ marginTop: 12 }}
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(activeLog, null, 2));
              message.success('JSON payload copied to clipboard.');
            }}
          >
            Copy Raw JSON Payload
          </Button>
        </Drawer>
      )}
    </PageContainer>
  );
}
