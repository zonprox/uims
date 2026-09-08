import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  AUDIT_SIGNING_KEY: z.string().min(32, 'AUDIT_SIGNING_KEY must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('15m'),
  REDIS_URL: z.string().optional(),
});

export const getAppConfig = (config: Record<string, unknown> = process.env) => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
};
