import { NonADUserStatus } from '@uims/shared-types';
import { App, Col, DatePicker, Form, Input, Modal, Row, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useEffect, useState } from 'react';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { NonAdUserModalState } from '../types/access-control.types';

interface NonAdUserModalProps {
  state: NonAdUserModalState;
  onClose: () => void;
  onSuccess: () => void;
}

interface NonAdUserFormValues {
  fullName: string;
  badgeNumber: string;
  identityNumber: string;
  company: string;
  phone?: string;
  email?: string;
  userType?: string;
  status: NonADUserStatus;
  validityRange?: [Dayjs, Dayjs];
  notes?: string;
}

export const NonAdUserModal: React.FC<NonAdUserModalProps> = ({ state, onClose, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<NonAdUserFormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.open) {
      if (state.mode === 'edit' && state.user) {
        form.setFieldsValue({
          fullName: state.user.fullName,
          badgeNumber: state.user.badgeNumber,
          identityNumber: state.user.identityNumber,
          company: state.user.company,
          phone: state.user.phone ?? undefined,
          email: state.user.email ?? undefined,
          userType: state.user.userType ?? undefined,
          status: state.user.status,
          validityRange:
            state.user.validFrom && state.user.validTo
              ? [dayjs(state.user.validFrom), dayjs(state.user.validTo)]
              : undefined,
          notes: state.user.notes ?? undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: NonADUserStatus.ACTIVE,
          userType: 'Contractor',
        });
      }
    }
  }, [state.open, state.mode, state.user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const validFrom = values.validityRange ? values.validityRange[0].toISOString() : undefined;
      const validTo = values.validityRange ? values.validityRange[1].toISOString() : undefined;

      const payload = {
        fullName: values.fullName.trim(),
        badgeNumber: values.badgeNumber.trim().toUpperCase(),
        identityNumber: values.identityNumber.trim(),
        company: values.company.trim(),
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        userType: values.userType?.trim() || undefined,
        status: values.status,
        validFrom,
        validTo,
        notes: values.notes?.trim() || undefined,
      };

      if (state.mode === 'edit' && state.user) {
        await accessControlService.updateNonADUser(state.user.id, payload);
        message.success(`External user '${values.fullName}' updated successfully.`);
      } else {
        await accessControlService.createNonADUser(payload);
        message.success(`External user '${values.fullName}' registered successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        return;
      }
      message.error(
        formatErrorMessage(
          err,
          state.mode === 'edit' ? 'update external user' : 'register external user',
        ),
      );
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
      title={state.mode === 'edit' ? 'Edit External User' : 'Register External User'}
      width={680}
      okText={state.mode === 'edit' ? 'Save Changes' : 'Register User'}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 8 },
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[
                { required: true, message: 'Full name is required' },
                { max: 150, message: 'Max 150 characters' },
              ]}
            >
              <Input placeholder="e.g. John Doe" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="company"
              label="Company / Vendor"
              rules={[
                { required: true, message: 'Company is required' },
                { max: 150, message: 'Max 150 characters' },
              ]}
            >
              <Input placeholder="e.g. Acme Contracting Services" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="badgeNumber"
              label="Badge / Card #"
              rules={[
                { required: true, message: 'Badge number is required' },
                { max: 50, message: 'Max 50 characters' },
              ]}
            >
              <Input
                placeholder="e.g. EXT-2026-001"
                onChange={(e) => {
                  form.setFieldValue('badgeNumber', e.target.value.toUpperCase());
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="identityNumber"
              label="National ID / Passport #"
              rules={[
                { required: true, message: 'Identity number is required' },
                { max: 100, message: 'Max 100 characters' },
              ]}
            >
              <Input placeholder="e.g. ID0987654321" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="email"
              label="Email Address"
              rules={[{ type: 'email', message: 'Enter a valid email' }]}
            >
              <Input placeholder="e.g. john.doe@contractor.com" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="phone" label="Phone Number">
              <Input placeholder="e.g. +1 555-0199" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="userType" label="Personnel Category">
              <Select
                options={[
                  { value: 'Contractor', label: 'Contractor' },
                  { value: 'Vendor', label: 'Vendor' },
                  { value: 'Consultant', label: 'Consultant' },
                  { value: 'Visitor', label: 'Visitor' },
                  { value: 'Temporary Staff', label: 'Temporary Staff' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="Access Status"
              rules={[{ required: true, message: 'Status is required' }]}
            >
              <Select
                options={[
                  { value: NonADUserStatus.ACTIVE, label: 'ACTIVE' },
                  { value: NonADUserStatus.INACTIVE, label: 'INACTIVE' },
                  { value: NonADUserStatus.BLACKLISTED, label: 'BLACKLISTED' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="validityRange"
          label="Badge Validity Window"
          tooltip="Authorized validity period for site access"
        >
          <DatePicker.RangePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="notes" label="Administrative Notes">
          <Input.TextArea rows={2} placeholder="Project assignment, escort requirements, etc." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
