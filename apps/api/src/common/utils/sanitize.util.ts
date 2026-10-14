export const REDACTED_VALUE = '[REDACTED]';

export const SENSITIVE_KEY_PATTERNS: readonly string[] = [
  'password',
  'token',
  'secret',
  'licensekey',
  'pin',
  'salt',
  'cred',
  'credential',
  'apikey',
  'privatekey',
  'authkey',
  'accesskey',
  'secretkey',
  'recoverycode',
  'creditcard',
  'cvv',
  'authorization',
  'authheader',
  'sessionid',
  'ssn',
  'connectionstring',
];

export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  if (normalized === 'auth' || normalized === 'key') {
    return true;
  }
  if (normalized.endsWith('key')) {
    return true;
  }
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Recursively sanitizes any payload, masking sensitive fields (passwords, tokens,
 * secrets, credentials, license keys) with '[REDACTED]'.
 *
 * Handles circular references, binary data, Date instances, and recursion depth limits.
 */
export function sanitizePayload(
  obj: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
  maxDepth = 8,
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return Number.isNaN(obj.getTime()) ? null : obj.toISOString();
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) {
    return '[BINARY BUFFER]';
  }

  if (obj instanceof Uint8Array) {
    return '[BINARY DATA]';
  }

  if (depth >= maxDepth) {
    return '[TRUNCATED]';
  }

  if (seen.has(obj)) {
    return '[CIRCULAR]';
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item, seen, depth + 1, maxDepth));
  }

  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      copy[key] = REDACTED_VALUE;
    } else if (typeof value === 'object' && value !== null) {
      copy[key] = sanitizePayload(value, seen, depth + 1, maxDepth);
    } else {
      copy[key] = value;
    }
  }

  return copy;
}
