import React, { useCallback, useMemo, useRef } from 'react';
import type { TopologyNode } from './types';

export interface TopologyMinimapProps {
  nodes: TopologyNode[];
  panX: number;
  panY: number;
  zoom: number;
  containerWidth: number;
  containerHeight: number;
  onJumpTo: (targetPanX: number, targetPanY: number) => void;
}

export const TopologyMinimap: React.FC<TopologyMinimapProps> = React.memo(
  ({ nodes, panX, panY, zoom, containerWidth, containerHeight, onJumpTo }) => {
    const minimapWidth = 180;
    const minimapHeight = 120;
    const svgRef = useRef<SVGSVGElement>(null);

    // Graph bounding box
    const bounds = useMemo(() => {
      if (nodes.length === 0) return { minX: 0, minY: 0, width: 1400, height: 900 };
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of nodes) {
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x > maxX) maxX = n.x;
        if (n.y > maxY) maxY = n.y;
      }
      return {
        minX: Math.max(0, minX - 50),
        minY: Math.max(0, minY - 50),
        width: Math.max(1000, maxX - minX + 250),
        height: Math.max(700, maxY - minY + 200),
      };
    }, [nodes]);

    const scaleX = minimapWidth / bounds.width;
    const scaleY = minimapHeight / bounds.height;
    const scale = Math.min(scaleX, scaleY);

    // Viewport box on minimap
    const viewX = (-panX - bounds.minX) * scale;
    const viewY = (-panY - bounds.minY) * scale;
    const viewW = (containerWidth / zoom) * scale;
    const viewH = (containerHeight / zoom) * scale;

    const handleMinimapClick = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const graphX = clickX / scale + bounds.minX;
        const graphY = clickY / scale + bounds.minY;

        const newPanX = -(graphX - containerWidth / zoom / 2);
        const newPanY = -(graphY - containerHeight / zoom / 2);
        onJumpTo(Math.round(newPanX), Math.round(newPanY));
      },
      [scale, bounds.minX, bounds.minY, containerWidth, containerHeight, zoom, onJumpTo],
    );

    return (
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          width: minimapWidth,
          height: minimapHeight,
          background: 'rgba(255, 255, 255, 0.92)',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          zIndex: 10,
        }}
        data-testid="topology-minimap"
      >
        <svg
          ref={svgRef}
          width={minimapWidth}
          height={minimapHeight}
          onClick={handleMinimapClick}
          style={{ cursor: 'pointer', display: 'block' }}
        >
          {/* Mini Nodes */}
          {nodes.map((node) => {
            const nx = (node.x - bounds.minX) * scale;
            const ny = (node.y - bounds.minY) * scale;
            const color =
              node.type === 'RACK'
                ? '#722ed1'
                : node.type === 'SWITCH'
                  ? '#1677ff'
                  : node.type === 'CAMERA'
                    ? '#0891b2'
                    : node.type === 'NVR'
                      ? '#d97706'
                      : '#64748b';
            return <circle key={node.id} cx={nx} cy={ny} r={2.5} fill={color} />;
          })}

          {/* Current Viewport Box */}
          <rect
            x={Math.max(0, viewX)}
            y={Math.max(0, viewY)}
            width={Math.min(minimapWidth, Math.max(10, viewW))}
            height={Math.min(minimapHeight, Math.max(10, viewH))}
            fill="rgba(22, 119, 255, 0.12)"
            stroke="#1677ff"
            strokeWidth={1.5}
            rx={2}
          />
        </svg>
      </div>
    );
  },
);

TopologyMinimap.displayName = 'TopologyMinimap';
