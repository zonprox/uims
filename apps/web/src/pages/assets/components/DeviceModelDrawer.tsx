import { App, Button, Drawer, Flex, Form, Input, InputNumber, Select, Space, theme } from 'antd';
import React, { useEffect, useState } from 'react';
import type { Asset, AssetCategory, CostCenter } from '../../../services/assets.service';
import { assetsService } from '../../../services/assets.service';
import { api } from '../../../services/api';
import { formatErrorMessage } from '../../../utils/feedback';
import { isValidationError } from '../../../utils/formValidators';

export interface DeviceModelDrawerProps {
  open: boolean;
  editingModel?: Asset | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeviceModelDrawer: React.FC<DeviceModelDrawerProps> = React.memo(
  ({ open, editingModel, onClose, onSuccess }) => {
    const { token } = theme.useToken();
    const { message, notification } = App.useApp();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<AssetCategory[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

    useEffect(() => {
      if (open) {
        assetsService
          .getCategories()
          .then((cats) => setCategories(cats))
          .catch((err: unknown) => {
            message.warning(formatErrorMessage(err, 'load categories'));
          });

        api
          .get('/assets/cost-centers')
          .then((res) => {
            if (res.data?.data) setCostCenters(res.data.data);
          })
          .catch(() => {
            setCostCenters([
              { id: 'cc-it-ops', code: 'IT-OPS', name: 'IT Operations & Infrastructure' },
              { id: 'cc-eng-dev', code: 'ENG-DEV', name: 'Software Engineering & DevOps' },
              { id: 'cc-fin-acc', code: 'FIN-ACC', name: 'Finance & Corporate Accounting' },
              {
                id: 'cc-hr-admin',
                code: 'HR-ADMIN',
                name: 'Human Resources & General Administration',
              },
            ]);
          });
      }
    }, [open, message]);

    useEffect(() => {
      if (open) {
        if (editingModel) {
          form.setFieldsValue({
            assetCode: editingModel.assetCode || editingModel.tag,
            name: editingModel.name,
            manufacturer: editingModel.manufacturer,
            model: editingModel.model,
            categoryId: editingModel.categoryId,
            category: editingModel.category,
            specifications: editingModel.specifications,
            unitCost: editingModel.unitCost,
            costCenterId:
              editingModel.costCenterId ||
              (typeof editingModel.costCenter === 'object'
                ? editingModel.costCenter?.id
                : undefined),
            notes: editingModel.notes,
          });
        } else {
          form.resetFields();
        }
      }
    }, [open, editingModel, form]);

    const handleSubmit = async () => {
      try {
        const values = await form.validateFields();
        setSubmitting(true);

        const payload = {
          assetCode: (values.assetCode || '').trim().toUpperCase(),
          name: (values.name || '').trim(),
          manufacturer: values.manufacturer ? values.manufacturer.trim() : undefined,
          model: values.model ? values.model.trim() : undefined,
          categoryId: values.categoryId || undefined,
          category: values.category || undefined,
          specifications: values.specifications ? values.specifications.trim() : undefined,
          unitCost: values.unitCost != null ? Number(values.unitCost) : undefined,
          costCenterId: values.costCenterId || undefined,
          notes: values.notes ? values.notes.trim() : undefined,
        };

        if (editingModel) {
          await api.patch(`/assets/models/${editingModel.id}`, payload);
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
          const rawCode = form.getFieldValue('assetCode') || '';
          notification.error({
            message: 'Duplicate Asset Code',
            description: `Device model with asset code "${rawCode.toUpperCase()}" already exists. Please specify a unique Asset Code.`,
          });
        } else {
          message.error(formatErrorMessage(err, editingModel ? 'update model' : 'create model'));
        }
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <Drawer
        title={editingModel ? `Edit Device Model: ${editingModel.name}` : 'Create Device Model'}
        open={open}
        onClose={onClose}
        destroyOnClose
        styles={{
          wrapper: { width: 520 },
          body: {
            padding: 24,
            backgroundColor: token.colorBgContainer,
          },
        }}
        extra={
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              {editingModel ? 'Save Changes' : 'Create Model'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          validateTrigger={['onChange', 'onBlur']}
          scrollToFirstError={true}
        >
          <Form.Item
            name="assetCode"
            label="Asset Code / SAP Code"
            rules={[
              { required: true, message: 'Please enter a unique Asset Code' },
              {
                pattern: /^[A-Za-z0-9_-]+$/,
                message: 'Asset code can only contain letters, numbers, hyphens, and underscores',
              },
            ]}
            extra="Unique catalog model code (e.g. MOD-DELL-5420, MOD-MBP-14). Automatically formatted to uppercase."
          >
            <Input
              placeholder="e.g. MOD-DELL-5420"
              style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
              onChange={(e) => {
                form.setFieldsValue({ assetCode: e.target.value.toUpperCase() });
              }}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Device Model Name"
            rules={[{ required: true, message: 'Please enter model name' }]}
          >
            <Input placeholder="e.g. Dell Latitude 5420 Rugged" />
          </Form.Item>

          <Flex gap={16}>
            <Form.Item name="manufacturer" label="Manufacturer" style={{ flex: 1 }}>
              <Input placeholder="e.g. Dell, Apple, Lenovo" />
            </Form.Item>
            <Form.Item name="model" label="Model Number / Series" style={{ flex: 1 }}>
              <Input placeholder="e.g. Latitude 5420" />
            </Form.Item>
          </Flex>

          <Flex gap={16}>
            <Form.Item name="categoryId" label="Category" style={{ flex: 1 }}>
              <Select
                placeholder="Select category"
                allowClear
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
              />
            </Form.Item>
            <Form.Item name="costCenterId" label="Default Cost Center" style={{ flex: 1 }}>
              <Select
                placeholder="Select cost center"
                allowClear
                options={costCenters.map((cc) => ({
                  label: `${cc.code} - ${cc.name}`,
                  value: cc.id,
                }))}
              />
            </Form.Item>
          </Flex>

          <Form.Item name="unitCost" label="Unit Cost (USD)">
            <InputNumber
              style={{ width: '100%' }}
              prefix="$"
              min={0}
              precision={2}
              placeholder="e.g. 1450.00"
            />
          </Form.Item>

          <Form.Item
            name="specifications"
            label="Hardware Specifications"
            extra="Detailed hardware specs (CPU, RAM, storage, form factor, display)."
          >
            <Input.TextArea
              rows={3}
              placeholder={
                'e.g. Intel Core i7-1370P (14 Cores), 32GB LPDDR5, 512GB PCIe 4.0 NVMe, 14.0" FHD Non-Touch'
              }
            />
          </Form.Item>

          <Form.Item name="notes" label="Administrative Notes">
            <Input.TextArea
              rows={2}
              placeholder="Optional procurement notes or warranty contract IDs"
            />
          </Form.Item>
        </Form>
      </Drawer>
    );
  },
);

DeviceModelDrawer.displayName = 'DeviceModelDrawer';

export { DeviceModelDrawer as DeviceModelModal };
