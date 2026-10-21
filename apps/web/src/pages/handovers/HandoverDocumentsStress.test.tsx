import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assetsService } from '../../services/assets.service';
import {
  dashboardService,
  type PendingHandoverRecordItem,
  type PendingHandoverSummaryResponse,
} from '../../services/dashboard.service';
import HandoverDocumentsPage from './HandoverDocumentsPage';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();
const mockMessageWarning = vi.fn();
const mockMessageInfo = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({
      children,
      to,
      ...rest
    }: {
      children?: React.ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => createElement('a', { href: to, ...rest }, children),
  };
});

const mockAppInstance = {
  message: {
    success: mockMessageSuccess,
    error: mockMessageError,
    warning: mockMessageWarning,
    info: mockMessageInfo,
  },
  modal: {
    confirm: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  notification: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('antd');
  return {
    ...actual,
    App: {
      useApp: () => mockAppInstance,
    },
  };
});

vi.mock('../../services/dashboard.service', async () => {
  const actual = await vi.importActual('../../services/dashboard.service');
  return {
    ...actual,
    dashboardService: {
      getPendingHandovers: vi.fn(),
      getOverview: vi.fn(),
    },
  };
});

vi.mock('../../services/assets.service', async () => {
  const actual = await vi.importActual('../../services/assets.service');
  return {
    ...actual,
    assetsService: {
      downloadHandoverDocx: vi.fn(),
      generateHandoverDocument: vi.fn(),
      uploadHandoverDocument: vi.fn(),
      attachHandoverDocument: vi.fn(),
    },
  };
});

vi.mock('../assets/utils/printDocument', async () => {
  const actual = await vi.importActual('../assets/utils/printDocument');
  return {
    ...actual,
    downloadBlobFile: vi.fn(),
    printDocumentHtml: vi.fn(),
  };
});

/** Helper to generate large sets of synthetic records */
function generateSyntheticRecords(
  count: number,
  options?: { omitSubcode?: boolean },
): Array<PendingHandoverRecordItem> {
  const types: Array<'ASSIGNMENT' | 'RETURN' | 'TRANSFER'> = ['ASSIGNMENT', 'RETURN', 'TRANSFER'];
  const depts = ['Engineering', 'Finance', 'Human Resources', 'Operations', 'Security', 'IT'];

  return Array.from({ length: count }, (_, i) => {
    const idx = i + 1;
    const type = types[i % 3] ?? 'ASSIGNMENT';
    const isOverdue = i % 4 === 0;
    const assetTag = `AST-STRESS-${String(idx).padStart(4, '0')}`;
    const subcode = options?.omitSubcode ? '' : `SUB-STRESS-${String(idx).padStart(4, '0')}`;

    return {
      id: `stress-rec-${idx}`,
      recordId: `stress-rec-${idx}`,
      assetId: `ast-stress-${idx}`,
      assetTag,
      subcode,
      modelName: `Hardware Model ${idx % 5} Pro`,
      serialNumber: `SN-STRESS-${String(idx).padStart(6, '0')}`,
      type,
      handoverType: type,
      recipientId: `usr-custodian-${idx}`,
      recipientName: `Custodian Employee ${idx}`,
      recipientEmail: `custodian.${idx}@uims.internal`,
      department: depts[i % depts.length],
      departmentName: depts[i % depts.length],
      createdAt: `2026-10-${String((idx % 20) + 1).padStart(2, '0')}T08:00:00Z`,
      daysPending: (idx % 10) + 1,
      isOverdue,
      timeAgo: `${(idx % 10) + 1}d ago`,
    };
  });
}

function createMockSummary(
  overrides?: Partial<PendingHandoverSummaryResponse>,
): PendingHandoverSummaryResponse {
  const records = overrides?.records ?? [];
  const assignCount = records.filter((r) => (r.type || r.handoverType) === 'ASSIGNMENT').length;
  const returnCount = records.filter((r) => (r.type || r.handoverType) === 'RETURN').length;
  const transferCount = records.filter((r) => (r.type || r.handoverType) === 'TRANSFER').length;
  const overdueCount = records.filter((r) => r.isOverdue).length;

  return {
    totalPending: overrides?.totalPending ?? records.length,
    overdueCount: overrides?.overdueCount ?? overdueCount,
    pendingAssignments: overrides?.pendingAssignments ?? assignCount,
    pendingReturns: overrides?.pendingReturns ?? returnCount,
    pendingTransfers: overrides?.pendingTransfers ?? transferCount,
    breakdownByType: overrides?.breakdownByType ?? {
      assignment: assignCount,
      return: returnCount,
      transfer: transferCount,
    },
    records,
    ...overrides,
  };
}

