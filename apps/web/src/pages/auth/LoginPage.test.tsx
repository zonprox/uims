import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App as AntApp, ConfigProvider } from 'antd';
import LoginPage from './LoginPage';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

vi.mock('../../services/auth.service', () => ({
  authService: {
    login: vi.fn().mockResolvedValue({
      data: {
        accessToken: 'mock-jwt-token',
        user: { id: 'u-1', email: 'admin@youngonevn.com', name: 'Administrator', role: 'Admin' },
      },
    }),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LoginPage Quick Access Demo Accounts', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
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
      .querySelectorAll('.ant-modal-root, .ant-drawer, .ant-popover')
      .forEach((el) => el.remove());
  });

  const renderWithApp = async () => {
    currentRoot = createRoot(container);
    await act(async () => {
      currentRoot?.render(
        createElement(ConfigProvider, null, createElement(AntApp, null, createElement(LoginPage))),
      );
    });
  };

  it('renders default initial values with admin@youngonevn.com and Youngone@2026', async () => {
    await renderWithApp();

    const emailInput = container.querySelector<HTMLInputElement>('input#login_email');
    const passwordInput = container.querySelector<HTMLInputElement>('input#login_password');

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(emailInput?.value).toBe('admin@youngonevn.com');
    expect(passwordInput?.value).toBe('Youngone@2026');
  });

  it('renders 4 quick-access demo buttons for Admin, Manager, User, and Viewer', async () => {
    await renderWithApp();

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    const demoLabels = ['Admin', 'Manager', 'User', 'Viewer'];

    for (const label of demoLabels) {
      const btn = buttons.find((b) => b.textContent?.trim() === label);
      expect(btn).toBeDefined();
    }
  });

  it('populates form with manager@youngonevn.com and Youngone@2026 when Manager button is clicked', async () => {
    await renderWithApp();

    const managerBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Manager',
    );
    expect(managerBtn).toBeDefined();

    await act(async () => {
      managerBtn?.click();
    });

    const emailInput = container.querySelector<HTMLInputElement>('input#login_email');
    const passwordInput = container.querySelector<HTMLInputElement>('input#login_password');
    expect(emailInput?.value).toBe('manager@youngonevn.com');
    expect(passwordInput?.value).toBe('Youngone@2026');
  });

  it('populates form with user@youngonevn.com and Youngone@2026 when User button is clicked', async () => {
    await renderWithApp();

    const userBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'User',
    );
    expect(userBtn).toBeDefined();

    await act(async () => {
      userBtn?.click();
    });

    const emailInput = container.querySelector<HTMLInputElement>('input#login_email');
    const passwordInput = container.querySelector<HTMLInputElement>('input#login_password');
    expect(emailInput?.value).toBe('user@youngonevn.com');
    expect(passwordInput?.value).toBe('Youngone@2026');
  });

  it('populates form with viewer@youngonevn.com and Youngone@2026 when Viewer button is clicked', async () => {
    await renderWithApp();

    const viewerBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Viewer',
    );
    expect(viewerBtn).toBeDefined();

    await act(async () => {
      viewerBtn?.click();
    });

    const emailInput = container.querySelector<HTMLInputElement>('input#login_email');
    const passwordInput = container.querySelector<HTMLInputElement>('input#login_password');
    expect(emailInput?.value).toBe('viewer@youngonevn.com');
    expect(passwordInput?.value).toBe('Youngone@2026');
  });

  it('populates form with admin@youngonevn.com and Youngone@2026 when Admin button is clicked', async () => {
    await renderWithApp();

    // First switch to Viewer
    const viewerBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Viewer',
    );
    await act(async () => {
      viewerBtn?.click();
    });

    // Then click Admin
    const adminBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Admin',
    );
    expect(adminBtn).toBeDefined();

    await act(async () => {
      adminBtn?.click();
    });

    const emailInput = container.querySelector<HTMLInputElement>('input#login_email');
    const passwordInput = container.querySelector<HTMLInputElement>('input#login_password');
    expect(emailInput?.value).toBe('admin@youngonevn.com');
    expect(passwordInput?.value).toBe('Youngone@2026');
  });

  it('ensures all 4 demo buttons have type="button" to avoid form submission side-effects', async () => {
    await renderWithApp();

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    const demoLabels = ['Admin', 'Manager', 'User', 'Viewer'];

    for (const label of demoLabels) {
      const btn = buttons.find((b) => b.textContent?.trim() === label);
      expect(btn).toBeDefined();
      expect(btn?.getAttribute('type')).toBe('button');
    }
  });

  it('provides informative title tooltips on all 4 demo buttons', async () => {
    await renderWithApp();

    const expectedTitles: Record<string, string> = {
      Admin: 'admin@youngonevn.com (Youngone@2026)',
      Manager: 'manager@youngonevn.com (Youngone@2026)',
      User: 'user@youngonevn.com (Youngone@2026)',
      Viewer: 'viewer@youngonevn.com (Youngone@2026)',
    };

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    for (const [label, expectedTitle] of Object.entries(expectedTitles)) {
      const btn = buttons.find((b) => b.textContent?.trim() === label);
      expect(btn?.getAttribute('title')).toBe(expectedTitle);
    }
  });

  it('clears form field validation errors when a demo button is clicked', async () => {
    await renderWithApp();

    const emailInput = container.querySelector<HTMLInputElement>('input#login_email');
    const passwordInput = container.querySelector<HTMLInputElement>('input#login_password');
    const submitBtn = container.querySelector<HTMLButtonElement>('button[type="submit"]');

    // Clear inputs and trigger validation error
    if (emailInput && passwordInput && submitBtn) {
      emailInput.value = '';
      passwordInput.value = '';
      await act(async () => {
        submitBtn.click();
      });
    }

    // Now click Manager demo button
    const managerBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Manager',
    );
    await act(async () => {
      managerBtn?.click();
    });

    expect(emailInput?.value).toBe('manager@youngonevn.com');
    expect(passwordInput?.value).toBe('Youngone@2026');
    const errorExplains = container.querySelectorAll('.ant-form-item-explain-error');
    expect(errorExplains.length).toBe(0);
  });
});
