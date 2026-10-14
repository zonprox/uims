import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Asset, assetsService } from '../../../services/assets.service';
import { ReturnAssetModal, type ReturnAssetFormValues } from './ReturnAssetModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    generateHandoverDocument: vi.fn().mockResolvedValue({
      html: '<html>Return Record Document</html>',
      title: 'HARDWARE ASSET RETURN RECORD',
      filename: 'asset_return_test.html',
      generatedAt: '2026-10-13T00:00:00.000Z',
    }),
    downloadHandoverDocx: vi.fn().mockResolvedValue({
      blob: new Blob(['docx']),
      filename: 'asset_return_test.docx',
    }),
    downloadHandoverXlsx: vi.fn().mockResolvedValue({
      blob: new Blob(['xlsx']),
      filename: 'asset_return_test.xlsx',
    }),
    uploadHandoverDocument: vi.fn().mockResolvedValue({
      fileUrl: '/api/v1/assets/handover-documents/file/signed-return.pdf',
      fileName: 'signed-return.pdf',
    }),
    returnAsset: vi.fn().mockResolvedValue({
      id: 'ast-ret-1',
      status: 'In Storage',
      hasPendingRecord: false,
    }),
  },
}));

describe('ReturnAssetModal Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  const mockAsset: Asset = {
    id: 'ast-ret-1',
    tag: 'AST-RET-01',
    name: 'MacBook Air M2',
    manufacturer: 'Apple',
    model: 'MacBook Air 13',
    serialNumber: 'SN-APL-RET',
    category: 'Laptop',
    status: 'In Use',
    assignedTo: 'John Doe',
    assignedEmail: 'john@corp.uims.internal',
    purchaseDate: '2026-01-01',
    warrantyExpiry: '2027-01-01',
    hasPendingRecord: false,
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
    document.body.innerHTML = '';
  });

  const renderComponent = async (props: {
    open: boolean;
    asset: Asset | null;
    submitting?: boolean;
    onReturn?: (values: ReturnAssetFormValues) => void;
    onSuccess?: () => void;
    onCancel: () => void;
  }) => {
    if (!currentRoot) {
      currentRoot = createRoot(container);
    }
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(ReturnAssetModal, props)),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  it('renders modal with asset summary and document toolbar when open', async () => {
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      asset: mockAsset,
      onCancel,
    });

    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Return Hardware Asset');
    expect(document.body.textContent).toContain('Asset & Custody Summary');
    expect(document.body.textContent).toContain('AST-RET-01');
    expect(document.body.textContent).toContain('MacBook Air M2');
    expect(document.body.textContent).toContain('John Doe');

    // Document toolbar
    expect(document.body.textContent).toContain('Return Record Documentation');
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.ant-modal button'));
    expect(buttons.some((b) => b.textContent?.includes('Preview'))).toBe(true);
    expect(buttons.some((b) => b.textContent?.includes('Print'))).toBe(true);
    expect(buttons.some((b) => b.textContent?.includes('Word (.docx)'))).toBe(true);
    expect(buttons.some((b) => b.textContent?.includes('Excel (.xlsx)'))).toBe(true);

    // Direct upload
    expect(document.body.textContent).toContain('Signed Return Document');
    expect(document.body.textContent).toContain(
      'Click or drag signed return record here to upload',
    );
  });

  it('triggers preview return document when clicking preview button', async () => {
    await renderComponent({
      open: true,
      asset: mockAsset,
      onCancel: vi.fn(),
    });

    const previewBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal button'),
    ).find((b) => b.textContent?.includes('Preview'));
    expect(previewBtn).toBeDefined();

    await act(async () => {
      previewBtn?.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(assetsService.generateHandoverDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'return',
        assetIds: ['ast-ret-1'],
      }),
    );
  });

  it('submits return with onReturn callback', async () => {
    const onReturn = vi.fn();
    const onCancel = vi.fn();

    await renderComponent({
      open: true,
      asset: mockAsset,
      onReturn,
      onCancel,
    });

    const okBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal-footer button'),
    ).find((b) => b.textContent?.includes('Confirm Return'));
    expect(okBtn).toBeDefined();

    await act(async () => {
      okBtn?.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(onReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'In Storage',
      }),
    );
  });

  it('triggers print return document when clicking print button', async () => {
    await renderComponent({
      open: true,
      asset: mockAsset,
      onCancel: vi.fn(),
    });

    const printBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal button'),
    ).find((b) => b.textContent?.includes('Print'));
    expect(printBtn).toBeDefined();

    await act(async () => {
      printBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(assetsService.generateHandoverDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'return',
        assetIds: ['ast-ret-1'],
      }),
    );
  });

  it('triggers download return document when clicking Word (.docx) button', async () => {
    await renderComponent({
      open: true,
      asset: mockAsset,
      onCancel: vi.fn(),
    });

    const docxBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal button'),
    ).find((b) => b.textContent?.includes('Word (.docx)'));
    expect(docxBtn).toBeDefined();

    await act(async () => {
      docxBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(assetsService.generateHandoverDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'return',
        assetIds: ['ast-ret-1'],
      }),
    );
    expect(assetsService.downloadHandoverDocx).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'return',
        assetIds: ['ast-ret-1'],
      }),
    );
  });

  it('triggers download return spreadsheet when clicking Excel (.xlsx) button', async () => {
    await renderComponent({
      open: true,
      asset: mockAsset,
      onCancel: vi.fn(),
    });

    const xlsxBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal button'),
    ).find((b) => b.textContent?.includes('Excel (.xlsx)'));
    expect(xlsxBtn).toBeDefined();

    await act(async () => {
      xlsxBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(assetsService.downloadHandoverXlsx).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'return',
        assetIds: ['ast-ret-1'],
      }),
    );
  });

  it('uploads signed return document and passes signedDocUrl to onReturn callback', async () => {
    const onReturn = vi.fn();

    await renderComponent({
      open: true,
      asset: mockAsset,
      onReturn,
      onCancel: vi.fn(),
    });

    // Attach file via input
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toBeDefined();

    const testFile = new File(['dummy-return-content'], 'signed_return.pdf', {
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
    ).find((b) => b.textContent?.includes('Confirm Return'));

    expect(okBtn).toBeDefined();
    await act(async () => {
      okBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(assetsService.uploadHandoverDocument).toHaveBeenCalled();
    expect(onReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'In Storage',
        signedDocUrl: '/api/v1/assets/handover-documents/file/signed-return.pdf',
      }),
    );
  });

  it('hides return record documentation and shows unassigned alert when asset has no custodian', async () => {
    const unassignedAsset: Asset = {
      ...mockAsset,
      assignedTo: '',
      assignedToId: null,
      assignedEmail: '',
    };

    await renderComponent({
      open: true,
      asset: unassignedAsset,
      onCancel: vi.fn(),
    });

    expect(document.body.textContent).toContain('Unassigned Asset');
    expect(document.body.textContent).toContain('This asset has no current custodian');
    expect(document.body.textContent).not.toContain('Return Record Documentation');
  });
});
