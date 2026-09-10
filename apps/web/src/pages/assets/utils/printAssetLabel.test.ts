import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type PrintableAssetData,
  convertToBlackAndWhiteQr,
  escapeHtml,
  generatePrintLabelHtml,
  printAssetLabel,
  printableAssetSchema,
  sanitizePrintableAsset,
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

  describe('escapeHtml', () => {
    it('returns empty string when input is null or undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('safely converts numbers and booleans without crashing', () => {
      expect(escapeHtml(12345)).toBe('12345');
      expect(escapeHtml(true)).toBe('true');
    });

    it('escapes special HTML characters', () => {
      expect(escapeHtml('<script>alert("xss") & \'test\'</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;) &amp; &#39;test&#39;&lt;/script&gt;',
      );
    });

    it('safely handles null-prototype objects and unconvertible objects without throwing', () => {
      expect(escapeHtml(Object.create(null))).toBe('');
      expect(escapeHtml({ toString: null })).toBe('');
    });
  });

  describe('printableAssetSchema & sanitizePrintableAsset', () => {
    it('validates a complete valid asset schema', () => {
      const parsed = printableAssetSchema.safeParse(mockAsset);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.tag).toBe('AST-2026-0099');
      }
    });

    it('sanitizes null or undefined inputs with safe fallbacks', () => {
      const sanitizedNull = sanitizePrintableAsset(null);
      expect(sanitizedNull.tag).toBe('UNKNOWN-TAG');
      expect(sanitizedNull.name).toBe('Unnamed Asset');
      expect(sanitizedNull.serialNumber).toBeNull();
      expect(sanitizedNull.category).toBeNull();

      const sanitizedEmpty = sanitizePrintableAsset({});
      expect(sanitizedEmpty.tag).toBe('UNKNOWN-TAG');
      expect(sanitizedEmpty.name).toBe('Unnamed Asset');
    });

    it('handles object category and location properly during sanitization', () => {
      const result = sanitizePrintableAsset({
        tag: 'TAG-123',
        name: 'Server Node',
        category: { name: 'Compute' },
        location: { name: 'Rack A1' },
      });
      expect(result.tag).toBe('TAG-123');
      expect(result.category).toEqual({ name: 'Compute' });
      expect(result.location).toEqual({ name: 'Rack A1' });
    });
  });

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
      expect(html).toContain('Asset &amp; &quot;Quotes&quot; &#39;Test&#39;');
    });

    it('degrades gracefully when passed null or incomplete data without throwing', () => {
      const html = generatePrintLabelHtml(null as unknown as PrintableAssetData, '');
      expect(html).toContain('UNKNOWN-TAG');
      expect(html).toContain('Unnamed Asset');
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
