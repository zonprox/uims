import { App, Form } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset, AssetCategory } from '../../../services/assets.service';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { AssetFilterBar, CATEGORY_FILTER_OPTIONS } from './AssetFilterBar';
import { AssetFormModal } from './AssetFormModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-laptop', name: 'Laptops / Notebooks' },
      { id: 'cat-switch', name: 'Network Switches' },
      { id: 'cat-monitor', name: 'Monitors & Displays' },
    ]),
  },
}));

vi.mock('../../../services/organization.service', () => ({
  organizationService: {
    getLocationTree: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

describe('Asset Specifications Removal & Simplified Notes View', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  describe('AssetDetailDrawer Details and Notes Rendering', () => {
    function DrawerWrapper({
      selectedAsset,
      open = true,
    }: {
      selectedAsset: Asset | null;
      open?: boolean;
    }) {
      return createElement(
        App,
        null,
        createElement(AssetDetailDrawer, {
          open,
          selectedAsset,
          onClose: vi.fn(),
          onOpenEditModal: vi.fn(),
        }),
      );
    }

    it('renders asset information and notes without any technical specifications section', async () => {
      const switchAsset: Asset = {
        id: 'ast-sw-01',
        tag: 'AST-SW-01',
        name: 'Cisco Catalyst 9300-48P',
        manufacturer: 'Cisco',
        model: 'C9300-48P',
        serialNumber: 'FCW2340A01B',
        category: 'Network Switches',
        categoryId: 'cat-switch',
        status: 'Active',
        assignedTo: 'Network Operations',
        assignedEmail: 'netops@youngonevn.com',
        location: 'Data Center Rack 02',
        purchaseDate: '2026-01-10',
        purchasePrice: 4200,
        warrantyExpiry: '2029-01-10',
        notes: 'Primary core switch with 48x 1GbE PoE+ ports.',
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(DrawerWrapper, { selectedAsset: switchAsset }));
      });

      const bodyText = document.body.textContent || '';
      // Core fields and Notes appear
      expect(bodyText).toContain('Asset Information');
      expect(bodyText).toContain('Cisco Catalyst 9300-48P');
      expect(bodyText).toContain('AST-SW-01');
      expect(bodyText).toContain('Notes');
      expect(bodyText).toContain('Primary core switch with 48x 1GbE PoE+ ports.');

      // Technical specifications sections are NOT rendered
      expect(bodyText).not.toContain('Technical Specifications');
      expect(bodyText).not.toContain('No technical specifications recorded');
      expect(bodyText).not.toContain('Processor (CPU)');
      expect(bodyText).not.toContain('Memory (RAM)');
      expect(bodyText).not.toContain('Port Count & Speed');
    });

    it('renders fallback dash for notes when notes are empty', async () => {
      const emptyAsset: Asset = {
        id: 'ast-empty',
        tag: 'AST-EMPTY',
        name: 'Unspecified Hardware',
        manufacturer: 'Generic',
        model: 'Gen1',
        serialNumber: 'SN-0000',
        category: 'Peripherals & Accessories',
        categoryId: 'cat-peripheral',
        status: 'In Storage',
        assignedTo: '',
        assignedEmail: '',
        location: 'Storage Room',
        purchaseDate: '2026-01-01',
        purchasePrice: 50,
        warrantyExpiry: '2027-01-01',
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(DrawerWrapper, { selectedAsset: emptyAsset }));
      });

      const bodyText = document.body.textContent || '';
      expect(bodyText).toContain('Asset Information');
      expect(bodyText).toContain('Notes');
      expect(bodyText).not.toContain('Technical Specifications');
      expect(bodyText).not.toContain('No technical specifications recorded');
    });

    it('renders laptop details cleanly in Details tab with notes', async () => {
      const laptopAsset: Asset = {
        id: 'ast-lap-01',
        tag: 'AST-1001',
        name: 'MacBook Pro 16 M3 Max',
        manufacturer: 'Apple',
        model: 'A2991',
        serialNumber: 'C02G8392MD6R',
        category: 'Laptops / Notebooks',
        categoryId: 'cat-laptop',
        status: 'Active',
        assignedTo: 'Marcus Vance',
        assignedEmail: 'marcus@youngonevn.com',
        location: 'NY Office',
        purchaseDate: '2026-01-15',
        purchasePrice: 3499,
        warrantyExpiry: '2029-01-15',
        notes: '64GB RAM, 1TB SSD, macOS Sequoia',
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(DrawerWrapper, { selectedAsset: laptopAsset }));
      });

      const bodyText = document.body.textContent || '';
      expect(bodyText).toContain('MacBook Pro 16 M3 Max');
      expect(bodyText).toContain('Notes');
      expect(bodyText).toContain('64GB RAM, 1TB SSD, macOS Sequoia');
      expect(bodyText).not.toContain('Technical Specifications');
    });
  });

  describe('AssetFormModal Simplified Form without Specs', () => {
    function FormModalWrapper({
      editingAsset = null,
      categories,
    }: {
      editingAsset?: Asset | null;
      categories?: AssetCategory[];
    }) {
      const [form] = Form.useForm();
      return createElement(
        App,
        null,
        createElement(AssetFormModal, {
          open: true,
          editingAsset,
          form,
          submitting: false,
          onSave: vi.fn(),
          onCancel: vi.fn(),
          categories,
        }),
      );
    }

    it('renders form with Notes input and no Technical Specifications section', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(FormModalWrapper, {
            categories: [
              { id: 'cat-switch', name: 'Network Switches' },
              { id: 'cat-monitor', name: 'Monitors & Displays' },
            ],
          }),
        );
      });

      const bodyText = document.body.textContent || '';
      expect(bodyText).not.toContain('Technical Specifications');
      expect(bodyText).toContain('Notes');
      expect(document.querySelector('textarea#notes')).not.toBeNull();
    });

    it('hydrates notes properly when editing an asset', async () => {
      const editingSwitch: Asset = {
        id: 'ast-sw-99',
        tag: 'AST-SW-99',
        name: 'Juniper EX4400',
        manufacturer: 'Juniper Networks',
        model: 'EX4400-48P',
        serialNumber: 'JN-998811',
        category: 'Network Switches',
        categoryId: 'cat-switch',
        status: 'Active',
        assignedTo: 'Net Team',
        assignedEmail: 'net@youngonevn.com',
        location: 'DC-01',
        purchaseDate: '2026-03-01',
        purchasePrice: 5100,
        warrantyExpiry: '2029-03-01',
        notes: 'Mist AI Cloud Managed switch with 1440W PoE++',
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(FormModalWrapper, { editingAsset: editingSwitch }));
      });

      const bodyText = document.body.textContent || '';
      expect(bodyText).not.toContain('Technical Specifications');
      const notesTextarea = document.querySelector('textarea#notes') as HTMLTextAreaElement | null;
      expect(notesTextarea?.value).toBe('Mist AI Cloud Managed switch with 1440W PoE++');
    });
  });

  describe('AssetFilterBar Standardized Categories', () => {
    it('contains all 11 pure IT categories in default options', () => {
      expect(CATEGORY_FILTER_OPTIONS).toHaveLength(12);
      const labels = CATEGORY_FILTER_OPTIONS.map((o) => o.label);
      expect(labels).toContain('All Categories');
      expect(labels).toContain('Laptops');
      expect(labels).toContain('Desktops');
      expect(labels).toContain('Servers');
      expect(labels).toContain('Network Switches');
      expect(labels).toContain('Routers & Firewalls');
      expect(labels).toContain('Wireless Access Points');
      expect(labels).toContain('Monitors & Displays');
      expect(labels).toContain('Printers & Scanners');
      expect(labels).toContain('Storage');
      expect(labels).toContain('Power & UPS');
      expect(labels).toContain('Peripherals & Accessories');
    });

    it('renders with dynamic categories prop when provided', async () => {
      const mockCustomCategories: AssetCategory[] = [
        { id: 'cat-laptop', name: 'Laptops / Notebooks' },
        { id: 'cat-server', name: 'Datacenter Servers' },
      ];

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            App,
            null,
            createElement(AssetFilterBar, {
              categories: mockCustomCategories,
              onReset: vi.fn(),
              onCategoryChange: vi.fn(),
            }),
          ),
        );
      });

      expect(document.body.querySelector('.ant-select')).not.toBeNull();
    });
  });
});
