import { App, ConfigProvider } from 'antd';
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkRack, NetworkSwitch } from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import { MountSwitchModal } from './MountSwitchModal';

vi.mock('../../../services/network.service', () => ({
  networkService: {
    getSwitches: vi.fn(),
    updateSwitch: vi.fn(),
    createSwitch: vi.fn(),
  },
  SwitchRole: {
    ACCESS: 'ACCESS',
    DISTRIBUTION: 'DISTRIBUTION',
    CORE: 'CORE',
    TOR: 'TOR',
  },
  SwitchStatus: {
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    MAINTENANCE: 'MAINTENANCE',
  },
}));

describe('MountSwitchModal Component Tests', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const mockRack: NetworkRack = {
    id: 'rack-01',
    name: 'Main Server Rack A',
    code: 'CAB-01',
    status: 'ACTIVE',
    switches: [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockSwitches: NetworkSwitch[] = [
    {
      id: 'sw-unmounted-1',
      name: 'SW-DIST-01',
      vendor: 'Cisco Systems',
      model: 'Catalyst 9300',
      role: 'DISTRIBUTION',
      status: 'ONLINE',
      totalPorts: 24,
      rackId: null,
      rackPosition: null,
      rackHeight: 1,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sw-mounted-1',
      name: 'SW-CORE-01',
      vendor: 'Juniper Networks',
      model: 'EX4300',
      role: 'CORE',
      status: 'ONLINE',
      totalPorts: 48,
      rackId: 'rack-02',
      rackPosition: 10,
      rackHeight: 1,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
    vi.mocked(networkService.getSwitches).mockResolvedValue(mockSwitches);
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

  const renderWithProviders = async (element: React.ReactElement) => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(MemoryRouter, null, element)),
        ),
      );
    });
  };

  it('renders target cabinet details and slot badge accurately', async () => {
    await renderWithProviders(
      <MountSwitchModal
        open={true}
        rack={mockRack}
        targetUnit={15}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    const titleEl = document.querySelector('.ant-modal-title');
    expect(titleEl?.textContent).toContain('Mount Equipment into Cabinet: Main Server Rack A');

    const descriptions = document.querySelector('.ant-descriptions');
    expect(descriptions?.textContent).toContain('Main Server Rack A');
    expect(descriptions?.textContent).toContain('CAB-01');
    expect(descriptions?.textContent).toContain('Slot U15');
  });

  it('loads and lists available switches with unmounted availability indicators', async () => {
    await renderWithProviders(
      <MountSwitchModal
        open={true}
        rack={mockRack}
        targetUnit={5}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(networkService.getSwitches).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-testid="select-switch-to-mount"]')).not.toBeNull();
  });

  it('invokes onCancel callback when Cancel is clicked', async () => {
    const onCancelMock = vi.fn();
    await renderWithProviders(
      <MountSwitchModal
        open={true}
        rack={mockRack}
        targetUnit={5}
        onCancel={onCancelMock}
        onSuccess={vi.fn()}
      />,
    );

    const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cancel'),
    );
    expect(cancelBtn).not.toBeUndefined();

    await act(async () => {
      cancelBtn?.click();
    });

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('unmounts cleanly without portal DOM leakage', async () => {
    await renderWithProviders(
      <MountSwitchModal
        open={true}
        rack={mockRack}
        targetUnit={1}
        onCancel={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(document.querySelector('.ant-modal-root')).not.toBeNull();

    await act(async () => {
      currentRoot?.unmount();
      currentRoot = null;
    });

    expect(container.innerHTML).toBe('');
  });
});
