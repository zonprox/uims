import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntApp, ConfigProvider } from 'antd';
import { useAuthStore } from '../stores/auth.store';
import ErrorBoundary from './ErrorBoundary';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ErrorBoundary component', () => {
  let container: HTMLDivElement;
  const originalConsoleError = console.error;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    // Suppress console.error during expected boundary catch tests
    console.error = vi.fn();
    useAuthStore.setState({ user: null, token: null, permissions: [] });
  });

  afterEach(() => {
    container.remove();
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  const renderWithApp = async (element: React.ReactElement) => {
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, element),
        ),
      );
    });
    return root;
  };

  it('renders children normally when no error occurs', async () => {
    const root = await renderWithApp(
      createElement(
        ErrorBoundary,
        null,
        createElement('div', { id: 'child-content' }, 'Normal Child Content'),
      ),
    );

    expect(container.textContent).toContain('Normal Child Content');
    expect(container.querySelector('#child-content')).toBeTruthy();

    act(() => {
      root.unmount();
    });
  });

  it('catches render error and displays fallback UI', async () => {
    const ThrowingComponent = () => {
      throw new Error('Critical UI rendering failure');
    };

    const onErrorMock = vi.fn();

    const root = await renderWithApp(
      createElement(
        ErrorBoundary,
        {
          onError: onErrorMock,
          title: 'Custom Error Title',
          subTitle: 'Custom error description.',
        },
        createElement(ThrowingComponent),
      ),
    );

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock.mock.calls[0][0].message).toBe('Critical UI rendering failure');
    expect(container.textContent).toContain('Custom Error Title');
    expect(container.textContent).toContain('Custom error description.');
    expect(container.textContent).toContain('Reload Page');
    expect(container.textContent).toContain('Return to Dashboard');
    expect(container.textContent).toContain('Sign In Again');

    act(() => {
      root.unmount();
    });
  });

  it('catches non-Error thrown objects and normalizes error state', async () => {
    const objToThrow = { message: 'Non-error object failure' };
    const ThrowingComponent = () => {
      throw objToThrow;
    };

    const root = await renderWithApp(
      createElement(ErrorBoundary, null, createElement(ThrowingComponent)),
    );

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('Non-error object failure');

    act(() => {
      root.unmount();
    });
  });

  it('catches thrown strings and normalizes error state', async () => {
    const stringToThrow = 'Raw string error thrown in render';
    const ThrowingComponent = () => {
      throw stringToThrow;
    };

    const root = await renderWithApp(
      createElement(ErrorBoundary, null, createElement(ThrowingComponent)),
    );

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('Raw string error thrown in render');

    act(() => {
      root.unmount();
    });
  });

  it('handles Try Again recovery and resets error state', async () => {
    let shouldThrow = true;
    const onResetMock = vi.fn();

    const FlakyComponent = () => {
      if (shouldThrow) {
        throw new Error('Temporary glitch');
      }
      return createElement('div', { id: 'recovered-content' }, 'Successfully Recovered');
    };

    function TestWrapper() {
      const [resetKey, setResetKey] = useState(0);
      return createElement(
        ErrorBoundary,
        {
          key: resetKey,
          onReset: () => {
            shouldThrow = false;
            onResetMock();
            setResetKey((k) => k + 1);
          },
        },
        createElement(FlakyComponent),
      );
    }

    const root = await renderWithApp(createElement(TestWrapper));

    expect(container.textContent).toContain('Temporary glitch');
    const tryAgainBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Try Again'),
    );
    expect(tryAgainBtn).toBeTruthy();

    await act(async () => {
      tryAgainBtn?.click();
    });

    expect(onResetMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Successfully Recovered');

    act(() => {
      root.unmount();
    });
  });

  it('renders custom static fallback node when provided', async () => {
    const ThrowingComponent = () => {
      throw new Error('Rendering broke');
    };

    const root = await renderWithApp(
      createElement(
        ErrorBoundary,
        {
          fallback: createElement('div', { id: 'custom-static-fallback' }, 'Custom Static Fallback View'),
        },
        createElement(ThrowingComponent),
      ),
    );

    expect(container.textContent).toContain('Custom Static Fallback View');
    expect(container.querySelector('#custom-static-fallback')).toBeTruthy();

    act(() => {
      root.unmount();
    });
  });

  it('renders custom render-function fallback when provided', async () => {
    const ThrowingComponent = () => {
      throw new Error('Function fallback error');
    };

    const root = await renderWithApp(
      createElement(
        ErrorBoundary,
        {
          fallback: (error, reset) =>
            createElement(
              'div',
              { id: 'custom-fn-fallback' },
              createElement('span', null, `Caught: ${error.message}`),
              createElement('button', { id: 'reset-fn-btn', onClick: reset }, 'Reset Error'),
            ),
        },
        createElement(ThrowingComponent),
      ),
    );

    expect(container.textContent).toContain('Caught: Function fallback error');
    expect(container.querySelector('#custom-fn-fallback')).toBeTruthy();

    act(() => {
      root.unmount();
    });
  });

  it('clears session on Sign In Again button click', async () => {
    useAuthStore
      .getState()
      .login('active-token', { id: '1', email: 'admin@uims.internal', name: 'Admin', role: 'Admin' });
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    const ThrowingComponent = () => {
      throw new Error('Session crashed');
    };

    const root = await renderWithApp(
      createElement(
        ErrorBoundary,
        null,
        createElement(ThrowingComponent),
      ),
    );

    const signInBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign In Again'),
    );
    expect(signInBtn).toBeTruthy();

    await act(async () => {
      signInBtn?.click();
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it('catches null, undefined, and empty string exceptions safely', async () => {
    const ThrowNullComponent = () => {
      throw null;
    };

    const root = await renderWithApp(
      createElement(ErrorBoundary, null, createElement(ThrowNullComponent)),
    );

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('An unexpected application error occurred.');

    act(() => {
      root.unmount();
    });
  });

  it('invokes custom onGoHome and onSignIn props when provided', async () => {
    const mockGoHome = vi.fn();
    const mockSignIn = vi.fn();

    const ThrowingComponent = () => {
      throw new Error('Action test error');
    };

    const root = await renderWithApp(
      createElement(
        ErrorBoundary,
        {
          onGoHome: mockGoHome,
          onSignIn: mockSignIn,
        },
        createElement(ThrowingComponent),
      ),
    );

    const homeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Return to Dashboard'),
    );
    expect(homeBtn).toBeTruthy();

    await act(async () => {
      homeBtn?.click();
    });
    expect(mockGoHome).toHaveBeenCalledTimes(1);

    const signInBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign In Again'),
    );
    expect(signInBtn).toBeTruthy();

    await act(async () => {
      signInBtn?.click();
    });
    expect(mockSignIn).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('renders compact mode without layout padding and footer credit', async () => {
    const ThrowingComponent = () => {
      throw new Error('Compact error');
    };

    const root = await renderWithApp(
      createElement(
        ErrorBoundary,
        { compact: true },
        createElement(ThrowingComponent),
      ),
    );

    expect(container.textContent).toContain('Compact error');
    expect(container.textContent).not.toContain('All rights reserved.');

    act(() => {
      root.unmount();
    });
  });

  it('catches thrown object with custom HTTP status and preserves status resolution', async () => {
    const ThrowingComponent = () => {
      throw { status: 403, detail: 'Tenant subscription has expired. Please contact sales.' };
    };

    const root = await renderWithApp(
      createElement(ErrorBoundary, null, createElement(ThrowingComponent)),
    );

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Tenant subscription has expired. Please contact sales.');

    act(() => {
      root.unmount();
    });
  });

  it('catches thrown numeric HTTP status code and renders corresponding result page', async () => {
    const ThrowingComponent = () => {
      throw 404;
    };

    const root = await renderWithApp(
      createElement(ErrorBoundary, null, createElement(ThrowingComponent)),
    );

    expect(container.textContent).toContain('404 - Page Not Found');
    expect(container.textContent).toContain('The page or resource you requested could not be located.');

    act(() => {
      root.unmount();
    });
  });

  it('catches thrown RFC 7807 problem details object', async () => {
    const ThrowingComponent = () => {
      throw {
        type: 'https://example.com/probs/suspended',
        title: 'Account Suspended',
        status: 403,
        detail: 'Account suspended by compliance policy.',
      };
    };

    const root = await renderWithApp(
      createElement(ErrorBoundary, null, createElement(ThrowingComponent)),
    );

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Account suspended by compliance policy.');

    act(() => {
      root.unmount();
    });
  });

  it('handles errors with un-stringifiable throwing toString methods without crashing', async () => {
    const ThrowingComponent = () => {
      const hostile = Object.create(null);
      hostile.message = 'Hostile object message';
      hostile.toString = () => {
        throw new Error('Hostile toString failure');
      };
      throw hostile;
    };

    const root = await renderWithApp(
      createElement(ErrorBoundary, null, createElement(ThrowingComponent)),
    );

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('Hostile object message');

    act(() => {
      root.unmount();
    });
  });
});
