import { FilterOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Input, Row, Select, Tooltip } from 'antd';
import React from 'react';

export interface AssetFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
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
    searchQuery,
    onSearchChange,
    categoryFilter,
    onCategoryChange,
    statusFilter,
    onStatusChange,
    onReset,
    onScanQr,
  }) => {
    const isFiltered = searchQuery || categoryFilter !== 'all' || statusFilter !== 'all';

    return (
      <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
        <Col xs={24} md={10}>
          <Flex gap={8}>
            <Input
              placeholder="Search tag, serial, model, user, location..."
              prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
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
        <Col xs={24} md={14}>
          <Flex gap={10} justify="flex-end" wrap>
            <Select
              value={categoryFilter}
              onChange={onCategoryChange}
              style={{ width: 140 }}
              placeholder="Category"
              options={CATEGORY_FILTER_OPTIONS}
            />

            <Select
              value={statusFilter}
              onChange={onStatusChange}
              style={{ width: 130 }}
              placeholder="Status"
              options={STATUS_FILTER_OPTIONS}
            />

            {isFiltered && <Button onClick={onReset}>Reset</Button>}
          </Flex>
        </Col>
      </Row>
    );
  },
);

AssetFilterBar.displayName = 'AssetFilterBar';
