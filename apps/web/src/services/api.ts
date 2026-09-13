import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

const handleAuthRedirect = () => {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const queueFailedRequest = (originalRequest: InternalAxiosRequestConfig) => {
  return new Promise<string>((resolve, reject) => {
    failedQueue.push({ resolve, reject });
  }).then((token) => {
    if (originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
    }
    return api(originalRequest);
  });
};

const refreshAuthToken = async (): Promise<string> => {
  const refreshResponse = await api.post('/auth/refresh');
  const newToken =
    refreshResponse.data?.data?.accessToken ||
    refreshResponse.data?.accessToken ||
    refreshResponse.data?.token;

  if (!newToken) {
    throw new Error('No access token received during refresh');
  }

  const currentUser = useAuthStore.getState().user;
  if (currentUser) {
    useAuthStore.getState().login(newToken, currentUser);
  }

  return newToken;
};

const handleUnauthorized = async (
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
  error: unknown,
) => {
  if (originalRequest._retry) {
    handleAuthRedirect();
    return Promise.reject(error);
  }

  if (isRefreshing) {
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
    handleAuthRedirect();
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
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh');

    if (status === 401 && !isAuthEndpoint) {
      return handleUnauthorized(originalRequest, error);
    }

    return Promise.reject(error);
  },
);
