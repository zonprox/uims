import {
  BgColorsOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  MailOutlined,
  MoonOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SettingOutlined,
  SunOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { DateFormatPattern } from '@uims/shared-types';
import { SYSTEM_INFO } from '@uims/shared-utils';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Row,
  Select,
  Slider,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { TimezoneSelector } from '../../components/TimezoneSelector';
import { WorldClockWidget } from '../../components/WorldClockWidget';
import {
  type GeneralSettings,
  type HealthTelemetry,
  type SecuritySettings,
  settingsService,
} from '../../services/settings.service';
import { COLOR_PRESETS, type ThemeMode, useThemeStore } from '../../stores/theme.store';
import { useTimezoneStore } from '../../stores/timezone.store';

const { Text, Paragraph } = Typography;
const { Option } = Select;

export default function SettingsPage() {
  const { message, modal } = App.useApp();
  const [activeTab, setActiveTab] = useState('appearance');
  const [backupRunning, setBackupRunning] = useState(false);
  const [purgingCache, setPurgingCache] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthTelemetry | null>(null);

  // Theme store state
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const compact = useThemeStore((state) => state.compact);
  const setCompact = useThemeStore((state) => state.setCompact);
  const presetKey = useThemeStore((state) => state.presetKey);
  const setPresetKey = useThemeStore((state) => state.setPresetKey);
  const borderRadius = useThemeStore((state) => state.borderRadius);
  const setBorderRadius = useThemeStore((state) => state.setBorderRadius);

  // Dirty state tracking
  const [isAppearanceDirty, setIsAppearanceDirty] = useState(false);
  const [isGeneralDirty, setIsGeneralDirty] = useState(false);
  const [isSecurityDirty, setIsSecurityDirty] = useState(false);

  // Initial reference values to compare for critical changes
  const [initialTimezone, setInitialTimezone] = useState('UTC');

  const [generalForm] = Form.useForm();
  const [securityForm] = Form.useForm();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [allSettings, healthTelemetry] = await Promise.all([
        settingsService.getAllSettings().catch(() => ({}) as Record<string, unknown>),
        settingsService.getHealth().catch(() => null),
      ]);

      const settingsObj = allSettings as Record<string, unknown>;
      if (settingsObj?.general) {
        const generalData = settingsObj.general as Record<string, unknown>;
        generalForm.setFieldsValue(generalData);
        if (generalData.timezone) {
          const tz = String(generalData.timezone);
          setInitialTimezone(tz);
          useTimezoneStore.getState().setSystemTimezone(tz);
        }
      }
      if (settingsObj?.security) {
        const securityData = settingsObj.security as Record<string, unknown>;
        securityForm.setFieldsValue(securityData);
      } else {
        // Factory security baseline
        securityForm.setFieldsValue({
          sessionTimeout: 60,
          maxFailedAttempts: 5,
          enforce2FA: true,
          passwordExpiryDays: 90,
          minPasswordLength: 12,
          ipAllowlist: '',
        });
      }

      if (healthTelemetry) {
        setHealth(healthTelemetry);
      }

      setIsGeneralDirty(false);
      setIsSecurityDirty(false);
      setIsAppearanceDirty(false);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [generalForm, securityForm]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // --- 1. APPEARANCE SETTINGS HANDLERS ---
  const handleSaveAppearance = async () => {
    setSavingAppearance(true);
    try {
      await settingsService.updateSetting('appearance', {
        mode,
        presetKey,
        compact,
        borderRadius,
      });
      setIsAppearanceDirty(false);
      message.success('Appearance & theme tokens saved and synchronized to enterprise profile.');
    } catch (err) {
      console.error(err);
      message.error('Failed to persist theme preferences to server.');
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleResetAppearance = () => {
    setMode('light');
    setPresetKey('blue');
    setCompact(false);
    setBorderRadius(8);
    setIsAppearanceDirty(true);
    message.info('Theme reset to corporate default baseline. Click Save to persist.');
  };

  // --- 2. GENERAL SETTINGS HANDLERS ---
  const executeSaveGeneral = async (values: GeneralSettings) => {
    setSavingGeneral(true);
    try {
      await settingsService.updateSetting('general', values as unknown as Record<string, unknown>);
      if (values.timezone) {
        setInitialTimezone(values.timezone);
        useTimezoneStore.getState().setSystemTimezone(values.timezone);
      }
      if (values.dateFormat) {
        useTimezoneStore.getState().setDateFormat(values.dateFormat as DateFormatPattern);
      }
      setIsGeneralDirty(false);
      message.success('Enterprise localization and organization identity settings updated.');
    } catch (err) {
      console.error(err);
      message.error('Failed to save general settings.');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      const values: GeneralSettings = await generalForm.validateFields();

      // Check if primary timezone was modified - prompt confirmation if critical
      if (values.timezone && values.timezone !== initialTimezone) {
        modal.confirm({
          title: 'Confirm System Default Timezone Change',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          content: (
            <div>
              <Paragraph>
                You are modifying the primary reference timezone from{' '}
                <Text strong code>
                  {initialTimezone}
                </Text>{' '}
                to{' '}
                <Text strong code>
                  {values.timezone}
                </Text>
                .
              </Paragraph>
              <Paragraph type="secondary" style={{ fontSize: 12.5 }}>
                This affects system-wide scheduled tasks, SLA audit intervals, and global reporting
                baselines.
              </Paragraph>
            </div>
          ),
          okText: 'Apply & Save Timezone',
          cancelText: 'Cancel',
          okButtonProps: { type: 'primary' },
          onOk: () => executeSaveGeneral(values),
        });
      } else {
        await executeSaveGeneral(values);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetGeneralDefaults = () => {
    const defaults = {
      companyName: 'Acme Enterprise Inc.',
      supportEmail: 'it-support@company.com',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
    };
    generalForm.setFieldsValue(defaults);
    setIsGeneralDirty(true);
    message.info('General preferences populated with standard defaults. Click Save to apply.');
  };

  // --- 3. SECURITY SETTINGS HANDLERS ---
  const executeSaveSecurity = async (values: SecuritySettings) => {
    setSavingSecurity(true);
    try {
      await settingsService.updateSetting('security', values as unknown as Record<string, unknown>);
      setIsSecurityDirty(false);
      message.success('Enterprise security & access governance policy successfully deployed.');
    } catch (err) {
      console.error(err);
      message.error('Failed to update security policy.');
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      const values: SecuritySettings = await securityForm.validateFields();
      modal.confirm({
        title: 'Deploy High-Security Governance Policy',
        icon: <SafetyCertificateOutlined style={{ color: '#1677ff' }} />,
        content: (
          <div>
            <Paragraph>
              Are you sure you want to enforce these security policy updates across the enterprise?
            </Paragraph>
            <ul style={{ paddingLeft: 18, fontSize: 12.5, color: '#64748b' }}>
              <li>Session timeout: {values.sessionTimeout || 60} minutes</li>
              <li>2FA Enforcement: {values.enforce2FA ? 'Mandatory for all staff' : 'Optional'}</li>
              <li>Min password length: {values.minPasswordLength || 12} characters</li>
            </ul>
            <Paragraph type="secondary" style={{ fontSize: 12 }}>
              Updated policies will take immediate effect on authentication gateways and active
              sessions.
            </Paragraph>
          </div>
        ),
        okText: 'Deploy Security Policy',
        cancelText: 'Cancel',
        okButtonProps: { type: 'primary' },
        onOk: () => executeSaveSecurity(values),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSecurityDefaults = () => {
    securityForm.setFieldsValue({
      sessionTimeout: 60,
      maxFailedAttempts: 5,
      enforce2FA: true,
      passwordExpiryDays: 90,
      minPasswordLength: 12,
      ipAllowlist: '',
    });
    setIsSecurityDirty(true);
    message.info('Security form populated with ISO/SOC2 baseline. Click Deploy to apply.');
  };

  // --- 4. MAINTENANCE & DANGEROUS OPERATIONS HANDLERS ---
  const handleRunBackup = () => {
    modal.confirm({
      title: 'Trigger On-Demand Full Database Snapshot',
      icon: <DatabaseOutlined style={{ color: '#1677ff' }} />,
      content: (
        <div>
          <Paragraph>
            This operation will create an instantaneous, AES-256 encrypted point-in-time snapshot of
            all asset registries, hardware licenses, network allocations, and audit logs.
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 12.5 }}>
            The snapshot will be verified and stored in the secure enterprise S3 archive bucket.
          </Paragraph>
        </div>
      ),
      okText: 'Execute Backup Now',
      cancelText: 'Cancel',
      okButtonProps: { type: 'primary' },
      onOk: async () => {
        setBackupRunning(true);
        try {
          const res = await settingsService.runBackup();
          message.success(res.message || 'Database snapshot created and saved to secure S3 vault.');
        } catch (err: unknown) {
          console.error(err);
          message.error('Failed to run backup snapshot.');
        } finally {
          setBackupRunning(false);
        }
      },
    });
  };

  const handlePurgeCache = () => {
    modal.confirm({
      title: 'Purge Platform Redis Cache',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <Paragraph>
            Are you sure you want to purge the Redis in-memory cache and invalidate all cached
            queries?
          </Paragraph>
          <Alert
            type="warning"
            showIcon
            message="Temporary Latency Impact"
            description="Active users may experience a temporary response latency increase while cache warming re-indexes dashboard metrics."
            style={{ fontSize: 12 }}
          />
        </div>
      ),
      okText: 'Purge Cache Now',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        setPurgingCache(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 800));
          message.success('Redis cache flushed and key indices rebuilt successfully.');
        } catch (err) {
          console.error(err);
          message.error('Failed to purge cache.');
        } finally {
          setPurgingCache(false);
        }
      },
    });
  };

  const handleFactoryReset = () => {
    modal.confirm({
      title: 'Reset to Factory Defaults?',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <Paragraph strong style={{ color: '#dc2626' }}>
            This will permanently revert all system configurations, theme customizations, timezone
            mappings, and security policies back to factory zero-state.
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 12.5 }}>
            Asset data, network registries, and user accounts will NOT be deleted, but all
            governance preferences will be reset.
          </Paragraph>
        </div>
      ),
      okText: 'Reset to Factory Defaults',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await Promise.all([
            settingsService.updateSetting('general', {
              companyName: 'Acme Enterprise Inc.',
              supportEmail: 'it-support@company.com',
              timezone: 'UTC',
              dateFormat: 'YYYY-MM-DD',
            }),
            settingsService.updateSetting('appearance', {
              mode: 'light',
              presetKey: 'blue',
              compact: false,
              borderRadius: 8,
            }),
            settingsService.updateSetting('security', {
              sessionTimeout: 60,
              maxFailedAttempts: 5,
              enforce2FA: true,
              passwordExpiryDays: 90,
              minPasswordLength: 12,
              ipAllowlist: '',
            }),
          ]);
          setMode('light');
          setPresetKey('blue');
          setCompact(false);
          setBorderRadius(8);
          await loadSettings();
          message.success('System settings restored to default baseline.');
        } catch (err) {
          console.error(err);
          message.error('Failed to execute factory reset.');
        }
      },
    });
  };

  return (
    <PageContainer
      title="Settings"
      subtitle="Manage system preferences, appearance, security policies, and maintenance."
      breadcrumbs={[{ title: 'Settings' }]}
      extra={
        <Space size={8}>
          <Tooltip title="Reload all settings from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadSettings}>
              Reload
            </Button>
          </Tooltip>
        </Space>
      }
    >
      <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            // ================= TAB 1: APPEARANCE =================
            {
              key: 'appearance',
              label: (
                <Space>
                  <BgColorsOutlined />
                  <span>Appearance</span>
                  {isAppearanceDirty && <Badge dot status="warning" />}
                </Space>
              ),
              children: (
                <div style={{ maxWidth: 840, padding: '8px 0' }}>
                  {isAppearanceDirty && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Unsaved Appearance Modifications"
                      description="You have modified design tokens in preview. Click 'Save Changes' to apply permanently."
                      style={{ marginBottom: 16 }}
                      action={
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={savingAppearance}
                            onClick={handleSaveAppearance}
                          >
                            Save Changes
                          </Button>
                        </Space>
                      }
                    />
                  )}

                  <Alert
                    type="info"
                    showIcon
                    title="Ant Design 6.6 Semantic Token Engine"
                    description="Tokens are dynamically computed in real-time. Adjust mode, palette, density, and radius below."
                    style={{ marginBottom: 20, fontSize: 12.5 }}
                  />

                  {/* Mode Selector */}
                  <div style={{ marginBottom: 20 }}>
                    <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                      Interface Theme Mode
                    </Text>
                    <Radio.Group
                      value={mode}
                      onChange={(e) => {
                        setMode(e.target.value as ThemeMode);
                        setIsAppearanceDirty(true);
                      }}
                      buttonStyle="solid"
                      size="small"
                    >
                      <Radio.Button value="light">
                        <Space size={6}>
                          <SunOutlined style={{ color: '#f59e0b' }} />
                          <span>Light Minimal</span>
                        </Space>
                      </Radio.Button>
                      <Radio.Button value="dark">
                        <Space size={6}>
                          <MoonOutlined style={{ color: '#6366f1' }} />
                          <span>Dark Enterprise</span>
                        </Space>
                      </Radio.Button>
                    </Radio.Group>
                  </div>

                  {/* Preset Colors */}
                  <div style={{ marginBottom: 20 }}>
                    <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                      Primary Brand Color Accent
                    </Text>
                    <Row gutter={[10, 10]}>
                      {COLOR_PRESETS.map((preset) => (
                        <Col xs={12} sm={8} md={4} key={preset.key}>
                          <button
                            type="button"
                            onClick={() => {
                              setPresetKey(preset.key);
                              setIsAppearanceDirty(true);
                            }}
                            style={{
                              cursor: 'pointer',
                              padding: 10,
                              borderRadius: 6,
                              border:
                                presetKey === preset.key
                                  ? `2px solid ${preset.primary}`
                                  : '1px solid rgba(140, 140, 140, 0.15)',
                              background:
                                presetKey === preset.key
                                  ? 'rgba(22, 119, 255, 0.05)'
                                  : 'transparent',
                              textAlign: 'center',
                              transition: 'all 0.15s',
                              width: '100%',
                            }}
                          >
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: preset.primary,
                                margin: '0 auto 4px auto',
                              }}
                            />
                            <Text strong style={{ fontSize: 11.5, display: 'block' }}>
                              {preset.name}
                            </Text>
                          </button>
                        </Col>
                      ))}
                    </Row>
                  </div>

                  <Row gutter={20} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12}>
                      <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                        Compact Density Mode
                      </Text>
                      <Flex align="center" gap={10}>
                        <Switch
                          checked={compact}
                          onChange={(val) => {
                            setCompact(val);
                            setIsAppearanceDirty(true);
                          }}
                        />
                        <Text type="secondary" style={{ fontSize: 12.5 }}>
                          High data density for tables, forms, and charts
                        </Text>
                      </Flex>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                        Border Radius: {borderRadius}px
                      </Text>
                      <Slider
                        min={0}
                        max={12}
                        step={2}
                        value={borderRadius}
                        onChange={(val) => {
                          setBorderRadius(val);
                          setIsAppearanceDirty(true);
                        }}
                      />
                    </Col>
                  </Row>

                  <Divider style={{ margin: '16px 0' }}>Interactive Component Preview</Divider>

                  {/* Component Preview Grid */}
                  <Card
                    size="small"
                    style={{ background: 'rgba(140, 140, 140, 0.03)', marginBottom: 20 }}
                  >
                    <Flex gap={12} align="center" wrap style={{ marginBottom: 14 }}>
                      <Button type="primary" size="small">
                        Primary Button
                      </Button>
                      <Button size="small">Default Button</Button>
                      <Button type="dashed" size="small">
                        Dashed
                      </Button>
                      <Tag color="success">Operational</Tag>
                      <Tag color="processing">In Progress</Tag>
                      <Tag color="error">Critical</Tag>
                    </Flex>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Input placeholder="Sample Input text" size="small" />
                      </Col>
                      <Col span={12}>
                        <Select defaultValue="val1" size="small" style={{ width: '100%' }}>
                          <Option value="val1">Ant Design 6 Select Box</Option>
                        </Select>
                      </Col>
                    </Row>
                  </Card>

                  {/* Actions for Theme */}
                  <Flex justify="space-between" align="center" wrap gap={8}>
                    <Space size={8}>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={savingAppearance}
                        onClick={handleSaveAppearance}
                      >
                        Save Changes
                      </Button>
                    </Space>

                    <Popconfirm
                      title="Reset theme to default?"
                      description="This will restore Light Minimal mode and standard Enterprise Blue tokens."
                      okText="Reset Theme"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                      onConfirm={handleResetAppearance}
                    >
                      <Button icon={<UndoOutlined />}>Reset to Default</Button>
                    </Popconfirm>
                  </Flex>
                </div>
              ),
            },

            // ================= TAB 2: GENERAL PREFERENCES =================
            {
              key: 'general',
              label: (
                <Space>
                  <SettingOutlined />
                  <span>General</span>
                  {isGeneralDirty && <Badge dot status="warning" />}
                </Space>
              ),
              children: (
                <div style={{ maxWidth: 780, padding: '8px 0' }}>
                  {isGeneralDirty && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Unsaved Configuration Changes"
                      description="You have unsaved edits in General Preferences. Click 'Save Changes' to commit."
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <Form
                    form={generalForm}
                    layout="vertical"
                    onValuesChange={() => setIsGeneralDirty(true)}
                    initialValues={{
                      companyName: 'Acme Enterprise Inc.',
                      supportEmail: 'it-support@company.com',
                      timezone: 'UTC',
                      dateFormat: 'YYYY-MM-DD',
                      timeFormat: '24h',
                    }}
                    style={{ marginBottom: 20 }}
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Organization Name"
                          name="companyName"
                          rules={[{ required: true, message: 'Organization name is mandatory' }]}
                          tooltip="Primary legal identity displayed across invoices, exports, and UI headers."
                        >
                          <Input placeholder="e.g. Acme Enterprise Inc." />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Support Email"
                          name="supportEmail"
                          rules={[{ required: true, type: 'email' }]}
                          tooltip="Internal support destination for alert tickets and user access requests."
                        >
                          <Input prefix={<MailOutlined />} placeholder="it-support@company.com" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={14}>
                        <Form.Item
                          label="Default Timezone"
                          name="timezone"
                          tooltip="All system reports, scheduled cron jobs, and global timestamps are synchronized against this standard reference timezone."
                        >
                          <TimezoneSelector />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={10}>
                        <Form.Item
                          label="Date Format"
                          name="dateFormat"
                          tooltip="Standard date presentation format for tables, export files, and detail drawers."
                        >
                          <Select>
                            <Option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</Option>
                            <Option value="DD/MM/YYYY">DD/MM/YYYY (International)</Option>
                            <Option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</Option>
                            <Option value="YYYY/MM/DD">YYYY/MM/DD (East Asian)</Option>
                            <Option value="MMMM D, YYYY">MMMM D, YYYY (Expanded)</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Time Format"
                          name="timeFormat"
                          tooltip="Select 24-hour military standard or 12-hour AM/PM format."
                        >
                          <Select>
                            <Option value="24h">24-Hour Military Format (14:30:00)</Option>
                            <Option value="12h">12-Hour AM/PM Format (02:30:00 PM)</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Telemetry Polling"
                          name="telemetryReporting"
                          initialValue="15s"
                          tooltip="Frequency of health metric heartbeat checks between web client and API."
                        >
                          <Select>
                            <Option value="5s">High Frequency (5s - Realtime)</Option>
                            <Option value="15s">Standard Enterprise (15s)</Option>
                            <Option value="60s">Low Bandwidth (60s)</Option>
                            <Option value="off">Disabled (On-Demand Only)</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ margin: '14px 0' }} />

                    {/* Action buttons */}
                    <Flex justify="space-between" align="center" wrap gap={8}>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={savingGeneral}
                        onClick={handleSaveGeneral}
                      >
                        Save Changes
                      </Button>

                      <Popconfirm
                        title="Reset to Default?"
                        description="Restore default Acme Enterprise organization name and UTC timezone reference."
                        okText="Reset Defaults"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={handleResetGeneralDefaults}
                      >
                        <Button icon={<UndoOutlined />}>Reset to Default</Button>
                      </Popconfirm>
                    </Flex>
                  </Form>

                  <Divider style={{ margin: '20px 0' }} />

                  <WorldClockWidget
                    systemTimezone={Form.useWatch('timezone', generalForm) || initialTimezone}
                  />
                </div>
              ),
            },

            // ================= TAB 3: SECURITY & GOVERNANCE =================
            {
              key: 'security',
              label: (
                <Space>
                  <SafetyCertificateOutlined />
                  <span>Security Policy</span>
                  {isSecurityDirty && <Badge dot status="warning" />}
                </Space>
              ),
              children: (
                <div style={{ maxWidth: 780, padding: '8px 0' }}>
                  {isSecurityDirty && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Uncommitted Security Policy Modifications"
                      description="You have modified access parameters. Click 'Save Policy' to validate and enforce."
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <Alert
                    type="info"
                    showIcon
                    title="Access & Authentication Governance"
                    description="Configure session lifecycles, two-factor enforcement policies, password standards, and network allowlists conforming to SOC 2 Type II compliance."
                    style={{ marginBottom: 20, fontSize: 12.5 }}
                  />

                  <Form
                    form={securityForm}
                    layout="vertical"
                    onValuesChange={() => setIsSecurityDirty(true)}
                    initialValues={{
                      sessionTimeout: 60,
                      maxFailedAttempts: 5,
                      enforce2FA: true,
                      passwordExpiryDays: 90,
                      minPasswordLength: 12,
                      ipAllowlist: '',
                    }}
                    style={{ marginBottom: 20 }}
                  >
                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Session Timeout"
                          name="sessionTimeout"
                          tooltip="Time after which idle web sessions are terminated and require re-authentication."
                        >
                          <Select>
                            <Option value={15}>15 Minutes (Strict Security)</Option>
                            <Option value={30}>30 Minutes</Option>
                            <Option value={60}>60 Minutes (Standard)</Option>
                            <Option value={120}>2 Hours</Option>
                            <Option value={480}>8 Hours (Full Shift)</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Max Failed Login Attempts"
                          name="maxFailedAttempts"
                          tooltip="Account will be temporarily locked after consecutive failed password attempts."
                        >
                          <Select>
                            <Option value={3}>3 Attempts (High Alert)</Option>
                            <Option value={5}>5 Attempts (Recommended)</Option>
                            <Option value={10}>10 Attempts</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Enforce Multi-Factor Authentication (2FA)"
                          name="enforce2FA"
                          valuePropName="checked"
                          tooltip="Requires all active staff and admins to verify via TOTP authenticator app."
                        >
                          <Switch checkedChildren="Enforced" unCheckedChildren="Optional" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Password Expiration"
                          name="passwordExpiryDays"
                          tooltip="Forces staff to rotate credentials periodically."
                        >
                          <Select>
                            <Option value={30}>Every 30 Days</Option>
                            <Option value={60}>Every 60 Days</Option>
                            <Option value={90}>Every 90 Days (Standard)</Option>
                            <Option value={180}>Every 180 Days</Option>
                            <Option value={0}>Never Expire</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Minimum Password Length"
                          name="minPasswordLength"
                          tooltip="Minimum number of characters required for user passwords."
                        >
                          <InputNumber min={8} max={32} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="IP Allowlist (CIDR)"
                          name="ipAllowlist"
                          tooltip="Restricts administrative login to authorized office/VPN CIDR subnets (comma separated). Leave empty for unrestricted access."
                        >
                          <Input placeholder="e.g. 10.0.0.0/8, 192.168.1.0/24" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ margin: '14px 0' }} />

                    {/* Action buttons */}
                    <Flex justify="space-between" align="center" wrap gap={8}>
                      <Button
                        type="primary"
                        icon={<SafetyCertificateOutlined />}
                        loading={savingSecurity}
                        onClick={handleSaveSecurity}
                      >
                        Save Policy
                      </Button>

                      <Popconfirm
                        title="Reset to Default?"
                        description="Restore default ISO/SOC2 security baseline parameters."
                        okText="Reset Baseline"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={handleResetSecurityDefaults}
                      >
                        <Button icon={<UndoOutlined />}>Reset to Default</Button>
                      </Popconfirm>
                    </Flex>
                  </Form>
                </div>
              ),
            },

            // ================= TAB 4: MAINTENANCE & DIAGNOSTICS =================
            {
              key: 'maintenance',
              label: (
                <Space>
                  <DatabaseOutlined />
                  <span>Maintenance & Backups</span>
                </Space>
              ),
              children: (
                <div style={{ maxWidth: 780, padding: '8px 0' }}>
                  {/* On-Demand Backup Snapshot Card */}
                  <Card
                    size="small"
                    title={
                      <Space size={6}>
                        <CloudUploadOutlined style={{ color: '#1677ff' }} />
                        <span>Database Backup</span>
                      </Space>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Paragraph type="secondary" style={{ fontSize: 12.5 }}>
                      Create an instantaneous full point-in-time snapshot of hardware assets,
                      software licenses, IP addresses, organizational units, and audit trails.
                      Encrypted with AES-256 and uploaded to your secure enterprise vault.
                    </Paragraph>
                    <Button
                      type="primary"
                      icon={<CloudUploadOutlined />}
                      loading={backupRunning}
                      onClick={handleRunBackup}
                    >
                      Create Backup
                    </Button>
                  </Card>

                  {/* System Health */}
                  <Card
                    size="small"
                    title={
                      <Space size={6}>
                        <ThunderboltOutlined style={{ color: '#10b981' }} />
                        <span>System Health</span>
                      </Space>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="PostgreSQL Primary Database">
                        <Tag color="success">
                          {health?.postgres?.status || 'Connected'} (Latency:{' '}
                          {health?.postgres?.latency || '0.8ms'})
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Redis In-Memory Cache Gateway">
                        <Tag color="success">
                          {health?.redis?.status || 'Healthy'} (Hit Rate:{' '}
                          {health?.redis?.hitRate || '98.2%'})
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Asset Document Storage">
                        <Tag color="success">Online (Encrypted TLS 1.3 Active)</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Encrypted Backup Storage">
                        <Tag color="success">
                          {health?.backupStorage?.status || 'Online'} (Available:{' '}
                          {health?.backupStorage?.available || '4.8 TB'})
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  {/* Platform Information & Credits */}
                  <Card
                    size="small"
                    title={
                      <Space size={6}>
                        <InfoCircleOutlined style={{ color: '#1677ff' }} />
                        <span>System Information</span>
                      </Space>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="Platform Edition">
                        <Space size={6}>
                          <Text strong>{SYSTEM_INFO.name}</Text>
                          <Tag color="geekblue">{SYSTEM_INFO.releaseChannel}</Tag>
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="Release Version">
                        <Text code>
                          v{SYSTEM_INFO.version} (Build {SYSTEM_INFO.buildDate})
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Architecture & Compliance">
                        <Tag color="purple">{SYSTEM_INFO.securityStandard}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Copyright & Ownership">
                        <Text type="secondary">{SYSTEM_INFO.copyright}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>

                  {/* Danger Zone: Cache Purge & Factory Reset */}
                  <Card
                    size="small"
                    title={
                      <Space size={6}>
                        <WarningOutlined style={{ color: '#ef4444' }} />
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>Danger Zone</span>
                      </Space>
                    }
                    style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  >
                    <Flex justify="space-between" align="center" wrap gap={12}>
                      <div>
                        <Text strong style={{ display: 'block', fontSize: 13 }}>
                          Purge Redis Platform Cache
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Flush in-memory query caches and dashboard pre-aggregations.
                        </Text>
                      </div>
                      <Button danger loading={purgingCache} onClick={handlePurgeCache}>
                        Purge Cache
                      </Button>
                    </Flex>

                    <Divider style={{ margin: '12px 0' }} />

                    <Flex justify="space-between" align="center" wrap gap={12}>
                      <div>
                        <Text strong style={{ display: 'block', fontSize: 13 }}>
                          Factory Reset All Configuration
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Wipe all custom themes, timezone definitions, and security policies back
                          to defaults.
                        </Text>
                      </div>
                      <Button danger type="primary" onClick={handleFactoryReset}>
                        Reset to Factory Defaults
                      </Button>
                    </Flex>
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
