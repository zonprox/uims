import {
  ApartmentOutlined,
  BankOutlined,
  CopyOutlined,
  DisconnectOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  KeyOutlined,
  LaptopOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  AccountStatus,
  Asset,
  BatchImportDirectoryResponse,
  BatchImportDirectoryUserItem,
  CreateDirectoryUserDto,
  DirectoryUser,
  License,
  LicenseAssignment,
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
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppDrawer from '../../components/AppDrawer';
import { directoryService } from '../../services/directory.service';
import {
  type Department,
  type Organization,
  type Position,
  organizationService,
} from '../../services/organization.service';
import { formatErrorMessage } from '../../utils/feedback';
import { formRules, isValidationError } from '../../utils/formValidators';
import { EmployeeTable } from './components/EmployeeTable';

const { Text } = Typography;

export interface EmployeesTabProps {
  employees: DirectoryUser[];
  loading: boolean;
  onRefresh: () => void;
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
  importModalOpen: boolean;
  setImportModalOpen: (open: boolean) => void;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  employees,
  loading,
  onRefresh,
  createModalOpen,
  setCreateModalOpen,
  importModalOpen,
  setImportModalOpen,
}) => {
  const { message } = App.useApp();
  const { token } = theme.useToken();

  // Master Data States for 3-tier cascade & relational selection
  const [orgs, setOrgs] = useState<Array<Organization>>([]);
  const [departments, setDepartments] = useState<Array<Department>>([]);
  const [positions, setPositions] = useState<Array<Position>>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Drawers state
  const [editingEmployee, setEditingEmployee] = useState<DirectoryUser | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<DirectoryUser | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState('general');
  const [activeEditTab, setActiveEditTab] = useState('general');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const currentCustodyEmpIdRef = useRef<string | null>(null);

  // Forms
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Custody states (Assets & Licenses) for Detail Drawer
  const [userAssets, setUserAssets] = useState<Asset[]>([]);
  const [userAssetsLoading, setUserAssetsLoading] = useState(false);
  const [userLicenses, setUserLicenses] = useState<Array<LicenseAssignment & { license: License }>>(
    [],
  );
  const [userLicensesLoading, setUserLicensesLoading] = useState(false);

  // Assign Device modal state
  const [assignAssetModalOpen, setAssignAssetModalOpen] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [loadingAvailableAssets, setLoadingAvailableAssets] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);
  const [assigningAsset, setAssigningAsset] = useState(false);

  // Assign License modal state
  const [assignLicenseModalOpen, setAssignLicenseModalOpen] = useState(false);
  const [availableLicenses, setAvailableLicenses] = useState<License[]>([]);
  const [loadingAvailableLicenses, setLoadingAvailableLicenses] = useState(false);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | undefined>(undefined);
  const [assigningLicense, setAssigningLicense] = useState(false);

  // Credential operations state
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetPasswordType, setResetPasswordType] = useState<'auto' | 'custom'>('auto');
  const [customResetPassword, setCustomResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

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
    ]).then(([o, d, p]) => {
      setOrgs(o);
      setDepartments(d);
      setPositions(p);
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
  const editEmailWatch = Form.useWatch('email', editForm);
  const editFirstNameWatch = Form.useWatch('firstName', editForm);
  const editLastNameWatch = Form.useWatch('lastName', editForm);
  const editEmployeeCodeWatch = Form.useWatch('employeeCode', editForm);
  const editStatusWatch = Form.useWatch('status', editForm);
  const editDomainJoinStatusWatch = Form.useWatch('domainJoinStatus', editForm);

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

      return matchesSearch && matchesDept && matchesOrg && matchesStatus;
    });
  }, [employees, search, deptFilter, orgFilter, statusFilter]);

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      message.success(`Copied ${label} to clipboard: ${text}`);
    },
    [message],
  );

  const handleOpenDetail = useCallback(
    (emp: DirectoryUser) => {
      setEditingEmployee(null);
      setDetailEmployee(emp);
      setRevealedPassword(null);
      setActiveDetailTab('general');
      setUserAssets([]);
      setUserLicenses([]);
      currentCustodyEmpIdRef.current = emp.id;
      if (typeof directoryService.getUserAssets === 'function') {
        setUserAssetsLoading(true);
        directoryService
          .getUserAssets(emp.id)
          .then((assets) => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserAssets(assets);
            }
          })
          .catch((err: unknown) => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserAssets([]);
              message.error(formatErrorMessage(err, 'load assigned equipment'));
            }
          })
          .finally(() => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserAssetsLoading(false);
            }
          });
      }

      if (typeof directoryService.getUserLicenses === 'function') {
        setUserLicensesLoading(true);
        directoryService
          .getUserLicenses(emp.id)
          .then((licenses) => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserLicenses(licenses);
            }
          })
          .catch((err: unknown) => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserLicenses([]);
              message.error(formatErrorMessage(err, 'load assigned licenses'));
            }
          })
          .finally(() => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserLicensesLoading(false);
            }
          });
      }
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
        phone: values.phone?.trim() || undefined,
        status: values.status || ('ACTIVE' as AccountStatus),
        adDomain: values.adDomain?.trim() || undefined,
        computerName: values.computerName?.trim() || undefined,
        domainJoined: values.domainJoinStatus === 'JOINED',
        domainJoinStatus: values.domainJoinStatus || undefined,
      });
      message.success('Employee directory record created successfully.');
      setCreateModalOpen(false);
      createForm.resetFields();
      onRefresh();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      message.error(formatErrorMessage(err, 'create employee record'));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenEdit = useCallback(
    (emp: DirectoryUser) => {
      setDetailEmployee(null);
      setEditingEmployee(emp);
      setActiveEditTab('general');
      setUserAssets([]);
      setUserLicenses([]);

      const deptId =
        emp.departmentId ||
        emp.department?.id ||
        (emp.positionId ? positions.find((p) => p.id === emp.positionId)?.departmentId : undefined);

      const deptOrgId =
        emp.organizationId ||
        emp.organization?.id ||
        emp.department?.organizationId ||
        (deptId ? departments.find((d) => d.id === deptId)?.organizationId : undefined);

      editForm.setFieldsValue({
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        employeeCode: emp.employeeCode,
        organizationId: deptOrgId,
        departmentId: deptId,
        positionId: emp.positionId || emp.position?.id,
        phone: emp.phone,
        managerName: emp.managerName,
        status: emp.status || ('ACTIVE' as AccountStatus),
        adDomain: emp.adDomain,
        computerName: emp.computerName,
        domainJoinStatus: emp.domainJoinStatus || (emp.domainJoined ? 'JOINED' : 'NOT_JOINED'),
      });

      currentCustodyEmpIdRef.current = emp.id;
      if (typeof directoryService.getUserAssets === 'function') {
        setUserAssetsLoading(true);
        directoryService
          .getUserAssets(emp.id)
          .then((assets) => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserAssets(assets);
            }
          })
          .catch((err: unknown) => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserAssets([]);
              message.error(formatErrorMessage(err, 'load assigned equipment'));
            }
          })
          .finally(() => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserAssetsLoading(false);
            }
          });
      }

      if (typeof directoryService.getUserLicenses === 'function') {
        setUserLicensesLoading(true);
        directoryService
          .getUserLicenses(emp.id)
          .then((licenses) => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserLicenses(licenses);
            }
          })
          .catch((err: unknown) => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserLicenses([]);
              message.error(formatErrorMessage(err, 'load assigned licenses'));
            }
          })
          .finally(() => {
            if (currentCustodyEmpIdRef.current === emp.id) {
              setUserLicensesLoading(false);
            }
          });
      }
    },
    [editForm, message, departments, positions],
  );

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
        phone: values.phone?.trim() || undefined,
        status: values.status,
        adDomain: values.adDomain?.trim() || undefined,
        computerName: values.computerName?.trim() || undefined,
        domainJoined:
          values.domainJoinStatus !== undefined
            ? values.domainJoinStatus === 'JOINED'
            : editingEmployee.domainJoined,
        domainJoinStatus: values.domainJoinStatus || undefined,
      });
      message.success('Employee record updated successfully.');
      setEditingEmployee(null);
      editForm.resetFields();
      onRefresh();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      message.error(formatErrorMessage(err, 'update employee record'));
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
      message.error(formatErrorMessage(err, 'remove employee record'));
    }
  };

  // Credential Handlers (Audited Reveal, Copy, Reset)
  const handleRevealPassword = async () => {
    if (!detailEmployee) return;
    setRevealLoading(true);
    try {
      const res = await directoryService.revealEmailPassword(detailEmployee.id);
      setRevealedPassword(res.password);
      message.success('Email password decrypted and revealed.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'reveal email password'));
    } finally {
      setRevealLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!detailEmployee) return;
    setCopyLoading(true);
    try {
      const res = await directoryService.revealEmailPassword(detailEmployee.id);
      navigator.clipboard.writeText(res.password);
      await directoryService.copyEmailPassword(detailEmployee.id);
      message.success('Email password copied to clipboard.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'copy email password'));
    } finally {
      setCopyLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!detailEmployee) return;
    const isAuto = resetPasswordType === 'auto';
    if (!isAuto) {
      const pwd = customResetPassword.trim();
      if (!pwd) {
        message.warning('Please enter a new password.');
        return;
      }
      if (pwd.length < 8 || pwd.length > 128) {
        message.warning('Password must be between 8 and 128 characters long.');
        return;
      }
    }
    setResetSubmitting(true);
    try {
      const res = await directoryService.resetEmailPassword(detailEmployee.id, {
        generateRandom: isAuto,
        password: isAuto ? undefined : customResetPassword.trim(),
      });
      message.success('Email password reset successfully.');
      if (res.password) {
        setRevealedPassword(res.password);
        navigator.clipboard.writeText(res.password);
        message.info(`Auto-generated password: ${res.password}`);
      } else if (!isAuto) {
        setRevealedPassword(customResetPassword.trim());
      }
      setDetailEmployee((prev) => (prev ? { ...prev, hasEmailPassword: true } : null));
      setResetModalOpen(false);
      setCustomResetPassword('');
      onRefresh();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      message.error(formatErrorMessage(err, 'reset email password'));
    } finally {
      setResetSubmitting(false);
    }
  };

  // Device (Asset) Assignment Handlers
  const openAssignAssetModal = async () => {
    const target = detailEmployee || editingEmployee;
    if (!target) return;
    setSelectedAssetId(undefined);
    setAssignAssetModalOpen(true);
    setLoadingAvailableAssets(true);
    try {
      const assets = await directoryService.getAvailableAssets();
      setAvailableAssets(assets);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load available equipment'));
      setAvailableAssets([]);
    } finally {
      setLoadingAvailableAssets(false);
    }
  };

  const handleAssignAsset = async () => {
    const target = detailEmployee || editingEmployee;
    if (!target || !selectedAssetId) return;
    setAssigningAsset(true);
    try {
      await directoryService.assignAsset(target.id, selectedAssetId);
      message.success('Equipment assigned successfully.');
      setAssignAssetModalOpen(false);
      setSelectedAssetId(undefined);
      const updated = await directoryService.getUserAssets(target.id);
      setUserAssets(updated);
      if (detailEmployee) {
        setDetailEmployee((prev) =>
          prev ? { ...prev, assignedAssetsCount: updated.length } : null,
        );
      }
      if (editingEmployee) {
        setEditingEmployee((prev) =>
          prev ? { ...prev, assignedAssetsCount: updated.length } : null,
        );
      }
      onRefresh();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'assign equipment to employee'));
    } finally {
      setAssigningAsset(false);
    }
  };

  const handleUnassignAsset = async (assetId: string) => {
    const target = detailEmployee || editingEmployee;
    if (!target) return;
    try {
      await directoryService.unassignAsset(target.id, assetId);
      message.success('Equipment unassigned successfully.');
      try {
        const updated = await directoryService.getUserAssets(target.id);
        setUserAssets(updated);
        if (detailEmployee) {
          setDetailEmployee((prev) =>
            prev ? { ...prev, assignedAssetsCount: updated.length } : null,
          );
        }
        if (editingEmployee) {
          setEditingEmployee((prev) =>
            prev ? { ...prev, assignedAssetsCount: updated.length } : null,
          );
        }
      } catch {
        setUserAssets((prev) => {
          const filtered = prev.filter((a) => a.id !== assetId);
          if (detailEmployee) {
            setDetailEmployee((curr) =>
              curr ? { ...curr, assignedAssetsCount: filtered.length } : null,
            );
          }
          if (editingEmployee) {
            setEditingEmployee((curr) =>
              curr ? { ...curr, assignedAssetsCount: filtered.length } : null,
            );
          }
          return filtered;
        });
      }
      onRefresh();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'unassign equipment'));
    }
  };

  // License Assignment Handlers
  const openAssignLicenseModal = async () => {
    const target = detailEmployee || editingEmployee;
    if (!target) return;
    setSelectedLicenseId(undefined);
    setAssignLicenseModalOpen(true);
    setLoadingAvailableLicenses(true);
    try {
      const licenses = await directoryService.getAvailableLicenses();
      setAvailableLicenses(licenses);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'load available licenses'));
      setAvailableLicenses([]);
    } finally {
      setLoadingAvailableLicenses(false);
    }
  };

  const handleAssignLicense = async () => {
    const target = detailEmployee || editingEmployee;
    if (!target || !selectedLicenseId) return;
    setAssigningLicense(true);
    try {
      await directoryService.assignLicense(target.id, selectedLicenseId);
      message.success('License seat assigned successfully.');
      setAssignLicenseModalOpen(false);
      setSelectedLicenseId(undefined);
      const updated = await directoryService.getUserLicenses(target.id);
      setUserLicenses(updated);
      if (detailEmployee) {
        setDetailEmployee((prev) =>
          prev ? { ...prev, assignedLicensesCount: updated.length } : null,
        );
      }
      if (editingEmployee) {
        setEditingEmployee((prev) =>
          prev ? { ...prev, assignedLicensesCount: updated.length } : null,
        );
      }
      onRefresh();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'assign license seat'));
    } finally {
      setAssigningLicense(false);
    }
  };

  const handleUnassignLicense = async (assignmentId: string) => {
    const target = detailEmployee || editingEmployee;
    if (!target) return;
    try {
      await directoryService.unassignLicense(target.id, assignmentId);
      message.success('License seat revoked successfully.');
      try {
        const updated = await directoryService.getUserLicenses(target.id);
        setUserLicenses(updated);
        if (detailEmployee) {
          setDetailEmployee((prev) =>
            prev ? { ...prev, assignedLicensesCount: updated.length } : null,
          );
        }
        if (editingEmployee) {
          setEditingEmployee((prev) =>
            prev ? { ...prev, assignedLicensesCount: updated.length } : null,
          );
        }
      } catch {
        setUserLicenses((prev) => {
          const filtered = prev.filter((la) => la.id !== assignmentId);
          if (detailEmployee) {
            setDetailEmployee((curr) =>
              curr ? { ...curr, assignedLicensesCount: filtered.length } : null,
            );
          }
          if (editingEmployee) {
            setEditingEmployee((curr) =>
              curr ? { ...curr, assignedLicensesCount: filtered.length } : null,
            );
          }
          return filtered;
        });
      }
      onRefresh();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'revoke license seat'));
    }
  };

  const renderDevicesTabContent = (_targetEmployee: DirectoryUser | null) => (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center">
        <Text strong>Assigned Equipment ({userAssets.length})</Text>
        <Button
          type="primary"
          size="small"
          htmlType="button"
          icon={<PlusOutlined />}
          onClick={openAssignAssetModal}
        >
          Assign Device
        </Button>
      </Flex>

      {userAssets.length === 0 && !userAssetsLoading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No equipment currently assigned to this employee."
        />
      ) : (
        <Table
          dataSource={userAssets}
          rowKey="id"
          loading={userAssetsLoading}
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: 'Asset Tag',
              dataIndex: 'assetTag',
              key: 'assetTag',
              render: (tag: string, record: Asset) => (
                <Text code strong>
                  {record.subcode || tag || record.assetTag}
                </Text>
              ),
            },
            {
              title: 'Device / Model',
              key: 'name',
              render: (_: unknown, record: Asset) => (
                <div>
                  <Text strong style={{ fontSize: 12 }}>
                    {record.name}
                  </Text>
                  {record.model && (
                    <div
                      style={{
                        fontSize: 11,
                        color: token.colorTextSecondary,
                      }}
                    >
                      {record.model}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Category',
              dataIndex: ['category', 'name'],
              key: 'category',
              render: (cat: string) => (cat ? <Tag color="blue">{cat}</Tag> : '—'),
            },
            {
              title: 'Serial Number',
              dataIndex: 'serialNumber',
              key: 'serialNumber',
              render: (sn: string) =>
                sn ? (
                  <Text code style={{ fontSize: 11 }}>
                    {sn}
                  </Text>
                ) : (
                  '—'
                ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color="success">{status}</Tag>,
            },
            {
              title: 'Action',
              key: 'action',
              width: 80,
              render: (_: unknown, record: Asset) => (
                <Popconfirm
                  title="Unassign Device"
                  description={`Unassign ${record.assetTag} from this employee?`}
                  onConfirm={() => handleUnassignAsset(record.id)}
                  okText="Unassign"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    htmlType="button"
                    icon={<DisconnectOutlined />}
                  >
                    Unassign
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      )}
    </Flex>
  );

  const renderLicensesTabContent = (_targetEmployee: DirectoryUser | null) => (
    <Flex vertical gap={12}>
      <Flex justify="space-between" align="center">
        <Text strong>Assigned Licenses ({userLicenses.length})</Text>
        <Button
          type="primary"
          size="small"
          htmlType="button"
          icon={<PlusOutlined />}
          onClick={openAssignLicenseModal}
        >
          Assign License
        </Button>
      </Flex>

      {userLicenses.length === 0 && !userLicensesLoading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No software licenses currently assigned to this employee."
        />
      ) : (
        <Table
          dataSource={userLicenses}
          rowKey="id"
          loading={userLicensesLoading}
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            {
              title: 'Software / License',
              key: 'name',
              render: (_: unknown, record: LicenseAssignment & { license: License }) => (
                <div>
                  <Text strong style={{ fontSize: 12 }}>
                    {record.license?.name || record.licenseId}
                  </Text>
                  {(record.license?.publisher || record.license?.vendor) && (
                    <div
                      style={{
                        fontSize: 11,
                        color: token.colorTextSecondary,
                      }}
                    >
                      {record.license.publisher || record.license.vendor}
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: 'Type',
              dataIndex: ['license', 'type'],
              key: 'type',
              render: (type: string) => (type ? <Tag color="cyan">{type}</Tag> : '—'),
            },
            {
              title: 'Assigned Date',
              dataIndex: 'assignedAt',
              key: 'assignedAt',
              render: (date: string) => (date ? new Date(date).toLocaleDateString() : '—'),
            },
            {
              title: 'Action',
              key: 'action',
              width: 80,
              render: (_: unknown, record: LicenseAssignment & { license: License }) => (
                <Popconfirm
                  title="Revoke License"
                  description={`Revoke seat for ${record.license?.name || 'this license'}?`}
                  onConfirm={() => handleUnassignLicense(record.id)}
                  okText="Revoke"
                  cancelText="Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    htmlType="button"
                    icon={<DisconnectOutlined />}
                  >
                    Revoke
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      )}
    </Flex>
  );

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
      message.error(formatErrorMessage(err, 'import employee batch'));
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
        onViewDetails={handleOpenDetail}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteEmployee}
        copyToClipboard={copyToClipboard}
        getStatusTag={getStatusTag}
      />

      {/* Create Employee Modal (STRICTLY NO PASSWORD FIELD TO PRESERVE SECURITY INVARIANT) */}
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
        width={700}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={createForm}
          layout="vertical"
          validateTrigger={['onChange', 'onBlur']}
          scrollToFirstError={true}
          onFinish={handleCreateEmployee}
          initialValues={{
            status: 'ACTIVE',
            domainJoinStatus: 'NOT_JOINED',
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
                <Input placeholder="e.g. jsmith@youngonevn.com" />
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

          {/* 3-Tier Cascading Select: Level 3 (Position) */}
          <Row gutter={16}>
            <Col span={24}>
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
          </Row>

          {/* Active Directory Domain Join Information */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="adDomain" label="Active Directory Domain">
                <Input placeholder="e.g. uims.internal" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="computerName" label="Host / Computer Name">
                <Input placeholder="e.g. PC-PROD-102" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="domainJoinStatus" label="Domain Join Status">
                <Select
                  options={[
                    { label: 'Not Joined', value: 'NOT_JOINED' },
                    { label: 'Joined', value: 'JOINED' },
                    { label: 'Pending', value: 'PENDING' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
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
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone / Telephone" rules={[formRules.phone()]}>
                <Input placeholder="e.g. +84 222 384 8000" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Edit Employee AppDrawer (STRICTLY NO PASSWORD FIELD TO PRESERVE SECURITY INVARIANT) */}
      <AppDrawer
        open={Boolean(editingEmployee)}
        onClose={() => {
          setEditingEmployee(null);
          editForm.resetFields();
          setUserAssets([]);
          setUserLicenses([]);
        }}
        onCancel={() => {
          setEditingEmployee(null);
          editForm.resetFields();
          setUserAssets([]);
          setUserLicenses([]);
        }}
        title={
          editFirstNameWatch !== undefined || editLastNameWatch !== undefined
            ? `${editFirstNameWatch || ''} ${editLastNameWatch || ''}`.trim() ||
              editingEmployee?.fullName ||
              'Employee Profile'
            : editingEmployee?.fullName ||
              `${editingEmployee?.firstName || ''} ${editingEmployee?.lastName || ''}`.trim() ||
              'Employee Profile'
        }
        subtitle={(() => {
          const code =
            editEmployeeCodeWatch !== undefined
              ? editEmployeeCodeWatch
              : editingEmployee?.employeeCode;
          const role =
            editingEmployee?.position?.title || editingEmployee?.department?.name || 'Employee';
          return code ? `#${code} · ${role}` : role;
        })()}
        icon={
          editingEmployee ? (
            <Avatar size={28} style={{ backgroundColor: '#1677ff', fontSize: 13 }}>
              {(
                (editFirstNameWatch ||
                  editingEmployee.firstName ||
                  editingEmployee.fullName ||
                  'E')[0] || 'E'
              ).toUpperCase()}
            </Avatar>
          ) : undefined
        }
        tag={
          editingEmployee ? (
            <Flex gap={4} align="center">
              {getStatusTag(editStatusWatch || editingEmployee.status)}
              {(editDomainJoinStatusWatch !== undefined
                ? editDomainJoinStatusWatch === 'JOINED'
                : editingEmployee.domainJoined) && (
                <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>
                  AD
                </Tag>
              )}
            </Flex>
          ) : undefined
        }
        extra={
          editingEmployee ? (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                const emp = editingEmployee;
                setEditingEmployee(null);
                editForm.resetFields();
                handleOpenDetail(emp);
              }}
            >
              View Profile
            </Button>
          ) : undefined
        }
        onOk={() => editForm.submit()}
        okText="Save Changes"
        okLoading={modalSubmitting}
        cancelText="Cancel"
        size={680}
        destroyOnHidden
      >
        {editingEmployee && (
          <Form
            form={editForm}
            layout="vertical"
            validateTrigger={['onChange', 'onBlur']}
            scrollToFirstError={true}
            onFinish={handleUpdateEmployee}
            onFinishFailed={(errorInfo) => {
              const errorFields = errorInfo.errorFields.map((f) => f.name[0]);
              if (
                errorFields.some((f) =>
                  [
                    'firstName',
                    'lastName',
                    'email',
                    'employeeCode',
                    'organizationId',
                    'departmentId',
                    'positionId',
                    'phone',
                    'status',
                  ].includes(f as string),
                )
              ) {
                setActiveEditTab('general');
              } else if (
                errorFields.some((f) =>
                  ['domainJoinStatus', 'adDomain', 'computerName'].includes(f as string),
                )
              ) {
                setActiveEditTab('ad_email');
              }
            }}
          >
            <Tabs
              activeKey={activeEditTab}
              onChange={setActiveEditTab}
              destroyOnHidden={false}
              items={[
                {
                  key: 'general',
                  label: 'General Info',
                  icon: <UserOutlined />,
                  children: (
                    <Flex vertical gap={16}>
                      <AppDrawer.Section title="Personal & Contact Information">
                        <Form.Item
                          name="firstName"
                          label="First Name"
                          rules={[{ required: true, message: 'First name is required.' }]}
                        >
                          <Input placeholder="Enter first name" />
                        </Form.Item>

                        <Form.Item
                          name="lastName"
                          label="Last Name"
                          rules={[{ required: true, message: 'Last name is required.' }]}
                        >
                          <Input placeholder="Enter last name" />
                        </Form.Item>

                        <Form.Item
                          name="email"
                          label="Corporate Email"
                          rules={[
                            { required: true, message: 'Email is required.' },
                            { type: 'email', message: 'Enter a valid email.' },
                          ]}
                        >
                          <Input placeholder="e.g. user@uims.internal" />
                        </Form.Item>

                        <Form.Item name="employeeCode" label="Employee ID / Badge Code">
                          <Input placeholder="e.g. 63020037" />
                        </Form.Item>

                        <Form.Item
                          name="phone"
                          label="Phone / Telephone"
                          rules={[formRules.phone()]}
                        >
                          <Input placeholder="e.g. +84 222 384 8000" />
                        </Form.Item>

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
                      </AppDrawer.Section>

                      <AppDrawer.Section title="Organizational Hierarchy">
                        <Form.Item name="organizationId" label="Organization">
                          <Select
                            placeholder="Select Organization"
                            showSearch
                            allowClear
                            options={orgOptions}
                            onChange={() => {
                              editForm.setFieldsValue({
                                departmentId: undefined,
                                positionId: undefined,
                              });
                            }}
                            filterOption={(input, option) =>
                              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                          />
                        </Form.Item>

                        <Form.Item name="departmentId" label="Department">
                          <Select
                            placeholder={
                              editOrgId ? 'Select Department' : 'Select Organization first'
                            }
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
                      </AppDrawer.Section>
                    </Flex>
                  ),
                },
                {
                  key: 'ad_email',
                  label: 'AD & Email',
                  icon: <SafetyCertificateOutlined />,
                  children: (
                    <Flex vertical gap={16}>
                      <AppDrawer.Section title="Active Directory Configuration">
                        <Form.Item name="domainJoinStatus" label="Domain Join Status">
                          <Select
                            options={[
                              { label: 'Not Joined', value: 'NOT_JOINED' },
                              { label: 'Joined', value: 'JOINED' },
                              { label: 'Pending', value: 'PENDING' },
                            ]}
                          />
                        </Form.Item>

                        <Form.Item name="adDomain" label="Active Directory Domain">
                          <Input placeholder="e.g. uims.internal" />
                        </Form.Item>

                        <Form.Item name="computerName" label="Host / Computer Name">
                          <Input placeholder="e.g. PC-PROD-102" />
                        </Form.Item>
                      </AppDrawer.Section>

                      <AppDrawer.Section title="Enterprise Email Account">
                        <Descriptions
                          column={1}
                          size="small"
                          bordered
                          styles={{ label: { width: '150px', whiteSpace: 'nowrap' } }}
                        >
                          <Descriptions.Item label="Corporate Email">
                            <Flex align="center" gap={6}>
                              <Text strong>{editEmailWatch || editingEmployee.email}</Text>
                              <Tooltip title="Copy Email">
                                <Button
                                  type="text"
                                  size="small"
                                  htmlType="button"
                                  icon={<CopyOutlined />}
                                  onClick={() =>
                                    copyToClipboard(
                                      editEmailWatch || editingEmployee.email,
                                      'Email',
                                    )
                                  }
                                />
                              </Tooltip>
                            </Flex>
                          </Descriptions.Item>
                          <Descriptions.Item label="Password Status">
                            {editingEmployee.hasEmailPassword ? (
                              <Tag color="success">Encrypted at Rest</Tag>
                            ) : (
                              <Tag color="default">Not Configured</Tag>
                            )}
                          </Descriptions.Item>
                        </Descriptions>
                        <Alert
                          type="info"
                          showIcon
                          style={{ marginTop: 12 }}
                          title="Credential Security Directives"
                          description="Email passwords are encrypted at rest with AES-256-GCM. In accordance with zero-credential security directives, password modifications are strictly prohibited in directory profile editing and must be managed via dedicated audited reset workflows."
                        />
                      </AppDrawer.Section>
                    </Flex>
                  ),
                },
                {
                  key: 'devices',
                  label: `Devices (${userAssets.length})`,
                  icon: <LaptopOutlined />,
                  children: renderDevicesTabContent(editingEmployee),
                },
                {
                  key: 'licenses',
                  label: `Licenses (${userLicenses.length})`,
                  icon: <SafetyCertificateOutlined />,
                  children: renderLicensesTabContent(editingEmployee),
                },
              ]}
            />
          </Form>
        )}
      </AppDrawer>

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

      {/* Synchronized Multi-Tab AppDrawer: Employee Detail, AD Domain, Credentials, Devices & Licenses */}
      <AppDrawer
        open={Boolean(detailEmployee)}
        onClose={() => {
          setDetailEmployee(null);
          setRevealedPassword(null);
          setUserAssets([]);
          setUserLicenses([]);
        }}
        title={
          detailEmployee?.fullName ||
          `${detailEmployee?.firstName || ''} ${detailEmployee?.lastName || ''}`.trim() ||
          'Employee Profile'
        }
        subtitle={
          detailEmployee?.employeeCode
            ? `#${detailEmployee.employeeCode} · ${detailEmployee?.position?.title || detailEmployee?.department?.name || 'Employee'}`
            : detailEmployee?.position?.title ||
              detailEmployee?.department?.name ||
              'Directory Profile'
        }
        icon={
          detailEmployee ? (
            <Avatar size={28} style={{ backgroundColor: '#1677ff', fontSize: 13 }}>
              {(detailEmployee.firstName || detailEmployee.fullName || 'E')[0].toUpperCase()}
            </Avatar>
          ) : undefined
        }
        tag={
          detailEmployee ? (
            <Flex gap={4} align="center">
              {getStatusTag(detailEmployee.status)}
              {detailEmployee.domainJoined && (
                <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>
                  AD
                </Tag>
              )}
            </Flex>
          ) : undefined
        }
        extra={
          detailEmployee ? (
            <Button
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                const emp = detailEmployee;
                setDetailEmployee(null);
                handleOpenEdit(emp);
              }}
            >
              Edit
            </Button>
          ) : undefined
        }
        cancelText="Close"
        size={680}
        styles={{ body: { overflowX: 'hidden' } }}
      >
        {detailEmployee && (
          <Tabs
            activeKey={activeDetailTab}
            onChange={setActiveDetailTab}
            items={[
              {
                key: 'general',
                label: 'General Info',
                icon: <UserOutlined />,
                children: (
                  <Flex vertical gap={16}>
                    <AppDrawer.Section title="Personal & Contact Information">
                      <Descriptions
                        column={1}
                        size="small"
                        bordered
                        styles={{
                          label: { width: '150px', whiteSpace: 'nowrap' },
                          content: { wordBreak: 'break-word' },
                        }}
                      >
                        <Descriptions.Item label="Full Name">
                          <Text strong>
                            {detailEmployee.fullName ||
                              `${detailEmployee.firstName || ''} ${detailEmployee.lastName || ''}`.trim() ||
                              '—'}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Employee Code">
                          {detailEmployee.employeeCode ? (
                            <Text code strong>
                              #{detailEmployee.employeeCode}
                            </Text>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Email">
                          <Flex align="center" gap={6} wrap="wrap">
                            <Text strong style={{ wordBreak: 'break-all' }}>
                              {detailEmployee.email}
                            </Text>
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
                        <Descriptions.Item label="Phone">
                          {detailEmployee.phone || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Account Status">
                          {getStatusTag(detailEmployee.status)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Source">
                          <Tag>{detailEmployee.source || 'LOCAL'}</Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </AppDrawer.Section>

                    <AppDrawer.Section title="Organizational Hierarchy & Facility">
                      <Descriptions
                        column={1}
                        size="small"
                        bordered
                        styles={{
                          label: { width: '150px', whiteSpace: 'nowrap' },
                          content: { wordBreak: 'break-word' },
                        }}
                      >
                        <Descriptions.Item label="Organization">
                          {detailEmployee.organization ? (
                            <Tag
                              color="purple"
                              icon={<BankOutlined />}
                              style={{
                                maxWidth: '100%',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                height: 'auto',
                                lineHeight: 1.5,
                                padding: '3px 8px',
                              }}
                            >
                              {detailEmployee.organization.name}
                            </Tag>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Department">
                          {detailEmployee.department ? (
                            <Tag
                              color="blue"
                              icon={<ApartmentOutlined />}
                              style={{
                                maxWidth: '100%',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                height: 'auto',
                                lineHeight: 1.5,
                                padding: '3px 8px',
                              }}
                            >
                              {detailEmployee.department.name}
                            </Tag>
                          ) : (
                            '—'
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Role / Position">
                          <Text strong>{detailEmployee.position?.title || '—'}</Text>
                        </Descriptions.Item>
                      </Descriptions>
                    </AppDrawer.Section>

                    <AppDrawer.Section title="Custody & Assigned Resources">
                      <Descriptions
                        column={1}
                        size="small"
                        bordered
                        styles={{
                          label: { width: '150px', whiteSpace: 'nowrap' },
                          content: { wordBreak: 'break-word' },
                        }}
                      >
                        <Descriptions.Item label="Assigned Devices">
                          <Flex align="center" gap={8} wrap="wrap">
                            <Tag
                              color="blue"
                              icon={<LaptopOutlined />}
                              style={{ cursor: 'pointer', padding: '3px 8px' }}
                              onClick={() => setActiveDetailTab('devices')}
                            >
                              {detailEmployee.assignedAssetsCount ?? userAssets.length} Devices
                            </Tag>
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto', fontSize: 12 }}
                              onClick={() => setActiveDetailTab('devices')}
                            >
                              View in Devices tab →
                            </Button>
                          </Flex>
                        </Descriptions.Item>
                        <Descriptions.Item label="Assigned Licenses">
                          <Flex align="center" gap={8} wrap="wrap">
                            <Tag
                              color="cyan"
                              icon={<SafetyCertificateOutlined />}
                              style={{ cursor: 'pointer', padding: '3px 8px' }}
                              onClick={() => setActiveDetailTab('licenses')}
                            >
                              {detailEmployee.assignedLicensesCount ?? userLicenses.length} Licenses
                            </Tag>
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto', fontSize: 12 }}
                              onClick={() => setActiveDetailTab('licenses')}
                            >
                              View in Licenses tab →
                            </Button>
                          </Flex>
                        </Descriptions.Item>
                      </Descriptions>
                    </AppDrawer.Section>
                  </Flex>
                ),
              },
              {
                key: 'ad_email',
                label: 'AD & Email',
                icon: <SafetyCertificateOutlined />,
                children: (
                  <Flex vertical gap={16}>
                    <AppDrawer.Section title="Active Directory Domain Join">
                      <Descriptions
                        column={1}
                        size="small"
                        bordered
                        styles={{
                          label: { width: '150px', whiteSpace: 'nowrap' },
                          content: { wordBreak: 'break-word' },
                        }}
                      >
                        <Descriptions.Item label="Domain Status">
                          <Tag
                            color={
                              detailEmployee.domainJoined ||
                              detailEmployee.domainJoinStatus === 'JOINED'
                                ? 'success'
                                : detailEmployee.domainJoinStatus === 'PENDING'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {detailEmployee.domainJoinStatus ||
                              (detailEmployee.domainJoined ? 'JOINED' : 'NOT_JOINED')}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="AD Domain">
                          <Text code>{detailEmployee.adDomain || 'uims.internal'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Host / Computer Name">
                          <Text strong>{detailEmployee.computerName || '—'}</Text>
                        </Descriptions.Item>
                      </Descriptions>
                    </AppDrawer.Section>

                    <AppDrawer.Section title="Enterprise Email Account & Credentials">
                      <Descriptions
                        column={1}
                        size="small"
                        bordered
                        styles={{
                          label: { width: '150px', whiteSpace: 'nowrap' },
                          content: { wordBreak: 'break-word' },
                        }}
                      >
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
                        <Descriptions.Item label="Password Status">
                          {detailEmployee.hasEmailPassword ? (
                            <Tag color="success">Encrypted at Rest</Tag>
                          ) : (
                            <Tag color="default">Not Configured</Tag>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Password">
                          <Flex align="center" gap={10} wrap="wrap">
                            {revealedPassword ? (
                              <Text
                                code
                                strong
                                style={{
                                  fontSize: 13,
                                  color: token.colorPrimary,
                                  letterSpacing: 0.5,
                                }}
                              >
                                {revealedPassword}
                              </Text>
                            ) : (
                              <Text
                                type="secondary"
                                style={{ fontFamily: 'monospace', letterSpacing: 2 }}
                              >
                                ••••••••••••
                              </Text>
                            )}

                            {revealedPassword ? (
                              <Button
                                size="small"
                                icon={<EyeInvisibleOutlined />}
                                onClick={() => setRevealedPassword(null)}
                              >
                                Hide
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                icon={<EyeOutlined />}
                                loading={revealLoading}
                                onClick={handleRevealPassword}
                              >
                                Reveal
                              </Button>
                            )}

                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              loading={copyLoading}
                              onClick={handleCopyPassword}
                            >
                              Copy
                            </Button>

                            <Button
                              size="small"
                              icon={<KeyOutlined />}
                              onClick={() => setResetModalOpen(true)}
                            >
                              Reset
                            </Button>
                          </Flex>
                        </Descriptions.Item>
                      </Descriptions>
                    </AppDrawer.Section>
                  </Flex>
                ),
              },
              {
                key: 'devices',
                label: `Devices (${userAssets.length})`,
                icon: <LaptopOutlined />,
                children: renderDevicesTabContent(detailEmployee),
              },
              {
                key: 'licenses',
                label: `Licenses (${userLicenses.length})`,
                icon: <SafetyCertificateOutlined />,
                children: renderLicensesTabContent(detailEmployee),
              },
            ]}
          />
        )}
      </AppDrawer>

      {/* Reset Email Password Modal */}
      <Modal
        title={`Reset Email Password: ${detailEmployee?.email}`}
        open={resetModalOpen}
        onCancel={() => {
          setResetModalOpen(false);
          setCustomResetPassword('');
        }}
        onOk={handleResetPassword}
        confirmLoading={resetSubmitting}
        okText="Confirm Reset"
        cancelText="Cancel"
        destroyOnHidden
        width={480}
      >
        <Flex vertical gap={16} style={{ paddingTop: 12 }}>
          <Alert
            type="info"
            showIcon
            title="Credential Encryption Standard"
            description="All directory email passwords are encrypted at rest with AES-256-GCM and logged for audit compliance."
          />

          <Radio.Group
            value={resetPasswordType}
            onChange={(e) => setResetPasswordType(e.target.value)}
          >
            <Flex vertical gap={8}>
              <Radio value="auto">Generate secure random password (24 characters)</Radio>
              <Radio value="custom">Specify custom password</Radio>
            </Flex>
          </Radio.Group>

          {resetPasswordType === 'custom' && (
            <Form.Item label="New Email Password" required style={{ marginBottom: 0 }}>
              <Input.Password
                placeholder="Enter new email password (min 8 characters)"
                value={customResetPassword}
                onChange={(e) => setCustomResetPassword(e.target.value)}
              />
            </Form.Item>
          )}
        </Flex>
      </Modal>

      {/* Assign Equipment Modal */}
      <Modal
        title={`Assign Equipment to ${(detailEmployee || editingEmployee)?.fullName || (detailEmployee || editingEmployee)?.email}`}
        open={assignAssetModalOpen}
        onCancel={() => {
          setAssignAssetModalOpen(false);
          setSelectedAssetId(undefined);
        }}
        onOk={handleAssignAsset}
        confirmLoading={assigningAsset}
        okButtonProps={{ disabled: !selectedAssetId }}
        okText="Assign Device"
        cancelText="Cancel"
        destroyOnHidden
        width={520}
      >
        <Flex vertical gap={12} style={{ paddingTop: 12 }}>
          <Text type="secondary">
            Select an available hardware device from inventory to assign custody to this employee.
          </Text>
          <Select
            placeholder="Select available device"
            loading={loadingAvailableAssets}
            value={selectedAssetId}
            onChange={setSelectedAssetId}
            showSearch
            allowClear
            style={{ width: '100%' }}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableAssets.map((asset) => ({
              label: `[${asset.subcode || asset.assetTag}] ${asset.name}${asset.model ? ` - ${asset.model}` : ''}${asset.serialNumber ? ` (S/N: ${asset.serialNumber})` : ''}`,
              value: asset.id,
            }))}
          />
        </Flex>
      </Modal>

      {/* Assign License Modal */}
      <Modal
        title={`Assign Software License to ${(detailEmployee || editingEmployee)?.fullName || (detailEmployee || editingEmployee)?.email}`}
        open={assignLicenseModalOpen}
        onCancel={() => {
          setAssignLicenseModalOpen(false);
          setSelectedLicenseId(undefined);
        }}
        onOk={handleAssignLicense}
        confirmLoading={assigningLicense}
        okButtonProps={{ disabled: !selectedLicenseId }}
        okText="Assign License"
        cancelText="Cancel"
        destroyOnHidden
        width={520}
      >
        <Flex vertical gap={12} style={{ paddingTop: 12 }}>
          <Text type="secondary">
            Select an active software license from available inventory to allocate a seat.
          </Text>
          <Select
            placeholder="Select available license"
            loading={loadingAvailableLicenses}
            value={selectedLicenseId}
            onChange={setSelectedLicenseId}
            showSearch
            allowClear
            style={{ width: '100%' }}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={availableLicenses.map((lic) => ({
              label: `${lic.name}${lic.publisher ? ` (${lic.publisher})` : lic.vendor ? ` (${lic.vendor})` : ''} · ${lic.totalSeats - lic.usedSeats} seats left`,
              value: lic.id,
            }))}
          />
        </Flex>
      </Modal>
    </div>
  );
};
