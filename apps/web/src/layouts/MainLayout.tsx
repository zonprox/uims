import { ExclamationCircleOutlined } from '@ant-design/icons';
import { App, Drawer, Grid, Layout } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import CommandPalette from '../components/CommandPalette';
import ErrorBoundary from '../components/ErrorBoundary';
import NotificationDrawer from '../components/NotificationDrawer';
import { QuickConfigDrawer } from '../components/QuickConfigDrawer';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { LayoutFooter } from './components/LayoutFooter';
import { AppNavbarHeader } from './components/NavbarSections';
import { SidebarContent } from './components/SidebarContent';
import { useLayoutTelemetry } from './hooks/useLayoutTelemetry';
import {
  getNavMenuItems,
  getOrgMenuItems,
  getQuickCreateMenu,
  getUserMenuItems,
} from './menuConfig';

const { Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { modal } = App.useApp();
  const screens = useBreakpoint();

  const mode = useThemeStore((state) => state.mode);

  const isMobile = screens.md === false;
  const isXs = screens.xs === true;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickConfigOpen, setQuickConfigOpen] = useState(false);
  const [activeOrg, setActiveOrg] = useState('Acme Enterprise HQ (US-East)');

  const { unreadNotifCount, navBadges, fetchLiveTelemetry } = useLayoutTelemetry(15000);

  const handleLogout = useCallback(() => {
    modal.confirm({
      title: 'Sign Out of Enterprise Console',
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: 'Are you sure you want to end your active session in UIMS Enterprise?',
      okText: 'Sign Out',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        logout();
        navigate('/login');
      },
    });
  }, [modal, logout, navigate]);

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

  const orgMenuItems = useMemo(() => getOrgMenuItems(setActiveOrg), []);
  const menuItems = useMemo(
    () => getNavMenuItems(collapsed, isMobile, navBadges),
    [collapsed, isMobile, navBadges],
  );
  const quickCreateMenu = useMemo(() => getQuickCreateMenu(navigate), [navigate]);
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
          theme="dark"
          style={{
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 100,
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '2px 0 12px rgba(0, 0, 0, 0.25)',
          }}
        >
          <SidebarContent
            collapsed={collapsed}
            inDrawer={false}
            activeOrg={activeOrg}
            orgMenuItems={orgMenuItems}
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
          styles={{ body: { padding: 0, backgroundColor: '#0c1017' } }}
          size={290}
          closable={false}
        >
          <SidebarContent
            collapsed={collapsed}
            inDrawer={true}
            activeOrg={activeOrg}
            orgMenuItems={orgMenuItems}
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
          unreadCount={unreadNotifCount}
          onToggleSidebar={handleToggleSidebar}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenQuickConfig={() => setQuickConfigOpen(true)}
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
      <QuickConfigDrawer open={quickConfigOpen} onClose={() => setQuickConfigOpen(false)} />
      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNotificationsChanged={fetchLiveTelemetry}
      />
    </Layout>
  );
}
