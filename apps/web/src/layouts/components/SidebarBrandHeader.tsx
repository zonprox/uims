import { SYSTEM_INFO } from '@uims/shared-utils';
import { Flex, Tag, Tooltip, Typography, theme } from 'antd';
import React from 'react';
import { useThemeStore } from '../../stores/theme.store';

const { Text } = Typography;

export interface SidebarBrandHeaderProps {
  collapsed: boolean;
  inDrawer: boolean;
  onNavigate: (path: string) => void;
  onCloseDrawer: () => void;
}

export const SidebarBrandHeader: React.FC<SidebarBrandHeaderProps> = React.memo(
  ({ collapsed, inDrawer, onNavigate, onCloseDrawer }) => {
    const { token } = theme.useToken();
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const isDark = resolvedMode === 'dark';

    return (
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !inDrawer ? 'center' : 'flex-start',
          padding: collapsed && !inDrawer ? '0' : '0 16px',
          gap: 10,
          borderBottom: isDark
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : `1px solid ${token.colorBorderSecondary}`,
          backgroundColor: isDark ? '#090d14' : token.colorBgContainer,
          flexShrink: 0,
        }}
      >
        <Tooltip title={SYSTEM_INFO.name} placement="right">
          <button
            type="button"
            aria-label="Home"
            style={{
              width: 32,
              height: 32,
              borderRadius: token.borderRadiusLG,
              border: 'none',
              padding: 0,
              background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive || '#0958d9'} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '-0.02em',
              boxShadow: `0 2px 8px ${token.colorPrimary}59`,
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
        </Tooltip>
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
              <Text
                strong
                style={{
                  color: isDark ? '#f8fafc' : token.colorText,
                  fontSize: 14.5,
                  lineHeight: 1.2,
                }}
              >
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
                  borderRadius: token.borderRadiusXS,
                }}
              >
                v{SYSTEM_INFO.version.split('.').slice(0, 2).join('.')}
              </Tag>
            </Flex>
            <div
              style={{
                color: isDark ? 'rgba(248, 250, 252, 0.45)' : token.colorTextTertiary,
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
    );
  },
);

SidebarBrandHeader.displayName = 'SidebarBrandHeader';
