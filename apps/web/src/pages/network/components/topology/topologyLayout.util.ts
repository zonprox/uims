import type { NetworkRack } from '../../../../services/network.service';
import type { TopologyEdge, TopologyNode } from './types';

export function calculateHierarchicalLayout(
  nodes: TopologyNode[],
  _edges: TopologyEdge[],
  containerWidth = 1400,
): Record<string, { x: number; y: number }> {
  const result: Record<string, { x: number; y: number }> = {};

  const tier0: TopologyNode[] = []; // Racks & Core Switches
  const tier1: TopologyNode[] = []; // Distribution Switches
  const tier2: TopologyNode[] = []; // Access/PoE Switches & NVRs
  const tier3: TopologyNode[] = []; // Endpoints & Cameras

  for (const node of nodes) {
    const role = (node.role || (node.data?.role as string) || node.subType || '').toUpperCase();
    if (node.type === 'RACK' || role === 'CORE') {
      tier0.push(node);
    } else if (role === 'DISTRIBUTION') {
      tier1.push(node);
    } else if (node.type === 'SWITCH' || node.type === 'NVR') {
      tier2.push(node);
    } else {
      tier3.push(node);
    }
  }

  const tiers = [
    { nodes: tier0, y: 100 },
    { nodes: tier1, y: 280 },
    { nodes: tier2, y: 460 },
    { nodes: tier3, y: 660 },
  ];

  for (const tier of tiers) {
    const count = tier.nodes.length;
    if (count === 0) continue;
    const spacing = Math.max(190, Math.min(260, (containerWidth - 100) / count));
    const startX = Math.max(80, (containerWidth - (count - 1) * spacing) / 2);

    tier.nodes.forEach((node, index) => {
      result[node.id] = {
        x: Math.round(startX + index * spacing),
        y: tier.y,
      };
    });
  }

  return result;
}

export function calculateRackGroupLayout(
  nodes: TopologyNode[],
  _edges: TopologyEdge[],
  racks: NetworkRack[] = [],
): Record<string, { x: number; y: number }> {
  const result: Record<string, { x: number; y: number }> = {};
  const rackMap = new Map<string, TopologyNode[]>();
  const unassigned: TopologyNode[] = [];

  for (const node of nodes) {
    if (node.rackId) {
      const list = rackMap.get(node.rackId) || [];
      list.push(node);
      rackMap.set(node.rackId, list);
    } else {
      unassigned.push(node);
    }
  }

  let currentX = 100;
  const rackY = 120;

  for (const rack of racks) {
    const rackNodes = rackMap.get(rack.id) || [];
    // Place rack header node if present
    const rackNode = nodes.find(
      (n) => n.type === 'RACK' && (n.rackId === rack.id || n.id === rack.id),
    );
    if (rackNode) {
      result[rackNode.id] = { x: currentX, y: rackY };
    }

    let nodeY = rackY + 140;
    for (const node of rackNodes) {
      if (node.type !== 'RACK') {
        result[node.id] = { x: currentX, y: nodeY };
        nodeY += 120;
      }
    }
    currentX += 260;
  }

  // Place unassigned nodes
  let unassignedX = 100;
  let unassignedY = 560;
  unassigned.forEach((node) => {
    if (node.type !== 'RACK' && !result[node.id]) {
      result[node.id] = { x: unassignedX, y: unassignedY };
      unassignedX += 200;
      if (unassignedX > 1200) {
        unassignedX = 100;
        unassignedY += 130;
      }
    }
  });

  return result;
}

export function computeGraphBounds(nodes: TopologyNode[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 1200, maxY: 800, width: 1200, height: 800 };
  }

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
    minX: Math.max(0, minX - 100),
    minY: Math.max(0, minY - 100),
    maxX: maxX + 250,
    maxY: maxY + 200,
    width: Math.max(800, maxX - minX + 350),
    height: Math.max(600, maxY - minY + 300),
  };
}
