import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  useNotificationSettingsStore,
} from './notification-settings.store';

describe('notification-settings.store', () => {
  beforeEach(() => {
    act(() => {
      useNotificationSettingsStore.getState().resetToDefaults();
    });
  });

  it('initializes with default settings', () => {
    const state = useNotificationSettingsStore.getState();
    expect(state.soundEnabled).toBe(true);
    expect(state.soundVolume).toBe(0.5);
    expect(state.toastEnabled).toBe(true);
    expect(state.toastDuration).toBe(4.5);
    expect(state.categories).toEqual(DEFAULT_NOTIFICATION_SETTINGS.categories);
  });

  it('updates sound toggle and volume level within bounds', () => {
    act(() => {
      useNotificationSettingsStore.getState().setSoundEnabled(false);
      useNotificationSettingsStore.getState().setSoundVolume(0.8);
    });

    let state = useNotificationSettingsStore.getState();
    expect(state.soundEnabled).toBe(false);
    expect(state.soundVolume).toBe(0.8);

    act(() => {
      useNotificationSettingsStore.getState().setSoundVolume(1.5); // clamped to 1
    });
    state = useNotificationSettingsStore.getState();
    expect(state.soundVolume).toBe(1);

    act(() => {
      useNotificationSettingsStore.getState().setSoundVolume(-0.2); // clamped to 0
    });
    state = useNotificationSettingsStore.getState();
    expect(state.soundVolume).toBe(0);
  });

  it('updates toast alert enabled and duration within bounds', () => {
    act(() => {
      useNotificationSettingsStore.getState().setToastEnabled(false);
      useNotificationSettingsStore.getState().setToastDuration(10);
    });

    let state = useNotificationSettingsStore.getState();
    expect(state.toastEnabled).toBe(false);
    expect(state.toastDuration).toBe(10);

    act(() => {
      useNotificationSettingsStore.getState().setToastDuration(50); // clamped to 30
    });
    state = useNotificationSettingsStore.getState();
    expect(state.toastDuration).toBe(30);

    act(() => {
      useNotificationSettingsStore.getState().setToastDuration(0.5); // clamped to 1
    });
    state = useNotificationSettingsStore.getState();
    expect(state.toastDuration).toBe(1);
  });

  it('updates category preferences individually and in batch', () => {
    act(() => {
      useNotificationSettingsStore.getState().setCategoryPreference('tasks', false);
    });
    let state = useNotificationSettingsStore.getState();
    expect(state.categories.tasks).toBe(false);
    expect(state.categories.alerts).toBe(true);

    act(() => {
      useNotificationSettingsStore.getState().setCategories({ alerts: false, general: false });
    });
    state = useNotificationSettingsStore.getState();
    expect(state.categories.alerts).toBe(false);
    expect(state.categories.general).toBe(false);
    expect(state.categories.tasks).toBe(false);
    expect(state.categories.system).toBe(true);
  });

  it('resets state back to factory defaults', () => {
    act(() => {
      useNotificationSettingsStore.getState().setSoundEnabled(false);
      useNotificationSettingsStore.getState().setSoundVolume(0.1);
      useNotificationSettingsStore.getState().setToastEnabled(false);
      useNotificationSettingsStore.getState().setCategories({ alerts: false, system: false });
    });

    act(() => {
      useNotificationSettingsStore.getState().resetToDefaults();
    });

    const state = useNotificationSettingsStore.getState();
    expect(state.soundEnabled).toBe(true);
    expect(state.soundVolume).toBe(0.5);
    expect(state.toastEnabled).toBe(true);
    expect(state.toastDuration).toBe(4.5);
    expect(state.categories.alerts).toBe(true);
    expect(state.categories.system).toBe(true);
  });
});
