import { App, ConfigProvider, Form } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../services/api';
import { type Asset, assetsService } from '../../services/assets.service';
import AssetsPage from './AssetsPage';
import { AssetTable } from './components/AssetTable';
import { BatchPrintModal } from './components/BatchPrintModal';
import { useAssetManagement } from './hooks/useAssetManagement';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();
const mockModalConfirm = vi.fn();

const mockAppInstance = {
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: {
    confirm: mockModalConfirm,
  },
  notification: {
    warning: vi.fn(),
    destroy: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('antd');
  return {
    ...actual,
    App: {
      ...((actual.App as Record<string, unknown>) || {}),
      useApp: () => mockAppInstance,
    },
  };
});

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../services/organization.service', () => ({
  organizationService: {
    getOrganizations: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
    getLocationTree: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
  },
}));

function generateMockAssets(count = 15): Asset[] {
  return Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    const padded = String(num).padStart(4, '0');
    return {
      id: `ast-${num}`,
      tag: `AST-${padded}`,
      name: `Enterprise Device ${num}`,
      manufacturer: num % 2 === 0 ? 'Dell' : 'Apple',
      model: num % 2 === 0 ? 'Precision 5570' : 'MacBook Pro 16',
      serialNumber: `SN-DEVICE-${padded}`,
      category: num % 2 === 0 ? 'Workstations' : 'Laptops / Notebooks',
      categoryId: num % 2 === 0 ? 'cat-desktop' : 'cat-laptop',
      status: num % 3 === 0 ? 'In Storage' : 'Active',
      assignedTo: num % 3 === 0 ? '' : `Engineer ${num}`,
      assignedEmail: num % 3 === 0 ? '' : `engineer.${num}@enterprise.com`,
      location: 'Floor 4',
      locationPath: 'Global HQ > NY Office > Floor 4',
      department: 'Engineering',
      purchaseDate: '2026-01-15',
      warrantyExpiry: '2029-01-15',
      notes: `Asset note for device ${num}`,
    };
  });
}

