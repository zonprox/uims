import type {
  DateFormatPattern,
  TimeFormatPattern,
  TimezoneOption,
  TimezoneRegion,
} from '@uims/shared-types';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// Initialize plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(duration);

export { dayjs };

export interface RawTimezoneDefinition {
  value: string;
  name: string;
  region: TimezoneRegion;
  defaultAbbr?: string;
}

export const POPULAR_TIMEZONES: RawTimezoneDefinition[] = [
  // UTC
  { value: 'UTC', name: 'Universal Coordinated Time', region: 'UTC', defaultAbbr: 'UTC' },
  // Asia
  {
    value: 'Asia/Ho_Chi_Minh',
    name: 'Ho Chi Minh City (Hanoi)',
    region: 'Asia',
    defaultAbbr: 'ICT',
  },
  { value: 'Asia/Bangkok', name: 'Bangkok, Jakarta', region: 'Asia', defaultAbbr: 'ICT' },
  { value: 'Asia/Singapore', name: 'Singapore, Kuala Lumpur', region: 'Asia', defaultAbbr: 'SGT' },
  { value: 'Asia/Tokyo', name: 'Tokyo, Osaka', region: 'Asia', defaultAbbr: 'JST' },
  { value: 'Asia/Seoul', name: 'Seoul', region: 'Asia', defaultAbbr: 'KST' },
  { value: 'Asia/Hong_Kong', name: 'Hong Kong', region: 'Asia', defaultAbbr: 'HKT' },
  { value: 'Asia/Shanghai', name: 'Beijing, Shanghai', region: 'Asia', defaultAbbr: 'CST' },
  { value: 'Asia/Taipei', name: 'Taipei', region: 'Asia', defaultAbbr: 'CST' },
  { value: 'Asia/Dubai', name: 'Dubai, Abu Dhabi', region: 'Asia', defaultAbbr: 'GST' },
  { value: 'Asia/Kolkata', name: 'Mumbai, New Delhi', region: 'Asia', defaultAbbr: 'IST' },
  { value: 'Asia/Manila', name: 'Manila', region: 'Asia', defaultAbbr: 'PST' },
  { value: 'Asia/Jakarta', name: 'Jakarta', region: 'Asia', defaultAbbr: 'WIB' },
  { value: 'Asia/Riyadh', name: 'Riyadh', region: 'Asia', defaultAbbr: 'AST' },
  { value: 'Asia/Jerusalem', name: 'Jerusalem, Tel Aviv', region: 'Asia', defaultAbbr: 'IDT' },

  // Americas
  {
    value: 'America/New_York',
    name: 'New York, Washington DC (Eastern)',
    region: 'Americas',
    defaultAbbr: 'EST',
  },
  {
    value: 'America/Chicago',
    name: 'Chicago, Dallas (Central)',
    region: 'Americas',
    defaultAbbr: 'CST',
  },
  {
    value: 'America/Denver',
    name: 'Denver, Phoenix (Mountain)',
    region: 'Americas',
    defaultAbbr: 'MST',
  },
  {
    value: 'America/Los_Angeles',
    name: 'Los Angeles, San Francisco (Pacific)',
    region: 'Americas',
    defaultAbbr: 'PST',
  },
  {
    value: 'America/Anchorage',
    name: 'Anchorage (Alaska)',
    region: 'Americas',
    defaultAbbr: 'AKST',
  },
  { value: 'Pacific/Honolulu', name: 'Honolulu (Hawaii)', region: 'Americas', defaultAbbr: 'HST' },
  { value: 'America/Toronto', name: 'Toronto, Montreal', region: 'Americas', defaultAbbr: 'EST' },
  { value: 'America/Vancouver', name: 'Vancouver', region: 'Americas', defaultAbbr: 'PST' },
  {
    value: 'America/Sao_Paulo',
    name: 'São Paulo, Rio de Janeiro',
    region: 'Americas',
    defaultAbbr: 'BRT',
  },
  { value: 'America/Mexico_City', name: 'Mexico City', region: 'Americas', defaultAbbr: 'CST' },
  { value: 'America/Buenos_Aires', name: 'Buenos Aires', region: 'Americas', defaultAbbr: 'ART' },
  { value: 'America/Bogota', name: 'Bogotá, Lima, Quito', region: 'Americas', defaultAbbr: 'COT' },
  { value: 'America/Santiago', name: 'Santiago', region: 'Americas', defaultAbbr: 'CLT' },

  // Europe
  {
    value: 'Europe/London',
    name: 'London, Edinburgh, Dublin (GMT/BST)',
    region: 'Europe',
    defaultAbbr: 'GMT',
  },
  {
    value: 'Europe/Paris',
    name: 'Paris, Brussels, Amsterdam',
    region: 'Europe',
    defaultAbbr: 'CET',
  },
  { value: 'Europe/Berlin', name: 'Berlin, Frankfurt', region: 'Europe', defaultAbbr: 'CET' },
  { value: 'Europe/Rome', name: 'Rome, Milan', region: 'Europe', defaultAbbr: 'CET' },
  { value: 'Europe/Madrid', name: 'Madrid, Barcelona', region: 'Europe', defaultAbbr: 'CET' },
  { value: 'Europe/Amsterdam', name: 'Amsterdam', region: 'Europe', defaultAbbr: 'CET' },
  { value: 'Europe/Zurich', name: 'Zurich, Geneva', region: 'Europe', defaultAbbr: 'CET' },
  {
    value: 'Europe/Stockholm',
    name: 'Stockholm, Oslo, Copenhagen',
    region: 'Europe',
    defaultAbbr: 'CET',
  },
  { value: 'Europe/Warsaw', name: 'Warsaw', region: 'Europe', defaultAbbr: 'CET' },
  {
    value: 'Europe/Athens',
    name: 'Athens, Bucharest, Helsinki',
    region: 'Europe',
    defaultAbbr: 'EET',
  },
  { value: 'Europe/Dublin', name: 'Dublin', region: 'Europe', defaultAbbr: 'IST' },
  { value: 'Europe/Lisbon', name: 'Lisbon', region: 'Europe', defaultAbbr: 'WET' },
  {
    value: 'Europe/Prague',
    name: 'Prague, Vienna, Bratislava',
    region: 'Europe',
    defaultAbbr: 'CET',
  },

  // Pacific & Australia
  {
    value: 'Australia/Sydney',
    name: 'Sydney, Melbourne, Canberra (AEST/AEDT)',
    region: 'Australia',
    defaultAbbr: 'AEST',
  },
  {
    value: 'Australia/Brisbane',
    name: 'Brisbane (AEST)',
    region: 'Australia',
    defaultAbbr: 'AEST',
  },
  {
    value: 'Australia/Adelaide',
    name: 'Adelaide (ACST/ACDT)',
    region: 'Australia',
    defaultAbbr: 'ACST',
  },
  { value: 'Australia/Perth', name: 'Perth (AWST)', region: 'Australia', defaultAbbr: 'AWST' },
  {
    value: 'Pacific/Auckland',
    name: 'Auckland, Wellington',
    region: 'Pacific',
    defaultAbbr: 'NZST',
  },
  { value: 'Pacific/Fiji', name: 'Fiji, Suva', region: 'Pacific', defaultAbbr: 'FJT' },
  { value: 'Pacific/Guam', name: 'Guam, Saipan', region: 'Pacific', defaultAbbr: 'ChST' },

  // Africa
  { value: 'Africa/Cairo', name: 'Cairo', region: 'Africa', defaultAbbr: 'EET' },
  {
    value: 'Africa/Johannesburg',
    name: 'Johannesburg, Cape Town',
    region: 'Africa',
    defaultAbbr: 'SAST',
  },
  { value: 'Africa/Lagos', name: 'Lagos', region: 'Africa', defaultAbbr: 'WAT' },
  { value: 'Africa/Nairobi', name: 'Nairobi', region: 'Africa', defaultAbbr: 'EAT' },
  { value: 'Africa/Casablanca', name: 'Casablanca', region: 'Africa', defaultAbbr: 'WET' },
];

