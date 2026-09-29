import axios, { type InternalAxiosRequestConfig } from 'axios';
import { type AuthUser, useAuthStore } from '../stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

export const __resetApiStateForTesting = () => {
  isRefreshing = false;
  refreshPromise = null;
  failedQueue = [];
};

const processQueue = (error: unknown, token: string | null = null) => {
  const queue = failedQueue;
  failedQueue = [];
  queue.forEach((prom) => {
    try {
      if (error) {
        prom.reject(error);
      } else if (token) {
        prom.resolve(token);
      } else {
        prom.reject(new Error('Token refresh aborted'));
      }
    } catch (_queueErr: unknown) {
      // Prevent a single broken promise handler from impeding queue processing
    }
  });
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const isRefresh = config.url?.includes('/auth/refresh');
    if (isRefresh) {
      let refreshToken = useAuthStore.getState().refreshToken;
      if (
        !refreshToken &&
        typeof config.data === 'object' &&
        config.data !== null &&
        typeof (config.data as { refreshToken?: unknown }).refreshToken === 'string'
      ) {
        refreshToken = (config.data as { refreshToken: string }).refreshToken;
      }
      if (refreshToken && config.headers) {
        config.headers.Authorization = `Bearer ${refreshToken}`;
        config.headers['x-refresh-token'] = refreshToken;
      }
      return config;
    }

    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

const handleAuthRedirect = (reason?: string) => {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined') {
    if (reason) {
      try {
        sessionStorage.setItem('uims_auth_error', reason);
      } catch (_err: unknown) {
        // Safe ignore if storage restricted
      }
    }
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
};

const queueFailedRequest = (originalRequest: InternalAxiosRequestConfig & { _retry?: boolean }) => {
  if (originalRequest.signal?.aborted) {
    const abortReason = (originalRequest.signal as unknown as { reason?: unknown }).reason;
    return Promise.reject(
      abortReason instanceof Error ? abortReason : new Error('Request aborted'),
    );
  }
  originalRequest._retry = true;
  return new Promise<string>((resolve, reject) => {
    const signal = originalRequest.signal;
    let abortListener: (() => void) | undefined;

    const cleanup = () => {
      if (typeof signal?.removeEventListener === 'function' && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
    };

    const wrappedResolve = (token: string) => {
      cleanup();
      resolve(token);
    };

    const wrappedReject = (error: unknown) => {
      cleanup();
      reject(error);
    };

    if (typeof signal?.addEventListener === 'function') {
      abortListener = () => {
        cleanup();
        const index = failedQueue.findIndex((entry) => entry.resolve === wrappedResolve);
        if (index !== -1) {
          failedQueue.splice(index, 1);
        }
        const abortReason = (signal as unknown as { reason?: unknown }).reason;
        reject(abortReason instanceof Error ? abortReason : new Error('Request aborted'));
      };
      signal.addEventListener('abort', abortListener, { once: true });
    }

    failedQueue.push({ resolve: wrappedResolve, reject: wrappedReject });
  }).then((token) => {
    if (originalRequest.signal?.aborted) {
      const abortReason = (originalRequest.signal as unknown as { reason?: unknown }).reason;
      throw abortReason instanceof Error ? abortReason : new Error('Request aborted');
    }
    if (originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
    }
    return api(originalRequest);
  });
};

export const refreshAuthToken = (): Promise<string> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      const refreshResponse = refreshToken
        ? await api.post('/auth/refresh', { refreshToken })
        : await api.post('/auth/refresh');

      const data = (refreshResponse.data?.data || refreshResponse.data) as
        | {
            accessToken?: string;
            token?: string;
            refreshToken?: string;
            permissions?: string[];
            user?: AuthUser;
          }
        | undefined;

      const newToken = data?.accessToken || data?.token;
      const newRefreshToken = data?.refreshToken;

      if (!newToken) {
        throw new Error('No access token received during refresh');
      }

      const store = useAuthStore.getState();
      const currentUser = store.user;
      const newPermissions =
        Array.isArray(data?.permissions) && data.permissions.length > 0
          ? data.permissions
          : currentUser?.permissions || [];
      const updatedUser = data?.user || currentUser;

      if (updatedUser) {
        store.login(newToken, updatedUser, newPermissions, newRefreshToken || refreshToken);
      } else {
        store.setTokens(newToken, newRefreshToken || refreshToken);
      }

      return newToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const handleUnauthorized = async (
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
  error: unknown,
) => {
  if (originalRequest._retry) {
    handleAuthRedirect('Authentication session could not be verified. Please sign in again.');
    return Promise.reject(error);
  }

  if (isRefreshing || refreshPromise !== null) {
    return queueFailedRequest(originalRequest);
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    const newToken = await refreshAuthToken();
    processQueue(null, newToken);

    if (originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
    }
    return api(originalRequest);
  } catch (refreshErr: unknown) {
    const normalizedError =
      refreshErr instanceof Error
        ? refreshErr
        : new Error(
            typeof refreshErr === 'string' ? refreshErr : 'Authentication token refresh failed',
          );
    processQueue(normalizedError, null);
    handleAuthRedirect('Your session has expired. Please sign in again.');
    return Promise.reject(normalizedError);
  } finally {
    isRefreshing = false;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        handleAuthRedirect('Your session has expired. Please sign in again.');
        return Promise.reject(error);
      }
      if (!originalRequest.url?.includes('/auth/login')) {
        return handleUnauthorized(originalRequest, error);
      }
    }

    if (status === 403) {
      const data = error.response?.data as { message?: string; error?: string } | undefined;
      const defaultPermissionMsg = 'Access denied: Insufficient permissions.';
      if (!data?.message || data.message === 'Forbidden resource' || data.message === 'Forbidden') {
        if (data && typeof data === 'object') {
          data.message = defaultPermissionMsg;
        }
      }
      error.message = data?.message || defaultPermissionMsg;
    }

    return Promise.reject(error);
  },
);
