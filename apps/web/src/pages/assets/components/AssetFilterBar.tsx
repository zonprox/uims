import { FilterOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Input, Row, Select, Tooltip, TreeSelect } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import type { LocationBranch, LocationTreeNode } from '../../../services/organization.service';
import { organizationService } from '../../../services/organization.service';
import type { AssetFilterState } from '../hooks/useAssetManagement';
import { formatLocationTreeForSelect } from './AssetFormModal';

export interface AssetFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  orgFilter?: string;
  onOrgChange?: (val: string) => void;
  orgOptions?: Array<{ label: string; value: string }>;
  categoryFilter?: string;
  onCategoryChange?: (val: string) => void;
  statusFilter?: string;
  onStatusChange?: (val: string) => void;
  locationFilter?: string;
  onLocationChange?: (val: string | undefined) => void;
  locationTree?: Array<LocationTreeNode | LocationBranch>;
  filterState?: Partial<AssetFilterState>;
  onFilterChange?: (key: string, val: string | undefined) => void;
  onReset: () => void;
  onScanQr?: () => void;
}

const CATEGORY_FILTER_OPTIONS = [
  { label: 'All Categories', value: 'all' },
  { label: 'Laptops', value: 'Laptop' },
  { label: 'Desktops', value: 'Desktop' },
  { label: 'Servers', value: 'Server' },
  { label: 'Monitors', value: 'Monitor' },
  { label: 'Networking', value: 'Networking' },
  { label: 'Mobile', value: 'Mobile' },
];

const STATUS_FILTER_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'Active' },
  { label: 'In Repair', value: 'In Repair' },
  { label: 'In Storage', value: 'In Storage' },
  { label: 'Retired', value: 'Retired' },
];

export const AssetFilterBar: React.FC<AssetFilterBarProps> = React.memo(
  ({
    searchQuery = '',
    onSearchChange,
    orgFilter = 'all',
    onOrgChange,
    orgOptions = [],
    categoryFilter = 'all',
    onCategoryChange,
    statusFilter = 'all',
    onStatusChange,
    locationFilter,
    onLocationChange,
    locationTree: propLocations,
    filterState,
    onFilterChange,
    onReset,
    onScanQr,
  }) => {
    const [locations, setLocations] = useState<Array<LocationTreeNode | LocationBranch>>(
      propLocations || [],
    );
    const [loadingLocations, setLoadingLocations] = useState(false);

    useEffect(() => {
      if (propLocations && propLocations.length > 0) {
        setLocations(propLocations);
        return;
      }

      let mounted = true;
      setLoadingLocations(true);
      const orgId = orgFilter !== 'all' ? orgFilter : undefined;
      organizationService
        .getLocationTree(orgId)
        .then((tree) => {
          if (mounted) {
            setLocations(tree);
          }
        })
        .catch(() => {
          if (mounted) {
            organizationService
              .getLocations()
              .then((locs) => {
                if (mounted) setLocations(locs);
              })
              .catch(() => {});
          }
        })
        .finally(() => {
          if (mounted) setLoadingLocations(false);
        });

      return () => {
        mounted = false;
      };
    }, [propLocations, orgFilter]);

    const formattedLocationTree = useMemo(
      () => formatLocationTreeForSelect(locations),
      [locations],
    );

    const [internalLocation, setInternalLocation] = useState<string | undefined>(undefined);
    const activeLocation = filterState?.locationFilter ?? locationFilter ?? internalLocation;

    const isFiltered =
      Boolean(searchQuery) ||
      orgFilter !== 'all' ||
      categoryFilter !== 'all' ||
      statusFilter !== 'all' ||
      Boolean(activeLocation);

    const handleReset = () => {
      setInternalLocation(undefined);
      onReset();
    };

    return (
      <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Flex gap={8}>
            <Input
              placeholder="Search tag, serial, model, user, location..."
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
        <Col xs={24} md={16}>
          <Flex gap={10} justify="flex-end" wrap>
            {onOrgChange && (
              <Select
                value={orgFilter}
                onChange={onOrgChange}
                style={{ width: 160 }}
                placeholder="Organization"
                options={[{ label: 'All Organizations', value: 'all' }, ...orgOptions]}
              />
            )}

            <TreeSelect
              value={activeLocation}
              onChange={(val) => {
                setInternalLocation(val);
                onFilterChange?.('locationFilter', val);
                onLocationChange?.(val);
              }}
              style={{ width: 190 }}
              placeholder="Location / Facility"
              allowClear
              showSearch
              treeNodeFilterProp="title"
              treeNodeLabelProp="label"
              treeData={formattedLocationTree}
              treeDefaultExpandAll={false}
              loading={loadingLocations}
            />

            {onCategoryChange && (
              <Select
                value={categoryFilter}
                onChange={onCategoryChange}
                style={{ width: 135 }}
                placeholder="Category"
                options={CATEGORY_FILTER_OPTIONS}
              />
            )}

            {onStatusChange && (
              <Select
                value={statusFilter}
                onChange={onStatusChange}
                style={{ width: 125 }}
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
