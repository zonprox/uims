import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TopologyEdgeItem } from './TopologyEdgeItem';
import { calculateHierarchicalLayout } from './topologyLayout.util';
import type { TopologyEdge, TopologyNode } from './types';
import { getNodeDimensions } from './types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Helper to detect 2D rectangle collision between two node cards
function checkCardCollision(
  nodeA: { id: string; type: string; x: number; y: number },
  nodeB: { id: string; type: string; x: number; y: number },
): { collides: boolean; xOverlap: number; yOverlap: number } {
  const dimA = getNodeDimensions(nodeA.type);
  const dimB = getNodeDimensions(nodeB.type);

  const aLeft = nodeA.x;
  const aRight = nodeA.x + dimA.width;
  const aTop = nodeA.y;
  const aBottom = nodeA.y + dimA.height;

  const bLeft = nodeB.x;
  const bRight = nodeB.x + dimB.width;
  const bTop = nodeB.y;
  const bBottom = nodeB.y + dimB.height;

  const xOverlap = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
  const yOverlap = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));

  return {
    collides: xOverlap > 0 && yOverlap > 0,
    xOverlap,
    yOverlap,
  };
}

describe('Challenger M2-2: Network Topology Layout & Routing Stress Test', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Part 1: Stress-Test calculateHierarchicalLayout', () => {
    it('handles empty nodes array without errors or invalid coordinates', () => {
      const positions = calculateHierarchicalLayout([], []);
      expect(positions).toEqual({});
      expect(Object.keys(positions)).toHaveLength(0);
    });

    it('positions 1 node per tier with zero NaN/Infinity and zero collisions', () => {
      const nodes: TopologyNode[] = [
        {
          id: 'core-1',
          type: 'SWITCH',
          role: 'CORE',
          label: 'Core 1',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        },
        {
          id: 'dist-1',
          type: 'SWITCH',
          role: 'DISTRIBUTION',
          label: 'Dist 1',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        },
        {
          id: 'acc-1',
          type: 'SWITCH',
          role: 'ACCESS',
          label: 'Access 1',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        },
        {
          id: 'ep-1',
          type: 'ENDPOINT',
          label: 'Endpoint 1',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        },
      ];

      const positions = calculateHierarchicalLayout(nodes, []);

      for (const node of nodes) {
        const pos = positions[node.id];
        expect(pos).toBeDefined();
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
        expect(Number.isNaN(pos.x)).toBe(false);
        expect(Number.isNaN(pos.y)).toBe(false);
      }

      expect(positions['core-1'].y).toBe(100);
      expect(positions['dist-1'].y).toBe(280);
      expect(positions['acc-1'].y).toBe(460);
      expect(positions['ep-1'].y).toBe(660);

      // Verify zero collisions
      const positioned = nodes.map((n) => ({ ...n, x: positions[n.id].x, y: positions[n.id].y }));
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const { collides } = checkCardCollision(positioned[i], positioned[j]);
          expect(collides).toBe(false);
        }
      }
    });

    it('evaluates Medium Scale: 4 core, 6 distribution, 12 access, 25 endpoints for pitch, wrapping, and collisions', () => {
      const nodes: TopologyNode[] = [];
      for (let i = 0; i < 4; i++) {
        nodes.push({
          id: `core-${i}`,
          type: 'SWITCH',
          role: 'CORE',
          label: `Core ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }
      for (let i = 0; i < 6; i++) {
        nodes.push({
          id: `dist-${i}`,
          type: 'SWITCH',
          role: 'DISTRIBUTION',
          label: `Dist ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }
      for (let i = 0; i < 12; i++) {
        nodes.push({
          id: `acc-${i}`,
          type: 'SWITCH',
          role: 'ACCESS',
          label: `Access ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }
      for (let i = 0; i < 25; i++) {
        nodes.push({
          id: `ep-${i}`,
          type: 'ENDPOINT',
          label: `Endpoint ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }

      const positions = calculateHierarchicalLayout(nodes, []);

      // 1. Assert zero NaN or Infinity
      for (const node of nodes) {
        const pos = positions[node.id];
        expect(pos).toBeDefined();
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }

      // 2. Assert minimum pitch >= 220px within each row
      // Group by row Y
      const rowsByY = new Map<number, number[]>();
      for (const node of nodes) {
        const pos = positions[node.id];
        const existing = rowsByY.get(pos.y) || [];
        existing.push(pos.x);
        rowsByY.set(pos.y, existing);
      }

      for (const [_y, xs] of rowsByY.entries()) {
        xs.sort((a, b) => a - b);
        for (let i = 0; i < xs.length - 1; i++) {
          const pitch = xs[i + 1] - xs[i];
          expect(pitch).toBeGreaterThanOrEqual(220);
        }
      }

      // 3. Assert sub-row wrapping occurred for tiers with >8 nodes
      // Access switches (12 nodes) should span 2 distinct Y rows
      const accessYSet = new Set(
        nodes.filter((n) => n.id.startsWith('acc-')).map((n) => positions[n.id].y),
      );
      expect(accessYSet.size).toBe(2);

      // Endpoints (25 nodes) should span 4 distinct Y rows (ceil(25/8) = 4)
      const epYSet = new Set(
        nodes.filter((n) => n.id.startsWith('ep-')).map((n) => positions[n.id].y),
      );
      expect(epYSet.size).toBe(4);

      // 4. Assert zero collisions between 210px switch cards and 185px endpoint cards
      const positioned = nodes.map((n) => ({ ...n, x: positions[n.id].x, y: positions[n.id].y }));
      const collisions: Array<{ a: string; b: string; xOverlap: number; yOverlap: number }> = [];

      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const { collides, xOverlap, yOverlap } = checkCardCollision(positioned[i], positioned[j]);
          if (collides) {
            collisions.push({ a: positioned[i].id, b: positioned[j].id, xOverlap, yOverlap });
          }
        }
      }

      // Record empirical collisions if present
      expect(collisions).toEqual([]);
    });

    it('evaluates Dense Scale: 20 nodes per tier (20 core, 20 distribution, 20 access, 20 endpoints)', () => {
      const nodes: TopologyNode[] = [];
      for (let i = 0; i < 20; i++) {
        nodes.push({
          id: `c20-${i}`,
          type: 'SWITCH',
          role: 'CORE',
          label: `Core ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }
      for (let i = 0; i < 20; i++) {
        nodes.push({
          id: `d20-${i}`,
          type: 'SWITCH',
          role: 'DISTRIBUTION',
          label: `Dist ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }
      for (let i = 0; i < 20; i++) {
        nodes.push({
          id: `a20-${i}`,
          type: 'SWITCH',
          role: 'ACCESS',
          label: `Access ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }
      for (let i = 0; i < 20; i++) {
        nodes.push({
          id: `e20-${i}`,
          type: 'ENDPOINT',
          label: `Endpoint ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }

      const positions = calculateHierarchicalLayout(nodes, []);

      // Check coordinates validity
      for (const node of nodes) {
        const pos = positions[node.id];
        expect(pos).toBeDefined();
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }

      // Check collisions
      const positioned = nodes.map((n) => ({ ...n, x: positions[n.id].x, y: positions[n.id].y }));
      const collisions: Array<{ a: string; b: string; xOverlap: number; yOverlap: number }> = [];
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const { collides, xOverlap, yOverlap } = checkCardCollision(positioned[i], positioned[j]);
          if (collides) {
            collisions.push({ a: positioned[i].id, b: positioned[j].id, xOverlap, yOverlap });
          }
        }
      }

      expect(collisions).toEqual([]);
    });

    it('evaluates Extreme Scale: 50 nodes per tier (50 core, 50 dist, 50 access, 50 endpoints)', () => {
      const nodes: TopologyNode[] = [];
      for (let i = 0; i < 50; i++) {
        nodes.push({
          id: `c50-${i}`,
          type: 'SWITCH',
          role: 'CORE',
          label: `Core ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
        nodes.push({
          id: `d50-${i}`,
          type: 'SWITCH',
          role: 'DISTRIBUTION',
          label: `Dist ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
        nodes.push({
          id: `a50-${i}`,
          type: 'SWITCH',
          role: 'ACCESS',
          label: `Access ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
        nodes.push({
          id: `e50-${i}`,
          type: 'ENDPOINT',
          label: `Endpoint ${i}`,
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 0,
          y: 0,
        });
      }

      const positions = calculateHierarchicalLayout(nodes, []);

      // Zero NaN/Infinity
      for (const node of nodes) {
        const pos = positions[node.id];
        expect(pos).toBeDefined();
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
      }

      // Check collisions
      const positioned = nodes.map((n) => ({ ...n, x: positions[n.id].x, y: positions[n.id].y }));
      const collisions: Array<{ a: string; b: string; xOverlap: number; yOverlap: number }> = [];
      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const { collides, xOverlap, yOverlap } = checkCardCollision(positioned[i], positioned[j]);
          if (collides) {
            collisions.push({ a: positioned[i].id, b: positioned[j].id, xOverlap, yOverlap });
          }
        }
      }

      expect(collisions).toEqual([]);
    });
  });

  describe('Part 2: Stress-Test TopologyEdgeItem Routing', () => {
    it('uses side-to-side bezier routing for same-tier peer links (|y1 - y2| <= 50) without vertical plunge', async () => {
      const sourceNode: TopologyNode = {
        id: 'sw-core-01',
        label: 'SW-CORE-01',
        type: 'SWITCH',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 200,
        y: 100,
      };

      const targetNode: TopologyNode = {
        id: 'sw-core-02',
        label: 'SW-CORE-02',
        type: 'SWITCH',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 500,
        y: 110, // |100 - 110| = 10 <= 50 (same tier)
      };

      const edge: TopologyEdge = {
        id: 'edge-peer-01',
        source: 'sw-core-01',
        target: 'sw-core-02',
        type: 'TRUNK',
        status: 'ACTIVE',
        media: 'FIBER',
        speed: '40G',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge,
              sourceNode,
              targetNode,
              onOpenPortConfig: vi.fn(),
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-peer-01"]');
      expect(edgeEl).toBeTruthy();

      const paths = edgeEl?.querySelectorAll('path');
      expect(paths && paths.length >= 2).toBe(true);

      // Inspect path 'd' attribute
      const pathD = paths?.[1].getAttribute('d');
      expect(pathD).toBeTruthy();

      // Switch dimensions: width = 210, height = 98
      // source: x=200, y=100 -> sx = 200 + 210 = 410, sy = 100 + 49 = 149
      // target: x=500, y=110 -> tx = 500, ty = 110 + 49 = 159
      // midX = (410 + 500) / 2 = 455
      // Expected side-to-side bezier: M 410 149 C 455 149, 455 159, 500 159
      expect(pathD).toBe('M 410 149 C 455 149, 455 159, 500 159');
    });

    it('uses side-to-side bezier routing when source is to the right of target on same tier', async () => {
      const sourceNode: TopologyNode = {
        id: 'sw-core-02',
        label: 'SW-CORE-02',
        type: 'SWITCH',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 600,
        y: 100,
      };

      const targetNode: TopologyNode = {
        id: 'sw-core-01',
        label: 'SW-CORE-01',
        type: 'SWITCH',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 200,
        y: 100,
      };

      const edge: TopologyEdge = {
        id: 'edge-peer-rev',
        source: 'sw-core-02',
        target: 'sw-core-01',
        type: 'TRUNK',
        status: 'ACTIVE',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge,
              sourceNode,
              targetNode,
              onOpenPortConfig: vi.fn(),
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-peer-rev"]');
      const pathD = edgeEl?.querySelectorAll('path')?.[1].getAttribute('d');
      // source is right (x=600), target is left (x=200):
      // sx = 600, sy = 149; tx = 200 + 210 = 410, ty = 149
      // midX = (600 + 410) / 2 = 505
      // Expected: M 600 149 C 505 149, 505 149, 410 149
      expect(pathD).toBe('M 600 149 C 505 149, 505 149, 410 149');
    });

    it('maintains standard top-to-bottom routing for inter-tier connections (y2 - y1 > 100)', async () => {
      const sourceNode: TopologyNode = {
        id: 'sw-core-01',
        label: 'SW-CORE-01',
        type: 'SWITCH',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 200,
        y: 100,
      };

      const targetNode: TopologyNode = {
        id: 'sw-dist-01',
        label: 'SW-DIST-01',
        type: 'SWITCH',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 300,
        y: 350, // 350 - 100 = 250 > 100
      };

      const edge: TopologyEdge = {
        id: 'edge-inter-tier',
        source: 'sw-core-01',
        target: 'sw-dist-01',
        type: 'UPLINK',
        status: 'ACTIVE',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge,
              sourceNode,
              targetNode,
              onOpenPortConfig: vi.fn(),
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-inter-tier"]');
      const pathD = edgeEl?.querySelectorAll('path')?.[1].getAttribute('d');
      // source: x=200, y=100, w=210, h=98 -> sx = 200 + 105 = 305, sy = 100 + 98 = 198
      // target: x=300, y=350, w=210, h=98 -> tx = 300 + 105 = 405, ty = 350
      // midY = (198 + 350) / 2 = 274
      // Expected: M 305 198 C 305 274, 405 274, 405 350
      expect(pathD).toBe('M 305 198 C 305 274, 405 274, 405 350');
    });
  });
});
