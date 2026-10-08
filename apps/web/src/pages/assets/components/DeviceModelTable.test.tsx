import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { DeviceModelTable } from './DeviceModelTable';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('DeviceModelTable Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  const mockModels: Asset[] = [
    {
      id: 'mod-1',
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
      specifications: 'i7-1370P, 32GB RAM, 512GB SSD',
      unitCost: 1450,
      costCenter: { id: 'cc-1', code: 'IT-OPS', name: 'IT Operations' },
      unitCounts: { total: 25, available: 10, inUse: 15 },
    },
    {
      id: 'mod-2',
      tag: 'MOD-MBP-14',
      assetCode: 'MOD-MBP-14',
      name: 'MacBook Pro 14 M3',
      manufacturer: 'Apple',
      model: 'MacBook Pro 14',
      category: 'Laptops / Notebooks',
      status: 'Active',
      assignedTo: '',
      assignedEmail: '',
      purchaseDate: '2026-02-01',
      warrantyExpiry: '2029-02-01',
      specifications: 'M3 Pro, 18GB RAM, 512GB SSD',
      unitCost: 1999,
      costCenter: { id: 'cc-2', code: 'ENG-DEV', name: 'Software Engineering' },
      unitCounts: { total: 10, available: 2, inUse: 8 },
    },
  ];

  const defaultProps = {
    models: mockModels,
    loading: false,
    onEditModel: vi.fn(),
    onRegisterUnit: vi.fn(),
    onDeleteModel: vi.fn(),
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
    container?.remove();
    document.body.innerHTML = '';
  });

  it('renders device models catalog table with codes, specs, unit costs, and unit counts', async () => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(DeviceModelTable, defaultProps)),
        ),
      );
    });

    expect(container.textContent).toContain('MOD-DELL-5420');
    expect(container.textContent).toContain('Dell Latitude 5420');
    expect(container.textContent).toContain('MOD-MBP-14');
    expect(container.textContent).toContain('MacBook Pro 14 M3');
    expect(container.textContent).toContain('i7-1370P, 32GB RAM, 512GB SSD');
    expect(container.textContent).toContain('IT-OPS');
    expect(container.textContent).toContain('ENG-DEV');
    expect(container.textContent).toContain('$1,450.00');
    expect(container.textContent).toContain('Total: 25');
    expect(container.textContent).toContain('Avail: 10');
    expect(container.textContent).toContain('In Use: 15');
  });

  it('triggers onRegisterUnit callback when "Register Unit under model" action is clicked', async () => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(DeviceModelTable, defaultProps)),
        ),
      );
    });

    const addUnitButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) =>
        b.getAttribute('aria-label')?.includes('Register Unit') ||
        b.querySelector('.anticon-plus-circle'),
    );
    expect(addUnitButtons.length).toBeGreaterThan(0);

    await act(async () => {
      addUnitButtons[0]?.click();
    });

    expect(defaultProps.onRegisterUnit).toHaveBeenCalledWith(mockModels[0]);
  });

  it('triggers onEditModel callback when edit button is clicked', async () => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(DeviceModelTable, defaultProps)),
        ),
      );
    });

    const editButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.querySelector('[aria-label="edit"]') || b.querySelector('.anticon-edit'),
    );
    expect(editButtons.length).toBeGreaterThan(0);

    await act(async () => {
      editButtons[0]?.click();
    });

    expect(defaultProps.onEditModel).toHaveBeenCalledWith(mockModels[0]);
  });
});
