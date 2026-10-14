import {
  AimOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  SaveOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { App, Button, Flex, Space, Tooltip, theme } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TopologyEdge, TopologyNode } from './types';
import { TopologyEdgeItem } from './TopologyEdgeItem';
import { TopologyMinimap } from './TopologyMinimap';
import { TopologyNodeItem } from './TopologyNodeItem';
import { computeGraphBounds } from './topologyLayout.util';

export interface NetworkTopologyCanvasProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  searchQuery?: string;
  onNodePositionChange?: (nodeId: string, x: number, y: number) => void;
  onSaveLayout?: () => void;
  hasUnsavedChanges?: boolean;
  onSelectNode: (node: TopologyNode) => void;
  onOpenPortConfig?: (sourcePortId?: string) => void;
}

export const NetworkTopologyCanvas: React.FC<NetworkTopologyCanvasProps> = React.memo(
  ({
    nodes,
    edges,
    searchQuery = '',
    onNodePositionChange,
    onSaveLayout,
    hasUnsavedChanges,
    onSelectNode,
    onOpenPortConfig,
  }) => {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const containerRef = useRef<HTMLDivElement>(null);
    const [pan, setPan] = useState({ x: 50, y: 30 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [isDraggingNode, setIsDraggingNode] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerSizeRef = useRef({ width: 1200, height: 700 });
    const draggingNodeRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const isPanningRef = useRef(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const panRef = useRef(pan);
    panRef.current = pan;
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;
    const onNodePositionChangeRef = useRef(onNodePositionChange);
    onNodePositionChangeRef.current = onNodePositionChange;

    // Measure container size
    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const sz = {
            width: containerRef.current.clientWidth || 1200,
            height: containerRef.current.clientHeight || 700,
          };
          containerSizeRef.current = sz;
          setContainerSize(sz);
        }
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Synchronize fullscreen state and container dimensions on native fullscreen changes (e.g. Escape key)
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
        if (containerRef.current) {
          const sz = {
            width: containerRef.current.clientWidth || 1200,
            height: containerRef.current.clientHeight || 700,
          };
          containerSizeRef.current = sz;
          setContainerSize(sz);
        }
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }, []);

    // Upstream Path Traversal
    const highlightedPath = useMemo(() => {
      if (!selectedNodeId) return { nodeIds: new Set<string>(), edgeIds: new Set<string>() };

      const nodeIds = new Set<string>([selectedNodeId]);
      const edgeIds = new Set<string>();
      const queue = [selectedNodeId];

      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const edge of edges) {
          if (edge.target === current && !nodeIds.has(edge.source)) {
            nodeIds.add(edge.source);
            edgeIds.add(edge.id);
            queue.push(edge.source);
          } else if (
            edge.source === current &&
            !nodeIds.has(edge.target) &&
            (edge.subType === 'TRUNK' || edge.type === 'TRUNK' || edge.linkType === 'TRUNK')
          ) {
            nodeIds.add(edge.target);
            edgeIds.add(edge.id);
            queue.push(edge.target);
          }
        }
      }

      return { nodeIds, edgeIds };
    }, [selectedNodeId, edges]);

    // Search query matches
    const searchMatchIds = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return new Set<string>();
      const set = new Set<string>();
      for (const n of nodes) {
        if (
          n.label.toLowerCase().includes(q) ||
          n.ipAddress?.toLowerCase().includes(q) ||
          n.macAddress?.toLowerCase().includes(q) ||
          n.model?.toLowerCase().includes(q) ||
          n.rackName?.toLowerCase().includes(q) ||
          n.zone?.toLowerCase().includes(q)
        ) {
          set.add(n.id);
        }
      }
      return set;
    }, [nodes, searchQuery]);

    // Zoom handlers
    const handleZoomIn = () => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))));
    const handleZoomOut = () => setZoom((z) => Math.max(0.2, Number((z - 0.15).toFixed(2))));
    const handleResetZoom = () => {
      setZoom(1);
      setPan({ x: 50, y: 30 });
    };

    const handleFitToScreen = useCallback(() => {
      const bounds = computeGraphBounds(nodes);
      const padding = 60;
      const scaleX = (containerSize.width - padding * 2) / bounds.width;
      const scaleY = (containerSize.height - padding * 2) / bounds.height;
      const nextZoom = Math.min(1.2, Math.max(0.3, Math.min(scaleX, scaleY)));
      setZoom(Number(nextZoom.toFixed(2)));
      setPan({
        x: Math.round((containerSize.width - bounds.width * nextZoom) / 2 - bounds.minX * nextZoom),
        y: Math.round((containerSize.height - bounds.height * nextZoom) / 2 - bounds.minY * nextZoom),
      });
    }, [nodes, containerSize]);

    // Wheel Zoom centered around cursor
    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(2.5, Math.max(0.25, Number((zoom + delta).toFixed(2))));

      if (newZoom !== zoom) {
        const factor = newZoom / zoom;
        setPan((prev) => ({
          x: Math.round(cursorX - (cursorX - prev.x) * factor),
          y: Math.round(cursorY - (cursorY - prev.y) * factor),
        }));
        setZoom(newZoom);
      }
    };

    // Global mouse/pointer move and up handlers to guarantee drag tracking even if cursor moves fast
    useEffect(() => {
      const handleGlobalMove = (e: MouseEvent | PointerEvent) => {
        if (draggingNodeRef.current) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const p = panRef.current;
          const z = zoomRef.current;
          const rawX = (e.clientX - rect.left - p.x) / z;
          const rawY = (e.clientY - rect.top - p.y) / z;
          const targetX = Math.round(rawX - draggingNodeRef.current.offsetX);
          const targetY = Math.round(rawY - draggingNodeRef.current.offsetY);
          onNodePositionChangeRef.current?.(draggingNodeRef.current.id, targetX, targetY);
        } else if (isPanningRef.current) {
          setPan({
            x: Math.round(e.clientX - panStartRef.current.x),
            y: Math.round(e.clientY - panStartRef.current.y),
          });
        }
      };

      const handleGlobalUp = () => {
        if (draggingNodeRef.current) {
          draggingNodeRef.current = null;
          setIsDraggingNode(false);
        }
        if (isPanningRef.current) {
          isPanningRef.current = false;
          setIsPanning(false);
        }
      };

      window.addEventListener('pointermove', handleGlobalMove);
      window.addEventListener('pointerup', handleGlobalUp);
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);

      return () => {
        window.removeEventListener('pointermove', handleGlobalMove);
        window.removeEventListener('pointerup', handleGlobalUp);
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
      };
    }, []);

    // Canvas background panning
    const handleCanvasPointerDown = (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (draggingNodeRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const rawX = (e.clientX - rect.left - pan.x) / zoom;
        const rawY = (e.clientY - rect.top - pan.y) / zoom;
        const targetX = Math.round(rawX - draggingNodeRef.current.offsetX);
        const targetY = Math.round(rawY - draggingNodeRef.current.offsetY);
        onNodePositionChange?.(draggingNodeRef.current.id, targetX, targetY);
      } else if (isPanning) {
        setPan({
          x: Math.round(e.clientX - panStart.x),
          y: Math.round(e.clientY - panStart.y),
        });
      }
    };

    const handlePointerUp = () => {
      draggingNodeRef.current = null;
      isPanningRef.current = false;
      setIsPanning(false);
      setIsDraggingNode(false);
    };

    const handleNodeDragStart = (
      nodeId: string,
      nodeX: number,
      nodeY: number,
      e: React.PointerEvent,
    ) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;
      const offset = { x: rawX - nodeX, y: rawY - nodeY };
      draggingNodeRef.current = { id: nodeId, offsetX: offset.x, offsetY: offset.y };
      setIsDraggingNode(true);
    };

    const handleNodeSelect = (node: TopologyNode) => {
      setSelectedNodeId(node.id);
      onSelectNode(node);
    };

    const toggleFullscreen = async () => {
      if (!containerRef.current) return;
      try {
        if (!document.fullscreenElement) {
          if (typeof containerRef.current.requestFullscreen === 'function') {
            await containerRef.current.requestFullscreen();
          }
          setIsFullscreen(true);
        } else {
          if (typeof document.exitFullscreen === 'function') {
            await document.exitFullscreen();
          }
          setIsFullscreen(false);
        }
      } catch (_err: unknown) {
        setIsFullscreen(Boolean(document.fullscreenElement));
        message.warning('Fullscreen mode is not permitted by your browser.');
      }
    };

    const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

    return (
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? '100vh' : 'calc(100vh - 320px)',
          minHeight: 640,
          backgroundColor: token.colorBgLayout,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {/* Floating Controls Toolbar */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            background: token.colorBgElevated,
            padding: '6px 10px',
            borderRadius: token.borderRadiusLG,
            boxShadow: token.boxShadowSecondary,
            border: `1px solid ${token.colorBorderSecondary}`,
            color: token.colorText,
          }}
        >
          <Space size={6}>
            <Tooltip title="Zoom In (+)">
              <Button
                icon={<ZoomInOutlined />}
                size="small"
                onClick={handleZoomIn}
                data-testid="zoom-in-button"
              />
            </Tooltip>
            <Tooltip title="Zoom Out (-)">
              <Button
                icon={<ZoomOutOutlined />}
                size="small"
                onClick={handleZoomOut}
                data-testid="zoom-out-button"
              />
            </Tooltip>
            <Tooltip title="Fit to Screen">
              <Button
                icon={<AimOutlined />}
                size="small"
                onClick={handleFitToScreen}
                data-testid="fit-to-screen-button"
              />
            </Tooltip>
            <Button size="small" onClick={handleResetZoom} data-testid="zoom-reset-button">
              {Math.round(zoom * 100)}%
            </Button>
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <Button
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                size="small"
                onClick={toggleFullscreen}
              />
            </Tooltip>
            {onSaveLayout && (
              <Button
                type="primary"
                size="small"
                icon={<SaveOutlined />}
                onClick={onSaveLayout}
                disabled={!hasUnsavedChanges}
                data-testid="save-layout-button"
              >
                Save Layout
              </Button>
            )}
          </Space>
        </div>

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 10,
            background: token.colorBgElevated,
            padding: '6px 12px',
            borderRadius: token.borderRadiusSM,
            fontSize: 11,
            boxShadow: token.boxShadowSecondary,
            border: `1px solid ${token.colorBorderSecondary}`,
            color: token.colorText,
          }}
        >
          <Flex gap={12} align="center">
            <span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>—</span> Copper Link
            </span>
            <span>
              <span style={{ color: '#3b82f6', fontWeight: 600 }}>—</span> 10G Fiber Trunk
            </span>
            <span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>- -</span> Degraded / Down
            </span>
            <span>⚡ PoE Delivery</span>
            <span>● Active</span>
          </Flex>
        </div>

        {/* 2D Interactive SVG Canvas */}
        <svg
          className="topology-canvas"
          width="100%"
          height="100%"
          onPointerDown={handleCanvasPointerDown}
          style={{ display: 'block', cursor: isDraggingNode ? 'move' : isPanning ? 'grabbing' : 'grab' }}
          data-testid="topology-canvas"
        >
          {/* Background Grid */}
          <defs>
            <pattern id="topology-grid" width={40} height={40} patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth={0.7} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topology-grid)" />

          {/* Canvas Transform Layer */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges Layer */}
            <g className="topology-edges-layer">
              {edges.map((edge) => (
                <TopologyEdgeItem
                  key={edge.id}
                  edge={edge}
                  sourceNode={nodeMap.get(edge.source)}
                  targetNode={nodeMap.get(edge.target)}
                  isHighlighted={highlightedPath.edgeIds.has(edge.id)}
                  hasHighlightedPath={highlightedPath.nodeIds.size > 0}
                  onOpenPortConfig={onOpenPortConfig}
                />
              ))}
            </g>

            {/* Nodes Layer */}
            <g className="topology-nodes-layer">
              {nodes.map((node) => (
                <TopologyNodeItem
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  isHighlighted={highlightedPath.nodeIds.has(node.id)}
                  hasHighlightedPath={highlightedPath.nodeIds.size > 0}
                  isSearchMatch={searchMatchIds.has(node.id)}
                  onSelect={handleNodeSelect}
                  onDragStart={handleNodeDragStart}
                />
              ))}
            </g>
          </g>
        </svg>

        {/* Minimap */}
        <TopologyMinimap
          nodes={nodes}
          panX={pan.x}
          panY={pan.y}
          zoom={zoom}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          onJumpTo={(nx, ny) => setPan({ x: nx, y: ny })}
        />
      </div>
    );
  },
);

NetworkTopologyCanvas.displayName = 'NetworkTopologyCanvas';
