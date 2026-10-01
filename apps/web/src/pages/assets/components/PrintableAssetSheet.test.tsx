import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { PrintableAssetSheet } from './PrintableAssetSheet';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PrintableAssetSheet Component', () => {
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
      location: 'Warehouse B',
      purchaseDate: '2025-11-20',
      warrantyExpiry: '2028-11-20',
    },
    {
      id: 'ast-3',
      tag: 'AST-1003',
      name: 'Cisco Catalyst 9300',
      manufacturer: 'Cisco',
      model: '9300-48P',
      serialNumber: 'SN-CISCO-9300',
      category: 'Network Switches',
      status: 'Active',
      assignedTo: '',
      assignedEmail: '',
      location: 'Server Room',
      purchaseDate: '2025-06-10',
      warrantyExpiry: '2030-06-10',
    },
  ];

  beforeEach(() => {
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

  const renderComponent = async (props: { assets: Asset[]; columns?: 3 | 4 }) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(PrintableAssetSheet, props)),
        ),
      );
    });
  };

  it('renders empty state when assets array is empty', async () => {
    await renderComponent({ assets: [] });

    expect(container.textContent).toContain('No assets selected for printing');
  });

  it('renders all asset label cards in the grid', async () => {
    await renderComponent({ assets: mockAssets, columns: 3 });

    const cards = container.querySelectorAll('.printable-sheet-card');
    expect(cards.length).toBe(3);

    expect(container.textContent).toContain('AST-1001');
    expect(container.textContent).toContain('MacBook Pro 16');
    expect(container.textContent).toContain('S/N: SN-APPLE-1001');

    expect(container.textContent).toContain('AST-1002');
    expect(container.textContent).toContain('Dell Precision 7780');

    expect(container.textContent).toContain('AST-1003');
    expect(container.textContent).toContain('Cisco Catalyst 9300');
    expect(container.textContent).toContain('S/N: SN-CISCO-9300');
  });

  it('renders Ant Design SVG QR codes within cards', async () => {
    await renderComponent({ assets: mockAssets, columns: 3 });

    const svgs = container.querySelectorAll('.printable-sheet-card svg');
    expect(svgs.length).toBe(3);
  });

  it('applies 3-column and 4-column layout classes appropriately', async () => {
    await renderComponent({ assets: mockAssets, columns: 3 });
    const grid3 = container.querySelector('.printable-asset-sheet');
    expect(grid3?.classList.contains('cols-3')).toBe(true);

    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }

    await renderComponent({ assets: mockAssets, columns: 4 });
    const grid4 = container.querySelector('.printable-asset-sheet');
    expect(grid4?.classList.contains('cols-4')).toBe(true);
  });

  it('includes dashed cut-guide border and break-inside avoidance on each card', async () => {
    await renderComponent({ assets: mockAssets, columns: 3 });

    const firstCard = container.querySelector('.printable-sheet-card') as HTMLElement;
    expect(firstCard).not.toBeNull();
    expect(firstCard.style.border).toContain('dashed');
    expect(firstCard.style.breakInside).toBe('avoid');
  });
});
