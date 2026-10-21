import {
  EyeOutlined,
  FileWordOutlined,
  InboxOutlined,
  LaptopOutlined,
  PrinterOutlined,
  RollbackOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Descriptions,
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
import React, { useEffect, useState } from 'react';
import AppDrawer from '../../../components/AppDrawer';
import { type Asset, assetsService } from '../../../services/assets.service';
import { isValidationError } from '../../../utils/formValidators';
import { downloadBlobFile, printDocumentHtml } from '../utils/printDocument';
import { HandoverDocumentModal } from './HandoverDocumentModal';

const { Text } = Typography;

export interface ReturnAssetFormValues {
  status: string;
  conditionNotes?: string;
  signedDocUrl?: string;
}

export interface ReturnAssetModalProps {
  open: boolean;
  asset: Asset | null;
  submitting?: boolean;
  onReturn?: (values: ReturnAssetFormValues) => Promise<void> | void;
  onSuccess?: () => void;
  onCancel: () => void;
}

export const ReturnAssetModal: React.FC<ReturnAssetModalProps> = React.memo(
  ({ open, asset, submitting = false, onReturn, onSuccess, onCancel }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const [form] = Form.useForm<ReturnAssetFormValues>();
    const [localSubmitting, setLocalSubmitting] = useState(false);

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
        setFileList([]);
        setPreviewDocData(null);
        return;
      }

      form.setFieldsValue({
        status: 'In Storage',
        conditionNotes: '',
      });
    }, [open, form]);

    if (!asset) return null;

    const handlePreviewDocument = async () => {
      try {
        setGeneratingPreview(true);
        const conditionNotes = form.getFieldValue('conditionNotes');
        const res = await assetsService.generateHandoverDocument({
          type: 'return',
          assetIds: [asset.id],
          recipientId: asset.assignedToId || undefined,
          conditionNotes: conditionNotes ? String(conditionNotes).trim() : undefined,
        });
        setPreviewDocData({
          title: res.title,
          html: res.html,
          filename: res.filename,
        });
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to generate return document.');
      } finally {
        setGeneratingPreview(false);
      }
    };

    const handlePrintDocument = async () => {
      try {
        setGeneratingPrint(true);
        const conditionNotes = form.getFieldValue('conditionNotes');
        const res = await assetsService.generateHandoverDocument({
          type: 'return',
          assetIds: [asset.id],
          recipientId: asset.assignedToId || undefined,
          conditionNotes: conditionNotes ? String(conditionNotes).trim() : undefined,
        });
        printDocumentHtml(res.html);
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to print return document.');
      } finally {
        setGeneratingPrint(false);
      }
    };

    const handleDownloadDocument = async () => {
      try {
        setGeneratingDownload(true);
        const conditionNotes = form.getFieldValue('conditionNotes');
        const payload = {
          type: 'return' as const,
          assetIds: [asset.id],
          recipientId: asset.assignedToId || undefined,
          conditionNotes: conditionNotes ? String(conditionNotes).trim() : undefined,
        };
        await assetsService.generateHandoverDocument(payload);
        const { blob, filename } = await assetsService.downloadHandoverDocx(payload);
        downloadBlobFile(blob, filename);
        message.success('Populated return record (.docx) downloaded successfully.');
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to download return document.');
      } finally {
        setGeneratingDownload(false);
      }
    };

    const handleOk = async () => {
      let values: ReturnAssetFormValues;
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
              : 'Failed to upload signed return document.',
          );
          return;
        } finally {
          setUploadingDoc(false);
        }
      }

      const payload: ReturnAssetFormValues = {
        status: values.status,
        conditionNotes: values.conditionNotes?.trim() || undefined,
        signedDocUrl: uploadedUrl,
      };

      if (onReturn) {
        try {
          await onReturn(payload);
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Failed to return asset.');
        }
      } else {
        setLocalSubmitting(true);
        try {
          await assetsService.returnAsset(asset.id, payload);
          message.success(`Asset ${asset.tag} successfully returned to storage.`);
          onSuccess?.();
          onCancel();
        } catch (err: unknown) {
          message.error(err instanceof Error ? err.message : 'Failed to return asset.');
        } finally {
          setLocalSubmitting(false);
        }
      }
    };

    if (!asset) return null;

    const isBusy = submitting || localSubmitting || uploadingDoc;
    const hasCustodian = Boolean(
      asset.assignedToId || (asset.assignedTo && asset.assignedTo !== 'Unassigned'),
    );
    const custodianName =
      asset.assignedTo && asset.assignedTo !== 'Unassigned'
        ? asset.assignedTo
        : 'Current Custodian';

    return (
      <>
        <AppDrawer
          open={open}
          onClose={onCancel}
          onCancel={onCancel}
          title="Return Hardware Asset"
          subtitle={`${asset.tag || asset.subcode || ''} — ${asset.name}`}
          icon={<RollbackOutlined />}
          tag={
            asset.assignedTo ? (
              <Tag color={asset.assignedTo === 'Unassigned' ? 'default' : 'blue'}>
                {asset.assignedTo}
              </Tag>
            ) : undefined
          }
          size={580}
          onOk={handleOk}
          okText="Confirm Return"
          okLoading={isBusy}
          cancelText="Cancel"
          destroyOnHidden
        >
          <Flex vertical gap={14}>
            <AppDrawer.Section title="Asset & Custody Summary">
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Asset Details">
                  <Tag icon={<LaptopOutlined />} color="blue">
                    {asset.tag}
                  </Tag>
                  <Text strong style={{ marginLeft: 8 }}>
                    {asset.name}
                  </Text>
                  {(asset.manufacturer || asset.model) && (
                    <Text type="secondary">
                      {' '}
                      ({[asset.manufacturer, asset.model].filter(Boolean).join(' ')})
                    </Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Current Custodian">
                  <Flex align="center" gap={6}>
                    <UserOutlined style={{ color: token.colorPrimary }} />
                    <Text>{asset.assignedTo || 'Unassigned'}</Text>
                    {asset.assignedEmail && <Text type="secondary">({asset.assignedEmail})</Text>}
                  </Flex>
                </Descriptions.Item>
              </Descriptions>
            </AppDrawer.Section>

            {hasCustodian ? (
              <AppDrawer.Section title="Return Record Documentation">
                <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                  <div>
                    <Text strong style={{ fontSize: 12.5, display: 'block' }}>
                      Administrative Return Record
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>
                      Pre-filled for {custodianName} ({asset.tag}). Exclusively supports print and
                      Word (.docx).
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
              </AppDrawer.Section>
            ) : (
              <Alert
                type="info"
                showIcon
                title="Unassigned Asset"
                description="This asset has no current custodian. Return record documentation is only applicable for assigned assets."
              />
            )}

            <AppDrawer.Section title="Check-In Details">
              <Form
                form={form}
                layout="vertical"
                initialValues={{ status: 'In Storage' }}
                validateTrigger={['onChange', 'onBlur']}
              >
                <Form.Item
                  name="status"
                  label="Return Status"
                  rules={[{ required: true, message: 'Please select target asset status' }]}
                >
                  <Select
                    options={[
                      { label: 'In Storage (Available for reissue)', value: 'In Storage' },
                      { label: 'In Repair (Needs maintenance or servicing)', value: 'In Repair' },
                      { label: 'Retired (End of lifecycle or decommissioned)', value: 'Retired' },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="conditionNotes" label="Condition Notes & Physical Inspection">
                  <Input.TextArea
                    rows={3}
                    placeholder="Describe equipment physical condition, accessories returned, or any defects noted during check-in..."
                  />
                </Form.Item>

                <Form.Item
                  label="Signed Return Document"
                  extra="Supports PDF, PNG, JPG up to 10MB. If skipped, asset will be flagged with a Pending Record badge."
                >
                  <Upload.Dragger
                    name="file"
                    multiple={false}
                    maxCount={1}
                    fileList={fileList}
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={({ fileList: nextList }) => {
                      setFileList(nextList.slice(-1));
                    }}
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
                      Click or drag signed return record here to upload
                    </p>
                  </Upload.Dragger>
                </Form.Item>
              </Form>
            </AppDrawer.Section>
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

ReturnAssetModal.displayName = 'ReturnAssetModal';
