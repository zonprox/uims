import {
  App,
  Col,
  DatePicker,
  Form,
  type FormInstance,
  Input,
  Modal,
  Row,
  Select,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { IT_ASSET_CATEGORIES } from '@uims/shared-types';
import type { Asset, AssetCategory, CostCenter } from '../../../services/assets.service';
import { assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import {
  type Department,
  organizationService,
} from '../../../services/organization.service';
import { formatErrorMessage } from '../../../utils/feedback';
import { formRules } from '../../../utils/formValidators';

export interface AssetFormModalProps {
  open: boolean;
  editingAsset: Asset | null;
  form: FormInstance;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
  categories?: AssetCategory[];
  departments?: Department[];
  employees?: DirectoryUser[];
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'Active' },
  { label: 'In Repair', value: 'In Repair' },
  { label: 'In Storage', value: 'In Storage' },
  { label: 'Retired', value: 'Retired' },
];

export const AssetFormModal: React.FC<AssetFormModalProps> = React.memo(
  ({
    open,
    editingAsset,
    form,
    submitting,
    onSave,
    onCancel,
    categories: propCategories,
    departments: propDepartments,
    employees: propEmployees,
  }) => {
    const { message } = App.useApp();
    const [categories, setCategories] = useState<AssetCategory[]>(propCategories || []);
    const [departments, setDepartments] = useState<Department[]>(propDepartments || []);
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
      if (!open) return;

      let mounted = true;
      const fetchReferences = async () => {
        setLoadingOptions(true);
        try {
          const [catResult, deptResult, empResult, ccResult] = await Promise.allSettled([
            propCategories ? Promise.resolve(propCategories) : assetsService.getCategories(),
            propDepartments
              ? Promise.resolve(propDepartments)
              : organizationService.getDepartments(),
            propEmployees
              ? Promise.resolve({ items: propEmployees })
              : directoryService.getEmployees({ pageSize: 100 }),
            assetsService.getCostCenters().catch(() => [
              { id: 'cc-it-ops', code: 'IT-OPS', name: 'IT Operations & Infrastructure' },
              { id: 'cc-eng-dev', code: 'ENG-DEV', name: 'Software Engineering & DevOps' },
              { id: 'cc-fin-acc', code: 'FIN-ACC', name: 'Finance & Corporate Accounting' },
              { id: 'cc-hr-admin', code: 'HR-ADMIN', name: 'Human Resources & General Administration' },
            ]),
          ]);

          if (!mounted) return;

          const loadErrors: string[] = [];

          if (catResult.status === 'fulfilled') {
            setCategories(catResult.value);
          } else {
            loadErrors.push('categories');
          }

          if (deptResult.status === 'fulfilled') {
            setDepartments(deptResult.value);
          } else {
            loadErrors.push('departments');
          }

          if (empResult.status === 'fulfilled') {
            setEmployees(empResult.value.items || []);
          } else {
            loadErrors.push('employees');
          }

          if (ccResult.status === 'fulfilled') {
            setCostCenters(ccResult.value);
          }

          if (loadErrors.length > 0) {
            message.warning(`Failed to load options for: ${loadErrors.join(', ')}.`);
          }
        } catch (error: unknown) {
          message.error(formatErrorMessage(error, 'load asset form reference data'));
        } finally {
          if (mounted) setLoadingOptions(false);
        }
      };

      fetchReferences();

      return () => {
        mounted = false;
      };
    }, [
      message,
      open,
      propCategories,
      propDepartments,
      propEmployees,
    ]);

    const categorySelectOptions = useMemo(() => {
      if (categories && categories.length > 0) {
        return categories.map((c) => ({
          label: c.name,
          value: c.id,
        }));
      }
      return Object.values(IT_ASSET_CATEGORIES).map((c) => ({
        label: c.name,
        value: c.id,
      }));
    }, [categories]);

    useEffect(() => {
      if (open && editingAsset) {
        const resolvedCatId =
          editingAsset.categoryId ||
          (typeof editingAsset.category === 'string' ? editingAsset.category : undefined);

        form.setFieldsValue({
          tag: editingAsset.tag,
          serialNumber: editingAsset.serialNumber,
          name: editingAsset.name,
          manufacturer: editingAsset.manufacturer,
          model: editingAsset.model,
          categoryId: resolvedCatId,
          status: editingAsset.status,
          departmentId: editingAsset.departmentId,
          assignedToId: editingAsset.assignedToId,
          purchaseDate: editingAsset.purchaseDate ? dayjs(editingAsset.purchaseDate) : undefined,
          warrantyExpiry: editingAsset.warrantyExpiry
            ? dayjs(editingAsset.warrantyExpiry)
            : undefined,
          costCenterId:
            editingAsset.costCenterId ||
            (typeof editingAsset.costCenter === 'object' && editingAsset.costCenter
              ? editingAsset.costCenter.id
              : undefined),
          notes: editingAsset.notes,
        });
      }
    }, [open, editingAsset, form]);

    return (
      <Modal
        title={editingAsset ? `Edit Asset: ${editingAsset.tag}` : 'Create Asset'}
        open={open}
        onOk={onSave}
        onCancel={onCancel}
        confirmLoading={submitting}
        destroyOnHidden={true}
        width={720}
        okText={editingAsset ? 'Save Changes' : 'Create Asset'}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={form}
          layout="vertical"
          validateTrigger={['onChange', 'onBlur']}
          scrollToFirstError={true}
        >
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Asset Tag"
                name="tag"
                rules={[
                  formRules.required('Asset tag'),
                  formRules.sku('Asset tag'),
                  formRules.maxString('Asset tag', 100),
                ]}
              >
                <Input placeholder="e.g. AST-1042" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Serial Number"
                name="serialNumber"
                rules={[formRules.maxString('Serial number', 100)]}
              >
                <Input placeholder="e.g. C02G8392MD6R" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Device Name"
                name="name"
                rules={[
                  formRules.required('Device name'),
                  formRules.maxString('Device name', 100),
                ]}
              >
                <Input placeholder="e.g. MacBook Pro 16 M3 Max" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Manufacturer"
                name="manufacturer"
                rules={[
                  formRules.required('Manufacturer'),
                  formRules.maxString('Manufacturer', 100),
                ]}
              >
                <Input placeholder="e.g. Apple / Dell" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Model"
                name="model"
                rules={[formRules.maxString('Model', 100)]}
              >
                <Input placeholder="e.g. A2991" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Category"
                name="categoryId"
                rules={[{ required: true, message: 'Category is required' }]}
              >
                <Select
                  showSearch
                  allowClear
                  loading={loadingOptions}
                  placeholder="Select category"
                  options={categorySelectOptions}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true, message: 'Status is required' }]}
              >
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Owner Department" name="departmentId">
                <Select
                  showSearch
                  allowClear
                  loading={loadingOptions}
                  placeholder="Select owner department"
                  options={departments.map((d) => ({
                    label: d.organization?.name ? `${d.name} (${d.organization.name})` : d.name,
                    value: d.id,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Cost Center" name="costCenterId">
                <Select
                  placeholder="Select cost center"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={costCenters.map((cc) => ({
                    label: `${cc.code} - ${cc.name}`,
                    value: cc.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={24}>
              <Form.Item label="Assigned Custodian" name="assignedToId">
                <Select
                  showSearch
                  allowClear
                  loading={loadingOptions}
                  placeholder="Search employee by name, code, or email"
                  options={employees.map((u) => ({
                    label: `${u.fullName || `${u.firstName} ${u.lastName}`.trim()} (${u.employeeCode || u.email})`,
                    value: u.id,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Purchase Date" name="purchaseDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Warranty Expiry"
                name="warrantyExpiry"
                rules={[
                  formRules.chronologicalDate(
                    'purchaseDate',
                    'Purchase Date',
                    'Warranty Expiry',
                  ),
                ]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Notes"
            name="notes"
            rules={[formRules.maxString('Notes', 1000)]}
          >
            <Input.TextArea
              rows={2}
              autoSize={{ minRows: 2, maxRows: 6 }}
              maxLength={1000}
              showCount
              placeholder="Add deployment details, remarks, or notes..."
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  },
);

AssetFormModal.displayName = 'AssetFormModal';
