import { DoorSecurityLevel, DoorStatus } from '@uims/shared-types';
import { App, Col, Form, Input, Modal, Row, Select } from 'antd';
import React, { useEffect, useState } from 'react';
import { accessControlService } from '../../../services/access-control.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { DoorModalState } from '../types/access-control.types';

interface DoorModalProps {
  state: DoorModalState;
  onClose: () => void;
  onSuccess: () => void;
}

interface DoorFormValues {
  doorCode: string;
  name: string;
  building: string;
  floor: string;
  zone?: string;
  location?: string;
  securityLevel: DoorSecurityLevel;
  status: DoorStatus;
  controllerModel?: string;
  controllerIp?: string;
  readerType?: string;
  readerId?: string;
  notes?: string;
}

export const DoorModal: React.FC<DoorModalProps> = ({ state, onClose, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<DoorFormValues>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.open) {
      if (state.mode === 'edit' && state.door) {
        form.setFieldsValue({
          doorCode: state.door.doorCode,
          name: state.door.name,
          building: state.door.building,
          floor: state.door.floor,
          zone: state.door.zone ?? undefined,
          location: state.door.location ?? undefined,
          securityLevel: state.door.securityLevel,
          status: state.door.status,
          controllerModel: state.door.controllerModel ?? undefined,
          controllerIp: state.door.controllerIp ?? undefined,
          readerType: state.door.readerType ?? undefined,
          readerId: state.door.readerId ?? undefined,
          notes: state.door.notes ?? undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          securityLevel: DoorSecurityLevel.STANDARD,
          status: DoorStatus.ACTIVE,
        });
      }
    }
  }, [state.open, state.mode, state.door, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (state.mode === 'edit' && state.door) {
        await accessControlService.updateDoor(state.door.id, values);
        message.success(`Door '${values.doorCode}' updated successfully.`);
      } else {
        await accessControlService.createDoor(values);
        message.success(`Door '${values.doorCode}' created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) {
        // Form validation error
        return;
      }
      message.error(formatErrorMessage(err, state.mode === 'edit' ? 'update door' : 'create door'));
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
      title={state.mode === 'edit' ? 'Edit Physical Door' : 'Add Physical Door'}
      width={680}
      okText={state.mode === 'edit' ? 'Save Changes' : 'Create Door'}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 8 },
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="doorCode"
              label="Door Code"
              rules={[
                { required: true, message: 'Door code is required' },
                { max: 50, message: 'Max 50 characters' },
              ]}
            >
              <Input
                placeholder="e.g. DR-HQ-01"
                onChange={(e) => {
                  form.setFieldValue('doorCode', e.target.value.toUpperCase());
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="name"
              label="Door Name"
              rules={[
                { required: true, message: 'Door name is required' },
                { max: 150, message: 'Max 150 characters' },
              ]}
            >
              <Input placeholder="e.g. Main Server Room Door" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="building"
              label="Building / Facility"
              rules={[{ required: true, message: 'Building is required' }]}
            >
              <Input placeholder="e.g. Headquarters" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="floor"
              label="Floor"
              rules={[{ required: true, message: 'Floor is required' }]}
            >
              <Input placeholder="e.g. 3rd Floor" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="zone" label="Zone / Sector">
              <Input placeholder="e.g. Data Center Sector A" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="location" label="Room / Specific Location">
              <Input placeholder="e.g. Room 304 - Primary Racks" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="securityLevel"
              label="Security Clearance Level"
              rules={[{ required: true, message: 'Security level is required' }]}
            >
              <Select
                options={[
                  { value: DoorSecurityLevel.STANDARD, label: 'STANDARD (Level 1)' },
                  { value: DoorSecurityLevel.RESTRICTED, label: 'RESTRICTED (Level 2)' },
                  { value: DoorSecurityLevel.HIGH, label: 'HIGH SECURITY (Level 3)' },
                  { value: DoorSecurityLevel.CRITICAL, label: 'CRITICAL (Level 4)' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="Operational Status"
              rules={[{ required: true, message: 'Status is required' }]}
            >
              <Select
                options={[
                  { value: DoorStatus.ACTIVE, label: 'ACTIVE' },
                  { value: DoorStatus.MAINTENANCE, label: 'MAINTENANCE' },
                  { value: DoorStatus.INACTIVE, label: 'INACTIVE' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="controllerModel" label="Controller Model">
              <Input placeholder="e.g. ZKTeco InBio460 Pro" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="controllerIp" label="Controller IP Address">
              <Input placeholder="e.g. 192.168.10.45" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="readerType" label="Reader Hardware Type">
              <Input placeholder="e.g. RFID / Biometric Reader" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="readerId" label="Card Reader ID">
              <Input placeholder="e.g. RDR-HQ-01A" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="Administrative Notes">
          <Input.TextArea rows={2} placeholder="Optional operational or maintenance instructions" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
