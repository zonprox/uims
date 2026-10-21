import {
  ArrowRightOutlined,
  EyeOutlined,
  FileWordOutlined,
  InboxOutlined,
  PrinterOutlined,
  SwapOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  type UploadFile,
  theme,
} from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import AppDrawer, { DrawerSection } from '../../../components/AppDrawer';
import { type Asset, assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { formRules } from '../../../utils/formValidators';
import { downloadBlobFile, printDocumentHtml } from '../utils/printDocument';
import { HandoverDocumentModal } from './HandoverDocumentModal';

const { Text } = Typography;

export interface TransferAssetDrawerProps {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface TransferFormValues {
  toUserId: string;
  transferReason: string;
  notes?: string;
}

const formatUserDisplayName = (u: DirectoryUser): string =>
  u.fullName?.trim() ||
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
  u.displayName?.trim() ||
  u.email;

export const TransferAssetDrawer: React.FC<TransferAssetDrawerProps> = ({
  open,
  asset,
  onClose,
  onSuccess,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [form] = Form.useForm<TransferFormValues>();
  const [employees, setEmployees] = useState<DirectoryUser[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedToUser, setSelectedToUser] = useState<DirectoryUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Document preview / actions
  const [previewDocData, setPreviewDocData] = useState<{
    title: string;
    html: string;
    filename: string;
  } | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [generatingPrint, setGeneratingPrint] = useState(false);
  const [generatingDownload, setGeneratingDownload] = useState(false);

  // Dual upload states
  const [fileListA, setFileListA] = useState<UploadFile[]>([]);
  const [fileListB, setFileListB] = useState<UploadFile[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setSelectedToUser(null);
      setFileListA([]);
      setFileListB([]);
      return;
    }

    setLoadingEmployees(true);
    directoryService
      .getEmployees({ pageSize: 100 })
      .then((res) => {
        setEmployees(res.items || []);
      })
      .catch((err: unknown) => {
        message.warning(formatErrorMessage(err, 'load directory employees'));
      })
      .finally(() => {
        setLoadingEmployees(false);
      });

    form.setFieldsValue({
      transferReason: 'Department Transfer',
      notes: '',
    });
  }, [open, form, message]);

  // Exclude current custodian from recipient options
  const eligibleEmployees = useMemo(() => {
    if (!asset) return employees;
    const currentId = asset.assignedToId;
    const currentName = asset.assignedTo?.toLowerCase();
    return employees.filter((e) => e.id !== currentId && e.fullName?.toLowerCase() !== currentName);
  }, [employees, asset]);

  const handleToUserChange = (userId: string) => {
    const found = employees.find((e) => e.id === userId) || null;
    setSelectedToUser(found);
  };

  const handlePreviewDoc = async (type: 'return' | 'assignment' | 'transfer' = 'transfer') => {
    if (!asset) return;
    if (type !== 'return' && !selectedToUser) {
      message.warning('Please select a target custodian first to generate transfer documents.');
      return;
    }
    setGeneratingPreview(true);
    try {
      const res = await assetsService.generateHandoverDocument({
        type,
        assetIds: [asset.id],
        recipientId: type === 'return' ? asset.assignedToId || undefined : selectedToUser?.id,
        transferorId: asset.assignedToId || undefined,
        conditionNotes: form.getFieldValue('transferReason'),
      });
      const titleMap = {
        return: 'Equipment Return Record (Custodian A)',
        assignment: 'Equipment Assignment Record (Custodian B)',
        transfer: 'Equipment Custody Transfer Record',
      };
      setPreviewDocData({
        title: titleMap[type] || 'Custody Document',
        html: res.html,
        filename: res.filename || `asset_${type}_${asset.subcode || asset.tag}.html`,
      });
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, `generate ${type} document preview`));
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handlePrintDoc = async (type: 'return' | 'assignment' | 'transfer' = 'transfer') => {
    if (!asset) return;
    if (type !== 'return' && !selectedToUser) {
      message.warning('Please select a target custodian first to print transfer documents.');
      return;
    }
    setGeneratingPrint(true);
    try {
      const res = await assetsService.generateHandoverDocument({
        type,
        assetIds: [asset.id],
        recipientId: type === 'return' ? asset.assignedToId || undefined : selectedToUser?.id,
        transferorId: asset.assignedToId || undefined,
        conditionNotes: form.getFieldValue('transferReason'),
      });
      printDocumentHtml(res.html);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, `print ${type} document`));
    } finally {
      setGeneratingPrint(false);
    }
  };

  const handleDownloadDoc = async (type: 'return' | 'assignment' | 'transfer' = 'transfer') => {
    if (!asset) return;
    if (type !== 'return' && !selectedToUser) {
      message.warning('Please select a target custodian first to download transfer documents.');
      return;
    }
    setGeneratingDownload(true);
    try {
      const { blob, filename } = await assetsService.downloadHandoverDocx({
        type,
        assetIds: [asset.id],
        recipientId: type === 'return' ? asset.assignedToId || undefined : selectedToUser?.id,
        transferorId: asset.assignedToId || undefined,
        conditionNotes: form.getFieldValue('transferReason'),
      });
      downloadBlobFile(blob, filename);
      message.success(`Populated ${type} record (.docx) downloaded.`);
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, `download ${type} record docx`));
    } finally {
      setGeneratingDownload(false);
    }
  };

  const handleSubmit = async () => {
    if (!asset) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let signedDocUrl: string | undefined;

      // Check if a file was uploaded for Custodian A or B
      const fileToUpload = fileListB[0]?.originFileObj || fileListA[0]?.originFileObj;
      if (fileToUpload) {
        setUploadingDoc(true);
        try {
          const uploadRes = await assetsService.uploadHandoverDocument(fileToUpload, asset.id);
          signedDocUrl = uploadRes.fileUrl;
        } catch (uploadErr: unknown) {
          message.warning(
            formatErrorMessage(uploadErr, 'upload signed document; continuing transfer'),
          );
        } finally {
          setUploadingDoc(false);
        }
      }

      const payload = {
        assetIds: [asset.id],
        toUserId: values.toUserId,
        toDepartmentId: selectedToUser?.departmentId || undefined,
        transferReason: values.transferReason ? values.transferReason.trim() : undefined,
        signedDocUrl,
      };

      await assetsService.transferAsset(payload);
      message.success(
        `Asset "${asset.subcode || asset.tag}" transferred to ${
          selectedToUser ? formatUserDisplayName(selectedToUser) : 'new custodian'
        } successfully.`,
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'process asset custody transfer'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!asset) return null;

  return (
    <AppDrawer
      title="Transfer Asset Custody"
      subtitle={`Move equipment between employees in 1 atomic transaction with dual administrative compliance`}
      icon={<SwapOutlined style={{ color: token.colorPrimary }} />}
      tag={<Tag color="purple">Atomic Custody Transfer</Tag>}
      open={open}
      onClose={onClose}
      size={640}
      destroyOnHidden={true}
      onOk={handleSubmit}
      okText="Execute Custody Transfer"
      okLoading={submitting || uploadingDoc}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        validateTrigger={['onChange', 'onBlur']}
      >
        {/* Custodian A (Current Holder) */}
        <DrawerSection title="Source Custodian (Custodian A)">
          <Card
            size="small"
            style={{
              background: token.colorFillAlter,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Current Custodian">
                <Text strong>
                  <UserOutlined style={{ marginRight: 6 }} />
                  {asset.assignedTo || 'Unassigned'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                <Tag color="cyan">{asset.department || 'General'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Asset SUB Code">
                <Text code strong>
                  {asset.subcode || asset.tag}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Device Model">
                <Text>
                  {asset.name} ({asset.model || 'Standard'})
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </DrawerSection>

        {/* Transfer Transition Arrow */}
        <Flex justify="center" align="center" style={{ margin: '8px 0' }}>
          <Tag color="purple" style={{ padding: '4px 12px', fontSize: 13 }}>
            Transferring to <ArrowRightOutlined style={{ marginLeft: 4 }} />
          </Tag>
        </Flex>

        {/* Custodian B (Target Custodian) */}
        <DrawerSection title="Target Custodian (Custodian B)">
          <Form.Item
            name="toUserId"
            label="Target Recipient Employee"
            rules={[
              formRules.required('Target employee'),
              {
                validator: async (_, value) => {
                  if (value && asset && value === asset.assignedToId) {
                    throw new Error('Target custodian cannot be the same as current custodian.');
                  }
                },
              },
            ]}
            extra="Select employee who is taking custody of this equipment."
          >
            <Select
              placeholder="Search employee by name, code, or email"
              loading={loadingEmployees}
              options={eligibleEmployees.map((e) => ({
                label: `${formatUserDisplayName(e)} [${e.employeeCode || e.email}] — ${
                  e.department?.name || 'Department'
                }`,
                value: e.id,
              }))}
              showSearch={{
                filterOption: (input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
              }}
              onChange={handleToUserChange}
            />
          </Form.Item>

          {selectedToUser && (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 12 }}
              title={
                <div>
                  <strong>{formatUserDisplayName(selectedToUser)}</strong> ({selectedToUser.email})
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Department: {selectedToUser.department?.name || 'General Department'} ·
                    Position: {selectedToUser.position?.title || 'Employee'}
                  </div>
                </div>
              }
            />
          )}

          <Form.Item
            name="transferReason"
            label="Transfer Reason"
            rules={[formRules.required('Transfer reason')]}
          >
            <Select
              options={[
                { label: 'Departmental Reorganization / Transfer', value: 'Department Transfer' },
                { label: 'Project Team Reallocation', value: 'Project Reallocation' },
                { label: 'Employee Replacement / Promotion', value: 'Role Promotion' },
                { label: 'Asset Custody Handover', value: 'Direct Handover' },
              ]}
            />
          </Form.Item>

          <Form.Item name="notes" label="Administrative Remarks / Notes">
            <Input.TextArea rows={2} placeholder="Optional transfer notes or handoff conditions." />
          </Form.Item>
        </DrawerSection>

        {/* Dual Administrative Document Verification */}
        <DrawerSection title="Administrative Custody Transfer Agreement">
          {/* Card 1: Custody Return Record (Custodian A) */}
          <Card
            size="small"
            style={{
              background: token.colorFillAlter,
              border: `1px dashed ${token.colorBorderSecondary}`,
              marginBottom: 16,
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
              <div>
                <Text strong style={{ display: 'block' }}>
                  Custody Return Record (Custodian A)
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Pre-populated return form for current custodian reclaiming equipment
                </Text>
              </div>
              <Space>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  loading={generatingPreview}
                  onClick={() => handlePreviewDoc('return')}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  loading={generatingPrint}
                  onClick={() => handlePrintDoc('return')}
                >
                  Print
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<FileWordOutlined />}
                  loading={generatingDownload}
                  onClick={() => handleDownloadDoc('return')}
                >
                  Download .docx
                </Button>
              </Space>
            </Flex>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Upload Signed Return Form (Custodian A) (PDF, PNG, JPG up to 10MB):
              </Text>
              <Upload.Dragger
                fileList={fileListA}
                onChange={({ fileList }) => setFileListA(fileList.slice(-1))}
                beforeUpload={() => false}
                maxCount={1}
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ padding: '8px 0' }}
              >
                <p className="ant-upload-drag-icon" style={{ margin: 0 }}>
                  <InboxOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: 12, margin: '4px 0' }}>
                  Click or drag signed return form here
                </p>
              </Upload.Dragger>
            </div>
          </Card>

          {/* Card 2: Custody Assignment Record (Custodian B) */}
          <Card
            size="small"
            style={{
              background: token.colorFillAlter,
              border: `1px dashed ${token.colorBorderSecondary}`,
              marginBottom: 16,
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
              <div>
                <Text strong style={{ display: 'block' }}>
                  Custody Assignment Record (Custodian B)
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Pre-populated assignment form for new custodian receiving equipment
                </Text>
              </div>
              <Space>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  loading={generatingPreview}
                  onClick={() => handlePreviewDoc('assignment')}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  loading={generatingPrint}
                  onClick={() => handlePrintDoc('assignment')}
                >
                  Print
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<FileWordOutlined />}
                  loading={generatingDownload}
                  onClick={() => handleDownloadDoc('assignment')}
                >
                  Download .docx
                </Button>
              </Space>
            </Flex>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Upload Signed Assignment Form (Custodian B) (PDF, PNG, JPG up to 10MB):
              </Text>
              <Upload.Dragger
                fileList={fileListB}
                onChange={({ fileList }) => setFileListB(fileList.slice(-1))}
                beforeUpload={() => false}
                maxCount={1}
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ padding: '8px 0' }}
              >
                <p className="ant-upload-drag-icon" style={{ margin: 0 }}>
                  <InboxOutlined style={{ fontSize: 24, color: token.colorPrimary }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: 12, margin: '4px 0' }}>
                  Click or drag signed assignment form here
                </p>
              </Upload.Dragger>
            </div>
          </Card>

          {/* Card 3: Standard Custody Transfer Agreement */}
          <Card
            size="small"
            style={{
              background: token.colorFillAlter,
              border: `1px dashed ${token.colorBorderSecondary}`,
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
              <div>
                <Text strong style={{ display: 'block' }}>
                  Standard Custody Transfer Agreement
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Pre-populated agreement between Custodian A and Custodian B
                </Text>
              </div>
              <Space>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  loading={generatingPreview}
                  onClick={() => handlePreviewDoc('transfer')}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  loading={generatingPrint}
                  onClick={() => handlePrintDoc('transfer')}
                >
                  Print
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<FileWordOutlined />}
                  loading={generatingDownload}
                  onClick={() => handleDownloadDoc('transfer')}
                >
                  Download .docx
                </Button>
              </Space>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
              If deferred, this asset will be tagged with a prominent &quot;Pending Record&quot;
              compliance badge until uploaded.
            </Text>
          </Card>
        </DrawerSection>
      </Form>

      {/* Preview Modal */}
      {previewDocData && (
        <HandoverDocumentModal
          open={Boolean(previewDocData)}
          title={previewDocData.title}
          html={previewDocData.html}
          filename={previewDocData.filename}
          onClose={() => setPreviewDocData(null)}
        />
      )}
    </AppDrawer>
  );
};

export default TransferAssetDrawer;
