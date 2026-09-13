import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type InventoryItem, inventoryService } from '../../services/inventory.service';
import {
  type LocationBranch,
  type LocationTreeNode,
  organizationService,
} from '../../services/organization.service';
import { type Vendor, vendorService } from '../../services/vendor.service';
import InventoryPage from './InventoryPage';

// Dynamic feedback spies for Ant Design v6 App.useApp()
const mockMessageSuccess = vi.fn();
const mockMessageWarning = vi.fn();
const mockMessageError = vi.fn();
const mockMessageInfo = vi.fn();

const stableMessage = {
  success: mockMessageSuccess,
  warning: mockMessageWarning,
  error: mockMessageError,
  info: mockMessageInfo,
};
const stableNotification = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
const stableModal = {
  confirm: vi.fn(),
};
const stableAppContext = {
  message: stableMessage,
  notification: stableNotification,
  modal: stableModal,
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => stableAppContext,
    },
  };
});

vi.mock('../../services/inventory.service', () => ({
  inventoryService: {
    getItems: vi.fn(),
    getStats: vi.fn(),
    getCategories: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    restockItem: vi.fn(),
  },
}));

vi.mock('../../services/organization.service', () => ({
  organizationService: {
    getLocations: vi.fn(),
    getLocationTree: vi.fn(),
    getOrganizations: vi.fn(),
  },
}));

