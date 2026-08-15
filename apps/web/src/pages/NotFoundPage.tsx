import {
  CustomerServiceOutlined,
  DashboardOutlined,
  HomeOutlined,
  LaptopOutlined,
} from '@ant-design/icons';
import { Button, Card, Flex, Result, Space, Typography } from 'antd';
import { useNavigate } from 'react-router';

const { Text } = Typography;

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '75vh',
      }}
    >
      <Card
        style={{
          maxWidth: 560,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Result
          status="404"
          title="404"
          subTitle="Sorry, the page or resource you requested could not be located."
          extra={
            <Flex vertical gap={16} align="center">
              <Button
                type="primary"
                size="large"
                icon={<HomeOutlined />}
                onClick={() => navigate('/')}
              >
                Return to Dashboard
              </Button>

              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
                  Or jump directly to:
                </Text>
                <Space wrap>
                  <Button
                    size="small"
                    icon={<LaptopOutlined />}
                    onClick={() => navigate('/assets')}
                  >
                    Assets
                  </Button>
                  <Button
                    size="small"
                    icon={<CustomerServiceOutlined />}
                    onClick={() => navigate('/tickets')}
                  >
                    Helpdesk
                  </Button>
                  <Button
                    size="small"
                    icon={<DashboardOutlined />}
                    onClick={() => navigate('/directory')}
                  >
                    Directory
                  </Button>
                </Space>
              </div>
            </Flex>
          }
        />
      </Card>
    </div>
  );
}
