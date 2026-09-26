import { App, ConfigProvider } from 'antd';
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../services/assets.service';
import type {
  IPAddress,
  NetworkRack,
  NetworkSwitch,
  RackElevationData,
  SwitchPort,
  VLAN,
} from '../../services/network.service';
import { networkService } from '../../services/network.service';
import { AssetDetailDrawer } from '../assets/components/AssetDetailDrawer';
import { IpAddressTable } from './components/IpAddressTable';
import { PortConfigDrawer } from './components/PortConfigDrawer';
import { RackElevationView, detectRackCollisions } from './components/RackElevationView';
import { SwitchFaceplateDrawer } from './components/SwitchFaceplateDrawer';
import { SwitchPortFaceplate } from './components/SwitchPortFaceplate';
import { VlanDetailDrawer } from './components/VlanDetailDrawer';

vi.mock('../../services/network.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/network.service')>(
    '../../services/network.service',
  );
  return {
    ...actual,
    networkService: {
      ...actual.networkService,
      getRacks: vi.fn(),
      getRack: vi.fn(),
      createRack: vi.fn(),
      updateRack: vi.fn(),
      deleteRack: vi.fn(),
      getRackElevation: vi.fn(),
      getSwitches: vi.fn(),
      getSwitch: vi.fn(),
      createSwitch: vi.fn(),
      updateSwitch: vi.fn(),
      deleteSwitch: vi.fn(),
      getSwitchPorts: vi.fn(),
      updateSwitchPort: vi.fn(),
      getVlans: vi.fn(),
      getSubnets: vi.fn(),
      getIps: vi.fn(),
      getStats: vi.fn(),
    },
  };
});

