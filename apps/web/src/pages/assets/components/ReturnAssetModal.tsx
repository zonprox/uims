import {
  DownloadOutlined,
  EyeOutlined,
  InboxOutlined,
  LaptopOutlined,
  PrinterOutlined,
  RollbackOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  type UploadFile,
  theme,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { type Asset, assetsService } from '../../../services/assets.service';
import { downloadDocumentHtml, printDocumentHtml } from '../utils/printDocument';
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
        const res = await assetsService.generateHandoverDocument({
          type: 'return',
          assetIds: [asset.id],
          recipientId: asset.assignedToId || undefined,
          conditionNotes: conditionNotes ? String(conditionNotes).trim() : undefined,
        });
        downloadDocumentHtml(res.html, res.filename);
        message.success('Populated return record downloaded successfully.');
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Failed to download return document.');
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
          await onReturn(payload);
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
      } catch (_validationErr: unknown) {
        // Validation errors surfaced by Ant Form
      }
    };

    const isBusy = submitting || localSubmitting || uploadingDoc;

    return (
      <>
        <Modal
          title={
            <Flex align="center" gap={8}>
              <RollbackOutlined style={{ color: token.colorPrimary }} />
              <span>Return Hardware Asset</span>
            </Flex>
          }
          open={open}
          onOk={handleOk}
          onCancel={onCancel}
          confirmLoading={isBusy}
          okText="Confirm Return"
          destroyOnHidden
          width={580}
          styles={{ body: { paddingTop: 12 } }}
        >
          <Flex vertical gap={14}>
            <Card
              size="small"
              styles={{ body: { backgroundColor: token.colorFillAlter } }}
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <Descriptions title="Asset & Custody Summary" size="small" column={1}>
                <Descriptions.Item label="Asset Tag">
                  <Tag icon={<LaptopOutlined />} color="blue">
                    {asset.tag}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Asset Name">
                  <Text strong>{asset.name}</Text>
                  {asset.model && (
                    <Text type="secondary">
                      {' '}
                      ({asset.manufacturer} {asset.model})
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
            </Card>

            <Card
              size="small"
              style={{ borderColor: token.colorBorderSecondary }}
              styles={{ body: { padding: '12px 14px' } }}
            >
              <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                <div>
                  <Text strong style={{ fontSize: 12.5 }}>
                    Return Record Documentation
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11.5 }}>
                      Populate return record with asset & employee details.
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
                    icon={<DownloadOutlined />}
                    loading={generatingDownload}
                    onClick={handleDownloadDocument}
                  >
                    Download
                  </Button>
                </Space>
              </Flex>
            </Card>

            <Divider style={{ margin: '4px 0' }} />

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
          </Flex>
        </Modal>

        {previewDocData && (
          <HandoverDocumentModal
            open={Boolean(previewDocData)}
            title={previewDocData.title}
            html={previewDocData.html}
            filename={previewDocData.filename}
            onClose={() => setPreviewDocData(null)}
          />
        )}
      </>
    );
  },
);

ReturnAssetModal.displayName = 'ReturnAssetModal';
