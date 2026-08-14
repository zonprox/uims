import {
  AuditOutlined,
  BarChartOutlined,
  CalendarOutlined,
  DollarOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  LineChartOutlined,
  MailOutlined,
  PieChartOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const { message } = App.useApp();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [form] = Form.useForm();

  const handleDownload = (reportName: string, format: 'PDF' | 'Excel' | 'CSV') => {
    setDownloading(`${reportName}-${format}`);
    message.loading(`Compiling and rendering ${reportName} (${format})...`, 1.5).then(() => {
      setDownloading(null);
      message.success(`${reportName}.${format.toLowerCase()} generated and downloaded.`);
    });
  };

  const handleScheduleSubmit = async () => {
    try {
      const values = await form.validateFields();
      message.success(
        `Automated delivery for "${values.reportType}" scheduled at ${values.frequency} frequency.`,
      );
      setScheduleModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const reportsList = [
    {
      id: 'r1',
      title: 'IT Asset Lifecycle & Depreciation Report',
      description:
        'Comprehensive financial depreciation curves, MACRS 5-year schedules, asset age distribution, and decommissioning forecasts.',
      category: 'Finance & Hardware',
      frequency: 'Quarterly',
      icon: <PieChartOutlined style={{ color: '#1677ff', fontSize: 24 }} />,
      stats: { primary: '$482,000', label: 'Total Asset Valuation', secondary: '3.4 yrs avg age' },
    },
    {
      id: 'r2',
      title: 'Software License Utilization & Cost Optimization',
      description:
        'Granular analysis of active vs unused SaaS seats, subscription renewals, vendor spending breakdown, and license consolidation recommendations.',
      category: 'Software & Cloud',
      frequency: 'Monthly',
      icon: <DollarOutlined style={{ color: '#52c41a', fontSize: 24 }} />,
      stats: {
        primary: '$42,500/yr',
        label: 'Identified Waste / Idle Seats',
        secondary: '88.5% Seat Usage',
      },
    },
    {
      id: 'r3',
      title: 'Helpdesk SLA & Support Velocity Metrics',
      description:
        'Ticket volume trends, mean time to acknowledge (MTTA), mean time to resolve (MTTR), SLA adherence rates, and customer satisfaction scores.',
      category: 'Operations',
      frequency: 'Weekly',
      icon: <BarChartOutlined style={{ color: '#722ed1', fontSize: 24 }} />,
      stats: {
        primary: '98.2%',
        label: 'SLA Response Adherence',
        secondary: '18 min avg resolution',
      },
    },
    {
      id: 'r4',
      title: 'SOC2 & ISO 27001 Security Audit Telemetry',
      description:
        'Audit logs of administrator privilege elevations, failed authentication anomalies, firewall drops, and compliance readiness checklist.',
      category: 'Security & Compliance',
      frequency: 'Continuous',
      icon: <SafetyCertificateOutlined style={{ color: '#fa8c16', fontSize: 24 }} />,
      stats: {
        primary: '100% Pass',
        label: 'SOC2 Audit Controls',
        secondary: '0 Critical Findings',
      },
    },
    {
      id: 'r5',
      title: 'Hardware Stock Depletion & Supply Chain Velocity',
      description:
        'Inventory consumption rates for cables, docks, power adapters, and peripherals with automated reorder trigger points.',
      category: 'Inventory',
      frequency: 'Monthly',
      icon: <LineChartOutlined style={{ color: '#13c2c2', fontSize: 24 }} />,
      stats: {
        primary: '8.4 Units/wk',
        label: 'Average Consumable Burn',
        secondary: '2 Items Near Safe Threshold',
      },
    },
  ];

  return (
    <PageContainer
      title="Reports & Executive Analytics"
      subtitle="Exportable financial depreciation models, license waste reports, SLA performance, and SOC2 audit packs."
      breadcrumbs={[{ title: 'Reports' }]}
      stats={[
        {
          title: 'Scheduled Active Reports',
          value: '4 Automated',
          prefix: <ScheduleOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Estimated Annual Cost Savings',
          value: '$42,500',
          prefix: <DollarOutlined />,
          color: '#52c41a',
        },
        {
          title: 'Global SLA Compliance',
          value: '98.2%',
          prefix: <BarChartOutlined />,
          color: '#722ed1',
        },
        {
          title: 'Compliance Audit Readiness',
          value: '100%',
          prefix: <SafetyCertificateOutlined />,
          color: '#fa8c16',
        },
      ]}
      extra={
        <Button
          type="primary"
          icon={<CalendarOutlined />}
          onClick={() => setScheduleModalOpen(true)}
        >
          Schedule Automated Report
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        {reportsList.map((report) => (
          <Col xs={24} lg={12} key={report.id}>
            <Card className="uims-stat-card" styles={{ body: { padding: '20px 24px' } }}>
              <Flex gap={16} align="flex-start">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: 'rgba(140, 140, 140, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {report.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <Flex justify="space-between" align="center">
                    <Tag color="blue">{report.category}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Cadence: {report.frequency}
                    </Text>
                  </Flex>

                  <Title level={5} style={{ margin: '6px 0 4px 0', fontSize: 15 }}>
                    {report.title}
                  </Title>
                  <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
                    {report.description}
                  </Paragraph>

                  {/* Stat highlight box */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(140, 140, 140, 0.04)',
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 14, color: '#1677ff' }}>
                        {report.stats.primary}
                      </Text>
                      <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                        {report.stats.label}
                      </Text>
                    </div>
                    <Tag color="cyan">{report.stats.secondary}</Tag>
                  </div>

                  {/* Actions */}
                  <Flex justify="flex-end" gap={8}>
                    <Button
                      size="small"
                      icon={<FilePdfOutlined />}
                      loading={downloading === `${report.title}-PDF`}
                      onClick={() => handleDownload(report.title, 'PDF')}
                    >
                      PDF Report
                    </Button>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      loading={downloading === `${report.title}-Excel`}
                      onClick={() => handleDownload(report.title, 'Excel')}
                    >
                      Excel / CSV
                    </Button>
                  </Flex>
                </div>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Schedule Modal */}
      <Modal
        title="Schedule Automated Executive Report"
        open={scheduleModalOpen}
        onOk={handleScheduleSubmit}
        onCancel={() => setScheduleModalOpen(false)}
        okText="Schedule Delivery"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ frequency: 'Monthly', format: 'PDF' }}
          style={{ marginTop: 16 }}
        >
          <Form.Item label="Select Report Suite" name="reportType" rules={[{ required: true }]}>
            <Select>
              <Option value="IT Asset Lifecycle & Depreciation Report">
                IT Asset Lifecycle & Depreciation Report
              </Option>
              <Option value="Software License Utilization & Cost Optimization">
                Software License Utilization & Cost Optimization
              </Option>
              <Option value="Helpdesk SLA & Support Velocity Metrics">
                Helpdesk SLA & Support Velocity Metrics
              </Option>
              <Option value="SOC2 & ISO 27001 Security Audit Telemetry">
                SOC2 & ISO 27001 Security Audit Telemetry
              </Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Delivery Frequency" name="frequency" rules={[{ required: true }]}>
                <Select>
                  <Option value="Weekly (Mondays 08:00 AM)">Weekly (Mondays 08:00 AM)</Option>
                  <Option value="Monthly (1st of each Month)">Monthly (1st of each Month)</Option>
                  <Option value="Quarterly (End of Quarter)">Quarterly (End of Quarter)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Export Format" name="format">
                <Select>
                  <Option value="PDF">Formatted PDF Document</Option>
                  <Option value="Excel">Raw Excel Spreadsheet (.xlsx)</Option>
                  <Option value="CSV">CSV Data Archive</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Recipient Email Addresses (comma separated)"
            name="recipients"
            rules={[{ required: true, message: 'Please enter at least one recipient email' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="cio@company.com, cfo@company.com" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
