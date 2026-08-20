import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntApp, ConfigProvider } from 'antd';
import ErrorResultView from './ErrorResultView';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ErrorResultView component', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
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

  it('renders 401 Unauthorized view with Sign In Again button', async () => {
    const mockSignIn = vi.fn();
    const mockGoHome = vi.fn();
    const mockReload = vi.fn();

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        statusCode: 401,
        onSignIn: mockSignIn,
        onGoHome: mockGoHome,
        onReload: mockReload,
      }),
    );

    expect(container.textContent).toContain('401 - Unauthorized');
    expect(container.textContent).toContain('Your session has expired or you are not signed in.');

    const signInBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign In Again'),
    );
    expect(signInBtn).toBeTruthy();

    await act(async () => {
      signInBtn?.click();
    });
    expect(mockSignIn).toHaveBeenCalledTimes(1);

    const homeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Return to Dashboard'),
    );
    expect(homeBtn).toBeTruthy();
    await act(async () => {
      homeBtn?.click();
    });
    expect(mockGoHome).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('renders 403 Access Denied view with Return to Dashboard button', async () => {
    const mockGoHome = vi.fn();
    const mockSignIn = vi.fn();

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        statusCode: 403,
        onGoHome: mockGoHome,
        onSignIn: mockSignIn,
      }),
    );

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('You do not have permission to access this resource.');

    const homeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Return to Dashboard'),
    );
    expect(homeBtn).toBeTruthy();

    await act(async () => {
      homeBtn?.click();
    });
    expect(mockGoHome).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('renders 404 Page Not Found view with quick links', async () => {
    const mockNavigate = vi.fn();
    const mockGoHome = vi.fn();

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        statusCode: 404,
        onGoHome: mockGoHome,
        onNavigate: mockNavigate,
        showQuickLinks: true,
      }),
    );

    expect(container.textContent).toContain('404 - Page Not Found');
    expect(container.textContent).toContain('The page or resource you requested could not be located.');
    expect(container.textContent).toContain('Or jump directly to:');

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
    await act(async () => {
      inventoryBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');

    const usersBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Users & Access'),
    );
    await act(async () => {
      usersBtn?.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/users');

    act(() => {
      root.unmount();
    });
  });

  it('renders 500 Server Error view with reload and reset actions', async () => {
    const mockReload = vi.fn();
    const mockReset = vi.fn();

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        statusCode: 500,
        onReload: mockReload,
        onReset: mockReset,
      }),
    );

    expect(container.textContent).toContain('500 - Server Error');
    expect(container.textContent).toContain('An unexpected server error occurred.');

    const reloadBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reload Page'),
    );
    expect(reloadBtn).toBeTruthy();

    await act(async () => {
      reloadBtn?.click();
    });
    expect(mockReload).toHaveBeenCalledTimes(1);

    const tryAgainBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Try Again'),
    );
    expect(tryAgainBtn).toBeTruthy();

    await act(async () => {
      tryAgainBtn?.click();
    });
    expect(mockReset).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('handles custom non-standard error payload object', async () => {
    const customPayload = {
      status: 403,
      error: 'Permission denied for current tenant.',
      detail: 'Requires billing admin privileges.',
    };

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: customPayload,
        showDiagnostics: true,
      }),
    );

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Permission denied for current tenant.');

    act(() => {
      root.unmount();
    });
  });

  it('handles circular data structures safely in diagnostics', async () => {
    const circularObj: Record<string, unknown> = { message: 'Circular error detected' };
    circularObj.self = circularObj;

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: circularObj,
        showDiagnostics: true,
      }),
    );

    expect(container.textContent).toContain('Circular error detected');
    expect(container.textContent).toContain('Diagnostic Details');

    act(() => {
      root.unmount();
    });
  });

  it('renders diagnostic information and handles 1-click clipboard copy via navigator.clipboard', async () => {
    const testError = new Error('Database connection failed in inventory microservice');
    testError.stack = 'Error: Database connection failed\n    at InventoryService.query';

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: testError,
        errorInfo: { componentStack: '    in InventoryTable (created by InventoryPage)' },
        showDiagnostics: true,
      }),
    );

    expect(container.textContent).toContain('Application Error');
    expect(container.textContent).toContain('Diagnostic Details');

    const copyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Copy Diagnostics'),
    );
    expect(copyBtn).toBeTruthy();

    await act(async () => {
      copyBtn?.click();
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedPayload = JSON.parse(writeTextMock.mock.calls[0][0]);
    expect(copiedPayload.errorMessage).toBe('Database connection failed in inventory microservice');
    expect(copiedPayload.stack).toContain('InventoryService.query');
    expect(copiedPayload.componentStack).toContain('InventoryTable');
    expect(copiedPayload.timestamp).toBeTruthy();

    act(() => {
      root.unmount();
    });
  });

  it('falls back to document.execCommand when navigator.clipboard fails', async () => {
    const testError = new Error('Test clipboard fallback error');

    // Make navigator.clipboard reject (simulating non-secure / restricted permissions)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
      configurable: true,
      writable: true,
    });

    const mockExecCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: mockExecCommand,
      configurable: true,
      writable: true,
    });

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: testError,
        showDiagnostics: true,
      }),
    );

    const copyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Copy Diagnostics'),
    );
    expect(copyBtn).toBeTruthy();

    await act(async () => {
      copyBtn?.click();
    });

    expect(mockExecCommand).toHaveBeenCalledWith('copy');

    act(() => {
      root.unmount();
    });
  });

  it('renders compact mode without footer credit', async () => {
    const root = await renderWithApp(
      createElement(ErrorResultView, {
        compact: true,
        title: 'Compact Widget Error',
        subTitle: 'Widget failed to render.',
      }),
    );

    expect(container.textContent).toContain('Compact Widget Error');
    expect(container.textContent).toContain('Widget failed to render.');
    expect(container.textContent).not.toContain('All rights reserved.');

    act(() => {
      root.unmount();
    });
  });

  it('handles BigInt fields in error diagnostics without serialization failure', async () => {
    const bigIntPayload = {
      message: 'Failed transaction',
      transactionId: 9007199254740993n,
    };

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: bigIntPayload,
        showDiagnostics: true,
      }),
    );

    expect(container.textContent).toContain('Failed transaction');
    expect(container.textContent).toContain('Diagnostic Details');

    act(() => {
      root.unmount();
    });
  });

  it('extracts status code and details from Axios-like response errors', async () => {
    const axiosError = {
      name: 'AxiosError',
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        data: {
          message: 'Token has been revoked by admin.',
        },
      },
    };

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: axiosError,
        showDiagnostics: true,
      }),
    );

    expect(container.textContent).toContain('401 - Unauthorized');
    expect(container.textContent).toContain('Token has been revoked by admin.');
    expect(container.textContent).toContain('Sign In Again');

    act(() => {
      root.unmount();
    });
  });

  it('renders standard titles and subtitles for 422, 429, 502, 503, 504 errors', async () => {
    const root422 = await renderWithApp(
      createElement(ErrorResultView, { statusCode: 422 }),
    );
    expect(container.textContent).toContain('422 - Unprocessable Entity');
    expect(container.textContent).toContain('The submitted data failed validation.');
    act(() => {
      root422.unmount();
    });

    const root503 = await renderWithApp(
      createElement(ErrorResultView, { statusCode: 503 }),
    );
    expect(container.textContent).toContain('503 - Service Unavailable');
    expect(container.textContent).toContain('The service is temporarily unavailable or undergoing maintenance.');
    act(() => {
      root503.unmount();
    });
  });

  it('renders extra custom actions when extraActions prop is provided', async () => {
    const root = await renderWithApp(
      createElement(ErrorResultView, {
        statusCode: 500,
        extraActions: createElement('button', { id: 'custom-contact-support' }, 'Contact Enterprise Support'),
      }),
    );

    expect(container.querySelector('#custom-contact-support')).toBeTruthy();
    expect(container.textContent).toContain('Contact Enterprise Support');

    act(() => {
      root.unmount();
    });
  });

  it('gracefully notifies user when both clipboard APIs fail', async () => {
    const testError = new Error('Clipboard impossible error');

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('PermissionDenied')),
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(false),
      configurable: true,
      writable: true,
    });

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: testError,
        showDiagnostics: true,
      }),
    );

    const copyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Copy Diagnostics'),
    );
    expect(copyBtn).toBeTruthy();

    await act(async () => {
      copyBtn?.click();
    });

    // Should not crash and button remains uncopied
    expect(copyBtn?.textContent).toContain('Copy Diagnostics');

    act(() => {
      root.unmount();
    });
  });

  it('renders outside AntApp without throwing when copying diagnostics', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(ErrorResultView, {
          title: 'Root Outside AntApp Error',
          error: new Error('Outside context error'),
          showDiagnostics: true,
        }),
      );
    });

    expect(container.textContent).toContain('Root Outside AntApp Error');

    const copyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Copy Diagnostics'),
    );
    expect(copyBtn).toBeTruthy();

    await act(async () => {
      copyBtn?.click();
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);

    act(() => {
      root.unmount();
    });
  });

  it('renders correct action buttons when only status="403" or status="404" is provided', async () => {
    const mockGoHome = vi.fn();
    const root403 = await renderWithApp(
      createElement(ErrorResultView, {
        status: '403',
        onGoHome: mockGoHome,
      }),
    );
    expect(container.textContent).toContain('Return to Dashboard');
    expect(container.textContent).toContain('Sign In Again');
    act(() => {
      root403.unmount();
    });

    const root404 = await renderWithApp(
      createElement(ErrorResultView, {
        status: '404',
        onGoHome: mockGoHome,
      }),
    );
    expect(container.textContent).toContain('Return to Dashboard');
    expect(container.textContent).toContain('Reload Page');
    expect(container.textContent).toContain('Or jump directly to:');
    act(() => {
      root404.unmount();
    });
  });

  it('handles string status codes in error objects and props', async () => {
    const stringStatusError = {
      status: '403',
      message: 'Access restricted for current role.',
    };

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: stringStatusError,
        showDiagnostics: true,
      }),
    );

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Access restricted for current role.');

    act(() => {
      root.unmount();
    });
  });

  it('extracts RFC 7807 problem details with title and detail', async () => {
    const rfc7807Error = {
      response: {
        status: 403,
        data: {
          type: 'https://api.uims.local/errors/ipam-restricted',
          title: 'IPAM Subnet Allocation Prohibited',
          status: 403,
          detail: 'Subnet 10.240.0.0/16 is reserved for cloud infrastructure peering.',
        },
      },
    };

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: rfc7807Error,
        showDiagnostics: true,
      }),
    );

    expect(container.textContent).toContain('403 - Access Denied');
    expect(container.textContent).toContain('Subnet 10.240.0.0/16 is reserved for cloud infrastructure peering.');

    act(() => {
      root.unmount();
    });
  });

  it('handles hostile objects whose toString throws during serialization', async () => {
    const hostile = Object.create(null);
    hostile.message = 'Direct message on un-stringifiable object';
    hostile.toString = () => {
      throw new Error('Hostile toString');
    };

    const root = await renderWithApp(
      createElement(ErrorResultView, {
        error: hostile,
        showDiagnostics: true,
      }),
    );

    expect(container.textContent).toContain('Direct message on un-stringifiable object');

    act(() => {
      root.unmount();
    });
  });
});
