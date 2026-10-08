import { App, ConfigProvider, Form } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IPAddress,
  NetworkRack,
  NetworkSwitch,
  Subnet,
  SwitchPort,
  VLAN,
} from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { IpAddressTable } from './IpAddressTable';
import { IpFormModal } from './IpFormModal';
import { PortConfigDrawer } from './PortConfigDrawer';
import { SubnetDetailDrawer } from './SubnetDetailDrawer';
import { SwitchFaceplateDrawer } from './SwitchFaceplateDrawer';
import { SwitchPortFaceplate } from './SwitchPortFaceplate';
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
      autoDetect: vi.fn(),
      autoDetectMac: vi.fn(),
      getNextAvailableIp: vi.fn(),
    },
  };
});

describe('Challenger M3-2: Network UI & Switch Faceplate Adversarial Test Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockRack: NetworkRack = {
    id: 'rack-1',
    name: 'Rack-01',
    code: 'RACK-01',
    totalHeight: 42,
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockVlan: VLAN = {
    id: 'vlan-10',
    vlanNumber: 10,
    name: 'Management',
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockSubnet: Subnet = {
    id: 'sub-1',
    name: 'Server Management Subnet',
    cidr: '10.232.10.0/24',
    networkAddress: '10.232.10.0',
    broadcastAddress: '10.232.10.255',
    netmask: '255.255.255.0',
    totalIps: 254,
    usedIps: 2,
    reservedIps: 1,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockIps: IPAddress[] = [
    {
      id: 'ip-1',
      address: '10.232.10.1',
      status: 'RESERVED',
      subnetId: 'sub-1',
      subnet: mockSubnet,
      vlanId: 'vlan-10',
      vlan: mockVlan,
      macAddress: '00:1B:44:11:3A:B7',
      vendor: 'Cisco Systems',
      deviceType: 'Router',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'ip-2',
      address: '10.232.10.50',
      status: 'ASSIGNED',
      subnetId: 'sub-1',
      subnet: mockSubnet,
      vlanId: 'vlan-10',
      vlan: mockVlan,
      macAddress: 'F0:2F:74:9C:21:88',
      vendor: 'Dell Technologies',
      deviceType: 'Server',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  const buildSwitch = (totalPorts: number, id = `sw-${totalPorts}`): NetworkSwitch => ({
    id,
    name: `SW-PROD-${totalPorts}P`,
    model: `Catalyst-${totalPorts}P`,
    vendor: 'Cisco Systems',
    serialNumber: `FOC20260${totalPorts}`,
    macAddress: `70:69:79:2A:41:${totalPorts.toString(16).padStart(2, '0')}`,
    firmwareVersion: '17.6.5',
    role: 'ACCESS',
    status: 'ONLINE',
    totalPorts,
    rackId: 'rack-1',
    rackPosition: 20,
    rackHeight: 1,
    rack: mockRack,
    ports: [],
    activePortsCount: Math.floor(totalPorts * 0.7),
    ipAddress: mockIps[0],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  });

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

  // ==========================================================================
  // PART 1: Switch Faceplate Standard Sizing & Physical Layout
  // ==========================================================================
  describe('PART 1: Switch Faceplate Standard Sizing & Physical Layout', () => {
    it('1.1: 8-Port Switch renders exactly 1 block of 8 ports with zigzag ordering and 2 SFP cages', async () => {
      const sw8 = buildSwitch(8);
      await renderWithContext(<SwitchPortFaceplate switchEntity={sw8} totalPorts={8} ports={[]} />);

      // Verify all 8 ports rendered
      for (let p = 1; p <= 8; p++) {
        const portEl = container.querySelector(`[data-testid="switch-port-${p}"]`);
        expect(portEl).not.toBeNull();
      }
      // Port 9 must not exist
      expect(container.querySelector('[data-testid="switch-port-9"]')).toBeNull();

      // Verify exactly 2 SFP cages (switch-sfp-1 and switch-sfp-2)
      expect(container.querySelector('[data-testid="switch-sfp-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-3"]')).toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-4"]')).toBeNull();

      // Verify zigzag: upper row odd [1, 3, 5, 7], lower row even [2, 4, 6, 8]
      // In DOM: modularBlocks[0] has upper row Flex then lower row Flex
      const port1 = container.querySelector('[data-testid="switch-port-1"]');
      const port2 = container.querySelector('[data-testid="switch-port-2"]');
      const port3 = container.querySelector('[data-testid="switch-port-3"]');
      const port4 = container.querySelector('[data-testid="switch-port-4"]');

      expect(port1?.parentElement).toBe(port3?.parentElement);
      expect(port2?.parentElement).toBe(port4?.parentElement);
      expect(port1?.parentElement).not.toBe(port2?.parentElement);

      // Verify responsive minWidth: 560px for <= 16P
      const chassis = container.querySelector('[data-testid="switch-faceplate-chassis"]');
      const flexInner = chassis?.firstElementChild?.nextElementSibling as HTMLElement;
      expect(flexInner?.style.minWidth).toBe('560px');
    });

    it('1.2: 16-Port Switch renders exactly 2 blocks of 8 ports with zigzag ordering and 2 SFP cages', async () => {
      const sw16 = buildSwitch(16);
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={sw16} totalPorts={16} ports={[]} />,
      );

      // Verify all 16 ports rendered
      for (let p = 1; p <= 16; p++) {
        expect(container.querySelector(`[data-testid="switch-port-${p}"]`)).not.toBeNull();
      }
      // Port 17 must not exist
      expect(container.querySelector('[data-testid="switch-port-17"]')).toBeNull();

      // Verify exactly 2 SFP cages
      expect(container.querySelector('[data-testid="switch-sfp-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-3"]')).toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-4"]')).toBeNull();

      // Block 1: 1..8; Block 2: 9..16
      const port8 = container.querySelector('[data-testid="switch-port-8"]');
      const port9 = container.querySelector('[data-testid="switch-port-9"]');
      expect(port8?.parentElement?.parentElement).not.toBe(port9?.parentElement?.parentElement);

      // Verify responsive minWidth: 560px for <= 16P
      const chassis = container.querySelector('[data-testid="switch-faceplate-chassis"]');
      const flexInner = chassis?.firstElementChild?.nextElementSibling as HTMLElement;
      expect(flexInner?.style.minWidth).toBe('560px');
    });

    it('1.3: 24-Port Switch renders exactly 2 blocks of 12 ports with zigzag ordering and 4 SFP+ cages', async () => {
      const sw24 = buildSwitch(24);
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={sw24} totalPorts={24} ports={[]} />,
      );

      // Verify all 24 ports rendered
      for (let p = 1; p <= 24; p++) {
        expect(container.querySelector(`[data-testid="switch-port-${p}"]`)).not.toBeNull();
      }
      expect(container.querySelector('[data-testid="switch-port-25"]')).toBeNull();

      // Verify exactly 4 SFP+ cages
      expect(container.querySelector('[data-testid="switch-sfp-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-3"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-4"]')).not.toBeNull();

      // Block 1 has 12 ports (1..12), Block 2 has 12 ports (13..24)
      const port12 = container.querySelector('[data-testid="switch-port-12"]');
      const port13 = container.querySelector('[data-testid="switch-port-13"]');
      expect(port12?.parentElement?.parentElement).not.toBe(port13?.parentElement?.parentElement);

      // Verify responsive minWidth: 840px for >= 24P
      const chassis = container.querySelector('[data-testid="switch-faceplate-chassis"]');
      const flexInner = chassis?.firstElementChild?.nextElementSibling as HTMLElement;
      expect(flexInner?.style.minWidth).toBe('840px');
    });

    it('1.4: 48-Port Switch renders exactly 4 blocks of 12 ports with zigzag ordering and 4 SFP+ cages', async () => {
      const sw48 = buildSwitch(48);
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={sw48} totalPorts={48} ports={[]} />,
      );

      // Verify all 48 ports rendered
      for (let p = 1; p <= 48; p++) {
        expect(container.querySelector(`[data-testid="switch-port-${p}"]`)).not.toBeNull();
      }
      expect(container.querySelector('[data-testid="switch-port-49"]')).toBeNull();

      // Verify exactly 4 SFP+ cages
      expect(container.querySelector('[data-testid="switch-sfp-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-3"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="switch-sfp-4"]')).not.toBeNull();

      // Verify 4 blocks of 12
      const port12 = container.querySelector('[data-testid="switch-port-12"]');
      const port13 = container.querySelector('[data-testid="switch-port-13"]');
      const port24 = container.querySelector('[data-testid="switch-port-24"]');
      const port25 = container.querySelector('[data-testid="switch-port-25"]');
      const port36 = container.querySelector('[data-testid="switch-port-36"]');
      const port37 = container.querySelector('[data-testid="switch-port-37"]');

      expect(port12?.parentElement?.parentElement).not.toBe(port13?.parentElement?.parentElement);
      expect(port24?.parentElement?.parentElement).not.toBe(port25?.parentElement?.parentElement);
      expect(port36?.parentElement?.parentElement).not.toBe(port37?.parentElement?.parentElement);

      // Verify responsive minWidth: 840px for >= 24P
      const chassis = container.querySelector('[data-testid="switch-faceplate-chassis"]');
      const flexInner = chassis?.firstElementChild?.nextElementSibling as HTMLElement;
      expect(flexInner?.style.minWidth).toBe('840px');
    });

    it('1.5: mathematically verifies zigzag invariant across all 4 switch profiles', async () => {
      const sizes = [8, 16, 24, 48];
      for (const size of sizes) {
        if (currentRoot) {
          await act(async () => {
            currentRoot?.unmount();
          });
          currentRoot = null;
        }
        await renderWithContext(
          <SwitchPortFaceplate switchEntity={buildSwitch(size)} totalPorts={size} ports={[]} />,
        );

        for (let p = 1; p <= size; p += 2) {
          const oddPort = container.querySelector(`[data-testid="switch-port-${p}"]`);
          const evenPort = container.querySelector(`[data-testid="switch-port-${p + 1}"]`);
          expect(oddPort).not.toBeNull();
          expect(evenPort).not.toBeNull();

          // Odd port and even port must be in different row containers
          expect(oddPort?.parentElement).not.toBe(evenPort?.parentElement);
          // And they must share the same modular block container
          expect(oddPort?.parentElement?.parentElement).toBe(
            evenPort?.parentElement?.parentElement,
          );
        }
      }
    });
  });

  // ==========================================================================
  // PART 2: Hostname Complete Purge Across Network UI Components
  // ==========================================================================
  describe('PART 2: Hostname Complete Purge Across Network UI Components', () => {
    it('2.1: IpAddressTable renders column as "IP Address" without hostname text or tags', async () => {
      await renderWithContext(
        <IpAddressTable
          ips={mockIps}
          subnets={[mockSubnet]}
          vlans={[mockVlan]}
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

      // Check table column header
      const headers = Array.from(container.querySelectorAll('.ant-table-thead th')).map(
        (th) => th.textContent || '',
      );
      expect(headers.some((h) => h.includes('IP Address'))).toBe(true);
      expect(headers.some((h) => h.toLowerCase().includes('hostname'))).toBe(false);
      expect(headers.some((h) => h.toLowerCase().includes('fqdn'))).toBe(false);

      // Check entire container text: must have 0 occurrences of "hostname"
      expect(container.textContent?.toLowerCase()).not.toContain('hostname');

      // Check search input placeholder has no hostname
      const searchInput = container.querySelector('input[placeholder*="Search"]');
      expect(searchInput?.getAttribute('placeholder')?.toLowerCase()).not.toContain('hostname');
      expect(searchInput?.getAttribute('placeholder')).toBe(
        'Search by IP, MAC, vendor, model, asset tag...',
      );
    });

    it('2.2: IpFormModal renders full-width IP field (span 24) and has ZERO hostname inputs or labels', async () => {
      const FormWrapper = () => {
        const [form] = Form.useForm();
        return (
          <IpFormModal
            open={true}
            editingIp={null}
            form={form}
            submitting={false}
            subnets={[mockSubnet]}
            vlans={[mockVlan]}
            onSave={vi.fn()}
            onCancel={vi.fn()}
          />
        );
      };

      await renderWithContext(<FormWrapper />);

      const modalBody = document.querySelector('.ant-modal-body');
      expect(modalBody).not.toBeNull();

      // Check IP address Col has span 24 (ant-col-24)
      const ipInput = modalBody?.querySelector('input[placeholder="e.g. 10.232.130.15"]');
      expect(ipInput).not.toBeNull();
      const colWrapper = ipInput?.closest('.ant-col-24');
      expect(colWrapper).not.toBeNull();

      // Check that NO hostname input or label exists in modal
      expect(modalBody?.textContent?.toLowerCase()).not.toContain('hostname');
      expect(modalBody?.textContent?.toLowerCase()).not.toContain('fqdn');
      expect(modalBody?.querySelector('input[name="hostname"]')).toBeNull();
      expect(modalBody?.querySelector('#hostname')).toBeNull();
    });

    it('2.3: SubnetDetailDrawer renders IP allocations table without hostname column', async () => {
      await renderWithContext(
        <SubnetDetailDrawer open={true} subnet={mockSubnet} ips={mockIps} onClose={vi.fn()} />,
      );

      const drawerBody = document.querySelector('.ant-drawer-body');
      expect(drawerBody).not.toBeNull();

      // Drawer text must not contain hostname
      expect(drawerBody?.textContent?.toLowerCase()).not.toContain('hostname');

      // Table headers inside drawer
      const headers = Array.from(drawerBody?.querySelectorAll('.ant-table-thead th') || []).map(
        (th) => th.textContent || '',
      );
      expect(headers.some((h) => h.toLowerCase().includes('hostname'))).toBe(false);
      expect(headers.some((h) => h.includes('IP Address'))).toBe(true);
    });

    it('2.4: PortConfigDrawer IP options format without hostname strings', async () => {
      const testPort: SwitchPort = {
        id: 'p-1',
        switchId: 'sw-24',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: 'RJ45_1G',
        poeEnabled: true,
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        mode: 'ACCESS',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      await renderWithContext(
        <PortConfigDrawer
          open={true}
          port={testPort}
          switchEntity={buildSwitch(24)}
          subnets={[mockSubnet]}
          vlans={[mockVlan]}
          ips={mockIps}
          onClose={vi.fn()}
        />,
      );

      const drawerBody = document.querySelector('.ant-drawer-body');
      expect(drawerBody).not.toBeNull();
      expect(drawerBody?.textContent?.toLowerCase()).not.toContain('hostname');
    });

    it('2.5: SwitchFaceplateDrawer renders switch metadata and port list without hostname remnants', async () => {
      vi.mocked(networkService.getSwitchPorts).mockResolvedValueOnce([]);

      await renderWithContext(
        <SwitchFaceplateDrawer open={true} switchEntity={buildSwitch(24)} onClose={vi.fn()} />,
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const drawerBody = document.querySelector('.ant-drawer-body');
      expect(drawerBody).not.toBeNull();
      expect(drawerBody?.textContent?.toLowerCase()).not.toContain('hostname');
    });

    it('2.6: SwitchTable renders switch fleet with clean management IP and zero hostname text', async () => {
      await renderWithContext(
        <SwitchTable
          switches={[buildSwitch(8), buildSwitch(24)]}
          onViewFaceplate={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(container.textContent?.toLowerCase()).not.toContain('hostname');
      expect(container.textContent).toContain('10.232.10.1');
    });
  });
});
