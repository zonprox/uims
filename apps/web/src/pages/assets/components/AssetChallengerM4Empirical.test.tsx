import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../services/api';
import { type Asset } from '../../../services/assets.service';
import AssetsPage from '../AssetsPage';
import { BatchPrintModal } from './BatchPrintModal';
import { DeviceModelDrawer } from './DeviceModelDrawer';
import { PhysicalUnitModal } from './PhysicalUnitModal';
import { PrintableAssetLabel } from './PrintableAssetLabel';
import { PrintableAssetSheet } from './PrintableAssetSheet';
import {
  generateBatchPrintSheetHtml,
  generatePrintLabelHtml,
  sanitizePrintableAsset,
} from '../utils/printAssetLabel';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNotificationError = vi.fn();
const mockNotificationWarning = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();
const mockMessageWarning = vi.fn();

const mockAppContext = {
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    warning: mockMessageWarning,
    info: vi.fn(),
  },
  modal: {
    confirm: vi.fn(),
  },
  notification: {
    error: mockNotificationError,
    warning: mockNotificationWarning,
    success: vi.fn(),
    info: vi.fn(),
    destroy: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('antd');
  return {
    ...actual,
    App: {
      ...((actual.App as Record<string, unknown>) || {}),
      useApp: () => mockAppContext,
    },
  };
});

function createMockAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'ast-default',
    tag: 'AST-DEFAULT',
    name: 'Default Device',
    manufacturer: 'Dell',
    model: 'Latitude 5420',
    category: 'Laptops / Notebooks',
    categoryId: 'cat-laptop',
    status: 'Active',
    assignedTo: '',
    assignedEmail: '',
    purchaseDate: '2026-01-01',
    warrantyExpiry: '2029-01-01',
    ...overrides,
  };
}

