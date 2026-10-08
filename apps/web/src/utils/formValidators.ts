import type { Rule } from 'antd/es/form';
import dayjs from 'dayjs';
import {
  CIDR_REGEX,
  IPV4_REGEX,
  IPV6_REGEX,
  MAC_REGEX,
  PHONE_REGEX,
  SKU_REGEX,
  URL_REGEX,
  antdRules,
  zodToAntdRule,
} from '@uims/shared-validators';

// 1. Re-export Authoritative Constants & Adapters from @uims/shared-validators
export {
  CIDR_REGEX,
  IPV4_REGEX,
  IPV6_REGEX,
  MAC_REGEX,
  PHONE_REGEX,
  SKU_REGEX,
  URL_REGEX,
  antdRules,
  zodToAntdRule,
};

/**
 * Type guard to identify Ant Design form validation rejections.
 * When form.validateFields() rejects, it produces an object with an `errorFields` array.
 */
export function isValidationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  if ('errorFields' in err && Array.isArray((err as { errorFields?: unknown }).errorFields)) {
    return true;
  }
  if ('name' in err && (err as { name?: string }).name === 'ValidationError') {
    return true;
  }
  return false;
}

/**
 * Preconfigured Ant Design Form Rule Builders for UIMS Forms.
 */
export const formRules = {
  // Required field with string whitespace trimming
  required: (label: string, customMessage?: string): Rule => ({
    required: true,
    validator(_rule, value) {
      const msg =
        customMessage ||
        (label.toLowerCase().includes('required') ? label : `${label} is required.`);
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error(msg));
      }
      if (typeof value === 'string' && value.trim() === '') {
        return Promise.reject(new Error(msg));
      }
      return Promise.resolve();
    },
  }),

  // String length boundary constraints
  stringRange: (label: string, min: number, max: number, customMessage?: string): Rule => ({
    min,
    max,
    message: customMessage || `${label} must be between ${min} and ${max} characters.`,
  }),

  maxString: (label: string, max: number, customMessage?: string): Rule => ({
    max,
    message: customMessage || `${label} cannot exceed ${max} characters.`,
  }),

  // Corporate Email (max 255)
  email: (label = 'Corporate email', customMessage?: string): Rule => ({
    type: 'email',
    max: 255,
    message: customMessage || `Enter a valid ${label.toLowerCase()}.`,
  }),

  // International Telephone (+84..., 7 to 30 chars)
  phone: (customMessage?: string): Rule => ({
    pattern: PHONE_REGEX,
    message: customMessage || 'Enter a valid telephone number (e.g. +84 222 384 8000).',
  }),

  // Strict IPv4 (rejects octets > 255 and leading zeros)
  ipv4: (customMessage?: string): Rule => ({
    pattern: IPV4_REGEX,
    message: customMessage || 'Enter a valid IPv4 address (e.g. 10.232.130.15).',
  }),

  // Strict IPv4 CIDR (rejects octets > 255, prefix 0..32)
  cidr: (customMessage?: string): Rule => ({
    pattern: CIDR_REGEX,
    message: customMessage || 'Enter a valid IPv4 CIDR block (e.g. 10.232.130.0/24).',
  }),

  // MAC Address (Colon, Dash, Cisco dotted quad, bare 12 hex)
  mac: (customMessage?: string): Rule => ({
    pattern: MAC_REGEX,
    message:
      customMessage ||
      'Enter a valid MAC address (e.g. 00:1B:44:11:3A:B7, 00-1B-44-11-3A-B7, or 001b.4411.3ab7).',
  }),

  // Alphanumeric SKU, Code, or Tag
  sku: (label = 'SKU / Code', customMessage?: string): Rule => ({
    pattern: /^[A-Za-z0-9_-]+$/,
    message:
      customMessage ||
      `${label} can only contain letters, numbers, hyphens, and underscores.`,
  }),

  // Integer range (non-negative or bounded)
  integer: (min = 0, max = 1_000_000, customMessage?: string): Rule => ({
    type: 'integer',
    transform: (value) =>
      value !== undefined && value !== null && value !== '' ? Number(value) : value,
    min,
    max,
    message:
      customMessage ||
      `Must be a whole integer between ${min} and ${max.toLocaleString()}.`,
  }),

  integerRange: (label: string, min = 0, max = 1_000_000, customMessage?: string): Rule => ({
    type: 'integer',
    transform: (value) =>
      value !== undefined && value !== null && value !== '' ? Number(value) : value,
    min,
    max,
    message:
      customMessage ||
      `${label} must be a whole integer between ${min} and ${max.toLocaleString()}.`,
  }),

  // Non-negative currency with max 2 decimal places
  currency: (label = 'Amount', max = 100_000_000, customMessage?: string): Rule => ({
    validator(_rule, value) {
      if (value === undefined || value === null || value === '') return Promise.resolve();
      const num = Number(value);
      if (isNaN(num)) return Promise.reject(new Error(customMessage || `${label} must be a valid number.`));
      if (num < 0) return Promise.reject(new Error(customMessage || `${label} cannot be negative.`));
      if (num > max) return Promise.reject(new Error(customMessage || `${label} cannot exceed ${max.toLocaleString()}.`));
      if (Math.abs(Math.round(num * 100) - num * 100) > 1e-7) {
        return Promise.reject(new Error(customMessage || `${label} cannot have more than 2 decimal places.`));
      }
      return Promise.resolve();
    },
  }),

  // Password length (min 8, max 128)
  password: (min = 8, max = 128): Rule => ({
    min,
    max,
    message: `Password must be between ${min} and ${max} characters long.`,
  }),

  // Chronological Date Validator (ensures laterDate >= earlierDate)
  chronologicalDate: (
    earlierFieldName: string,
    earlierLabel: string,
    laterLabel: string,
  ): Rule => ({ getFieldValue }) => ({
    validator(_, value: unknown) {
      if (!value) return Promise.resolve();
      const earlierVal = getFieldValue(earlierFieldName);
      if (!earlierVal) return Promise.resolve();
      const start = dayjs.isDayjs(earlierVal) ? earlierVal : dayjs(earlierVal as string);
      const end = dayjs.isDayjs(value) ? value : dayjs(value as string);
      if (start.isValid() && end.isValid() && end.isBefore(start, 'day')) {
        return Promise.reject(
          new Error(`${laterLabel} cannot precede ${earlierLabel.toLowerCase()}.`),
        );
      }
      return Promise.resolve();
    },
  }),

  // Valid URL
  url: (label = 'Website URL', customMessage?: string): Rule => ({
    type: 'url',
    max: 255,
    message: customMessage || `${label} must be a valid web URL (e.g. https://company.com).`,
  }),
};
