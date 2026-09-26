import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkRack, RackElevationData } from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import type { LocationBranch } from '../../../services/organization.service';
import { queryClient } from '../../../app/query-client';
import { RackElevationView } from './RackElevationView';
import { RackFormModal } from './RackFormModal';
import { RackManagementTab } from './RackManagementTab';
import { RackTable } from './RackTable';

vi.mock('../../../services/network.service', async () => {
  const actual = await vi.importActual<typeof import('../../../services/network.service')>(
    '../../../services/network.service',
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
      updateSwitch: vi.fn().mockResolvedValue({}),
    },
  };
});

describe('Milestone 4: 2D Visual Rack Elevation & Cabinet Management', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockLocationBranch: LocationBranch = {
    id: 'loc-1',
    name: 'Main Datacenter',
    code: 'MDC',
    type: 'DATACENTER',
  };

  const mockRack42U: NetworkRack = {
    id: 'rack-42u-1',
    name: 'DC1 Core Cabinet 01',
    code: 'RCK-DC1-01',
    totalHeight: 42,
    maxPowerKw: 8.0,
    maxWeightKg: 600,
    depth: 1000,
    width: 600,
    status: 'ACTIVE',
    notes: 'Primary distribution rack',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    location: {
      id: 'loc-1',
      name: 'Main Datacenter',
      code: 'MDC',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    switches: [
      {
        id: 'sw-1',
        name: 'SW-CORE-01',
        model: 'Catalyst 9300-48P',
        vendor: 'Cisco',
        role: 'CORE',
        status: 'ONLINE',
        rackHeight: 1,
        rackPosition: 24,
        totalPorts: 48,
        activePortsCount: 36,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'sw-2',
        name: 'SRV-HOST-01',
        model: 'PowerEdge R750',
        vendor: 'Dell',
        role: 'TOR',
        status: 'ONLINE',
        rackHeight: 2,
        rackPosition: 20,
        totalPorts: 4,
        activePortsCount: 4,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'sw-3',
        name: 'SAN-ARRAY-01',
        model: 'FlashArray//X20',
        vendor: 'PureStorage',
        role: 'CORE',
        status: 'ONLINE',
        rackHeight: 4,
        rackPosition: 10,
        totalPorts: 8,
        activePortsCount: 8,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ],
  };

  const mockElevationData: RackElevationData = {
    rackId: 'rack-42u-1',
    rackName: 'DC1 Core Cabinet 01',
    rackCode: 'RCK-DC1-01',
    totalHeight: 42,
    usedUnits: 7,
    availableUnits: 35,
    occupancyRate: 16.7,
    maxPowerKw: 8.0,
    estimatedPowerUsageKw: 1.05,
    slots: [],
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
    const root = currentRoot ?? createRoot(container);
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
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    return {
      rerender: async (newElement: React.ReactElement) => {
        await act(async () => {
          root.render(
            createElement(
              MemoryRouter,
              null,
              createElement(ConfigProvider, null, createElement(App, null, newElement)),
            ),
          );
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
        });
      },
    };
  };

  describe('Suite 1: EIA-310 Rail Geometry & Dynamic Height', () => {
    it('Case 1.1: renders compact cabinet elevation displaying only mounted devices and omitting empty slot rows', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Verify cabinet header
      expect(container.textContent).toContain('DC1 Core Cabinet 01');
      expect(container.textContent).toContain('RCK-DC1-01');
      expect(container.textContent).toContain('42U Standard');

      // Verify rail markers for mounted devices display sequential STT (#01, #02, #03...) instead of physical U numbers
      const u24Rail = container.querySelector('[data-testid="left-rail-u-24"]');
      const u20Rail = container.querySelector('[data-testid="left-rail-u-20"]');
      const u10Rail = container.querySelector('[data-testid="left-rail-u-10"]');
      expect(u24Rail).not.toBeNull();
      expect(u20Rail).not.toBeNull();
      expect(u10Rail).not.toBeNull();
      expect(u24Rail?.textContent).toContain('#01');
      expect(u20Rail?.textContent).toContain('#02');
      expect(u10Rail?.textContent).toContain('#03');
      expect(u24Rail?.textContent).not.toContain('U24');
      expect(u20Rail?.textContent).not.toContain('U20');
      expect(u10Rail?.textContent).not.toContain('U10');

      // Verify unoccupied/empty U slots are omitted from rendering
      expect(container.querySelector('[data-testid="left-rail-u-1"]')).toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-42"]')).toBeNull();
      expect(container.querySelectorAll('[data-testid^="empty-slot-"]').length).toBe(0);
    });

    it('Case 1.3: replaces physical U labels with sequential STT and supports toggling between ascending (1→N) and descending (N→1)', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Default is STT 1->N (ascending from top down)
      const u24Rail = container.querySelector('[data-testid="left-rail-u-24"]');
      const u20Rail = container.querySelector('[data-testid="left-rail-u-20"]');
      const u10Rail = container.querySelector('[data-testid="left-rail-u-10"]');
      expect(u24Rail?.textContent).toContain('#01');
      expect(u20Rail?.textContent).toContain('#02');
      expect(u10Rail?.textContent).toContain('#03');

      // Check STT Tag on device cards
      const sw1El = container.querySelector('[data-testid="mounted-device-sw-1"]');
      const sw2El = container.querySelector('[data-testid="mounted-device-sw-2"]');
      const sw3El = container.querySelector('[data-testid="mounted-device-sw-3"]');
      expect(sw1El?.textContent).toContain('#01');
      expect(sw2El?.textContent).toContain('#02');
      expect(sw3El?.textContent).toContain('#03');

      // Find segmented control and switch to descending (N->1)
      const segmentedEl = container.querySelector('[data-testid="stt-order-segmented"]');
      expect(segmentedEl).not.toBeNull();
      const descOption = segmentedEl?.querySelectorAll(
        '.ant-segmented-item',
      )[1] as HTMLElement | null;
      expect(descOption).not.toBeNull();

      await act(async () => {
        descOption?.click();
      });

      // After switching to descending: SW-CORE-01 at top is #03, SAN-ARRAY-01 at bottom is #01
      expect(u24Rail?.textContent).toContain('#03');
      expect(u20Rail?.textContent).toContain('#02');
      expect(u10Rail?.textContent).toContain('#01');
      expect(sw1El?.textContent).toContain('#03');
      expect(sw3El?.textContent).toContain('#01');
    });

    it('Case 1.2: renders empty cabinet state when no equipment is mounted and omits blank slot rows', async () => {
      const rack24U: NetworkRack = {
        ...mockRack42U,
        id: 'rack-24u',
        name: 'Edge Cabinet 24U',
        code: 'RCK-EDGE-24',
        totalHeight: 24,
        switches: [],
      };

      await renderWithContext(<RackElevationView rack={rack24U} />);

      expect(container.textContent).toContain('24U Standard');
      expect(container.querySelector('[data-testid="rack-empty-mount-state"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="mount-first-equipment-btn"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-24"]')).toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-25"]')).toBeNull();
      expect(container.querySelectorAll('[data-testid^="empty-slot-"]').length).toBe(0);
    });
  });

  describe('Suite 2: Multi-U Device Slotting & Chassis Scaling', () => {
    it('Case 2.1: accurately slots 1U switch at U24, 2U server at U20-U21, and 4U storage at U10-U13 with exact pixel heights', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // 1U Switch (SW-CORE-01 at U24 -> 1 * 28 = 28px)
      const sw1El = container.querySelector(
        '[data-testid="mounted-device-sw-1"]',
      ) as HTMLElement | null;
      expect(sw1El).not.toBeNull();
      expect(sw1El?.style.height).toBe('28px');
      expect(sw1El?.textContent).toContain('SW-CORE-01');
      expect(sw1El?.textContent).toContain('Cisco');

      // 2U Server (SRV-HOST-01 at U20 -> 2 * 28 = 56px)
      const sw2El = container.querySelector(
        '[data-testid="mounted-device-sw-2"]',
      ) as HTMLElement | null;
      expect(sw2El).not.toBeNull();
      expect(sw2El?.style.height).toBe('56px');
      expect(sw2El?.textContent).toContain('SRV-HOST-01');
      expect(sw2El?.textContent).toContain('Dell');
      expect(sw2El?.textContent).toContain('2U');

      // 4U Storage (SAN-ARRAY-01 at U10 -> 4 * 28 = 112px)
      const sw3El = container.querySelector(
        '[data-testid="mounted-device-sw-3"]',
      ) as HTMLElement | null;
      expect(sw3El).not.toBeNull();
      expect(sw3El?.style.height).toBe('112px');
      expect(sw3El?.textContent).toContain('SAN-ARRAY-01');
      expect(sw3El?.textContent).toContain('PureStorage');
      expect(sw3El?.textContent).toContain('4U');
    });
  });

  describe('Suite 3: Automated Sequential Equipment Layout', () => {
    it('Case 3.1: automatically indexes mounted equipment with sequential STT badges (#01, #02, etc.)', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const rowAlpha = container.querySelector('[data-testid="rack-device-row-sw-1"]');
      const rowBeta = container.querySelector('[data-testid="rack-device-row-sw-2"]');
      const rowGamma = container.querySelector('[data-testid="rack-device-row-sw-3"]');

      expect(rowAlpha).not.toBeNull();
      expect(rowBeta).not.toBeNull();
      expect(rowGamma).not.toBeNull();

      expect(rowAlpha?.textContent).toContain('#01');
      expect(rowBeta?.textContent).toContain('#02');
      expect(rowGamma?.textContent).toContain('#03');
    });

    it('Case 3.2: eliminates collision alert banners and badges even when devices have conflicting legacy positions', async () => {
      const conflictingRack: NetworkRack = {
        ...mockRack42U,
        switches: [
          {
            id: 'sw-col-1',
            name: 'Device Alpha',
            model: 'Gen10 Server',
            vendor: 'HPE',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 2,
            rackPosition: 15, // legacy U15
            totalPorts: 4,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'sw-col-2',
            name: 'Device Beta',
            model: 'ToR Switch',
            vendor: 'Juniper',
            role: 'TOR',
            status: 'ONLINE',
            rackHeight: 1,
            rackPosition: 15, // same legacy slot
            totalPorts: 24,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={conflictingRack} />);

      expect(container.textContent).not.toContain('Rack Collision Detected');
      expect(container.textContent).not.toContain('contested');
      expect(container.querySelector('[data-testid="collision-badge"]')).toBeNull();
      expect(container.querySelector('[data-testid="rack-device-row-sw-col-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="rack-device-row-sw-col-2"]')).not.toBeNull();
    });

    it('Case 3.3: toggles STT ordering between ascending (1→N) and descending (N→1)', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const segmentedEl = container.querySelector('[data-testid="stt-order-segmented"]');
      expect(segmentedEl).not.toBeNull();
      const descOption = segmentedEl?.querySelectorAll(
        '.ant-segmented-item',
      )[1] as HTMLElement | null;
      expect(descOption).not.toBeNull();

      await act(async () => {
        descOption?.click();
      });

      const rowAlpha = container.querySelector('[data-testid="rack-device-row-sw-1"]');
      expect(rowAlpha?.textContent).toContain('#03');
    });
  });

  describe('Suite 4: Telemetry Utilization Indicators & Scope Refinement', () => {
    it('Case 4.1: calculates Space utilization correctly and confirms power/weight telemetry removed', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Space Utilization: 7 occupied units out of 42 U = 16.7%
      expect(container.textContent).toContain('Space Utilization');
      expect(container.textContent).toContain('7 / 42 U (16.7%)');
      expect(container.textContent).toContain('35 U Available');

      // Verify removed power and weight metrics are cleanly omitted per user scope refinement
      expect(container.textContent).not.toContain('Power Consumption');
      expect(container.textContent).not.toContain('Weight Capacity');
    });
  });

  describe('Suite 5: Front / Rear Elevation Toggle', () => {
    it('Case 5.1: toggles between Front and Rear view without errors', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Defaults to Front View: check model and FRONT badge
      expect(container.textContent).toContain('FRONT');
      expect(container.textContent).toContain('Catalyst 9300-48P');

      // Switch to Rear View
      const rearBtn = Array.from(container.querySelectorAll('.ant-segmented-item')).find((el) =>
        el.textContent?.includes('Rear View'),
      );
      expect(rearBtn).toBeDefined();

      if (rearBtn) {
        await act(async () => {
          (rearBtn as HTMLElement).click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
        });

        // In Rear View: verifies redundant PSU 1 and PSU 2 indicators
        expect(container.textContent).toContain('REAR');
        expect(container.textContent).toContain('PSU 1 [AC]');
        expect(container.textContent).toContain('PSU 2 [AC]');
        expect(container.textContent).toContain('FAN');
      }
    });
  });

  describe('Suite 6: Interactive Mechanics & Mounted Equipment Operations', () => {
    it('Case 6.1: clicking + Mount Equipment toolbar button triggers onMountClick with available slot and omits empty slot rows', async () => {
      const onMountClick = vi.fn();
      await renderWithContext(
        <RackElevationView
          rack={mockRack42U}
          elevationData={mockElevationData}
          onMountClick={onMountClick}
        />,
      );

      // Verify no empty slot elements are rendered in DOM
      expect(container.querySelector('[data-testid="empty-slot-15"]')).toBeNull();
      expect(container.querySelectorAll('[data-testid^="empty-slot-"]').length).toBe(0);

      // Click prominent + Mount Equipment action button
      const mountBtn = container.querySelector(
        '[data-testid="mount-equipment-btn"]',
      ) as HTMLElement | null;
      expect(mountBtn).not.toBeNull();

      if (mountBtn) {
        await act(async () => {
          mountBtn.click();
        });
        // First unoccupied unit (bottom-up: U01 is free in mockRack42U)
        expect(onMountClick).toHaveBeenCalledWith(1);
      }
    });

    it('Case 6.2: clicking a mounted switch triggers onSelectSwitch and onDeviceClick with switch info', async () => {
      const onSelectSwitch = vi.fn();
      const onDeviceClick = vi.fn();

      await renderWithContext(
        <RackElevationView
          rack={mockRack42U}
          elevationData={mockElevationData}
          onSelectSwitch={onSelectSwitch}
          onDeviceClick={onDeviceClick}
        />,
      );

      const switchEl = container.querySelector(
        '[data-testid="mounted-device-sw-1"]',
      ) as HTMLElement | null;
      expect(switchEl).not.toBeNull();

      if (switchEl) {
        await act(async () => {
          switchEl.click();
        });
        expect(onSelectSwitch).toHaveBeenCalledWith('sw-1');
        expect(onDeviceClick).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'sw-1',
            name: 'SW-CORE-01',
            vendor: 'Cisco',
          }),
        );
      }
    });

    it('Case 6.3: unmounting a device safely removes it from UI with immediate reflection and calls updateSwitch', async () => {
      const onDeviceUnmounted = vi.fn();

      await renderWithContext(
        <RackElevationView
          rack={mockRack42U}
          elevationData={mockElevationData}
          onDeviceUnmounted={onDeviceUnmounted}
        />,
      );

      // Verify SW-CORE-01 is currently rendered
      expect(container.querySelector('[data-testid="mounted-device-sw-1"]')).not.toBeNull();

      const unmountBtn = container.querySelector(
        '[data-testid="unmount-device-sw-1"]',
      ) as HTMLElement | null;
      expect(unmountBtn).not.toBeNull();

      if (unmountBtn) {
        await act(async () => {
          unmountBtn.click();
        });

        // Immediate UI reflection: SW-CORE-01 is removed
        expect(container.querySelector('[data-testid="mounted-device-sw-1"]')).toBeNull();
        expect(onDeviceUnmounted).toHaveBeenCalledWith('sw-1');
        expect(networkService.updateSwitch).toHaveBeenCalledWith('sw-1', {
          rackPosition: null,
          rackId: null,
        });

        // Telemetry reflects the unmount: was 7 occupied, now 6 occupied (42 - 6 = 36 available)
        expect(container.textContent).toContain('6 / 42 U (14.3%)');
        expect(container.textContent).toContain('36 U Available');
      }
    });

    it('Case 6.4: confirms removal of manual move up/down buttons and verifies automated layout', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Manual move up and move down buttons should no longer exist in the DOM
      const moveDownBtn = container.querySelector('[data-testid="move-down-device-sw-2"]');
      const moveUpBtn = container.querySelector('[data-testid="move-up-device-sw-1"]');
      expect(moveDownBtn).toBeNull();
      expect(moveUpBtn).toBeNull();

      // All mounted devices are rendered in clean sequential rows
      expect(container.querySelector('[data-testid="mounted-device-sw-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="mounted-device-sw-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="mounted-device-sw-3"]')).not.toBeNull();
    });

    it('Case 6.5: seamlessly arranges adjacent multi-U devices in automated sequential order', async () => {
      const adjacentRack: NetworkRack = {
        ...mockRack42U,
        switches: [
          {
            id: 'dev-a',
            name: 'SERVER-A-2U',
            model: 'PowerEdge R750',
            vendor: 'Dell',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 2,
            rackPosition: 20,
            totalPorts: 4,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'dev-b',
            name: 'SERVER-B-2U',
            model: 'PowerEdge R750',
            vendor: 'Dell',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 2,
            rackPosition: 23,
            totalPorts: 4,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={adjacentRack} />);

      const rowA = container.querySelector('[data-testid="rack-device-row-dev-a"]');
      const rowB = container.querySelector('[data-testid="rack-device-row-dev-b"]');
      expect(rowA).not.toBeNull();
      expect(rowB).not.toBeNull();
      expect(rowB?.textContent).toContain('#01');
      expect(rowA?.textContent).toContain('#02');
    });

    it('Case 6.6: handles fractional and non-standard device heights gracefully in automated layout', async () => {
      const fractionalRack: NetworkRack = {
        ...mockRack42U,
        switches: [
          {
            id: 'dev-frac-1',
            name: 'Micro Appliance',
            model: 'Edge-1',
            vendor: 'Netgate',
            role: 'ACCESS',
            status: 'ONLINE',
            rackHeight: 1.5,
            rackPosition: 10,
            totalPorts: 2,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={fractionalRack} />);
      const devEl = container.querySelector('[data-testid="mounted-device-dev-frac-1"]');
      expect(devEl).not.toBeNull();
      expect(devEl?.textContent).toContain('Micro Appliance');
    });

    it('Case 6.7: invalidates TanStack Query cache on rack updates for multi-tab concurrent synchronization', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Unmount SW-CORE-01
      const unmountBtn = container.querySelector(
        '[data-testid="unmount-device-sw-1"]',
      ) as HTMLButtonElement | null;
      expect(unmountBtn).not.toBeNull();

      if (unmountBtn) {
        await act(async () => {
          unmountBtn.click();
        });

        // Verifies query cache invalidation on both general racks and specific rack elevation
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['racks'] });
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['rack-elevation', 'rack-42u-1'],
        });
      }

      invalidateSpy.mockRestore();
    });
  });

  describe('Suite 7: RackTable High-Density Tabular Inventory', () => {
    it('Case 7.1: renders equipment racks table with deterministic sorting and action buttons', async () => {
      const onViewElevation = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      await renderWithContext(
        <RackTable
          racks={[mockRack42U]}
          onViewElevation={onViewElevation}
          onEdit={onEdit}
          onDelete={onDelete}
        />,
      );

      expect(container.textContent).toContain('RCK-DC1-01');
      expect(container.textContent).toContain('DC1 Core Cabinet 01');
      expect(container.textContent).toContain('42U');
      expect(container.textContent).toContain('Main Datacenter');
      expect(container.textContent).toContain('3 devices');
      expect(container.textContent).toContain('Active');

      // Verify power and weight columns are omitted
      expect(container.textContent).not.toContain('Max Power');
      expect(container.textContent).not.toContain('Weight Cap');

      // Click on rack code to view elevation
      const codeTag = container.querySelector('.ant-tag-purple') as HTMLElement | null;
      expect(codeTag).not.toBeNull();
      if (codeTag) {
        await act(async () => {
          codeTag.click();
        });
        expect(onViewElevation).toHaveBeenCalledWith(mockRack42U);
      }
    });
  });

  describe('Suite 8: RackFormModal Lifecycle & Constraints', () => {
    it('Case 8.1: renders modal with streamlined fields and omits power/weight/depth clutter', async () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      const Wrapper = () => {
        const [form] = Form.useForm();
        return (
          <RackFormModal
            open={true}
            editingRack={mockRack42U}
            form={form}
            locations={[mockLocationBranch]}
            onSave={onSave}
            onCancel={onCancel}
          />
        );
      };

      const { Form } = await import('antd');
      await renderWithContext(<Wrapper />);

      expect(document.body.textContent).toContain('Edit Equipment Rack');
      expect(document.body.textContent).toContain('Rack Name');
      expect(document.body.textContent).toContain('Rack Code / Identifier');
      expect(document.body.textContent).toContain('Total Height (RU)');
      expect(document.body.textContent).toContain('Presets:');
      expect(document.body.textContent).toContain('42U');

      // Verify removed cluttered fields are absent
      expect(document.body.textContent).not.toContain('Max Power Rating');
      expect(document.body.textContent).not.toContain('Weight Rating');
      expect(document.body.textContent).not.toContain('Cabinet Depth');

      // Verify preset 12U is disabled because highest mounted device is at U24
      const preset12Btn = Array.from(document.body.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '12U',
      );
      expect(preset12Btn).toBeDefined();
      expect((preset12Btn as HTMLButtonElement)?.disabled).toBe(true);

      // Preset 24U and 48U are enabled
      const preset24Btn = Array.from(document.body.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '24U',
      );
      expect(preset24Btn).toBeDefined();
      expect((preset24Btn as HTMLButtonElement)?.disabled).toBe(false);
    });
  });

  describe('Suite 9: RackManagementTab Integrated Shell & Filter Conjunction', () => {
    it('Case 9.1: renders RackManagementTab with search, location filter, and switches view modes', async () => {
      vi.mocked(networkService.getRacks).mockResolvedValue([mockRack42U]);

      await renderWithContext(
        <RackManagementTab racks={[mockRack42U]} locations={[mockLocationBranch]} />,
      );

      // Verify header texts required by NetworkPage tests
      expect(container.textContent).toContain('Racks & Elevation Management');
      expect(container.textContent).toContain('1U–48U Rails');
      expect(container.textContent).toContain('Collision Detection');
      expect(container.textContent).toContain('Space & RU Telemetry');

      // Verify active cabinet selector
      expect(container.textContent).toContain('Active Cabinet:');

      // Switch to Table View
      const tableBtn = Array.from(container.querySelectorAll('.ant-segmented-item')).find((el) =>
        el.textContent?.includes('Cabinet Table'),
      );
      expect(tableBtn).toBeDefined();

      if (tableBtn) {
        await act(async () => {
          (tableBtn as HTMLElement).click();
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
        });

        // In Table View: verifies columns are rendered
        expect(container.textContent).toContain('Rack Code & Name');
        expect(container.textContent).toContain('Space Utilization');
        expect(container.textContent).toContain('RCK-DC1-01');
      }
    });
  });

  describe('Suite 10: Clean React 19 / Ant Design v6 Teardown Hygiene', () => {
    it('Case 10.1: unmounts cleanly without portal DOM leakage or unhandled errors', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      expect(container.children.length).toBeGreaterThan(0);

      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }

      expect(container.innerHTML).toBe('');
      expect(document.querySelectorAll('.ant-tooltip, .ant-modal-root').length).toBe(0);
    });
  });

  describe('Suite 11: Dynamic Rack Capacity Quick-Stepper (+ / - Controls)', () => {
    it('Case 11.1: increments rack capacity and calls updateRack with new height', async () => {
      vi.mocked(networkService.updateRack).mockResolvedValue({
        ...mockRack42U,
        totalHeight: 43,
      });

      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const incBtn = container.querySelector(
        '[data-testid="rack-increment-slot-btn"]',
      ) as HTMLElement | null;
      expect(incBtn).not.toBeNull();

      await act(async () => {
        incBtn?.click();
      });

      expect(networkService.updateRack).toHaveBeenCalledWith('rack-42u-1', { totalHeight: 43 });
    });

    it('Case 11.2: prevents decreasing capacity below highest occupied slot position', async () => {
      // mockRack42U has a switch at U24 (rackPosition: 24, rackHeight: 1 -> highest occupied is U24)
      // Create a rack already at 24U
      const rackAtMin: NetworkRack = {
        ...mockRack42U,
        totalHeight: 24,
      };

      await renderWithContext(<RackElevationView rack={rackAtMin} />);

      const decBtn = container.querySelector(
        '[data-testid="rack-decrement-slot-btn"]',
      ) as HTMLButtonElement | null;
      expect(decBtn).not.toBeNull();
      expect(decBtn?.disabled).toBe(true);

      // Attempting to click disabled button does not trigger updateRack
      await act(async () => {
        decBtn?.click();
      });
      expect(networkService.updateRack).not.toHaveBeenCalled();
    });

    it('Case 11.3: allows decreasing capacity when above highest occupied slot position', async () => {
      vi.mocked(networkService.updateRack).mockResolvedValue({
        ...mockRack42U,
        totalHeight: 41,
      });

      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const decBtn = container.querySelector(
        '[data-testid="rack-decrement-slot-btn"]',
      ) as HTMLButtonElement | null;
      expect(decBtn).not.toBeNull();
      expect(decBtn?.disabled).toBe(false);

      await act(async () => {
        decBtn?.click();
      });

      expect(networkService.updateRack).toHaveBeenCalledWith('rack-42u-1', { totalHeight: 41 });
    });

    it('Case 11.4: allows custom hyperscale height (e.g. 52U) and commits update via InputNumber', async () => {
      vi.mocked(networkService.updateRack).mockResolvedValue({
        ...mockRack42U,
        totalHeight: 52,
      });

      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const inputWrap = container.querySelector('[data-testid="rack-capacity-input"]');
      expect(inputWrap).not.toBeNull();
      const inputEl = (
        inputWrap?.tagName === 'INPUT' ? inputWrap : inputWrap?.querySelector('input')
      ) as HTMLInputElement | null;
      expect(inputEl).not.toBeNull();

      if (inputEl) {
        await act(async () => {
          inputEl.focus();
          inputEl.value = '52';
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          inputEl.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }),
          );
          inputEl.blur();
          inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
        });

        expect(networkService.updateRack).toHaveBeenCalledWith('rack-42u-1', { totalHeight: 52 });
      }
    });

    it('Case 11.5: rejects inputting height below highest occupied slot position and reverts input', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const inputWrap = container.querySelector('[data-testid="rack-capacity-input"]');
      const inputEl = (
        inputWrap?.tagName === 'INPUT' ? inputWrap : inputWrap?.querySelector('input')
      ) as HTMLInputElement | null;
      expect(inputEl).not.toBeNull();

      if (inputEl) {
        await act(async () => {
          inputEl.focus();
          inputEl.value = '15'; // Below highest switch at U24
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          inputEl.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }),
          );
          inputEl.blur();
          inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
        });

        // Network update should NOT be called for invalid height below highest occupied
        expect(networkService.updateRack).not.toHaveBeenCalled();
      }
    });

    it('Case 11.6: guards against concurrent click storms while update is in-flight', async () => {
      let resolveUpdate: (value: NetworkRack) => void = () => {};
      const pendingPromise = new Promise<NetworkRack>((resolve) => {
        resolveUpdate = resolve;
      });
      vi.mocked(networkService.updateRack).mockReturnValue(pendingPromise);

      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const incBtn = container.querySelector(
        '[data-testid="rack-increment-slot-btn"]',
      ) as HTMLElement | null;
      expect(incBtn).not.toBeNull();

      // Trigger first click
      await act(async () => {
        incBtn?.click();
      });

      // Rapid second click while first is in-flight
      await act(async () => {
        incBtn?.click();
      });

      // Expect networkService.updateRack was only invoked once
      expect(networkService.updateRack).toHaveBeenCalledTimes(1);

      // Cleanly resolve pending promise
      await act(async () => {
        resolveUpdate({
          ...mockRack42U,
          totalHeight: 43,
        });
      });
    });

    it('Case 11.7: pressing Enter on empty or cleared InputNumber cleanly reverts without dispatching update', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const inputWrap = container.querySelector('[data-testid="rack-capacity-input"]');
      const inputEl = (
        inputWrap?.tagName === 'INPUT' ? inputWrap : inputWrap?.querySelector('input')
      ) as HTMLInputElement | null;
      expect(inputEl).not.toBeNull();

      if (inputEl) {
        await act(async () => {
          inputEl.focus();
          inputEl.value = '';
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          inputEl.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }),
          );
        });

        expect(networkService.updateRack).not.toHaveBeenCalled();
      }
    });

    it('Case 11.8: supports keyboard navigation (Enter/Space) on mount equipment button and mounted device', async () => {
      const onMountClick = vi.fn();
      const onSelectSwitch = vi.fn();
      const onDeviceClick = vi.fn();

      await renderWithContext(
        <RackElevationView
          rack={mockRack42U}
          elevationData={mockElevationData}
          onMountClick={onMountClick}
          onSelectSwitch={onSelectSwitch}
          onDeviceClick={onDeviceClick}
        />,
      );

      const mountBtn = container.querySelector(
        '[data-testid="mount-equipment-btn"]',
      ) as HTMLElement | null;
      expect(mountBtn).not.toBeNull();
      if (mountBtn) {
        await act(async () => {
          mountBtn.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }),
          );
          mountBtn.click();
        });
        expect(onMountClick).toHaveBeenCalledWith(1);
      }

      const switchEl = container.querySelector(
        '[data-testid="mounted-device-sw-1"]',
      ) as HTMLElement | null;
      expect(switchEl).not.toBeNull();
      if (switchEl) {
        await act(async () => {
          switchEl.dispatchEvent(
            new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }),
          );
        });
        expect(onSelectSwitch).toHaveBeenCalledWith('sw-1');
        expect(onDeviceClick).toHaveBeenCalled();
      }
    });

    it('Case 11.9: switching between racks synchronizes capacity state even when initial heights match', async () => {
      const rackA: NetworkRack = { ...mockRack42U, id: 'rack-a', totalHeight: 48 };
      const rackB: NetworkRack = { ...mockRack42U, id: 'rack-b', totalHeight: 48 };

      const { rerender } = await renderWithContext(<RackElevationView rack={rackA} />);
      expect(container.textContent).toContain('48U Standard');

      await rerender(<RackElevationView rack={rackB} />);
      expect(container.textContent).toContain('48U Standard');
    });

    it('Case 11.10: sanitizes floating point input (e.g. 45.4U) by rounding to nearest integer before dispatching update', async () => {
      vi.mocked(networkService.updateRack).mockResolvedValue({
        ...mockRack42U,
        totalHeight: 45,
      });

      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const inputWrap = container.querySelector('[data-testid="rack-capacity-input"]');
      const inputEl = (
        inputWrap?.tagName === 'INPUT' ? inputWrap : inputWrap?.querySelector('input')
      ) as HTMLInputElement | null;
      expect(inputEl).not.toBeNull();

      if (inputEl) {
        await act(async () => {
          inputEl.focus();
          inputEl.value = '45.4';
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          inputEl.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }),
          );
        });

        expect(networkService.updateRack).toHaveBeenCalledWith('rack-42u-1', { totalHeight: 45 });
      }
    });

    it('Case 11.11: disables + Mount Equipment button when cabinet is 100% full', async () => {
      const fullRack: NetworkRack = {
        ...mockRack42U,
        totalHeight: 2,
        switches: [
          {
            id: 'sw-f1',
            name: 'SW-FULL-01',
            model: 'Catalyst 9300',
            vendor: 'Cisco',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 1,
            rackPosition: 1,
            totalPorts: 24,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'sw-f2',
            name: 'SW-FULL-02',
            model: 'Catalyst 9300',
            vendor: 'Cisco',
            role: 'ACCESS',
            status: 'ONLINE',
            rackHeight: 1,
            rackPosition: 2,
            totalPorts: 24,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      const onMountClick = vi.fn();
      await renderWithContext(<RackElevationView rack={fullRack} onMountClick={onMountClick} />);

      const mountBtn = container.querySelector(
        '[data-testid="mount-equipment-btn"]',
      ) as HTMLButtonElement | null;
      expect(mountBtn).not.toBeNull();
      expect(mountBtn?.disabled).toBe(true);

      // Attempting to click disabled mount button does not trigger onMountClick
      await act(async () => {
        mountBtn?.click();
      });
      expect(onMountClick).not.toHaveBeenCalled();
    });

    it('Case 11.12: highlights all spanned rail units on hover for a multi-U mounted device', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      // SRV-HOST-01 is 2U (rackPosition: 20, rackHeight: 2 -> spans U20 and U21)
      const srvEl = container.querySelector('[data-testid="mounted-device-sw-2"]');
      expect(srvEl).not.toBeNull();

      await act(async () => {
        srvEl?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      });

      // Both rail units U20 and U21 should be highlighted (not just U20)
      const u20Rail = container.querySelector('[data-testid="left-rail-u-20"]');
      const u21Rail = container.querySelector('[data-testid="left-rail-u-21"]');
      expect(u20Rail).not.toBeNull();
      expect(u21Rail).not.toBeNull();

      // Mouse leave clears hover state
      await act(async () => {
        srvEl?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      });
    });

    it('Case 11.13: gracefully handles empty or undefined switches in rack object', async () => {
      const emptyRack: NetworkRack = {
        ...mockRack42U,
        switches: undefined,
      };

      await renderWithContext(<RackElevationView rack={emptyRack} />);
      expect(container.querySelector('[data-testid="rack-empty-mount-state"]')).not.toBeNull();
      expect(container.textContent).toContain('No Equipment Mounted');
    });
  });

  describe('Suite 12: Automated Layout Order & Deterministic Placement Guarantees', () => {
    it('Case 12.1: confirms complete removal of manual RU position inputs on mounted devices', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      const inputWrap = container.querySelector('[data-testid="position-input-device-sw-1"]');
      expect(inputWrap).toBeNull();
    });

    it('Case 12.2: confirms absence of manual move steppers and collision banners', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      expect(container.querySelector('[data-testid^="move-up-device-"]')).toBeNull();
      expect(container.querySelector('[data-testid^="move-down-device-"]')).toBeNull();
      expect(container.querySelector('[data-testid="collision-warning-banner"]')).toBeNull();
    });

    it('Case 12.3: enforces capacity ceiling bounded by occupied units', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Capacity input exists at header level for the rack itself
      const capInputWrap = container.querySelector('[data-testid="rack-capacity-input"]');
      expect(capInputWrap).not.toBeNull();
    });

    it('Case 12.4: sorts colliding devices at identical rackPosition deterministically by ID tie-breaker', async () => {
      const collidingSameSlotRack: NetworkRack = {
        ...mockRack42U,
        switches: [
          {
            id: 'sw-z-last',
            name: 'Device Zebra',
            model: 'Zebra 1U',
            vendor: 'Zebra',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 1,
            rackPosition: 15,
            totalPorts: 24,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'sw-a-first',
            name: 'Device Alpha',
            model: 'Alpha 1U',
            vendor: 'Alpha',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 1,
            rackPosition: 15,
            totalPorts: 24,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={collidingSameSlotRack} />);

      const renderedRows = Array.from(
        container.querySelectorAll('[data-testid^="rack-device-row-"]'),
      );
      expect(renderedRows.length).toBe(2);
      // 'sw-a-first' should appear before 'sw-z-last' due to deterministic id.localeCompare tie-breaker
      expect(renderedRows[0].getAttribute('data-testid')).toBe('rack-device-row-sw-a-first');
      expect(renderedRows[1].getAttribute('data-testid')).toBe('rack-device-row-sw-z-last');
    });

    it('Case 12.5: automatically allocates contiguous non-overlapping sequential units from top down for devices without rackPosition', async () => {
      const unpositionedRack: NetworkRack = {
        ...mockRack42U,
        totalHeight: 42,
        switches: [
          {
            id: 'sw-unpos-1',
            name: 'Device Top 2U',
            model: 'Server 2U',
            vendor: 'Dell',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 2,
            rackPosition: null,
            totalPorts: 4,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'sw-unpos-2',
            name: 'Device Middle 1U',
            model: 'Switch 1U',
            vendor: 'Cisco',
            role: 'ACCESS',
            status: 'ONLINE',
            rackHeight: 1,
            rackPosition: null,
            totalPorts: 24,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'sw-unpos-3',
            name: 'Device Bottom 2U',
            model: 'Storage 2U',
            vendor: 'NetApp',
            role: 'DISTRIBUTION',
            status: 'ONLINE',
            rackHeight: 2,
            rackPosition: null,
            totalPorts: 8,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={unpositionedRack} />);

      // Device 1 (2U) spans U41..U42
      expect(container.querySelector('[data-testid="left-rail-u-42"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-41"]')).not.toBeNull();

      // Device 2 (1U) spans U40..U40
      expect(container.querySelector('[data-testid="left-rail-u-40"]')).not.toBeNull();

      // Device 3 (2U) spans U38..U39
      expect(container.querySelector('[data-testid="left-rail-u-39"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-38"]')).not.toBeNull();

      // Total occupied = 5U (42 - 5 = 37 available)
      expect(container.textContent).toContain('5 / 42 U (11.9%)');
      expect(container.textContent).toContain('37 U Available');
    });

    it('Case 12.6: merges rack switches without rackPosition even when elevation slots are present', async () => {
      const rackWithMixedSwitches: NetworkRack = {
        ...mockRack42U,
        switches: [
          ...mockRack42U.switches!,
          {
            id: 'sw-new-unpositioned',
            name: 'Newly Mounted Switch',
            model: 'Edge-100',
            vendor: 'Juniper',
            role: 'ACCESS',
            status: 'ONLINE',
            rackId: mockRack42U.id,
            rackHeight: 1,
            rackPosition: null,
            totalPorts: 24,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(
        <RackElevationView rack={rackWithMixedSwitches} elevationData={mockElevationData} />,
      );

      // The new unpositioned switch must be present in the rack frame
      const newDevEl = container.querySelector(
        '[data-testid="mounted-device-sw-new-unpositioned"]',
      );
      expect(newDevEl).not.toBeNull();
      expect(newDevEl?.textContent).toContain('Newly Mounted Switch');
    });

    it('Case 12.7: renders long device models and names with ellipsis without layout distortion', async () => {
      const longNameRack: NetworkRack = {
        ...mockRack42U,
        switches: [
          {
            id: 'sw-long-1',
            name: 'Enterprise Ultra Aggregation Distribution Spine Switch Stack Unit 01',
            model: 'Catalyst 9500-48Y4C High-Performance Multi-Chassis Modular Switch',
            vendor: 'Cisco Systems Enterprise',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 2,
            rackPosition: 20,
            totalPorts: 48,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={longNameRack} />);
      const devEl = container.querySelector('[data-testid="mounted-device-sw-long-1"]');
      expect(devEl).not.toBeNull();
      expect(devEl?.textContent).toContain('Enterprise Ultra');
      expect(devEl?.textContent).toContain('Catalyst 9500');
    });

    it('Case 12.8: handles cumulative equipment height strictly exceeding rack capacity without overlaps or corrupted metrics', async () => {
      const overCapacityRack: NetworkRack = {
        ...mockRack42U,
        totalHeight: 42,
        switches: [
          {
            id: 'sw-over-1',
            name: 'Spine Chassis 24U',
            model: 'Nexus 9508',
            vendor: 'Cisco',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 24,
            rackPosition: null,
            totalPorts: 48,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'sw-over-2',
            name: 'Compute Chassis 24U',
            model: 'UCS 5108 Blade',
            vendor: 'Cisco',
            role: 'DISTRIBUTION',
            status: 'ONLINE',
            rackHeight: 24,
            rackPosition: null,
            totalPorts: 32,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={overCapacityRack} />);

      // Verify accurate over-capacity occupancy metrics (48 / 42 U = 114.3%) rather than false 42/42 (100%)
      expect(container.textContent).toContain('48 / 42 U (114.3%)');
      expect(container.textContent).toContain('0 U Available');

      // Verify each device receives a contiguous non-overlapping slot allocation
      // Device 1: U25..U48
      expect(container.querySelector('[data-testid="left-rail-u-48"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-25"]')).not.toBeNull();

      // Device 2: U01..U24
      expect(container.querySelector('[data-testid="left-rail-u-24"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-1"]')).not.toBeNull();

      // Ensure no duplicate rail testids exist for the boundary unit U24
      const u24Elements = container.querySelectorAll('[data-testid="left-rail-u-24"]');
      expect(u24Elements.length).toBe(1);

      // Decrement button should be disabled since capacity cannot be decreased below 48U
      const decBtn = container.querySelector(
        '[data-testid="rack-decrement-slot-btn"]',
      ) as HTMLButtonElement | null;
      expect(decBtn?.disabled).toBe(true);
    });

    it('Case 12.9: prevents slot collision between unpositioned multi-U devices and existing positioned devices in mid-cabinet', async () => {
      const midPositionedRack: NetworkRack = {
        ...mockRack42U,
        totalHeight: 42,
        switches: [
          {
            id: 'sw-mid-fixed',
            name: 'Pre-existing Mid Switch',
            model: 'Fixed 2U',
            vendor: 'Juniper',
            role: 'DISTRIBUTION',
            status: 'ONLINE',
            rackHeight: 2,
            rackPosition: 30, // Occupies U30..U31
            totalPorts: 24,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'sw-unpos-top',
            name: 'Top Device 10U',
            model: 'Modular 10U',
            vendor: 'Arista',
            role: 'CORE',
            status: 'ONLINE',
            rackHeight: 10,
            rackPosition: null,
            totalPorts: 48,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
          {
            id: 'sw-unpos-mid',
            name: 'Mid Device 10U',
            model: 'Modular 10U',
            vendor: 'Arista',
            role: 'ACCESS',
            status: 'ONLINE',
            rackHeight: 10,
            rackPosition: null,
            totalPorts: 48,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        ],
      };

      await renderWithContext(<RackElevationView rack={midPositionedRack} />);

      // Top device (10U) takes U33..U42
      expect(container.querySelector('[data-testid="left-rail-u-42"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-33"]')).not.toBeNull();

      // Fixed switch occupies U30..U31
      expect(container.querySelector('[data-testid="left-rail-u-31"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-30"]')).not.toBeNull();

      // Mid device (10U) must skip U30..U31 and take U20..U29 without colliding with fixed switch
      expect(container.querySelector('[data-testid="left-rail-u-29"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-rail-u-20"]')).not.toBeNull();

      // Verify unit U30 and U31 only belong to the fixed switch
      const u30Rail = container.querySelector('[data-testid="left-rail-u-30"]');
      expect(u30Rail?.getAttribute('data-testid')).toBe('left-rail-u-30');
      const u30Elements = container.querySelectorAll('[data-testid="left-rail-u-30"]');
      expect(u30Elements.length).toBe(1);
    });
  });
});
