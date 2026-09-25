import { ApartmentOutlined, EnvironmentOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Flex,
  Form,
  type FormInstance,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  theme,
  Typography,
} from 'antd';
import React, { useMemo } from 'react';
import type { NetworkRack, RackStatus } from '../../../services/network.service';
import type { LocationBranch } from '../../../services/organization.service';

const { TextArea } = Input;
const { Text } = Typography;

export interface RackFormModalProps {
  open: boolean;
  editingRack?: NetworkRack | null;
  form: FormInstance;
  submitting?: boolean;
  locations?: Array<LocationBranch>;
  onSave: () => void;
  onCancel: () => void;
}

export const RackFormModal: React.FC<RackFormModalProps> = React.memo(
  ({ open, editingRack, form, submitting = false, locations = [], onSave, onCancel }) => {
    const { token } = theme.useToken();

    // Determine the highest occupied unit to prevent shrinking below mounted devices
    const highestOccupiedUnit = useMemo(() => {
      if (!editingRack?.switches || editingRack.switches.length === 0) return 0;
      return editingRack.switches.reduce((max, sw) => {
        if (sw.rackPosition === null || sw.rackPosition === undefined) return max;
        const end = sw.rackPosition + Math.max(1, sw.rackHeight || 1) - 1;
        return Math.max(max, end);
      }, 0);
    }, [editingRack]);

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
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label="Rack Name"
                rules={[
                  { required: true, message: 'Please enter rack name' },
                  { min: 2, message: 'Must be at least 2 characters' },
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
                  { required: true, message: 'Please enter rack code' },
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
            <Col span={14}>
              <Form.Item name="locationId" label="Physical Location / Datacenter">
                <Select
                  placeholder="Select datacenter or room location"
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
            <Col span={10}>
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

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="totalHeight"
                label="Total Height (RU)"
                rules={[
                  { required: true, message: 'Please enter rack height' },
                  { type: 'number', min: 1, message: 'Must be at least 1U' },
                  { type: 'number', max: 100, message: 'Must not exceed 100 RU' },
                  {
                    validator: async (_, value) => {
                      if (
                        value !== undefined &&
                        value !== null &&
                        highestOccupiedUnit > 0 &&
                        value < highestOccupiedUnit
                      ) {
                        return Promise.reject(
                          new Error(
                            `Cannot decrease rack height below U${highestOccupiedUnit} (highest mounted device).`,
                          ),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                initialValue={42}
                extra={
                  highestOccupiedUnit > 0
                    ? `Highest mounted device reaches U${highestOccupiedUnit}. Minimum capacity is ${highestOccupiedUnit}U.`
                    : 'Standard enterprise cabinet heights range from 12U to 48U+.'
                }
              >
                <Flex align="center" gap={12} wrap>
                  <InputNumber
                    min={Math.max(1, highestOccupiedUnit)}
                    max={100}
                    step={1}
                    precision={0}
                    formatter={(val) => (val !== undefined && val !== null ? `${val} RU` : '')}
                    parser={(val) => Number(val?.replace(/[^0-9]/g, ''))}
                    style={{ width: 130 }}
                    data-testid="rack-total-height-input"
                  />
                  <Flex align="center" gap={6} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Presets:
                    </Text>
                    {[12, 24, 42, 48].map((preset) => {
                      const disabled = highestOccupiedUnit > 0 && preset < highestOccupiedUnit;
                      return (
                        <Button
                          key={preset}
                          size="small"
                          disabled={disabled}
                          onClick={() => {
                            form.setFieldValue('totalHeight', preset);
                            form.validateFields(['totalHeight']);
                          }}
                        >
                          {preset}U
                        </Button>
                      );
                    })}
                  </Flex>
                </Flex>
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
