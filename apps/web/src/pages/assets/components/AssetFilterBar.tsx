import { FilterOutlined } from '@ant-design/icons';
import { Button, Col, Flex, Input, Row, Select } from 'antd';
import React from 'react';

const { Option } = Select;

export interface AssetFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  onReset: () => void;
}

export const AssetFilterBar: React.FC<AssetFilterBarProps> = React.memo(
  ({
    searchQuery,
    onSearchChange,
    categoryFilter,
    onCategoryChange,
    statusFilter,
    onStatusChange,
    onReset,
  }) => {
    const isFiltered = searchQuery || categoryFilter !== 'all' || statusFilter !== 'all';

    return (
      <Row gutter={[14, 14]} align="middle" justify="space-between" style={{ marginBottom: 16 }}>
        <Col xs={24} md={10}>
          <Input
            placeholder="Search tag, serial, model, user, location..."
            prefix={<FilterOutlined style={{ color: '#94a3b8' }} />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} md={14}>
          <Flex gap={10} justify="flex-end" wrap>
            <Select
              value={categoryFilter}
              onChange={onCategoryChange}
              style={{ width: 140 }}
              placeholder="Category"
            >
              <Option value="all">All Categories</Option>
              <Option value="Laptop">Laptops</Option>
              <Option value="Desktop">Desktops</Option>
              <Option value="Server">Servers</Option>
              <Option value="Monitor">Monitors</Option>
              <Option value="Networking">Networking</Option>
              <Option value="Mobile">Mobile</Option>
            </Select>

            <Select
              value={statusFilter}
              onChange={onStatusChange}
              style={{ width: 130 }}
              placeholder="Status"
            >
              <Option value="all">All Status</Option>
              <Option value="Active">Active</Option>
              <Option value="In Repair">In Repair</Option>
              <Option value="In Storage">In Storage</Option>
              <Option value="Retired">Retired</Option>
            </Select>

            {isFiltered && <Button onClick={onReset}>Reset</Button>}
          </Flex>
        </Col>
      </Row>
    );
  },
);

AssetFilterBar.displayName = 'AssetFilterBar';
