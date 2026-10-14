import {
  AppstoreAddOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
  TagOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Tag,
  theme,
} from 'antd';
import dayjs from 'dayjs';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import AppDrawer, { DrawerSection } from '../../../components/AppDrawer';
import { assetsService, type CostCenter } from '../../../services/assets.service';
import { type InventoryItem, inventoryService } from '../../../services/inventory.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { formRules } from '../../../utils/formValidators';

export interface BatchStockIntakeDrawerProps {
  open: boolean;
  model?: InventoryItem | null;
  models?: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface IntakeFormValues {
  deviceModelId: string;
  count: number;
  generationMode: 'auto' | 'manual';
  tagPrefix: string;
  startSequence: number;
  serialNumbers?: string;
  purchaseDate?: dayjs.Dayjs;
  warrantyExpiry?: dayjs.Dayjs;
  costCenterId?: string;
  initialBinLocation?: string;
  notes?: string;
}

export const BatchStockIntakeDrawer: React.FC<BatchStockIntakeDrawerProps> = ({
  open,
  model,
  models = [],
  onClose,
  onSuccess,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [form] = Form.useForm<IntakeFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [generationMode, setGenerationMode] = useState<'auto' | 'manual'>('auto');

  // Load cost centers for attribution
  useEffect(() => {
    if (!open) return;
    let active = true;
    assetsService
      .getCostCenters()
      .then((res) => {
        if (active) setCostCenters(res || []);
      })
      .catch((error: unknown) => {
        if (active) {
          setCostCenters([]);
          message.warning(formatErrorMessage(error, 'load cost centers'));
        }
      });
    return () => {
      active = false;
    };
  }, [open]);

  // Derive initial values when drawer opens
  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    const targetModel = model || models[0];
    const targetModelId = targetModel?.id || '';
    const prefixCandidate =
      targetModel?.sku || targetModel?.modelCode || targetModel?.name || 'AST';
    const cleanPrefix = `AST-${prefixCandidate
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)}-`;

    form.setFieldsValue({
      deviceModelId: targetModelId,
      count: 5,
      generationMode: 'auto',
      tagPrefix: cleanPrefix,
      startSequence: 101,
      serialNumbers: '',
      purchaseDate: dayjs(),
      warrantyExpiry: dayjs().add(3, 'year'),
      initialBinLocation: targetModel?.binLocation || targetModel?.binNumber || 'BIN-W1-A01',
      notes: '',
    });
    setGenerationMode('auto');
  }, [open, model, models, form]);

  const selectedModelId = Form.useWatch('deviceModelId', form);
  const activeModel = useMemo(() => {
    if (model && model.id === selectedModelId) return model;
    return models.find((m) => m.id === selectedModelId) || model;
  }, [model, models, selectedModelId]);

