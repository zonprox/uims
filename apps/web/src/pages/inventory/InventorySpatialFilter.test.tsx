import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type InventoryItem, inventoryService } from '../../services/inventory.service';
import {
  type LocationBranch,
  type LocationTreeNode,
  organizationService,
} from '../../services/organization.service';
import { type Vendor, vendorService } from '../../services/vendor.service';
import InventoryPage, { formatLocationTreeForSelect } from './InventoryPage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const mockCategories = [
  { id: 'cat-fabric', name: 'Fabrics & Textiles', description: 'Raw materials for garment' },
  { id: 'cat-acc', name: 'Accessories & Trims', description: 'Buttons, zippers, threads' },
];

const mockLocationTree: LocationTreeNode[] = [
  {
    id: 'loc-bsl-wh',
    key: 'loc-bsl-wh',
    value: 'loc-bsl-wh',
    name: 'BSL Central Warehouse',
    title: 'BSL Central Warehouse',
    label: 'BSL Central Warehouse',
    fullPath: 'BSL Central Warehouse',
    type: 'WAREHOUSE',
    children: [
      {
        id: 'loc-raw-mat',
        key: 'loc-raw-mat',
        value: 'loc-raw-mat',
        name: 'Raw Materials',
        title: 'Raw Materials',
        label: 'BSL Central Warehouse > Raw Materials',
        fullPath: 'BSL Central Warehouse > Raw Materials',
        type: 'ZONE',
        parentId: 'loc-bsl-wh',
        children: [
          {
            id: 'loc-rack-04',
            key: 'loc-rack-04',
            value: 'loc-rack-04',
            name: 'Fabric Rack 04',
            title: 'Fabric Rack 04',
            label: 'BSL Central Warehouse > Raw Materials > Fabric Rack 04',
            fullPath: 'BSL Central Warehouse > Raw Materials > Fabric Rack 04',
            type: 'RACK',
            parentId: 'loc-raw-mat',
            children: [
              {
                id: 'loc-bin-b12',
                key: 'loc-bin-b12',
                value: 'loc-bin-b12',
                name: 'Bin B-12',
                title: 'Bin B-12',
                label: 'BSL Central Warehouse > Raw Materials > Fabric Rack 04 > Bin B-12',
                fullPath: 'BSL Central Warehouse > Raw Materials > Fabric Rack 04 > Bin B-12',
                type: 'BIN',
                parentId: 'loc-rack-04',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'loc-factory-1',
    key: 'loc-factory-1',
    value: 'loc-factory-1',
    name: 'Factory 1',
    title: 'Factory 1',
    label: 'Factory 1',
    fullPath: 'Factory 1',
    type: 'WORKSHOP',
    children: [
      {
        id: 'loc-f1-mdc',
        key: 'loc-f1-mdc',
        value: 'loc-f1-mdc',
        name: 'MDC Sub-Warehouse',
        title: 'MDC Sub-Warehouse',
        label: 'Factory 1 > MDC Sub-Warehouse',
        fullPath: 'Factory 1 > MDC Sub-Warehouse',
        type: 'WAREHOUSE',
        parentId: 'loc-factory-1',
        children: [
          {
            id: 'loc-f1-shelf-a',
            key: 'loc-f1-shelf-a',
            value: 'loc-f1-shelf-a',
            name: 'Accessories Shelf',
            title: 'Accessories Shelf',
            label: 'Factory 1 > MDC Sub-Warehouse > Accessories Shelf',
            fullPath: 'Factory 1 > MDC Sub-Warehouse > Accessories Shelf',
            type: 'SHELF',
            parentId: 'loc-f1-mdc',
            children: [],
          },
        ],
      },
    ],
  },
];

const mockItems: InventoryItem[] = [
  {
    id: 'item-cotton-twill',
    sku: 'FAB-COT-101',
    name: '100% Cotton Twill Fabric Navy',
    categoryId: 'cat-fabric',
    category: mockCategories[0],
    quantity: 1500,
    minThreshold: 200,
    unitCost: 4.85,
    locationId: 'loc-bin-b12',
    location: {
      id: 'loc-bin-b12',
      name: 'Bin B-12',
      fullPath: 'BSL Central Warehouse > Raw Materials > Fabric Rack 04 > Bin B-12',
      organization: { id: 'org-bsl', name: 'BSL Garments Ltd', code: 'BSL' },
    },
    locationPath: 'BSL Central Warehouse > Raw Materials > Fabric Rack 04 > Bin B-12',
    binNumber: 'Bay 4-B12',
    supplier: 'TexChem Fabrics',
  },
  {
    id: 'item-zipper-metal',
    sku: 'TRM-ZIP-005',
    name: 'YKK Metal Zipper #5 Brass 20cm',
    categoryId: 'cat-acc',
    category: mockCategories[1],
    quantity: 450,
    minThreshold: 100,
    unitCost: 0.65,
    locationId: 'loc-f1-shelf-a',
    location: {
      id: 'loc-f1-shelf-a',
      name: 'Accessories Shelf',
      fullPath: 'Factory 1 > MDC Sub-Warehouse > Accessories Shelf',
      organization: { id: 'org-bsl', name: 'BSL Garments Ltd', code: 'BSL' },
    },
    locationPath: 'Factory 1 > MDC Sub-Warehouse > Accessories Shelf',
    binNumber: 'Shelf A-02',
    supplier: 'YKK Fastening',
  },
];

const mockVendors: Vendor[] = [
  {
    id: 'ven-texchem',
    name: 'TexChem Fabrics',
    contactName: 'Nguyen Van A',
    contactEmail: 'sales@texchem.vn',
    contactPhone: null,
    website: 'https://texchem.vn',
    notes: 'Primary fabric supplier',
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
    getLocationTree: vi.fn(),
    getLocations: vi.fn(),
    getOrganizations: vi.fn(),
  },
}));

vi.mock('../../services/vendor.service', () => ({
  vendorService: {
    getVendors: vi.fn(),
  },
}));

describe('InventorySpatialFilter Integration & Teardown', () => {
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
    vi.mocked(organizationService.getLocationTree).mockResolvedValue(mockLocationTree);
    vi.mocked(organizationService.getLocations).mockResolvedValue(
      mockLocationTree as unknown as LocationBranch[],
    );
    vi.mocked(organizationService.getOrganizations).mockResolvedValue([
      {
        id: 'org-bsl',
        name: 'BSL Garments Ltd',
        code: 'BSL',
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

  describe('formatLocationTreeForSelect utility', () => {
    it('formats recursive multi-tier location nodes with full breadcrumbs', () => {
      const formatted = formatLocationTreeForSelect(mockLocationTree);
      expect(formatted).toHaveLength(2);

      const whNode = formatted[0];
      expect(whNode.key).toBe('loc-bsl-wh');
      expect(whNode.title).toBe('BSL Central Warehouse');
      expect(whNode.label).toBe('BSL Central Warehouse');
      expect(whNode.children).toHaveLength(1);

      const rawMatNode = whNode.children?.[0];
      expect(rawMatNode?.key).toBe('loc-raw-mat');
      expect(rawMatNode?.title).toBe('Raw Materials');
      expect(rawMatNode?.label).toBe('BSL Central Warehouse > Raw Materials');

      const rackNode = rawMatNode?.children?.[0];
      expect(rackNode?.key).toBe('loc-rack-04');
      expect(rackNode?.title).toBe('Fabric Rack 04');
      expect(rackNode?.label).toBe('BSL Central Warehouse > Raw Materials > Fabric Rack 04');

      const binNode = rackNode?.children?.[0];
      expect(binNode?.key).toBe('loc-bin-b12');
      expect(binNode?.title).toBe('Bin B-12');
      expect(binNode?.label).toBe(
        'BSL Central Warehouse > Raw Materials > Fabric Rack 04 > Bin B-12',
      );
    });

    it('falls back to parentPath and building information for flat branch objects', () => {
      const flatBranches: LocationBranch[] = [
        {
          id: 'branch-1',
          name: 'Central Warehouse',
          building: 'Building B',
          floor: 'Floor 1',
        },
      ];
      const formatted = formatLocationTreeForSelect(flatBranches);
      expect(formatted[0].label).toBe('Central Warehouse (Building B - Floor 1)');
      expect(formatted[0].title).toBe('Central Warehouse');
    });
  });

  describe('Table Location & Bin Column Rendering', () => {
    it('renders leaf location tag with EnvironmentOutlined icon and code binNumber', async () => {
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
      expect(host.textContent).toContain('FAB-COT-101');
      expect(host.textContent).toContain('100% Cotton Twill Fabric Navy');
      expect(host.textContent).toContain('Bin B-12');
      expect(host.textContent).toContain('Bay 4-B12');

      expect(host.textContent).toContain('TRM-ZIP-005');
      expect(host.textContent).toContain('Accessories Shelf');
      expect(host.textContent).toContain('Shelf A-02');

      // Verify leaf location tags
      const geekblueTags = Array.from(host.querySelectorAll('.ant-tag-geekblue'));
      const locTagTexts = geekblueTags.map((t) => t.textContent?.trim());
      expect(locTagTexts).toContain('Bin B-12');
      expect(locTagTexts).toContain('Accessories Shelf');

      // Verify bin numbers rendered as code text
      const codeElements = Array.from(host.querySelectorAll('code, .ant-typography-code'));
      const codeTexts = codeElements.map((c) => c.textContent?.trim());
      expect(codeTexts).toContain('Bay 4-B12');
      expect(codeTexts).toContain('Shelf A-02');
    });
  });

  describe('Create / Edit Modal TreeSelect', () => {
    it('opens Create Item modal and renders TreeSelect for Storage Location with warehouse placeholder', async () => {
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

      const modal = document.querySelector('.ant-modal');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Create Item');
      expect(modal?.textContent).toContain('Storage Location');

      // Assert TreeSelect is present in modal
      const modalTreeSelect = modal?.querySelector('.ant-select.ant-tree-select');
      expect(modalTreeSelect).not.toBeNull();
    });

    it('opens Edit Item modal and populates existing locationId', async () => {
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

      // Click on item name to open edit modal
      const itemLink = Array.from(host.querySelectorAll('span, div')).find(
        (el) => el.textContent === '100% Cotton Twill Fabric Navy',
      );
      expect(itemLink).toBeDefined();

      await act(async () => {
        itemLink?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 60));
      });

      const modal = document.querySelector('.ant-modal');
      expect(modal).not.toBeNull();
      expect(modal?.textContent).toContain('Edit Item: FAB-COT-101');

      // Check that locationId is set
      const modalTreeSelect = modal?.querySelector('.ant-select.ant-tree-select');
      expect(modalTreeSelect).not.toBeNull();
      expect(
        modalTreeSelect?.textContent?.includes('Bin B-12') ||
          modalTreeSelect?.textContent?.includes('BSL Central Warehouse'),
      ).toBe(true);
    });
  });

  describe('Inventory Filter Toolbar Hierarchical Location Selection', () => {
    it('renders TreeSelect location filter control alongside Category and Stock Status', async () => {
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

      // Find the TreeSelect in the toolbar
      const toolbarTreeSelect = host.querySelector('.ant-card .ant-select.ant-tree-select');
      expect(toolbarTreeSelect).not.toBeNull();
      expect(
        toolbarTreeSelect?.textContent?.includes('Location / Warehouse') ||
          toolbarTreeSelect
            ?.querySelector('.ant-select-selection-placeholder')
            ?.textContent?.includes('Location / Warehouse'),
      ).toBe(true);
    });

    it('forwards locationId to inventoryService.getItems when location tree filter is selected and resets cleanly', async () => {
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

      // Verify initial call has no locationId filter
      expect(inventoryService.getItems).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: undefined,
        }),
      );

      // Verify Reset button resets all filters including locationId
      // First, simulate a search query to make the Reset button appear
      const searchInput = host.querySelector(
        'input[placeholder*="Search by SKU"]',
      ) as HTMLInputElement;
      expect(searchInput).not.toBeNull();

      await act(async () => {
        setInputValue(searchInput, 'Cotton');
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

      // Check that getItems was called with locationId: undefined on reset
      expect(inventoryService.getItems).toHaveBeenLastCalledWith(
        expect.objectContaining({
          locationId: undefined,
          search: undefined,
          category: undefined,
          stockStatus: undefined,
          organizationId: undefined,
        }),
      );
    });
  });
});
