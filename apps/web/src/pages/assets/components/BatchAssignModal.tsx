import {
  EyeOutlined,
  FileExcelOutlined,
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
  Badge,
  Button,
  Card,
  Descriptions,
  Divider,
  Flex,
  Form,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  type UploadFile,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { type Asset, assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import { formRules } from '../../../utils/formValidators';
import { downloadBlobFile, printDocumentHtml } from '../utils/printDocument';
import { HandoverDocumentModal } from './HandoverDocumentModal';

const { Text } = Typography;

export interface BatchAssignFormValues {
  mode: 'assign' | 'unassign';
  assignedToId?: string | null;
  status?: string;
  signedDocUrl?: string;
}

export interface BatchAssignModalProps {
  open: boolean;
  assets: Asset[];
  submitting: boolean;
  onAssign: (values: BatchAssignFormValues) => void;
  onCancel: () => void;
  employees?: DirectoryUser[]; // For test isolation
  initialUserId?: string;
}

export const BatchAssignModal: React.FC<BatchAssignModalProps> = React.memo(
  ({ open, assets, submitting, onAssign, onCancel, employees: propEmployees, initialUserId }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const [form] = Form.useForm<BatchAssignFormValues>();
    const [mode, setMode] = useState<'assign' | 'unassign'>('assign');
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);

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
        setFileList([]);
        setPreviewDocData(null);
        return;
      }

      setSelectedUserId(initialUserId || null);
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
          assetIds: assets.length > 0 ? assets.map((a) => a.id) : undefined,
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
          assetIds: assets.length > 0 ? assets.map((a) => a.id) : undefined,
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
          assetIds: assets.length > 0 ? assets.map((a) => a.id) : undefined,
          recipientId: selectedUserId || undefined,
        });
        const { blob, filename } = await assetsService.downloadHandoverDocx({
          type: 'assignment',
          assetIds: assets.length > 0 ? assets.map((a) => a.id) : undefined,
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

    const handleDownloadXlsx = async () => {
      try {
        setGeneratingDownload(true);
        const { blob, filename } = await assetsService.downloadHandoverXlsx({
          type: 'assignment',
          assetIds: assets.length > 0 ? assets.map((a) => a.id) : undefined,
          recipientId: selectedUserId || undefined,
        });
        downloadBlobFile(blob, filename);
        message.success('Populated handover spreadsheet (.xlsx) downloaded successfully.');
      } catch (err: unknown) {
        message.error(
          err instanceof Error ? err.message : 'Failed to download handover spreadsheet.',
        );
      } finally {
        setGeneratingDownload(false);
      }
    };

    const handleOk = async () => {
      try {
        const values = await form.validateFields();
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

        onAssign({
          mode,
          assignedToId: mode === 'assign' ? values.assignedToId : null,
          status: values.status,
          signedDocUrl: uploadedUrl,
        });
      } catch (_validationErr: unknown) {
        // Validation errors surfaced by Ant Form
      }
    };

    const count = assets.length;

    return (
      <>
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
          confirmLoading={submitting || uploadingDoc}
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
          width={600}
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

                      <Card
                        size="small"
                        style={{ marginBottom: 14, borderColor: token.colorBorderSecondary }}
                        styles={{ body: { padding: '12px 14px' } }}
                      >
                        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                          <div>
                            <Text strong style={{ fontSize: 12.5 }}>
                              Handover Record Documentation
                            </Text>
                            <div>
                              <Text type="secondary" style={{ fontSize: 11.5 }}>
                                Pre-filled for{' '}
                                {selectedUser.fullName ||
                                  `${selectedUser.firstName} ${selectedUser.lastName}`.trim()}{' '}
                                ({count} asset{count > 1 ? 's' : ''}).
                              </Text>
                            </div>
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
                            <Button
                              size="small"
                              icon={<FileExcelOutlined />}
                              loading={generatingDownload}
                              onClick={handleDownloadXlsx}
                            >
                              Excel (.xlsx)
                            </Button>
                          </Space>
                        </Flex>
                      </Card>

                      <Form.Item
                        label="Signed Handover Document"
                        extra="Supports PDF, PNG, JPG up to 10MB. If skipped, assigned assets will be flagged with a Pending Record badge."
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
                      style={{ marginBottom: 14 }}
                    />
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

        {previewDocData && (
          <HandoverDocumentModal
            open={Boolean(previewDocData)}
            title={previewDocData.title}
            html={previewDocData.html}
            filename={previewDocData.filename}
            onClose={() => setPreviewDocData(null)}
            onDownloadDocx={handleDownloadDocument}
            onDownloadXlsx={handleDownloadXlsx}
            downloadingDocx={generatingDownload}
          />
        )}
      </>
    );
  },
);

BatchAssignModal.displayName = 'BatchAssignModal';
