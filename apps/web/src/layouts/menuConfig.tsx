import {
  ApartmentOutlined,
  AuditOutlined,
  BarChartOutlined,
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

export function getQuickCreateMenu(navigate: (path: string) => void): MenuProps['items'] {
  return [
    {
      key: 'new-user',
      icon: <TeamOutlined style={{ color: '#1677ff' }} />,
      label: 'New Domain User',
      onClick: () => navigate('/users'),
    },
    {
      key: 'new-dept',
      icon: <ApartmentOutlined style={{ color: '#722ed1' }} />,
      label: 'New Organization Dept',
      onClick: () => navigate('/organization'),
    },
    {
      key: 'new-asset',
      icon: <LaptopOutlined style={{ color: '#1677ff' }} />,
      label: 'New Hardware Asset',
      onClick: () => navigate('/assets'),
    },
    {
      key: 'new-inventory',
      icon: <DatabaseOutlined style={{ color: '#f59e0b' }} />,
      label: 'Manage Spare Stock',
      onClick: () => navigate('/inventory'),
    },
    {
      key: 'new-license',
      icon: <SafetyCertificateOutlined style={{ color: '#6366f1' }} />,
      label: 'New SaaS License',
      onClick: () => navigate('/licenses'),
    },
  ];
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
            {user?.email || 'admin@uims.enterprise'}
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
      label: 'Active Directory & Users',
      onClick: () => navigate('/users'),
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
      label: 'Theme & Preferences',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'audit-logs',
      icon: <AuditOutlined />,
      label: 'Asset Audit Trail',
      onClick: () => navigate('/audit'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ color: '#ef4444' }} />,
      label: <span style={{ color: '#ef4444', fontWeight: 600 }}>Sign Out Session</span>,
      onClick: handleLogout,
    },
  ];
}

export function getNavMenuItems(
  collapsed: boolean,
  isMobile: boolean,
  counts?: NavBadgeCounts,
): MenuProps['items'] {
  const isCollapsedDesktop = collapsed && !isMobile;
  const showLabels = !collapsed || isMobile;

  const expiringCount = counts?.expiringLicenses ?? 0;
  const lowStockCount = counts?.lowStockItems ?? 0;

  return [
    {
      key: '/',
      icon: <NavIconWithBadge icon={<DashboardOutlined />} isCollapsed={isCollapsedDesktop} />,
      label: 'Operations Center',
      title: 'Operations Center',
    },
    { type: 'divider' },
    {
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
      children: [
        {
          key: '/organization',
          icon: <NavIconWithBadge icon={<ApartmentOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Org Structure & Depts',
          title: 'Org Structure & Depts',
        },
        {
          key: '/users',
          icon: <NavIconWithBadge icon={<TeamOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Active Directory & Users',
          title: 'Active Directory & Enterprise Users',
        },
      ],
    },
    { type: 'divider' },
    {
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
          CORE ASSETS & INVENTORY
        </span>
      ) : undefined,
      children: [
        {
          key: '/assets',
          icon: <NavIconWithBadge icon={<LaptopOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Hardware Fleet',
          title: 'Hardware Fleet',
        },
        {
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
          title: expiringCount > 0 ? `SaaS Licenses (${expiringCount} Expiring)` : 'SaaS Licenses',
          label: (
            <Flex
              justify="space-between"
              align="center"
              style={{ width: '100%', minWidth: 0, gap: 8 }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                SaaS Licenses
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
        },
        {
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
          title:
            lowStockCount > 0 ? `Spare Stockroom (${lowStockCount} Low Stock)` : 'Spare Stockroom',
          label: (
            <Flex
              justify="space-between"
              align="center"
              style={{ width: '100%', minWidth: 0, gap: 8 }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Spare Stockroom
              </span>
              {showLabels && lowStockCount > 0 && (
                <MenuCountBadge count={lowStockCount} color="#f59e0b" textColor="#000" />
              )}
            </Flex>
          ),
        },
        {
          key: '/network',
          icon: <NavIconWithBadge icon={<GlobalOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Network & IPAM',
          title: 'Network & IPAM',
        },
      ],
    },
    { type: 'divider' },
    {
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
      children: [
        {
          key: '/reports',
          icon: <NavIconWithBadge icon={<BarChartOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Lifecycle & Valuation Reports',
          title: 'Lifecycle & Valuation Reports',
        },
        {
          key: '/audit',
          icon: <NavIconWithBadge icon={<AuditOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'Asset Audit Trail',
          title: 'Asset Audit Trail',
        },
        {
          key: '/settings',
          icon: <NavIconWithBadge icon={<SettingOutlined />} isCollapsed={isCollapsedDesktop} />,
          label: 'System Preferences',
          title: 'System Preferences',
        },
      ],
    },
  ];
}
