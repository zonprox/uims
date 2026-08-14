import { HomeOutlined } from '@ant-design/icons';
import { Breadcrumb, Card, Col, Flex, Row, Statistic, Typography } from 'antd';
import type React from 'react';
import { Link } from 'react-router';

const { Title, Paragraph } = Typography;

export interface PageStatItem {
  title: string;
  value: string | number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  color?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
}

interface PageContainerProps {
  title: string;
  subtitle?: string;
  tag?: React.ReactNode;
  breadcrumbs?: { title: string; path?: string }[];
  extra?: React.ReactNode;
  stats?: PageStatItem[];
  children: React.ReactNode;
  noCardWrapper?: boolean;
}

export default function PageContainer({
  title,
  subtitle,
  tag,
  breadcrumbs,
  extra,
  stats,
  children,
  noCardWrapper = false,
}: PageContainerProps) {
  const breadcrumbItems = breadcrumbs
    ? [
        {
          key: 'home',
          title: (
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <HomeOutlined />
              <span>Home</span>
            </Link>
          ),
        },
        ...breadcrumbs.map((bc, idx) => ({
          key: String(idx),
          title: bc.path ? <Link to={bc.path}>{bc.title}</Link> : <span>{bc.title}</span>,
        })),
      ]
    : undefined;

  return (
    <Flex vertical gap={20} style={{ width: '100%' }}>
      {/* Page Header */}
      <div>
        {breadcrumbItems && (
          <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 10, fontSize: 13 }} />
        )}
        <Flex justify="space-between" align="center" wrap gap={12}>
          <div>
            <Flex align="center" gap={10}>
              <Title level={3} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {title}
              </Title>
              {tag}
            </Flex>
            {subtitle && (
              <Paragraph type="secondary" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
                {subtitle}
              </Paragraph>
            )}
          </div>
          {extra && (
            <Flex align="center" gap={8} wrap>
              {extra}
            </Flex>
          )}
        </Flex>
      </div>

      {/* KPI Stats Bar if provided */}
      {stats && stats.length > 0 && (
        <Row gutter={[16, 16]}>
          {stats.map((stat, idx) => (
            <Col xs={24} sm={12} md={24 / Math.min(stats.length, 4)} key={idx}>
              <Card
                size="small"
                className="uims-stat-card"
                styles={{
                  body: { padding: '16px 20px' },
                }}
              >
                <Statistic
                  title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>{stat.title}</span>}
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  styles={{
                    content: {
                      color: stat.color || 'inherit',
                      fontSize: 24,
                      fontWeight: 700,
                    },
                  }}
                />
                {stat.trend && (
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    <span
                      style={{ color: stat.trend.isUp ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}
                    >
                      {stat.trend.isUp ? '↑' : '↓'} {stat.trend.value}
                    </span>{' '}
                    <span style={{ color: '#8c8c8c' }}>vs last month</span>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Main Content Area */}
      {noCardWrapper ? children : <div>{children}</div>}
    </Flex>
  );
}
