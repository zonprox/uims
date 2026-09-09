import {
  CheckCircleOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  AppUser,
  AppUserSummaryStats,
  PermissionCatalogSubject,
  Role,
  RoleSummaryStats,
} from '@uims/shared-types';
import { App, Button, Tabs } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { rolesService } from '../../services/roles.service';
import { usersService } from '../../services/users.service';
import { CreateRoleModal } from '../users/components/CreateRoleModal';
import { RolesTab } from '../users/components/RolesTab';
import { AppUsersTab } from './AppUsersTab';

export default function AccessControlPage() {
  const { message } = App.useApp();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesStats, setRolesStats] = useState<RoleSummaryStats | null>(null);
  const [rolesCatalog, setRolesCatalog] = useState<PermissionCatalogSubject[]>([]);
  const [stats, setStats] = useState<AppUserSummaryStats | null>(null);

  const [loading, setLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('users');

  // Modal triggers
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, statsRes, catalogRes, rStatsRes] = await Promise.all([
        usersService.getUsers({ limit: 100 }),
        rolesService.getRoles().catch(() => []),
        usersService.getStats().catch(() => null),
        rolesService.getCatalog().catch(() => []),
        rolesService.getStats().catch(() => null),
      ]);

      const items = Array.isArray(usersRes) ? usersRes : usersRes?.items || [];
      setUsers(items as AppUser[]);
      const roleItems = Array.isArray(rolesRes)
        ? rolesRes
        : (rolesRes as { data?: Role[] })?.data || [];
      setRoles(roleItems);
      setStats(statsRes?.data ?? statsRes);
      const catalogItems = Array.isArray(catalogRes)
        ? catalogRes
        : (catalogRes as { data?: PermissionCatalogSubject[] })?.data || [];
      setRolesCatalog(catalogItems);
      setRolesStats(rStatsRes?.data ?? rStatsRes);
    } catch {
      message.error('Failed to load access control data.');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalUsersCount = stats?.totalUsers ?? users.length;
  const activeUsersCount = stats?.activeUsers ?? users.filter((u) => u.status === 'ACTIVE').length;
  const lockedUsersCount =
    stats?.lockedUsers ??
    (stats as { lockedCount?: number })?.lockedCount ??
    users.filter((u) => u.isLocked).length;
  const systemRolesCount = roles.length;

  return (
    <PageContainer
      title="Access Control"
      subtitle="Manage operator accounts, authentication status, RBAC role definitions, and access policy rules."
      breadcrumbs={[{ title: 'Access Control' }]}
      stats={[
        {
          title: 'Total Accounts',
          value: totalUsersCount,
          prefix: <UserOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active Accounts',
          value: activeUsersCount,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Locked Accounts',
          value: lockedUsersCount,
          prefix: <LockOutlined />,
          color: '#ef4444',
        },
        {
          title: 'System Roles',
          value: systemRolesCount,
          prefix: <SafetyCertificateOutlined />,
          color: '#8b5cf6',
        },
      ]}
      extra={
        <>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setCreateUserModalOpen(true)}
          >
            Create User
          </Button>
          <Button icon={<SafetyCertificateOutlined />} onClick={() => setCreateRoleModalOpen(true)}>
            Create Role
          </Button>
        </>
      }
    >
      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        size="large"
        items={[
          {
            key: 'users',
            label: (
              <span>
                <UserOutlined style={{ marginRight: 6 }} />
                Application Users ({users.length})
              </span>
            ),
            children: (
              <AppUsersTab
                users={users}
                roles={roles}
                loading={loading}
                onRefresh={loadData}
                createModalOpen={createUserModalOpen}
                setCreateModalOpen={setCreateUserModalOpen}
              />
            ),
          },
          {
            key: 'roles',
            label: (
              <span>
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                Roles & Permissions ({roles.length})
              </span>
            ),
            children: (
              <RolesTab
                roles={roles}
                stats={rolesStats}
                catalog={rolesCatalog}
                users={users}
                loading={loading}
                onRefresh={loadData}
              />
            ),
          },
        ]}
      />

      {/* Global Create Role Modal */}
      <CreateRoleModal
        open={createRoleModalOpen}
        onClose={() => setCreateRoleModalOpen(false)}
        onSuccess={() => {
          setCreateRoleModalOpen(false);
          loadData();
        }}
        catalog={rolesCatalog}
        existingRoles={roles}
      />
    </PageContainer>
  );
}