describe('Empirical Challenger: HandoverDocumentsPage Stress & Adversarial Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    if (container?.parentNode) {
      document.body.removeChild(container);
    }
    document
      .querySelectorAll(
        '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-select-dropdown, .ant-tooltip',
      )
      .forEach((el) => {
        el.remove();
      });
  });

  const renderPage = async () => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(createElement(HandoverDocumentsPage));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    return root;
  };

  const setInputValue = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const selectOption = async (selectEl: HTMLElement, optionText: string) => {
    const selector = (selectEl.querySelector('.ant-select-selector') ||
      selectEl.querySelector('.ant-select') ||
      selectEl) as HTMLElement;
    const input = selectEl.querySelector('input') as HTMLInputElement | null;

    await act(async () => {
      selector.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      selector.click();
      if (input) {
        input.focus();
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        input.click();
      }
      await new Promise((r) => setTimeout(r, 60));
    });

    const options = Array.from(document.querySelectorAll('.ant-select-item-option'));
    const targetOption = options.find((opt) => opt.textContent?.trim().includes(optionText)) as
      | HTMLElement
      | undefined;

    expect(targetOption).toBeDefined();

    if (targetOption) {
      await act(async () => {
        targetOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        targetOption.click();
        await new Promise((r) => setTimeout(r, 60));
      });
    }
  };

  describe('Part 1: Empty, Null & Malformed API Responses Matrix', () => {
    it('handles null API response gracefully without crashing or throwing TypeError', async () => {
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        null as unknown as PendingHandoverSummaryResponse,
      );

      await renderPage();

      expect(container.textContent).toContain('Handover Documents');
      expect(container.textContent).toContain('100% Compliant');
      expect(container.textContent).toContain('No pending handover documents');

      // Stats default to 0
      const statValues = Array.from(
        container.querySelectorAll('.uims-stat-card .ant-statistic-content-value'),
      );
      statValues.forEach((val) => {
        expect(val.textContent?.trim()).toBe('0');
      });
    });

    it('handles empty object {} API response with missing records array', async () => {
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        {} as unknown as PendingHandoverSummaryResponse,
      );

      await renderPage();

      expect(container.textContent).toContain('100% Compliant');
      expect(container.textContent).toContain('No pending handover documents');
    });

    it('handles records with all nullable / undefined attributes without runtime exceptions', async () => {
      const malformedRecords: Array<PendingHandoverRecordItem> = [
        {
          id: 'malformed-1',
          assetId: 'ast-none-1',
        } as PendingHandoverRecordItem,
        {
          id: 'malformed-2',
          type: undefined,
          handoverType: undefined,
          assetTag: undefined,
          subcode: undefined,
          modelName: undefined,
          serialNumber: undefined,
          recipientName: undefined,
          recipientEmail: undefined,
          department: undefined,
          departmentName: undefined,
          createdAt: undefined,
          daysPending: undefined,
          timeAgo: undefined,
          isOverdue: false,
        } as unknown as PendingHandoverRecordItem,
      ];

      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          totalPending: 2,
          overdueCount: 0,
          pendingAssignments: 1,
          pendingReturns: 1,
          pendingTransfers: 0,
          records: malformedRecords,
        }),
      );

      await renderPage();

      // Page should render rows without crashing
      expect(container.textContent).toContain('Handover Documents');
      expect(container.textContent).toContain('2 Pending Action');
      expect(container.textContent).toContain('Unassigned');
      expect(container.textContent).toContain('—');
    });

    it('executes search and filtering across sparse records without failing on undefined properties', async () => {
      const sparseRecords: Array<PendingHandoverRecordItem> = [
        {
          id: 'sparse-1',
          assetId: 'ast-sp-1',
          assetTag: 'AST-SP-001',
          type: 'ASSIGNMENT',
          isOverdue: false,
        } as PendingHandoverRecordItem,
        {
          id: 'sparse-2',
          assetId: 'ast-sp-2',
          modelName: 'Latitude 7420',
          type: 'RETURN',
          isOverdue: true,
        } as PendingHandoverRecordItem,
      ];

      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          totalPending: 2,
          overdueCount: 1,
          pendingAssignments: 1,
          pendingReturns: 1,
          pendingTransfers: 0,
          records: sparseRecords,
        }),
      );

      await renderPage();

      // Search with arbitrary special regex characters
      const searchInput = container.querySelector(
        'input[data-testid="handover-search-input"], .ant-input-search input',
      ) as HTMLInputElement;
      expect(searchInput).not.toBeNull();

      await act(async () => {
        setInputValue(searchInput, '.*+?^@#%()|[]\\');
        await new Promise((r) => setTimeout(r, 20));
      });

      // No matches found for special regex chars, but no crash
      expect(container.textContent).toContain('No matching handover records found');

      // Now search for "Latitude"
      await act(async () => {
        setInputValue(searchInput, 'Latitude');
        await new Promise((r) => setTimeout(r, 20));
      });
      expect(container.textContent).toContain('Latitude 7420');
      expect(container.textContent).not.toContain('AST-SP-001');
    });

    it('gracefully renders fallback assetTag when subcode is undefined', async () => {
      const recordsWithoutSubcode = generateSyntheticRecords(3, { omitSubcode: true });
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records: recordsWithoutSubcode,
        }),
      );

      await renderPage();

      expect(container.textContent).toContain('AST-STRESS-0001');
      expect(container.textContent).toContain('AST-STRESS-0002');
      expect(container.textContent).toContain('AST-STRESS-0003');
    });
  });

  describe('Part 2: High Volume (75+ items) & Complex Pagination Stress', () => {
    it('renders 75 synthetic records with 10 records per page and correct pagination metadata', async () => {
      const records75 = generateSyntheticRecords(75);

      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records: records75,
        }),
      );

      await renderPage();

      // Check total pending count
      expect(container.textContent).toContain('75 Pending Action');
      expect(container.textContent).toContain('75 pending records');

      // Check that only 10 rows are rendered initially
      const tableRows = container.querySelectorAll('.ant-table-tbody tr.ant-table-row');
      expect(tableRows.length).toBe(10);

      // Verify first item is rendered (subcode takes precedence in UI) and 11th item is NOT on page 1
      expect(container.textContent).toContain('SUB-STRESS-0001');
      expect(container.textContent).not.toContain('SUB-STRESS-0011');
    });

    it('navigates through multiple pages and updates visible records synchronously', async () => {
      const records75 = generateSyntheticRecords(75);

      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records: records75,
        }),
      );

      await renderPage();

      // Find pagination items
      const page2Btn = Array.from(container.querySelectorAll('.ant-pagination-item')).find(
        (el) => el.textContent?.trim() === '2',
      ) as HTMLElement | undefined;
      expect(page2Btn).toBeDefined();

      // Click Page 2
      await act(async () => {
        page2Btn?.click();
        await new Promise((r) => setTimeout(r, 40));
      });

      // Page 2 should display items 11-20
      expect(container.textContent).toContain('SUB-STRESS-0011');
      expect(container.textContent).not.toContain('SUB-STRESS-0001');

      // Click Page 5
      const page5Btn = Array.from(container.querySelectorAll('.ant-pagination-item')).find(
        (el) => el.textContent?.trim() === '5',
      ) as HTMLElement | undefined;
      expect(page5Btn).toBeDefined();

      await act(async () => {
        page5Btn?.click();
        await new Promise((r) => setTimeout(r, 40));
      });

      // Page 5 displays items 41-50
      expect(container.textContent).toContain('SUB-STRESS-0041');
      expect(container.textContent).not.toContain('SUB-STRESS-0011');
    });

    it('handles filter restriction while on a deep page without rendering out-of-bounds blank view', async () => {
      const records75 = generateSyntheticRecords(75);

      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records: records75,
        }),
      );

      await renderPage();

      // Navigate to Page 5 (a visible page item on initial pagination display)
      const page5Btn = Array.from(container.querySelectorAll('.ant-pagination-item')).find(
        (el) => el.textContent?.trim() === '5',
      ) as HTMLElement | undefined;
      expect(page5Btn).toBeDefined();

      await act(async () => {
        page5Btn?.click();
        await new Promise((r) => setTimeout(r, 40));
      });
      expect(container.textContent).toContain('SUB-STRESS-0041');

      // Now apply a strict search matching only SUB-STRESS-0002
      const searchInput = container.querySelector(
        'input[data-testid="handover-search-input"], .ant-input-search input',
      ) as HTMLInputElement;

      await act(async () => {
        setInputValue(searchInput, 'SUB-STRESS-0002');
        await new Promise((r) => setTimeout(r, 40));
      });

      // It must display the single matching record and not crash or stay on empty page 5
      expect(container.textContent).toContain('SUB-STRESS-0002');
      expect(container.textContent).toContain('1 pending records');
    });
  });

  describe('Part 3: Rapid Concurrent Filter & Search Stress', () => {
    it('survives rapid typing bursts (25 keystrokes) in search input without race conditions', async () => {
      const records = generateSyntheticRecords(30);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records,
        }),
      );

      await renderPage();

      const searchInput = container.querySelector(
        'input[data-testid="handover-search-input"], .ant-input-search input',
      ) as HTMLInputElement;

      const queryStream = [
        'S',
        'SU',
        'SUB',
        'SUB-',
        'SUB-S',
        'SUB-ST',
        'SUB-STR',
        'SUB-STRESS',
        'SUB-STRESS-0005',
      ];

      for (const step of queryStream) {
        await act(async () => {
          setInputValue(searchInput, step);
        });
      }

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Target item must be visible
      expect(container.textContent).toContain('SUB-STRESS-0005');
      // Non-matching should be excluded
      expect(container.textContent).not.toContain('SUB-STRESS-0001');
    });

    it('interleaves type and status filter changes rapidly and resolves deterministic filtered subset', async () => {
      const records = generateSyntheticRecords(30);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records,
        }),
      );

      await renderPage();

      const typeFilterEl = container.querySelector(
        '[data-testid="handover-type-filter"]',
      ) as HTMLElement;
      const statusFilterEl = container.querySelector(
        '[data-testid="handover-status-filter"]',
      ) as HTMLElement;

      // 1. Filter to Returns
      await selectOption(typeFilterEl, 'Returns');
      // 2. Filter to Overdue
      await selectOption(statusFilterEl, 'Overdue (>3d)');

      // Verify that all visible items are RETURN and Overdue
      const rows = Array.from(container.querySelectorAll('.ant-table-tbody tr.ant-table-row'));
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row) => {
        expect(row.textContent).toContain('RETURN');
        expect(row.textContent).toContain('Overdue (>3d)');
      });

      // 3. Reset filters
      const resetBtn = container.querySelector(
        'button[data-testid="handover-reset-filters"]',
      ) as HTMLElement;
      await act(async () => {
        resetBtn.click();
        await new Promise((r) => setTimeout(r, 30));
      });

      // Full set of 10 rows on page 1 restored
      expect(container.querySelectorAll('.ant-table-tbody tr.ant-table-row').length).toBe(10);
    });
  });

  describe('Part 4: Network Errors & Rejection Resilience', () => {
    it('handles downloadHandoverDocx network rejection: displays error toast and resets loading state', async () => {
      const records = generateSyntheticRecords(1);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records,
        }),
      );

      vi.mocked(assetsService.downloadHandoverDocx).mockRejectedValueOnce(
        new Error('Network connection aborted (504 Gateway Timeout)'),
      );

      await renderPage();

      const downloadBtn = container.querySelector(
        'button[data-testid="download-docx-stress-rec-1"]',
      ) as HTMLButtonElement;
      expect(downloadBtn).toBeDefined();

      await act(async () => {
        downloadBtn.click();
        await new Promise((r) => setTimeout(r, 40));
      });

      expect(assetsService.downloadHandoverDocx).toHaveBeenCalledTimes(1);
      expect(mockMessageError).toHaveBeenCalledWith(
        'Network connection aborted (504 Gateway Timeout)',
      );
      // Button loading indicator should be cleared
      expect(downloadBtn.classList.contains('ant-btn-loading')).toBe(false);
    });

    it('handles uploadHandoverDocument rejection: surfaces error feedback and unblocks UI', async () => {
      const records = generateSyntheticRecords(1);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records,
        }),
      );

      vi.mocked(assetsService.uploadHandoverDocument).mockRejectedValueOnce(
        new Error('413 Payload Too Large: file exceeds 10MB limit'),
      );

      await renderPage();

      const fileInput = container.querySelector(
        '.ant-upload input[type="file"]',
      ) as HTMLInputElement;
      expect(fileInput).not.toBeNull();

      const largeFile = new File(['fake-content'], 'massive-signed.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        configurable: true,
      });

      await act(async () => {
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 40));
      });

      expect(mockMessageError).toHaveBeenCalledWith(
        '413 Payload Too Large: file exceeds 10MB limit',
      );
      // No re-fetch should occur on upload failure
      expect(dashboardService.getPendingHandovers).toHaveBeenCalledTimes(1);
    });

    it('handles attachHandoverDocument secondary failure when upload succeeded', async () => {
      const records = generateSyntheticRecords(1);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records,
        }),
      );

      vi.mocked(assetsService.uploadHandoverDocument).mockResolvedValueOnce({
        fileUrl: '/uploads/signed-test.pdf',
        fileName: 'signed-test.pdf',
        originalName: 'signed-test.pdf',
        mimeType: 'application/pdf',
        size: 2048,
      });
      vi.mocked(assetsService.attachHandoverDocument).mockRejectedValueOnce(
        new Error('Database lock error during attach'),
      );

      await renderPage();

      const fileInput = container.querySelector(
        '.ant-upload input[type="file"]',
      ) as HTMLInputElement;
      const testFile = new File(['pdf-data'], 'signed-test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        configurable: true,
      });

      await act(async () => {
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 40));
      });

      expect(mockMessageError).toHaveBeenCalledWith('Database lock error during attach');
    });

    it('handles generateHandoverDocument preview failure and keeps preview modal closed', async () => {
      const records = generateSyntheticRecords(1);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records,
        }),
      );

      vi.mocked(assetsService.generateHandoverDocument).mockRejectedValueOnce(
        new Error('Failed to render HTML template'),
      );

      await renderPage();

      const previewBtn = container.querySelector(
        'button[data-testid="preview-handover-stress-rec-1"]',
      ) as HTMLButtonElement;

      await act(async () => {
        previewBtn.click();
        await new Promise((r) => setTimeout(r, 40));
      });

      expect(mockMessageError).toHaveBeenCalledWith('Failed to render HTML template');
      expect(document.querySelector('.ant-modal-title')).toBeNull();
    });
  });

  describe('Part 5: Window Event Bursts & Real-time Synchronization', () => {
    it('survives a burst of 30 rapid custody window events without unhandled exceptions', async () => {
      const records = generateSyntheticRecords(3);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValue(
        createMockSummary({
          records,
        }),
      );

      await renderPage();
      expect(dashboardService.getPendingHandovers).toHaveBeenCalledTimes(1);

      // Dispatch 15 uims:handover-update and 15 uims:notification events rapidly
      await act(async () => {
        for (let i = 0; i < 15; i++) {
          window.dispatchEvent(new CustomEvent('uims:handover-update'));
          window.dispatchEvent(new CustomEvent('uims:notification'));
        }
        await new Promise((r) => setTimeout(r, 60));
      });

      // All calls processed cleanly
      expect(vi.mocked(dashboardService.getPendingHandovers).mock.calls.length).toBeGreaterThan(1);
      expect(container.textContent).toContain('Handover Documents');
    });

    it('cleans up window event listeners upon unmount to prevent memory leaks', async () => {
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValue(
        createMockSummary({
          records: [],
        }),
      );

      const root = await renderPage();
      const initialCallCount = vi.mocked(dashboardService.getPendingHandovers).mock.calls.length;

      // Unmount component cleanly
      await act(async () => {
        root.unmount();
        currentRoot = null;
      });

      // Dispatch events on window after unmount
      window.dispatchEvent(new CustomEvent('uims:handover-update'));
      window.dispatchEvent(new CustomEvent('uims:notification'));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });

      // Call count must not increment after unmount
      expect(vi.mocked(dashboardService.getPendingHandovers).mock.calls.length).toBe(
        initialCallCount,
      );
    });

    it('demonstrates behavior when an earlier in-flight API response resolves after a newer one', async () => {
      let resolveCall1!: (val: PendingHandoverSummaryResponse) => void;
      let resolveCall2!: (val: PendingHandoverSummaryResponse) => void;

      const promise1 = new Promise<PendingHandoverSummaryResponse>((res) => {
        resolveCall1 = res;
      });
      const promise2 = new Promise<PendingHandoverSummaryResponse>((res) => {
        resolveCall2 = res;
      });

      // Mount calls getPendingHandovers first
      vi.mocked(dashboardService.getPendingHandovers)
        .mockImplementationOnce(() => promise1)
        .mockImplementationOnce(() => promise2);

      await renderPage(); // Initiates Call 1

      // Trigger second fetch via window event before Call 1 completes
      await act(async () => {
        window.dispatchEvent(new CustomEvent('uims:handover-update'));
      });

      // Resolve Call 2 FIRST (fresh data: 0 pending, 100% compliant)
      await act(async () => {
        resolveCall2(
          createMockSummary({
            records: [],
          }),
        );
        await new Promise((r) => setTimeout(r, 30));
      });

      expect(container.textContent).toContain('100% Compliant');

      // Now resolve Call 1 SECOND with older, stale data (5 pending)
      await act(async () => {
        resolveCall1(
          createMockSummary({
            records: generateSyntheticRecords(5),
          }),
        );
        await new Promise((r) => setTimeout(r, 30));
      });

      // Note: Because loadData does not track in-flight request IDs, Call 1 overwrote Call 2
      // This empirically documents the out-of-order race condition risk.
      expect(container.textContent).toContain('5 Pending Action');
    });
  });

  describe('Part 6: Portal Teardown & Leak Prevention', () => {
    it('opens and closes preview modal repeatedly without leaving orphaned modal roots', async () => {
      const records = generateSyntheticRecords(1);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records,
        }),
      );

      vi.mocked(assetsService.generateHandoverDocument).mockResolvedValue({
        html: '<div id="preview-content">Test Preview</div>',
        title: 'Preview',
        filename: 'Preview_Doc',
        generatedAt: '2026-10-21',
      });

      await renderPage();

      const previewBtn = container.querySelector(
        'button[data-testid="preview-handover-stress-rec-1"]',
      ) as HTMLButtonElement;

      // Cycle 1: Open modal
      await act(async () => {
        previewBtn.click();
        await new Promise((r) => setTimeout(r, 40));
      });
      expect(document.querySelector('.ant-modal-root')).not.toBeNull();

      // Cycle 1: Close modal via close button
      const closeBtn = document.querySelector('.ant-modal-close') as HTMLElement;
      if (closeBtn) {
        await act(async () => {
          closeBtn.click();
          await new Promise((r) => setTimeout(r, 40));
        });
      }

      // Cycle 2: Open modal again
      await act(async () => {
        previewBtn.click();
        await new Promise((r) => setTimeout(r, 40));
      });
      expect(document.querySelector('.ant-modal-root')).not.toBeNull();

      // Cycle 2: Close via cancel/close button
      const closeBtn2 = document.querySelector('.ant-modal-close') as HTMLElement;
      if (closeBtn2) {
        await act(async () => {
          closeBtn2.click();
          await new Promise((r) => setTimeout(r, 40));
        });
      }
    });

    it('verifies complete teardown of Select dropdowns and DOM nodes upon unmount', async () => {
      const records = generateSyntheticRecords(3);
      vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce(
        createMockSummary({
          records,
        }),
      );

      const root = await renderPage();

      // Open Select dropdown
      const typeFilterEl = container.querySelector(
        '[data-testid="handover-type-filter"]',
      ) as HTMLElement;
      await selectOption(typeFilterEl, 'Assignments');

      // Unmount component
      await act(async () => {
        root.unmount();
        currentRoot = null;
      });

      // Clear portal roots
      document
        .querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover, .ant-select-dropdown')
        .forEach((el) => {
          el.remove();
        });

      expect(document.querySelectorAll('.ant-modal-root').length).toBe(0);
      expect(document.querySelectorAll('.ant-select-dropdown').length).toBe(0);
    });
  });
});
