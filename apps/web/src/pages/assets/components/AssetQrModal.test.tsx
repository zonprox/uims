import { ConfigProvider, theme } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import * as printUtil from '../utils/printAssetLabel';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { AssetQrModal } from './AssetQrModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssetQrModal and AssetDetailDrawer Dark Mode & Print Integration', () => {
  let container: HTMLDivElement;
  let printSpy: ReturnType<typeof vi.spyOn>;

  const mockAsset: Asset = {
    id: 'ast-101',
    tag: 'AST-2026-0042',
    name: 'Dell Precision 5570',
    serialNumber: 'SN-DELL-5570-01',
    category: 'Laptop',
    model: 'Precision 5570',
    manufacturer: 'Dell',
    status: 'Active',
    assignedTo: 'Marcus Vance',
    assignedEmail: 'marcus@uims.internal',
    location: 'Building A, Room 402',
    purchaseDate: '2026-02-10',
    purchasePrice: 2499,
    warrantyExpiry: '2029-02-10',
    specs: {
      cpu: 'Intel Core i7-12800H',
      ram: '32 GB',
      storage: '1 TB SSD',
      os: 'Windows 11 Pro',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    printSpy = vi.spyOn(printUtil, 'printAssetLabel').mockImplementation(() => {});
  });

  afterEach(() => {
    printSpy.mockRestore();
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('AssetQrModal', () => {
    it('renders asset tag, name, and serial number correctly', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(AssetQrModal, {
            open: true,
            qrAsset: mockAsset,
            onClose: vi.fn(),
          }),
        );
      });

      expect(document.body.textContent).toContain('Asset Tag Label: AST-2026-0042');
      expect(document.body.textContent).toContain('AST-2026-0042');
      expect(document.body.textContent).toContain('Dell Precision 5570');
      expect(document.body.textContent).toContain('SN-DELL-5570-01');

      const labelBadge = document.body.querySelector('.printable-asset-label');
      expect(labelBadge).not.toBeNull();
    });

    it('triggers printAssetLabel when Print QR Label button is clicked', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(AssetQrModal, {
            open: true,
            qrAsset: mockAsset,
            onClose: vi.fn(),
          }),
        );
      });

      const buttons = Array.from(document.body.querySelectorAll('button'));
      const printBtn = buttons.find((btn) => btn.textContent?.includes('Print QR Label'));
      expect(printBtn).toBeDefined();

      await act(async () => {
        printBtn?.click();
      });

      expect(printSpy).toHaveBeenCalledTimes(1);
      expect(printSpy).toHaveBeenCalledWith(mockAsset, expect.anything());
    });

    it('renders cleanly in dark mode without hardcoded light backgrounds', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            {
              theme: {
                algorithm: theme.darkAlgorithm,
              },
            },
            createElement(AssetQrModal, {
              open: true,
              qrAsset: mockAsset,
              onClose: vi.fn(),
            }),
          ),
        );
      });

      const labelBadge = document.body.querySelector('.printable-asset-label') as HTMLElement;
      expect(labelBadge).not.toBeNull();

      // Ensure no hardcoded #fff or #ffffff background on printable-asset-label in dark mode
      const bg = labelBadge.style.backgroundColor;
      expect(bg).not.toBe('#fff');
      expect(bg).not.toBe('#ffffff');
      expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  });

  describe('AssetDetailDrawer QR Tab', () => {
    it('renders QR code tab with printable-asset-label and triggers printAssetLabel', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(AssetDetailDrawer, {
            open: true,
            selectedAsset: mockAsset,
            onClose: vi.fn(),
            onOpenEditModal: vi.fn(),
          }),
        );
      });

      // Switch to QR Code tab
      const tabHeaders = Array.from(document.body.querySelectorAll('.ant-tabs-tab'));
      const qrTabHeader = tabHeaders.find((t) => t.textContent?.includes('QR Code'));
      expect(qrTabHeader).toBeDefined();

      await act(async () => {
        (qrTabHeader as HTMLElement).click();
      });

      const labelBadge = document.body.querySelector('.printable-asset-label');
      expect(labelBadge).not.toBeNull();
      expect(document.body.textContent).toContain('AST-2026-0042');
      expect(document.body.textContent).toContain('Dell Precision 5570');

      const buttons = Array.from(document.body.querySelectorAll('button'));
      const printBtn = buttons.find((btn) => btn.textContent?.includes('Print QR Label'));
      expect(printBtn).toBeDefined();

      await act(async () => {
        printBtn?.click();
      });

      expect(printSpy).toHaveBeenCalledTimes(1);
      expect(printSpy).toHaveBeenCalledWith(mockAsset, expect.anything());
    });

    it('renders QR code tab in dark mode without hardcoded white background or black text', async () => {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          createElement(
            ConfigProvider,
            {
              theme: {
                algorithm: theme.darkAlgorithm,
              },
            },
            createElement(AssetDetailDrawer, {
              open: true,
              selectedAsset: mockAsset,
              onClose: vi.fn(),
              onOpenEditModal: vi.fn(),
            }),
          ),
        );
      });

      const tabHeaders = Array.from(document.body.querySelectorAll('.ant-tabs-tab'));
      const qrTabHeader = tabHeaders.find((t) => t.textContent?.includes('QR Code'));
      await act(async () => {
        (qrTabHeader as HTMLElement)?.click();
      });

      const labelBadge = document.body.querySelector('.printable-asset-label') as HTMLElement;
      expect(labelBadge).not.toBeNull();

      // Verify no hardcoded white background
      const bg = labelBadge.style.backgroundColor;
      expect(bg).not.toBe('#fff');
      expect(bg).not.toBe('#ffffff');
      expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  });
});
