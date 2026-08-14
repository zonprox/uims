import { Row, Col, Card, Button } from 'antd';
import { PieChartOutlined, LineChartOutlined, BarChartOutlined, DownloadOutlined } from '@ant-design/icons';
import PageContainer from '../../components/PageContainer';

export default function ReportsPage() {
  const reports = [
    { title: 'Asset Distribution', description: 'Breakdown of IT assets by category, status, and location.', icon: <PieChartOutlined /> },
    { title: 'License Utilization', description: 'Usage statistics of software licenses and upcoming expirations.', icon: <LineChartOutlined /> },
    { title: 'Helpdesk Performance', description: 'Ticket resolution times and support team performance metrics.', icon: <BarChartOutlined /> },
    { title: 'Hardware Depreciation', description: 'Financial report on asset aging and depreciation values.', icon: <LineChartOutlined /> },
  ];

  return (
    <PageContainer title="Reports & Analytics" breadcrumbs={[{ title: 'Home', path: '/' }, { title: 'Reports' }]}>
      <Row gutter={[16, 16]}>
        {reports.map((report, idx) => (
          <Col xs={24} sm={12} md={8} lg={6} key={idx}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {report.icon}
                  <span>{report.title}</span>
                </div>
              }
              actions={[
                <Button type="link" icon={<DownloadOutlined />}>Download PDF</Button>,
                <Button type="link">View Online</Button>
              ]}
            >
              <p style={{ height: '60px', color: '#666' }}>{report.description}</p>
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
}
