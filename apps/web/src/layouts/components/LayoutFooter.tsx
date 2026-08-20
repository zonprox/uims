import { SYSTEM_INFO } from '@uims/shared-utils';
import { Divider, Flex, Layout, Space, Tag, Typography } from 'antd';
import React from 'react';

const { Footer } = Layout;
const { Text } = Typography;

export interface LayoutFooterProps {
  mode: string;
}

export const LayoutFooter: React.FC<LayoutFooterProps> = React.memo(({ mode }) => (
  <Footer
    style={{
      padding: '12px 24px',
      color: mode === 'dark' ? '#64748b' : '#94a3b8',
      fontSize: 12,
      borderTop: mode === 'dark' ? '1px solid #1e293b' : '1px solid #f1f5f9',
      backgroundColor: mode === 'dark' ? '#090d16' : '#ffffff',
    }}
  >
    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {SYSTEM_INFO.copyright}
      </Text>
      <Space
        separator={
          <Divider
            orientation="vertical"
            style={{ margin: '0 4px', borderColor: mode === 'dark' ? '#334155' : '#e2e8f0' }}
          />
        }
      >
        <a href={SYSTEM_INFO.links.helpCenter} style={{ color: 'inherit', textDecoration: 'none' }}>
          Help Center
        </a>
        <a
          href={SYSTEM_INFO.links.apiDocs}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          API Docs
        </a>
        <a href={SYSTEM_INFO.links.status} style={{ color: 'inherit', textDecoration: 'none' }}>
          System Status
        </a>
        <Tag
          variant="filled"
          style={{
            fontSize: 10.5,
            padding: '0 6px',
            height: 18,
            lineHeight: '18px',
            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
            color: mode === 'dark' ? '#94a3b8' : '#64748b',
          }}
        >
          v{SYSTEM_INFO.version}
        </Tag>
      </Space>
    </Flex>
  </Footer>
));

LayoutFooter.displayName = 'LayoutFooter';
