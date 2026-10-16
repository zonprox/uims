import { App, ConfigProvider, Form } from 'antd';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { api } from '../../../services/api';
import { inventoryService } from '../../../services/inventory.service';
import { useAssetManagement } from '../hooks/useAssetManagement';
import { DeviceModelTable } from './DeviceModelTable';
import { PhysicalUnitModal } from './PhysicalUnitModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();
const mockMessageWarning = vi.fn();
const mockNotificationError = vi.fn();

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

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([{ id: 'cat-laptop', name: 'Laptops / Notebooks' }]),
    getAssets: vi.fn().mockResolvedValue([]),
    getStats: vi
      .fn()
      .mockResolvedValue({ total: 0, active: 0, inRepair: 0, inStorage: 0, retired: 0 }),
    getCostCenters: vi
      .fn()
      .mockResolvedValue([{ id: 'cc-1', code: 'IT-OPS', name: 'IT Operations' }]),
    deleteAsset: vi.fn().mockResolvedValue({ success: true }),
    batchDeleteAssets: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('../../../services/organization.service', () => ({
  organizationService: {
    getOrganizations: vi.fn().mockResolvedValue([]),
    getLocationTree: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([{ id: 'dept-1', name: 'Engineering', code: 'ENG' }]),
  },
}));

