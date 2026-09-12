import {
  Col,
  DatePicker,
  Divider,
  Form,
  type FormInstance,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  TreeSelect,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { Asset, AssetCategory } from '../../../services/assets.service';
import { assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import {
  type Department,
  type LocationBranch,
  type LocationTreeNode,
  organizationService,
} from '../../../services/organization.service';

export interface AssetFormModalProps {
  open: boolean;
  editingAsset: Asset | null;
  form: FormInstance;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
  categories?: AssetCategory[];
  locations?: Array<LocationBranch | LocationTreeNode>;
  locationTree?: LocationTreeNode[];
  departments?: Department[];
  employees?: DirectoryUser[];
}

export interface FormattedLocationOption {
  key: string;
  value: string;
  title: string;
  label: string;
  children?: FormattedLocationOption[];
}

export function formatLocationTreeForSelect(
  nodes: Array<LocationTreeNode | LocationBranch>,
  parentPath = '',
): FormattedLocationOption[] {
  return nodes.map((node) => {
    const isTree = 'fullPath' in node || 'children' in node;
    const treeNode = node as LocationTreeNode;
    const branch = node as LocationBranch;

    const nodeTitle = node.name || (treeNode.title as string) || '';
    const fullPath =
      isTree && treeNode.fullPath
        ? treeNode.fullPath
        : parentPath
          ? `${parentPath} > ${nodeTitle}`
          : branch.building
            ? `${nodeTitle} (${branch.building}${branch.floor ? ` - ${branch.floor}` : ''})`
            : nodeTitle;

    const formattedChildren =
      treeNode.children && treeNode.children.length > 0
        ? formatLocationTreeForSelect(treeNode.children, fullPath)
        : undefined;

    return {
      key: node.id,
      value: node.id,
      title: nodeTitle,
      label: fullPath,
      children: formattedChildren,
    };
  });
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
    locations: propLocations,
    locationTree: propLocationTree,
    departments: propDepartments,
    employees: propEmployees,
  }) => {
    const [categories, setCategories] = useState<AssetCategory[]>(propCategories || []);
    const [locations, setLocations] = useState<Array<LocationBranch | LocationTreeNode>>(
      propLocationTree || propLocations || [],
    );
    const [departments, setDepartments] = useState<Department[]>(propDepartments || []);
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
      if (!open) return;

      let mounted = true;
      const fetchReferences = async () => {
        setLoadingOptions(true);
        try {
          const [cats, locs, depts, empRes] = await Promise.all([
            propCategories ? Promise.resolve(propCategories) : assetsService.getCategories(),
            propLocationTree
              ? Promise.resolve(propLocationTree)
              : propLocations
                ? Promise.resolve(propLocations)
                : organizationService
                    .getLocationTree()
                    .catch(() => organizationService.getLocations()),
            propDepartments
              ? Promise.resolve(propDepartments)
              : organizationService.getDepartments().catch(() => []),
            propEmployees
              ? Promise.resolve({ items: propEmployees })
              : directoryService.getEmployees({ pageSize: 100 }),
          ]);

          if (mounted) {
            setCategories(cats);
            setLocations(locs as Array<LocationBranch | LocationTreeNode>);
            setDepartments(depts);
            setEmployees(empRes.items || []);
          }
        } catch (_error: unknown) {
          // Graceful fallback: maintain available local state
        } finally {
          if (mounted) setLoadingOptions(false);
        }
      };

      fetchReferences();

      return () => {
        mounted = false;
      };
    }, [open, propCategories, propDepartments, propEmployees, propLocationTree, propLocations]);

    const locationTreeData = useMemo(() => formatLocationTreeForSelect(locations), [locations]);

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
        <Form form={form} layout="vertical">
          <Row gutter={14}>
            <Col span={12}>
              <Form.Item
                label="Asset Tag"
                name="tag"
                rules={[{ required: true, message: 'Asset tag is required' }]}
              >
                <Input placeholder="e.g. AST-1042" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Serial Number"
                name="serialNumber"
                rules={[{ required: true, message: 'Serial number is required' }]}
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
                rules={[{ required: true, message: 'Device name is required' }]}
              >
                <Input placeholder="e.g. MacBook Pro 16 M3 Max" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Manufacturer"
                name="manufacturer"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="e.g. Apple / Dell" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Model" name="model">
                <Input placeholder="e.g. A2991" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={8}>
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
                  options={categories.map((c) => ({
                    label: c.name,
                    value: c.id,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Status" name="status" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Purchase Price ($)" name="purchasePrice">
                <InputNumber style={{ width: '100%' }} prefix="$" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={14}>
            <Col span={12}>
              <Form.Item label="Physical Location" name="locationId">
                <TreeSelect
                  showSearch
                  allowClear
                  treeDefaultExpandAll={false}
                  placeholder="Select facility / workshop / line / station"
                  treeNodeFilterProp="title"
                  treeNodeLabelProp="label"
                  treeData={locationTreeData}
                  loading={loadingOptions}
                  style={{ width: '100%' }}
                />
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
              <Form.Item label="Warranty Expiry" name="warrantyExpiry">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0 14px 0' }}>Technical Specifications</Divider>

          <Row gutter={14}>
            <Col span={6}>
              <Form.Item label="Processor (CPU)" name="cpu">
                <Input placeholder="e.g. M3 Max 16-Core" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Memory (RAM)" name="ram">
                <Input placeholder="e.g. 64 GB" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Storage (SSD)" name="storage">
                <Input placeholder="e.g. 1 TB NVMe" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Operating System" name="os">
                <Input placeholder="e.g. macOS Sonoma" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea
              rows={2}
              placeholder="Add deployment details or dock serial number..."
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  },
);

AssetFormModal.displayName = 'AssetFormModal';
