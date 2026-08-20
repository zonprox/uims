import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  PermissionCatalogSubject,
  Role,
  RoleDetailResponse,
  RoleSummaryStats,
  User,
} from '@uims/shared-types';
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useMemo, useState } from 'react';
import { Can } from '../../../components/Access';
import { rolesService } from '../../../services/roles.service';
import { AccessSimulatorModal } from './AccessSimulatorModal';
import { CreateRoleModal } from './CreateRoleModal';
import { PermissionMatrixDrawer } from './PermissionMatrixDrawer';
import { RoleCloneModal } from './RoleCloneModal';
import { RoleDetailDrawer } from './RoleDetailDrawer';

const { Text, Title } = Typography;
const { Option } = Select;

interface RolesTabProps {
  roles: Role[];
  stats: RoleSummaryStats | null;
  catalog: PermissionCatalogSubject[];
  users: User[];
  loading: boolean;
  onRefresh: () => void;
}

export const RolesTab: React.FC<RolesTabProps> = ({
  roles,
  stats,
  catalog,
  users,
  loading,
  onRefresh,
}) => {
  const { message } = App.useApp();

  // Search and filter
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'system' | 'custom'>('all');

  // Modals & Drawers state
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<Role | null>(null);

  const [cloneOpen, setCloneOpen] = useState(false);
  const [selectedRoleForClone, setSelectedRoleForClone] = useState<Role | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [roleDetail, setRoleDetail] = useState<RoleDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const isSystem = r.isSystem;
      const matchesTier =
        tierFilter === 'all' ||
        (tierFilter === 'system' && isSystem) ||
        (tierFilter === 'custom' && !isSystem);

      const s = search.toLowerCase();
      const matchesSearch =
        !search ||
        r.name.toLowerCase().includes(s) ||
        (r.description || '').toLowerCase().includes(s);

      return matchesTier && matchesSearch;
    });
  }, [roles, search, tierFilter]);

  const handleOpenDetail = async (role: Role) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const detail = await rolesService.getRole(role.id);
      setRoleDetail(detail);
    } catch {
      message.error('Failed to load role details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    try {
      await rolesService.deleteRole(role.id);
      message.success(`Role "${role.name}" deleted successfully.`);
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div>
      {/* KPI Overview Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={4}>
          <Card
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}
            >
              Total Roles
            </Text>
            <Flex align="baseline" gap={6} style={{ marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, fontSize: 22, color: '#0f172a' }}>
                {stats?.totalRoles ?? roles.length}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                defined
              </Text>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={4}>
          <Card
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}
            >
              Core System Roles
            </Text>
            <Flex align="baseline" gap={6} style={{ marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, fontSize: 22, color: '#7c3aed' }}>
                {stats?.systemRolesCount ?? 6}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                built-in
              </Text>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={4}>
          <Card
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}
            >
              Custom Roles
            </Text>
            <Flex align="baseline" gap={6} style={{ marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, fontSize: 22, color: '#0284c7' }}>
                {stats?.customRolesCount ?? 0}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                custom
              </Text>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={4}>
          <Card
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}
            >
              Permission Catalog
            </Text>
            <Flex align="baseline" gap={6} style={{ marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, fontSize: 22, color: '#059669' }}>
                {stats?.totalPermissionsCount ?? 52}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                granular
              </Text>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={4}>
          <Card
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}
            >
              Super Admins
            </Text>
            <Flex align="baseline" gap={6} style={{ marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, fontSize: 22, color: '#d97706' }}>
                {stats?.superAdminsCount ?? 2}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                wildcard
              </Text>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={4}>
          <Card
            size="small"
            style={{ borderRadius: 8, height: '100%' }}
            styles={{ body: { padding: '12px 14px' } }}
          >
            <Text
              type="secondary"
              style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}
            >
              User Coverage
            </Text>
            <Flex align="baseline" gap={6} style={{ marginTop: 4 }}>
              <Title level={3} style={{ margin: 0, fontSize: 22, color: '#2563eb' }}>
                {stats?.assignedUsersCoverage ?? 100}%
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                assigned
              </Text>
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Action Toolbar */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Flex gap={10} wrap="wrap">
              <Input
                placeholder="Search role name or description..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={search}
                allowClear
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 240 }}
              />
              <Select value={tierFilter} onChange={setTierFilter} style={{ width: 150 }}>
                <Option value="all">All Tiers</Option>
                <Option value="system">System Roles</Option>
                <Option value="custom">Custom Roles</Option>
              </Select>
            </Flex>
          </Col>

          <Col xs={24} md={12}>
            <Flex gap={8} justify="end" wrap="wrap">
              <Tooltip title="Run real-time diagnostics on any user or role">
                <Button
                  icon={<ExperimentOutlined />}
                  onClick={() => setSimulatorOpen(true)}
                  style={{ borderColor: '#c084fc', color: '#7c3aed' }}
                >
                  Access Simulator
                </Button>
              </Tooltip>

              <Can action="create" subject="Role">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateRoleOpen(true)}
                >
                  Create Role
                </Button>
              </Can>

              <Tooltip title="Refresh role records">
                <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} />
              </Tooltip>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Main Roles Table */}
      <Card
        size="small"
        style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={filteredRoles}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          columns={[
            {
              title: 'Role Name & Type',
              dataIndex: 'name',
              key: 'name',
              width: 240,
              render: (name: string, record: Role) => (
                <div>
                  <Flex align="center" gap={8}>
                    <Text strong style={{ fontSize: 13.5 }}>
                      {name}
                    </Text>
                    {record.isSystem ? (
                      <Tag color="purple" style={{ fontSize: 10, padding: '0 5px', margin: 0 }}>
                        System
                      </Tag>
                    ) : (
                      <Tag color="cyan" style={{ fontSize: 10, padding: '0 5px', margin: 0 }}>
                        Custom
                      </Tag>
                    )}
                  </Flex>
                </div>
              ),
            },
            {
              title: 'Description',
              dataIndex: 'description',
              key: 'description',
              render: (desc: string) => (
                <Text type="secondary" style={{ fontSize: 12.5 }}>
                  {desc || 'No description provided.'}
                </Text>
              ),
            },
            {
              title: 'Assigned Users',
              dataIndex: 'userCount',
              key: 'userCount',
              width: 160,
              align: 'center',
              render: (count: number, record: Role) => (
                <Tooltip title="Click to view assigned users list">
                  <Tag
                    color={count > 0 ? 'blue' : 'default'}
                    style={{
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 12,
                    }}
                    onClick={() => handleOpenDetail(record)}
                  >
                    <TeamOutlined style={{ marginRight: 4 }} />
                    {count || 0} user{count === 1 ? '' : 's'}
                  </Tag>
                </Tooltip>
              ),
            },
            {
              title: 'Permissions',
              dataIndex: 'permissionCount',
              key: 'permissionCount',
              width: 180,
              align: 'center',
              render: (count: number, record: Role) => {
                const isSuper =
                  record.name.trim().toUpperCase() === 'SUPER ADMIN' ||
                  record.name.trim().toUpperCase() === 'SUPERADMIN';
                if (isSuper) {
                  return (
                    <Tag color="gold" style={{ fontSize: 11, padding: '2px 8px' }}>
                      All Authority (*:*)
                    </Tag>
                  );
                }
                return (
                  <Tag color="green" style={{ fontSize: 11, padding: '2px 8px' }}>
                    <KeyOutlined style={{ marginRight: 4 }} />
                    {count || record.permissions?.length || 0} Permissions
                  </Tag>
                );
              },
            },
            {
              title: 'Actions',
              key: 'actions',
              width: 220,
              align: 'right',
              render: (_: unknown, record: Role) => {
                const isSystem = record.isSystem;
                return (
                  <Space size="small">
                    <Tooltip title="Configure permission matrix grid">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setSelectedRoleForMatrix(record);
                          setMatrixOpen(true);
                        }}
                      >
                        Permissions
                      </Button>
                    </Tooltip>

                    <Tooltip title="Duplicate role with permissions">
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          setSelectedRoleForClone(record);
                          setCloneOpen(true);
                        }}
                      />
                    </Tooltip>

                    <Tooltip title="View assigned users">
                      <Button
                        size="small"
                        icon={<UserOutlined />}
                        onClick={() => handleOpenDetail(record)}
                      />
                    </Tooltip>

                    {!isSystem && (
                      <Popconfirm
                        title="Delete Role?"
                        description={`Are you sure you want to delete role "${record.name}"?`}
                        onConfirm={() => handleDeleteRole(record)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Delete custom role">
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </Space>
                );
              },
            },
          ]}
          locale={{
            emptyText: <Empty description="No RBAC roles matched your search criteria." />,
          }}
        />
      </Card>

      {/* Permission Matrix Drawer */}
      <PermissionMatrixDrawer
        open={matrixOpen}
        role={selectedRoleForMatrix}
        catalog={catalog}
        onClose={() => {
          setMatrixOpen(false);
          setSelectedRoleForMatrix(null);
        }}
        onSuccess={onRefresh}
      />

      {/* Role Clone Modal */}
      <RoleCloneModal
        open={cloneOpen}
        sourceRole={selectedRoleForClone}
        onClose={() => {
          setCloneOpen(false);
          setSelectedRoleForClone(null);
        }}
        onSuccess={onRefresh}
      />

      {/* Role Detail Drawer */}
      <RoleDetailDrawer
        open={detailOpen}
        roleDetail={roleDetail}
        loading={detailLoading}
        onClose={() => {
          setDetailOpen(false);
          setRoleDetail(null);
        }}
        onOpenMatrix={() => {
          if (roleDetail) {
            setSelectedRoleForMatrix(roleDetail);
            setMatrixOpen(true);
          }
        }}
      />

      {/* Access Simulator Modal */}
      <AccessSimulatorModal
        open={simulatorOpen}
        users={users}
        roles={roles}
        catalog={catalog}
        onClose={() => setSimulatorOpen(false)}
      />

      {/* Create Role Modal */}
      <CreateRoleModal
        open={createRoleOpen}
        catalog={catalog}
        existingRoles={roles}
        onClose={() => setCreateRoleOpen(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
