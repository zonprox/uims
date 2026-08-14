import {
  BgColorsOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LockOutlined,
  MailOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SettingOutlined,
  SlidersOutlined,
  ThunderboltFilled,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  ColorPicker,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { COLOR_PRESETS, type ThemeMode, useThemeStore } from '../../stores/theme.store';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export default function SettingsPage() {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('appearance');
  const [backupRunning, setBackupRunning] = useState(false);

  // Theme store state
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const compact = useThemeStore((state) => state.compact);
  const setCompact = useThemeStore((state) => state.setCompact);
  const presetKey = useThemeStore((state) => state.presetKey);
  const setPresetKey = useThemeStore((state) => state.setPresetKey);
  const borderRadius = useThemeStore((state) => state.borderRadius);
  const setBorderRadius = useThemeStore((state) => state.setBorderRadius);

  const [generalForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [integrationForm] = Form.useForm();

  const handleSaveGeneral = () => {
    message.success('General enterprise settings updated.');
  };

  const handleSaveSecurity = () => {
    message.success('Security & authentication policies enforced.');
  };

  const handleSaveIntegrations = () => {
    message.success('Integrations & webhooks saved.');
  };

  const handleTestWebhook = () => {
    message.loading('Testing Slack / Teams webhook connectivity...', 1.2).then(() => {
      message.success('Test payload delivered successfully (HTTP 200 OK).');
    });
  };

  const handleRunBackup = () => {
    setBackupRunning(true);
    message.loading('Triggering on-demand PostgreSQL snapshot & encryption...', 2).then(() => {
      setBackupRunning(false);
      message.success('Database snapshot (snapshot-2024-03-15.enc) uploaded to secure S3 vault.');
    });
  };

  return (
    <PageContainer
      title="System Settings & Governance"
      subtitle="Theme personalization, authentication policies, SMTP routing, and system maintenance."
      breadcrumbs={[{ title: 'Settings' }]}
    >
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'appearance',
              label: (
                <Space>
                  <BgColorsOutlined />
                  <span>Ant Design 6.6 Theme</span>
                </Space>
              ),
              children: (
                <div style={{ maxWidth: 860, padding: '12px 0' }}>
                  <Alert
                    type="info"
                    showIcon
                    icon={<ThunderboltFilled />}
                    message="Ant Design 6.6.0 Real-time Design Token Customizer"
                    description="All changes below are computed dynamically using Ant Design's CSS-in-JS Token Engine and persisted locally in your workspace."
                    style={{ marginBottom: 24 }}
                  />

                  {/* Mode Selector */}
                  <div style={{ marginBottom: 24 }}>
                    <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>
                      Interface Theme Mode
                    </Text>
                    <Radio.Group
                      value={mode}
                      onChange={(e) => setMode(e.target.value as ThemeMode)}
                      buttonStyle="solid"
                      size="middle"
                    >
                      <Radio.Button value="light">☀️ Light Clean</Radio.Button>
                      <Radio.Button value="dark">🌙 Dark Enterprise</Radio.Button>
                    </Radio.Group>
                  </div>

                  {/* Preset Colors */}
                  <div style={{ marginBottom: 24 }}>
                    <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 10 }}>
                      Primary Brand Color Palette
                    </Text>
                    <Row gutter={[12, 12]}>
                      {COLOR_PRESETS.map((preset) => (
                        <Col xs={12} sm={8} md={4} key={preset.key}>
                          <div
                            onClick={() => setPresetKey(preset.key)}
                            style={{
                              cursor: 'pointer',
                              padding: 12,
                              borderRadius: 8,
                              border:
                                presetKey === preset.key
                                  ? `2px solid ${preset.primary}`
                                  : '1px solid rgba(140, 140, 140, 0.2)',
                              background:
                                presetKey === preset.key
                                  ? 'rgba(22, 119, 255, 0.05)'
                                  : 'transparent',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                            }}
                          >
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: preset.primary,
                                margin: '0 auto 6px auto',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                              }}
                            />
                            <Text strong style={{ fontSize: 12, display: 'block' }}>
                              {preset.name}
                            </Text>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>

                  <Row gutter={24} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12}>
                      <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>
                        Compact Density Mode
                      </Text>
                      <Flex align="center" gap={12}>
                        <Switch checked={compact} onChange={setCompact} />
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Reduce padding and heights for data-dense displays
                        </Text>
                      </Flex>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>
                        Component Border Radius: {borderRadius}px
                      </Text>
                      <Slider
                        min={0}
                        max={16}
                        step={2}
                        value={borderRadius}
                        onChange={setBorderRadius}
                      />
                    </Col>
                  </Row>

                  <Divider>Live Interactive Token Preview</Divider>

                  {/* Component Preview Grid */}
                  <Card size="small" style={{ background: 'rgba(140, 140, 140, 0.03)' }}>
                    <Flex gap={16} align="center" wrap style={{ marginBottom: 16 }}>
                      <Button type="primary">Primary Button</Button>
                      <Button>Default Button</Button>
                      <Button type="dashed">Dashed</Button>
                      <Tag color="success">Active</Tag>
                      <Tag color="processing">In Progress</Tag>
                      <Tag color="error">Urgent</Tag>
                    </Flex>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Input placeholder="Theme aware text input" />
                      </Col>
                      <Col span={12}>
                        <Select defaultValue="apple" style={{ width: '100%' }}>
                          <Option value="apple">Ant Design 6 Dropdown</Option>
                        </Select>
                      </Col>
                    </Row>
                  </Card>
                </div>
              ),
            },
            {
              key: 'general',
              label: (
                <Space>
                  <SettingOutlined />
                  <span>General Preferences</span>
                </Space>
              ),
              children: (
                <Form
                  form={generalForm}
                  layout="vertical"
                  initialValues={{
                    companyName: 'Acme Enterprise Inc.',
                    supportEmail: 'it-support@company.com',
                    timezone: 'UTC',
                    dateFormat: 'YYYY-MM-DD',
                  }}
                  style={{ maxWidth: 600, padding: '12px 0' }}
                >
                  <Form.Item
                    label="Organization / Company Name"
                    name="companyName"
                    rules={[{ required: true }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="Primary IT Support Contact Email"
                    name="supportEmail"
                    rules={[{ required: true, type: 'email' }]}
                  >
                    <Input prefix={<MailOutlined />} />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Default Timezone" name="timezone">
                        <Select>
                          <Option value="UTC">UTC (Universal Coordinated Time)</Option>
                          <Option value="America/New_York">EST (Eastern Standard Time)</Option>
                          <Option value="America/Los_Angeles">PST (Pacific Standard Time)</Option>
                          <Option value="Europe/London">GMT (London Time)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Date Display Format" name="dateFormat">
                        <Select>
                          <Option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</Option>
                          <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                          <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveGeneral}>
                    Save Preferences
                  </Button>
                </Form>
              ),
            },
            {
              key: 'security',
              label: (
                <Space>
                  <SafetyCertificateOutlined />
                  <span>Security & SSO Policy</span>
                </Space>
              ),
              children: (
                <Form
                  form={securityForm}
                  layout="vertical"
                  initialValues={{
                    enforce2FA: true,
                    sessionTimeout: 30,
                    minPasswordLength: 12,
                    samlEntityId: 'https://uims.internal/saml/metadata',
                  }}
                  style={{ maxWidth: 600, padding: '12px 0' }}
                >
                  <Form.Item
                    label="Enforce Two-Factor Authentication (2FA) for All Users"
                    name="enforce2FA"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Session Inactivity Timeout" name="sessionTimeout">
                        <Select>
                          <Option value={15}>15 Minutes</Option>
                          <Option value={30}>30 Minutes</Option>
                          <Option value={60}>1 Hour</Option>
                          <Option value={240}>4 Hours</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Minimum Password Length" name="minPasswordLength">
                        <InputNumber min={8} max={32} style={{ width: '100%' }} suffix="chars" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="SAML 2.0 Identity Provider Entity ID" name="samlEntityId">
                    <Input prefix={<LockOutlined />} />
                  </Form.Item>
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveSecurity}>
                    Enforce Security Policies
                  </Button>
                </Form>
              ),
            },
            {
              key: 'maintenance',
              label: (
                <Space>
                  <DatabaseOutlined />
                  <span>Backups & Health Diagnostics</span>
                </Space>
              ),
              children: (
                <div style={{ maxWidth: 700, padding: '12px 0' }}>
                  <Card
                    size="small"
                    title="On-Demand Database Snapshot"
                    style={{ marginBottom: 20 }}
                  >
                    <Paragraph type="secondary">
                      Create an instantaneous full snapshot of hardware assets, license assignments,
                      and audit logs. The archive will be AES-256 encrypted and replicated across
                      cloud regions.
                    </Paragraph>
                    <Button
                      type="primary"
                      icon={<CloudUploadOutlined />}
                      loading={backupRunning}
                      onClick={handleRunBackup}
                    >
                      Run Instant Backup Snapshot
                    </Button>
                  </Card>

                  <Card size="small" title="Subsystem Health Telemetry">
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="PostgreSQL Primary Database">
                        <Tag color="success">Connected (Latency 1.2ms, Pool: 12/50)</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Redis Cache Gateway">
                        <Tag color="success">Healthy (Hit rate: 96.4%)</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Exchange SMTP Mail Gateway">
                        <Tag color="success">Ready (TLS 1.3 Active)</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Encrypted Backup Storage Vault">
                        <Tag color="success">Online (Available Space: 4.8 TB)</Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </PageContainer>
  );
}
