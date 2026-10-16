import React, { useCallback } from 'react';
import type { TopologyNode } from './types';
import { getNodeDimensions } from './types';

export interface TopologyNodeItemProps {
  node: TopologyNode;
  isSelected?: boolean;
  isHighlighted?: boolean;
  hasHighlightedPath?: boolean;
  isSearchMatch?: boolean;
  onSelect: (node: TopologyNode) => void;
  onDragStart: (nodeId: string, startX: number, startY: number, e: React.PointerEvent) => void;
}

export const TopologyNodeItem: React.FC<TopologyNodeItemProps> = React.memo(
  ({
    node,
    isSelected,
    isHighlighted,
    hasHighlightedPath,
    isSearchMatch,
    onSelect,
    onDragStart,
  }) => {
    const { width, height } = getNodeDimensions(node.type);
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
        const dist = Math.hypot(
          e.clientX - startPosRef.current.x,
          e.clientY - startPosRef.current.y,
        );
        if (dist < 8) {
          onSelect(node);
        }
      },
      [node, onSelect],
    );

    // Status dot color
    const statusColor =
      node.status === 'ONLINE' || node.status === 'ACTIVE'
        ? '#10b981'
        : node.status === 'CONNECTED_NO_SIGNAL' ||
            node.status === 'MAINTENANCE' ||
            node.status === 'DEGRADED'
          ? '#f59e0b'
          : '#ef4444';

    const nodeRole = (node.role || (node.data?.role as string) || node.subType || '').toUpperCase();

    // Domain / Role Header Colors
    const headerBg =
      node.type === 'RACK'
        ? '#722ed1'
        : node.type === 'SWITCH'
          ? nodeRole === 'CORE'
            ? '#722ed1'
            : nodeRole === 'DISTRIBUTION'
              ? '#1677ff'
              : node.domain === 'CCTV'
                ? '#d97706'
                : '#0284c7'
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

    // Header title
    const headerTitle =
      node.type === 'RACK'
        ? 'RACK · 42U'
        : node.type === 'SWITCH'
          ? `[${nodeRole || 'SWITCH'}]`
          : node.type === 'CAMERA'
            ? 'CCTV · IP CAMERA'
            : node.type === 'NVR'
              ? 'NVR · STORAGE'
              : node.type === 'SERVER'
                ? 'SERVER · COMPUTE'
                : node.type === 'ACCESS_POINT' || node.type === 'AP'
                  ? 'AP · WI-FI 6'
                  : node.type;

    return (
      <g
        transform={`translate(${node.x}, ${node.y})`}
        onPointerDown={handlePointerDown}
        onMouseDown={handlePointerDown}
        onClick={handleClick}
        opacity={hasHighlightedPath && !isHighlighted && !isSelected ? 0.35 : 1.0}
        style={{ cursor: 'move', userSelect: 'none', transition: 'opacity 0.25s ease' }}
        data-testid={`topology-node-${node.type.toLowerCase()}-${node.id}`}
      >
        {/* Glowing aura for upstream path highlighting */}
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
            opacity={0.85}
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
          fontSize={10.5}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
        >
          {headerTitle}
        </text>

        {/* Status Dot */}
        <circle cx={width - 12} cy={11} r={4.5} fill={statusColor} />

        {/* ========================================================= */}
        {/* SPECIALIZED NODE PRESENTATIONS                            */}
        {/* ========================================================= */}

        {/* 1. RACK NODE PRESENTATION */}
        {node.type === 'RACK' && (
          <g className="rack-node-body">
            {/* 42U Mini Vertical Elevation Gauge */}
            <rect x={8} y={28} width={12} height={58} rx={2} fill="#1e293b" />
            {/* Occupied RU fill gauge */}
            <rect x={9} y={28 + 58 - 24} width={10} height={22} rx={1} fill="#a855f7" />
            {/* Gauge Tick Marks */}
            <line x1={8} y1={42} x2={12} y2={42} stroke="#64748b" strokeWidth={1} />
            <line x1={8} y1={56} x2={12} y2={56} stroke="#64748b" strokeWidth={1} />
            <line x1={8} y1={70} x2={12} y2={70} stroke="#64748b" strokeWidth={1} />

            {/* Rack Label */}
            <text
              x={26}
              y={42}
              fill="#1e293b"
              fontSize={11.5}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
            </text>

            {/* Location & RU elevation */}
            <text x={26} y={57} fill="#64748b" fontSize={9.5} fontFamily="system-ui, sans-serif">
              {node.floor || node.zone || (node.data?.location as string) || 'Server Room · DC-01'}
            </text>

            {/* Mounted Switch Count & 42U Standard */}
            <text
              x={26}
              y={72}
              fill="#722ed1"
              fontSize={9.5}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {`${(node.data?.switchCount as number) ?? 4} Switches (42U Standard)`}
            </text>

            {/* Power Capacity */}
            <text x={26} y={86} fill="#94a3b8" fontSize={9} fontFamily="system-ui, sans-serif">
              {`${(node.data?.maxPowerKw as number) ?? 2.4} kW Capacity`}
            </text>
          </g>
        )}

        {/* 2. SWITCH NODE PRESENTATION */}
        {node.type === 'SWITCH' && (
          <g className="switch-node-body">
            {/* Switch Name */}
            <text
              x={10}
              y={39}
              fill="#1e293b"
              fontSize={12}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
            </text>

            {/* Model & IP */}
            <text x={10} y={53} fill="#64748b" fontSize={9.5} fontFamily="system-ui, sans-serif">
              {`${node.model || node.subType || 'Switch Chassis'} · ${node.ipAddress || '—'}`}
            </text>

            {/* Active Port Count */}
            <text
              x={10}
              y={68}
              fill="#0284c7"
              fontSize={10}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {node.activePorts !== undefined
                ? `${node.activePorts}/${node.totalPorts || 24} Ports`
                : `${node.totalPorts || 24} Ports`}
            </text>

            {/* Micro LED Port Strip (8 dots) */}
            <g className="switch-micro-leds">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const activeCount = node.activePorts ?? 16;
                const totalCount = node.totalPorts || 24;
                const activeLeds = Math.round((activeCount / totalCount) * 8);
                const isActive = i < activeLeds;
                return (
                  <circle
                    key={i}
                    cx={118 + i * 8}
                    cy={65}
                    r={2.5}
                    fill={isActive ? '#10b981' : '#cbd5e1'}
                  />
                );
              })}
            </g>

            {/* Active Ports Telemetry */}
            <text
              x={10}
              y={84}
              fill="#64748b"
              fontSize={9.5}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {`${node.activePorts ?? 0}/${node.totalPorts ?? 24} Ports Active · ${nodeRole || 'ACCESS'}`}
            </text>
          </g>
        )}

        {/* 3. CAMERA ENDPOINT NODE PRESENTATION */}
        {node.type === 'CAMERA' && (
          <g className="camera-node-body">
            <text
              x={10}
              y={39}
              fill="#1e293b"
              fontSize={12}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
            </text>
            <text x={10} y={53} fill="#64748b" fontSize={9.5} fontFamily="system-ui, sans-serif">
              {`${node.ipAddress || '10.10.80.x'} · ${node.model || '4K Dome'}`}
            </text>
            <text
              x={10}
              y={67}
              fill={node.status === 'ACTIVE' || node.status === 'ONLINE' ? '#10b981' : '#f59e0b'}
              fontSize={9.5}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {node.status === 'ACTIVE' || node.status === 'ONLINE'
                ? '4K Ultra HD · ● Active'
                : `4K Ultra HD · ▲ ${node.status}`}
            </text>
            <text
              x={10}
              y={80}
              fill="#0891b2"
              fontSize={9}
              fontWeight={500}
              fontFamily="system-ui, sans-serif"
            >
              {`Floor: ${node.floor || 'Floor 1 Lobby'}${node.zone ? ' · ' + node.zone : ''}`}
            </text>
          </g>
        )}

        {/* 4. SERVER ENDPOINT NODE PRESENTATION */}
        {node.type === 'SERVER' && (
          <g className="server-node-body">
            <text
              x={10}
              y={39}
              fill="#1e293b"
              fontSize={12}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
            </text>
            <text x={10} y={53} fill="#64748b" fontSize={9.5} fontFamily="system-ui, sans-serif">
              {`${node.ipAddress || '10.10.20.x'} · ${node.model || 'Dell R750'}`}
            </text>
            <text
              x={10}
              y={67}
              fill="#4f46e5"
              fontSize={9.5}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              ⇄ Dual NIC (LACP Bond)
            </text>
            <text x={10} y={80} fill="#64748b" fontSize={9} fontFamily="system-ui, sans-serif">
              Enterprise Host · 2x 10G Trunk
            </text>
          </g>
        )}

        {/* 5. NVR ENDPOINT NODE PRESENTATION */}
        {node.type === 'NVR' && (
          <g className="nvr-node-body">
            <text
              x={10}
              y={39}
              fill="#1e293b"
              fontSize={12}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
            </text>
            <text x={10} y={53} fill="#64748b" fontSize={9.5} fontFamily="system-ui, sans-serif">
              {`${node.ipAddress || '10.10.80.5'} · ${node.model || 'Hikvision'}`}
            </text>
            <text
              x={10}
              y={67}
              fill="#d97706"
              fontSize={9.5}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              32/64 Channels · RAID6 Healthy
            </text>
            <text x={10} y={80} fill="#64748b" fontSize={9} fontFamily="system-ui, sans-serif">
              NVR Storage Array
            </text>
          </g>
        )}

        {/* 6. ACCESS POINT NODE PRESENTATION */}
        {(node.type === 'ACCESS_POINT' || node.type === 'AP') && (
          <g className="ap-node-body">
            <text
              x={10}
              y={39}
              fill="#1e293b"
              fontSize={12}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
            </text>
            <text x={10} y={53} fill="#64748b" fontSize={9.5} fontFamily="system-ui, sans-serif">
              {`${node.ipAddress || '10.10.30.x'} · ${node.model || 'Wi-Fi 6'}`}
            </text>
            <text
              x={10}
              y={67}
              fill="#059669"
              fontSize={9.5}
              fontWeight={600}
              fontFamily="system-ui, sans-serif"
            >
              SSID: Corp-Secure · VLAN 30
            </text>
            <text x={10} y={80} fill="#059669" fontSize={9} fontFamily="system-ui, sans-serif">
              Wi-Fi 6 · 2.4/5 GHz Dual-Band
            </text>
          </g>
        )}

        {/* 7. GENERIC ENDPOINT / ASSET FALLBACK */}
        {node.type !== 'RACK' &&
          node.type !== 'SWITCH' &&
          node.type !== 'CAMERA' &&
          node.type !== 'SERVER' &&
          node.type !== 'NVR' &&
          node.type !== 'ACCESS_POINT' &&
          node.type !== 'AP' && (
            <g className="generic-node-body">
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
              <text x={10} y={56} fill="#64748b" fontSize={10.5} fontFamily="system-ui, sans-serif">
                {node.ipAddress || node.sublabel || node.model || '—'}
              </text>
              <text x={10} y={71} fill="#475569" fontSize={9.5} fontFamily="system-ui, sans-serif">
                Endpoint
              </text>
            </g>
          )}
      </g>
    );
  },
);

TopologyNodeItem.displayName = 'TopologyNodeItem';
