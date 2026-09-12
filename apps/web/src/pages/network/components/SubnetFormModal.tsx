import { CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Flex,
  Form,
  type FormInstance,
  Input,
  Modal,
  Row,
  Select,
  Tag,
  Typography,
  theme,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import type { LocationBranch } from '../../../services/organization.service';
import {
  type NetworkCalculation,
  type Subnet,
  type VLAN,
  networkService,
} from '../../../services/network.service';

const { Text } = Typography;

export interface SubnetFormModalProps {
  open: boolean;
  editingSubnet?: Subnet | null;
  form: FormInstance;
  submitting: boolean;
  vlans: VLAN[];
  locations: LocationBranch[];
  onSave: () => void;
  onCancel: () => void;
}

// Client-side instant bitwise math for immediate zero-latency feedback
function calculateLocalCidr(cidr: string): NetworkCalculation | null {
  const match = cidr.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!match) return null;

  const octets = [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
  const prefix = Number(match[5]);

  if (octets.some((o) => o < 0 || o > 255) || prefix < 1 || prefix > 32) {
    return null;
  }

  const ipInt =
    ((octets[0] << 24) >>> 0) +
    ((octets[1] << 16) >>> 0) +
    ((octets[2] << 8) >>> 0) +
    (octets[3] >>> 0);

  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const netInt = (ipInt & maskInt) >>> 0;
  const broadInt = (netInt | (~maskInt >>> 0)) >>> 0;

  const intToIp = (val: number) =>
    [(val >>> 24) & 255, (val >>> 16) & 255, (val >>> 8) & 255, val & 255].join('.');

  const totalHosts = Math.pow(2, 32 - prefix);
  const usableHosts = prefix >= 31 ? totalHosts : Math.max(0, totalHosts - 2);

  const usableStart = prefix >= 31 ? intToIp(netInt) : intToIp(netInt + 1);
  const usableEnd = prefix >= 31 ? intToIp(broadInt) : intToIp(broadInt - 1);
  // Conventional gateway: last usable IP or first usable IP
  const suggestedGateway = prefix >= 31 ? usableStart : usableEnd;

  return {
    networkAddress: intToIp(netInt),
    broadcastAddress: intToIp(broadInt),
    subnetMask: intToIp(maskInt),
    prefix,
    totalHosts,
    usableHosts,
    usableStart,
    usableEnd,
    suggestedGateway,
  };
}

export const SubnetFormModal: React.FC<SubnetFormModalProps> = React.memo(
  ({ open, editingSubnet, form, submitting, vlans, locations, onSave, onCancel }) => {
    const { token } = theme.useToken();
    const [calcPreview, setCalcPreview] = useState<NetworkCalculation | null>(null);

    const handleCidrChange = useCallback(
      (cidrValue: string) => {
        const local = calculateLocalCidr(cidrValue);
        if (local) {
          setCalcPreview(local);
          if (!editingSubnet && !form.getFieldValue('gateway') && local.suggestedGateway) {
            form.setFieldValue('gateway', local.suggestedGateway);
          }
          // Also call backend calculation asynchronously to confirm alignment
          networkService
            .calculateSubnet(cidrValue.trim())
            .then((res) => {
              if (res) {
                setCalcPreview(res);
                if (!editingSubnet && !form.getFieldValue('gateway') && res.suggestedGateway) {
                  form.setFieldValue('gateway', res.suggestedGateway);
                }
              }
            })
            .catch((_error: unknown) => {
              // Retain client-side bitwise calculation preview if backend check is unavailable
            });
        } else {
          setCalcPreview(null);
        }
      },
      [editingSubnet, form],
    );

    const handleVlanChange = (vlanId: string) => {
      const selected = vlans.find((v) => v.id === vlanId);
      if (selected?.locationId && !form.getFieldValue('locationId')) {
        form.setFieldValue('locationId', selected.locationId);
      }
    };

    useEffect(() => {
      if (open) {
        const currentCidr = form.getFieldValue('cidr');
        if (currentCidr) {
          handleCidrChange(currentCidr);
        } else {
          setCalcPreview(null);
        }
      }
    }, [open, form, handleCidrChange]);

    const handleApplySuggestedGateway = () => {
      if (calcPreview?.suggestedGateway) {
        form.setFieldValue('gateway', calcPreview.suggestedGateway);
      }
    };

    return (
      <Modal
        title={editingSubnet ? `Edit Subnet: ${editingSubnet.cidr}` : 'Create Subnet'}
        open={open}
        onOk={onSave}
        onCancel={onCancel}
        confirmLoading={submitting}
        destroyOnHidden={true}
        width={680}
        okText={editingSubnet ? 'Save Changes' : 'Create Subnet'}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="CIDR Block (IPv4)"
                name="cidr"
                rules={[
                  { required: true, message: 'CIDR block is required' },
                  {
                    pattern: /^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/,
                    message: 'Format must be valid IPv4 CIDR, e.g. 10.232.130.0/24',
                  },
                ]}
              >
                <Input
                  placeholder="e.g. 10.232.130.0/24"
                  onChange={(e) => handleCidrChange(e.target.value)}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Subnet Name"
                name="name"
                rules={[{ required: true, message: 'Subnet name is required' }]}
              >
                <Input placeholder="e.g. BSL CCTV Security Network" />
              </Form.Item>
            </Col>
          </Row>

          {/* Real-time Dynamic CIDR Preview Card */}
          {calcPreview && (
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: token.colorFillAlter,
                borderColor: token.colorBorderSecondary,
              }}
              styles={{ body: { padding: '12px 16px' } }}
              title={
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap={6}>
                    <ThunderboltOutlined style={{ color: '#1677ff' }} />
                    <Text strong style={{ fontSize: 12.5 }}>
                      Automated Network Specifications (/{calcPreview.prefix})
                    </Text>
                  </Flex>
                  <Tag color="green" icon={<CheckCircleOutlined />}>
                    {calcPreview.usableHosts} Usable IPs
                  </Tag>
                </Flex>
              }
            >
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="Subnet Mask">
                  <Text code>{calcPreview.subnetMask}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Total Hosts">
                  <Text>
                    {calcPreview.totalHosts} ({calcPreview.usableHosts} usable)
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Network Address">
                  <Text code>{calcPreview.networkAddress}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Broadcast Address">
                  <Text code>{calcPreview.broadcastAddress}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Usable IP Range" span={2}>
                  <Text code style={{ color: '#1677ff' }}>
                    {calcPreview.usableStart} — {calcPreview.usableEnd}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Suggested Gateway" span={2}>
                  <Flex align="center" gap={8}>
                    <Text code strong style={{ color: '#059669' }}>
                      {calcPreview.suggestedGateway}
                    </Text>
                    <Button
                      size="small"
                      type="link"
                      style={{ padding: 0, height: 'auto' }}
                      onClick={handleApplySuggestedGateway}
                    >
                      Use this Gateway
                    </Button>
                  </Flex>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="VLAN Mapping" name="vlanId">
                <Select
                  placeholder="Select mapped VLAN"
                  allowClear
                  showSearch
                  options={vlans.map((vlan) => ({
                    label: `VLAN ${vlan.vlanNumber} (${vlan.name})`,
                    value: vlan.id,
                  }))}
                  onChange={handleVlanChange}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Location / Site" name="locationId">
                <Select
                  placeholder="Select physical site"
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
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Default Gateway"
                name="gateway"
                rules={[
                  {
                    pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                    message: 'Must be a valid IPv4 address, e.g. 10.232.130.254',
                  },
                ]}
              >
                <Input placeholder="e.g. 10.232.130.254" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Description" name="description">
                <Input placeholder="e.g. Access switch uplink subnet" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    );
  },
);

SubnetFormModal.displayName = 'SubnetFormModal';
