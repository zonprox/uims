import {
  ApartmentOutlined,
  BankOutlined,
  ClusterOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  Department,
  Organization,
  OrganizationStats,
  OrgNode,
  Position,
} from '@uims/shared-types';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageContainer from '../../components/PageContainer';
import { type LocationBranch, organizationService } from '../../services/organization.service';
import OrganizationCanvas from './OrganizationCanvas';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

export default function OrganizationPage() {
  const { message } = App.useApp();

  const [viewMode, setViewMode] = useState<'canvas' | 'tree'>('canvas');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<OrganizationStats>({
    totalOrganizations: 0,
    totalDepartments: 0,
    totalPositions: 0,
    totalBranches: 0,
    totalEmployees: 0,
  });

  const [treeData, setTreeData] = useState<OrgNode[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [locations, setLocations] = useState<LocationBranch[]>([]);

  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);
  const [treeSearch, setTreeSearch] = useState('');

  // Modals state
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [posModalOpen, setPosModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);

  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [orgForm] = Form.useForm();
  const [deptForm] = Form.useForm();
  const [posForm] = Form.useForm();

  // Filters
  const [deptSearch, setDeptSearch] = useState('');
  const [posSearch, setPosSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, tree, orgList, deptList, posList, locList] = await Promise.all([
        organizationService.getStats().catch(() => null),
        organizationService.getTree().catch(() => []),
        organizationService.getOrganizations().catch(() => []),
        organizationService.getDepartments().catch(() => []),
        organizationService.getPositions().catch(() => []),
        organizationService.getLocations().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setTreeData(tree);
      setOrgs(orgList);
      setDepartments(deptList);
      setPositions(posList);
      setLocations(locList);

      if (tree.length > 0 && !selectedNodeKey) {
        setSelectedNodeKey(tree[0].key);
        setSelectedNode(tree[0]);
      }
    } catch (err) {
      console.error('Failed to load organization data:', err);
      message.error('Failed to load enterprise structure');
    } finally {
      setLoading(false);
    }
  }, [message, selectedNodeKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recursively search and find node in treeData
  const findNodeInTree = useCallback((nodes: OrgNode[], key: string): OrgNode | null => {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeInTree(node.children, key);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleSelectTreeNode = (keys: React.Key[]) => {
    if (keys.length > 0) {
      const keyStr = String(keys[0]);
      setSelectedNodeKey(keyStr);
      const node = findNodeInTree(treeData, keyStr);
      setSelectedNode(node);
    }
  };

  // Convert OrgNode to Antd DataNode with icons
  const formatTreeNodes = useCallback(
    (nodes: OrgNode[]): DataNode[] => {
      return nodes.map((node) => {
        let icon = <ApartmentOutlined style={{ color: '#1677ff' }} />;
        if (node.type === 'organization') {
          icon = <BankOutlined style={{ color: '#722ed1' }} />;
        } else if (node.type === 'branch') {
          icon = <EnvironmentOutlined style={{ color: '#10b981' }} />;
        } else if (node.type === 'position') {
          icon = <IdcardOutlined style={{ color: '#f59e0b' }} />;
        }

        const isMatch =
          treeSearch.trim() &&
          (node.title.toLowerCase().includes(treeSearch.toLowerCase()) ||
            node.code.toLowerCase().includes(treeSearch.toLowerCase()));

        return {
          key: node.key,
          title: (
            <Flex align="center" gap={6}>
              <span
                style={{
                  fontWeight: node.type === 'organization' ? 700 : 500,
                  color: isMatch ? '#1677ff' : undefined,
                }}
              >
                {node.title}
              </span>
              <Tag
                style={{
                  fontSize: 10,
                  margin: 0,
                  padding: '0 4px',
                  height: 16,
                  lineHeight: '14px',
                }}
                color={
                  node.type === 'organization'
                    ? 'purple'
                    : node.type === 'branch'
                      ? 'green'
                      : node.type === 'department'
                        ? 'blue'
                        : 'orange'
                }
              >
                {node.code}
              </Tag>
              {typeof node.count === 'number' && node.count > 0 && (
                <Tag
                  color="default"
                  style={{
                    fontSize: 10,
                    margin: 0,
                    padding: '0 4px',
                    height: 16,
                    lineHeight: '14px',
                  }}
                >
                  {node.count} staff
                </Tag>
              )}
            </Flex>
          ),
          icon,
          children: node.children ? formatTreeNodes(node.children) : undefined,
        };
      });
    },
    [treeSearch],
  );

  const antdTreeNodes = useMemo(() => formatTreeNodes(treeData), [treeData, formatTreeNodes]);

  // Modals Handlers
  const handleOpenCreateOrg = () => {
    setEditingOrg(null);
    orgForm.resetFields();
    orgForm.setFieldsValue({ status: 'ACTIVE' });
    setOrgModalOpen(true);
  };

  const handleOpenEditOrg = (org: Organization) => {
    setEditingOrg(org);
    orgForm.setFieldsValue(org);
    setOrgModalOpen(true);
  };

  const handleSaveOrg = async () => {
    try {
      const values = await orgForm.validateFields();
      setModalSubmitting(true);
      if (editingOrg) {
        await organizationService.updateOrganization(editingOrg.id, values);
        message.success(`Organization "${values.name}" updated successfully.`);
      } else {
        await organizationService.createOrganization(values);
        message.success(`Organization "${values.name}" registered successfully.`);
      }
      setOrgModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save organization entity.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteOrg = async (id: string) => {
    try {
      await organizationService.deleteOrganization(id);
      message.success('Organization removed');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete organization');
    }
  };

  const handleOpenCreateDept = (parentId?: string) => {
    setEditingDept(null);
    deptForm.resetFields();
    deptForm.setFieldsValue({
      status: 'ACTIVE',
      organizationId: orgs[0]?.id,
      parentId: parentId || undefined,
    });
    setDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: Department) => {
    setEditingDept(dept);
    deptForm.setFieldsValue(dept);
    setDeptModalOpen(true);
  };

  const handleSaveDept = async () => {
    try {
      const values = await deptForm.validateFields();
      setModalSubmitting(true);
      if (editingDept) {
        await organizationService.updateDepartment(editingDept.id, values);
        message.success(`Department "${values.name}" updated.`);
      } else {
        await organizationService.createDepartment(values);
        message.success(`Department "${values.name}" created.`);
      }
      setDeptModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save department.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteDept = async (id: string) => {
    try {
      await organizationService.deleteDepartment(id);
      message.success('Department deleted');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete department');
    }
  };

  const handleOpenCreatePos = (deptId?: string) => {
    setEditingPos(null);
    posForm.resetFields();
    posForm.setFieldsValue({
      status: 'ACTIVE',
      level: 'Senior',
      departmentId: deptId || departments[0]?.id,
    });
    setPosModalOpen(true);
  };

  const handleOpenEditPos = (pos: Position) => {
    setEditingPos(pos);
    posForm.setFieldsValue(pos);
    setPosModalOpen(true);
  };

  const handleSavePos = async () => {
    try {
      const values = await posForm.validateFields();
      setModalSubmitting(true);
      if (editingPos) {
        await organizationService.updatePosition(editingPos.id, values);
        message.success(`Position "${values.title}" updated.`);
      } else {
        await organizationService.createPosition(values);
        message.success(`Position "${values.title}" created.`);
      }
      setPosModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { response?: { data?: { message?: string } } };
      message.error(apiErr.response?.data?.message || 'Failed to save position.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeletePos = async (id: string) => {
    try {
      await organizationService.deletePosition(id);
      message.success('Position deleted');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      message.error('Failed to delete position');
    }
  };

  // Table columns
  const deptColumns = [
    {
      title: 'Department Name & Code',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Department) => (
        <Flex align="center" gap={10}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: '#e6f4ff',
              color: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <ApartmentOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>
              {name}
            </Text>
            <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
              {record.code}
            </Tag>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Organization Entity',
      key: 'org',
      render: (_: unknown, record: Department) => (
        <Text style={{ fontSize: 12.5 }}>
          {record.organization?.name || 'Acme Global Enterprise'}
        </Text>
      ),
    },
    {
      title: 'Parent Division',
      key: 'parent',
      render: (_: unknown, record: Department) =>
        record.parent ? (
          <Tag color="cyan">{record.parent.name}</Tag>
        ) : (
          <Tag color="purple">Top-Level Division</Tag>
        ),
    },
    {
      title: 'Department Manager',
      key: 'manager',
      render: (_: unknown, record: Department) => (
        <div>
          <Text strong style={{ fontSize: 12.5, display: 'block' }}>
            {record.managerName || 'Unassigned'}
          </Text>
          {record.managerEmail && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.managerEmail}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Headcount & Roles',
      key: 'stats',
      render: (_: unknown, record: Department) => (
        <Space size={6}>
          <Tag icon={<TeamOutlined />} color="processing">
            {record.memberCount || 0} Members
          </Tag>
          <Tag icon={<IdcardOutlined />} color="default">
            {record.positionsCount || 0} Titles
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Department) => (
        <Space size="small">
          <Tooltip title="Edit Department">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditDept(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this department?"
            description="Are you sure you want to remove this department record?"
            onConfirm={() => handleDeleteDept(record.id)}
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

  const posColumns = [
    {
      title: 'Job Position Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Position) => (
        <Flex align="center" gap={10}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <IdcardOutlined />
          </div>
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>
              {title}
            </Text>
            <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>
              {record.code}
            </Tag>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Assigned Department',
      key: 'dept',
      render: (_: unknown, record: Position) => (
        <Text style={{ fontSize: 12.5 }}>{record.department?.name || 'General Operations'}</Text>
      ),
    },
    {
      title: 'Seniority Level',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => {
        let color = 'blue';
        if (level === 'Executive') color = 'magenta';
        if (level === 'Director') color = 'purple';
        if (level === 'Lead') color = 'geekblue';
        if (level === 'Senior') color = 'cyan';
        return <Tag color={color}>{level || 'Mid'}</Tag>;
      },
    },
    {
      title: 'Current Headcount',
      dataIndex: 'headcount',
      key: 'headcount',
      render: (count: number) => (
        <Tag icon={<UserOutlined />} color="default">
          {count || 0} Staff Active
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Position) => (
        <Space size="small">
          <Tooltip title="Edit Job Position">
            <Button
              type="text"
              shape="circle"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditPos(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this position?"
            description="Remove job title from organization directory?"
            onConfirm={() => handleDeletePos(record.id)}
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

  const filteredDepts = useMemo(() => {
    if (!deptSearch.trim()) return departments;
    const s = deptSearch.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.code.toLowerCase().includes(s) ||
        d.managerName?.toLowerCase().includes(s),
    );
  }, [departments, deptSearch]);

  const filteredPositions = useMemo(() => {
    if (!posSearch.trim()) return positions;
    const s = posSearch.toLowerCase();
    return positions.filter(
      (p) => p.title.toLowerCase().includes(s) || p.code.toLowerCase().includes(s),
    );
  }, [positions, posSearch]);

  return (
    <PageContainer
      title="Enterprise Organization Structure"
      subtitle="Comprehensive governance of enterprise entities, regional hubs, hierarchical divisions, departments, and job titles."
      breadcrumbs={[{ title: 'Organization' }]}
      stats={[
        {
          title: 'Organizations & Entities',
          value: stats.totalOrganizations,
          prefix: <BankOutlined />,
          color: '#722ed1',
        },
        {
          title: 'Departments & Divisions',
          value: stats.totalDepartments,
          prefix: <ApartmentOutlined />,
          color: '#1677ff',
        },
        {
          title: 'Job Titles & Positions',
          value: stats.totalPositions,
          prefix: <IdcardOutlined />,
          color: '#f59e0b',
        },
        {
          title: 'Facilities & Branches',
          value: stats.totalBranches,
          prefix: <EnvironmentOutlined />,
          color: '#10b981',
        },
      ]}
      extra={
        <Flex gap={8} wrap>
          <Tooltip title="Reload from server">
            <Button icon={<ReloadOutlined spin={loading} />} onClick={loadData} />
          </Tooltip>
          <Button icon={<PlusOutlined />} onClick={handleOpenCreateOrg}>
            New Entity
          </Button>
          <Button icon={<ApartmentOutlined />} onClick={() => handleOpenCreateDept()}>
            New Department
          </Button>
          <Button type="primary" icon={<IdcardOutlined />} onClick={() => handleOpenCreatePos()}>
            New Job Position
          </Button>
        </Flex>
      }
    >
      <Tabs
        defaultActiveKey="hierarchy"
        items={[
          {
            key: 'hierarchy',
            label: (
              <span>
                <ClusterOutlined /> Interactive Org Hierarchy & Canvas
              </span>
            ),
            children: (
              <Flex vertical gap={16}>
                {/* View Mode Switcher */}
                <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                  <Segmented
                    value={viewMode}
                    onChange={(val) => setViewMode(val as 'canvas' | 'tree')}
                    options={[
                      {
                        label: 'Canvas View',
                        value: 'canvas',
                        icon: <ApartmentOutlined />,
                      },
                      {
                        label: 'Tree View',
                        value: 'tree',
                        icon: <ClusterOutlined />,
                      },
                    ]}
                  />
                  <Tag color="blue" style={{ padding: '4px 10px', fontSize: 12 }}>
                    {treeData.length} Root Entities • {departments.length} Departments •{' '}
                    {positions.length} Positions
                  </Tag>
                </Flex>

                {/* Canvas Mode */}
                {viewMode === 'canvas' ? (
                  <Flex vertical gap={16}>
                    <OrganizationCanvas
                      treeData={treeData}
                      selectedNodeKey={selectedNodeKey}
                      onSelectNode={(node) => {
                        setSelectedNodeKey(node.key);
                        const found = findNodeInTree(treeData, node.key);
                        setSelectedNode(found || node);
                      }}
                      onOpenEditOrg={(orgId) => {
                        const org = orgs.find((o) => o.id === orgId);
                        if (org) handleOpenEditOrg(org);
                      }}
                      onOpenEditDept={(deptId) => {
                        const dept = departments.find((d) => d.id === deptId);
                        if (dept) handleOpenEditDept(dept);
                      }}
                      onOpenEditPos={(posId) => {
                        const pos = positions.find((p) => p.id === posId);
                        if (pos) handleOpenEditPos(pos);
                      }}
                      onOpenCreateDept={(parentId) => handleOpenCreateDept(parentId)}
                      onOpenCreatePos={(deptId) => handleOpenCreatePos(deptId)}
                      loading={loading}
                    />

                    {/* Inspector for Canvas */}
                    <Card
                      size="small"
                      title={
                        <Flex justify="space-between" align="center">
                          <Text strong style={{ fontSize: 13 }}>
                            Selected Node Inspector & Unit Details
                          </Text>
                          {selectedNode && (
                            <Tag
                              color={
                                selectedNode.type === 'organization'
                                  ? 'purple'
                                  : selectedNode.type === 'branch'
                                    ? 'green'
                                    : selectedNode.type === 'department'
                                      ? 'blue'
                                      : 'orange'
                              }
                            >
                              {selectedNode.type.toUpperCase()}
                            </Tag>
                          )}
                        </Flex>
                      }
                      extra={
                        selectedNode && (
                          <Space size="small">
                            {selectedNode.type === 'organization' && (
                              <>
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    const orgId = selectedNode.key.replace(/^org-/, '');
                                    const org = orgs.find((o) => o.id === orgId);
                                    if (org) handleOpenEditOrg(org);
                                  }}
                                >
                                  Edit Entity
                                </Button>
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<PlusOutlined />}
                                  onClick={() => handleOpenCreateDept()}
                                >
                                  Add Dept
                                </Button>
                              </>
                            )}
                            {(selectedNode.type === 'department' ||
                              selectedNode.type === 'sub-department') && (
                              <>
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    const deptId = selectedNode.key.replace(/^dept-/, '');
                                    const dept = departments.find((d) => d.id === deptId);
                                    if (dept) handleOpenEditDept(dept);
                                  }}
                                >
                                  Edit Dept
                                </Button>
                                <Button
                                  size="small"
                                  icon={<ApartmentOutlined />}
                                  onClick={() => {
                                    const deptId = selectedNode.key.replace(/^dept-/, '');
                                    handleOpenCreateDept(deptId);
                                  }}
                                >
                                  Add Sub-Dept
                                </Button>
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<IdcardOutlined />}
                                  onClick={() => {
                                    const deptId = selectedNode.key.replace(/^dept-/, '');
                                    handleOpenCreatePos(deptId);
                                  }}
                                >
                                  Add Position
                                </Button>
                              </>
                            )}
                            {selectedNode.type === 'position' && (
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => {
                                  const posId = selectedNode.key.replace(/^pos-/, '');
                                  const pos = positions.find((p) => p.id === posId);
                                  if (pos) handleOpenEditPos(pos);
                                }}
                              >
                                Edit Position
                              </Button>
                            )}
                          </Space>
                        )
                      }
                      styles={{ body: { padding: '20px' } }}
                    >
                      {selectedNode ? (
                        <Flex vertical gap={16}>
                          <div>
                            <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                              <Title level={4} style={{ margin: 0 }}>
                                {selectedNode.title}
                              </Title>
                              <Tag color="blue">{selectedNode.code}</Tag>
                            </Flex>
                            <Paragraph type="secondary" style={{ margin: 0 }}>
                              {selectedNode.description || 'Enterprise structural unit'}
                            </Paragraph>
                          </div>

                          <Descriptions bordered size="small" column={2}>
                            <Descriptions.Item label="Structural Type">
                              {selectedNode.type.toUpperCase()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Unit Identifier Code">
                              <Text code>{selectedNode.code}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Manager / Custodian Lead">
                              {selectedNode.manager || 'Corporate Leadership'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Direct Staff Assigned">
                              <Tag color="processing">
                                {typeof selectedNode.count === 'number'
                                  ? `${selectedNode.count} Active Users`
                                  : 'Aggregated Group'}
                              </Tag>
                            </Descriptions.Item>
                          </Descriptions>

                          {selectedNode.children && selectedNode.children.length > 0 && (
                            <div>
                              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                Sub-Units & Child Nodes ({selectedNode.children.length}):
                              </Text>
                              <Row gutter={[10, 10]}>
                                {selectedNode.children.map((child) => (
                                  <Col xs={24} sm={12} md={8} lg={6} key={child.key}>
                                    <Card
                                      size="small"
                                      hoverable
                                      onClick={() => {
                                        setSelectedNodeKey(child.key);
                                        setSelectedNode(child);
                                      }}
                                      style={{
                                        cursor: 'pointer',
                                        borderLeft: '3px solid #1677ff',
                                      }}
                                    >
                                      <Flex justify="space-between" align="center">
                                        <Text strong style={{ fontSize: 12.5 }}>
                                          {child.title}
                                        </Text>
                                        <Tag style={{ fontSize: 10, margin: 0 }}>{child.code}</Tag>
                                      </Flex>
                                      {child.manager && (
                                        <Text
                                          type="secondary"
                                          style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                                        >
                                          Lead: {child.manager}
                                        </Text>
                                      )}
                                    </Card>
                                  </Col>
                                ))}
                              </Row>
                            </div>
                          )}
                        </Flex>
                      ) : (
                        <Empty description="Select a node from the canvas to inspect" />
                      )}
                    </Card>
                  </Flex>
                ) : (
                  /* Tree Mode */
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={10} lg={9}>
                      <Card
                        size="small"
                        title={
                          <Flex justify="space-between" align="center">
                            <Text strong style={{ fontSize: 13 }}>
                              Enterprise Tree Structure
                            </Text>
                            <Tag color="blue">{treeData.length} Root Entities</Tag>
                          </Flex>
                        }
                        styles={{ body: { padding: '12px' } }}
                      >
                        <Input
                          placeholder="Filter organization nodes..."
                          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                          value={treeSearch}
                          onChange={(e) => setTreeSearch(e.target.value)}
                          allowClear
                          style={{ marginBottom: 12 }}
                        />
                        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                          {antdTreeNodes.length > 0 ? (
                            <Tree
                              showIcon
                              defaultExpandAll
                              selectedKeys={selectedNodeKey ? [selectedNodeKey] : []}
                              onSelect={handleSelectTreeNode}
                              treeData={antdTreeNodes}
                            />
                          ) : (
                            <Empty description="No organization nodes found" />
                          )}
                        </div>
                      </Card>
                    </Col>

                    <Col xs={24} md={14} lg={15}>
                      <Card
                        size="small"
                        title={
                          <Flex justify="space-between" align="center">
                            <Text strong style={{ fontSize: 13 }}>
                              Node Inspector & Unit Overview
                            </Text>
                            {selectedNode && (
                              <Tag
                                color={
                                  selectedNode.type === 'organization'
                                    ? 'purple'
                                    : selectedNode.type === 'branch'
                                      ? 'green'
                                      : selectedNode.type === 'department'
                                        ? 'blue'
                                        : 'orange'
                                }
                              >
                                {selectedNode.type.toUpperCase()}
                              </Tag>
                            )}
                          </Flex>
                        }
                        extra={
                          selectedNode && (
                            <Space size="small">
                              {selectedNode.type === 'organization' && (
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    const orgId = selectedNode.key.replace(/^org-/, '');
                                    const org = orgs.find((o) => o.id === orgId);
                                    if (org) handleOpenEditOrg(org);
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                              {(selectedNode.type === 'department' ||
                                selectedNode.type === 'sub-department') && (
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    const deptId = selectedNode.key.replace(/^dept-/, '');
                                    const dept = departments.find((d) => d.id === deptId);
                                    if (dept) handleOpenEditDept(dept);
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                              {selectedNode.type === 'position' && (
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    const posId = selectedNode.key.replace(/^pos-/, '');
                                    const pos = positions.find((p) => p.id === posId);
                                    if (pos) handleOpenEditPos(pos);
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                            </Space>
                          )
                        }
                        styles={{ body: { padding: '20px' } }}
                      >
                        {selectedNode ? (
                          <Flex vertical gap={16}>
                            <div>
                              <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                                <Title level={4} style={{ margin: 0 }}>
                                  {selectedNode.title}
                                </Title>
                                <Tag color="blue">{selectedNode.code}</Tag>
                              </Flex>
                              <Paragraph type="secondary" style={{ margin: 0 }}>
                                {selectedNode.description || 'Enterprise structural unit'}
                              </Paragraph>
                            </div>

                            <Descriptions bordered size="small" column={2}>
                              <Descriptions.Item label="Structural Type">
                                {selectedNode.type.toUpperCase()}
                              </Descriptions.Item>
                              <Descriptions.Item label="Unit Identifier Code">
                                <Text code>{selectedNode.code}</Text>
                              </Descriptions.Item>
                              <Descriptions.Item label="Manager / Custodian Lead">
                                {selectedNode.manager || 'Corporate Leadership'}
                              </Descriptions.Item>
                              <Descriptions.Item label="Direct Staff Assigned">
                                <Tag color="processing">
                                  {typeof selectedNode.count === 'number'
                                    ? `${selectedNode.count} Active Users`
                                    : 'Aggregated Group'}
                                </Tag>
                              </Descriptions.Item>
                            </Descriptions>

                            {selectedNode.children && selectedNode.children.length > 0 && (
                              <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                  Sub-Units & Child Nodes ({selectedNode.children.length}):
                                </Text>
                                <Row gutter={[10, 10]}>
                                  {selectedNode.children.map((child) => (
                                    <Col xs={24} sm={12} key={child.key}>
                                      <Card
                                        size="small"
                                        hoverable
                                        onClick={() => {
                                          setSelectedNodeKey(child.key);
                                          setSelectedNode(child);
                                        }}
                                        style={{
                                          cursor: 'pointer',
                                          borderLeft: '3px solid #1677ff',
                                        }}
                                      >
                                        <Flex justify="space-between" align="center">
                                          <Text strong style={{ fontSize: 12.5 }}>
                                            {child.title}
                                          </Text>
                                          <Tag style={{ fontSize: 10, margin: 0 }}>
                                            {child.code}
                                          </Tag>
                                        </Flex>
                                        {child.manager && (
                                          <Text
                                            type="secondary"
                                            style={{ fontSize: 11, display: 'block', marginTop: 4 }}
                                          >
                                            Lead: {child.manager}
                                          </Text>
                                        )}
                                      </Card>
                                    </Col>
                                  ))}
                                </Row>
                              </div>
                            )}
                          </Flex>
                        ) : (
                          <Empty description="Select a node from the hierarchy tree to inspect" />
                        )}
                      </Card>
                    </Col>
                  </Row>
                )}
              </Flex>
            ),
          },
          {
            key: 'departments',
            label: (
              <span>
                <ApartmentOutlined /> Departments & Divisions ({departments.length})
              </span>
            ),
            children: (
              <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
                <Row
                  gutter={[14, 14]}
                  align="middle"
                  justify="space-between"
                  style={{ marginBottom: 16 }}
                >
                  <Col xs={24} md={10}>
                    <Input
                      placeholder="Search departments by name, code, manager..."
                      prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} md={14}>
                    <Flex justify="flex-end" gap={8}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenCreateDept()}
                      >
                        Add Department
                      </Button>
                    </Flex>
                  </Col>
                </Row>

                <Table
                  columns={deptColumns}
                  dataSource={filteredDepts}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 8, showTotal: (t) => `Total ${t} departments` }}
                />
              </Card>
            ),
          },
          {
            key: 'entities',
            label: (
              <span>
                <BankOutlined /> Companies & Facilities ({orgs.length} Entities, {locations.length}{' '}
                Facilities)
              </span>
            ),
            children: (
              <Flex vertical gap={16}>
                <Card
                  size="small"
                  title={
                    <Flex justify="space-between" align="center">
                      <Text strong>Corporate Entities & Subsidiaries</Text>
                      <Button size="small" icon={<PlusOutlined />} onClick={handleOpenCreateOrg}>
                        Register Entity
                      </Button>
                    </Flex>
                  }
                  styles={{ body: { padding: '16px' } }}
                >
                  <Row gutter={[14, 14]}>
                    {orgs.map((org) => (
                      <Col xs={24} md={12} lg={8} key={org.id}>
                        <Card
                          size="small"
                          title={
                            <Flex justify="space-between" align="center">
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{org.name}</span>
                              <Tag color="purple">{org.code}</Tag>
                            </Flex>
                          }
                          extra={
                            <Space size="small">
                              <Button
                                type="text"
                                shape="circle"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenEditOrg(org)}
                              />
                              <Popconfirm
                                title="Delete entity?"
                                onConfirm={() => handleDeleteOrg(org.id)}
                              >
                                <Button
                                  type="text"
                                  shape="circle"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                />
                              </Popconfirm>
                            </Space>
                          }
                        >
                          <Flex vertical gap={6} style={{ fontSize: 12 }}>
                            <Flex justify="space-between">
                              <Text type="secondary">Tax / VAT ID:</Text>
                              <Text strong>{org.taxId || 'N/A'}</Text>
                            </Flex>
                            <Flex justify="space-between">
                              <Text type="secondary">Corporate Email:</Text>
                              <Text>{org.email || 'N/A'}</Text>
                            </Flex>
                            <Flex justify="space-between">
                              <Text type="secondary">Direct Phone:</Text>
                              <Text>{org.phone || 'N/A'}</Text>
                            </Flex>
                            <Flex justify="space-between">
                              <Text type="secondary">Headquarters:</Text>
                              <Text style={{ maxWidth: 180 }} ellipsis>
                                {org.address || 'N/A'}
                              </Text>
                            </Flex>
                            <Flex justify="space-between" style={{ marginTop: 6 }}>
                              <Tag color="blue">{org.departmentsCount || 0} Departments</Tag>
                              <Tag color="green">{org.locationsCount || 0} Facilities</Tag>
                              <Tag color="processing">{org.usersCount || 0} Staff</Tag>
                            </Flex>
                          </Flex>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>

                <Card
                  size="small"
                  title="Physical Facilities, Regional Hubs & Data Centers"
                  styles={{ body: { padding: '16px' } }}
                >
                  <Row gutter={[14, 14]}>
                    {locations.map((loc) => (
                      <Col xs={24} sm={12} lg={8} key={loc.id}>
                        <Card
                          size="small"
                          title={
                            <Flex justify="space-between" align="center">
                              <Text strong style={{ fontSize: 13 }}>
                                {loc.name}
                              </Text>
                              <Tag color="green">{loc.type || 'Branch'}</Tag>
                            </Flex>
                          }
                        >
                          <Flex vertical gap={4} style={{ fontSize: 12 }}>
                            <Text type="secondary">{loc.address || 'Enterprise Address'}</Text>
                            <Text type="secondary">
                              {loc.building || ''} • {loc.floor || ''}{' '}
                              {loc.room ? `(${loc.room})` : ''}
                            </Text>
                            <Flex justify="space-between" style={{ marginTop: 8 }}>
                              <Tag color="blue">{loc._count?.assets || 0} Assets Deployed</Tag>
                              <Tag color="default">{loc._count?.users || 0} Assigned Users</Tag>
                            </Flex>
                          </Flex>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Flex>
            ),
          },
          {
            key: 'positions',
            label: (
              <span>
                <IdcardOutlined /> Job Positions & Titles ({positions.length})
              </span>
            ),
            children: (
              <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
                <Row
                  gutter={[14, 14]}
                  align="middle"
                  justify="space-between"
                  style={{ marginBottom: 16 }}
                >
                  <Col xs={24} md={10}>
                    <Input
                      placeholder="Search job titles or codes..."
                      prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} md={14}>
                    <Flex justify="flex-end" gap={8}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenCreatePos()}
                      >
                        Add Job Position
                      </Button>
                    </Flex>
                  </Col>
                </Row>

                <Table
                  columns={posColumns}
                  dataSource={filteredPositions}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 8, showTotal: (t) => `Total ${t} positions` }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Organization Modal */}
      <Modal
        title={editingOrg ? `Edit Entity: ${editingOrg.name}` : 'Register Enterprise Entity'}
        open={orgModalOpen}
        onOk={handleSaveOrg}
        onCancel={() => setOrgModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={580}
        okText={editingOrg ? 'Save Changes' : 'Register Entity'}
      >
        <Form form={orgForm} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={14}>
              <Form.Item label="Entity Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Acme Enterprise Global HQ" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Entity Code" name="code" rules={[{ required: true }]}>
                <Input placeholder="e.g. ACME-HQ" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Tax ID / VAT Registration" name="taxId">
                <Input placeholder="e.g. US-TAX-99881234" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Corporate Email" name="email">
                <Input placeholder="e.g. corp@acme.enterprise" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Phone Number" name="phone">
                <Input placeholder="e.g. +1 (555) 100-0000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Official Website" name="website">
                <Input placeholder="e.g. https://acme.enterprise" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Headquarters Address" name="address">
            <Input placeholder="e.g. 350 5th Ave, New York, NY 10118" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Department Modal */}
      <Modal
        title={
          editingDept ? `Edit Department: ${editingDept.name}` : 'Create Department / Division'
        }
        open={deptModalOpen}
        onOk={handleSaveDept}
        onCancel={() => setDeptModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={600}
        okText={editingDept ? 'Save Department' : 'Create Department'}
      >
        <Form form={deptForm} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={14}>
              <Form.Item label="Department Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Cloud Infrastructure & DevOps" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Department Code" name="code" rules={[{ required: true }]}>
                <Input placeholder="e.g. DEPT-CLOUD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Parent Division (Hierarchy)" name="parentId">
                <Select placeholder="None (Top-Level)" allowClear>
                  {departments
                    .filter((d) => !editingDept || d.id !== editingDept.id)
                    .map((d) => (
                      <Option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Enterprise Entity" name="organizationId">
                <Select placeholder="Select Entity">
                  {orgs.map((o) => (
                    <Option key={o.id} value={o.id}>
                      {o.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Department Manager Name" name="managerName">
                <Input placeholder="e.g. Sarah Chen" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Manager Email" name="managerEmail">
                <Input placeholder="e.g. sarah.chen@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Division Description & Responsibility" name="description">
            <Input.TextArea
              rows={2}
              placeholder="Describe scope, responsibilities, and team remit..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Position Modal */}
      <Modal
        title={editingPos ? `Edit Position: ${editingPos.title}` : 'Create Job Title / Position'}
        open={posModalOpen}
        onOk={handleSavePos}
        onCancel={() => setPosModalOpen(false)}
        confirmLoading={modalSubmitting}
        width={560}
        okText={editingPos ? 'Save Position' : 'Create Position'}
      >
        <Form form={posForm} layout="vertical" style={{ marginTop: 14 }}>
          <Row gutter={14}>
            <Col span={14}>
              <Form.Item label="Job Position Title" name="title" rules={[{ required: true }]}>
                <Input placeholder="e.g. Principal Cloud Infrastructure Architect" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Position Code" name="code" rules={[{ required: true }]}>
                <Input placeholder="e.g. POS-CLOUD-ARCH" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Department" name="departmentId" rules={[{ required: true }]}>
                <Select placeholder="Select Department">
                  {departments.map((d) => (
                    <Option key={d.id} value={d.id}>
                      {d.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Seniority Level" name="level">
                <Select>
                  <Option value="Executive">Executive</Option>
                  <Option value="Director">Director</Option>
                  <Option value="Lead">Lead</Option>
                  <Option value="Senior">Senior</Option>
                  <Option value="Mid">Mid-Level</Option>
                  <Option value="Junior">Junior</Option>
                  <Option value="Intern">Intern</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Job Description & Responsibilities" name="description">
            <Input.TextArea rows={2} placeholder="Describe duties and skill requirements..." />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
