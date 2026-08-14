import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null });
  });

  it('should have initial null state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });

  it('should login and set user and token', () => {
    const mockUser = { id: '1', email: 'admin@uims.io', name: 'Admin', role: 'ADMIN' };
    useAuthStore.getState().login('jwt-token-123', mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('jwt-token-123');
    expect(state.isAuthenticated()).toBe(true);
  });

  it('should logout and clear state', () => {
    const mockUser = { id: '1', email: 'admin@uims.io', name: 'Admin', role: 'ADMIN' };
    useAuthStore.getState().login('jwt-token-123', mockUser);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated()).toBe(false);
  });
});
