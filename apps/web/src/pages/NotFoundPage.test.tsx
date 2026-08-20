import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntApp, ConfigProvider } from 'antd';
import NotFoundPage from './NotFoundPage';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('NotFoundPage component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  const renderWithApp = async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(NotFoundPage)),
        ),
      );
    });
    return root;
  };

  it('renders 404 header, subtitle, and primary Return to Dashboard action', async () => {
    const root = await renderWithApp();

    expect(container.textContent).toContain('404 - Page Not Found');
    expect(container.textContent).toContain('The page or resource you requested could not be located.');

    const homeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Return to Dashboard'),
    );
    expect(homeBtn).toBeTruthy();

    await act(async () => {
      homeBtn?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');

    act(() => {
      root.unmount();
    });
  });

  it('renders quick navigation links and responds to clicks', async () => {
    const root = await renderWithApp();

    const assetsBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Assets'),
    );
    expect(assetsBtn).toBeTruthy();
    await act(async () => {
      assetsBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/assets');

    const inventoryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Inventory'),
    );
    expect(inventoryBtn).toBeTruthy();
    await act(async () => {
      inventoryBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');

    const usersBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Users & Access'),
    );
    expect(usersBtn).toBeTruthy();
    await act(async () => {
      usersBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/users');

    act(() => {
      root.unmount();
    });
  });

  it('renders standard enterprise footer credit', async () => {
    const root = await renderWithApp();

    expect(container.textContent).toContain('© 2026 UIMS Enterprise. All rights reserved.');

    act(() => {
      root.unmount();
    });
  });
});
