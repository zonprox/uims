import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkTopologyCanvas } from './NetworkTopologyCanvas';
import { TopologyEdgeItem } from './TopologyEdgeItem';
import { TopologyNodeItem } from './TopologyNodeItem';
import type { TopologyEdge, TopologyNode } from './types';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Adversarial Challenge: Topology Node/Edge Invariants & Teardown Rigor', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;
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

    // Strict AGENTS.md §8 cleanup: clear stray portal DOM elements
    document
      .querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover, .ant-message')
      .forEach((el) => {
        el.remove();
      });

    // Invariant: zero unhandled promise rejections
    expect(unhandledRejections).toEqual([]);
  });

  describe('Invariant 1: Rack Node Elevation Gauge & RU Meter', () => {
    it('empirically renders 42U vertical elevation gauge, occupied RU meter, tick marks, and switch count', async () => {
      const rackNode: TopologyNode = {
        id: 'rack-test-01',
        label: 'RACK-MAIN-01',
        type: 'RACK',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 100,
        y: 100,
        data: {
          switchCount: 6,
          maxPowerKw: 4.8,
          location: 'Floor 2 Data Center',
        },
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: rackNode,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
          ),
        );
      });

      const rackEl = container.querySelector('[data-testid="topology-node-rack-rack-test-01"]');
      expect(rackEl).toBeTruthy();

      // Check header title
      expect(rackEl?.textContent).toContain('RACK · 42U');
      expect(rackEl?.textContent).toContain('RACK-MAIN-01');

      // Check rack elevation body group
      const rackBody = rackEl?.querySelector('.rack-node-body');
      expect(rackBody).toBeTruthy();

      // Check 42U vertical elevation chassis rect (x=8, y=28, width=12, height=58, fill=#1e293b)
      const gaugeBackground = rackBody?.querySelector('rect[fill="#1e293b"]');
      expect(gaugeBackground).toBeTruthy();
      expect(gaugeBackground?.getAttribute('width')).toBe('12');
      expect(gaugeBackground?.getAttribute('height')).toBe('58');

      // Check occupied RU meter fill rect (fill=#a855f7)
      const ruMeterFill = rackBody?.querySelector('rect[fill="#a855f7"]');
      expect(ruMeterFill).toBeTruthy();
      expect(ruMeterFill?.getAttribute('width')).toBe('10');

      // Check tick marks (3 lines)
      const tickMarks = rackBody?.querySelectorAll('line[stroke="#64748b"]');
      expect(tickMarks?.length).toBe(3);

      // Check switch count and 42U Standard label
      expect(rackBody?.textContent).toContain('6 Switches (42U Standard)');
      expect(rackBody?.textContent).toContain('4.8 kW Capacity');
      expect(rackBody?.textContent).toContain('Floor 2 Data Center');
    });

    it('gracefully handles empty rack data with fallback capacity and switch count', async () => {
      const bareRackNode: TopologyNode = {
        id: 'rack-bare',
        label: 'RACK-EMPTY',
        type: 'RACK',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 50,
        y: 50,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: bareRackNode,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
          ),
        );
      });

      const rackEl = container.querySelector('[data-testid="topology-node-rack-rack-bare"]');
      expect(rackEl).toBeTruthy();
      expect(rackEl?.textContent).toContain('4 Switches (42U Standard)');
      expect(rackEl?.textContent).toContain('2.4 kW Capacity');
      expect(rackEl?.textContent).toContain('Server Room · DC-01');
    });
  });

  describe('Invariant 2: Switch Node Port Matrix & PoE Budget', () => {
    it('empirically renders 8-dot micro LED port matrix and active LED coloring', async () => {
      const switchNode: TopologyNode = {
        id: 'sw-access-01',
        label: 'SW-ACCESS-01',
        type: 'SWITCH',
        role: 'ACCESS',
        status: 'ONLINE',
        domain: 'NETWORK',
        totalPorts: 48,
        activePorts: 24, // 50% active -> 4 active LEDs, 4 inactive
        x: 200,
        y: 200,
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

      const swEl = container.querySelector('[data-testid="topology-node-switch-sw-access-01"]');
      expect(swEl).toBeTruthy();
      expect(swEl?.textContent).toContain('24/48 Ports');

      // Port matrix: exactly 8 micro LED dots
      const ledGroup = swEl?.querySelector('.switch-micro-leds');
      expect(ledGroup).toBeTruthy();
      const leds = ledGroup?.querySelectorAll('circle');
      expect(leds?.length).toBe(8);

      // Check active (green #10b981) vs inactive (#cbd5e1) ratio
      const activeLeds = Array.from(leds || []).filter((c) => c.getAttribute('fill') === '#10b981');
      const inactiveLeds = Array.from(leds || []).filter(
        (c) => c.getAttribute('fill') === '#cbd5e1',
      );

      // 24 / 48 = 0.5 * 8 = 4 active LEDs
      expect(activeLeds.length).toBe(4);
      expect(inactiveLeds.length).toBe(4);
    });

    it('empirically renders active ports capacity telemetry on switches and zero PoE strings', async () => {
      const swWithPorts: TopologyNode = {
        id: 'sw-capacity-01',
        label: 'SW-DIST-01',
        type: 'SWITCH',
        role: 'DISTRIBUTION',
        status: 'ONLINE',
        domain: 'NETWORK',
        activePorts: 18,
        totalPorts: 24,
        x: 0,
        y: 0,
      };

      const swCore: TopologyNode = {
        id: 'sw-core-01',
        label: 'SW-CORE-01',
        type: 'SWITCH',
        role: 'CORE',
        status: 'ONLINE',
        domain: 'NETWORK',
        activePorts: 40,
        totalPorts: 48,
        x: 250,
        y: 0,
      };

      const swDefault: TopologyNode = {
        id: 'sw-access-01',
        label: 'SW-ACC-01',
        type: 'SWITCH',
        role: 'ACCESS',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 500,
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
              node: swWithPorts,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
            createElement(TopologyNodeItem, {
              node: swCore,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
            createElement(TopologyNodeItem, {
              node: swDefault,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
          ),
        );
      });

      const elDist = container.querySelector('[data-testid="topology-node-switch-sw-capacity-01"]');
      expect(elDist?.textContent).toContain('18/24 Ports Active · DISTRIBUTION');
      expect(elDist?.textContent).not.toContain('⚡');
      expect(elDist?.textContent).not.toContain('PoE');

      const elCore = container.querySelector('[data-testid="topology-node-switch-sw-core-01"]');
      expect(elCore?.textContent).toContain('40/48 Ports Active · CORE');
      expect(elCore?.textContent).not.toContain('⚡');

      const elDefault = container.querySelector(
        '[data-testid="topology-node-switch-sw-access-01"]',
      );
      expect(elDefault?.textContent).toContain('0/24 Ports Active · ACCESS');
      expect(elDefault?.textContent).not.toContain('⚡');
    });
  });

  describe('Invariant 3: Camera Node 4K Ultra HD Badge & Stream Status', () => {
    it('empirically renders 4K Ultra HD badge, active stream status dot, and PoE draw', async () => {
      const activeCam: TopologyNode = {
        id: 'cam-active-01',
        label: 'CAM-LOBBY-4K',
        type: 'CAMERA',
        status: 'ACTIVE',
        domain: 'CCTV',
        ipAddress: '10.10.80.101',
        model: 'Uniview 4K Bullet',
        floor: 'Lobby Ground Floor',
        x: 100,
        y: 100,
      };

      const offlineCam: TopologyNode = {
        id: 'cam-down-01',
        label: 'CAM-PARKING-DOWN',
        type: 'CAMERA',
        status: 'DOWN',
        domain: 'CCTV',
        ipAddress: '10.10.80.102',
        x: 350,
        y: 100,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: activeCam,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
            createElement(TopologyNodeItem, {
              node: offlineCam,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
          ),
        );
      });

      const elActive = container.querySelector(
        '[data-testid="topology-node-camera-cam-active-01"]',
      );
      expect(elActive).toBeTruthy();
      expect(elActive?.textContent).toContain('CCTV · IP CAMERA');
      expect(elActive?.textContent).toContain('CAM-LOBBY-4K');
      expect(elActive?.textContent).toContain('10.10.80.101 · Uniview 4K Bullet');
      expect(elActive?.textContent).toContain('4K Ultra HD · ● Active');
      expect(elActive?.textContent).toContain('Floor: Lobby Ground Floor');
      expect(elActive?.textContent).not.toContain('⚡');

      const elDown = container.querySelector('[data-testid="topology-node-camera-cam-down-01"]');
      expect(elDown).toBeTruthy();
      expect(elDown?.textContent).toContain('4K Ultra HD · ▲ DOWN');
    });
  });

  describe('Invariant 4: Server Node Dual-Homing Badge & Enterprise Compute', () => {
    it('empirically renders dual-homing LACP badge, trunk specs, and server header', async () => {
      const serverNode: TopologyNode = {
        id: 'srv-lacp-01',
        label: 'ESXI-HOST-01',
        type: 'SERVER',
        status: 'ONLINE',
        domain: 'NETWORK',
        ipAddress: '10.10.20.11',
        model: 'Dell PowerEdge R750',
        x: 100,
        y: 100,
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyNodeItem, {
              node: serverNode,
              onSelect: vi.fn(),
              onDragStart: vi.fn(),
            }),
          ),
        );
      });

      const srvEl = container.querySelector('[data-testid="topology-node-server-srv-lacp-01"]');
      expect(srvEl).toBeTruthy();
      expect(srvEl?.textContent).toContain('SERVER · COMPUTE');
      expect(srvEl?.textContent).toContain('ESXI-HOST-01');
      expect(srvEl?.textContent).toContain('10.10.20.11 · Dell PowerEdge R750');
      expect(srvEl?.textContent).toContain('⇄ Dual NIC (LACP Bond)');
      expect(srvEl?.textContent).toContain('Enterprise Host · 2x 10G Trunk');
    });
  });

  describe('Invariant 5: Edge Component Explicit Port-to-Port Labels & Dynamic Speed Pill', () => {
    const srcNode: TopologyNode = {
      id: 'src-sw',
      label: 'SW-SRC',
      type: 'SWITCH',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 100,
    };

    const tgtNode: TopologyNode = {
      id: 'tgt-cam',
      label: 'CAM-TGT',
      type: 'CAMERA',
      status: 'ACTIVE',
      domain: 'CCTV',
      x: 100,
      y: 300,
    };

    it('renders explicit port-to-port label for endpoint link with dynamic pill and clean white fill', async () => {
      const edgeEndpoint: TopologyEdge = {
        id: 'edge-cam-endpoint',
        source: 'src-sw',
        target: 'tgt-cam',
        status: 'ACTIVE',
        speed: '1 Gbps',
        sourcePortName: 'Gi1/0/5',
        targetPortName: 'eth0',
      };

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: edgeEndpoint,
              sourceNode: srcNode,
              targetNode: tgtNode,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-cam-endpoint"]');
      expect(edgeEl).toBeTruthy();

      // Text contains explicit port mapping and speed without ⚡
      expect(edgeEl?.textContent).toContain('Gi1/0/5 → eth0 · 1 Gbps');
      expect(edgeEl?.textContent).not.toContain('⚡');

      // Verify clean white pill styling: fill="#ffffff"
      const pillRect = edgeEl?.querySelector('rect[fill="#ffffff"]');
      expect(pillRect).toBeTruthy();

      // Verify SVG title tooltip
      const titleEl = edgeEl?.querySelector('title');
      expect(titleEl?.textContent).toContain('SW-SRC [Gi1/0/5] ↔ CAM-TGT [eth0]');
      expect(titleEl?.textContent).toContain('Speed: 1 Gbps');
    });

    it('renders explicit port-to-port label for trunk link between switches', async () => {
      const tgtSwitch: TopologyNode = {
        id: 'tgt-sw',
        label: 'SW-TGT',
        type: 'SWITCH',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 400,
        y: 100,
      };

      const edgeTrunk: TopologyEdge = {
        id: 'edge-sw-trunk',
        source: 'src-sw',
        target: 'tgt-sw',
        status: 'ACTIVE',
        speed: '10 Gbps',
        sourcePortName: 'Te1/0/49',
        targetPortName: 'Te1/0/1',
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
              sourceNode: srcNode,
              targetNode: tgtSwitch,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-sw-trunk"]');
      expect(edgeEl).toBeTruthy();
      expect(edgeEl?.textContent).toContain('Te1/0/49 ↔ Te1/0/1 · 10 Gbps');
      expect(edgeEl?.textContent).not.toContain('⚡');

      const pillRect = edgeEl?.querySelector('rect[fill="#ffffff"]');
      expect(pillRect).toBeTruthy();
    });

    it('renders non-PoE standard speed pill with transparent 14px click hit target', async () => {
      const edgeStandard: TopologyEdge = {
        id: 'edge-trunk-fiber',
        source: 'src-sw',
        target: 'tgt-cam',
        status: 'ACTIVE',
        speed: '10 Gbps',
        media: 'FIBER',
        sourcePortId: 'port-sw-01',
      };

      const onOpenPortConfig = vi.fn();
      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(
            'svg',
            null,
            createElement(TopologyEdgeItem, {
              edge: edgeStandard,
              sourceNode: srcNode,
              targetNode: tgtNode,
              onOpenPortConfig,
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-trunk-fiber"]');
      expect(edgeEl).toBeTruthy();

      // Does not have PoE ⚡ prefix
      expect(edgeEl?.textContent).not.toContain('⚡');
      expect(edgeEl?.textContent).toContain('10 Gbps');

      // Invisible 14px click hit target
      const hitTarget = edgeEl?.querySelector('path[stroke="transparent"][stroke-width="14"]');
      expect(hitTarget).toBeTruthy();

      // Click triggers port config drawer handler with sourcePortId
      await act(async () => {
        edgeEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onOpenPortConfig).toHaveBeenCalledWith('port-sw-01');
    });

    it('safely returns null when sourceNode or targetNode is missing without throwing', async () => {
      const edgeOrphan: TopologyEdge = {
        id: 'edge-orphan',
        source: 'unknown-src',
        target: 'unknown-tgt',
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
              edge: edgeOrphan,
              // missing sourceNode and targetNode
            }),
          ),
        );
      });

      const edgeEl = container.querySelector('[data-testid="topology-edge-edge-orphan"]');
      expect(edgeEl).toBeNull();
    });
  });

  describe('Invariant 6: Full Interactive Canvas Teardown & React 19 Act Safety', () => {
    it('survives rapid mounting, unmounting, and re-mounting with zero leaks', async () => {
      for (let i = 0; i < 5; i++) {
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
                  nodes: [
                    {
                      id: `node-${i}`,
                      label: `Node ${i}`,
                      type: 'SWITCH' as const,
                      status: 'ONLINE' as const,
                      domain: 'NETWORK' as const,
                      x: 0,
                      y: 0,
                    },
                  ],
                  edges: [],
                  onSelectNode: vi.fn(),
                }),
              ),
            ),
          );
        });

        expect(container.querySelector('[data-testid="topology-canvas"]')).toBeTruthy();

        await act(async () => {
          root.unmount();
        });
        currentRoot = null;
        expect(container.querySelector('[data-testid="topology-canvas"]')).toBeNull();
      }
    });
  });

  describe('Invariant 7: Native Fullscreen Synchronization & Error Resilience', () => {
    it('synchronizes isFullscreen state and container dimensions on native fullscreenchange', async () => {
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
                nodes: [
                  {
                    id: 'node-sw1',
                    label: 'SW1',
                    type: 'SWITCH' as const,
                    status: 'ONLINE' as const,
                    domain: 'NETWORK' as const,
                    x: 0,
                    y: 0,
                  },
                ],
                edges: [],
                onSelectNode: vi.fn(),
              }),
            ),
          ),
        );
      });

      const canvasContainer = container.querySelector(
        '[data-testid="topology-canvas"]',
      )?.parentElement;
      expect(canvasContainer?.style.height).toBe('calc(100vh - 320px)');
      const fsBtn = container.querySelector('.anticon-fullscreen')?.closest('button');
      expect(fsBtn).toBeTruthy();

      // Enter fullscreen
      await act(async () => {
        fsBtn?.click();
      });
      expect(requestFullscreenSpy).toHaveBeenCalled();
      expect(canvasContainer?.style.height).toBe('100vh');
      expect(container.querySelector('.anticon-fullscreen-exit')).toBeTruthy();

      // Native exit (e.g. Escape key dispatched by browser)
      await act(async () => {
        fullscreenElementMock = null;
        document.dispatchEvent(new Event('fullscreenchange'));
      });
      expect(canvasContainer?.style.height).toBe('calc(100vh - 320px)');
      expect(container.querySelector('.anticon-fullscreen')).toBeTruthy();
    });

    it('gracefully handles fullscreen policy rejection with user feedback and 0 crashes', async () => {
      const root = createRoot(container);
      currentRoot = root;

      HTMLElement.prototype.requestFullscreen = vi
        .fn()
        .mockRejectedValue(new Error('Fullscreen denied'));

      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(NetworkTopologyCanvas, {
                nodes: [
                  {
                    id: 'node-sw1',
                    label: 'SW1',
                    type: 'SWITCH' as const,
                    status: 'ONLINE' as const,
                    domain: 'NETWORK' as const,
                    x: 0,
                    y: 0,
                  },
                ],
                edges: [],
                onSelectNode: vi.fn(),
              }),
            ),
          ),
        );
      });

      const canvasContainer = container.querySelector(
        '[data-testid="topology-canvas"]',
      )?.parentElement;
      const fsBtn = container.querySelector('.anticon-fullscreen')?.closest('button');

      await act(async () => {
        fsBtn?.click();
      });

      // Canvas remains at default height and does not crash or desync
      expect(canvasContainer?.style.height).toBe('calc(100vh - 320px)');
      expect(container.querySelector('.anticon-fullscreen')).toBeTruthy();
      expect(container.querySelector('.anticon-fullscreen-exit')).toBeNull();
    });
  });
});
