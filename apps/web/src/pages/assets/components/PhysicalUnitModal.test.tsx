import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../services/api';
import { PhysicalUnitModal } from './PhysicalUnitModal';

const mockNotificationError = vi.fn();
const mockMessageSuccess = vi.fn();

const mockAppContext = {
  message: {
    success: mockMessageSuccess,
    error: vi.fn(),
    warning: vi.fn(),
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
              },
            ],
          },
        });
      }
      if (url === '/assets/cost-centers') {
        return Promise.resolve({
          data: {
            data: [{ id: 'cc-it-ops', code: 'IT-OPS', name: 'IT Operations' }],
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

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PhysicalUnitModal Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

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

  it('renders modal with SUB Code, Parent Model, Cost Center and handles 409 conflict', async () => {
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

    expect(document.body.textContent).toContain('Register Physical Unit');
    expect(document.body.textContent).toContain('SUB Code');
    expect(document.body.textContent).toContain('Parent Device Model');
    expect(document.body.textContent).toContain('Cost Center');

    // Fill in subcode
    const subcodeInput = document.body.querySelector(
      'input[placeholder="e.g. AST-DELL-001"]',
    ) as HTMLInputElement;
    expect(subcodeInput).toBeDefined();

    await act(async () => {
      const setCode = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setCode?.call(subcodeInput, 'AST-DUP-001');
      subcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
      subcodeInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Submit
    const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Register Unit'),
    );
    expect(submitBtn).toBeDefined();

    await act(async () => {
      submitBtn?.click();
    });

    // Verify 409 duplicate notification was triggered
    expect(mockNotificationError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Duplicate SUB Code',
        description: expect.stringContaining('already exists'),
      }),
    );
  });
});
