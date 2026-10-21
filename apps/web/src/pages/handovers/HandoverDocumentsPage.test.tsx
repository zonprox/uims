import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assetsService } from '../../services/assets.service';
import {
  dashboardService,
  type PendingHandoverRecordItem,
  type PendingHandoverSummaryResponse,
} from '../../services/dashboard.service';
import { downloadBlobFile } from '../assets/utils/printDocument';
import HandoverDocumentsPage from './HandoverDocumentsPage';

const mockNavigate = vi.fn();
const mockMessageSuccess = vi.fn();
const mockMessageError = vi.fn();
const mockMessageWarning = vi.fn();

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
    info: vi.fn(),
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

const mockRecords: PendingHandoverRecordItem[] = [
  {
    id: 'rec-assign-1',
    recordId: 'rec-assign-1',
    assetId: 'ast-dell-101',
    assetTag: 'AST-DELL-101',
    subcode: 'AST-DELL-101',
    modelName: 'Dell Latitude 5540',
    serialNumber: 'SN-DELL-101',
    type: 'ASSIGNMENT',
    handoverType: 'ASSIGNMENT',
    recipientId: 'usr-alice-1',
    recipientName: 'Alice Cooper',
    recipientEmail: 'alice@uims.internal',
    department: 'Engineering',
    departmentName: 'Engineering',
    createdAt: '2026-10-10T08:00:00Z',
    daysPending: 4,
    isOverdue: true,
    timeAgo: '4d ago',
  },
  {
    id: 'rec-return-2',
    recordId: 'rec-return-2',
    assetId: 'ast-hp-202',
    assetTag: 'AST-HP-202',
    subcode: 'AST-HP-202',
    modelName: 'HP EliteBook 840',
    serialNumber: 'SN-HP-202',
    type: 'RETURN',
    handoverType: 'RETURN',
    recipientId: 'usr-bob-2',
    recipientName: 'Bob Dylan',
    recipientEmail: 'bob@uims.internal',
    department: 'Operations',
    departmentName: 'Operations',
    createdAt: '2026-10-13T08:00:00Z',
    daysPending: 1,
    isOverdue: false,
    timeAgo: '1d ago',
  },
  {
    id: 'rec-transfer-3',
    recordId: 'rec-transfer-3',
    assetId: 'ast-len-303',
    assetTag: 'AST-LEN-303',
    subcode: 'AST-LEN-303',
    modelName: 'Lenovo ThinkPad T14',
    serialNumber: 'SN-LEN-303',
    type: 'TRANSFER',
    handoverType: 'TRANSFER',
    recipientId: 'usr-charlie-3',
    recipientName: 'Charlie Brown',
    recipientEmail: 'charlie@uims.internal',
    department: 'Finance',
    departmentName: 'Finance',
    createdAt: '2026-10-12T08:00:00Z',
    daysPending: 2,
    isOverdue: false,
    timeAgo: '2d ago',
  },
];

const mockHandoverSummary: PendingHandoverSummaryResponse = {
  totalPending: 3,
  overdueCount: 1,
  pendingAssignments: 1,
  pendingReturns: 1,
  pendingTransfers: 1,
  breakdownByType: {
    assignment: 1,
    return: 1,
    transfer: 1,
  },
  records: mockRecords,
};

