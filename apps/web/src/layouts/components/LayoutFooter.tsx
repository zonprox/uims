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
      padding: '16px 24px',
      color: '#94a3b8',
      fontSize: 12,
      borderTop: mode === 'dark' ? '1px solid #1e293b' : '1px solid #f1f5f9',
    }}
  >
    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
      <span>UIMS Enterprise v2.4 • Unified IT Infrastructure & Assets Management</span>
      <Space separator={<Divider orientation="vertical" />}>
        <a href="/help" style={{ color: 'inherit' }}>
          Help Center
        </a>
        <a href="/api/docs" style={{ color: 'inherit' }}>
          API Docs
        </a>
        <a href="/status" style={{ color: 'inherit' }}>
          System Status
        </a>
      </Space>
    </Flex>
  </Footer>
));

LayoutFooter.displayName = 'LayoutFooter';
