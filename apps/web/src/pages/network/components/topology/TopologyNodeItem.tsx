import React, { useCallback } from 'react';
import type { TopologyNode } from './types';

export interface TopologyNodeItemProps {
  node: TopologyNode;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isSearchMatch?: boolean;
  onSelect: (node: TopologyNode) => void;
  onDragStart: (nodeId: string, startX: number, startY: number, e: React.PointerEvent) => void;
}

export const TopologyNodeItem: React.FC<TopologyNodeItemProps> = React.memo(
  ({ node, isSelected, isHighlighted, isSearchMatch, onSelect, onDragStart }) => {
    const isRack = node.type === 'RACK';
    const isSwitch = node.type === 'SWITCH';
    const width = isRack ? 180 : isSwitch ? 175 : 160;
    const height = isRack ? 85 : isSwitch ? 80 : 72;

    const startPosRef = React.useRef({ x: 0, y: 0 });

    const handlePointerDown = useCallback(
      (e: React.PointerEvent | React.MouseEvent) => {
        e.stopPropagation();
        startPosRef.current = { x: e.clientX, y: e.clientY };
        onDragStart(node.id, node.x, node.y, e as React.PointerEvent);
      },
      [node.id, node.x, node.y, onDragStart],
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
        if (dist < 8) {
          onSelect(node);
        }
      },
      [node, onSelect],
    );

    // Color definitions
    const statusColor =
      node.status === 'ONLINE' || node.status === 'ACTIVE'
        ? '#10b981'
        : node.status === 'CONNECTED_NO_SIGNAL' ||
            node.status === 'MAINTENANCE' ||
            node.status === 'DEGRADED'
          ? '#f59e0b'
          : '#ef4444';

    const nodeRole = (node.role || (node.data?.role as string) || node.subType || '').toUpperCase();

    const headerBg = isRack
      ? '#722ed1'
      : isSwitch
        ? '#1677ff'
        : node.type === 'CAMERA'
          ? '#0891b2'
          : node.type === 'NVR'
            ? '#d97706'
            : node.type === 'SERVER'
              ? '#4f46e5'
              : node.type === 'ACCESS_POINT' || node.type === 'AP'
                ? '#059669'
                : '#475569';

    const strokeColor = isSelected
      ? '#2563eb'
      : isHighlighted
        ? '#06b6d4'
        : isSearchMatch
          ? '#f59e0b'
          : '#cbd5e1';

    const strokeWidth = isSelected || isHighlighted ? 3 : isSearchMatch ? 2.5 : 1;

    // Header label text
    const headerTitle = isRack
      ? 'RACK'
      : isSwitch
        ? nodeRole || 'SWITCH'
        : node.type === 'ACCESS_POINT' || node.type === 'AP'
          ? 'AP'
          : node.type;

    return (
      <g
        transform={`translate(${node.x}, ${node.y})`}
        onPointerDown={handlePointerDown}
        onMouseDown={handlePointerDown}
        onClick={handleClick}
        style={{ cursor: 'move', userSelect: 'none' }}
        data-testid={`topology-node-${node.type.toLowerCase()}-${node.id}`}
      >
        {/* Glowing aura for path highlighting */}
        {isHighlighted && (
          <rect
            x={-6}
            y={-6}
            width={width + 12}
            height={height + 12}
            rx={10}
            fill="none"
            stroke="#06b6d4"
            strokeWidth={3}
            strokeDasharray="5,3"
            opacity={0.8}
          />
        )}

        {/* Search match glow */}
        {isSearchMatch && !isHighlighted && (
          <rect
            x={-5}
            y={-5}
            width={width + 10}
            height={height + 10}
            rx={8}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2.5}
            opacity={0.75}
          />
        )}

        {/* Card Body */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={6}
          fill="#ffffff"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"
        />

        {/* Header Bar */}
        <rect x={0} y={0} width={width} height={22} rx={6} fill={headerBg} />
        <rect x={0} y={16} width={width} height={6} fill={headerBg} />

        {/* Header Title */}
        <text
          x={8}
          y={15}
          fill="#ffffff"
          fontSize={11}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
        >
          {headerTitle}
        </text>

        {/* Status Dot */}
        <circle cx={width - 12} cy={11} r={4.5} fill={statusColor} />

        {/* Node Label */}
        <text
          x={10}
          y={40}
          fill="#1e293b"
          fontSize={12}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
        >
          {node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label}
        </text>

        {/* Sublabel / IP */}
        <text
          x={10}
          y={56}
          fill="#64748b"
          fontSize={10.5}
          fontFamily="system-ui, sans-serif"
        >
          {node.ipAddress || node.sublabel || node.model || '—'}
        </text>

        {/* Footer badges */}
        {isSwitch && (
          <text
            x={10}
            y={71}
            fill="#0284c7"
            fontSize={9.5}
            fontFamily="system-ui, sans-serif"
          >
            {node.activePorts !== undefined
              ? `${node.activePorts}/${node.totalPorts || 24} Ports`
              : `${node.totalPorts || 24} Ports`}
          </text>
        )}

        {node.type === 'CAMERA' && (
          <text
            x={10}
            y={69}
            fill={node.status === 'ACTIVE' || node.status === 'ONLINE' ? '#10b981' : '#f59e0b'}
            fontSize={9.5}
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            {node.status === 'ACTIVE' || node.status === 'ONLINE'
              ? '⚡ PoE Streaming'
              : `⚡ ${node.status}`}
          </text>
        )}

        {isRack && (
          <text
            x={10}
            y={72}
            fill="#722ed1"
            fontSize={9.5}
            fontFamily="system-ui, sans-serif"
          >
            42U Standard
          </text>
        )}

        {node.type === 'NVR' && (
          <text
            x={10}
            y={69}
            fill="#d97706"
            fontSize={9.5}
            fontWeight={600}
            fontFamily="system-ui, sans-serif"
          >
            NVR Storage
          </text>
        )}

        {node.type === 'SERVER' && (
          <text
            x={10}
            y={69}
            fill="#4f46e5"
            fontSize={9.5}
            fontFamily="system-ui, sans-serif"
          >
            Enterprise Host
          </text>
        )}
      </g>
    );
  },
);

TopologyNodeItem.displayName = 'TopologyNodeItem';