describe('HandoverDocumentsPage Component Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.mocked(dashboardService.getPendingHandovers).mockResolvedValue(mockHandoverSummary);
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
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    document
      .querySelectorAll(
        '.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-select-dropdown',
      )
      .forEach((el) => el.remove());
  });

  const renderComponent = async () => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(createElement(HandoverDocumentsPage));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
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

  it('renders PageContainer title, breadcrumbs, action tag, and 4 KPI statistics cards', async () => {
    await renderComponent();

    // Verify Title & Subtitle
    expect(container.textContent).toContain('Handover Documents');
    expect(container.textContent).toContain('Track pending physical custody records');

    // Action tag
    expect(container.textContent).toContain('3 Pending Action');

    // 4 KPI Statistics Cards (Overdue card removed)
    expect(container.textContent).toContain('Total Pending');
    expect(container.textContent).toContain('Pending Assignments');
    expect(container.textContent).toContain('Pending Returns');
    expect(container.textContent).toContain('Pending Transfers');

    // Statistics values
    const statCards = Array.from(container.querySelectorAll('.uims-stat-card'));
    expect(statCards.length).toBe(4);
    expect(statCards[0]?.textContent).toContain('3');
    expect(statCards[1]?.textContent).toContain('1');
    expect(statCards[2]?.textContent).toContain('1');
    expect(statCards[3]?.textContent).toContain('1');
  });

  it('renders pending handover records in the table with high-signal columns, badges, and tags', async () => {
    await renderComponent();

    // Dedicated balanced column headers (Asset & Hardware Model merged, Serial Number removed)
    const headersText = Array.from(container.querySelectorAll('.ant-table-thead th'))
      .map((th) => th.textContent?.trim())
      .join(' | ');
    expect(headersText).toContain('Asset & Hardware Model');
    expect(headersText).toContain('Handover Type');
    expect(headersText).not.toContain('Serial Number');
    expect(headersText).toContain('Custodian');
    expect(headersText).toContain('Department');
    expect(headersText).toContain('SLA Status');
    expect(headersText).toContain('Issued Date');
    expect(headersText).toContain('Actions');

    // Record 1: Dell Latitude 5540, Alice Cooper
    expect(container.textContent).toContain('AST-DELL-101');
    expect(container.textContent).toContain('Dell Latitude 5540');
    expect(container.textContent).toContain('Alice Cooper');
    expect(container.textContent).toContain('Engineering');
    expect(container.textContent).toContain('Overdue (>3d)');

    // Record 2: HP EliteBook 840, Bob Dylan
    expect(container.textContent).toContain('AST-HP-202');
    expect(container.textContent).toContain('HP EliteBook 840');
    expect(container.textContent).toContain('Bob Dylan');
    expect(container.textContent).toContain('Operations');
    expect(container.textContent).toContain('Pending Scanned Copy');

    // Record 3: Lenovo ThinkPad T14, Charlie Brown
    expect(container.textContent).toContain('AST-LEN-303');
    expect(container.textContent).toContain('Lenovo ThinkPad T14');
    expect(container.textContent).toContain('Charlie Brown');
    expect(container.textContent).toContain('Finance');

    // Badges
    const blueBadge = Array.from(container.querySelectorAll('.ant-tag-blue')).find((el) =>
      el.textContent?.includes('ASSIGNMENT'),
    );
    expect(blueBadge).toBeDefined();

    const orangeBadge = Array.from(container.querySelectorAll('.ant-tag-orange')).find((el) =>
      el.textContent?.includes('RETURN'),
    );
    expect(orangeBadge).toBeDefined();

    const purpleBadge = Array.from(container.querySelectorAll('.ant-tag-purple')).find((el) =>
      el.textContent?.includes('TRANSFER'),
    );
    expect(purpleBadge).toBeDefined();

    // SLA Tag colors
    const overdueTag = Array.from(container.querySelectorAll('.ant-tag-volcano')).find((el) =>
      el.textContent?.includes('Overdue (>3d)'),
    );
    expect(overdueTag).toBeDefined();

    const pendingTag = Array.from(container.querySelectorAll('.ant-tag-gold')).find((el) =>
      el.textContent?.includes('Pending Scanned Copy'),
    );
    expect(pendingTag).toBeDefined();
  });

  it('filters records by Handover Type (ASSIGNMENT, RETURN, TRANSFER, and ALL)', async () => {
    await renderComponent();

    const typeFilterEl = container.querySelector(
      '[data-testid="handover-type-filter"]',
    ) as HTMLElement;
    expect(typeFilterEl).toBeDefined();

    // Filter to Assignments
    await selectOption(typeFilterEl, 'Assignments');
    expect(container.textContent).toContain('AST-DELL-101');
    expect(container.textContent).not.toContain('AST-HP-202');
    expect(container.textContent).not.toContain('AST-LEN-303');

    // Filter to Returns
    await selectOption(typeFilterEl, 'Returns');
    expect(container.textContent).not.toContain('AST-DELL-101');
    expect(container.textContent).toContain('AST-HP-202');
    expect(container.textContent).not.toContain('AST-LEN-303');

    // Filter to Transfers
    await selectOption(typeFilterEl, 'Transfers');
    expect(container.textContent).not.toContain('AST-DELL-101');
    expect(container.textContent).not.toContain('AST-HP-202');
    expect(container.textContent).toContain('AST-LEN-303');

    // Reset to All Types
    await selectOption(typeFilterEl, 'All Types');
    expect(container.textContent).toContain('AST-DELL-101');
    expect(container.textContent).toContain('AST-HP-202');
    expect(container.textContent).toContain('AST-LEN-303');
  });

  it('filters records by SLA Status (OVERDUE and PENDING)', async () => {
    await renderComponent();

    const statusFilterEl = container.querySelector(
      '[data-testid="handover-status-filter"]',
    ) as HTMLElement;
    expect(statusFilterEl).toBeDefined();

    // Filter to Overdue (>3d)
    await selectOption(statusFilterEl, 'Overdue (>3d)');
    expect(container.textContent).toContain('AST-DELL-101');
    expect(container.textContent).not.toContain('AST-HP-202');
    expect(container.textContent).not.toContain('AST-LEN-303');

    // Filter to Pending (<3d)
    await selectOption(statusFilterEl, 'Pending (<3d)');
    expect(container.textContent).not.toContain('AST-DELL-101');
    expect(container.textContent).toContain('AST-HP-202');
    expect(container.textContent).toContain('AST-LEN-303');

    // Reset to All Statuses
    await selectOption(statusFilterEl, 'All Statuses');
    expect(container.textContent).toContain('AST-DELL-101');
    expect(container.textContent).toContain('AST-HP-202');
    expect(container.textContent).toContain('AST-LEN-303');
  });

  it('searches records across tag, subcode, model, serial, custodian, and department, and resets filters', async () => {
    await renderComponent();

    const searchInput = (container.querySelector('.ant-input-search input') ||
      container.querySelector('input.ant-input')) as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    // Search by model name: "Dell"
    await act(async () => {
      setInputValue(searchInput, 'Dell');
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(container.textContent).toContain('AST-DELL-101');
    expect(container.textContent).not.toContain('AST-HP-202');
    expect(container.textContent).not.toContain('AST-LEN-303');

    // Search by serial number: "SN-HP-202"
    await act(async () => {
      setInputValue(searchInput, 'SN-HP-202');
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(container.textContent).not.toContain('AST-DELL-101');
    expect(container.textContent).toContain('AST-HP-202');
    expect(container.textContent).not.toContain('AST-LEN-303');

    // Search by custodian: "Charlie"
    await act(async () => {
      setInputValue(searchInput, 'Charlie');
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(container.textContent).not.toContain('AST-DELL-101');
    expect(container.textContent).not.toContain('AST-HP-202');
    expect(container.textContent).toContain('AST-LEN-303');

    // Click Reset button
    const resetBtn = container.querySelector(
      'button[data-testid="handover-reset-filters"]',
    ) as HTMLElement;
    expect(resetBtn).toBeDefined();
    await act(async () => {
      resetBtn.click();
      await new Promise((r) => setTimeout(r, 20));
    });

    // All records restored
    expect(container.textContent).toContain('AST-DELL-101');
    expect(container.textContent).toContain('AST-HP-202');
    expect(container.textContent).toContain('AST-LEN-303');
  });

  it('triggers Word (.docx) download on button click', async () => {
    const fakeBlob = new Blob(['docx-content'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    vi.mocked(assetsService.downloadHandoverDocx).mockResolvedValueOnce({
      blob: fakeBlob,
      filename: 'Handover_AST-DELL-101.docx',
    });

    await renderComponent();

    const downloadBtn = container.querySelector(
      'button[data-testid="download-docx-rec-assign-1"]',
    ) as HTMLButtonElement;
    expect(downloadBtn).toBeDefined();

    await act(async () => {
      downloadBtn.click();
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(assetsService.downloadHandoverDocx).toHaveBeenCalledWith({
      assetIds: ['ast-dell-101'],
      type: 'assignment',
      recipientId: 'usr-alice-1',
    });
    expect(downloadBlobFile).toHaveBeenCalledWith(fakeBlob, 'Handover_AST-DELL-101.docx');
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'Handover document (.docx) downloaded successfully.',
    );
  });

  it('triggers Preview modal on preview button click and renders modal content', async () => {
    vi.mocked(assetsService.generateHandoverDocument).mockResolvedValueOnce({
      html: '<html><body>Handover Form for Dell Latitude</body></html>',
      title: 'Handover Record Form',
      filename: 'Handover_AST-DELL-101',
      generatedAt: '2026-10-21T00:00:00Z',
    });

    await renderComponent();

    const previewBtn = container.querySelector(
      'button[data-testid="preview-handover-rec-assign-1"]',
    ) as HTMLButtonElement;
    expect(previewBtn).toBeDefined();

    await act(async () => {
      previewBtn.click();
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(assetsService.generateHandoverDocument).toHaveBeenCalledWith({
      assetIds: ['ast-dell-101'],
      type: 'assignment',
      recipientId: 'usr-alice-1',
    });

    // Verify modal is open in DOM
    const modalTitle = document.body.querySelector('.ant-modal-title');
    expect(modalTitle).not.toBeNull();
    expect(modalTitle?.textContent).toContain('Handover Record Preview — AST-DELL-101');
  });

  it('uploads signed physical document, attaches it, and refreshes compliance list', async () => {
    vi.mocked(assetsService.uploadHandoverDocument).mockResolvedValueOnce({
      fileUrl: '/uploads/signed-receipt-101.pdf',
      fileName: 'signed-receipt-101.pdf',
      originalName: 'signed-receipt-101.pdf',
      mimeType: 'application/pdf',
      size: 10240,
    });
    vi.mocked(assetsService.attachHandoverDocument).mockResolvedValueOnce({
      id: 'ast-dell-101',
      name: 'Dell Latitude 5540',
      manufacturer: 'Dell',
      model: 'Latitude 5540',
      category: 'Laptop',
      status: 'IN_USE',
    } as import('../../services/assets.service').Asset);

    await renderComponent();

    const fileInputs = Array.from(
      container.querySelectorAll('.ant-upload input[type="file"]'),
    ) as HTMLInputElement[];
    expect(fileInputs.length).toBeGreaterThan(0);

    const testFile = new File(['dummy-signed-pdf'], 'signed-receipt-101.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(fileInputs[0], 'files', {
      value: [testFile],
      configurable: true,
    });

    await act(async () => {
      fileInputs[0]?.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(assetsService.uploadHandoverDocument).toHaveBeenCalledWith(testFile, 'ast-dell-101');
    expect(assetsService.attachHandoverDocument).toHaveBeenCalledWith('ast-dell-101', {
      fileUrl: '/uploads/signed-receipt-101.pdf',
    });
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      'Signed handover document uploaded for AST-DELL-101.',
    );
    expect(dashboardService.getPendingHandovers).toHaveBeenCalledTimes(2);
  });

  it('navigates to /assets?drawer=<assetId> when clicking asset tag code or circle arrow button', async () => {
    await renderComponent();

    // 1. Click asset tag code
    const codeLink = Array.from(container.querySelectorAll('code')).find((el) =>
      el.textContent?.includes('AST-DELL-101'),
    );
    expect(codeLink).toBeDefined();

    await act(async () => {
      codeLink?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-dell-101');

    // 2. Click circle arrow button
    const circleBtn = container.querySelector(
      'button[data-testid="view-asset-rec-assign-1"]',
    ) as HTMLButtonElement;
    expect(circleBtn).toBeDefined();

    await act(async () => {
      circleBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/assets?drawer=ast-dell-101');
  });

  it('subscribes and automatically refreshes records upon uims:handover-update and uims:notification window events', async () => {
    await renderComponent();
    expect(dashboardService.getPendingHandovers).toHaveBeenCalledTimes(1);

    // Dispatch uims:handover-update
    await act(async () => {
      window.dispatchEvent(new CustomEvent('uims:handover-update'));
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(dashboardService.getPendingHandovers).toHaveBeenCalledTimes(2);

    // Dispatch uims:notification
    await act(async () => {
      window.dispatchEvent(new CustomEvent('uims:notification'));
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(dashboardService.getPendingHandovers).toHaveBeenCalledTimes(3);
  });

  it('handles API failure gracefully and displays warning feedback', async () => {
    vi.mocked(dashboardService.getPendingHandovers).mockRejectedValueOnce(
      new Error('Database connectivity issue'),
    );

    await renderComponent();

    expect(mockMessageWarning).toHaveBeenCalledWith('Database connectivity issue');
  });

  it('renders 100% Compliant tag and empty table state when zero records are pending', async () => {
    vi.mocked(dashboardService.getPendingHandovers).mockResolvedValueOnce({
      totalPending: 0,
      overdueCount: 0,
      pendingAssignments: 0,
      pendingReturns: 0,
      pendingTransfers: 0,
      breakdownByType: { assignment: 0, return: 0, transfer: 0 },
      records: [],
    });

    await renderComponent();

    expect(container.textContent).toContain('100% Compliant');
    expect(container.textContent).toContain('No pending handover documents');
  });

  it('groups multi-device combo assignments/returns into a single Combo row, expands device details, and switches to Individual Units view', async () => {
    const comboRecords: PendingHandoverRecordItem[] = [
      {
        id: 'combo-rec-1',
        recordId: 'combo-rec-1',
        assetId: 'ast-combo-laptop',
        assetTag: 'AST-COMBO-01',
        subcode: 'AST-COMBO-01',
        modelName: 'Dell Latitude 5540',
        serialNumber: 'SN-COMBO-01',
        type: 'ASSIGNMENT',
        handoverType: 'ASSIGNMENT',
        recipientId: 'usr-alice-1',
        recipientName: 'Alice Cooper',
        recipientEmail: 'alice@uims.internal',
        department: 'Engineering',
        departmentName: 'Engineering',
        createdAt: '2026-10-15T08:00:00Z',
        daysPending: 2,
        isOverdue: false,
        timeAgo: '2d ago',
      },
      {
        id: 'combo-rec-2',
        recordId: 'combo-rec-2',
        assetId: 'ast-combo-monitor',
        assetTag: 'AST-COMBO-02',
        subcode: 'AST-COMBO-02',
        modelName: 'Dell UltraSharp U2723QE',
        serialNumber: 'SN-COMBO-02',
        type: 'ASSIGNMENT',
        handoverType: 'ASSIGNMENT',
        recipientId: 'usr-alice-1',
        recipientName: 'Alice Cooper',
        recipientEmail: 'alice@uims.internal',
        department: 'Engineering',
        departmentName: 'Engineering',
        createdAt: '2026-10-15T08:01:00Z',
        daysPending: 2,
        isOverdue: false,
        timeAgo: '2d ago',
      },
    ];

    vi.mocked(dashboardService.getPendingHandovers).mockResolvedValue({
      totalPending: 2,
      overdueCount: 0,
      pendingAssignments: 2,
      pendingReturns: 0,
      pendingTransfers: 0,
      breakdownByType: { assignment: 2, return: 0, transfer: 0 },
      records: comboRecords,
    });

    await renderComponent();

    // In default COMBO mode, the 2 records are grouped into 1 table row with "Combo (2 devices)" badge
    const initialRows = container.querySelectorAll('.ant-table-tbody tr.ant-table-row');
    expect(initialRows.length).toBe(1);
    expect(container.textContent).toContain('Combo (2 devices)');
    expect(container.textContent).toContain('Dell Latitude 5540, Dell UltraSharp U2723QE');

    // Expand the combo row via the [+] expand icon button
    const expandBtn = container.querySelector(
      'button.ant-table-row-expand-icon',
    ) as HTMLButtonElement | null;
    expect(expandBtn).not.toBeNull();
    await act(async () => {
      expandBtn?.click();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(container.textContent).toContain(
      'Combo Breakdown — 2 Devices Included in Single Handover Document:',
    );

    // Clicking Download .docx on the combo row sends BOTH assetIds in a single call
    const fakeBlob = new Blob(['combo-docx'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    vi.mocked(assetsService.downloadHandoverDocx).mockResolvedValueOnce({
      blob: fakeBlob,
      filename: 'Handover_Combo.docx',
    });

    const downloadBtn = container.querySelector(
      'button[data-testid="download-docx-combo-rec-1"]',
    ) as HTMLButtonElement;
    await act(async () => {
      downloadBtn.click();
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(assetsService.downloadHandoverDocx).toHaveBeenCalledWith({
      assetIds: ['ast-combo-laptop', 'ast-combo-monitor'],
      type: 'assignment',
      recipientId: 'usr-alice-1',
    });

    // Switch Segmented view mode to "Individual Units"
    const individualSegment = Array.from(container.querySelectorAll('.ant-segmented-item')).find(
      (el) => el.textContent?.includes('Individual Units'),
    ) as HTMLElement | undefined;
    expect(individualSegment).toBeDefined();
    await act(async () => {
      individualSegment?.click();
      await new Promise((r) => setTimeout(r, 20));
    });

    // Now 2 individual rows are displayed
    const ungroupedRows = container.querySelectorAll('.ant-table-tbody tr.ant-table-row');
    expect(ungroupedRows.length).toBe(2);
  });
});
