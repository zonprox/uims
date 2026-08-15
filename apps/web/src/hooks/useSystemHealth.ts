import { useCallback, useEffect, useRef, useState } from 'react';
import { type HealthState, healthService } from '../services/health.service';

export interface UseSystemHealthOptions {
  intervalMs?: number;
  autoRefresh?: boolean;
}

export function useSystemHealth(options: UseSystemHealthOptions = {}) {
  const { intervalMs = 10000, autoRefresh = true } = options;

  const [health, setHealth] = useState<HealthState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManual) {
      setIsRefreshing(true);
    }

    try {
      const data = await healthService.checkHealth();
      if (!isMountedRef.current) return;

      setHealth(data);
      setIsOnline(data.status !== 'error');
      setError(null);
      setLastChecked(new Date());
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to communicate with health telemetry';
      setError(errorMessage);
      setIsOnline(false);
      setHealth((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              database: { ...prev.database, status: 'disconnected' },
            }
          : null,
      );
      setLastChecked(new Date());
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  const refresh = useCallback(() => {
    return fetchHealth(true);
  }, [fetchHealth]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchHealth(false);

    if (autoRefresh && intervalMs > 0) {
      intervalRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        fetchHealth(false);
      }, intervalMs);
    }

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchHealth(false);
      }
    };

    const handleOnline = () => {
      fetchHealth(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setError('Network connection lost');
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [autoRefresh, intervalMs, fetchHealth]);

  return {
    health,
    isLoading,
    isRefreshing,
    isOnline,
    lastChecked,
    error,
    refresh,
  };
}
