import { describe, expect, it } from 'vitest';
import {
  formatEnterpriseDateTime,
  formatInTimezone,
  getBrowserTimezone,
  getTimezoneAbbr,
  getTimezoneOffset,
  getTimezoneOffsetMinutes,
  getTimezoneOptions,
  isValidTimezone,
} from './timezone';

describe('Timezone Utilities (Best Practice 2026)', () => {
  it('validates IANA timezones correctly', () => {
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('Invalid/Timezone_XYZ')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
  });

  it('detects browser timezone or returns fallback', () => {
    const tz = getBrowserTimezone();
    expect(typeof tz).toBe('string');
    expect(isValidTimezone(tz)).toBe(true);
  });

  it('calculates timezone offset accurately', () => {
    // 2026-08-15 UTC
    const refDate = '2026-08-15T12:00:00Z';
    expect(getTimezoneOffset('UTC', refDate)).toBe('+00:00');
    expect(getTimezoneOffset('Asia/Ho_Chi_Minh', refDate)).toBe('+07:00');
    expect(getTimezoneOffset('Asia/Tokyo', refDate)).toBe('+09:00');
    // EDT is UTC-4 in August
    expect(getTimezoneOffset('America/New_York', refDate)).toBe('-04:00');
  });

  it('calculates offset minutes correctly', () => {
    const refDate = '2026-08-15T12:00:00Z';
    expect(getTimezoneOffsetMinutes('UTC', refDate)).toBe(0);
    expect(getTimezoneOffsetMinutes('Asia/Ho_Chi_Minh', refDate)).toBe(420);
    expect(getTimezoneOffsetMinutes('America/New_York', refDate)).toBe(-240);
  });

  it('formats dates in specific timezones', () => {
    const refDate = '2026-08-15T05:00:00.000Z';
    // In UTC: 05:00
    expect(formatInTimezone(refDate, 'UTC', 'YYYY-MM-DD HH:mm')).toBe('2026-08-15 05:00');
    // In Asia/Ho_Chi_Minh (+7): 12:00
    expect(formatInTimezone(refDate, 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH:mm')).toBe(
      '2026-08-15 12:00',
    );
    // In America/New_York (-4 in summer): 01:00
    expect(formatInTimezone(refDate, 'America/New_York', 'YYYY-MM-DD HH:mm')).toBe(
      '2026-08-15 01:00',
    );
  });

  it('generates rich timezone options catalog with dynamic offsets', () => {
    const options = getTimezoneOptions('2026-08-15T12:00:00Z');
    expect(options.length).toBeGreaterThan(15);
    const vnOption = options.find((o) => o.value === 'Asia/Ho_Chi_Minh');
    expect(vnOption).toBeDefined();
    expect(vnOption?.offset).toBe('+07:00');
    expect(vnOption?.region).toBe('Asia');
  });

  it('formats enterprise date time with 12h/24h and timezone tags', () => {
    const refDate = '2026-08-15T05:30:00.000Z';
    const formatted24h = formatEnterpriseDateTime(refDate, {
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'YYYY-MM-DD',
      timeFormat: '24h',
      showOffset: true,
    });
    expect(formatted24h).toBe('2026-08-15 12:30:00 (UTC+07:00)');

    const formatted12h = formatEnterpriseDateTime(refDate, {
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'DD/MM/YYYY',
      timeFormat: '12h',
      showOffset: true,
    });
    expect(formatted12h).toBe('15/08/2026 12:30:00 PM (UTC+07:00)');
  });
});
