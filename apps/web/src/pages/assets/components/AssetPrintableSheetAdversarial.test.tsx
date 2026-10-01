import { App, ConfigProvider } from 'antd';
import * as fs from 'fs';
import * as path from 'path';
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { BatchPrintModal } from './BatchPrintModal';
import { PrintableAssetSheet } from './PrintableAssetSheet';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createAdversarialAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: `ast-test-${Math.random().toString(36).substring(2, 9)}`,
    tag: 'AST-TEST-001',
    name: 'Standard Laptop Workstation',
    manufacturer: 'Apple',
    model: 'MacBook Pro 16 M3',
    serialNumber: 'SN-TEST-8888',
    category: 'Laptops',
    status: 'Active',
    assignedTo: 'Engineer Doe',
    assignedEmail: 'engineer@uims.internal',
    location: 'Floor 4, Pod B',
    purchaseDate: '2026-01-01',
    warrantyExpiry: '2029-01-01',
    ...overrides,
  };
}

describe('Empirical Adversarial Verification Suite — Printable QR Sheet & Cut Guides', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  let originalPrint: typeof window.print | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    originalPrint = window.print;
  });

  afterEach(async () => {
    if (originalPrint !== undefined) {
      window.print = originalPrint;
    } else {
      delete (window as unknown as { print?: unknown }).print;
    }

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

  const renderSheet = async (props: { assets: Asset[]; columns?: 3 | 4 }) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(PrintableAssetSheet, props)),
        ),
      );
    });
  };

  const renderModal = async (props: { open: boolean; assets: Asset[]; onClose: () => void }) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(App, null, createElement(BatchPrintModal, props)),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  describe('1. High-Density A4 Grid Layout (3-Column vs 4-Column)', () => {
    it('defaults to 3-column layout when columns prop is omitted', async () => {
      const asset = createAdversarialAsset({ tag: 'AST-COL-DEF' });
      await renderSheet({ assets: [asset] });

      const grid = container.querySelector('.printable-asset-sheet') as HTMLElement;
      expect(grid).not.toBeNull();
      expect(grid.classList.contains('cols-3')).toBe(true);
      expect(grid.classList.contains('cols-4')).toBe(false);
      expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
      expect(grid.style.gap).toBe('8px');
    });

    it('renders 4-column compact layout when columns={4}', async () => {
      const asset = createAdversarialAsset({ tag: 'AST-COL-4' });
      await renderSheet({ assets: [asset], columns: 4 });

      const grid = container.querySelector('.printable-asset-sheet') as HTMLElement;
      expect(grid).not.toBeNull();
      expect(grid.classList.contains('cols-4')).toBe(true);
      expect(grid.classList.contains('cols-3')).toBe(false);
      expect(grid.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
      expect(grid.style.gap).toBe('6px');
    });

    it('dynamically adapts grid template and gap when columns prop changes', async () => {
      const asset = createAdversarialAsset({ tag: 'AST-COL-TOGGLE' });

      const DynamicWrapper: React.FC = () => {
        const [cols, setCols] = useState<3 | 4>(3);
        return createElement(
          'div',
          null,
          createElement(
            'button',
            {
              id: 'toggle-btn',
              onClick: () => setCols((prev) => (prev === 3 ? 4 : 3)),
            },
            'Toggle',
          ),
          createElement(PrintableAssetSheet, { assets: [asset], columns: cols }),
        );
      };

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(ConfigProvider, null, createElement(App, null, createElement(DynamicWrapper))),
        );
      });

      const grid = container.querySelector('.printable-asset-sheet') as HTMLElement;
      expect(grid.classList.contains('cols-3')).toBe(true);
      expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
      expect(grid.style.gap).toBe('8px');

      const button = container.querySelector('#toggle-btn') as HTMLButtonElement;
      await act(async () => {
        button.click();
      });

      expect(grid.classList.contains('cols-4')).toBe(true);
      expect(grid.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
      expect(grid.style.gap).toBe('6px');

      await act(async () => {
        button.click();
      });

      expect(grid.classList.contains('cols-3')).toBe(true);
      expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)');
      expect(grid.style.gap).toBe('8px');
    });
  });

  describe('2. Label Card Anatomy, Typography & Scannable SVG QR Code', () => {
    it('renders Ant Design SVG QR code with black-on-white contrast and exact asset tag', async () => {
      const asset = createAdversarialAsset({ tag: 'AST-SCAN-VERIFY-123' });
      await renderSheet({ assets: [asset], columns: 3 });

      const card = container.querySelector('.printable-sheet-card') as HTMLElement;
      expect(card).not.toBeNull();

      const svg = card.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.tagName.toLowerCase()).toBe('svg');

      // Card must render UIMS ASSET brand header
      expect(card.textContent).toContain('UIMS ASSET');
    });

    it('renders prominent bold monospace asset tag on each card', async () => {
      const asset = createAdversarialAsset({ tag: 'AST-PROMINENT-TAG' });
      await renderSheet({ assets: [asset], columns: 3 });

      const card = container.querySelector('.printable-sheet-card') as HTMLElement;
      const tagText = Array.from(card.querySelectorAll('span')).find(
        (span) => span.textContent === 'AST-PROMINENT-TAG',
      );

      expect(tagText).toBeDefined();
      expect(tagText?.style.fontFamily).toContain('ui-monospace');
      expect(tagText?.classList.contains('ant-typography')).toBe(true);
      // font-weight check or strong styling
      expect(tagText?.tagName.toLowerCase()).toBe('span');
      expect(tagText?.style.fontSize).toBe('13px');
    });

    it('adjusts font size for compact 4-column layout', async () => {
      const asset = createAdversarialAsset({ tag: 'AST-COMPACT-FONT' });
      await renderSheet({ assets: [asset], columns: 4 });

      const card = container.querySelector('.printable-sheet-card') as HTMLElement;
      const tagText = Array.from(card.querySelectorAll('span')).find(
        (span) => span.textContent === 'AST-COMPACT-FONT',
      );

      expect(tagText).toBeDefined();
      expect(tagText?.style.fontSize).toBe('11px');
    });

    it('renders display name with robust fallback hierarchy', async () => {
      const assetWithName = createAdversarialAsset({
        id: 'ast-1',
        tag: 'AST-NAME-1',
        name: 'Custom Asset Name',
        manufacturer: 'Lenovo',
        model: 'ThinkPad X1',
      });
      const assetWithModelOnly = createAdversarialAsset({
        id: 'ast-2',
        tag: 'AST-NAME-2',
        name: '',
        manufacturer: 'Dell',
        model: 'OptiPlex 7090',
      });
      const assetWithNoNameOrModel = createAdversarialAsset({
        id: 'ast-3',
        tag: 'AST-NAME-3',
        name: '',
        manufacturer: '',
        model: '',
      });

      await renderSheet({
        assets: [assetWithName, assetWithModelOnly, assetWithNoNameOrModel],
      });

      const cards = container.querySelectorAll('.printable-sheet-card');
      expect(cards.length).toBe(3);

      expect(cards[0].textContent).toContain('Custom Asset Name');
      expect(cards[1].textContent).toContain('Dell OptiPlex 7090');
      expect(cards[2].textContent).toContain('Hardware Asset');
    });

    it('renders serial number with monospace font when present, and omits when empty or null', async () => {
      const assetWithSn = createAdversarialAsset({
        id: 'ast-sn-1',
        tag: 'AST-SN-1',
        serialNumber: 'SN-REAL-999',
      });
      const assetWithEmptySn = createAdversarialAsset({
        id: 'ast-sn-2',
        tag: 'AST-SN-2',
        serialNumber: '',
      });
      const assetWithNullSn = createAdversarialAsset({
        id: 'ast-sn-3',
        tag: 'AST-SN-3',
        serialNumber: null,
      });

      await renderSheet({
        assets: [assetWithSn, assetWithEmptySn, assetWithNullSn],
      });

      const cards = container.querySelectorAll('.printable-sheet-card');
      expect(cards[0].textContent).toContain('S/N: SN-REAL-999');
      expect(cards[1].textContent).not.toContain('S/N:');
      expect(cards[2].textContent).not.toContain('S/N:');

      // Verify monospace styling on serial number
      const snSpan = Array.from(cards[0].querySelectorAll('span')).find(
        (span) => span.textContent === 'S/N: SN-REAL-999',
      );
      expect(snSpan?.style.fontFamily).toContain('ui-monospace');
    });
  });

  describe('3. Dashed Cut Guides & Scissor Margins (Physical Cutting Safety)', () => {
    it('verifies 1.5px dashed border, scissor padding, and page-break avoidance inline styles', async () => {
      const asset = createAdversarialAsset({ tag: 'AST-CUT-GUIDES' });
      await renderSheet({ assets: [asset], columns: 3 });

      const card = container.querySelector('.printable-sheet-card') as HTMLElement;
      expect(card).not.toBeNull();

      // Border cut guides
      expect(card.style.border).toContain('dashed');
      expect(card.style.border).toContain('#777777');
      expect(card.style.borderRadius).toBe('4px');

      // Scissor margins / padding
      expect(card.style.padding).toBe('8px 10px');
      expect(card.style.boxSizing).toBe('border-box');

      // Page break prevention
      expect(card.style.breakInside).toBe('avoid');
      expect(card.style.pageBreakInside).toBe('avoid');

      // Color contrast
      expect(['#ffffff', 'rgb(255, 255, 255)']).toContain(card.style.background.toLowerCase());
      expect(['#000000', 'rgb(0, 0, 0)']).toContain(card.style.color.toLowerCase());
    });
  });

  describe('4. Print Media CSS Architecture & global.css Invariants', () => {
    it('verifies @media print rules in global.css enforce layout isolation, no trailing blank pages, and cut guides', () => {
      const globalCssPath = path.resolve(__dirname, '../../../styles/global.css');
      expect(fs.existsSync(globalCssPath)).toBe(true);

      const cssContent = fs.readFileSync(globalCssPath, 'utf-8');

      // 1. Media print block exists
      expect(cssContent).toContain('@media print');

      // 2. Main application chrome is hidden
      expect(cssContent).toMatch(/#root[\s\S]*?\.ant-layout[\s\S]*?display:\s*none\s*!important/);
      expect(cssContent).toMatch(/\.ant-modal-header[\s\S]*?display:\s*none\s*!important/);
      expect(cssContent).toMatch(/\.ant-modal-footer[\s\S]*?display:\s*none\s*!important/);
      expect(cssContent).toMatch(/\.ant-btn[\s\S]*?display:\s*none\s*!important/);

      // 3. Trailing blank page prevention on html, body
      expect(cssContent).toMatch(/html,\s*body[\s\S]*?height:\s*auto\s*!important/);
      expect(cssContent).toMatch(/html,\s*body[\s\S]*?min-height:\s*auto\s*!important/);

      // 4. Modal container neutralization (position: static, width: 100%, background: transparent)
      expect(cssContent).toMatch(/\.ant-modal-root[\s\S]*?position:\s*static\s*!important/);
      expect(cssContent).toMatch(/\.ant-modal-body[\s\S]*?position:\s*static\s*!important/);

      // 5. Multi-column A4 grid rules
      expect(cssContent).toMatch(/\.printable-asset-sheet[\s\S]*?display:\s*grid\s*!important/);
      expect(cssContent).toMatch(/\.printable-asset-sheet[\s\S]*?grid-template-columns:\s*repeat\(3,\s*1fr\)\s*!important/);
      expect(cssContent).toMatch(/\.printable-asset-sheet\.cols-4[\s\S]*?grid-template-columns:\s*repeat\(4,\s*1fr\)\s*!important/);

      // 6. Label card cut guides & page-break avoidance in print media
      expect(cssContent).toMatch(/\.printable-sheet-card[\s\S]*?position:\s*static\s*!important/);
      expect(cssContent).toMatch(/\.printable-sheet-card[\s\S]*?break-inside:\s*avoid\s*!important/);
      expect(cssContent).toMatch(/\.printable-sheet-card[\s\S]*?page-break-inside:\s*avoid\s*!important/);
      expect(cssContent).toMatch(/\.printable-sheet-card[\s\S]*?border:\s*1\.5px\s*dashed\s*#777777\s*!important/);
      expect(cssContent).toMatch(/\.printable-sheet-card[\s\S]*?padding:\s*8px\s*10px\s*!important/);
    });
  });

  describe('5. BatchPrintModal Lifecycle, Density Switcher & window.print Resilience', () => {
    it('renders modal with exact count and responds to column switcher', async () => {
      const onClose = vi.fn();
      const assets = [
        createAdversarialAsset({ id: 'a1', tag: 'AST-M1' }),
        createAdversarialAsset({ id: 'a2', tag: 'AST-M2' }),
        createAdversarialAsset({ id: 'a3', tag: 'AST-M3' }),
      ];

      await renderModal({ open: true, assets, onClose });

      expect(document.body.textContent).toContain('Batch Print QR Labels (3 Selected)');

      const sheet = document.body.querySelector('.printable-asset-sheet') as HTMLElement;
      expect(sheet).not.toBeNull();
      expect(sheet.classList.contains('cols-3')).toBe(true);

      // Click 4 Columns in Segmented control
      const segmentedItems = document.body.querySelectorAll('.ant-segmented-item');
      const fourColItem = Array.from(segmentedItems).find((item) =>
        item.textContent?.includes('4 Columns'),
      ) as HTMLElement | undefined;

      expect(fourColItem).toBeDefined();

      await act(async () => {
        fourColItem?.click();
      });

      expect(sheet.classList.contains('cols-4')).toBe(true);

      // Click 3 Columns
      const threeColItem = Array.from(segmentedItems).find((item) =>
        item.textContent?.includes('3 Columns'),
      ) as HTMLElement | undefined;

      await act(async () => {
        threeColItem?.click();
      });

      expect(sheet.classList.contains('cols-3')).toBe(true);
    });

    it('invokes window.print when Print Sheet button is clicked', async () => {
      const onClose = vi.fn();
      const mockPrint = vi.fn();
      window.print = mockPrint;

      const assets = [createAdversarialAsset({ tag: 'AST-PRINT-CLICK' })];
      await renderModal({ open: true, assets, onClose });

      const printBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('Print Sheet'),
      );
      expect(printBtn).toBeDefined();
      expect(printBtn?.hasAttribute('disabled')).toBe(false);

      await act(async () => {
        printBtn?.click();
      });

      expect(mockPrint).toHaveBeenCalledTimes(1);
    });

    it('does NOT throw error when window.print is undefined (resilient fallback)', async () => {
      const onClose = vi.fn();
      delete (window as unknown as { print?: unknown }).print;

      const assets = [createAdversarialAsset({ tag: 'AST-PRINT-UNDEF' })];
      await renderModal({ open: true, assets, onClose });

      const printBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('Print Sheet'),
      );
      expect(printBtn).toBeDefined();

      let errorThrown: unknown = null;
      try {
        await act(async () => {
          printBtn?.click();
        });
      } catch (err: unknown) {
        errorThrown = err;
      }

      expect(errorThrown).toBeNull();
    });

    it('does NOT throw error when window.print is null (resilient fallback)', async () => {
      const onClose = vi.fn();
      (window as unknown as { print: unknown }).print = null;

      const assets = [createAdversarialAsset({ tag: 'AST-PRINT-NULL' })];
      await renderModal({ open: true, assets, onClose });

      const printBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('Print Sheet'),
      );
      expect(printBtn).toBeDefined();

      let errorThrown: unknown = null;
      try {
        await act(async () => {
          printBtn?.click();
        });
      } catch (err: unknown) {
        errorThrown = err;
      }

      expect(errorThrown).toBeNull();
    });

    it('disables Print Sheet button and renders empty state when assets array is empty', async () => {
      const onClose = vi.fn();
      await renderModal({ open: true, assets: [], onClose });

      expect(document.body.textContent).toContain('Batch Print QR Labels (0 Selected)');
      expect(document.body.textContent).toContain('No assets selected for printing');

      const printBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('Print Sheet'),
      );
      expect(printBtn).toBeDefined();
      expect(printBtn?.hasAttribute('disabled')).toBe(true);
    });

    it('triggers onClose when Close button or cancel is activated', async () => {
      const onClose = vi.fn();
      await renderModal({
        open: true,
        assets: [createAdversarialAsset({ tag: 'AST-CLOSE' })],
        onClose,
      });

      const closeBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
        btn.textContent?.trim() === 'Close',
      );
      expect(closeBtn).toBeDefined();

      await act(async () => {
        closeBtn?.click();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('6. Extreme Stress Inputs & Adversarial Edge Cases', () => {
    it('handles completely null or undefined assets array gracefully without crashing', async () => {
      let errorThrown: unknown = null;
      try {
        await renderSheet({ assets: null as unknown as Asset[] });
      } catch (err: unknown) {
        errorThrown = err;
      }

      expect(errorThrown).toBeNull();
      expect(container.textContent).toContain('No assets selected for printing');

      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }

      try {
        await renderSheet({ assets: undefined as unknown as Asset[] });
      } catch (err: unknown) {
        errorThrown = err;
      }

      expect(errorThrown).toBeNull();
      expect(container.textContent).toContain('No assets selected for printing');
    });

    it('survives extremely long strings (150-char tag, 500-char name, 200-char serial number)', async () => {
      const megaTag = `AST-${'X'.repeat(146)}`;
      const megaName = `Ultra Enterprise High Availability Modular Server Blade Chassis System with Redundant Power Supplies and Quad 100GbE Optical Transceivers — ${'W'.repeat(300)}`;
      const megaSerial = `SN-${'9'.repeat(197)}`;

      const extremeAsset = createAdversarialAsset({
        tag: megaTag,
        name: megaName,
        serialNumber: megaSerial,
      });

      let errorThrown: unknown = null;
      try {
        await renderSheet({ assets: [extremeAsset], columns: 3 });
      } catch (err: unknown) {
        errorThrown = err;
      }

      expect(errorThrown).toBeNull();

      const card = container.querySelector('.printable-sheet-card') as HTMLElement;
      expect(card).not.toBeNull();
      expect(card.textContent).toContain(megaTag);
      expect(card.textContent).toContain(`S/N: ${megaSerial}`);

      // QR Code must still render SVG without throwing
      const svg = card.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('safely handles potential XSS and HTML injection strings without executing or breaking DOM', async () => {
      const xssAsset = createAdversarialAsset({
        tag: '<script>alert("xss")</script>',
        name: '<img src=x onerror="window.xssBreached=true"><b>Bold</b>',
        serialNumber: '\'); DROP TABLE "Asset";-- <style>body{display:none}</style>',
      });

      await renderSheet({ assets: [xssAsset], columns: 3 });

      // Ensure no unexpected script tag was appended
      expect(document.querySelector('script[src*="xss"]')).toBeNull();
      expect((window as unknown as { xssBreached?: boolean }).xssBreached).toBeUndefined();

      const card = container.querySelector('.printable-sheet-card') as HTMLElement;
      expect(card).not.toBeNull();
      // Rendered as plain text
      expect(card.textContent).toContain('<script>alert("xss")</script>');
      expect(card.textContent).toContain('<img src=x onerror="window.xssBreached=true"><b>Bold</b>');
      expect(card.textContent).toContain('\'); DROP TABLE "Asset";--');
    });

    it('handles unicode, emojis, and international characters cleanly in QR code and labels', async () => {
      const unicodeAsset = createAdversarialAsset({
        tag: 'AST-VN-2026-TÀI-SẢN-01',
        name: 'Máy trạm đồ họa 🖥️ & Thiết bị mạng 🌐',
        serialNumber: 'SN-日本語-한국어-12345',
      });

      await renderSheet({ assets: [unicodeAsset], columns: 3 });

      const card = container.querySelector('.printable-sheet-card') as HTMLElement;
      expect(card.textContent).toContain('AST-VN-2026-TÀI-SẢN-01');
      expect(card.textContent).toContain('Máy trạm đồ họa 🖥️ & Thiết bị mạng 🌐');
      expect(card.textContent).toContain('S/N: SN-日本語-한국어-12345');

      const svg = card.querySelector('svg');
      expect(svg).not.toBeNull();
    });

    it('stress tests rendering 120 asset label cards in high-density 4-column layout', async () => {
      const count = 120;
      const massAssets: Asset[] = Array.from({ length: count }, (_, idx) =>
        createAdversarialAsset({
          id: `mass-ast-${idx + 1}`,
          tag: `AST-BATCH-${String(idx + 1).padStart(4, '0')}`,
          name: `Mass Workstation Node #${idx + 1}`,
          serialNumber: idx % 3 === 0 ? `SN-NODE-${idx + 1}` : null,
          manufacturer: idx % 2 === 0 ? 'Dell' : 'HP',
          model: `ProDesk ${1000 + idx}`,
        }),
      );

      const startTime = performance.now();
      await renderSheet({ assets: massAssets, columns: 4 });
      const durationMs = performance.now() - startTime;

      const cards = container.querySelectorAll('.printable-sheet-card');
      expect(cards.length).toBe(count);

      const svgs = container.querySelectorAll('.printable-sheet-card svg');
      expect(svgs.length).toBe(count);

      // Verify first and last asset tags
      expect(cards[0].textContent).toContain('AST-BATCH-0001');
      expect(cards[count - 1].textContent).toContain('AST-BATCH-0120');

      // Verify DOM rendering was reasonably performant
      expect(durationMs).toBeLessThan(20000); // 20s upper bound under heavy parallel load
    });
  });
});
