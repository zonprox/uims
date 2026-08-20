import {
  CrownOutlined,
  DesktopOutlined,
  LockOutlined,
  MoonOutlined,
  SunOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Checkbox, Flex, Form, Input, Tooltip, Typography } from 'antd';
import { SYSTEM_INFO } from '@uims/shared-utils';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore } from '../../stores/theme.store';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const toggleMode = useThemeStore((state) => state.toggleMode);
  const isDark = resolvedMode === 'dark';

  const from =
    typeof location.state?.from === 'string'
      ? location.state.from
      : location.state?.from?.pathname
        ? `${location.state.from.pathname}${location.state.from.search || ''}${location.state.from.hash || ''}`
        : '/';

  const onFinish = async (values: { email?: string; password?: string; remember?: boolean }) => {
    setLoading(true);
    try {
      if (!values.email || !values.password) {
        message.warning('Please enter your email or AD username and password.');
        return;
      }
      const response = await authService.login({
        email: values.email.trim(),
        password: values.password,
      });
      const data = response.data;
      login(data.accessToken || data.token || '', data.user);
      message.success(`Welcome back, ${data.user.name || 'Administrator'}!`);
      navigate(from, { replace: true });
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errMsg =
        err.response?.data?.message ||
        (err.message ? `Connection error: ${err.message}` : 'Invalid credentials.');
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: isDark ? '#090d16' : '#f8fafc',
        padding: '24px 16px',
        position: 'relative',
      }}
    >
      {/* Theme switcher top right */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 10 }}>
        <Tooltip title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
          <Button
            type="text"
            shape="circle"
            icon={isDark ? <SunOutlined style={{ color: '#f59e0b' }} /> : <MoonOutlined />}
            onClick={toggleMode}
          />
        </Tooltip>
      </div>

      {/* Main Centered Login Box */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          margin: 'auto 0',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Flex justify="center" align="center" gap={10} style={{ marginBottom: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: '#1677ff',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: '-0.02em',
                boxShadow: '0 4px 12px rgba(22, 119, 255, 0.35)',
              }}
            >
              U
            </div>
            <Title
              level={3}
              style={{
                margin: 0,
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              UIMS
            </Title>
          </Flex>
          <Text type="secondary" style={{ fontSize: 13.5 }}>
            IT Infrastructure & Asset Management Platform
          </Text>
        </div>

        {/* Clean Form Card */}
        <Card
          size="small"
          styles={{
            body: { padding: '28px 24px 24px' },
          }}
          style={{
            borderRadius: 8,
            boxShadow: isDark
              ? '0 1px 3px rgba(0, 0, 0, 0.4)'
              : '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          }}
        >
          <Form
            form={form}
            name="login"
            initialValues={{
              email: 'admin@uims.local',
              password: 'Admin@2026',
              remember: true,
            }}
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
          >
            <Form.Item
              label="Email Address or AD Username"
              name="email"
              rules={[
                { required: true, message: 'Please enter your corporate email or AD username' },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="name@company.com or username"
                size="large"
                style={{ fontSize: 13.5 }}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="••••••••••••"
                size="large"
                style={{ fontSize: 13.5 }}
                autoComplete="current-password"
              />
            </Form.Item>

            <Flex justify="space-between" align="center" style={{ marginBottom: 20 }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox style={{ fontSize: 13 }}>Remember me</Checkbox>
              </Form.Item>
            </Flex>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loading}
                style={{ fontWeight: 600, fontSize: 14 }}
              >
                Sign In
              </Button>
            </Form.Item>

            {/* Quick Demo Credentials Autofill */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9',
                border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              }}
            >
              <Text
                type="secondary"
                style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}
              >
                QUICK ACCESS / DEMO ACCOUNTS:
              </Text>
              <Flex gap={6} wrap="wrap">
                <Button
                  size="small"
                  type="dashed"
                  icon={<CrownOutlined style={{ color: '#eab308' }} />}
                  style={{ fontSize: 11, height: 24, padding: '0 8px' }}
                  onClick={() => {
                    form.setFieldsValue({
                      email: 'admin@uims.local',
                      password: 'Admin@2026',
                    });
                  }}
                >
                  Super Admin (admin)
                </Button>
                <Button
                  size="small"
                  type="dashed"
                  icon={<ToolOutlined style={{ color: '#3b82f6' }} />}
                  style={{ fontSize: 11, height: 24, padding: '0 8px' }}
                  onClick={() => {
                    form.setFieldsValue({
                      email: 'sarah.chen',
                      password: 'password123',
                    });
                  }}
                >
                  AD Login (sarah.chen)
                </Button>
                <Button
                  size="small"
                  type="dashed"
                  icon={<DesktopOutlined style={{ color: '#10b981' }} />}
                  style={{ fontSize: 11, height: 24, padding: '0 8px' }}
                  onClick={() => {
                    form.setFieldsValue({
                      email: 'david.kim',
                      password: 'password123',
                    });
                  }}
                >
                  AD Login (david.kim)
                </Button>
              </Flex>
            </div>
          </Form>
        </Card>
      </div>

      {/* Clean Minimalist Footer */}
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {SYSTEM_INFO.footerCredit}
        </Text>
      </div>
    </div>
  );
}
