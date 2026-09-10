import { Dropdown, Menu, Tooltip, type MenuProps } from 'antd';
import React from 'react';
import { useThemeStore } from '../../stores/theme.store';
import { SidebarBrandHeader } from './SidebarBrandHeader';
import { SidebarFooter } from './SidebarFooter';
import { SidebarOrgSelector } from './SidebarOrgSelector';

export interface SidebarContentProps {
  collapsed: boolean;
  inDrawer: boolean;
  activeOrg: string;
  orgMenuItems: MenuProps['items'];
  menuItems: MenuProps['items'];
  pathname: string;
  onNavigate: (path: string) => void;
  onCloseDrawer: () => void;
}

export const SidebarContent: React.FC<SidebarContentProps> = React.memo(
  ({
    collapsed,
    inDrawer,
    activeOrg,
    orgMenuItems,
    menuItems,
    pathname,
    onNavigate,
    onCloseDrawer,
  }) => {
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const isDark = resolvedMode === 'dark';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: isDark ? '#0c1017' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
        }}
      >
        <SidebarBrandHeader
          collapsed={collapsed}
          inDrawer={inDrawer}
          onNavigate={onNavigate}
          onCloseDrawer={onCloseDrawer}
        />
        {!collapsed || inDrawer ? (
          <SidebarOrgSelector activeOrg={activeOrg} orgMenuItems={orgMenuItems} />
        ) : (
          <div
            style={{
              padding: '8px 0',
              display: 'flex',
              justifyContent: 'center',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9',
              flexShrink: 0,
            }}
          >
            <Dropdown menu={{ items: orgMenuItems }} trigger={['click']}>
              <Tooltip title={`Cluster: ${activeOrg}`} placement="right">
                <button
                  type="button"
                  aria-label={`Active cluster: ${activeOrg}`}
                  style={{
                    width: 40,
                    height: 36,
                    borderRadius: 6,
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                    }}
                  />
                </button>
              </Tooltip>
            </Dropdown>
          </div>
        )}
        <div
          className={`sidebar-menu-scroll ${isDark ? 'sidebar-menu-dark' : 'sidebar-menu-light'}`}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 0' }}
        >
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="inline"
            inlineCollapsed={collapsed && !inDrawer}
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => {
              if (key.startsWith('/')) {
                onNavigate(key);
                if (inDrawer) onCloseDrawer();
              }
            }}
            style={{ backgroundColor: 'transparent', borderRight: 0, width: '100%' }}
          />
        </div>
        <SidebarFooter collapsed={collapsed} inDrawer={inDrawer} onNavigate={onNavigate} />
      </div>
    );
  },
);

SidebarContent.displayName = 'SidebarContent';
