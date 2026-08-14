import { Breadcrumb, Typography } from 'antd';
import type React from 'react';
import { Link } from 'react-router';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { title: string; path?: string }[];
  extra?: React.ReactNode;
  children: React.ReactNode;
}

const { Title, Text } = Typography;

export default function PageContainer({
  title,
  subtitle,
  breadcrumbs,
  extra,
  children,
}: PageContainerProps) {
  const breadcrumbItems = breadcrumbs?.map((bc, idx) => ({
    key: String(idx),
    title: bc.path ? <Link to={bc.path}>{bc.title}</Link> : bc.title,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {breadcrumbItems && (
            <Breadcrumb items={breadcrumbItems} style={{ marginBottom: '8px' }} />
          )}
          <Title level={2} style={{ margin: 0, marginBottom: subtitle ? '4px' : '0' }}>
            {title}
          </Title>
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
        {extra && <div>{extra}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
