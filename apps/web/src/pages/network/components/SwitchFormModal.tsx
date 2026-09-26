import { ApartmentOutlined, CloudServerOutlined, EnvironmentOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Col,
  Form,
  type FormInstance,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  theme,
} from 'antd';
import React from 'react';
import type { Asset } from '../../../services/assets.service';
import type { LocationBranch } from '../../../services/organization.service';
import type { NetworkRack, NetworkSwitch } from '../../../services/network.service';

const { TextArea } = Input;

export interface SwitchFormModalProps {
  open: boolean;
  editingSwitch?: NetworkSwitch | null;
  form: FormInstance;
  submitting?: boolean;
  locations?: Array<LocationBranch>;
  racks?: Array<NetworkRack>;
  assets?: Array<Asset>;
  onSave: () => void;
  onCancel: () => void;
}

export const SwitchFormModal: React.FC<SwitchFormModalProps> = React.memo(
  ({
    open,
    editingSwitch,
    form,
    submitting = false,
    locations = [],
    racks = [],
    assets = [],
    onSave,
    onCancel,
  }) => {
    const { token } = theme.useToken();
    const selectedRackId = Form.useWatch('rackId', form);
    const selectedRack = React.useMemo(
      () => racks.find((r) => r.id === selectedRackId),
      [racks, selectedRackId],
    );
    const maxSlot = selectedRack?.totalHeight ?? 100;

    return (
      <Modal
        title={editingSwitch ? 'Edit Network Switch' : 'Create Network Switch'}
        open={open}
        onOk={onSave}
        onCancel={onCancel}
        confirmLoading={submitting}
        destroyOnHidden
        width={680}
        okText={editingSwitch ? 'Save Changes' : 'Create Switch'}
        cancelText="Cancel"
        styles={{ body: { padding: '16px 0' } }}
      >
        <Form form={form} layout="vertical" preserve={false}>
          {/* Row 1: Name and Vendor */}
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label="Switch Name"
                rules={[
                  { required: true, message: 'Please enter switch name' },
                  { min: 2, message: 'Must be at least 2 characters' },
                ]}
              >
                <Input
                  prefix={<CloudServerOutlined style={{ color: token.colorTextQuaternary }} />}
                  placeholder="e.g. BSL-CORE-SW01"
                />
              </Form.Item>
            </Col>

            <Col span={10}>
              <Form.Item
                name="vendor"
                label="Vendor / Make"
                rules={[{ required: true, message: 'Please select vendor' }]}
              >
                <Select
                  placeholder="Select vendor"
                  options={[
                    { label: 'Cisco Systems', value: 'Cisco Systems' },
                    { label: 'Alcatel-Lucent Enterprise', value: 'Alcatel-Lucent' },
                    { label: 'Juniper Networks', value: 'Juniper Networks' },
                    { label: 'Aruba Networks', value: 'Aruba Networks' },
                    { label: 'Mikrotik', value: 'Mikrotik' },
                    { label: 'Dell Technologies', value: 'Dell' },
                    { label: 'Generic / Other', value: 'Other' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 2: Model, Role, and Status */}
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="model"
                label="Hardware Model"
                rules={[{ required: true, message: 'Please enter hardware model' }]}
              >
                <Input placeholder="e.g. Catalyst 9300-48P-A" />
              </Form.Item>
            </Col>

            <Col span={7}>
              <Form.Item
                name="role"
                label="Switch Role"
                rules={[{ required: true, message: 'Please select role' }]}
                initialValue="ACCESS"
              >
                <Select
                  options={[
                    { label: 'Core Switch', value: 'CORE' },
                    { label: 'Distribution', value: 'DISTRIBUTION' },
                    { label: 'Access Switch', value: 'ACCESS' },
                    { label: 'Top of Rack (ToR)', value: 'TOR' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={7}>
              <Form.Item
                name="status"
                label="Operating Status"
                rules={[{ required: true, message: 'Please select status' }]}
                initialValue="ONLINE"
              >
                <Select
                  options={[
                    { label: 'Online (Operational)', value: 'ONLINE' },
                    { label: 'Offline', value: 'OFFLINE' },
                    { label: 'Maintenance Mode', value: 'MAINTENANCE' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 3: Access Ports & Quick Presets */}
          <Row gutter={16} align="bottom">
            <Col span={10}>
              <Form.Item
                name="totalPorts"
                label="Access Ports (RJ45)"
                extra="Even number from 2 to 48"
                rules={[
                  { required: true, message: 'Please enter total access ports' },
                  { type: 'number', min: 2, message: 'Total ports must be between 2 and 48' },
                  { type: 'number', max: 48, message: 'Total ports must be between 2 and 48' },
                  {
                    validator(_, value) {
                      if (value !== undefined && value !== null && value !== '') {
                        const num = Number(value);
                        if (!Number.isInteger(num)) {
                          return Promise.reject(new Error('Total ports must be an integer'));
                        }
                        if (num < 2 || num > 48) {
                          return Promise.reject(new Error('Total ports must be between 2 and 48'));
                        }
                        if (num % 2 !== 0) {
                          return Promise.reject(new Error('Total ports must be an even number'));
                        }
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                initialValue={24}
              >
                <InputNumber
                  min={2}
                  max={48}
                  step={2}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="e.g. 24"
                  data-testid="input-total-ports"
                />
              </Form.Item>
            </Col>

            <Col span={14} style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 8, fontSize: 12, color: token.colorTextSecondary }}>
                Quick Presets
              </div>
              <Space wrap size={6}>
                {[8, 16, 24, 48].map((size) => (
                  <Button
                    key={size}
                    size="small"
                    data-testid={`preset-ports-${size}`}
                    onClick={() => {
                      form.setFieldsValue({
                        totalPorts: size,
                      });
                    }}
                  >
                    {size} Ports
                  </Button>
                ))}
              </Space>
            </Col>
          </Row>

          {/* Row 4: Dedicated RJ45 Uplinks and Optical Fiber SFP/SFP+ Ports */}
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="uplinkPorts"
                label="Uplink Ports (RJ45)"
                initialValue={2}
                rules={[
                  { type: 'number', min: 0, message: 'Must be between 0 and 8' },
                  { type: 'number', max: 8, message: 'Must not exceed 8' },
                ]}
              >
                <InputNumber
                  min={0}
                  max={8}
                  precision={0}
                  style={{ width: '100%' }}
                  data-testid="input-uplink-ports"
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="uplinkSpeed" label="Uplink Speed" initialValue="1 Gbps">
                <Select
                  data-testid="select-uplink-speed"
                  options={[
                    { label: '1 Gbps', value: '1 Gbps' },
                    { label: '2.5 Gbps', value: '2.5 Gbps' },
                    { label: '10 Gbps', value: '10 Gbps' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="fiberPorts"
                label="Fiber Ports (SFP/SFP+)"
                initialValue={2}
                rules={[
                  { type: 'number', min: 0, message: 'Must be between 0 and 8' },
                  { type: 'number', max: 8, message: 'Must not exceed 8' },
                ]}
              >
                <InputNumber
                  min={0}
                  max={8}
                  precision={0}
                  style={{ width: '100%' }}
                  data-testid="input-fiber-ports"
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="fiberSpeed" label="Fiber Speed" initialValue="10 Gbps">
                <Select
                  data-testid="select-fiber-speed"
                  options={[
                    { label: '1 Gbps SFP', value: '1 Gbps' },
                    { label: '10 Gbps SFP+', value: '10 Gbps' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 5: Serial Number & Base MAC Address */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="serialNumber" label="Serial Number">
                <Input placeholder="e.g. FOC2488102" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="macAddress"
                label="Base MAC Address"
                rules={[
                  {
                    pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
                    message: 'Invalid MAC address format (e.g. 70:69:79:2A:41:01)',
                  },
                ]}
              >
                <Input placeholder="e.g. 70:69:79:2A:41:01" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 4: Firmware & Linked Asset */}
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="firmwareVersion" label="Firmware Version / OS">
                <Input placeholder="e.g. Cisco IOS-XE 17.9.4a" />
              </Form.Item>
            </Col>

            <Col span={14}>
              <Form.Item
                name="assetId"
                label="Linked Hardware Asset Record"
                extra="Correlate with inventory asset tag"
              >
                <Select
                  placeholder="Select hardware asset..."
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={assets.map((ast) => ({
                    label: `${ast.name || ast.model} [${ast.tag}]`,
                    value: ast.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 5: Physical Mounting & Location */}
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="locationId" label="Physical Location">
                <Select
                  placeholder="Select datacenter or room"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<EnvironmentOutlined style={{ color: token.colorTextQuaternary }} />}
                  options={locations.map((loc) => ({
                    label: loc.name,
                    value: loc.id,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="rackId" label="Equipment Rack Enclosure">
                <Select
                  placeholder="Select rack cabinet"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<ApartmentOutlined style={{ color: token.colorTextQuaternary }} />}
                  options={racks.map((r) => ({
                    label: `${r.name} (${r.code})`,
                    value: r.id,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col span={3}>
              <Form.Item
                name="rackPosition"
                label="RU Slot"
                extra={selectedRack ? `1–${maxSlot} RU` : '1–100 RU'}
                dependencies={['rackHeight']}
                rules={[
                  { type: 'number', min: 1, message: 'Must be at least 1U' },
                  { type: 'number', max: maxSlot, message: `Must not exceed ${maxSlot}U` },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (value !== undefined && value !== null) {
                        const height = getFieldValue('rackHeight') || 1;
                        if (value + height - 1 > maxSlot) {
                          return Promise.reject(
                            new Error(
                              `Slot U${value} + ${height}U exceeds rack capacity (U${maxSlot})`,
                            ),
                          );
                        }
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={1} max={maxSlot} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col span={3}>
              <Form.Item
                name="rackHeight"
                label="Height"
                initialValue={1}
                dependencies={['rackPosition']}
                rules={[
                  { type: 'number', min: 1, message: 'Must be at least 1U' },
                  { type: 'number', max: 10, message: 'Must not exceed 10U' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const pos = getFieldValue('rackPosition');
                      if (pos !== undefined && pos !== null && value) {
                        if (pos + value - 1 > maxSlot) {
                          return Promise.reject(
                            new Error(
                              `Chassis span U${pos}–U${pos + value - 1} exceeds rack capacity (U${maxSlot})`,
                            ),
                          );
                        }
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={1} max={10} precision={0} suffix="U" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Creation-Only Feature: Auto Generate Ports */}
          {!editingSwitch && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="autoGeneratePorts" valuePropName="checked" initialValue={true}>
                  <Checkbox>
                    Auto-generate standard port matrix (Access RJ45 + Uplink RJ45 + SFP/SFP+ Fiber
                    cages)
                  </Checkbox>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Row 6: Notes */}
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="notes" label="Operational Notes & Cable Schedule">
                <TextArea rows={2} placeholder="Optional operational notes..." maxLength={500} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    );
  },
);

SwitchFormModal.displayName = 'SwitchFormModal';