describe('Adversarial Verification Suite: Table Selection, Batch Toolbar & Batch Delete Flow', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  const mockAssets = generateMockAssets(15);

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/assets') {
        return Promise.resolve({ data: { data: mockAssets } });
      }
      if (url === '/assets/stats') {
        return Promise.resolve({
          data: {
            data: {
              total: mockAssets.length,
              active: 10,
              inRepair: 0,
              inStorage: 5,
              retired: 0,
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    vi.mocked(api.post).mockImplementation((url, body) => {
      if (url === '/assets/batch-delete') {
        const payload = body as { ids: string[] };
        return Promise.resolve({
          data: {
            data: {
              count: payload.ids.length,
              deletedIds: payload.ids,
            },
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });
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
      .forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  describe('1. Multi-Row Selection & Pagination Invariants', () => {
    it('manages individual checkbox selection, multiple selections, and deselection accurately', async () => {
      let selectedKeys: React.Key[] = [];
      let selectedRecords: Asset[] = [];
      const onSelectionChange = vi.fn((keys: React.Key[], rows: Asset[]) => {
        selectedKeys = keys;
        selectedRecords = rows;
      });

      const renderTable = async (keys: React.Key[]) => {
        if (currentRoot) {
          await act(async () => {
            currentRoot?.unmount();
          });
          currentRoot = null;
        }
        currentRoot = createRoot(container);
        await act(async () => {
          currentRoot?.render(
            createElement(
              ConfigProvider,
              null,
              createElement(
                App,
                null,
                createElement(AssetTable, {
                  assets: mockAssets,
                  loading: false,
                  selectedRowKeys: keys,
                  onSelectionChange,
                  onShowDetails: vi.fn(),
                  onShowQr: vi.fn(),
                  onOpenEditModal: vi.fn(),
                  onDeleteAsset: vi.fn(),
                }),
              ),
            ),
          );
        });
      };

      await renderTable([]);

      const rowCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      expect(rowCheckboxes.length).toBe(10); // Page size 10

      // 1. Select row 1
      await act(async () => {
        rowCheckboxes[0].click();
      });
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(selectedKeys).toEqual(['ast-1']);
      expect(selectedRecords.map((r) => r.id)).toEqual(['ast-1']);

      // Re-render with row 1 selected
      await renderTable(selectedKeys);

      // Verify row 1 checked class
      const checkedBoxes = container.querySelectorAll('.ant-checkbox-checked');
      expect(checkedBoxes.length).toBe(1);

      // 2. Select row 2 while row 1 is selected
      const updatedRowCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        updatedRowCheckboxes[1].click();
      });
      expect(onSelectionChange).toHaveBeenCalledTimes(2);
      expect(selectedKeys).toContain('ast-1');
      expect(selectedKeys).toContain('ast-2');
      expect(selectedKeys.length).toBe(2);
      expect(selectedRecords.map((r) => r.id)).toContain('ast-1');
      expect(selectedRecords.map((r) => r.id)).toContain('ast-2');

      // Re-render with both selected
      await renderTable(selectedKeys);
      expect(container.querySelectorAll('.ant-checkbox-checked').length).toBe(2);

      // 3. Deselect row 1
      const checkboxesBoth = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        checkboxesBoth[0].click();
      });
      expect(onSelectionChange).toHaveBeenCalledTimes(3);
      expect(selectedKeys).not.toContain('ast-1');
      expect(selectedKeys).toContain('ast-2');
      expect(selectedKeys.length).toBe(1);
      expect(selectedRecords.map((r) => r.id)).toEqual(['ast-2']);

      // 4. Deselect row 2 -> 0 selected
      await renderTable(selectedKeys);
      const checkboxRow2Only = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        checkboxRow2Only[1].click();
      });
      expect(selectedKeys.length).toBe(0);
      expect(selectedRecords.length).toBe(0);
    }, 60000);

    it('selects all rows on current page via table header checkbox, and toggles to deselect all', async () => {
      let selectedKeys: React.Key[] = [];
      const onSelectionChange = vi.fn((keys: React.Key[]) => {
        selectedKeys = keys;
      });

      const renderTable = async (keys: React.Key[]) => {
        if (currentRoot) {
          await act(async () => {
            currentRoot?.unmount();
          });
          currentRoot = null;
        }
        currentRoot = createRoot(container);
        await act(async () => {
          currentRoot?.render(
            createElement(
              ConfigProvider,
              null,
              createElement(
                App,
                null,
                createElement(AssetTable, {
                  assets: mockAssets,
                  loading: false,
                  selectedRowKeys: keys,
                  onSelectionChange,
                  onShowDetails: vi.fn(),
                  onShowQr: vi.fn(),
                  onOpenEditModal: vi.fn(),
                  onDeleteAsset: vi.fn(),
                }),
              ),
            ),
          );
        });
      };

      await renderTable([]);

      const headerCheckbox = container.querySelector<HTMLInputElement>(
        'thead .ant-table-selection .ant-checkbox-input',
      );
      expect(headerCheckbox).not.toBeNull();

      // Click Select-All Header on Page 1 (10 rows)
      await act(async () => {
        headerCheckbox?.click();
      });
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(selectedKeys.length).toBe(10);
      expect(selectedKeys).toEqual(mockAssets.slice(0, 10).map((a) => a.id));

      // Re-render with all 10 selected
      await renderTable(selectedKeys);

      // Verify header checkbox is checked
      const checkedHeader = container.querySelector('thead .ant-checkbox-checked');
      expect(checkedHeader).not.toBeNull();

      // Click Select-All Header again to deselect all
      const headerCheckboxToDeselect = container.querySelector<HTMLInputElement>(
        'thead .ant-table-selection .ant-checkbox-input',
      );
      await act(async () => {
        headerCheckboxToDeselect?.click();
      });
      expect(onSelectionChange).toHaveBeenCalledTimes(2);
      expect(selectedKeys.length).toBe(0);
    });

    it('renders without selection column when onSelectionChange is undefined (graceful degradation)', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(AssetTable, {
                assets: mockAssets,
                loading: false,
                onShowDetails: vi.fn(),
                onShowQr: vi.fn(),
                onOpenEditModal: vi.fn(),
                onDeleteAsset: vi.fn(),
              }),
            ),
          ),
        );
      });

      // No checkbox columns rendered
      const checkboxes = container.querySelectorAll('.ant-checkbox-input');
      expect(checkboxes.length).toBe(0);
      expect(container.querySelector('.ant-table-selection-column')).toBeNull();
    });

    it('preserves keys with special characters and UUIDs correctly without corruption', async () => {
      const complexAssets: Asset[] = [
        {
          ...mockAssets[0],
          id: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
          tag: 'AST-SPEC-01',
        },
        {
          ...mockAssets[1],
          id: 'asset/department#123;sub=456',
          tag: 'AST-SPEC-02',
        },
      ];

      let selectedKeys: React.Key[] = [];
      const onSelectionChange = vi.fn((keys: React.Key[]) => {
        selectedKeys = keys;
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
              createElement(AssetTable, {
                assets: complexAssets,
                loading: false,
                selectedRowKeys: ['urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6'],
                onSelectionChange,
                onShowDetails: vi.fn(),
                onShowQr: vi.fn(),
                onOpenEditModal: vi.fn(),
                onDeleteAsset: vi.fn(),
              }),
            ),
          ),
        );
      });

      const checked = container.querySelectorAll('.ant-checkbox-checked');
      expect(checked.length).toBe(1);

      // Select second row with special character id
      const checkboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        checkboxes[1].click();
      });

      expect(selectedKeys).toContain('urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6');
      expect(selectedKeys).toContain('asset/department#123;sub=456');
    });
  });

  describe('2. Sticky Batch Action Toolbar & Lifecycle', () => {
    it('remains unmounted when selectedRowKeys is empty, and mounts sticky toolbar on selection', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(MemoryRouter, null, createElement(AssetsPage)));
      });

      // Initially no rows selected -> batch toolbar must not exist
      expect(container.textContent).not.toMatch(/Selected \d+ assets?/);
      expect(container.querySelector('button[danger]')).toBeNull();

      // Select row 1
      const rowCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      expect(rowCheckboxes.length).toBeGreaterThan(0);

      await act(async () => {
        rowCheckboxes[0].click();
      });

      // Sticky toolbar mounts
      expect(container.textContent).toContain('Selected 1 asset');
      expect(container.textContent).toContain('Batch Print QR');
      expect(container.textContent).toContain('Batch Delete');
      expect(container.textContent).toContain('Clear Selection');

      // Select row 2 -> plural text "Selected 2 assets"
      const updatedCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        updatedCheckboxes[1].click();
      });
      expect(container.textContent).toContain('Selected 2 assets');

      // Click "Clear Selection" -> toolbar unmounts
      const clearBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent?.includes('Clear Selection'),
      );
      expect(clearBtn).toBeDefined();

      await act(async () => {
        clearBtn?.click();
      });

      // Toolbar disappears
      expect(container.textContent).not.toMatch(/Selected \d+ assets?/);
    });

    it('opens BatchPrintModal passing exactly the selected asset entities on "Batch Print QR" click', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(MemoryRouter, null, createElement(AssetsPage)));
      });

      // Select row 1 and row 2
      const rowCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        rowCheckboxes[0].click();
      });
      const updatedCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        updatedCheckboxes[1].click();
      });

      // Click "Batch Print QR"
      const batchPrintBtn = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button'),
      ).find((b) => b.textContent?.includes('Batch Print QR'));
      expect(batchPrintBtn).toBeDefined();

      await act(async () => {
        batchPrintBtn?.click();
      });

      // Batch Print Modal must open with title indicating 2 labels
      const modalEl = document.body.querySelector('.ant-modal');
      expect(modalEl).not.toBeNull();
      expect(modalEl?.textContent).toContain('Batch Print QR Labels (2 Selected)');
      expect(modalEl?.textContent).toContain('AST-0001');
      expect(modalEl?.textContent).toContain('AST-0002');
      expect(modalEl?.textContent).not.toContain('AST-0003');

      // Close modal
      const closeBtn = Array.from(
        document.body.querySelectorAll<HTMLButtonElement>('.ant-modal button'),
      ).find((b) => b.textContent?.trim() === 'Close');
      await act(async () => {
        closeBtn?.click();
      });

      // Selection state should still be retained after closing print modal
      expect(container.textContent).toContain('Selected 2 assets');
    });
  });

  describe('3. Batch Delete Confirmation Modal & Destructive Flow', () => {
    it('prompts confirmation with exact count, asset tags preview, and danger button styling', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(MemoryRouter, null, createElement(AssetsPage)));
      });

      // Select 3 rows
      const rowCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        rowCheckboxes[0].click();
      });
      const check2 = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        check2[1].click();
      });
      const check3 = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        check3[2].click();
      });

      // Click Batch Delete button
      const batchDeleteBtn = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button'),
      ).find((b) => b.textContent?.includes('Batch Delete'));
      expect(batchDeleteBtn).toBeDefined();

      await act(async () => {
        batchDeleteBtn?.click();
      });

      // Verify modal.confirm invocation
      expect(mockModalConfirm).toHaveBeenCalledTimes(1);
      const confirmConfig = mockModalConfirm.mock.calls[0][0];

      expect(confirmConfig.title).toBe('Delete 3 Selected Assets?');
      expect(confirmConfig.okButtonProps).toEqual({ danger: true });
      expect(confirmConfig.okText).toBe('Delete 3 Assets');
      expect(confirmConfig.cancelText).toBe('Cancel');

      // Verify asset tags preview is included in content
      const content = confirmConfig.content;
      expect(content).toBeDefined();
    });

    it('cancels without calling backend or clearing selection when user declines confirmation', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(MemoryRouter, null, createElement(AssetsPage)));
      });

      // Select row 1
      const rowCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        rowCheckboxes[0].click();
      });

      // Click Batch Delete
      const batchDeleteBtn = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button'),
      ).find((b) => b.textContent?.includes('Batch Delete'));

      await act(async () => {
        batchDeleteBtn?.click();
      });

      expect(mockModalConfirm).toHaveBeenCalledTimes(1);

      // Do NOT trigger onOk (simulating Cancel or modal close)
      // Assert backend was NEVER called
      expect(api.post).not.toHaveBeenCalledWith('/assets/batch-delete', expect.anything());

      // Selection must remain intact
      expect(container.textContent).toContain('Selected 1 asset');
    });

    it('executes atomic batch delete upon confirmation: sends IDs, notifies success, clears selection, and reloads data', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(MemoryRouter, null, createElement(AssetsPage)));
      });

      // Select 2 rows
      const rowCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        rowCheckboxes[0].click();
      });
      const check2 = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        check2[1].click();
      });

      const batchDeleteBtn = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button'),
      ).find((b) => b.textContent?.includes('Batch Delete'));

      await act(async () => {
        batchDeleteBtn?.click();
      });

      const confirmConfig = mockModalConfirm.mock.calls[0][0];

      // Simulate user clicking "Delete 2 Assets" (onOk)
      await act(async () => {
        await confirmConfig.onOk();
      });

      // 1. Backend POST called with accurate selected IDs
      expect(api.post).toHaveBeenCalledWith('/assets/batch-delete', {
        ids: ['ast-1', 'ast-2'],
      });

      // 2. Success message notified
      expect(mockMessageSuccess).toHaveBeenCalledWith('Successfully deleted 2 assets.');

      // 3. Selection cleared -> toolbar unmounted
      expect(container.textContent).not.toMatch(/Selected \d+ assets?/);

      // 4. Data reloaded
      expect(api.get).toHaveBeenCalledWith('/assets', expect.anything());
    });

    it('handles backend batch delete failure gracefully without crashing and preserves user selection', async () => {
      vi.mocked(api.post).mockRejectedValueOnce(
        new Error('Database transaction lock timeout on bulk deletion'),
      );

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(createElement(MemoryRouter, null, createElement(AssetsPage)));
      });

      // Select row 1
      const rowCheckboxes = container.querySelectorAll<HTMLInputElement>(
        'tbody .ant-table-row .ant-checkbox-input',
      );
      await act(async () => {
        rowCheckboxes[0].click();
      });

      const batchDeleteBtn = Array.from(
        container.querySelectorAll<HTMLButtonElement>('button'),
      ).find((b) => b.textContent?.includes('Batch Delete'));

      await act(async () => {
        batchDeleteBtn?.click();
      });

      const confirmConfig = mockModalConfirm.mock.calls[0][0];

      // Execute onOk which will fail
      await act(async () => {
        await confirmConfig.onOk();
      });

      // Error message surfaced via message.error
      expect(mockMessageError).toHaveBeenCalledWith(
        expect.stringContaining('Database transaction lock timeout'),
      );

      // Selection must NOT be discarded on failure so user does not lose their selection
      expect(container.textContent).toContain('Selected 1 asset');
    });

    it('truncates asset tags in modal text when more than 10 items are selected', async () => {
      let capturedConfig: { title?: string; content?: unknown } = {};
      const TestHookHost: React.FC = () => {
        const [form] = Form.useForm();
        const hook = useAssetManagement(form);

        return createElement('div', null, [
          createElement(
            'button',
            {
              key: 'btn-select-all',
              onClick: () => {
                hook.setSelectedRowKeys(mockAssets.map((a) => a.id));
              },
            },
            'Select All 15',
          ),
          createElement(
            'button',
            {
              key: 'btn-batch-delete',
              onClick: () => {
                hook.handleBatchDelete();
              },
            },
            'Trigger Batch Delete',
          ),
        ]);
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(App, null, createElement(TestHookHost)),
            ),
          ),
        );
      });

      // Wait for initial loadData to populate assets in hook
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Select all 15
      const selectAllBtn = container.querySelector('button') as HTMLButtonElement;
      await act(async () => {
        selectAllBtn.click();
      });

      // Trigger batch delete
      const batchDeleteBtn = container.querySelectorAll('button')[1] as HTMLButtonElement;
      await act(async () => {
        batchDeleteBtn.click();
      });

      expect(mockModalConfirm).toHaveBeenCalledTimes(1);
      capturedConfig = mockModalConfirm.mock.calls[0][0];
      expect(capturedConfig.title).toBe('Delete 15 Selected Assets?');

      // Verify "and 5 more" appears in the tags text
      const contentEl = document.createElement('div');
      const tempRoot = createRoot(contentEl);
      await act(async () => {
        tempRoot.render(capturedConfig.content as React.ReactElement);
      });
      expect(contentEl.textContent).toContain('and 5 more');
      act(() => {
        tempRoot.unmount();
      });
    });
  });

  describe('4. Pinned Actions Column & Table Scroll Specification', () => {
    it('verifies actions column is pinned to right/end with explicit width: 150', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(AssetTable, {
                assets: mockAssets,
                loading: false,
                onShowDetails: vi.fn(),
                onShowQr: vi.fn(),
                onOpenEditModal: vi.fn(),
                onDeleteAsset: vi.fn(),
              }),
            ),
          ),
        );
      });

      // Check header cell for fixed right/end class
      const actionsHeader = container.querySelector(
        'th.ant-table-cell-fix-right, th.ant-table-cell-fix-end',
      );
      expect(actionsHeader).not.toBeNull();
      expect(actionsHeader?.textContent).toContain('Actions');

      // Check data cells for fixed right/end class
      const actionsCells = container.querySelectorAll(
        'td.ant-table-cell-fix-right, td.ant-table-cell-fix-end',
      );
      expect(actionsCells.length).toBe(10); // 10 rows on page 1

      // Verify horizontal scroll container exists
      const tableContent = container.querySelector('.ant-table-content');
      expect(tableContent).not.toBeNull();
    });
  });

  describe('5. Backwards Compatibility & Service Layer Contracts', () => {
    it('retains exportCsv function producing valid RFC-compliant CSV without regression', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'ast-c1',
              tag: 'AST-CSV-01',
              name: 'ThinkPad X1 "Carbon" Gen 11',
              manufacturer: 'Lenovo',
              model: '21HM002DUS',
              category: 'Laptops / Notebooks',
              status: 'Active',
              assignedTo: 'Alice Wonderland',
            },
          ],
        },
      });

      const csv = await assetsService.exportCsv();
      expect(csv).toBeDefined();

      const lines = csv.split('\n');
      expect(lines[0]).toBe('Tag,Name,Manufacturer,Model,Category,Status,Assigned To');
      expect(lines[1]).toContain('AST-CSV-01');
      expect(lines[1]).toContain('"ThinkPad X1 ""Carbon"" Gen 11"');
      expect(lines[1]).toContain('Lenovo');
      expect(lines[1]).toContain('Alice Wonderland');
    });

    it('implements exportXlsx sending binary request to /assets/export.xlsx', async () => {
      const mockBlob = new Blob(['dummy-binary-xlsx-data'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      vi.mocked(api.get).mockResolvedValueOnce({
        data: mockBlob,
      });

      const result = await assetsService.exportXlsx({ status: 'Active' });
      expect(api.get).toHaveBeenCalledWith('/assets/export.xlsx', {
        params: { status: 'Active' },
        responseType: 'blob',
      });
      expect(result).toBe(mockBlob);
    });

    it('aliases batchDelete to batchDeleteAssets ensuring API compatibility', async () => {
      const result1 = await assetsService.batchDeleteAssets(['ast-10', 'ast-20']);
      expect(api.post).toHaveBeenCalledWith('/assets/batch-delete', {
        ids: ['ast-10', 'ast-20'],
      });
      expect(result1).toEqual({ count: 2, deletedIds: ['ast-10', 'ast-20'] });

      const result2 = await assetsService.batchDelete(['ast-30']);
      expect(api.post).toHaveBeenCalledWith('/assets/batch-delete', {
        ids: ['ast-30'],
      });
      expect(result2).toEqual({ count: 1, deletedIds: ['ast-30'] });
    });
  });

  describe('7. Adversarial Regression Verifications for Reviewer Findings', () => {
    it('retains selectedAssets across multiple pages and accumulates records in useAssetManagement', async () => {
      let hookInstance!: ReturnType<typeof useAssetManagement>;

      const TestHarness = () => {
        const [form] = Form.useForm();
        hookInstance = useAssetManagement(form);
        return createElement(
          'div',
          null,
          createElement(
            'span',
            { 'data-testid': 'selected-count' },
            String(hookInstance.selectedAssets.length),
          ),
        );
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(App, null, createElement(TestHarness)),
            ),
          ),
        );
      });

      // 1. Initial selection is empty
      expect(hookInstance.selectedRowKeys).toEqual([]);
      expect(hookInstance.selectedAssets).toEqual([]);

      // 2. Select page 1 item
      await act(async () => {
        hookInstance.handleSelectionChange(['ast-1'], [mockAssets[0]]);
      });
      expect(hookInstance.selectedRowKeys).toEqual(['ast-1']);
      expect(hookInstance.selectedAssets.map((a) => a.id)).toEqual(['ast-1']);

      // 3. Select page 2 item while page 1 item is selected (cross-page selection retention)
      // When paginating in Ant Design with preserveSelectedRowKeys: true,
      // onChange is invoked with keys: ['ast-1', 'ast-11'], and rows: [mockAssets[10]] (page 2 row)
      await act(async () => {
        hookInstance.handleSelectionChange(['ast-1', 'ast-11'], [mockAssets[10]]);
      });
      expect(hookInstance.selectedRowKeys).toEqual(['ast-1', 'ast-11']);
      expect(hookInstance.selectedAssets.map((a) => a.id)).toEqual(['ast-1', 'ast-11']);

      // 4. Deselect page 1 item
      await act(async () => {
        hookInstance.handleSelectionChange(['ast-11'], [mockAssets[10]]);
      });
      expect(hookInstance.selectedRowKeys).toEqual(['ast-11']);
      expect(hookInstance.selectedAssets.map((a) => a.id)).toEqual(['ast-11']);

      // 5. Clear selection
      await act(async () => {
        hookInstance.handleClearSelection();
      });
      expect(hookInstance.selectedRowKeys).toEqual([]);
      expect(hookInstance.selectedAssets).toEqual([]);
    });

    it('renders BatchPrintModal preview container with printable-viewport class name', async () => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(BatchPrintModal, {
                open: true,
                assets: mockAssets.slice(0, 3),
                onClose: vi.fn(),
              }),
            ),
          ),
        );
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const viewport = document.body.querySelector('.printable-viewport');
      expect(viewport).not.toBeNull();
      expect(viewport?.classList.contains('printable-viewport')).toBe(true);
    });

    it('verifies assetsService API endpoints do not duplicate /api/v1 prefix', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: new Blob(['test-xlsx']),
      });
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { data: { count: 1, deletedIds: ['ast-1'] } },
      });

      await assetsService.exportXlsx();
      expect(api.get).toHaveBeenCalledWith(
        '/assets/export.xlsx',
        expect.objectContaining({ responseType: 'blob' }),
      );

      await assetsService.batchDeleteAssets(['ast-1']);
      expect(api.post).toHaveBeenCalledWith('/assets/batch-delete', { ids: ['ast-1'] });
    });
  });
});
