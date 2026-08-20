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
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const isDark = resolvedMode === 'dark';
    const icon = isMobile ? (
      <MenuOutlined />
    ) : collapsed ? (
      <MenuUnfoldOutlined />
    ) : (
      <MenuFoldOutlined />
    );
    return (
      <Flex align="center" gap={isXs ? 8 : 12}>
        <Button type="text" icon={icon} onClick={onToggleSidebar} style={{ fontSize: 16 }} />
        <Button
          type="default"
          icon={<SearchOutlined style={{ color: '#94a3b8' }} />}
          onClick={onOpenCommandPalette}
          style={{
            borderRadius: 6,
            background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            color: isDark ? '#94a3b8' : '#64748b',
            minWidth: isXs ? 120 : 220,
            height: 34,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isXs ? '0 8px' : '0 12px',
          }}
        >
          <span style={{ fontSize: 12 }}>{isXs ? 'Search...' : 'Command Palette...'}</span>
          {!isXs && (
            <kbd
              style={{
                fontSize: 10.5,
                padding: '1px 5px',
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                borderRadius: 4,
                color: isDark ? '#cbd5e1' : '#64748b',
              }}
            >
              ⌘K
            </kbd>
          )}
        </Button>
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
  user: { name?: string } | null;
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
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const isDark = resolvedMode === 'dark';
    const setMode = useThemeStore((state) => state.setMode);

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
        <Dropdown menu={{ items: quickCreateMenu }} placement="bottomRight">
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            style={{ height: 32, borderRadius: 6, fontWeight: 600 }}
          >
            {!isXs ? 'New' : ''}
          </Button>
        </Dropdown>

        <Tooltip title="Notifications">
          <Badge
            count={unreadCount}
            offset={[-2, 3]}
            size="small"
            styles={{
              indicator: {
                fontSize: 10,
                fontWeight: 700,
                height: 16,
                minWidth: 16,
                lineHeight: '16px',
                padding: '0 4px',
                boxShadow: isDark ? '0 0 0 1.5px #090d16' : '0 0 0 1.5px #ffffff',
              },
            }}
          >
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<BellOutlined style={{ fontSize: 16 }} />}
              onClick={onOpenNotifications}
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
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={themeButtonIcon}
            aria-label="Theme switcher"
          />
        </Dropdown>

        <Divider orientation="vertical" style={{ height: 20, margin: '0 4px' }} />

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
          <div
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isXs ? '2px' : '2px 6px',
              borderRadius: 6,
            }}
          >
            <Avatar
              size={28}
              style={{
                backgroundColor: '#1677ff',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {user?.name?.[0] || 'A'}
            </Avatar>
            {!isXs && (
              <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
                <Text strong style={{ fontSize: 12.5, display: 'block' }}>
                  {user?.name || 'Alex Johnson'}
                </Text>
                <Text
                  style={{
                    fontSize: 10.5,
                    color: isDark ? '#94a3b8' : '#64748b',
                    display: 'block',
                  }}
                >
                  Super Admin
                </Text>
              </div>
            )}
          </div>
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
  user: { name?: string } | null;
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
    const resolvedMode = useThemeStore((state) => state.resolvedMode);
    const isDark = resolvedMode === 'dark';
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
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          backgroundColor: isDark ? '#090d16' : '#ffffff',
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
