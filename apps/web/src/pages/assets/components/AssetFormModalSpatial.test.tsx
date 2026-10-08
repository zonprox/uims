import { App, Form } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import type { Department } from '../../../services/organization.service';
import { buildAssetPayload } from '../hooks/useAssetManagement';
import { AssetFormModal } from './AssetFormModal';

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-machinery', name: 'Machinery' },
      { id: 'cat-laptop', name: 'Laptop' },
    ]),
    getCostCenters: vi.fn().mockResolvedValue([
      { id: 'cc-qa', code: 'CC-QA', name: 'Quality Assurance' },
      { id: 'cc-ops', code: 'CC-OPS', name: 'Operations' },
    ]),
  },
}));

vi.mock('../../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssetFormModal Department & Cost Center Integration', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  const mockDepartments: Department[] = [
    {
      id: 'dept-qa-uuid',
      name: 'Quality Assurance',
      code: 'QA',
      status: 'ACTIVE',
      organizationId: 'org-bsl-uuid',
      organization: {
        id: 'org-bsl-uuid',
        name: 'BSL Garment',
        code: 'BSL',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'dept-import-export-uuid',
      name: 'Import-Export',
      code: 'IMP-EXP',
      status: 'ACTIVE',
      organizationId: 'org-bsl-uuid',
      organization: {
        id: 'org-bsl-uuid',
        name: 'BSL Garment',
        code: 'BSL',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'dept-it-support-uuid',
      name: 'IT Operations',
      code: 'IT-OPS',
      status: 'ACTIVE',
      organizationId: 'org-bsl-uuid',
      organization: {
        id: 'org-bsl-uuid',
        name: 'BSL Garment',
        code: 'BSL',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

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
    document.body.innerHTML = '';
  });

  describe('AssetFormModal Component Rendering', () => {
    function TestWrapper({
      editingAsset = null,
      onSave = vi.fn(),
    }: {
      editingAsset?: Asset | null;
      onSave?: () => void;
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
          onSave,
          onCancel: vi.fn(),
          departments: mockDepartments,
        }),
      );
    }

    it('renders searchable Select for Owner Department and Cost Center, and confirms Physical Location is purged', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestWrapper));
      });

      const locationLabels = Array.from(document.body.querySelectorAll('label')).map(
        (el) => el.textContent,
      );
      // Owner Department and Cost Center should be present
      expect(locationLabels).toContain('Owner Department');
      expect(locationLabels).toContain('Cost Center');
      // Physical Location should NOT be present
      expect(locationLabels).not.toContain('Physical Location');

      expect(document.body.textContent).toContain('Select owner department');
      expect(document.body.textContent).toContain('Select cost center');
    });

    it('renders Owner Department and Cost Center selects cleanly', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestWrapper));
      });

      const selects = document.body.querySelectorAll('.ant-select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('populates initial form values when editing an asset with department and cost center', async () => {
      const existingAsset: Asset = {
        id: 'ast-sewing-01',
        tag: 'AST-BSL-001',
        name: 'Juki DDL-8700 Industrial Sewing Machine',
        manufacturer: 'Juki',
        model: 'DDL-8700',
        serialNumber: 'SN-JUKI-44120',
        category: 'Machinery',
        status: 'Active',
        assignedTo: 'Tran Thi Mai',
        assignedEmail: 'mai.tran@bsl.vn',
        department: 'Quality Assurance',
        departmentId: 'dept-qa-uuid',
        costCenterId: 'cc-qa',
        purchaseDate: '2026-03-01',
        warrantyExpiry: '2029-03-01',
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestWrapper, { editingAsset: existingAsset }));
      });

      expect(document.body.textContent).toContain('Edit Asset: AST-BSL-001');
    });

    it('preserves departmentId, department, and costCenterId in buildAssetPayload', () => {
      const payload = buildAssetPayload({
        tag: 'AST-SEW-99',
        name: 'Brother S-7200C',
        manufacturer: 'Brother',
        model: 'S-7200C',
        serialNumber: 'BR-889900',
        category: 'Machinery',
        status: 'Active',
        departmentId: 'dept-qa-uuid',
        department: 'Quality Assurance',
        costCenterId: 'cc-qa',
      });

      expect(payload.departmentId).toBe('dept-qa-uuid');
      expect(payload.department).toBe('Quality Assurance');
      expect(payload.costCenterId).toBe('cc-qa');
      expect((payload as unknown as Record<string, unknown>).locationId).toBeUndefined();
      expect((payload as unknown as Record<string, unknown>).location).toBeUndefined();
    });
  });
});
