import {
  ApartmentOutlined,
  CloudServerOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { App, Button, Card, Flex, Input, Select, Segmented, Space, Spin, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import type { Asset } from '../../../../services/assets.service';
import type {
  NetworkRack,
  NetworkSwitch,
  Subnet,
  SwitchPort,
  VLAN,
} from '../../../../services/network.service';
import { networkService } from '../../../../services/network.service';
import { useTopologyStore } from '../../../../stores/topology.store';
import { formatErrorMessage } from '../../../../utils/feedback';
import { AssetDetailDrawer } from '../../../assets/components/AssetDetailDrawer';
import { PortConfigDrawer } from '../PortConfigDrawer';
import { RackElevationDrawer } from '../RackElevationDrawer';
import { SwitchFaceplateDrawer } from '../SwitchFaceplateDrawer';
import { CablePatchModal } from './CablePatchModal';
import { NetworkTopologyCanvas } from './NetworkTopologyCanvas';
import { TopologySummaryBar } from './TopologySummaryBar';
import { calculateHierarchicalLayout, calculateRackGroupLayout } from './topologyLayout.util';
import type {
  NetworkTopologyGraph,
  TopologyEdge,
  TopologyNode,
  TopologyViewMode,
} from './types';
import { useSaveTopologyLayoutMutation, useTopologyGraph } from './useTopologyQuery';

const { Text } = Typography;

export interface TopologyMapTabProps {
  vlans: VLAN[];
  subnets: Subnet[];
  assets: Asset[];
  onSelectSwitch?: (switchId: string) => void;
  onSelectRack?: (rackId: string) => void;
}

export const TopologyMapTab: React.FC<TopologyMapTabProps> = React.memo(
  ({ vlans, subnets, assets, onSelectSwitch, onSelectRack }) => {
    const { message } = App.useApp();

    // Zustand global topology store
    const {
      viewMode,
      setViewMode,
      filters,
      setFilter,
      searchQuery,
      setSearchQuery,
    } = useTopologyStore();

    // TanStack Query for authoritative backend topology data
    const {
      data: topologyData,
      isLoading,
      refetch,
    } = useTopologyGraph(viewMode as TopologyViewMode, filters as Record<string, string | undefined>);

    // Layout mutation
    const saveLayoutMutation = useSaveTopologyLayoutMutation();

    // Query switches on demand for CablePatchModal and fallback lookups
    const { data: allSwitches = [] } = useQuery({
      queryKey: ['network', 'switches', 'fleet'],
      queryFn: () => networkService.getSwitches({ limit: 100 }),
      staleTime: 60_000,
    });

    // Local mutable graph data to support instant drag-and-drop & auto-layout before saving
    const [graphData, setGraphData] = useState<NetworkTopologyGraph | null>(null);
    const [hasUnsavedLayout, setHasUnsavedLayout] = useState(false);

    // Synchronize local graph state when topology query resolves
    useEffect(() => {
      if (topologyData) {
        const nodes: TopologyNode[] = (topologyData.nodes || []).map((n) => ({
          ...n,
          type: n.type as TopologyNode['type'],
          status: n.status as TopologyNode['status'],
          domain: n.domain as TopologyNode['domain'],
        }));

        const edges: TopologyEdge[] = (topologyData.edges || []).map((e) => ({
          ...e,
          status: e.status as TopologyEdge['status'],
          domain: e.domain as TopologyEdge['domain'],
        }));

        const racks: NetworkRack[] = (topologyData.racks || []).map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          status: r.status,
          positionX: r.positionX,
          positionY: r.positionY,
        } as NetworkRack));

        setGraphData({
          nodes,
          edges,
          racks,
          vlans,
          subnets,
          summaryMetrics: {
            totalNodes: topologyData.metrics?.totalNodes ?? nodes.length,
            totalEdges: topologyData.metrics?.totalEdges ?? edges.length,
            activeLinks: topologyData.metrics?.activeLinks ?? edges.length,
            downLinks: topologyData.metrics?.downLinks ?? 0,
            poePowerLinks: topologyData.metrics?.poePowerUsageWatts ?? 0,
            poePowerUsageWatts: topologyData.metrics?.poePowerUsageWatts ?? 0,
            cameraCount: topologyData.metrics?.totalCameras ?? 0,
            switchCount: topologyData.metrics?.totalSwitches ?? 0,
          },
        });
        setHasUnsavedLayout(false);
      }
    }, [topologyData, vlans, subnets]);

    // Contextual Drawer States
    const [selectedRack, setSelectedRack] = useState<NetworkRack | null>(null);
    const [rackDrawerOpen, setRackDrawerOpen] = useState(false);

    const [selectedSwitch, setSelectedSwitch] = useState<NetworkSwitch | null>(null);
    const [switchDrawerOpen, setSwitchDrawerOpen] = useState(false);

    const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);
    const [portDrawerOpen, setPortDrawerOpen] = useState(false);

    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);

    // Cable Patch Modal State
    const [patchModalOpen, setPatchModalOpen] = useState(false);

    // Node position mutation
    const handleNodePositionChange = useCallback((nodeId: string, x: number, y: number) => {
      setGraphData((prev) => {
        if (!prev) return prev;
        const updated = prev.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n));
        return { ...prev, nodes: updated };
      });
      setHasUnsavedLayout(true);
    }, []);

    // Save layout coordinates to backend
    const handleSaveLayout = useCallback(async () => {
      if (!graphData) return;
      try {
        const positions: Record<string, { x: number; y: number }> = {};
        for (const n of graphData.nodes) {
          positions[n.id] = { x: n.x, y: n.y };
        }
        await saveLayoutMutation.mutateAsync({
          mode: viewMode as TopologyViewMode,
          positions,
        });
        message.success('Topology layout saved successfully');
        setHasUnsavedLayout(false);
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'save topology layout coordinates'));
      }
    }, [graphData, viewMode, saveLayoutMutation, message]);

    // Auto-Layout: Hierarchical
    const handleAutoLayoutHierarchical = useCallback(() => {
      if (!graphData) return;
      const positions = calculateHierarchicalLayout(graphData.nodes, graphData.edges);
      setGraphData((prev) => {
        if (!prev) return prev;
        const nodes = prev.nodes.map((n) => (positions[n.id] ? { ...n, ...positions[n.id] } : n));
        return { ...prev, nodes };
      });
      setHasUnsavedLayout(true);
      message.info('Applied Hierarchical Tier auto-layout');
    }, [graphData, message]);

    // Auto-Layout: Rack-Grouped
    const handleAutoLayoutRackGrouped = useCallback(() => {
      if (!graphData) return;
      const positions = calculateRackGroupLayout(
        graphData.nodes,
        graphData.edges,
        graphData.racks,
      );
      setGraphData((prev) => {
        if (!prev) return prev;
        const nodes = prev.nodes.map((n) => (positions[n.id] ? { ...n, ...positions[n.id] } : n));
        return { ...prev, nodes };
      });
      setHasUnsavedLayout(true);
      message.info('Applied Rack-Grouped auto-layout');
    }, [graphData, message]);

    // Contextual Drill-Down Handler
    const handleSelectNode = useCallback(
      async (node: TopologyNode) => {
        if (node.type === 'RACK') {
          try {
            const rack =
              graphData?.racks.find((r) => r.id === node.id || r.id === node.rackId) ||
              (await networkService.getRack(node.rackId || node.id));
            if (rack) {
              setSelectedRack(rack);
              setRackDrawerOpen(true);
            }
          } catch (err: unknown) {
            message.error(formatErrorMessage(err, 'load rack elevation details'));
          }
        } else if (node.type === 'SWITCH') {
          try {
            const sw = await networkService.getSwitch(node.id);
            setSelectedSwitch(sw);
            setSwitchDrawerOpen(true);
          } catch (err: unknown) {
            const localSw = allSwitches.find((s) => s.id === node.id);
            if (localSw) {
              setSelectedSwitch(localSw);
              setSwitchDrawerOpen(true);
            } else {
              message.error(formatErrorMessage(err, 'load switch details'));
            }
          }
        } else if (
          node.type === 'CAMERA' ||
          node.type === 'ENDPOINT' ||
          node.type === 'ASSET' ||
          node.type === 'SERVER' ||
          node.type === 'ACCESS_POINT' ||
          node.type === 'AP'
        ) {
          const matched = assets.find(
            (a) => a.id === node.id || a.tag === node.label || a.assetCode === node.label,
          );
          if (matched) {
            setSelectedAsset(matched);
            setAssetDrawerOpen(true);
          }
        }
      },
      [graphData, allSwitches, assets, message],
    );

    const handleOpenPortConfig = useCallback(
      async (sourcePortId?: string) => {
        if (!sourcePortId) return;
        try {
          const port = await networkService.getPort(sourcePortId);
          setSelectedPort(port);
          setPortDrawerOpen(true);
        } catch (err: unknown) {
          message.error(formatErrorMessage(err, 'load port configuration'));
        }
      },
      [message],
    );

    return (
      <Card
        styles={{ body: { padding: '16px' } }}
        title={
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            {/* View Perspective Switcher & Sub-Filters */}
            <Space size={12} wrap>
              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as TopologyViewMode)}
                options={[
                  { label: 'All Infrastructure', value: 'ALL', icon: <ApartmentOutlined /> },
                  { label: 'Network Only', value: 'NETWORK', icon: <CloudServerOutlined /> },
                  { label: 'CCTV System', value: 'CCTV', icon: <EyeOutlined /> },
                ]}
                data-testid="topology-view-switcher"
              />

              {/* Contextual Sub-Filters for CCTV perspective */}
              {viewMode === 'CCTV' && (
                <Space size={8}>
                  <Select
                    placeholder="All Floors"
                    allowClear
                    value={filters.floor}
                    onChange={(val) => setFilter('floor', val)}
                    style={{ width: 130 }}
                    options={[
                      { label: '1F', value: '1F' },
                      { label: '2F', value: '2F' },
                      { label: '3F', value: '3F' },
                      { label: 'Server Room', value: 'Server Room' },
                    ]}
                    data-testid="topology-floor-filter"
                  />
                  <Select
                    placeholder="All Status"
                    allowClear
                    value={filters.status}
                    onChange={(val) => setFilter('status', val)}
                    style={{ width: 140 }}
                    options={[
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'Flapping / Degraded', value: 'CONNECTED_NO_SIGNAL' },
                      { label: 'Offline / Down', value: 'DOWN' },
                    ]}
                    data-testid="topology-status-filter"
                  />
                </Space>
              )}

              {/* Contextual Sub-Filters for NETWORK perspective */}
              {viewMode === 'NETWORK' && (
                <Space size={8}>
                  <Select
                    placeholder="All Roles"
                    allowClear
                    value={filters.switchRole}
                    onChange={(val) => setFilter('switchRole', val)}
                    style={{ width: 130 }}
                    options={[
                      { label: 'Core', value: 'CORE' },
                      { label: 'Distribution', value: 'DISTRIBUTION' },
                      { label: 'Access', value: 'ACCESS' },
                      { label: 'PoE Access', value: 'POE_ACCESS' },
                    ]}
                    data-testid="topology-role-filter"
                  />
                  <Select
                    placeholder="All VLANs"
                    allowClear
                    value={filters.vlanId}
                    onChange={(val) => setFilter('vlanId', val)}
                    style={{ width: 150 }}
                    options={vlans.map((v) => ({
                      label: `VLAN ${v.vlanNumber} (${v.name})`,
                      value: v.id,
                    }))}
                    data-testid="topology-vlan-filter"
                  />
                </Space>
              )}

              {/* Contextual Sub-Filters for ALL perspective */}
              {viewMode === 'ALL' && (
                <Select
                  placeholder="All Racks"
                  allowClear
                  value={filters.rackId}
                  onChange={(val) => setFilter('rackId', val)}
                  style={{ width: 140 }}
                  options={
                    topologyData?.racks?.map((r) => ({
                      label: r.code || r.name,
                      value: r.id,
                    })) ?? []
                  }
                  data-testid="topology-rack-filter"
                />
              )}

              {/* Node count text */}
              {graphData && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {graphData.nodes.length} Nodes · {graphData.edges.length} Links
                  {graphData.summaryMetrics?.cameraCount
                    ? ` · ${graphData.summaryMetrics.cameraCount} Cameras`
                    : ''}
                </Text>
              )}
            </Space>

            {/* Actions: Search, Auto-Layout, Patch Cable, Refresh */}
            <Space size={8} wrap>
              <Input.Search
                placeholder="Search node, IP, MAC, camera..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 220 }}
                allowClear
                data-testid="topology-search-input"
              />
              <Button
                onClick={handleAutoLayoutHierarchical}
                data-testid="auto-layout-hierarchical-button"
              >
                Auto Layout
              </Button>
              <Button
                onClick={handleAutoLayoutRackGrouped}
                data-testid="auto-layout-rack-button"
              >
                Rack Group
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setPatchModalOpen(true)}
                data-testid="patch-cable-button"
              >
                Patch Cable
              </Button>
              <Button
                icon={<ReloadOutlined spin={isLoading} />}
                onClick={() => refetch()}
                aria-label="Reload"
              />
            </Space>
          </Flex>
        }
      >
        {/* Telemetry Summary Bar */}
        <TopologySummaryBar
          metrics={topologyData?.metrics || topologyData?.summaryMetrics}
          viewMode={viewMode as TopologyViewMode}
          loading={isLoading}
        />

        {isLoading && !graphData ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin size="large" description="Loading network & CCTV topology canvas..." />
          </div>
        ) : (
          graphData && (
            <NetworkTopologyCanvas
              nodes={graphData.nodes}
              edges={graphData.edges}
              searchQuery={searchQuery}
              onNodePositionChange={handleNodePositionChange}
              onSaveLayout={handleSaveLayout}
              hasUnsavedChanges={hasUnsavedLayout}
              onSelectNode={handleSelectNode}
              onOpenPortConfig={handleOpenPortConfig}
            />
          )
        )}

        {/* 1-Click Contextual Drawers */}
        <RackElevationDrawer
          open={rackDrawerOpen}
          rack={selectedRack}
          onClose={() => setRackDrawerOpen(false)}
          onSelectSwitch={(switchId) => onSelectSwitch?.(switchId)}
        />

        <SwitchFaceplateDrawer
          open={switchDrawerOpen}
          switchEntity={selectedSwitch}
          onClose={() => setSwitchDrawerOpen(false)}
          onSelectRack={(rackId) => onSelectRack?.(rackId)}
          vlans={vlans}
          subnets={subnets}
          assets={assets}
        />

        <PortConfigDrawer
          open={portDrawerOpen}
          port={selectedPort}
          onClose={() => setPortDrawerOpen(false)}
          vlans={vlans}
          subnets={subnets}
          assets={assets}
          onPortUpdated={() => refetch()}
        />

        <AssetDetailDrawer
          open={assetDrawerOpen}
          selectedAsset={selectedAsset}
          onClose={() => setAssetDrawerOpen(false)}
          onOpenEditModal={() => {}}
        />

        {/* Interactive Cable Patching Modal */}
        <CablePatchModal
          open={patchModalOpen}
          switches={allSwitches}
          vlans={vlans}
          assets={assets}
          onClose={() => setPatchModalOpen(false)}
          onSuccess={() => refetch()}
        />
      </Card>
    );
  },
);

TopologyMapTab.displayName = 'TopologyMapTab';
