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

describe('FieldDiffViewer Component Tests', () => {
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
      '.ant-modal-root, .ant-drawer, .ant-popover, .ant-message',
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

  it('renders visual diff tags with before and after state', async () => {
    await renderComponent({
      oldValue: { status: 'PENDING', location: 'Rack-01' },
      newValue: { status: 'ACTIVE', location: 'Rack-02' },
    });

    expect(container.textContent).toContain('status:');
    expect(container.textContent).toContain('-PENDING');
    expect(container.textContent).toContain('+ACTIVE');

    expect(container.textContent).toContain('location:');
    expect(container.textContent).toContain('-Rack-01');
    expect(container.textContent).toContain('+Rack-02');

    // Verify strike-through styling on error tags
    const errorTags = container.querySelectorAll('.ant-tag-error');
    expect(errorTags.length).toBe(2);
    expect(errorTags[0]?.getAttribute('style')).toContain('line-through');

    // Verify success tags
    const successTags = container.querySelectorAll('.ant-tag-success');
    expect(successTags.length).toBe(2);
  });

  it('filters out internal metadata keys (createdAt, updatedAt, id)', async () => {
    await renderComponent({
      oldValue: {
        id: 'rec-123',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
        name: 'Alpha Server',
      },
      newValue: {
        id: 'rec-123',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-03T00:00:00Z',
        name: 'Beta Server',
      },
    });

    expect(container.textContent).toContain('name:');
    expect(container.textContent).toContain('-Alpha Server');
    expect(container.textContent).toContain('+Beta Server');

    // Filtered keys must NOT be rendered in diff list
    expect(container.textContent).not.toContain('createdAt:');
    expect(container.textContent).not.toContain('updatedAt:');
    expect(container.textContent).not.toContain('id:');
  });

  it('renders empty description when no differences exist', async () => {
    await renderComponent({
      oldValue: { name: 'Identical' },
      newValue: { name: 'Identical' },
    });

    expect(container.textContent).toContain('No field differences detected');
  });

  it('handles diffPayload alone when oldValue and newValue are not provided', async () => {
    await renderComponent({
      diffPayload: {
        serialNumber: 'SN-7890',
        model: 'MacBook Pro 16',
      },
    });

    expect(container.textContent).toContain('model:');
    expect(container.textContent).toContain('+MacBook Pro 16');
    expect(container.textContent).toContain('serialNumber:');
    expect(container.textContent).toContain('+SN-7890');
  });

  it('handles diffPayload with explicit { old, new } structures', async () => {
    await renderComponent({
      diffPayload: {
        ipAddress: { old: '10.0.0.1', new: '10.0.0.2' },
      },
    });

    expect(container.textContent).toContain('ipAddress:');
    expect(container.textContent).toContain('-10.0.0.1');
    expect(container.textContent).toContain('+10.0.0.2');
  });

  it('toggles formatted raw JSON view open and closed on button click', async () => {
    await renderComponent({
      oldValue: { cpu: 'Intel Xeon' },
      newValue: { cpu: 'AMD EPYC' },
    });

    const toggleButton = container.querySelector('button');
    expect(toggleButton).toBeTruthy();
    expect(toggleButton?.textContent).toContain('View Formatted JSON');

    // Raw JSON pre tag not yet present
    expect(container.querySelector('pre')).toBeNull();

    // Click to expand
    await act(async () => {
      toggleButton?.click();
    });

    expect(container.querySelector('pre')).toBeTruthy();
    expect(container.textContent).toContain('Hide Formatted JSON');
    expect(container.querySelector('pre')?.textContent).toContain('Intel Xeon');
    expect(container.querySelector('pre')?.textContent).toContain('AMD EPYC');

    // Click to collapse
    await act(async () => {
      toggleButton?.click();
    });

    expect(container.querySelector('pre')).toBeNull();
    expect(container.textContent).toContain('View Formatted JSON');
  });

  it('handles null, undefined, and complex values safely', () => {
    expect(formatDiffValue(null)).toBe('null');
    expect(formatDiffValue(undefined)).toBe('null');
    expect(formatDiffValue(42)).toBe('42');
    expect(formatDiffValue(true)).toBe('true');
    expect(formatDiffValue({ a: 1 })).toBe('{"a":1}');
  });

  it('handles circular references in safeJsonStringify without throwing', () => {
    const circularObj: Record<string, unknown> = { name: 'Root' };
    circularObj.self = circularObj;

    const result = safeJsonStringify(circularObj);
    expect(result).toContain('[Circular Reference]');
    expect(result).toContain('Root');
  });

  it('safely computes diff entries when both values are null or empty', () => {
    const entries = computeDiffEntries(null, null, null);
    expect(entries).toEqual([]);
  });

  it('handles long string values with break-word styling', async () => {
    const longValA = 'A'.repeat(200);
    const longValB = 'B'.repeat(200);

    await renderComponent({
      oldValue: { description: longValA },
      newValue: { description: longValB },
    });

    expect(container.textContent).toContain('description:');
    const tags = container.querySelectorAll('.ant-tag');
    expect(tags.length).toBe(2);
    expect(tags[0]?.getAttribute('style')).toContain('word-break: break-word');
  });
});
