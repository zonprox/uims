import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkTopologyCanvas } from './NetworkTopologyCanvas';
import { TopologyEdgeItem } from './TopologyEdgeItem';
import { TopologyNodeItem } from './TopologyNodeItem';
import { TopologySummaryBar } from './TopologySummaryBar';
import type { TopologyEdge, TopologyNode } from './types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Challenger M3-1: Empirical Frontend Canvas Rendering, Port-to-Port Links & Zero PoE Invariants', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  const unhandledRejections: unknown[] = [];

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    unhandledRejections.push(event.reason);
  };

  beforeEach(() => {
    unhandledRejections.length = 0;
    window.addEventListener('unhandledrejection', rejectionHandler);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    window.removeEventListener('unhandledrejection', rejectionHandler);

    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }

    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }

    // Clean up any stray Ant Design portal elements per AGENTS.md §8
    document
      .querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover, .ant-tooltip')
      .forEach((el) => {
        el.remove();
      });

    expect(unhandledRejections).toEqual([]);
  });

  // =========================================================================
  // TASK 1: Dynamic Pill Width Expansion Without Clipping
  // =========================================================================
  describe('Task 1: Dynamic Pill Width Expansion & Label Formatting', () => {
    const swA: TopologyNode = {
      id: 'sw-a',
      label: 'SW-CORE-01',
      type: 'SWITCH',
      role: 'CORE',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 100,
    };

    const swB: TopologyNode = {
      id: 'sw-b',
      label: 'SW-DIST-01',
      type: 'SWITCH',
      role: 'DISTRIBUTION',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 400,
    };

    it('empirically expands pill width for short, standard, long, and ultra-long port labels', async () => {
      const testCases = [
        {
          srcPort: 'Te1/1',
          tgtPort: 'Te1/2',
          speed: '10 Gbps',
          expectedMinPillWidth: 88,
        },
        {
          srcPort: 'TenGigabitEthernet1/0/49',
          tgtPort: 'TenGigabitEthernet1/0/1',
          speed: '10 Gbps',
          expectedMinPillWidth: 350,
        },
        {
          srcPort: 'FortyGigabitEthernet1/0/52',
          tgtPort: 'FortyGigabitEthernet1/0/52',
          speed: '40 Gbps',
          expectedMinPillWidth: 400,
        },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        if (currentRoot) {
          await act(async () => {
            currentRoot?.unmount();
          });
          currentRoot = null;
        }

        const edge: TopologyEdge = {
          id: `edge-pill-test-${i}`,
          source: 'sw-a',
          target: 'sw-b',
          status: 'ACTIVE',
          speed: tc.speed,
          sourcePortName: tc.srcPort,
          targetPortName: tc.tgtPort,
          type: 'TRUNK',
        };

        const fullLabel = `${tc.srcPort} ↔ ${tc.tgtPort} · ${tc.speed}`;
        const calculatedWidth = Math.max(88, Math.round(fullLabel.length * 6.5 + 24));

        const root = createRoot(container);
        currentRoot = root;

        await act(async () => {
          root.render(
            createElement(
              'svg',
              null,
              createElement(TopologyEdgeItem, {
                edge,
                sourceNode: swA,
                targetNode: swB,
              }),
            ),
          );
        });

        const edgeEl = container.querySelector(`[data-testid="topology-edge-${edge.id}"]`);
        expect(edgeEl).toBeTruthy();

        // Check text content matches
        const pillText = edgeEl?.querySelector('text');
        expect(pillText?.textContent).toBe(fullLabel);

        // Check rect width matches dynamic calculation exactly
        const rectEl = edgeEl?.querySelector('rect[fill="#ffffff"]');
        expect(rectEl).toBeTruthy();
        const renderedWidth = Number(rectEl?.getAttribute('width'));
        expect(renderedWidth).toBe(calculatedWidth);
        expect(renderedWidth).toBeGreaterThanOrEqual(tc.expectedMinPillWidth);

        // Check text positioning is centered in pill
        expect(Number(pillText?.getAttribute('x'))).toBe(calculatedWidth / 2);
        expect(pillText?.getAttribute('text-anchor')).toBe('middle');
      }
    });

    it('enforces minimum width of 88px for short or empty port labels', async () => {
      const edgeMinimal: TopologyEdge = {
        id: 'edge-minimal',
        source: 'sw-a',
        target: 'sw-b',
        status: 'ACTIVE',
        speed: '1G',
        type: 'TRUNK',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: edgeMinimal,
              sourceNode: swA,
              targetNode: swB,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-minimal"]');
      const rectEl = edgeEl?.querySelector('rect[fill="#ffffff"]');
      expect(Number(rectEl?.getAttribute('width'))).toBe(88);
      const pillText = edgeEl?.querySelector('text');
      expect(pillText?.textContent).toBe('1G');
    });
  });

  // =========================================================================
  // TASK 2: Explicit Directional Port Labels (Trunk ↔ vs Endpoint →)
  // =========================================================================
  describe('Task 2: Explicit Directional Port Labels (Trunk ↔ vs Endpoint →)', () => {
    const swA: TopologyNode = {
      id: 'sw-core',
      label: 'SW-CORE-01',
      type: 'SWITCH',
      role: 'CORE',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 100,
    };

    const swB: TopologyNode = {
      id: 'sw-access',
      label: 'SW-ACC-01',
      type: 'SWITCH',
      role: 'ACCESS',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 350,
    };

    const camNode: TopologyNode = {
      id: 'cam-01',
      label: 'CAM-ENTRANCE',
      type: 'CAMERA',
      status: 'ACTIVE',
      domain: 'CCTV',
      x: 100,
      y: 600,
    };

    const apNode: TopologyNode = {
      id: 'ap-01',
      label: 'AP-OFFICE-01',
      type: 'ACCESS_POINT',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 350,
      y: 350,
    };

    it('empirically renders ↔ bidirectional arrow on trunk pill label for switch-to-switch link', async () => {
      const edgeTrunk: TopologyEdge = {
        id: 'edge-trunk-sw-sw',
        source: 'sw-core',
        target: 'sw-access',
        status: 'ACTIVE',
        speed: '10 Gbps',
        sourcePortName: 'Te1/0/49',
        targetPortName: 'Te1/0/1',
        type: 'TRUNK',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: edgeTrunk,
              sourceNode: swA,
              targetNode: swB,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-trunk-sw-sw"]');
      const pillText = edgeEl?.querySelector('text');
      expect(pillText?.textContent).toBe('Te1/0/49 ↔ Te1/0/1 · 10 Gbps');
      expect(pillText?.textContent).toContain('↔');
      expect(pillText?.textContent).not.toContain('→');
    });

    it('falls back to "Uplink" on trunk if targetPortName is missing', async () => {
      const edgeTrunkNoTgt: TopologyEdge = {
        id: 'edge-trunk-no-tgt',
        source: 'sw-core',
        target: 'sw-access',
        status: 'ACTIVE',
        speed: '10 Gbps',
        sourcePortName: 'Te1/0/48',
        type: 'UPLINK',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: edgeTrunkNoTgt,
              sourceNode: swA,
              targetNode: swB,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-trunk-no-tgt"]');
      const pillText = edgeEl?.querySelector('text');
      expect(pillText?.textContent).toBe('Te1/0/48 ↔ Uplink · 10 Gbps');
      expect(pillText?.textContent).toContain('↔');
    });

    it('empirically renders → directional arrow on endpoint pill label for switch-to-camera link', async () => {
      const edgeEndpointCam: TopologyEdge = {
        id: 'edge-cam',
        source: 'sw-access',
        target: 'cam-01',
        status: 'ACTIVE',
        speed: '1 Gbps',
        sourcePortName: 'Gi1/0/12',
        targetPortName: 'eth0',
        type: 'ACCESS',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: edgeEndpointCam,
              sourceNode: swB,
              targetNode: camNode,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-cam"]');
      const pillText = edgeEl?.querySelector('text');
      expect(pillText?.textContent).toBe('Gi1/0/12 → eth0 · 1 Gbps');
      expect(pillText?.textContent).toContain('→');
      expect(pillText?.textContent).not.toContain('↔');
    });

    it('falls back to "Endpoint" on access edge if targetPortName is missing', async () => {
      const edgeEndpointAp: TopologyEdge = {
        id: 'edge-ap',
        source: 'sw-access',
        target: 'ap-01',
        status: 'ACTIVE',
        speed: '2.5 Gbps',
        sourcePortName: 'Gi1/0/24',
        type: 'ACCESS',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: edgeEndpointAp,
              sourceNode: swB,
              targetNode: apNode,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-ap"]');
      const pillText = edgeEl?.querySelector('text');
      expect(pillText?.textContent).toBe('Gi1/0/24 → Endpoint · 2.5 Gbps');
      expect(pillText?.textContent).toContain('→');
    });
  });

  // =========================================================================
  // TASK 3: SVG <title> Tooltip Metadata Completeness
  // =========================================================================
  describe('Task 3: SVG <title> Tooltip Completeness', () => {
    const swA: TopologyNode = {
      id: 'sw-core-01',
      label: 'SW-CORE-MAIN',
      type: 'SWITCH',
      role: 'CORE',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 100,
    };

    const swB: TopologyNode = {
      id: 'sw-dist-01',
      label: 'SW-DIST-WEST',
      type: 'SWITCH',
      role: 'DISTRIBUTION',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 400,
    };

    it('empirically includes complete endpoints, ports, speed, status, media, and tagged VLANs in SVG <title>', async () => {
      const fullTrunkEdge: TopologyEdge = {
        id: 'edge-detailed-trunk',
        source: 'sw-core-01',
        target: 'sw-dist-01',
        status: 'ACTIVE',
        speed: '40 Gbps',
        media: 'FIBER',
        sourcePortName: 'QSFP1/0/1',
        targetPortName: 'QSFP1/0/1',
        type: 'TRUNK',
        vlanNumber: 1,
        vlanName: 'Default',
        taggedVlanIds: [10, 20, 30, 99],
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: fullTrunkEdge,
              sourceNode: swA,
              targetNode: swB,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-detailed-trunk"]');
      const titleEl = edgeEl?.querySelector('title');
      expect(titleEl).toBeTruthy();
      const content = titleEl?.textContent || '';

      // Verify complete metadata
      expect(content).toContain('SW-CORE-MAIN [QSFP1/0/1] ↔ SW-DIST-WEST [QSFP1/0/1]');
      expect(content).toContain('Speed: 40 Gbps');
      expect(content).toContain('Status: ACTIVE');
      expect(content).toContain('Media: FIBER');
      expect(content).toContain('VLAN: 1 (Default)');
      expect(content).toContain('Tagged VLANs: 10, 20, 30, 99');
    });

    it('empirically verifies fallback when ports, VLANs, or media are not specified', async () => {
      const minimalEdge: TopologyEdge = {
        id: 'edge-sparse',
        source: 'sw-core-01',
        target: 'sw-dist-01',
        status: 'DEGRADED',
        speedMbps: 1000,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: minimalEdge,
              sourceNode: swA,
              targetNode: swB,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-sparse"]');
      const titleEl = edgeEl?.querySelector('title');
      const content = titleEl?.textContent || '';

      expect(content).toContain('SW-CORE-MAIN [Port] ↔ SW-DIST-WEST [Port]');
      expect(content).toContain('Speed: 1 Gbps');
      expect(content).toContain('Status: DEGRADED');
      expect(content).toContain('Media: COPPER');
      expect(content).not.toContain('Tagged VLANs');
    });
  });

  // =========================================================================
  // TASK 4: Zero PoE DOM Elements & Zero PoE Invariants
  // =========================================================================
  describe('Task 4: Zero PoE DOM Elements & Invariants', () => {
    it('empirically asserts no rect[fill="#fefce8"], no stroke="#eab308", no ⚡ text, no isPoe property in rendered Canvas', async () => {
      const testNodes: TopologyNode[] = [
        {
          id: 'sw1',
          label: 'SW-ACC-01',
          type: 'SWITCH',
          role: 'ACCESS',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 100,
          y: 100,
          activePorts: 12,
          totalPorts: 24,
        },
        {
          id: 'cam1',
          label: 'CAM-LOBBY',
          type: 'CAMERA',
          status: 'ACTIVE',
          domain: 'CCTV',
          x: 100,
          y: 300,
          floor: 'Floor 1',
          zone: 'Lobby',
        },
        {
          id: 'ap1',
          label: 'AP-OFFICE',
          type: 'ACCESS_POINT',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 350,
          y: 300,
        },
        {
          id: 'srv1',
          label: 'SRV-DB01',
          type: 'SERVER',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 600,
          y: 300,
        },
      ];

      const testEdges: TopologyEdge[] = [
        {
          id: 'e1',
          source: 'sw1',
          target: 'cam1',
          status: 'ACTIVE',
          speed: '1 Gbps',
          sourcePortName: 'Gi1/0/1',
          targetPortName: 'eth0',
          media: 'COPPER',
        },
        {
          id: 'e2',
          source: 'sw1',
          target: 'ap1',
          status: 'ACTIVE',
          speed: '2.5 Gbps',
          sourcePortName: 'Gi1/0/2',
          targetPortName: 'eth0',
          media: 'COPPER',
        },
        {
          id: 'e3',
          source: 'sw1',
          target: 'srv1',
          status: 'ACTIVE',
          speed: '10 Gbps',
          sourcePortName: 'Te1/0/1',
          targetPortName: 'bond0',
          media: 'FIBER',
        },
      ];

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(NetworkTopologyCanvas, {
                nodes: testNodes,
                edges: testEdges,
                onSelectNode: vi.fn(),
              }),
            ),
          ),
        );
      });

      // 1. Assert zero gold PoE pill fills (#fefce8)
      const yellowRects = container.querySelectorAll('rect[fill="#fefce8"]');
      expect(yellowRects.length).toBe(0);

      // 2. Assert zero gold PoE borders (#eab308)
      const yellowStrokes = container.querySelectorAll('[stroke="#eab308"]');
      expect(yellowStrokes.length).toBe(0);

      // 3. Assert zero ⚡ thunderbolt characters in DOM
      expect(container.textContent).not.toContain('⚡');

      // 4. Assert zero "PoE" occurrences anywhere in rendered Canvas text
      expect(container.textContent).not.toMatch(/\bpoe\b/i);

      // 5. Assert neither test edges nor rendered edge attributes contain isPoe
      testEdges.forEach((e) => {
        expect('isPoe' in e).toBe(false);
      });

      // 6. Assert Canvas footer legend has no PoE delivery entry
      const legendEl = container.querySelector('.topology-canvas')?.previousElementSibling;
      expect(legendEl?.textContent).not.toMatch(/\bpoe\b/i);
      expect(legendEl?.textContent).toContain('Copper Link');
      expect(legendEl?.textContent).toContain('10G Fiber Trunk');
      expect(legendEl?.textContent).toContain('Degraded / Down');
    });
  });

  // =========================================================================
  // TASK 5: Node Cards (Switch Active Ports, Camera Clean Floor, AP Wi-Fi 6)
  // =========================================================================
  describe('Task 5: Node Cards Telemetry Verification', () => {
    it('empirically verifies switch card renders active ports telemetry and 8-dot micro LED strip', async () => {
      const switchNode: TopologyNode = {
        id: 'sw-prod-01',
        label: 'SW-ACCESS-L2',
        type: 'SWITCH',
        role: 'ACCESS',
        status: 'ONLINE',
        domain: 'NETWORK',
        model: 'Catalyst 9300',
        ipAddress: '10.10.10.2',
        activePorts: 18,
        totalPorts: 24,
        x: 0,
        y: 0,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: switchNode,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
          ),
        );
      });

      const swEl = container.querySelector('[data-testid="topology-node-switch-sw-prod-01"]');
      expect(swEl).toBeTruthy();

      // Check header and name
      expect(swEl?.textContent).toContain('[ACCESS]');
      expect(swEl?.textContent).toContain('SW-ACCESS-L2');
      expect(swEl?.textContent).toContain('Catalyst 9300 · 10.10.10.2');

      // Check active ports telemetry line
      expect(swEl?.textContent).toContain('18/24 Ports Active · ACCESS');

      // Micro LED strip: exactly 8 dots
      const ledDots = swEl?.querySelectorAll('.switch-micro-leds circle');
      expect(ledDots?.length).toBe(8);

      // Active ports: 18/24 = 75% -> 6 active dots (#10b981), 2 inactive (#cbd5e1)
      const activeDots = Array.from(ledDots || []).filter(
        (d) => d.getAttribute('fill') === '#10b981',
      );
      const inactiveDots = Array.from(ledDots || []).filter(
        (d) => d.getAttribute('fill') === '#cbd5e1',
      );
      expect(activeDots.length).toBe(6);
      expect(inactiveDots.length).toBe(2);

      // Invariant: zero PoE or power wattage telemetry (no ⚡, no PoE, no \d+W / \d+ Watts)
      expect(swEl?.textContent).not.toContain('⚡');
      expect(swEl?.textContent).not.toMatch(/\bpoe\b/i);
      expect(swEl?.textContent).not.toMatch(/\d+\s*w(atts)?\b/i);
    });

    it('empirically verifies camera card renders clean floor location with zero watts', async () => {
      const camNode: TopologyNode = {
        id: 'cam-lobby-01',
        label: 'CAM-LOBBY-01',
        type: 'CAMERA',
        status: 'ACTIVE',
        domain: 'CCTV',
        model: 'Hikvision 4K Dome',
        ipAddress: '10.10.80.25',
        floor: 'Floor 2 Executive',
        zone: 'North Wing',
        x: 0,
        y: 0,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: camNode,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
          ),
        );
      });

      const camEl = container.querySelector('[data-testid="topology-node-camera-cam-lobby-01"]');
      expect(camEl).toBeTruthy();

      // Header & Model
      expect(camEl?.textContent).toContain('CCTV · IP CAMERA');
      expect(camEl?.textContent).toContain('CAM-LOBBY-01');
      expect(camEl?.textContent).toContain('10.10.80.25 · Hikvision 4K Dome');
      expect(camEl?.textContent).toContain('4K Ultra HD · ● Active');

      // Clean floor line with zone
      expect(camEl?.textContent).toContain('Floor: Floor 2 Executive · North Wing');

      // Invariant: zero watts or PoE telemetry
      expect(camEl?.textContent).not.toContain('⚡');
      expect(camEl?.textContent).not.toMatch(/\bpoe\b/i);
      expect(camEl?.textContent).not.toMatch(/\d+\s*w(atts)?\b/i);
    });

    it('empirically verifies AP card renders Wi-Fi 6 radio telemetry with zero watts', async () => {
      const apNode: TopologyNode = {
        id: 'ap-floor3-01',
        label: 'AP-FLOOR3-EAST',
        type: 'ACCESS_POINT',
        status: 'ONLINE',
        domain: 'NETWORK',
        model: 'Cisco Catalyst 9120',
        ipAddress: '10.10.30.50',
        x: 0,
        y: 0,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: apNode,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
          ),
        );
      });

      const apEl = container.querySelector(
        '[data-testid="topology-node-access_point-ap-floor3-01"]',
      );
      expect(apEl).toBeTruthy();

      // Header & Telemetry
      expect(apEl?.textContent).toContain('AP · WI-FI 6');
      expect(apEl?.textContent).toContain('AP-FLOOR3-EAST');
      expect(apEl?.textContent).toContain('10.10.30.50 · Cisco Catalyst 9120');
      expect(apEl?.textContent).toContain('SSID: Corp-Secure · VLAN 30');
      expect(apEl?.textContent).toContain('Wi-Fi 6 · 2.4/5 GHz Dual-Band');

      // Invariant: zero watts or PoE telemetry
      expect(apEl?.textContent).not.toContain('⚡');
      expect(apEl?.textContent).not.toMatch(/\bpoe\b/i);
      expect(apEl?.textContent).not.toMatch(/\d+\s*w(atts)?\b/i);
    });
  });

  // =========================================================================
  // TASK 6: TopologySummaryBar Exactly 3 Balanced Cards (Zero PoE Card)
  // =========================================================================
  describe('Task 6: TopologySummaryBar Exactly 3 Balanced Cards & Absence of summary-card-poe-power', () => {
    it('empirically verifies exactly 3 cards rendered and summary-card-poe-power is absent', async () => {
      const sampleMetrics = {
        totalNodes: 36,
        totalSwitches: 8,
        totalRacks: 4,
        totalCameras: 16,
        totalNvrs: 2,
        totalServers: 6,
        totalEdges: 42,
        activeLinks: 40,
        degradedLinks: 2,
        downLinks: 0,
        onlinePercentage: 95,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(TopologySummaryBar, {
                metrics: sampleMetrics,
                viewMode: 'ALL',
              }),
            ),
          ),
        );
      });

      const summaryBar = container.querySelector('[data-testid="topology-summary-bar"]');
      expect(summaryBar).toBeTruthy();

      // Invariant: summary-card-poe-power MUST NOT exist
      expect(container.querySelector('[data-testid="summary-card-poe-power"]')).toBeNull();

      // Invariant: Exactly 3 cards exist
      const card1 = container.querySelector('[data-testid="summary-card-fleet-nodes"]');
      const card2 = container.querySelector('[data-testid="summary-card-active-links"]');
      const card3 = container.querySelector('[data-testid="summary-card-health-index"]');

      expect(card1).toBeTruthy();
      expect(card2).toBeTruthy();
      expect(card3).toBeTruthy();

      const allCards = summaryBar?.querySelectorAll('.ant-card');
      expect(allCards?.length).toBe(3);

      // Verify responsive grid balance: each card is Col xs=24 sm=8 md=8
      const cols = summaryBar?.querySelectorAll('.ant-col-xs-24.ant-col-sm-8.ant-col-md-8');
      expect(cols?.length).toBe(3);

      // Verify card content
      expect(card1?.textContent).toContain('Fleet Nodes');
      expect(card1?.textContent).toContain('36');
      expect(card1?.textContent).toContain('8 Sw · 16 Cam · 4 Racks');

      expect(card2?.textContent).toContain('Active Links');
      expect(card2?.textContent).toContain('40 / 42');
      expect(card2?.textContent).toContain('40 Up');
      expect(card2?.textContent).toContain('2 Flapping');

      expect(card3?.textContent).toContain('Network Availability');
      expect(card3?.textContent).toContain('95%');

      // Verify text contains zero PoE or Thunderbolt references
      expect(summaryBar?.textContent).not.toContain('⚡');
      expect(summaryBar?.textContent).not.toMatch(/\bpoe\b/i);
    });

    it('renders CCTV perspective with Stream Health metric title and CCTV suffix', async () => {
      const cctvMetrics = {
        totalNodes: 18,
        totalCameras: 16,
        totalNvrs: 2,
        totalEdges: 18,
        activeLinks: 18,
        degradedLinks: 0,
        downLinks: 0,
        onlinePercentage: 100,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(TopologySummaryBar, {
                metrics: cctvMetrics,
                viewMode: 'CCTV',
              }),
            ),
          ),
        );
      });

      const card1 = container.querySelector('[data-testid="summary-card-fleet-nodes"]');
      expect(card1?.textContent).toContain('16 Cams · 2 NVRs');

      const card3 = container.querySelector('[data-testid="summary-card-health-index"]');
      expect(card3?.textContent).toContain('Stream Health');
      expect(card3?.textContent).toContain('100%');

      // Still zero PoE card
      expect(container.querySelector('[data-testid="summary-card-poe-power"]')).toBeNull();
    });
  });
});
