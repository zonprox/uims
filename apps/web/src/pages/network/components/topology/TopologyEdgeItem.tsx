import React, { useCallback } from 'react';
import type { TopologyEdge, TopologyNode } from './types';

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

    const sWidth = sourceNode.type === 'RACK' ? 180 : sourceNode.type === 'SWITCH' ? 175 : 160;
    const sHeight = sourceNode.type === 'RACK' ? 85 : sourceNode.type === 'SWITCH' ? 80 : 72;
    const tWidth = targetNode.type === 'RACK' ? 180 : targetNode.type === 'SWITCH' ? 175 : 160;

    const sx = sourceNode.x + sWidth / 2;
    const sy = sourceNode.y + sHeight;
    const tx = targetNode.x + tWidth / 2;
    const ty = targetNode.y;

    const midY = (sy + ty) / 2;
    const pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
    const midX = (sx + tx) / 2;

    const isFiber =
      edge.media === 'FIBER' ||
      edge.mediaType?.includes('FIBER') ||
      edge.speed?.includes('10G') ||
      edge.speed?.includes('40G');

    const strokeColor = isHighlighted
      ? '#06b6d4'
      : edge.status === 'DOWN'
        ? '#ef4444'
        : edge.status === 'CONNECTED_NO_SIGNAL' || edge.status === 'DEGRADED'
          ? '#f59e0b'
          : isFiber
            ? '#3b82f6'
            : '#10b981';

    const strokeWidth = isHighlighted ? 3.5 : isFiber ? 3 : 2;
    const isDashed =
      edge.status === 'DOWN' ||
      edge.status === 'CONNECTED_NO_SIGNAL' ||
      edge.status === 'DEGRADED';

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenPortConfig?.(edge.sourcePortId);
      },
      [edge.sourcePortId, onOpenPortConfig],
    );

    return (
      <g
        className="topology-edge-group"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
        data-testid={`topology-edge-${edge.id}`}
      >
        {/* Invisible wider hit target for easy clicking */}
        <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />

        {/* Visible link path */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={isDashed ? '6,4' : undefined}
          strokeLinecap="round"
        />

        {/* Center Pill / Telemetry Badge */}
        <g transform={`translate(${midX - 35}, ${midY - 11})`}>
          <rect
            x={0}
            y={0}
            width={70}
            height={20}
            rx={10}
            fill="#ffffff"
            stroke={strokeColor}
            strokeWidth={1}
            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
          />
          <text
            x={35}
            y={13.5}
            textAnchor="middle"
            fill="#1e293b"
            fontSize={9.5}
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            {edge.poeEnabled ? '⚡ ' : ''}
            {edge.speed || '1G'}
          </text>
        </g>
      </g>
    );
  },
);

TopologyEdgeItem.displayName = 'TopologyEdgeItem';
