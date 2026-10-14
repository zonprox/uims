import {
  ApartmentOutlined,
  CloudServerOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Button, Flex, Input, Segmented, Space, Typography } from 'antd';
import React from 'react';
import type { TopologyViewMode } from './types';

const { Text } = Typography;

export interface TopologyToolbarProps {
  viewMode: TopologyViewMode;
  onViewModeChange: (mode: TopologyViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAutoLayoutHierarchical?: () => void;
  onAutoLayoutRackGrouped?: () => void;
  onOpenPatchModal?: () => void;
  onSaveLayout?: () => void;
  hasUnsavedLayout?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  totalNodes?: number;
  totalEdges?: number;
  cameraCount?: number;
}

export const TopologyToolbar: React.FC<TopologyToolbarProps> = React.memo(
  ({
    viewMode,
    onViewModeChange,
    searchQuery,
    onSearchChange,
    onAutoLayoutHierarchical,
    onAutoLayoutRackGrouped,
    onOpenPatchModal,
    onSaveLayout,
    hasUnsavedLayout,
    onRefresh,
    loading,
    totalNodes,
    totalEdges,
    cameraCount,
  }) => {
    return (
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        {/* Perspective Switcher */}
        <Space size={12}>
          <Segmented
            value={viewMode}
            onChange={(val) => onViewModeChange(val as TopologyViewMode)}
            options={[
              { label: 'All Infrastructure', value: 'ALL', icon: <ApartmentOutlined /> },
              { label: 'Network Only', value: 'NETWORK', icon: <CloudServerOutlined /> },
              { label: 'CCTV System', value: 'CCTV', icon: <EyeOutlined /> },
            ]}
            data-testid="topology-view-switcher"
          />
          {totalNodes !== undefined && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {totalNodes} Nodes · {totalEdges ?? 0} Links
              {cameraCount !== undefined ? ` · ${cameraCount} Cameras` : ''}
            </Text>
          )}
        </Space>

        {/* Actions */}
        <Space size={8}>
          <Input.Search
            placeholder="Search node, IP, MAC, camera..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: 220 }}
            allowClear
            data-testid="topology-search-input"
          />
          {onAutoLayoutHierarchical && (
            <Button onClick={onAutoLayoutHierarchical}>Auto Layout</Button>
          )}
          {onAutoLayoutRackGrouped && (
            <Button onClick={onAutoLayoutRackGrouped}>Rack Group</Button>
          )}
          {onSaveLayout && (
            <Button
              icon={<SaveOutlined />}
              onClick={onSaveLayout}
              disabled={!hasUnsavedLayout}
              data-testid="save-layout-button"
            >
              Save Layout
            </Button>
          )}
          {onOpenPatchModal && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onOpenPatchModal}
              data-testid="patch-cable-button"
            >
              Patch Cable
            </Button>
          )}
          {onRefresh && (
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={onRefresh}
              aria-label="Refresh"
            />
          )}
        </Space>
      </Flex>
    );
  },
);

TopologyToolbar.displayName = 'TopologyToolbar';
