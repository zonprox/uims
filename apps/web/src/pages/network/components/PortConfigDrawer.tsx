import { ClearOutlined, SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Col,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { Asset } from '../../../services/assets.service';
import type {
  IPAddress,
  NetworkSwitch,
  PortAdminStatus,
  Subnet,
  SwitchPort,
  UpdateSwitchPortDto,
  VLAN,
} from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { getPortStatusInfo } from './SwitchPortFaceplate';

const { Text, Title } = Typography;
const { TextArea } = Input;

export interface PortConfigDrawerProps {
  open: boolean;
  port: SwitchPort | null;
  switchEntity?: NetworkSwitch | null;
  vlans?: Array<VLAN>;
  subnets?: Array<Subnet>;
  ips?: Array<IPAddress>;
  assets?: Array<Asset>;
  onClose: () => void;
  onPortUpdated?: (updatedPort: SwitchPort) => void;
}

export const PortConfigDrawer: React.FC<PortConfigDrawerProps> = React.memo(
  ({
    open,
    port,
    switchEntity,
    vlans = [],
    subnets: _subnets = [],
    ips = [],
    assets = [],
    onClose,
    onPortUpdated,
  }) => {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [portMode, setPortMode] = useState<string>('ACCESS');

    const statusInfo = useMemo(() => getPortStatusInfo(port), [port]);

    // Synchronize form when port changes
    useEffect(() => {
      if (port && open) {
        const mode = port.mode || 'ACCESS';
        setPortMode(mode);

        form.setFieldsValue({
          name: port.name,
          adminStatus:
            port.adminStatus === 'UP' || port.adminStatus === ('UP' as unknown as PortAdminStatus),
          operStatus: port.operStatus || 'DOWN',
          formFactor: port.formFactor || 'RJ45_1G',
          mode,
          vlanId: port.vlanId || undefined,
          taggedVlanIds: port.taggedVlanIds || [],
          speed: port.speed || '1 Gbps',
          duplex: port.duplex || 'Full',
          ipAddressId: port.ipAddressId || undefined,
          connectedAssetId: port.connectedAssetId || undefined,
          poeEnabled: Boolean(port.poeEnabled),
          description: port.description || '',
        });
      } else if (open) {
        form.resetFields();
      }
    }, [port, open, form]);

    const handleSave = async () => {
      if (!port) return;
      try {
        const values = await form.validateFields();
        setSubmitting(true);

        const payload: UpdateSwitchPortDto = {
          name: values.name,
          adminStatus: values.adminStatus ? 'UP' : 'DOWN',
          operStatus: values.operStatus,
          formFactor: values.formFactor,
          mode: values.mode,
          vlanId: values.vlanId || null,
          taggedVlanIds: values.mode === 'TRUNK' ? values.taggedVlanIds || [] : [],
          speed: values.speed || null,
          duplex: values.duplex || null,
          ipAddressId: values.ipAddressId || null,
          connectedAssetId: values.connectedAssetId || null,
          poeEnabled: Boolean(values.poeEnabled),
          description: values.description || null,
        };

        const updated = await networkService.updateSwitchPort(port.id, payload);
        message.success(`Port ${port.name} configuration updated successfully`);
        onPortUpdated?.(updated);
        onClose();
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, `update port ${port.name}`));
      } finally {
        setSubmitting(false);
      }
    };

    const handleClearPort = async () => {
      if (!port) return;
      try {
        setSubmitting(true);
        const payload: UpdateSwitchPortDto = {
          ipAddressId: null,
          connectedAssetId: null,
          operStatus: 'DOWN',
          description: null,
        };

        const updated = await networkService.updateSwitchPort(port.id, payload);
        message.success(`Cleared endpoint bindings for Port ${port.name}`);
        onPortUpdated?.(updated);
        onClose();
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, `clear port ${port.name}`));
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <Drawer
        title={
          <Flex align="center" justify="space-between" style={{ width: '100%', paddingRight: 24 }}>
            <Flex align="center" gap={8}>
              <Title level={5} style={{ margin: 0 }}>
                Configure Port: {port?.name || '—'}
              </Title>
              <Tag
                color={
                  statusInfo.status === 'ACTIVE'
                    ? 'success'
                    : statusInfo.status === 'CONNECTED_NO_SIGNAL'
                      ? 'warning'
                      : statusInfo.status === 'RESERVED'
                        ? 'blue'
                        : 'default'
                }
              >
                {statusInfo.label}
              </Tag>
            </Flex>
            {switchEntity && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {switchEntity.name} ({switchEntity.model})
              </Text>
            )}
          </Flex>
        }
        open={open}
        onClose={onClose}
        size={560}
        destroyOnHidden
        styles={{ body: { padding: '20px 24px' } }}
        extra={
          <Space>
            <Button onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={submitting}
              data-testid="save-port-config-button"
            >
              Save Configuration
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            adminStatus: true,
            operStatus: 'ACTIVE',
            mode: 'ACCESS',
            formFactor: 'RJ45_1G',
            speed: '1 Gbps',
            duplex: 'Full',
            poeEnabled: true,
          }}
        >
          {/* Administrative & Operational Status Section */}
          <Divider
            titlePlacement="start"
            style={{ margin: '0 0 16px 0', fontSize: 13, fontWeight: 600 }}
          >
            Administrative & Operational Link State
          </Divider>

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="adminStatus"
                label="Admin State"
                valuePropName="checked"
                extra="Administratively enable or disable this port"
              >
                <Switch
                  checkedChildren="UP (no shut)"
                  unCheckedChildren="DOWN (shutdown)"
                  data-testid="port-admin-status-switch"
                />
              </Form.Item>
            </Col>

            <Col span={14}>
              <Form.Item
                name="operStatus"
                label="Operational Link Status"
                rules={[{ required: true, message: 'Please select link status' }]}
              >
                <Select
                  data-testid="port-oper-status-select"
                  options={[
                    {
                      label: 'Active / Up (Link Established)',
                      value: 'ACTIVE',
                    },
                    {
                      label: 'Down / Disabled (No Link / Unplugged)',
                      value: 'DOWN',
                    },
                    {
                      label: 'Connected No Signal (Flapping / Negotiation)',
                      value: 'CONNECTED_NO_SIGNAL',
                    },
                    {
                      label: 'Reserved (Provisioned / Inactive)',
                      value: 'RESERVED',
                    },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="formFactor"
                label="Port Form Factor"
                rules={[{ required: true, message: 'Select form factor' }]}
              >
                <Select
                  options={[
                    { label: 'RJ45 1GbE (Standard Copper)', value: 'RJ45_1G' },
                    { label: 'SFP 1GbE (Optical / Transceiver)', value: 'SFP_1G' },
                    { label: 'SFP+ 10GbE (High-Speed Fiber)', value: 'SFP_PLUS_10G' },
                    { label: 'SFP28 25GbE (Core Interconnect)', value: 'SFP28_25G' },
                    { label: 'QSFP+ 40GbE (Spine Uplink)', value: 'QSFP_PLUS_40G' },
                    { label: 'QSFP28 100GbE (Backbone)', value: 'QSFP28_100G' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="speed" label="Link Speed">
                <Select
                  options={[
                    { label: 'Auto', value: 'Auto' },
                    { label: '100 Mbps', value: '100 Mbps' },
                    { label: '1 Gbps', value: '1 Gbps' },
                    { label: '10 Gbps', value: '10 Gbps' },
                    { label: '25 Gbps', value: '25 Gbps' },
                    { label: '40 Gbps', value: '40 Gbps' },
                    { label: '100 Gbps', value: '100 Gbps' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="duplex" label="Duplex Mode">
                <Select
                  options={[
                    { label: 'Full', value: 'Full' },
                    { label: 'Half', value: 'Half' },
                    { label: 'Auto', value: 'Auto' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Layer-2 VLAN Switching Section */}
          <Divider
            titlePlacement="start"
            style={{ margin: '8px 0 16px 0', fontSize: 13, fontWeight: 600 }}
          >
            Layer-2 Switching & VLAN Segmentation
          </Divider>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="mode"
                label="Switchport Mode"
                rules={[{ required: true, message: 'Please select port mode' }]}
              >
                <Radio.Group
                  buttonStyle="solid"
                  onChange={(e) => setPortMode(e.target.value)}
                  data-testid="port-mode-radio-group"
                >
                  <Radio.Button value="ACCESS">Access Mode (Single Untagged)</Radio.Button>
                  <Radio.Button value="TRUNK">802.1Q Trunk Mode (Multi-VLAN)</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={portMode === 'TRUNK' ? 12 : 24}>
              <Form.Item
                name="vlanId"
                label={portMode === 'TRUNK' ? 'Native VLAN (Untagged)' : 'Configured Access VLAN'}
              >
                <Select
                  placeholder="Select configured VLAN"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  data-testid="port-vlan-select"
                  options={vlans.map((v) => ({
                    label: `VLAN ${v.vlanNumber} — ${v.name} (${v.status})`,
                    value: v.id,
                  }))}
                />
              </Form.Item>
            </Col>

            {portMode === 'TRUNK' && (
              <Col span={12}>
                <Form.Item
                  name="taggedVlanIds"
                  label="Tagged VLANs (802.1Q Allowed)"
                  extra="Allowed trunk broadcast domains"
                >
                  <Select
                    mode="multiple"
                    placeholder="Select tagged VLANs"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    options={vlans.map((v) => ({
                      label: `VLAN ${v.vlanNumber} (${v.name})`,
                      value: v.vlanNumber,
                    }))}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {/* IPAM & Endpoint Connectivity Section */}
          <Divider
            titlePlacement="start"
            style={{ margin: '8px 0 16px 0', fontSize: 13, fontWeight: 600 }}
          >
            Connected Endpoint & IPAM Allocation
          </Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="connectedAssetId"
                label="Connected Hardware Asset"
                extra="Server, Workstation, AP, or Camera"
              >
                <Select
                  placeholder="Search assets..."
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  data-testid="port-connected-asset-select"
                  options={assets.map((ast) => ({
                    label: `${ast.name || ast.model} [${ast.tag}]`,
                    value: ast.id,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="ipAddressId"
                label="Assigned IP Address"
                extra="Terminate IP allocation into port"
              >
                <Select
                  placeholder="Select IP address..."
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  data-testid="port-ip-address-select"
                  options={ips.map((ip) => ({
                    label: `${ip.address} (${ip.status})`,
                    value: ip.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Power over Ethernet (PoE) Section */}
          <Divider
            titlePlacement="start"
            style={{ margin: '8px 0 16px 0', fontSize: 13, fontWeight: 600 }}
          >
            Power over Ethernet (PoE Delivery)
          </Divider>

          <Row gutter={16} align="middle">
            <Col span={24}>
              <Form.Item
                name="poeEnabled"
                label="PoE Power Delivery"
                valuePropName="checked"
                extra="Deliver 802.3af/at/bt power to endpoint"
              >
                <Switch
                  checkedChildren={<ThunderboltOutlined />}
                  unCheckedChildren="Off"
                  data-testid="port-poe-switch"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Operational Notes / Interface Description */}
          <Divider
            titlePlacement="start"
            style={{ margin: '8px 0 16px 0', fontSize: 13, fontWeight: 600 }}
          >
            Interface Description & Notes
          </Divider>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="description"
                label="Port Description"
                extra="e.g. Uplink to DC Distribution SW01, Patch Panel A-14, or AP-Floor2-01"
              >
                <TextArea
                  rows={2}
                  placeholder="Enter custom interface description..."
                  maxLength={255}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Clear Port Quick Action */}
          <Divider style={{ margin: '12px 0' }} />
          <Flex justify="space-between" align="center">
            <Button
              danger
              icon={<ClearOutlined />}
              onClick={handleClearPort}
              loading={submitting}
              data-testid="clear-port-button"
            >
              Disconnect & Clear Port
            </Button>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Clears linked IP and connected asset binding
            </Text>
          </Flex>
        </Form>
      </Drawer>
    );
  },
);

PortConfigDrawer.displayName = 'PortConfigDrawer';
