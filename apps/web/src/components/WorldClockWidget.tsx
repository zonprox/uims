import { GlobalOutlined } from '@ant-design/icons';
import { formatInTimezone, getTimezoneAbbr, getTimezoneOffset } from '@uims/shared-utils';
import { Card, Col, Flex, Row, Space, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTimezoneStore } from '../stores/timezone.store';

const { Text } = Typography;

interface ClockHub {
  title: string;
  city: string;
  timezone: string;
  region: string;
  isSystem?: boolean;
  isUser?: boolean;
}

export interface WorldClockWidgetProps {
  systemTimezone?: string;
}

export const WorldClockWidget: React.FC<WorldClockWidgetProps> = React.memo(
  ({ systemTimezone = 'UTC' }) => {
    const [now, setNow] = useState(new Date());
    const userTimezone = useTimezoneStore((state) => state.getEffectiveTimezone());
    const timeFormat = useTimezoneStore((state) => state.timeFormat);
    const dateFormat = useTimezoneStore((state) => state.dateFormat);

    useEffect(() => {
      const timer = setInterval(() => {
        setNow(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    const timePattern = timeFormat === '12h' ? 'hh:mm:ss A' : 'HH:mm:ss';

    const hubs: ClockHub[] = [
      {
        title: 'Universal Reference',
        city: 'Greenwich / UTC',
        timezone: 'UTC',
        region: 'Standard',
      },
      {
        title: 'System Default',
        city: systemTimezone.split('/')[1]?.replace('_', ' ') || systemTimezone,
        timezone: systemTimezone,
        region: 'Enterprise',
        isSystem: true,
      },
      {
        title: 'User Active Zone',
        city: userTimezone.split('/')[1]?.replace('_', ' ') || userTimezone,
        timezone: userTimezone,
        region: 'Local',
        isUser: true,
      },
      {
        title: 'APAC Hub (Vietnam)',
        city: 'Ho Chi Minh City',
        timezone: 'Asia/Ho_Chi_Minh',
        region: 'APAC',
      },
      {
        title: 'East Asia Hub',
        city: 'Tokyo',
        timezone: 'Asia/Tokyo',
        region: 'East Asia',
      },
      {
        title: 'EMEA Hub',
        city: 'London',
        timezone: 'Europe/London',
        region: 'Europe',
      },
      {
        title: 'Americas Hub',
        city: 'New York',
        timezone: 'America/New_York',
        region: 'US East',
      },
      {
        title: 'West Coast Hub',
        city: 'San Francisco',
        timezone: 'America/Los_Angeles',
        region: 'US West',
      },
    ];

    // Filter unique timezones if system/user duplicate preset hubs
    const uniqueHubs = hubs.filter(
      (hub, index, self) =>
        index === self.findIndex((h) => h.timezone === hub.timezone && h.isUser === hub.isUser),
    );

    return (
      <Card
        size="small"
        title={
          <Flex align="center" justify="space-between">
            <Space align="center" size={8}>
              <GlobalOutlined style={{ color: '#1677ff' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Multi-Region World Clock Telemetry
              </span>
            </Space>
            <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>
              Real-Time IANA Sync
            </Tag>
          </Flex>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={[12, 12]}>
          {uniqueHubs.map((hub) => {
            const timeStr = formatInTimezone(now, hub.timezone, timePattern);
            const dateStr = formatInTimezone(now, hub.timezone, dateFormat);
            const offset = getTimezoneOffset(hub.timezone, now);
            const abbr = getTimezoneAbbr(hub.timezone, now);

            return (
              <Col xs={24} sm={12} md={6} key={`${hub.timezone}-${hub.title}`}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    backgroundColor: hub.isUser
                      ? 'rgba(22, 119, 255, 0.08)'
                      : hub.isSystem
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(140, 140, 140, 0.05)',
                    border: hub.isUser
                      ? '1px solid rgba(22, 119, 255, 0.3)'
                      : hub.isSystem
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : '1px solid rgba(140, 140, 140, 0.12)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 12,
                        color: hub.isUser ? '#1677ff' : hub.isSystem ? '#10b981' : undefined,
                      }}
                    >
                      {hub.title}
                    </Text>
                    <Tag
                      color={hub.isUser ? 'blue' : hub.isSystem ? 'success' : 'default'}
                      style={{ margin: 0, fontSize: 10, lineHeight: '16px', height: 16 }}
                    >
                      UTC{offset}
                    </Tag>
                  </Flex>

                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      display: 'block',
                      lineHeight: 1.2,
                    }}
                  >
                    {timeStr}
                  </Text>

                  <Flex justify="space-between" align="center" style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dateStr}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 10.5, fontWeight: 600 }}>
                      {abbr}
                    </Text>
                  </Flex>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  },
);

WorldClockWidget.displayName = 'WorldClockWidget';
