/**
 * Secure, clean print & download utilities for generated handover/return HTML documents.
 */

export function printDocumentHtml(html: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.title = 'Document Print Preview';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (printErr: unknown) {
        // Fallback in headless or restricted browser contexts
        void printErr;
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      }
    }, 250);
  } catch (docErr: unknown) {
    void docErr;
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

export function downloadDocumentHtml(html: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const createObjectURL = window.URL?.createObjectURL || URL?.createObjectURL;
    if (typeof createObjectURL === 'function') {
      const url = createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        if (typeof window.URL?.revokeObjectURL === 'function') {
          window.URL.revokeObjectURL(url);
        }
      }, 500);
    }
  } catch (downloadErr: unknown) {
    // Fallback in tests or non-browser environments
    void downloadErr;
  }
}
