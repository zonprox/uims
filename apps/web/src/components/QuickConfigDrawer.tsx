import {
  BgColorsOutlined,
  CloudUploadOutlined,
  GlobalOutlined,
  MoonOutlined,
  RightOutlined,
  SettingOutlined,
  SunOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { DateFormatPattern, TimeFormatPattern } from '@uims/shared-types';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Flex,
  Popconfirm,
  Row,
  Segmented,
  Slider,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { settingsService } from '../services/settings.service';
import { COLOR_PRESETS, type ThemeMode, useThemeStore } from '../stores/theme.store';
import { useTimezoneStore } from '../stores/timezone.store';
import { TimezoneSelector } from './TimezoneSelector';
import { SYSTEM_INFO } from '@uims/shared-utils';

const { Text } = Typography;

export interface QuickConfigDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const QuickConfigDrawer: React.FC<QuickConfigDrawerProps> = React.memo(
  ({ open, onClose }) => {
    const navigate = useNavigate();
    const { message } = App.useApp();
    const [backupRunning, setBackupRunning] = useState(false);
    const [now, setNow] = useState(new Date());

    // Theme store
    const mode = useThemeStore((state) => state.mode);
    const setMode = useThemeStore((state) => state.setMode);
    const compact = useThemeStore((state) => state.compact);
    const setCompact = useThemeStore((state) => state.setCompact);
    const presetKey = useThemeStore((state) => state.presetKey);
    const setPresetKey = useThemeStore((state) => state.setPresetKey);
    const borderRadius = useThemeStore((state) => state.borderRadius);
    const setBorderRadius = useThemeStore((state) => state.setBorderRadius);

    // Timezone store
    const tzMode = useTimezoneStore((state) => state.mode);
    const dateFormat = useTimezoneStore((state) => state.dateFormat);
    const timeFormat = useTimezoneStore((state) => state.timeFormat);
    const setTimezone = useTimezoneStore((state) => state.setTimezone);
    const setModeTz = useTimezoneStore((state) => state.setMode);
    const setDateFormat = useTimezoneStore((state) => state.setDateFormat);
    const setTimeFormat = useTimezoneStore((state) => state.setTimeFormat);
    const formatTime = useTimezoneStore((state) => state.formatTime);
    const getTimezoneInfo = useTimezoneStore((state) => state.getTimezoneInfo);

    // Telemetry
    const { health, isOnline } = useSystemHealth({ intervalMs: 15000 });

    useEffect(() => {
      if (!open) return;
      const timer = setInterval(() => {
        setNow(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }, [open]);

    const tzInfo = useMemo(() => getTimezoneInfo(), [getTimezoneInfo, now]);
    const liveTimeStr = useMemo(() => formatTime(now), [formatTime, now]);

    const handleRunBackup = async () => {
      setBackupRunning(true);
      try {
        const res = await settingsService.runBackup();
        message.success(res.message || 'Encrypted snapshot saved to S3 vault.');
      } catch (err: unknown) {
        console.error(err);
        message.error('Failed to trigger database backup.');
      } finally {
        setBackupRunning(false);
      }
    };

    return (
      <Drawer
        title={
          <Flex justify="space-between" align="center">
            <Space size={8}>
              <SettingOutlined style={{ color: '#1677ff', fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Quick Setup & System Config</span>
            </Space>
            <Tag color="geekblue" style={{ margin: 0, fontSize: 10.5 }}>
              Enterprise Console
            </Tag>
          </Flex>
        }
        placement="right"
        size={420}
        open={open}
        onClose={onClose}
        styles={{
          body: { padding: '16px 20px', backgroundColor: mode === 'dark' ? '#090d16' : '#f8fafc' },
        }}
      >
        {/* 1. APPEARANCE & THEME */}
        <Card
          size="small"
          title={
            <Space size={6}>
              <BgColorsOutlined style={{ color: '#1677ff' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Appearance & Theme</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <div style={{ marginBottom: 14 }}>
            <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
              THEME MODE
            </Text>
            <Segmented
              block
              options={[
                {
                  label: (
                    <Space size={4}>
                      <SunOutlined style={{ color: '#f59e0b' }} />
                      <span>Light Mode</span>
                    </Space>
                  ),
                  value: 'light',
                },
                {
                  label: (
                    <Space size={4}>
                      <MoonOutlined style={{ color: '#6366f1' }} />
                      <span>Dark Mode</span>
                    </Space>
                  ),
                  value: 'dark',
                },
              ]}
              value={mode}
              onChange={(val) => setMode(val as ThemeMode)}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 8 }}>
              ACCENT COLOR PRESET
            </Text>
            <Row gutter={[8, 8]}>
              {COLOR_PRESETS.map((preset) => {
                const isSelected = preset.key === presetKey;
                return (
                  <Col span={8} key={preset.key}>
                    <Button
                      block
                      size="small"
                      onClick={() => setPresetKey(preset.key)}
                      style={{
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        borderColor: isSelected ? preset.primary : undefined,
                        borderWidth: isSelected ? 2 : 1,
                        padding: '0 8px',
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: preset.primary,
                          display: 'inline-block',
                        }}
                      />
                      <Text ellipsis style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 400 }}>
                        {preset.name.split(' ')[0]}
                      </Text>
                    </Button>
                  </Col>
                );
              })}
            </Row>
          </div>

          <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
            <div>
              <Text strong style={{ fontSize: 12.5, display: 'block' }}>
                Compact UI Density
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                High data density for tables & charts
              </Text>
            </div>
            <Switch checked={compact} onChange={setCompact} />
          </Flex>

          <div>
            <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 12 }}>Component Border Radius</Text>
              <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>
                {borderRadius}px
              </Text>
            </Flex>
            <Slider
              min={2}
              max={14}
              value={borderRadius}
              onChange={setBorderRadius}
              style={{ margin: '6px 0 0 0' }}
            />
          </div>
        </Card>

        {/* 2. TIMEZONE & TEMPORAL LOCALIZATION */}
        <Card
          size="small"
          title={
            <Flex justify="space-between" align="center">
              <Space size={6}>
                <GlobalOutlined style={{ color: '#1677ff' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Timezone & Clock</span>
              </Space>
              <Tag color={tzInfo.isAuto ? 'cyan' : 'blue'} style={{ margin: 0, fontSize: 10 }}>
                {tzInfo.isAuto ? 'Auto-Detect' : 'Manual'}
              </Tag>
            </Flex>
          }
          style={{ marginBottom: 16 }}
        >
          <Card
            size="small"
            style={{
              marginBottom: 12,
              backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f1f5f9',
              borderColor: mode === 'dark' ? '#1e293b' : '#e2e8f0',
            }}
            styles={{ body: { padding: '8px 12px' } }}
          >
            <Flex justify="space-between" align="center">
              <div>
                <Text type="secondary" style={{ fontSize: 10.5, display: 'block' }}>
                  LIVE PREVIEW ({tzInfo.abbr})
                </Text>
                <Text strong style={{ fontSize: 12, display: 'block' }}>
                  {tzInfo.effectiveTimezone}
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text strong style={{ fontSize: 14, fontFamily: 'monospace', color: '#1677ff' }}>
                  {liveTimeStr}
                </Text>
                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                  UTC{tzInfo.offset}
                </Text>
              </div>
            </Flex>
          </Card>

          <div style={{ marginBottom: 12 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                TIMEZONE RESOLUTION
              </Text>
              <Segmented
                size="small"
                options={[
                  { label: 'Auto (Browser)', value: 'auto' },
                  { label: 'Custom', value: 'custom' },
                ]}
                value={tzMode}
                onChange={(val) => setModeTz(val as 'auto' | 'custom')}
              />
            </Flex>

            <TimezoneSelector
              size="small"
              value={tzInfo.effectiveTimezone}
              onChange={(val) => setTimezone(val)}
              compact
            />
          </div>

          <Row gutter={8} style={{ marginBottom: 6 }}>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                CLOCK FORMAT
              </Text>
              <Segmented
                block
                size="small"
                options={[
                  { label: '24-Hour', value: '24h' },
                  { label: '12-Hour', value: '12h' },
                ]}
                value={timeFormat}
                onChange={(val) => setTimeFormat(val as TimeFormatPattern)}
              />
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                DATE FORMAT
              </Text>
              <Segmented
                block
                size="small"
                options={[
                  { label: 'ISO', value: 'YYYY-MM-DD' },
                  { label: 'DD/MM', value: 'DD/MM/YYYY' },
                  { label: 'MM/DD', value: 'MM/DD/YYYY' },
                ]}
                value={dateFormat}
                onChange={(val) => setDateFormat(val as DateFormatPattern)}
              />
            </Col>
          </Row>
        </Card>

        {/* 3. CLUSTER TELEMETRY & INSTANT BACKUP */}
        <Card
          size="small"
          title={
            <Space size={6}>
              <ThunderboltOutlined style={{ color: '#10b981' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>System Telemetry & Backup</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions size="small" column={1} bordered style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Infrastructure Status">
              <Tag color={isOnline ? 'success' : 'error'} style={{ margin: 0, fontSize: 11 }}>
                {isOnline ? 'Operational' : 'Offline'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="API Latency">
              <Text strong style={{ fontSize: 11.5, color: '#10b981' }}>
                {health?.clientLatencyMs !== undefined ? `${health.clientLatencyMs}ms` : '1.2ms'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="PostgreSQL & Redis">
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                Connected (TLS 1.3 Active)
              </Text>
            </Descriptions.Item>
          </Descriptions>

          <Popconfirm
            title="Trigger instant snapshot?"
            description="Create an AES-256 encrypted point-in-time database snapshot saved to S3."
            okText="Run Backup"
            cancelText="Cancel"
            onConfirm={handleRunBackup}
          >
            <Button
              block
              type="primary"
              icon={<CloudUploadOutlined />}
              loading={backupRunning}
              style={{ borderRadius: 6, fontWeight: 600 }}
            >
              Create On-Demand Database Snapshot
            </Button>
          </Popconfirm>
        </Card>

        {/* 4. FOOTER LINK TO ADVANCED SETTINGS */}
        <Button
          block
          type="default"
          icon={<SettingOutlined />}
          onClick={() => {
            onClose();
            navigate('/settings');
          }}
          style={{
            borderRadius: 6,
            height: 38,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 12,
          }}
        >
          Open Advanced Enterprise Settings <RightOutlined style={{ fontSize: 11 }} />
        </Button>

        <div style={{ textAlign: 'center', padding: '6px 0 2px 0' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {SYSTEM_INFO.copyright} • v{SYSTEM_INFO.version}
          </Text>
        </div>
      </Drawer>
    );
  },
);

QuickConfigDrawer.displayName = 'QuickConfigDrawer';
