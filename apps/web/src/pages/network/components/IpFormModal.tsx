import { CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Col,
  Flex,
  Form,
  type FormInstance,
  Input,
  Modal,
  Row,
  Select,
  Tag,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import type { Asset } from '../../../services/assets.service';
import type { LocationBranch } from '../../../services/organization.service';
import {
  type AutoDetectResult,
  type IPAddress,
  type Subnet,
  type VLAN,
  networkService,
} from '../../../services/network.service';

const { Option } = Select;

export interface IpFormModalProps {
  open: boolean;
  editingIp: IPAddress | null;
  form: FormInstance;
  submitting: boolean;
  subnets: Subnet[];
  vlans: VLAN[];
  locations: LocationBranch[];
  assets?: Asset[];
  onSave: () => void;
  onCancel: () => void;
}

export const IpFormModal: React.FC<IpFormModalProps> = React.memo(
  ({
    open,
    editingIp,
    form,
    submitting,
    subnets,
    vlans,
    locations,
    assets = [],
    onSave,
    onCancel,
  }) => {
    const { message } = App.useApp();
    const [detectedNetwork, setDetectedNetwork] = useState<AutoDetectResult | null>(null);
    const [detectedVendor, setDetectedVendor] = useState<string | null>(null);
    const [fetchingNextIp, setFetchingNextIp] = useState(false);

    // Watch selected subnet to enable Next IP button
    const selectedSubnetId = Form.useWatch('subnetId', form);

    // Real-time IP address auto-detection
    const handleIpChange = useCallback(
      async (ipVal: string) => {
        const trimmed = ipVal.trim();
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
          try {
            const result = await networkService.autoDetect(trimmed);
            if (result && result.isWithinSubnet) {
              setDetectedNetwork(result);
              if (result.matchedSubnet) {
                form.setFieldValue('subnetId', result.matchedSubnet.id);
              }
              if (result.matchedVlan) {
                form.setFieldValue('vlanId', result.matchedVlan.id);
              }
            } else {
              setDetectedNetwork(null);
            }
          } catch (_err: unknown) {
            setDetectedNetwork(null);
          }
        } else {
          setDetectedNetwork(null);
        }
      },
      [form],
    );

    // Real-time MAC OUI Vendor lookup
    const handleMacChange = useCallback(
      async (macVal: string) => {
        const cleaned = macVal.replace(/[^a-fA-F0-9]/g, '');
        if (cleaned.length >= 6) {
          try {
            const result = await networkService.lookupMacVendor(macVal.trim());
            if (result && result.vendor && result.isKnown) {
              setDetectedVendor(result.vendor);
              form.setFieldValue('vendor', result.vendor);
            } else {
              setDetectedVendor(null);
            }
          } catch (_err: unknown) {
            setDetectedVendor(null);
          }
        } else {
          setDetectedVendor(null);
        }
      },
      [form],
    );

    // Automation: "Next Available IP" for current Subnet
    const handleFetchNextAvailableIp = useCallback(async () => {
      const currentSubnetId = form.getFieldValue('subnetId');
      if (!currentSubnetId) {
        message.warning('Please select a Subnet first to find the next available IP.');
        return;
      }
      setFetchingNextIp(true);
      try {
        const res = await networkService.getNextAvailableIp(currentSubnetId);
        if (res?.nextAvailableIp) {
          form.setFieldValue('address', res.nextAvailableIp);
          form.setFieldValue('ip', res.nextAvailableIp);
          handleIpChange(res.nextAvailableIp);
          message.success(`Populated next available IP: ${res.nextAvailableIp}`);
        } else {
          message.warning('No unallocated IP addresses remaining in this subnet.');
        }
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } } };
        message.error(apiErr.response?.data?.message || 'Failed to fetch next available IP.');
      } finally {
        setFetchingNextIp(false);
      }
    }, [form, handleIpChange, message]);

    // Handle Asset selection to auto-populate hostname or model
    const handleAssetSelect = (assetId: string) => {
      const matched = assets.find((a) => a.id === assetId);
      if (matched) {
        if (!form.getFieldValue('hostname')) {
          form.setFieldValue('hostname', matched.tag || matched.name);
        }
        if (!form.getFieldValue('model') && matched.model) {
          form.setFieldValue('model', matched.model);
        }
      }
    };

    useEffect(() => {
      if (open) {
        setDetectedNetwork(null);
        setDetectedVendor(null);
        const currentIp = form.getFieldValue('address') || form.getFieldValue('ip');
        if (currentIp) {
          handleIpChange(currentIp);
        }
        const currentMac = form.getFieldValue('macAddress') || form.getFieldValue('mac');
        if (currentMac) {
          handleMacChange(currentMac);
        }
      }
    }, [open, form, handleIpChange, handleMacChange]);

    return (
      <Modal
        title={
          editingIp
            ? `Edit IP Allocation: ${editingIp.address || editingIp.ip}`
            : 'Allocate IP Address with Real-time Automation'
        }
        open={open}
        onOk={onSave}
        onCancel={onCancel}
        confirmLoading={submitting}
        width={720}
        okText={editingIp ? 'Save Changes' : 'Allocate IP'}
        styles={{ body: { paddingTop: 12 } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                label={
                  <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                    <span>IP Address (IPv4)</span>
                    <Button
                      size="small"
                      type="link"
                      icon={<ThunderboltOutlined />}
                      loading={fetchingNextIp}
                      disabled={!selectedSubnetId}
                      onClick={handleFetchNextAvailableIp}
                      style={{ padding: 0, height: 'auto', fontSize: 12 }}
                    >
                      Next Available IP
                    </Button>
                  </Flex>
                }
                name="address"
                rules={[
                  { required: true, message: 'IP address is required' },
                  {
                    pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                    message: 'Enter a valid IPv4 address (e.g. 10.232.130.15)',
                  },
                ]}
              >
                <Input
                  placeholder="e.g. 10.232.130.15"
                  onChange={(e) => handleIpChange(e.target.value)}
                  allowClear
                />
              </Form.Item>
              {detectedNetwork?.matchedSubnet && (
                <div style={{ marginTop: -16, marginBottom: 12 }}>
                  <Tag color="cyan" icon={<CheckCircleOutlined />}>
                    Auto-detected Subnet: {detectedNetwork.matchedSubnet.cidr}
                    {detectedNetwork.matchedVlan &&
                      ` (VLAN ${detectedNetwork.matchedVlan.vlanNumber})`}
                  </Tag>
                </div>
              )}
            </Col>
            <Col span={10}>
              <Form.Item
                label="Hostname & FQDN"
                name="hostname"
                rules={[{ required: true, message: 'Hostname is required' }]}
              >
                <Input placeholder="e.g. bsl-sw-core01.uims.lan" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="MAC Address"
                name="macAddress"
                rules={[
                  {
                    pattern:
                      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}$/,
                    message: 'Enter valid MAC address (e.g. 00:1B:44:11:3A:B7)',
                  },
                ]}
              >
                <Input
                  placeholder="e.g. 00:1B:44:11:3A:B7"
                  onChange={(e) => handleMacChange(e.target.value)}
                  allowClear
                />
              </Form.Item>
              {detectedVendor && (
                <div style={{ marginTop: -16, marginBottom: 12 }}>
                  <Tag color="geekblue" icon={<CheckCircleOutlined />}>
                    OUI Vendor: {detectedVendor}
                  </Tag>
                </div>
              )}
            </Col>
            <Col span={12}>
              <Form.Item label="Device Vendor / Manufacturer" name="vendor">
                <Input placeholder="e.g. Cisco Systems, Hikvision, Sindoh" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Subnet CIDR"
                name="subnetId"
                rules={[{ required: true, message: 'Subnet is required' }]}
              >
                <Select
                  placeholder="Select Subnet"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                >
                  {subnets.map((sub) => (
                    <Option key={sub.id} value={sub.id}>
                      {sub.cidr} ({sub.name})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="VLAN Mapping" name="vlanId">
                <Select placeholder="Select VLAN" showSearch optionFilterProp="children" allowClear>
                  {vlans.map((vlan) => (
                    <Option key={vlan.id} value={vlan.id}>
                      VLAN {vlan.vlanNumber} ({vlan.name})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Device Type"
                name="deviceType"
                rules={[{ required: true, message: 'Device type is required' }]}
                initialValue="Workstation"
              >
                <Select>
                  <Option value="Server">Server</Option>
                  <Option value="Workstation">Workstation</Option>
                  <Option value="Switch">Switch</Option>
                  <Option value="Router">Router / Gateway</Option>
                  <Option value="Access Point">Wireless AP</Option>
                  <Option value="Printer">Printer</Option>
                  <Option value="Camera">CCTV / Camera</Option>
                  <Option value="NVR">NVR / Storage</Option>
                  <Option value="Time Attendance">Time Attendance</Option>
                  <Option value="Access Control">Access Control Door</Option>
                  <Option value="IoT Gateway">IoT Gateway</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Device Model" name="model">
                <Input placeholder="e.g. C9300-24P, DS-2CD2143G0-I" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Allocation Status"
                name="status"
                rules={[{ required: true }]}
                initialValue="ASSIGNED"
              >
                <Select>
                  <Option value="ASSIGNED">Assigned (Active)</Option>
                  <Option value="RESERVED">Reserved (Static/Gateway)</Option>
                  <Option value="AVAILABLE">Available (Pool)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Linked Hardware Asset" name="assetId">
                <Select
                  placeholder="Select Asset tag or device"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                  onChange={handleAssetSelect}
                >
                  {assets.map((asset) => (
                    <Option key={asset.id} value={asset.id}>
                      [{asset.tag}] {asset.name} ({asset.model})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Physical Site / Location" name="locationId">
                <Select
                  placeholder="Select Location"
                  showSearch
                  optionFilterProp="children"
                  allowClear
                >
                  {locations.map((loc) => (
                    <Option key={loc.id} value={loc.id}>
                      {loc.name} {loc.building ? `(${loc.building})` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Section / Floor" name="section">
                <Input placeholder="e.g. Floor 2 - Production Line 3" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Description & Operational Notes" name="description">
                <Input placeholder="e.g. Dedicated printing terminal for accounting" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    );
  },
);

IpFormModal.displayName = 'IpFormModal';
