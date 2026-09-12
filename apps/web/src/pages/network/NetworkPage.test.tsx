import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetStatus } from '@uims/shared-types';
import type { Asset } from '../../services/assets.service';
import type { LocationBranch } from '../../services/organization.service';
import {
  type AutoDetectResult,
  type IPAddress,
  type NetworkCalculation,
  type NetworkStats,
  type Subnet,
  type VLAN,
  networkService,
} from '../../services/network.service';
import NetworkPage from './NetworkPage';

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const { mockLocations, mockVlans, mockSubnets, mockIps, mockStats, mockAssets } = vi.hoisted(() => {
  const locations: LocationBranch[] = [
    {
      id: 'loc-1',
      name: 'BSL Factory 1',
      building: 'Building A',
      floor: 'Floor 1',
    },
    {
      id: 'loc-2',
      name: 'HCM Office D3',
      building: 'Main Tower',
      floor: 'Floor 7',
    },
  ];

  const vlans: VLAN[] = [
    {
      id: 'vlan-1',
      vlanNumber: 10,
      name: 'Core Servers',
      description: 'Main production server farm VLAN',
      status: 'ACTIVE',
      locationId: 'loc-1',
      location: {
        id: 'loc-1',
        name: 'BSL Factory 1',
        address: null,
        city: 'Bac Ninh',
        country: 'Vietnam',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'vlan-2',
      vlanNumber: 130,
      name: 'Time Attendance & Access Control',
      description: 'Fingerprint and facial scanners network',
      status: 'ACTIVE',
      locationId: 'loc-1',
      location: {
        id: 'loc-1',
        name: 'BSL Factory 1',
        address: null,
        city: 'Bac Ninh',
        country: 'Vietnam',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const subnets: Subnet[] = [
    {
      id: 'sub-1',
      cidr: '10.232.10.0/24',
      name: 'BSL Core Server Subnet',
      vlanId: 'vlan-1',
      locationId: 'loc-1',
      gateway: '10.232.10.254',
      networkAddress: '10.232.10.0',
      netmask: '255.255.255.0',
      broadcastAddress: '10.232.10.255',
      startIp: '10.232.10.1',
      endIp: '10.232.10.254',
      totalIps: 254,
      usedIps: 45,
      reservedIps: 5,
      vlan: vlans[0],
      location: vlans[0].location,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'sub-2',
      cidr: '10.232.130.0/24',
      name: 'Time Attendance Scanner Pool',
      vlanId: 'vlan-2',
      locationId: 'loc-1',
      gateway: '10.232.130.254',
      networkAddress: '10.232.130.0',
      netmask: '255.255.255.0',
      broadcastAddress: '10.232.130.255',
      startIp: '10.232.130.1',
      endIp: '10.232.130.254',
      totalIps: 254,
      usedIps: 28,
      reservedIps: 2,
      vlan: vlans[1],
      location: vlans[1].location,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const ips: IPAddress[] = [
    {
      id: 'ip-1',
      address: '10.232.10.10',
      ip: '10.232.10.10',
      hostname: 'bsl-srv-app01.uims.lan',
      macAddress: '00:1B:44:11:3A:B7',
      mac: '00:1B:44:11:3A:B7',
      vendor: 'Cisco Systems',
      deviceType: 'Server',
      model: 'UCS C240 M5',
      status: 'ASSIGNED',
      pingStatus: 'online',
      subnetId: 'sub-1',
      vlanId: 'vlan-1',
      locationId: 'loc-1',
      subnet: subnets[0],
      vlan: vlans[0],
      asset: {
        id: 'ast-1',
        name: 'App Server Node 1',
        assetTag: 'AST-SRV-001',
        status: 'IN_USE' as AssetStatus,
        manufacturer: 'Cisco',
        model: 'UCS C240 M5',
        serialNumber: 'FCH2144V0AB',
        location: vlans[0].location,
        purchaseDate: '2025-01-01',
        purchaseCost: 4500,
        warrantyExpiry: '2028-01-01',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ip-2',
      address: '10.232.130.15',
      ip: '10.232.130.15',
      hostname: 'bsl-fp-gate02.uims.lan',
      macAddress: 'BC:5E:CD:99:88:77',
      mac: 'BC:5E:CD:99:88:77',
      vendor: 'Hikvision',
      deviceType: 'Time Attendance',
      model: 'DS-K1T671MF',
      status: 'ASSIGNED',
      pingStatus: 'online',
      subnetId: 'sub-2',
      vlanId: 'vlan-2',
      locationId: 'loc-1',
      subnet: subnets[1],
      vlan: vlans[1],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const stats: NetworkStats = {
    totalVlans: 2,
    managedSubnets: 2,
    totalIps: 2,
    allocatedStaticIps: 2,
    reservedDhcpLeases: 0,
    availableIps: 504,
    freeIpCapacity: 504,
    averageUtilization: 14,
  };

  const assets: Asset[] = [
    {
      id: 'ast-1',
      name: 'App Server Node 1',
      tag: 'AST-SRV-001',
      manufacturer: 'Cisco',
      model: 'UCS C240 M5',
      serialNumber: 'FCH2144V0AB',
      category: 'Server',
      status: 'Active',
      assignedTo: 'Alex Chen',
      assignedEmail: 'alex.chen@uims.internal',
      location: 'BSL Factory 1',
      purchaseDate: '2025-01-01',
      purchasePrice: 4500,
      warrantyExpiry: '2028-01-01',
      specs: { cpu: 'Xeon Silver', ram: '128GB', storage: '2TB NVMe', os: 'RHEL 9' },
    },
  ];

  return {
    mockLocations: locations,
    mockVlans: vlans,
    mockSubnets: subnets,
    mockIps: ips,
    mockStats: stats,
    mockAssets: assets,
  };
});

// Mock API Services
vi.mock('../../services/network.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/network.service')>();
  return {
    ...actual,
    networkService: {
      getStats: vi.fn().mockResolvedValue(mockStats),
      getVlans: vi.fn().mockResolvedValue(mockVlans),
      getVlan: vi.fn().mockResolvedValue(mockVlans[0]),
      createVlan: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'vlan-new',
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ),
      updateVlan: vi.fn().mockResolvedValue(mockVlans[0]),
      deleteVlan: vi.fn().mockResolvedValue(undefined),
      getSubnets: vi.fn().mockResolvedValue(mockSubnets),
      getSubnet: vi.fn().mockResolvedValue(mockSubnets[0]),
      createSubnet: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'sub-new',
          ...data,
          totalIps: 254,
          usedIps: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ),
      updateSubnet: vi.fn().mockResolvedValue(mockSubnets[0]),
      deleteSubnet: vi.fn().mockResolvedValue(undefined),
      getNextAvailableIp: vi.fn().mockResolvedValue({
        subnetId: 'sub-2',
        cidr: '10.232.130.0/24',
        nextAvailableIp: '10.232.130.16',
      }),
      calculateSubnet: vi.fn().mockImplementation((_cidr: string): Promise<NetworkCalculation> => {
        return Promise.resolve({
          networkAddress: '10.232.130.0',
          broadcastAddress: '10.232.130.255',
          subnetMask: '255.255.255.0',
          prefix: 24,
          totalHosts: 256,
          usableHosts: 254,
          usableStart: '10.232.130.1',
          usableEnd: '10.232.130.254',
          suggestedGateway: '10.232.130.254',
        });
      }),
      autoDetect: vi.fn().mockImplementation((ip: string): Promise<AutoDetectResult> => {
        if (ip.startsWith('10.232.130.')) {
          return Promise.resolve({
            ip,
            matchedSubnet: mockSubnets[1],
            matchedVlan: mockVlans[1],
            isWithinSubnet: true,
            suggestedGateway: '10.232.130.254',
          });
        }
        return Promise.resolve({
          ip,
          matchedSubnet: null,
          matchedVlan: null,
          isWithinSubnet: false,
        });
      }),
      lookupMacVendor: vi.fn().mockImplementation((mac: string) => {
        if (mac.toLowerCase().includes('00:1b:44')) {
          return Promise.resolve({ mac, vendor: 'Cisco Systems', isKnown: true });
        }
        if (mac.toLowerCase().includes('bc:5e:cd')) {
          return Promise.resolve({ mac, vendor: 'Hikvision', isKnown: true });
        }
        return Promise.resolve({ mac, vendor: 'Generic Device', isKnown: false });
      }),
      getIps: vi.fn().mockResolvedValue(mockIps),
      getIp: vi.fn().mockResolvedValue(mockIps[0]),
      createIp: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'ip-new',
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ),
      updateIp: vi.fn().mockResolvedValue(mockIps[0]),
      deleteIp: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('../../services/organization.service', () => ({
  organizationService: {
    getLocations: vi.fn().mockResolvedValue(mockLocations),
  },
}));

vi.mock('../../services/assets.service', () => ({
  assetsService: {
    getAssets: vi.fn().mockResolvedValue(mockAssets),
  },
}));

vi.mock('../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  },
}));

describe('NetworkPage & Enterprise IPAM Experience', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

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
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => {
        el.remove();
      });
  });

  const renderComponent = async () => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(
            ConfigProvider,
            null,
            createElement(App, null, createElement(NetworkPage, null)),
          ),
        ),
      );
    });
    // Wait for data load promises
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  it('renders NetworkPage with telemetry stats and 3 primary tabs', async () => {
    await renderComponent();

    // Verify Title & Subtitle
    expect(container.textContent).toContain('Network & IPAM');
    expect(container.textContent).toContain('Active VLANs');
    expect(container.textContent).toContain('Managed Subnets');
    expect(container.textContent).toContain('Allocated Static IPs');
    expect(container.textContent).toContain('Free IP Capacity');

    // Verify 3 Tabs exist
    expect(container.textContent).toContain('IP Allocations');
    expect(container.textContent).toContain('Subnets');
    expect(container.textContent).toContain('VLANs');

    // Verify Header Action Buttons
    expect(container.textContent).toContain('Create VLAN');
    expect(container.textContent).toContain('Create Subnet');
    expect(container.textContent).toContain('Allocate IP');
  });

  it('renders IP Allocations table with rich columns and filters', async () => {
    await renderComponent();

    // Verify IP table columns
    expect(container.textContent).toContain('10.232.10.10');
    expect(container.textContent).toContain('bsl-srv-app01.uims.lan');
    expect(container.textContent).toContain('Cisco Systems');
    expect(container.textContent).toContain('UCS C240 M5');
    expect(container.textContent).toContain('AST-SRV-001');

    // Verify second IP
    expect(container.textContent).toContain('10.232.130.15');
    expect(container.textContent).toContain('Hikvision');
    expect(container.textContent).toContain('DS-K1T671MF');
  });

  it('filters IP allocations when searching by hostname or vendor', async () => {
    await renderComponent();

    const searchInput = container.querySelector(
      'input[placeholder*="Search by IP"]',
    ) as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    // Search for Hikvision
    await act(async () => {
      setInputValue(searchInput, 'Hikvision');
    });

    expect(container.textContent).toContain('10.232.130.15');
    expect(container.textContent).not.toContain('10.232.10.10');

    // Click Reset
    const resetButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Reset',
    );
    expect(resetButton).toBeTruthy();

    await act(async () => {
      resetButton?.click();
    });

    // Both should be restored
    expect(container.textContent).toContain('10.232.10.10');
    expect(container.textContent).toContain('10.232.130.15');
  });

  it('switches to Subnets tab and supports table view and card grid view toggle', async () => {
    await renderComponent();

    // Switch to Subnets tab
    const subnetsTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((tab) =>
      tab.textContent?.includes('Subnets'),
    );
    expect(subnetsTab).toBeTruthy();

    await act(async () => {
      (subnetsTab?.querySelector('.ant-tabs-tab-btn') as HTMLElement)?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Verify subnets are rendered
    expect(container.textContent).toContain('10.232.10.0/24');
    expect(container.textContent).toContain('10.232.130.0/24');
    expect(container.textContent).toContain('BSL Core Server Subnet');

    // Switch to Cards view mode
    const cardsSegment = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
      (el) => el.textContent?.includes('Cards'),
    );
    expect(cardsSegment).toBeTruthy();

    await act(async () => {
      (cardsSegment as HTMLElement)?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Subnet cards should still display CIDRs and utilization
    expect(container.textContent).toContain('10.232.10.0/24');
    expect(container.textContent).toContain('Mask: 255.255.255.0');
  });

  it('switches to VLANs tab and displays VLAN list with associated subnets and utilization', async () => {
    await renderComponent();

    // Switch to VLANs tab
    const vlansTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((tab) =>
      tab.textContent?.includes('VLANs'),
    );
    expect(vlansTab).toBeTruthy();

    await act(async () => {
      (vlansTab?.querySelector('.ant-tabs-tab-btn') as HTMLElement)?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Verify VLAN table rows
    expect(container.textContent).toContain('VLAN 10');
    expect(container.textContent).toContain('Core Servers');
    expect(container.textContent).toContain('VLAN 130');
    expect(container.textContent).toContain('Time Attendance & Access Control');
    expect(container.textContent).toContain('10.232.10.0/24');
  });

  it('opens and submits Create VLAN modal', async () => {
    await renderComponent();

    const createVlanBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Create VLAN'),
    );
    expect(createVlanBtn).toBeTruthy();

    await act(async () => {
      createVlanBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Verify modal appears in DOM
    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Create VLAN');

    const vlanNumInput = document.querySelector('input#vlanNumber') as HTMLInputElement;
    const vlanNameInput = document.querySelector('input#name') as HTMLInputElement;
    expect(vlanNumInput).toBeTruthy();
    expect(vlanNameInput).toBeTruthy();

    await act(async () => {
      setInputValue(vlanNumInput, '50');
      setInputValue(vlanNameInput, 'IoT Devices');
    });

    const okBtn = document.querySelector(
      '.ant-modal-footer button.ant-btn-primary',
    ) as HTMLButtonElement;
    expect(okBtn).toBeTruthy();

    await act(async () => {
      okBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(networkService.createVlan).toHaveBeenCalledWith(
      expect.objectContaining({
        vlanNumber: 50,
        name: 'IoT Devices',
      }),
    );
  });

  it('opens Create Subnet modal with real-time CIDR calculation and suggested gateway', async () => {
    await renderComponent();

    const createSubnetBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Create Subnet'),
    );
    expect(createSubnetBtn).toBeTruthy();

    await act(async () => {
      createSubnetBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.body.textContent).toContain('Create Subnet');

    const cidrInput = document.querySelector('input#cidr') as HTMLInputElement;
    expect(cidrInput).toBeTruthy();

    // Type a CIDR block
    await act(async () => {
      setInputValue(cidrInput, '10.232.130.0/24');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Real-time calculation preview card should appear
    expect(document.body.textContent).toContain('Automated Network Specifications (/24)');
    expect(document.body.textContent).toContain('254 Usable IPs');
    expect(document.body.textContent).toContain('10.232.130.254');
    expect(document.body.textContent).toContain('Use this Gateway');

    // Click "Use this Gateway"
    const applyGwBtn = Array.from(document.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Use this Gateway'),
    );
    expect(applyGwBtn).toBeTruthy();

    await act(async () => {
      applyGwBtn?.click();
    });

    const gatewayInput = document.querySelector('input#gateway') as HTMLInputElement;
    expect(gatewayInput.value).toBe('10.232.130.254');
  });

  it('opens Allocate IP modal and triggers Next Available IP and OUI lookup', async () => {
    await renderComponent();

    const allocateIpBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Allocate IP'),
    );
    expect(allocateIpBtn).toBeTruthy();

    await act(async () => {
      allocateIpBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.body.textContent).toContain('Allocate IP Address');

    // Test Next Available IP button
    const nextIpBtn = Array.from(document.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Next Available IP'),
    );
    expect(nextIpBtn).toBeTruthy();

    await act(async () => {
      nextIpBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const addressInput = document.querySelector('input#address') as HTMLInputElement;
    expect(addressInput.value).toBe('10.232.130.16');

    // Test MAC OUI vendor lookup
    const macInput = document.querySelector('input#macAddress') as HTMLInputElement;
    expect(macInput).toBeTruthy();

    await act(async () => {
      setInputValue(macInput, '00:1B:44:22:33:44');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(networkService.lookupMacVendor).toHaveBeenCalledWith('00:1B:44:22:33:44');
    expect(document.body.textContent).toContain('OUI Vendor: Cisco Systems');
  });
});