  const handleModelChange = (newModelId: string) => {
    const found = models.find((m) => m.id === newModelId);
    if (found) {
      const prefixCandidate = found.sku || found.modelCode || found.name || 'AST';
      const cleanPrefix = `AST-${prefixCandidate
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6)}-`;
      form.setFieldsValue({
        tagPrefix: cleanPrefix,
        initialBinLocation:
          found.binLocation || found.binNumber || form.getFieldValue('initialBinLocation'),
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const count = Number(values.count) || 1;
      let parsedSerials: string[] | undefined;

      if (values.generationMode === 'manual' && values.serialNumbers) {
        parsedSerials = values.serialNumbers
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const payload = {
        deviceModelId: values.deviceModelId,
        count,
        tagPrefix:
          values.generationMode === 'auto' ? values.tagPrefix.trim().toUpperCase() : undefined,
        startSequence: values.generationMode === 'auto' ? Number(values.startSequence) : undefined,
        serialNumbers: parsedSerials,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : undefined,
        warrantyExpiry: values.warrantyExpiry
          ? values.warrantyExpiry.format('YYYY-MM-DD')
          : undefined,
        costCenterId: values.costCenterId || undefined,
        initialBinLocation: values.initialBinLocation
          ? values.initialBinLocation.trim()
          : undefined,
        notes: values.notes ? values.notes.trim() : undefined,
      };

      await inventoryService.batchIntake(values.deviceModelId, payload);
      message.success(`Successfully received ${count} physical units into warehouse inventory.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      message.error(formatErrorMessage(err, 'process warehouse batch stock intake'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDrawer
      title="Batch Stock Intake"
      subtitle="Receive newly procured hardware units into warehouse inventory under a master Device Model"
      icon={<AppstoreAddOutlined />}
      tag={<Tag color="blue">Warehouse Receiving</Tag>}
      open={open}
      onClose={onClose}
      size={640}
      destroyOnHidden={true}
      onOk={handleSubmit}
      okText="Receive Units into Stock"
      okLoading={submitting}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        validateTrigger={['onChange', 'onBlur']}
      >
        <DrawerSection title="Target Device Model" style={{ marginTop: 8 }}>
          <Form.Item
            name="deviceModelId"
            label="Device Catalog Model"
            rules={[formRules.required('Device model')]}
            extra="Master catalog specifications and manufacturer for the incoming batch."
          >
            <Select
              showSearch
              placeholder="Select device model"
              options={models.map((m) => ({
                label: `${m.name} (${m.sku || m.modelCode}) — ${m.manufacturer || 'General'}`,
                value: m.id,
              }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleModelChange}
              disabled={Boolean(model && !models.length)}
            />
          </Form.Item>

          {activeModel && (
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: 12 }}
              message={
                <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                  <span>
                    Model: <strong>{activeModel.name}</strong> (
                    {activeModel.sku || activeModel.modelCode})
                  </span>
                  <span>
                    Current Warehouse Stock:{' '}
                    <strong>{activeModel.availableUnits ?? activeModel.quantity ?? 0} units</strong>
                  </span>
                </Flex>
              }
            />
          )}
        </DrawerSection>

        <DrawerSection title="Batch Sizing & Identification">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="count"
                label="Units to Receive"
                rules={[formRules.required('Unit count')]}
                extra="Total physical hardware units in this shipment."
              >
                <InputNumber min={1} max={500} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="generationMode"
                label="Identification Mode"
                extra="How SUB codes and tags should be assigned."
              >
                <Radio.Group
                  value={generationMode}
                  onChange={(e) => setGenerationMode(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="auto">Auto Sequence</Radio.Button>
                  <Radio.Button value="manual">Manual Entry</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          {generationMode === 'auto' ? (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="tagPrefix"
                  label="SUB Tag Prefix"
                  rules={[formRules.required('Tag prefix')]}
                  extra="e.g. AST-DELL- or AST-MBP-"
                >
                  <Input
                    prefix={<TagOutlined style={{ color: token.colorTextTertiary }} />}
                    placeholder="AST-DELL-"
                    style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="startSequence"
                  label="Start Sequence Number"
                  rules={[formRules.required('Start sequence')]}
                  extra="First numeric index (e.g. 101)"
                >
                  <InputNumber min={1} max={999999} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Form.Item
              name="serialNumbers"
              label="Serial Numbers / Scanned Barcodes"
              extra="Enter one serial number per line or separated by commas."
            >
              <Input.TextArea
                rows={4}
                placeholder="C02G8392MD6R&#10;C02G8393MD6R&#10;C02G8394MD6R"
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          )}
        </DrawerSection>

        <DrawerSection title="Procurement & Warehouse Placement">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="purchaseDate"
                label="Procurement Date"
                rules={[formRules.required('Purchase date')]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="warrantyExpiry"
                label="Warranty Expiry Date"
                rules={[formRules.required('Warranty expiry')]}
                extra="Default: +3 years"
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="costCenterId"
                label="Assigned Cost Center"
                extra="Operational or capital budget unit."
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Select cost center"
                  options={costCenters.map((cc) => ({
                    label: `${cc.code} - ${cc.name}`,
                    value: cc.id,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="initialBinLocation"
                label="Storage Bin / Shelf Location"
                extra="Warehouse storage location."
              >
                <Input
                  prefix={<DatabaseOutlined style={{ color: token.colorTextTertiary }} />}
                  placeholder="BIN-W1-A01"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="Shipment Notes / Invoice Reference"
            extra="Optional procurement invoice, PO reference, or delivery remarks."
          >
            <Input.TextArea rows={2} placeholder="PO-2026-9482 / Delivery Batch #1" />
          </Form.Item>
        </DrawerSection>
      </Form>
    </AppDrawer>
  );
};

export default BatchStockIntakeDrawer;
