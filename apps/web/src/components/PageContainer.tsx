import { Typography, Breadcrumb, Space } from 'antd';
import React from 'react';
import { Link } from 'react-router';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { title: string; path?: string }[];
  extra?: React.ReactNode;
  children: React.ReactNode;
}

const { Title, Text } = Typography;

export default function PageContainer({ title, subtitle, breadcrumbs, extra, children }: PageContainerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {breadcrumbs && (
            <Breadcrumb style={{ marginBottom: '8px' }}>
              {breadcrumbs.map((bc, idx) => (
                <Breadcrumb.Item key={idx}>
                  {bc.path ? <Link to={bc.path}>{bc.title}</Link> : bc.title}
                </Breadcrumb.Item>
              ))}
            </Breadcrumb>
          )}
          <Title level={2} style={{ margin: 0, marginBottom: subtitle ? '4px' : '0' }}>{title}</Title>
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
        {extra && <div>{extra}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
