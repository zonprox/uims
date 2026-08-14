import {
  CustomerServiceOutlined,
  LaptopOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Row, Statistic, Table } from 'antd';
import PageContainer from '../../components/PageContainer';
import { useAuthStore } from '../../stores/auth.store';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const columns = [
    { title: 'Time', dataIndex: 'time', key: 'time' },
    { title: 'User', dataIndex: 'user', key: 'user' },
    { title: 'Action', dataIndex: 'action', key: 'action' },
    { title: 'Entity', dataIndex: 'entity', key: 'entity' },
  ];

  const data = [
    {
      key: '1',
      time: '2023-10-27 10:00',
      user: 'Admin User',
      action: 'Created',
      entity: 'Asset L-1024',
    },
    {
      key: '2',
      time: '2023-10-27 09:30',
      user: 'Admin User',
      action: 'Updated',
      entity: 'Ticket #402',
    },
  ];

  return (
    <PageContainer
      title={`Welcome back, ${user?.name || 'User'}!`}
      subtitle="Here's what's happening in your IT environment today."
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Assets"
              value={1240}
              prefix={<LaptopOutlined />}
              styles={{ content: { color: '#1677ff' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Licenses"
              value={86}
              prefix={<SafetyCertificateOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Open Tickets"
              value={42}
              prefix={<CustomerServiceOutlined />}
              styles={{ content: { color: '#faad14' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Active Users" value={892} prefix={<TeamOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card title="Recent Activity" styles={{ body: { padding: 0 } }}>
            <Table columns={columns} dataSource={data} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Button icon={<PlusOutlined />} block>
                New Asset
              </Button>
              <Button icon={<PlusOutlined />} block>
                Assign License
              </Button>
              <Button icon={<PlusOutlined />} block>
                Create User
              </Button>
              <Button icon={<PlusOutlined />} block type="primary">
                Open Ticket
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
