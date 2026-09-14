import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM per NIST SP 800-38D
const AUTH_TAG_LENGTH = 16; // 128 bits
const ENCRYPTION_PREFIX = 'enc:v1:';

/**
 * Derives a 256-bit symmetric encryption key from environment secrets via SHA-256.
 * Resolution precedence:
 *   1. process.env.LICENSE_ENCRYPTION_KEY
 *   2. process.env.AUDIT_SIGNING_KEY
 *   3. process.env.JWT_SECRET
 */
export function getLicenseEncryptionKey(): Buffer {
  const secret =
    process.env.LICENSE_ENCRYPTION_KEY || process.env.AUDIT_SIGNING_KEY || process.env.JWT_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'Encryption key resolution failed: LICENSE_ENCRYPTION_KEY, AUDIT_SIGNING_KEY, or JWT_SECRET is required',
    );
  }

  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Checks whether a value is an encrypted license key in `enc:v1:` format.
 */
export function isLicenseKeyEncrypted(val: unknown): boolean {
  return typeof val === 'string' && val.startsWith(ENCRYPTION_PREFIX);
}

export function encryptLicenseKey(plaintext: string): string;
export function encryptLicenseKey(plaintext: string | null | undefined): string | null;
/**
 * Encrypts a plaintext license key using AES-256-GCM.
 * Output format: enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 *
 * If the value is empty, 'N/A', null, or undefined, it is returned as-is.
 * If already encrypted, it returns the value without double-encrypting.
 */
export function encryptLicenseKey(plaintext?: string | null): string | null {
  if (plaintext === null || plaintext === undefined) {
    return plaintext ?? null;
  }
  if (plaintext === '' || plaintext === 'N/A') {
    return plaintext;
  }
  if (isLicenseKeyEncrypted(plaintext)) {
    return plaintext;
  }

  const key = getLicenseEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptLicenseKey(
  storedValue: string,
  options?: { throwOnError?: boolean },
): string;
export function decryptLicenseKey(
  storedValue: string | null | undefined,
  options?: { throwOnError?: boolean },
): string | null;
/**
 * Decrypts an AES-256-GCM encrypted license key.
 * If the stored value is legacy plaintext, 'N/A', empty, or null, it is returned as-is.
 * If corrupted or authentication tag fails, returns '••••-DECRYPTION-FAILED' or throws if throwOnError is true.
 */
export function decryptLicenseKey(
  storedValue?: string | null,
  options?: { throwOnError?: boolean },
): string | null {
  if (storedValue === null || storedValue === undefined) {
    return storedValue ?? null;
  }
  if (storedValue === '' || storedValue === 'N/A') {
    return storedValue;
  }
  if (!isLicenseKeyEncrypted(storedValue)) {
    return storedValue; // Graceful legacy plaintext compatibility
  }

  try {
    const parts = storedValue.slice(ENCRYPTION_PREFIX.length).split(':');
    if (parts.length !== 3) {
      if (options?.throwOnError) {
        throw new Error('Malformed encrypted license key payload structure');
      }
      return '••••-DECRYPTION-FAILED';
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getLicenseEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      if (options?.throwOnError) {
        throw new Error('Invalid IV or auth tag length in encrypted license key');
      }
      return '••••-DECRYPTION-FAILED';
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: unknown) {
    if (options?.throwOnError) {
      throw error instanceof Error ? error : new Error(String(error));
    }
    return '••••-DECRYPTION-FAILED';
  }
}

/**
 * Generates standard masked display key for UI responses.
 */
export function maskLicenseKey(key: string | null | undefined): string {
  if (!key || key === 'N/A') return 'N/A';
  if (key.length <= 8) return key;
  return `••••-••••-${key.slice(-4)}`;
}
