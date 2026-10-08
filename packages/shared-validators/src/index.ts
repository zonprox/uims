import { z } from 'zod';
import { phoneRegex, urlRegex } from './common.validator';
import { skuRegex } from './inventory.validator';
import { cidrRegex, ipv4Regex, ipv6Regex, macRegex } from './network.validator';

// 1. Domain Validator Module Exports
export * from './asset.validator';
export * from './audit.validator';
export * from './auth.validator';
export * from './common.validator';
export * from './directory.validator';
export * from './inventory.validator';
export * from './license.validator';
export * from './network.validator';
export * from './notification.validator';
export * from './organization.validator';
export * from './pagination.validator';
export * from './role.validator';
export * from './user.validator';
export * from './vendor.validator';

// 2. Authoritative Format Regular Expression Constants
export const IPV4_REGEX = ipv4Regex;
export const IPV6_REGEX = ipv6Regex;
export const CIDR_REGEX = cidrRegex;
export const MAC_REGEX = macRegex;
export const PHONE_REGEX = phoneRegex;
export const URL_REGEX = urlRegex;
export const SKU_REGEX = skuRegex;

// 3. Ant Design Client Form Rule Adapters
export interface AntdRule {
  validator(_rule: unknown, value: unknown): Promise<void>;
}

/**
 * Wraps a Zod schema into an Ant Design Form.Item custom validator.
 * Automatically skips validation when the value is blank if the schema allows optional/nullable.
 */
export function zodToAntdRule(schema: z.ZodTypeAny, customErrorMessage?: string): AntdRule {
  return {
    async validator(_rule: unknown, value: unknown): Promise<void> {
      // 1. Direct validation first: if schema parses value as-is, resolve immediately
      // Whitespace-only strings on required schemas must not bypass required validation
      const direct = schema.safeParse(value);
      const isWhitespaceOnly = typeof value === 'string' && value.length > 0 && value.trim() === '';
      const isOptionalOrNullable = schema.safeParse(undefined).success || schema.safeParse(null).success;

      if (direct.success && (!isWhitespaceOnly || isOptionalOrNullable)) {
        return Promise.resolve();
      }

      // 2. Check if the value is blank (undefined, null, empty string, or whitespace-only string)
      const isBlank =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '');

      if (isBlank) {
        // If blank: if schema allows undefined or null (optional/nullable), resolve cleanly
        if (isOptionalOrNullable) {
          return Promise.resolve();
        }

        // If blank on required field: format concise user-facing error message
        const firstError = customErrorMessage || 'This field is required';
        return Promise.reject(new Error(firstError));
      }

      // 3. If non-blank but invalid: return Promise.reject with message
      const firstError =
        customErrorMessage ||
        direct.error?.issues[0]?.message ||
        'Validation failed';
      return Promise.reject(new Error(firstError));
    },
  };
}

/**
 * Pre-configured Ant Design Rule builders for rapid form authoring in apps/web.
 */
export const antdRules = {
  ipv4: (message = 'Enter a valid IPv4 address (e.g. 10.232.130.15)') => ({
    pattern: IPV4_REGEX,
    message,
  }),
  cidr: (message = 'Enter a valid IPv4 CIDR block (e.g. 10.232.130.0/24)') => ({
    pattern: CIDR_REGEX,
    message,
  }),
  mac: (
    message = 'Enter a valid MAC address format (e.g. 00:1B:44:11:3A:B7 or 001b.4411.3ab7)',
  ) => ({
    pattern: MAC_REGEX,
    message,
  }),
  phone: (message = 'Enter a valid telephone number (e.g. +84 222 384 8000)') => ({
    pattern: PHONE_REGEX,
    message,
  }),
  skuOrCode: (label = 'Code') => ({
    pattern: SKU_REGEX,
    message: `${label} can only contain letters, numbers, hyphens, and underscores`,
  }),
  fromZod: (schema: z.ZodTypeAny, customMessage?: string) =>
    zodToAntdRule(schema, customMessage),
};
