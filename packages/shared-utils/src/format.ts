import type { DateFormatPattern } from '@uims/shared-types';
import {
  type FormatDateTimeOptions,
  dayjs,
  formatEnterpriseDateTime,
  formatInTimezone,
  getBrowserTimezone,
  getTimezoneAbbr,
  getTimezoneOffset,
  getTimezoneOffsetMinutes,
  getTimezoneOptions,
  isValidTimezone,
} from './timezone';

export {
  dayjs,
  formatEnterpriseDateTime,
  formatInTimezone,
  getBrowserTimezone,
  getTimezoneAbbr,
  getTimezoneOffset,
  getTimezoneOffsetMinutes,
  getTimezoneOptions,
  isValidTimezone,
};

export type { FormatDateTimeOptions };

/**
 * Format a date string or Date object with optional custom format and timezone.
 */
export function formatDate(
  date: string | number | Date | dayjs.Dayjs | null | undefined,
  formatOrOptions:
    | string
    | { format?: DateFormatPattern | string; timezone?: string } = 'YYYY-MM-DD',
  tz?: string,
): string {
  if (!date) return '';

  let format = 'YYYY-MM-DD';
  let timezone = tz;

  if (typeof formatOrOptions === 'string') {
    format = formatOrOptions;
  } else if (formatOrOptions && typeof formatOrOptions === 'object') {
    if (formatOrOptions.format) format = formatOrOptions.format;
    if (formatOrOptions.timezone) timezone = formatOrOptions.timezone;
  }

  if (timezone) {
    return formatInTimezone(date, timezone, format);
  }

  return dayjs(date).format(format);
}

/**
 * Format a date-time string with optional timezone and formatting options.
 */
export function formatDateTime(
  date: string | number | Date | dayjs.Dayjs | null | undefined,
  optionsOrFormat?: string | FormatDateTimeOptions,
  tz?: string,
): string {
  if (!date) return '';

  if (typeof optionsOrFormat === 'string') {
    if (tz) {
      return formatInTimezone(date, tz, optionsOrFormat);
    }
    return dayjs(date).format(optionsOrFormat);
  }

  if (optionsOrFormat && typeof optionsOrFormat === 'object') {
    return formatEnterpriseDateTime(date, optionsOrFormat);
  }

  if (tz) {
    return formatInTimezone(date, tz, 'YYYY-MM-DD HH:mm:ss');
  }

  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Format time only (e.g. 14:30:00 or 02:30:00 PM).
 */
export function formatTime(
  date: string | number | Date | dayjs.Dayjs | null | undefined,
  options?: { timezone?: string; use24Hour?: boolean; includeSeconds?: boolean },
): string {
  if (!date) return '';
  const { timezone, use24Hour = true, includeSeconds = true } = options || {};
  const pattern = use24Hour
    ? includeSeconds
      ? 'HH:mm:ss'
      : 'HH:mm'
    : includeSeconds
      ? 'hh:mm:ss A'
      : 'hh:mm A';

  if (timezone) {
    return formatInTimezone(date, timezone, pattern);
  }
  return dayjs(date).format(pattern);
}

/**
 * Format relative time (e.g. "5 minutes ago", "in 2 days").
 */
export function fromNow(date: string | number | Date | dayjs.Dayjs | null | undefined): string {
  if (!date) return '';
  return dayjs(date).fromNow();
}

/**
 * Format a number as currency.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format raw byte size into human readable string.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to human readable string (e.g., 2d 4h 12m 30s).
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
}
