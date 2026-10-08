import { App, Form, type FormInstance } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset, AssetCategory } from '../../../services/assets.service';
import { buildAssetPayload } from '../hooks/useAssetManagement';
import { AssetFormModal } from './AssetFormModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-laptop', name: 'Laptops / Notebooks', code: 'LAP' },
      { id: 'cat-switch', name: 'Network Switches', code: 'SW' },
      { id: 'cat-monitor', name: 'Monitors & Displays', code: 'MON' },
      { id: 'cat-server', name: 'Servers (Rackmount / Host)', code: 'SRV' },
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

function createTestAsset(overrides: Partial<Asset>): Asset {
  return {
    id: 'test-id-001',
    tag: 'AST-TEST-001',
    name: 'Test Device',
    manufacturer: 'Test OEM',
    model: 'Test-Model-1',
    serialNumber: 'SN-TEST-12345',
    category: 'Laptops / Notebooks',
    categoryId: 'cat-laptop',
    status: 'Active',
    assignedTo: 'Test Custodian',
    assignedEmail: 'custodian@youngonevn.com',
    purchaseDate: '2026-01-01',
    warrantyExpiry: '2029-01-01',
    notes: 'Configured with corporate VPN and MDM profile',
    ...overrides,
  };
}

describe('Adversarial Stress Test: Asset Form, Payload & Hydration without Specs', () => {
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

  // =========================================================================
  // Section 1: buildAssetPayload Edge Cases & Stress Scenarios
  // =========================================================================
  describe('buildAssetPayload Adversarial Edge Cases', () => {
    it('handles minimal input gracefully without producing specs', () => {
      const payload = buildAssetPayload({
        tag: 'AST-MIN-01',
        name: 'Minimal Asset',
        categoryId: 'cat-laptop',
        status: 'Active',
      });

      expect(payload.tag).toBe('AST-MIN-01');
      expect(payload.name).toBe('Minimal Asset');
      expect(payload.status).toBe('Active');
      expect(payload).not.toHaveProperty('specs');
    });

    it('buildAssetPayload retains notes and correctly produces payload without specs', () => {
      const payload = buildAssetPayload({
        tag: 'AST-SW-01',
        name: 'Aruba 2930F',
        manufacturer: 'HPE Aruba',
        model: 'JL258A',
        serialNumber: 'SG829011',
        category: 'Network Switches',
        categoryId: 'cat-switch',
        status: 'Active',
        notes: 'Layer 3 switch with 8x PoE+ ports (67W power budget)',
      });

      expect(payload.tag).toBe('AST-SW-01');
      expect(payload.notes).toBe('Layer 3 switch with 8x PoE+ ports (67W power budget)');
      expect(payload).not.toHaveProperty('specs');
    });
  });

  // =========================================================================
  // Section 2: AssetFormModal Category Switching & Field Isolation
  // =========================================================================
  describe('AssetFormModal Category Switching & Field Isolation', () => {
    interface TestModalHostProps {
      initialValues?: Record<string, unknown>;
      editingAsset?: Asset | null;
      categories?: AssetCategory[];
      onFormReady?: (form: FormInstance) => void;
    }

    function TestModalHost({ editingAsset = null, categories, onFormReady }: TestModalHostProps) {
      const [form] = Form.useForm();

      if (onFormReady) {
        onFormReady(form);
      }

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

    it('renders form with notes and without technical specifications section', async () => {
      let formInstance!: FormInstance;

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(TestModalHost, {
            onFormReady: (f) => {
              formInstance = f;
            },
            categories: [
              { id: 'cat-laptop', name: 'Laptops / Notebooks' },
              { id: 'cat-switch', name: 'Network Switches' },
            ],
          }),
        );
      });

      expect(formInstance).toBeDefined();

      await act(async () => {
        formInstance.setFieldsValue({
          tag: 'AST-TEST-001',
          name: 'Dell Precision 5570',
          manufacturer: 'Dell',
          model: 'P5570',
          serialNumber: 'SN-DELL-12345',
          categoryId: 'cat-laptop',
          status: 'Active',
          notes: 'Standard engineering workstation',
        });
      });

      const modalText = document.body.textContent || '';
      expect(modalText).not.toContain('Technical Specifications');
      expect(modalText).toContain('Notes');

      // Verify DOM inputs for standard fields
      const tagInput = document.querySelector('input#tag') as HTMLInputElement | null;
      const serialInput = document.querySelector('input#serialNumber') as HTMLInputElement | null;
      const notesInput = document.querySelector('textarea#notes') as HTMLTextAreaElement | null;

      expect(tagInput?.value).toBe('AST-TEST-001');
      expect(serialInput?.value).toBe('SN-DELL-12345');
      expect(notesInput?.value).toBe('Standard engineering workstation');
    });

    it('preserves standard asset fields across multiple sequential category transitions', async () => {
      let formInstance!: FormInstance;

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(TestModalHost, {
            onFormReady: (f) => {
              formInstance = f;
            },
            categories: [
              { id: 'cat-laptop', name: 'Laptops / Notebooks' },
              { id: 'cat-switch', name: 'Network Switches' },
              { id: 'cat-server', name: 'Servers (Rackmount / Host)' },
              { id: 'cat-monitor', name: 'Monitors & Displays' },
            ],
          }),
        );
      });

      // Populate standard fields
      await act(async () => {
        formInstance.setFieldsValue({
          tag: 'AST-SEQ-001',
          name: 'Multi-Device Test',
          manufacturer: 'Universal Enterprise',
          model: 'UE-2026',
          serialNumber: 'SN-SEQ-9999',
          categoryId: 'cat-laptop',
          status: 'Active',
          notes: 'Test note across category switches',
        });
      });

      // Step 1: Laptop -> Server
      await act(async () => {
        formInstance.setFieldValue('categoryId', 'cat-server');
      });

      let text = document.body.textContent || '';
      expect(text).not.toContain('Technical Specifications');

      // Step 2: Server -> Monitor
      await act(async () => {
        formInstance.setFieldValue('categoryId', 'cat-monitor');
      });

      text = document.body.textContent || '';
      expect(text).not.toContain('Technical Specifications');

      // Step 3: Monitor -> Switch
      await act(async () => {
        formInstance.setFieldValue('categoryId', 'cat-switch');
      });

      text = document.body.textContent || '';
      expect(text).not.toContain('Technical Specifications');

      // Verify standard asset fields survived all transitions completely intact
      expect(formInstance.getFieldValue('tag')).toBe('AST-SEQ-001');
      expect(formInstance.getFieldValue('name')).toBe('Multi-Device Test');
      expect(formInstance.getFieldValue('manufacturer')).toBe('Universal Enterprise');
      expect(formInstance.getFieldValue('model')).toBe('UE-2026');
      expect(formInstance.getFieldValue('serialNumber')).toBe('SN-SEQ-9999');
      expect(formInstance.getFieldValue('status')).toBe('Active');
      expect(formInstance.getFieldValue('notes')).toBe('Test note across category switches');

      // Verify inputs in DOM
      expect((document.querySelector('input#tag') as HTMLInputElement)?.value).toBe('AST-SEQ-001');
      expect((document.querySelector('input#name') as HTMLInputElement)?.value).toBe(
        'Multi-Device Test',
      );
      expect((document.querySelector('textarea#notes') as HTMLTextAreaElement)?.value).toBe(
        'Test note across category switches',
      );
    });
  });

  // =========================================================================
  // Section 3: Edit Mode Hydration Stress Scenarios
  // =========================================================================
  describe('AssetFormModal Edit Mode Hydration', () => {
    it('verifies form values and DOM inputs are hydrated accurately from editingAsset', async () => {
      let formInstance!: FormInstance;

      const editingAsset = createTestAsset({
        id: 'ast-sw-hydrate',
        tag: 'SW-DIST-01',
        name: 'Aruba CX 6300M',
        manufacturer: 'HPE Aruba Networking',
        model: 'JL658A',
        serialNumber: 'CN98G42011',
        category: 'Network Switches',
        categoryId: 'cat-switch',
        status: 'Active',
        purchaseDate: '2026-01-20',
        warrantyExpiry: '2029-01-20',
        notes: '48 port PoE switch in DC rack',
      });

      function EditModalHost() {
        const [form] = Form.useForm();
        formInstance = form;
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
            categories: [{ id: 'cat-switch', name: 'Network Switches' }],
          }),
        );
      }

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(EditModalHost));
      });

      // 1. Verify standard fields are hydrated
      expect(formInstance.getFieldValue('tag')).toBe('SW-DIST-01');
      expect(formInstance.getFieldValue('name')).toBe('Aruba CX 6300M');
      expect(formInstance.getFieldValue('manufacturer')).toBe('HPE Aruba Networking');
      expect(formInstance.getFieldValue('model')).toBe('JL658A');
      expect(formInstance.getFieldValue('serialNumber')).toBe('CN98G42011');
      expect(formInstance.getFieldValue('categoryId')).toBe('cat-switch');
      expect(formInstance.getFieldValue('notes')).toBe('48 port PoE switch in DC rack');

      // 2. Verify modal title indicates edit mode
      const modalHeader = document.body.querySelector('.ant-modal-title');
      expect(modalHeader?.textContent).toContain('Edit Asset: SW-DIST-01');

      // 3. Verify no technical specifications section is rendered
      expect(document.body.textContent).not.toContain('Technical Specifications');
    });

    it('handles editingAsset with completely empty or null notes without errors', async () => {
      let formInstance!: FormInstance;

      const emptyNotesAsset = createTestAsset({
        id: 'ast-empty-notes',
        tag: 'AST-EMPTY-01',
        name: 'Generic Monitor',
        manufacturer: 'Dell',
        model: 'U2723QE',
        serialNumber: 'SN-EMPTY-01',
        category: 'Monitors & Displays',
        categoryId: 'cat-monitor',
        status: 'In Storage',
        notes: undefined,
      });

      function EmptyNotesModalHost() {
        const [form] = Form.useForm();
        formInstance = form;
        return createElement(
          App,
          null,
          createElement(AssetFormModal, {
            open: true,
            editingAsset: emptyNotesAsset,
            form,
            submitting: false,
            onSave: vi.fn(),
            onCancel: vi.fn(),
            categories: [{ id: 'cat-monitor', name: 'Monitors & Displays' }],
          }),
        );
      }

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(EmptyNotesModalHost));
      });

      expect(document.body.textContent).not.toContain('Technical Specifications');
      expect(formInstance.getFieldValue('notes')).toBeUndefined();
    });
  });
});
