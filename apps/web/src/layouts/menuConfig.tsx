import {
  ApartmentOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  LaptopOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Flex, type MenuProps, Tag, Typography } from 'antd';
import React from 'react';
import { MenuCountBadge } from './components/MenuCountBadge';
import { NavIconWithBadge } from './components/NavIconWithBadge';
import type { NavBadgeCounts } from './hooks/useLayoutTelemetry';

const { Text } = Typography;

export function getOrgMenuItems(setActiveOrg: (org: string) => void): MenuProps['items'] {
  return [
    {
      key: 'org-1',
      label: (
        <Flex vertical style={{ padding: '2px 0' }}>
          <Text strong style={{ fontSize: 12.5 }}>
            Acme Enterprise Global HQ
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Production • New York, NY
          </Text>
        </Flex>
      ),
      onClick: () => setActiveOrg('Acme Enterprise Global HQ'),
    },
    {
      key: 'org-2',
      label: (
        <Flex vertical style={{ padding: '2px 0' }}>
          <Text strong style={{ fontSize: 12.5 }}>
            Acme EMEA Regional Operations
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Production • London, UK
          </Text>
        </Flex>
      ),
      onClick: () => setActiveOrg('Acme EMEA Regional Operations'),
    },
    {
      key: 'org-3',
      label: (
        <Flex vertical style={{ padding: '2px 0' }}>
          <Text strong style={{ fontSize: 12.5 }}>
            Acme APAC Regional Hub
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Production • Singapore
          </Text>
        </Flex>
      ),
      onClick: () => setActiveOrg('Acme APAC Regional Hub'),
    },
  ];
}

export function getQuickCreateMenu(
  navigate: (path: string) => void,
  can?: (action: string, subject: string) => boolean,
): MenuProps['items'] {
  const allow = (action: string, subject: string) => (can ? can(action, subject) : true);

  const items: NonNullable<MenuProps['items']> = [];

  if (allow('create', 'User')) {
    items.push({
      key: 'new-user',
      icon: <TeamOutlined style={{ color: '#1677ff' }} />,
      label: 'Create User',
      onClick: () => navigate('/users'),
    });
  }

  if (allow('create', 'Organization')) {
    items.push({
      key: 'new-dept',
      icon: <ApartmentOutlined style={{ color: '#722ed1' }} />,
      label: 'Create Department',
      onClick: () => navigate('/organization'),
    });
  }

  if (allow('create', 'Asset')) {
    items.push({
      key: 'new-asset',
      icon: <LaptopOutlined style={{ color: '#1677ff' }} />,
      label: 'Create Asset',
      onClick: () => navigate('/assets'),
    });
  }

  if (allow('create', 'Inventory') || allow('update', 'Inventory')) {
    items.push({
      key: 'new-inventory',
      icon: <DatabaseOutlined style={{ color: '#f59e0b' }} />,
      label: 'Create Item',
      onClick: () => navigate('/inventory'),
    });
  }

  if (allow('create', 'License')) {
    items.push({
      key: 'new-license',
      icon: <SafetyCertificateOutlined style={{ color: '#6366f1' }} />,
      label: 'Create License',
      onClick: () => navigate('/licenses'),
    });
  }

  return items;
}

