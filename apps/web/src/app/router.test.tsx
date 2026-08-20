import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntApp, ConfigProvider } from 'antd';
import { createMemoryRouter, RouterProvider } from 'react-router';
import RouteErrorBoundary from '../components/RouteErrorBoundary';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Router Error Boundary Integration', () => {
  let container: HTMLDivElement;
  const originalConsoleError = console.error;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    console.error = vi.fn();
  });

  afterEach(() => {
    container.remove();
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  it('renders RouteErrorBoundary when a route loader throws a 404 response', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          ErrorBoundary: RouteErrorBoundary,
          children: [
            {
              path: 'assets/:id',
              loader: () => {
                throw new Response('Asset with ID ast-9999 was not found in inventory.', { status: 404 });
              },
              element: createElement('div', null, 'Asset Detail Page'),
            },
          ],
        },
      ],
      { initialEntries: ['/assets/ast-9999'] },
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(RouterProvider, { router })),
        ),
      );
    });

    expect(container.textContent).toContain('404 - Page Not Found');
    expect(container.textContent).toContain('Asset with ID ast-9999 was not found in inventory.');
    expect(container.textContent).not.toContain('Hey developer');

    act(() => {
      root.unmount();
    });
  });

  it('renders RouteErrorBoundary when a route loader throws a 401 unauthorized response', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          ErrorBoundary: RouteErrorBoundary,
          children: [
            {
              path: 'admin',
              loader: () => {
                throw new Response('Authentication token expired or revoked.', { status: 401 });
              },
              element: createElement('div', null, 'Admin Page'),
            },
          ],
        },
      ],
      { initialEntries: ['/admin'] },
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(RouterProvider, { router })),
        ),
      );
    });

    expect(container.textContent).toContain('401 - Unauthorized');
    expect(container.textContent).toContain('Authentication token expired or revoked.');
    expect(container.textContent).toContain('Sign In Again');
    expect(container.textContent).not.toContain('Hey developer');

    act(() => {
      root.unmount();
    });
  });

  it('renders RouteErrorBoundary when a deep nested loader throws a custom non-standard error object', async () => {
    const customErrorObj = { status: 403, detail: 'Access to this nested resource is restricted to SuperAdmins.' };

    const router = createMemoryRouter(
      [
        {
          path: '/',
          ErrorBoundary: RouteErrorBoundary,
          children: [
            {
              path: 'nested',
              children: [
                {
                  path: 'protected-action',
                  loader: () => {
                    throw customErrorObj;
                  },
                  element: createElement('div', null, 'Deep Nested Content'),
                },
              ],
            },
          ],
        },
      ],
      { initialEntries: ['/nested/protected-action'] },
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(RouterProvider, { router })),
        ),
      );
    });

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Access to this nested resource is restricted to SuperAdmins.');
    expect(container.textContent).not.toContain('Hey developer');

    act(() => {
      root.unmount();
    });
  });

  it('renders RouteErrorBoundary when a component in a route throws runtime JS error', async () => {
    const CrashingComponent = () => {
      throw new Error('Fatal runtime exception in view component');
    };

    const router = createMemoryRouter(
      [
        {
          path: '/',
          ErrorBoundary: RouteErrorBoundary,
          children: [
            {
              path: 'crashed-page',
              element: createElement(CrashingComponent),
            },
          ],
        },
      ],
      { initialEntries: ['/crashed-page'] },
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(RouterProvider, { router })),
        ),
      );
    });

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('Fatal runtime exception in view component');
    expect(container.textContent).toContain('Reload Page');
    expect(container.textContent).toContain('Return to Dashboard');
    expect(container.textContent).not.toContain('Hey developer');

    act(() => {
      root.unmount();
    });
  });

  it('renders RouteErrorBoundary when a nested loader throws an AxiosError instance', async () => {
    const axiosError = new Error('Request failed with status code 401');
    (axiosError as unknown as Record<string, unknown>).response = {
      status: 401,
      data: { message: 'Authentication required for settings page.' },
    };

    const router = createMemoryRouter(
      [
        {
          path: '/',
          ErrorBoundary: RouteErrorBoundary,
          children: [
            {
              path: 'settings',
              loader: () => {
                throw axiosError;
              },
              element: createElement('div', null, 'Settings Page'),
            },
          ],
        },
      ],
      { initialEntries: ['/settings'] },
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(RouterProvider, { router })),
        ),
      );
    });

    expect(container.textContent).toContain('401 - Unauthorized');
    expect(container.textContent).toContain('Authentication required for settings page.');
    expect(container.textContent).toContain('Sign In Again');
    expect(container.textContent).not.toContain('Hey developer');

    act(() => {
      root.unmount();
    });
  });

  it('renders RouteErrorBoundary when a loader throws a 500 server error response', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          ErrorBoundary: RouteErrorBoundary,
          children: [
            {
              path: 'reports',
              loader: () => {
                throw new Response('Report analytics engine is temporarily overloaded.', { status: 500 });
              },
              element: createElement('div', null, 'Reports Page'),
            },
          ],
        },
      ],
      { initialEntries: ['/reports'] },
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(RouterProvider, { router })),
        ),
      );
    });

    expect(container.textContent).toContain('500 - Server Error');
    expect(container.textContent).toContain('Report analytics engine is temporarily overloaded.');
    expect(container.textContent).toContain('Reload Page');
    expect(container.textContent).not.toContain('Hey developer');

    act(() => {
      root.unmount();
    });
  });

  it('renders RouteErrorBoundary when a loader throws a primitive numeric 404 code', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          ErrorBoundary: RouteErrorBoundary,
          children: [
            {
              path: 'missing-hardware',
              loader: () => {
                throw 404;
              },
              element: createElement('div', null, 'Missing Hardware View'),
            },
          ],
        },
      ],
      { initialEntries: ['/missing-hardware'] },
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(RouterProvider, { router })),
        ),
      );
    });

    expect(container.textContent).toContain('404 - Page Not Found');
    expect(container.textContent).toContain('The page or resource you requested could not be located.');
    expect(container.textContent).toContain('Return to Dashboard');
    expect(container.textContent).not.toContain('Hey developer');

    act(() => {
      root.unmount();
    });
  });

  it('renders RouteErrorBoundary when a loader throws an RFC 7807 problem details object', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          ErrorBoundary: RouteErrorBoundary,
          children: [
            {
              path: 'ipam-subnet',
              loader: () => {
                throw {
                  response: {
                    status: 403,
                    data: {
                      title: 'Forbidden Subnet Access',
                      detail: 'Subnet allocation requires Network Engineer role.',
                    },
                  },
                };
              },
              element: createElement('div', null, 'IPAM Subnet View'),
            },
          ],
        },
      ],
      { initialEntries: ['/ipam-subnet'] },
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          ConfigProvider,
          null,
          createElement(AntApp, null, createElement(RouterProvider, { router })),
        ),
      );
    });

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Subnet allocation requires Network Engineer role.');
    expect(container.textContent).not.toContain('Hey developer');

    act(() => {
      root.unmount();
    });
  });
});
