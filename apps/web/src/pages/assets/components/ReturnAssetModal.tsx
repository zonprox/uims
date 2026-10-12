import {
  DownloadOutlined,
  FileDoneOutlined,
  LaptopOutlined,
  RollbackOutlined,
  UserOutlined,
  WarningOutlined,
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
  Modal,
  Select,
  Tag,
  Typography,
  theme,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { type Asset, assetsService } from '../../../services/assets.service';

const { Text } = Typography;

export interface ReturnAssetFormValues {
  status: string;
  conditionNotes?: string;
  recordDocUrl?: string;
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
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const [localSubmitting, setLocalSubmitting] = useState(false);

    useEffect(() => {
      if (!open) {
        form.resetFields();
        return;
      }

      form.setFieldsValue({
        status: 'In Storage',
        conditionNotes: '',
        recordDocUrl: '',
      });
    }, [open, form]);

    if (!asset) return null;

    const handleDownloadTemplate = async () => {
      try {
        setDownloadingTemplate(true);
        await assetsService.downloadHandoverTemplate('return');
        message.success('Return record template downloaded successfully.');
      } catch (_err: unknown) {
        message.error('Failed to download return template.');
      } finally {
        setDownloadingTemplate(false);
      }
    };

    const handleOk = async () => {
      try {
        const values = await form.validateFields();
        const payload: ReturnAssetFormValues = {
          status: values.status,
          conditionNotes: values.conditionNotes?.trim() || undefined,
          recordDocUrl: values.recordDocUrl?.trim() || undefined,
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

    const isBusy = submitting || localSubmitting;

    return (
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
        width={560}
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

          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            title="Handover Record Verification"
            description="Submitting without a signed record will flag this asset with a Pending Record badge until uploaded."
          />

          <Flex justify="space-between" align="center">
            <Text type="secondary" style={{ fontSize: 12 }}>
              Standard Return Documentation
            </Text>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={downloadingTemplate}
              onClick={handleDownloadTemplate}
            >
              Download Return Template
            </Button>
          </Flex>

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
              name="recordDocUrl"
              label="Scanned Signed Document (URL or File Link)"
              tooltip="Attach the signed return record document. If left empty, the asset will display a Pending Record warning badge."
            >
              <Input
                placeholder="e.g. https://storage.youngonevn.com/records/return-signed.pdf"
                prefix={<FileDoneOutlined style={{ color: token.colorTextSecondary }} />}
                allowClear
              />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    );
  },
);

ReturnAssetModal.displayName = 'ReturnAssetModal';
