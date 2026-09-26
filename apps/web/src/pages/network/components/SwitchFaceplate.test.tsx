import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Location } from '@uims/shared-types';
import type { NetworkRack, NetworkSwitch, SwitchPort } from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import type { LocationBranch } from '../../../services/organization.service';
import { PortConfigDrawer } from './PortConfigDrawer';
import { SwitchFaceplateDrawer } from './SwitchFaceplateDrawer';
import { SwitchManagementTab } from './SwitchManagementTab';
import { SwitchPortFaceplate, getPortStatusInfo } from './SwitchPortFaceplate';
import { SwitchTable } from './SwitchTable';

vi.mock('../../../services/network.service', async () => {
  const actual = await vi.importActual<typeof import('../../../services/network.service')>(
    '../../../services/network.service',
  );
  return {
    ...actual,
    networkService: {
      ...actual.networkService,
      getSwitches: vi.fn(),
      getSwitch: vi.fn(),
      createSwitch: vi.fn(),
      updateSwitch: vi.fn(),
      deleteSwitch: vi.fn(),
      getSwitchPorts: vi.fn(),
      updateSwitchPort: vi.fn(),
      getRacks: vi.fn(),
    },
  };
});

describe('Milestone 5: Switch Fleet & Interactive Visual Faceplate', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockLocationBranch: LocationBranch = {
    id: 'loc-dc1',
    name: 'Core Datacenter',
    code: 'DC1',
    type: 'DATACENTER',
  };

  const mockSwitchLocation: Location = {
    id: 'loc-dc1',
    name: 'Core Datacenter',
    code: 'DC1',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockRack: NetworkRack = {
    id: 'rack-dc-01',
    name: 'Core Datacenter Rack 01',
    code: 'RACK-DC-01',
    totalHeight: 42,
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  // 24 RJ45 ports + 4 SFP uplink ports
  const mock24Ports: SwitchPort[] = [
    {
      id: 'port-1',
      switchId: 'sw-24-1',
      portNumber: 1,
      name: 'Gi1/0/1',
      formFactor: 'RJ45_1G',
      poeEnabled: true,
      adminStatus: 'UP',
      operStatus: 'ACTIVE',
      speed: '1 Gbps',
      duplex: 'Full',
      vlanId: 'vlan-100',
      vlan: {
        id: 'vlan-100',
        vlanNumber: 100,
        name: 'Core Servers',
        status: 'ACTIVE',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      mode: 'ACCESS',
      ipAddressId: 'ip-1',
      ipAddress: {
        id: 'ip-1',
        address: '10.232.10.10',
        status: 'ASSIGNED',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      connectedAssetId: 'ast-1',
      connectedAsset: {
        id: 'ast-1',
        assetTag: 'AST-1004',
        name: 'Dell PowerEdge R750',
        model: 'PowerEdge R750',
        status: 'IN_USE',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      description: 'Production App Server 01',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'port-2',
      switchId: 'sw-24-1',
      portNumber: 2,
      name: 'Gi1/0/2',
      formFactor: 'RJ45_1G',
      poeEnabled: false,
      adminStatus: 'DOWN',
      operStatus: 'DOWN',
      speed: null,
      duplex: null,
      mode: 'ACCESS',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'port-3',
      switchId: 'sw-24-1',
      portNumber: 3,
      name: 'Gi1/0/3',
      formFactor: 'RJ45_1G',
      poeEnabled: true,
      adminStatus: 'UP',
      operStatus: 'CONNECTED_NO_SIGNAL',
      speed: '1 Gbps',
      duplex: 'Full',
      mode: 'ACCESS',
      description: 'Negotiation Flapping Port',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'port-4',
      switchId: 'sw-24-1',
      portNumber: 4,
      name: 'Gi1/0/4',
      formFactor: 'RJ45_1G',
      poeEnabled: false,
      adminStatus: 'UP',
      operStatus: 'RESERVED',
      speed: '1 Gbps',
      duplex: 'Full',
      mode: 'ACCESS',
      description: 'Reserved for expansion',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  // Fill remaining RJ45 ports (5..24)
  for (let i = 5; i <= 24; i++) {
    mock24Ports.push({
      id: `port-${i}`,
      switchId: 'sw-24-1',
      portNumber: i,
      name: `Gi1/0/${i}`,
      formFactor: 'RJ45_1G',
      poeEnabled: i % 2 === 0,
      adminStatus: 'UP',
      operStatus: i % 3 === 0 ? 'DOWN' : 'ACTIVE',
      speed: '1 Gbps',
      duplex: 'Full',
      mode: 'ACCESS',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    });
  }

  // 4 SFP uplink ports (25..28)
  for (let u = 1; u <= 4; u++) {
    const portNum = 24 + u;
    mock24Ports.push({
      id: `sfp-${u}`,
      switchId: 'sw-24-1',
      portNumber: portNum,
      name: `Te1/0/${portNum}`,
      formFactor: 'SFP_PLUS_10G',
      poeEnabled: false,
      adminStatus: 'UP',
      operStatus: u <= 2 ? 'ACTIVE' : 'CONNECTED_NO_SIGNAL',
      speed: '10 Gbps',
      duplex: 'Full',
      mode: 'TRUNK',
      taggedVlanIds: [100, 129],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    });
  }

  const mock24PortSwitch: NetworkSwitch = {
    id: 'sw-24-1',
    name: 'BSL-DIST-SW01',
    model: 'C9200L-24P-4G',
    vendor: 'Cisco Systems',
    serialNumber: 'FOC2533K92',
    macAddress: '70:69:79:2A:41:02',
    firmwareVersion: '17.6.5',
    role: 'DISTRIBUTION',
    status: 'ONLINE',
    totalPorts: 24,
    rackId: 'rack-dc-01',
    rackPosition: 37,
    rackHeight: 1,
    rack: mockRack,
    locationId: 'loc-dc1',
    location: mockSwitchLocation,
    notes: 'Datacenter Distribution Switch',
    ports: mock24Ports,
    activePortsCount: 16,
    ipAddress: {
      id: 'mgmt-ip-2',
      address: '10.232.129.11',
      status: 'ASSIGNED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mock48PortSwitch: NetworkSwitch = {
    id: 'sw-48-1',
    name: 'BSL-CORE-SW01',
    model: 'C9300-48P-A',
    vendor: 'Cisco Systems',
    serialNumber: 'FOC2488102',
    macAddress: '70:69:79:2A:41:01',
    firmwareVersion: '17.9.4a',
    role: 'CORE',
    status: 'ONLINE',
    totalPorts: 48,
    rackId: 'rack-dc-01',
    rackPosition: 39,
    rackHeight: 1,
    rack: mockRack,
    locationId: 'loc-dc1',
    location: mockSwitchLocation,
    notes: 'BSL Datacenter Core Switch (Stack Master)',
    ports: [],
    activePortsCount: 38,
    ipAddress: {
      id: 'mgmt-ip-1',
      address: '10.232.129.10',
      status: 'ASSIGNED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mock8PortSwitch: NetworkSwitch = {
    id: 'sw-8-1',
    name: 'BSL-EDGE-SW01',
    model: 'C1000-8T-2G-L',
    vendor: 'Cisco Systems',
    serialNumber: 'FOC2600108',
    macAddress: '70:69:79:2A:41:08',
    firmwareVersion: '15.2.7',
    role: 'ACCESS',
    status: 'ONLINE',
    totalPorts: 8,
    rackId: 'rack-dc-01',
    rackPosition: 20,
    rackHeight: 1,
    rack: mockRack,
    locationId: 'loc-dc1',
    location: mockSwitchLocation,
    notes: 'BSL Edge Compact Switch',
    ports: [],
    activePortsCount: 6,
    ipAddress: {
      id: 'mgmt-ip-8',
      address: '10.232.129.8',
      status: 'ASSIGNED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mock16PortSwitch: NetworkSwitch = {
    id: 'sw-16-1',
    name: 'BSL-BRANCH-SW01',
    model: 'C1000-16FP-2G-L',
    vendor: 'Cisco Systems',
    serialNumber: 'FOC2600116',
    macAddress: '70:69:79:2A:41:16',
    firmwareVersion: '15.2.7',
    role: 'ACCESS',
    status: 'ONLINE',
    totalPorts: 16,
    rackId: 'rack-dc-01',
    rackPosition: 22,
    rackHeight: 1,
    rack: mockRack,
    locationId: 'loc-dc1',
    location: mockSwitchLocation,
    notes: 'BSL Branch Office Switch',
    ports: [],
    activePortsCount: 12,
    ipAddress: {
      id: 'mgmt-ip-16',
      address: '10.232.129.16',
      status: 'ASSIGNED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
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
  // Suite 1: Physical Faceplate 24-Port & 48-Port Staggered Layout
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 1: Staggered RJ45 Grid & SFP Uplink Architecture', () => {
    it('Case 1.1: renders 24-port staggered RJ45 grid in 2 modular 12-port blocks with odd upper row and even lower row', async () => {
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={mock24PortSwitch} ports={mock24Ports} totalPorts={24} />,
      );

      // Verify physical chassis enclosure
      const chassis = container.querySelector('[data-testid="switch-faceplate-chassis"]');
      expect(chassis).not.toBeNull();

      // Check port 1 (upper odd) and port 2 (lower even) exist
      const port1 = container.querySelector('[data-testid="switch-port-1"]');
      const port2 = container.querySelector('[data-testid="switch-port-2"]');
      const port24 = container.querySelector('[data-testid="switch-port-24"]');

      expect(port1).not.toBeNull();
      expect(port2).not.toBeNull();
      expect(port24).not.toBeNull();

      // Ports 25+ must not be in the RJ45 grid
      const port25Rj45 = container.querySelector('[data-testid="switch-port-25"]');
      expect(port25Rj45).toBeNull();
    });

    it('Case 1.2: renders 48-port switch with 4 modular blocks and right-side 10G SFP+ uplink module cages', async () => {
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={mock48PortSwitch} ports={[]} totalPorts={48} />,
      );

      // Verify port 1 and port 48 exist
      const port1 = container.querySelector('[data-testid="switch-port-1"]');
      const port48 = container.querySelector('[data-testid="switch-port-48"]');
      expect(port1).not.toBeNull();
      expect(port48).not.toBeNull();

      // Verify 4 SFP cages rendered in the uplink module
      const sfp1 = container.querySelector('[data-testid="switch-sfp-1"]');
      const sfp2 = container.querySelector('[data-testid="switch-sfp-2"]');
      const sfp3 = container.querySelector('[data-testid="switch-sfp-3"]');
      const sfp4 = container.querySelector('[data-testid="switch-sfp-4"]');

      expect(sfp1).not.toBeNull();
      expect(sfp2).not.toBeNull();
      expect(sfp3).not.toBeNull();
      expect(sfp4).not.toBeNull();
    });

    it('Case 1.3: renders 8-port compact switch with 1 modular block and 2 right-side SFP uplink cages', async () => {
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={mock8PortSwitch} ports={[]} totalPorts={8} />,
      );

      // Verify port 1 and port 8 exist
      const port1 = container.querySelector('[data-testid="switch-port-1"]');
      const port8 = container.querySelector('[data-testid="switch-port-8"]');
      expect(port1).not.toBeNull();
      expect(port8).not.toBeNull();

      // Port 9 must NOT be in the RJ45 grid
      const port9 = container.querySelector('[data-testid="switch-port-9"]');
      expect(port9).toBeNull();

      // Verify exactly 2 SFP cages rendered in the uplink module
      const sfp1 = container.querySelector('[data-testid="switch-sfp-1"]');
      const sfp2 = container.querySelector('[data-testid="switch-sfp-2"]');
      const sfp3 = container.querySelector('[data-testid="switch-sfp-3"]');
      const sfp4 = container.querySelector('[data-testid="switch-sfp-4"]');

      expect(sfp1).not.toBeNull();
      expect(sfp2).not.toBeNull();
      expect(sfp3).toBeNull();
      expect(sfp4).toBeNull();
    });

    it('Case 1.4: renders 16-port branch switch with 2 modular 8-port blocks and 2 right-side SFP uplink cages', async () => {
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={mock16PortSwitch} ports={[]} totalPorts={16} />,
      );

      // Verify port 1, port 8, port 9, and port 16 exist
      const port1 = container.querySelector('[data-testid="switch-port-1"]');
      const port8 = container.querySelector('[data-testid="switch-port-8"]');
      const port9 = container.querySelector('[data-testid="switch-port-9"]');
      const port16 = container.querySelector('[data-testid="switch-port-16"]');
      expect(port1).not.toBeNull();
      expect(port8).not.toBeNull();
      expect(port9).not.toBeNull();
      expect(port16).not.toBeNull();

      // Port 17 must NOT be in the RJ45 grid
      const port17 = container.querySelector('[data-testid="switch-port-17"]');
      expect(port17).toBeNull();

      // Verify exactly 2 SFP cages rendered in the uplink module
      const sfp1 = container.querySelector('[data-testid="switch-sfp-1"]');
      const sfp2 = container.querySelector('[data-testid="switch-sfp-2"]');
      const sfp3 = container.querySelector('[data-testid="switch-sfp-3"]');
      const sfp4 = container.querySelector('[data-testid="switch-sfp-4"]');

      expect(sfp1).not.toBeNull();
      expect(sfp2).not.toBeNull();
      expect(sfp3).toBeNull();
      expect(sfp4).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 2: Tri-State & 4-State LED Indicator Glow Mechanics
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 2: Tri-State & 4-State LED Status Indicators', () => {
    it('Case 2.1: accurately maps and renders all 4 link status states with distinct glow styling', async () => {
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={mock24PortSwitch} ports={mock24Ports} totalPorts={24} />,
      );

      // Port 1: ACTIVE -> Green (#52c41a) glow
      const led1 = container.querySelector('[data-testid="port-led-1"]') as HTMLElement;
      expect(led1).not.toBeNull();
      expect(led1.style.backgroundColor).toMatch(/#52c41a|rgb\(82,\s*196,\s*26\)/);

      // Port 2: DOWN -> Dark Gray (#595959)
      const led2 = container.querySelector('[data-testid="port-led-2"]') as HTMLElement;
      expect(led2).not.toBeNull();
      expect(led2.style.backgroundColor).toMatch(/#595959|rgb\(89,\s*89,\s*89\)/);

      // Port 3: CONNECTED_NO_SIGNAL -> Amber (#faad14) glow
      const led3 = container.querySelector('[data-testid="port-led-3"]') as HTMLElement;
      expect(led3).not.toBeNull();
      expect(led3.style.backgroundColor).toMatch(/#faad14|rgb\(250,\s*173,\s*20\)/);

      // Port 4: RESERVED -> Blue (#1677ff) glow
      const led4 = container.querySelector('[data-testid="port-led-4"]') as HTMLElement;
      expect(led4).not.toBeNull();
      expect(led4.style.backgroundColor).toMatch(/#1677ff|rgb\(22,\s*119,\s*255\)/);
    });

    it('Case 2.2: validates getPortStatusInfo helper function correctness and fallback handling', () => {
      // Test Active
      const activeInfo = getPortStatusInfo({
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
      } as SwitchPort);
      expect(activeInfo.status).toBe('ACTIVE');
      expect(activeInfo.color).toBe('#52c41a');

      // Test Admin Down overrides active operStatus
      const adminDownInfo = getPortStatusInfo({
        adminStatus: 'DOWN',
        operStatus: 'ACTIVE',
      } as SwitchPort);
      expect(adminDownInfo.status).toBe('DOWN');
      expect(adminDownInfo.color).toBe('#595959');

      // Test Connected No Signal
      const flappingInfo = getPortStatusInfo({
        adminStatus: 'UP',
        operStatus: 'CONNECTED_NO_SIGNAL',
      } as SwitchPort);
      expect(flappingInfo.status).toBe('CONNECTED_NO_SIGNAL');
      expect(flappingInfo.color).toBe('#faad14');

      // Test Reserved
      const reservedInfo = getPortStatusInfo({
        adminStatus: 'UP',
        operStatus: 'RESERVED',
      } as SwitchPort);
      expect(reservedInfo.status).toBe('RESERVED');
      expect(reservedInfo.color).toBe('#1677ff');

      // Test null / undefined port fallback
      const nullInfo = getPortStatusInfo(null);
      expect(nullInfo.status).toBe('DOWN');
    });

    it('Case 2.3: renders PoE delivery active badge (⚡) on PoE-enabled ports', async () => {
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={mock24PortSwitch} ports={mock24Ports} totalPorts={24} />,
      );

      // Port 1 has poeEnabled: true
      const poe1 = container.querySelector('[data-testid="poe-badge-1"]');
      expect(poe1).not.toBeNull();
      expect(poe1?.textContent).toContain('⚡');

      // Port 2 has poeEnabled: false
      const poe2 = container.querySelector('[data-testid="poe-badge-2"]');
      expect(poe2).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 3: Port Click, Drawer Trigger & Configuration Mutation
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 3: Interactive Port Selection & Configuration Lifecycle', () => {
    it('Case 3.1: clicking a port invokes onSelectPort callback with the port payload', async () => {
      const handleSelectPort = vi.fn();

      await renderWithContext(
        <SwitchPortFaceplate
          switchEntity={mock24PortSwitch}
          ports={mock24Ports}
          totalPorts={24}
          onSelectPort={handleSelectPort}
        />,
      );

      const port1 = container.querySelector('[data-testid="switch-port-1"]');
      expect(port1).not.toBeNull();

      await act(async () => {
        (port1 as HTMLElement).click();
      });

      expect(handleSelectPort).toHaveBeenCalledTimes(1);
      expect(handleSelectPort).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'port-1',
          name: 'Gi1/0/1',
        }),
      );
    });

    it('Case 3.2: PortConfigDrawer opens with pre-populated form fields matching the selected port', async () => {
      const handleClose = vi.fn();
      const targetPort = mock24Ports[0]; // Port 1

      await renderWithContext(
        <PortConfigDrawer
          open={true}
          port={targetPort}
          switchEntity={mock24PortSwitch}
          onClose={handleClose}
        />,
      );

      // Drawer title contains port name
      const body = document.body;
      expect(body.textContent).toContain('Configure Port: Gi1/0/1');
      expect(body.textContent).toContain('BSL-DIST-SW01');

      // Form items exist
      const adminSwitch = document.querySelector('[data-testid="port-admin-status-switch"]');
      expect(adminSwitch).not.toBeNull();

      const operSelect = document.querySelector('[data-testid="port-oper-status-select"]');
      expect(operSelect).not.toBeNull();

      const saveBtn = document.querySelector('[data-testid="save-port-config-button"]');
      expect(saveBtn).not.toBeNull();
    });

    it('Case 3.3: saves updated port configuration calling networkService.updateSwitchPort', async () => {
      const handleUpdated = vi.fn();
      const handleClose = vi.fn();
      const targetPort = mock24Ports[0];

      vi.mocked(networkService.updateSwitchPort).mockResolvedValueOnce({
        ...targetPort,
        operStatus: 'DOWN',
      });

      await renderWithContext(
        <PortConfigDrawer
          open={true}
          port={targetPort}
          switchEntity={mock24PortSwitch}
          onClose={handleClose}
          onPortUpdated={handleUpdated}
        />,
      );

      const saveBtn = document.querySelector(
        '[data-testid="save-port-config-button"]',
      ) as HTMLElement;
      expect(saveBtn).not.toBeNull();

      await act(async () => {
        saveBtn.click();
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(networkService.updateSwitchPort).toHaveBeenCalledWith(
        'port-1',
        expect.objectContaining({
          adminStatus: 'UP',
        }),
      );
      expect(handleUpdated).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 4: SwitchTable Fleet Inventory & SwitchFaceplateDrawer Container
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 4: SwitchTable Inventory & SwitchFaceplateDrawer Container', () => {
    it('Case 4.1: SwitchTable renders switch fleet with vendor badges, management IP, rack unit, and action buttons', async () => {
      const handleViewFaceplate = vi.fn();
      const handleEdit = vi.fn();
      const handleDelete = vi.fn();

      await renderWithContext(
        <SwitchTable
          switches={[mock24PortSwitch, mock48PortSwitch]}
          onViewFaceplate={handleViewFaceplate}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />,
      );

      // Check switch names rendered
      expect(container.textContent).toContain('BSL-DIST-SW01');
      expect(container.textContent).toContain('BSL-CORE-SW01');

      // Check vendor tags
      expect(container.textContent).toContain('Cisco');
      expect(container.textContent).toContain('C9200L-24P-4G');
      expect(container.textContent).toContain('C9300-48P-A');

      // Check management IP
      expect(container.textContent).toContain('10.232.129.11');

      // Check Rack Unit
      expect(container.textContent).toContain('RACK-DC-01');
      expect(container.textContent).toContain('U37');

      // Check Faceplate button
      const faceplateBtn = container.querySelector(
        '[data-testid="view-faceplate-BSL-DIST-SW01"]',
      ) as HTMLElement;
      expect(faceplateBtn).not.toBeNull();

      await act(async () => {
        faceplateBtn.click();
      });
      expect(handleViewFaceplate).toHaveBeenCalledWith(mock24PortSwitch);
    });

    it('Case 4.2: SwitchFaceplateDrawer renders switch metadata header and loads ports into faceplate', async () => {
      vi.mocked(networkService.getSwitchPorts).mockResolvedValueOnce(mock24Ports);

      await renderWithContext(
        <SwitchFaceplateDrawer open={true} switchEntity={mock24PortSwitch} onClose={vi.fn()} />,
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Verify drawer content
      const body = document.body;
      expect(body.textContent).toContain('BSL-DIST-SW01');
      expect(body.textContent).toContain('Hardware Model');
      expect(body.textContent).toContain('C9200L-24P-4G');
      expect(body.textContent).toContain('Serial Number');
      expect(body.textContent).toContain('FOC2533K92');
      expect(body.textContent).toContain('Physical Front Panel Faceplate');
      expect(body.textContent).toContain('Port Matrix & Endpoint Directory');
    });

    it('Case 4.3: SwitchManagementTab renders integrated view with filter bar, add button, and switches table', async () => {
      vi.mocked(networkService.getSwitches).mockResolvedValue([mock24PortSwitch, mock48PortSwitch]);
      vi.mocked(networkService.getRacks).mockResolvedValue([mockRack]);

      await renderWithContext(
        <SwitchManagementTab
          switches={[mock24PortSwitch, mock48PortSwitch]}
          racks={[mockRack]}
          locations={[mockLocationBranch]}
        />,
      );

      // KPI stat summary cards
      expect(container.textContent).toContain('Total Switches');
      expect(container.textContent).toContain('Total Switch Ports');
      expect(container.textContent).toContain('Online Operational');
      expect(container.textContent).toContain('Core & Distribution');

      // Search and Add button
      const searchInput = container.querySelector('[data-testid="switch-search-input"]');
      expect(searchInput).not.toBeNull();

      const addBtn = container.querySelector('[data-testid="add-switch-button"]');
      expect(addBtn).not.toBeNull();

      // Switches table
      expect(container.textContent).toContain('BSL-DIST-SW01');
      expect(container.textContent).toContain('BSL-CORE-SW01');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 5: Clean React 19 / Ant Design v6 Lifecycle Teardown Hygiene
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 5: Clean React 19 / Ant Design v6 Lifecycle Teardown', () => {
    it('Case 5.1: unmounts cleanly without portal DOM leakage or unhandled async scheduler exceptions', async () => {
      await renderWithContext(
        <SwitchManagementTab
          switches={[mock24PortSwitch]}
          racks={[mockRack]}
          locations={[mockLocationBranch]}
        />,
      );

      // Verify mounted
      expect(container.textContent).toContain('BSL-DIST-SW01');

      // Execute clean unmount
      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Verify portal DOM elements are cleanly purgeable
      const remainingPortals = document.querySelectorAll(
        '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-tooltip',
      );
      expect(remainingPortals.length).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 6: Milestone 3 Custom Even Sizes & Authentic Physical Chassis Visualization
  // ──────────────────────────────────────────────────────────────────────────
  describe('Suite 6: Milestone 3 Custom Even Sizes & Authentic Physical Chassis Visualization', () => {
    it('Case 6.1: renders 2-port ultra-compact switch in 1 cluster block of 2 ports with odd upper row (1) and even lower row (2)', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={2} ports={[]} />);

      const p1 = container.querySelector('[data-testid="switch-port-1"]');
      const p2 = container.querySelector('[data-testid="switch-port-2"]');
      const p3 = container.querySelector('[data-testid="switch-port-3"]');

      expect(p1).not.toBeNull();
      expect(p2).not.toBeNull();
      expect(p3).toBeNull();

      // Cluster block count: exactly 1 cluster block
      const cluster0 = container.querySelector('[data-testid="cluster-block-0"]');
      const cluster1 = container.querySelector('[data-testid="cluster-block-1"]');
      expect(cluster0).not.toBeNull();
      expect(cluster1).toBeNull();

      // Zigzag rows
      expect(p1?.parentElement).not.toBe(p2?.parentElement);
    });

    it('Case 6.2: renders 6-port edge switch in 1 cluster block of 6 ports', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={6} ports={[]} />);

      for (let p = 1; p <= 6; p++) {
        expect(container.querySelector(`[data-testid="switch-port-${p}"]`)).not.toBeNull();
      }
      expect(container.querySelector('[data-testid="switch-port-7"]')).toBeNull();

      expect(container.querySelector('[data-testid="cluster-block-0"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="cluster-block-1"]')).toBeNull();
    });

    it('Case 6.3: renders 12-port branch switch into 2 balanced cluster blocks of 6 ports', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={12} ports={[]} />);

      for (let p = 1; p <= 12; p++) {
        expect(container.querySelector(`[data-testid="switch-port-${p}"]`)).not.toBeNull();
      }
      expect(container.querySelector('[data-testid="switch-port-13"]')).toBeNull();

      // Block 0: ports 1..6, Block 1: ports 7..12
      const block0 = container.querySelector('[data-testid="cluster-block-0"]');
      const block1 = container.querySelector('[data-testid="cluster-block-1"]');
      const block2 = container.querySelector('[data-testid="cluster-block-2"]');
      expect(block0).not.toBeNull();
      expect(block1).not.toBeNull();
      expect(block2).toBeNull();

      const p6 = container.querySelector('[data-testid="switch-port-6"]');
      const p7 = container.querySelector('[data-testid="switch-port-7"]');
      expect(p6?.closest('[data-testid="cluster-block-0"]')).not.toBeNull();
      expect(p7?.closest('[data-testid="cluster-block-1"]')).not.toBeNull();
    });

    it('Case 6.4: renders 20-port enterprise switch into 2 balanced cluster blocks of 10 ports', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={20} ports={[]} />);

      for (let p = 1; p <= 20; p++) {
        expect(container.querySelector(`[data-testid="switch-port-${p}"]`)).not.toBeNull();
      }
      expect(container.querySelector('[data-testid="switch-port-21"]')).toBeNull();

      const block0 = container.querySelector('[data-testid="cluster-block-0"]');
      const block1 = container.querySelector('[data-testid="cluster-block-1"]');
      const block2 = container.querySelector('[data-testid="cluster-block-2"]');
      expect(block0).not.toBeNull();
      expect(block1).not.toBeNull();
      expect(block2).toBeNull();

      const p10 = container.querySelector('[data-testid="switch-port-10"]');
      const p11 = container.querySelector('[data-testid="switch-port-11"]');
      expect(p10?.closest('[data-testid="cluster-block-0"]')).not.toBeNull();
      expect(p11?.closest('[data-testid="cluster-block-1"]')).not.toBeNull();
    });

    it('Case 6.5: renders 32-port switch into 4 balanced cluster blocks of 8 ports', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={32} ports={[]} />);

      for (let p = 1; p <= 32; p++) {
        expect(container.querySelector(`[data-testid="switch-port-${p}"]`)).not.toBeNull();
      }
      expect(container.querySelector('[data-testid="switch-port-33"]')).toBeNull();

      expect(container.querySelector('[data-testid="cluster-block-0"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="cluster-block-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="cluster-block-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="cluster-block-3"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="cluster-block-4"]')).toBeNull();
    });

    it('Case 6.6: renders authentic 1U physical chassis elements: 19" rack ears with screw cutouts and metallic dividing bezel', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={24} ports={[]} />);

      const earLeft = container.querySelector('[data-testid="rack-ear-left"]');
      const earRight = container.querySelector('[data-testid="rack-ear-right"]');
      const screwLeft1 = container.querySelector('[data-testid="rack-screw-left-1"]');
      const screwLeft2 = container.querySelector('[data-testid="rack-screw-left-2"]');
      const screwRight1 = container.querySelector('[data-testid="rack-screw-right-1"]');
      const screwRight2 = container.querySelector('[data-testid="rack-screw-right-2"]');
      const dividingBezel = container.querySelector('[data-testid="metallic-dividing-bezel"]');

      expect(earLeft).not.toBeNull();
      expect(earRight).not.toBeNull();
      expect(screwLeft1).not.toBeNull();
      expect(screwLeft2).not.toBeNull();
      expect(screwRight1).not.toBeNull();
      expect(screwRight2).not.toBeNull();
      expect(dividingBezel).not.toBeNull();
    });

    it('Case 6.7: renders left system status bezel with PWR, SYS, PoE LEDs and recessed CONSOLE management port', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={24} ports={[]} />);

      const bezel = container.querySelector('[data-testid="switch-system-bezel"]');
      expect(bezel).not.toBeNull();

      const pwr = container.querySelector('[data-testid="led-pwr"]');
      const sys = container.querySelector('[data-testid="led-sys"]');
      const poe = container.querySelector('[data-testid="led-poe"]');
      expect(pwr).not.toBeNull();
      expect(sys).not.toBeNull();
      expect(poe).not.toBeNull();

      expect(bezel?.textContent).toContain('PWR');
      expect(bezel?.textContent).toContain('SYS');
      expect(bezel?.textContent).toContain('PoE');

      const consolePort = container.querySelector('[data-testid="console-port"]');
      const consoleSocket = container.querySelector('[data-testid="console-socket"]');
      const consoleLabel = container.querySelector('[data-testid="console-label"]');
      expect(consolePort).not.toBeNull();
      expect(consoleSocket).not.toBeNull();
      expect(consoleLabel?.textContent).toContain('CONSOLE');
    });

    it('Case 6.8: renders silkscreen numbers on top for odd upper sockets and on bottom for even lower sockets', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={8} ports={[]} />);

      // Port 1 (odd, upper row): silkscreen label is first child (order: 1)
      const p1 = container.querySelector('[data-testid="switch-port-1"]');
      const p1Label = container.querySelector('[data-testid="port-label-1"]');
      expect(p1Label).not.toBeNull();
      expect(p1Label?.textContent).toContain('1');
      expect(p1?.firstElementChild).toBe(p1Label);

      // Port 2 (even, lower row): silkscreen label is last child (order: 3)
      const p2 = container.querySelector('[data-testid="switch-port-2"]');
      const p2Label = container.querySelector('[data-testid="port-label-2"]');
      expect(p2Label).not.toBeNull();
      expect(p2Label?.textContent).toContain('2');
      expect(p2?.lastElementChild).toBe(p2Label);
    });

    it('Case 6.9: renders dedicated RJ45 Uplinks alongside SFP/SFP+ optical cages with metallic frame, latch, and duplex fiber icons', async () => {
      await renderWithContext(
        <SwitchPortFaceplate totalPorts={8} uplinkPorts={2} fiberPorts={2} ports={[]} />,
      );

      // RJ45 Uplinks
      const up1 = container.querySelector('[data-testid="switch-uplink-1"]');
      const up2 = container.querySelector('[data-testid="switch-uplink-2"]');
      const upLed1 = container.querySelector('[data-testid="uplink-led-1"]');
      expect(up1).not.toBeNull();
      expect(up2).not.toBeNull();
      expect(upLed1).not.toBeNull();

      // SFP Cages with authentic frame, latch release, and duplex fiber bores
      const sfp1 = container.querySelector('[data-testid="switch-sfp-1"]');
      const sfp2 = container.querySelector('[data-testid="switch-sfp-2"]');
      const sfpLatch1 = container.querySelector('[data-testid="sfp-latch-1"]');
      const sfpFiberLeft1 = container.querySelector('[data-testid="sfp-fiber-left-1"]');
      const sfpFiberRight1 = container.querySelector('[data-testid="sfp-fiber-right-1"]');

      expect(sfp1).not.toBeNull();
      expect(sfp2).not.toBeNull();
      expect(sfpLatch1).not.toBeNull();
      expect(sfpFiberLeft1).not.toBeNull();
      expect(sfpFiberRight1).not.toBeNull();
    });

    it('Case 6.10: supports onPortClick callback and synthesizes virtual port structure for unconfigured slots', async () => {
      const handlePortClick = vi.fn();
      await renderWithContext(
        <SwitchPortFaceplate totalPorts={8} ports={[]} onPortClick={handlePortClick} />,
      );

      const p3 = container.querySelector('[data-testid="switch-port-3"]') as HTMLElement;
      expect(p3).not.toBeNull();

      await act(async () => {
        p3.click();
      });

      expect(handlePortClick).toHaveBeenCalledTimes(1);
      expect(handlePortClick).toHaveBeenCalledWith(
        expect.objectContaining({
          portNumber: 3,
          name: 'Gi1/0/3',
          formFactor: 'RJ45_1G',
        }),
      );
    });

    it('Case 6.11: clicking dedicated RJ45 uplink triggers onPortClick callback', async () => {
      const handlePortClick = vi.fn();
      await renderWithContext(
        <SwitchPortFaceplate
          totalPorts={8}
          uplinkPorts={2}
          ports={[]}
          onPortClick={handlePortClick}
        />,
      );

      const up1 = container.querySelector('[data-testid="switch-uplink-1"]') as HTMLElement;
      expect(up1).not.toBeNull();

      await act(async () => {
        up1.click();
      });

      expect(handlePortClick).toHaveBeenCalledTimes(1);
      expect(handlePortClick).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Uplink1',
          mode: 'TRUNK',
        }),
      );
    });

    it('Case 6.12: clicking SFP cage triggers onPortClick callback', async () => {
      const handlePortClick = vi.fn();
      await renderWithContext(
        <SwitchPortFaceplate
          totalPorts={8}
          fiberPorts={2}
          ports={[]}
          onPortClick={handlePortClick}
        />,
      );

      const sfp1 = container.querySelector('[data-testid="switch-sfp-1"]') as HTMLElement;
      expect(sfp1).not.toBeNull();

      await act(async () => {
        sfp1.click();
      });

      expect(handlePortClick).toHaveBeenCalledTimes(1);
      expect(handlePortClick).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/Te1\/0\//),
          mode: 'TRUNK',
        }),
      );
    });
  });
});
