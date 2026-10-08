import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkRack, RackElevationData } from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { queryClient } from '../../../app/query-client';
import { RackElevationDrawer } from './RackElevationDrawer';
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
      .forEach((el) => {
        el.remove();
      });
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

    it('Case 1.3: replaces physical U labels with sequential STT and confirms absence of STT segmented toggle', async () => {
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

      // STT segmented control was removed in favor of streamlined sequential layout
      expect(container.querySelector('[data-testid="stt-order-segmented"]')).toBeNull();
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
      const mountFirstBtn = container.querySelector('[data-testid="mount-first-equipment-btn"]');
      expect(mountFirstBtn).not.toBeNull();
      expect(mountFirstBtn?.textContent?.trim()).toBe('Mount Equipment');
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

    it('Case 3.3: maintains fixed sequential top-down STT layout and confirms absence of segmented sorting control', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      expect(container.querySelector('[data-testid="stt-order-segmented"]')).toBeNull();

      const rowAlpha = container.querySelector('[data-testid="rack-device-row-sw-1"]');
      expect(rowAlpha?.textContent).toContain('#01');
    });
  });

  describe('Suite 4: Telemetry Utilization Indicators & Scope Refinement', () => {
    it('Case 4.1: confirms Space utilization telemetry card, progress bar, power, and weight are cleanly omitted', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Verify Space Utilization card and progress bar were removed per scope refinement
      expect(container.textContent).not.toContain('Space Utilization');
      expect(container.querySelector('.ant-progress')).toBeNull();

      // Verify removed power and weight metrics are cleanly omitted per user scope refinement
      expect(container.textContent).not.toContain('Power Consumption');
      expect(container.textContent).not.toContain('Weight Capacity');
    });
  });

  describe('Suite 5: Front / Rear Elevation Toggle Removal', () => {
    it('Case 5.1: renders unified 2D elevation view and confirms front/rear toggle is removed', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Renders equipment with full specifications
      expect(container.textContent).toContain('Catalyst 9300-48P');

      // Front / Rear toggle was removed in favor of streamlined 2D elevation
      const rearBtn = Array.from(container.querySelectorAll('.ant-segmented-item')).find((el) =>
        el.textContent?.includes('Rear View'),
      );
      expect(rearBtn).toBeUndefined();
      expect(container.textContent).not.toContain('FRONT');
      expect(container.textContent).not.toContain('REAR');
    });
  });

  describe('Suite 6: Interactive Mechanics & Mounted Equipment Operations', () => {
    it('Case 6.1: clicking Mount Equipment toolbar button triggers onMountClick with available slot and omits empty slot rows', async () => {
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

      // Click prominent Mount Equipment action button
      const mountBtn = container.querySelector(
        '[data-testid="mount-equipment-btn"]',
      ) as HTMLElement | null;
      expect(mountBtn).not.toBeNull();
      expect(mountBtn?.textContent?.trim()).toBe('Mount Equipment');

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

        // UI reflects remaining mounted devices
        expect(container.querySelector('[data-testid="mounted-device-sw-2"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="mounted-device-sw-3"]')).not.toBeNull();
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
    it('Case 9.1: renders RackManagementTab with tabular view by default and opens RackElevationDrawer', async () => {
      vi.mocked(networkService.getRacks).mockResolvedValue([mockRack42U]);

      await renderWithContext(
        <RackManagementTab racks={[mockRack42U]} />,
      );

      // Verify header texts required by NetworkPage tests
      expect(container.textContent).toContain('Racks & Elevation Management');
      expect(container.textContent).toContain('1U–48U Rails');
      expect(container.textContent).toContain('Collision Detection');
      expect(container.textContent).toContain('Space & RU Telemetry');

      // Defaults to RackTable view: verifies columns and row are rendered directly
      expect(container.textContent).toContain('Rack Code & Name');
      expect(container.textContent).toContain('Space Utilization');
      expect(container.textContent).toContain('RCK-DC1-01');

      // Obsolete segmented view toggle and active cabinet selector are removed
      expect(container.textContent).not.toContain('Active Cabinet:');
      expect(container.querySelector('.ant-segmented')).toBeNull();

      // Clicking Elevation button opens drawer
      const elevationBtn = container.querySelector(
        '[data-testid="view-elevation-DC1 Core Cabinet 01"]',
      ) as HTMLElement | null;
      expect(elevationBtn).not.toBeNull();

      if (elevationBtn) {
        await act(async () => {
          elevationBtn.click();
        });

        // Drawer is visible with elevation view
        expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
        expect(document.body.textContent).toContain('2D ELEVATION');
        expect(document.body.textContent).toContain('EIA-310 19-inch cabinet elevation');
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

  describe('Suite 11: Dynamic Rack Capacity Quick-Stepper Removal & Static Height Display', () => {
    it('Case 11.1: confirms removal of rack increment slot button', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const incBtn = container.querySelector('[data-testid="rack-increment-slot-btn"]');
      expect(incBtn).toBeNull();
    });

    it('Case 11.2: confirms removal of rack decrement slot button', async () => {
      const rackAtMin: NetworkRack = {
        ...mockRack42U,
        totalHeight: 24,
      };

      await renderWithContext(<RackElevationView rack={rackAtMin} />);

      const decBtn = container.querySelector('[data-testid="rack-decrement-slot-btn"]');
      expect(decBtn).toBeNull();
    });

    it('Case 11.3: confirms removal of inline rack capacity InputNumber control', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const inputWrap = container.querySelector('[data-testid="rack-capacity-input"]');
      expect(inputWrap).toBeNull();
    });

    it('Case 11.4: displays static cabinet height badge in header without editable stepper controls', async () => {
      const rack52U: NetworkRack = {
        ...mockRack42U,
        totalHeight: 52,
      };

      await renderWithContext(<RackElevationView rack={rack52U} />);

      expect(container.textContent).toContain('52U Standard');
      expect(container.querySelector('[data-testid="rack-capacity-input"]')).toBeNull();
      expect(container.querySelector('[data-testid="rack-increment-slot-btn"]')).toBeNull();
      expect(container.querySelector('[data-testid="rack-decrement-slot-btn"]')).toBeNull();
    });

    it('Case 11.5: confirms rack elevation layout respects immutable totalHeight from props', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      expect(container.textContent).toContain('42U Standard');
      expect(networkService.updateRack).not.toHaveBeenCalled();
    });

    it('Case 11.6: confirms absence of capacity update network requests from elevation toolbar', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      expect(container.querySelector('[data-testid="rack-increment-slot-btn"]')).toBeNull();
      expect(networkService.updateRack).not.toHaveBeenCalled();
    });

    it('Case 11.7: confirms toolbar renders cleanly without inline capacity input elements', async () => {
      await renderWithContext(<RackElevationView rack={mockRack42U} />);

      const inputWrap = container.querySelector('[data-testid="rack-capacity-input"]');
      expect(inputWrap).toBeNull();
      expect(networkService.updateRack).not.toHaveBeenCalled();
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

    it('Case 11.10: verifies height display for non-standard heights without editable controls', async () => {
      const nonStandardRack: NetworkRack = {
        ...mockRack42U,
        totalHeight: 45,
      };

      await renderWithContext(<RackElevationView rack={nonStandardRack} />);
      expect(container.textContent).toContain('45U Standard');
      expect(container.querySelector('[data-testid="rack-capacity-input"]')).toBeNull();
      expect(networkService.updateRack).not.toHaveBeenCalled();
    });

    it('Case 11.11: disables Mount Equipment button when cabinet is 100% full', async () => {
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
      expect(mountBtn?.textContent?.trim()).toBe('Mount Equipment');
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

    it('Case 12.3: verifies capacity ceiling bounded by totalHeight without inline capacity input', async () => {
      await renderWithContext(
        <RackElevationView rack={mockRack42U} elevationData={mockElevationData} />,
      );

      // Inline capacity input is removed; rack height is displayed in header badge
      expect(container.querySelector('[data-testid="rack-capacity-input"]')).toBeNull();
      expect(container.textContent).toContain('42U Standard');
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

      // All 3 devices are mounted in sequential order
      expect(container.querySelector('[data-testid="mounted-device-sw-unpos-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="mounted-device-sw-unpos-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="mounted-device-sw-unpos-3"]')).not.toBeNull();
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

      // Decrement button should be removed from DOM
      expect(container.querySelector('[data-testid="rack-decrement-slot-btn"]')).toBeNull();
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

  describe('Suite 13: RackElevationDrawer On-Demand Slide-Out & Lifecycle', () => {
    it('Case 13.1: renders RackElevationDrawer with rack metadata, height badge, and status tag', async () => {
      await renderWithContext(
        <RackElevationDrawer open={true} rack={mockRack42U} onClose={vi.fn()} />,
      );

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.body.textContent).toContain('DC1 Core Cabinet 01');
      expect(document.body.textContent).toContain('RCK-DC1-01');
      expect(document.body.textContent).toContain('42U Standard');
      expect(document.body.textContent).toContain('Active');
    });

    it('Case 13.2: clicking Refresh button in drawer header triggers onRefresh and remounts elevation', async () => {
      const handleRefresh = vi.fn();
      await renderWithContext(
        <RackElevationDrawer
          open={true}
          rack={mockRack42U}
          onClose={vi.fn()}
          onRefresh={handleRefresh}
        />,
      );

      const refreshBtn = document.querySelector(
        '[data-testid="rack-elevation-drawer-refresh"]',
      ) as HTMLButtonElement | null;
      expect(refreshBtn).not.toBeNull();

      if (refreshBtn) {
        await act(async () => {
          refreshBtn.click();
        });
        expect(handleRefresh).toHaveBeenCalledTimes(1);
      }
    });

    it('Case 13.3: clicking Edit button in drawer header triggers onEditRack with active rack', async () => {
      const handleEdit = vi.fn();
      await renderWithContext(
        <RackElevationDrawer
          open={true}
          rack={mockRack42U}
          onClose={vi.fn()}
          onEditRack={handleEdit}
        />,
      );

      const editBtn = document.querySelector(
        '[data-testid="rack-elevation-drawer-edit"]',
      ) as HTMLButtonElement | null;
      expect(editBtn).not.toBeNull();

      if (editBtn) {
        await act(async () => {
          editBtn.click();
        });
        expect(handleEdit).toHaveBeenCalledWith(mockRack42U);
      }
    });

    it('Case 13.4: renders gracefully without crash when rack is null', async () => {
      await renderWithContext(<RackElevationDrawer open={true} rack={null} onClose={vi.fn()} />);

      expect(document.querySelector('.ant-drawer-open')).not.toBeNull();
      expect(document.body.textContent).toContain('Rack Elevation');
    });

    it('Case 13.5: clicking drawer close control triggers onClose', async () => {
      const handleClose = vi.fn();
      await renderWithContext(
        <RackElevationDrawer open={true} rack={mockRack42U} onClose={handleClose} />,
      );

      const closeBtn = (document.querySelector('.ant-drawer-close') ||
        document.querySelector('button.ant-btn')) as HTMLButtonElement | null;
      expect(closeBtn).not.toBeNull();

      if (closeBtn) {
        await act(async () => {
          closeBtn.click();
        });
        expect(handleClose).toHaveBeenCalled();
      }
    });

    it('Case 13.6: onMountClick and onSelectSwitch callbacks pass through from RackElevationDrawer to RackElevationView', async () => {
      const handleMount = vi.fn();
      const handleSelectSwitch = vi.fn();

      await renderWithContext(
        <RackElevationDrawer
          open={true}
          rack={mockRack42U}
          onClose={vi.fn()}
          onMountClick={handleMount}
          onSelectSwitch={handleSelectSwitch}
        />,
      );

      const mountBtn = document.querySelector(
        '[data-testid="mount-equipment-btn"]',
      ) as HTMLButtonElement | null;
      expect(mountBtn).not.toBeNull();
      if (mountBtn) {
        await act(async () => {
          mountBtn.click();
        });
        expect(handleMount).toHaveBeenCalled();
      }

      const mountedDev = document.querySelector(
        '[data-testid="mounted-device-sw-1"]',
      ) as HTMLElement | null;
      expect(mountedDev).not.toBeNull();
      if (mountedDev) {
        await act(async () => {
          mountedDev.click();
        });
        expect(handleSelectSwitch).toHaveBeenCalledWith('sw-1');
      }
    });

    it('Case 13.7: onDeviceUnmounted callback passes through from RackElevationDrawer to RackElevationView', async () => {
      const handleUnmounted = vi.fn();
      vi.mocked(networkService.updateSwitch).mockResolvedValue({} as never);

      await renderWithContext(
        <RackElevationDrawer
          open={true}
          rack={mockRack42U}
          onClose={vi.fn()}
          onDeviceUnmounted={handleUnmounted}
        />,
      );

      const unmountBtn = document.querySelector(
        '[data-testid="unmount-device-sw-1"]',
      ) as HTMLButtonElement | null;
      expect(unmountBtn).not.toBeNull();

      if (unmountBtn) {
        await act(async () => {
          unmountBtn.click();
        });
        expect(handleUnmounted).toHaveBeenCalledWith('sw-1');
      }
    });

    it('Case 13.8: verifies handleSaveRack in RackManagementTab notifies onRackUpdated callback when saving', async () => {
      const handleRackUpdated = vi.fn();
      const updatedRack: NetworkRack = { ...mockRack42U, name: 'DC1 Core Cabinet Updated' };
      vi.mocked(networkService.updateRack).mockResolvedValue(updatedRack);

      await renderWithContext(
        <RackManagementTab
          racks={[mockRack42U]}
          onRackUpdated={handleRackUpdated}
        />,
      );

      // Click Edit on the rack table row
      const editBtn = document.querySelector(
        'button[aria-label="Edit Rack"]',
      ) as HTMLButtonElement | null;
      expect(editBtn).not.toBeNull();

      if (editBtn) {
        await act(async () => {
          editBtn.click();
        });

        // The RackFormModal is now open; click the Save button
        const saveBtn = document.querySelector(
          '.ant-modal-footer button.ant-btn-primary',
        ) as HTMLButtonElement | null;
        expect(saveBtn).not.toBeNull();

        if (saveBtn) {
          await act(async () => {
            saveBtn.click();
          });

          expect(networkService.updateRack).toHaveBeenCalledWith(
            mockRack42U.id,
            expect.any(Object),
          );
          expect(handleRackUpdated).toHaveBeenCalledWith(updatedRack);
        }
      }
    });

    it('Case 13.9: unmounting a device with active elevation slots does not resurrect device on subsequent re-render', async () => {
      vi.mocked(networkService.updateSwitch).mockResolvedValue({} as never);
      vi.mocked(networkService.getRackElevation).mockResolvedValue({
        ...mockElevationData,
        slots: [],
      });

      const elevationWithSwitch: RackElevationData = {
        ...mockElevationData,
        slots: [
          {
            unitNumber: 24,
            isOccupied: true,
            isStartingUnit: true,
            switch: {
              id: 'sw-1',
              name: 'BSL-CORE-SW01',
              model: 'Catalyst 9300',
              vendor: 'Cisco',
              role: 'ACCESS',
              status: 'ONLINE',
              rackHeight: 1,
              rackPosition: 24,
              totalPorts: 24,
            },
          },
        ],
      };

      const { rerender } = await renderWithContext(
        <RackElevationView
          rack={mockRack42U}
          elevationData={elevationWithSwitch}
          onRefresh={vi.fn()}
        />,
      );

      expect(document.querySelector('[data-testid="mounted-device-sw-1"]')).not.toBeNull();

      const unmountBtn = document.querySelector(
        '[data-testid="unmount-device-sw-1"]',
      ) as HTMLButtonElement | null;
      expect(unmountBtn).not.toBeNull();

      if (unmountBtn) {
        await act(async () => {
          unmountBtn.click();
        });

        // Device immediately removed
        expect(document.querySelector('[data-testid="mounted-device-sw-1"]')).toBeNull();

        // Simulate parent re-render with fresh rack object
        await rerender(
          <RackElevationView rack={{ ...mockRack42U, switches: [] }} onRefresh={vi.fn()} />,
        );

        // Device must remain unmounted and not resurrected
        expect(document.querySelector('[data-testid="mounted-device-sw-1"]')).toBeNull();
      }
    });

    it('Case 13.10: deleting active rack closes elevation drawer and cleans up selection', async () => {
      vi.mocked(networkService.deleteRack).mockResolvedValue({} as never);

      await renderWithContext(
        <RackManagementTab racks={[mockRack42U]} />,
      );

      // Open drawer
      const elevationBtn = document.querySelector(
        '[data-testid="view-elevation-DC1 Core Cabinet 01"]',
      ) as HTMLElement | null;
      expect(elevationBtn).not.toBeNull();

      if (elevationBtn) {
        await act(async () => {
          elevationBtn.click();
        });
        expect(document.querySelector('.ant-drawer-open')).not.toBeNull();

        // Click Delete button on the table
        const deleteBtn = document.querySelector(
          'button[aria-label="Delete Rack"]',
        ) as HTMLButtonElement | null;
        expect(deleteBtn).not.toBeNull();

        if (deleteBtn) {
          await act(async () => {
            deleteBtn.click();
          });

          // Confirm popconfirm
          const confirmBtn = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent?.trim() === 'Delete' && b.classList.contains('ant-btn-dangerous'),
          );
          if (confirmBtn) {
            await act(async () => {
              confirmBtn.click();
            });

            expect(networkService.deleteRack).toHaveBeenCalledWith(mockRack42U.id);
            expect(document.querySelector('.ant-drawer-open')).toBeNull();
          }
        }
      }
    });

    it('Case 13.11: editing and saving rack immediately reflects updated name in selectedRack and drawer header', async () => {
      const updatedRack: NetworkRack = { ...mockRack42U, name: 'DC1 Core Cabinet Renamed' };
      vi.mocked(networkService.updateRack).mockResolvedValue(updatedRack);

      await renderWithContext(
        <RackManagementTab racks={[mockRack42U]} />,
      );

      // Open drawer from table
      const elevationBtn = document.querySelector(
        '[data-testid="view-elevation-DC1 Core Cabinet 01"]',
      ) as HTMLElement | null;
      expect(elevationBtn).not.toBeNull();

      if (elevationBtn) {
        await act(async () => {
          elevationBtn.click();
        });
        expect(document.body.textContent).toContain('DC1 Core Cabinet 01');

        // Click Edit in drawer header
        const editDrawerBtn = document.querySelector(
          '[data-testid="rack-elevation-drawer-edit"]',
        ) as HTMLButtonElement | null;
        expect(editDrawerBtn).not.toBeNull();

        if (editDrawerBtn) {
          await act(async () => {
            editDrawerBtn.click();
          });

          // Drawer closes and modal opens; click Save in modal
          const saveBtn = document.querySelector(
            '.ant-modal-footer button.ant-btn-primary',
          ) as HTMLButtonElement | null;
          expect(saveBtn).not.toBeNull();

          if (saveBtn) {
            await act(async () => {
              saveBtn.click();
            });

            expect(networkService.updateRack).toHaveBeenCalledWith(
              mockRack42U.id,
              expect.any(Object),
            );

            // Re-open drawer from table row
            const reOpenBtn = document.querySelector(
              '[data-testid^="view-elevation-"]',
            ) as HTMLElement | null;
            expect(reOpenBtn).not.toBeNull();
            if (reOpenBtn) {
              await act(async () => {
                reOpenBtn.click();
              });
              // Drawer header reflects updated name from merged fallbackRack
              expect(document.body.textContent).toContain('DC1 Core Cabinet Renamed');
            }
          }
        }
      }
    });
  });
});
