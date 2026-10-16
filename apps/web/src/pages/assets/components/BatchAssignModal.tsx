import {
  EyeOutlined,
  FileWordOutlined,
  IdcardOutlined,
  InboxOutlined,
  LaptopOutlined,
  PrinterOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Flex,
  Form,
  Radio,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  type UploadFile,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import AppDrawer from '../../../components/AppDrawer';
import { type Asset, assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import { formRules, isValidationError } from '../../../utils/formValidators';
import { downloadBlobFile, printDocumentHtml } from '../utils/printDocument';
import { HandoverDocumentModal } from './HandoverDocumentModal';

const { Text } = Typography;

export interface BatchAssignFormValues {
  mode: 'assign' | 'unassign';
  assignedToId?: string | null;
  status?: string;
  signedDocUrl?: string;
  assetIds?: string[];
}

const formatUserDisplayName = (u: DirectoryUser): string =>
  u.fullName?.trim() ||
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
  u.displayName?.trim() ||
  u.email;

export const formatUserSelectLabel = (u: DirectoryUser): string => {
  const name = formatUserDisplayName(u);
  if (u.employeeCode) {
    return `${name} (${u.employeeCode})`;
  }
  if (name !== u.email && u.email) {
    return `${name} (${u.email})`;
  }
  return name;
};

export interface BatchAssignModalProps {
  open: boolean;
  assets: Asset[];
  submitting: boolean;
  onAssign: (values: BatchAssignFormValues) => void;
  onCancel: () => void;
  employees?: DirectoryUser[]; // For test isolation
  initialUserId?: string;
  availableAssets?: Asset[];
}

export const BatchAssignModal: React.FC<BatchAssignModalProps> = React.memo(
  ({
    open,
    assets,
    submitting,
    onAssign,
    onCancel,
    employees: propEmployees,
    initialUserId,
    availableAssets,
  }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const [form] = Form.useForm<BatchAssignFormValues>();
    const [mode, setMode] = useState<'assign' | 'unassign'>('assign');
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

    // Document Generation & Actions State
    const [generatingPreview, setGeneratingPreview] = useState(false);
    const [generatingPrint, setGeneratingPrint] = useState(false);
    const [generatingDownload, setGeneratingDownload] = useState(false);
    const [previewDocData, setPreviewDocData] = useState<{
      title: string;
      html: string;
      filename: string;
    } | null>(null);

    // Direct File Upload State
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    useEffect(() => {
      if (!open) {
        form.resetFields();
        setMode('assign');
        setSelectedUserId(null);
        setSelectedAssetIds([]);
        setFileList([]);
        setPreviewDocData(null);
        return;
      }

      setSelectedUserId(initialUserId || null);
      if (assets.length > 0) {
        setSelectedAssetIds(assets.map((a) => a.id));
      } else {
        setSelectedAssetIds([]);
      }
      form.setFieldsValue({
        mode: 'assign',
        status: 'Active',
        assignedToId: initialUserId || undefined,
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
        } catch (loadErr: unknown) {
          message.error(loadErr instanceof Error ? loadErr.message : 'Failed to load employees.');
        } finally {
          if (mounted) setLoadingEmployees(false);
        }
      };

      loadOptions();

      return () => {
        mounted = false;
      };
    }, [open, propEmployees, form, message, initialUserId]);

    const selectedUser = useMemo(
      () => employees.find((u) => u.id === selectedUserId) || null,
      [employees, selectedUserId],
    );

    const effectiveAssets = useMemo(() => {
      if (assets.length > 0) return assets;
      if (!availableAssets || availableAssets.length === 0) return [];
      return availableAssets.filter((a) => selectedAssetIds.includes(a.id));
    }, [assets, availableAssets, selectedAssetIds]);

    const handleModeChange = (newMode: 'assign' | 'unassign') => {
      setMode(newMode);
      form.setFieldsValue({
        mode: newMode,
        status: newMode === 'assign' ? 'Active' : 'In Storage',
        assignedToId: newMode === 'assign' ? selectedUserId : undefined,
      });
    };

    const handlePreviewDocument = async () => {
      try {
        setGeneratingPreview(true);
        const res = await assetsService.generateHandoverDocument({
          type: 'assignment',
          assetIds: effectiveAssets.length > 0 ? effectiveAssets.map((a) => a.id) : undefined,
          recipientId: selectedUserId || undefined,
        });
        setPreviewDocData({
          title: res.title,
          html: res.html,
          filename: res.filename,
        });
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to generate handover document.');
      } finally {
        setGeneratingPreview(false);
      }
    };

    const handlePrintDocument = async () => {
      try {
        setGeneratingPrint(true);
        const res = await assetsService.generateHandoverDocument({
          type: 'assignment',
          assetIds: effectiveAssets.length > 0 ? effectiveAssets.map((a) => a.id) : undefined,
          recipientId: selectedUserId || undefined,
        });
        printDocumentHtml(res.html);
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to print handover document.');
      } finally {
        setGeneratingPrint(false);
      }
    };

    const handleDownloadDocument = async () => {
      try {
        setGeneratingDownload(true);
        await assetsService.generateHandoverDocument({
          type: 'assignment',
          assetIds: effectiveAssets.length > 0 ? effectiveAssets.map((a) => a.id) : undefined,
          recipientId: selectedUserId || undefined,
        });
        const { blob, filename } = await assetsService.downloadHandoverDocx({
          type: 'assignment',
          assetIds: effectiveAssets.length > 0 ? effectiveAssets.map((a) => a.id) : undefined,
          recipientId: selectedUserId || undefined,
        });
        downloadBlobFile(blob, filename);
        message.success('Populated handover record (.docx) downloaded successfully.');
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to download handover document.');
      } finally {
        setGeneratingDownload(false);
      }
    };

    const handleOk = async () => {
      let values: BatchAssignFormValues;
      try {
        values = await form.validateFields();
      } catch (validationErr: unknown) {
        if (isValidationError(validationErr)) {
          return;
        }
        message.error(
          validationErr instanceof Error ? validationErr.message : 'Validation failed.',
        );
        return;
      }

      let uploadedUrl: string | undefined = undefined;

      const fileToUpload = (fileList[0]?.originFileObj || fileList[0]) as File | undefined;
      if (fileList.length > 0 && fileToUpload) {
        setUploadingDoc(true);
        try {
          const uploadRes = await assetsService.uploadHandoverDocument(fileToUpload);
          uploadedUrl = uploadRes.fileUrl;
        } catch (uploadErr: unknown) {
          message.error(
            uploadErr instanceof Error
              ? uploadErr.message
              : 'Failed to upload signed handover document.',
          );
          return;
        } finally {
          setUploadingDoc(false);
        }
      }

      try {
        await onAssign({
          mode,
          assignedToId: mode === 'assign' ? values.assignedToId : null,
          status: values.status,
          signedDocUrl: uploadedUrl,
          assetIds: effectiveAssets.map((a) => a.id),
        });
      } catch (assignErr: unknown) {
        message.error(
          assignErr instanceof Error ? assignErr.message : 'Failed to complete batch assignment.',
        );
      }
    };

    const count = effectiveAssets.length;

    return (
      <>
        <AppDrawer
          open={open}
          onClose={onCancel}
          onCancel={onCancel}
          title="Batch Assign Hardware Assets"
          subtitle={`${count} hardware device${count === 1 ? '' : 's'} selected`}
          icon={<UserSwitchOutlined />}
          tag={
            <Tag color="blue">
              {count} Asset{count === 1 ? '' : 's'}
            </Tag>
          }
          size={600}
          onOk={handleOk}
          okText={
            mode === 'assign'
              ? `Assign ${count} Asset${count !== 1 ? 's' : ''}`
              : `Unassign ${count} Asset${count !== 1 ? 's' : ''}`
          }
          okLoading={submitting || uploadingDoc}
          okDisabled={count === 0 || (mode === 'assign' && !selectedUserId)}
          okDanger={mode === 'unassign'}
          cancelText="Cancel"
          destroyOnHidden
        >
          <Flex vertical gap={14}>
            {assets.length === 0 && availableAssets && availableAssets.length > 0 && (
              <AppDrawer.Section title="Select Hardware Equipment from Inventory">
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="Select available hardware device(s) to assign"
                  value={selectedAssetIds}
                  onChange={setSelectedAssetIds}
                  options={availableAssets.map((a) => ({
                    label: `[${a.tag || a.subcode || a.id}] ${a.name}${a.model ? ` - ${a.model}` : ''}${a.serialNumber ? ` (S/N: ${a.serialNumber})` : ''}`,
                    value: a.id,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </AppDrawer.Section>
            )}

            <AppDrawer.Section
              title="Selected Assets for Batch Update"
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {count} hardware device{count === 1 ? '' : 's'}
                </Text>
              }
            >
              <Flex wrap gap={6} style={{ maxHeight: 84, overflowY: 'auto', padding: '2px 0' }}>
                {effectiveAssets.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    No hardware devices selected
                  </Text>
                ) : (
                  <>
                    {effectiveAssets.slice(0, 15).map((a) => (
                      <Tag
                        key={a.id}
                        icon={<LaptopOutlined />}
                        color="blue"
                        style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={`${a.tag}: ${a.name}`}
                      >
                        {a.tag}: {a.name}
                      </Tag>
                    ))}
                    {effectiveAssets.length > 15 && (
                      <Tooltip
                        title={effectiveAssets
                          .slice(15)
                          .map((a) => `${a.tag}: ${a.name}`)
                          .join(', ')}
                      >
                        <Tag color="default">
                          +{effectiveAssets.length - 15} more item
                          {effectiveAssets.length - 15 === 1 ? '' : 's'}
                        </Tag>
                      </Tooltip>
                    )}
                  </>
                )}
              </Flex>
            </AppDrawer.Section>

            <Form
              form={form}
              layout="vertical"
              initialValues={{ mode: 'assign', status: 'Active' }}
              validateTrigger={['onChange', 'onBlur']}
              scrollToFirstError={true}
            >
              <AppDrawer.Section title="Batch Action Type">
                <Form.Item name="mode" style={{ marginBottom: 0 }}>
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
              </AppDrawer.Section>

              {mode === 'assign' ? (
                <AppDrawer.Section title="Target Directory Employee">
                  <Form.Item
                    name="assignedToId"
                    style={{ marginBottom: 0 }}
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
                      onChange={(val) => {
                        setSelectedUserId(val || null);
                      }}
                      options={employees.map((u) => ({
                        label: formatUserSelectLabel(u),
                        value: u.id,
                      }))}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>

                  {selectedUser ? (
                    <>
                      <Card
                        size="small"
                        styles={{ body: { backgroundColor: token.colorFillAlter } }}
                        style={{ marginBottom: 14, borderColor: token.colorBorderSecondary }}
                      >
                        <Descriptions title="Recipient Details" size="small" column={1}>
                          <Descriptions.Item label="Full Name">
                            <Flex align="center" gap={6}>
                              <UserOutlined style={{ color: token.colorPrimary }} />
                              <Text strong>{formatUserDisplayName(selectedUser)}</Text>
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

                      <Card
                        size="small"
                        style={{ marginBottom: 14, borderColor: token.colorBorderSecondary }}
                        styles={{ body: { padding: '12px 14px' } }}
                      >
                        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                          <div>
                            <Text strong style={{ fontSize: 12.5, display: 'block' }}>
                              Handover Record Documentation
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11.5 }}>
                              Pre-filled for {formatUserDisplayName(selectedUser)} ({count} asset
                              {count === 1 ? '' : 's'}). Exclusively supports print and Word
                              (.docx).
                            </Text>
                          </div>
                          <Space size={6}>
                            <Button
                              size="small"
                              icon={<EyeOutlined />}
                              loading={generatingPreview}
                              onClick={handlePreviewDocument}
                            >
                              Preview
                            </Button>
                            <Button
                              size="small"
                              icon={<PrinterOutlined />}
                              loading={generatingPrint}
                              onClick={handlePrintDocument}
                            >
                              Print
                            </Button>
                            <Button
                              size="small"
                              icon={<FileWordOutlined />}
                              loading={generatingDownload}
                              onClick={handleDownloadDocument}
                            >
                              Word (.docx)
                            </Button>
                          </Space>
                        </Flex>
                      </Card>

                      <Form.Item
                        label="Signed Handover Document"
                        extra="Supports PDF, PNG, JPG up to 10MB. If skipped, assigned assets will be flagged with a Pending Record badge."
                        style={{ marginBottom: 0 }}
                      >
                        <Upload.Dragger
                          name="file"
                          multiple={false}
                          maxCount={1}
                          fileList={fileList}
                          accept=".pdf,.png,.jpg,.jpeg"
                          beforeUpload={(file) => {
                            const isValidType =
                              ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(
                                file.type.toLowerCase(),
                              ) || /\.(pdf|png|jpe?g)$/i.test(file.name);
                            if (!isValidType) {
                              message.error(
                                'Invalid file format. Only PDF, PNG, JPG, and JPEG documents are permitted.',
                              );
                              return Upload.LIST_IGNORE;
                            }
                            if (file.size === 0) {
                              message.error(
                                'The selected file is empty (0 bytes). Please select a valid document.',
                              );
                              return Upload.LIST_IGNORE;
                            }
                            const isUnder10MB = file.size / 1024 / 1024 <= 10;
                            if (!isUnder10MB) {
                              message.error('File size exceeds the 10MB limit.');
                              return Upload.LIST_IGNORE;
                            }
                            setFileList([file]);
                            return false;
                          }}
                          onRemove={() => {
                            setFileList([]);
                          }}
                        >
                          <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
                            <InboxOutlined style={{ color: token.colorPrimary, fontSize: 26 }} />
                          </p>
                          <p
                            className="ant-upload-text"
                            style={{ fontSize: 12.5, fontWeight: 500, margin: 0 }}
                          >
                            Click or drag signed document here to upload
                          </p>
                        </Upload.Dragger>
                      </Form.Item>
                    </>
                  ) : (
                    <Alert
                      type="info"
                      showIcon
                      title="Target Employee Required"
                      description="Select an employee above to preview, print, or download pre-filled handover records and attach signed documentation."
                    />
                  )}
                </AppDrawer.Section>
              ) : (
                <AppDrawer.Section title="Unassign Hardware Assets">
                  <Alert
                    type="warning"
                    showIcon
                    description={`This will dissociate all ${count} selected assets from their current assignees and mark them available in storage.`}
                  />
                </AppDrawer.Section>
              )}

              <AppDrawer.Section title="Asset Status Configuration">
                <Form.Item name="status" style={{ marginBottom: 0 }}>
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
              </AppDrawer.Section>
            </Form>
          </Flex>
        </AppDrawer>

        {previewDocData && (
          <HandoverDocumentModal
            open={Boolean(previewDocData)}
            title={previewDocData.title}
            html={previewDocData.html}
            filename={previewDocData.filename}
            onClose={() => setPreviewDocData(null)}
            onDownloadDocx={handleDownloadDocument}
            downloadingDocx={generatingDownload}
          />
        )}
      </>
    );
  },
);

BatchAssignModal.displayName = 'BatchAssignModal';
