import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntApp, ConfigProvider } from 'antd';
import { settingsService } from '../../services/settings.service';
import SettingsPage from './SettingsPage';

const mockMessageSuccess = vi.fn();
const mockMessageWarning = vi.fn();
const mockMessageError = vi.fn();
const mockMessageInfo = vi.fn();
const mockModalConfirm = vi.fn();

const mockAppValue = {
  message: {
    success: mockMessageSuccess,
    warning: mockMessageWarning,
    error: mockMessageError,
    info: mockMessageInfo,
  },
  modal: {
    confirm: mockModalConfirm,
  },
  notification: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
};

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  const MockApp = ({ children }: { children?: React.ReactNode }) => children;
  MockApp.useApp = () => mockAppValue;

  return {
    ...actual,
    App: MockApp,
  };
});

vi.mock('../../services/settings.service', () => ({
  settingsService: {
    getAllSettings: vi.fn(),
    getHealth: vi.fn(),
    updateSetting: vi.fn(),
    runBackup: vi.fn(),
    getSetting: vi.fn(),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SettingsPage component', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null = null;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.warn = vi.fn();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.mocked(settingsService.getAllSettings).mockResolvedValue({
      general: {
        companyName: 'Acme Test Corp',
        supportEmail: 'it@acmetest.internal',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
      },
      security: {
        sessionTimeout: 45,
        maxFailedAttempts: 3,
        enforce2FA: true,
        passwordExpiryDays: 60,
        minPasswordLength: 14,
        ipAllowlist: '10.0.0.0/8',
      },
      appearance: {
        mode: 'light',
        presetKey: 'tech-blue',
        compact: false,
        borderRadius: 6,
      },
    });

    vi.mocked(settingsService.getHealth).mockResolvedValue({
      postgres: { status: 'healthy', latency: '2ms' },
      redis: { status: 'healthy', hitRate: '99%' },
      smtp: { status: 'connected', tlsVersion: 'TLSv1.3' },
      backupStorage: { status: 'ready', available: '500GB' },
    });

    vi.mocked(settingsService.updateSetting).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
    document.body.innerHTML = '';
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  const renderComponent = async () => {
    root = createRoot(container);
    await act(async () => {
      root?.render(
        createElement(
          MemoryRouter,
          null,
          createElement(
            ConfigProvider,
            null,
            createElement(AntApp, null, createElement(SettingsPage)),
          ),
        ),
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    return root;
  };

  it('renders settings navigation tabs and loads initial settings from server', async () => {
    await renderComponent();

    expect(settingsService.getAllSettings).toHaveBeenCalled();
    expect(settingsService.getHealth).toHaveBeenCalled();
    expect(document.body.textContent).toContain('Settings');
    expect(document.body.textContent).toContain('Appearance');
    expect(document.body.textContent).toContain('Notifications');
    expect(document.body.textContent).toContain('General');
    expect(document.body.textContent).not.toContain('Security Policy');
    expect(document.body.textContent).toContain('Maintenance & Backups');
  });

  it('displays user-facing error message when loading settings fails', async () => {
    vi.mocked(settingsService.getAllSettings).mockRejectedValueOnce(
      new Error('Failed to reach backend'),
    );

    await renderComponent();

    expect(mockMessageError).toHaveBeenCalledWith('Failed to load system settings from server.');
  });

  it('saves appearance settings and provides success feedback', async () => {
    await renderComponent();

    const saveBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Save Changes'),
    );
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn?.click();
    });

    expect(settingsService.updateSetting).toHaveBeenCalledWith('appearance', expect.any(Object));
    expect(mockMessageSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Appearance & theme tokens saved'),
    );
  });

  it('handles appearance update failure with user-facing error feedback', async () => {
    vi.mocked(settingsService.updateSetting).mockRejectedValueOnce(
      new Error('Database write failure'),
    );

    await renderComponent();

    const saveBtn = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Save Changes'),
    );
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn?.click();
    });

    expect(mockMessageError).toHaveBeenCalledWith('Failed to persist theme preferences to server.');
  });
});
