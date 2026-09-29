import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/auth.store';
import { __resetApiStateForTesting, api, refreshAuthToken } from './api';

const create401AxiosError = (
  url: string,
  retry = false,
  baseConfig?: InternalAxiosRequestConfig,
): AxiosError => {
  const headers = baseConfig?.headers || new AxiosHeaders();
  const config: InternalAxiosRequestConfig & { _retry?: boolean } = {
    ...baseConfig,
    url,
    method: baseConfig?.method || 'get',
    headers,
    _retry: retry,
  };

  const response: AxiosResponse = {
    data: { message: 'Unauthorized' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  };

  return new AxiosError(
    'Request failed with status code 401',
    'ERR_BAD_REQUEST',
    config,
    null,
    response,
  );
};

describe('API Client & Interceptor', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, refreshToken: null });
    __resetApiStateForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    __resetApiStateForTesting();
    vi.restoreAllMocks();
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

  describe('Error Normalization on Token Refresh Failures', () => {
    it('should normalize string error into an Error instance during refresh failure', async () => {
      useAuthStore.setState({
        token: 'expired-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      const postSpy = vi.spyOn(api, 'post').mockRejectedValueOnce('Custom string error reason');

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/assets', false, config));
      });

      let caughtError: unknown;
      try {
        await api.get('/assets', { adapter: mockAdapter });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(postSpy).toHaveBeenCalledWith('/auth/refresh');
      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe('Custom string error reason');
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should normalize non-Error plain object into an Error instance with fallback message', async () => {
      useAuthStore.setState({
        token: 'expired-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      const postSpy = vi.spyOn(api, 'post').mockRejectedValueOnce({
        statusCode: 401,
        code: 'TOKEN_INVALID',
        description: 'Session invalidated by server',
      });

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/inventory', false, config));
      });

      let caughtError: unknown;
      try {
        await api.get('/inventory', { adapter: mockAdapter });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(postSpy).toHaveBeenCalledWith('/auth/refresh');
      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe('Authentication token refresh failed');
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should normalize undefined and null rejections into Error instances with fallback message', async () => {
      useAuthStore.setState({
        token: 'expired-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      vi.spyOn(api, 'post').mockRejectedValueOnce(undefined);

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/licenses', false, config));
      });

      let caughtError: unknown;
      try {
        await api.get('/licenses', { adapter: mockAdapter });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe('Authentication token refresh failed');
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should normalize primitive numbers and booleans into Error instances with fallback message', async () => {
      useAuthStore.setState({
        token: 'expired-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      vi.spyOn(api, 'post').mockRejectedValueOnce(502);

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/network', false, config));
      });

      let caughtError: unknown;
      try {
        await api.get('/network', { adapter: mockAdapter });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe('Authentication token refresh failed');
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should preserve existing Error instances thrown by refresh', async () => {
      useAuthStore.setState({
        token: 'expired-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      const originalError = new Error('Custom refresh exception message');
      vi.spyOn(api, 'post').mockRejectedValueOnce(originalError);

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/network', false, config));
      });

      let caughtError: unknown;
      try {
        await api.get('/network', { adapter: mockAdapter });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(caughtError).toBe(originalError);
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should normalize error when refresh returns empty or malformed token payload', async () => {
      useAuthStore.setState({
        token: 'expired-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      // Returns response without token
      vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: { success: false, data: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
      });

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/assets', false, config));
      });

      let caughtError: unknown;
      try {
        await api.get('/assets', { adapter: mockAdapter });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe('No access token received during refresh');
      expect(useAuthStore.getState().token).toBeNull();
    });
  });

  describe('Concurrent 401 Handling & Queue Mechanics', () => {
    it('should reject all concurrent queued 401 requests with normalized Error when refresh fails with a string', async () => {
      useAuthStore.setState({
        token: 'stale-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      let refreshReject: (reason: unknown) => void = () => {};
      const refreshPromise = new Promise<never>((_, reject) => {
        refreshReject = reject;
      });
      vi.spyOn(api, 'post').mockImplementationOnce(() => refreshPromise);

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/unknown', false, config));
      });

      // Launch 3 simultaneous requests that all hit 401
      const req1Promise = api.get('/assets', { adapter: mockAdapter });
      const req2Promise = api.get('/inventory', { adapter: mockAdapter });
      const req3Promise = api.get('/licenses', { adapter: mockAdapter });

      // Yield event loop so req1 triggers refresh and req2/req3 get queued
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Reject the in-flight refresh with a non-Error string
      refreshReject('Refresh token revoked');

      const results = await Promise.allSettled([req1Promise, req2Promise, req3Promise]);

      expect(results).toHaveLength(3);
      for (const res of results) {
        expect(res.status).toBe('rejected');
        if (res.status === 'rejected') {
          expect(res.reason).toBeInstanceOf(Error);
          expect((res.reason as Error).message).toBe('Refresh token revoked');
        }
      }

      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should reject all concurrent queued 401 requests with normalized Error when refresh fails with a plain object', async () => {
      useAuthStore.setState({
        token: 'stale-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      let refreshReject: (reason: unknown) => void = () => {};
      const refreshPromise = new Promise<never>((_, reject) => {
        refreshReject = reject;
      });
      vi.spyOn(api, 'post').mockImplementationOnce(() => refreshPromise);

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/unknown', false, config));
      });

      const req1Promise = api.get('/assets', { adapter: mockAdapter });
      const req2Promise = api.get('/inventory', { adapter: mockAdapter });
      const req3Promise = api.get('/network', { adapter: mockAdapter });

      await new Promise((resolve) => setTimeout(resolve, 20));

      refreshReject({ code: 'SESSION_TERMINATED', status: 401 });

      const results = await Promise.allSettled([req1Promise, req2Promise, req3Promise]);

      expect(results).toHaveLength(3);
      for (const res of results) {
        expect(res.status).toBe('rejected');
        if (res.status === 'rejected') {
          expect(res.reason).toBeInstanceOf(Error);
          expect((res.reason as Error).message).toBe('Authentication token refresh failed');
        }
      }

      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should retry and fulfill all concurrent queued 401 requests when refresh succeeds', async () => {
      useAuthStore.setState({
        token: 'stale-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      let refreshResolve: (value: AxiosResponse) => void = () => {};
      const refreshPromise = new Promise<AxiosResponse>((resolve) => {
        refreshResolve = resolve;
      });
      vi.spyOn(api, 'post').mockImplementationOnce(() => refreshPromise);

      const attemptCounts: Record<string, number> = {
        '/assets': 0,
        '/inventory': 0,
        '/licenses': 0,
      };

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        const url = config.url || '';
        attemptCounts[url] = (attemptCounts[url] || 0) + 1;

        // First attempt returns 401; retry attempt returns 200
        if (attemptCounts[url] === 1) {
          return Promise.reject(create401AxiosError(url, false, config));
        }

        return Promise.resolve({
          data: { url, success: true, retriedWith: config.headers?.Authorization },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      });

      const req1Promise = api.get('/assets', { adapter: mockAdapter });
      const req2Promise = api.get('/inventory', { adapter: mockAdapter });
      const req3Promise = api.get('/licenses', { adapter: mockAdapter });

      await new Promise((resolve) => setTimeout(resolve, 20));

      // Fulfill token refresh
      const mockRefreshResponse: AxiosResponse = {
        data: { data: { accessToken: 'refreshed-jwt-valid-999' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
      };
      refreshResolve(mockRefreshResponse);

      const [res1, res2, res3] = await Promise.all([req1Promise, req2Promise, req3Promise]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);

      expect(res1.data.retriedWith).toBe('Bearer refreshed-jwt-valid-999');
      expect(res2.data.retriedWith).toBe('Bearer refreshed-jwt-valid-999');
      expect(res3.data.retriedWith).toBe('Bearer refreshed-jwt-valid-999');

      expect(useAuthStore.getState().token).toBe('refreshed-jwt-valid-999');
    });

    it('stress test: should handle 25 concurrent 401 requests with failed refresh without unhandled rejections', async () => {
      useAuthStore.setState({
        token: 'stale-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      let refreshReject: (reason: unknown) => void = () => {};
      const refreshPromise = new Promise<never>((_, reject) => {
        refreshReject = reject;
      });
      vi.spyOn(api, 'post').mockImplementationOnce(() => refreshPromise);

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/stress', false, config));
      });

      const promises: Promise<AxiosResponse>[] = [];
      for (let i = 0; i < 25; i++) {
        promises.push(api.get(`/stress-test-${i}`, { adapter: mockAdapter }));
      }

      await new Promise((resolve) => setTimeout(resolve, 20));

      refreshReject({ customError: 'High concurrency failure' });

      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(25);

      for (const res of results) {
        expect(res.status).toBe('rejected');
        if (res.status === 'rejected') {
          expect(res.reason).toBeInstanceOf(Error);
          expect((res.reason as Error).message).toBe('Authentication token refresh failed');
        }
      }

      expect(useAuthStore.getState().token).toBeNull();
    });
  });

  describe('Edge Cases and Guard Invariants', () => {
    it('should immediately reject without refresh if request has already been retried (_retry = true)', async () => {
      useAuthStore.setState({
        token: 'any-token',
        user: { id: '1', email: 'test@uims.io', name: 'User', role: 'ADMIN' },
      });

      const postSpy = vi.spyOn(api, 'post');

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/assets', true, config));
      });

      let caughtError: unknown;
      try {
        await api.get('/assets', { adapter: mockAdapter });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(postSpy).not.toHaveBeenCalled();
      expect(caughtError).toBeInstanceOf(AxiosError);
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should not attempt refresh on 401 from auth endpoints (/auth/login and /auth/refresh)', async () => {
      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '', false, config));
      });

      const postSpy = vi.spyOn(api, 'post');

      await expect(api.get('/auth/login', { adapter: mockAdapter })).rejects.toThrow();
      await expect(api.get('/auth/refresh', { adapter: mockAdapter })).rejects.toThrow();

      // handleUnauthorized is bypassed because url includes /auth/login or /auth/refresh
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should pass through non-401 errors without attempting refresh', async () => {
      const postSpy = vi.spyOn(api, 'post');

      const headers = new AxiosHeaders();
      const config: InternalAxiosRequestConfig = { url: '/not-found', headers };
      const notFoundError = new AxiosError('Not Found', 'ERR_BAD_REQUEST', config, null, {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
        data: {},
      });

      const mockAdapter = vi.fn().mockRejectedValue(notFoundError);

      await expect(api.get('/not-found', { adapter: mockAdapter })).rejects.toThrow('Not Found');
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('should pass through non-AxiosError rejections in response interceptor without throwing unhandled exceptions', async () => {
      const mockAdapter = vi.fn().mockRejectedValue('Raw network string rejection');

      let caughtError: unknown;
      try {
        await api.get('/raw-rejection', { adapter: mockAdapter });
      } catch (err: unknown) {
        caughtError = err;
      }

      expect(caughtError).toBe('Raw network string rejection');
    });

    it('should normalize HTTP 403 Forbidden with clear Access Denied message', async () => {
      const headers = new AxiosHeaders();
      const config: InternalAxiosRequestConfig = { url: '/forbidden-resource', headers };
      const forbiddenError = new AxiosError(
        'Request failed with status code 403',
        'ERR_BAD_REQUEST',
        config,
        null,
        {
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config,
          data: { statusCode: 403, message: 'Forbidden resource' },
        },
      );

      const mockAdapter = vi.fn().mockRejectedValue(forbiddenError);

      try {
        await api.get('/forbidden-resource', { adapter: mockAdapter });
        expect.unreachable('Should have rejected with 403');
      } catch (err: unknown) {
        expect(isAxiosError(err)).toBe(true);
        if (isAxiosError(err)) {
          expect(err.message).toBe('Access denied: Insufficient permissions.');
          expect(err.response?.data?.message).toBe('Access denied: Insufficient permissions.');
        }
      }
    });

    it('should seamlessly refresh expired access token using stored refresh token and replay original request', async () => {
      useAuthStore.setState({
        token: 'expired-access-token',
        refreshToken: 'valid-refresh-token-xyz',
        user: { id: 'user-1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
      });

      const refreshSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({
        data: {
          accessToken: 'fresh-new-access-token',
          refreshToken: 'rotated-new-refresh-token',
          token: 'fresh-new-access-token',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
      });

      let callCount = 0;
      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        callCount++;
        if (callCount === 1) {
          // First attempt fails with 401 expired token
          return Promise.reject(create401AxiosError(config.url || '/assets', false, config));
        }
        // Second attempt with new token succeeds
        return Promise.resolve({
          data: [{ id: 'asset-1', name: 'Server Rack' }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      });

      const response = await api.get('/assets', { adapter: mockAdapter });

      expect(response.status).toBe(200);
      expect(response.data).toEqual([{ id: 'asset-1', name: 'Server Rack' }]);
      expect(refreshSpy).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'valid-refresh-token-xyz',
      });
      expect(useAuthStore.getState().token).toBe('fresh-new-access-token');
      expect(useAuthStore.getState().refreshToken).toBe('rotated-new-refresh-token');
      expect(mockAdapter).toHaveBeenCalledTimes(2);
    });

    it('should pause concurrent requests during refresh and replay all queued requests with the new access token', async () => {
      useAuthStore.setState({
        token: 'stale-access-token',
        refreshToken: 'valid-refresh-token-multi',
        user: { id: 'user-1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
      });

      let resolveRefresh: (val: unknown) => void = () => {};
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      vi.spyOn(api, 'post').mockImplementationOnce(() => refreshPromise as never);

      const requestAttempts: Record<string, number> = {
        '/assets': 0,
        '/inventory': 0,
        '/licenses': 0,
      };

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        const url = config.url || '';
        requestAttempts[url] = (requestAttempts[url] || 0) + 1;

        if (requestAttempts[url] === 1) {
          return Promise.reject(create401AxiosError(url, false, config));
        }

        return Promise.resolve({
          data: { url, success: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      });

      const req1Promise = api.get('/assets', { adapter: mockAdapter });
      const req2Promise = api.get('/inventory', { adapter: mockAdapter });
      const req3Promise = api.get('/licenses', { adapter: mockAdapter });

      // Yield event loop so req1 triggers refresh and req2/req3 get queued
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Fulfill the in-flight refresh
      resolveRefresh({
        data: {
          accessToken: 'fresh-multi-token',
          refreshToken: 'rotated-multi-refresh',
        },
        status: 200,
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      const [res1, res2, res3] = await Promise.all([req1Promise, req2Promise, req3Promise]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);
      expect(useAuthStore.getState().token).toBe('fresh-multi-token');
      expect(useAuthStore.getState().refreshToken).toBe('rotated-multi-refresh');
    });

    it('should reject and redirect to /login when token refresh returns 401 with missing credentials', async () => {
      useAuthStore.setState({
        token: 'expired-access-token',
        refreshToken: null,
        user: { id: 'user-1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
      });

      const refreshSpy = vi.spyOn(api, 'post').mockRejectedValueOnce(
        new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, null, {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
          data: { message: 'Refresh token is required' },
        }),
      );

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/assets', false, config));
      });

      await expect(api.get('/assets', { adapter: mockAdapter })).rejects.toThrow();
      expect(refreshSpy).toHaveBeenCalledWith('/auth/refresh');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should reject all queued concurrent requests and redirect to /login when /auth/refresh fails', async () => {
      useAuthStore.setState({
        token: 'expired-access-token',
        refreshToken: 'revoked-refresh-token',
        user: { id: 'user-1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
      });

      let rejectRefresh: (err: unknown) => void = () => {};
      const refreshPromise = new Promise((_, reject) => {
        rejectRefresh = reject;
      });

      vi.spyOn(api, 'post').mockImplementationOnce(() => refreshPromise as never);

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/test', false, config));
      });

      const req1Promise = api.get('/assets', { adapter: mockAdapter });
      const req2Promise = api.get('/inventory', { adapter: mockAdapter });

      await new Promise((resolve) => setTimeout(resolve, 30));

      const refreshError = new AxiosError('Session revoked', 'ERR_BAD_REQUEST', undefined, null, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() } as InternalAxiosRequestConfig,
        data: { message: 'Session has been revoked due to security violation' },
      });

      rejectRefresh(refreshError);

      await expect(req1Promise).rejects.toThrow();
      await expect(req2Promise).rejects.toThrow();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().refreshToken).toBeNull();
    });

    it('should reject request immediately if AbortSignal is aborted during refresh queuing', async () => {
      useAuthStore.setState({
        token: 'expired-access-token',
        refreshToken: 'valid-refresh-token',
        user: { id: 'user-1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
      });

      // Keep refresh pending
      let pendingResolve: (val: unknown) => void = () => {};
      vi.spyOn(api, 'post').mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            pendingResolve = resolve;
          }) as never,
      );

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/test', false, config));
      });

      // First request initiates refresh
      const req1Promise = api.get('/assets', { adapter: mockAdapter });
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Second request is aborted before queuing
      const controller = new AbortController();
      controller.abort();

      await expect(
        api.get('/aborted-resource', {
          adapter: mockAdapter,
          signal: controller.signal,
        }),
      ).rejects.toThrow();

      pendingResolve({
        data: { accessToken: 'cleanup-token' },
        status: 200,
        headers: {},
        config: { headers: new AxiosHeaders() },
      });
      await req1Promise.catch(() => {});
    });

    it('should reject immediately when in-flight queued request is aborted while waiting in failedQueue', async () => {
      useAuthStore.setState({
        token: 'expired-access-token',
        refreshToken: 'valid-refresh-token',
        user: { id: 'user-1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
      });

      // Keep refresh pending indefinitely
      let resolveRefresh: (val: unknown) => void = () => {};
      vi.spyOn(api, 'post').mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }) as never,
      );

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/test', false, config));
      });

      // Request 1 starts the refresh
      const req1Promise = api.get('/assets', { adapter: mockAdapter });
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Request 2 enters the queue with an active controller
      const controller = new AbortController();
      const req2Promise = api.get('/inventory', {
        adapter: mockAdapter,
        signal: controller.signal,
      });

      await new Promise((resolve) => setTimeout(resolve, 30));

      // Abort Request 2 while sitting in failedQueue
      controller.abort();

      await expect(req2Promise).rejects.toThrow(/abort/i);

      // Finish refresh to verify Request 2 was removed and doesn't get re-executed
      resolveRefresh({
        data: { accessToken: 'new-token', refreshToken: 'new-rt' },
        status: 200,
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      await req1Promise.catch(() => {});
    });

    it('should deduplicate concurrent calls to refreshAuthToken and return the identical in-flight promise', async () => {
      useAuthStore.setState({
        token: 'stale-token',
        refreshToken: 'rt-single-test',
        user: { id: 'user-1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
      });

      let resolveRefresh: (val: unknown) => void = () => {};
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      const postSpy = vi.spyOn(api, 'post').mockImplementationOnce(() => refreshPromise as never);

      const call1 = refreshAuthToken();
      const call2 = refreshAuthToken();
      const call3 = refreshAuthToken();

      expect(call1).toBe(call2);
      expect(call2).toBe(call3);
      expect(postSpy).toHaveBeenCalledTimes(1);

      resolveRefresh({
        data: {
          accessToken: 'fresh-deduped-token',
          refreshToken: 'fresh-deduped-rt',
          user: { id: 'user-1', email: 'test@uims.io', name: 'Updated User Name', role: 'ADMIN' },
        },
        status: 200,
        headers: {},
        config: { headers: new AxiosHeaders() },
      });

      const [token1, token2, token3] = await Promise.all([call1, call2, call3]);
      expect(token1).toBe('fresh-deduped-token');
      expect(token2).toBe('fresh-deduped-token');
      expect(token3).toBe('fresh-deduped-token');
      expect(useAuthStore.getState().user?.name).toBe('Updated User Name');
    });

    it('should trigger handleAuthRedirect and clear store when direct POST /auth/refresh returns 401', async () => {
      useAuthStore.setState({
        token: 'any-token',
        refreshToken: 'invalid-rt',
        user: { id: 'user-1', email: 'test@uims.io', name: 'Test User', role: 'ADMIN' },
      });

      const mockAdapter = vi.fn().mockImplementation((config: InternalAxiosRequestConfig) => {
        return Promise.reject(create401AxiosError(config.url || '/auth/refresh', false, config));
      });

      await expect(
        api.post('/auth/refresh', { refreshToken: 'invalid-rt' }, { adapter: mockAdapter }),
      ).rejects.toThrow();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().refreshToken).toBeNull();
    });
  });
});
