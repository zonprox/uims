import { App, Form, Modal, Radio, Select, Switch } from 'antd';
import React, { useEffect, useState } from 'react';
import type { Asset } from '../../../services/assets.service';
import type {
  NetworkSwitch,
  SwitchPort,
  VLAN,
} from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { formatErrorMessage } from '../../../utils/feedback';
import type { PatchTopologyLinkDto } from './topology/types';

export interface CablePatchModalProps {
  open: boolean;
  switches: NetworkSwitch[];
  vlans: VLAN[];
  assets: Asset[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CablePatchModal: React.FC<CablePatchModalProps> = React.memo(
  ({ open, switches, vlans, assets, onClose, onSuccess }) => {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [sourceSwitchId, setSourceSwitchId] = useState<string | null>(null);
    const [targetSwitchId, setTargetSwitchId] = useState<string | null>(null);
    const [sourcePorts, setSourcePorts] = useState<SwitchPort[]>([]);
    const [targetPorts, setTargetPorts] = useState<SwitchPort[]>([]);
    const [linkCategory, setLinkCategory] = useState<'UPLINK' | 'ENDPOINT'>('UPLINK');

    // Reset dependent selections and form state whenever modal closes
    useEffect(() => {
      if (!open) {
        setSourceSwitchId(null);
        setTargetSwitchId(null);
        setSourcePorts([]);
        setTargetPorts([]);
        form.resetFields();
      }
    }, [open, form]);

    // Load ports for source switch
    useEffect(() => {
      if (sourceSwitchId) {
        networkService
          .getSwitchPorts(sourceSwitchId)
          .then(setSourcePorts)
          .catch((err: unknown) => {
            setSourcePorts([]);
            message.error(formatErrorMessage(err, 'load source switch ports'));
          });
      } else {
        setSourcePorts([]);
      }
    }, [sourceSwitchId, message]);

    // Load ports for target switch (uplink mode)
    useEffect(() => {
      if (targetSwitchId) {
        networkService
          .getSwitchPorts(targetSwitchId)
          .then(setTargetPorts)
          .catch((err: unknown) => {
            setTargetPorts([]);
            message.error(formatErrorMessage(err, 'load target switch ports'));
          });
      } else {
        setTargetPorts([]);
      }
    }, [targetSwitchId, message]);

    const handleSubmit = async () => {
      try {
        const values = await form.validateFields();
        setSubmitting(true);

        const payload: PatchTopologyLinkDto = {
          sourcePortId: values.sourcePortId,
          targetPortId: linkCategory === 'UPLINK' ? values.targetPortId : undefined,
          targetAssetId: linkCategory === 'ENDPOINT' ? values.targetAssetId : undefined,
          vlanId: values.vlanId || undefined,
          mode: values.mode || (linkCategory === 'UPLINK' ? 'TRUNK' : 'ACCESS'),
          poeEnabled: Boolean(values.poeEnabled),
          speed: values.speed || '1 Gbps',
        };

        await networkService.patchTopologyLink(payload);
        message.success('Cable patched successfully');
        form.resetFields();
        onSuccess();
        onClose();
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'patch cable link'));
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <Modal
        title="Interactive Cable Patching & Link Configuration"
        open={open}
        onCancel={onClose}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText="Patch Cable"
        cancelText="Cancel"
        destroyOnHidden
        width={580}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={{ mode: 'ACCESS', poeEnabled: false, speed: '1 Gbps' }}
        >
          <Form.Item label="Link Type">
            <Radio.Group
              value={linkCategory}
              onChange={(e) => setLinkCategory(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="UPLINK">Switch Uplink (Trunk)</Radio.Button>
              <Radio.Button value="ENDPOINT">Device / Camera Endpoint</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Source Switch"
            name="sourceSwitchId"
            rules={[{ required: true, message: 'Select source switch' }]}
          >
            <Select
              placeholder="Select Source Switch"
              onChange={(val: string) => {
                setSourceSwitchId(val);
                form.setFieldValue('sourcePortId', undefined);
                if (targetSwitchId === val) {
                  setTargetSwitchId(null);
                  form.setFieldValue('targetSwitchId', undefined);
                  form.setFieldValue('targetPortId', undefined);
                }
              }}
              options={switches.map((s) => ({ label: `${s.name} (${s.model})`, value: s.id }))}
            />
          </Form.Item>

          <Form.Item
            label="Source Port"
            name="sourcePortId"
            rules={[{ required: true, message: 'Select source port' }]}
          >
            <Select
              placeholder="Select Source Port"
              disabled={!sourceSwitchId}
              options={sourcePorts.map((p) => ({
                label: `Port ${p.portNumber}: ${p.name} [${p.formFactor}] (${p.operStatus})`,
                value: p.id,
              }))}
            />
          </Form.Item>

          {linkCategory === 'UPLINK' ? (
            <>
              <Form.Item
                label="Target Switch (Uplink)"
                name="targetSwitchId"
                rules={[{ required: true, message: 'Select target switch' }]}
              >
                <Select
                  placeholder="Select Target Switch"
                  onChange={(val: string) => {
                    setTargetSwitchId(val);
                    form.setFieldValue('targetPortId', undefined);
                  }}
                  options={switches
                    .filter((s) => s.id !== sourceSwitchId)
                    .map((s) => ({ label: `${s.name} (${s.model})`, value: s.id }))}
                />
              </Form.Item>
              <Form.Item
                label="Target Switch Port"
                name="targetPortId"
                rules={[{ required: true, message: 'Select target port' }]}
              >
                <Select
                  placeholder="Select Target Port"
                  disabled={!targetSwitchId}
                  options={targetPorts.map((p) => ({
                    label: `Port ${p.portNumber}: ${p.name} [${p.formFactor}] (${p.operStatus})`,
                    value: p.id,
                  }))}
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item
              label="Target Device / Camera"
              name="targetAssetId"
              rules={[{ required: true, message: 'Select target device' }]}
            >
              <Select
                placeholder="Select Endpoint Asset"
                options={assets.map((a) => ({
                  label: `${a.name} [${a.tag || a.assetCode || a.id}] · ${a.model || ''}`,
                  value: a.id,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item label="VLAN" name="vlanId">
            <Select
              allowClear
              placeholder="Assign VLAN"
              options={vlans.map((v) => ({
                label: `VLAN ${v.vlanNumber} — ${v.name}`,
                value: v.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Power over Ethernet (PoE Delivery)"
            name="poeEnabled"
            valuePropName="checked"
          >
            <Switch checkedChildren="⚡ PoE ON" unCheckedChildren="PoE OFF" />
          </Form.Item>
        </Form>
      </Modal>
    );
  },
);

CablePatchModal.displayName = 'CablePatchModal';
