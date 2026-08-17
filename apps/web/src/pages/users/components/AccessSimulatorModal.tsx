import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExperimentOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { PermissionCatalogSubject, Role, User } from '@uims/shared-types';
import {
  Avatar,
  Card,
  Col,
  Flex,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import React, { useMemo, useState } from 'react';

const { Text, Title } = Typography;

interface AccessSimulatorModalProps {
  open: boolean;
  users: User[];
  roles: Role[];
  catalog: PermissionCatalogSubject[];
  onClose: () => void;
}

export const AccessSimulatorModal: React.FC<AccessSimulatorModalProps> = ({
  open,
  users,
  roles,
  catalog,
  onClose,
}) => {
  const [simulationMode, setSimulationMode] = useState<'user' | 'role'>('user');
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '');
  const [search, setSearch] = useState('');

  // Selected User / Role resolution
  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || users[0] || null;
  }, [users, selectedUserId]);

  const activeRole = useMemo(() => {
    if (simulationMode === 'role') {
      return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
    }
    if (!selectedUser) return null;
    return (
      roles.find(
        (r) =>
          r.id === selectedUser.roleId ||
          r.name.trim().toLowerCase() === (selectedUser.roleName || '').trim().toLowerCase(),
      ) || null
    );
  }, [simulationMode, selectedUser, selectedRoleId, roles]);

  const isSuperAdmin = useMemo(() => {
    if (!activeRole) return false;
    const r = activeRole.name.trim().toUpperCase();
    return r === 'SUPER ADMIN' || r === 'SUPERADMIN';
  }, [activeRole]);

  // Set of granted permission keys e.g. "Asset:create"
  const grantedPermissionKeys = useMemo(() => {
    if (isSuperAdmin) return new Set<string>(['*:*']);
    if (!activeRole?.permissions) return new Set<string>();

    const set = new Set<string>();
    activeRole.permissions.forEach((p: unknown) => {
      const pObj = p as {
        permission?: { subject: string; action: string };
        subject?: string;
        action?: string;
      };
      if (pObj.permission) {
        set.add(`${pObj.permission.subject}:${pObj.permission.action}`.toLowerCase());
      } else if (pObj.subject && pObj.action) {
        set.add(`${pObj.subject}:${pObj.action}`.toLowerCase());
      }
    });
    return set;
  }, [activeRole, isSuperAdmin]);

  const checkPermission = (subject: string, action: string): boolean => {
    if (isSuperAdmin) return true;
    const directKey = `${subject}:${action}`.toLowerCase();
    const wildcardSubjectKey = `${subject}:*`.toLowerCase();
    return (
      grantedPermissionKeys.has(directKey) ||
      grantedPermissionKeys.has(wildcardSubjectKey) ||
      grantedPermissionKeys.has('*:*')
    );
  };

  const filteredCatalog = useMemo(() => {
    return catalog.filter((cat) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        cat.displayName.toLowerCase().includes(s) ||
        cat.subject.toLowerCase().includes(s) ||
        cat.category.toLowerCase().includes(s)
      );
    });
  }, [catalog, search]);

  return (
    <Modal
      title={
        <Flex align="center" gap={8}>
          <ExperimentOutlined style={{ color: '#7c3aed', fontSize: 18 }} />
          <Title level={5} style={{ margin: 0, fontSize: 16 }}>
            Enterprise Access & Policy Simulator
          </Title>
          <Tag color="purple" style={{ margin: 0 }}>
            Policy Engine 2026
          </Tag>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={840}
      styles={{ body: { padding: '16px 20px', background: '#f8fafc' } }}
      destroyOnClose
    >
      {/* Simulator Target Selector */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
        styles={{ body: { padding: '14px 16px' } }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={8}>
            <Radio.Group
              value={simulationMode}
              onChange={(e) => setSimulationMode(e.target.value)}
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="user">Simulate User</Radio.Button>
              <Radio.Button value="role">Simulate Role</Radio.Button>
            </Radio.Group>
          </Col>
          <Col xs={24} sm={16}>
            {simulationMode === 'user' ? (
              <Select
                showSearch
                value={selectedUserId || undefined}
                onChange={setSelectedUserId}
                placeholder="Select a domain user to inspect..."
                style={{ width: '100%' }}
                filterOption={(input, option) =>
                  String(option?.label || '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={users.map((u) => ({
                  value: u.id,
                  label: `${u.displayName || `${u.firstName} ${u.lastName}`} (${u.email}) — [${u.roleName || 'Employee'}]`,
                }))}
              />
            ) : (
              <Select
                value={selectedRoleId || undefined}
                onChange={setSelectedRoleId}
                placeholder="Select an RBAC role..."
                style={{ width: '100%' }}
                options={roles.map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.isSystem ? 'System' : 'Custom'} - ${r.userCount || 0} users)`,
                }))}
              />
            )}
          </Col>
        </Row>
      </Card>

      {/* Target Status Banner */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8, background: '#fff' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
          <Flex align="center" gap={10}>
            <Avatar
              size={36}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}
            />
            <div>
              <Text strong style={{ fontSize: 14 }}>
                {simulationMode === 'user'
                  ? selectedUser?.displayName ||
                    `${selectedUser?.firstName} ${selectedUser?.lastName}`.trim()
                  : activeRole?.name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                {simulationMode === 'user'
                  ? `${selectedUser?.email} • ${selectedUser?.department || 'General'} • Role: ${activeRole?.name || 'Employee'}`
                  : `${activeRole?.description || 'Custom role evaluation'}`}
              </Text>
            </div>
          </Flex>
          <Flex align="center" gap={6}>
            {isSuperAdmin ? (
              <Tag color="gold" style={{ fontWeight: 600 }}>
                Super Admin: Full Authority (*:*)
              </Tag>
            ) : (
              <Tag color="blue" style={{ fontWeight: 600 }}>
                {grantedPermissionKeys.size} Permissions Evaluated
              </Tag>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Permissions Diagnostic Grid */}
      <Card
        size="small"
        title={
          <Flex align="center" justify="space-between" style={{ width: '100%' }}>
            <span>Module Authority Breakdown</span>
            <Input
              placeholder="Search module..."
              size="small"
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 180 }}
            />
          </Flex>
        }
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={filteredCatalog}
          rowKey="subject"
          size="small"
          pagination={false}
          columns={[
            {
              title: 'RESOURCE MODULE',
              dataIndex: 'displayName',
              key: 'displayName',
              render: (_: unknown, r: PermissionCatalogSubject) => (
                <div>
                  <Text strong style={{ fontSize: 12.5 }}>
                    {r.displayName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    {r.category}
                  </Text>
                </div>
              ),
            },
            {
              title: 'CREATE',
              key: 'create',
              align: 'center',
              width: 80,
              render: (_: unknown, r: PermissionCatalogSubject) => {
                const hasAction = r.actions.some((a) => a.action === 'create');
                if (!hasAction) return <Text type="secondary">—</Text>;
                const isGranted = checkPermission(r.subject, 'create');
                return isGranted ? (
                  <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />
                ) : (
                  <CloseCircleFilled style={{ color: '#cbd5e1', fontSize: 16 }} />
                );
              },
            },
            {
              title: 'READ',
              key: 'read',
              align: 'center',
              width: 80,
              render: (_: unknown, r: PermissionCatalogSubject) => {
                const hasAction = r.actions.some((a) => a.action === 'read');
                if (!hasAction) return <Text type="secondary">—</Text>;
                const isGranted = checkPermission(r.subject, 'read');
                return isGranted ? (
                  <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />
                ) : (
                  <CloseCircleFilled style={{ color: '#cbd5e1', fontSize: 16 }} />
                );
              },
            },
            {
              title: 'UPDATE',
              key: 'update',
              align: 'center',
              width: 80,
              render: (_: unknown, r: PermissionCatalogSubject) => {
                const hasAction = r.actions.some((a) => a.action === 'update');
                if (!hasAction) return <Text type="secondary">—</Text>;
                const isGranted = checkPermission(r.subject, 'update');
                return isGranted ? (
                  <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />
                ) : (
                  <CloseCircleFilled style={{ color: '#cbd5e1', fontSize: 16 }} />
                );
              },
            },
            {
              title: 'DELETE',
              key: 'delete',
              align: 'center',
              width: 80,
              render: (_: unknown, r: PermissionCatalogSubject) => {
                const hasAction = r.actions.some((a) => a.action === 'delete');
                if (!hasAction) return <Text type="secondary">—</Text>;
                const isGranted = checkPermission(r.subject, 'delete');
                return isGranted ? (
                  <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />
                ) : (
                  <CloseCircleFilled style={{ color: '#cbd5e1', fontSize: 16 }} />
                );
              },
            },
            {
              title: 'EXPORT',
              key: 'export',
              align: 'center',
              width: 80,
              render: (_: unknown, r: PermissionCatalogSubject) => {
                const hasAction = r.actions.some((a) => a.action === 'export');
                if (!hasAction) return <Text type="secondary">—</Text>;
                const isGranted = checkPermission(r.subject, 'export');
                return isGranted ? (
                  <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />
                ) : (
                  <CloseCircleFilled style={{ color: '#cbd5e1', fontSize: 16 }} />
                );
              },
            },
            {
              title: 'MANAGE',
              key: 'manage',
              align: 'center',
              width: 80,
              render: (_: unknown, r: PermissionCatalogSubject) => {
                const hasAction = r.actions.some((a) => a.action === 'manage');
                if (!hasAction) return <Text type="secondary">—</Text>;
                const isGranted = checkPermission(r.subject, 'manage');
                return isGranted ? (
                  <CheckCircleFilled style={{ color: '#10b981', fontSize: 16 }} />
                ) : (
                  <CloseCircleFilled style={{ color: '#cbd5e1', fontSize: 16 }} />
                );
              },
            },
          ]}
        />
      </Card>
    </Modal>
  );
};
