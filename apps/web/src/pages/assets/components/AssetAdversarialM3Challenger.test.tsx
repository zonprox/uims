import { App, Form, type FormInstance } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Asset, assetsService } from '../../../services/assets.service';
import { api } from '../../../services/api';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { AssetFormModal } from './AssetFormModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

function createTestAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'ast-adv-001',
    tag: 'AST-ADV-001',
    name: 'MacBook Pro 16 M3 Max',
    manufacturer: 'Apple',
    model: 'A2991',
    serialNumber: 'ABC-123',
    category: 'Laptops / Notebooks',
    categoryId: 'cat-laptop',
    status: 'Active',
    assignedTo: 'Jane Doe',
    assignedEmail: 'jane.doe@enterprise.com',
    purchaseDate: '2026-01-15',
    warrantyExpiry: '2029-01-15',
    notes: 'Primary engineering workstation',
    ...overrides,
  };
}

describe('Empirical Adversarial Verification Suite — M3 Frontend Asset UI (R1 & R2)', () => {
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

  describe('1. AssetFormModal Adversarial Verification (R1 & R2)', () => {
    it('submits successfully when serialNumber is completely omitted (R1)', async () => {
      const captured = { values: null as Record<string, unknown> | null };
      const formRef = { current: null as FormInstance | null };

      const TestFormController: React.FC = () => {
        const [form] = Form.useForm();
        formRef.current = form;

        const handleSave = async () => {
          const values = await form.validateFields();
          captured.values = values;
        };

        return createElement(
          App,
          null,
          createElement(AssetFormModal, {
            open: true,
            editingAsset: null,
            form,
            submitting: false,
            onSave: handleSave,
            onCancel: vi.fn(),
          }),
        );
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestFormController));
      });

      // Set valid required fields WITHOUT providing serialNumber (omitted)
      await act(async () => {
        formRef.current?.setFieldsValue({
          tag: 'AST-OMIT-SN',
          name: 'Dell PowerEdge R750',
          manufacturer: 'Dell',
          categoryId: 'cat-server',
          status: 'Active',
          // serialNumber is intentionally omitted!
        });
      });

      // Ensure label does not have required asterisk
      const serialLabel = Array.from(document.querySelectorAll('label')).find((l) =>
        l.textContent?.includes('Serial Number'),
      );
      expect(serialLabel).toBeDefined();
      expect(serialLabel?.classList.contains('ant-form-item-required')).toBe(false);

      // Trigger ok button
      const okBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Create Asset'),
      );
      expect(okBtn).toBeDefined();

      await act(async () => {
        okBtn?.click();
      });

      // Validation succeeds, onSubmit callback triggered
      expect(captured.values).not.toBeNull();
      expect(captured.values?.tag).toBe('AST-OMIT-SN');
      expect(captured.values?.name).toBe('Dell PowerEdge R750');
      expect(captured.values?.serialNumber).toBeUndefined();

      // No validation errors in form
      expect(document.querySelector('.ant-form-item-has-error')).toBeNull();
    });

    it('submits without validation error when serialNumber is empty string "" (R1)', async () => {
      const captured = { values: null as Record<string, unknown> | null };
      const formRef = { current: null as FormInstance | null };

      const TestFormController: React.FC = () => {
        const [form] = Form.useForm();
        formRef.current = form;

        const handleSave = async () => {
          const values = await form.validateFields();
          captured.values = values;
        };

        return createElement(
          App,
          null,
          createElement(AssetFormModal, {
            open: true,
            editingAsset: null,
            form,
            submitting: false,
            onSave: handleSave,
            onCancel: vi.fn(),
          }),
        );
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestFormController));
      });

      await act(async () => {
        formRef.current?.setFieldsValue({
          tag: 'AST-EMPTY-SN',
          name: 'ThinkPad T14s',
          manufacturer: 'Lenovo',
          categoryId: 'cat-laptop',
          status: 'Active',
          serialNumber: '', // Empty string
        });
      });

      // Trigger Save
      const okBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Create Asset'),
      );
      expect(okBtn).toBeDefined();

      await act(async () => {
        okBtn?.click();
      });

      expect(captured.values).not.toBeNull();
      expect(captured.values?.tag).toBe('AST-EMPTY-SN');
      expect(captured.values?.serialNumber).toBe('');
      // No validation error
      expect(document.querySelector('.ant-form-item-has-error')).toBeNull();
    });

    it('submits without validation error when serialNumber is null (R1)', async () => {
      const captured = { values: null as Record<string, unknown> | null };
      const formRef = { current: null as FormInstance | null };

      const TestFormController: React.FC = () => {
        const [form] = Form.useForm();
        formRef.current = form;

        const handleSave = async () => {
          const values = await form.validateFields();
          captured.values = values;
        };

        return createElement(
          App,
          null,
          createElement(AssetFormModal, {
            open: true,
            editingAsset: null,
            form,
            submitting: false,
            onSave: handleSave,
            onCancel: vi.fn(),
          }),
        );
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestFormController));
      });

      await act(async () => {
        formRef.current?.setFieldsValue({
          tag: 'AST-NULL-SN',
          name: 'Cisco Catalyst 9300',
          manufacturer: 'Cisco',
          categoryId: 'cat-switch',
          status: 'Active',
          serialNumber: null, // null value
        });
      });

      const okBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Create Asset'),
      );
      expect(okBtn).toBeDefined();

      await act(async () => {
        okBtn?.click();
      });

      expect(captured.values).not.toBeNull();
      expect(captured.values?.tag).toBe('AST-NULL-SN');
      expect(captured.values?.serialNumber).toBeNull();
      expect(document.querySelector('.ant-form-item-has-error')).toBeNull();
    });

    it('verifies Category and Status occupy exactly span={12} each (24 total) with zero dead whitespace (R2)', async () => {
      currentRoot = createRoot(container);

      const TestWrapper: React.FC = () => {
        const [form] = Form.useForm();
        return createElement(
          App,
          null,
          createElement(AssetFormModal, {
            open: true,
            editingAsset: null,
            form,
            submitting: false,
            onSave: vi.fn(),
            onCancel: vi.fn(),
          }),
        );
      };

      await act(async () => {
        currentRoot?.render(createElement(TestWrapper));
      });

      const labels = Array.from(document.querySelectorAll('label'));
      const categoryLabel = labels.find((l) => l.textContent?.includes('Category'));
      const statusLabel = labels.find((l) => l.textContent?.includes('Status'));

      expect(categoryLabel).toBeDefined();
      expect(statusLabel).toBeDefined();

      const categoryItem = categoryLabel?.closest('.ant-form-item');
      const statusItem = statusLabel?.closest('.ant-form-item');

      expect(categoryItem).not.toBeNull();
      expect(statusItem).not.toBeNull();

      // Outer Col wrapping the Form.Item
      const categoryCol =
        categoryItem?.parentElement?.closest('.ant-col') ||
        categoryItem?.closest('.ant-row > .ant-col');
      const statusCol =
        statusItem?.parentElement?.closest('.ant-col') ||
        statusItem?.closest('.ant-row > .ant-col');

      expect(categoryCol).not.toBeNull();
      expect(statusCol).not.toBeNull();

      // Ant Design applies 'ant-col-12' for span={12}
      expect(categoryCol?.classList.contains('ant-col-12')).toBe(true);
      expect(statusCol?.classList.contains('ant-col-12')).toBe(true);

      // Verify they are sibling columns under the exact same Row parent
      expect(categoryCol?.parentElement).toBe(statusCol?.parentElement);
      const parentRow = categoryCol?.parentElement;
      expect(parentRow?.classList.contains('ant-row')).toBe(true);

      // Verify only these 2 columns exist in this Row (12 + 12 = 24 cols)
      const siblingCols = parentRow?.querySelectorAll(':scope > .ant-col');
      expect(siblingCols?.length).toBe(2);
    });

    it('verifies purchasePrice form item does NOT exist in DOM and form values do not contain it (R2)', async () => {
      const formRef = { current: null as FormInstance | null };

      const TestWrapper: React.FC = () => {
        const [form] = Form.useForm();
        formRef.current = form;
        return createElement(
          App,
          null,
          createElement(AssetFormModal, {
            open: true,
            editingAsset: null,
            form,
            submitting: false,
            onSave: vi.fn(),
            onCancel: vi.fn(),
          }),
        );
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestWrapper));
      });

      // 1. Check DOM inputs
      expect(document.querySelector('[id*="purchasePrice"]')).toBeNull();
      expect(document.querySelector('[name*="purchasePrice"]')).toBeNull();
      expect(document.querySelector('[id*="purchaseCost"]')).toBeNull();
      expect(document.querySelector('[name*="purchaseCost"]')).toBeNull();

      // 2. Check modal text content
      const modalText = document.querySelector('.ant-modal-content')?.textContent || '';
      expect(modalText).not.toContain('Purchase Price');
      expect(modalText).not.toContain('purchasePrice');
      expect(modalText).not.toContain('Purchase Cost');
      expect(modalText).not.toContain('purchaseCost');

      // 3. Check Form values
      const initialValues = formRef.current?.getFieldsValue() || {};
      expect(initialValues.purchasePrice).toBeUndefined();
      expect(initialValues.purchaseCost).toBeUndefined();
    });
  });

  describe('2. AssetDetailDrawer Adversarial Verification (R1 & R2)', () => {
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

    it('renders em-dash "—" and NO copy button when serialNumber is null (R1)', async () => {
      const assetWithNullSN = createTestAsset({
        serialNumber: null,
      });

      await renderDrawer(assetWithNullSN);

      // Find the Serial Number row in Descriptions
      const descriptionsRows = Array.from(document.querySelectorAll('.ant-descriptions-row'));
      const snRow = descriptionsRows.find((row) =>
        row.querySelector('.ant-descriptions-item-label')?.textContent?.includes('Serial Number'),
      );
      expect(snRow).toBeDefined();

      const snContent = snRow?.querySelector('.ant-descriptions-item-content');
      expect(snContent?.textContent?.trim()).toBe('—');

      // Crucial: Copy button must NOT be present
      const copyBtn = snContent?.querySelector('.ant-typography-copy');
      expect(copyBtn).toBeNull();
    });

    it('renders em-dash "—" and NO copy button when serialNumber is undefined (R1)', async () => {
      const assetWithUndefinedSN = createTestAsset({
        serialNumber: undefined,
      });

      await renderDrawer(assetWithUndefinedSN);

      const descriptionsRows = Array.from(document.querySelectorAll('.ant-descriptions-row'));
      const snRow = descriptionsRows.find((row) =>
        row.querySelector('.ant-descriptions-item-label')?.textContent?.includes('Serial Number'),
      );
      expect(snRow).toBeDefined();

      const snContent = snRow?.querySelector('.ant-descriptions-item-content');
      expect(snContent?.textContent?.trim()).toBe('—');

      const copyBtn = snContent?.querySelector('.ant-typography-copy');
      expect(copyBtn).toBeNull();
    });

    it('renders em-dash "—" and NO copy button when serialNumber is empty string "" (R1)', async () => {
      const assetWithEmptySN = createTestAsset({
        serialNumber: '',
      });

      await renderDrawer(assetWithEmptySN);

      const descriptionsRows = Array.from(document.querySelectorAll('.ant-descriptions-row'));
      const snRow = descriptionsRows.find((row) =>
        row.querySelector('.ant-descriptions-item-label')?.textContent?.includes('Serial Number'),
      );
      expect(snRow).toBeDefined();

      const snContent = snRow?.querySelector('.ant-descriptions-item-content');
      expect(snContent?.textContent?.trim()).toBe('—');

      const copyBtn = snContent?.querySelector('.ant-typography-copy');
      expect(copyBtn).toBeNull();
    });

    it('renders valid serial number "ABC-123" with functional copy button (R1)', async () => {
      const assetWithValidSN = createTestAsset({
        serialNumber: 'ABC-123',
      });

      await renderDrawer(assetWithValidSN);

      const descriptionsRows = Array.from(document.querySelectorAll('.ant-descriptions-row'));
      const snRow = descriptionsRows.find((row) =>
        row.querySelector('.ant-descriptions-item-label')?.textContent?.includes('Serial Number'),
      );
      expect(snRow).toBeDefined();

      const snContent = snRow?.querySelector('.ant-descriptions-item-content');
      expect(snContent?.textContent).toContain('ABC-123');

      // Copy button MUST be present
      const copyBtn = snContent?.querySelector('.ant-typography-copy');
      expect(copyBtn).not.toBeNull();
    });

    it('verifies "Purchase Price" does NOT appear anywhere in descriptions, and section title is "Lifecycle & Warranty" (R2)', async () => {
      const asset = createTestAsset({
        purchaseDate: '2026-03-01',
        warrantyExpiry: '2029-03-01',
      });

      await renderDrawer(asset);

      const drawerBody = document.querySelector('.ant-drawer-body');
      expect(drawerBody).not.toBeNull();
      const bodyText = drawerBody?.textContent || '';

      // Section title must be "Lifecycle & Warranty"
      expect(bodyText).toContain('Lifecycle & Warranty');

      // "Purchase Price" and "Purchase Cost" must be 100% absent
      expect(bodyText).not.toContain('Purchase Price');
      expect(bodyText).not.toContain('purchasePrice');
      expect(bodyText).not.toContain('Purchase Cost');
      expect(bodyText).not.toContain('purchaseCost');

      // Verify exact items in Lifecycle & Warranty section
      const descriptionsHeaders = Array.from(document.querySelectorAll('.ant-descriptions-title'));
      const lifecycleHeader = descriptionsHeaders.find((h) =>
        h.textContent?.includes('Lifecycle & Warranty'),
      );
      expect(lifecycleHeader).toBeDefined();

      const lifecycleDesc = lifecycleHeader?.closest('.ant-descriptions');
      const labels = Array.from(
        lifecycleDesc?.querySelectorAll('.ant-descriptions-item-label') || [],
      ).map((l) => l.textContent?.trim());

      expect(labels).toContain('Purchase Date');
      expect(labels).toContain('Warranty Expiration');
      expect(labels).not.toContain('Purchase Price');
      expect(labels).not.toContain('Purchase Cost');
    });
  });

  describe('3. CSV Export Adversarial Verification (R2)', () => {
    it('verifies "Purchase Price" and "Purchase Cost" columns and values are completely absent from generated CSV (R2)', async () => {
      const mockAssetData: Asset[] = [
        createTestAsset({
          id: 'ast-csv-1',
          tag: 'AST-CSV-101',
          name: 'ThinkPad P16 Gen 2',
          manufacturer: 'Lenovo',
          model: '21FA0025US',
          category: 'Laptops / Notebooks',
          status: 'Active',
          assignedTo: 'Alice Smith',
        }),
        createTestAsset({
          id: 'ast-csv-2',
          tag: 'AST-CSV-102',
          name: 'Cisco Catalyst 9200L "Special" Ed.',
          manufacturer: 'Cisco',
          model: 'C9200L-48P-4G',
          serialNumber: null, // Null serial number
          category: 'Network Switches',
          status: 'In Storage',
          assignedTo: '',
        }),
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { data: mockAssetData },
      });

      const csvContent = await assetsService.exportCsv();
      expect(csvContent).toBeDefined();

      const lines = csvContent.split('\n');
      expect(lines.length).toBe(3); // Header + 2 rows

      const headerLine = lines[0];
      const headers = headerLine.split(',');

      // 1. Header assertions
      expect(headers).toEqual([
        'Tag',
        'Name',
        'Manufacturer',
        'Model',
        'Category',
        'Status',
        'Assigned To',
      ]);
      expect(headers).not.toContain('Purchase Price');
      expect(headers).not.toContain('Purchase Cost');
      expect(headers).not.toContain('Price');
      expect(headers).not.toContain('Cost');

      // 2. Body assertions: check that no line contains purchasePrice
      expect(csvContent).not.toMatch(/purchasePrice/i);
      expect(csvContent).not.toMatch(/purchaseCost/i);
      expect(csvContent).not.toMatch(/purchase\s*price/i);
      expect(csvContent).not.toMatch(/purchase\s*cost/i);

      // 3. Row 1 assertions
      expect(lines[1]).toContain('AST-CSV-101');
      expect(lines[1]).toContain('"ThinkPad P16 Gen 2"');
      expect(lines[1]).toContain('Lenovo');

      // 4. Row 2 assertions with quotes escaping
      expect(lines[2]).toContain('AST-CSV-102');
      expect(lines[2]).toContain('"Cisco Catalyst 9200L ""Special"" Ed."');
    });
  });
});
