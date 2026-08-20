import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

export interface ThemeColorPreset {
  name: string;
  key: string;
  primary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export const COLOR_PRESETS: Array<ThemeColorPreset> = [
  {
    name: 'Enterprise Blue',
    key: 'blue',
    primary: '#1677ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#1677ff',
  },
  {
    name: 'Tech Indigo',
    key: 'indigo',
    primary: '#4f46e5',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  {
    name: 'Cyber Teal',
    key: 'teal',
    primary: '#0d9488',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e',
    info: '#06b6d4',
  },
  {
    name: 'Emerald Green',
    key: 'emerald',
    primary: '#059669',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#e11d48',
    info: '#0284c7',
  },
  {
    name: 'Slate Minimal',
    key: 'slate',
    primary: '#334155',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  {
    name: 'Royal Violet',
    key: 'violet',
    primary: '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e',
    info: '#6366f1',
  },
];

export function getSystemTheme(): ResolvedThemeMode {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

interface ThemeState {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  compact: boolean;
  presetKey: string;
  borderRadius: number;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setCompact: (compact: boolean) => void;
  setPresetKey: (presetKey: string) => void;
  setBorderRadius: (borderRadius: number) => void;
  getCurrentPreset: () => ThemeColorPreset;
  getResolvedMode: () => ResolvedThemeMode;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      resolvedMode: 'light',
      compact: false,
      presetKey: 'blue',
      borderRadius: 6,
      setMode: (mode: ThemeMode) =>
        set({
          mode,
          resolvedMode: resolveThemeMode(mode),
        }),
      toggleMode: () => {
        const currentResolved = resolveThemeMode(get().mode);
        const nextMode: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
        set({
          mode: nextMode,
          resolvedMode: nextMode,
        });
      },
      setCompact: (compact: boolean) => set({ compact }),
      setPresetKey: (presetKey: string) => set({ presetKey }),
      setBorderRadius: (borderRadius: number) => set({ borderRadius }),
      getCurrentPreset: () => {
        const { presetKey } = get();
        return COLOR_PRESETS.find((p) => p.key === presetKey) || COLOR_PRESETS[0];
      },
      getResolvedMode: () => resolveThemeMode(get().mode),
    }),
    {
      name: 'uims-theme-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          useThemeStore.setState({
            resolvedMode: resolveThemeMode(state.mode),
          });
        }
      },
    },
  ),
);

// Listen for system theme preference changes
export function setupSystemThemeListener(): (() => void) | undefined {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return undefined;
  }

  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e?: MediaQueryListEvent | MediaQueryList) => {
      const state = useThemeStore.getState();
      if (state.mode === 'system') {
        const newResolved: ResolvedThemeMode =
          e && typeof e.matches === 'boolean' ? (e.matches ? 'dark' : 'light') : getSystemTheme();
        if (state.resolvedMode !== newResolved) {
          useThemeStore.setState({ resolvedMode: newResolved });
        }
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  } catch {
    // Ignore matchMedia listener registration errors in unsupported environments
  }
  return undefined;
}

// Automatically initialize system theme listener in browser environment
setupSystemThemeListener();
