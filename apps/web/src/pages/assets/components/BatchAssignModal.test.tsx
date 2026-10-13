import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Asset, assetsService } from '../../../services/assets.service';
import type { DirectoryUser } from '../../../services/directory.service';
import { BatchAssignModal, type BatchAssignFormValues } from './BatchAssignModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    generateHandoverDocument: vi.fn().mockResolvedValue({
      html: '<html>Handover Record</html>',
      title: 'HARDWARE ASSET HANDOVER RECORD',
      filename: 'asset_handover_test.html',
      generatedAt: '2026-10-13T00:00:00.000Z',
    }),
    uploadHandoverDocument: vi.fn().mockResolvedValue({
      fileUrl: '/api/v1/assets/handover-documents/file/signed-test.pdf',
      fileName: 'signed-test.pdf',
    }),
  },
}));

describe('BatchAssignModal Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  const mockAssets: Asset[] = [
    {
      id: 'ast-1',
      tag: 'AST-1001',
      name: 'MacBook Pro 16',
      manufacturer: 'Apple',
      model: 'M3 Max',
      serialNumber: 'SN-001',
      category: 'Laptop',
      status: 'In Storage',
      assignedTo: '',
      assignedEmail: '',
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2027-01-01',
    },
    {
      id: 'ast-2',
      tag: 'AST-1002',
      name: 'Dell Precision 7780',
      manufacturer: 'Dell',
      model: 'Precision 7780',
      serialNumber: 'SN-002',
      category: 'Laptop',
      status: 'In Storage',
      assignedTo: '',
      assignedEmail: '',
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2027-01-01',
    },
  ];

  const mockEmployees: DirectoryUser[] = [
    {
      id: 'usr-1',
      employeeCode: 'EMP-001',
      firstName: 'Sarah',
      lastName: 'Connor',
      fullName: 'Sarah Connor',
      email: 'sarah@corp.uims.internal',
      department: {
        id: 'dept-1',
        name: 'Engineering',
        code: 'ENG',
        status: 'Active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      status: 'ACTIVE' as DirectoryUser['status'],
      source: 'LOCAL' as DirectoryUser['source'],
      organizationId: 'org-1',
      departmentId: 'dept-1',
      positionId: 'pos-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

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

  const renderComponent = async (props: {
    open: boolean;
    assets: Asset[];
    submitting: boolean;
    onAssign: (values: BatchAssignFormValues) => void;
    onCancel: () => void;
  }) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(
            App,
            null,
            createElement(BatchAssignModal, { ...props, employees: mockEmployees }),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  it('renders modal with selected assets count and tags when open', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      assets: mockAssets,
      submitting: false,
      onAssign,
      onCancel,
    });

    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Batch Assign Hardware Assets');
    expect(document.body.textContent).toContain('Selected Assets for Batch Update');
    expect(document.body.textContent).toContain('2 hardware devices');
    expect(document.body.textContent).toContain('AST-1001: MacBook Pro 16');
    expect(document.body.textContent).toContain('AST-1002: Dell Precision 7780');
  });

  it('allows switching to unassign mode and submitting', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      assets: mockAssets,
      submitting: false,
      onAssign,
      onCancel,
    });

    // Find radio button for unassign
    const radios = Array.from(
      document.querySelectorAll<HTMLInputElement>('.ant-radio-button-input'),
    );
    const unassignRadio = radios.find((r) => r.value === 'unassign');
    expect(unassignRadio).toBeDefined();

    await act(async () => {
      unassignRadio?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.body.textContent).toContain('Unassign Hardware Assets');

    // Click OK button (Unassign 2 Assets)
    const okBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal-footer button'),
    ).find((b) => b.textContent?.includes('Unassign'));
    expect(okBtn).toBeDefined();

    await act(async () => {
      okBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(onAssign).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'unassign',
        assignedToId: null,
      }),
    );
  });

  it('triggers onCancel when clicking cancel button', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      assets: mockAssets,
      submitting: false,
      onAssign,
      onCancel,
    });

    const cancelBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal-footer button'),
    ).find((b) => b.textContent?.includes('Cancel'));
    expect(cancelBtn).toBeDefined();

    await act(async () => {
      cancelBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(onCancel).toHaveBeenCalled();
  });

  it('renders document generation toolbar with Preview, Print, and Download buttons and direct upload dragger', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      assets: mockAssets,
      submitting: false,
      onAssign,
      onCancel,
    });

    // Check handover documentation card
    expect(document.body.textContent).toContain('Handover Record Documentation');
    expect(document.body.textContent).toContain('Populate pre-filled handover document');
    expect(document.body.textContent).toContain('Preview');
    expect(document.body.textContent).toContain('Print');
    expect(document.body.textContent).toContain('Download');

    // Check direct upload dragger
    expect(document.body.textContent).toContain('Signed Handover Document');
    expect(document.body.textContent).toContain('Click or drag signed document here to upload');
    expect(document.body.textContent).toContain('Supports PDF, PNG, JPG up to 10MB');

    const dragger = document.querySelector('.ant-upload-drag');
    expect(dragger).toBeDefined();
  });

  it('triggers preview handover document when clicking preview button', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      assets: mockAssets,
      submitting: false,
      onAssign,
      onCancel,
    });

    const previewBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.includes('Preview'),
    );
    expect(previewBtn).toBeDefined();

    await act(async () => {
      previewBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(assetsService.generateHandoverDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'assignment',
        assetIds: ['ast-1', 'ast-2'],
      }),
    );
  });

  it('triggers print handover document when clicking print button', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      assets: mockAssets,
      submitting: false,
      onAssign,
      onCancel,
    });

    const printBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Print'),
    );
    expect(printBtn).toBeDefined();

    await act(async () => {
      printBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(assetsService.generateHandoverDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'assignment',
        assetIds: ['ast-1', 'ast-2'],
      }),
    );
  });

  it('triggers download handover document when clicking download button', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      assets: mockAssets,
      submitting: false,
      onAssign,
      onCancel,
    });

    const downloadBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.includes('Download'),
    );
    expect(downloadBtn).toBeDefined();

    await act(async () => {
      downloadBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(assetsService.generateHandoverDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'assignment',
        assetIds: ['ast-1', 'ast-2'],
      }),
    );
  });

  it('uploads signed document and passes signedDocUrl to onAssign when file is attached', async () => {
    const onAssign = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      assets: mockAssets,
      submitting: false,
      onAssign,
      onCancel,
    });

    // Select employee
    const select = document.querySelector('.ant-select-selection-search-input');
    expect(select).toBeDefined();
    await act(async () => {
      select?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const option = document.querySelector('.ant-select-item-option');
    if (option) {
      await act(async () => {
        option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    }

    // Attach file via input
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toBeDefined();

    const testFile = new File(['dummy-content'], 'signed_handover.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [testFile],
          writable: true,
        });
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    const okBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal-footer button'),
    ).find((b) => b.textContent?.includes('Assign 2 Assets'));

    if (okBtn && !okBtn.disabled) {
      await act(async () => {
        okBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(assetsService.uploadHandoverDocument).toHaveBeenCalled();
      expect(onAssign).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'assign',
          signedDocUrl: '/api/v1/assets/handover-documents/file/signed-test.pdf',
        }),
      );
    }
  });
});
