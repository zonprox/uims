import {
  App,
  Button,
  Col,
  DatePicker,
  Form,
  type FormInstance,
  Input,
  Modal,
  Row,
  Select,
  Space,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import type { Asset, AssetCategory, CostCenter } from '../../../services/assets.service';
import { assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import {
  type Department,
  organizationService,
} from '../../../services/organization.service';
import { api } from '../../../services/api';
import { formatErrorMessage } from '../../../utils/feedback';
import { formRules, isValidationError } from '../../../utils/formValidators';

export interface PhysicalUnitModalProps {
  open: boolean;
  editingAsset?: Asset | null;
  initialParentId?: string;
  form?: FormInstance;
  submitting?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  onSuccess?: () => void;
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

const DEFAULT_COST_CENTERS: CostCenter[] = [
  { id: 'cc-it-ops', code: 'IT-OPS', name: 'IT Operations & Infrastructure' },
  { id: 'cc-eng-dev', code: 'ENG-DEV', name: 'Software Engineering & DevOps' },
  { id: 'cc-fin-acc', code: 'FIN-ACC', name: 'Finance & Corporate Accounting' },
  { id: 'cc-hr-admin', code: 'HR-ADMIN', name: 'Human Resources & General Administration' },
];

export const PhysicalUnitModal: React.FC<PhysicalUnitModalProps> = React.memo(
  ({
    open,
    editingAsset,
    initialParentId,
    form: propForm,
    submitting: propSubmitting,
    onSave,
    onCancel,
    onClose,
    onSuccess,
    categories: propCategories,
    departments: propDepartments,
    employees: propEmployees,
  }) => {
    const { message, notification } = App.useApp();
    const [internalForm] = Form.useForm();
    const activeForm = propForm || internalForm;

    const [internalSubmitting, setInternalSubmitting] = useState(false);
    const isSubmitting = propSubmitting ?? internalSubmitting;

    const [_categories, setCategories] = useState<AssetCategory[]>(propCategories || []);
    const [departments, setDepartments] = useState<Department[]>(propDepartments || []);
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [deviceModels, setDeviceModels] = useState<Asset[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>(DEFAULT_COST_CENTERS);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
      if (!open) return;

      let mounted = true;
      setLoadingOptions(true);

      const fetchReferences = async () => {
        try {
          const [catResult, deptResult, empResult, modelsResult, ccResult] =
            await Promise.allSettled([
              propCategories ? Promise.resolve(propCategories) : assetsService.getCategories(),
              propDepartments
                ? Promise.resolve(propDepartments)
                : organizationService.getDepartments(),
              propEmployees
                ? Promise.resolve({ items: propEmployees })
                : directoryService.getEmployees({ pageSize: 100 }),
              api.get('/assets/models').then((res) => res.data?.data || res.data || []),
              assetsService.getCostCenters(),
            ]);

          if (!mounted) return;

          if (catResult.status === 'fulfilled') setCategories(catResult.value);
          if (deptResult.status === 'fulfilled') setDepartments(deptResult.value);
          if (empResult.status === 'fulfilled') setEmployees(empResult.value.items || []);
          if (modelsResult.status === 'fulfilled' && Array.isArray(modelsResult.value)) {
            setDeviceModels(modelsResult.value);
          }
          if (ccResult.status === 'fulfilled' && Array.isArray(ccResult.value)) {
            setCostCenters(ccResult.value);
          }
        } catch (_err: unknown) {
          // Graceful degradation for auxiliary options
        } finally {
          if (mounted) setLoadingOptions(false);
        }
      };

      fetchReferences();

      return () => {
        mounted = false;
      };
    }, [open, propCategories, propDepartments, propEmployees]);

    useEffect(() => {
      if (!open) return;

      if (editingAsset) {
        const rawSubcode = editingAsset.subcode || editingAsset.tag;
        activeForm.setFieldsValue({
          subcode: rawSubcode,
          tag: rawSubcode,
          parentId: editingAsset.parentId,
          serialNumber: editingAsset.serialNumber,
          name: editingAsset.name,
          manufacturer: editingAsset.manufacturer,
          model: editingAsset.model,
          categoryId:
            editingAsset.categoryId ||
            (typeof editingAsset.category === 'string' ? editingAsset.category : undefined),
          status: editingAsset.status || 'Active',
          costCenterId:
            editingAsset.costCenterId ||
            (typeof editingAsset.costCenter === 'object' ? editingAsset.costCenter?.id : undefined),
          customCostCenter:
            typeof editingAsset.costCenter === 'string'
              ? editingAsset.costCenter
              : undefined,
          departmentId: editingAsset.departmentId,
          assignedToId: editingAsset.assignedToId,
          purchaseDate: editingAsset.purchaseDate ? dayjs(editingAsset.purchaseDate) : undefined,
          warrantyExpiry: editingAsset.warrantyExpiry
            ? dayjs(editingAsset.warrantyExpiry)
            : undefined,
          notes: editingAsset.notes,
        });
      } else {
        activeForm.resetFields();
        activeForm.setFieldsValue({
          subcode: `AST-${Math.floor(1000 + Math.random() * 9000)}`,
          parentId: initialParentId,
          status: 'Active',
          purchaseDate: dayjs(),
          warrantyExpiry: dayjs().add(3, 'year'),
        });
      }
    }, [open, editingAsset, initialParentId, activeForm]);

    const handleFormSubmit = async () => {
      if (onSave) {
        onSave();
        return;
      }

      try {
        const values = await activeForm.validateFields();
        setInternalSubmitting(true);

        const subcode = (values.subcode || values.tag || '').trim().toUpperCase();
        const payload = {
          ...values,
          subcode,
          tag: subcode,
          parentId: values.parentId || undefined,
          serialNumber: values.serialNumber ? values.serialNumber.trim() : undefined,
          costCenterId: values.costCenterId || undefined,
          costCenter: values.customCostCenter ? values.customCostCenter.trim() : undefined,
          status: values.status || 'Active',
          departmentId: values.departmentId || undefined,
          assignedToId: values.assignedToId || undefined,
          purchaseDate: values.purchaseDate
            ? dayjs(values.purchaseDate).format('YYYY-MM-DD')
            : undefined,
          warrantyExpiry: values.warrantyExpiry
            ? dayjs(values.warrantyExpiry).format('YYYY-MM-DD')
            : undefined,
          notes: values.notes ? values.notes.trim() : undefined,
        };

        if (editingAsset) {
          await api.patch(`/assets/units/${editingAsset.id}`, payload);
          message.success(`Physical unit "${subcode}" updated successfully.`);
        } else {
          await api.post('/assets/units', payload);
          message.success(`Physical unit "${subcode}" registered successfully.`);
        }

        onSuccess?.();
        onClose?.();
      } catch (err: unknown) {
        if (isValidationError(err)) return;
        const anyErr = err as {
          response?: { status?: number; data?: { message?: string } };
          status?: number;
        };
        if (anyErr?.response?.status === 409 || anyErr?.status === 409) {
          const rawSubcode = (activeForm.getFieldValue('subcode') || '').toUpperCase();
          notification.error({
            message: 'Duplicate SUB Code',
            description: `Physical unit with subcode "${rawSubcode}" already exists. Please specify a unique SUB Code.`,
          });
        } else if (err instanceof Error && err.name !== 'ValidationError') {
          message.error(
            formatErrorMessage(
              err,
              editingAsset ? 'update physical unit' : 'register physical unit',
            ),
          );
        }
      } finally {
        setInternalSubmitting(false);
      }
    };

    const handleClose = () => {
      if (onCancel) onCancel();
      else if (onClose) onClose();
    };

    return (
      <Modal
        title={
          editingAsset
            ? `Edit Physical Unit: ${editingAsset.subcode || editingAsset.tag}`
            : 'Register Physical Unit'
        }
        open={open}
        onOk={handleFormSubmit}
        onCancel={handleClose}
        confirmLoading={isSubmitting}
        destroyOnHidden={true}
        width={720}
        okText={editingAsset ? 'Save Changes' : 'Register Unit'}
        styles={{ body: { paddingTop: 16 } }}
        footer={
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" loading={isSubmitting} onClick={handleFormSubmit}>
              {editingAsset ? 'Save Changes' : 'Register Unit'}
            </Button>
          </Space>
        }
      >
        <Form
          form={activeForm}
          layout="vertical"
          requiredMark="optional"
          validateTrigger={['onChange', 'onBlur']}
          scrollToFirstError={true}
        >
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="SUB Code"
                name="subcode"
                rules={[
                  formRules.required('SUB code'),
                  formRules.sku('SUB code'),
                  formRules.maxString('SUB code', 50),
                ]}
                extra="Physical unit unique inventory tag (e.g. AST-DELL-001). Uppercase."
              >
                <Input
                  placeholder="e.g. AST-DELL-001"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  onChange={(e) => {
                    activeForm.setFieldsValue({
                      subcode: e.target.value.toUpperCase(),
                      tag: e.target.value.toUpperCase(),
                    });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Parent Device Model"
                name="parentId"
                extra="Catalog model under which this physical unit is cataloged."
              >
                <Select
                  showSearch
                  allowClear
                  loading={loadingOptions}
                  placeholder="Select device model"
                  options={deviceModels.map((m) => ({
                    label: `${m.name} [${m.assetCode || m.tag}]`,
                    value: m.id,
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
              <Form.Item
                label="Serial Number"
                name="serialNumber"
                rules={[formRules.maxString('Serial number', 100)]}
              >
                <Input placeholder="e.g. C02G8392MD6R" style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Cost Center" name="costCenterId">
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
          </Row>

          <Row gutter={14}>
            <Col span={24}>
              <Form.Item
                label="Cost Center (Manual / Custom Entry)"
                name="customCostCenter"
                tooltip="Type custom cost center code/name if not listed in the dropdown"
                rules={[formRules.maxString('Cost center', 50)]}
              >
                <Input placeholder="e.g. IT-OPS / ENG-DEV / CC-1002" allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true, message: 'Status is required' }]}
              >
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
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

PhysicalUnitModal.displayName = 'PhysicalUnitModal';
