import {
  FilePdfOutlined,
  FileWordOutlined,
  InboxOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  AccessSubjectType,
  AccessValidityType,
  type DoorWithCountDto,
  type UnifiedUserRowDto,
} from '@uims/shared-types';
import {
  Alert,
  App,
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Typography,
  Upload,
} from 'antd';
import type { Dayjs } from 'dayjs';
import React, { useEffect, useState } from 'react';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { GrantModalState } from '../types/access-control.types';
import { downloadBlobFile } from '../utils/access-control.utils';

const { Text } = Typography;

interface GrantAccessModalProps {
  state: GrantModalState;
  onClose: () => void;
  onSuccess: () => void;
}

interface GrantFormValues {
  doorIds: string[];
  subjectType: AccessSubjectType;
  subjectIds: string[];
  accessType: AccessValidityType;
  validityRange?: [Dayjs, Dayjs];
  approverName: string;
  approverTitle?: string;
  referenceNumber?: string;
  reason: string;
  notes?: string;
}

export const GrantAccessModal: React.FC<GrantAccessModalProps> = ({
  state,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<GrantFormValues>();

  const [doors, setDoors] = useState<DoorWithCountDto[]>([]);
  const [users, setUsers] = useState<UnifiedUserRowDto[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const subjectType = Form.useWatch('subjectType', form) || AccessSubjectType.DIRECTORY_USER;
  const accessType = Form.useWatch('accessType', form) || AccessValidityType.PERMANENT;

  useEffect(() => {
    if (state.open) {
      setLoadingInitial(true);
      setSelectedFile(null);
      form.resetFields();

      Promise.all([
        accessControlService.getDoors({ pageSize: 100 }),
        accessControlService.getUnifiedUsers({ pageSize: 100 }),
      ])
        .then(([doorsRes, usersRes]) => {
          setDoors(doorsRes.items);
          setUsers(usersRes.items);

          const defaultSubjectType =
            state.preselectedSubjectType || AccessSubjectType.DIRECTORY_USER;
          form.setFieldsValue({
            doorIds: state.preselectedDoorIds || [],
            subjectType: defaultSubjectType,
            subjectIds: state.preselectedSubjectIds || [],
            accessType: AccessValidityType.PERMANENT,
          });
        })
        .catch((err: unknown) => {
          message.error(formatErrorMessage(err, 'load doors and users for grant form'));
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    }
  }, [
    state.open,
    state.preselectedDoorIds,
    state.preselectedSubjectType,
    state.preselectedSubjectIds,
    form,
    message,
  ]);

  const filteredUsers = users.filter((u) => u.subjectType === subjectType);

  const handleDownloadDocx = async () => {
    try {
      setDownloadingTemplate(true);
      const currentValues = form.getFieldsValue();
      const { blob, filename } = await accessControlService.downloadDocxTemplate({
        doorIds: currentValues.doorIds,
        subjectType: currentValues.subjectType,
        subjectIds: currentValues.subjectIds,
        approverName: currentValues.approverName,
        approverTitle: currentValues.approverTitle,
        reason: currentValues.reason,
        referenceNumber: currentValues.referenceNumber,
      });
      downloadBlobFile(blob, filename);
      message.success('Access request template (.docx) downloaded successfully.');
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'download .docx request template'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePrintHtml = async () => {
    try {
      setDownloadingTemplate(true);
      const currentValues = form.getFieldsValue();
      const html = await accessControlService.getHtmlTemplate({
        doorIds: currentValues.doorIds,
        subjectType: currentValues.subjectType,
        subjectIds: currentValues.subjectIds,
        approverName: currentValues.approverName,
        approverTitle: currentValues.approverTitle,
        reason: currentValues.reason,
        referenceNumber: currentValues.referenceNumber,
      });

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      } else {
        // Fallback to blob download if popups are blocked
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        downloadBlobFile(blob, 'access-request-form.html');
      }
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'generate printable HTML form'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // MANDATORY SCAN ATTACHMENT CHECK
      if (!selectedFile) {
        message.error('A signed approval document scan (PDF or image) is mandatory.');
        return;
      }

      setSubmitting(true);

      const validFrom = values.validityRange ? values.validityRange[0].toISOString() : undefined;
      const validTo = values.validityRange ? values.validityRange[1].toISOString() : undefined;

      const result = await accessControlService.grantAccess(
        {
          doorIds: values.doorIds,
          subjectType: values.subjectType,
          subjectIds: values.subjectIds,
          accessType: values.accessType,
          validFrom,
          validTo,
          approverName: values.approverName.trim(),
          approverTitle: values.approverTitle?.trim() || undefined,
          referenceNumber: values.referenceNumber?.trim() || undefined,
          reason: values.reason.trim(),
          notes: values.notes?.trim() || undefined,
        },
        selectedFile,
      );

      message.success(
        `Granted access to ${values.doorIds.length} door(s) for ${values.subjectIds.length} user(s) (${result.createdAssignmentsCount} assignments created).`,
      );

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        return;
      }
      message.error(formatErrorMessage(err, 'grant physical door access'));
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
          <SafetyCertificateOutlined style={{ color: '#10b981' }} />
          <span>Grant Physical Door Access</span>
        </Space>
      }
      width={780}
      okText="Grant Access"
      styles={{
        body: { maxHeight: '75vh', overflowY: 'auto', paddingTop: 8 },
      }}
      destroyOnHidden
    >
      {loadingInitial ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin description="Loading doors and users..." />
        </div>
      ) : (
        <Form form={form} layout="vertical">
          <Alert
            type="info"
            showIcon
            title="Single & Batch Access Authorization"
            description="You can authorize one or multiple doors for one or multiple individuals in a single request. A signed authorization scan (PDF or image) is required to ensure audit compliance."
            style={{ marginBottom: 16 }}
          />

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                name="doorIds"
                label="Target Doors (Select 1 or more)"
                rules={[{ required: true, message: 'Please select at least one door' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select physical doors..."
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  options={doors.map((d) => ({
                    value: d.id,
                    label: `${d.doorCode} — ${d.name} (${d.building}, Floor ${d.floor}) [${d.securityLevel}]`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={10}>
              <Form.Item
                name="subjectType"
                label="Subject Category"
                rules={[{ required: true, message: 'Select subject type' }]}
              >
                <Radio.Group
                  buttonStyle="solid"
                  onChange={() => {
                    form.setFieldValue('subjectIds', []);
                  }}
                >
                  <Radio.Button value={AccessSubjectType.DIRECTORY_USER}>AD Employee</Radio.Button>
                  <Radio.Button value={AccessSubjectType.NON_AD_USER}>
                    External / Non-AD
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} sm={14}>
              <Form.Item
                name="subjectIds"
                label={`Select ${subjectType === AccessSubjectType.DIRECTORY_USER ? 'AD Employees' : 'External Users'} (1 or more)`}
                rules={[{ required: true, message: 'Please select at least one user' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Select users..."
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  options={filteredUsers.map((u) => ({
                    value: u.id,
                    label: `${u.fullName} (${u.codeOrBadge}) • ${u.organizationOrCompany}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={10}>
              <Form.Item
                name="accessType"
                label="Access Validity Mode"
                rules={[{ required: true, message: 'Select access type' }]}
              >
                <Radio.Group>
                  <Radio value={AccessValidityType.PERMANENT}>Permanent</Radio>
                  <Radio value={AccessValidityType.TIME_BOUND}>Time-Bound</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            {accessType === AccessValidityType.TIME_BOUND && (
              <Col xs={24} sm={14}>
                <Form.Item
                  name="validityRange"
                  label="Authorized Date Range"
                  rules={[{ required: true, message: 'Validity date range is required' }]}
                >
                  <DatePicker.RangePicker
                    style={{ width: '100%' }}
                    disabledDate={(current) => current && current.valueOf() < Date.now() - 86400000}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="approverName"
                label="Approving Authority Name"
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
            <Col xs={24} sm={12}>
              <Form.Item name="referenceNumber" label="Request Reference Number">
                <Input placeholder="e.g. DAR-2026-10-0042" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <div style={{ marginTop: 28, display: 'flex', gap: 8 }}>
                <Button
                  icon={<FileWordOutlined />}
                  loading={downloadingTemplate}
                  onClick={handleDownloadDocx}
                >
                  Template (.docx)
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  loading={downloadingTemplate}
                  onClick={handlePrintHtml}
                >
                  Print HTML
                </Button>
              </div>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="Business Justification & Clearance Reason"
            rules={[
              { required: true, message: 'Reason is required' },
              { max: 500, message: 'Max 500 characters' },
            ]}
          >
            <Input.TextArea
              rows={2}
              placeholder="e.g. Server maintenance team regular operational clearance"
            />
          </Form.Item>

          <Form.Item name="notes" label="Administrative Notes">
            <Input.TextArea rows={1} placeholder="Optional notes or supplementary instructions" />
          </Form.Item>

          <Divider titlePlacement="start" style={{ margin: '12px 0' }}>
            <Space>
              <FilePdfOutlined style={{ color: '#ff4d4f' }} />
              <Text strong>Mandatory Signed Scan Document Attachment</Text>
            </Space>
          </Divider>

          <div style={{ marginBottom: 16 }}>
            <Upload.Dragger
              name="scanFile"
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
                <InboxOutlined style={{ fontSize: 36, color: '#1677ff' }} />
              </p>
              <p className="ant-upload-text">
                Click or drag signed approval document scan here (PDF, PNG, JPG up to 10MB)
              </p>
              <p className="ant-upload-hint">
                <Text type="danger" strong>
                  * Mandatory Requirement:
                </Text>{' '}
                Physical door access cannot be authorized without a verifiable approval scan file.
              </p>
            </Upload.Dragger>
          </div>
        </Form>
      )}
    </Modal>
  );
};
