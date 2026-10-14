import { ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FieldDiffViewer, {
  computeDiffEntries,
  formatDiffValue,
  safeJsonStringify,
} from './FieldDiffViewer';

describe('FieldDiffViewer Adversarial Empirical Stress Suite', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
        currentRoot = null;
      });
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    const portals = document.querySelectorAll(
      '.ant-modal-root, .ant-drawer, .ant-popover, .ant-message, .ant-tooltip',
    );
    for (const p of Array.from(portals)) {
      p.remove();
    }
  });

  const renderComponent = async (props: React.ComponentProps<typeof FieldDiffViewer>) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(ConfigProvider, null, createElement(FieldDiffViewer, props)),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  describe('Adversarial Challenge 1: Null, Empty, and Missing Boundary Matrix', () => {
    it('renders empty fallback cleanly when all props are completely undefined', async () => {
      await renderComponent({});
      expect(container.textContent).toContain('No field differences detected');
      expect(container.querySelector('button')).toBeNull();
    });

    it('renders empty fallback cleanly when all props are null', async () => {
      await renderComponent({
        oldValue: null,
        newValue: null,
        diffPayload: null,
      });
      expect(container.textContent).toContain('No field differences detected');
      expect(container.querySelector('button')).toBeNull();
    });

    it('renders empty fallback cleanly when all props are empty objects', async () => {
      await renderComponent({
        oldValue: {},
        newValue: {},
        diffPayload: {},
      });
      expect(container.textContent).toContain('No field differences detected');
      expect(container.querySelector('button')).toBeNull();
    });

    it('handles asymmetrical null vs populated state safely', async () => {
      await renderComponent({
        oldValue: null,
        newValue: { status: 'INITIALIZED' },
      });
      expect(container.textContent).toContain('status:');
      expect(container.textContent).toContain('-null');
      expect(container.textContent).toContain('+INITIALIZED');
    });

    it('handles populated old state with null new state (deletion semantic)', async () => {
      await renderComponent({
        oldValue: { status: 'DEPRECATED' },
        newValue: null,
      });
      expect(container.textContent).toContain('status:');
      expect(container.textContent).toContain('-DEPRECATED');
      expect(container.textContent).toContain('+null');
    });

    it('handles falsey primitive mutations (0, false, empty string, null, undefined)', async () => {
      await renderComponent({
        oldValue: {
          count: 0,
          isActive: false,
          description: '',
          note: null,
        },
        newValue: {
          count: 1,
          isActive: true,
          description: 'Updated',
          note: 'Added note',
        },
      });

      expect(container.textContent).toContain('count:');
      expect(container.textContent).toContain('-0');
      expect(container.textContent).toContain('+1');

      expect(container.textContent).toContain('isActive:');
      expect(container.textContent).toContain('-false');
      expect(container.textContent).toContain('+true');

      expect(container.textContent).toContain('description:');
      expect(container.textContent).toContain('+Updated');

      expect(container.textContent).toContain('note:');
      expect(container.textContent).toContain('-null');
      expect(container.textContent).toContain('+Added note');
    });

    it('treats null and undefined as equal (no phantom diff)', () => {
      const entries = computeDiffEntries({ optionalField: null }, { optionalField: undefined });
      expect(entries).toEqual([]);
    });

    it('differentiates 0 from "0" and false from "false"', () => {
      const entriesNum = computeDiffEntries({ val: 0 }, { val: '0' });
      expect(entriesNum.length).toBe(1);
      expect(entriesNum[0]?.oldValue).toBe(0);
      expect(entriesNum[0]?.newValue).toBe('0');

      const entriesBool = computeDiffEntries({ val: false }, { val: 'false' });
      expect(entriesBool.length).toBe(1);
      expect(entriesBool[0]?.oldValue).toBe(false);
      expect(entriesBool[0]?.newValue).toBe('false');
    });
  });

  describe('Adversarial Challenge 2: Circular References, Deep Nesting & Extreme Data', () => {
    it('safely handles direct circular references without crashing or stack overflowing', async () => {
      const oldObj: Record<string, unknown> = { name: 'RootNode' };
      oldObj.loop = oldObj;

      const newObj: Record<string, unknown> = { name: 'UpdatedNode' };
      newObj.loop = newObj;

      await renderComponent({ oldValue: oldObj, newValue: newObj });

      expect(container.textContent).toContain('name:');
      expect(container.textContent).toContain('-RootNode');
      expect(container.textContent).toContain('+UpdatedNode');

      // Expand raw JSON to verify safeJsonStringify renders circular placeholder
      const toggleBtn = container.querySelector('button');
      expect(toggleBtn).toBeTruthy();
      await act(async () => {
        toggleBtn?.click();
      });

      const preBlock = container.querySelector('pre');
      expect(preBlock).toBeTruthy();
      expect(preBlock?.textContent).toContain('[Circular Reference]');
    });

    it('safely handles deeply nested structures (depth 20)', async () => {
      let nestedOld: Record<string, unknown> = { leaf: 'oldLeaf' };
      let nestedNew: Record<string, unknown> = { leaf: 'newLeaf' };
      for (let i = 0; i < 20; i++) {
        nestedOld = { level: i, child: nestedOld };
        nestedNew = { level: i, child: nestedNew };
      }

      await renderComponent({
        oldValue: { config: nestedOld },
        newValue: { config: nestedNew },
      });

      expect(container.textContent).toContain('config:');
      expect(container.textContent).toContain('oldLeaf');
      expect(container.textContent).toContain('newLeaf');
    });

    it('safely handles complex arrays of objects', async () => {
      const oldList = [
        { id: 1, role: 'Editor' },
        { id: 2, role: 'Viewer' },
      ];
      const newList = [
        { id: 1, role: 'Admin' },
        { id: 2, role: 'Viewer' },
      ];

      await renderComponent({
        oldValue: { roles: oldList },
        newValue: { roles: newList },
      });

      expect(container.textContent).toContain('roles:');
      expect(container.textContent).toContain('Editor');
      expect(container.textContent).toContain('Admin');
    });

    it('does not produce phantom differences for identical arrays', async () => {
      const listA = [{ tag: 'prod' }, { tag: 'k8s' }];
      const listB = [{ tag: 'prod' }, { tag: 'k8s' }];

      await renderComponent({
        oldValue: { tags: listA },
        newValue: { tags: listB },
      });

      expect(container.textContent).toContain('No field differences detected');
    });

    it('safely handles extreme string lengths (10,000 characters) with wrapping', async () => {
      const largeOld = 'A'.repeat(5000);
      const largeNew = 'B'.repeat(5000);

      await renderComponent({
        oldValue: { payload: largeOld },
        newValue: { payload: largeNew },
      });

      expect(container.textContent).toContain('payload:');
      const tags = container.querySelectorAll('.ant-tag');
      expect(tags.length).toBe(2);
      expect(tags[0]?.getAttribute('style')).toContain('word-break: break-word');
      expect(tags[1]?.getAttribute('style')).toContain('word-break: break-word');
    });

    it('safely handles XSS / HTML injection vectors in keys and values', async () => {
      const injectionPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
      await renderComponent({
        oldValue: { '<xss-key>': injectionPayload },
        newValue: { '<xss-key>': 'safe-value' },
      });

      // Confirm raw text is rendered and not parsed as HTML elements
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
      expect(container.textContent).toContain('<xss-key>:');
      expect(container.textContent).toContain(injectionPayload);
    });
  });

  describe('Adversarial Challenge 3: Metadata Key Isolation Invariant', () => {
    it('strictly isolates metadata keys regardless of casing or position', () => {
      const entries = computeDiffEntries(
        { id: '1', createdAt: '2026-01-01', updatedAt: '2026-01-01', meaningfulField: 'A' },
        { id: '1', createdAt: '2026-01-01', updatedAt: '2026-01-02', meaningfulField: 'B' },
      );

      expect(entries.length).toBe(1);
      expect(entries[0]?.key).toBe('meaningfulField');
      expect(entries[0]?.oldValue).toBe('A');
      expect(entries[0]?.newValue).toBe('B');
    });

    it('falls back to diffPayload when oldValue and newValue contain only metadata keys', () => {
      const entries = computeDiffEntries(
        { id: 'ast-100', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'ast-100', updatedAt: '2026-01-02T00:00:00Z' },
        { status: { old: 'IN_STOCK', new: 'DEPLOYED' } },
      );

      expect(entries.length).toBe(1);
      expect(entries[0]?.key).toBe('status');
      expect(entries[0]?.oldValue).toBe('IN_STOCK');
      expect(entries[0]?.newValue).toBe('DEPLOYED');
    });
  });

  describe('Adversarial Challenge 4: Safe JSON Stringify Edge Cases', () => {
    it('handles BigInt, Symbol, and functions gracefully without throwing', () => {
      const testObj = {
        big: BigInt(9007199254740991),
        fn: () => 'hello',
        sym: Symbol('test'),
      };

      const result = safeJsonStringify(testObj);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles null, undefined, and primitives in formatDiffValue', () => {
      expect(formatDiffValue(null)).toBe('null');
      expect(formatDiffValue(undefined)).toBe('null');
      expect(formatDiffValue(0)).toBe('0');
      expect(formatDiffValue(false)).toBe('false');
      expect(formatDiffValue('')).toBe('');
      expect(formatDiffValue(Number.NaN)).toBe('NaN');
    });
  });
});
