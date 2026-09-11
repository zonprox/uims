import { ExclamationCircleOutlined } from '@ant-design/icons';
import { App, Drawer, Grid, Layout, theme } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import CommandPalette from '../components/CommandPalette';
import ErrorBoundary from '../components/ErrorBoundary';
import NotificationDrawer from '../components/NotificationDrawer';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { LayoutFooter } from './components/LayoutFooter';
import { AppNavbarHeader } from './components/NavbarSections';
import { SidebarContent } from './components/SidebarContent';
import { useLayoutTelemetry } from './hooks/useLayoutTelemetry';
import { getNavMenuItems, getQuickCreateMenu, getUserMenuItems } from './menuConfig';

const { Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, can, permissions } = useAuthStore();
  const { modal } = App.useApp();
  const screens = useBreakpoint();

  const mode = useThemeStore((state) => state.mode);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isDark = resolvedMode === 'dark';

  const isMobile = screens.md === false;
  const isXs = screens.xs === true;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Quick search on '/' when not typing in an input or editable field
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tagName = target?.tagName?.toLowerCase();
        const isInput =
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          target?.isContentEditable ||
          target?.getAttribute('role') === 'textbox';
        if (!isInput) {
          e.preventDefault();
          setCommandPaletteOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { navBadges } = useLayoutTelemetry(15000);
  const {
    notifications,
    unreadCount,
    isConnected,
    loading: notifLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useRealtimeNotifications();

  const handleLogout = useCallback(() => {
    modal.confirm({
      title: 'Sign Out',
      icon: <ExclamationCircleOutlined style={{ color: token.colorError }} />,
      content: 'Are you sure you want to sign out? Your active session will end.',
      okText: 'Sign Out',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        logout();
        navigate('/login');
      },
    });
  }, [modal, logout, navigate, token.colorError]);

  const handleCloseDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  const menuItems = useMemo(
    () => getNavMenuItems(collapsed, isMobile, navBadges, can, isDark),
    [collapsed, isMobile, navBadges, can, permissions, isDark],
  );
  const quickCreateMenu = useMemo(
    () => getQuickCreateMenu(navigate, can),
    [navigate, can, permissions],
  );
  const userMenuItems = useMemo(
    () => getUserMenuItems(user, navigate, handleLogout),
    [user, navigate, handleLogout],
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          width={280}
          collapsedWidth={80}
          theme={isDark ? 'dark' : 'light'}
          style={{
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 100,
            backgroundColor: isDark ? '#080c14' : token.colorBgContainer,
            borderRight: isDark
              ? '1px solid rgba(255, 255, 255, 0.08)'
              : `1px solid ${token.colorBorderSecondary}`,
            boxShadow: isDark ? '2px 0 12px rgba(0, 0, 0, 0.25)' : '2px 0 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <SidebarContent
            collapsed={collapsed}
            inDrawer={false}
            menuItems={menuItems}
            pathname={location.pathname}
            onNavigate={navigate}
            onCloseDrawer={handleCloseDrawer}
          />
        </Sider>
      )}

      {isMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
          onClose={handleCloseDrawer}
          styles={{
            wrapper: { width: 290 },
            body: { padding: 0, backgroundColor: isDark ? '#0c1017' : token.colorBgContainer },
          }}
          closable={false}
        >
          <SidebarContent
            collapsed={collapsed}
            inDrawer={true}
            menuItems={menuItems}
            pathname={location.pathname}
            onNavigate={navigate}
            onCloseDrawer={handleCloseDrawer}
          />
        </Drawer>
      )}

      <Layout>
        <AppNavbarHeader
          isMobile={isMobile}
          collapsed={collapsed}
          isXs={isXs}
          mode={mode}
          quickCreateMenu={quickCreateMenu}
          userMenuItems={userMenuItems}
          user={user}
          unreadCount={unreadCount}
          onToggleSidebar={handleToggleSidebar}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
        />

        <Content style={{ margin: '16px 20px', minHeight: 'calc(100vh - 130px)' }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>

        <LayoutFooter mode={mode} />
      </Layout>

      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={notifLoading}
        isConnected={isConnected}
        onRefresh={refreshNotifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
        onClearAll={clearAll}
      />
    </Layout>
  );
}
