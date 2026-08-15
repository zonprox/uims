import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

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

interface ThemeState {
  mode: ThemeMode;
  compact: boolean;
  presetKey: string;
  borderRadius: number;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setCompact: (compact: boolean) => void;
  setPresetKey: (presetKey: string) => void;
  setBorderRadius: (borderRadius: number) => void;
  getCurrentPreset: () => ThemeColorPreset;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      compact: false,
      presetKey: 'blue',
      borderRadius: 6,
      setMode: (mode: ThemeMode) => set({ mode }),
      toggleMode: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
      setCompact: (compact: boolean) => set({ compact }),
      setPresetKey: (presetKey: string) => set({ presetKey }),
      setBorderRadius: (borderRadius: number) => set({ borderRadius }),
      getCurrentPreset: () => {
        const { presetKey } = get();
        return COLOR_PRESETS.find((p) => p.key === presetKey) || COLOR_PRESETS[0];
      },
    }),
    {
      name: 'uims-theme-settings',
    },
  ),
);
