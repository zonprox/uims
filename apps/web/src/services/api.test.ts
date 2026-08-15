import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { useAuthStore } from '../stores/auth.store';

describe('API Client & Interceptor', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null });
  });

  it('should have base configuration set to /api/v1', () => {
    expect(api.defaults.baseURL).toBe('/api/v1');
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should attach Bearer token to request headers when user is authenticated', async () => {
    useAuthStore.setState({
      token: 'jwt-mock-token-abc',
      user: { id: '1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
    });

    const mockAdapter = vi.fn().mockResolvedValue({
      data: { success: true },
      status: 200,
      headers: {},
      config: {},
    });

    const response = await api.get('/health', { adapter: mockAdapter });
    expect(response.status).toBe(200);
    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-mock-token-abc',
        }),
      }),
    );
  });
});
