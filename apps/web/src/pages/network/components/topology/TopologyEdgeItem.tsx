import React, { useCallback } from 'react';
import type { TopologyEdge, TopologyNode } from './types';
import { getNodeDimensions } from './types';

export interface TopologyEdgeItemProps {
  edge: TopologyEdge;
  sourceNode?: TopologyNode;
  targetNode?: TopologyNode;
  isHighlighted?: boolean;
  hasHighlightedPath?: boolean;
  onOpenPortConfig?: (sourcePortId?: string) => void;
}

export const TopologyEdgeItem: React.FC<TopologyEdgeItemProps> = React.memo(
  ({ edge, sourceNode, targetNode, isHighlighted, hasHighlightedPath, onOpenPortConfig }) => {
    if (!sourceNode || !targetNode) return null;

    const sDim = getNodeDimensions(sourceNode.type);
    const tDim = getNodeDimensions(targetNode.type);

    let sx: number;
    let sy: number;
    let tx: number;
    let ty: number;
    let pathD: string;

    const isSameTier = Math.abs(sourceNode.y - targetNode.y) <= 50;
    const isSourceBelow = sourceNode.y > targetNode.y + 50;

    if (isSameTier) {
      // Horizontal peer links (e.g. core-to-core VPC links or distribution interconnects)
      if (sourceNode.x <= targetNode.x) {
        sx = sourceNode.x + sDim.width;
        sy = sourceNode.y + sDim.height / 2;
        tx = targetNode.x;
        ty = targetNode.y + tDim.height / 2;
      } else {
        sx = sourceNode.x;
        sy = sourceNode.y + sDim.height / 2;
        tx = targetNode.x + tDim.width;
        ty = targetNode.y + tDim.height / 2;
      }
      const midX = (sx + tx) / 2;
      pathD = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
    } else if (isSourceBelow) {
      // Upward link (source lower than target)
      sx = sourceNode.x + sDim.width / 2;
      sy = sourceNode.y;
      tx = targetNode.x + tDim.width / 2;
      ty = targetNode.y + tDim.height;
      const midY = (sy + ty) / 2;
      pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
    } else {
      // Standard downward hierarchical link
      sx = sourceNode.x + sDim.width / 2;
      sy = sourceNode.y + sDim.height;
      tx = targetNode.x + tDim.width / 2;
      ty = targetNode.y;
      const midY = (sy + ty) / 2;
      pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
    }

    const midY = (sy + ty) / 2;
    const midX = (sx + tx) / 2;

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
      edge.status === 'DOWN' || edge.status === 'CONNECTED_NO_SIGNAL' || edge.status === 'DEGRADED';

    const dashArray = edge.status === 'DOWN' ? '6,4' : isDashed ? '8,5' : undefined;

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onOpenPortConfig?.(edge.sourcePortId ?? undefined);
      },
      [edge.sourcePortId, onOpenPortConfig],
    );

    const speedLabel = edge.speed || (edge.speedMbps ? `${edge.speedMbps / 1000} Gbps` : '1 Gbps');

    // Construct explicit port-to-port link label
    const fullPillLabel = isTrunk
      ? edge.sourcePortName
        ? `${edge.sourcePortName} ↔ ${edge.targetPortName || 'Uplink'} · ${speedLabel}`
        : speedLabel
      : edge.sourcePortName
        ? `${edge.sourcePortName} → ${edge.targetPortName || 'Endpoint'} · ${speedLabel}`
        : speedLabel;

    // Dynamic clean pill sizing preventing label overflow
    const pillWidth = Math.max(88, Math.round(fullPillLabel.length * 6.5 + 24));
    const pillHeight = 22;
    const pillBg = '#ffffff';
    const pillBorderColor = strokeColor;
    const pillTextColor = '#1e293b';

    const tooltipContent = `${sourceNode.label} [${edge.sourcePortName || 'Port'}] ↔ ${targetNode.label} [${edge.targetPortName || 'Port'}]\nSpeed: ${speedLabel}\nStatus: ${edge.status}\nMedia: ${edge.media || (isFiber ? 'FIBER' : 'COPPER')}${edge.vlanNumber ? `\nVLAN: ${edge.vlanNumber} (${edge.vlanName || ''})` : ''}${isTrunk && edge.taggedVlanIds && edge.taggedVlanIds.length > 0 ? `\nTagged VLANs: ${edge.taggedVlanIds.join(', ')}` : ''}`;

    return (
      <g
        className="topology-edge-group"
        onClick={handleClick}
        opacity={hasHighlightedPath && !isHighlighted ? 0.25 : 1.0}
        style={{ cursor: 'pointer', transition: 'opacity 0.25s ease' }}
        data-testid={`topology-edge-${edge.id}`}
      >
        <title>{tooltipContent}</title>

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
            {fullPillLabel}
          </text>
        </g>
      </g>
    );
  },
);

TopologyEdgeItem.displayName = 'TopologyEdgeItem';
