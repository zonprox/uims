import { Layout, Menu, Dropdown, Avatar, Button } from 'antd';
import {
  DashboardOutlined,
  LaptopOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  MailOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  CustomerServiceOutlined,
  AuditOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '../stores/auth.store';

const { Header, Sider, Content, Footer } = Layout;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/assets', icon: <LaptopOutlined />, label: 'Asset Management' },
    { key: '/licenses', icon: <SafetyCertificateOutlined />, label: 'License Management' },
    { key: '/directory', icon: <TeamOutlined />, label: 'Directory Services' },
    { key: '/email', icon: <MailOutlined />, label: 'Email Management' },
    { key: '/network', icon: <GlobalOutlined />, label: 'Network & IP' },
    { key: '/inventory', icon: <DatabaseOutlined />, label: 'Hardware Inventory' },
    { key: '/tickets', icon: <CustomerServiceOutlined />, label: 'Helpdesk & Tickets' },
    { key: '/audit', icon: <AuditOutlined />, label: 'Audit & Compliance' },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const userMenuItems: import('antd').MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="80" theme="dark">
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
          UIMS
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Button type="text" icon={<BellOutlined />} />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user?.name || 'Admin'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
          <div style={{ padding: 24, background: '#fff', borderRadius: 8, minHeight: 360 }}>
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          UIMS ©{new Date().getFullYear()} Created by IT Dept
        </Footer>
      </Layout>
    </Layout>
  );
}
