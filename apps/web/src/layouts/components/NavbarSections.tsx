import {
  BellOutlined,
  DesktopOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  PlusOutlined,
  SearchOutlined,
  SunOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Dropdown,
  Flex,
  Layout,
  type MenuProps,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, { useMemo } from 'react';
import { type ThemeMode, useThemeStore } from '../../stores/theme.store';

const { Header } = Layout;
const { Text } = Typography;

export interface NavbarLeftSectionProps {
  isMobile: boolean;
  collapsed: boolean;
  isXs: boolean;
  mode?: ThemeMode;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
}

export const NavbarLeftSection: React.FC<NavbarLeftSectionProps> = React.memo(
  ({ isMobile, collapsed, isXs, onToggleSidebar, onOpenCommandPalette }) => {
    const { token } = theme.useToken();
    const isMac =
      typeof navigator !== 'undefined' &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent || '');
    const shortcutLabel = isMac ? '⌘K' : 'Ctrl K';

    const icon = isMobile ? (
      <MenuOutlined />
    ) : collapsed ? (
      <MenuUnfoldOutlined />
    ) : (
      <MenuFoldOutlined />
    );
    return (
      <Flex align="center" gap={isXs ? 8 : 12}>
        <Tooltip
          title={isMobile ? 'Navigation menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Button
            type="text"
            icon={icon}
            onClick={onToggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ fontSize: 16 }}
          />
        </Tooltip>
        <Tooltip title={`Quick search (${shortcutLabel})`}>
          <Button
            type="default"
            icon={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
            onClick={onOpenCommandPalette}
            style={{
              borderRadius: token.borderRadius,
              background: token.colorBgLayout,
              borderColor: token.colorBorder,
              color: token.colorTextSecondary,
              minWidth: isXs ? 120 : 220,
              height: 34,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isXs ? '0 8px' : '0 12px',
            }}
          >
            <span style={{ fontSize: 12 }}>{isXs ? 'Search...' : 'Search or jump to...'}</span>
            {!isXs && (
              <kbd
                style={{
                  fontSize: 10.5,
                  padding: '1px 5px',
                  background: token.colorFillSecondary,
                  borderRadius: token.borderRadiusSM,
                  color: token.colorTextSecondary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                {shortcutLabel}
              </kbd>
            )}
          </Button>
        </Tooltip>
      </Flex>
    );
  },
);

NavbarLeftSection.displayName = 'NavbarLeftSection';

export interface NavbarRightSectionProps {
  isXs: boolean;
  mode?: ThemeMode;
  quickCreateMenu: MenuProps['items'];
  userMenuItems: MenuProps['items'];
  user: { name?: string; email?: string; role?: string } | null;
  unreadCount: number;
  onOpenNotifications: () => void;
}

export const NavbarRightSection: React.FC<NavbarRightSectionProps> = React.memo(
  ({
    isXs,
    mode: propMode,
    quickCreateMenu,
    userMenuItems,
    user,
    unreadCount,
    onOpenNotifications,
  }) => {
    const storeMode = useThemeStore((state) => state.mode);
    const mode = propMode ?? storeMode;
    const setMode = useThemeStore((state) => state.setMode);
    const { token } = theme.useToken();

    const themeMenuItems: MenuProps['items'] = useMemo(
      () => [
        {
          key: 'light',
          icon: <SunOutlined />,
          label: 'Light',
        },
        {
          key: 'dark',
          icon: <MoonOutlined />,
          label: 'Dark',
        },
        {
          key: 'system',
          icon: <DesktopOutlined />,
          label: 'System',
        },
      ],
      [],
    );

    const themeButtonIcon = useMemo(() => {
      switch (mode) {
        case 'light':
          return <SunOutlined style={{ fontSize: 16 }} />;
        case 'dark':
          return <MoonOutlined style={{ fontSize: 16 }} />;
        case 'system':
        default:
          return <DesktopOutlined style={{ fontSize: 16 }} />;
      }
    }, [mode]);

    return (
      <Flex align="center" gap={isXs ? 6 : 8}>
        <Tooltip title="Quick create">
          <Dropdown menu={{ items: quickCreateMenu }} placement="bottomRight">
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              style={{ height: 32, borderRadius: token.borderRadius, fontWeight: 600 }}
            >
              {!isXs ? 'New' : ''}
            </Button>
          </Dropdown>
        </Tooltip>

        <Tooltip title="Notifications">
          <Badge
            count={unreadCount}
            overflowCount={99}
            offset={[-2, 4]}
            styles={{
              indicator: {
                boxShadow: 'none',
                fontSize: 10,
                height: 16,
                minWidth: 16,
                lineHeight: '16px',
                padding: '0 4px',
              },
            }}
          >
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<BellOutlined style={{ fontSize: 16 }} />}
              onClick={onOpenNotifications}
              aria-label="Notifications"
            />
          </Badge>
        </Tooltip>

        <Dropdown
          menu={{
            items: themeMenuItems,
            selectable: true,
            selectedKeys: [mode],
            onClick: ({ key }) => setMode(key as ThemeMode),
          }}
          placement="bottomRight"
        >
          <Tooltip title="Switch theme">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={themeButtonIcon}
              aria-label="Theme switcher"
            />
          </Tooltip>
        </Dropdown>

        <Divider orientation="vertical" style={{ height: 20, margin: '0 4px' }} />

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
          <Tooltip title={user?.email || 'User Profile'}>
            <div
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: isXs ? '2px' : '2px 6px',
                borderRadius: token.borderRadius,
              }}
            >
              <Avatar
                size={28}
                style={{
                  backgroundColor: token.colorPrimary,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {user?.name?.[0] || 'A'}
              </Avatar>
              {!isXs && (
                <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
                  <Text strong style={{ fontSize: 12.5, display: 'block', color: token.colorText }}>
                    {user?.name || 'Alex Johnson'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10.5,
                      color: token.colorTextTertiary,
                      display: 'block',
                    }}
                  >
                    {user?.role || 'Super Admin'}
                  </Text>
                </div>
              )}
            </div>
          </Tooltip>
        </Dropdown>
      </Flex>
    );
  },
);

NavbarRightSection.displayName = 'NavbarRightSection';

export interface AppNavbarHeaderProps {
  isMobile: boolean;
  collapsed: boolean;
  isXs: boolean;
  mode?: ThemeMode;
  quickCreateMenu: MenuProps['items'];
  userMenuItems: MenuProps['items'];
  user: { name?: string; email?: string; role?: string } | null;
  unreadCount: number;
  onToggleSidebar: () => void;
  onOpenCommandPalette: () => void;
  onOpenNotifications: () => void;
}

export const AppNavbarHeader: React.FC<AppNavbarHeaderProps> = React.memo(
  ({
    isMobile,
    collapsed,
    isXs,
    mode,
    quickCreateMenu,
    userMenuItems,
    user,
    unreadCount,
    onToggleSidebar,
    onOpenCommandPalette,
    onOpenNotifications,
  }) => {
    const { token } = theme.useToken();
    return (
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isXs ? '0 12px' : '0 24px',
          height: 56,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          backgroundColor: token.colorBgContainer,
        }}
      >
        <NavbarLeftSection
          isMobile={isMobile}
          collapsed={collapsed}
          isXs={isXs}
          mode={mode}
          onToggleSidebar={onToggleSidebar}
          onOpenCommandPalette={onOpenCommandPalette}
        />
        <NavbarRightSection
          isXs={isXs}
          mode={mode}
          quickCreateMenu={quickCreateMenu}
          userMenuItems={userMenuItems}
          user={user}
          unreadCount={unreadCount}
          onOpenNotifications={onOpenNotifications}
        />
      </Header>
    );
  },
);

AppNavbarHeader.displayName = 'AppNavbarHeader';