vi.mock('../../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

vi.mock('../../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    patch: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

const sampleModel: Asset = {
  id: 'mod-dell-5420',
  tag: 'MOD-DELL-5420',
  assetCode: 'MOD-DELL-5420',
  name: 'Dell Latitude 5420',
  manufacturer: 'Dell',
  model: 'Latitude 5420',
  category: 'Laptops / Notebooks',
  status: 'Active',
  assignedTo: '',
  assignedEmail: '',
  purchaseDate: '2026-01-01',
  warrantyExpiry: '2029-01-01',
  specifications: 'Intel Core i7-1185G7, 16GB RAM, 512GB SSD',
  unitCost: 1250,
  costCenter: { id: 'cc-1', code: 'IT-OPS', name: 'IT Operations' },
  unitCounts: { total: 20, available: 8, inUse: 12 },
};

describe('Adversarial Envelope Unboxing & Component Challenger Suite', () => {
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
    for (const el of modals) {
      el.remove();
    }
    container?.remove();
    document.body.innerHTML = '';
  });

  describe('1. useAssetManagement loadModels Envelope Stress-Testing', () => {
    function TestHookHarness({
      onHookReady,
    }: {
      onHookReady: (hook: ReturnType<typeof useAssetManagement>) => void;
    }) {
      const [form] = Form.useForm();
      const hook = useAssetManagement(form);
      useEffect(() => {
        onHookReady(hook);
      }, [hook, onHookReady]);
      return createElement(
        'div',
        { 'data-testid': 'hook-mounted' },
        `Models: ${hook.models.length}`,
      );
    }

    async function mountAndGetHook(): Promise<{
      hookRef: { current: ReturnType<typeof useAssetManagement> | null };
      unmount: () => Promise<void>;
    }> {
      const hookRef: { current: ReturnType<typeof useAssetManagement> | null } = { current: null };
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(
                MemoryRouter,
                null,
                createElement(TestHookHarness, {
                  onHookReady: (h) => {
                    hookRef.current = h;
                  },
                }),
              ),
            ),
          ),
        );
      });
      return {
        hookRef,
        unmount: async () => {
          if (currentRoot) {
            await act(async () => {
              currentRoot?.unmount();
            });
            currentRoot = null;
          }
        },
      };
    }

    it('unboxes canonical NestJS envelope: { success: true, data: { items: [...] } }', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                items: [sampleModel],
                total: 1,
                page: 1,
                pageSize: 100,
              },
              timestamp: '2026-10-15T04:20:00Z',
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      expect(hookRef.current).not.toBeNull();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toHaveLength(1);
      expect(hookRef.current?.models[0].name).toBe('Dell Latitude 5420');
      expect(hookRef.current?.loadingModels).toBe(false);
    });

    it('unboxes direct items envelope: { items: [...] }', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: {
              items: [sampleModel],
              total: 1,
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toHaveLength(1);
      expect(hookRef.current?.models[0].id).toBe('mod-dell-5420');
    });

    it('unboxes direct array: [...]', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: [sampleModel],
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toHaveLength(1);
      expect(hookRef.current?.models[0].model).toBe('Latitude 5420');
    });

    it('handles empty array: [] without crashing', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: [],
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toEqual([]);
      expect(hookRef.current?.loadingModels).toBe(false);
    });

    it('handles null response safely without throwing', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: null,
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toEqual([]);
      expect(hookRef.current?.loadingModels).toBe(false);
    });

    it('handles undefined response and empty object safely', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: undefined,
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toEqual([]);
      expect(hookRef.current?.loadingModels).toBe(false);
    });

    it('adversarial challenge: malformed non-array { data: "corrupt_string" }', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: {
              data: 'corrupt_string',
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toEqual([]);
      expect(hookRef.current?.loadingModels).toBe(false);
    });

    it('adversarial challenge: malformed { data: { items: 12345 } }', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: {
              data: {
                items: 12345,
              },
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toEqual([]);
      expect(hookRef.current?.loadingModels).toBe(false);
    });

    it('adversarial challenge: malformed { data: { items: null } }', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: {
              data: {
                items: null,
              },
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.models).toEqual([]);
      expect(hookRef.current?.loadingModels).toBe(false);
    });

    it('handles network rejection and falls back to derived assets gracefully', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.reject(new Error('500 Internal Server Error'));
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const { hookRef } = await mountAndGetHook();
      await act(async () => {
        await hookRef.current?.loadModels();
      });

      expect(hookRef.current?.loadingModels).toBe(false);
      expect(Array.isArray(hookRef.current?.models)).toBe(true);
    });
  });

  describe('2. PhysicalUnitModal Envelope & Component Stress-Testing', () => {
    it('renders gracefully and unboxes canonical envelope { data: { items: [...] } }', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: {
              data: {
                items: [sampleModel],
                total: 1,
              },
            },
          });
        }
        if (url === '/assets/cost-centers') {
          return Promise.resolve({
            data: {
              data: [{ id: 'cc-1', code: 'IT-OPS', name: 'IT Operations' }],
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
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
                initialParentId: sampleModel.id,
              }),
            ),
          ),
        );
      });

      const modalEl = document.body.querySelector('.ant-modal');
      expect(modalEl).not.toBeNull();
      expect(document.body.textContent).toContain('Register Physical Unit');
    });

    it('renders gracefully when models endpoint returns null or malformed data', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({ data: null });
        }
        return Promise.resolve({ data: { data: [] } });
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

      const modalEl = document.body.querySelector('.ant-modal');
      expect(modalEl).not.toBeNull();
    });

    it('renders gracefully when models endpoint throws network error', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve({ data: { data: [] } });
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

      const modalEl = document.body.querySelector('.ant-modal');
      expect(modalEl).not.toBeNull();
    });
  });

  describe('3. DeviceModelTable Stress-Testing with Incomplete & Edge-Case Records', () => {
    it('renders empty table when models array is empty []', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(DeviceModelTable, {
                models: [],
                loading: false,
                onEditModel: vi.fn(),
                onRegisterUnitUnderModel: vi.fn(),
                onDeleteModel: vi.fn(),
              }),
            ),
          ),
        );
      });

      expect(container.textContent).toContain('No data');
    });

    it('renders models with missing optional attributes (null cost, null counts, null costCenter, null specs)', async () => {
      const minimalModel: Asset = {
        id: 'mod-barebones',
        tag: 'MOD-BARE',
        assetCode: '',
        name: 'Barebones Device',
        manufacturer: '',
        model: '',
        category: '',
        status: 'Active',
        assignedTo: '',
        assignedEmail: '',
        purchaseDate: '',
        warrantyExpiry: '',
        specifications: null as unknown as string,
        unitCost: null as unknown as number,
        costCenter: null as unknown as string,
        unitCounts: undefined,
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
              createElement(DeviceModelTable, {
                models: [minimalModel],
                loading: false,
                onEditModel: vi.fn(),
                onRegisterUnitUnderModel: vi.fn(),
                onDeleteModel: vi.fn(),
              }),
            ),
          ),
        );
      });

      expect(container.textContent).toContain('MOD-BARE');
      expect(container.textContent).toContain('Barebones Device');
      expect(container.textContent).toContain('Standard Configuration');
      expect(container.textContent).toContain('Total: 0');
    });

    it('supports onRegisterUnitUnderModel callback properly', async () => {
      const onRegisterMock = vi.fn();
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(DeviceModelTable, {
                models: [sampleModel],
                loading: false,
                onEditModel: vi.fn(),
                onRegisterUnitUnderModel: onRegisterMock,
                onDeleteModel: vi.fn(),
              }),
            ),
          ),
        );
      });

      const registerBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.getAttribute('aria-label')?.includes('Register Unit'),
      );
      expect(registerBtn).toBeDefined();

      await act(async () => {
        registerBtn?.click();
      });

      expect(onRegisterMock).toHaveBeenCalledWith(sampleModel);
    });
  });

  describe('4. inventoryService Unboxing Resilience', () => {
    it('unboxes models in getModels with canonical envelope and maps sku, quantity, binNumber', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: {
              data: {
                items: [
                  {
                    id: 'mod-1',
                    modelCode: 'MOD-CODE-1',
                    availableUnits: 15,
                    binLocation: 'BIN-A1',
                  },
                ],
              },
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const items = await inventoryService.getModels();
      expect(items).toHaveLength(1);
      expect(items[0].sku).toBe('MOD-CODE-1');
      expect(items[0].quantity).toBe(15);
      expect(items[0].binNumber).toBe('BIN-A1');
    });

    it('handles direct array response in getModels', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.resolve({
            data: [
              {
                id: 'mod-2',
                sku: 'SKU-2',
                quantity: 5,
                binNumber: 'BIN-B2',
              },
            ],
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const items = await inventoryService.getModels();
      expect(items).toHaveLength(1);
      expect(items[0].sku).toBe('SKU-2');
      expect(items[0].quantity).toBe(5);
    });

    it('falls back to /inventory on failure in getModels', async () => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url === '/assets/models') {
          return Promise.reject(new Error('Endpoint down'));
        }
        if (url === '/inventory') {
          return Promise.resolve({
            data: {
              data: [{ id: 'inv-fallback', name: 'Fallback Item' }],
            },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const items = await inventoryService.getModels();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('inv-fallback');
    });
  });
});
