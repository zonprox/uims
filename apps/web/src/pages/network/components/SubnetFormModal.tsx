import { Col, Form, type FormInstance, Input, Modal, Row } from 'antd';
import React from 'react';

export interface SubnetFormModalProps {
  open: boolean;
  form: FormInstance;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const SubnetFormModal: React.FC<SubnetFormModalProps> = React.memo(
  ({ open, form, submitting, onSave, onCancel }) => (
    <Modal
      title="Provision Subnet CIDR Block"
      open={open}
      onOk={onSave}
      onCancel={onCancel}
      confirmLoading={submitting}
      width={560}
      okText="Provision Subnet"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
        <Row gutter={14}>
          <Col span={12}>
            <Form.Item label="CIDR Notation" name="cidr" rules={[{ required: true }]}>
              <Input placeholder="e.g. 10.100.0.0/24" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Subnet Friendly Name" name="name" rules={[{ required: true }]}>
              <Input placeholder="e.g. QA Kubernetes Cluster" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={14}>
          <Col span={12}>
            <Form.Item label="VLAN Name" name="vlan" rules={[{ required: true }]}>
              <Input placeholder="e.g. VLAN 40 (QA)" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Default Gateway IP" name="gateway" rules={[{ required: true }]}>
              <Input placeholder="e.g. 10.100.0.1" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  ),
);

SubnetFormModal.displayName = 'SubnetFormModal';
