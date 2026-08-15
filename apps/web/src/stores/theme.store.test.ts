import { beforeEach, describe, expect, it } from 'vitest';
import { useThemeStore } from './theme.store';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      mode: 'light',
      compact: false,
      presetKey: 'blue',
      borderRadius: 6,
    });
  });

  it('should have initial default state', () => {
    const state = useThemeStore.getState();
    expect(state.mode).toBe('light');
    expect(state.compact).toBe(false);
    expect(state.presetKey).toBe('blue');
    expect(state.borderRadius).toBe(6);
  });

  it('should toggle and set mode', () => {
    useThemeStore.getState().toggleMode();
    expect(useThemeStore.getState().mode).toBe('dark');

    useThemeStore.getState().setMode('light');
    expect(useThemeStore.getState().mode).toBe('light');
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
});
