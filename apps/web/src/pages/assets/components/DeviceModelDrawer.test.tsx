import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../../services/api';
import { DeviceModelDrawer } from './DeviceModelDrawer';

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

vi.mock('../../../services/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
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

describe('DeviceModelDrawer Component', () => {
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

  it('renders drawer with uppercase assetCode input and handles 409 conflict duplicate notification', async () => {
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

    expect(document.body.textContent).toContain('Create Device Model');
    expect(document.body.textContent).toContain('Asset Code / SAP Code');

    // Fill in assetCode and name
    const codeInput = document.body.querySelector(
      'input[placeholder="e.g. MOD-DELL-5420"]',
    ) as HTMLInputElement;
    const nameInput = document.body.querySelector(
      'input[placeholder="e.g. Dell Latitude 5420 Rugged"]',
    ) as HTMLInputElement;

    expect(codeInput).toBeDefined();
    expect(nameInput).toBeDefined();

    await act(async () => {
      const setCode = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setCode?.call(codeInput, 'mod-duplicate-01');
      codeInput.dispatchEvent(new Event('input', { bubbles: true }));
      codeInput.dispatchEvent(new Event('change', { bubbles: true }));

      setCode?.call(nameInput, 'Dell Duplicate Test');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Click submit button
    const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Create Model'),
    );
    expect(submitBtn).toBeDefined();

    await act(async () => {
      submitBtn?.click();
    });

    // 409 notification is called
    expect(mockNotificationError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Duplicate Asset Code',
        description: expect.stringContaining('already exists'),
      }),
    );
  });
});