/**
 * Validates if an IANA timezone identifier is valid in current environment.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns user's browser timezone if valid, fallback to UTC.
 */
export function getBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && isValidTimezone(tz)) {
      return tz;
    }
  } catch {
    // Ignore error
  }
  return 'UTC';
}

/**
 * Returns UTC offset string for a given timezone and reference date, e.g. "+07:00", "-04:00".
 */
export function getTimezoneOffset(
  tz: string,
  referenceDate: string | number | Date = new Date(),
): string {
  try {
    const safeTz = isValidTimezone(tz) ? tz : 'UTC';
    return dayjs(referenceDate).tz(safeTz).format('Z');
  } catch {
    return '+00:00';
  }
}

/**
 * Returns UTC offset in minutes for a given timezone, e.g. 420 for UTC+7, -300 for UTC-5.
 */
export function getTimezoneOffsetMinutes(
  tz: string,
  referenceDate: string | number | Date = new Date(),
): number {
  try {
    const safeTz = isValidTimezone(tz) ? tz : 'UTC';
    const offsetStr = dayjs(referenceDate).tz(safeTz).format('Z');
    const sign = offsetStr.startsWith('-') ? -1 : 1;
    const [hours, minutes] = offsetStr.replace(/^[+-]/, '').split(':').map(Number);
    return sign * (hours * 60 + (minutes || 0));
  } catch {
    return 0;
  }
}

