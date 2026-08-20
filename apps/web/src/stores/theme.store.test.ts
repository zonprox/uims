import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSystemTheme,
  resolveThemeMode,
  setupSystemThemeListener,
  useThemeStore,
} from './theme.store';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      mode: 'light',
      resolvedMode: 'light',
      compact: false,
      presetKey: 'blue',
      borderRadius: 6,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have initial default state', () => {
    const state = useThemeStore.getState();
    expect(state.mode).toBe('light');
    expect(state.resolvedMode).toBe('light');
    expect(state.compact).toBe(false);
    expect(state.presetKey).toBe('blue');
    expect(state.borderRadius).toBe(6);
  });

  it('should set all 3 theme modes (light, dark, system)', () => {
    useThemeStore.getState().setMode('dark');
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedMode).toBe('dark');
    expect(useThemeStore.getState().getResolvedMode()).toBe('dark');

    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
    expect(['light', 'dark']).toContain(useThemeStore.getState().resolvedMode);
    expect(['light', 'dark']).toContain(useThemeStore.getState().getResolvedMode());

    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedMode).toBe('light');
    expect(useThemeStore.getState().getResolvedMode()).toBe('light');
  });

  it('should toggle mode correctly', () => {
    useThemeStore.getState().setMode('light');
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedMode).toBe('dark');

    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedMode).toBe('light');
  });

  it('should resolve system theme based on matchMedia dark preference', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    expect(getSystemTheme()).toBe('dark');
    expect(resolveThemeMode('system')).toBe('dark');
    expect(resolveThemeMode('light')).toBe('light');
    expect(resolveThemeMode('dark')).toBe('dark');

    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
    expect(useThemeStore.getState().getResolvedMode()).toBe('dark');
  });

  it('should resolve system theme based on matchMedia light preference', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    expect(getSystemTheme()).toBe('light');
    expect(resolveThemeMode('system')).toBe('light');

    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
    expect(useThemeStore.getState().getResolvedMode()).toBe('light');
  });

  it('should react to OS theme changes when in system mode', () => {
    let changeHandler: (() => void) | null = null;
    let isDarkOS = false;

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        get matches() {
          return isDarkOS;
        },
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'change') {
            changeHandler = handler;
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    const cleanup = setupSystemThemeListener();

    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().resolvedMode).toBe('light');

    // Simulate OS switching to dark theme
    isDarkOS = true;
    if (changeHandler) {
      (changeHandler as () => void)();
    }
    expect(useThemeStore.getState().resolvedMode).toBe('dark');

    // If mode is explicit 'light', OS theme change should not affect resolvedMode
    useThemeStore.getState().setMode('light');
    isDarkOS = false;
    if (changeHandler) {
      (changeHandler as () => void)();
    }
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedMode).toBe('light');

    if (cleanup) {
      cleanup();
    }
  });

  it('should react to OS theme changes via legacy addListener when in system mode', () => {
    let legacyChangeHandler: ((e: MediaQueryList) => void) | null = null;
    let isDarkOS = false;

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        get matches() {
          return isDarkOS;
        },
        media: query,
        onchange: null,
        addListener: vi.fn((handler: (e: MediaQueryList) => void) => {
          legacyChangeHandler = handler;
        }),
        removeListener: vi.fn(),
        addEventListener: undefined,
        removeEventListener: undefined,
        dispatchEvent: vi.fn(),
      })),
    );

    const cleanup = setupSystemThemeListener();

    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().resolvedMode).toBe('light');

    // Simulate OS switching to dark theme with legacy handler passing event
    isDarkOS = true;
    if (legacyChangeHandler) {
      (legacyChangeHandler as (e: unknown) => void)({ matches: true });
    }
    expect(useThemeStore.getState().resolvedMode).toBe('dark');

    if (cleanup) {
      cleanup();
    }
  });

  it('should handle toggleMode correctly when currently in system mode', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: true, // System is dark
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    useThemeStore.getState().setMode('system');
    expect(useThemeStore.getState().mode).toBe('system');
    expect(useThemeStore.getState().resolvedMode).toBe('dark');

    // Toggling from dark system theme should switch to light
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('light');
    expect(useThemeStore.getState().resolvedMode).toBe('light');

    // Toggling again should switch to dark
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().resolvedMode).toBe('dark');
  });

  it('should safely return light theme when matchMedia is not available (SSR / unsupported)', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(getSystemTheme()).toBe('light');
    expect(resolveThemeMode('system')).toBe('light');
    expect(setupSystemThemeListener()).toBeUndefined();
  });

  it('should update compact and border radius settings', () => {
    useThemeStore.getState().setCompact(true);
    expect(useThemeStore.getState().compact).toBe(true);

    useThemeStore.getState().setBorderRadius(12);
    expect(useThemeStore.getState().borderRadius).toBe(12);
  });

  it('should return correct color preset', () => {
    useThemeStore.getState().setPresetKey('emerald');
    const preset = useThemeStore.getState().getCurrentPreset();
    expect(preset.name).toBe('Emerald Green');
    expect(preset.primary).toBe('#059669');
  });

  it('should recompute resolvedMode upon storage rehydration', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: true, // OS is dark
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    // Trigger rehydration callback with persisted state where mode is system
    const persistOptions = useThemeStore.persist?.getOptions?.();
    const onRehydrate = persistOptions?.onRehydrateStorage?.(useThemeStore.getState());
    if (onRehydrate) {
      onRehydrate(
        {
          ...useThemeStore.getState(),
          mode: 'system',
          resolvedMode: 'light',
        },
        undefined,
      );
    }

    expect(useThemeStore.getState().resolvedMode).toBe('dark');
  });
});
