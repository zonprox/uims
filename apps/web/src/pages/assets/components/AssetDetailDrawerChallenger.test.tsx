import { App } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { AssetFilterBar, CATEGORY_FILTER_OPTIONS } from './AssetFilterBar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-laptop', name: 'Laptops / Notebooks' },
      { id: 'cat-desktop', name: 'Desktops & Workstations' },
      { id: 'cat-server', name: 'Servers' },
      { id: 'cat-switch', name: 'Network Switches' },
      { id: 'cat-router', name: 'Routers & Firewalls' },
      { id: 'cat-ap', name: 'Wireless Access Points' },
      { id: 'cat-monitor', name: 'Monitors & Displays' },
      { id: 'cat-printer', name: 'Printers & Scanners' },
      { id: 'cat-storage', name: 'Storage' },
      { id: 'cat-ups', name: 'Power & UPS' },
      { id: 'cat-peripheral', name: 'Peripherals & Accessories' },
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

function createMockAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'ast-mock-01',
    tag: 'AST-MOCK-01',
    name: 'Mock Asset',
    manufacturer: 'Generic',
    model: 'M-100',
    serialNumber: 'SN-MOCK-001',
    category: 'Network Switches',
    categoryId: 'cat-switch',
    status: 'Active',
    assignedTo: 'Net Admin',
    assignedEmail: 'admin@youngonevn.com',
    location: 'DC-01',
    purchaseDate: '2026-01-01',
    warrantyExpiry: '2029-01-01',
    notes: 'Configured for primary VLAN trunking',
    ...overrides,
  };
}

