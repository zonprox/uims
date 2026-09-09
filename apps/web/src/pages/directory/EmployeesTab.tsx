import {
  CopyOutlined,
  DeleteOutlined,
  DesktopOutlined,
  EditOutlined,
  EyeOutlined,
  LaptopOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
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
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, { useMemo, useState } from 'react';
import { directoryService } from '../../services/directory.service';

const { Text, Title } = Typography;
const { Option } = Select;

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

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [plantFilter, setPlantFilter] = useState('all');
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

  // Derive unique filter options
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  const plants = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.plant) set.add(e.plant);
    });
    return Array.from(set).sort();
  }, [employees]);

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
        (emp.computerName && emp.computerName.toLowerCase().includes(s)) ||
        (emp.department && emp.department.toLowerCase().includes(s));

      const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
      const matchesPlant = plantFilter === 'all' || emp.plant === plantFilter;
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const matchesOu =
        !ouFilter ||
        ouFilter === 'all' ||
        (emp.ouPath && emp.ouPath.toLowerCase().includes(ouFilter.toLowerCase()));

      return matchesSearch && matchesDept && matchesPlant && matchesStatus && matchesOu;
    });
  }, [employees, search, deptFilter, plantFilter, statusFilter, ouFilter]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${label} to clipboard: ${text}`);
  };

  const handleCreateEmployee = async (values: CreateDirectoryUserDto) => {
    setModalSubmitting(true);
    try {
      await directoryService.createEmployee({
        ...values,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        displayName: `${values.firstName} ${values.lastName}`.trim(),
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
      jobTitle: emp.jobTitle,
      company: emp.company,
      plant: emp.plant,
      department: emp.department,
      section: emp.section,
      computerName: emp.computerName,
      computerName2: emp.computerName2,
      telephone: emp.telephone,
      phone: emp.phone,
      adGroup: emp.adGroup,
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
        ...values,
        displayName:
          `${values.firstName || editingEmployee.firstName} ${values.lastName || editingEmployee.lastName}`.trim(),
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
        company: rowObj['Company'] || rowObj['Hcomp'] || 'BSL Others',
        plant: rowObj['Plant'] || rowObj['PlantLocation'] || 'BSL Others',
        department: rowObj['Department'] || rowObj['HDepartment'] || 'Production',
        section: rowObj['Section'] || rowObj['HSection'] || '',
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
      case 'CLOSED':
      case 'SUSPENDED':
        return <Tag color="error">Closed</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: unknown, record: DirectoryUser) => (
        <Flex align="center" gap={10}>
          <Avatar
            style={{
              backgroundColor: record.isClosed ? '#94a3b8' : '#1677ff',
              flexShrink: 0,
            }}
            icon={<UserOutlined />}
          >
            {(record.firstName || record.fullName || 'E')[0].toUpperCase()}
          </Avatar>
          <Flex vertical style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, lineHeight: '18px' }}>
              {record.fullName || `${record.firstName} ${record.lastName}`.trim()}
            </Text>
            {record.employeeCode && (
              <Text type="secondary" style={{ fontSize: 11.5 }}>
                #{record.employeeCode}
              </Text>
            )}
          </Flex>
        </Flex>
      ),
    },
    {
      title: 'Email & Contact',
      key: 'contact',
      render: (_: unknown, record: DirectoryUser) => (
        <Flex vertical gap={2}>
          <Flex align="center" gap={6}>
            <Text style={{ fontSize: 12 }}>{record.email}</Text>
            <Tooltip title="Copy email address">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />}
                onClick={() => copyToClipboard(record.email, 'Email')}
              />
            </Tooltip>
          </Flex>
          {(record.telephone || record.phone) && (
            <Flex align="center" gap={4}>
              <PhoneOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.telephone || record.phone}
              </Text>
            </Flex>
          )}
        </Flex>
      ),
    },
    {
      title: 'Job Title & Plant',
      key: 'placement',
      render: (_: unknown, record: DirectoryUser) => (
        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 12.5 }}>
            {record.jobTitle || 'Staff Member'}
          </Text>
          <Text type="secondary" style={{ fontSize: 11.5 }}>
            {record.company || 'Corporate'} • {record.plant || 'Main Plant'}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Department & Section',
      key: 'org',
      render: (_: unknown, record: DirectoryUser) => (
        <Flex vertical gap={2}>
          <Text style={{ fontSize: 12.5 }}>{record.department || 'General'}</Text>
          {record.section && (
            <Tag color="cyan" style={{ fontSize: 10.5, margin: 0, width: 'fit-content' }}>
              {record.section}
            </Tag>
          )}
        </Flex>
      ),
    },
    {
      title: 'Workstation',
      key: 'workstation',
      render: (_: unknown, record: DirectoryUser) => (
        <Flex vertical gap={2}>
          {record.computerName ? (
            <Flex align="center" gap={6}>
              <DesktopOutlined style={{ color: '#0ea5e9', fontSize: 12 }} />
              <Text code style={{ fontSize: 11.5 }}>
                {record.computerName}
              </Text>
              <Tooltip title="Copy computer name">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />}
                  onClick={() => copyToClipboard(record.computerName || '', 'Workstation')}
                />
              </Tooltip>
            </Flex>
          ) : (
            <Text type="secondary" style={{ fontSize: 11.5 }}>
              Unassigned
            </Text>
          )}
          {record.computerName2 && (
            <Text type="secondary" code style={{ fontSize: 10.5 }}>
              2nd: {record.computerName2}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Assigned Assets',
      key: 'assignedAssetsCount',
      render: (_: unknown, record: DirectoryUser) => (
        <Flex gap={4} align="center">
          <Tag color="blue" icon={<LaptopOutlined />}>
            {record.assignedAssetsCount ?? 0} Assets
          </Tag>
          <Tag color="purple" icon={<SafetyCertificateOutlined />}>
            {record.assignedLicensesCount ?? 0} Licenses
          </Tag>
        </Flex>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: DirectoryUser) => getStatusTag(record.status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: DirectoryUser) => (
        <Space orientation="horizontal" size={2}>
          <Tooltip title="View Profile & Custody">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDetailEmployee(record)}
            />
          </Tooltip>

          <Tooltip title="Edit Employee">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>

          <Tooltip title="Delete Record">
            <Popconfirm
              title="Delete Directory Record"
              description={`Permanently remove employee ${record.fullName || record.email} from directory?`}
              onConfirm={() => handleDeleteEmployee(record)}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

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
              placeholder="Search by name, code, email, PC..."
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={18}>
            <Flex justify="flex-end" gap={8} wrap>
              <Select
                value={deptFilter}
                onChange={setDeptFilter}
                style={{ width: 160 }}
                placeholder="Department"
              >
                <Option value="all">All Departments</Option>
                {departments.map((d) => (
                  <Option key={d} value={d}>
                    {d}
                  </Option>
                ))}
              </Select>

              <Select
                value={plantFilter}
                onChange={setPlantFilter}
                style={{ width: 140 }}
                placeholder="Plant"
              >
                <Option value="all">All Plants</Option>
                {plants.map((p) => (
                  <Option key={p} value={p}>
                    {p}
                  </Option>
                ))}
              </Select>

              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 130 }}
                placeholder="Status"
              >
                <Option value="all">All Statuses</Option>
                <Option value="ACTIVE">Active</Option>
                <Option value="DISABLED">Disabled</Option>
                <Option value="CLOSED">Closed</Option>
              </Select>

              <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
                Refresh
              </Button>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Employees Table */}
      <Table
        dataSource={filteredEmployees}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Total ${total} employees`,
        }}
        size="middle"
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
            company: 'BSL Others',
            plant: 'BSL Others',
            department: 'Production',
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="jobTitle" label="Job Title / Designation">
                <Input placeholder="e.g. Production Supervisor" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Input placeholder="e.g. Production" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="company" label="Company / Entity">
                <Input placeholder="e.g. BSL Others" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="plant" label="Plant Location">
                <Input placeholder="e.g. Plant 1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="section" label="Section">
                <Input placeholder="e.g. Printing" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="computerName" label="Primary Workstation Hostname">
                <Input placeholder="e.g. STOTHPR102" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="computerName2" label="Secondary Workstation Hostname">
                <Input placeholder="e.g. STOTHLAB01" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="telephone" label="Telephone / Extension">
                <Input placeholder="e.g. 888152675" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="adGroup" label="Security / Distribution Group">
                <Input placeholder="e.g. GR_BSLOTHPrinting" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ouPath" label="Organizational Unit Path">
            <Input placeholder="e.g. OU=Production,DC=uims,DC=internal" />
          </Form.Item>

          <Form.Item name="status" label="Account Status">
            <Select>
              <Option value="ACTIVE">Active</Option>
              <Option value="DISABLED">Disabled</Option>
              <Option value="CLOSED">Closed</Option>
            </Select>
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="jobTitle" label="Job Title / Designation">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="company" label="Company">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="plant" label="Plant">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="section" label="Section">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="computerName" label="Primary Workstation Hostname">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="computerName2" label="Secondary Workstation Hostname">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="telephone" label="Telephone / Extension">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="adGroup" label="Security Group">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ouPath" label="Organizational Unit Path">
            <Input />
          </Form.Item>

          <Form.Item name="status" label="Account Status">
            <Select>
              <Option value="ACTIVE">Active</Option>
              <Option value="DISABLED">Disabled</Option>
              <Option value="CLOSED">Closed</Option>
            </Select>
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
        onClose={() => setDetailEmployee(null)}
        styles={{ wrapper: { width: 540 } }}
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
                  {detailEmployee.jobTitle || 'Corporate Employee'}
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
              <Descriptions.Item label="Department">
                {detailEmployee.department || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Section / Sub-Section">
                {detailEmployee.section || 'N/A'}{' '}
                {detailEmployee.subSection ? `(${detailEmployee.subSection})` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Company & Plant">
                {detailEmployee.company || 'BSL Others'} • {detailEmployee.plant || 'Main Facility'}
              </Descriptions.Item>
              <Descriptions.Item label="Primary Workstation">
                {detailEmployee.computerName ? (
                  <Flex align="center" gap={6}>
                    <Text code strong>
                      {detailEmployee.computerName}
                    </Text>
                    <Tooltip title="Copy PC Name">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() =>
                          copyToClipboard(detailEmployee.computerName || '', 'PC Name')
                        }
                      />
                    </Tooltip>
                  </Flex>
                ) : (
                  'Unassigned'
                )}
              </Descriptions.Item>
              {detailEmployee.computerName2 && (
                <Descriptions.Item label="Secondary Workstation">
                  <Text code>{detailEmployee.computerName2}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Telephone / Phone">
                {detailEmployee.telephone || detailEmployee.phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Security Group">
                {detailEmployee.adGroup ? (
                  <Tag color="purple">{detailEmployee.adGroup}</Tag>
                ) : (
                  'None'
                )}
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
