import { DisconnectOutlined, FilePdfOutlined, InboxOutlined } from '@ant-design/icons';
import { AccessAssignmentStatus, type DoorUserAssignmentDto } from '@uims/shared-types';
import {
  Alert,
  App,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Typography,
  Upload,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { RevokeModalState } from '../types/access-control.types';
import { formatDate } from '../utils/access-control.utils';

const { Text } = Typography;

interface RevokeAccessModalProps {
  state: RevokeModalState;
  onClose: () => void;
  onSuccess: () => void;
}

interface RevokeFormValues {
  assignmentIds: string[];
  approverName: string;
  approverTitle?: string;
  referenceNumber?: string;
  reason: string;
  notes?: string;
}

interface AssignmentOption {
  value: string;
  label: string;
}

export const RevokeAccessModal: React.FC<RevokeAccessModalProps> = ({
  state,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<RevokeFormValues>();

  const [availableAssignments, setAvailableAssignments] = useState<AssignmentOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (state.open) {
      setLoadingInitial(true);
      setSelectedFile(null);
      form.resetFields();

      // Fetch doors to collect active assignments for revocation
      accessControlService
        .getDoors({ pageSize: 50 })
        .then(async (doorsRes) => {
          const activeDoors = doorsRes.items.filter((d) => d.activeUsersCount > 0);
          const assignmentOptions: AssignmentOption[] = [];

          // Collect active user assignments across active doors
          const userResults = await Promise.all(
            activeDoors.map((d) =>
              accessControlService
                .getDoorUsers(d.id, {
                  pageSize: 50,
                  status: AccessAssignmentStatus.ACTIVE,
                })
                .then((res) => ({ door: d, users: res.items }))
                .catch((err: unknown) => {
                  message.error(formatErrorMessage(err, 'load user active door clearances'));
                  return { door: d, users: [] as DoorUserAssignmentDto[] };
                }),
            ),
          );

          for (const item of userResults) {
            for (const u of item.users) {
              assignmentOptions.push({
                value: u.assignmentId,
                label: `${item.door.doorCode} • ${u.fullName} (${u.codeOrBadge} - ${u.organizationOrCompany}) • Granted ${formatDate(u.grantedAt)}`,
              });
            }
          }

          // If there are preselected IDs not in options, create placeholder entries
          if (state.preselectedAssignmentIds) {
            for (const id of state.preselectedAssignmentIds) {
              if (!assignmentOptions.some((o) => o.value === id)) {
                assignmentOptions.push({
                  value: id,
                  label: `Preselected Assignment (${id})`,
                });
              }
            }
          }

          setAvailableAssignments(assignmentOptions);
          form.setFieldsValue({
            assignmentIds: state.preselectedAssignmentIds || [],
          });
        })
        .catch((err: unknown) => {
          message.error(formatErrorMessage(err, 'load active door clearances'));
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    }
  }, [state.open, state.preselectedAssignmentIds, form, message]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // MANDATORY SCAN ATTACHMENT CHECK
      if (!selectedFile) {
        message.error('A signed revocation approval document scan (PDF or image) is mandatory.');
        return;
      }

      setSubmitting(true);

      const result = await accessControlService.revokeAccess(
        {
          assignmentIds: values.assignmentIds,
          approverName: values.approverName.trim(),
          approverTitle: values.approverTitle?.trim() || undefined,
          referenceNumber: values.referenceNumber?.trim() || undefined,
          reason: values.reason.trim(),
          notes: values.notes?.trim() || undefined,
        },
        selectedFile,
      );

      message.success(
        `Successfully revoked ${result.revokedAssignmentsCount} door access clearance(s).`,
      );

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        return;
      }
      message.error(formatErrorMessage(err, 'revoke physical door access'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={state.open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      title={
        <Space>
          <DisconnectOutlined style={{ color: '#ff4d4f' }} />
          <span>Revoke Physical Door Access</span>
        </Space>
      }
      width={740}
      okText="Revoke Access"
      okButtonProps={{ danger: true }}
      styles={{
        body: { maxHeight: '75vh', overflowY: 'auto', paddingTop: 8 },
      }}
      destroyOnHidden
    >
      {loadingInitial ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin description="Loading active access clearances..." />
        </div>
      ) : (
        <Form form={form} layout="vertical">
          <Alert
            type="warning"
            showIcon
            title="Single & Batch Access Revocation"
            description="Revoking access will immediately disable electronic door clearance. An authorized revocation scan (PDF or image) is mandatory for security compliance."
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="assignmentIds"
            label="Active Access Clearances to Revoke (Select 1 or more)"
            rules={[{ required: true, message: 'Please select at least one active clearance' }]}
          >
            <Select
              mode="multiple"
              placeholder="Search by door code, employee name, or badge #..."
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={availableAssignments}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="approverName"
                label="Revoking Authority Name"
                rules={[
                  { required: true, message: 'Approver name is required' },
                  { max: 150, message: 'Max 150 characters' },
                ]}
              >
                <Input placeholder="e.g. Chief Information Security Officer" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="approverTitle" label="Approver Title / Role">
                <Input placeholder="e.g. Head of Physical Security" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="referenceNumber" label="Revocation Memo / Reference Number">
                <Input placeholder="e.g. DAR-REV-2026-008" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="Revocation Reason & Justification"
            rules={[
              { required: true, message: 'Reason is required' },
              { max: 500, message: 'Max 500 characters' },
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder="e.g. Employee departure / project contract completed / security audit policy update"
            />
          </Form.Item>

          <Form.Item name="notes" label="Administrative Notes">
            <Input.TextArea rows={1} placeholder="Optional notes or supplementary instructions" />
          </Form.Item>

          <Divider titlePlacement="start" style={{ margin: '12px 0' }}>
            <Space>
              <FilePdfOutlined style={{ color: '#ff4d4f' }} />
              <Text strong>Mandatory Signed Revocation Scan Document</Text>
            </Space>
          </Divider>

          <div style={{ marginBottom: 16 }}>
            <Upload.Dragger
              name="revocationScan"
              multiple={false}
              maxCount={1}
              accept=".pdf,.png,.jpg,.jpeg"
              beforeUpload={(file) => {
                const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
                const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
                const fileName = (file.name || '').toLowerCase();
                const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));
                const hasValidMime = file.type
                  ? allowedMimes.includes(file.type.toLowerCase())
                  : true;

                if (!hasValidExtension || !hasValidMime) {
                  message.error('Invalid file format. Only PDF, PNG, and JPG files are supported.');
                  return Upload.LIST_IGNORE;
                }

                if (file.size > 10 * 1024 * 1024) {
                  message.error('Scan file must not exceed 10MB.');
                  return Upload.LIST_IGNORE;
                }
                setSelectedFile(file);
                return false;
              }}
              onRemove={() => {
                setSelectedFile(null);
              }}
              fileList={
                selectedFile
                  ? [
                      {
                        uid: '-1',
                        name: selectedFile.name,
                        status: 'done',
                        size: selectedFile.size,
                      },
                    ]
                  : []
              }
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 36, color: '#ff4d4f' }} />
              </p>
              <p className="ant-upload-text">
                Click or drag signed revocation approval scan here (PDF, PNG, JPG up to 10MB)
              </p>
              <p className="ant-upload-hint">
                <Text type="danger" strong>
                  * Mandatory Requirement:
                </Text>{' '}
                Door access clearances cannot be revoked without a verifiable signed authorization
                scan.
              </p>
            </Upload.Dragger>
          </div>
        </Form>
      )}
    </Modal>
  );
};
