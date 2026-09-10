import * as crypto from 'node:crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EncryptedVaultPayload {
  encryptedData: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

@Injectable()
export class CredentialVaultService {
  private readonly logger = new Logger(CredentialVaultService.name);
  private readonly masterKey: Buffer;
  private readonly keyVersion = 1;

  constructor(@Optional() private readonly configService?: ConfigService) {
    const rawSecret =
      this.configService?.get<string>('VAULT_MASTER_KEY') ||
      this.configService?.get<string>('AUDIT_SIGNING_KEY') ||
      this.configService?.get<string>('JWT_SECRET') ||
      process.env.VAULT_MASTER_KEY ||
      process.env.AUDIT_SIGNING_KEY ||
      process.env.JWT_SECRET;

    if (!rawSecret) {
      throw new Error(
        'CredentialVaultService initialization failed: master encryption key (VAULT_MASTER_KEY, AUDIT_SIGNING_KEY, or JWT_SECRET) is required.',
      );
    }

    // Derive 256-bit (32-byte) key using SHA-256 HKDF/Hash
    this.masterKey = crypto.createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Encrypts plaintext sensitive credentials using AES-256-GCM.
   * Generates a unique 96-bit (12-byte) IV for each operation.
   * Returns Base64 encoded payload components with an authentication tag.
   */
  encrypt(plaintext: string): EncryptedVaultPayload {
    if (typeof plaintext !== 'string') {
      throw new Error('CredentialVaultService: plaintext must be a string');
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    const encryptedBuffer = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encryptedBuffer.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyVersion: this.keyVersion,
    };
  }

  /**
   * Decrypts an authenticated AES-256-GCM ciphertext payload.
   * Verifies the 128-bit authentication tag to ensure data integrity and authenticity.
   */
  decrypt(payload: {
    encryptedData: string;
    iv: string;
    authTag: string;
    keyVersion?: number;
  }): string {
    const { encryptedData, iv, authTag } = payload;

    if (typeof encryptedData !== 'string' || !iv || !authTag) {
      throw new Error(
        'CredentialVaultService: missing required vault payload fields (encryptedData, iv, authTag)',
      );
    }

    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');
    const dataBuffer = Buffer.from(encryptedData, 'base64');

    if (ivBuffer.length !== 12) {
      throw new Error('CredentialVaultService: invalid IV length for AES-256-GCM');
    }

    if (authTagBuffer.length !== 16) {
      throw new Error('CredentialVaultService: invalid authentication tag length for AES-256-GCM');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    try {
      const decrypted = Buffer.concat([decipher.update(dataBuffer), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (error: unknown) {
      this.logger.error(
        'Credential decryption failed: authentication tag mismatch or corrupted ciphertext',
        error instanceof Error ? error.stack : undefined,
      );
      throw new Error('CredentialVaultService: decryption failed or data integrity check failed');
    }
  }

  /**
   * Returns a masked representation of a credential for secure display.
   */
  maskSecret(secret?: string | null): string {
    if (!secret) return '';
    return '••••••••';
  }
}
