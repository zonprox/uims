import {
  AuditOutlined,
  CheckCircleFilled,
  GlobalOutlined,
  KeyOutlined,
  LaptopOutlined,
  LockOutlined,
  MoonOutlined,
  SafetyCertificateFilled,
  SafetyCertificateOutlined,
  SunOutlined,
  ThunderboltFilled,
  UserOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore } from '../../stores/theme.store';

const { Title, Text, Paragraph } = Typography;

export default function LoginPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('password');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  const from = location.state?.from?.pathname || '/';

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await authService.login(values);
      login(response.data.token, response.data.user);
      message.success(`Welcome back, ${response.data.user.name || 'User'}!`);
      navigate(from, { replace: true });
    } catch (_error) {
      message.error('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'technician' | 'auditor') => {
    const rolesMap = {
      admin: { email: 'admin@uims.internal', name: 'Alex Johnson (Super Admin)', role: 'admin' },
      technician: {
        email: 'tech@uims.internal',
        name: 'Sarah Chen (IT Specialist)',
        role: 'technician',
      },
      auditor: {
        email: 'compliance@uims.internal',
        name: 'Marcus Bell (Lead Auditor)',
        role: 'auditor',
      },
    };

    const target = rolesMap[role];
    login('mock-jwt-token', {
      id: role,
      email: target.email,
      name: target.name,
      role: target.role,
    });
    message.success(`Logged in as ${target.name}`);
    navigate(from, { replace: true });
  };

  const handleForgotPassword = () => {
    if (!forgotEmail) {
      message.warning('Please enter your email address first.');
      return;
    }
    setForgotSubmitted(true);
    message.success('Password reset instructions sent to your email.');
    setTimeout(() => {
      setForgotModalOpen(false);
      setForgotSubmitted(false);
    }, 1500);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        background: mode === 'dark' ? '#0b0f19' : '#f0f4f9',
      }}
    >
      {/* Theme switcher floating */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <Tooltip title={mode === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}>
          <Button
            shape="circle"
            icon={mode === 'dark' ? <SunOutlined style={{ color: '#faad14' }} /> : <MoonOutlined />}
            onClick={toggleMode}
          />
        </Tooltip>
      </div>

      <Row style={{ width: '100%', margin: 0 }}>
        {/* Left Hero Banner */}
        <Col
          xs={0}
          md={11}
          lg={13}
          xl={14}
          style={{
            background:
              mode === 'dark'
                ? 'linear-gradient(135deg, #0d131f 0%, #1e1b4b 50%, #0f172a 100%)'
                : 'linear-gradient(135deg, #0958d9 0%, #1677ff 50%, #3b82f6 100%)',
            padding: '48px 64px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background shapes */}
          <div
            style={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
            }}
          />

          <div>
            <Flex align="center" gap={12} style={{ marginBottom: 36 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#ffffff',
                  color: '#1677ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 22,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                U
              </div>
              <div>
                <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 800 }}>
                  UIMS ENTERPRISE
                </Title>
                <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 12 }}>
                  Unified IT Management & Infrastructure Platform
                </Text>
              </div>
            </Flex>

            <div style={{ maxWidth: 520, marginTop: 40 }}>
              <Tag color="cyan" style={{ marginBottom: 16, padding: '4px 10px', fontSize: 13 }}>
                <ThunderboltFilled /> Powered by Ant Design 6.6.0
              </Tag>
              <Title
                level={2}
                style={{ color: '#fff', fontWeight: 800, lineHeight: 1.25, margin: '0 0 16px 0' }}
              >
                Complete Governance over Hardware, Licenses & Operations.
              </Title>
              <Paragraph
                style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 15, lineHeight: 1.6 }}
              >
                Unified visibility into your organization's entire digital ecosystem. Automate
                provisioning, ensure regulatory compliance, and eliminate software waste in a single
                command center.
              </Paragraph>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <Row gutter={[24, 24]} style={{ marginTop: 40, marginBottom: 20 }}>
            <Col span={12}>
              <Flex gap={12} align="flex-start">
                <LaptopOutlined style={{ fontSize: 22, color: '#6ee7b7' }} />
                <div>
                  <Text strong style={{ color: '#fff', fontSize: 14, display: 'block' }}>
                    Asset Lifecycle
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>
                    From procurement to decommission & depreciation tracking.
                  </Text>
                </div>
              </Flex>
            </Col>
            <Col span={12}>
              <Flex gap={12} align="flex-start">
                <SafetyCertificateOutlined style={{ fontSize: 22, color: '#93c5fd' }} />
                <div>
                  <Text strong style={{ color: '#fff', fontSize: 14, display: 'block' }}>
                    Zero-Waste Licenses
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>
                    Real-time seat utilization meters & renewal countdowns.
                  </Text>
                </div>
              </Flex>
            </Col>
            <Col span={12}>
              <Flex gap={12} align="flex-start">
                <GlobalOutlined style={{ fontSize: 22, color: '#fcd34d' }} />
                <div>
                  <Text strong style={{ color: '#fff', fontSize: 14, display: 'block' }}>
                    IPAM & Subnets
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>
                    Instant allocation, MAC tracking & DHCP synchronization.
                  </Text>
                </div>
              </Flex>
            </Col>
            <Col span={12}>
              <Flex gap={12} align="flex-start">
                <AuditOutlined style={{ fontSize: 22, color: '#f472b6' }} />
                <div>
                  <Text strong style={{ color: '#fff', fontSize: 14, display: 'block' }}>
                    Continuous Audit
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>
                    SOC2 & ISO 27001 ready tamper-proof change history.
                  </Text>
                </div>
              </Flex>
            </Col>
          </Row>

          {/* Compliance & Security Footer */}
          <Flex
            justify="space-between"
            align="center"
            style={{ paddingTop: 20, borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}
          >
            <Flex gap={16} align="center">
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
                <CheckCircleFilled style={{ color: '#52c41a', marginRight: 6 }} /> SOC2 Type II
                Certified
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
                <SafetyCertificateFilled style={{ color: '#52c41a', marginRight: 6 }} /> ISO 27001
                Compliant
              </span>
            </Flex>
            <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}>Uptime 99.99%</Text>
          </Flex>
        </Col>

        {/* Right Form Column */}
        <Col
          xs={24}
          md={13}
          lg={11}
          xl={10}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
          }}
        >
          <Card
            className="uims-stat-card"
            style={{
              width: '100%',
              maxWidth: 440,
              borderRadius: 14,
              border: mode === 'dark' ? '1px solid #1f2937' : '1px solid #eef2f6',
              boxShadow:
                mode === 'dark'
                  ? '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                  : '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
            }}
            styles={{ body: { padding: '32px 32px 28px' } }}
          >
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
                Sign In to UIMS
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Enter your enterprise credentials to access your console
              </Text>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              centered
              items={[
                { key: 'password', label: 'Password' },
                { key: 'sso', label: 'Single Sign-On' },
                { key: 'passkey', label: 'Passkey' },
              ]}
              style={{ marginBottom: 20 }}
            />

            {activeTab === 'password' && (
              <Form
                name="login"
                initialValues={{
                  email: 'admin@uims.internal',
                  password: 'password123',
                  remember: true,
                }}
                onFinish={onFinish}
                layout="vertical"
                size="large"
              >
                <Form.Item
                  label="Work Email"
                  name="email"
                  rules={[
                    { required: true, message: 'Please enter your work email' },
                    { type: 'email', message: 'Please enter a valid email address' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#8c8c8c' }} />}
                    placeholder="name@company.com"
                  />
                </Form.Item>

                <Form.Item
                  label="Password"
                  name="password"
                  rules={[{ required: true, message: 'Please enter your password' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#8c8c8c' }} />}
                    placeholder="••••••••••••"
                  />
                </Form.Item>

                <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>Remember for 30 days</Checkbox>
                  </Form.Item>
                  <Button
                    type="link"
                    style={{ padding: 0, fontSize: 13 }}
                    onClick={() => setForgotModalOpen(true)}
                  >
                    Forgot password?
                  </Button>
                </Flex>

                <Form.Item style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={loading}
                    style={{ height: 42, fontSize: 15, fontWeight: 600 }}
                  >
                    Sign In
                  </Button>
                </Form.Item>
              </Form>
            )}

            {activeTab === 'sso' && (
              <Flex vertical gap={14} style={{ padding: '12px 0 20px' }}>
                <Alert
                  type="info"
                  showIcon
                  message="Enterprise SAML / OAuth 2.0"
                  description="Authenticate using your corporate Okta, Microsoft Azure AD, or Google Workspace directory."
                  style={{ marginBottom: 10 }}
                />
                <Button
                  block
                  size="large"
                  icon={<GlobalOutlined />}
                  onClick={() => handleQuickLogin('admin')}
                >
                  Continue with Okta SSO
                </Button>
                <Button
                  block
                  size="large"
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => handleQuickLogin('admin')}
                >
                  Continue with Microsoft Entra ID
                </Button>
              </Flex>
            )}

            {activeTab === 'passkey' && (
              <Flex
                vertical
                align="center"
                gap={16}
                style={{ padding: '24px 0 20px', textAlign: 'center' }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(22, 119, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1677ff',
                    fontSize: 28,
                  }}
                >
                  <KeyOutlined />
                </div>
                <div>
                  <Text strong style={{ fontSize: 15, display: 'block' }}>
                    FIDO2 / WebAuthn Biometric Key
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Touch your hardware key or use Touch ID / Face ID
                  </Text>
                </div>
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => handleQuickLogin('admin')}
                  style={{ marginTop: 8 }}
                >
                  Verify Passkey
                </Button>
              </Flex>
            )}

            {/* Quick Demo Logins Section */}
            <Divider style={{ margin: '16px 0 14px 0', fontSize: 12, color: '#8c8c8c' }}>
              Quick Demo Access
            </Divider>

            <Flex gap={8} justify="center" wrap>
              <Button size="small" onClick={() => handleQuickLogin('admin')}>
                Admin
              </Button>
              <Button size="small" onClick={() => handleQuickLogin('technician')}>
                IT Tech
              </Button>
              <Button size="small" onClick={() => handleQuickLogin('auditor')}>
                Auditor
              </Button>
            </Flex>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Protected by UIMS Enterprise Security. All activity is audited.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Forgot Password Modal */}
      <Modal
        title="Reset Your Password"
        open={forgotModalOpen}
        onCancel={() => setForgotModalOpen(false)}
        onOk={handleForgotPassword}
        okText="Send Reset Link"
        confirmLoading={forgotSubmitted}
      >
        <Paragraph type="secondary">
          Enter your registered enterprise email address and we'll send you a secure link to reset
          your credentials.
        </Paragraph>
        <Input
          prefix={<UserOutlined />}
          placeholder="your.email@company.com"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
        />
      </Modal>
    </div>
  );
}
