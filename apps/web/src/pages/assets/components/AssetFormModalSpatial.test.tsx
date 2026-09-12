import { App, Form } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import type { Department, LocationTreeNode } from '../../../services/organization.service';
import { buildAssetPayload } from '../hooks/useAssetManagement';
import {
  AssetFormModal,
  type FormattedLocationOption,
  formatLocationTreeForSelect,
} from './AssetFormModal';

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([
      { id: 'cat-machinery', name: 'Machinery' },
      { id: 'cat-laptop', name: 'Laptop' },
    ]),
  },
}));

vi.mock('../../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssetFormModal Spatial TreeSelect & Orthogonal Department Integration', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  const mockLocationTree: LocationTreeNode[] = [
    {
      id: 'loc-bsl-campus',
      key: 'loc-bsl-campus',
      value: 'loc-bsl-campus',
      name: 'BSL - Soc Trang Campus',
      title: 'BSL - Soc Trang Campus',
      label: 'BSL - Soc Trang Campus',
      fullPath: 'BSL - Soc Trang Campus',
      type: 'CAMPUS',
      children: [
        {
          id: 'loc-factory-1',
          key: 'loc-factory-1',
          value: 'loc-factory-1',
          name: 'Factory 1',
          title: 'Factory 1',
          label: 'BSL - Soc Trang Campus > Factory 1',
          fullPath: 'BSL - Soc Trang Campus > Factory 1',
          type: 'WORKSHOP',
          parentId: 'loc-bsl-campus',
          children: [
            {
              id: 'loc-f1-sewing',
              key: 'loc-f1-sewing',
              value: 'loc-f1-sewing',
              name: 'Sewing Line 01',
              title: 'Sewing Line 01',
              label: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01',
              fullPath: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01',
              type: 'LINE',
              parentId: 'loc-factory-1',
              children: [
                {
                  id: 'loc-f1-station-04',
                  key: 'loc-f1-station-04',
                  value: 'loc-f1-station-04',
                  name: 'Station 04',
                  title: 'Station 04',
                  label: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 04',
                  fullPath: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 04',
                  type: 'STATION',
                  parentId: 'loc-f1-sewing',
                  children: [],
                },
              ],
            },
            {
              id: 'loc-f1-mdc',
              key: 'loc-f1-mdc',
              value: 'loc-f1-mdc',
              name: 'MDC Sub-Warehouse',
              title: 'MDC Sub-Warehouse',
              label: 'BSL - Soc Trang Campus > Factory 1 > MDC Sub-Warehouse',
              fullPath: 'BSL - Soc Trang Campus > Factory 1 > MDC Sub-Warehouse',
              type: 'WAREHOUSE',
              parentId: 'loc-factory-1',
              children: [],
            },
          ],
        },
        {
          id: 'loc-biz-center',
          key: 'loc-biz-center',
          value: 'loc-biz-center',
          name: 'Business Center Building',
          title: 'Business Center Building',
          label: 'BSL - Soc Trang Campus > Business Center Building',
          fullPath: 'BSL - Soc Trang Campus > Business Center Building',
          type: 'BUILDING',
          parentId: 'loc-bsl-campus',
          children: [
            {
              id: 'loc-import-export-room',
              key: 'loc-import-export-room',
              value: 'loc-import-export-room',
              name: 'Import-Export Office (Room 204)',
              title: 'Import-Export Office (Room 204)',
              label:
                'BSL - Soc Trang Campus > Business Center Building > Import-Export Office (Room 204)',
              fullPath:
                'BSL - Soc Trang Campus > Business Center Building > Import-Export Office (Room 204)',
              type: 'ROOM',
              parentId: 'loc-biz-center',
              children: [],
            },
          ],
        },
      ],
    },
  ];

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

  describe('formatLocationTreeForSelect helper', () => {
    it('formats hierarchical tree nodes preserving leaf title and fullPath in label', () => {
      const formatted: FormattedLocationOption[] = formatLocationTreeForSelect(mockLocationTree);

      expect(formatted).toHaveLength(1);
      const campus = formatted[0];
      expect(campus.title).toBe('BSL - Soc Trang Campus');
      expect(campus.label).toBe('BSL - Soc Trang Campus');
      expect(campus.value).toBe('loc-bsl-campus');
      expect(campus.children).toHaveLength(2);

      const factory1 = campus.children?.[0];
      expect(factory1?.title).toBe('Factory 1');
      expect(factory1?.label).toBe('BSL - Soc Trang Campus > Factory 1');
      expect(factory1?.children).toHaveLength(2);

      const sewingLine = factory1?.children?.[0];
      expect(sewingLine?.title).toBe('Sewing Line 01');
      expect(sewingLine?.label).toBe('BSL - Soc Trang Campus > Factory 1 > Sewing Line 01');
      expect(sewingLine?.children).toHaveLength(1);

      const station = sewingLine?.children?.[0];
      expect(station?.title).toBe('Station 04');
      expect(station?.label).toBe(
        'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 04',
      );
      expect(station?.children).toBeUndefined();
    });

    it('falls back cleanly when nodes lack precomputed fullPath', () => {
      const rawNodes = [
        {
          id: 'root-1',
          name: 'Factory 2',
          children: [
            {
              id: 'leaf-1',
              name: 'Cutting Area',
            },
          ],
        },
      ];

      const formatted = formatLocationTreeForSelect(rawNodes as unknown as LocationTreeNode[]);
      expect(formatted[0].title).toBe('Factory 2');
      expect(formatted[0].label).toBe('Factory 2');
      expect(formatted[0].children?.[0].title).toBe('Cutting Area');
      expect(formatted[0].children?.[0].label).toBe('Factory 2 > Cutting Area');
    });
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
          locationTree: mockLocationTree,
          departments: mockDepartments,
        }),
      );
    }

    it('renders TreeSelect for Physical Location and searchable Select for Owner Department', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestWrapper));
      });

      // Assert Physical Location Form.Item exists
      const locationLabels = Array.from(document.body.querySelectorAll('label')).map(
        (el) => el.textContent,
      );
      expect(locationLabels).toContain('Physical Location');
      expect(locationLabels).toContain('Owner Department');

      // Assert placeholder for TreeSelect is present
      expect(document.body.textContent).toContain('Select facility / workshop / line / station');
      expect(document.body.textContent).toContain('Select owner department');
    });

    it('renders orthogonal Owner Department independently from Physical Location', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestWrapper));
      });

      // Both inputs exist in DOM in distinct form control groups
      const inputs = document.body.querySelectorAll('.ant-select');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    it('populates initial form values when editing an asset with spatial location and department', async () => {
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
        location: 'Station 04',
        locationId: 'loc-f1-station-04',
        locationPath: 'BSL - Soc Trang Campus > Factory 1 > Sewing Line 01 > Station 04',
        department: 'Quality Assurance',
        departmentId: 'dept-qa-uuid',
        purchaseDate: '2026-03-01',
        purchasePrice: 650,
        warrantyExpiry: '2029-03-01',
        specs: { cpu: 'N/A', ram: 'N/A', storage: 'N/A', os: 'N/A' },
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(TestWrapper, { editingAsset: existingAsset }));
      });

      expect(document.body.textContent).toContain('Edit Asset: AST-BSL-001');
    });

    it('preserves locationId and departmentId in buildAssetPayload', () => {
      const payload = buildAssetPayload({
        tag: 'AST-SEW-99',
        name: 'Brother S-7200C',
        manufacturer: 'Brother',
        model: 'S-7200C',
        serialNumber: 'BR-889900',
        category: 'Machinery',
        status: 'Active',
        locationId: 'loc-f1-station-04',
        location: 'Station 04',
        departmentId: 'dept-qa-uuid',
        department: 'Quality Assurance',
      });

      expect(payload.locationId).toBe('loc-f1-station-04');
      expect(payload.location).toBe('Station 04');
      expect(payload.departmentId).toBe('dept-qa-uuid');
      expect(payload.department).toBe('Quality Assurance');
    });
  });

  describe('organizationService getLocationTree caching & memoization', () => {
    it('queries /locations/tree and returns tree data', async () => {
      const { api } = await import('../../../services/api');
      const { organizationService } = await import('../../../services/organization.service');

      organizationService.clearLocationTreeCache();
      const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
        data: { data: mockLocationTree },
      });

      const tree = await organizationService.getLocationTree('org-bsl-uuid');
      expect(getSpy).toHaveBeenCalledWith('/locations/tree', {
        params: { organizationId: 'org-bsl-uuid' },
      });
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('loc-bsl-campus');
    });

    it('returns memoized promise on consecutive calls without redundant network requests', async () => {
      const { api } = await import('../../../services/api');
      const { organizationService } = await import('../../../services/organization.service');

      organizationService.clearLocationTreeCache();
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
        data: { data: mockLocationTree },
      });

      const firstCall = await organizationService.getLocationTree('org-bsl-uuid');
      const secondCall = await organizationService.getLocationTree('org-bsl-uuid');

      expect(firstCall).toBe(secondCall);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('refetches from network after cache invalidation', async () => {
      const { api } = await import('../../../services/api');
      const { organizationService } = await import('../../../services/organization.service');

      organizationService.clearLocationTreeCache();
      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
        data: { data: mockLocationTree },
      });

      await organizationService.getLocationTree('org-bsl-uuid');
      expect(getSpy).toHaveBeenCalledTimes(1);

      organizationService.clearLocationTreeCache('org-bsl-uuid');
      await organizationService.getLocationTree('org-bsl-uuid');
      expect(getSpy).toHaveBeenCalledTimes(2);
    });
  });
});
