import { SYSTEM_INFO } from '@uims/shared-utils';
import { Flex, Tag, Typography } from 'antd';
import React from 'react';

const { Text } = Typography;

export interface SidebarBrandHeaderProps {
  collapsed: boolean;
  inDrawer: boolean;
  onNavigate: (path: string) => void;
  onCloseDrawer: () => void;
}

export const SidebarBrandHeader: React.FC<SidebarBrandHeaderProps> = React.memo(
  ({ collapsed, inDrawer, onNavigate, onCloseDrawer }) => (
    <div
      style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed && !inDrawer ? 'center' : 'flex-start',
        padding: collapsed && !inDrawer ? '0' : '0 16px',
        gap: 10,
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#090d14',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: 'none',
          padding: 0,
          background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: '-0.02em',
          boxShadow: '0 2px 8px rgba(22, 119, 255, 0.35)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={() => {
          onNavigate('/');
          if (inDrawer) onCloseDrawer();
        }}
      >
        U
      </button>
      {(!collapsed || inDrawer) && (
        <button
          type="button"
          style={{
            overflow: 'hidden',
            flex: 1,
            minWidth: 0,
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'left',
          }}
          onClick={() => {
            onNavigate('/');
            if (inDrawer) onCloseDrawer();
          }}
        >
          <Flex align="center" gap={6}>
            <Text strong style={{ color: '#f8fafc', fontSize: 14.5, lineHeight: 1.2 }}>
              {SYSTEM_INFO.shortName}
            </Text>
            <Tag
              color="cyan"
              style={{
                fontSize: 9.5,
                padding: '0 4px',
                lineHeight: '14px',
                height: 16,
                margin: 0,
                flexShrink: 0,
                fontWeight: 700,
                borderRadius: 3,
              }}
            >
              v{SYSTEM_INFO.version.split('.').slice(0, 2).join('.')}
            </Tag>
          </Flex>
          <div
            style={{
              color: 'rgba(248, 250, 252, 0.45)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {SYSTEM_INFO.name}
          </div>
        </button>
      )}
    </div>
  ),
);

SidebarBrandHeader.displayName = 'SidebarBrandHeader';
