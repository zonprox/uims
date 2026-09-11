import {
  ApartmentOutlined,
  BankOutlined,
  CopyOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  AccountStatus,
  BatchImportDirectoryResponse,
  BatchImportDirectoryUserItem,
  CreateDirectoryUserDto,
  DirectoryUser,
  UpdateDirectoryUserDto,
} from '@uims/shared-types';
import {
  Alert,
  App,
  Avatar,
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
  Row,
  Select,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { directoryService } from '../../services/directory.service';
import {
  type Department,
  type LocationBranch,
  type Organization,
  type Position,
  organizationService,
} from '../../services/organization.service';
import { EmployeeTable } from './components/EmployeeTable';

const { Text, Title } = Typography;

export interface EmployeesTabProps {
  employees: DirectoryUser[];
  loading: boolean;
  onRefresh: () => void;
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
  importModalOpen: boolean;
  setImportModalOpen: (open: boolean) => void;
  ouFilter?: string;
  onClearOuFilter?: () => void;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  loading,
  onRefresh,
  createModalOpen,
  setCreateModalOpen,
  importModalOpen,
  setImportModalOpen,
  ouFilter = 'all',
  onClearOuFilter,
}) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  // Master Data States for 3-tier cascade & relational selection
  const [orgs, setOrgs] = useState<Array<Organization>>([]);
  const [departments, setDepartments] = useState<Array<Department>>([]);
  const [positions, setPositions] = useState<Array<Position>>([]);
  const [locations, setLocations] = useState<Array<LocationBranch>>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Drawers state
  const [editingEmployee, setEditingEmployee] = useState<DirectoryUser | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<DirectoryUser | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Forms
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BatchImportDirectoryResponse | null>(null);

  // Load master entities on mount
  useEffect(() => {
    Promise.all([
      organizationService.getOrganizations().catch((_error: unknown) => []),
      organizationService.getDepartments().catch((_error: unknown) => []),
      organizationService.getPositions().catch((_error: unknown) => []),
      organizationService.getLocations().catch((_error: unknown) => []),
    ]).then(([o, d, p, l]) => {
      setOrgs(o);
      setDepartments(d);
      setPositions(p);
      setLocations(l);
    });
  }, []);

  // 3-Tier Cascade Options & Watches for Create Form
  const createOrgId = Form.useWatch('organizationId', createForm);
  const createDeptId = Form.useWatch('departmentId', createForm);

  const createFilteredDepartments = useMemo(() => {
    if (!createOrgId) return departments;
    return departments.filter((d) => d.organizationId === createOrgId);
  }, [departments, createOrgId]);

  const createFilteredPositions = useMemo(() => {
    if (!createDeptId) return positions;
    return positions.filter((p) => p.departmentId === createDeptId);
  }, [positions, createDeptId]);

  // 3-Tier Cascade Options & Watches for Edit Form
  const editOrgId = Form.useWatch('organizationId', editForm);
  const editDeptId = Form.useWatch('departmentId', editForm);

  const editFilteredDepartments = useMemo(() => {
    if (!editOrgId) return departments;
    return departments.filter((d) => d.organizationId === editOrgId);
  }, [departments, editOrgId]);

  const editFilteredPositions = useMemo(() => {
    if (!editDeptId) return positions;
    return positions.filter((p) => p.departmentId === editDeptId);
  }, [positions, editDeptId]);

  // Reusable Options
  const orgOptions = useMemo(
    () =>
      orgs.map((o) => ({
        label: `${o.name} (${o.code})`,
        value: o.id,
      })),
    [orgs],
  );

  const locationOptions = useMemo(
    () =>
      locations.map((loc) => ({
        label: `${loc.name}${loc.building ? ` (${loc.building}${loc.floor ? ` - ${loc.floor}` : ''})` : ''}`,
        value: loc.id,
      })),
    [locations],
  );

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const s = search.toLowerCase().trim();
      const matchesSearch =
        !s ||
        emp.email.toLowerCase().includes(s) ||
        (emp.fullName && emp.fullName.toLowerCase().includes(s)) ||
        (emp.firstName && emp.firstName.toLowerCase().includes(s)) ||
        (emp.lastName && emp.lastName.toLowerCase().includes(s)) ||
        (emp.employeeCode && emp.employeeCode.toLowerCase().includes(s)) ||
        (emp.department?.name && emp.department.name.toLowerCase().includes(s)) ||
        (emp.organization?.name && emp.organization.name.toLowerCase().includes(s)) ||
        (emp.position?.title && emp.position.title.toLowerCase().includes(s));

      const matchesDept =
        deptFilter === 'all' ||
        emp.departmentId === deptFilter ||
        emp.department?.id === deptFilter;
      const matchesOrg =
        orgFilter === 'all' ||
        emp.organizationId === orgFilter ||
        emp.organization?.id === orgFilter;
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const matchesOu =
        !ouFilter ||
        ouFilter === 'all' ||
        (emp.ouPath && emp.ouPath.toLowerCase().includes(ouFilter.toLowerCase()));

      return matchesSearch && matchesDept && matchesOrg && matchesStatus && matchesOu;
    });
  }, [employees, search, deptFilter, orgFilter, statusFilter, ouFilter]);

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      message.success(`Copied ${label} to clipboard: ${text}`);
    },
    [message],
  );

  const handleCreateEmployee = async (values: CreateDirectoryUserDto) => {
    setModalSubmitting(true);
    try {
      await directoryService.createEmployee({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        displayName: `${values.firstName.trim()} ${values.lastName.trim()}`,
        email: values.email.trim(),
        employeeCode: values.employeeCode?.trim() || undefined,
        organizationId: values.organizationId || undefined,
        departmentId: values.departmentId || undefined,
        positionId: values.positionId || undefined,
        locationId: values.locationId || undefined,
        phone: values.phone?.trim() || undefined,
        ouPath: values.ouPath?.trim() || undefined,
        status: values.status || ('ACTIVE' as AccountStatus),
      });
      message.success('Employee directory record created successfully.');
      setCreateModalOpen(false);
      createForm.resetFields();
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to create employee record.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenEdit = (emp: DirectoryUser) => {
    setEditingEmployee(emp);
    editForm.setFieldsValue({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      employeeCode: emp.employeeCode,
      organizationId: emp.organizationId || emp.organization?.id,
      departmentId: emp.departmentId || emp.department?.id,
      positionId: emp.positionId || emp.position?.id,
      locationId: emp.locationId || emp.location?.id,
      phone: emp.phone,
      ouPath: emp.ouPath,
      managerName: emp.managerName,
      status: emp.status,
    });
  };

  const handleUpdateEmployee = async (values: UpdateDirectoryUserDto) => {
    if (!editingEmployee) return;
    setModalSubmitting(true);
    try {
      await directoryService.updateEmployee(editingEmployee.id, {
        firstName: values.firstName ? values.firstName.trim() : undefined,
        lastName: values.lastName ? values.lastName.trim() : undefined,
        displayName:
          `${values.firstName || editingEmployee.firstName} ${values.lastName || editingEmployee.lastName}`.trim(),
        email: values.email ? values.email.trim() : undefined,
        employeeCode: values.employeeCode?.trim() || undefined,
        organizationId: values.organizationId || undefined,
        departmentId: values.departmentId || undefined,
        positionId: values.positionId || undefined,
        locationId: values.locationId || undefined,
        phone: values.phone?.trim() || undefined,
        ouPath: values.ouPath?.trim() || undefined,
        status: values.status,
      });
      message.success('Employee record updated successfully.');
      setEditingEmployee(null);
      editForm.resetFields();
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to update employee record.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (emp: DirectoryUser) => {
    try {
      await directoryService.deleteEmployee(emp.id);
      message.success(`Employee ${emp.fullName || emp.email} removed from directory.`);
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to remove employee record.');
    }
  };

  const parseCsvToItems = (content: string): BatchImportDirectoryUserItem[] => {
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(/,|\t/).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const items: BatchImportDirectoryUserItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(/,|\t/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2) continue;

      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cols[idx] || '';
      });

      const name = rowObj['Name'] || rowObj['HName'] || cols[1] || '';
      const email = rowObj['Email'] || rowObj['HEmail'] || cols[2] || '';
      if (!name || !email) continue;

      items.push({
        employeeCode: rowObj['ID'] || rowObj['HEmploy'] || rowObj['employeeCode'] || cols[0] || '',
        name,
        email,
        designation: rowObj['Designation'] || rowObj['HDesignation'] || rowObj['jobTitle'] || '',
        department: rowObj['Department'] || rowObj['HDepartment'] || 'Production',
        computerName: rowObj['Computer Name'] || rowObj['computerName'] || '',
        adGroup: rowObj['GR_GROUP USER'] || rowObj['adGroup'] || '',
        ouPath: rowObj['ouPath'] || 'OU=Production,DC=uims,DC=internal',
        telephone: rowObj['HTelephone'] || rowObj['phone'] || '',
        status: rowObj['State'] || rowObj['status'] || 'ACTIVE',
      });
    }

    return items;
  };

  const handleImportSubmit = async () => {
    const items = parseCsvToItems(csvText);
    if (items.length === 0) {
      message.warning('No valid employee records parsed. Check CSV formatting.');
      return;
    }
    setImporting(true);
    try {
      const result = await directoryService.importEmployees(items);
      setImportResult(result);
      message.success(
        `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
      );
      onRefresh();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      message.error(errorObj.response?.data?.message || 'Failed to import employee batch.');
    } finally {
      setImporting(false);
    }
  };

  const getStatusTag = (status: string | AccountStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Tag color="success">Active</Tag>;
      case 'DISABLED':
        return <Tag color="warning">Disabled</Tag>;
      case 'LOCKED':
        return <Tag color="orange">Locked</Tag>;
      case 'SUSPENDED':
        return <Tag color="error">Suspended</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  return (
    <div>
      {/* OU Filter Active Banner */}
      {ouFilter && ouFilter !== 'all' && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={
            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
              <span>
                Filtering directory employees by Organizational Unit: <Text code>{ouFilter}</Text>
              </span>
              <Button size="small" type="link" onClick={onClearOuFilter}>
                Clear Filter
              </Button>
            </Flex>
          }
        />
      )}

      {/* Filter Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: '12px 16px' } }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by name, code, email..."
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={18}>
            <Flex justify="flex-end" gap={8} wrap>
              <Select
                value={orgFilter}
                onChange={setOrgFilter}
                style={{ width: 170 }}
                placeholder="Organization"
                options={[
                  { label: 'All Organizations', value: 'all' },
                  ...orgs.map((o) => ({ label: o.name, value: o.id })),
                ]}
              />

              <Select
                value={deptFilter}
                onChange={setDeptFilter}
                style={{ width: 160 }}
                placeholder="Department"
                options={[
                  { label: 'All Departments', value: 'all' },
                  ...departments.map((d) => ({ label: d.name, value: d.id })),
                ]}
              />

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 130 }}
                placeholder="Status"
                options={[
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Disabled', value: 'DISABLED' },
                  { label: 'Locked', value: 'LOCKED' },
                  { label: 'Suspended', value: 'SUSPENDED' },
                ]}
              />

              <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
                Refresh
              </Button>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Employees Table */}
      <EmployeeTable
        employees={filteredEmployees}
        loading={loading}
        onViewDetails={setDetailEmployee}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteEmployee}
        copyToClipboard={copyToClipboard}
        getStatusTag={getStatusTag}
      />

      {/* Create Employee Modal (STRICTLY NO PASSWORD FIELD) */}
      <Modal
        title="Add Employee Record"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={modalSubmitting}
        okText="Add Employee"
        cancelText="Cancel"
        destroyOnHidden
        width={680}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateEmployee}
          initialValues={{
            status: 'ACTIVE',
            ouPath: 'OU=Production,DC=uims,DC=internal',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'First name is required.' }]}
              >
                <Input placeholder="e.g. John" autoFocus />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Last name is required.' }]}
              >
                <Input placeholder="e.g. Smith" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Corporate Email"
                rules={[
                  { required: true, message: 'Email is required.' },
                  { type: 'email', message: 'Enter a valid corporate email.' },
                ]}
              >
                <Input placeholder="e.g. jsmith@uims.internal" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employeeCode" label="Employee ID / Badge Code">
                <Input placeholder="e.g. 63020037" />
              </Form.Item>
            </Col>
          </Row>

          {/* 3-Tier Cascading Select: Level 1 (Org) & Level 2 (Dept) */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="organizationId" label="Organization">
                <Select
                  placeholder="Select Organization"
                  showSearch
                  allowClear
                  options={orgOptions}
                  onChange={() => {
                    createForm.setFieldsValue({ departmentId: undefined, positionId: undefined });
                  }}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentId" label="Department">
                <Select
                  placeholder={createOrgId ? 'Select Department' : 'Select Organization first'}
                  showSearch
                  allowClear
                  disabled={!createOrgId}
                  options={createFilteredDepartments.map((d) => ({
                    label: `${d.name} (${d.code})`,
                    value: d.id,
                  }))}
                  onChange={() => {
                    createForm.setFieldsValue({ positionId: undefined });
                  }}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 3-Tier Cascading Select: Level 3 (Position) & Location */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="positionId" label="Position / Role">
                <Select
                  placeholder={createDeptId ? 'Select Position' : 'Select Department first'}
                  showSearch
                  allowClear
                  disabled={!createDeptId}
                  options={createFilteredPositions.map((p) => ({
                    label: `${p.title} (${p.code})`,
                    value: p.id,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="locationId" label="Facility Location">
                <Select
                  placeholder="Select Site / Location"
                  showSearch
                  allowClear
                  options={locationOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone / Telephone">
                <Input placeholder="e.g. +84 222 384 8000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ouPath" label="Organizational Unit Path">
                <Input placeholder="e.g. OU=Production,DC=uims,DC=internal" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="Account Status">
            <Select
              options={[
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Disabled', value: 'DISABLED' },
                { label: 'Locked', value: 'LOCKED' },
                { label: 'Suspended', value: 'SUSPENDED' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Employee Modal (STRICTLY NO PASSWORD FIELD) */}
      <Modal
        title={`Edit Employee: ${editingEmployee?.fullName || editingEmployee?.email}`}
        open={Boolean(editingEmployee)}
        onCancel={() => {
          setEditingEmployee(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={modalSubmitting}
        okText="Save Changes"
        cancelText="Cancel"
        destroyOnHidden
        width={680}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateEmployee}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: 'First name is required.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: 'Last name is required.' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Corporate Email"
                rules={[
                  { required: true, message: 'Email is required.' },
                  { type: 'email', message: 'Enter a valid email.' },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employeeCode" label="Employee ID / Badge Code">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          {/* 3-Tier Cascading Select: Level 1 (Org) & Level 2 (Dept) */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="organizationId"
                label="Organization"
                rules={[{ required: true, message: 'Please select an organization.' }]}
              >
                <Select
                  placeholder="Select Organization"
                  showSearch
                  allowClear
                  options={orgOptions}
                  onChange={() => {
                    editForm.setFieldsValue({ departmentId: undefined, positionId: undefined });
                  }}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="departmentId"
                label="Department"
                rules={[{ required: true, message: 'Please select a department.' }]}
              >
                <Select
                  placeholder={editOrgId ? 'Select Department' : 'Select Organization first'}
                  showSearch
                  allowClear
                  options={editFilteredDepartments.map((d) => ({
                    label: `${d.name} (${d.code})`,
                    value: d.id,
                  }))}
                  onChange={() => {
                    editForm.setFieldsValue({ positionId: undefined });
                  }}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 3-Tier Cascading Select: Level 3 (Position) & Location */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="positionId" label="Position / Role">
                <Select
                  placeholder={editDeptId ? 'Select Position' : 'Select Department first'}
                  showSearch
                  allowClear
                  options={editFilteredPositions.map((p) => ({
                    label: `${p.title} (${p.code})`,
                    value: p.id,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="locationId" label="Facility Location">
                <Select
                  placeholder="Select Site / Location"
                  showSearch
                  allowClear
                  options={locationOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone / Telephone">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ouPath" label="Organizational Unit Path">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="Account Status">
            <Select
              options={[
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Disabled', value: 'DISABLED' },
                { label: 'Locked', value: 'LOCKED' },
                { label: 'Suspended', value: 'SUSPENDED' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* CSV Batch Import Modal */}
      <Modal
        title="Import Employees from CSV"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false);
          setCsvText('');
          setImportResult(null);
        }}
        onOk={handleImportSubmit}
        confirmLoading={importing}
        okText="Execute Import"
        cancelText="Cancel"
        width={720}
        destroyOnHidden
        styles={{ body: { paddingTop: 16 } }}
      >
        <Flex vertical gap={12}>
          <Alert
            type="info"
            showIcon
            title="CSV Format Guidelines"
            description="Paste tabular CSV data containing headers (Name, Email, ID/EmployeeCode, Designation, Department, Plant, Computer Name, Group). Initial passwords and application login capability are strictly prohibited for directory records."
          />

          <Input.TextArea
            rows={8}
            placeholder={`STT,HEmploy,HName,HDesignation,HDepartment,Hcomp,Plant,Computer Name,HEmail,HTelephone,GR_GROUP USER\n1,63020037,Phung Thi Nhu Y,Asst. Officer,Production,BSL Others,OTH,STOTHPR102,yptn.st@youngonevn.com,888152675,GR_BSLOTHPrinting`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />

          {importResult && (
            <Card size="small" style={{ backgroundColor: token.colorFillAlter }}>
              <Flex vertical gap={6}>
                <Text strong>Import Execution Summary:</Text>
                <Flex gap={16}>
                  <Text type="success">Created: {importResult.created}</Text>
                  <Text style={{ color: '#0ea5e9' }}>Updated: {importResult.updated}</Text>
                  <Text type="warning">Skipped: {importResult.skipped}</Text>
                  <Text type="danger">Errors: {importResult.errors?.length ?? 0}</Text>
                </Flex>
                {importResult.errors && importResult.errors.length > 0 && (
                  <Flex vertical gap={2} style={{ marginTop: 6 }}>
                    {importResult.errors.slice(0, 5).map((err, idx) => (
                      <Text type="danger" key={idx} style={{ fontSize: 11 }}>
                        Row {err.row}: {err.error}
                      </Text>
                    ))}
                  </Flex>
                )}
              </Flex>
            </Card>
          )}
        </Flex>
      </Modal>

      {/* Employee Detail Drawer */}
      <Drawer
        title="Employee Directory Profile"
        open={Boolean(detailEmployee)}
        destroyOnHidden
        size={540}
        onClose={() => setDetailEmployee(null)}
      >
        {detailEmployee && (
          <Flex vertical gap={16}>
            <Flex align="center" gap={14}>
              <Avatar size={54} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }}>
                {(detailEmployee.firstName || detailEmployee.fullName || 'E')[0].toUpperCase()}
              </Avatar>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {detailEmployee.fullName ||
                    `${detailEmployee.firstName} ${detailEmployee.lastName}`.trim()}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {detailEmployee.position?.title || 'Corporate Employee'}
                </Text>
                <div style={{ marginTop: 4 }}>{getStatusTag(detailEmployee.status)}</div>
              </div>
            </Flex>

            <Divider style={{ margin: '8px 0' }} />

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Corporate Email">
                <Flex align="center" gap={6}>
                  <Text strong>{detailEmployee.email}</Text>
                  <Tooltip title="Copy Email">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(detailEmployee.email, 'Email')}
                    />
                  </Tooltip>
                </Flex>
              </Descriptions.Item>
              <Descriptions.Item label="Employee Code">
                {detailEmployee.employeeCode || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Organization">
                {detailEmployee.organization ? (
                  <Tag color="purple" icon={<BankOutlined />}>
                    {detailEmployee.organization.name}
                  </Tag>
                ) : (
                  'N/A'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {detailEmployee.department ? (
                  <Tag color="blue" icon={<ApartmentOutlined />}>
                    {detailEmployee.department.name}
                  </Tag>
                ) : (
                  'N/A'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Position / Role">
                {detailEmployee.position?.title || 'Staff Member'}
              </Descriptions.Item>
              <Descriptions.Item label="Facility Location">
                {detailEmployee.location ? (
                  <Tag color="green" icon={<EnvironmentOutlined />}>
                    {detailEmployee.location.name}
                  </Tag>
                ) : (
                  'N/A'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Phone Number">
                {detailEmployee.phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Organizational Unit">
                <Text code style={{ fontSize: 11 }}>
                  {detailEmployee.ouPath || 'N/A'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Assets">
                <Tag color="blue">{detailEmployee.assignedAssetsCount ?? 0} Hardware Units</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Software Licenses">
                <Tag color="cyan">{detailEmployee.assignedLicensesCount ?? 0} Allocated Seats</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Alert
              type="info"
              showIcon
              title="Directory Record Isolation"
              description="This record represents a corporate employee and hardware custodian. Directory records do not hold console passwords or application login rights."
            />
          </Flex>
        )}
      </Drawer>
    </div>
  );
};
