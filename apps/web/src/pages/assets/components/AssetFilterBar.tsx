import { FilterOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Input, Row, Select, Tooltip } from 'antd';
import React, { useMemo } from 'react';
import type { AssetCategory } from '../../../services/assets.service';
import type { AssetFilterState } from '../hooks/useAssetManagement';

export interface AssetFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  orgFilter?: string;
  onOrgChange?: (val: string) => void;
  orgOptions?: Array<{ label: string; value: string }>;
  categories?: AssetCategory[];
  categoryFilter?: string;
  onCategoryChange?: (val: string) => void;
  statusFilter?: string;
  onStatusChange?: (val: string) => void;
  modelFilter?: string;
  onModelChange?: (val: string) => void;
  modelOptions?: Array<{ label: string; value: string }>;
  custodianFilter?: string;
  onCustodianChange?: (val: string) => void;
  custodianOptions?: Array<{ label: string; value: string }>;
  departmentFilter?: string;
  onDepartmentChange?: (val: string) => void;
  departmentOptions?: Array<{ label: string; value: string }>;
  hasPendingRecordFilter?: string;
  onPendingRecordChange?: (val: string) => void;
  filterState?: Partial<AssetFilterState>;
  onFilterChange?: (key: string, val: string | undefined) => void;
  onReset: () => void;
  onScanQr?: () => void;
}

export const CATEGORY_FILTER_OPTIONS = [
  { label: 'All Categories', value: 'all' },
  { label: 'Laptops', value: 'cat-laptop' },
  { label: 'Desktops', value: 'cat-desktop' },
  { label: 'Servers', value: 'cat-server' },
  { label: 'Network Switches', value: 'cat-switch' },
  { label: 'Routers & Firewalls', value: 'cat-router' },
  { label: 'Wireless Access Points', value: 'cat-ap' },
  { label: 'Monitors & Displays', value: 'cat-monitor' },
  { label: 'Printers & Scanners', value: 'cat-printer' },
  { label: 'Storage', value: 'cat-storage' },
  { label: 'Power & UPS', value: 'cat-ups' },
  { label: 'Peripherals & Accessories', value: 'cat-peripheral' },
];

export const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Available (Storage)', value: 'AVAILABLE' },
  { label: 'In Use (Assigned)', value: 'IN_USE' },
  { label: 'Maintenance (Repair)', value: 'MAINTENANCE' },
  { label: 'Retired', value: 'RETIRED' },
  { label: 'Lost', value: 'LOST' },
  { label: 'Active', value: 'Active' },
  { label: 'In Repair', value: 'In Repair' },
  { label: 'In Storage', value: 'In Storage' },
];

export const PENDING_RECORD_FILTER_OPTIONS = [
  { label: 'All Compliance', value: 'all' },
  { label: 'Pending Documents', value: 'pending' },
  { label: 'Fully Compliant', value: 'compliant' },
];

export const AssetFilterBar: React.FC<AssetFilterBarProps> = React.memo(
  ({
    searchQuery = '',
    onSearchChange,
    orgFilter = 'all',
    onOrgChange,
    orgOptions = [],
    categories: propCategories,
    categoryFilter = 'all',
    onCategoryChange,
    statusFilter = 'all',
    onStatusChange,
    modelFilter = 'all',
    onModelChange,
    modelOptions = [],
    custodianFilter = 'all',
    onCustodianChange,
    custodianOptions = [],
    departmentFilter = 'all',
    onDepartmentChange,
    departmentOptions = [],
    hasPendingRecordFilter = 'all',
    onPendingRecordChange,
    onReset,
    onScanQr,
  }) => {
    const categoryOptions = useMemo(() => {
      if (propCategories && propCategories.length > 0) {
        return [
          { label: 'All Categories', value: 'all' },
          ...propCategories.map((c) => ({
            label: c.name,
            value: c.id,
          })),
        ];
      }
      return CATEGORY_FILTER_OPTIONS;
    }, [propCategories]);

    const isFiltered =
      Boolean(searchQuery) ||
      orgFilter !== 'all' ||
      categoryFilter !== 'all' ||
      statusFilter !== 'all' ||
      modelFilter !== 'all' ||
      custodianFilter !== 'all' ||
      departmentFilter !== 'all' ||
      hasPendingRecordFilter !== 'all';

    const handleReset = () => {
      onReset();
    };

    return (
      <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
        <Col xs={24} md={6}>
          <Flex gap={8}>
            <Input
              placeholder="Search tag, serial, model, user..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              allowClear
            />
            {onScanQr && (
              <Tooltip title="Scan Asset QR Code">
                <Button icon={<QrcodeOutlined />} onClick={onScanQr}>
                  Scan QR
                </Button>
              </Tooltip>
            )}
          </Flex>
        </Col>
        <Col xs={24} md={18}>
          <Flex gap={10} justify="flex-end" wrap>
            {onModelChange && modelOptions.length > 0 && (
              <Select
                value={modelFilter}
                onChange={onModelChange}
                style={{ width: 160 }}
                placeholder="Device Model"
                showSearch={{ optionFilterProp: 'label' }}
                options={[{ label: 'All Models', value: 'all' }, ...modelOptions]}
              />
            )}

            {onCustodianChange && custodianOptions.length > 0 && (
              <Select
                value={custodianFilter}
                onChange={onCustodianChange}
                style={{ width: 160 }}
                placeholder="Custodian"
                showSearch={{ optionFilterProp: 'label' }}
                options={[{ label: 'All Custodians', value: 'all' }, ...custodianOptions]}
              />
            )}

            {onDepartmentChange && departmentOptions.length > 0 && (
              <Select
                value={departmentFilter}
                onChange={onDepartmentChange}
                style={{ width: 150 }}
                placeholder="Department"
                showSearch={{ optionFilterProp: 'label' }}
                options={[{ label: 'All Departments', value: 'all' }, ...departmentOptions]}
              />
            )}

            {onPendingRecordChange && (
              <Select
                value={hasPendingRecordFilter}
                onChange={onPendingRecordChange}
                style={{ width: 165 }}
                placeholder="Compliance Status"
                options={PENDING_RECORD_FILTER_OPTIONS}
              />
            )}

            {onOrgChange && (
              <Select
                value={orgFilter}
                onChange={onOrgChange}
                style={{ width: 160 }}
                placeholder="Organization"
                options={[{ label: 'All Organizations', value: 'all' }, ...orgOptions]}
              />
            )}

            {onCategoryChange && (
              <Select
                value={categoryFilter}
                onChange={onCategoryChange}
                style={{ width: 160 }}
                placeholder="Category"
                options={categoryOptions}
              />
            )}

            {onStatusChange && (
              <Select
                value={statusFilter}
                onChange={onStatusChange}
                style={{ width: 160 }}
                placeholder="Status"
                options={STATUS_FILTER_OPTIONS}
              />
            )}

            {isFiltered && <Button onClick={handleReset}>Reset</Button>}
          </Flex>
        </Col>
      </Row>
    );
  },
);

AssetFilterBar.displayName = 'AssetFilterBar';
