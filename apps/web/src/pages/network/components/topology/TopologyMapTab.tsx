import {
  ApartmentOutlined,
  CloudServerOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Flex, Input, Segmented, Space, Spin, Typography } from 'antd';
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
import { formatErrorMessage } from '../../../../utils/feedback';
import { AssetDetailDrawer } from '../../../assets/components/AssetDetailDrawer';
import { PortConfigDrawer } from '../PortConfigDrawer';
import { RackElevationDrawer } from '../RackElevationDrawer';
import { SwitchFaceplateDrawer } from '../SwitchFaceplateDrawer';
import { CablePatchModal } from './CablePatchModal';
import { NetworkTopologyCanvas } from './NetworkTopologyCanvas';
import { calculateHierarchicalLayout, calculateRackGroupLayout } from './topologyLayout.util';
import type {
  NetworkTopologyGraph,
  TopologyEdge,
  TopologyNode,
  TopologyNodeStatus,
  TopologyViewMode,
} from './types';

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
    const [viewMode, setViewMode] = useState<TopologyViewMode>('ALL');
    const [graphData, setGraphData] = useState<NetworkTopologyGraph | null>(null);
    const [allRacks, setAllRacks] = useState<NetworkRack[]>([]);
    const [allSwitches, setAllSwitches] = useState<NetworkSwitch[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [hasUnsavedLayout, setHasUnsavedLayout] = useState(false);

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

    // Load graph data & supporting entity fleet from backend
    const loadTopology = useCallback(async () => {
      setLoading(true);
      try {
        const [topologyData, fetchedRacks, fetchedSwitches] = await Promise.all([
          networkService.getTopology({ mode: viewMode }),
          networkService.getRacks({ limit: 100 }),
          networkService.getSwitches({ limit: 100 }),
        ]);

        setAllRacks(fetchedRacks || []);
        setAllSwitches(fetchedSwitches || []);

        // Merge racks into canvas node list if not already present
        const mergedNodes: TopologyNode[] = [...(topologyData.nodes || [])];
        const existingNodeIds = new Set(mergedNodes.map((n) => n.id));

        let rackIdx = 0;
        for (const rack of fetchedRacks) {
          if (!existingNodeIds.has(rack.id)) {
            const isCctvRack =
              rack.name.toLowerCase().includes('cctv') ||
              rack.code.toLowerCase().includes('cctv');

            // In CCTV mode, show only CCTV racks; in other modes show all racks
            if (viewMode === 'CCTV' && !isCctvRack) {
              continue;
            }

            mergedNodes.push({
              id: rack.id,
              label: rack.code || rack.name,
              sublabel: rack.name,
              type: 'RACK',
              status: (rack.status as TopologyNodeStatus) || 'ONLINE',
              domain: isCctvRack ? 'CCTV' : 'NETWORK',
              rackId: rack.id,
              rackName: rack.name,
              x: rack.positionX ?? 120 + rackIdx * 260,
              y: rack.positionY ?? 100,
              totalPorts: 42,
              data: {
                rackCode: rack.code,
                maxPowerKw: rack.maxPowerKw,
              },
            });
            existingNodeIds.add(rack.id);
            rackIdx++;
          }
        }

        // Connect edges from Rack to mounted Switches if not already linked
        const mergedEdges: TopologyEdge[] = [...(topologyData.edges || [])];
        const existingEdgeKeys = new Set(mergedEdges.map((e) => `${e.source}-->${e.target}`));

        for (const sw of fetchedSwitches) {
          if (sw.rackId && existingNodeIds.has(sw.rackId) && existingNodeIds.has(sw.id)) {
            const edgeKey = `${sw.rackId}-->${sw.id}`;
            if (!existingEdgeKeys.has(edgeKey)) {
              mergedEdges.push({
                id: `edge-rack-${sw.rackId}-${sw.id}`,
                source: sw.rackId,
                target: sw.id,
                type: 'UPLINK',
                media: 'COPPER',
                speed: 'Rack Mount',
                status: 'ACTIVE',
                domain: sw.domain === 'CCTV' ? 'CCTV' : 'NETWORK',
              });
              existingEdgeKeys.add(edgeKey);
            }
          }
        }

        setGraphData({
          nodes: mergedNodes,
          edges: mergedEdges,
          racks: fetchedRacks,
          vlans,
          subnets,
          summaryMetrics: {
            totalNodes: mergedNodes.length,
            totalEdges: mergedEdges.length,
            activeLinks: topologyData.summaryMetrics?.activeLinks ?? mergedEdges.length,
            downLinks: topologyData.summaryMetrics?.downLinks ?? 0,
            poePowerLinks: topologyData.summaryMetrics?.poePowerUsageWatts ?? 0,
            cameraCount: topologyData.summaryMetrics?.totalCameras ?? 0,
            switchCount: topologyData.summaryMetrics?.totalSwitches ?? fetchedSwitches.length,
          },
        });
        setHasUnsavedLayout(false);
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'load network topology graph'));
      } finally {
        setLoading(false);
      }
    }, [viewMode, vlans, subnets, message]);

    useEffect(() => {
      loadTopology();
    }, [loadTopology]);

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
        await networkService.saveTopologyLayout({ mode: viewMode, positions });
        message.success('Topology layout saved successfully');
        setHasUnsavedLayout(false);
      } catch (err: unknown) {
        message.error(formatErrorMessage(err, 'save topology layout coordinates'));
      }
    }, [graphData, viewMode, message]);

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
        allRacks.length > 0 ? allRacks : graphData.racks,
      );
      setGraphData((prev) => {
        if (!prev) return prev;
        const nodes = prev.nodes.map((n) => (positions[n.id] ? { ...n, ...positions[n.id] } : n));
        return { ...prev, nodes };
      });
      setHasUnsavedLayout(true);
      message.info('Applied Rack-Grouped auto-layout');
    }, [graphData, allRacks, message]);

    // Contextual Drill-Down Handler
    const handleSelectNode = useCallback(
      async (node: TopologyNode) => {
        if (node.type === 'RACK') {
          const rack =
            allRacks.find(
              (r) =>
                r.id === node.id ||
                r.id === node.rackId ||
                r.code === node.label ||
                r.name === node.label,
            ) ||
            graphData?.racks.find((r) => r.id === (node.rackId || node.id));
          if (rack) {
            setSelectedRack(rack);
            setRackDrawerOpen(true);
          }
        } else if (node.type === 'SWITCH') {
          try {
            const sw = await networkService.getSwitch(node.id);
            setSelectedSwitch(sw);
            setSwitchDrawerOpen(true);
          } catch {
            // Fallback to local switch entity if available
            const localSw = allSwitches.find((s) => s.id === node.id);
            if (localSw) {
              setSelectedSwitch(localSw);
              setSwitchDrawerOpen(true);
            }
          }
        } else if (
          node.type === 'CAMERA' ||
          node.type === 'ENDPOINT' ||
          node.type === 'ASSET' ||
          node.type === 'SERVER' ||
          node.type === 'ACCESS_POINT'
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
      [allRacks, allSwitches, graphData, assets],
    );

    const handleOpenPortConfig = useCallback(async (sourcePortId?: string) => {
      if (!sourcePortId) return;
      try {
        const port = await networkService.getPort(sourcePortId);
        setSelectedPort(port);
        setPortDrawerOpen(true);
      } catch {
        // Safe fallback
      }
    }, []);

    return (
      <Card
        styles={{ body: { padding: '16px' } }}
        title={
          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            {/* View Perspective Switcher */}
            <Space size={12}>
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
              {/* Telemetry metrics */}
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
            <Space size={8}>
              <Input.Search
                placeholder="Search node, IP, MAC, camera..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: 220 }}
                allowClear
                data-testid="topology-search-input"
              />
              <Button onClick={handleAutoLayoutHierarchical}>Auto Layout</Button>
              <Button onClick={handleAutoLayoutRackGrouped}>Rack Group</Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setPatchModalOpen(true)}
                data-testid="patch-cable-button"
              >
                Patch Cable
              </Button>
              <Button
                icon={<ReloadOutlined spin={loading} />}
                onClick={loadTopology}
                aria-label="Reload"
              />
            </Space>
          </Flex>
        }
      >
        {loading && !graphData ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spin size="large" tip="Loading network & CCTV topology canvas..." />
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
          onPortUpdated={() => loadTopology()}
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
          onSuccess={() => loadTopology()}
        />
      </Card>
    );
  },
);

TopologyMapTab.displayName = 'TopologyMapTab';
