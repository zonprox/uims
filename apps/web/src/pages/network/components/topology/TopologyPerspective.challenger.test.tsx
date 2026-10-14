import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../../services/assets.service';
import type { Subnet, VLAN } from '../../../../services/network.service';
import { networkService } from '../../../../services/network.service';
import { useTopologyStore } from '../../../../stores/topology.store';
import { TopologyMapTab } from './TopologyMapTab';
import { TopologySummaryBar } from './TopologySummaryBar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockVlans: VLAN[] = [
  {
    id: 'vlan-10',
    vlanNumber: 10,
    name: 'Core Servers',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'vlan-105',
    vlanNumber: 105,
    name: 'CCTV Surveillance',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockSubnets: Subnet[] = [
  {
    id: 'sub-10',
    cidr: '10.0.10.0/24',
    name: 'Core Server Subnet',
    vlanId: 'vlan-10',
    gateway: '10.0.10.1',
    networkAddress: '10.0.10.0',
    netmask: '255.255.255.0',
    broadcastAddress: '10.0.10.255',
    startIp: '10.0.10.2',
    endIp: '10.0.10.254',
    totalIps: 254,
    usedIps: 10,
    reservedIps: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockAssets: Asset[] = [];

const mockTopologyResponse = {
  nodes: [
    {
      id: 'rack-01',
      label: 'RCK-MDF-01',
      type: 'RACK' as const,
      status: 'ONLINE' as const,
      domain: 'NETWORK' as const,
      x: 100,
      y: 100,
    },
    {
      id: 'sw-01',
      label: 'SW-CORE-01',
      type: 'SWITCH' as const,
      role: 'CORE',
      status: 'ONLINE' as const,
      domain: 'NETWORK' as const,
      x: 300,
      y: 100,
    },
    {
      id: 'cam-01',
      label: 'CAM-FL1-01',
      type: 'CAMERA' as const,
      status: 'ONLINE' as const,
      domain: 'CCTV' as const,
      x: 500,
      y: 200,
    },
  ],
  edges: [
    {
      id: 'edge-01',
      source: 'sw-01',
      target: 'cam-01',
      status: 'ACTIVE' as const,
      domain: 'CCTV' as const,
      speed: '1 Gbps',
      poeEnabled: true,
    },
  ],
  racks: [
    {
      id: 'rack-01',
      name: 'MDF Main Rack',
      code: 'RCK-MDF-01',
      status: 'ACTIVE',
      switchCount: 1,
      positionX: 100,
      positionY: 100,
    },
  ],
  vlans: mockVlans,
  subnets: mockSubnets,
  metrics: {
    totalNodes: 3,
    totalSwitches: 1,
    totalRacks: 1,
    totalEndpoints: 1,
    totalCameras: 1,
    totalNvrs: 0,
    totalServers: 0,
    totalEdges: 1,
    activeLinks: 1,
    degradedLinks: 0,
    downLinks: 0,
    poePowerUsageWatts: 15.4,
    onlinePercentage: 100,
  },
};

describe('Topology Perspective & Sub-Filter Challenger Harness', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  let getTopologySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset store state
    useTopologyStore.setState({
      viewMode: 'ALL',
      filters: {},
      searchQuery: '',
      hasUnsavedLayout: false,
      dirtyPositions: {},
      selectedNodeId: null,
    });

    getTopologySpy = vi
      .spyOn(networkService, 'getTopology')
      .mockResolvedValue(mockTopologyResponse as unknown as import('@uims/shared-types').NetworkTopologyData);
    vi.spyOn(networkService, 'getSwitches').mockResolvedValue([]);
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
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-select-dropdown')
      .forEach((el) => el.remove());
    vi.restoreAllMocks();
  });

  const renderTopologyMapTab = async () => {
    const root = createRoot(container);
    currentRoot = root;
    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: testQueryClient },
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(TopologyMapTab, {
                vlans: mockVlans,
                subnets: mockSubnets,
                assets: mockAssets,
              }),
            ),
          ),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  it('verifies perspective switching from ALL to NETWORK and CCTV triggers query modes', async () => {
    await renderTopologyMapTab();

    // 1. Initial view: ALL
    expect(useTopologyStore.getState().viewMode).toBe('ALL');
    expect(getTopologySpy).toHaveBeenCalledWith(expect.objectContaining({ mode: 'ALL' }));
    expect(container.querySelector('[data-testid="topology-rack-filter"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="topology-role-filter"]')).toBeNull();
    expect(container.querySelector('[data-testid="topology-floor-filter"]')).toBeNull();

    // 2. Switch to NETWORK
    const networkOption = Array.from(
      container.querySelectorAll('.ant-segmented-item-label'),
    ).find((el) => el.textContent?.includes('Network Only'));
    expect(networkOption).toBeTruthy();

    await act(async () => {
      (networkOption as HTMLElement)?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(useTopologyStore.getState().viewMode).toBe('NETWORK');
    expect(getTopologySpy).toHaveBeenCalledWith(expect.objectContaining({ mode: 'NETWORK' }));
    expect(container.querySelector('[data-testid="topology-role-filter"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="topology-vlan-filter"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="topology-rack-filter"]')).toBeNull();
    expect(container.querySelector('[data-testid="topology-floor-filter"]')).toBeNull();

    // 3. Switch to CCTV
    const cctvOption = Array.from(
      container.querySelectorAll('.ant-segmented-item-label'),
    ).find((el) => el.textContent?.includes('CCTV System'));
    expect(cctvOption).toBeTruthy();

    await act(async () => {
      (cctvOption as HTMLElement)?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(useTopologyStore.getState().viewMode).toBe('CCTV');
    expect(getTopologySpy).toHaveBeenCalledWith(expect.objectContaining({ mode: 'CCTV' }));
    expect(container.querySelector('[data-testid="topology-floor-filter"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="topology-status-filter"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="topology-role-filter"]')).toBeNull();
    expect(container.querySelector('[data-testid="topology-vlan-filter"]')).toBeNull();
  });

  it('detects defect: NETWORK perspective role filter binds to "status" instead of "switchRole"', async () => {
    await renderTopologyMapTab();

    // Switch to NETWORK view
    const networkOption = Array.from(
      container.querySelectorAll('.ant-segmented-item-label'),
    ).find((el) => el.textContent?.includes('Network Only'));

    await act(async () => {
      (networkOption as HTMLElement)?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Directly invoke setFilter to simulate role selection
    await act(async () => {
      useTopologyStore.getState().setFilter('status', 'CORE');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Check query params sent to networkService.getTopology
    const lastCall = getTopologySpy.mock.calls[getTopologySpy.mock.calls.length - 1][0];
    // Notice that it sends status: 'CORE' which is invalid for Prisma SwitchStatus (ONLINE, OFFLINE, MAINTENANCE)
    expect(lastCall).toEqual(expect.objectContaining({ mode: 'NETWORK', status: 'CORE' }));
  });

  it('detects defect: CCTV perspective status filter binds non-SwitchStatus values ("ACTIVE", "CONNECTED_NO_SIGNAL", "DOWN")', async () => {
    await renderTopologyMapTab();

    // Switch to CCTV view
    const cctvOption = Array.from(
      container.querySelectorAll('.ant-segmented-item-label'),
    ).find((el) => el.textContent?.includes('CCTV System'));

    await act(async () => {
      (cctvOption as HTMLElement)?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Simulate status filter selection
    await act(async () => {
      useTopologyStore.getState().setFilter('status', 'ACTIVE');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const lastCall = getTopologySpy.mock.calls[getTopologySpy.mock.calls.length - 1][0];
    expect(lastCall).toEqual(expect.objectContaining({ mode: 'CCTV', status: 'ACTIVE' }));
  });

  it('detects defect: switching perspectives retains stale filters across incompatible views', async () => {
    await renderTopologyMapTab();

    // Set floor in CCTV
    await act(async () => {
      useTopologyStore.getState().setViewMode('CCTV');
      useTopologyStore.getState().setFilter('floor', '2F');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Switch to NETWORK
    await act(async () => {
      useTopologyStore.getState().setViewMode('NETWORK');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Verify whether floor is still present in filters
    const currentFilters = useTopologyStore.getState().filters;
    expect(currentFilters.floor).toBe('2F'); // Leaked filter across perspective
  });

  describe('TopologySummaryBar Edge Case Stress Tests', () => {
    it('gracefully handles empty, zero, and null metrics without crashing or NaN', async () => {
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
                metrics: null,
                viewMode: 'ALL',
              }),
            ),
          ),
        );
      });

      expect(container.textContent).toContain('Fleet Nodes');
      expect(container.textContent).toContain('0');
      expect(container.textContent).toContain('Active Links');
      expect(container.textContent).toContain('0 / 0');
      expect(container.textContent).toContain('PoE Power Draw');
      expect(container.textContent).toContain('0.0');
      expect(container.textContent).toContain('Network Availability');
      expect(container.textContent).toContain('100%');
      expect(container.textContent).not.toContain('NaN');
    });

    it('renders degraded and down link tags only when counts > 0', async () => {
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
                metrics: {
                  totalNodes: 10,
                  totalEdges: 5,
                  activeLinks: 3,
                  degradedLinks: 1,
                  downLinks: 1,
                  poePowerUsageWatts: 60,
                  onlinePercentage: 60,
                },
                viewMode: 'CCTV',
              }),
            ),
          ),
        );
      });

      expect(container.textContent).toContain('1 Flapping');
      expect(container.textContent).toContain('1 Down');
      expect(container.textContent).toContain('Stream Health');
      expect(container.textContent).toContain('60%');
    });
  });
});
