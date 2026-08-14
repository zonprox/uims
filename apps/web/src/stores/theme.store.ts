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

export const COLOR_PRESETS: ThemeColorPreset[] = [
  {
    name: 'Geek Blue',
    key: 'blue',
    primary: '#1677ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
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
    name: 'Emerald Corporate',
    key: 'emerald',
    primary: '#059669',
    success: '#10b981',
    warning: '#eab308',
    error: '#e11d48',
    info: '#0284c7',
  },
  {
    name: 'Vibrant Violet',
    key: 'violet',
    primary: '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#f43f5e',
    info: '#6366f1',
  },
  {
    name: 'Midnight Amber',
    key: 'amber',
    primary: '#d97706',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#dc2626',
    info: '#2563eb',
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
      borderRadius: 8,
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
