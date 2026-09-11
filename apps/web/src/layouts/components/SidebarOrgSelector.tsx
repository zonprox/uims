import { DownOutlined } from '@ant-design/icons';
import { Dropdown, Flex, type MenuProps, Tooltip, Typography, theme } from 'antd';
import React from 'react';
import { useThemeStore } from '../../stores/theme.store';

const { Text } = Typography;

export interface SidebarOrgSelectorProps {
  activeOrg: string;
  orgMenuItems: MenuProps['items'];
}

export const SidebarOrgSelector: React.FC<SidebarOrgSelectorProps> = React.memo(
  ({ activeOrg, orgMenuItems }) => {
    const { token } = theme.useToken();
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const isDark = resolvedMode === 'dark';

    return (
      <div
        style={{
          padding: '8px 12px',
          borderBottom: isDark
            ? '1px solid rgba(255, 255, 255, 0.06)'
            : `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        <Dropdown menu={{ items: orgMenuItems }} trigger={['click']}>
          <Tooltip title={`Organization: ${activeOrg}`} placement="right" mouseEnterDelay={0.5}>
            <div
              style={{
                padding: '6px 10px',
                borderRadius: token.borderRadiusSM,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : token.colorBgLayout,
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.08)'
                  : `1px solid ${token.colorBorderSecondary}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                transition: 'all 0.2s',
              }}
              className={`sidebar-org-selector ${isDark ? 'sidebar-org-selector-dark' : 'sidebar-org-selector-light'}`}
            >
              <Flex align="center" gap={8} style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: token.colorSuccess,
                    boxShadow: `0 0 6px ${token.colorSuccess}99`,
                    flexShrink: 0,
                  }}
                />
                <Text
                  style={{
                    color: isDark ? 'rgba(255, 255, 255, 0.85)' : token.colorText,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                  }}
                >
                  {activeOrg}
                </Text>
              </Flex>
              <DownOutlined
                style={{
                  fontSize: 10,
                  color: isDark ? 'rgba(255, 255, 255, 0.45)' : token.colorTextTertiary,
                  flexShrink: 0,
                }}
              />
            </div>
          </Tooltip>
        </Dropdown>
      </div>
    );
  },
);

SidebarOrgSelector.displayName = 'SidebarOrgSelector';
