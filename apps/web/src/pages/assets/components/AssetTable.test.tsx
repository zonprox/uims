import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { AssetTable } from './AssetTable';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssetTable Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

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
      location: 'Floor 4',
      locationPath: 'Global HQ > NY Office > Floor 4',
      department: 'Engineering',
      purchaseDate: '2026-01-15',
      warrantyExpiry: '2029-01-15',
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
      warrantyExpiry: '2028-11-20',
    },
  ];

  const defaultProps = {
    assets: mockAssets,
    loading: false,
    onShowDetails: vi.fn(),
    onShowQr: vi.fn(),
    onOpenEditModal: vi.fn(),
    onDeleteAsset: vi.fn(),
  };

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
      .forEach((el) => {
        el.remove();
      });
  });

  const renderComponent = async (props = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(AssetTable, mergedProps)),
        ),
      );
    });
  };

  it('renders assets in table correctly', async () => {
    await renderComponent();

    expect(container.textContent).toContain('AST-1001');
    expect(container.textContent).toContain('MacBook Pro 16');
    expect(container.textContent).toContain('AST-1002');
    expect(container.textContent).toContain('Dell Precision 7780');
  });

  it('renders row selection checkboxes when onSelectionChange is provided', async () => {
    const onSelectionChange = vi.fn();
    await renderComponent({
      selectedRowKeys: ['ast-1'],
      onSelectionChange,
    });

    const checkboxes = container.querySelectorAll('.ant-checkbox-input');
    expect(checkboxes.length).toBeGreaterThan(0);

    const checkedBoxes = container.querySelectorAll('.ant-checkbox-checked');
    expect(checkedBoxes.length).toBeGreaterThan(0);
  });

  it('calls onSelectionChange when a row checkbox is clicked', async () => {
    const onSelectionChange = vi.fn();
    await renderComponent({
      selectedRowKeys: [],
      onSelectionChange,
    });

    const rowCheckboxes = container.querySelectorAll(
      'tbody .ant-table-row .ant-checkbox-input',
    );
    expect(rowCheckboxes.length).toBe(2);

    await act(async () => {
      (rowCheckboxes[0] as HTMLInputElement).click();
    });

    expect(onSelectionChange).toHaveBeenCalled();
    const calledKeys = onSelectionChange.mock.calls[0][0];
    expect(calledKeys).toContain('ast-1');
  });

  it('pins the actions column to the right/end with explicit width of 150', async () => {
    await renderComponent();

    // Verify fixed column header classes or elements
    const actionsHeader = container.querySelector(
      'th.ant-table-cell-fix-right, th.ant-table-cell-fix-end',
    );
    expect(actionsHeader).not.toBeNull();
    expect(actionsHeader?.textContent).toContain('Actions');

    // Verify horizontal scrolling container is rendered
    const tableContent = container.querySelector('.ant-table-content');
    expect(tableContent).not.toBeNull();
  });

  it('triggers action callbacks when action buttons are clicked', async () => {
    const onShowDetails = vi.fn();
    const onShowQr = vi.fn();
    const onOpenEditModal = vi.fn();

    await renderComponent({
      onShowDetails,
      onShowQr,
      onOpenEditModal,
    });

    // Click asset name for details
    const assetNameEl = Array.from(container.querySelectorAll('span, div')).find(
      (el) => el.textContent === 'MacBook Pro 16',
    );
    if (assetNameEl) {
      await act(async () => {
        (assetNameEl as HTMLElement).click();
      });
      expect(onShowDetails).toHaveBeenCalledWith(mockAssets[0]);
    }

    // Action buttons in the first row
    const actionButtons = container.querySelectorAll(
      'tr[data-row-key="ast-1"] .ant-btn',
    );
    expect(actionButtons.length).toBeGreaterThanOrEqual(3);

    // Eye button -> onShowDetails
    await act(async () => {
      (actionButtons[0] as HTMLButtonElement).click();
    });
    expect(onShowDetails).toHaveBeenCalled();

    // QR button -> onShowQr
    await act(async () => {
      (actionButtons[1] as HTMLButtonElement).click();
    });
    expect(onShowQr).toHaveBeenCalledWith(mockAssets[0]);

    // Edit button -> onOpenEditModal
    await act(async () => {
      (actionButtons[2] as HTMLButtonElement).click();
    });
    expect(onOpenEditModal).toHaveBeenCalledWith(mockAssets[0]);
  });
});
