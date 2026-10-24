import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DoorDocumentType, type DocumentScanDetailDto } from '@uims/shared-types';
import { DocumentPreviewModal } from '../modals/DocumentPreviewModal';
import { accessControlService } from '../../../services/access-control.service';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/access-control.service', () => ({
  accessControlService: {
    getDocumentById: vi.fn(),
    downloadDocumentBlob: vi.fn(),
  },
}));

describe('DocumentPreviewModal Component Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  const mockCreateObjectURL = vi.fn();
  const mockRevokeObjectURL = vi.fn();

  const mockPdfDoc: DocumentScanDetailDto = {
    id: 'doc-pdf-001',
    fileName: 'scan_approved_clearance.pdf',
    originalName: 'clearance-form-signed.pdf',
    filePath: 'uploads/access-control/scans/scan_approved_clearance.pdf',
    fileUrl: '/api/v1/access-control/documents/file/scan_approved_clearance.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024 * 1024 * 2, // 2MB
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    documentType: DoorDocumentType.GRANT,
    approverName: 'Jane Smith',
    approverTitle: 'Chief Security Officer',
    referenceNumber: 'REF-2026-CSO-001',
    reason: 'Security clearance for critical server room access',
    notes: 'Approved after identity background check',
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-24T10:00:00.000Z',
  };

  const mockImageDoc: DocumentScanDetailDto = {
    ...mockPdfDoc,
    id: 'doc-img-002',
    fileName: 'id_badge_scan.png',
    originalName: 'id_badge_scan.png',
    mimeType: 'image/png',
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    mockCreateObjectURL.mockReturnValue('blob:http://localhost/mock-blob-token-1234');
    mockRevokeObjectURL.mockReturnValue(undefined);
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    vi.mocked(accessControlService.getDocumentById).mockResolvedValue(mockPdfDoc);
    vi.mocked(accessControlService.downloadDocumentBlob).mockResolvedValue({
      blob: new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' }),
      filename: 'clearance-form-signed.pdf',
    });
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    container.remove();
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer-root, .ant-popover')
      .forEach((el) => el.remove());

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.clearAllMocks();
  });

  const mountModal = async (open: boolean, documentId?: string, onClose = vi.fn()) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(
            App,
            null,
            createElement(DocumentPreviewModal, {
              state: { open, documentId },
              onClose,
            }),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
  };

  it('fetches binary blob via Bearer auth, creates object URL, and renders PDF preview in iframe', async () => {
    await mountModal(true, 'doc-pdf-001');

    expect(accessControlService.getDocumentById).toHaveBeenCalledWith('doc-pdf-001');
    expect(accessControlService.downloadDocumentBlob).toHaveBeenCalledWith('doc-pdf-001');
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.src).toBe('blob:http://localhost/mock-blob-token-1234');
    expect(document.body.textContent).toContain('clearance-form-signed.pdf');
    expect(document.body.textContent).toContain('Chief Security Officer');
  });

  it('renders image tag when document mime type is image/png', async () => {
    vi.mocked(accessControlService.getDocumentById).mockResolvedValue(mockImageDoc);
    vi.mocked(accessControlService.downloadDocumentBlob).mockResolvedValue({
      blob: new Blob(['mock png bytes'], { type: 'image/png' }),
      filename: 'id_badge_scan.png',
    });

    await mountModal(true, 'doc-img-002');

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const img = document.querySelector('img[alt="Document Scan"]') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe('blob:http://localhost/mock-blob-token-1234');
  });

  it('cleans up object URL via revokeObjectURL when modal is closed or unmounted', async () => {
    await mountModal(true, 'doc-pdf-001');
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();

    // Unmount modal
    await act(async () => {
      currentRoot?.unmount();
      currentRoot = null;
    });

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-blob-token-1234');
  });

  it('handles error gracefully when document or blob download fails', async () => {
    vi.mocked(accessControlService.getDocumentById).mockRejectedValue(
      new Error('Network error loading document metadata'),
    );

    await mountModal(true, 'doc-err-001');

    // Should not crash and should show error message
    expect(document.querySelector('.ant-modal')).not.toBeNull();
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
  });

  it('downloads document when Download Scan button is clicked', async () => {
    await mountModal(true, 'doc-pdf-001');

    const downloadButton = Array.from(document.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Download Scan'),
    );
    expect(downloadButton).toBeDefined();

    await act(async () => {
      downloadButton?.click();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(accessControlService.downloadDocumentBlob).toHaveBeenCalledWith('doc-pdf-001');
  });
});
