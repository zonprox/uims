import {
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  CustomerServiceOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  LaptopOutlined,
  LogoutOutlined,
  MailOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Avatar,
  Badge,
  Button,
  Dropdown,
  Flex,
  Layout,
  Menu,
  type MenuProps,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import CommandPalette from '../components/CommandPalette';
import NotificationDrawer from '../components/NotificationDrawer';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { modal } = App.useApp();

  const mode = useThemeStore((state) => state.mode);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  const [collapsed, setCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = () => {
    modal.confirm({
      title: 'Confirm Sign Out',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to log out of UIMS?',
      okText: 'Sign Out',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        logout();
        navigate('/login');
      },
    });
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <BarChartOutlined style={{ fontSize: 16 }} />,
      label: 'Dashboard',
    },
    {
      type: 'divider',
    },
    {
      key: 'group-assets',
      type: 'group',
      label: !collapsed ? 'ASSET & INVENTORY' : undefined,
      children: [
        {
          key: '/assets',
          icon: <LaptopOutlined style={{ fontSize: 16 }} />,
          label: 'Asset Management',
        },
        {
          key: '/licenses',
          icon: <SafetyCertificateOutlined style={{ fontSize: 16 }} />,
          label: 'Software Licenses',
        },
        {
          key: '/inventory',
          icon: <DatabaseOutlined style={{ fontSize: 16 }} />,
          label: (
            <Flex justify="space-between" align="center">
              <span>Hardware Stock</span>
              {!collapsed && (
                <Badge count={2} size="small" style={{ backgroundColor: '#faad14' }} />
              )}
            </Flex>
          ),
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: 'group-ops',
      type: 'group',
      label: !collapsed ? 'OPERATIONS & IT' : undefined,
      children: [
        {
          key: '/directory',
          icon: <TeamOutlined style={{ fontSize: 16 }} />,
          label: 'Directory & Users',
        },
        {
          key: '/email',
          icon: <MailOutlined style={{ fontSize: 16 }} />,
          label: 'Email Services',
        },
        {
          key: '/network',
          icon: <GlobalOutlined style={{ fontSize: 16 }} />,
          label: 'Network & IPAM',
        },
        {
          key: '/tickets',
          icon: <CustomerServiceOutlined style={{ fontSize: 16 }} />,
          label: (
            <Flex justify="space-between" align="center">
              <span>Helpdesk & Tickets</span>
              {!collapsed && (
                <Badge count={3} size="small" style={{ backgroundColor: '#ff4d4f' }} />
              )}
            </Flex>
          ),
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: 'group-admin',
      type: 'group',
      label: !collapsed ? 'COMPLIANCE & SYSTEM' : undefined,
      children: [
        {
          key: '/audit',
          icon: <AuditOutlined style={{ fontSize: 16 }} />,
          label: 'Audit & Compliance',
        },
        {
          key: '/reports',
          icon: <BarChartOutlined style={{ fontSize: 16 }} />,
          label: 'Reports & Analytics',
        },
        {
          key: '/settings',
          icon: <SettingOutlined style={{ fontSize: 16 }} />,
          label: 'System Settings',
        },
      ],
    },
  ];

  const quickCreateMenu: MenuProps['items'] = [
    {
      key: 'asset',
      icon: <LaptopOutlined />,
      label: 'New Asset',
      onClick: () => navigate('/assets'),
    },
    {
      key: 'license',
      icon: <SafetyCertificateOutlined />,
      label: 'Add License',
      onClick: () => navigate('/licenses'),
    },
    {
      key: 'ticket',
      icon: <CustomerServiceOutlined />,
      label: 'Create Ticket',
      onClick: () => navigate('/tickets'),
    },
    {
      key: 'user',
      icon: <TeamOutlined />,
      label: 'Add User',
      onClick: () => navigate('/directory'),
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ display: 'block', fontSize: 14 }}>
            {user?.name || 'Administrator'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {user?.email || 'admin@uims.internal'}
          </Text>
          <div style={{ marginTop: 6 }}>
            <Tag color="blue">Super Admin</Tag>
          </div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Preferences & Theme',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'audit-logs',
      icon: <AuditOutlined />,
      label: 'My Activity Logs',
      onClick: () => navigate('/audit'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#ff4d4f' }} />,
      label: <span style={{ color: '#ff4d4f' }}>Sign Out</span>,
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sider Navigation */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={250}
        collapsedWidth={80}
        theme="dark"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0,
          left: 0,
          zIndex: 100,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0 16px' : '0 20px',
            gap: 12,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 18,
              boxShadow: '0 2px 6px rgba(22, 119, 255, 0.4)',
              flexShrink: 0,
            }}
          >
            U
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
                UIMS
              </div>
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.45)',
                  fontSize: 11,
                  letterSpacing: '0.04em',
                }}
              >
                ENTERPRISE IT
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => {
            if (key.startsWith('/')) {
              navigate(key);
            }
          }}
          style={{ marginTop: 12, borderRight: 0 }}
        />
      </Sider>

      <Layout>
        {/* Top Navbar */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 99,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: mode === 'dark' ? '1px solid #1f2937' : '1px solid #eef2f6',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          {/* Left Header Controls */}
          <Flex align="center" gap={16}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16 }}
            />
            {/* Quick Search Shortcut */}
            <Button
              type="default"
              icon={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                borderRadius: 8,
                background: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f5f7fa',
                borderColor: mode === 'dark' ? '#262626' : '#e5e7eb',
                color: '#8c8c8c',
                minWidth: 200,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13 }}>Quick search...</span>
              <kbd
                style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  background: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb',
                  borderRadius: 4,
                  color: mode === 'dark' ? '#bbb' : '#666',
                }}
              >
                ⌘K
              </kbd>
            </Button>
          </Flex>

          {/* Right Header Actions */}
          <Flex align="center" gap={12}>
            {/* Quick Create Dropdown */}
            <Dropdown menu={{ items: quickCreateMenu }} placement="bottomRight">
              <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 6 }}>
                Create
              </Button>
            </Dropdown>

            {/* Dark / Light Mode Toggle */}
            <Tooltip title={mode === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}>
              <Button
                type="text"
                shape="circle"
                icon={
                  mode === 'dark' ? <SunOutlined style={{ color: '#faad14' }} /> : <MoonOutlined />
                }
                onClick={toggleMode}
              />
            </Tooltip>

            {/* Notifications Bell */}
            <Tooltip title="Notifications">
              <Badge count={3} offset={[-4, 4]} size="small">
                <Button
                  type="text"
                  shape="circle"
                  icon={<BellOutlined style={{ fontSize: 16 }} />}
                  onClick={() => setNotificationsOpen(true)}
                />
              </Badge>
            </Tooltip>

            {/* User Profile Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <div
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '4px 8px',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                }}
              >
                <Avatar
                  style={{
                    backgroundColor: '#1677ff',
                    boxShadow: '0 2px 6px rgba(22, 119, 255, 0.3)',
                  }}
                  icon={<UserOutlined />}
                >
                  {user?.name?.[0] || 'A'}
                </Avatar>
                <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>
                    {user?.name || 'Admin User'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Super Admin
                  </Text>
                </div>
              </div>
            </Dropdown>
          </Flex>
        </Header>

        {/* Main Body */}
        <Content
          style={{
            margin: '24px 24px 0',
            minHeight: 380,
          }}
        >
          <Outlet />
        </Content>

        {/* Footer */}
        <Footer
          style={{
            textAlign: 'center',
            padding: '24px 24px 32px',
            color: '#8c8c8c',
            fontSize: 13,
          }}
        >
          <Flex justify="space-between" align="center" wrap gap={12}>
            <Flex align="center" gap={8}>
              <Badge status="success" text="All Systems Operational" />
              <span>•</span>
              <span>UIMS v2.4.0 (Ant Design 6.6.0)</span>
            </Flex>
            <Space split={<span>•</span>}>
              <a href="#/docs" style={{ color: '#8c8c8c' }}>
                Documentation
              </a>
              <a href="#/support" style={{ color: '#8c8c8c' }}>
                IT Support Desk
              </a>
              <a href="#/privacy" style={{ color: '#8c8c8c' }}>
                Security Policy
              </a>
            </Space>
          </Flex>
        </Footer>
      </Layout>

      {/* Global Modals & Drawers */}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <NotificationDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </Layout>
  );
}
