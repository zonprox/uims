import {
  ApartmentOutlined,
  CloudServerOutlined,
  DesktopOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  App,
  Col,
  Descriptions,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Tag,
  theme,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  CreateSwitchDto,
  NetworkRack,
  NetworkSwitch,
  UpdateSwitchDto,
} from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { formatErrorMessage } from '../../../utils/feedback';

export interface MountSwitchModalProps {
  open: boolean;
  rack: NetworkRack | null;
  targetUnit?: number | null;
  onCancel: () => void;
  onSuccess: (mountedSwitch: NetworkSwitch) => void;
}

export const MountSwitchModal: React.FC<MountSwitchModalProps> = React.memo(
  ({ open, rack, targetUnit = 1, onCancel, onSuccess }) => {
    const { message } = App.useApp();
    const { token } = theme.useToken();
    const [mode, setMode] = useState<'existing' | 'create'>('existing');
    const [form] = Form.useForm();

    const [switches, setSwitches] = useState<Array<NetworkSwitch>>([]);
    const [loadingSwitches, setLoadingSwitches] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const slot = targetUnit && targetUnit > 0 ? targetUnit : 1;

    // Load available switches when modal opens
    useEffect(() => {
      if (!open) {
        form.resetFields();
        setMode('existing');
        return;
      }

      form.setFieldsValue({
        rackPosition: slot,
        rackHeight: 1,
        vendor: 'Cisco Systems',
        role: 'ACCESS',
        status: 'ONLINE',
        totalPorts: 24,
      });

      let isMounted = true;
      const fetchSwitches = async () => {
        setLoadingSwitches(true);
        try {
          const list = await networkService.getSwitches();
          if (isMounted) {
            setSwitches(list || []);
          }
        } catch (err: unknown) {
          if (isMounted) {
            message.error(formatErrorMessage(err, 'load available network switches'));
          }
        } finally {
          if (isMounted) {
            setLoadingSwitches(false);
          }
        }
      };

      fetchSwitches();

      return () => {
        isMounted = false;
      };
    }, [open, slot, form, message]);

    // Separate unmounted vs already mounted switches
    const switchOptions = useMemo(() => {
      const unmounted = switches.filter(
        (s) => !s.rackPosition || s.rackPosition === null || !s.rackId,
      );
      const mounted = switches.filter((s) => s.rackPosition && s.rackPosition !== null && s.rackId);

      const items = [
        ...unmounted.map((s) => ({
          label: `${s.name} (${s.model || s.vendor}) — [Unmounted / Available]`,
          value: s.id,
          switchItem: s,
        })),
        ...mounted.map((s) => ({
          label: `${s.name} (${s.model || s.vendor}) — [Mounted at U${s.rackPosition}]`,
          value: s.id,
          switchItem: s,
        })),
      ];

      return items;
    }, [switches]);

    const handleFormSubmit = async () => {
      if (!rack?.id) return;
      try {
        const values = await form.validateFields();
        setSubmitting(true);

        if (mode === 'existing') {
          const payload: UpdateSwitchDto = {
            rackId: rack.id,
            rackPosition: values.rackPosition,
            rackHeight: values.rackHeight || 1,
          };

          const updated = await networkService.updateSwitch(values.switchId, payload);
          message.success(
            `Switch "${updated.name}" successfully mounted to slot U${String(values.rackPosition).padStart(2, '0')}`,
          );
          onSuccess(updated);
        } else {
          const payload: CreateSwitchDto = {
            name: values.name,
            model: values.model,
            vendor: values.vendor,
            role: values.role || 'ACCESS',
            status: values.status || 'ONLINE',
            totalPorts: values.totalPorts || 24,
            rackId: rack.id,
            rackPosition: values.rackPosition,
            rackHeight: values.rackHeight || 1,
            serialNumber: values.serialNumber || null,
            macAddress: values.macAddress || null,
            autoGeneratePorts: true,
          };

          const created = await networkService.createSwitch(payload);
          message.success(
            `Switch "${created.name}" created and mounted to slot U${String(values.rackPosition).padStart(2, '0')}`,
          );
          onSuccess(created);
        }
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'mount switch into rack'));
      } finally {
        setSubmitting(false);
      }
    };

    if (!rack) return null;

    return (
      <Modal
        title={
          <Flex align="center" gap={8}>
            <CloudServerOutlined style={{ color: token.colorPrimary }} />
            <span>Mount Equipment into Cabinet: {rack.name}</span>
          </Flex>
        }
        open={open}
        onCancel={onCancel}
        onOk={handleFormSubmit}
        confirmLoading={submitting}
        okText={mode === 'existing' ? 'Mount Switch' : 'Create & Mount Switch'}
        cancelText="Cancel"
        destroyOnHidden
        width={620}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Flex vertical gap={14}>
          {/* Target Rack & Slot Context Header */}
          <Descriptions
            size="small"
            bordered
            column={{ xs: 1, sm: 2 }}
            styles={{
              label: { width: 120, fontWeight: 500 },
              content: { fontWeight: 600 },
            }}
          >
            <Descriptions.Item label="Target Cabinet">
              <Flex align="center" gap={6}>
                <ApartmentOutlined style={{ color: token.colorPrimary }} />
                <span>{rack.name}</span>
                <Tag color="purple" style={{ fontFamily: 'monospace' }}>
                  {rack.code}
                </Tag>
              </Flex>
            </Descriptions.Item>
            <Descriptions.Item label="Target RU Slot">
              <Tag color="blue" style={{ fontSize: 13, fontWeight: 600, padding: '2px 8px' }}>
                Slot U{String(slot).padStart(2, '0')}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          {/* Mode Switcher */}
          <Segmented
            block
            value={mode}
            onChange={(val) => setMode(val as 'existing' | 'create')}
            options={[
              {
                label: 'Mount Existing Switch',
                value: 'existing',
                icon: <DesktopOutlined />,
              },
              {
                label: 'Create & Mount New Switch',
                value: 'create',
                icon: <PlusOutlined />,
              },
            ]}
          />

          <Form
            form={form}
            layout="vertical"
            validateTrigger={['onChange', 'onBlur']}
            scrollToFirstError={true}
          >
            {mode === 'existing' ? (
              <>
                <Form.Item
                  name="switchId"
                  label="Select Network Switch"
                  rules={[{ required: true, message: 'Please select a switch to mount' }]}
                  extra="Unmounted switches are recommended. Selecting an already mounted switch will re-locate it to this cabinet slot."
                >
                  <Select
                    data-testid="select-switch-to-mount"
                    showSearch
                    placeholder="Select or search switch by name / model"
                    loading={loadingSwitches}
                    options={switchOptions}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="rackPosition"
                      label="Rack Unit Position (RU)"
                      rules={[
                        { required: true, message: 'Please specify RU slot' },
                        { type: 'number', min: 1, max: 48, message: 'Must be between 1 and 48' },
                      ]}
                    >
                      <InputNumber min={1} max={48} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="rackHeight"
                      label="Equipment Height (RU)"
                      rules={[
                        { required: true, message: 'Please specify height' },
                        { type: 'number', min: 1, max: 8, message: 'Must be between 1 and 8' },
                      ]}
                    >
                      <InputNumber min={1} max={8} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ) : (
              <>
                <Row gutter={16}>
                  <Col span={14}>
                    <Form.Item
                      name="name"
                      label="Switch Name"
                      rules={[
                        { required: true, message: 'Switch name is required' },
                        { min: 2, message: 'Must be at least 2 characters' },
                      ]}
                    >
                      <Input placeholder="e.g. SW-ACC-01" />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item
                      name="vendor"
                      label="Vendor / Make"
                      rules={[{ required: true, message: 'Vendor is required' }]}
                    >
                      <Select
                        options={[
                          { label: 'Cisco Systems', value: 'Cisco Systems' },
                          { label: 'Alcatel-Lucent Enterprise', value: 'Alcatel-Lucent' },
                          { label: 'Juniper Networks', value: 'Juniper Networks' },
                          { label: 'Aruba Networks', value: 'Aruba Networks' },
                          { label: 'Mikrotik', value: 'Mikrotik' },
                          { label: 'Dell Technologies', value: 'Dell' },
                          { label: 'Other', value: 'Other' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={14}>
                    <Form.Item
                      name="model"
                      label="Hardware Model"
                      rules={[{ required: true, message: 'Model is required' }]}
                    >
                      <Input placeholder="e.g. Catalyst 9300-48P" />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item name="role" label="Switch Role">
                      <Select
                        options={[
                          { label: 'Access Switch', value: 'ACCESS' },
                          { label: 'Distribution Switch', value: 'DISTRIBUTION' },
                          { label: 'Core Switch', value: 'CORE' },
                          { label: 'Top of Rack (TOR)', value: 'TOR' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="totalPorts" label="Access Ports" initialValue={24}>
                      <InputNumber min={2} max={48} step={2} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="rackPosition"
                      label="RU Slot"
                      rules={[{ required: true, message: 'RU slot is required' }]}
                    >
                      <InputNumber min={1} max={48} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="rackHeight" label="Height (RU)" initialValue={1}>
                      <InputNumber min={1} max={8} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}
          </Form>
        </Flex>
      </Modal>
    );
  },
);

MountSwitchModal.displayName = 'MountSwitchModal';