export function getUserMenuItems(
  user: { name?: string; role?: string; email?: string } | null,
  navigate: (path: string) => void,
  handleLogout: () => void,
): MenuProps['items'] {
  return [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0', cursor: 'default' }}>
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {user?.name || 'Administrator'}
          </Text>
          <Text type="secondary" style={{ fontSize: 11.5 }}>
            {user?.email || 'admin@uims.internal'}
          </Text>
          <Tag color="blue" style={{ marginTop: 6, fontSize: 10, padding: '0 6px' }}>
            {user?.role || 'Super Admin'}
          </Tag>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'manage-users',
      icon: <TeamOutlined />,
      label: 'Users & Access',
      onClick: () => navigate('/users'),
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
      onClick: () => navigate('/notifications'),
    },
    {
      key: 'org-structure',
      icon: <ApartmentOutlined />,
      label: 'Organization Structure',
      onClick: () => navigate('/organization'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'audit-logs',
      icon: <AuditOutlined />,
      label: 'Audit Trail',
      onClick: () => navigate('/audit'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#ef4444' }} />,
      label: <span style={{ color: '#ef4444', fontWeight: 600 }}>Sign Out</span>,
      onClick: handleLogout,
    },
  ];
}

export function getNavMenuItems(
  collapsed: boolean,
  isMobile: boolean,
  counts?: NavBadgeCounts,
  can?: (action: string, subject: string) => boolean,
): MenuProps['items'] {
  const isCollapsedDesktop = collapsed && !isMobile;
  const showLabels = !collapsed || isMobile;
  const allow = (action: string, subject: string) => (can ? can(action, subject) : true);

  const expiringCount = counts?.expiringLicenses ?? 0;
  const lowStockCount = counts?.lowStockItems ?? 0;

  const items: NonNullable<MenuProps['items']> = [
    {
      key: '/',
      icon: <NavIconWithBadge icon={<DashboardOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Dashboard',
      title: 'Dashboard',
    },
  ];

  // Organization & Access Group
  const orgChildren: NonNullable<MenuProps['items']> = [];
  if (allow('read', 'Organization')) {
    orgChildren.push({
      key: '/organization',
      icon: <NavIconWithBadge icon={<ApartmentOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Organization Structure',
      title: 'Organization Structure',
    });
  }
  if (allow('read', 'User') || allow('read', 'Role')) {
    orgChildren.push({
      key: '/users',
      icon: <NavIconWithBadge icon={<TeamOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Users & Access',
      title: 'Users & Access',
    });
  }

  if (orgChildren.length > 0) {
    items.push({ type: 'divider' });
    items.push({
      key: 'group-org',
      type: 'group',
      label: showLabels ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}
        >
          ORGANIZATION & ACCESS
        </span>
      ) : undefined,
      children: orgChildren,
    });
  }

  // Core Assets & Inventory Group
  const assetChildren: NonNullable<MenuProps['items']> = [];
  if (allow('read', 'Asset')) {
    assetChildren.push({
      key: '/assets',
      icon: <NavIconWithBadge icon={<LaptopOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Hardware Assets',
      title: 'Hardware Assets',
    });
  }
  if (allow('read', 'License')) {
    assetChildren.push({
      key: '/licenses',
      icon: (
        <NavIconWithBadge
          icon={<SafetyCertificateOutlined />}
          count={expiringCount > 0 ? expiringCount : undefined}
          color="#f59e0b"
          textColor="#000"
          isCollapsed={isCollapsedDesktop}
        />
      ),
      title:
        expiringCount > 0 ? `Software Licenses (${expiringCount} Expiring)` : 'Software Licenses',
      label: (
        <Flex justify="space-between" align="center" style={{ width: '100%', minWidth: 0, gap: 8 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Software Licenses
          </span>
          {showLabels && expiringCount > 0 && (
            <Tag
              color="warning"
              style={{
                fontSize: 10,
                margin: 0,
                padding: '0 5px',
                height: 18,
                lineHeight: '16px',
                borderRadius: 4,
                flexShrink: 0,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {expiringCount} Expiring
            </Tag>
          )}
        </Flex>
      ),
    });
  }
  if (allow('read', 'Inventory')) {
    assetChildren.push({
      key: '/inventory',
      icon: (
        <NavIconWithBadge
          icon={<DatabaseOutlined />}
          count={lowStockCount > 0 ? lowStockCount : undefined}
          color="#f59e0b"
          textColor="#000"
          isCollapsed={isCollapsedDesktop}
        />
      ),
      title: lowStockCount > 0 ? `Inventory (${lowStockCount} Low Stock)` : 'Inventory',
      label: (
        <Flex justify="space-between" align="center" style={{ width: '100%', minWidth: 0, gap: 8 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Inventory
          </span>
          {showLabels && lowStockCount > 0 && (
            <MenuCountBadge count={lowStockCount} color="#f59e0b" textColor="#000" />
          )}
        </Flex>
      ),
    });
  }
  if (allow('read', 'Network')) {
    assetChildren.push({
      key: '/network',
      icon: <NavIconWithBadge icon={<GlobalOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Network & IPAM',
      title: 'Network & IPAM',
    });
  }

  if (assetChildren.length > 0) {
    items.push({ type: 'divider' });
    items.push({
      key: 'group-assets',
      type: 'group',
      label: showLabels ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}
        >
          ASSETS & INVENTORY
        </span>
      ) : undefined,
      children: assetChildren,
    });
  }

  // Analytics & Governance Group
  const govChildren: NonNullable<MenuProps['items']> = [];
  if (allow('read', 'Report')) {
    govChildren.push({
      key: '/reports',
      icon: <NavIconWithBadge icon={<BarChartOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Reports & Analytics',
      title: 'Reports & Analytics',
    });
  }
  if (allow('read', 'Audit')) {
    govChildren.push({
      key: '/audit',
      icon: <NavIconWithBadge icon={<AuditOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Audit Trail',
      title: 'Audit Trail',
    });
  }
  if (allow('read', 'Setting')) {
    govChildren.push({
      key: '/settings',
      icon: <NavIconWithBadge icon={<SettingOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Settings',
      title: 'Settings',
    });
  }

  if (govChildren.length > 0) {
    items.push({ type: 'divider' });
    items.push({
      key: 'group-governance',
      type: 'group',
      label: showLabels ? (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
          }}
        >
          ANALYTICS & GOVERNANCE
        </span>
      ) : undefined,
      children: govChildren,
    });
  }

  return items;
}
