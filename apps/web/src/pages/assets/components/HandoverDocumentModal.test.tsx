import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HandoverDocumentModal, type HandoverDocumentModalProps } from './HandoverDocumentModal';

vi.mock('../utils/printDocument', () => ({
  printDocumentHtml: vi.fn(),
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('HandoverDocumentModal Component', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  const defaultProps: HandoverDocumentModalProps = {
    open: true,
    title: 'HARDWARE ASSET HANDOVER RECORD',
    html: '<html><body><h1>Handover Record Preview</h1></body></html>',
    filename: 'asset_handover_2026-10-13_hor.docx',
    onClose: vi.fn(),
    onDownloadDocx: vi.fn(),
  };

  const renderComponent = async (props: Partial<HandoverDocumentModalProps> = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(HandoverDocumentModal, mergedProps)),
        ),
      );
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    currentRoot = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      currentRoot?.unmount();
      currentRoot = null;
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => el.remove());
  });

  it('renders modal with title, preview iframe, and action buttons', async () => {
    await renderComponent();

    expect(document.body.textContent).toContain('HARDWARE ASSET HANDOVER RECORD');
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('srcdoc')).toContain('Handover Record Preview');
  });

  it('does NOT contain any "Download HTML" button', async () => {
    await renderComponent();

    const buttons = Array.from(document.querySelectorAll('button'));
    const downloadHtmlBtn = buttons.find((b) => b.textContent?.includes('Download HTML'));
    expect(downloadHtmlBtn).toBeUndefined();
  });

  it('does NOT contain any Excel (.xlsx) download button', async () => {
    await renderComponent();

    const buttons = Array.from(document.querySelectorAll('button'));
    const downloadExcelBtn = buttons.find((b) => b.textContent?.includes('Excel'));
    expect(downloadExcelBtn).toBeUndefined();
  });

  it('renders "Download Word (.docx)" and triggers onDownloadDocx when clicked', async () => {
    const onDownloadDocx = vi.fn();
    await renderComponent({ onDownloadDocx });

    const wordButtons = Array.from(document.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Download Word'),
    );
    expect(wordButtons.length).toBeGreaterThan(0);

    await act(async () => {
      wordButtons[0].click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(onDownloadDocx).toHaveBeenCalled();
  });

  it('triggers onClose when Close button is clicked', async () => {
    const onClose = vi.fn();
    await renderComponent({ onClose });

    const closeBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Close',
    );
    expect(closeBtn).toBeDefined();

    await act(async () => {
      closeBtn?.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('renders "Print Record" and triggers printDocumentHtml when clicked', async () => {
    const { printDocumentHtml } = await import('../utils/printDocument');
    await renderComponent();

    const printButtons = Array.from(document.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Print Record'),
    );
    expect(printButtons.length).toBeGreaterThan(0);

    await act(async () => {
      printButtons[0].click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(printDocumentHtml).toHaveBeenCalledWith(
      '<html><body><h1>Handover Record Preview</h1></body></html>',
    );
  });
});
