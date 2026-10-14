import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkRack } from '../../../../services/network.service';
import { NetworkTopologyCanvas } from './NetworkTopologyCanvas';
import { TopologyEdgeItem } from './TopologyEdgeItem';
import { TopologyMinimap } from './TopologyMinimap';
import { TopologyNodeItem } from './TopologyNodeItem';
import { TopologySummaryBar } from './TopologySummaryBar';
import { TopologyToolbar } from './TopologyToolbar';
import {
  calculateHierarchicalLayout,
  calculateRackGroupLayout,
  computeGraphBounds,
} from './topologyLayout.util';
import type { TopologyEdge, TopologyNode } from './types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Network Topology Canvas & Interaction Unit Tests', () => {
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

  const mockNodes: TopologyNode[] = [
    {
      id: 'rack-dc01',
      label: 'RACK-DC01',
      type: 'RACK',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 100,
    },
    {
      id: 'sw-core-01',
      label: 'BSL-CORE-SW01',
      type: 'SWITCH',
      role: 'CORE',
      status: 'ONLINE',
      domain: 'NETWORK',
      rackId: 'rack-dc01',
      totalPorts: 48,
      activePorts: 32,
      x: 350,
      y: 100,
    },
    {
      id: 'sw-cctv-01',
      label: 'BSL-CCTV-SW01',
      type: 'SWITCH',
      role: 'POE_ACCESS',
      status: 'ONLINE',
      domain: 'CCTV',
      totalPorts: 24,
      activePorts: 12,
      x: 350,
      y: 350,
    },
    {
      id: 'cam-001',
      label: 'AST-CAM-001',
      type: 'CAMERA',
      status: 'ACTIVE',
      domain: 'CCTV',
      x: 600,
      y: 350,
    },
    {
      id: 'srv-001',
      label: 'SRV-PROD-01',
      type: 'SERVER',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 750,
      y: 100,
    },
    {
      id: 'nvr-001',
      label: 'NVR-CCTV-01',
      type: 'NVR',
      status: 'ONLINE',
      domain: 'CCTV',
      x: 600,
      y: 200,
    },
    {
      id: 'ap-001',
      label: 'AP-FL01-01',
      type: 'ACCESS_POINT',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 750,
      y: 350,
    },
  ];

  const mockEdges: TopologyEdge[] = [
    {
      id: 'edge-core-cctv',
      source: 'sw-core-01',
      target: 'sw-cctv-01',
      status: 'ACTIVE',
      speed: '10 Gbps',
      media: 'FIBER',
    },
    {
      id: 'edge-cctv-cam1',
      source: 'sw-cctv-01',
      target: 'cam-001',
      status: 'ACTIVE',
      speed: '1 Gbps',
      poeEnabled: true,
    },
  ];

  describe('Auto-Layout Algorithm Utilities', () => {
    it('calculates hierarchical tier layout with Core at tier 0 and Cameras at tier 3', () => {
      const positions = calculateHierarchicalLayout(mockNodes, mockEdges, 1200);

      expect(positions['rack-dc01'].y).toBe(100);
      expect(positions['sw-core-01'].y).toBe(100);
      expect(positions['sw-cctv-01'].y).toBe(460);
      expect(positions['cam-001'].y).toBe(660);
    });

    it('calculates rack-grouped layout clustering switches by rackId', () => {
      const racks: NetworkRack[] = [
        {
          id: 'rack-dc01',
          name: 'RACK-DC01',
          code: 'RCK-01',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];
      const positions = calculateRackGroupLayout(mockNodes, mockEdges, racks);

      expect(positions['rack-dc01']).toBeDefined();
      expect(positions['sw-core-01']).toBeDefined();
      expect(positions['sw-core-01'].y).toBeGreaterThan(positions['rack-dc01'].y);
    });

    it('computes graph bounding box with boundary padding', () => {
      const bounds = computeGraphBounds(mockNodes);
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBeGreaterThan(600);
      expect(bounds.maxY).toBeGreaterThan(350);
      expect(bounds.width).toBeGreaterThanOrEqual(800);
      expect(bounds.height).toBeGreaterThanOrEqual(600);
    });
  });

  describe('SVG Node & Edge Items', () => {
    it('renders rich SVG node cards with correct test attributes', async () => {
      const onSelect = vi.fn();
      const onDragStart = vi.fn();

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: mockNodes[1], // Switch
              onSelect,
              onDragStart,
            }),
          ),
        );
      });

      const switchNode = container.querySelector('[data-testid="topology-node-switch-sw-core-01"]');
      expect(switchNode).toBeTruthy();
      expect(switchNode?.textContent).toContain('BSL-CORE-SW01');
      expect(switchNode?.textContent).toContain('32/48 Ports');

      // Test click selection
      await act(async () => {
        switchNode?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onSelect).toHaveBeenCalledWith(mockNodes[1]);
    });

    it('renders specialized node cards for Rack, Server, Camera, NVR, and AP', async () => {
      const onSelect = vi.fn();
      const onDragStart = vi.fn();

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: mockNodes[0], // Rack
              onSelect,
              onDragStart,
            }),
            createElement(TopologyNodeItem, {
              node: mockNodes[3], // Camera
              onSelect,
              onDragStart,
            }),
            createElement(TopologyNodeItem, {
              node: mockNodes[4], // Server
              onSelect,
              onDragStart,
            }),
            createElement(TopologyNodeItem, {
              node: mockNodes[5], // NVR
              onSelect,
              onDragStart,
            }),
            createElement(TopologyNodeItem, {
              node: mockNodes[6], // AP
              onSelect,
              onDragStart,
            }),
          ),
        );
      });

      // Rack check
      const rackNode = container.querySelector('[data-testid="topology-node-rack-rack-dc01"]');
      expect(rackNode).toBeTruthy();
      expect(rackNode?.textContent).toContain('42U Standard');

      // Camera check
      const cameraNode = container.querySelector('[data-testid="topology-node-camera-cam-001"]');
      expect(cameraNode).toBeTruthy();
      expect(cameraNode?.textContent).toContain('4K Ultra HD');
      expect(cameraNode?.textContent).toContain('● Active');

      // Server check
      const serverNode = container.querySelector('[data-testid="topology-node-server-srv-001"]');
      expect(serverNode).toBeTruthy();
      expect(serverNode?.textContent).toContain('Dual NIC (LACP Bond)');

      // NVR check
      const nvrNode = container.querySelector('[data-testid="topology-node-nvr-nvr-001"]');
      expect(nvrNode).toBeTruthy();
      expect(nvrNode?.textContent).toContain('32/64 Channels');

      // AP check
      const apNode = container.querySelector('[data-testid="topology-node-access_point-ap-001"]');
      expect(apNode).toBeTruthy();
      expect(apNode?.textContent).toContain('SSID: Corp-Secure');
    });

    it('renders color-coded bezier edge paths with speed telemetry pill', async () => {
      const onOpenPortConfig = vi.fn();

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: mockEdges[1], // PoE link
              sourceNode: mockNodes[2],
              targetNode: mockNodes[3],
              onOpenPortConfig,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-cctv-cam1"]');
      expect(edgeEl).toBeTruthy();
      expect(edgeEl?.textContent).toContain('⚡');
      expect(edgeEl?.textContent).toContain('1 Gbps');
    });

    it('dims non-path nodes with opacity 0.35 and transition when hasHighlightedPath is true', async () => {
      const onSelect = vi.fn();
      const onDragStart = vi.fn();

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            // Non-path node (should be dimmed)
            createElement(TopologyNodeItem, {
              node: mockNodes[4], // Server
              hasHighlightedPath: true,
              isHighlighted: false,
              isSelected: false,
              onSelect,
              onDragStart,
            }),
            // Highlighted path node (should NOT be dimmed)
            createElement(TopologyNodeItem, {
              node: mockNodes[1], // Switch
              hasHighlightedPath: true,
              isHighlighted: true,
              isSelected: false,
              onSelect,
              onDragStart,
            }),
            // Selected node (should NOT be dimmed)
            createElement(TopologyNodeItem, {
              node: mockNodes[3], // Camera
              hasHighlightedPath: true,
              isHighlighted: false,
              isSelected: true,
              onSelect,
              onDragStart,
            }),
            // Normal state (hasHighlightedPath = false)
            createElement(TopologyNodeItem, {
              node: mockNodes[0], // Rack
              hasHighlightedPath: false,
              isHighlighted: false,
              isSelected: false,
              onSelect,
              onDragStart,
            }),
          ),
        );
      });

      const serverNode = container.querySelector('[data-testid="topology-node-server-srv-001"]');
      const switchNode = container.querySelector('[data-testid="topology-node-switch-sw-core-01"]');
      const cameraNode = container.querySelector('[data-testid="topology-node-camera-cam-001"]');
      const rackNode = container.querySelector('[data-testid="topology-node-rack-rack-dc01"]');

      expect(serverNode?.getAttribute('opacity')).toBe('0.35');
      expect((serverNode as SVGElement | null)?.style.transition).toContain('opacity 0.25s ease');

      expect(switchNode?.getAttribute('opacity')).toBe('1');
      expect(cameraNode?.getAttribute('opacity')).toBe('1');
      expect(rackNode?.getAttribute('opacity')).toBe('1');
    });

    it('dims non-path edges with opacity 0.25 and transition when hasHighlightedPath is true', async () => {
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            // Dimmed non-path edge
            createElement(TopologyEdgeItem, {
              edge: mockEdges[0],
              sourceNode: mockNodes[1],
              targetNode: mockNodes[2],
              hasHighlightedPath: true,
              isHighlighted: false,
            }),
            // Highlighted path edge
            createElement(TopologyEdgeItem, {
              edge: mockEdges[1],
              sourceNode: mockNodes[2],
              targetNode: mockNodes[3],
              hasHighlightedPath: true,
              isHighlighted: true,
            }),
          ),
        );
      });

      const dimmedEdge = container.querySelector('[data-testid="topology-edge-edge-core-cctv"]');
      const highlightedEdge = container.querySelector('[data-testid="topology-edge-edge-cctv-cam1"]');

      expect(dimmedEdge?.getAttribute('opacity')).toBe('0.25');
      expect((dimmedEdge as SVGElement | null)?.style.transition).toContain('opacity 0.25s ease');
      expect(highlightedEdge?.getAttribute('opacity')).toBe('1');
    });
  });

  describe('Topology Minimap & Toolbar', () => {
    it('renders minimap with node dots and viewport rect', async () => {
      const onJumpTo = vi.fn();
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(TopologyMinimap, {
            nodes: mockNodes,
            panX: 50,
            panY: 30,
            zoom: 1,
            containerWidth: 1200,
            containerHeight: 700,
            onJumpTo,
          }),
        );
      });

      const minimap = container.querySelector('[data-testid="topology-minimap"]');
      expect(minimap).toBeTruthy();
      const circles = minimap?.querySelectorAll('circle');
      expect(circles?.length).toBe(mockNodes.length);
    });

    it('renders toolbar with perspective segmented control and action buttons', async () => {
      const onViewModeChange = vi.fn();
      const onSearchChange = vi.fn();
      const onOpenPatchModal = vi.fn();

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
              createElement(TopologyToolbar, {
                viewMode: 'ALL',
                onViewModeChange,
                searchQuery: '',
                onSearchChange,
                onOpenPatchModal,
                totalNodes: 7,
                totalEdges: 2,
              }),
            ),
          ),
        );
      });

      const switcher = container.querySelector('[data-testid="topology-view-switcher"]');
      expect(switcher).toBeTruthy();

      const patchBtn = container.querySelector('[data-testid="patch-cable-button"]');
      expect(patchBtn).toBeTruthy();

      await act(async () => {
        (patchBtn as HTMLElement)?.click();
      });
      expect(onOpenPatchModal).toHaveBeenCalled();
    });
  });

  describe('TopologySummaryBar Telemetry Deck', () => {
    const mockMetrics = {
      totalNodes: 45,
      totalSwitches: 8,
      totalRacks: 3,
      totalEndpoints: 34,
      totalCameras: 22,
      totalNvrs: 2,
      totalServers: 10,
      totalEdges: 52,
      activeLinks: 48,
      degradedLinks: 2,
      downLinks: 2,
      poePowerUsageWatts: 338.8,
      onlinePercentage: 92,
    };

    it('renders all 4 metric cards adapting to ALL perspective', async () => {
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
                metrics: mockMetrics,
                viewMode: 'ALL',
              }),
            ),
          ),
        );
      });

      const bar = container.querySelector('[data-testid="topology-summary-bar"]');
      expect(bar).toBeTruthy();

      // Fleet nodes card
      const fleetCard = container.querySelector('[data-testid="summary-card-fleet-nodes"]');
      expect(fleetCard?.textContent).toContain('45');
      expect(fleetCard?.textContent).toContain('8 Sw · 22 Cam · 3 Racks');

      // Active links card
      const linksCard = container.querySelector('[data-testid="summary-card-active-links"]');
      expect(linksCard?.textContent).toContain('48 / 52');
      expect(linksCard?.textContent).toContain('48 Up');
      expect(linksCard?.textContent).toContain('2 Flapping');
      expect(linksCard?.textContent).toContain('2 Down');

      // PoE Power Draw card
      const poeCard = container.querySelector('[data-testid="summary-card-poe-power"]');
      expect(poeCard?.textContent).toContain('338.8');
      expect(poeCard?.textContent).toContain('W');

      // Health index card
      const healthCard = container.querySelector('[data-testid="summary-card-health-index"]');
      expect(healthCard?.textContent).toContain('Network Availability');
      expect(healthCard?.textContent).toContain('92%');
    });

    it('adapts summary labels to NETWORK and CCTV perspectives', async () => {
      const root = createRoot(container);
      currentRoot = root;

      // NETWORK view
      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(TopologySummaryBar, {
                metrics: mockMetrics,
                viewMode: 'NETWORK',
              }),
            ),
          ),
        );
      });

      const fleetCardNet = container.querySelector('[data-testid="summary-card-fleet-nodes"]');
      expect(fleetCardNet?.textContent).toContain('8 Switches · 10 Servers');

      // CCTV view
      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(TopologySummaryBar, {
                metrics: mockMetrics,
                viewMode: 'CCTV',
              }),
            ),
          ),
        );
      });

      const fleetCardCctv = container.querySelector('[data-testid="summary-card-fleet-nodes"]');
      expect(fleetCardCctv?.textContent).toContain('22 Cams · 2 NVRs');

      const healthCardCctv = container.querySelector('[data-testid="summary-card-health-index"]');
      expect(healthCardCctv?.textContent).toContain('Stream Health');
    });
  });

  describe('NetworkTopologyCanvas Container', () => {
    it('renders full interactive canvas with toolbar, SVG layers, and minimap', async () => {
      const onSelectNode = vi.fn();
      const onSaveLayout = vi.fn();

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
                nodes: mockNodes,
                edges: mockEdges,
                onSelectNode,
                onSaveLayout,
                hasUnsavedChanges: true,
              }),
            ),
          ),
        );
      });

      const canvas = container.querySelector('[data-testid="topology-canvas"]');
      expect(canvas).toBeTruthy();

      const saveLayoutBtn = container.querySelector('[data-testid="save-layout-button"]');
      expect(saveLayoutBtn).toBeTruthy();
      expect((saveLayoutBtn as HTMLButtonElement).disabled).toBe(false);

      const zoomInBtn = container.querySelector('[data-testid="zoom-in-button"]');
      expect(zoomInBtn).toBeTruthy();

      const fitBtn = container.querySelector('[data-testid="fit-to-screen-button"]');
      expect(fitBtn).toBeTruthy();

      const zoomResetBtn = container.querySelector('[data-testid="zoom-reset-button"]');
      expect(zoomResetBtn).toBeTruthy();
      expect(zoomResetBtn?.textContent).toContain('100%');
    });

    it('highlights upstream path and traverses bidirectional trunk links while dimming non-path elements', async () => {
      const onSelectNode = vi.fn();

      const extendedEdges: TopologyEdge[] = [
        ...mockEdges,
        // Reverse-direction trunk link (source is core switch, target is dist switch)
        {
          id: 'edge-trunk-core-dist',
          source: 'sw-core-01',
          target: 'sw-dist-01',
          subType: 'TRUNK',
          type: 'TRUNK',
          status: 'ACTIVE',
        },
      ];

      const extendedNodes: TopologyNode[] = [
        ...mockNodes,
        {
          id: 'sw-dist-01',
          label: 'BSL-DIST-SW01',
          type: 'SWITCH',
          role: 'DISTRIBUTION',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 500,
          y: 200,
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
                nodes: extendedNodes,
                edges: extendedEdges,
                onSelectNode,
              }),
            ),
          ),
        );
      });

      // Click cam-001 node to trigger path highlighting
      const camNode = container.querySelector('[data-testid="topology-node-camera-cam-001"]');
      expect(camNode).toBeTruthy();

      await act(async () => {
        camNode?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(onSelectNode).toHaveBeenCalled();

      // Non-path server node should be dimmed (opacity 0.35)
      const serverNode = container.querySelector('[data-testid="topology-node-server-srv-001"]');
      expect(serverNode?.getAttribute('opacity')).toBe('0.35');

      // Connected CCTV switch in path should NOT be dimmed (opacity 1.0)
      const cctvSwitchNode = container.querySelector('[data-testid="topology-node-switch-sw-cctv-01"]');
      expect(cctvSwitchNode?.getAttribute('opacity')).toBe('1');

      // Upstream core switch in path should NOT be dimmed (opacity 1.0)
      const coreSwitchNode = container.querySelector('[data-testid="topology-node-switch-sw-core-01"]');
      expect(coreSwitchNode?.getAttribute('opacity')).toBe('1');

      // Dist switch connected via bidirectional trunk should also be traversed (opacity 1.0)
      const distSwitchNode = container.querySelector('[data-testid="topology-node-switch-sw-dist-01"]');
      expect(distSwitchNode?.getAttribute('opacity')).toBe('1');
    });
  });

  describe('Fullscreen State Invariants & Event Synchronization', () => {
    it('toggles fullscreen asynchronously and synchronizes on native fullscreenchange', async () => {
      const root = createRoot(container);
      currentRoot = root;

      let fullscreenElementMock: Element | null = null;
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => fullscreenElementMock,
      });

      const requestFullscreenSpy = vi.fn().mockImplementation(() => {
        fullscreenElementMock = container;
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      });

      const exitFullscreenSpy = vi.fn().mockImplementation(() => {
        fullscreenElementMock = null;
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      });

      HTMLElement.prototype.requestFullscreen = requestFullscreenSpy;
      document.exitFullscreen = exitFullscreenSpy;

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(NetworkTopologyCanvas, {
                nodes: mockNodes,
                edges: mockEdges,
                onSelectNode: vi.fn(),
              }),
            ),
          ),
        );
      });

      const fsButton = container.querySelector('.anticon-fullscreen')?.closest('button');
      expect(fsButton).toBeTruthy();

      await act(async () => {
        fsButton?.click();
      });
      expect(requestFullscreenSpy).toHaveBeenCalled();
      expect(container.querySelector('.anticon-fullscreen-exit')).toBeTruthy();

      await act(async () => {
        fullscreenElementMock = null;
        document.dispatchEvent(new Event('fullscreenchange'));
      });
      expect(container.querySelector('.anticon-fullscreen')).toBeTruthy();
    });

    it('gracefully handles fullscreen policy rejection without unhandled rejections', async () => {
      const root = createRoot(container);
      currentRoot = root;

      HTMLElement.prototype.requestFullscreen = vi.fn().mockRejectedValue(new Error('Permission denied'));

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(NetworkTopologyCanvas, {
                nodes: mockNodes,
                edges: mockEdges,
                onSelectNode: vi.fn(),
              }),
            ),
          ),
        );
      });

      const fsButton = container.querySelector('.anticon-fullscreen')?.closest('button');
      await act(async () => {
        fsButton?.click();
      });

      expect(container.querySelector('.anticon-fullscreen')).toBeTruthy();
    });
  });
});
