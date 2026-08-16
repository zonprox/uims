export type TimezoneRegion =
  | 'UTC'
  | 'Americas'
  | 'Europe'
  | 'Asia'
  | 'Pacific'
  | 'Africa'
  | 'Atlantic'
  | 'Indian'
  | 'Australia'
  | 'Other';

export type DateFormatPattern =
  | 'YYYY-MM-DD'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY/MM/DD'
  | 'YYYY.MM.DD'
  | 'MMMM D, YYYY'
  | 'D MMM YYYY';

export type TimeFormatPattern = '24h' | '12h';

export interface TimezoneOption {
  value: string; // IANA identifier, e.g. "Asia/Ho_Chi_Minh"
  label: string; // User-friendly label, e.g. "(UTC+07:00) Bangkok, Hanoi, Jakarta (ICT)"
  name: string; // City / Territory name, e.g. "Ho Chi Minh City"
  region: TimezoneRegion;
  offset: string; // e.g. "+07:00"
  offsetMinutes: number; // e.g. 420
  abbr?: string; // e.g. "ICT"
}

export interface TimezonePreference {
  timezone: string;
  mode: 'auto' | 'custom';
  dateFormat: DateFormatPattern;
  timeFormat: TimeFormatPattern;
  showTimezoneBadge: boolean;
}

export interface SystemTimeInfo {
  serverTimeIso: string;
  serverTimezone: string;
  serverOffset: string;
  timestampMs: number;
}
