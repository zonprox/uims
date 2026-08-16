import { beforeEach, describe, expect, it } from 'vitest';
import { useTimezoneStore } from './timezone.store';

describe('useTimezoneStore', () => {
  beforeEach(() => {
    useTimezoneStore.setState({
      timezone: 'UTC',
      mode: 'auto',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      showTimezoneBadge: true,
      systemTimezone: 'UTC',
    });
  });

  it('updates timezone and switches to custom mode', () => {
    useTimezoneStore.getState().setTimezone('Asia/Ho_Chi_Minh');
    expect(useTimezoneStore.getState().timezone).toBe('Asia/Ho_Chi_Minh');
    expect(useTimezoneStore.getState().mode).toBe('custom');
  });

  it('updates date and time formats', () => {
    useTimezoneStore.getState().setDateFormat('DD/MM/YYYY');
    expect(useTimezoneStore.getState().dateFormat).toBe('DD/MM/YYYY');

    useTimezoneStore.getState().setTimeFormat('12h');
    expect(useTimezoneStore.getState().timeFormat).toBe('12h');
  });

  it('formats dates consistently using the active timezone', () => {
    useTimezoneStore.getState().setTimezone('Asia/Ho_Chi_Minh');
    useTimezoneStore.getState().setDateFormat('YYYY-MM-DD');

    const sampleDate = '2026-08-15T05:00:00.000Z';
    const formatted = useTimezoneStore.getState().formatDateTime(sampleDate, {
      showOffset: true,
    });

    expect(formatted).toContain('2026-08-15 12:00:00');
    expect(formatted).toContain('UTC+07:00');
  });

  it('returns timezone info summary', () => {
    useTimezoneStore.getState().setTimezone('Asia/Tokyo');
    const info = useTimezoneStore.getState().getTimezoneInfo();
    expect(info.effectiveTimezone).toBe('Asia/Tokyo');
    expect(info.offset).toBe('+09:00');
  });
});
