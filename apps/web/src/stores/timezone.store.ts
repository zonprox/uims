import type { DateFormatPattern, TimeFormatPattern } from '@uims/shared-types';
import {
  formatDate as formatSharedDate,
  formatDateTime as formatSharedDateTime,
  formatTime as formatSharedTime,
  fromNow as formatSharedFromNow,
  getBrowserTimezone,
  getTimezoneAbbr,
  getTimezoneOffset,
  isValidTimezone,
} from '@uims/shared-utils';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimezoneState {
  timezone: string;
  mode: 'auto' | 'custom';
  dateFormat: DateFormatPattern;
  timeFormat: TimeFormatPattern;
  showTimezoneBadge: boolean;
  systemTimezone: string;

  // Actions
  setTimezone: (tz: string) => void;
  setMode: (mode: 'auto' | 'custom') => void;
  setDateFormat: (dateFormat: DateFormatPattern) => void;
  setTimeFormat: (timeFormat: TimeFormatPattern) => void;
  setShowTimezoneBadge: (show: boolean) => void;
  setSystemTimezone: (systemTimezone: string) => void;
  detectBrowserTimezone: () => string;
  getEffectiveTimezone: () => string;

  // Formatting helpers bound to current store state
  formatDate: (
    date: string | number | Date | null | undefined,
    customFormat?: DateFormatPattern | string,
  ) => string;
  formatDateTime: (
    date: string | number | Date | null | undefined,
    options?: {
      format?: DateFormatPattern | string;
      showOffset?: boolean;
      showTimezone?: boolean;
      includeSeconds?: boolean;
    },
  ) => string;
  formatTime: (
    date: string | number | Date | null | undefined,
    options?: { includeSeconds?: boolean },
  ) => string;
  fromNow: (date: string | number | Date | null | undefined) => string;
  getTimezoneInfo: () => {
    effectiveTimezone: string;
    offset: string;
    abbr: string;
    isAuto: boolean;
  };
}

export const useTimezoneStore = create<TimezoneState>()(
  persist(
    (set, get) => {
      const browserTz = getBrowserTimezone();

      return {
        timezone: browserTz || 'UTC',
        mode: 'auto',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        showTimezoneBadge: true,
        systemTimezone: 'UTC',

        setTimezone: (tz: string) => {
          if (isValidTimezone(tz)) {
            set({ timezone: tz, mode: 'custom' });
          }
        },

        setMode: (mode: 'auto' | 'custom') => {
          if (mode === 'auto') {
            const detected = getBrowserTimezone();
            set({ mode: 'auto', timezone: detected });
          } else {
            set({ mode: 'custom' });
          }
        },

        setDateFormat: (dateFormat: DateFormatPattern) => set({ dateFormat }),

        setTimeFormat: (timeFormat: TimeFormatPattern) => set({ timeFormat }),

        setShowTimezoneBadge: (showTimezoneBadge: boolean) => set({ showTimezoneBadge }),

        setSystemTimezone: (systemTimezone: string) => {
          if (isValidTimezone(systemTimezone)) {
            set({ systemTimezone });
          }
        },

        detectBrowserTimezone: () => {
          const detected = getBrowserTimezone();
          set({ timezone: detected, mode: 'auto' });
          return detected;
        },

        getEffectiveTimezone: () => {
          const { mode, timezone } = get();
          if (mode === 'auto') {
            return getBrowserTimezone() || timezone || 'UTC';
          }
          return timezone || 'UTC';
        },

        formatDate: (date, customFormat) => {
          const tz = get().getEffectiveTimezone();
          const format = customFormat || get().dateFormat;
          return formatSharedDate(date, { format, timezone: tz });
        },

        formatDateTime: (date, options = {}) => {
          const tz = get().getEffectiveTimezone();
          const { dateFormat, timeFormat } = get();
          return formatSharedDateTime(date, {
            timezone: tz,
            format: options.format || dateFormat,
            timeFormat,
            includeTime: true,
            includeSeconds: options.includeSeconds ?? true,
            showOffset: options.showOffset,
            showTimezone: options.showTimezone,
          });
        },

        formatTime: (date, options = {}) => {
          const tz = get().getEffectiveTimezone();
          const { timeFormat } = get();
          return formatSharedTime(date, {
            timezone: tz,
            use24Hour: timeFormat === '24h',
            includeSeconds: options.includeSeconds ?? true,
          });
        },

        fromNow: (date) => {
          return formatSharedFromNow(date);
        },

        getTimezoneInfo: () => {
          const effectiveTimezone = get().getEffectiveTimezone();
          const isAuto = get().mode === 'auto';
          const offset = getTimezoneOffset(effectiveTimezone);
          const abbr = getTimezoneAbbr(effectiveTimezone);
          return {
            effectiveTimezone,
            offset,
            abbr,
            isAuto,
          };
        },
      };
    },
    {
      name: 'uims-timezone-preferences',
    },
  ),
);