vi.mock('../../services/vendor.service', () => ({
  vendorService: {
    getVendors: vi.fn(),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('InventoryPage Partial Failure & Error State Empirical Challenge', () => {
  let host: HTMLDivElement;
  let root: Root | null = null;

  const mockCategories = [
    { id: 'cat-cables', name: 'Cables & Adapters', description: 'Patch cables' },
    { id: 'cat-periph', name: 'Peripherals', description: 'Mice and keyboards' },
  ];

  const mockLocations: LocationBranch[] = [
    {
      id: 'loc-wh-main',
      name: 'Main IT Depot',
      building: 'Depot 1',
      floor: 'Floor 1',
      organizationId: 'org-1',
    },
  ];

  const mockVendors: Vendor[] = [
    {
      id: 'ven-an购买',
      name: 'Prime Components Ltd',
      contactName: 'Support',
      contactEmail: 'support@prime.com',
      contactPhone: null,
      website: 'https://prime.com',
      notes: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const mockOrganizations = [
    {
      id: 'org-1',
      name: 'UIMS Enterprise HQ',
      code: 'HQ-GLOBAL',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const mockItems: InventoryItem[] = [
    {
      id: 'item-cat6-5m',
      sku: 'CAB-CAT6-5M',
      name: 'Cat6 Shielded Patch Cable 5m',
      categoryId: 'cat-cables',
      category: mockCategories[0],
      quantity: 40,
      minThreshold: 15,
      unitCost: 8.5,
      locationId: 'loc-wh-main',
      location: mockLocations[0],
      binNumber: 'Rack-4-Bin-A',
      supplier: 'Prime Components Ltd',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);

    // Default healthy mock responses
    vi.mocked(inventoryService.getItems).mockResolvedValue(mockItems);
    vi.mocked(inventoryService.getStats).mockResolvedValue({
      totalSkus: 1,
      totalUnits: 40,
      totalValuation: 340,
      lowStockCount: 0,
      outOfStockCount: 0,
    });
    vi.mocked(inventoryService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(organizationService.getLocations).mockResolvedValue(mockLocations);
    vi.mocked(organizationService.getLocationTree).mockResolvedValue(
      mockLocations as unknown as LocationTreeNode[],
    );
    vi.mocked(organizationService.getOrganizations).mockResolvedValue(mockOrganizations);
    vi.mocked(vendorService.getVendors).mockResolvedValue(mockVendors);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  function renderPage() {
    root = createRoot(host);
    return act(async () => {
      root?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(MemoryRouter, null, createElement(InventoryPage))),
        ),
      );
    });
  }

  it('Challenge 1: Vendor service fails -> inventory items still render and operator warned', async () => {
    vi.mocked(vendorService.getVendors).mockRejectedValueOnce(
      new Error('503 Service Unavailable: Vendor microservice offline'),
    );

    await renderPage();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // 1. Core items render in table
    expect(host.textContent).toContain('CAB-CAT6-5M');
    expect(host.textContent).toContain('Cat6 Shielded Patch Cable 5m');

    // 2. Operator warned via App.useApp().message.warning
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load approved vendors.');
  });

  it('Challenge 2: Categories service fails -> items render and operator warned', async () => {
    vi.mocked(inventoryService.getCategories).mockRejectedValueOnce(
      new Error('Category catalog DB timeout'),
    );

    await renderPage();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(host.textContent).toContain('CAB-CAT6-5M');
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load inventory categories.');
  });

  it('Challenge 3: Storage locations service fails -> items render and operator warned', async () => {
    vi.mocked(organizationService.getLocationTree).mockRejectedValueOnce(
      new Error('Spatial tree indexing unavailable'),
    );
    vi.mocked(organizationService.getLocations).mockRejectedValueOnce(
      new Error('Flat locations DB down'),
    );

    await renderPage();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(host.textContent).toContain('CAB-CAT6-5M');
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load inventory storage locations.');
  });

  it('Challenge 4: Organizations service fails -> items render and operator warned', async () => {
    vi.mocked(organizationService.getOrganizations).mockRejectedValueOnce(
      new Error('Organization service 500'),
    );

    await renderPage();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(host.textContent).toContain('CAB-CAT6-5M');
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load organizations.');
  });

  it('Challenge 5: Stats service fails -> computes client-side fallback metrics without crash', async () => {
    vi.mocked(inventoryService.getStats).mockRejectedValueOnce(
      new Error('Dashboard aggregation timeout'),
    );

    await renderPage();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Table renders
    expect(host.textContent).toContain('CAB-CAT6-5M');

    // Stats calculated client-side: 40 units, $340 valuation (40 * 8.5 = 340)
    expect(host.textContent).toContain('40');
    expect(host.textContent).toContain('$340.00');

    // Zero error message
    expect(mockMessageError).not.toHaveBeenCalled();
  });

  it('Challenge 6: Multi-auxiliary rejection (Vendors + Categories + Locations + Orgs + Stats reject)', async () => {
    vi.mocked(vendorService.getVendors).mockRejectedValueOnce(new Error('Vendors down'));
    vi.mocked(inventoryService.getCategories).mockRejectedValueOnce(new Error('Cats down'));
    vi.mocked(organizationService.getLocationTree).mockRejectedValueOnce(new Error('Locs down'));
    vi.mocked(organizationService.getLocations).mockRejectedValueOnce(
      new Error('Locs fallback down'),
    );
    vi.mocked(organizationService.getOrganizations).mockRejectedValueOnce(new Error('Orgs down'));
    vi.mocked(inventoryService.getStats).mockRejectedValueOnce(new Error('Stats down'));

    await renderPage();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Items still render cleanly
    expect(host.textContent).toContain('CAB-CAT6-5M');
    expect(host.textContent).toContain('Cat6 Shielded Patch Cable 5m');

    // All warnings emitted
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load approved vendors.');
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load inventory categories.');
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load inventory storage locations.');
    expect(mockMessageWarning).toHaveBeenCalledWith('Failed to load organizations.');

    // Fallback stats computed
    expect(host.textContent).toContain('40');
    expect(host.textContent).toContain('$340.00');
  });

  it('Challenge 7: Core items service failure -> notifies via message.error and renders gracefully', async () => {
    vi.mocked(inventoryService.getItems).mockRejectedValueOnce(
      new Error('500 Database connection dropped'),
    );

    await renderPage();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Error toast dispatched via App.useApp().message.error
    expect(mockMessageError).toHaveBeenCalledWith('Failed to load inventory items.');

    // Table renders empty state without React fatal unhandled crash
    expect(host.querySelector('.ant-table')).not.toBeNull();
  });

  it('Challenge 8: Restock failure error extraction and user feedback', async () => {
    await renderPage();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restockBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Restock'),
    );
    expect(restockBtn).toBeDefined();

    await act(async () => {
      restockBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Modal is opened
    expect(document.body.textContent).toContain('Restock: Cat6 Shielded Patch Cable 5m');

    vi.mocked(inventoryService.restockItem).mockRejectedValueOnce(
      new Error('Warehouse bin capacity exceeded'),
    );

    const updateStockBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find(
      (b) => b.textContent?.includes('Update Stock'),
    ) as HTMLButtonElement | undefined;
    expect(updateStockBtn).toBeDefined();

    await act(async () => {
      updateStockBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockMessageError).toHaveBeenCalledWith('Warehouse bin capacity exceeded');
  });
});
