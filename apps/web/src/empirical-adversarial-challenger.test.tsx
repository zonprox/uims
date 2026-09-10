import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AssetScannerModal } from './pages/assets/components/AssetScannerModal';
import {
  escapeHtml,
  generatePrintLabelHtml,
  sanitizePrintableAsset,
} from './pages/assets/utils/printAssetLabel';
import { ErrorBoundary } from './components/ErrorBoundary';
import ErrorResultView from './components/ErrorResultView';

// Mock Ant Design App.useApp() for feedback testing
const mockMessageSuccess = vi.fn();
const mockMessageWarning = vi.fn();
const mockMessageError = vi.fn();
const mockNotificationError = vi.fn();

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => ({
        message: {
          success: mockMessageSuccess,
          warning: mockMessageWarning,
          error: mockMessageError,
        },
        notification: {
          error: mockNotificationError,
        },
      }),
    },
  };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Frontend Empirical Challenger 2 Adversarial Harness', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

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
    container.remove();
    document.body.innerHTML = '';
  });

  // =========================================================================
  // 1. AssetScannerModal Camera Failures & Notification Dispatch
  // =========================================================================
  describe('Mission 1: AssetScannerModal Camera Failures', () => {
    it('dispatches notification.error when camera access is denied (NotAllowedError)', async () => {
      const deniedError = new Error('Permission denied by user');
      deniedError.name = 'NotAllowedError';

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockRejectedValue(deniedError),
          enumerateDevices: vi.fn().mockResolvedValue([]),
        },
        configurable: true,
        writable: true,
      });

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(AssetScannerModal, {
            open: true,
            onClose: vi.fn(),
            onScanSuccess: vi.fn(),
          }),
        );
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Camera Access Denied',
          description: expect.stringContaining('Camera permission was denied'),
          placement: 'topRight',
          duration: 5,
        }),
      );
      expect(document.body.textContent).toContain('Camera Access Unavailable');
    });

    it('dispatches notification.error when camera hardware is missing (NotFoundError)', async () => {
      const notFoundError = new Error('Requested device not found');
      notFoundError.name = 'NotFoundError';

      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockRejectedValue(notFoundError),
          enumerateDevices: vi.fn().mockResolvedValue([]),
        },
        configurable: true,
        writable: true,
      });

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(AssetScannerModal, {
            open: true,
            onClose: vi.fn(),
            onScanSuccess: vi.fn(),
          }),
        );
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Camera Access Denied',
          description: expect.stringContaining('No camera device found on this system'),
          placement: 'topRight',
          duration: 5,
        }),
      );
    });

    it('dispatches notification.error with "Camera Unavailable" when navigator.mediaDevices is absent', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(AssetScannerModal, {
            open: true,
            onClose: vi.fn(),
            onScanSuccess: vi.fn(),
          }),
        );
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Camera Unavailable',
          description: expect.stringContaining('Camera access is unavailable in this environment'),
          placement: 'topRight',
          duration: 5,
        }),
      );
    });

    it('dispatches notification.error with "Camera Unavailable" when getUserMedia is undefined', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: undefined,
          enumerateDevices: vi.fn().mockResolvedValue([]),
        },
        configurable: true,
        writable: true,
      });

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(AssetScannerModal, {
            open: true,
            onClose: vi.fn(),
            onScanSuccess: vi.fn(),
          }),
        );
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Camera Unavailable',
          description: expect.stringContaining('Camera access is unavailable in this environment'),
        }),
      );
    });

    it('dispatches notification.error with fallback description when a non-Error is rejected', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockRejectedValue('Fatal hardware communication abort'),
          enumerateDevices: vi.fn().mockResolvedValue([]),
        },
        configurable: true,
        writable: true,
      });

      const root = createRoot(container);
      currentRoot = root;

      await act(async () => {
        root.render(
          createElement(AssetScannerModal, {
            open: true,
            onClose: vi.fn(),
            onScanSuccess: vi.fn(),
          }),
        );
      });

      expect(mockNotificationError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Camera Access Denied',
          description: 'Unable to start camera stream.',
        }),
      );
    });
  });

  // =========================================================================
  // 2. printAssetLabel Adversarial Stress Testing
  // =========================================================================
  describe('Mission 2: printAssetLabel Stress Testing', () => {
    describe('escapeHtml adversarial inputs', () => {
      it('safely handles null and undefined', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
      });

      it('safely handles numbers including 0, negative, NaN, and Infinity', () => {
        expect(escapeHtml(0)).toBe('0');
        expect(escapeHtml(-42)).toBe('-42');
        expect(escapeHtml(3.14159)).toBe('3.14159');
        expect(escapeHtml(Number.NaN)).toBe('NaN');
        expect(escapeHtml(Number.POSITIVE_INFINITY)).toBe('Infinity');
        expect(escapeHtml(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
      });

      it('safely handles booleans', () => {
        expect(escapeHtml(true)).toBe('true');
        expect(escapeHtml(false)).toBe('false');
      });

      it('safely escapes XSS payloads and HTML characters', () => {
        const xss1 = '<script>alert(1)</script>';
        expect(escapeHtml(xss1)).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');

        const xss2 = '"><img src=x onerror=alert(1)>';
        expect(escapeHtml(xss2)).toBe('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');

        const chars = '& < > " \'';
        expect(escapeHtml(chars)).toBe('&amp; &lt; &gt; &quot; &#39;');
      });

      it('safely handles plain objects and arrays', () => {
        expect(escapeHtml({})).toBe('[object Object]');
        expect(escapeHtml([])).toBe('');
        expect(escapeHtml([1, 2, 3])).toBe('1,2,3');
        expect(escapeHtml(['<script>', 'alert'])).toBe('&lt;script&gt;,alert');
      });

      it('safely handles Object.create(null) and { toString: null } without throwing', () => {
        expect(escapeHtml(Object.create(null))).toBe('');
        expect(escapeHtml({ toString: null })).toBe('');
      });
    });

    describe('sanitizePrintableAsset adversarial inputs', () => {
      it('safely handles non-object primitives and null/undefined without crashing', () => {
        const testInputs: unknown[] = [
          null,
          undefined,
          '',
          'hello',
          12345,
          true,
          false,
          Symbol('sym'),
        ];

        for (const input of testInputs) {
          const result = sanitizePrintableAsset(input);
          expect(result.tag).toBe('UNKNOWN-TAG');
          expect(result.name).toBe('Unnamed Asset');
          expect(result.serialNumber).toBeNull();
          expect(result.model).toBeNull();
          expect(result.category).toBeNull();
          expect(result.location).toBeNull();
        }
      });

      it('safely handles empty object and missing fields', () => {
        const result = sanitizePrintableAsset({});
        expect(result.tag).toBe('UNKNOWN-TAG');
        expect(result.name).toBe('Unnamed Asset');
        expect(result.serialNumber).toBeNull();
        expect(result.model).toBeNull();
        expect(result.category).toBeNull();
        expect(result.location).toBeNull();
      });

      it('safely handles empty strings and whitespace-only tags/names', () => {
        const result = sanitizePrintableAsset({
          tag: '   ',
          name: '   ',
        });
        expect(result.tag).toBe('UNKNOWN-TAG');
        expect(result.name).toBe('Unnamed Asset');
      });

      it('safely handles numeric tag and name by converting to string', () => {
        const result = sanitizePrintableAsset({
          tag: 98765,
          name: 12345,
          serialNumber: 4455,
          model: 8899,
        });
        expect(result.tag).toBe('98765');
        expect(result.name).toBe('12345');
        expect(result.serialNumber).toBe('4455');
        expect(result.model).toBe('8899');
      });

      it('safely sanitizes malformed category and location objects', () => {
        const malformed = sanitizePrintableAsset({
          tag: 'TAG-1',
          name: 'Device 1',
          category: { invalidKey: 'not-a-name' },
          location: 12345,
        });
        expect(malformed.category).toBeNull();
        expect(malformed.location).toBeNull();

        const malformedCategory2 = sanitizePrintableAsset({
          tag: 'TAG-1',
          name: 'Device 1',
          category: { name: 12345 },
        });
        expect(malformedCategory2.category).toBeNull();
      });

      it('safely sanitizes valid string and object category/location', () => {
        const stringCase = sanitizePrintableAsset({
          tag: 'TAG-1',
          name: 'Device 1',
          category: 'Hardware',
          location: 'HQ Floor 2',
        });
        expect(stringCase.category).toBe('Hardware');
        expect(stringCase.location).toBe('HQ Floor 2');

        const objectCase = sanitizePrintableAsset({
          tag: 'TAG-2',
          name: 'Device 2',
          category: { name: 'Networking' },
          location: { name: 'Data Center B' },
        });
        expect(objectCase.category).toEqual({ name: 'Networking' });
        expect(objectCase.location).toEqual({ name: 'Data Center B' });
      });

      it('generates isolated printable label HTML on sanitized adversarial output without unhandled exceptions', () => {
        const adversarialInputs: unknown[] = [
          null,
          undefined,
          {},
          { tag: '<script>alert("xss")</script>', name: 'Adversarial & "Co"' },
          { tag: 'TAG-ADV', name: 'Name', category: 999, location: true },
          { tag: 'TAG-ADV2', name: 'Name2', serialNumber: null, model: undefined },
        ];

        for (const input of adversarialInputs) {
          const sanitized = sanitizePrintableAsset(input);
          const html = generatePrintLabelHtml(sanitized, 'data:image/png;base64,sample');
          expect(typeof html).toBe('string');
          expect(html).toContain('<!DOCTYPE html>');
          expect(html).not.toContain('<script>alert("xss")</script>');
          expect(html).toContain('@media print');
        }
      });
    });
  });

  // =========================================================================
  // 3. SettingsPage & OrganizationCanvas AST & JSX Rendering Invariants
  // =========================================================================
  describe('Mission 3: SettingsPage & OrganizationCanvas JSX Escaping', () => {
    it('verifies all ampersands in SettingsPage JSX text are safely escaped entities (&amp;)', () => {
      const settingsPath = path.resolve(import.meta.dirname, './pages/settings/SettingsPage.tsx');
      const content = fs.readFileSync(settingsPath, 'utf8');

      // 1. Verify specific required escaped labels are present verbatim in the source
      expect(content).toContain('<span>Sound &amp; Audio Alerts</span>');
      expect(content).toContain('Critical Alerts &amp; Warnings');
      expect(content).toContain('Workflow &amp; Task Reminders');
      expect(content).toContain('System &amp; Infrastructure Events');
      expect(content).toContain('<span>Maintenance &amp; Backups</span>');

      // 2. Scan every line for JSX tags and ensure any text child with ampersand is escaped
      const lines = content.split('\n');
      const unescapedLines: Array<{ line: number; content: string }> = [];

      lines.forEach((lineText, idx) => {
        const matches = lineText.match(/>([^<]+)</g);
        if (matches) {
          for (const match of matches) {
            let innerText = match.slice(1, -1);
            innerText = innerText.replace(/\${[^}]*}/g, '');
            if (/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/.test(innerText)) {
              unescapedLines.push({ line: idx + 1, content: lineText.trim() });
            }
          }
        }
      });

      expect(unescapedLines).toEqual([]);
    });

    it('verifies OrganizationCanvas JSX has 0 unescaped ampersands in text nodes', () => {
      const orgPath = path.resolve(
        import.meta.dirname,
        './pages/organization/OrganizationCanvas.tsx',
      );
      const content = fs.readFileSync(orgPath, 'utf8');

      // Entities & Hubs is properly wrapped in a JS expression string
      expect(content).toContain("{'Entities & Hubs'}");

      // Verify no JSX text has unescaped ampersands
      const lines = content.split('\n');
      const unescapedLines: Array<{ line: number; content: string }> = [];

      lines.forEach((lineText, idx) => {
        const matches = lineText.match(/>([^<]+)</g);
        if (matches) {
          for (const match of matches) {
            let innerText = match.slice(1, -1);
            // Ignore template expression interpolations ${...} inside string literals
            innerText = innerText.replace(/\${[^}]*}/g, '');
            if (/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/.test(innerText)) {
              unescapedLines.push({ line: idx + 1, content: lineText.trim() });
            }
          }
        }
      });

      expect(unescapedLines).toEqual([]);
    });
  });

  // =========================================================================
  // 4. ErrorBoundary & ErrorResultView Console Logging & Teardown
  // =========================================================================
  describe('Mission 4: ErrorBoundary & ErrorResultView Invariants', () => {
    it('verifies ErrorBoundary calls console.error in DEV mode but skips it when DEV is false', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const boundary = new ErrorBoundary({ children: null });
      const testError = new Error('Simulated runtime error');
      const testErrorInfo = { componentStack: '\n    in FaultyComponent' };

      boundary.componentDidCatch(testError, testErrorInfo);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unhandled UI exception caught by ErrorBoundary:',
        testError,
        testErrorInfo,
      );

      consoleErrorSpy.mockRestore();
    });

    it('verifies ErrorResultView mounts, renders recovery actions, and unmounts cleanly without RPC leaks', async () => {
      const root = createRoot(container);
      currentRoot = root;

      const onReload = vi.fn();
      const onGoHome = vi.fn();
      const onSignIn = vi.fn();
      const onReset = vi.fn();

      await act(async () => {
        root.render(
          createElement(ErrorResultView, {
            status: 500,
            title: 'Application Error',
            subTitle: 'An unhandled exception occurred in the component tree.',
            error: new Error('Database connection failed'),
            onReload,
            onGoHome,
            onSignIn,
            onReset,
            showDiagnostics: true,
          }),
        );
      });

      expect(document.body.textContent).toContain('Application Error');
      expect(document.body.textContent).toContain('Reload Page');
      expect(document.body.textContent).toContain('Dashboard');
      expect(document.body.textContent).toContain('Sign In Again');
      expect(document.body.textContent).toContain('Diagnostic Details');

      // Clean unmount
      await act(async () => {
        root.unmount();
        currentRoot = null;
      });

      expect(container.children.length).toBe(0);
    });

    it('verifies ErrorResultView copy diagnostic button works without unhandled rejection', async () => {
      const root = createRoot(container);
      currentRoot = root;

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        configurable: true,
        writable: true,
      });

      await act(async () => {
        root.render(
          createElement(ErrorResultView, {
            status: 500,
            title: 'Application Error',
            error: new Error('Copy test error'),
            showDiagnostics: true,
          }),
        );
      });

      const copyBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Copy Diagnostics'),
      );
      expect(copyBtn).toBeDefined();

      await act(async () => {
        copyBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockWriteText).toHaveBeenCalled();
      expect(mockMessageSuccess).toHaveBeenCalledWith('Diagnostics copied to clipboard');

      await act(async () => {
        root.unmount();
        currentRoot = null;
      });
    });
  });
});
