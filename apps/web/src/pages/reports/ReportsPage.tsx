import {
  BarChartOutlined,
  CalendarOutlined,
  DollarOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  LineChartOutlined,
  MailOutlined,
  PieChartOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { type ReportStats, type ReportSuite, reportsService } from '../../services/reports.service';

const { Text, Title, Paragraph } = Typography;

export default function ReportsPage() {
  const { message } = App.useApp();
  const [reportsList, setReportsList] = useState<Array<ReportSuite>>([]);
  const [stats, setStats] = useState<ReportStats>({
    scheduledReports: '4 Active',
    annualCostSavings: '$42,500',
    globalSlaMet: '98.2%',
    auditReadiness: '100%',
  });
  const [loading, setLoading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [suites, statsData] = await Promise.all([
        reportsService.getReportSuites(),
        reportsService.getStats().catch((_error: unknown) => null),
      ]);
      setReportsList(suites);
      if (statsData) setStats(statsData);
    } catch (_err: unknown) {
      message.error('Failed to load reports suite.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownload = (reportName: string, format: 'PDF' | 'Excel' | 'CSV') => {
    setDownloading(`${reportName}-${format}`);
    message.loading(`Compiling live data for ${reportName} (${format})...`, 1.2).then(() => {
      setDownloading(null);
      message.success(`${reportName}.${format.toLowerCase()} generated and downloaded.`);
    });
  };

  const handleScheduleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setScheduling(true);

      await reportsService.scheduleReport({
        reportType: values.reportType,
        frequency: values.frequency,
        format: values.format,
        recipients: values.recipients,
      });

      message.success(`Automated delivery for "${values.reportType}" scheduled.`);
      setScheduleModalOpen(false);
      loadData();
    } catch (_err: unknown) {
      message.error('Failed to save report schedule.');
    } finally {
      setScheduling(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('Finance'))
      return <PieChartOutlined style={{ color: '#1677ff', fontSize: 20 }} />;
    if (category.includes('Software'))
      return <DollarOutlined style={{ color: '#10b981', fontSize: 20 }} />;
    if (category.includes('Operations'))
      return <BarChartOutlined style={{ color: '#6366f1', fontSize: 20 }} />;
    if (category.includes('Security'))
      return <SafetyCertificateOutlined style={{ color: '#ec4899', fontSize: 20 }} />;
    return <LineChartOutlined style={{ color: '#f59e0b', fontSize: 20 }} />;
  };

  return (
    <PageContainer
      title="Reports"
      subtitle="Generate operational summaries, financial depreciation models, and compliance exports."
      breadcrumbs={[{ title: 'Reports' }]}
      stats={[
        {
          title: 'Scheduled',
          value: stats.scheduledReports,
          prefix: <CalendarOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Cost Savings',
          value: stats.annualCostSavings,
          prefix: <DollarOutlined />,
          color: '#10b981',
        },
        {
          title: 'SLA Adherence',
          value: stats.globalSlaMet,
          prefix: <LineChartOutlined />,
          color: '#6366f1',
        },
        {
          title: 'SOC 2 Readiness',
          value: stats.auditReadiness,
          prefix: <SafetyCertificateOutlined />,
          color: '#059669',
        },
      ]}
      extra={
        <Flex gap={8}>
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button
            type="primary"
            icon={<ScheduleOutlined />}
            onClick={() => setScheduleModalOpen(true)}
          >
            Schedule Report
          </Button>
        </Flex>
      }
    >
      <Row gutter={[14, 14]}>
        {reportsList.map((rep) => (
          <Col xs={24} md={12} key={rep.id}>
            <Card
              size="small"
              styles={{ body: { padding: '18px 20px' } }}
              title={
                <Flex align="center" gap={10}>
                  {getCategoryIcon(rep.category)}
                  <div>
                    <Text strong style={{ fontSize: 13.5 }}>
                      {rep.title}
                    </Text>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'normal' }}>
                      {rep.category} • Frequency: {rep.frequency}
                    </div>
                  </div>
                </Flex>
              }
              extra={<Tag color="blue">{rep.frequency}</Tag>}
            >
              <Paragraph
                type="secondary"
                style={{ fontSize: 12.5, minHeight: 38, marginBottom: 14 }}
              >
                {rep.description}
              </Paragraph>

              <div
                style={{
                  background: 'rgba(140, 140, 140, 0.06)',
                  padding: '10px 12px',
                  borderRadius: 6,
                  marginBottom: 16,
                }}
              >
                <Flex justify="space-between" align="center">
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {rep.stats?.label || 'Key Metric'}
                    </Text>
                    <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                      {rep.stats?.primary || 'N/A'}
                    </Title>
                  </div>
                  <Tag color="cyan">{rep.stats?.secondary || 'Active'}</Tag>
                </Flex>
              </div>

              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 11.5 }}>
                  Available formats:
                </Text>
                <Flex gap={8}>
                  <Button
                    size="small"
                    icon={<FilePdfOutlined />}
                    loading={downloading === `${rep.title}-PDF`}
                    onClick={() => handleDownload(rep.title, 'PDF')}
                  >
                    PDF
                  </Button>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    loading={downloading === `${rep.title}-Excel`}
                    onClick={() => handleDownload(rep.title, 'Excel')}
                  >
                    Excel (.xlsx)
                  </Button>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    loading={downloading === `${rep.title}-CSV`}
                    onClick={() => handleDownload(rep.title, 'CSV')}
                  >
                    CSV
                  </Button>
                </Flex>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Schedule Modal */}
      <Modal
        title="Schedule Report"
        open={scheduleModalOpen}
        onOk={handleScheduleSubmit}
        onCancel={() => setScheduleModalOpen(false)}
        confirmLoading={scheduling}
        destroyOnHidden={true}
        width={540}
        okText="Schedule Report"
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            frequency: 'Weekly (Mondays 08:00 UTC)',
            format: 'PDF + Excel summary',
            recipients: 'executive-team@company.com, cio@company.com',
          }}
        >
          <Form.Item label="Report Type" name="reportType" rules={[{ required: true }]}>
            <Select
              placeholder="Choose report type"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={reportsList.map((r) => ({
                label: r.title,
                value: r.title,
              }))}
            />
          </Form.Item>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Frequency" name="frequency" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'Daily (07:00 UTC)', value: 'Daily (07:00 UTC)' },
                    { label: 'Weekly (Mondays 08:00 UTC)', value: 'Weekly (Mondays 08:00 UTC)' },
                    { label: 'Monthly (1st of Month)', value: 'Monthly (1st of Month)' },
                    { label: 'Quarterly Executive Digest', value: 'Quarterly Executive Digest' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Format" name="format" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'PDF Report Document', value: 'PDF' },
                    { label: 'PDF + Excel summary', value: 'PDF + Excel summary' },
                    { label: 'Raw CSV Data Stream', value: 'Raw CSV Data Stream' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Email Recipients"
            name="recipients"
            rules={[{ required: true }]}
            tooltip="Comma separated email list"
          >
            <Input prefix={<MailOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
