import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM per NIST SP 800-38D
const AUTH_TAG_LENGTH = 16; // 128 bits
const ENCRYPTION_PREFIX = 'enc:v1:';
export const ENVELOPE_REGEX = /^enc:v1:[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude confusing chars I, O
const LOWERCASE_CHARS = 'abcdefghijkmnpqrstuvwxyz'; // exclude confusing chars l, o
const DIGIT_CHARS = '23456789'; // exclude 0, 1
const SYMBOL_CHARS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const ALL_PASSWORD_CHARS = UPPERCASE_CHARS + LOWERCASE_CHARS + DIGIT_CHARS + SYMBOL_CHARS;

/**
 * Derives a 256-bit symmetric encryption key from environment secrets via SHA-256.
 * Resolution precedence:
 *   1. process.env.DIRECTORY_ENCRYPTION_KEY
 *   2. process.env.LICENSE_ENCRYPTION_KEY
 *   3. process.env.AUDIT_SIGNING_KEY
 *   4. process.env.JWT_SECRET
 */
export function getDirectoryEncryptionKey(): Buffer {
  const secret =
    process.env.DIRECTORY_ENCRYPTION_KEY ||
    process.env.LICENSE_ENCRYPTION_KEY ||
    process.env.AUDIT_SIGNING_KEY ||
    process.env.JWT_SECRET;

  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'Encryption key resolution failed: DIRECTORY_ENCRYPTION_KEY, LICENSE_ENCRYPTION_KEY, AUDIT_SIGNING_KEY, or JWT_SECRET is required',
    );
  }

  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Checks whether a value is an encrypted credential in canonical `enc:v1:` format:
 * enc:v1:<24-hex-iv>:<32-hex-authTag>:<even-length-hex-ciphertext>
 */
export function isDirectoryPasswordEncrypted(val: unknown): boolean {
  if (typeof val !== 'string' || !ENVELOPE_REGEX.test(val)) {
    return false;
  }
  const parts = val.slice(ENCRYPTION_PREFIX.length).split(':');
  return parts.length === 3 && parts[2].length % 2 === 0;
}

export const isDirectoryCredentialEncrypted = isDirectoryPasswordEncrypted;

export function encryptDirectoryPassword(plaintext: string): string;
export function encryptDirectoryPassword(plaintext: string | null | undefined): string | null;
/**
 * Encrypts a plaintext directory user password/credential using AES-256-GCM.
 * Output format: enc:v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>
 *
 * If the value is empty, null, or undefined, it is returned as-is / null.
 * If already encrypted, it returns the value without double-encrypting.
 */
export function encryptDirectoryPassword(plaintext?: string | null): string | null {
  if (plaintext === null || plaintext === undefined) {
    return plaintext ?? null;
  }
  if (plaintext === '' || plaintext === 'N/A') {
    return plaintext;
  }
  if (isDirectoryPasswordEncrypted(plaintext)) {
    return plaintext;
  }

  const key = getDirectoryEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export const encryptDirectoryCredential = encryptDirectoryPassword;

/**
 * Internal helper to parse envelope and perform AES-256-GCM deciphering.
 */
function executeDecryption(storedValue: string): string {
  const parts = storedValue.slice(ENCRYPTION_PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted directory credential payload structure');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  if (ivHex.length !== 24 || authTagHex.length !== 32) {
    throw new Error('Invalid IV or auth tag length in encrypted directory credential');
  }

  if (!isDirectoryPasswordEncrypted(storedValue)) {
    throw new Error('Malformed encrypted directory credential payload structure');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid IV or auth tag length in encrypted directory credential');
  }

  const key = getDirectoryEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function decryptDirectoryPassword(
  storedValue: string,
  options?: { throwOnError?: boolean },
): string;
export function decryptDirectoryPassword(
  storedValue: string | null | undefined,
  options?: { throwOnError?: boolean },
): string | null;
/**
 * Decrypts an AES-256-GCM encrypted directory user password/credential.
 * If the stored value is empty, 'N/A', or null, it is returned as-is.
 * If unencrypted, corrupted, or authentication tag fails, returns '••••-DECRYPTION-FAILED' or throws if throwOnError is true.
 */
export function decryptDirectoryPassword(
  storedValue?: string | null,
  options?: { throwOnError?: boolean },
): string | null {
  if (storedValue === null || storedValue === undefined) {
    return storedValue ?? null;
  }
  if (storedValue === '' || storedValue === 'N/A') {
    return storedValue;
  }
  if (typeof storedValue !== 'string' || !storedValue.startsWith(ENCRYPTION_PREFIX)) {
    if (options?.throwOnError) {
      throw new Error('Directory credential is unencrypted or invalid');
    }
    return '••••-DECRYPTION-FAILED';
  }

  try {
    return executeDecryption(storedValue);
  } catch (error: unknown) {
    if (options?.throwOnError) {
      throw error instanceof Error ? error : new Error(String(error));
    }
    return '••••-DECRYPTION-FAILED';
  }
}

export const decryptDirectoryCredential = decryptDirectoryPassword;

/**
 * Masks directory password for safe display in UI/logs.
 */
export function maskDirectoryPassword(password: string | null | undefined): string {
  if (!password || password === 'N/A') return '••••••••';
  return '••••••••';
}

/**
 * Generates a cryptographically secure random password meeting enterprise complexity standards:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one numeric digit
 * - At least one symbol/special character
 * - Uses crypto.randomInt for cryptographically secure pseudo-randomness
 * - Shuffled with Fisher-Yates algorithm using crypto.randomInt
 */
export function generateSecurePassword(length = 16): string {
  const targetLength = Math.max(length, 12);

  // Guarantee at least one character from each required character class
  const requiredChars = [
    UPPERCASE_CHARS[crypto.randomInt(0, UPPERCASE_CHARS.length)],
    LOWERCASE_CHARS[crypto.randomInt(0, LOWERCASE_CHARS.length)],
    DIGIT_CHARS[crypto.randomInt(0, DIGIT_CHARS.length)],
    SYMBOL_CHARS[crypto.randomInt(0, SYMBOL_CHARS.length)],
  ];

  // Fill remainder with random characters from combined pool
  const remainingCount = targetLength - requiredChars.length;
  const remainingChars: Array<string> = [];
  for (let i = 0; i < remainingCount; i++) {
    remainingChars.push(ALL_PASSWORD_CHARS[crypto.randomInt(0, ALL_PASSWORD_CHARS.length)]);
  }

  const allChars = [...requiredChars, ...remainingChars];

  // Fisher-Yates shuffle using cryptographically secure randomInt
  for (let i = allChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = allChars[i];
    allChars[i] = allChars[j];
    allChars[j] = temp;
  }

  return allChars.join('');
}

export const generateSecureRandomPassword = generateSecurePassword;