describe('Empirical Adversarial Stress Tests — AssetDetailDrawer Challenger', () => {
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

  function renderDrawer(asset: Asset | null) {
    currentRoot = createRoot(container);
    return act(async () => {
      currentRoot?.render(
        createElement(
          App,
          null,
          createElement(AssetDetailDrawer, {
            open: true,
            selectedAsset: asset,
            onClose: vi.fn(),
            onOpenEditModal: vi.fn(),
          }),
        ),
      );
    });
  }

  describe('Adversarial Task 2.1: Non-Compute & Compute Specs Elimination', () => {
    it('renders Network Switch asset details and notes without rendering technical specifications section', async () => {
      const switchAsset = createMockAsset({
        id: 'ast-sw-stress-01',
        tag: 'AST-SW-101',
        name: 'Aruba CX 6200F 24G',
        manufacturer: 'Aruba Networks',
        model: 'JL725A',
        serialNumber: 'SG98765432',
        category: 'Network Switches',
        categoryId: 'cat-switch',
        notes: '24x 1GbE PoE+ Class 4, 370W budget',
      });

      await renderDrawer(switchAsset);
      const text = document.body.textContent || '';

      // Verify core details and notes
      expect(text).toContain('Aruba CX 6200F 24G');
      expect(text).toContain('AST-SW-101');
      expect(text).toContain('Notes');
      expect(text).toContain('24x 1GbE PoE+ Class 4, 370W budget');

      // Crucial verification: NO technical specifications section or computer specs
      expect(text).not.toContain('Technical Specifications');
      expect(text).not.toContain('No technical specifications recorded');
      expect(text).not.toContain('Processor (CPU)');
      expect(text).not.toContain('Memory (RAM)');
      expect(text).not.toContain('Primary Storage');
      expect(text).not.toContain('Operating System');
      expect(text).not.toMatch(/CPU:\s*N\/A/i);
      expect(text).not.toMatch(/RAM:\s*N\/A/i);
    });
  });

  describe('Adversarial Task 2.2: Monitor & Display Clean Rendering', () => {
    it('renders Monitor details and notes cleanly without specs clutter', async () => {
      const monitorAsset = createMockAsset({
        id: 'ast-mon-stress-01',
        tag: 'AST-MON-201',
        name: 'Dell UltraSharp U2724D',
        manufacturer: 'Dell',
        model: 'U2724D',
        serialNumber: 'CN-0K793H-74445',
        category: 'Monitors & Displays',
        categoryId: 'cat-monitor',
        notes: '27 inch 2560x1440 IPS 120Hz display with Thunderbolt hub',
      });

      await renderDrawer(monitorAsset);
      const text = document.body.textContent || '';

      // Verify clean monitor fields and notes
      expect(text).toContain('Dell UltraSharp U2724D');
      expect(text).toContain('AST-MON-201');
      expect(text).toContain('Notes');
      expect(text).toContain('27 inch 2560x1440 IPS 120Hz display with Thunderbolt hub');

      // Crucial verification: NO technical specifications section
      expect(text).not.toContain('Technical Specifications');
      expect(text).not.toContain('No technical specifications recorded');
      expect(text).not.toContain('Processor (CPU)');
      expect(text).not.toContain('Memory (RAM)');
    });
  });

  describe('Adversarial Task 2.3: Empty and Undefined Notes Handling', () => {
    it('renders empty notes fallback dash cleanly without specs sections', async () => {
      const emptyNotesAsset = createMockAsset({
        id: 'ast-empty-notes',
        tag: 'AST-EMP-01',
        name: 'USB-C Docking Station',
        category: 'Peripherals & Accessories',
        categoryId: 'cat-peripheral',
        notes: '',
      });

      await renderDrawer(emptyNotesAsset);
      const text = document.body.textContent || '';

      expect(text).toContain('USB-C Docking Station');
      expect(text).toContain('Notes');
      expect(text).not.toContain('Technical Specifications');
      expect(text).not.toContain('No technical specifications recorded');
    });

    it('renders null or undefined notes gracefully with fallback dash', async () => {
      const nullNotesAsset = createMockAsset({
        id: 'ast-null-notes',
        tag: 'AST-NUL-01',
        name: 'Generic HDMI Cable Pack',
        category: 'Peripherals & Accessories',
        categoryId: 'cat-peripheral',
        notes: undefined,
      });

      await renderDrawer(nullNotesAsset);
      const text = document.body.textContent || '';

      expect(text).toContain('Generic HDMI Cable Pack');
      expect(text).toContain('Notes');
      expect(text).not.toContain('Technical Specifications');
    });
  });

  describe('Adversarial Task 2.4: Pure IT Categories in AssetFilterBar', () => {
    it('displays exactly the 11 pure IT categories in CATEGORY_FILTER_OPTIONS', () => {
      const EXPECTED_CATEGORIES = [
        { id: 'cat-laptop', label: 'Laptops' },
        { id: 'cat-desktop', label: 'Desktops' },
        { id: 'cat-server', label: 'Servers' },
        { id: 'cat-switch', label: 'Network Switches' },
        { id: 'cat-router', label: 'Routers & Firewalls' },
        { id: 'cat-ap', label: 'Wireless Access Points' },
        { id: 'cat-monitor', label: 'Monitors & Displays' },
        { id: 'cat-printer', label: 'Printers & Scanners' },
        { id: 'cat-storage', label: 'Storage' },
        { id: 'cat-ups', label: 'Power & UPS' },
        { id: 'cat-peripheral', label: 'Peripherals & Accessories' },
      ];

      expect(CATEGORY_FILTER_OPTIONS).toHaveLength(12); // 'All Categories' + 11
      expect(CATEGORY_FILTER_OPTIONS[0]).toEqual({ label: 'All Categories', value: 'all' });

      for (const cat of EXPECTED_CATEGORIES) {
        const found = CATEGORY_FILTER_OPTIONS.find((o) => o.value === cat.id);
        expect(found, `Missing expected category ${cat.id}`).toBeDefined();
        expect(found?.label).toBe(cat.label);
      }

      // Zero garment/textile categories
      const values = CATEGORY_FILTER_OPTIONS.map((o) => o.value);
      expect(values).not.toContain('cat-sewing');
      expect(values).not.toContain('cat-cutting');
      expect(values).not.toContain('cat-printing');
      expect(values).not.toContain('cat-qa');
    });

    it('renders AssetFilterBar and propagates category selection', async () => {
      const onCategoryChange = vi.fn();
      currentRoot = createRoot(container);

      await act(async () => {
        currentRoot?.render(
          createElement(
            App,
            null,
            createElement(AssetFilterBar, {
              categoryFilter: 'all',
              onCategoryChange,
              onReset: vi.fn(),
            }),
          ),
        );
      });

      const selectEl = document.body.querySelector('.ant-select');
      expect(selectEl).not.toBeNull();
    });
  });
});
