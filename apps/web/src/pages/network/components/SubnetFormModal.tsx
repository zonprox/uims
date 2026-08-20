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
      title="Create Subnet"
      open={open}
      onOk={onSave}
      onCancel={onCancel}
      confirmLoading={submitting}
      width={560}
      okText="Create Subnet"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
        <Row gutter={14}>
          <Col span={12}>
            <Form.Item
              label="CIDR Block"
              name="cidr"
              rules={[{ required: true, message: 'CIDR block is required' }]}
            >
              <Input placeholder="e.g. 10.100.0.0/24" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Subnet Name"
              name="name"
              rules={[{ required: true, message: 'Subnet name is required' }]}
            >
              <Input placeholder="e.g. QA Kubernetes Cluster" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={14}>
          <Col span={12}>
            <Form.Item
              label="VLAN"
              name="vlan"
              rules={[{ required: true, message: 'VLAN is required' }]}
            >
              <Input placeholder="e.g. VLAN 40 (QA)" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Default Gateway"
              name="gateway"
              rules={[{ required: true, message: 'Gateway is required' }]}
            >
              <Input placeholder="e.g. 10.100.0.1" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  ),
);

SubnetFormModal.displayName = 'SubnetFormModal';
