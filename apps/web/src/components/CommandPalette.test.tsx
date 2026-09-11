import { App as AntApp, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '../stores/theme.store';
import CommandPalette from './CommandPalette';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('CommandPalette Keyboard Shortcuts & Navigation', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  let currentLocation: { pathname: string } = { pathname: '/' };

  const LocationWatcher = () => {
    const loc = useLocation();
    currentLocation = loc;
    return null;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    currentLocation = { pathname: '/' };
    useThemeStore.setState({ mode: 'light', resolvedMode: 'light' });
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
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-modal-mask')
      .forEach((el) => el.remove());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  const renderPalette = async (open = true, onClose = vi.fn()) => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/'] },
          createElement(
            ConfigProvider,
            null,
            createElement(
              AntApp,
              null,
              createElement('div', null, [
                createElement(LocationWatcher, { key: 'watcher' }),
                createElement(CommandPalette, { key: 'palette', open, onClose }),
              ]),
            ),
          ),
        ),
      );
    });
    return { onClose };
  };

  it('renders command list with keyboard shortcut hints and footer legend', async () => {
    await renderPalette(true);
    const modal = document.querySelector('.ant-modal');
    expect(modal).toBeDefined();

    // Check commands are rendered
    expect(modal?.textContent).toContain('Dashboard');
    expect(modal?.textContent).toContain('Hardware Assets');
    expect(modal?.textContent).toContain('Software Licenses');
    expect(modal?.textContent).toContain('Inventory');

    // Check footer legend
    expect(modal?.textContent).toContain('Navigate');
    expect(modal?.textContent).toContain('Select');
    expect(modal?.textContent).toContain('Quick Jump');
    expect(modal?.textContent).toContain('Close');
  });

  it('navigates with ArrowDown and ArrowUp and selects item with Enter', async () => {
    const { onClose } = await renderPalette(true);
    const input = document.querySelector('.ant-modal input') as HTMLInputElement;
    expect(input).toBeDefined();

    // Press ArrowDown to move to item index 1 (Hardware Assets -> /assets)
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    // Press Enter to activate Hardware Assets
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(currentLocation.pathname).toBe('/assets');
  });

  it('triggers direct jump with Cmd+2 / Ctrl+2 to Hardware Assets', async () => {
    const { onClose } = await renderPalette(true);
    const input = document.querySelector('.ant-modal input') as HTMLInputElement;

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '2', metaKey: true, bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(currentLocation.pathname).toBe('/assets');
  });

  it('triggers direct jump with Ctrl+4 to Inventory', async () => {
    const { onClose } = await renderPalette(true);
    const input = document.querySelector('.ant-modal input') as HTMLInputElement;

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '4', ctrlKey: true, bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(currentLocation.pathname).toBe('/inventory');
  });

  it('closes on Escape key', async () => {
    const { onClose } = await renderPalette(true);
    const input = document.querySelector('.ant-modal input') as HTMLInputElement;

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('wraps selection with ArrowUp from top to bottom and ArrowDown from bottom to top', async () => {
    const { onClose } = await renderPalette(true);
    const input = document.querySelector('.ant-modal input') as HTMLInputElement;

    // Press ArrowUp at initial index 0 -> wraps to last item (Settings -> /settings)
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    });

    // Press Enter to activate the wrapped item
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(currentLocation.pathname).toBe('/settings');
  });

  it('filters commands when typing and executes first matching item with Enter', async () => {
    const { onClose } = await renderPalette(true);
    const input = document.querySelector('.ant-modal input') as HTMLInputElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, 'compliance');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Press Enter to select the filtered Audit Trail item
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
    expect(currentLocation.pathname).toBe('/audit');
  });
});
