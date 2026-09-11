import { Col, Form, type FormInstance, Input, InputNumber, Modal, Row, Select } from 'antd';
import React from 'react';
import type { LocationBranch } from '../../../services/organization.service';
import type { VLAN } from '../../../services/network.service';

const { TextArea } = Input;

export interface VlanFormModalProps {
  open: boolean;
  editingVlan: VLAN | null;
  form: FormInstance;
  submitting: boolean;
  locations: LocationBranch[];
  onSave: () => void;
  onCancel: () => void;
}

export const VlanFormModal: React.FC<VlanFormModalProps> = React.memo(
  ({ open, editingVlan, form, submitting, locations, onSave, onCancel }) => (
    <Modal
      title={
        editingVlan
          ? `Edit VLAN: VLAN ${editingVlan.vlanNumber} (${editingVlan.name})`
          : 'Create VLAN'
      }
      open={open}
      onOk={onSave}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnHidden={true}
      width={580}
      okText={editingVlan ? 'Save Changes' : 'Create VLAN'}
      styles={{ body: { paddingTop: 16 } }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item
              label="VLAN Number (ID)"
              name="vlanNumber"
              rules={[
                { required: true, message: 'VLAN number is required' },
                {
                  type: 'number',
                  min: 1,
                  max: 4094,
                  message: 'Must be between 1 and 4094',
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="e.g. 100"
                min={1}
                max={4094}
                precision={0}
              />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item
              label="VLAN Name"
              name="name"
              rules={[{ required: true, message: 'VLAN name is required' }]}
            >
              <Input placeholder="e.g. Core Network / CCTV Security" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Location / Site" name="locationId">
              <Select
                placeholder="Select location"
                allowClear
                showSearch
                options={locations.map((loc) => ({
                  label: `${loc.name} ${loc.building ? `(${loc.building})` : ''}`,
                  value: loc.id,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Status is required' }]}
              initialValue="ACTIVE"
            >
              <Select
                options={[
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Reserved', value: 'RESERVED' },
                  { label: 'Deprecated', value: 'DEPRECATED' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Description & Operational Purpose" name="description">
          <TextArea
            rows={3}
            placeholder="e.g. Primary production floor VLAN for automated sewing machinery and IoT gateways."
          />
        </Form.Item>
      </Form>
    </Modal>
  ),
);

VlanFormModal.displayName = 'VlanFormModal';
