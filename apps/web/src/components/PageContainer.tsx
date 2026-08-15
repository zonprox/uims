import { ArrowDownOutlined, ArrowUpOutlined, HomeOutlined } from '@ant-design/icons';
import { Breadcrumb, Card, Col, Flex, Grid, Row, Statistic, Typography } from 'antd';
import type React from 'react';
import { Link } from 'react-router';

const { Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

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
  breadcrumbs?: Array<{ title: string; path?: string }>;
  extra?: React.ReactNode;
  stats?: Array<PageStatItem>;
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
  const screens = useBreakpoint();

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
    <Flex vertical gap={screens.xs ? 12 : 18} style={{ width: '100%' }}>
      {/* Page Header */}
      <div>
        {breadcrumbItems && (
          <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 6, fontSize: 12 }} />
        )}
        <Flex
          justify="space-between"
          align={screens.xs ? 'flex-start' : 'center'}
          vertical={screens.xs}
          wrap
          gap={10}
        >
          <div>
            <Flex align="center" gap={8} wrap>
              <Title
                level={4}
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: screens.xs ? 18 : 20,
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </Title>
              {tag}
            </Flex>
            {subtitle && (
              <Paragraph
                type="secondary"
                style={{ margin: '3px 0 0 0', fontSize: screens.xs ? 12 : 13 }}
              >
                {subtitle}
              </Paragraph>
            )}
          </div>
          {extra && (
            <Flex
              align="center"
              gap={8}
              wrap
              style={{
                width: screens.xs ? '100%' : 'auto',
                justifyContent: screens.xs ? 'flex-start' : 'flex-end',
              }}
            >
              {extra}
            </Flex>
          )}
        </Flex>
      </div>

      {/* KPI Stats Bar with Responsive Grid */}
      {stats && stats.length > 0 && (
        <Row gutter={[12, 12]}>
          {stats.map((stat) => (
            <Col xs={12} sm={12} lg={24 / Math.min(stats.length, 4)} key={stat.title}>
              <Card
                size="small"
                className="uims-stat-card"
                styles={{
                  body: { padding: screens.xs ? '10px 12px' : '14px 18px' },
                }}
              >
                <Statistic
                  title={
                    <span
                      style={{
                        fontSize: screens.xs ? 11 : 12,
                        fontWeight: 500,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {stat.title}
                    </span>
                  }
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  styles={{
                    content: {
                      color: stat.color || 'inherit',
                      fontSize: screens.xs ? 18 : 22,
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                    },
                  }}
                />
                {stat.trend && !screens.xs && (
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 11.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        color: stat.trend.isUp ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      {stat.trend.isUp ? (
                        <ArrowUpOutlined style={{ fontSize: 11 }} />
                      ) : (
                        <ArrowDownOutlined style={{ fontSize: 11 }} />
                      )}
                      {stat.trend.value}
                    </span>{' '}
                    <span style={{ color: '#94a3b8' }}>vs last month</span>
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
