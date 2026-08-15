import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { healthService } from '../services/health.service';
import { useSystemHealth } from './useSystemHealth';

vi.mock('../services/health.service', () => ({
  healthService: {
    checkHealth: vi.fn(),
  },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('useSystemHealth', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should fetch health on mount and update state', async () => {
    vi.mocked(healthService.checkHealth).mockResolvedValueOnce({
      status: 'ok',
      uptime: 5000,
      uptimeFormatted: '1h 23m 20s',
      uptimePercent: '99.99%',
      latencyMs: 3,
      clientLatencyMs: 12,
      database: { status: 'connected', latencyMs: 1 },
      system: {
        nodeVersion: 'v20.0.0',
        platform: 'linux',
        memoryHeapUsedMb: 35,
        memoryHeapTotalMb: 60,
        memoryRssMb: 85,
      },
      timestamp: new Date().toISOString(),
    });

    let currentHookState: ReturnType<typeof useSystemHealth> | null = null;
    function TestComponent() {
      const state = useSystemHealth({ autoRefresh: false });
      currentHookState = state;
      return createElement('div', null, state.health?.status ?? 'loading');
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    // Allow promise resolution
    await act(async () => {
      await Promise.resolve();
    });

    expect(currentHookState!.health?.status).toBe('ok');
    expect(currentHookState!.health?.clientLatencyMs).toBe(12);
    expect(currentHookState!.isOnline).toBe(true);
    expect(currentHookState!.isLoading).toBe(false);

    act(() => {
      root.unmount();
    });
  });

  it('should handle errors gracefully and mark status as error/offline', async () => {
    vi.mocked(healthService.checkHealth).mockRejectedValueOnce(new Error('Network error'));

    let currentHookState: ReturnType<typeof useSystemHealth> | null = null;
    function TestComponent() {
      const state = useSystemHealth({ autoRefresh: false });
      currentHookState = state;
      return createElement('div', null, state.health?.status ?? 'loading');
    }

    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TestComponent));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(currentHookState!.isOnline).toBe(false);
    expect(currentHookState!.error).toBe('Network error');
    expect(currentHookState!.isLoading).toBe(false);

    act(() => {
      root.unmount();
    });
  });
});
