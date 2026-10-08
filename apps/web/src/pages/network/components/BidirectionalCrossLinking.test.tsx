import { App, ConfigProvider } from 'antd';
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import type {
  IPAddress,
  NetworkRack,
  NetworkSwitch,
  Subnet,
  SwitchPort,
  VLAN,
} from '../../../services/network.service';
import { AssetDetailDrawer } from '../../assets/components/AssetDetailDrawer';
import { IpAddressTable } from './IpAddressTable';
import { VlanDetailDrawer } from './VlanDetailDrawer';

describe('Milestone 6: Bidirectional IPAM & Asset Cross-Linking', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockRack: NetworkRack = {
    id: 'rack-01',
    name: 'Rack 01',
    code: 'RCK-DC-01',
    totalHeight: 42,
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockSwitch: NetworkSwitch = {
    id: 'sw-core-01',
    name: 'BSL-CORE-SW01',
    model: 'Cisco Catalyst 9300-48P',
    vendor: 'Cisco Systems',
    role: 'CORE',
    status: 'ONLINE',
    totalPorts: 48,
    rackId: 'rack-01',
    rackPosition: 24,
    rackHeight: 1,
    rack: mockRack,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockPort1: SwitchPort = {
    id: 'port-1',
    switchId: 'sw-core-01',
    portNumber: 1,
    name: 'Gi1/0/1',
    formFactor: 'RJ45_1G',
    poeEnabled: true,
    adminStatus: 'UP',
    operStatus: 'ACTIVE',
    speed: '1 Gbps',
    duplex: 'Full',
    vlanId: 'vlan-10',
    mode: 'ACCESS',
    switch: mockSwitch,
    connectedAssetId: 'ast-srv-01',
    connectedAsset: {
      id: 'ast-srv-01',
      assetTag: 'AST-SRV-001',
      name: 'App Server Node 1',
      model: 'PowerEdge R750',
      status: 'IN_USE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    ipAddressId: 'ip-1',
    ipAddress: {
      id: 'ip-1',
      address: '10.232.10.10',
      status: 'ASSIGNED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockPort2: SwitchPort = {
    id: 'port-49',
    switchId: 'sw-core-01',
    portNumber: 49,
    name: 'Te1/0/49',
    formFactor: 'SFP_PLUS_10G',
    poeEnabled: false,
    adminStatus: 'UP',
    operStatus: 'ACTIVE',
    speed: '10 Gbps',
    duplex: 'Full',
    mode: 'TRUNK',
    taggedVlanIds: [10, 20],
    switch: mockSwitch,
    description: 'Uplink to DC Distribution SW01',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockPort3: SwitchPort = {
    id: 'port-3',
    switchId: 'sw-core-01',
    portNumber: 3,
    name: 'Gi1/0/3',
    formFactor: 'RJ45_1G',
    poeEnabled: false,
    adminStatus: 'DOWN',
    operStatus: 'DOWN',
    vlanId: 'vlan-99',
    mode: 'ACCESS',
    switch: mockSwitch,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockVlan10: VLAN = {
    id: 'vlan-10',
    vlanNumber: 10,
    name: 'Core Server Domain',
    status: 'ACTIVE',
    description: 'Primary datacenter server network segment',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    switchPorts: [mockPort1, mockPort2],
  };

  const mockSubnet: Subnet = {
    id: 'sub-1',
    cidr: '10.232.10.0/24',
    name: 'Server Subnet',
    vlanId: 'vlan-10',
    totalIps: 254,
    usedIps: 45,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockIps: IPAddress[] = [
    {
      id: 'ip-1',
      address: '10.232.10.10',
      macAddress: '00:1B:44:11:3A:B7',
      vendor: 'Dell Inc.',
      deviceType: 'Server',
      model: 'PowerEdge R750',
      status: 'ASSIGNED',
      switchPortId: 'port-1',
      switchPort: mockPort1,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'ip-2',
      address: '10.232.10.20',
      status: 'AVAILABLE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  const mockAssetWithNetwork: Asset = {
    id: 'ast-srv-01',
    tag: 'AST-SRV-001',
    name: 'App Server Node 1',
    manufacturer: 'Dell Technologies',
    model: 'PowerEdge R750',
    serialNumber: 'SRV-DELL-98210',
    category: 'Servers (Rackmount / Host)',
    categoryId: 'cat-server',
    status: 'Active',
    assignedTo: 'John Doe',
    assignedEmail: 'john.doe@youngonevn.com',
    department: 'Infrastructure & Ops',
    purchaseDate: '2025-03-15',
    warrantyExpiry: '2028-03-15',
    networkConnectivity: {
      upstreamSwitch: 'BSL-CORE-SW01',
      switchModel: 'Cisco Catalyst 9300-48P',
      upstreamPort: 'Gi1/0/1',
      linkStatus: 'ACTIVE',
      rackName: 'Rack 01',
      rackUnit: 24,
      vlan: 'VLAN 10 (Core Server Domain)',
      ipAddress: '10.232.10.10',
    },
  };

  const mockAssetWithoutNetwork: Asset = {
    id: 'ast-lap-01',
    tag: 'AST-LAP-001',
    name: 'Dell Latitude 7440',
    manufacturer: 'Dell',
    model: 'Latitude 7440',
    serialNumber: 'LAP-9912',
    category: 'Laptops / Notebooks',
    status: 'Active',
    assignedTo: 'Alice Smith',
    assignedEmail: 'alice.smith@youngonevn.com',
    purchaseDate: '2025-01-01',
    warrantyExpiry: '2027-01-01',
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
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 1: IP Address Table Upstream Switch & Port Column (Path 1)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 1: IP Address Table Upstream Switch & Port Column', () => {
    it('Case 1.1: renders Upstream Switch & Port column header and cell contents', async () => {
      await renderWithContext(
        <IpAddressTable
          ips={mockIps}
          subnets={[mockSubnet]}
          vlans={[mockVlan10]}
          loading={false}
          searchQuery=""
          onSearchChange={vi.fn()}
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

      // Verify Column Header is rendered
      expect(container.textContent).toContain('Upstream Switch & Port');

      // Verify Assigned IP shows Switch Name Tag, Port identifier code, and Rack/RU position
      expect(container.textContent).toContain('BSL-CORE-SW01');
      expect(container.textContent).toContain('Gi1/0/1');
      expect(container.textContent).toContain('[Rack 01 U24]');

      // Verify Unassigned IP shows dash indicator
      expect(container.textContent).toContain('—');
    });

    it('Case 1.2: clicking switch tag invokes onSelectSwitchPort and onNavigateToSwitch drill-down', async () => {
      const onSelectSwitchPort = vi.fn();
      const onNavigateToSwitch = vi.fn();

      await renderWithContext(
        <IpAddressTable
          ips={mockIps}
          subnets={[mockSubnet]}
          vlans={[mockVlan10]}
          loading={false}
          searchQuery=""
          onSearchChange={vi.fn()}
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
          onSelectSwitchPort={onSelectSwitchPort}
          onNavigateToSwitch={onNavigateToSwitch}
        />,
      );

      // Find switch tag
      const tags = Array.from(container.querySelectorAll('.ant-tag'));
      const switchTag = tags.find((t) => t.textContent?.includes('BSL-CORE-SW01'));
      expect(switchTag).toBeDefined();

      // Click switch tag
      await act(async () => {
        (switchTag as HTMLElement).click();
      });

      expect(onSelectSwitchPort).toHaveBeenCalledWith('sw-core-01', 'port-1');
      expect(onNavigateToSwitch).toHaveBeenCalledWith('sw-core-01', 'port-1');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 2: VLAN Detail Drawer Carrying Switch Ports Table (Path 2)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 2: VLAN Detail Drawer Carrying Switch Ports Table', () => {
    it('Case 2.1: renders Associated Switch Ports table with all carrying ports (Access & Trunk)', async () => {
      await renderWithContext(
        <VlanDetailDrawer
          open={true}
          vlan={mockVlan10}
          subnets={[mockSubnet]}
          switchPorts={[mockPort1, mockPort2, mockPort3]}
          onClose={vi.fn()}
        />,
      );

      // Verify section header with port count (2 ports carrying VLAN 10)
      expect(document.body.textContent).toContain('Associated Switch Ports (2)');

      // Verify Table Columns and cell contents
      expect(document.body.textContent).toContain('BSL-CORE-SW01');
      expect(document.body.textContent).toContain('Cisco Systems');
      expect(document.body.textContent).toContain('Rack 01');
      expect(document.body.textContent).toContain('Slot U24');
      expect(document.body.textContent).toContain('Gi1/0/1');
      expect(document.body.textContent).toContain('Te1/0/49');
      expect(document.body.textContent).toContain('ACCESS');
      expect(document.body.textContent).toContain('TRUNK');
      expect(document.body.textContent).toContain('Active / Up');
      expect(document.body.textContent).toContain('App Server Node 1');
      expect(document.body.textContent).toContain('View Port');
    });

    it('Case 2.2: clicking View Port triggers onViewPort and onSelectSwitchPort callback', async () => {
      const onViewPort = vi.fn();
      const onSelectSwitchPort = vi.fn();

      await renderWithContext(
        <VlanDetailDrawer
          open={true}
          vlan={mockVlan10}
          subnets={[mockSubnet]}
          switchPorts={[mockPort1, mockPort2]}
          onClose={vi.fn()}
          onViewPort={onViewPort}
          onSelectSwitchPort={onSelectSwitchPort}
        />,
      );

      const buttons = Array.from(document.body.querySelectorAll('button'));
      const viewPortBtn = buttons.find((b) => b.textContent?.includes('View Port'));
      expect(viewPortBtn).toBeDefined();

      await act(async () => {
        (viewPortBtn as HTMLButtonElement).click();
      });

      expect(onViewPort).toHaveBeenCalledWith('sw-core-01', 'port-1');
      expect(onSelectSwitchPort).toHaveBeenCalledWith('sw-core-01', 'port-1');
    });

    it('Case 2.3: displays empty state when VLAN has no carrying switch ports', async () => {
      const emptyVlan: VLAN = {
        ...mockVlan10,
        id: 'vlan-empty',
        vlanNumber: 999,
        switchPorts: [],
      };

      await renderWithContext(
        <VlanDetailDrawer
          open={true}
          vlan={emptyVlan}
          subnets={[]}
          switchPorts={[]}
          onClose={vi.fn()}
        />,
      );

      expect(document.body.textContent).toContain('Associated Switch Ports (0)');
      expect(document.body.textContent).toContain(
        'No switch ports currently assigned to this VLAN',
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 3: Asset Detail Drawer Network & Rack Connectivity Card (Path 3)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 3: Asset Detail Drawer Network & Rack Connectivity Card', () => {
    it('Case 3.1: renders Network & Rack Connectivity card with switch, port, link, vlan, and rack details', async () => {
      await renderWithContext(
        <AssetDetailDrawer
          open={true}
          selectedAsset={mockAssetWithNetwork}
          onClose={vi.fn()}
          onOpenEditModal={vi.fn()}
        />,
      );

      // Verify Card Header
      expect(document.body.textContent).toContain('Network & Rack Connectivity');

      // Verify Switch info & model tag
      expect(document.body.textContent).toContain('BSL-CORE-SW01');
      expect(document.body.textContent).toContain('Cisco Catalyst 9300-48P');

      // Verify Port & link status
      expect(document.body.textContent).toContain('Gi1/0/1');
      expect(document.body.textContent).toContain('Active / Up');

      // Verify VLAN & IP address
      expect(document.body.textContent).toContain('VLAN 10 (Core Server Domain)');
      expect(document.body.textContent).toContain('10.232.10.10');

      // Verify Rack Cabinet & RU slot
      expect(document.body.textContent).toContain('Rack 01');
      expect(document.body.textContent).toContain('U24');

      // Verify Action Buttons
      expect(document.body.textContent).toContain('View in Switch Faceplate');
      expect(document.body.textContent).toContain('View in Rack Elevation');
    });

    it('Case 3.2: invokes onViewSwitchFaceplate and onViewRackElevation cross-navigation handlers', async () => {
      const onViewSwitchFaceplate = vi.fn();
      const onViewRackElevation = vi.fn();

      await renderWithContext(
        <AssetDetailDrawer
          open={true}
          selectedAsset={mockAssetWithNetwork}
          onClose={vi.fn()}
          onOpenEditModal={vi.fn()}
          onViewSwitchFaceplate={onViewSwitchFaceplate}
          onViewRackElevation={onViewRackElevation}
        />,
      );

      const buttons = Array.from(document.body.querySelectorAll('button'));
      const switchFaceplateBtn = buttons.find((b) =>
        b.textContent?.includes('View in Switch Faceplate'),
      );
      const rackElevationBtn = buttons.find((b) =>
        b.textContent?.includes('View in Rack Elevation'),
      );

      expect(switchFaceplateBtn).toBeDefined();
      expect(rackElevationBtn).toBeDefined();

      await act(async () => {
        (switchFaceplateBtn as HTMLButtonElement).click();
      });
      expect(onViewSwitchFaceplate).toHaveBeenCalled();

      await act(async () => {
        (rackElevationBtn as HTMLButtonElement).click();
      });
      expect(onViewRackElevation).toHaveBeenCalledWith(undefined, 24);
    });

    it('Case 3.3: displays empty state card when asset has no network connectivity data', async () => {
      await renderWithContext(
        <AssetDetailDrawer
          open={true}
          selectedAsset={mockAssetWithoutNetwork}
          onClose={vi.fn()}
          onOpenEditModal={vi.fn()}
        />,
      );

      expect(document.body.textContent).toContain('Network & Rack Connectivity');
      expect(document.body.textContent).toContain(
        'No upstream switch or rack connectivity configured',
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 4: Clean React 19 / Ant Design v6 Lifecycle Teardown Hygiene
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 4: Clean React 19 / Ant Design v6 Lifecycle Teardown Hygiene', () => {
    it('Case 4.1: mounts and unmounts all cross-linking components cleanly without DOM or scheduler leakage', async () => {
      // Mount IP Table
      await renderWithContext(
        <IpAddressTable
          ips={mockIps}
          subnets={[mockSubnet]}
          vlans={[mockVlan10]}
          loading={false}
          searchQuery=""
          onSearchChange={vi.fn()}
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
      expect(container.textContent).toContain('Upstream Switch & Port');

      // Unmount IP Table
      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }
      expect(container.innerHTML).toBe('');

      // Mount VLAN Detail Drawer
      await renderWithContext(
        <VlanDetailDrawer
          open={true}
          vlan={mockVlan10}
          subnets={[mockSubnet]}
          switchPorts={[mockPort1]}
          onClose={vi.fn()}
        />,
      );
      expect(document.body.textContent).toContain('Associated Switch Ports');

      // Unmount VLAN Detail Drawer
      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }
      document
        .querySelectorAll(
          '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-tooltip',
        )
        .forEach((el) => el.remove());

      // Mount Asset Detail Drawer
      await renderWithContext(
        <AssetDetailDrawer
          open={true}
          selectedAsset={mockAssetWithNetwork}
          onClose={vi.fn()}
          onOpenEditModal={vi.fn()}
        />,
      );
      expect(document.body.textContent).toContain('Network & Rack Connectivity');

      // Unmount Asset Detail Drawer
      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }
      document
        .querySelectorAll(
          '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-tooltip',
        )
        .forEach((el) => el.remove());

      expect(document.querySelectorAll('.ant-drawer').length).toBe(0);
    });
  });
});
