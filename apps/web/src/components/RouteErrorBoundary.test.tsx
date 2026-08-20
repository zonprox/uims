import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntApp, ConfigProvider } from 'antd';
import { useAuthStore } from '../stores/auth.store';
import RouteErrorBoundary from './RouteErrorBoundary';

const mockNavigate = vi.fn();
let mockRouteError: unknown = null;

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/protected/admin-panel', search: '', hash: '', state: null, key: 'test' }),
    useRouteError: () => mockRouteError,
    isRouteErrorResponse: (err: unknown): err is { status: number; statusText: string; data: unknown } => {
      return Boolean(
        typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          typeof (err as { status: unknown }).status === 'number' &&
          'data' in err,
      );
    },
  };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('RouteErrorBoundary component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, token: null, permissions: [] });
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
          createElement(AntApp, null, createElement(RouteErrorBoundary)),
        ),
      );
    });
    return root;
  };

  it('handles 401 Unauthorized route error and clears auth on Sign In Again', async () => {
    useAuthStore
      .getState()
      .login('old-token', { id: '1', email: 'user@uims.internal', name: 'User', role: 'User' });
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);

    mockRouteError = {
      status: 401,
      statusText: 'Unauthorized',
      data: 'Session expired or credentials invalid.',
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('401 - Unauthorized');
    expect(container.textContent).toContain('Session expired or credentials invalid.');

    const signInBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign In Again'),
    );
    expect(signInBtn).toBeTruthy();

    await act(async () => {
      signInBtn?.click();
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: { from: { pathname: '/protected/admin-panel', search: '', hash: '', state: null, key: 'test' } },
    });

    act(() => {
      root.unmount();
    });
  });

  it('handles 403 Access Denied route error and navigates to dashboard', async () => {
    mockRouteError = {
      status: 403,
      statusText: 'Forbidden',
      data: { message: 'You lack the required Admin permission to access this route.' },
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('You lack the required Admin permission to access this route.');

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

  it('handles 404 Not Found route error and navigates using quick links', async () => {
    mockRouteError = {
      status: 404,
      statusText: 'Not Found',
      data: 'Requested device could not be found.',
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('404 - Page Not Found');
    expect(container.textContent).toContain('Requested device could not be found.');

    const assetsBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Assets'),
    );
    expect(assetsBtn).toBeTruthy();

    await act(async () => {
      assetsBtn?.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/assets');

    act(() => {
      root.unmount();
    });
  });

  it('handles 500 Server Error route error and offers recovery actions', async () => {
    mockRouteError = {
      status: 500,
      statusText: 'Internal Server Error',
      data: 'Database connection failed during data query.',
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('500 - Server Error');
    expect(container.textContent).toContain('Database connection failed during data query.');

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

  it('handles non-standard thrown custom JSON objects', async () => {
    mockRouteError = {
      status: 403,
      detail: 'Tenant subscription expired. Upgrade required.',
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Tenant subscription expired. Upgrade required.');

    act(() => {
      root.unmount();
    });
  });

  it('handles unhandled JS runtime Error in route context', async () => {
    const errorInstance = new TypeError('Cannot read properties of undefined (reading "inventory")');
    errorInstance.stack = 'TypeError: Cannot read properties\n    at AssetsView.render';
    mockRouteError = errorInstance;

    const root = await renderWithApp();

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('Cannot read properties of undefined');

    act(() => {
      root.unmount();
    });
  });

  it('handles thrown primitive string in route context', async () => {
    mockRouteError = 'Custom loader string error message';

    const root = await renderWithApp();

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('Custom loader string error message');

    act(() => {
      root.unmount();
    });
  });

  it('handles custom 400 Bad Request error response', async () => {
    mockRouteError = {
      status: 400,
      statusText: 'Bad Request',
      data: 'Invalid query parameters provided.',
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('400 - Bad Request');
    expect(container.textContent).toContain('Invalid query parameters provided.');

    act(() => {
      root.unmount();
    });
  });

  it('handles AxiosError instance with embedded response status and message', async () => {
    const axiosError = new Error('Request failed with status code 403');
    (axiosError as unknown as Record<string, unknown>).response = {
      status: 403,
      data: {
        message: 'Organization membership has expired.',
      },
    };
    mockRouteError = axiosError;

    const root = await renderWithApp();

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Organization membership has expired.');

    act(() => {
      root.unmount();
    });
  });

  it('handles thrown primitive numeric status codes', async () => {
    mockRouteError = 404;

    const root = await renderWithApp();

    expect(container.textContent).toContain('404 - Page Not Found');
    expect(container.textContent).toContain('The page or resource you requested could not be located.');

    act(() => {
      root.unmount();
    });
  });

  it('handles null or undefined route error gracefully', async () => {
    mockRouteError = null;

    const root = await renderWithApp();

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('An unexpected error occurred while loading this page.');

    act(() => {
      root.unmount();
    });
  });

  it('handles 503 Service Unavailable route error response', async () => {
    mockRouteError = {
      status: 503,
      statusText: 'Service Unavailable',
      data: 'Undergoing planned database maintenance.',
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('503 - Service Unavailable');
    expect(container.textContent).toContain('Undergoing planned database maintenance.');

    act(() => {
      root.unmount();
    });
  });

  it('handles 429 Too Many Requests route error response', async () => {
    mockRouteError = {
      status: 429,
      statusText: 'Too Many Requests',
      data: 'Rate limit exceeded. Please retry after 60 seconds.',
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('429 - Too Many Requests');
    expect(container.textContent).toContain('Rate limit exceeded. Please retry after 60 seconds.');

    act(() => {
      root.unmount();
    });
  });

  it('handles thrown object with string status code and clears auth on Sign In Again', async () => {
    useAuthStore
      .getState()
      .login('token-to-clear', { id: '2', email: 'session@uims.internal', name: 'User2', role: 'User' });

    mockRouteError = {
      status: '401',
      data: 'Token revoked by identity provider.',
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('401 - Unauthorized');
    expect(container.textContent).toContain('Token revoked by identity provider.');

    const signInBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign In Again'),
    );
    expect(signInBtn).toBeTruthy();

    await act(async () => {
      signInBtn?.click();
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: { from: { pathname: '/protected/admin-panel', search: '', hash: '', state: null, key: 'test' } },
    });

    act(() => {
      root.unmount();
    });
  });

  it('handles RFC 7807 problem details in route context', async () => {
    mockRouteError = {
      response: {
        status: 403,
        data: {
          type: 'https://api.uims.local/errors/unauthorized-org',
          title: 'Organization Isolation Violation',
          status: 403,
          detail: 'Cross-tenant resource access is forbidden.',
        },
      },
    };

    const root = await renderWithApp();

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Cross-tenant resource access is forbidden.');

    act(() => {
      root.unmount();
    });
  });
});
