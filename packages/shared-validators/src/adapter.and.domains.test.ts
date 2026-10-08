import { describe, expect, it } from 'vitest';
import {
  auditQuerySchema,
  logEventSchema,
} from './audit.validator';
import {
  changePasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from './auth.validator';
import {
  antdRules,
  CIDR_REGEX,
  IPV4_REGEX,
  IPV6_REGEX,
  MAC_REGEX,
  PHONE_REGEX,
  SKU_REGEX,
  URL_REGEX,
  zodToAntdRule,
} from './index';
import {
  createDepartmentSchema,
  createOrganizationSchema,
  createPositionSchema,
  updateDepartmentSchema,
  updateOrganizationSchema,
  updatePositionSchema,
} from './organization.validator';
import { createAppUserSchema, resetAppUserPasswordSchema } from './user.validator';
import { createVendorSchema, updateVendorSchema, vendorQuerySchema } from './vendor.validator';

describe('Organization, Vendor, Audit, Auth, and Rule Adapter Suite', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  describe('Organization, Department, and Position Validators (Location Purge)', () => {
    it('validates organization creation and update', () => {
      const validOrg = {
        name: 'Acme Corporation',
        code: 'ACME',
        taxId: '0102030405',
        email: 'info@acme.com',
        phone: '+84 24 3728 1234',
        website: 'https://acme.com',
        status: 'ACTIVE' as const,
      };
      const result = createOrganizationSchema.safeParse(validOrg);
      expect(result.success).toBe(true);
      expect(updateOrganizationSchema.safeParse({ name: 'Acme Global' }).success).toBe(true);
    });

    it('rejects organization missing required name or code', () => {
      expect(createOrganizationSchema.safeParse({ name: '', code: 'C1' }).success).toBe(false);
      expect(createOrganizationSchema.safeParse({ name: 'Org', code: '' }).success).toBe(false);
    });

    it('validates department creation and update with manager email', () => {
      const validDept = {
        name: 'Information Technology',
        code: 'DEPT-IT',
        organizationId: validUuid,
        managerName: 'Alex Smith',
        managerEmail: 'alex.smith@acme.com',
      };
      expect(createDepartmentSchema.safeParse(validDept).success).toBe(true);
      expect(updateDepartmentSchema.safeParse({ name: 'Engineering IT' }).success).toBe(true);
    });

    it('validates position creation and update', () => {
      const validPos = {
        title: 'Senior DevOps Engineer',
        code: 'POS-DEVOPS-SR',
        departmentId: validUuid,
        level: 'Senior',
      };
      expect(createPositionSchema.safeParse(validPos).success).toBe(true);
      expect(updatePositionSchema.safeParse({ level: 'Lead' }).success).toBe(true);
    });
  });

  describe('Vendor Validator', () => {
    it('validates vendor creation and query', () => {
      const validVendor = {
        name: 'Cisco Systems',
        contactEmail: 'sales@cisco.com',
        contactPhone: '+1 800 553 6387',
        website: 'https://www.cisco.com',
        notes: 'Primary network switch and router supplier',
      };
      expect(createVendorSchema.safeParse(validVendor).success).toBe(true);
      expect(updateVendorSchema.safeParse({ notes: 'Updated notes' }).success).toBe(true);
      expect(vendorQuerySchema.safeParse({ page: 1, limit: 25, search: 'Cisco' }).success).toBe(
        true,
      );
    });

    it('rejects vendor with empty name', () => {
      expect(createVendorSchema.safeParse({ name: '' }).success).toBe(false);
    });
  });

  describe('Audit Log Validator', () => {
    it('validates security audit log events', () => {
      const event = {
        userId: validUuid,
        userEmail: 'admin@company.com',
        action: 'UPDATE_ROLE_PERMISSIONS',
        severity: 'Warning' as const,
        entity: 'Role',
        entityId: validUuid,
        ipAddress: '10.232.130.15',
        status: 'Success' as const,
        durationMs: 45,
        details: 'Added ASSET_DELETE permission to role',
      };
      expect(logEventSchema.safeParse(event).success).toBe(true);
    });

    it('accepts loopback, IPv6, and unknown for ipAddress', () => {
      expect(
        logEventSchema.safeParse({ action: 'LOGIN', entity: 'User', ipAddress: '127.0.0.1' })
          .success,
      ).toBe(true);
      expect(
        logEventSchema.safeParse({ action: 'LOGIN', entity: 'User', ipAddress: '::1' }).success,
      ).toBe(true);
      expect(
        logEventSchema.safeParse({ action: 'LOGIN', entity: 'User', ipAddress: 'unknown' }).success,
      ).toBe(true);
    });

    it('rejects malformed IP address in audit log', () => {
      expect(
        logEventSchema.safeParse({ action: 'LOGIN', entity: 'User', ipAddress: '999.999.999.999' })
          .success,
      ).toBe(false);
    });

    it('validates auditQuerySchema pagination and date filters', () => {
      const query = {
        page: 1,
        limit: 50,
        action: 'LOGIN',
        startDate: '2026-10-01',
        endDate: '2026-10-08T23:59:59.000Z',
      };
      expect(auditQuerySchema.safeParse(query).success).toBe(true);
    });
  });

  describe('Auth and User Validators (Bounds and Regexes)', () => {
    it('validates login credentials and bounds [8..128]', () => {
      expect(loginSchema.safeParse({ email: 'admin@corp.com', password: 'Password123!' }).success).toBe(
        true,
      );
      expect(loginSchema.safeParse({ email: 'admin@corp.com', password: 'short' }).success).toBe(
        false,
      );
      expect(
        loginSchema.safeParse({ email: 'admin@corp.com', password: 'A'.repeat(129) }).success,
      ).toBe(false);
    });

    it('validates password change and reset bounds', () => {
      expect(
        changePasswordSchema.safeParse({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        }).success,
      ).toBe(true);

      expect(
        resetPasswordSchema.safeParse({
          token: 'secure-token-123',
          newPassword: 'NewPassword123!',
        }).success,
      ).toBe(true);
    });

    it('validates createAppUserSchema with username regex and AppUser fields', () => {
      const validUser = {
        username: 'john.doe_01',
        email: 'john.doe@company.com',
        firstName: 'John',
        lastName: 'Doe',
        roleId: validUuid,
      };
      expect(createAppUserSchema.safeParse(validUser).success).toBe(true);

      // Rejects username with spaces or special characters
      expect(
        createAppUserSchema.safeParse({
          ...validUser,
          username: 'john doe',
        }).success,
      ).toBe(false);
      expect(
        createAppUserSchema.safeParse({
          ...validUser,
          username: 'john@doe!',
        }).success,
      ).toBe(false);
      expect(
        createAppUserSchema.safeParse({
          ...validUser,
          username: 'ab', // < 3 chars
        }).success,
      ).toBe(false);
    });

    it('validates resetAppUserPasswordSchema bounds [8..128]', () => {
      expect(resetAppUserPasswordSchema.safeParse({ newPassword: 'ValidPassword123' }).success).toBe(
        true,
      );
      expect(resetAppUserPasswordSchema.safeParse({ newPassword: '123' }).success).toBe(false);
    });
  });

  describe('Ant Design Client Rule Adapters & Exported Regexes', () => {
    it('verifies exported regex constants match expected patterns', () => {
      expect(IPV4_REGEX.test('10.232.130.15')).toBe(true);
      expect(IPV4_REGEX.test('01.0.0.1')).toBe(false);
      expect(IPV6_REGEX.test('2001:db8::1')).toBe(true);
      expect(CIDR_REGEX.test('10.232.130.0/24')).toBe(true);
      expect(CIDR_REGEX.test('10.232.130.0/35')).toBe(false);
      expect(MAC_REGEX.test('00:1B:44:11:3A:B7')).toBe(true);
      expect(MAC_REGEX.test('001b.4411.3ab7')).toBe(true);
      expect(PHONE_REGEX.test('+84 24 3728 1234')).toBe(true);
      expect(URL_REGEX.test('https://example.com')).toBe(true);
      expect(SKU_REGEX.test('CAB-CAT6-1M')).toBe(true);
    });

    it('tests zodToAntdRule adapter resolving valid inputs', async () => {
      const rule = antdRules.fromZod(createVendorSchema.shape.name);
      await expect(rule.validator({}, 'Valid Vendor Name')).resolves.toBeUndefined();
    });

    it('tests zodToAntdRule adapter rejecting invalid inputs with error', async () => {
      const rule = antdRules.fromZod(createVendorSchema.shape.name);
      await expect(rule.validator({}, '')).rejects.toThrow();
    });

    it('tests zodToAntdRule adapter resolving empty values when optional', async () => {
      const rule = antdRules.fromZod(createVendorSchema.shape.notes);
      await expect(rule.validator({}, '')).resolves.toBeUndefined();
      await expect(rule.validator({}, undefined)).resolves.toBeUndefined();
      await expect(rule.validator({}, null)).resolves.toBeUndefined();
    });

    it('tests pre-configured antdRules pattern rules', () => {
      const ipv4Rule = antdRules.ipv4();
      expect(ipv4Rule.pattern.test('192.168.1.1')).toBe(true);
      expect(ipv4Rule.pattern.test('999.999.999.999')).toBe(false);

      const cidrRule = antdRules.cidr();
      expect(cidrRule.pattern.test('192.168.1.0/24')).toBe(true);
      expect(cidrRule.pattern.test('192.168.1.0/33')).toBe(false);

      const macRule = antdRules.mac();
      expect(macRule.pattern.test('00:11:22:33:44:55')).toBe(true);

      const phoneRule = antdRules.phone();
      expect(phoneRule.pattern.test('0912345678')).toBe(true);

      const skuRule = antdRules.skuOrCode('SKU');
      expect(skuRule.pattern.test('SKU-100')).toBe(true);
    });
  });
});
