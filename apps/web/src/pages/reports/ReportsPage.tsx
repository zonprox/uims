import {
  DatabaseOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  GlobalOutlined,
  LaptopOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Col, Flex, Row, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { reportsService } from '../../services/reports.service';

const { Text, Title, Paragraph } = Typography;

interface OperationalDomainExport {
  id: string;
  domain: 'hardware' | 'licenses' | 'inventory' | 'network' | 'employees';
  title: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  description: string;
  fields: string[];
}

const OPERATIONAL_DOMAINS: OperationalDomainExport[] = [
  {
    id: 'domain-hardware',
    domain: 'hardware',
    title: 'Hardware Assets',
    tag: 'Hardware Fleet',
    tagColor: 'blue',
    icon: <LaptopOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
    description:
      'Complete inventory of physical computing equipment, workstations, servers, and peripherals including serial numbers, cost centers, warranty expiration, and custodian assignments.',
    fields: ['Asset Tag', 'Model', 'Category', 'Status', 'Custodian', 'Warranty'],
  },
  {
    id: 'domain-licenses',
    domain: 'licenses',
    title: 'Software Licenses',
    tag: 'SaaS & Enterprise',
    tagColor: 'green',
    icon: <SafetyCertificateOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
    description:
      'Enterprise software subscriptions and perpetual license contracts detailing vendor agreements, seat utilization, allocated seats, unit costs, and renewal schedules.',
    fields: ['Software Name', 'Vendor', 'Seats', 'Cost/Seat', 'Total Cost', 'Expiry'],
  },
  {
    id: 'domain-inventory',
    domain: 'inventory',
    title: 'Consumable Inventory',
    tag: 'Stock & Supplies',
    tagColor: 'orange',
    icon: <DatabaseOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
    description:
      'Consumable stock items, spare network cabling, adapters, and peripheral accessories tracking SKU numbers, bin locations, minimum thresholds, and valuations.',
    fields: ['SKU', 'Item Name', 'Quantity', 'Threshold', 'Valuation', 'Supplier'],
  },
  {
    id: 'domain-network',
    domain: 'network',
    title: 'Network Infrastructure',
    tag: 'Switches & IPAM',
    tagColor: 'purple',
    icon: <GlobalOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
    description:
      'Network switches, rack positions, port allocations, subnets, and IP address management (IPAM) records including CIDR ranges, gateway routes, and management addresses.',
    fields: ['Asset Name', 'Type', 'CIDR/Vendor', 'Gateway', 'Capacity', 'Management IP'],
  },
  {
    id: 'domain-employees',
    domain: 'employees',
    title: 'Directory Employees',
    tag: 'Staff Directory',
    tagColor: 'cyan',
    icon: <TeamOutlined style={{ fontSize: 24, color: '#13c2c2' }} />,
    description:
      'Corporate employee directory records covering corporate emails, departments, job titles, business phone extensions, account status, and Active Directory domain join states.',
    fields: ['Employee Code', 'Full Name', 'Email', 'Department', 'Job Title', 'AD Status'],
  },
];

export default function ReportsPage() {
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (
    domain: 'hardware' | 'licenses' | 'inventory' | 'network' | 'employees',
    format: 'xlsx' | 'pdf',
  ) => {
    const downloadKey = `${domain}-${format}`;
    setDownloading(downloadKey);

    const formatLabel = format === 'xlsx' ? 'Excel (.xlsx)' : 'PDF';
    const domainTitle = OPERATIONAL_DOMAINS.find((d) => d.domain === domain)?.title || domain;

    try {
      message.loading({
        content: `Compiling ${domainTitle} report (${formatLabel})...`,
        key: downloadKey,
        duration: 0,
      });

      await reportsService.exportReport(domain, format);

      message.success({
        content: `${domainTitle} report (${formatLabel}) exported successfully.`,
        key: downloadKey,
        duration: 3,
      });
    } catch (_error: unknown) {
      message.error({
        content: `Failed to export ${domainTitle} report. Please try again.`,
        key: downloadKey,
        duration: 4,
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <PageContainer
      title="Operational Data Exports"
      subtitle="Export live system datasets to formatted Excel workbooks and standard PDF documents."
      breadcrumbs={[{ title: 'Reports' }]}
    >
      <Row gutter={[16, 16]}>
        {OPERATIONAL_DOMAINS.map((item) => (
          <Col xs={24} md={12} key={item.id}>
            <Card
              styles={{
                body: {
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 250,
                },
              }}
              title={
                <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                  <Space size={12}>
                    {item.icon}
                    <Title level={5} style={{ margin: 0 }}>
                      {item.title}
                    </Title>
                  </Space>
                  <Tag color={item.tagColor}>{item.tag}</Tag>
                </Flex>
              }
            >
              <div>
                <Paragraph
                  type="secondary"
                  style={{
                    fontSize: 13,
                    lineHeight: '1.6',
                    marginBottom: 16,
                  }}
                >
                  {item.description}
                </Paragraph>

                <div style={{ marginBottom: 20 }}>
                  <Text
                    type="secondary"
                    style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}
                  >
                    Included Dataset Fields:
                  </Text>
                  <Space size={[4, 6]} wrap>
                    {item.fields.map((field) => (
                      <Tag key={field} style={{ fontSize: 11, margin: 0 }}>
                        {field}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>

              <div>
                <Text
                  type="secondary"
                  style={{ fontSize: 11.5, display: 'block', marginBottom: 8 }}
                >
                  Export Formats:
                </Text>
                <Flex gap={10} wrap="wrap">
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    loading={downloading === `${item.domain}-xlsx`}
                    onClick={() => handleDownload(item.domain, 'xlsx')}
                  >
                    Export Excel (.xlsx)
                  </Button>
                  <Button
                    icon={<FilePdfOutlined />}
                    loading={downloading === `${item.domain}-pdf`}
                    onClick={() => handleDownload(item.domain, 'pdf')}
                  >
                    Export PDF
                  </Button>
                </Flex>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
}
