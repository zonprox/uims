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
    getOrganizations: vi.fn(),
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
    vi.mocked(organizationService.getOrganizations).mockResolvedValue([
      {
        id: 'org-1',
        name: 'Acme Enterprise Global HQ',
        code: 'ACME-US',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
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

  it('renders inventory items with bin number', async () => {
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
    expect(host.textContent).toContain('Bin A-10');
  });

  it('renders stats overview cards', async () => {
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

    expect(host.textContent).toContain('Total SKUs');
    expect(host.textContent).toContain('Total Units');
  });

  it('renders low stock warning banners when items breach thresholds', async () => {
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
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(host.textContent).toContain('Low Stock');
    expect(host.textContent).toContain('65W USB-C Power Adapter');
    expect(host.textContent).toContain('Out of Stock');
    expect(host.textContent).toContain('16GB DDR4 RAM Module');
  });

  it('opens restock modal when Restock button is clicked', async () => {
    vi.mocked(inventoryService.getItems).mockResolvedValue(mockThresholdItems);

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

    const restockBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Restock'),
    );
    expect(restockBtn).toBeDefined();

    await act(async () => {
      restockBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const modal = document.querySelector('.ant-modal');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Restock:');
  });

  it('submits restock and refreshes inventory data', async () => {
    vi.mocked(inventoryService.getItems).mockResolvedValue(mockThresholdItems);
    vi.mocked(inventoryService.restockItem).mockResolvedValue({
      ...mockThresholdItems[0],
      quantity: 12,
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
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const restockBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Restock'),
    );
    await act(async () => {
      restockBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const confirmBtn = Array.from(document.querySelectorAll('.ant-modal button')).find((b) =>
      b.textContent?.includes('Update Stock'),
    ) as HTMLButtonElement | undefined;
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      confirmBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(inventoryService.restockItem).toHaveBeenCalledWith('item-low', 10);
  });

  it('opens Add Item modal and renders categoryId and vendorId Select components', async () => {
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

    // Assert Select components exist for categoryId and vendorId
    const modalSelects = document.querySelectorAll('.ant-modal .ant-select');
    expect(modalSelects.length).toBeGreaterThanOrEqual(2);

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
  });

  it('renders category and stock filter Select components in toolbar', async () => {
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

    const selects = host.querySelectorAll('.ant-select');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });
});
