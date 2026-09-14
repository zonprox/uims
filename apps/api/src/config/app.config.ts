import { Logger } from '@nestjs/common';
import { z } from 'zod';

const logger = new Logger('AppConfig');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    AUDIT_SIGNING_KEY: z.string().min(32, 'AUDIT_SIGNING_KEY must be at least 32 characters'),
    LICENSE_ENCRYPTION_KEY: z
      .string()
      .min(32, 'LICENSE_ENCRYPTION_KEY must be at least 32 characters')
      .optional(),
    JWT_EXPIRATION: z.string().default('15m'),
    REDIS_URL: z.string().optional(),
    CORS_ORIGIN: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.REDIS_URL || data.REDIS_URL.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'REDIS_URL is required in production environment',
          path: ['REDIS_URL'],
        });
      }
    }
  });

export const getAppConfig = (config: Record<string, unknown> = process.env) => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    logger.error(`Invalid environment variables: ${JSON.stringify(parsed.error.format())}`);
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
};
