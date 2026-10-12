import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportsService } from '../../services/reports.service';
import ReportsPage from './ReportsPage';

const mockMessageLoading = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();

const mockAppInstance = {
  message: {
    loading: mockMessageLoading,
    success: mockMessageSuccess,
    error: mockMessageError,
    info: vi.fn(),
    warning: vi.fn(),
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
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => mockAppInstance,
    },
  };
});

vi.mock('../../services/reports.service', () => ({
  reportsService: {
    exportReport: vi.fn().mockImplementation(() => Promise.resolve(new Blob())),
    getReportSuites: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({}),
    scheduleReport: vi.fn().mockResolvedValue({}),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ReportsPage (Operational Data Exports Hub)', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
      root = undefined;
    }
    container.remove();
  });

  it('renders all 5 operational domain export cards with their dataset tags and descriptions', async () => {
    await act(async () => {
      root?.render(createElement(MemoryRouter, null, createElement(ReportsPage)));
    });

    const text = container.textContent || '';

    // Page Header
    expect(text).toContain('Operational Data Exports');
    expect(text).toContain(
      'Export live system datasets to formatted Excel workbooks and standard PDF documents.',
    );

    // 5 Domain Cards
    expect(text).toContain('Hardware Assets');
    expect(text).toContain('Hardware Fleet');
    expect(text).toContain('Software Licenses');
    expect(text).toContain('SaaS & Enterprise');
    expect(text).toContain('Consumable Inventory');
    expect(text).toContain('Stock & Supplies');
    expect(text).toContain('Network Infrastructure');
    expect(text).toContain('Switches & IPAM');
    expect(text).toContain('Directory Employees');
    expect(text).toContain('Staff Directory');

    // Dataset preview fields
    expect(text).toContain('Asset Tag');
    expect(text).toContain('Model');
    expect(text).toContain('Software Name');
    expect(text).toContain('SKU');
    expect(text).toContain('CIDR/Vendor');
    expect(text).toContain('Employee Code');
  });

  it('strictly verifies the complete absence of analytics stat cards, KPI tiles, and charts', async () => {
    await act(async () => {
      root?.render(createElement(MemoryRouter, null, createElement(ReportsPage)));
    });

    const text = container.textContent || '';

    // Must NOT contain old summary cards
    expect(text).not.toContain('Cost Savings');
    expect(text).not.toContain('SLA Adherence');
    expect(text).not.toContain('SOC 2 Readiness');
    expect(text).not.toContain('Scheduled Reports');
    expect(text).not.toContain('Managed Fleet');
    expect(text).not.toContain('Identified Waste / Idle Seats');
  });

  it('triggers real reportsService.exportReport with xlsx format when Export Excel is clicked', async () => {
    await act(async () => {
      root?.render(createElement(MemoryRouter, null, createElement(ReportsPage)));
    });

    const excelButtons = Array.from(container.querySelectorAll('button')).filter((btn) =>
      btn.textContent?.includes('Export Excel (.xlsx)'),
    );

    expect(excelButtons.length).toBe(5);

    // Click Hardware Export Excel
    await act(async () => {
      excelButtons[0].click();
    });

    expect(reportsService.exportReport).toHaveBeenCalledWith('hardware', 'xlsx');
    expect(mockMessageLoading).toHaveBeenCalled();
    expect(mockMessageSuccess).toHaveBeenCalled();
  });

  it('triggers real reportsService.exportReport with pdf format when Export PDF is clicked', async () => {
    await act(async () => {
      root?.render(createElement(MemoryRouter, null, createElement(ReportsPage)));
    });

    const pdfButtons = Array.from(container.querySelectorAll('button')).filter((btn) =>
      btn.textContent?.includes('Export PDF'),
    );

    expect(pdfButtons.length).toBe(5);

    // Click Licenses Export PDF (index 1)
    await act(async () => {
      pdfButtons[1].click();
    });

    expect(reportsService.exportReport).toHaveBeenCalledWith('licenses', 'pdf');
    expect(mockMessageLoading).toHaveBeenCalled();
    expect(mockMessageSuccess).toHaveBeenCalled();
  });

  it('triggers exports across inventory, network, and employees domains', async () => {
    await act(async () => {
      root?.render(createElement(MemoryRouter, null, createElement(ReportsPage)));
    });

    const excelButtons = Array.from(container.querySelectorAll('button')).filter((btn) =>
      btn.textContent?.includes('Export Excel (.xlsx)'),
    );

    // Click Inventory (index 2)
    await act(async () => {
      excelButtons[2].click();
    });
    expect(reportsService.exportReport).toHaveBeenCalledWith('inventory', 'xlsx');

    // Click Network (index 3)
    await act(async () => {
      excelButtons[3].click();
    });
    expect(reportsService.exportReport).toHaveBeenCalledWith('network', 'xlsx');

    // Click Employees (index 4)
    await act(async () => {
      excelButtons[4].click();
    });
    expect(reportsService.exportReport).toHaveBeenCalledWith('employees', 'xlsx');
  });

  it('displays user-facing error message when export fails', async () => {
    vi.mocked(reportsService.exportReport).mockRejectedValueOnce(
      new Error('Network export timeout'),
    );

    await act(async () => {
      root?.render(createElement(MemoryRouter, null, createElement(ReportsPage)));
    });

    const excelButtons = Array.from(container.querySelectorAll('button')).filter((btn) =>
      btn.textContent?.includes('Export Excel (.xlsx)'),
    );

    await act(async () => {
      excelButtons[0].click();
    });

    expect(mockMessageError).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Failed to export Hardware Assets report'),
      }),
    );
  });
});
