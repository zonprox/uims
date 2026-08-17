import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../stores/auth.store';
import { useAccess } from './useAccess';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('useAccess hook', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    useAuthStore.setState({ user: null, token: null, permissions: [] });
  });

  it('should return correct permissions status for logged in user', async () => {
    useAuthStore.getState().login(
      'jwt-token',
      { id: '1', email: 'auditor@uims.internal', name: 'Auditor', role: 'Auditor' },
      ['Audit:read', 'Audit:export', 'Asset:read'],
    );

    let currentAccess: ReturnType<typeof useAccess> | null = null;
    function TestComponent() {
      const access = useAccess();
      currentAccess = access;
      return createElement('div', null, access.user?.name);
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    expect(currentAccess!.can('read', 'Audit')).toBe(true);
    expect(currentAccess!.can('delete', 'Audit')).toBe(false);
    expect(currentAccess!.hasPermission('Asset:read')).toBe(true);
    expect(currentAccess!.hasRole('Auditor')).toBe(true);
    expect(currentAccess!.isSuperAdmin).toBe(false);

    act(() => {
      root.unmount();
    });
  });
});
