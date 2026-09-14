import { describe, expect, it } from 'vitest';
import { envSchema, getAppConfig } from './app.config';

describe('app.config', () => {
  const validBaseConfig = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://uims:password@localhost:5433/uims_db',
    JWT_SECRET: 'jwt-secret-minimum-32-characters-secure-key',
    JWT_REFRESH_SECRET: 'jwt-refresh-secret-minimum-32-characters',
    AUDIT_SIGNING_KEY: 'audit-signing-key-minimum-32-characters',
  };

  describe('envSchema', () => {
    it('should validate valid configuration in development mode without REDIS_URL', () => {
      const result = envSchema.safeParse(validBaseConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.REDIS_URL).toBeUndefined();
      }
    });

    it('should validate valid configuration in test mode without REDIS_URL', () => {
      const result = envSchema.safeParse({
        ...validBaseConfig,
        NODE_ENV: 'test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('test');
        expect(result.data.REDIS_URL).toBeUndefined();
      }
    });

    it('should validate successfully in production mode when REDIS_URL is provided', () => {
      const result = envSchema.safeParse({
        ...validBaseConfig,
        NODE_ENV: 'production',
        REDIS_URL: 'redis://:securepassword@redis:6379/0',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe('production');
        expect(result.data.REDIS_URL).toBe('redis://:securepassword@redis:6379/0');
      }
    });

    it('should fail validation in production mode when REDIS_URL is omitted', () => {
      const result = envSchema.safeParse({
        ...validBaseConfig,
        NODE_ENV: 'production',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const redisIssue = result.error.issues.find((issue) => issue.path.includes('REDIS_URL'));
        expect(redisIssue).toBeDefined();
        expect(redisIssue?.message).toBe('REDIS_URL is required in production environment');
      }
    });

    it('should fail validation in production mode when REDIS_URL is empty or whitespace', () => {
      const resultEmpty = envSchema.safeParse({
        ...validBaseConfig,
        NODE_ENV: 'production',
        REDIS_URL: '',
      });
      expect(resultEmpty.success).toBe(false);

      const resultWhitespace = envSchema.safeParse({
        ...validBaseConfig,
        NODE_ENV: 'production',
        REDIS_URL: '   ',
      });
      expect(resultWhitespace.success).toBe(false);
    });

    it('should fail validation if DATABASE_URL is missing', () => {
      const { DATABASE_URL: _dbUrl, ...missingDb } = validBaseConfig;
      const result = envSchema.safeParse(missingDb);
      expect(result.success).toBe(false);
    });

    it('should fail validation if secrets are shorter than 32 characters', () => {
      const shortJwt = {
        ...validBaseConfig,
        JWT_SECRET: 'short-key',
      };
      expect(envSchema.safeParse(shortJwt).success).toBe(false);

      const shortRefresh = {
        ...validBaseConfig,
        JWT_REFRESH_SECRET: 'short-refresh',
      };
      expect(envSchema.safeParse(shortRefresh).success).toBe(false);

      const shortAudit = {
        ...validBaseConfig,
        AUDIT_SIGNING_KEY: 'short-audit',
      };
      expect(envSchema.safeParse(shortAudit).success).toBe(false);
    });

    it('should validate optional LICENSE_ENCRYPTION_KEY if provided', () => {
      const validLicenseKey = {
        ...validBaseConfig,
        LICENSE_ENCRYPTION_KEY: 'license-encryption-key-minimum-32-chars!',
      };
      expect(envSchema.safeParse(validLicenseKey).success).toBe(true);

      const shortLicenseKey = {
        ...validBaseConfig,
        LICENSE_ENCRYPTION_KEY: 'too-short',
      };
      expect(envSchema.safeParse(shortLicenseKey).success).toBe(false);
    });
  });

  describe('getAppConfig', () => {
    it('should return parsed config for valid configuration', () => {
      const config = getAppConfig(validBaseConfig);
      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe('3000');
    });

    it('should throw an Error on invalid environment configuration', () => {
      expect(() =>
        getAppConfig({
          ...validBaseConfig,
          NODE_ENV: 'production', // Missing REDIS_URL in production
        }),
      ).toThrow('Invalid environment variables');
    });
  });
});
