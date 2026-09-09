import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset, AssetStats } from '../../services/assets.service';
import AssetsPage from './AssetsPage';

const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();
const mockNotificationWarning = vi.fn();
const mockNotificationDestroy = vi.fn();

const { mockAssets, mockStats } = vi.hoisted(() => {
  const assets: Array<Asset> = [
    {
      id: 'ast-1',
      tag: 'AST-1001',
      name: 'MacBook Pro 16',
      manufacturer: 'Apple',
      model: 'M3 Max',
      serialNumber: 'SN-APPLE-1001',
      category: 'Laptop',
      status: 'Active',
      assignedTo: 'Marcus Vance',
      assignedEmail: 'marcus@uims.internal',
      location: 'NY Office - Floor 4',
      purchaseDate: '2026-01-15',
      purchasePrice: 3499,
      warrantyExpiry: '2029-01-15',
      specs: {
        cpu: 'Apple M3 Max',
        ram: '64 GB',
        storage: '1 TB NVMe',
        os: 'macOS Sequoia',
      },
    },
    {
      id: 'ast-2',
      tag: 'AST-1002',
      name: 'Dell Precision 7780',
      manufacturer: 'Dell',
      model: 'Precision 7780',
      serialNumber: 'SN-DELL-1002',
      category: 'Laptop',
      status: 'In Storage',
      assignedTo: '',
      assignedEmail: '',
      location: 'Warehouse B',
      purchaseDate: '2025-11-20',
      purchasePrice: 2899,
      warrantyExpiry: '2028-11-20',
      specs: {
        cpu: 'Intel Core i9-13950HX',
        ram: '32 GB',
        storage: '1 TB SSD',
        os: 'Ubuntu 24.04 LTS',
      },
    },
  ];

  const stats: AssetStats = {
    total: 2,
    active: 1,
    inRepair: 0,
    inStorage: 1,
    retired: 0,
  };

  return { mockAssets: assets, mockStats: stats };
});

vi.mock('../../services/assets.service', () => ({
  assetsService: {
    getAssets: vi.fn().mockImplementation((params?: { search?: string }) => {
      if (params?.search) {
        const query = params.search.toLowerCase();
        const filtered = mockAssets.filter(
          (a) =>
            a.tag.toLowerCase().includes(query) ||
            a.name.toLowerCase().includes(query) ||
            a.serialNumber.toLowerCase().includes(query),
        );
        return Promise.resolve(filtered);
      }
      return Promise.resolve(mockAssets);
    }),
    getStats: vi.fn().mockResolvedValue(mockStats),
    createAsset: vi.fn().mockResolvedValue(mockAssets[0]),
    updateAsset: vi.fn().mockResolvedValue(mockAssets[0]),
    deleteAsset: vi.fn().mockResolvedValue(undefined),
    exportCsv: vi.fn().mockResolvedValue('Tag,Name\nAST-1001,MacBook Pro 16'),
  },
}));

