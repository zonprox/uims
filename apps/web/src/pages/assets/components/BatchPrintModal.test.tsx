import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { BatchPrintModal } from './BatchPrintModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BatchPrintModal Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;
  let originalPrint: typeof window.print | undefined;
  const printMock = vi.fn();

  const mockAssets: Asset[] = [
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
      purchaseDate: '2026-01-15',
      warrantyExpiry: '2029-01-15',
    },
    {
      id: 'ast-2',
      tag: 'AST-1002',
      name: 'Dell Precision 7780',
      manufacturer: 'Dell',
      model: 'Precision 7780',
      serialNumber: '',
      category: 'Laptop',
      status: 'In Storage',
      assignedTo: '',
      assignedEmail: '',
      purchaseDate: '2025-11-20',
      warrantyExpiry: '2028-11-20',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    originalPrint = window.print;
    window.print = printMock;
  });

  afterEach(async () => {
    if (originalPrint) {
      window.print = originalPrint;
    } else {
      delete (window as unknown as { print?: unknown }).print;
    }
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
      .forEach((el) => {
        el.remove();
      });
  });

  const renderComponent = async (props: {
    open: boolean;
    assets: Asset[];
    onClose: () => void;
  }) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(BatchPrintModal, props)),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  it('renders modal when open is true with title showing count and printable-viewport class', async () => {
    const onClose = vi.fn();
    await renderComponent({ open: true, assets: mockAssets, onClose });

    expect(document.body.textContent).toContain('Batch Print QR Labels (2 Selected)');
    expect(document.body.textContent).toContain('AST-1001');
    expect(document.body.textContent).toContain('AST-1002');
    expect(document.body.querySelector('.printable-viewport')).not.toBeNull();
  });

  it('calls window.print when Print Sheet button is clicked', async () => {
    const onClose = vi.fn();
    await renderComponent({ open: true, assets: mockAssets, onClose });

    const printButton = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Print Sheet'),
    );
    expect(printButton).toBeDefined();

    await act(async () => {
      printButton?.click();
    });

    expect(printMock).toHaveBeenCalled();
  });

  it('calls onClose when Close button is clicked', async () => {
    const onClose = vi.fn();
    await renderComponent({ open: true, assets: mockAssets, onClose });

    const closeButton = Array.from(document.body.querySelectorAll('button')).find(
      (btn) => btn.textContent?.trim() === 'Close',
    );
    expect(closeButton).toBeDefined();

    await act(async () => {
      closeButton?.click();
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('switches grid density between 3 and 4 columns', async () => {
    const onClose = vi.fn();
    await renderComponent({ open: true, assets: mockAssets, onClose });

    const segmentedItems = document.body.querySelectorAll('.ant-segmented-item');
    expect(segmentedItems.length).toBe(2);

    // Click 4 Columns
    const fourColsItem = Array.from(segmentedItems).find((el) =>
      el.textContent?.includes('4 Columns'),
    );
    expect(fourColsItem).toBeDefined();

    await act(async () => {
      (fourColsItem as HTMLElement)?.click();
    });

    const grid = document.body.querySelector('.printable-asset-sheet');
    expect(grid?.classList.contains('cols-4')).toBe(true);
  });
});