/**
 * Returns timezone abbreviation, e.g. "ICT", "EDT", "EST", "UTC".
 */
export function getTimezoneAbbr(
  tz: string,
  referenceDate: string | number | Date = new Date(),
): string {
  try {
    const safeTz = isValidTimezone(tz) ? tz : 'UTC';
    const parsed = dayjs(referenceDate).tz(safeTz);
    const customAbbr = parsed.format('z');
    if (customAbbr && customAbbr !== 'z') {
      return customAbbr;
    }
    const found = POPULAR_TIMEZONES.find((item) => item.value === tz);
    if (found?.defaultAbbr) {
      return found.defaultAbbr;
    }
    const offset = parsed.format('Z');
    return `UTC${offset}`;
  } catch {
    return 'UTC';
  }
}

/**
 * Computes the full list of timezone options with dynamic UTC offsets and DST.
 */
export function getTimezoneOptions(
  referenceDate: string | number | Date = new Date(),
): TimezoneOption[] {
  return POPULAR_TIMEZONES.map((def) => {
    const offset = getTimezoneOffset(def.value, referenceDate);
    const offsetMinutes = getTimezoneOffsetMinutes(def.value, referenceDate);
    const abbr = getTimezoneAbbr(def.value, referenceDate);
    const label = `(UTC${offset}) ${def.name} [${def.value}]`;

    return {
      value: def.value,
      label,
      name: def.name,
      region: def.region,
      offset,
      offsetMinutes,
      abbr,
    };
  });
}

/**
 * Format a date in a specified timezone.
 */
export function formatInTimezone(
  date: string | number | Date | dayjs.Dayjs | null | undefined,
  tz = 'UTC',
  formatStr = 'YYYY-MM-DD HH:mm:ss',
): string {
  if (!date) return '';
  try {
    const safeTz = isValidTimezone(tz) ? tz : 'UTC';
    return dayjs(date).tz(safeTz).format(formatStr);
  } catch {
    return dayjs(date).format(formatStr);
  }
}

export interface FormatDateTimeOptions {
  timezone?: string;
  format?: DateFormatPattern | string;
  timeFormat?: TimeFormatPattern;
  includeTime?: boolean;
  includeSeconds?: boolean;
  showTimezone?: boolean;
  showOffset?: boolean;
}

function buildTimePattern(timeFormat: '12h' | '24h', includeSeconds: boolean): string {
  if (timeFormat === '12h') {
    return includeSeconds ? ' hh:mm:ss A' : ' hh:mm A';
  }
  return includeSeconds ? ' HH:mm:ss' : ' HH:mm';
}

function buildTimezoneSuffix(
  safeTz: string,
  d: dayjs.Dayjs,
  showTimezone: boolean,
  showOffset: boolean,
  refDate?: Date,
): string {
  if (!showOffset && !showTimezone) return '';
  const offset = d.format('Z');
  const abbr = getTimezoneAbbr(safeTz, refDate);
  if (showTimezone && showOffset) {
    return ` (${abbr} / UTC${offset})`;
  }
  if (showTimezone) {
    return ` (${abbr})`;
  }
  return ` (UTC${offset})`;
}

/**
 * Enterprise date-time formatter supporting dynamic timezones and formats.
 */
export function formatEnterpriseDateTime(
  date: string | number | Date | dayjs.Dayjs | null | undefined,
  options: FormatDateTimeOptions = {},
): string {
  if (!date) return '';
  const {
    timezone = 'UTC',
    format = 'YYYY-MM-DD',
    timeFormat = '24h',
    includeTime = true,
    includeSeconds = true,
    showTimezone = false,
    showOffset = false,
  } = options;

  try {
    const safeTz = isValidTimezone(timezone) ? timezone : 'UTC';
    const d = dayjs(date).tz(safeTz);

    if (!d.isValid()) return '';

    const timePattern = includeTime ? buildTimePattern(timeFormat, includeSeconds) : '';
    const formattedDate = d.format(`${format}${timePattern}`);
    const tzSuffix = buildTimezoneSuffix(
      safeTz,
      d,
      showTimezone,
      showOffset,
      date instanceof Date ? date : undefined,
    );

    return `${formattedDate}${tzSuffix}`;
  } catch {
    return String(date);
  }
}
