import {
  CheckCircleOutlined,
  ClearOutlined,
  FilterOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import type { PermissionCatalogSubject, Role } from '@uims/shared-types';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Drawer,
  Empty,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { rolesService } from '../../../services/roles.service';

const { Text, Title } = Typography;
const { Option } = Select;

interface PermissionMatrixDrawerProps {
  open: boolean;
  role: Role | null;
  catalog: PermissionCatalogSubject[];
  onClose: () => void;
  onSuccess: () => void;
}

export const PermissionMatrixDrawer: React.FC<PermissionMatrixDrawerProps> = ({
  open,
  role,
  catalog,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [initialPermIds, setInitialPermIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  // Initialize selected permissions when role changes
  useEffect(() => {
    if (role && open) {
      const perms = (role.permissions || []).map((p: unknown) => {
        const pObj = p as { permission?: { id: string }; id?: string };
        return pObj.permission ? pObj.permission.id : pObj.id || '';
      });
      const permSet = new Set<string>(perms.filter(Boolean));
      setSelectedPermIds(permSet);
      setInitialPermIds(permSet);
    }
  }, [role, open]);

  const isSuperAdminRole =
    role?.name?.trim().toUpperCase() === 'SUPER ADMIN' ||
    role?.name?.trim().toUpperCase() === 'SUPERADMIN';

  // All permission IDs map
  const allPermissionIds = useMemo(() => {
    const ids: string[] = [];
    catalog.forEach((cat) => {
      cat.actions.forEach((act) => {
        ids.push(act.id);
      });
    });
    return ids;
  }, [catalog]);

  // Read only permission IDs
  const readOnlyPermissionIds = useMemo(() => {
    const ids: string[] = [];
    catalog.forEach((cat) => {
      cat.actions.forEach((act) => {
        if (act.action === 'read' || act.action === 'export') {
          ids.push(act.id);
        }
      });
    });
    return ids;
  }, [catalog]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((c) => set.add(c.category));
    return Array.from(set);
  }, [catalog]);

  // Filter catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesSearch =
        !search ||
        item.displayName.toLowerCase().includes(search.toLowerCase()) ||
        item.subject.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.actions.some((a) => a.action.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [catalog, search, categoryFilter]);

  // Check if dirty
  const isDirty = useMemo(() => {
    if (selectedPermIds.size !== initialPermIds.size) return true;
    for (const id of selectedPermIds) {
      if (!initialPermIds.has(id)) return true;
    }
    return false;
  }, [selectedPermIds, initialPermIds]);

  const handleTogglePerm = (permId: string) => {
    if (isSuperAdminRole) return;
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleToggleModuleAll = (subject: PermissionCatalogSubject) => {
    if (isSuperAdminRole) return;
    const modulePermIds = subject.actions.map((a) => a.id);
    const allSelected = modulePermIds.every((id) => selectedPermIds.has(id));

    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        modulePermIds.forEach((id) => next.delete(id));
      } else {
        modulePermIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isSuperAdminRole) return;
    setSelectedPermIds(new Set(allPermissionIds));
    message.info('All permissions selected');
  };

  const handleClearAll = () => {
    if (isSuperAdminRole) return;
    setSelectedPermIds(new Set());
    message.info('All permissions cleared');
  };

  const handleSelectReadOnly = () => {
    if (isSuperAdminRole) return;
    setSelectedPermIds(new Set(readOnlyPermissionIds));
    message.info('Read-only permissions preset applied');
  };

  const handleReset = () => {
    setSelectedPermIds(new Set(initialPermIds));
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await rolesService.syncPermissions(role.id, Array.from(selectedPermIds));
      message.success(`Permissions for role "${role.name}" updated successfully.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to update role permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={
        <Flex align="center" justify="space-between" style={{ width: '100%', paddingRight: 12 }}>
          <Flex align="center" gap={8}>
            <Title level={5} style={{ margin: 0, fontSize: 16 }}>
              Permission Matrix: {role?.name || 'Role'}
            </Title>
            {role?.isSystem ? (
              <Tag color="purple" style={{ margin: 0 }}>
                System Protected
              </Tag>
            ) : (
              <Tag color="cyan" style={{ margin: 0 }}>
                Custom Role
              </Tag>
            )}
          </Flex>
          <Tag color="blue" style={{ fontSize: 11, padding: '2px 8px' }}>
            {selectedPermIds.size} / {allPermissionIds.length} Granted
          </Tag>
        </Flex>
      }
      open={open}
      onClose={onClose}
      styles={{
        wrapper: { width: 780 },
        body: { padding: '16px 20px', background: '#f8fafc' },
        footer: { padding: '12px 20px', background: '#fff' },
      }}
      footer={
        <Flex justify="space-between" align="center">
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isDirty ? (
              <Badge status="warning" text="Unsaved permission changes" />
            ) : (
              <Badge status="success" text="All changes synced" />
            )}
          </Text>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!isDirty || isSuperAdminRole}
              onClick={handleSave}
            >
              Save Permissions
            </Button>
          </Space>
        </Flex>
      }
    >
      {isSuperAdminRole && (
        <Alert
          type="info"
          showIcon
          message="Super Admin Access"
          description="Super Administrator has full (*:*) access across all modules and records. Permissions cannot be modified."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Toolbar & Filters */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Search module or action (e.g. Asset, create)..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
            >
              <Option value="all">All Categories</Option>
              {categories.map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Flex gap={6} justify="end" wrap="wrap">
              <Tooltip title="Grant all system permissions">
                <Button
                  size="small"
                  icon={<CheckCircleOutlined />}
                  disabled={isSuperAdminRole}
                  onClick={handleSelectAll}
                >
                  All
                </Button>
              </Tooltip>
              <Tooltip title="Apply read-only & export baseline">
                <Button
                  size="small"
                  icon={<UnlockOutlined />}
                  disabled={isSuperAdminRole}
                  onClick={handleSelectReadOnly}
                >
                  Read-Only
                </Button>
              </Tooltip>
              <Tooltip title="Clear all granted permissions">
                <Button
                  size="small"
                  danger
                  icon={<ClearOutlined />}
                  disabled={isSuperAdminRole}
                  onClick={handleClearAll}
                >
                  Clear
                </Button>
              </Tooltip>
              {isDirty && (
                <Tooltip title="Reset to last saved state">
                  <Button size="small" icon={<ReloadOutlined />} onClick={handleReset}>
                    Reset
                  </Button>
                </Tooltip>
              )}
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Catalog Matrix */}
      {filteredCatalog.length === 0 ? (
        <Empty description="No permissions matched your filter." />
      ) : (
        <Flex vertical gap={12}>
          {filteredCatalog.map((subj) => {
            const modulePermIds = subj.actions.map((a) => a.id);
            const grantedCount = modulePermIds.filter((id) => selectedPermIds.has(id)).length;
            const allModuleSelected = grantedCount === modulePermIds.length;
            const isIndeterminate = grantedCount > 0 && grantedCount < modulePermIds.length;

            return (
              <Card
                key={subj.subject}
                size="small"
                style={{
                  borderRadius: 8,
                  borderColor: grantedCount > 0 ? '#bfdbfe' : '#e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease',
                }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
                  <Flex align="center" gap={8}>
                    <Checkbox
                      checked={allModuleSelected || isSuperAdminRole}
                      indeterminate={isIndeterminate && !isSuperAdminRole}
                      disabled={isSuperAdminRole}
                      onChange={() => handleToggleModuleAll(subj)}
                    />
                    <div>
                      <Text strong style={{ fontSize: 13.5 }}>
                        {subj.displayName}
                      </Text>
                      <Text
                        type="secondary"
                        style={{ fontSize: 11, marginLeft: 8, display: 'inline-block' }}
                      >
                        ({subj.subject}) • {subj.description}
                      </Text>
                    </div>
                  </Flex>
                  <Flex align="center" gap={6}>
                    <Tag style={{ fontSize: 10, margin: 0 }}>{subj.category}</Tag>
                    <Tag
                      color={
                        grantedCount === modulePermIds.length
                          ? 'blue'
                          : grantedCount > 0
                            ? 'gold'
                            : 'default'
                      }
                      style={{ fontSize: 10, margin: 0, padding: '0 5px' }}
                    >
                      {grantedCount} / {modulePermIds.length}
                    </Tag>
                  </Flex>
                </Flex>

                <Divider style={{ margin: '6px 0 10px 0' }} />

                <Row gutter={[10, 8]}>
                  {subj.actions.map((act) => {
                    const isChecked = isSuperAdminRole || selectedPermIds.has(act.id);
                    return (
                      <Col xs={12} sm={8} md={4} key={act.id}>
                        <Tooltip title={act.description} mouseEnterDelay={0.4}>
                          <div
                            onClick={() => handleTogglePerm(act.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: `1px solid ${isChecked ? '#93c5fd' : '#e2e8f0'}`,
                              background: isChecked ? '#eff6ff' : '#fff',
                              cursor: isSuperAdminRole ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Checkbox
                              checked={isChecked}
                              disabled={isSuperAdminRole}
                              onChange={() => handleTogglePerm(act.id)}
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: isChecked ? 600 : 400,
                                color: isChecked ? '#1d4ed8' : '#475569',
                                textTransform: 'capitalize',
                              }}
                            >
                              {act.action}
                            </Text>
                          </div>
                        </Tooltip>
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            );
          })}
        </Flex>
      )}
    </Drawer>
  );
};
