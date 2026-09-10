import { describe, expect, it } from 'vitest';
import { CredentialVaultService } from './credential-vault.service';

describe('CredentialVaultService', () => {
  const secretKey = 'test-audit-signing-key-32-chars-long-secure';

  it('should initialize successfully with valid key in environment or ConfigService', () => {
    process.env.VAULT_MASTER_KEY = secretKey;
    const vault = new CredentialVaultService();
    expect(vault).toBeDefined();
  });

  it('should throw an error if no master key is configured', () => {
    const origVault = process.env.VAULT_MASTER_KEY;
    const origAudit = process.env.AUDIT_SIGNING_KEY;
    const origJwt = process.env.JWT_SECRET;

    delete process.env.VAULT_MASTER_KEY;
    delete process.env.AUDIT_SIGNING_KEY;
    delete process.env.JWT_SECRET;

    try {
      expect(() => new CredentialVaultService()).toThrow(/master encryption key .* is required/);
    } finally {
      process.env.VAULT_MASTER_KEY = origVault;
      process.env.AUDIT_SIGNING_KEY = origAudit;
      process.env.JWT_SECRET = origJwt;
    }
  });

  it('should encrypt plaintext into AES-256-GCM payload with unique IVs', () => {
    process.env.VAULT_MASTER_KEY = secretKey;
    const vault = new CredentialVaultService();

    const plaintext = 'SyntheticVaultTestSecret123!';
    const result1 = vault.encrypt(plaintext);
    const result2 = vault.encrypt(plaintext);

    expect(result1.encryptedData).toBeDefined();
    expect(result1.iv).toBeDefined();
    expect(result1.authTag).toBeDefined();
    expect(result1.keyVersion).toBe(1);

    // IVs must be cryptographically distinct across calls
    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.encryptedData).not.toBe(result2.encryptedData);
  });

  it('should decrypt valid ciphertext payload matching original plaintext', () => {
    process.env.VAULT_MASTER_KEY = secretKey;
    const vault = new CredentialVaultService();

    const plaintext = 'SyntheticPassword#2026!';
    const encrypted = vault.encrypt(plaintext);
    const decrypted = vault.decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt and decrypt empty string payload', () => {
    process.env.VAULT_MASTER_KEY = secretKey;
    const vault = new CredentialVaultService();

    const encrypted = vault.encrypt('');
    expect(encrypted.encryptedData).toBe('');
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();

    const decrypted = vault.decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('should fail decryption if authTag is tampered', () => {
    process.env.VAULT_MASTER_KEY = secretKey;
    const vault = new CredentialVaultService();

    const encrypted = vault.encrypt('SyntheticAdminSecret$1');
    // Tamper with the authentication tag
    const tamperedTag = Buffer.from(encrypted.authTag, 'base64');
    tamperedTag[0] ^= 0xff;

    expect(() =>
      vault.decrypt({
        ...encrypted,
        authTag: tamperedTag.toString('base64'),
      }),
    ).toThrow(/integrity check failed/);
  });

  it('should fail decryption if ciphertext is tampered', () => {
    process.env.VAULT_MASTER_KEY = secretKey;
    const vault = new CredentialVaultService();

    const encrypted = vault.encrypt('SyntheticTamperSecret#99');
    const tamperedData = Buffer.from(encrypted.encryptedData, 'base64');
    tamperedData[0] ^= 0xaa;

    expect(() =>
      vault.decrypt({
        ...encrypted,
        encryptedData: tamperedData.toString('base64'),
      }),
    ).toThrow(/integrity check failed/);
  });

  it('should provide masked representation', () => {
    process.env.VAULT_MASTER_KEY = secretKey;
    const vault = new CredentialVaultService();

    expect(vault.maskSecret('password123')).toBe('••••••••');
    expect(vault.maskSecret(null)).toBe('');
  });
});
