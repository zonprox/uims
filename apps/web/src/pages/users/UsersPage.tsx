import {
  ApartmentOutlined,
  BranchesOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  DesktopOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  IdcardOutlined,
  KeyOutlined,
  LaptopOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  ShareAltOutlined,
  StopOutlined,
  SyncOutlined,
  TeamOutlined,
  UploadOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  DirectoryGroup,
  OrganizationalUnit,
  PermissionCatalogSubject,
  Role,
  RoleSummaryStats,
  User,
  UserStatus,
  UserSummaryStats,
} from '@uims/shared-types';
import {
  Alert,
  App,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { FormattedDateTime } from '../../components/FormattedDate';
import PageContainer from '../../components/PageContainer';
import { rolesService } from '../../services/roles.service';
import { usersService } from '../../services/users.service';
import { ImportAdModal } from './components/ImportAdModal';
import { OrganizationalUnitsTab } from './components/OrganizationalUnitsTab';
import { RolesTab } from './components/RolesTab';

const { Text, Title } = Typography;
const { Option } = Select;

function generateStrongPassword(prefix = 'Ad'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 4; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}#${randomStr}${digits}!`;
}

export default function UsersPage() {
  const { message } = App.useApp();

  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<DirectoryGroup[]>([]);
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesStats, setRolesStats] = useState<RoleSummaryStats | null>(null);
  const [rolesCatalog, setRolesCatalog] = useState<PermissionCatalogSubject[]>([]);
  const [stats, setStats] = useState<UserSummaryStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    custodiansCount: 0,
    suspendedUsers: 0,
    recentActiveCount: 0,
    totalGroups: 0,
    totalWorkstations: 0,
    lockedCount: 0,
    totalOUs: 6,
  });

  const [loading, setLoading] = useState(false);
  const [syncingDomain, setSyncingDomain] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('users');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [adGroupFilter, setAdGroupFilter] = useState('all');
  const [ouFilter, setOuFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Password Visibility Toggle per row
  const [visibleAdPasswords, setVisibleAdPasswords] = useState<Record<string, boolean>>({});

  // Modals & Drawers
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupSubmitting, setGroupSubmitting] = useState(false);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();

  const toggleAdPasswordVisibility = (userId: string) => {
    setVisibleAdPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${label} to clipboard!`);
  };

  const copyCredentials = (user: User) => {
    const username = user.username || user.email.split('@')[0];
    const adPass = user.adInitialPassword || `Ad#${username}2026!`;
    const text = `======================================================================
ACTIVE DIRECTORY IDENTITY & WINDOWS WORKSTATION ONBOARDING SLIP
======================================================================
[IDENTITY & LOGON ATTRIBUTES]
- Full Name: ${user.fullName || user.displayName || username}
- Corporate Employee ID: ${user.employeeCode || 'N/A'}
- sAMAccountName / Domain Logon ID: ${username}
- UserPrincipalName (UPN): ${user.email}
- Initial Domain Password: ${adPass}

[ORGANIZATIONAL PLACEMENT]
- Business Entity (Company): ${user.company || 'BSL Others'}
- Manufacturing Plant / Facility: ${user.plant || 'BSL Others'}
- Department / Division: ${user.department || 'Production'}
- Section / Sub-Section: ${user.section || 'General'}${user.subSection ? ` (Sub: ${user.subSection})` : ''}
- Canonical OU Path: ${user.ouPath || 'OU=Production,DC=uims,DC=internal'}
- Reporting Manager: ${user.managerName || 'Domain Administrator'}

[WORKSTATIONS & NETWORK]
- Assigned Workstation Hostname (Computer Name): ${user.computerName || 'Unassigned'}
- Secondary Device: ${user.computerName2 || 'None'}
- Primary AD Security Group: ${user.adGroup || 'Standard Users'}
- Telephone / Extension: ${user.telephone || user.phone || 'N/A'}
- Primary Domain Controller: DC01-PRIMARY.corp.uims.internal
- Kerberos Realm / Domain: uims.internal
======================================================================`;
    navigator.clipboard.writeText(text);
    message.success(`Copied domain onboarding slip for ${user.fullName || username}`);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, groupsData, ousData, statsData, rolesList, rStats, rCatalog] =
        await Promise.all([
          usersService.getUsers({
            search: search || undefined,
            role: roleFilter !== 'all' ? roleFilter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            department: deptFilter !== 'all' ? deptFilter : undefined,
            section: sectionFilter !== 'all' ? sectionFilter : undefined,
            company: companyFilter !== 'all' ? companyFilter : undefined,
            adGroup: adGroupFilter !== 'all' ? adGroupFilter : undefined,
            ouPath: ouFilter !== 'all' ? ouFilter : undefined,
            source: sourceFilter !== 'all' ? sourceFilter : undefined,
            pageSize: 100,
          }),
          usersService.getGroups().catch(() => []),
          usersService.getOrganizationalUnits().catch(() => []),
          usersService.getStats().catch(() => null),
          rolesService.getRoles().catch(() => []),
          rolesService.getStats().catch(() => null),
          rolesService.getCatalog().catch(() => []),
        ]);

      const items = usersData.items || [];

      setUsers(items);
      setGroups(groupsData || []);
      setOrganizationalUnits(ousData || []);
      setRoles(rolesList || []);
      setRolesStats(rStats);
      setRolesCatalog(rCatalog || []);

      if (statsData) {
        setStats(statsData);
      } else {
        const total = items.length;
        const active = items.filter((u) => u.status === 'ACTIVE').length;
        const admins = items.filter(
          (u) => u.roleName === 'Super Admin' || u.roleName === 'Admin',
        ).length;
        const suspended = items.filter((u) => u.status === 'SUSPENDED' || u.isClosed).length;
        const workstations = items.filter(
          (u) => !!u.computerName || (u.assignedAssetsCount || 0) > 0,
        ).length;
        setStats({
          totalUsers: total,
          activeUsers: active,
          adminUsers: admins,
          custodiansCount: workstations,
          suspendedUsers: suspended,
          recentActiveCount: active,
          totalGroups: groupsData?.length || 0,
          totalWorkstations: workstations,
          lockedCount: 0,
          totalOUs: ousData?.length || 6,
        });
      }
    } catch (err) {
      console.error('Failed to load system users:', err);
      message.error('Failed to load accounts from Domain Controller');
    } finally {
      setLoading(false);
    }
  }, [
    adGroupFilter,
    companyFilter,
    deptFilter,
    message,
    ouFilter,
    roleFilter,
    search,
    sectionFilter,
    sourceFilter,
    statusFilter,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncDomain = async () => {
    setSyncingDomain(true);
    try {
      const res = await usersService.syncDomain();
      message.success(
        `Active Directory Domain Controller synchronized: ${res.replicatedObjects} objects replicated (${res.latencyMs}ms latency)`,
      );
      loadData();
    } catch {
      message.error('Failed to replicate Active Directory domain');
    } finally {
      setSyncingDomain(false);
    }
  };

  const handleExportMaster = async () => {
    try {
      message.loading({ content: 'Exporting Active Directory Master Dataset...', key: 'export' });
      const records = await usersService.exportUsers();
      if (!records || records.length === 0) {
        message.warning({ content: 'No Active Directory records to export.', key: 'export' });
        return;
      }

      const headers = Object.keys(records[0]);
      const csvRows = [
        headers.join(','),
        ...records.map((row) =>
          headers
            .map((h) => {
              const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(','),
        ),
      ];
      const csvString = csvRows.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Active_Directory_Enterprise_Master_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success({
        content: `Exported ${records.length} Active Directory records successfully!`,
        key: 'export',
      });
    } catch (err) {
      console.error('Export failed:', err);
      message.error({ content: 'Failed to export Active Directory dataset.', key: 'export' });
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    const generatedPass = generateStrongPassword('Ad');
    form.setFieldsValue({
      status: 'ACTIVE',
      roleName: 'Employee',
      source: 'LOCAL',
      adInitialPassword: generatedPass,
      password: generatedPass,
      company: 'BSL Others',
      groupCompany: 'BSL',
      plant: 'BSL Others',
      department: 'Production',
      section: 'Printing',
      subSection: 'Printing',
      adGroup: 'GR_BSLOTHPrinting',
      ouPath: 'OU=Production,DC=uims,DC=internal',
      isClosed: false,
    });
    setUserModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      employeeCode: user.employeeCode,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName || user.fullName,
      email: user.email,
      jobTitle: user.jobTitle,
      company: user.company || 'BSL Others',
      groupCompany: user.groupCompany || 'BSL',
      plant: user.plant || 'BSL Others',
      department: user.department || 'Production',
      section: user.section || 'Printing',
      subSection: user.subSection || user.section || 'Printing',
      computerName: user.computerName,
      computerName2: user.computerName2,
      adGroup: user.adGroup,
      ouPath: user.ouPath || 'OU=Production,DC=uims,DC=internal',
      managerName: user.managerName,
      telephone: user.telephone || user.phone,
      roleName: user.roleName || user.role?.name || 'Employee',
      status: user.status,
      source: user.source || 'LOCAL',
      phone: user.phone,
      location: user.location,
      adInitialPassword: user.adInitialPassword,
      isClosed: user.isClosed,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      setModalSubmitting(true);

      if (editingUser) {
        await usersService.updateUser(editingUser.id, values);
        message.success(`Domain User "${values.email}" updated successfully.`);
      } else {
        await usersService.createUser(values);
        message.success(
          `Domain User "${values.email}" onboarded with Active Directory credentials.`,
        );
      }

      setUserModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save domain user account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleSaveGroup = async () => {
    try {
      const values = await groupForm.validateFields();
      setGroupSubmitting(true);
      await usersService.createGroup(values);
      message.success(`Distribution Group "${values.name}" created successfully.`);
      setGroupModalOpen(false);
      groupForm.resetFields();
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to create distribution group.');
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus: UserStatus =
      user.status === 'ACTIVE' ? ('SUSPENDED' as UserStatus) : ('ACTIVE' as UserStatus);
    try {
      await usersService.toggleStatus(user.id, nextStatus);
      message.success(
        `Account ${user.email} is now ${nextStatus === 'ACTIVE' ? 'Activated' : 'Suspended'}`,
      );
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to update account status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await usersService.deleteUser(id);
      message.success('Account removed from domain');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete account');
    }
  };

  const handleShowDetails = async (user: User) => {
    try {
      const detailed = await usersService.getUser(user.id);
      setSelectedUser(detailed);
      setDetailDrawerOpen(true);
    } catch {
      setSelectedUser(user);
      setDetailDrawerOpen(true);
    }
  };

  const handleFilterByOU = (ouName: string) => {
    setSearch(ouName.split(' ')[0] || '');
    setActiveTabKey('users');
  };

  const userColumns = [
    {
      title: 'Employee ID & User',
      dataIndex: 'email',
      key: 'user',
      width: 290,
      render: (_: unknown, record: User) => {
        const name =
          record.displayName ||
          record.fullName ||
          `${record.firstName || ''} ${record.lastName || ''}`.trim() ||
          record.username;
        const initial = name ? name.charAt(0).toUpperCase() : 'U';
        const username = record.username || record.email.split('@')[0];

        return (
          <Flex align="center" gap={10}>
            <Avatar
              size={38}
              src={record.avatar}
              style={{
                backgroundColor:
                  record.source === 'AZURE_AD'
                    ? '#0284c7'
                    : record.roleName === 'Super Admin'
                      ? '#dc2626'
                      : record.roleName === 'Technician'
                        ? '#0891b2'
                        : '#1677ff',
                fontWeight: 600,
                fontSize: 13,
                flexShrink: 0,
              }}
              icon={<UserOutlined />}
            >
              {initial}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Flex align="center" gap={6} wrap>
                <Text
                  strong
                  style={{ fontSize: 13.5, cursor: 'pointer', color: '#1677ff' }}
                  onClick={() => handleShowDetails(record)}
                >
                  {name}
                </Text>
                {record.employeeCode && (
                  <Tag
                    color="geekblue"
                    style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px', margin: 0 }}
                  >
                    #{record.employeeCode}
                  </Tag>
                )}
              </Flex>
              <Flex align="center" gap={6} style={{ marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  <KeyOutlined style={{ marginRight: 3, color: '#94a3b8' }} />@{username}
                </Text>
                {record.source === 'AZURE_AD' ? (
                  <Tag
                    color="cyan"
                    style={{ fontSize: 9, padding: '0 3px', lineHeight: '14px', margin: 0 }}
                  >
                    Azure AD
                  </Tag>
                ) : (
                  <Tag
                    color="blue"
                    style={{ fontSize: 9, padding: '0 3px', lineHeight: '14px', margin: 0 }}
                  >
                    Local AD
                  </Tag>
                )}
              </Flex>
            </div>
          </Flex>
        );
      },
    },
    {
      title: 'Email & Extension',
      key: 'emailExt',
      width: 230,
      render: (_: unknown, record: User) => (
        <Flex vertical gap={2}>
          <Flex align="center" gap={4}>
            <MailOutlined style={{ color: '#0ea5e9', fontSize: 12 }} />
            <Text style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{record.email}</Text>
            <Tooltip title="Copy Email">
              <Button
                type="text"
                size="small"
                style={{ width: 18, height: 18, padding: 0 }}
                icon={<CopyOutlined style={{ fontSize: 10, color: '#64748b' }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(record.email, 'Email Address');
                }}
              />
            </Tooltip>
          </Flex>
          {(record.telephone || record.phone) && (
            <Flex align="center" gap={4}>
              <PhoneOutlined style={{ color: '#10b981', fontSize: 11 }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Ext: {record.telephone || record.phone}
              </Text>
            </Flex>
          )}
        </Flex>
      ),
    },
    {
      title: 'Initial Password',
      key: 'credentials',
      width: 210,
      render: (_: unknown, record: User) => {
        const isAdVisible = visibleAdPasswords[record.id] || false;
        const username = record.username || record.email.split('@')[0];
        const adPass = record.adInitialPassword || `Ad#${username}2026!`;

        return (
          <Flex
            align="center"
            justify="space-between"
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: 11.5,
              maxWidth: 200,
            }}
          >
            <Tooltip title="Initial Password">
              <Flex align="center" gap={5}>
                <Tag
                  color="blue"
                  style={{
                    margin: 0,
                    padding: '0 3px',
                    fontSize: 9.5,
                    fontWeight: 600,
                    lineHeight: '16px',
                  }}
                >
                  AD
                </Tag>
                <Text code style={{ fontSize: 11, fontWeight: 500 }}>
                  {isAdVisible ? adPass : '••••••••••'}
                </Text>
              </Flex>
            </Tooltip>
            <Flex gap={2}>
              <Button
                type="text"
                size="small"
                style={{ width: 20, height: 20, padding: 0 }}
                icon={
                  isAdVisible ? (
                    <EyeInvisibleOutlined style={{ fontSize: 11 }} />
                  ) : (
                    <EyeOutlined style={{ fontSize: 11 }} />
                  )
                }
                onClick={() => toggleAdPasswordVisibility(record.id)}
              />
              <Tooltip title="Copy Initial Password">
                <Button
                  type="text"
                  size="small"
                  style={{ width: 20, height: 20, padding: 0 }}
                  icon={<CopyOutlined style={{ fontSize: 11 }} />}
                  onClick={() => copyToClipboard(adPass, 'AD Password')}
                />
              </Tooltip>
            </Flex>
          </Flex>
        );
      },
    },
    {
      title: 'Job Title & Role',
      key: 'dept',
      width: 190,
      render: (_: unknown, record: User) => {
        const role = record.roleName || record.role?.name || 'Employee';
        let color = 'default';
        if (role === 'Super Admin') color = 'error';
        else if (role === 'Admin') color = 'magenta';
        else if (role === 'Technician' || role === 'IT Specialist') color = 'cyan';
        else if (role === 'Manager') color = 'purple';
        else if (role === 'Auditor') color = 'orange';

        return (
          <div>
            <Text strong style={{ fontSize: 12.5, display: 'block' }}>
              {record.jobTitle || 'Employee'}
            </Text>
            <Tag
              color={color}
              style={{ fontSize: 10, margin: '3px 0 0', padding: '0 4px', lineHeight: '16px' }}
            >
              {role}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Company & Plant',
      key: 'companyPlant',
      width: 170,
      render: (_: unknown, record: User) => (
        <div>
          <Text strong style={{ fontSize: 12, display: 'block' }}>
            {record.company || record.groupCompany || 'BSL Others'}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.plant || 'Main Plant'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Department & Section',
      key: 'section',
      width: 190,
      render: (_: unknown, record: User) => (
        <div>
          <Flex align="center" gap={6}>
            <Text strong style={{ fontSize: 12 }}>
              {record.section || record.department || 'Production'}
            </Text>
          </Flex>
          {record.subSection && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
              ↳ {record.subSection}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Assigned Workstation',
      key: 'computer',
      width: 180,
      render: (_: unknown, record: User) => {
        const pc = record.computerName;
        const count = record.assignedAssetsCount || 0;

        return (
          <Flex vertical gap={3}>
            {pc ? (
              <Flex align="center" gap={4}>
                <DesktopOutlined style={{ color: '#0ea5e9', fontSize: 12 }} />
                <Tag
                  color="cyan"
                  style={{ margin: 0, fontSize: 11, fontWeight: 500, padding: '0 6px' }}
                >
                  {pc}
                </Tag>
                <Tooltip title="Copy Hostname">
                  <Button
                    type="text"
                    size="small"
                    style={{ width: 18, height: 18, padding: 0 }}
                    icon={<CopyOutlined style={{ fontSize: 10 }} />}
                    onClick={() => copyToClipboard(pc, 'Computer Hostname')}
                  />
                </Tooltip>
              </Flex>
            ) : count > 0 ? (
              <Tag
                icon={<LaptopOutlined />}
                color="processing"
                style={{ margin: 0, fontSize: 10.5 }}
              >
                {count} Assigned Assets
              </Tag>
            ) : (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Unassigned
              </Text>
            )}
            {record.computerName2 && (
              <Text type="secondary" style={{ fontSize: 10 }}>
                Secondary: {record.computerName2}
              </Text>
            )}
          </Flex>
        );
      },
    },
    {
      title: 'Security Group',
      key: 'adGroup',
      width: 190,
      render: (_: unknown, record: User) => {
        const grp = record.adGroup;
        if (!grp)
          return (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Standard Users
            </Text>
          );

        return (
          <Tag
            color="purple"
            style={{
              fontSize: 10.5,
              padding: '1px 6px',
              borderRadius: 4,
              fontWeight: 500,
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {grp}
          </Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: UserStatus, record: User) => {
        const isClosed = record.isClosed || status === 'SUSPENDED';
        return (
          <Tag color={isClosed ? 'error' : status === 'ACTIVE' ? 'success' : 'default'}>
            {isClosed ? 'CLOSED' : status}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 170,
      fixed: 'right' as const,
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Tooltip title="Copy Logon Slip">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<IdcardOutlined style={{ color: '#1677ff' }} />}
              onClick={() => copyCredentials(record)}
            />
          </Tooltip>
          <Tooltip title="View User Details">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<UserOutlined />}
              onClick={() => handleShowDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit User">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Tooltip title={record.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}>
            <Popconfirm
              title={
                record.status === 'ACTIVE' ? 'Suspend this account?' : 'Activate this account?'
              }
              onConfirm={() => handleToggleStatus(record)}
            >
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={
                  record.status === 'ACTIVE' ? (
                    <StopOutlined style={{ color: '#ef4444' }} />
                  ) : (
                    <CheckCircleOutlined style={{ color: '#10b981' }} />
                  )
                }
              />
            </Popconfirm>
          </Tooltip>
          <Popconfirm
            title="Delete this user account?"
            description="All session tokens and credentials will be revoked."
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Tooltip title="Delete">
              <Button type="text" shape="circle" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="Users & Access"
      subtitle="Manage user accounts, Active Directory synchronization, groups, and role-based permissions."
      breadcrumbs={[{ title: 'Users & Access' }]}
      stats={[
        {
          title: 'Total Users',
          value: stats.totalUsers,
          prefix: <TeamOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Active Users',
          value: stats.activeUsers,
          prefix: <CheckCircleOutlined />,
          color: '#10b981',
        },
        {
          title: 'Assigned Workstations',
          value: stats.totalWorkstations ?? stats.custodiansCount ?? stats.activeUsers,
          prefix: <DesktopOutlined />,
          color: '#0ea5e9',
        },
        {
          title: 'Groups',
          value: stats.totalGroups ?? groups.length,
          prefix: <ShareAltOutlined />,
          color: '#8b5cf6',
        },
        {
          title: 'Suspended Accounts',
          value: stats.suspendedUsers,
          prefix: <LockOutlined />,
          color: stats.suspendedUsers > 0 ? '#ef4444' : '#94a3b8',
        },
      ]}
      extra={
        <Flex gap={8} wrap>
          <Tooltip title="Sync with Active Directory">
            <Button
              icon={<SyncOutlined spin={syncingDomain || loading} />}
              onClick={handleSyncDomain}
            >
              Sync Directory
            </Button>
          </Tooltip>
          <Button icon={<DownloadOutlined />} onClick={handleExportMaster}>
            Export CSV
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
            Import Users
          </Button>
          <Button icon={<ApartmentOutlined />} onClick={() => setGroupModalOpen(true)}>
            Create Group
          </Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={handleOpenCreateModal}>
            Create User
          </Button>
        </Flex>
      }
    >
      {/* Active Directory & Identity Architecture Banner */}
      <Alert
        type="info"
        showIcon
        icon={<SyncOutlined style={{ color: '#1677ff' }} />}
        style={{ marginBottom: 16, borderRadius: 8 }}
        title={
          <Flex justify="space-between" align="center" wrap gap={8}>
            <div>
              <Text strong>Active Directory & Identity Architecture: </Text>
              <Text style={{ fontSize: 13 }}>
                Multi-tenant LDAP / Kerberos identity federation with Microsoft Entra ID and local
                Domain Controllers. Unified identity links Windows PC login, console credentials,
                and physical workshop assets.
              </Text>
            </div>
            <Flex gap={6}>
              <Tag color="processing" style={{ margin: 0, fontWeight: 500 }}>
                Domain: uims.internal
              </Tag>
              <Tag color="geekblue" style={{ margin: 0, fontWeight: 500 }}>
                Primary DC: DC01-PRIMARY
              </Tag>
            </Flex>
          </Flex>
        }
      />

      <Tabs
        activeKey={activeTabKey}
        onChange={setActiveTabKey}
        items={[
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined /> Users ({users.length})
              </span>
            ),
            children: (
              <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
                <Row
                  gutter={[12, 12]}
                  align="middle"
                  justify="space-between"
                  style={{ marginBottom: 16 }}
                >
                  <Col xs={24} md={6}>
                    <Input
                      placeholder="Search by name, ID, email, PC hostname, AD group, OU..."
                      prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} md={18}>
                    <Flex gap={8} justify="flex-end" wrap>
                      <Select
                        value={companyFilter}
                        onChange={setCompanyFilter}
                        style={{ width: 140 }}
                        placeholder="Company"
                      >
                        <Option value="all">All Companies</Option>
                        <Option value="BSL">BSL Global</Option>
                        <Option value="BSL Others">BSL Others</Option>
                        <Option value="BSL-1">BSL-1 Plant</Option>
                        <Option value="Acme Enterprise">Acme Enterprise</Option>
                      </Select>

                      <Select
                        value={deptFilter}
                        onChange={setDeptFilter}
                        style={{ width: 150 }}
                        placeholder="Department"
                      >
                        <Option value="all">All Departments</Option>
                        <Option value="Production">Production</Option>
                        <Option value="IT & Infrastructure">IT & Infrastructure</Option>
                        <Option value="Engineering">Engineering</Option>
                        <Option value="Product & Design">Product & Design</Option>
                        <Option value="Marketing">Marketing</Option>
                        <Option value="Finance">Finance</Option>
                        <Option value="Human Resources">Human Resources</Option>
                        <Option value="Sales">Sales</Option>
                        <Option value="Security & Compliance">Security & Compliance</Option>
                      </Select>

                      <Select
                        value={sectionFilter}
                        onChange={setSectionFilter}
                        style={{ width: 140 }}
                        placeholder="Section"
                      >
                        <Option value="all">All Sections</Option>
                        <Option value="Printing">Printing</Option>
                        <Option value="Sample">Sample</Option>
                        <Option value="Embroidery">Embroidery</Option>
                        <Option value="Production Office">Production Office</Option>
                        <Option value="Cutting">Cutting</Option>
                        <Option value="Quality Assurance">Quality Assurance</Option>
                      </Select>

                      <Select
                        value={adGroupFilter}
                        onChange={setAdGroupFilter}
                        style={{ width: 170 }}
                        placeholder="Security Group"
                      >
                        <Option value="all">All AD Groups</Option>
                        <Option value="GR_BSLOTHPrinting">GR_BSLOTHPrinting</Option>
                        <Option value="GR_BSLOTHSample">GR_BSLOTHSample</Option>
                        <Option value="GR_BSLOTHLogo Embroidery">GR_BSLOTHLogo Embroidery</Option>
                        <Option value="GR_BSL1Production Office">GR_BSL1Production Office</Option>
                        <Option value="GR_BSL1Cutting">GR_BSL1Cutting</Option>
                      </Select>

                      <Select
                        value={roleFilter}
                        onChange={setRoleFilter}
                        style={{ width: 130 }}
                        placeholder="Role"
                      >
                        <Option value="all">All Roles</Option>
                        <Option value="Super Admin">Super Admin</Option>
                        <Option value="Admin">Admin</Option>
                        <Option value="Technician">Technician</Option>
                        <Option value="Manager">Manager</Option>
                        <Option value="Auditor">Auditor</Option>
                        <Option value="Employee">Employee</Option>
                      </Select>

                      <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 110 }}
                        placeholder="Status"
                      >
                        <Option value="all">All Status</Option>
                        <Option value="ACTIVE">Active</Option>
                        <Option value="SUSPENDED">Suspended</Option>
                        <Option value="INACTIVE">Closed</Option>
                      </Select>

                      {(search ||
                        roleFilter !== 'all' ||
                        statusFilter !== 'all' ||
                        deptFilter !== 'all' ||
                        sectionFilter !== 'all' ||
                        companyFilter !== 'all' ||
                        adGroupFilter !== 'all' ||
                        ouFilter !== 'all' ||
                        sourceFilter !== 'all') && (
                        <Button
                          onClick={() => {
                            setSearch('');
                            setRoleFilter('all');
                            setStatusFilter('all');
                            setDeptFilter('all');
                            setSectionFilter('all');
                            setCompanyFilter('all');
                            setAdGroupFilter('all');
                            setOuFilter('all');
                            setSourceFilter('all');
                          }}
                        >
                          Reset
                        </Button>
                      )}
                    </Flex>
                  </Col>
                </Row>

                <Table
                  columns={userColumns}
                  dataSource={users}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 1500 }}
                  pagination={{
                    pageSize: 15,
                    showSizeChanger: true,
                    pageSizeOptions: ['15', '30', '50', '100'],
                    showTotal: (total) => `Total ${total} accounts`,
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'groups',
            label: (
              <span>
                <ShareAltOutlined /> Groups ({groups.length})
              </span>
            ),
            children: (
              <div>
                <Flex justify="space-between" align="center" style={{ marginBottom: 14 }}>
                  <div>
                    <Title level={5} style={{ margin: 0 }}>
                      Security & Distribution Groups
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Synchronized distribution lists, plant access groups, and department
                      permission scopes.
                    </Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setGroupModalOpen(true)}
                  >
                    Create Group
                  </Button>
                </Flex>

                <Row gutter={[14, 14]}>
                  {groups.map((group) => (
                    <Col xs={24} sm={12} lg={8} key={group.id}>
                      <Card
                        size="small"
                        title={
                          <Flex align="center" gap={8}>
                            <ApartmentOutlined style={{ color: '#1677ff' }} />
                            <span>{group.name}</span>
                          </Flex>
                        }
                        extra={
                          <Tag color={group.scope?.includes('Security') ? 'purple' : 'blue'}>
                            {group.scope || 'AD Group'}
                          </Tag>
                        }
                        styles={{ body: { padding: '14px 16px' } }}
                      >
                        <Flex vertical gap={8}>
                          <Flex align="center" justify="space-between" gap={6}>
                            <Flex align="center" gap={6}>
                              <MailOutlined style={{ color: '#0ea5e9' }} />
                              <Text code style={{ fontSize: 12 }}>
                                {group.email}
                              </Text>
                            </Flex>
                            <Tooltip title="Copy Distribution Email">
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => copyToClipboard(group.email || '', 'Group Email')}
                              />
                            </Tooltip>
                          </Flex>

                          {group.description && (
                            <Text type="secondary" style={{ fontSize: 11.5, minHeight: 32 }}>
                              {group.description}
                            </Text>
                          )}

                          <Divider style={{ margin: '6px 0' }} />

                          <Flex justify="space-between" style={{ fontSize: 12 }}>
                            <Text type="secondary">Members Count:</Text>
                            <Badge
                              count={`${group.memberCount} members`}
                              style={{ backgroundColor: '#52c41a' }}
                            />
                          </Flex>
                          <Flex justify="space-between" style={{ fontSize: 12 }}>
                            <Text type="secondary">Managed By:</Text>
                            <Text strong style={{ fontSize: 11.5 }}>
                              {group.managedBy || 'Domain Admin'}
                            </Text>
                          </Flex>
                        </Flex>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ),
          },
          {
            key: 'ous',
            label: (
              <span>
                <BranchesOutlined /> Organizational Units ({organizationalUnits.length})
              </span>
            ),
            children: (
              <OrganizationalUnitsTab
                units={organizationalUnits}
                totalUsers={stats.totalUsers}
                onFilterByOU={handleFilterByOU}
              />
            ),
          },
          {
            key: 'roles',
            label: (
              <span>
                <SafetyCertificateOutlined /> Roles & Permissions ({roles.length})
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

      {/* Create / Edit User Modal */}
      <Modal
        title={editingUser ? `Edit User: ${editingUser.email}` : 'Create User'}
        open={userModalOpen}
        onOk={handleSaveUser}
        onCancel={() => setUserModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={760}
        okText={editingUser ? 'Save Changes' : 'Create User'}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Employee Code"
                name="employeeCode"
                extra="Corporate badge identifier."
              >
                <Input placeholder="e.g. 63020037" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please enter a username.' }]}
                extra="Account logon identifier."
              >
                <Input placeholder="e.g. thaotn.st" disabled={!!editingUser} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Email Address"
                name="email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input placeholder="e.g. thaotn.st@youngonevn.com" disabled={!!editingUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Telephone / Extension" name="telephone">
                <Input placeholder="e.g. 888152675" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Full Name" name="displayName" rules={[{ required: true }]}>
                <Input placeholder="e.g. Truong Ngoc Thao" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Job Title" name="jobTitle" rules={[{ required: true }]}>
                <Input placeholder="e.g. Asst. Officer, Pattern Marker, Supervisor" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={8}>
              <Form.Item label="Group Company" name="groupCompany">
                <Input placeholder="e.g. BSL" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Company" name="company">
                <Input placeholder="e.g. BSL Others, BSL-1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Plant / Location" name="plant">
                <Input placeholder="e.g. BSL Others, 1 BSL-1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={8}>
              <Form.Item label="Department" name="department" rules={[{ required: true }]}>
                <Select>
                  <Option value="Production">Production</Option>
                  <Option value="IT & Infrastructure">IT & Infrastructure</Option>
                  <Option value="Engineering">Engineering</Option>
                  <Option value="Product & Design">Product & Design</Option>
                  <Option value="Marketing">Marketing</Option>
                  <Option value="Finance">Finance</Option>
                  <Option value="Human Resources">Human Resources</Option>
                  <Option value="Security & Compliance">Security & Compliance</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Section" name="section">
                <Input placeholder="e.g. Printing, Sample, Embroidery" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Sub-Section" name="subSection">
                <Input placeholder="e.g. Logo Embroidery, Printing" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Assigned Workstation Hostname"
                name="computerName"
                extra="Computer hostname."
              >
                <Input placeholder="e.g. STOTHPR102, STOTHSAM04" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Security Group" name="adGroup">
                <Select placeholder="Select Security Group" allowClear>
                  <Option value="GR_BSLOTHPrinting">GR_BSLOTHPrinting</Option>
                  <Option value="GR_BSLOTHSample">GR_BSLOTHSample</Option>
                  <Option value="GR_BSLOTHLogo Embroidery">GR_BSLOTHLogo Embroidery</Option>
                  <Option value="GR_BSL1Production Office">GR_BSL1Production Office</Option>
                  <Option value="GR_BSL1Cutting">GR_BSL1Cutting</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Organizational Unit" name="ouPath">
                <Select>
                  <Option value="OU=Production-BSLOthers,DC=uims,DC=internal">
                    OU=Production-BSLOthers,DC=uims,DC=internal
                  </Option>
                  <Option value="OU=Production-BSL1,DC=uims,DC=internal">
                    OU=Production-BSL1,DC=uims,DC=internal
                  </Option>
                  <Option value="OU=IT-Infrastructure,DC=uims,DC=internal">
                    OU=IT-Infrastructure,DC=uims,DC=internal
                  </Option>
                  <Option value="OU=Engineering,DC=uims,DC=internal">
                    OU=Engineering,DC=uims,DC=internal
                  </Option>
                  <Option value="OU=Corporate-Services,DC=uims,DC=internal">
                    OU=Corporate-Services,DC=uims,DC=internal
                  </Option>
                  <Option value="OU=Executive,DC=uims,DC=internal">
                    OU=Executive,DC=uims,DC=internal
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Manager" name="managerName">
                <Input placeholder="e.g., Nguyen Doan Quang Huy" />
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Row gutter={14}>
              <Col span={12}>
                <Form.Item
                  label="Initial Password"
                  name="adInitialPassword"
                  rules={[{ required: true, min: 6 }]}
                  extra="Initial password for logon."
                >
                  <Input.Password placeholder="••••••••••••" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Directory Source" name="source" rules={[{ required: true }]}>
                  <Select>
                    <Option value="LOCAL">Local Active Directory</Option>
                    <Option value="AZURE_AD">Azure Active Directory / Entra ID</Option>
                    <Option value="LDAP">LDAP Corporate Directory</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Role" name="roleName" rules={[{ required: true }]}>
                <Select placeholder="Select role">
                  {roles.length > 0 ? (
                    roles.map((r) => (
                      <Option key={r.id} value={r.name}>
                        {r.name}
                      </Option>
                    ))
                  ) : (
                    <>
                      <Option value="Super Admin">Super Admin (Full Root Access)</Option>
                      <Option value="Admin">Admin (Infrastructure & Assets)</Option>
                      <Option value="Technician">Technician (IT Helpdesk)</Option>
                      <Option value="Manager">Manager (Supervisor)</Option>
                      <Option value="Auditor">Auditor (Compliance)</Option>
                      <Option value="Employee">Employee (Standard Access)</Option>
                    </>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Status" name="status" rules={[{ required: true }]}>
                <Select>
                  <Option value="ACTIVE">Active</Option>
                  <Option value="SUSPENDED">Suspended</Option>
                  <Option value="INACTIVE">Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Distribution Group Modal */}
      <Modal
        title="Create Group"
        open={groupModalOpen}
        onOk={handleSaveGroup}
        onCancel={() => setGroupModalOpen(false)}
        confirmLoading={groupSubmitting}
        okText="Create Group"
      >
        <Form form={groupForm} layout="vertical" style={{ marginTop: 14 }}>
          <Form.Item
            label="Group Name"
            name="name"
            rules={[{ required: true, message: 'Please enter a group name.' }]}
          >
            <Input placeholder="e.g. GR_BSLOTHPrinting" />
          </Form.Item>
          <Form.Item label="Group Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined />} placeholder="e.g. gr-bsloth-printing@youngonevn.com" />
          </Form.Item>
          <Form.Item label="Security Scope" name="scope" initialValue="AD Security Group">
            <Select>
              <Option value="AD Security Group">AD Security Group (Access Control)</Option>
              <Option value="Internal Only">Internal Only (Staff Distribution)</Option>
              <Option value="Public / External Allowed">Public / External Inbound Allowed</Option>
              <Option value="Restricted / Security High">Restricted / Security High</Option>
              <Option value="Confidential / Board Level">Confidential / Board Level</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea
              rows={2}
              placeholder="Description of the group membership and responsibilities"
            />
          </Form.Item>
          <Form.Item label="Managed By" name="managedBy" initialValue="IT Admin">
            <Input placeholder="e.g. Nguyen Doan Quang Huy" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Batch Importer Modal */}
      <ImportAdModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false);
          loadData();
        }}
      />

      {/* User Details Drawer */}
      {selectedUser && (
        <Drawer
          title={
            <Flex align="center" gap={8}>
              <Avatar size="small" style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
              <span>
                {selectedUser.displayName ||
                  selectedUser.fullName ||
                  `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim() ||
                  selectedUser.username}
              </span>
              {selectedUser.employeeCode && (
                <Tag color="geekblue">#{selectedUser.employeeCode}</Tag>
              )}
              <Tag color={selectedUser.status === 'ACTIVE' ? 'success' : 'error'}>
                {selectedUser.isClosed ? 'CLOSED' : selectedUser.status}
              </Tag>
            </Flex>
          }
          styles={{ wrapper: { width: 580 } }}
          open={detailDrawerOpen}
          onClose={() => setDetailDrawerOpen(false)}
          extra={
            <Space size="small">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyCredentials(selectedUser)}
              >
                Copy Logon Slip
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setDetailDrawerOpen(false);
                  handleOpenEditModal(selectedUser);
                }}
              >
                Edit
              </Button>
            </Space>
          }
        >
          <Descriptions
            title="User Profile & Credentials"
            size="small"
            column={1}
            bordered
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Employee Code">
              <Text strong code>
                #{selectedUser.employeeCode || 'N/A'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Username">
              <Text strong code>
                @{selectedUser.username}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Email Address">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Initial Password">
              <Text code>{selectedUser.adInitialPassword || '••••••••••'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Organizational Unit">
              <Text code style={{ fontSize: 11 }}>
                {selectedUser.ouPath || 'OU=Production,DC=uims,DC=internal'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Directory Source">
              <Tag color="blue">{selectedUser.source || 'LOCAL'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Job Title">
              {selectedUser.jobTitle || 'Employee'}
            </Descriptions.Item>
            <Descriptions.Item label="Role">
              <Tag color="blue">
                {selectedUser.roleName || selectedUser.role?.name || 'Employee'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Company">
              {selectedUser.company || selectedUser.groupCompany || 'BSL Others'}
            </Descriptions.Item>
            <Descriptions.Item label="Plant / Location">
              {selectedUser.plant || 'BSL Others'}
            </Descriptions.Item>
            <Descriptions.Item label="Department / Section">
              {selectedUser.department || 'Production'} • {selectedUser.section || 'General'}
              {selectedUser.subSection && ` (Sub: ${selectedUser.subSection})`}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Workstation">
              {selectedUser.computerName ? (
                <Tag color="cyan">{selectedUser.computerName}</Tag>
              ) : (
                'Unassigned'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Security Group">
              {selectedUser.adGroup ? (
                <Tag color="purple">{selectedUser.adGroup}</Tag>
              ) : (
                'Standard Users'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Telephone / Extension">
              {selectedUser.telephone || selectedUser.phone || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Active Session">
              {selectedUser.lastLoginAt ? (
                <FormattedDateTime date={selectedUser.lastLoginAt} showOffset showTimezone />
              ) : (
                'Never logged in'
              )}
            </Descriptions.Item>
          </Descriptions>

          {selectedUser.role?.permissions && selectedUser.role.permissions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Permissions ({selectedUser.role.permissions.length}):
              </Text>
              <Flex gap={6} wrap="wrap">
                {selectedUser.role.permissions.map((p, idx) => {
                  const perm = p as unknown as {
                    id?: string;
                    permissionId?: string;
                    name?: string;
                    action?: string;
                    resource?: string;
                    subject?: string;
                    permission?: {
                      action?: string;
                      subject?: string;
                      resource?: string;
                      name?: string;
                    };
                  };
                  const key = perm.id || perm.permissionId || String(idx);
                  const label =
                    perm.name ||
                    (perm.permission
                      ? `${perm.permission.action || ''} ${perm.permission.subject || perm.permission.resource || ''}`.trim()
                      : `${perm.action || ''} ${perm.subject || perm.resource || ''}`.trim()) ||
                    'Access Permission';

                  return (
                    <Tag key={key} color="purple">
                      {label}
                    </Tag>
                  );
                })}
              </Flex>
            </div>
          )}
        </Drawer>
      )}
    </PageContainer>
  );
}
