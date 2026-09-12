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
import { IpAddressTable } from './components/IpAddressTable';
import { SubnetManagementTab } from './components/SubnetManagementTab';

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const { mockLocations, mockVlans, mockSubnets, mockIps, mockStats, mockAssets } = vi.hoisted(() => {
  const locations: Array<LocationBranch> = [
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

  const vlans: Array<VLAN> = [
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

  const subnets: Array<Subnet> = [
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

  const ips: Array<IPAddress> = [
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

  const assets: Array<Asset> = [
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
      getVlans: vi.fn().mockImplementation((params) => {
        let list = [...mockVlans];
        if (params?.locationId) {
          list = list.filter((v) => v.locationId === params.locationId);
        }
        if (params?.status) {
          list = list.filter((v) => v.status === params.status);
        }
        return Promise.resolve(list);
      }),
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
      getSubnets: vi.fn().mockImplementation((params) => {
        let list = [...mockSubnets];
        if (params?.vlanId) {
          list = list.filter((s) => s.vlanId === params.vlanId || s.vlan?.id === params.vlanId);
        }
        if (params?.locationId) {
          list = list.filter((s) => s.locationId === params.locationId);
        }
        return Promise.resolve(list);
      }),
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
      getIps: vi.fn().mockImplementation((params) => {
        let list = [...mockIps];
        if (params?.vlanId) {
          list = list.filter((i) => i.vlanId === params.vlanId || i.vlan?.id === params.vlanId);
        }
        if (params?.subnetId) {
          list = list.filter(
            (i) => i.subnetId === params.subnetId || i.subnet?.id === params.subnetId,
          );
        }
        if (params?.deviceType) {
          list = list.filter(
            (i) => (i.deviceType || '').toLowerCase() === params.deviceType.toLowerCase(),
          );
        }
        if (params?.status) {
          list = list.filter((i) => String(i.status).toUpperCase() === params.status.toUpperCase());
        }
        if (params?.locationId) {
          list = list.filter((i) => i.locationId === params.locationId);
        }
        return Promise.resolve(list);
      }),
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

describe('Milestone 3 Empirical Stress Test Harness', { timeout: 60000 }, () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  const unhandledErrors: Array<Error> = [];

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    window.addEventListener('unhandledrejection', (e) => {
      unhandledErrors.push(new Error(String(e.reason)));
    });
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
    unhandledErrors.length = 0;
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
      container.parentNode.removeChild(container);
    }
    document
      .querySelectorAll(
        '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-select-dropdown',
      )
      .forEach((el) => {
        el.remove();
      });
  });

  const renderNetworkPage = async () => {
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
    // Flush loadData promises
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
  };

  // =========================================================================
  // 1. MULTI-DIMENSIONAL FILTER COMBINATIONS ON IP ALLOCATIONS
  // =========================================================================
  describe('Suite 1: Multi-Dimensional Filter Combinations on IP Allocations', () => {
    it('applies 6-dimensional filter conjunction matching a single target IP', async () => {
      const onSearchChange = vi.fn();
      const onSiteChange = vi.fn();
      const onVlanChange = vi.fn();
      const onSubnetChange = vi.fn();
      const onDeviceTypeChange = vi.fn();
      const onStatusChange = vi.fn();
      const onResetFilters = vi.fn();

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
              createElement(IpAddressTable, {
                ips: mockIps,
                subnets: mockSubnets,
                vlans: mockVlans,
                locations: mockLocations,
                loading: false,
                searchQuery: 'cisco',
                onSearchChange,
                siteFilter: 'loc-1',
                onSiteChange,
                vlanFilter: 'vlan-1',
                onVlanChange,
                subnetFilter: 'sub-1',
                onSubnetChange,
                deviceTypeFilter: 'Server',
                onDeviceTypeChange,
                statusFilter: 'ASSIGNED',
                onStatusChange,
                onResetFilters,
                onOpenEditModal: vi.fn(),
                onDeleteIp: vi.fn(),
              }),
            ),
          ),
        );
      });

      // Should match Cisco UCS Server (10.232.10.10)
      expect(container.textContent).toContain('10.232.10.10');
      expect(container.textContent).toContain('bsl-srv-app01.uims.lan');
      expect(container.textContent).toContain('Cisco Systems');

      // Should NOT match Hikvision (10.232.130.15)
      expect(container.textContent).not.toContain('10.232.130.15');
      expect(container.textContent).not.toContain('Hikvision');
    });

    it('returns empty table when filters conflict (mismatched Device Type)', async () => {
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
              createElement(IpAddressTable, {
                ips: mockIps,
                subnets: mockSubnets,
                vlans: mockVlans,
                locations: mockLocations,
                loading: false,
                searchQuery: '',
                onSearchChange: vi.fn(),
                siteFilter: 'loc-1',
                onSiteChange: vi.fn(),
                vlanFilter: 'vlan-1',
                onVlanChange: vi.fn(),
                subnetFilter: 'sub-1',
                onSubnetChange: vi.fn(),
                deviceTypeFilter: 'Printer', // Conflicting device type
                onDeviceTypeChange: vi.fn(),
                statusFilter: 'ASSIGNED',
                onStatusChange: vi.fn(),
                onResetFilters: vi.fn(),
                onOpenEditModal: vi.fn(),
                onDeleteIp: vi.fn(),
              }),
            ),
          ),
        );
      });

      // Neither IP should be shown
      expect(container.textContent).not.toContain('10.232.10.10');
      expect(container.textContent).not.toContain('10.232.130.15');
      expect(container.textContent).toContain('No data');
    });

    it('filters IP Allocations when searching across heterogeneous identifiers (MAC, Asset Tag, Model)', async () => {
      await renderNetworkPage();

      const searchInput = container.querySelector(
        'input[placeholder*="Search by IP"]',
      ) as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      // 1. Search by MAC address of ip-2
      await act(async () => {
        setInputValue(searchInput, 'BC:5E:CD');
      });
      expect(container.textContent).toContain('10.232.130.15');
      expect(container.textContent).not.toContain('10.232.10.10');

      // 2. Search by Asset Tag of ip-1
      await act(async () => {
        setInputValue(searchInput, 'AST-SRV-001');
      });
      expect(container.textContent).toContain('10.232.10.10');
      expect(container.textContent).not.toContain('10.232.130.15');

      // 3. Search by Device Model of ip-2
      await act(async () => {
        setInputValue(searchInput, 'DS-K1T671MF');
      });
      expect(container.textContent).toContain('10.232.130.15');
      expect(container.textContent).not.toContain('10.232.10.10');

      // 4. Click Reset to restore all
      const resetBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Reset',
      );
      expect(resetBtn).toBeTruthy();
      await act(async () => {
        resetBtn?.click();
      });
      expect(container.textContent).toContain('10.232.10.10');
      expect(container.textContent).toContain('10.232.130.15');
    });
  });

  // =========================================================================
  // 2. CROSS-TAB DRILL-DOWN NAVIGATION
  // =========================================================================
  describe('Suite 2: Cross-Tab Drill-Down Navigation', () => {
    it('drill-down from VLAN tab -> View Subnets switches tab and calls getSubnets with vlanId', async () => {
      await renderNetworkPage();

      // Switch to VLAN tab
      const vlansTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((tab) =>
        tab.textContent?.includes('VLANs'),
      );
      expect(vlansTab).toBeTruthy();

      await act(async () => {
        (vlansTab?.querySelector('.ant-tabs-tab-btn') as HTMLElement)?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Open View Details Drawer for VLAN 10 (first row Eye button)
      const eyeBtn = container.querySelector('tbody button .anticon-eye')?.closest('button');
      expect(eyeBtn).toBeTruthy();

      await act(async () => {
        eyeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Verify VLAN Detail Drawer opened
      expect(document.body.textContent).toContain('VLAN 10 — Core Servers');

      // Click "View Subnets" in drawer extra header
      const viewSubnetsBtn = Array.from(document.querySelectorAll('.ant-drawer button')).find((b) =>
        b.textContent?.includes('View Subnets'),
      ) as HTMLElement | undefined;
      expect(viewSubnetsBtn).toBeTruthy();

      await act(async () => {
        viewSubnetsBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Tab should switch to Subnets
      const activeTab = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab?.textContent).toContain('Subnets');

      // getSubnets should have been called with vlanId: 'vlan-1'
      expect(networkService.getSubnets).toHaveBeenCalledWith(
        expect.objectContaining({ vlanId: 'vlan-1' }),
      );
    });

    it('drill-down from VLAN tab -> View IPs switches to IP Allocations and filters table', async () => {
      await renderNetworkPage();

      // Switch to VLAN tab
      const vlansTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((tab) =>
        tab.textContent?.includes('VLANs'),
      );
      await act(async () => {
        (vlansTab?.querySelector('.ant-tabs-tab-btn') as HTMLElement)?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Find eye button for VLAN 130 via its dedicated VLAN Tag
      const vlan130Tag = Array.from(container.querySelectorAll('.ant-tag')).find(
        (t) => t.textContent?.trim() === 'VLAN 130',
      );
      expect(vlan130Tag).toBeTruthy();
      const vlan130Row = vlan130Tag?.closest('tr');
      expect(vlan130Row).toBeTruthy();

      const eyeBtn = vlan130Row?.querySelector('.anticon-eye')?.closest('button');
      expect(eyeBtn).toBeTruthy();

      await act(async () => {
        eyeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Click "View IPs" in drawer extra header
      const viewIpsBtn = Array.from(document.querySelectorAll('.ant-drawer button')).find((b) =>
        b.textContent?.includes('View IPs'),
      ) as HTMLElement | undefined;
      expect(viewIpsBtn).toBeTruthy();

      await act(async () => {
        viewIpsBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Tab should switch to IP Allocations
      const activeTab = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab?.textContent).toContain('IP Allocations');

      // IP table should be filtered: only 10.232.130.15 is shown
      expect(container.textContent).toContain('10.232.130.15');
      expect(container.textContent).not.toContain('10.232.10.10');
    });

    it('drill-down from Subnet Detail Drawer -> Filter in IP Allocations switches to IP Allocations and filters by subnet', async () => {
      await renderNetworkPage();

      // Switch to Subnets tab
      const subnetsTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((tab) =>
        tab.textContent?.includes('Subnets'),
      );
      await act(async () => {
        (subnetsTab?.querySelector('.ant-tabs-tab-btn') as HTMLElement)?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Open detail drawer for Subnet 1 (10.232.10.0/24)
      const eyeBtn = container.querySelector('tbody button .anticon-eye')?.closest('button');
      expect(eyeBtn).toBeTruthy();

      await act(async () => {
        eyeBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(document.body.textContent).toContain('10.232.10.0/24 — BSL Core Server Subnet');

      // Click "Filter in IP Allocations" in drawer header
      const filterIpBtn = Array.from(document.querySelectorAll('.ant-drawer button')).find((b) =>
        b.textContent?.includes('Filter in IP Allocations'),
      ) as HTMLElement | undefined;
      expect(filterIpBtn).toBeTruthy();

      await act(async () => {
        filterIpBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Tab should switch to IP Allocations
      const activeTab = container.querySelector('.ant-tabs-tab-active');
      expect(activeTab?.textContent).toContain('IP Allocations');

      // Table should be filtered to 10.232.10.10 only
      expect(container.textContent).toContain('10.232.10.10');
      expect(container.textContent).not.toContain('10.232.130.15');
    });
  });

  // =========================================================================
  // 3. SUBNET TAB VIEW MODE TOGGLE & DENSITY
  // =========================================================================
  describe('Suite 3: Subnet Tab View Mode Toggle & Density', () => {
    it('switches between Table view and Card grid view and verifies technical specifications density', async () => {
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
              createElement(SubnetManagementTab, {
                subnets: mockSubnets,
                vlans: mockVlans,
                locations: mockLocations,
                loading: false,
                onOpenCreateModal: vi.fn(),
                onOpenEditModal: vi.fn(),
                onOpenDetailDrawer: vi.fn(),
                onDeleteSubnet: vi.fn(),
              }),
            ),
          ),
        );
      });

      // Default: Table view
      expect(container.querySelector('.ant-table')).toBeTruthy();
      expect(container.textContent).toContain('10.232.10.0/24');
      expect(container.textContent).toContain('BSL Core Server Subnet');

      // Switch to Cards
      const cardsSegment = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
        (el) => el.textContent?.includes('Cards'),
      );
      expect(cardsSegment).toBeTruthy();

      await act(async () => {
        (cardsSegment as HTMLElement)?.click();
      });

      // Verify Table is replaced with Cards
      expect(container.querySelector('.ant-table')).toBeNull();
      const cards = container.querySelectorAll('.ant-card');
      expect(cards.length).toBeGreaterThanOrEqual(2);

      // Verify Card technical specs
      expect(container.textContent).toContain('Mask: 255.255.255.0');
      expect(container.textContent).toContain('10.232.10.1 - 10.232.10.254');
      expect(container.textContent).toContain('Gateway: 10.232.10.254');
      expect(container.textContent).toContain('45 used');

      // Switch back to Table
      const tableSegment = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
        (el) => el.textContent?.includes('Table'),
      );
      await act(async () => {
        (tableSegment as HTMLElement)?.click();
      });

      expect(container.querySelector('.ant-table')).toBeTruthy();
    });

    it('handles empty subnet filter in Card view without crashing', async () => {
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
              createElement(SubnetManagementTab, {
                subnets: [],
                vlans: mockVlans,
                locations: mockLocations,
                loading: false,
                onOpenCreateModal: vi.fn(),
                onOpenEditModal: vi.fn(),
                onOpenDetailDrawer: vi.fn(),
                onDeleteSubnet: vi.fn(),
              }),
            ),
          ),
        );
      });

      // Switch to Cards
      const cardsSegment = Array.from(container.querySelectorAll('.ant-segmented-item-label')).find(
        (el) => el.textContent?.includes('Cards'),
      );
      await act(async () => {
        (cardsSegment as HTMLElement)?.click();
      });

      // SubnetCardList renders an empty row cleanly
      expect(container.querySelector('.ant-row')).toBeTruthy();
      expect(unhandledErrors.length).toBe(0);
    });
  });

  // =========================================================================
  // 4. REACT 19 / ANT DESIGN PORTAL DOM TEARDOWN HYGIENE & ASYNC STRESS
  // =========================================================================
  describe('Suite 4: React 19 Portal DOM Teardown Hygiene & Async Stress', () => {
    it('executes rapid consecutive mount/unmount cycles without portal DOM leakage or unhandled rejections', {
      timeout: 60000,
    }, async () => {
      for (let i = 0; i < 8; i++) {
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

        // Unmount immediately
        await act(async () => {
          root.unmount();
          currentRoot = null;
        });
      }

      // Check DOM portal leakage
      const leakedPortals = document.querySelectorAll(
        '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover',
      );
      expect(leakedPortals.length).toBe(0);
      expect(unhandledErrors).toEqual([]);
    });

    it('unmounts cleanly while modals and drawers are actively mounted in DOM', async () => {
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
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Ensure VLAN tab state is activated in HappyDOM if modal trigger is scoped to tab
      const vlansTab = Array.from(container.querySelectorAll('.ant-tabs-tab')).find((tab) =>
        tab.textContent?.includes('VLANs'),
      );
      if (vlansTab) {
        await act(async () => {
          (vlansTab.querySelector('.ant-tabs-tab-btn') as HTMLElement)?.click();
          await new Promise((resolve) => setTimeout(resolve, 60));
        });
      }

      // Open Create VLAN modal
      const createVlanBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Create VLAN'),
      );
      expect(createVlanBtn).toBeTruthy();

      await act(async () => {
        createVlanBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
      });

      // Modal is visible in document.body
      expect(document.querySelector('.ant-modal')).toBeTruthy();

      // Unmount the entire component tree while modal is still open
      await act(async () => {
        currentRoot?.unmount();
        currentRoot = null;
      });

      // Clean up portals as per teardown invariant
      document
        .querySelectorAll(
          '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-select-dropdown',
        )
        .forEach((el) => {
          el.remove();
        });

      expect(unhandledErrors).toEqual([]);
    });

    it('stress-tests rapid tab switching churn under concurrent state updates', async () => {
      await renderNetworkPage();

      const tabs = container.querySelectorAll('.ant-tabs-tab-btn');
      expect(tabs.length).toBe(3);

      // Rapidly switch tabs 10 times in tight loop
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          const tabBtn = tabs[i % 3] as HTMLElement;
          tabBtn.click();
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // The UI remains stable and no unhandled error occurred
      expect(container.textContent).toContain('Network & IPAM');
      expect(unhandledErrors).toEqual([]);
    });
  });
});
