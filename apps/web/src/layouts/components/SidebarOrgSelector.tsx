import { DownOutlined } from '@ant-design/icons';
import { Dropdown, Flex, type MenuProps, Tooltip, Typography } from 'antd';
import React from 'react';

const { Text } = Typography;

export interface SidebarOrgSelectorProps {
  activeOrg: string;
  orgMenuItems: MenuProps['items'];
}

export const SidebarOrgSelector: React.FC<SidebarOrgSelectorProps> = React.memo(
  ({ activeOrg, orgMenuItems }) => (
    <div
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        flexShrink: 0,
      }}
    >
      <Dropdown menu={{ items: orgMenuItems }} trigger={['click']}>
        <Tooltip title={`Cluster: ${activeOrg}`} placement="right" mouseEnterDelay={0.5}>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              transition: 'all 0.2s',
            }}
            className="sidebar-org-selector"
          >
            <Flex align="center" gap={8} style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                  flexShrink: 0,
                }}
              />
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.85)',
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
              style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.45)', flexShrink: 0 }}
            />
          </div>
        </Tooltip>
      </Dropdown>
    </div>
  ),
);

SidebarOrgSelector.displayName = 'SidebarOrgSelector';
