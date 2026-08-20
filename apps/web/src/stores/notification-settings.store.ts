import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationCategoryPreferences {
  alerts: boolean;
  tasks: boolean;
  general: boolean;
  system: boolean;
}

export interface NotificationSettingsState {
  soundEnabled: boolean;
  soundVolume: number; // 0 to 1
  toastEnabled: boolean;
  toastDuration: number; // in seconds
  categories: NotificationCategoryPreferences;
  setSoundEnabled: (soundEnabled: boolean) => void;
  setSoundVolume: (soundVolume: number) => void;
  setToastEnabled: (toastEnabled: boolean) => void;
  setToastDuration: (toastDuration: number) => void;
  setCategoryPreference: (
    category: keyof NotificationCategoryPreferences,
    enabled: boolean,
  ) => void;
  setCategories: (categories: Partial<NotificationCategoryPreferences>) => void;
  resetToDefaults: () => void;
  playTestChime: () => void;
}

export const DEFAULT_NOTIFICATION_SETTINGS = {
  soundEnabled: true,
  soundVolume: 0.5,
  toastEnabled: true,
  toastDuration: 4.5,
  categories: {
    alerts: true,
    tasks: true,
    general: true,
    system: true,
  },
};

export function playNotificationChime(volume = 0.5): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    const scaledGain = Math.max(0.001, Math.min(1, volume)) * 0.15;
    gain.gain.setValueAtTime(scaledGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Audio synthesis optional / unsupported in mock environments
  }
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      setSoundEnabled: (soundEnabled: boolean) => set({ soundEnabled }),
      setSoundVolume: (soundVolume: number) =>
        set({ soundVolume: Math.max(0, Math.min(1, soundVolume)) }),
      setToastEnabled: (toastEnabled: boolean) => set({ toastEnabled }),
      setToastDuration: (toastDuration: number) =>
        set({ toastDuration: Math.max(1, Math.min(30, toastDuration)) }),
      setCategoryPreference: (category: keyof NotificationCategoryPreferences, enabled: boolean) =>
        set((state) => ({
          categories: {
            ...state.categories,
            [category]: enabled,
          },
        })),
      setCategories: (categories: Partial<NotificationCategoryPreferences>) =>
        set((state) => ({
          categories: {
            ...state.categories,
            ...categories,
          },
        })),
      resetToDefaults: () => set(DEFAULT_NOTIFICATION_SETTINGS),
      playTestChime: () => {
        const { soundEnabled, soundVolume } = get();
        if (soundEnabled) {
          playNotificationChime(soundVolume);
        }
      },
    }),
    {
      name: 'uims-notification-settings',
    },
  ),
);
