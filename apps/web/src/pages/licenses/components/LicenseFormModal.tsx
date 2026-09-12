import {
  Col,
  DatePicker,
  Form,
  type FormInstance,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Switch,
} from 'antd';
import React from 'react';
import type { License } from '../../../services/licenses.service';

export interface LicenseFormModalProps {
  open: boolean;
  editingLicense: License | null;
  form: FormInstance;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const LICENSE_TYPE_OPTIONS = [
  { label: 'Subscription', value: 'Subscription' },
  { label: 'Perpetual', value: 'Perpetual' },
  { label: 'Volume License', value: 'Volume' },
  { label: 'OEM', value: 'OEM' },
];

const LICENSE_STATUS_OPTIONS = [
  { label: 'Active', value: 'Active' },
  { label: 'Expiring Soon', value: 'Expiring' },
  { label: 'Expired', value: 'Expired' },
];

export const LicenseFormModal: React.FC<LicenseFormModalProps> = React.memo(
  ({ open, editingLicense, form, submitting, onSave, onCancel }) => (
    <Modal
      title={editingLicense ? `Edit License: ${editingLicense.name}` : 'Create License'}
      open={open}
      onOk={onSave}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnHidden={true}
      width={640}
      okText={editingLicense ? 'Save Changes' : 'Create License'}
      styles={{ body: { paddingTop: 16 } }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={14}>
          <Col span={14}>
            <Form.Item
              label="Software Name"
              name="name"
              rules={[{ required: true, message: 'Software name is required' }]}
            >
              <Input placeholder="e.g. Adobe Creative Cloud Enterprise" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              label="Vendor"
              name="vendor"
              rules={[{ required: true, message: 'Vendor is required' }]}
            >
              <Input placeholder="e.g. Adobe / Microsoft" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={8}>
            <Form.Item label="License Type" name="type" rules={[{ required: true }]}>
              <Select options={LICENSE_TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Total Seats" name="totalSeats" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Cost per Seat ($)" name="costPerSeat">
              <InputNumber prefix="$" min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={12}>
            <Form.Item label="License Key" name="licenseKey">
              <Input.Password placeholder="e.g. MS-E5-9921-8834-KKL9" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Expiration Date" name="expiryDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={14}>
          <Col span={12}>
            <Form.Item label="Status" name="status">
              <Select options={LICENSE_STATUS_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Auto-Renewal" name="autoRenew" valuePropName="checked">
              <Switch defaultChecked />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Notes" name="notes">
          <Input.TextArea
            rows={2}
            placeholder="Add contract details, reseller agreement notes..."
          />
        </Form.Item>
      </Form>
    </Modal>
  ),
);

LicenseFormModal.displayName = 'LicenseFormModal';