vi.mock('../../../services/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/assets/models') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'mod-1',
                name: 'Dell Latitude 5420',
                assetCode: 'MOD-DELL-5420',
                totalUnits: 5,
                availableUnits: 3,
                inUseUnits: 2,
              },
            ],
          },
        });
      }
      if (url === '/assets/cost-centers') {
        return Promise.resolve({
          data: {
            data: [
              { id: 'cc-it-ops', code: 'IT-OPS', name: 'IT Operations' },
              { id: 'cc-eng-dev', code: 'ENG-DEV', name: 'Software Engineering' },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getAssets: vi.fn().mockResolvedValue([
      createMockAsset({
        id: 'ast-001',
        tag: 'AST-001',
        subcode: 'AST-001',
        name: 'Dell Latitude 5420 #1',
        serialNumber: 'SN-DELL-001',
        costCenter: { code: 'IT-OPS', name: 'IT Operations' },
        purchaseDate: '2026-02-10',
      }),
      createMockAsset({
        id: 'ast-002',
        tag: 'AST-002',
        subcode: 'AST-002',
        name: 'Dell Latitude 5420 #2',
        serialNumber: 'SN-DELL-002',
        status: 'In Storage',
        costCenter: { code: 'IT-OPS', name: 'IT Operations' },
        purchaseDate: '2026-02-10',
      }),
    ]),
    getStats: vi.fn().mockResolvedValue({
      total: 2,
      active: 1,
      inRepair: 0,
      inStorage: 1,
      retired: 0,
    }),
    getCategories: vi.fn().mockResolvedValue([{ id: 'cat-laptop', name: 'Laptops / Notebooks' }]),
    createAsset: vi.fn().mockResolvedValue({ id: 'ast-003', tag: 'AST-003' }),
    updateAsset: vi.fn().mockResolvedValue({ id: 'ast-001', tag: 'AST-001' }),
    deleteAsset: vi.fn().mockResolvedValue({ success: true }),
    batchDeleteAssets: vi.fn().mockResolvedValue({ count: 2 }),
    batchAssignAssets: vi.fn().mockResolvedValue({ count: 2 }),
    exportCsv: vi.fn().mockResolvedValue('Tag,Name\nAST-001,Laptop'),
    exportXlsx: vi.fn().mockResolvedValue(new Blob()),
  },
}));

vi.mock('../../../services/organization.service', () => ({
  organizationService: {
    getOrganizations: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
    getLocationTree: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

describe('Empirical Adversarial Stress Suite — Milestone M4 Challenger', () => {
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
    container?.remove();
    document.body.innerHTML = '';
  });

  // =========================================================================
  // CHALLENGE 1: HTTP 409 Conflict Handling on DeviceModelDrawer & PhysicalUnitModal
  // =========================================================================
  describe('Challenge 1: HTTP 409 Conflict Handling', () => {
    it('1.1: DeviceModelDrawer surfaces actionable notification.error on create duplicate assetCode (409)', async () => {
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Asset code already exists' } },
      });

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(DeviceModelDrawer, {
                open: true,
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      const codeInput = document.body.querySelector(
        'input[placeholder="e.g. MOD-DELL-5420"]',
      ) as HTMLInputElement;
      const nameInput = document.body.querySelector(
        'input[placeholder="e.g. Dell Latitude 5420 Rugged"]',
      ) as HTMLInputElement;

      await act(async () => {
        const setCode = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setCode?.call(codeInput, 'mod-dell-conflict');
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        codeInput.dispatchEvent(new Event('change', { bubbles: true }));

        setCode?.call(nameInput, 'Dell Latitude Conflict');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Create Model'),
      );

      await act(async () => {
        submitBtn?.click();
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Duplicate Asset Code',
          description: expect.stringContaining('MOD-DELL-CONFLICT'),
        }),
      );
    });

    it('1.2: DeviceModelDrawer surfaces actionable notification.error on edit duplicate assetCode (409)', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Asset code already exists' } },
      });

      const existingModel: Asset = createMockAsset({
        id: 'mod-1',
        tag: 'MOD-DELL-5420',
        assetCode: 'MOD-DELL-5420',
        name: 'Dell Latitude 5420',
        manufacturer: 'Dell',
        model: 'Latitude 5420',
      });

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(DeviceModelDrawer, {
                open: true,
                editingModel: existingModel,
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Save Changes'),
      );

      await act(async () => {
        submitBtn?.click();
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Duplicate Asset Code',
          description: expect.stringContaining('MOD-DELL-5420'),
        }),
      );
    });

    it('1.3: PhysicalUnitModal surfaces actionable notification.error on create duplicate subcode (409)', async () => {
      vi.mocked(api.post).mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Subcode already exists' } },
      });

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(PhysicalUnitModal, {
                open: true,
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      const subcodeInput = document.body.querySelector(
        'input[placeholder="e.g. AST-DELL-001"]',
      ) as HTMLInputElement;

      await act(async () => {
        const setCode = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setCode?.call(subcodeInput, 'ast-unit-conflict');
        subcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
        subcodeInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Register Unit'),
      );

      await act(async () => {
        submitBtn?.click();
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Duplicate SUB Code',
          description: expect.stringContaining('AST-UNIT-CONFLICT'),
        }),
      );
    });

    it('1.4: PhysicalUnitModal surfaces actionable notification.error on edit duplicate subcode (409)', async () => {
      vi.mocked(api.patch).mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Subcode already exists' } },
      });

      const existingUnit: Asset = createMockAsset({
        id: 'ast-001',
        tag: 'AST-EXISTING-001',
        subcode: 'AST-EXISTING-001',
        name: 'Unit 1',
        status: 'Active',
      });

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(PhysicalUnitModal, {
                open: true,
                editingAsset: existingUnit,
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Save Changes'),
      );

      await act(async () => {
        submitBtn?.click();
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Duplicate SUB Code',
          description: expect.stringContaining('AST-EXISTING-001'),
        }),
      );
    });

    it('1.5: Non-409 errors (e.g. 500) trigger message.error instead of duplicate notifications', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(new Error('Internal Server Error 500'));

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(DeviceModelDrawer, {
                open: true,
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      const codeInput = document.body.querySelector(
        'input[placeholder="e.g. MOD-DELL-5420"]',
      ) as HTMLInputElement;
      const nameInput = document.body.querySelector(
        'input[placeholder="e.g. Dell Latitude 5420 Rugged"]',
      ) as HTMLInputElement;

      await act(async () => {
        const setCode = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setCode?.call(codeInput, 'MOD-OK-01');
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        codeInput.dispatchEvent(new Event('change', { bubbles: true }));

        setCode?.call(nameInput, 'Dell Latitude OK');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Create Model'),
      );

      await act(async () => {
        submitBtn?.click();
      });

      expect(mockNotificationError).not.toHaveBeenCalled();
      expect(mockMessageError).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // CHALLENGE 2: PrintableAssetLabel & PrintableAssetSheet with Null/Empty Optional Fields
  // =========================================================================
  describe('Challenge 2: Robustness with Null/Empty Optional Fields', () => {
    it('2.1: PrintableAssetLabel renders safely with all optional fields null/undefined and produces no [object Object]', async () => {
      const sparseAsset: Asset = createMockAsset({
        id: 'ast-sparse-001',
        tag: 'AST-SPARSE',
        name: '',
        manufacturer: '',
        model: '',
        serialNumber: null,
        category: '',
        categoryId: null,
        status: 'Active',
        assignedTo: '',
        assignedToId: null,
        costCenter: null,
        costCenterId: null,
        purchaseDate: '',
        warrantyExpiry: '',
        notes: undefined,
        parent: null,
      });

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(PrintableAssetLabel, { asset: sparseAsset }),
          ),
        );
      });

      const text = container.textContent || '';
      expect(text).not.toContain('[object Object]');
      expect(text).not.toContain('undefined');
      expect(text).not.toContain('null');
      expect(text).toContain('IT ASSET TAGGING');
      expect(text).toContain('SAP Code:');
      expect(text).toContain('SUB Code:');
      expect(text).toContain('Model:');
      expect(text).toContain('Date:');
      expect(text).toContain('Cost Center:');
      // S/N should NOT be rendered when serialNumber is missing
      expect(text).not.toContain('S/N:');
    });

    it('2.2: PrintableAssetLabel renders safely when costCenter is an object without name, empty object, or string', async () => {
      const assetWithCcObj: Asset = createMockAsset({
        id: 'ast-cc-001',
        tag: 'AST-CC-001',
        name: 'Device with CC Code Only',
        costCenter: { id: 'cc-fin', code: 'FIN-ACC' },
        status: 'Active',
      });

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(PrintableAssetLabel, { asset: assetWithCcObj }),
          ),
        );
      });

      const text = container.textContent || '';
      expect(text).not.toContain('[object Object]');
      expect(text).toContain('FIN-ACC');
    });

    it('2.3: PrintableAssetSheet renders multiple sparse assets without crash or [object Object]', async () => {
      const assets: Asset[] = [
        createMockAsset({
          id: 'ast-1',
          tag: 'AST-1',
          name: '',
          serialNumber: null,
          costCenter: null,
          purchaseDate: '',
        }),
        createMockAsset({
          id: 'ast-2',
          tag: 'AST-2',
          name: 'Device 2',
          serialNumber: '',
          costCenter: 'ENG-DEV',
          purchaseDate: '2026-03-01',
        }),
        createMockAsset({
          id: 'ast-3',
          tag: 'AST-3',
          name: 'Device 3',
          serialNumber: 'SN-9999',
          costCenter: { code: 'HR-ADMIN', name: 'HR Dept' },
        }),
      ];

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(PrintableAssetSheet, { assets, columns: 3 }),
          ),
        );
      });

      const text = container.textContent || '';
      expect(text).not.toContain('[object Object]');
      expect(text).not.toContain('null');
      expect(text).not.toContain('undefined');
      expect(text).toContain('AST-1');
      expect(text).toContain('AST-2');
      expect(text).toContain('AST-3');
      expect(text).not.toContain('SN-9999');
    });

    it('2.4: sanitizePrintableAsset safely handles null, undefined, and non-object inputs', () => {
      const nullSanitized = sanitizePrintableAsset(null);
      expect(nullSanitized.tag).toBe('UNKNOWN-TAG');
      expect(nullSanitized.costCenter).toBe('IT-OPS');

      const undefinedSanitized = sanitizePrintableAsset(undefined);
      expect(undefinedSanitized.tag).toBe('UNKNOWN-TAG');

      const emptyObjSanitized = sanitizePrintableAsset({});
      expect(emptyObjSanitized.tag).toBe('UNKNOWN-TAG');
    });
  });

  // =========================================================================
  // CHALLENGE 3: Strict Adherence to "IT ASSET TAGGING" Specification
  // =========================================================================
  describe('Challenge 3: Strict Adherence to "IT ASSET TAGGING"', () => {
    const testAsset: Asset = createMockAsset({
      id: 'ast-tag-001',
      tag: 'AST-001',
      subcode: 'AST-001',
      assetCode: 'MOD-DELL-5420',
      name: 'Dell Latitude 5420',
      manufacturer: 'Dell',
      model: 'Latitude 5420',
      serialNumber: 'SN-DELL-001',
      costCenter: { code: 'IT-OPS', name: 'IT Operations' },
      purchaseDate: '2026-02-15',
      status: 'Active',
    });

    it('3.1: Zero logos rendered anywhere in PrintableAssetLabel', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(PrintableAssetLabel, { asset: testAsset }),
          ),
        );
      });

      // Assert zero <img> tags
      const images = container.querySelectorAll('img');
      expect(images.length).toBe(0);

      // Assert zero logo SVG or classes
      const logoSvgs = container.querySelectorAll(
        '.ant-image, .enterprise-logo, [data-icon="logo"]',
      );
      expect(logoSvgs.length).toBe(0);
    });

    it('3.2: Zero logos rendered anywhere in PrintableAssetSheet', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(PrintableAssetSheet, { assets: [testAsset], columns: 3 }),
          ),
        );
      });

      const images = container.querySelectorAll('img');
      expect(images.length).toBe(0);
    });

    it('3.3: Header text is strictly "IT ASSET TAGGING"', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(PrintableAssetLabel, { asset: testAsset }),
          ),
        );
      });

      const headerDiv = Array.from(container.querySelectorAll('div')).find(
        (el) => el.textContent?.trim() === 'IT ASSET TAGGING',
      );
      expect(headerDiv).toBeDefined();
      expect(headerDiv?.textContent?.trim()).toBe('IT ASSET TAGGING');
    });

    it('3.4: Date field is formatted YYYY-MM-DD and appears immediately before Cost Center in DOM order', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(PrintableAssetLabel, { asset: testAsset }),
          ),
        );
      });

      // Find the metadata items in the right column
      const metaContainer = container.querySelector('.printable-asset-label > div:nth-child(2)');
      expect(metaContainer).toBeDefined();

      const text = metaContainer?.textContent || '';
      expect(text).toContain('Date: 2026-02-15');

      // Check relative order of Date and Cost Center
      const dateIndex = text.indexOf('Date:');
      const costCenterIndex = text.indexOf('Cost Center:');
      expect(dateIndex).toBeGreaterThan(-1);
      expect(costCenterIndex).toBeGreaterThan(-1);
      // Date must appear before Cost Center
      expect(dateIndex).toBeLessThan(costCenterIndex);
      // Verify Date is immediately before Cost Center (no intervening Model or SAP Code)
      const substringBetween = text.slice(dateIndex, costCenterIndex);
      expect(substringBetween).not.toContain('SAP Code:');
      expect(substringBetween).not.toContain('SUB Code:');
      expect(substringBetween).not.toContain('Model:');
    });

    it('3.5: PrintableAssetSheet card cut guides have dashed border (1.5px dashed #777777)', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(PrintableAssetSheet, { assets: [testAsset], columns: 3 }),
          ),
        );
      });

      const card = container.querySelector('.printable-sheet-card') as HTMLDivElement;
      expect(card).toBeDefined();
      expect(card.style.border).toContain('1.5px dashed');
      expect(card.style.border).toContain('#777777');
    });

    it('3.6: HTML generators in printAssetLabel.ts strictly uphold "IT ASSET TAGGING", zero logos, and dashed cut guides', () => {
      const htmlSingle = generatePrintLabelHtml(testAsset, 'data:image/svg+xml;base64,mock');
      expect(htmlSingle).toContain('IT ASSET TAGGING');
      expect(htmlSingle).toContain('1.5px dashed #777777');
      expect(htmlSingle).not.toContain('logo');
      const datePos = htmlSingle.indexOf('Date:');
      const ccPos = htmlSingle.indexOf('Cost Center:');
      expect(datePos).toBeLessThan(ccPos);

      const htmlBatch = generateBatchPrintSheetHtml('<div>Mock Card</div>', 3);
      expect(htmlBatch).toContain('1.5px dashed #777777');
      expect(htmlBatch).not.toContain('logo');
    });
  });

  // =========================================================================
  // CHALLENGE 4: Batch Selection Toolbar & Batch Print Modal
  // =========================================================================
  describe('Challenge 4: Batch Selection Toolbar & Batch Print Modal', () => {
    it('4.1: Multi-select physical units displays sticky batch toolbar and opens BatchPrintModal with correct unit count', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(App, null, createElement(MemoryRouter, null, createElement(AssetsPage))),
          ),
        );
      });

      // Select row 1
      const initialBoxes = document.body.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      expect(initialBoxes.length).toBeGreaterThanOrEqual(2);

      await act(async () => {
        initialBoxes[0].click();
      });

      // Re-query fresh checkboxes after table re-render and select row 2
      const updatedBoxes = document.body.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        updatedBoxes[1].click();
      });

      // Verify sticky toolbar appears with selected count
      expect(document.body.textContent).toContain('Selected 2 assets');

      // Verify "Batch Print QR" button is present in the toolbar
      const printBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Batch Print QR'),
      );
      expect(printBtn).toBeDefined();

      // Click "Batch Print QR"
      await act(async () => {
        printBtn?.click();
      });

      // Verify BatchPrintModal opens with correct count
      expect(document.body.textContent).toContain('Batch Print QR Labels (2 Selected)');
      expect(document.body.textContent).toContain('Layout Density:');
      expect(document.body.textContent).toContain('3 Columns (Standard)');
      expect(document.body.textContent).toContain('4 Columns (Compact)');

      // Verify Print Sheet button is active (not disabled)
      const modalPrintBtn = Array.from(
        document.body.querySelectorAll('.ant-modal-footer button'),
      ).find((b) => b.textContent?.includes('Print Sheet'));
      expect(modalPrintBtn).toBeDefined();
      expect(modalPrintBtn?.hasAttribute('disabled')).toBe(false);

      // Verify 2 label cards rendered in the print sheet viewport
      const cards = document.body.querySelectorAll('.printable-sheet-card');
      expect(cards.length).toBe(2);

      // Close modal
      const closeBtn = Array.from(document.body.querySelectorAll('.ant-modal-footer button')).find(
        (b) => b.textContent?.includes('Close'),
      );
      await act(async () => {
        (closeBtn as HTMLElement)?.click();
      });

      // Click "Clear Selection" in toolbar
      const clearBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Clear Selection'),
      );
      expect(clearBtn).toBeDefined();
      await act(async () => {
        clearBtn?.click();
      });

      // Toolbar is dismissed
      expect(document.body.textContent).not.toContain('Selected 2 assets');
    });

    it('4.2: BatchPrintModal density segmented toggles between 3 and 4 column grid layouts', async () => {
      const mockUnits: Asset[] = [
        createMockAsset({ id: 'u-1', tag: 'AST-001', name: 'Unit 1' }),
        createMockAsset({ id: 'u-2', tag: 'AST-002', name: 'Unit 2' }),
      ];

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(BatchPrintModal, {
                open: true,
                assets: mockUnits,
                onClose: vi.fn(),
              }),
            ),
          ),
        );
      });

      expect(document.body.textContent).toContain('Batch Print QR Labels (2 Selected)');

      // Initial density is 3 cols
      const sheet = document.body.querySelector('.printable-asset-sheet') as HTMLDivElement;
      expect(sheet).toBeDefined();
      expect(sheet.classList.contains('cols-3')).toBe(true);

      // Switch to 4 cols compact
      const compactOption = Array.from(
        document.body.querySelectorAll('.ant-segmented-item-label'),
      ).find((el) => el.textContent?.includes('4 Columns'));
      expect(compactOption).toBeDefined();

      await act(async () => {
        (compactOption?.closest('.ant-segmented-item') as HTMLElement)?.click();
      });

      expect(sheet.classList.contains('cols-4')).toBe(true);
    });
  });
});
