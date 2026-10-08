import {
  IdcardOutlined,
  InboxOutlined,
  LaptopOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Card,
  Descriptions,
  Divider,
  Flex,
  Form,
  Modal,
  Radio,
  Select,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { Asset } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import {
  type Department,
  organizationService,
} from '../../../services/organization.service';
import { formRules } from '../../../utils/formValidators';

const { Text } = Typography;

export interface BatchAssignFormValues {
  mode: 'assign' | 'unassign';
  assignedToId?: string | null;
  departmentId?: string | null;
  status?: string;
}

export interface BatchAssignModalProps {
  open: boolean;
  assets: Asset[];
  submitting: boolean;
  onAssign: (values: BatchAssignFormValues) => void;
  onCancel: () => void;
  employees?: DirectoryUser[]; // For test isolation
}

export const BatchAssignModal: React.FC<BatchAssignModalProps> = React.memo(
  ({ open, assets, submitting, onAssign, onCancel, employees: propEmployees }) => {
    const [form] = Form.useForm<BatchAssignFormValues>();
    const [mode, setMode] = useState<'assign' | 'unassign'>('assign');
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);

    useEffect(() => {
      if (!open) {
        form.resetFields();
        setMode('assign');
        setSelectedUserId(null);
        return;
      }

      form.setFieldsValue({
        mode: 'assign',
        status: 'Active',
      });

      let mounted = true;
      const loadOptions = async () => {
        setLoadingEmployees(true);
        try {
          const [empRes, deptRes] = await Promise.all([
            propEmployees
              ? { items: propEmployees }
              : directoryService.getEmployees({ pageSize: 100 }),
            organizationService.getDepartments().catch((_e: unknown) => []),
          ]);
          if (mounted) {
            setEmployees(empRes.items || []);
            setDepartments(deptRes || []);
          }
        } catch (_error: unknown) {
          // Handled gracefully
        } finally {
          if (mounted) setLoadingEmployees(false);
        }
      };

      loadOptions();

      return () => {
        mounted = false;
      };
    }, [open, propEmployees, form]);

    const selectedUser = useMemo(
      () => employees.find((u) => u.id === selectedUserId) || null,
      [employees, selectedUserId],
    );

    const handleModeChange = (newMode: 'assign' | 'unassign') => {
      setMode(newMode);
      form.setFieldsValue({
        mode: newMode,
        status: newMode === 'assign' ? 'Active' : 'In Storage',
        assignedToId: newMode === 'assign' ? selectedUserId : undefined,
      });
    };

    const handleOk = async () => {
      try {
        const values = await form.validateFields();
        onAssign({
          mode,
          assignedToId: mode === 'assign' ? values.assignedToId : null,
          departmentId: values.departmentId || null,
          status: values.status,
        });
      } catch (_validationErr: unknown) {
        // Validation errors surfaced by Ant Form
      }
    };

    const count = assets.length;

    return (
      <Modal
        title={
          <Flex align="center" gap={8}>
            <UserSwitchOutlined style={{ color: '#1677ff' }} />
            <span>Batch Assign Hardware Assets</span>
          </Flex>
        }
        open={open}
        onOk={handleOk}
        onCancel={onCancel}
        confirmLoading={submitting}
        okText={
          mode === 'assign'
            ? `Assign ${count} Asset${count > 1 ? 's' : ''}`
            : `Unassign ${count} Asset${count > 1 ? 's' : ''}`
        }
        okButtonProps={{
          disabled: count === 0 || (mode === 'assign' && !selectedUserId),
          danger: mode === 'unassign',
        }}
        destroyOnHidden
        width={580}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Flex vertical gap={14}>
          <Flex
            justify="space-between"
            align="center"
            style={{
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            <Flex align="center" gap={8}>
              <Badge count={count} overflowCount={9999} style={{ backgroundColor: '#1677ff' }} />
              <Text strong style={{ fontSize: 13 }}>
                Selected Assets for Batch Update
              </Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {count} hardware device{count > 1 ? 's' : ''}
            </Text>
          </Flex>

          <Flex wrap gap={6} style={{ maxHeight: 84, overflowY: 'auto', padding: '2px 0' }}>
            {assets.slice(0, 15).map((a) => (
              <Tag key={a.id} icon={<LaptopOutlined />} color="blue">
                {a.tag}: {a.name}
              </Tag>
            ))}
            {assets.length > 15 && <Tag color="default">+{assets.length - 15} more items</Tag>}
          </Flex>

          <Divider style={{ margin: '4px 0' }} />

          <Form
            form={form}
            layout="vertical"
            initialValues={{ mode: 'assign', status: 'Active' }}
            validateTrigger={['onChange', 'onBlur']}
            scrollToFirstError={true}
          >
            <Form.Item name="mode" label="Batch Action Type">
              <Radio.Group
                value={mode}
                onChange={(e) => handleModeChange(e.target.value)}
                buttonStyle="solid"
                style={{ width: '100%' }}
              >
                <Radio.Button value="assign" style={{ width: '50%', textAlign: 'center' }}>
                  <UserOutlined /> Assign to Employee
                </Radio.Button>
                <Radio.Button value="unassign" style={{ width: '50%', textAlign: 'center' }}>
                  <InboxOutlined /> Return to Storage / Unassign
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            {mode === 'assign' ? (
              <>
                <Form.Item
                  name="assignedToId"
                  label="Target Directory Employee"
                  rules={[
                    formRules.required('Target directory employee', 'Please select an employee to assign assets'),
                  ]}
                >
                  <Select
                    showSearch
                    allowClear
                    loading={loadingEmployees}
                    placeholder="Search employee by name, code, or email"
                    value={selectedUserId}
                    onChange={(val) => {
                      setSelectedUserId(val);
                      form.setFieldsValue({ assignedToId: val });
                      if (val) {
                        const user = employees.find((u) => u.id === val);
                        if (user?.department?.id) {
                          form.setFieldsValue({ departmentId: user.department.id });
                        }
                      }
                    }}
                    options={employees.map((u) => ({
                      label: `${u.fullName || `${u.firstName} ${u.lastName}`.trim()} (${u.employeeCode || u.email})`,
                      value: u.id,
                    }))}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>

                {selectedUser && (
                  <Card size="small" style={{ backgroundColor: '#f8fafc', marginBottom: 14 }}>
                    <Descriptions title="Recipient Details" size="small" column={1}>
                      <Descriptions.Item label="Full Name">
                        <Flex align="center" gap={6}>
                          <UserOutlined style={{ color: '#1677ff' }} />
                          <Text strong>
                            {selectedUser.fullName ||
                              `${selectedUser.firstName} ${selectedUser.lastName}`}
                          </Text>
                        </Flex>
                      </Descriptions.Item>
                      <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
                      {selectedUser.employeeCode && (
                        <Descriptions.Item label="Employee Code">
                          <Tag icon={<IdcardOutlined />} color="purple">
                            {selectedUser.employeeCode}
                          </Tag>
                        </Descriptions.Item>
                      )}
                      {selectedUser.department?.name && (
                        <Descriptions.Item label="Department">
                          {selectedUser.department.name}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Card>
                )}
              </>
            ) : (
              <Alert
                type="warning"
                showIcon
                title="Unassign Hardware Assets"
                description={`This will dissociate all ${count} selected assets from their current assignees and mark them available in storage.`}
                style={{ marginBottom: 14 }}
              />
            )}

            <Form.Item name="departmentId" label="Assign Department (Optional)">
              <Select
                showSearch
                allowClear
                placeholder="Select department (optional)"
                options={departments.map((dept) => ({
                  label: dept.name,
                  value: dept.id,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item name="status" label="Asset Status">
              <Select
                options={
                  mode === 'assign'
                    ? [
                        { label: 'Active (In Use)', value: 'Active' },
                        { label: 'In Storage', value: 'In Storage' },
                        { label: 'In Repair', value: 'In Repair' },
                      ]
                    : [
                        { label: 'In Storage', value: 'In Storage' },
                        { label: 'Available', value: 'Available' },
                        { label: 'In Repair', value: 'In Repair' },
                        { label: 'Retired', value: 'Retired' },
                      ]
                }
              />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    );
  },
);

BatchAssignModal.displayName = 'BatchAssignModal';