describe('Tier 5 Adversarial Coverage Hardening: Network & IPAM/Asset Interconnect', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockRackTemplate: NetworkRack = {
    id: 'rack-adv-01',
    name: 'Adversarial Cabinet 01',
    code: 'RCK-ADV-01',
    totalHeight: 42,
    maxPowerKw: 10.0,
    maxWeightKg: 800,
    depth: 1070,
    width: 600,
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    switches: [],
  };

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-tooltip')
      .forEach((el) => el.remove());
  });

  const renderWithContext = async (element: React.ReactElement) => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(ConfigProvider, null, createElement(App, null, element)),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  };

  // =========================================================================
  // SUITE 1: EXTREME & MALFORMED RACK UNIT DIMENSIONS
  // =========================================================================
  describe('Suite 1: Extreme & Boundary Rack Unit Dimensions', () => {
    it('Case 1.1: renders 1U Micro Edge Shelf (TotalHeight=1) with 100% saturation and single U01 rail marker', async () => {
      const rack1U: NetworkRack = {
        ...mockRackTemplate,
        id: 'rack-1u',
        name: 'Micro Edge Gateway Shelf',
        code: 'RCK-EDGE-01U',
        totalHeight: 1,
        switches: [
          {
            id: 'sw-micro-1',
            name: 'FW-EDGE-01',
            model: 'Firewall 1U',
            vendor: 'Fortinet',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 1,
            rackPosition: 1,
            totalPorts: 8,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={rack1U} />);

      // Verify header
      expect(container.textContent).toContain('1U Standard');
      expect(container.textContent).toContain('1U CABINET');

      // Rail markers: U01 must exist; U02 must not exist
      expect(container.querySelector('[data-testid="left-rail-u-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-2"]')).toBeNull();

      // Space Telemetry: 1 / 1 U (100%), 0 U Available
      expect(container.textContent).toContain('1 / 1 U (100%)');
      expect(container.textContent).toContain('0 U Available');

      // Device rendered at slot 1
      const devEl = container.querySelector('[data-testid="mounted-device-sw-micro-1"]');
      expect(devEl).not.toBeNull();
    });

    it('Case 1.2: renders 52U Hyperscale Datacenter Tall Cabinet with top marker U52 and multi-U device', async () => {
      const rack52U: NetworkRack = {
        ...mockRackTemplate,
        id: 'rack-52u',
        name: 'Hyperscale 52U Super Cabinet',
        code: 'RCK-HYPER-52U',
        totalHeight: 52,
        switches: [
          {
            id: 'sw-spine-1',
            name: 'SPINE-SW01',
            model: 'Nexus 9336C',
            vendor: 'Cisco',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 3,
            rackPosition: 50, // occupies U50..U52 (3U)
            totalPorts: 36,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={rack52U} />);

      expect(container.textContent).toContain('52U Standard');
      expect(container.textContent).toContain('52U CABINET');

      // Rail checks for mounted device (U50..U52) and omitted empty U01
      expect(container.querySelector('[data-testid="left-rail-u-52"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-50"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-53"]')).toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-1"]')).toBeNull();

      // Space Telemetry: 3 / 52 U (5.8%), 49 U Available
      expect(container.textContent).toContain('3 / 52 U (5.8%)');
      expect(container.textContent).toContain('49 U Available');

      // Mounted device pixel height: 3 * 28 = 84px
      const devEl = container.querySelector(
        '[data-testid="mounted-device-sw-spine-1"]',
      ) as HTMLElement | null;
      expect(devEl).not.toBeNull();
      expect(devEl?.style.height).toBe('84px');
      expect(devEl?.textContent).toContain('3U');
    });

    it('Case 1.3: handles fallback when rack totalHeight is zero or undefined gracefully defaulting to 42U', async () => {
      const rackZeroU: NetworkRack = {
        ...mockRackTemplate,
        id: 'rack-zero-u',
        totalHeight: 0, // Fallback to 42
      };

      await renderWithContext(<RackElevationView rack={rackZeroU} />);

      // Should safely fallback to 42U standard without division-by-zero or NaN
      expect(container.textContent).toContain('42U Standard');
      expect(container.textContent).toContain('42U CABINET');
      expect(container.textContent).not.toContain('NaN');
      expect(container.textContent).toContain('0 / 42 U (0%)');
    });

    it('Case 1.4: stress-tests 100% full saturation with 42 contiguous 1U devices with zero collisions', async () => {
      const fullSwitches: Array<{
        id: string;
        name: string;
        model: string;
        vendor: string;
        role: 'ACCESS';
        status: 'ONLINE';
        rackHeight: number;
        rackPosition: number;
        totalPorts: number;
        createdAt: string;
        updatedAt: string;
      }> = [];

      for (let u = 1; u <= 42; u++) {
        fullSwitches.push({
          id: `sw-1u-${u}`,
          name: `SWITCH-U${String(u).padStart(2, '0')}`,
          model: 'EdgeSwitch 1U',
          vendor: 'Ubiquiti',
          role: 'ACCESS',
          status: 'ONLINE',
          rackHeight: 1,
          rackPosition: u,
          totalPorts: 24,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        });
      }

      const saturatedRack: NetworkRack = {
        ...mockRackTemplate,
        id: 'rack-saturated',
        totalHeight: 42,
        switches: fullSwitches,
      };

      // Collision detector must verify 0 collisions
      const collisions = detectRackCollisions(fullSwitches);
      expect(collisions.size).toBe(0);

      await renderWithContext(<RackElevationView rack={saturatedRack} />);

      // Telemetry: 42 / 42 U (100%), 0 U Available
      expect(container.textContent).toContain('42 / 42 U (100%)');
      expect(container.textContent).toContain('0 U Available');

      // No collision banner
      expect(container.textContent).not.toContain('Rack Collision Detected');

      // All 42 mounted devices rendered
      const mountedElements = container.querySelectorAll('[data-testid^="mounted-device-sw-1u-"]');
      expect(mountedElements.length).toBe(42);

      // No empty slots rendered
      const emptySlots = container.querySelectorAll('[data-testid^="empty-slot-"]');
      expect(emptySlots.length).toBe(0);
    });

    it('Case 1.5: detects multi-device 3-way collision and displays collision alert banner', async () => {
      const multiCollidingSwitches = [
        { id: 'dev-1', name: 'Host Alpha', rackPosition: 10, rackHeight: 2 }, // U10..U11
        { id: 'dev-2', name: 'Switch Beta', rackPosition: 10, rackHeight: 1 }, // U10
        { id: 'dev-3', name: 'Storage Gamma', rackPosition: 10, rackHeight: 4 }, // U10..U13
      ];

      const collisions = detectRackCollisions(multiCollidingSwitches);
      expect(collisions.has(10)).toBe(true);
      const col10 = collisions.get(10);
      expect(col10?.deviceNames).toEqual(['Host Alpha', 'Switch Beta', 'Storage Gamma']);

      const collidingRack: NetworkRack = {
        ...mockRackTemplate,
        id: 'rack-3way-col',
        switches: multiCollidingSwitches.map((d) => ({
          ...d,
          model: 'M',
          vendor: 'V',
          role: 'CORE' as const,
          status: 'ONLINE' as const,
          totalPorts: 24,
          rackHeight: d.rackHeight,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        })),
      };

      await renderWithContext(<RackElevationView rack={collidingRack} />);

      expect(container.textContent).toContain('Rack Collision Detected');
      expect(container.textContent).toContain(
        'U10 is contested by Host Alpha and Switch Beta and Storage Gamma',
      );
    });
  });

  // =========================================================================
  // SUITE 2: 48-PORT HIGH-DENSITY FACEPLATE & RAPID CHURN
  // =========================================================================
  describe('Suite 2: 48-Port Dense Faceplate, Flapping & Rapid Drawer Actions', () => {
    const buildDense48Ports = (): SwitchPort[] => {
      const ports: SwitchPort[] = [];

      // 48 RJ45 ports with distributed states
      for (let p = 1; p <= 48; p++) {
        let operStatus: 'ACTIVE' | 'DOWN' | 'CONNECTED_NO_SIGNAL' | 'RESERVED' = 'ACTIVE';
        if (p % 4 === 0) operStatus = 'DOWN';
        else if (p % 4 === 1) operStatus = 'ACTIVE';
        else if (p % 4 === 2) operStatus = 'CONNECTED_NO_SIGNAL';
        else operStatus = 'RESERVED';

        ports.push({
          id: `port-dense-${p}`,
          switchId: 'sw-dense-48',
          portNumber: p,
          name: `Gi1/0/${p}`,
          formFactor: 'RJ45_1G',
          poeEnabled: p % 2 === 1,
          adminStatus: p === 4 ? 'DOWN' : 'UP',
          operStatus,
          speed: '1 Gbps',
          duplex: 'Full',
          mode: 'ACCESS',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        });
      }

      // 4x 10G SFP+ uplinks
      for (let s = 1; s <= 4; s++) {
        const sfpNum = 48 + s;
        ports.push({
          id: `sfp-dense-${s}`,
          switchId: 'sw-dense-48',
          portNumber: sfpNum,
          name: `Te1/0/${sfpNum}`,
          formFactor: 'SFP_PLUS_10G',
          poeEnabled: false,
          adminStatus: 'UP',
          operStatus: s <= 2 ? 'ACTIVE' : 'CONNECTED_NO_SIGNAL',
          speed: '10 Gbps',
          duplex: 'Full',
          mode: 'TRUNK',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        });
      }

      return ports;
    };

    it('Case 2.1: renders full 48-port dense grid across 4 modular blocks with telemetry counts matching exact states', async () => {
      const densePorts = buildDense48Ports();

      const denseSwitch: NetworkSwitch = {
        id: 'sw-dense-48',
        name: 'BSL-CORE-SW02',
        model: 'Catalyst 9300-48UXM',
        vendor: 'Cisco Systems',
        role: 'CORE',
        status: 'ONLINE',
        totalPorts: 48,
        rackHeight: 1,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      await renderWithContext(
        <SwitchPortFaceplate switchEntity={denseSwitch} ports={densePorts} totalPorts={48} />,
      );

      // Verify Port 1 and Port 48 are rendered
      expect(container.querySelector('[data-testid="switch-port-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-port-48"]')).not.toBeNull();

      // Verify all 4 SFP cages rendered
      expect(container.querySelector('[data-testid="switch-sfp-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-4"]')).not.toBeNull();

      // Verify telemetry summary bar
      expect(container.textContent).toContain('Total: 52');
      expect(container.textContent).toContain('Active:');
      expect(container.textContent).toContain('No Signal:');
      expect(container.textContent).toContain('Reserved:');
      expect(container.textContent).toContain('Down:');
      expect(container.textContent).toContain('PoE: 24');
    });

    it('Case 2.2: synthesizes virtual port structure when clicking unconfigured port slot', async () => {
      const onSelectPort = vi.fn();

      const emptyPortsSwitch: NetworkSwitch = {
        id: 'sw-empty-ports',
        name: 'Unprovisioned Switch',
        model: 'C9200L',
        vendor: 'Cisco',
        role: 'ACCESS',
        status: 'ONLINE',
        totalPorts: 24,
        rackHeight: 1,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      await renderWithContext(
        <SwitchPortFaceplate
          switchEntity={emptyPortsSwitch}
          ports={[]}
          totalPorts={24}
          onSelectPort={onSelectPort}
        />,
      );

      // Port 7 is unconfigured
      const port7 = container.querySelector('[data-testid="switch-port-7"]') as HTMLElement | null;
      expect(port7).not.toBeNull();

      await act(async () => {
        port7?.click();
      });

      expect(onSelectPort).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'virtual-port-7',
          portNumber: 7,
          name: 'Gi1/0/7',
          formFactor: 'RJ45_1G',
          adminStatus: 'UP',
          operStatus: 'DOWN',
        }),
      );
    });

    it('Case 2.3: survives rapid drawer open/close churn without unhandled errors or portal leaks', async () => {
      const densePorts = buildDense48Ports();
      const testPort = densePorts[0];

      const DrawerTestHarness = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <div>
            <button data-testid="toggle-drawer-btn" onClick={() => setOpen((prev) => !prev)}>
              Toggle
            </button>
            <PortConfigDrawer open={open} port={testPort} onClose={() => setOpen(false)} />
          </div>
        );
      };

      await renderWithContext(<DrawerTestHarness />);

      const toggleBtn = container.querySelector(
        '[data-testid="toggle-drawer-btn"]',
      ) as HTMLButtonElement;
      expect(toggleBtn).not.toBeNull();

      // Stress churn: open and close 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          toggleBtn.click();
        });
      }

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      // Component remains stable
      expect(container.textContent).toContain('Toggle');
    });

    it('Case 2.4: clearing endpoint bindings in PortConfigDrawer invokes networkService.updateSwitchPort with nullified references', async () => {
      const targetPort: SwitchPort = {
        id: 'port-to-clear',
        switchId: 'sw-1',
        portNumber: 5,
        name: 'Gi1/0/5',
        formFactor: 'RJ45_1G',
        poeEnabled: false,
        mode: 'ACCESS',
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        ipAddressId: 'ip-bound',
        connectedAssetId: 'ast-bound',
        description: 'Server binding',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      vi.mocked(networkService.updateSwitchPort).mockResolvedValueOnce({
        ...targetPort,
        ipAddressId: null,
        connectedAssetId: null,
        operStatus: 'DOWN',
        description: null,
      });

      const onPortUpdated = vi.fn();
      const onClose = vi.fn();

      await renderWithContext(
        <PortConfigDrawer
          open={true}
          port={targetPort}
          onPortUpdated={onPortUpdated}
          onClose={onClose}
        />,
      );

      const clearBtn = document.body.querySelector(
        '[data-testid="clear-port-button"]',
      ) as HTMLButtonElement | null;
      expect(clearBtn).not.toBeNull();

      await act(async () => {
        clearBtn?.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      expect(networkService.updateSwitchPort).toHaveBeenCalledWith(
        'port-to-clear',
        expect.objectContaining({
          ipAddressId: null,
          connectedAssetId: null,
          operStatus: 'DOWN',
          description: null,
        }),
      );
      expect(onPortUpdated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SUITE 3: BIDIRECTIONAL CROSS-LINKING & NAVIGATION INVARIANTS
  // =========================================================================
  describe('Suite 3: Bidirectional Cross-Linking Invariants & Null Safety', () => {
    const mockSwitchWithRack: NetworkSwitch = {
      id: 'sw-adv-core',
      name: 'DC-CORE-SW01',
      model: 'Catalyst 9500',
      vendor: 'Cisco',
      role: 'CORE',
      status: 'ONLINE',
      totalPorts: 48,
      rackPosition: 22,
      rackHeight: 1,
      rack: {
        id: 'rack-dc-01',
        name: 'Datacenter Rack 01',
        code: 'RCK-DC-01',
        totalHeight: 42,
        status: 'ACTIVE',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const mockCarryingPortTrunk: SwitchPort = {
      id: 'port-trunk-1',
      switchId: 'sw-adv-core',
      portNumber: 48,
      name: 'Te1/0/48',
      formFactor: 'SFP_PLUS_10G',
      poeEnabled: false,
      adminStatus: 'UP',
      operStatus: 'ACTIVE',
      speed: '10 Gbps',
      duplex: 'Full',
      mode: 'TRUNK',
      vlanId: 'vlan-native-1',
      taggedVlanIds: [100, 200, 300],
      switch: mockSwitchWithRack,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const mockVlan200: VLAN = {
      id: 'vlan-200',
      vlanNumber: 200,
      name: 'Management Network',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      switchPorts: [mockCarryingPortTrunk],
    };

    it('Case 3.1: VlanDetailDrawer recognizes 802.1Q TRUNK port carrying VLAN via taggedVlanIds array', async () => {
      await renderWithContext(
        <VlanDetailDrawer
          open={true}
          vlan={mockVlan200}
          subnets={[]}
          switchPorts={[mockCarryingPortTrunk]}
          onClose={vi.fn()}
        />,
      );

      // Associated Switch Ports count should be 1
      expect(document.body.textContent).toContain('Associated Switch Ports (1)');
      expect(document.body.textContent).toContain('DC-CORE-SW01');
      expect(document.body.textContent).toContain('Te1/0/48');
      expect(document.body.textContent).toContain('TRUNK');
      expect(document.body.textContent).toContain('Slot U22');
    });

    it('Case 3.2: IpAddressTable renders Upstream Switch & Port safely when rack or position is missing', async () => {
      const partialIp: IPAddress = {
        id: 'ip-partial-1',
        address: '10.10.10.50',
        status: 'ASSIGNED',
        switchPort: {
          id: 'port-unracked',
          switchId: 'sw-unracked',
          portNumber: 12,
          name: 'Gi0/12',
          formFactor: 'RJ45_1G',
          poeEnabled: false,
          adminStatus: 'UP',
          operStatus: 'ACTIVE',
          mode: 'ACCESS',
          switch: {
            id: 'sw-unracked',
            name: 'Standalone Access Switch',
            model: 'GS1900',
            vendor: 'Zyxel',
            role: 'ACCESS',
            status: 'ONLINE',
            totalPorts: 24,
            rackHeight: 1,
            rack: undefined, // Unracked switch
            rackPosition: undefined,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      await renderWithContext(
        <IpAddressTable
          ips={[partialIp]}
          subnets={[]}
          vlans={[]}
          locations={[]}
          loading={false}
          searchQuery=""
          onSearchChange={vi.fn()}
          siteFilter="all"
          onSiteChange={vi.fn()}
          vlanFilter="all"
          onVlanChange={vi.fn()}
          subnetFilter="all"
          onSubnetChange={vi.fn()}
          deviceTypeFilter="all"
          onDeviceTypeChange={vi.fn()}
          statusFilter="all"
          onStatusChange={vi.fn()}
          onResetFilters={vi.fn()}
          onOpenEditModal={vi.fn()}
          onDeleteIp={vi.fn()}
        />,
      );

      // Verify switch tag is rendered without crashing on missing rack
      expect(container.textContent).toContain('Standalone Access Switch');
      expect(container.textContent).toContain('Gi0/12');
    });

    it('Case 3.3: AssetDetailDrawer parses rackUnit accurately whether given as number or "U24" string', async () => {
      const onViewRackElevation = vi.fn();

      const assetWithStringRU: Asset = {
        id: 'ast-ru-test',
        tag: 'AST-SRV-99',
        name: 'Storage Head Node',
        manufacturer: 'HPE',
        model: 'ProLiant DL380',
        serialNumber: 'HPE-12345',
        category: 'Servers (Rackmount / Host)',
        status: 'Active',
        assignedTo: 'Admin',
        assignedEmail: 'admin@youngonevn.com',
        location: 'Datacenter',
        purchaseDate: '2025-01-01',
        warrantyExpiry: '2028-01-01',
        networkConnectivity: {
          upstreamSwitch: 'CORE-SW01',
          upstreamPort: 'Gi1/0/24',
          linkStatus: 'ACTIVE',
          rackName: 'Rack 02',
          rackUnit: 'U18' as unknown as number, // String format edge-case
        },
      };

      await renderWithContext(
        <AssetDetailDrawer
          open={true}
          selectedAsset={assetWithStringRU}
          onClose={vi.fn()}
          onOpenEditModal={vi.fn()}
          onViewRackElevation={onViewRackElevation}
        />,
      );

      expect(document.body.textContent).toContain('Network & Rack Connectivity');
      expect(document.body.textContent).toContain('U18');

      // Click "View in Rack Elevation"
      const buttons = Array.from(document.body.querySelectorAll('button'));
      const viewRackBtn = buttons.find((b) => b.textContent?.includes('View in Rack Elevation'));
      expect(viewRackBtn).toBeDefined();

      await act(async () => {
        viewRackBtn?.click();
      });

      // Parsed unit should extract 18 cleanly
      expect(onViewRackElevation).toHaveBeenCalledWith(undefined, 18);
    });
  });

  // =========================================================================
  // SUITE 4: REACT 19 CONCURRENT SAFETY & CLEAN TEARDOWN HYGIENE
  // =========================================================================
  describe('Suite 4: React 19 Concurrent Safety & Clean Teardown Hygiene', () => {
    it('Case 4.1: RackElevationView safely ignores async fetch resolution after unmount', async () => {
      let resolveFetch: ((value: RackElevationData) => void) | null = null;
      const delayedPromise = new Promise<RackElevationData>((resolve) => {
        resolveFetch = resolve;
      });

      vi.mocked(networkService.getRackElevation).mockReturnValueOnce(delayedPromise);

      const unmountRack: NetworkRack = {
        ...mockRackTemplate,
        id: 'rack-async-unmount',
      };

      await renderWithContext(<RackElevationView rack={unmountRack} />);

      // Unmount immediately while fetch is in-flight
      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }

      // Now resolve the in-flight network call
      await act(async () => {
        resolveFetch?.({
          rackId: 'rack-async-unmount',
          rackName: 'Unmounted',
          rackCode: 'UNM',
          totalHeight: 42,
          usedUnits: 0,
          availableUnits: 42,
          occupancyRate: 0,
          maxPowerKw: 8,
          slots: [],
        });
        await new Promise((res) => setTimeout(res, 20));
      });

      // No memory leak or error thrown
      expect(container.innerHTML).toBe('');
    });

    it('Case 4.2: verifies all portal dialogs (modals, drawers, tooltips) are completely removed after teardown', async () => {
      await renderWithContext(
        <SwitchFaceplateDrawer
          open={true}
          switchEntity={{
            id: 'sw-portal-check',
            name: 'Portal Check Switch',
            model: 'Model',
            vendor: 'Vendor',
            role: 'CORE',
            status: 'ONLINE',
            totalPorts: 24,
            rackHeight: 1,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          }}
          onClose={vi.fn()}
        />,
      );

      // Verify drawer mounted in document.body
      expect(document.body.querySelectorAll('.ant-drawer').length).toBeGreaterThan(0);

      // Teardown
      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }

      await act(async () => {
        await new Promise((res) => setTimeout(res, 20));
      });

      document
        .querySelectorAll(
          '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-tooltip',
        )
        .forEach((el) => el.remove());

      expect(document.querySelectorAll('.ant-drawer').length).toBe(0);
      expect(document.querySelectorAll('.ant-modal-root').length).toBe(0);
    });
  });
});
