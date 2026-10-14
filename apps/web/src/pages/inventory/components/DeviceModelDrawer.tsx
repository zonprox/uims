import { DollarOutlined, FolderAddOutlined } from '@ant-design/icons';
import { App, Col, Form, Input, InputNumber, Row, Select, Tag } from 'antd';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import AppDrawer, { DrawerSection } from '../../../components/AppDrawer';
import { api } from '../../../services/api';
import {
  type InventoryCategory,
  type InventoryItem,
  inventoryService,
} from '../../../services/inventory.service';
import { type Vendor, vendorService } from '../../../services/vendor.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { formRules, isValidationError } from '../../../utils/formValidators';

export interface DeviceModelDrawerProps {
  open: boolean;
  model?: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface DeviceModelFormValues {
  modelCode: string;
  name: string;
  manufacturer: string;
  categoryId: string;
  minThreshold: number;
  unitCost: number;
  binLocation?: string;
  vendorId?: string;
  notes?: string;
}

export const DeviceModelDrawer: React.FC<DeviceModelDrawerProps> = ({
  open,
  model,
  onClose,
  onSuccess,
}) => {
  const { message, notification } = App.useApp();
  const [form] = Form.useForm<DeviceModelFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;

    Promise.allSettled([inventoryService.getCategories(), vendorService.getVendors()]).then(
      ([catsRes, vendsRes]) => {
        if (!active) return;
        if (catsRes.status === 'fulfilled') {
          setCategories(catsRes.value);
        }
        if (vendsRes.status === 'fulfilled') {
          setVendors(vendsRes.value);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (model) {
      form.setFieldsValue({
        modelCode: model.modelCode || model.sku,
        name: model.name,
        manufacturer: model.manufacturer || 'General',
        categoryId:
          model.categoryId ||
          (model.category && typeof model.category === 'object' ? model.category.id : undefined),
        minThreshold: model.minThreshold ?? 5,
        unitCost: model.unitCost ?? 0,
        binLocation: model.binLocation || model.binNumber,
        vendorId:
          model.vendorId ||
          (model.vendor && typeof model.vendor === 'object' ? model.vendor.id : undefined),
        notes: typeof model.notes === 'string' ? model.notes : '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        modelCode: `MOD-${Math.floor(1000 + Math.random() * 9000)}`,
        categoryId: categories[0]?.id || 'cat-laptop',
        minThreshold: 5,
        unitCost: 1200,
        binLocation: 'BIN-W1-A01',
      });
    }
  }, [open, model, categories, form]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: c.id })),
    [categories],
  );

  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        label: `${v.name}${v.contactEmail ? ` (${v.contactEmail})` : ''}`,
        value: v.id,
      })),
    [vendors],
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name.trim(),
        modelCode: values.modelCode.trim().toUpperCase(),
        manufacturer: values.manufacturer.trim(),
        categoryId: values.categoryId,
        minThreshold: Number(values.minThreshold) || 5,
        unitCost: Number(values.unitCost) || 0,
        binLocation: values.binLocation ? values.binLocation.trim() : undefined,
        binNumber: values.binLocation ? values.binLocation.trim() : undefined,
        vendorId: values.vendorId || undefined,
        notes: values.notes ? values.notes.trim() : undefined,
      };

      if (model) {
        await api.patch(`/assets/models/${model.id}`, payload);
        message.success(`Device model "${payload.name}" updated successfully.`);
      } else {
        await api.post('/assets/models', payload);
        message.success(`Device model "${payload.name}" created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (isValidationError(err)) return;
      const anyErr = err as {
        response?: { status?: number; data?: { message?: string } };
        status?: number;
      };
      if (anyErr?.response?.status === 409 || anyErr?.status === 409) {
        notification.error({
          message: 'Duplicate Model Code',
          description: `Device model code "${form.getFieldValue('modelCode')}" already exists. Please choose a unique SKU.`,
        });
      } else {
        message.error(
          formatErrorMessage(err, model ? 'update device model' : 'create device model'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDrawer
      title={model ? `Edit Model: ${model.name}` : 'Create Item / Device Model'}
      subtitle="Define master hardware specifications, safety thresholds, and warehouse location"
      icon={<FolderAddOutlined />}
      tag={<Tag color="blue">{model ? 'Update Catalog' : 'New Catalog Model'}</Tag>}
      open={open}
      onClose={onClose}
      size={580}
      destroyOnHidden={true}
      onOk={handleSubmit}
      okText={model ? 'Save Changes' : 'Create Model'}
      okLoading={submitting}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        validateTrigger={['onChange', 'onBlur']}
      >
        <DrawerSection title="Model Identification & Category" style={{ marginTop: 8 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="modelCode"
                label="Model Code / SKU"
                rules={[formRules.required('Model Code'), formRules.sku('Model Code')]}
                extra="Unique catalog code (e.g. MOD-DELL-5420)"
              >
                <Input
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  placeholder="MOD-DELL-5420"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="categoryId"
                label="Asset Category"
                rules={[formRules.required('Category')]}
              >
                <Select placeholder="Select category" options={categoryOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="name" label="Model Name" rules={[formRules.required('Model name')]}>
                <Input placeholder="e.g. Dell Latitude 5420 Rugged" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="manufacturer"
                label="Manufacturer"
                rules={[formRules.required('Manufacturer')]}
              >
                <Input placeholder="e.g. Dell, Apple, Lenovo" />
              </Form.Item>
            </Col>
          </Row>
        </DrawerSection>

        <DrawerSection title="Warehouse Stock Thresholds & Cost">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="minThreshold"
                label="Safety Threshold"
                rules={[formRules.required('Safety threshold')]}
                extra="Low stock alert trigger."
              >
                <InputNumber min={0} max={9999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unitCost"
                label="Unit Cost ($)"
                rules={[formRules.required('Unit cost')]}
              >
                <InputNumber
                  min={0}
                  step={0.01}
                  prefix={<DollarOutlined />}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="binLocation" label="Storage Bin" extra="Shelf location.">
                <Input placeholder="BIN-W1-A01" />
              </Form.Item>
            </Col>
          </Row>

          {vendorOptions.length > 0 && (
            <Form.Item name="vendorId" label="Supplier / Vendor">
              <Select allowClear placeholder="Select approved vendor" options={vendorOptions} />
            </Form.Item>
          )}

          <Form.Item name="notes" label="Specifications / Notes">
            <Input.TextArea
              rows={3}
              placeholder="Hardware specifications, CPU, RAM, display, or procurement notes."
            />
          </Form.Item>
        </DrawerSection>
      </Form>
    </AppDrawer>
  );
};

export default DeviceModelDrawer;
