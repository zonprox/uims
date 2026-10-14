import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type InventoryItem, inventoryService } from '../../services/inventory.service';
import { organizationService } from '../../services/organization.service';
import { type Vendor, vendorService } from '../../services/vendor.service';
import InventoryPage from './InventoryPage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const mockCategories = [
  { id: 'cat-network', name: 'Network Switches', description: 'Enterprise network hardware' },
  { id: 'cat-server', name: 'Servers & Racks', description: 'Rackmount enterprise servers' },
];

const mockItems: InventoryItem[] = [
  {
    id: 'item-cisco-switch',
    sku: 'NET-SW-48P',
    name: 'Cisco Catalyst 48-Port PoE Switch',
    categoryId: 'cat-network',
    category: mockCategories[0],
    quantity: 15,
    minThreshold: 5,
    unitCost: 1450.0,
    binNumber: 'Bay 4-B12',
    supplier: 'Cisco Systems Inc',
  },
  {
    id: 'item-hpe-server',
    sku: 'SRV-DL380-G10',
    name: 'HPE ProLiant DL380 Gen10 Server',
    categoryId: 'cat-server',
    category: mockCategories[1],
    quantity: 8,
    minThreshold: 2,
    unitCost: 3200.0,
    binNumber: 'Shelf A-02',
    supplier: 'Hewlett Packard Enterprise',
  },
];

const mockVendors: Vendor[] = [
  {
    id: 'ven-cisco',
    name: 'Cisco Systems Inc',
    contactName: 'Enterprise Sales',
    contactEmail: 'sales@cisco.com',
    contactPhone: '+1 800 553 6387',
    website: 'https://cisco.com',
    notes: 'Primary network infrastructure vendor',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
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

describe('Inventory Filtering & Storage Bin Rendering', () => {
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
      totalSkus: 2,
      totalUnits: 1950,
      totalValuation: 7567.5,
      lowStockCount: 0,
      outOfStockCount: 0,
    });
    vi.mocked(inventoryService.getCategories).mockResolvedValue(mockCategories);
    vi.mocked(organizationService.getOrganizations).mockResolvedValue([
      {
        id: 'org-tech',
        name: 'Enterprise Tech Systems Inc',
        code: 'ETS',
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
      .querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover, .ant-select-dropdown')
      .forEach((el) => el.remove());
    vi.clearAllMocks();
  });

  describe('Table Storage Bin Column Rendering', () => {
    it('renders Storage Bin column with cyan tag and binNumber', async () => {
      root = createRoot(host);
      await act(async () => {
        root?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(MemoryRouter, null, createElement(InventoryPage)),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Verify table text
      expect(host.textContent).toContain('NET-SW-48P');
      expect(host.textContent).toContain('Cisco Catalyst 48-Port PoE Switch');
      expect(host.textContent).toContain('Bay 4-B12');

      expect(host.textContent).toContain('SRV-DL380-G10');
      expect(host.textContent).toContain('Shelf A-02');

      // Verify cyan tags for bin numbers
      const cyanTags = Array.from(host.querySelectorAll('.ant-tag-cyan'));
      const tagTexts = cyanTags.map((t) => t.textContent?.trim());
      expect(tagTexts).toContain('Bay 4-B12');
      expect(tagTexts).toContain('Shelf A-02');
    });
  });

  describe('Create / Edit Modal Location Purge Verification', () => {
    it('opens Create Item modal and confirms Storage Location is completely absent', async () => {
      root = createRoot(host);
      await act(async () => {
        root?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(MemoryRouter, null, createElement(InventoryPage)),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Click "Create Item"
      const createBtn = Array.from(host.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Create Item'),
      );
      expect(createBtn).toBeDefined();

      await act(async () => {
        createBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const modal = document.querySelector('.ant-modal, .ant-drawer');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Create Item');
      // Storage Location should NOT be in the modal
      expect(modal?.textContent).not.toContain('Storage Location');

      // Assert no TreeSelect is present in modal
      const modalTreeSelect = modal?.querySelector('.ant-select.ant-tree-select');
      expect(modalTreeSelect).toBeNull();
    });
  });

  describe('Inventory Filter Toolbar Category and Stock Filtering', () => {
    it('renders Category and Stock Status filter selects in toolbar', async () => {
      root = createRoot(host);
      await act(async () => {
        root?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(MemoryRouter, null, createElement(InventoryPage)),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const selects = host.querySelectorAll('.ant-card .ant-select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('forwards search and resets cleanly', async () => {
      root = createRoot(host);
      await act(async () => {
        root?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(MemoryRouter, null, createElement(InventoryPage)),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // First, simulate a search query to make the Reset button appear
      const searchInput = host.querySelector(
        'input[placeholder*="Search by SKU"]',
      ) as HTMLInputElement;
      expect(searchInput).not.toBeNull();

      await act(async () => {
        setInputValue(searchInput, 'Catalyst');
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const resetBtn = Array.from(host.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Reset',
      );
      expect(resetBtn).toBeDefined();

      await act(async () => {
        resetBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      // Check that getItems was called on reset
      expect(inventoryService.getItems).toHaveBeenCalled();
    });
  });
});
