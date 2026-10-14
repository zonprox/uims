import React, { useCallback } from 'react';
import type { TopologyEdge, TopologyNode } from './types';
import { getNodeDimensions } from './types';

export interface TopologyEdgeItemProps {
  edge: TopologyEdge;
  sourceNode?: TopologyNode;
  targetNode?: TopologyNode;
  isHighlighted?: boolean;
  onOpenPortConfig?: (sourcePortId?: string) => void;
}

export const TopologyEdgeItem: React.FC<TopologyEdgeItemProps> = React.memo(
  ({ edge, sourceNode, targetNode, isHighlighted, onOpenPortConfig }) => {
    if (!sourceNode || !targetNode) return null;

    const sDim = getNodeDimensions(sourceNode.type);
    const tDim = getNodeDimensions(targetNode.type);

    const sx = sourceNode.x + sDim.width / 2;
    const sy = sourceNode.y + sDim.height;
    const tx = targetNode.x + tDim.width / 2;
    const ty = targetNode.y;

    const midY = (sy + ty) / 2;
    const midX = (sx + tx) / 2;
    const pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;

    const isFiber =
      edge.media === 'FIBER' ||
      edge.mediaType?.includes('FIBER') ||
      edge.speed?.includes('10G') ||
      edge.speed?.includes('40G') ||
      (edge.speedMbps !== undefined && edge.speedMbps >= 10000);

    const isTrunk =
      edge.type === 'UPLINK' ||
      edge.type === 'TRUNK' ||
      edge.linkType === 'UPLINK' ||
      edge.linkType === 'TRUNK' ||
      (sourceNode.type === 'SWITCH' && targetNode.type === 'SWITCH');

    // Stroke coloring based on media & signaling health
    const strokeColor = isHighlighted
      ? '#06b6d4'
      : edge.status === 'DOWN'
        ? '#ef4444'
        : edge.status === 'CONNECTED_NO_SIGNAL' || edge.status === 'DEGRADED'
          ? '#f59e0b'
          : isFiber
            ? '#3b82f6'
            : '#10b981';

    const strokeWidth = isHighlighted ? 3.5 : isTrunk ? (isFiber ? 3.5 : 2.5) : 2.0;

    const isDashed =
      edge.status === 'DOWN' ||
      edge.status === 'CONNECTED_NO_SIGNAL' ||
      edge.status === 'DEGRADED';

    const dashArray =
      edge.status === 'DOWN' ? '6,4' : isDashed ? '8,5' : undefined;

    const isPoe = Boolean(edge.poeEnabled || edge.poeDelivering);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenPortConfig?.(edge.sourcePortId ?? undefined);
      },
      [edge.sourcePortId, onOpenPortConfig],
    );

    // Pill styling
    const pillWidth = isPoe ? 82 : isTrunk ? 88 : 74;
    const pillHeight = 22;
    const pillBg = isPoe ? '#fefce8' : '#ffffff';
    const pillBorderColor = isPoe ? '#eab308' : strokeColor;
    const pillTextColor = isPoe ? '#a16207' : '#1e293b';

    const speedLabel = edge.speed || (edge.speedMbps ? `${edge.speedMbps / 1000} Gbps` : '1 Gbps');

    return (
      <g
        className="topology-edge-group"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
        data-testid={`topology-edge-${edge.id}`}
      >
        {/* Invisible 14px click hit target for effortless port config opening */}
        <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />

        {/* Visible link path */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
        />

        {/* Center Pill / Telemetry Badge */}
        <g transform={`translate(${midX - pillWidth / 2}, ${midY - pillHeight / 2})`}>
          <rect
            x={0}
            y={0}
            width={pillWidth}
            height={pillHeight}
            rx={11}
            fill={pillBg}
            stroke={pillBorderColor}
            strokeWidth={1.5}
            filter="drop-shadow(0 1px 3px rgba(0,0,0,0.12))"
          />
          <text
            x={pillWidth / 2}
            y={15}
            textAnchor="middle"
            fill={pillTextColor}
            fontSize={10}
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            {isPoe ? '⚡ ' : ''}
            {speedLabel}
          </text>
        </g>
      </g>
    );
  },
);

TopologyEdgeItem.displayName = 'TopologyEdgeItem';
