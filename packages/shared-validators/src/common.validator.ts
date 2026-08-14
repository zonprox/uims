import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email address').max(255);

export const dateSchema = z.string().datetime({ message: 'Invalid ISO datetime string' });

export const idParamSchema = z.object({
  id: uuidSchema,
});
