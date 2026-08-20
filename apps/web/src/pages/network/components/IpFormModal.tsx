import { Col, Form, type FormInstance, Input, Modal, Row, Select } from 'antd';
import React from 'react';
import type { IPAddress } from '../../../services/network.service';

const { Option } = Select;

export interface IpFormModalProps {
  open: boolean;
  editingIp: IPAddress | null;
  form: FormInstance;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const IpFormModal: React.FC<IpFormModalProps> = React.memo(
  ({ open, editingIp, form, submitting, onSave, onCancel }) => (
    <Modal
      title={editingIp ? `Edit IP Allocation: ${editingIp.ip}` : 'Allocate IP Address'}
      open={open}
      onOk={onSave}
      onCancel={onCancel}
      confirmLoading={submitting}
      width={620}
      okText={editingIp ? 'Save Changes' : 'Allocate IP'}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
        <Row gutter={14}>
          <Col span={12}>
            <Form.Item
              label="IP Address"
              name="ip"
              rules={[{ required: true, message: 'IP address is required' }]}
            >
              <Input placeholder="e.g. 192.168.1.120" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Hostname & FQDN"
              name="hostname"
              rules={[{ required: true, message: 'Hostname is required' }]}
            >
              <Input placeholder="e.g. srv-k8s-node01.uims.lan" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={12}>
            <Form.Item
              label="MAC Address"
              name="mac"
              rules={[{ required: true, message: 'MAC address is required' }]}
            >
              <Input placeholder="e.g. 00:1B:44:11:3A:B7" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Vendor"
              name="vendor"
              rules={[{ required: true, message: 'Vendor is required' }]}
            >
              <Input placeholder="e.g. Dell / Cisco" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={8}>
            <Form.Item label="Subnet" name="subnet" rules={[{ required: true }]}>
              <Select>
                <Option value="192.168.1.0/24">192.168.1.0/24 (Servers)</Option>
                <Option value="192.168.10.0/24">192.168.10.0/24 (Workstations)</Option>
                <Option value="10.200.0.0/22">10.200.0.0/22 (Wi-Fi)</Option>
                <Option value="10.50.0.0/24">10.50.0.0/24 (IoT)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="VLAN" name="vlan" rules={[{ required: true }]}>
              <Input placeholder="e.g. VLAN 10 (Servers)" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Device Type" name="deviceType" rules={[{ required: true }]}>
              <Select>
                <Option value="Server">Server</Option>
                <Option value="Workstation">Workstation</Option>
                <Option value="Switch">Switch / Router</Option>
                <Option value="Access Point">Access Point</Option>
                <Option value="Printer">Printer</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  ),
);

IpFormModal.displayName = 'IpFormModal';
