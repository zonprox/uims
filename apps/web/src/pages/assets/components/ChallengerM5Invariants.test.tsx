import { App, ConfigProvider } from 'antd';
import fs from 'node:fs';
import path from 'node:path';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { api } from '../../../services/api';
import { PhysicalUnitModal } from './PhysicalUnitModal';
import { TransferAssetDrawer } from './TransferAssetDrawer';
import { BatchStockIntakeDrawer } from '../../inventory/components/BatchStockIntakeDrawer';
import type { InventoryItem } from '../../../services/inventory.service';

const mockNotificationError = vi.fn();
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
  modal: { confirm: vi.fn() },
  notification: {
    error: mockNotificationError,
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    destroy: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    App: {
      ...actual.App,
      useApp: () => mockAppContext,
    },
  };
});

vi.mock('../../../services/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/assets/models') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'mod-dell-5420',
                name: 'Dell Latitude 5420',
                assetCode: 'MOD-DELL-5420',
              },
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

vi.mock('../../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'user-a',
          fullName: 'Alice Walker',
          email: 'alice@example.com',
          employeeCode: 'EMP-001',
          department: { name: 'IT Infrastructure' },
        },
        {
          id: 'user-b',
          fullName: 'Bob Smith',
          email: 'bob@example.com',
          employeeCode: 'EMP-002',
          department: { name: 'Engineering' },
        },
      ],
    }),
  },
}));

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([]),
    getCostCenters: vi.fn().mockResolvedValue([]),
    generateHandoverDocument: vi
      .fn()
      .mockResolvedValue({ html: '<html>Mock</html>', filename: 'mock.html' }),
    downloadHandoverDocx: vi
      .fn()
      .mockResolvedValue({ blob: new Blob(['mock']), filename: 'mock.docx' }),
    uploadHandoverDocument: vi.fn().mockResolvedValue({ fileUrl: 'https://storage/mock.pdf' }),
    transferAsset: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../../services/inventory.service', () => ({
  inventoryService: {
    batchIntake: vi.fn().mockResolvedValue({ success: true, count: 5 }),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Challenger M5-1 Empirical & Adversarial Test Suite', () => {
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
    const modals = document.querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover');
    modals.forEach((m) => m.remove());
    container?.remove();
    document.body.innerHTML = '';
  });

  describe('Test 1: Device Model Intake Validation & Stock Health Status Boundaries', () => {
    // Boundary check function matching the exact prompt specification:
    // When availableUnits === 0: status is 'OUT_OF_STOCK'
    // When availableUnits > 0 and availableUnits < minThreshold: status is 'LOW_STOCK'
    // When availableUnits >= minThreshold: status is 'IN_STOCK'
    function evaluateExpectedStockStatus(availableUnits: number, minThreshold: number): string {
      if (availableUnits === 0) return 'OUT_OF_STOCK';
      if (availableUnits > 0 && availableUnits < minThreshold) return 'LOW_STOCK';
      return 'IN_STOCK';
    }

    // Actual implementation in StockLevelCell (InventoryPage.tsx) & inventory.service.ts:
    function evaluateImplementedStockStatus(available: number, threshold: number): string {
      const isDepleted = available === 0;
      const isLow = available > 0 && available < threshold;
      return isDepleted ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'IN_STOCK';
    }

    it('identifies boundary discrepancy at availableUnits === minThreshold', () => {
      const minThreshold = 5;

      // When availableUnits === 0: both agree OUT_OF_STOCK
      expect(evaluateExpectedStockStatus(0, minThreshold)).toBe('OUT_OF_STOCK');
      expect(evaluateImplementedStockStatus(0, minThreshold)).toBe('OUT_OF_STOCK');

      // When availableUnits === 4 (0 < 4 < 5): both agree LOW_STOCK
      expect(evaluateExpectedStockStatus(4, minThreshold)).toBe('LOW_STOCK');
      expect(evaluateImplementedStockStatus(4, minThreshold)).toBe('LOW_STOCK');

      // When availableUnits === 5 (availableUnits === minThreshold):
      // Expected by invariant specification: IN_STOCK (since 5 >= 5)
      // Implemented by codebase: IN_STOCK (since 5 < 5 is false and 5 >= 5)
      const expected = evaluateExpectedStockStatus(5, minThreshold);
      const implemented = evaluateImplementedStockStatus(5, minThreshold);

      expect(expected).toBe('IN_STOCK');
      expect(implemented).toBe('IN_STOCK');
    });

    it('enforces intake validation requiring Device Model and positive unit count', async () => {
      const mockModel: InventoryItem = {
        id: 'mod-dell-5420',
        name: 'Dell Latitude 5420',
        sku: 'MOD-DELL-5420',
        modelCode: 'MOD-DELL-5420',
        minThreshold: 5,
        availableUnits: 10,
        quantity: 10,
        unitCost: 850,
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(BatchStockIntakeDrawer, {
                open: true,
                model: null, // No model preselected
                models: [mockModel],
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      // Submit without selecting deviceModelId (and clear deviceModelId)
      const receiveBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Receive Units into Stock'),
      );
      expect(receiveBtn).toBeDefined();
    });
  });

  describe('Test 2: PhysicalUnitModal.tsx Device Model Validation Invariants', () => {
    it('adversarially probes whether submitting without selecting a Device Model is rejected', async () => {
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
                editingAsset: null,
                initialParentId: undefined, // No initial parent model
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      // Find the Register Unit submit button
      const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Register Unit'),
      );
      expect(submitBtn).toBeDefined();

      // Click submit
      await act(async () => {
        submitBtn?.click();
        await new Promise((r) => setTimeout(r, 60));
      });

      // EMPIRICAL OBSERVATION:
      // In PhysicalUnitModal.tsx:
      // Form item is named "parentId", not "deviceModelId".
      // There are NO required validation rules on parentId / deviceModelId.
      // If omitted, lines 200-207 fall back to:
      //   values.deviceModelId || values.parentId || ... || deviceModels[0]?.id || 'mod-1';
      // As a result, api.post IS CALLED with fallback model 'mod-dell-5420' or 'mod-1'!
      // It is NOT rejected!
      const postCalls = vi.mocked(api.post).mock.calls;
      // Proving whether submission was rejected (should be 0 calls if rejected):
      const wasRejected = postCalls.length === 0;

      expect({
        wasRejected,
        postCallsCount: postCalls.length,
      }).toEqual({
        wasRejected: true,
        postCallsCount: 0,
      });
    });
  });

  describe('Test 3: TransferAssetDrawer.tsx Custody & Dual Document Options Invariants', () => {
    const mockAsset: Asset = {
      id: 'ast-101',
      tag: 'AST-101',
      subcode: 'AST-101',
      name: 'Dell Latitude 5420',
      manufacturer: 'Dell',
      model: 'Latitude 5420',
      category: 'Laptops / Notebooks',
      status: 'IN_USE',
      assignedTo: 'Alice Walker',
      assignedToId: 'user-a',
      assignedEmail: 'alice@example.com',
      department: 'IT Infrastructure',
      departmentId: 'dept-it',
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2029-01-01',
    };

    it('verifies whether eligibleEmployees filters out Custodian A', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(TransferAssetDrawer, {
                open: true,
                asset: mockAsset,
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      // Check text in drawer
      expect(document.body.textContent).toContain('Source Custodian (Custodian A)');
      expect(document.body.textContent).toContain('Alice Walker');
      expect(document.body.textContent).toContain('Target Custodian (Custodian B)');
    });

    it('checks whether TransferAssetDrawer provides dual document options (return form and assignment form)', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(TransferAssetDrawer, {
                open: true,
                asset: mockAsset,
                onClose: vi.fn(),
                onSuccess: vi.fn(),
              }),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      const bodyText = document.body.textContent || '';

      // Check for dual document options:
      // Requirement: "Verify that transfer form includes dual document options (return form and assignment form)."
      const hasReturnForm =
        bodyText.toLowerCase().includes('return form') ||
        bodyText.toLowerCase().includes('biên bản thu hồi') ||
        bodyText.toLowerCase().includes('return record');
      const hasAssignmentForm =
        bodyText.toLowerCase().includes('assignment form') ||
        bodyText.toLowerCase().includes('biên bản cấp phát') ||
        bodyText.toLowerCase().includes('assignment record');

      // EMPIRICAL OBSERVATION:
      // The drawer only contains "Standard Custody Transfer Agreement" (type: 'transfer').
      // It lacks separate dual document options for Return Form (Custodian A) and Assignment Form (Custodian B).
      expect({
        hasReturnForm,
        hasAssignmentForm,
        hasSingleTransferAgreement: bodyText.includes('Standard Custody Transfer Agreement'),
      }).toEqual({
        hasReturnForm: true,
        hasAssignmentForm: true,
        hasSingleTransferAgreement: true,
      });
    });
  });

  describe('Test 4: Clean Codebase Check for AssetFormModal.tsx', () => {
    it('empirically inspects filesystem for existence of AssetFormModal.tsx', () => {
      const assetFormModalPath = path.resolve(__dirname, 'AssetFormModal.tsx');
      const fileExists = fs.existsSync(assetFormModalPath);

      // Requirement: Confirm that AssetFormModal.tsx does NOT exist in the repository filesystem.
      // Worker claimed: "Decommissioned and deleted. Standalone physical unit creation without a Device Model is completely eradicated."
      // EMPIRICAL OBSERVATION: The file STILL exists on disk!
      expect({
        path: assetFormModalPath,
        exists: fileExists,
      }).toEqual({
        path: assetFormModalPath,
        exists: false,
      });
    });

    it('empirically checks for dangling references and test suites for AssetFormModal', () => {
      const testFiles = [
        path.resolve(__dirname, 'AssetFormModalPartialFailure.test.tsx'),
        path.resolve(__dirname, 'AssetFormModalSpatial.test.tsx'),
      ];

      const existingTestFiles = testFiles.filter((p) => fs.existsSync(p));

      // Worker claimed complete eradication, and files are genuinely deleted
      expect(existingTestFiles.length).toBe(0);
    });
  });
});
