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
} from 'antd';
import React, { useEffect, useState } from 'react';
import type { Asset, AssetCategory } from '../../../services/assets.service';
import { assetsService } from '../../../services/assets.service';
import { type DirectoryUser, directoryService } from '../../../services/directory.service';
import { networkService } from '../../../services/network.service';
import { type LocationBranch, organizationService } from '../../../services/organization.service';

export interface AssetFormModalProps {
  open: boolean;
  editingAsset: Asset | null;
  form: FormInstance;
  submitting: boolean;
  onSave: () => void;
  onCancel: () => void;
  categories?: AssetCategory[];
  locations?: LocationBranch[];
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
    locations: propLocations,
    employees: propEmployees,
  }) => {
    const [categories, setCategories] = useState<AssetCategory[]>(propCategories || []);
    const [locations, setLocations] = useState<LocationBranch[]>(propLocations || []);
    const [employees, setEmployees] = useState<DirectoryUser[]>(propEmployees || []);
    const [credentials, setCredentials] = useState<
      Array<{ id: string; name: string; username: string; protocol?: string | null }>
    >([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    useEffect(() => {
      if (!open) return;

      let mounted = true;
      const fetchReferences = async () => {
        setLoadingOptions(true);
        try {
          const [cats, locs, empRes, creds] = await Promise.all([
            propCategories ? Promise.resolve(propCategories) : assetsService.getCategories(),
            propLocations ? Promise.resolve(propLocations) : organizationService.getLocations(),
            propEmployees
              ? Promise.resolve({ items: propEmployees })
              : directoryService.getEmployees({ pageSize: 100 }),
            networkService.getCredentials(),
          ]);

          if (mounted) {
            setCategories(cats);
            setLocations(locs);
            setEmployees(empRes.items || []);
            setCredentials(creds);
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
    }, [open, propCategories, propEmployees, propLocations]);

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
            <Col span={12}>
              <Form.Item label="Physical Location" name="locationId">
                <Select
                  showSearch
                  allowClear
                  loading={loadingOptions}
                  placeholder="Select facility / site"
                  options={locations.map((loc) => ({
                    label: `${loc.name}${loc.building ? ` (${loc.building}${loc.floor ? ` - ${loc.floor}` : ''})` : ''}`,
                    value: loc.id,
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
              <Form.Item label="Management Credential" name="credentialId">
                <Select
                  showSearch
                  allowClear
                  loading={loadingOptions}
                  placeholder="Select device credential (optional)"
                  options={credentials.map((cred) => ({
                    label: `${cred.name} (${cred.username}${cred.protocol ? ` • ${cred.protocol}` : ''})`,
                    value: cred.id,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Purchase Date" name="purchaseDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
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
