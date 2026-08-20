import {
  Col,
  DatePicker,
  Divider,
  Form,
  type FormInstance,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
} from 'antd';
import React from 'react';
import type { Asset } from '../../../services/assets.service';

const { Option } = Select;

export interface AssetFormModalProps {
  open: boolean;
  editingAsset: Asset | null;
  form: FormInstance;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = React.memo(
  ({ open, editingAsset, form, submitting, onSave, onCancel }) => (
    <Modal
      title={editingAsset ? `Edit Asset: ${editingAsset.tag}` : 'Create Asset'}
      open={open}
      onOk={onSave}
      onCancel={onCancel}
      confirmLoading={submitting}
      width={680}
      okText={editingAsset ? 'Save Changes' : 'Create Asset'}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 14 }}>
        <Row gutter={14}>
          <Col span={12}>
            <Form.Item
              label="Asset Tag"
              name="tag"
              rules={[{ required: true, message: 'Asset tag is required' }]}
            >
              <Input placeholder="e.g. AST-1042" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Serial Number"
              name="serialNumber"
              rules={[{ required: true, message: 'Serial number is required' }]}
            >
              <Input placeholder="e.g. C02G8392MD6R" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={12}>
            <Form.Item
              label="Device Name"
              name="name"
              rules={[{ required: true, message: 'Device name is required' }]}
            >
              <Input placeholder="e.g. MacBook Pro 16 M3 Max" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Manufacturer"
              name="manufacturer"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="e.g. Apple / Dell" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Model" name="model">
              <Input placeholder="e.g. A2991" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={8}>
            <Form.Item label="Category" name="category" rules={[{ required: true }]}>
              <Select>
                <Option value="Laptop">Laptop</Option>
                <Option value="Desktop">Desktop</Option>
                <Option value="Server">Server</Option>
                <Option value="Monitor">Monitor</Option>
                <Option value="Networking">Networking</Option>
                <Option value="Mobile">Mobile Device</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Status" name="status" rules={[{ required: true }]}>
              <Select>
                <Option value="Active">Active</Option>
                <Option value="In Repair">In Repair</Option>
                <Option value="In Storage">In Storage</Option>
                <Option value="Retired">Retired</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Purchase Price ($)" name="purchasePrice">
              <InputNumber style={{ width: '100%' }} prefix="$" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={12}>
            <Form.Item label="Assigned User" name="assignedTo">
              <Input placeholder="e.g. Marcus Vance or Unassigned" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Location" name="location">
              <Input placeholder="e.g. NY Office - Floor 4" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={12}>
            <Form.Item label="Purchase Date" name="purchaseDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Warranty Expiration Date" name="warrantyExpiry">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: '8px 0 14px 0' }}>Technical Specifications</Divider>

        <Row gutter={14}>
          <Col span={6}>
            <Form.Item label="Processor (CPU)" name="cpu">
              <Input placeholder="e.g. M3 Max 16-Core" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Memory (RAM)" name="ram">
              <Input placeholder="e.g. 64 GB" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Storage (SSD)" name="storage">
              <Input placeholder="e.g. 1 TB NVMe" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Operating System" name="os">
              <Input placeholder="e.g. macOS Sonoma" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Notes" name="notes">
          <Input.TextArea rows={2} placeholder="Add deployment details or dock serial number..." />
        </Form.Item>
      </Form>
    </Modal>
  ),
);

AssetFormModal.displayName = 'AssetFormModal';
