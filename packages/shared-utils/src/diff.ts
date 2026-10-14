export interface FieldDiffResult {
  hasChanges: boolean;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  changedKeys: string[];
}

export interface ComputeFieldDiffOptions {
  excludeKeys?: string[];
  ignoredKeys?: string[];
  sensitiveKeys?: string[];
}

const DEFAULT_EXCLUDED_KEYS: readonly string[] = ['createdAt', 'updatedAt'];

const DEFAULT_SENSITIVE_PATTERNS: readonly string[] = [
  'password',
  'token',
  'secret',
  'licensekey',
  'pin',
  'salt',
  'cred',
  'apikey',
  'privatekey',
  'authkey',
  'accesskey',
  'secretkey',
  'recoverycode',
  'creditcard',
  'cvv',
  'authorization',
  'sessionid',
  'ssn',
];

export const REDACTED_VALUE = '[REDACTED]';

export function isSensitiveFieldKey(key: string, customSensitiveKeys?: string[]): boolean {
  if (
    customSensitiveKeys &&
    customSensitiveKeys.some((k) => k.toLowerCase() === key.toLowerCase())
  ) {
    return true;
  }
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  if (normalized === 'key' || normalized === 'auth') {
    return true;
  }
  if (normalized.endsWith('key')) {
    return true;
  }
  return DEFAULT_SENSITIVE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isDateInstance(val: unknown): val is Date {
  return val instanceof Date && !isNaN(val.getTime());
}

function isIsoDateString(val: unknown): val is string {
  if (typeof val !== 'string' || val.length < 10) return false;
  // ISO date format rough check: YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(val);
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a === null && b === undefined) return true;
  if (a === undefined && b === null) return true;

  if (isDateInstance(a) && isDateInstance(b)) {
    return a.getTime() === b.getTime();
  }

  if (isDateInstance(a) && isIsoDateString(b)) {
    const parsedB = new Date(b).getTime();
    return !isNaN(parsedB) && a.getTime() === parsedB;
  }

  if (isIsoDateString(a) && isDateInstance(b)) {
    const parsedA = new Date(a).getTime();
    return !isNaN(parsedA) && parsedA === b.getTime();
  }

  if (isIsoDateString(a) && isIsoDateString(b)) {
    const parsedA = new Date(a).getTime();
    const parsedB = new Date(b).getTime();
    if (!isNaN(parsedA) && !isNaN(parsedB)) {
      return parsedA === parsedB;
    }
  }

  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  return false;
}

function formatDiffValue(val: unknown): unknown {
  if (val === undefined || val === null) {
    return null;
  }
  if (isDateInstance(val)) {
    return val.toISOString();
  }
  return val;
}

/**
 * Computes granular, field-level differences between two entity state snapshots.
 *
 * - Automatically excludes transient metadata fields (createdAt, updatedAt).
 * - Masks sensitive keys (passwords, tokens, secrets, license keys, credentials).
 * - Normalizes dates and nested values.
 * - Returns null oldValue / newValue when hasChanges is false.
 */
export function computeFieldDiff(
  oldState: Record<string, unknown> | null | undefined,
  newState: Record<string, unknown> | null | undefined,
  options?: ComputeFieldDiffOptions,
): FieldDiffResult {
  const oldObj = oldState ?? {};
  const newObj = newState ?? {};

  const excluded = new Set<string>([
    ...DEFAULT_EXCLUDED_KEYS,
    ...(options?.excludeKeys ?? []),
    ...(options?.ignoredKeys ?? []),
  ]);

  const allKeys = new Set<string>([...Object.keys(oldObj), ...Object.keys(newObj)]);

  const changedKeys: string[] = [];
  const diffOldValue: Record<string, unknown> = {};
  const diffNewValue: Record<string, unknown> = {};

  for (const key of allKeys) {
    if (excluded.has(key)) {
      continue;
    }

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (!areValuesEqual(oldVal, newVal)) {
      changedKeys.push(key);

      const isSensitive = isSensitiveFieldKey(key, options?.sensitiveKeys);

      if (isSensitive) {
        diffOldValue[key] = oldVal !== undefined && oldVal !== null ? REDACTED_VALUE : null;
        diffNewValue[key] = newVal !== undefined && newVal !== null ? REDACTED_VALUE : null;
      } else {
        diffOldValue[key] = formatDiffValue(oldVal);
        diffNewValue[key] = formatDiffValue(newVal);
      }
    }
  }

  // Sort changed keys for deterministic output
  changedKeys.sort();

  if (changedKeys.length === 0) {
    return {
      hasChanges: false,
      oldValue: null,
      newValue: null,
      changedKeys: [],
    };
  }

  return {
    hasChanges: true,
    oldValue: diffOldValue,
    newValue: diffNewValue,
    changedKeys,
  };
}