const mockAppInstance = {
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: {
    confirm: vi.fn(),
  },
  notification: {
    warning: mockNotificationWarning,
    destroy: mockNotificationDestroy,
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => mockAppInstance,
    },
  };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssetsPage QR Scanner Integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    const mockTrack = {
      stop: vi.fn(),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
      getCapabilities: () => ({ torch: false }),
      getSettings: () => ({ deviceId: 'cam-1' }),
      kind: 'video',
    };

    const mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        enumerateDevices: vi
          .fn()
          .mockResolvedValue([{ kind: 'videoinput', deviceId: 'cam-1', label: 'Default Camera' }]),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
  });

  it('renders "Scan QR" action button in toolbar and filter bar, opening AssetScannerModal on click (R1, R3)', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(MemoryRouter, null, createElement(AssetsPage)));
    });

    const scanButtons = Array.from(document.body.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Scan QR'),
    );
    expect(scanButtons.length).toBeGreaterThanOrEqual(1);

    // Click toolbar Scan QR button
    await act(async () => {
      scanButtons[0]?.click();
    });

    expect(document.body.textContent).toContain('Scan Asset QR Code');

    act(() => {
      root.unmount();
    });
  });

  it('auto-opens AssetScannerModal when URL query contains ?scan=true (R3)', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/assets?scan=true'] },
          createElement(AssetsPage),
        ),
      );
    });

    expect(document.body.textContent).toContain('Scan Asset QR Code');

    act(() => {
      root.unmount();
    });
  });

  it('decodes raw tag AST-1001, displays confirmation message, and opens AssetDetailDrawer (R2, R3)', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/assets?scan=true'] },
          createElement(AssetsPage),
        ),
      );
    });

    const manualInput = document.body.querySelector(
      'input[placeholder*="AST-2026"]',
    ) as HTMLInputElement;
    expect(manualInput).toBeDefined();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(manualInput, 'AST-1001');
      manualInput.dispatchEvent(new Event('input', { bubbles: true }));
      manualInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );

    await act(async () => {
      lookupBtn?.click();
    });

    expect(mockMessageSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Asset "AST-1001" (MacBook Pro 16) identified'),
    );

    // Detail drawer opens with asset tag and specs
    expect(document.body.textContent).toContain('Specifications');
    expect(document.body.textContent).toContain('Marcus Vance');

    act(() => {
      root.unmount();
    });
  });

  it('decodes full URL payload https://uims.internal/assets/AST-1002 and opens drawer (R2, R3)', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/assets?scan=true'] },
          createElement(AssetsPage),
        ),
      );
    });

    const manualInput = document.body.querySelector(
      'input[placeholder*="AST-2026"]',
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(manualInput, 'https://uims.internal/assets/AST-1002');
      manualInput.dispatchEvent(new Event('input', { bubbles: true }));
      manualInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );

    await act(async () => {
      lookupBtn?.click();
    });

    expect(mockMessageSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Asset "AST-1002" (Dell Precision 7780) identified'),
    );

    act(() => {
      root.unmount();
    });
  });

  it('displays warning notification with Register Asset action when scanned asset tag is not found (R3)', async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/assets?scan=true'] },
          createElement(AssetsPage),
        ),
      );
    });

    const manualInput = document.body.querySelector(
      'input[placeholder*="AST-2026"]',
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(manualInput, 'AST-UNKNOWN-9999');
      manualInput.dispatchEvent(new Event('input', { bubbles: true }));
      manualInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );

    await act(async () => {
      lookupBtn?.click();
    });

    expect(mockNotificationWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Asset Not Found',
        description: expect.stringContaining('AST-UNKNOWN-9999'),
      }),
    );

    // Verify 1-click Register Asset action in notification
    const notificationCall = mockNotificationWarning.mock.calls[0]?.[0];
    expect(notificationCall).toBeDefined();
    expect(notificationCall.btn).toBeDefined();

    await act(async () => {
      notificationCall.btn.props.onClick();
    });

    expect(mockNotificationDestroy).toHaveBeenCalledWith('asset-not-found-AST-UNKNOWN-9999');
    expect(document.body.textContent).toContain('Create Asset');
    const tagInput = document.body.querySelector(
      'input[placeholder*="AST-1042"]',
    ) as HTMLInputElement;
    expect(tagInput?.value).toBe('AST-UNKNOWN-9999');

    act(() => {
      root.unmount();
    });
  });

  it('handles server network failure during lookup with message.error without showing Asset Not Found', async () => {
    const { assetsService } = await import('../../services/assets.service');
    vi.mocked(assetsService.getAssets).mockImplementation((params) => {
      if (params?.search === 'AST-SERVER-FAIL') {
        return Promise.reject(new Error('Network disconnected'));
      }
      return Promise.resolve(mockAssets);
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/assets?scan=true'] },
          createElement(AssetsPage),
        ),
      );
    });

    const manualInput = document.body.querySelector(
      'input[placeholder*="AST-2026"]',
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(manualInput, 'AST-SERVER-FAIL');
      manualInput.dispatchEvent(new Event('input', { bubbles: true }));
      manualInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );

    await act(async () => {
      lookupBtn?.click();
    });

    expect(mockMessageError).toHaveBeenCalledWith(
      'Failed to verify asset with server. Please try again.',
    );
    expect(mockNotificationWarning).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('does not falsely match unrelated assets when server returns partial search results', async () => {
    const { assetsService } = await import('../../services/assets.service');
    // Simulate server returning fuzzy match AST-1001 for query AST-1009-MISSING
    vi.mocked(assetsService.getAssets).mockResolvedValueOnce([mockAssets[0]]);

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/assets?scan=true'] },
          createElement(AssetsPage),
        ),
      );
    });

    const manualInput = document.body.querySelector(
      'input[placeholder*="AST-2026"]',
    ) as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(manualInput, 'AST-1009-MISSING');
      manualInput.dispatchEvent(new Event('input', { bubbles: true }));
      manualInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );

    await act(async () => {
      lookupBtn?.click();
    });

    // Should NOT falsely claim AST-1001 was matched
    expect(mockMessageSuccess).not.toHaveBeenCalled();
    // Must display Asset Not Found
    expect(mockNotificationWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Asset Not Found',
        description: expect.stringContaining('AST-1009-MISSING'),
      }),
    );

    act(() => {
      root.unmount();
    });
  });
});
