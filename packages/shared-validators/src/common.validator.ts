import { z } from 'zod';

// Strict UUID: trimmed and validated
export const uuidSchema = z.string().trim().uuid('Invalid UUID format');

// Enterprise Email: trimmed, lowercased, valid email format, max 255
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .max(255, 'Email cannot exceed 255 characters');

// Enterprise Phone: E.164 and international format support (+84 24 3728 1234, 0912345678, +1 (555) 123-4567)
export const phoneRegex = /^\+?[0-9\s().-]{7,30}$/;
export const phoneSchema = z
  .string()
  .trim()
  .regex(phoneRegex, 'Invalid telephone number format (e.g. +84 24 3728 1234 or 0912345678)')
  .refine((val) => val.replace(/\D/g, '').length >= 7, {
    message: 'Phone number must contain at least 7 digits',
  })
  .max(30, 'Phone number cannot exceed 30 characters');

// URL validation: HTTP / HTTPS / FTP, trimmed, max 255
export const urlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
export const urlSchema = z
  .string()
  .trim()
  .url('Invalid URL format (must include protocol, e.g. https://)')
  .max(255, 'URL cannot exceed 255 characters');

// Currency / Monetary: non-negative float, max 100,000,000, max 2 decimals, IEEE-754 safe
export const currencySchema = z.preprocess(
  (val) => {
    if (typeof val === 'string' && val.trim() !== '') {
      const num = Number(val);
      return isNaN(num) ? val : num;
    }
    return val;
  },
  z
    .number({ message: 'Amount must be a number' })
    .min(0, 'Amount cannot be negative')
    .max(100_000_000, 'Amount cannot exceed 100,000,000')
    .refine((val) => Math.abs(Math.round(val * 100) - val * 100) < 1e-7, {
      message: 'Amount cannot have more than 2 decimal places',
    }),
);

// Date string regex: YYYY-MM-DD or full ISO 8601
export const dateStringRegex =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

// Calendar-validated date string schema
export const dateStringSchema = z
  .string()
  .trim()
  .regex(dateStringRegex, 'Date must be formatted as YYYY-MM-DD or ISO 8601 datetime')
  .refine((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, day] = val.split('-').map(Number);
      return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
    }
    return true;
  }, 'Invalid calendar date');

// Robust date schema: accepts date string or Date object, transforms Date to ISO string
export const dateSchema = z.union([
  dateStringSchema,
  z.date().transform((d) => d.toISOString()),
]);

// Generic Enum Normalizer with Synonym Support
export function normalizedEnum<T extends Record<string, string>>(
  enumObj: T,
  synonyms?: Record<string, T[keyof T]>,
) {
  const allowedValues = new Set(Object.values(enumObj));
  return z.preprocess((val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    if (!trimmed) return trimmed;
    const upper = trimmed.toUpperCase().replace(/\s+/g, '_');
    if (synonyms && synonyms[upper]) return synonyms[upper];
    if (allowedValues.has(upper as T[keyof T])) return upper;
    return trimmed;
  }, z.nativeEnum(enumObj));
}

export const idParamSchema = z.object({
  id: uuidSchema,
});
