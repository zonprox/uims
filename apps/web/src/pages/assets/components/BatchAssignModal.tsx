import {
  DownloadOutlined,
  FileDoneOutlined,
  IdcardOutlined,
  InboxOutlined,
  LaptopOutlined,
  UserOutlined,
  UserSwitchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Tag,
  Typography,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { type Asset, assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import { formRules } from '../../../utils/formValidators';

const { Text } = Typography;

export interface BatchAssignFormValues {
  mode: 'assign' | 'unassign';
  assignedToId?: string | null;
  status?: string;
  recordDocUrl?: string;
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
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const [form] = Form.useForm<BatchAssignFormValues>();
    const [mode, setMode] = useState<'assign' | 'unassign'>('assign');
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);

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
          const empRes = propEmployees
            ? { items: propEmployees }
            : await directoryService.getEmployees({ pageSize: 100 });
          if (mounted) {
            setEmployees(empRes.items || []);
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

    const handleDownloadTemplate = async () => {
      try {
        setDownloadingTemplate(true);
        await assetsService.downloadHandoverTemplate('assignment');
        message.success('Asset handover template downloaded successfully.');
      } catch (_err: unknown) {
        message.error('Failed to download asset handover template.');
      } finally {
        setDownloadingTemplate(false);
      }
    };

    const handleOk = async () => {
      try {
        const values = await form.validateFields();
        onAssign({
          mode,
          assignedToId: mode === 'assign' ? values.assignedToId : null,
          status: values.status,
          recordDocUrl: values.recordDocUrl?.trim() || undefined,
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
            <UserSwitchOutlined style={{ color: token.colorPrimary }} />
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
              backgroundColor: token.colorFillAlter,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex align="center" gap={8}>
              <Badge
                count={count}
                overflowCount={9999}
                style={{ backgroundColor: token.colorPrimary }}
              />
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
                    formRules.required(
                      'Target directory employee',
                      'Please select an employee to assign assets',
                    ),
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
                  <Card
                    size="small"
                    styles={{ body: { backgroundColor: token.colorFillAlter } }}
                    style={{ marginBottom: 14, borderColor: token.colorBorderSecondary }}
                  >
                    <Descriptions title="Recipient Details" size="small" column={1}>
                      <Descriptions.Item label="Full Name">
                        <Flex align="center" gap={6}>
                          <UserOutlined style={{ color: token.colorPrimary }} />
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

                <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Standard Handover Record Documentation
                  </Text>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    loading={downloadingTemplate}
                    onClick={handleDownloadTemplate}
                  >
                    Download Handover Template
                  </Button>
                </Flex>

                <Form.Item
                  name="recordDocUrl"
                  label="Signed Handover Document (URL or File Link)"
                  tooltip="Attach scanned signed record. If omitted, assigned assets will be flagged with a Pending Record badge."
                >
                  <Input
                    placeholder="e.g. https://storage.youngonevn.com/records/handover-signed.pdf"
                    prefix={<FileDoneOutlined style={{ color: token.colorTextSecondary }} />}
                    allowClear
                  />
                </Form.Item>

                <Alert
                  type="info"
                  showIcon
                  icon={<WarningOutlined />}
                  title="Handover Verification Rule"
                  description="Submitting without a signed record will flag assigned assets with a 'Pending Record' badge until document is uploaded."
                  style={{ marginBottom: 14 }}
                />
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
