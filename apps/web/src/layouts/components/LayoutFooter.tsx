import { SYSTEM_INFO } from '@uims/shared-utils';
import { Divider, Flex, Layout, Space } from 'antd';
import React from 'react';

const { Footer } = Layout;

export interface LayoutFooterProps {
  mode: string;
}

export const LayoutFooter: React.FC<LayoutFooterProps> = React.memo(({ mode }) => (
  <Footer
    style={{
      textAlign: 'center',
      padding: '14px 24px',
      color: mode === 'dark' ? '#64748b' : '#94a3b8',
      fontSize: 12,
      borderTop: mode === 'dark' ? '1px solid #1e293b' : '1px solid #f1f5f9',
      backgroundColor: mode === 'dark' ? '#090d16' : '#ffffff',
    }}
  >
    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
      <span>
        {SYSTEM_INFO.name} v{SYSTEM_INFO.version} • {SYSTEM_INFO.tagline} • {SYSTEM_INFO.copyright}
      </span>
      <Space separator={<Divider orientation="vertical" />}>
        <a href={SYSTEM_INFO.links.helpCenter} style={{ color: 'inherit' }}>
          Help Center
        </a>
        <a
          href={SYSTEM_INFO.links.apiDocs}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          API Docs
        </a>
        <a href={SYSTEM_INFO.links.status} style={{ color: 'inherit' }}>
          System Telemetry
        </a>
      </Space>
    </Flex>
  </Footer>
));

LayoutFooter.displayName = 'LayoutFooter';
