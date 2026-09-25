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
