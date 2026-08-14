import { describe, expect, it } from 'vitest';
import { emailSchema, uuidSchema } from './common.validator';

describe('common validators', () => {
  it('should validate valid emails', () => {
    expect(emailSchema.safeParse('test@example.com').success).toBe(true);
    expect(emailSchema.safeParse('invalid-email').success).toBe(false);
  });

  it('should validate uuids', () => {
    expect(uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
  });
});
