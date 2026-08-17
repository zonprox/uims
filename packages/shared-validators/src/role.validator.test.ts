import { describe, expect, it } from 'vitest';
import { createRoleSchema, cloneRoleSchema, updateRoleSchema } from './role.validator';

describe('Role Validators', () => {
  it('should validate valid role creation data', () => {
    const valid = {
      name: 'Asset Specialist',
      description: 'Manages hardware assets and warranty renewals',
      permissionIds: ['123e4567-e89b-12d3-a456-426614174000'],
    };
    const result = createRoleSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject role name shorter than 2 chars', () => {
    const invalid = {
      name: 'A',
    };
    const result = createRoleSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate clone role data', () => {
    const valid = {
      targetRoleName: 'Senior Technician',
      description: 'Cloned from Technician with extended privileges',
    };
    const result = cloneRoleSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
