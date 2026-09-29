import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, permissions: [] });
  });

  it('should have initial null state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.permissions).toEqual([]);
    expect(state.isAuthenticated()).toBe(false);
  });

  it('should login and set user, token and permissions', () => {
    const mockUser = {
      id: '1',
      email: 'tech@uims.io',
      name: 'Technician',
      role: 'Technician',
      permissions: ['Asset:create', 'Asset:read'],
    };
    useAuthStore.getState().login('jwt-token-123', mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('jwt-token-123');
    expect(state.permissions).toEqual(['Asset:create', 'Asset:read']);
    expect(state.isAuthenticated()).toBe(true);
    expect(state.can('create', 'Asset')).toBe(true);
    expect(state.can('delete', 'Asset')).toBe(false);
    expect(state.hasRole('Technician')).toBe(true);
    expect(state.isSuperAdmin()).toBe(false);
  });

  it('should grant all access to Super Admin', () => {
    const superAdmin = {
      id: '1',
      email: 'admin@uims.io',
      name: 'Super Admin',
      role: 'Super Admin',
      permissions: ['*:*'],
    };
    useAuthStore.getState().login('jwt-token-123', superAdmin);

    const state = useAuthStore.getState();
    expect(state.isSuperAdmin()).toBe(true);
    expect(state.can('delete', 'Setting')).toBe(true);
    expect(state.hasRole('Auditor')).toBe(true);
  });

  it('should logout and clear state, tokens, and permissions', () => {
    const mockUser = { id: '1', email: 'admin@uims.io', name: 'Admin', role: 'ADMIN' };
    useAuthStore.getState().login('jwt-token-123', mockUser, ['*:*'], 'refresh-token-xyz');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token-xyz');

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.permissions).toEqual([]);
    expect(state.isAuthenticated()).toBe(false);
  });

  it('should persist refreshToken on login and update tokens with setTokens', () => {
    const mockUser = { id: '2', email: 'user@uims.io', name: 'User', role: 'User' };
    useAuthStore.getState().login('access-token-1', mockUser, ['Asset:read'], 'refresh-token-1');

    expect(useAuthStore.getState().token).toBe('access-token-1');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token-1');

    // Simulate token refresh rotation
    useAuthStore.getState().setTokens('access-token-2', 'refresh-token-2');

    expect(useAuthStore.getState().token).toBe('access-token-2');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token-2');
  });
});
