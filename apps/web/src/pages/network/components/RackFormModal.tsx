import { ApartmentOutlined } from '@ant-design/icons';
import { Col, Form, type FormInstance, Input, Modal, Row, Select, theme } from 'antd';
import React from 'react';
import type { NetworkRack, RackStatus } from '../../../services/network.service';
import { formRules } from '../../../utils/formValidators';

const { TextArea } = Input;

export interface RackFormModalProps {
  open: boolean;
  editingRack?: NetworkRack | null;
  form: FormInstance;
  submitting?: boolean;
  locations?: unknown[];
  onSave: () => void;
  onCancel: () => void;
}

export const RackFormModal: React.FC<RackFormModalProps> = React.memo(
  ({ open, editingRack, form, submitting = false, onSave, onCancel }) => {
    const { token } = theme.useToken();

    return (
      <Modal
        title={editingRack ? 'Edit Equipment Rack' : 'Create Equipment Rack'}
        open={open}
        onOk={onSave}
        onCancel={onCancel}
        confirmLoading={submitting}
        destroyOnHidden
        width={580}
        okText={editingRack ? 'Save Changes' : 'Create Rack'}
        cancelText="Cancel"
        styles={{ body: { padding: '16px 0' } }}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          validateTrigger={['onChange', 'onBlur']}
          scrollToFirstError={true}
        >
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label="Rack Name"
                rules={[
                  formRules.required('Rack name'),
                  formRules.stringRange('Rack name', 2, 100),
                ]}
              >
                <Input
                  prefix={<ApartmentOutlined style={{ color: token.colorTextQuaternary }} />}
                  placeholder="e.g. DC1 Server Cabinet 01"
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="code"
                label="Rack Code / Identifier"
                rules={[
                  formRules.required('Please enter rack code'),
                  { pattern: /^[A-Z0-9_-]+$/i, message: 'Alphanumeric, dash, or underscore only' },
                ]}
              >
                <Input
                  placeholder="e.g. RCK-DC1-01"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="status" label="Operational Status" initialValue="ACTIVE">
                <Select<RackStatus>
                  options={[
                    { label: 'Active', value: 'ACTIVE' },
                    { label: 'Planned', value: 'PLANNED' },
                    { label: 'Maintenance', value: 'MAINTENANCE' },
                    { label: 'Retired', value: 'RETIRED' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="Notes & Documentation"
            rules={[{ max: 1000, message: 'Notes must not exceed 1000 characters' }]}
          >
            <TextArea rows={3} placeholder="e.g. Row 2, Cold aisle contained. Dual PDU feeds." />
          </Form.Item>
        </Form>
      </Modal>
    );
  },
);

RackFormModal.displayName = 'RackFormModal';
