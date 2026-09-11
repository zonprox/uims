import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type InventoryItem, inventoryService } from '../../services/inventory.service';
import { organizationService } from '../../services/organization.service';
import { type Vendor, vendorService } from '../../services/vendor.service';
import InventoryPage from './InventoryPage';

const mockCategories = [
  { id: 'cat-1', name: 'Cables & Adapters', description: 'Patch cables and adapters' },
  { id: 'cat-2', name: 'Peripherals', description: 'Mice and keyboards' },
];

const mockLocations = [{ id: 'loc-1', name: 'Warehouse Main', building: 'Bldg 1', floor: '1' }];

const mockVendors: Vendor[] = [
  {
    id: 'ven-1',
    name: 'Monoprice Inc',
    contactName: 'Sales Dept',
    contactEmail: 'sales@monoprice.com',
    contactPhone: null,
    website: 'https://monoprice.com',
    notes: 'Standard cables vendor',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockItems: InventoryItem[] = [
  {
    id: 'item-1',
    sku: 'CAB-CAT6-01',
    name: 'Cat6 Patch Cable 2m',
    categoryId: 'cat-1',
    category: mockCategories[0],
    quantity: 25,
    minThreshold: 10,
    unitCost: 3.5,
    locationId: 'loc-1',
    location: mockLocations[0],
    binNumber: 'Bin A-10',
  },
];

const mockThresholdItems: InventoryItem[] = [
  {
    id: 'item-low',
    sku: 'PWR-USB-C',
    name: '65W USB-C Power Adapter',
    categoryId: 'cat-2',
    category: mockCategories[1],
    quantity: 2,
    minThreshold: 5,
    unitCost: 29.99,
    locationId: 'loc-1',
    location: mockLocations[0],
    binNumber: 'Bin B-02',
    supplier: 'Monoprice Inc',
  },
  {
    id: 'item-out',
    sku: 'RAM-DDR4-16G',
    name: '16GB DDR4 RAM Module',
    categoryId: 'cat-2',
    category: mockCategories[1],
    quantity: 0,
    minThreshold: 5,
    unitCost: 45.0,
    locationId: 'loc-1',
    location: mockLocations[0],
    binNumber: 'Bin C-01',
    supplier: 'Monoprice Inc',
  },
];

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
  },
}));

vi.mock('../../services/vendor.service', () => ({
  vendorService: {
    getVendors: vi.fn(),
  },
}));

describe('InventoryPage Integration & Teardown', () => {
  let host: HTMLDivElement;
  let root: Root | null = null;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    vi.mocked(inventoryService.getItems).mockResolvedValue(mockItems);
    vi.mocked(inventoryService.getStats).mockResolvedValue({
      totalSkus: 1,
      totalUnits: 25,
      totalValuation: 87.5,
      lowStockCount: 0,
      outOfStockCount: 0,
    });
    vi.mocked(inventoryService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(organizationService.getLocations).mockResolvedValue(mockLocations);
    vi.mocked(vendorService.getVendors).mockResolvedValue(mockVendors);
  });

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }
    host.remove();
    document
      .querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover')
      .forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  it('renders inventory items with location tag and bin number', async () => {
    root = createRoot(host);
    await act(async () => {
      root?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(MemoryRouter, null, createElement(InventoryPage))),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(host.textContent).toContain('CAB-CAT6-01');
    expect(host.textContent).toContain('Cat6 Patch Cable 2m');
    expect(host.textContent).toContain('Warehouse Main');
    expect(host.textContent).toContain('Bin A-10');
  });

  it('renders semantic category tag color', async () => {
    root = createRoot(host);
    await act(async () => {
      root?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(MemoryRouter, null, createElement(InventoryPage))),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const categoryTag = host.querySelector('.ant-tag-cyan');
    expect(categoryTag).not.toBeNull();
    expect(categoryTag?.textContent).toContain('Cables & Adapters');
  });

  it('opens restock modal and triggers restockItem', async () => {
    root = createRoot(host);
    await act(async () => {
      root?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(MemoryRouter, null, createElement(InventoryPage))),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restockButton = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Restock'),
    );
    expect(restockButton).toBeDefined();

    await act(async () => {
      restockButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.body.textContent).toContain('Restock: Cat6 Patch Cable 2m');
    expect(document.body.textContent).toContain('Current stock: 25 units');

    const updateBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find((b) =>
      b.textContent?.includes('Update Stock'),
    ) as HTMLButtonElement | undefined;
    expect(updateBtn).toBeDefined();

    vi.mocked(inventoryService.restockItem).mockResolvedValue(
      undefined as unknown as InventoryItem,
    );

    await act(async () => {
      updateBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(inventoryService.restockItem).toHaveBeenCalledWith('item-1', 10);
  });

  it('renders threshold alerts (Low Stock and Out of Stock) for depleted and low quantity items', async () => {
    vi.mocked(inventoryService.getItems).mockResolvedValue(mockThresholdItems);
    vi.mocked(inventoryService.getStats).mockResolvedValue({
      totalSkus: 2,
      totalUnits: 2,
      totalValuation: 59.98,
      lowStockCount: 1,
      outOfStockCount: 1,
    });

    root = createRoot(host);
    await act(async () => {
      root?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(MemoryRouter, null, createElement(InventoryPage))),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    expect(host.textContent).toContain('65W USB-C Power Adapter');
    expect(host.textContent).toContain('16GB DDR4 RAM Module');

    const lowStockTag = Array.from(host.querySelectorAll('.ant-tag')).find((t) =>
      t.textContent?.includes('Low Stock'),
    );
    expect(lowStockTag).toBeDefined();

    const outOfStockTag = Array.from(host.querySelectorAll('.ant-tag')).find((t) =>
      t.textContent?.includes('Out of Stock'),
    );
    expect(outOfStockTag).toBeDefined();

    expect(host.textContent).toContain('Restock Required');
    expect(host.textContent).toContain('2');
  });

  it('opens Add Item modal and renders categoryId, locationId, and vendorId Select components', async () => {
    root = createRoot(host);
    await act(async () => {
      root?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(MemoryRouter, null, createElement(InventoryPage))),
        ),
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    // Find and click "Create Item" button
    const createBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Create Item'),
    );
    expect(createBtn).toBeDefined();

    await act(async () => {
      createBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    const modal = document.querySelector('.ant-modal');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Create Item');

    // Assert Form labels
    expect(modal?.textContent).toContain('Category');
    expect(modal?.textContent).toContain('Supplier / Vendor');
    expect(modal?.textContent).toContain('Storage Location');

    // Assert Select components exist for categoryId, vendorId, locationId
    const modalSelects = document.querySelectorAll('.ant-modal .ant-select');
    expect(modalSelects.length).toBeGreaterThanOrEqual(3);

    const categorySelect = Array.from(modalSelects).find(
      (s) =>
        s.textContent?.includes('Cables & Adapters') || s.textContent?.includes('Select category'),
    );
    expect(categorySelect).toBeDefined();

    const vendorSelect = Array.from(modalSelects).find(
      (s) =>
        s.textContent?.includes('Monoprice Inc') ||
        s.textContent?.includes('Select approved vendor'),
    );
    expect(vendorSelect).toBeDefined();

    const locationSelect = Array.from(modalSelects).find(
      (s) =>
        s.textContent?.includes('Warehouse Main') ||
        s.textContent?.includes('Select warehouse or site location'),
    );
    expect(locationSelect).toBeDefined();
  });
});
