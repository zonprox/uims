import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type PrintableAssetData,
  convertToBlackAndWhiteQr,
  generatePrintLabelHtml,
  printAssetLabel,
} from './printAssetLabel';

describe('printAssetLabel utility', () => {
  const mockAsset: PrintableAssetData = {
    tag: 'AST-2026-0099',
    name: 'ThinkPad X1 Carbon Gen 12',
    serialNumber: 'SN-LENOVO-9900',
    model: 'ThinkPad X1 Carbon',
    category: 'Laptops',
    location: 'Floor 3 Server Room',
  };

  describe('generatePrintLabelHtml', () => {
    it('generates isolated printable label HTML containing asset metadata', () => {
      const html = generatePrintLabelHtml(mockAsset, 'data:image/png;base64,mockqr');

      expect(html).toContain('Asset Label - AST-2026-0099');
      expect(html).toContain('AST-2026-0099');
      expect(html).toContain('ThinkPad X1 Carbon Gen 12');
      expect(html).toContain('SN-LENOVO-9900');
      expect(html).toContain('ThinkPad X1 Carbon');
      expect(html).toContain('Laptops');
      expect(html).toContain('data:image/png;base64,mockqr');
      expect(html).toContain('@media print');
      expect(html).toContain('.asset-label-badge');
    });

    it('handles category as an object with name property', () => {
      const assetWithObjCategory: PrintableAssetData = {
        ...mockAsset,
        category: { name: 'Workstations' },
      };
      const html = generatePrintLabelHtml(assetWithObjCategory, 'data:image/png;base64,mockqr');
      expect(html).toContain('Category: Workstations');
    });

    it('escapes special characters to prevent HTML injection', () => {
      const xssAsset: PrintableAssetData = {
        tag: 'AST-<script>alert(1)</script>',
        name: 'Asset & "Quotes" \'Test\'',
      };
      const html = generatePrintLabelHtml(xssAsset, '');
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('AST-&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('Asset &amp; &quot;Quotes&quot; &#039;Test&#039;');
    });
  });

  describe('convertToBlackAndWhiteQr', () => {
    it('converts dark mode transparent canvas with white modules into black modules on white', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw transparent canvas with white modules (dark mode on-screen QR code)
        ctx.clearRect(0, 0, 10, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, 2, 6, 6);
      }

      const dataUrl = convertToBlackAndWhiteQr(canvas);
      expect(typeof dataUrl).toBe('string');
      expect(dataUrl.startsWith('data:image/png')).toBe(true);
    });

    it('handles canvas without 2d context gracefully', () => {
      const mockCanvas = {
        width: 10,
        height: 10,
        getContext: () => null,
        toDataURL: () => 'data:image/png;base64,fallback',
      } as unknown as HTMLCanvasElement;

      const dataUrl = convertToBlackAndWhiteQr(mockCanvas);
      expect(dataUrl).toBe('data:image/png;base64,fallback');
    });
  });

  describe('printAssetLabel execution', () => {
    let originalPrint: typeof window.print;

    beforeEach(() => {
      originalPrint = window.print;
      window.print = vi.fn();
    });

    afterEach(() => {
      window.print = originalPrint;
      const iframe = document.getElementById('uims-print-frame');
      if (iframe) {
        iframe.remove();
      }
    });

    it('creates an isolated hidden iframe and prints without full-page leakage', () => {
      const mockIframePrint = vi.fn();
      const mockIframeFocus = vi.fn();

      // Spy on appendChild to mock the iframe contentWindow
      const originalAppendChild = document.body.appendChild.bind(document.body);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node instanceof HTMLIFrameElement && node.id === 'uims-print-frame') {
          Object.defineProperty(node, 'contentWindow', {
            value: {
              document: {
                open: vi.fn(),
                write: vi.fn(),
                close: vi.fn(),
                querySelector: vi.fn().mockReturnValue(null),
              },
              focus: mockIframeFocus,
              print: mockIframePrint,
            },
            configurable: true,
          });
        }
        return originalAppendChild(node);
      });

      printAssetLabel(mockAsset);

      // Verify that an iframe was appended to document.body
      expect(appendChildSpy).toHaveBeenCalled();

      appendChildSpy.mockRestore();
    });
  });
});
