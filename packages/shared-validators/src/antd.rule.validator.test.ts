import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  antdRules,
  createAssetSchema,
  createDirectoryGroupSchema,
  createLicenseSchema,
  createVendorSchema,
  currencySchema,
  emailSchema,
  phoneSchema,
  urlSchema,
  uuidSchema,
  zodToAntdRule,
} from './index';

describe('zodToAntdRule & antdRules Client Adapter Suite', () => {
  // =========================================================================
  // 1. MANDATORY CORE REQUIREMENTS (Milestone 1 Iteration 2)
  // =========================================================================
  describe('Mandatory Core Requirements', () => {
    it('1. resolves empty string on optional emailSchema', async () => {
      const rule = zodToAntdRule(emailSchema.optional());
      await expect(rule.validator({}, '')).resolves.toBeUndefined();
    });

    it('2. resolves whitespace-only string on optional emailSchema', async () => {
      const rule = zodToAntdRule(emailSchema.optional());
      await expect(rule.validator({}, '   ')).resolves.toBeUndefined();
    });

    it('3. resolves tab and newline whitespace on optional emailSchema', async () => {
      const rule = zodToAntdRule(emailSchema.optional());
      await expect(rule.validator({}, '\t\n ')).resolves.toBeUndefined();
    });

    it('4. rejects invalid email string on optional emailSchema with descriptive error message', async () => {
      const rule = zodToAntdRule(emailSchema.optional());
      await expect(rule.validator({}, 'invalid')).rejects.toThrow('Invalid email address');
      await expect(rule.validator({}, 'not-an-email')).rejects.toThrow('Invalid email address');
    });

    it('5. rejects partial email without domain or username on optional emailSchema', async () => {
      const rule = zodToAntdRule(emailSchema.optional());
      await expect(rule.validator({}, 'user@')).rejects.toThrow('Invalid email address');
      await expect(rule.validator({}, '@nodomain.com')).rejects.toThrow('Invalid email address');
    });

    it('6. rejects empty string on required emailSchema', async () => {
      const rule = zodToAntdRule(emailSchema);
      await expect(rule.validator({}, '')).rejects.toThrow('This field is required');
    });

    it('7. rejects whitespace-only string on required emailSchema', async () => {
      const rule = zodToAntdRule(emailSchema);
      await expect(rule.validator({}, '   ')).rejects.toThrow('This field is required');
    });

    it('8. rejects undefined and null on required emailSchema', async () => {
      const rule = zodToAntdRule(emailSchema);
      await expect(rule.validator({}, undefined)).rejects.toThrow('This field is required');
      await expect(rule.validator({}, null)).rejects.toThrow('This field is required');
    });

    it('9. resolves empty string on optional uuidSchema', async () => {
      const rule = zodToAntdRule(uuidSchema.optional());
      await expect(rule.validator({}, '')).resolves.toBeUndefined();
    });

    it('10. resolves whitespace-only string on optional uuidSchema', async () => {
      const rule = zodToAntdRule(uuidSchema.optional());
      await expect(rule.validator({}, '   ')).resolves.toBeUndefined();
    });

    it('11. resolves undefined and null on optional uuidSchema', async () => {
      const rule = zodToAntdRule(uuidSchema.optional());
      await expect(rule.validator({}, undefined)).resolves.toBeUndefined();
      await expect(rule.validator({}, null)).resolves.toBeUndefined();
    });

    it('12. resolves valid UUID on optional uuidSchema', async () => {
      const rule = zodToAntdRule(uuidSchema.optional());
      await expect(rule.validator({}, '123e4567-e89b-12d3-a456-426614174000')).resolves.toBeUndefined();
    });

    it('13. rejects invalid UUID format on optional uuidSchema', async () => {
      const rule = zodToAntdRule(uuidSchema.optional());
      await expect(rule.validator({}, 'invalid-uuid-format')).rejects.toThrow('Invalid UUID format');
    });

    it('14. resolves 0 on optional number schema without false rejection', async () => {
      const optionalNumberRule = zodToAntdRule(z.number().optional());
      await expect(optionalNumberRule.validator({}, 0)).resolves.toBeUndefined();
    });

    it('15. resolves positive and negative numbers on optional number schema', async () => {
      const optionalNumberRule = zodToAntdRule(z.number().optional());
      await expect(optionalNumberRule.validator({}, 42)).resolves.toBeUndefined();
      await expect(optionalNumberRule.validator({}, -10)).resolves.toBeUndefined();
    });

    it('16. resolves blank values (empty string, undefined) on optional number schema', async () => {
      const optionalNumberRule = zodToAntdRule(z.number().optional());
      await expect(optionalNumberRule.validator({}, '')).resolves.toBeUndefined();
      await expect(optionalNumberRule.validator({}, undefined)).resolves.toBeUndefined();
    });

    it('17. rejects non-numeric string on optional number schema', async () => {
      const optionalNumberRule = zodToAntdRule(z.number().optional());
      await expect(optionalNumberRule.validator({}, 'not-a-number')).rejects.toThrow();
    });

    it('18. resolves false on required boolean schema without false rejection', async () => {
      const booleanRule = zodToAntdRule(z.boolean());
      await expect(booleanRule.validator({}, false)).resolves.toBeUndefined();
    });

    it('19. resolves true on required boolean schema', async () => {
      const booleanRule = zodToAntdRule(z.boolean());
      await expect(booleanRule.validator({}, true)).resolves.toBeUndefined();
    });

    it('20. rejects empty string, undefined, and null on required boolean schema', async () => {
      const booleanRule = zodToAntdRule(z.boolean());
      await expect(booleanRule.validator({}, '')).rejects.toThrow('This field is required');
      await expect(booleanRule.validator({}, undefined)).rejects.toThrow('This field is required');
      await expect(booleanRule.validator({}, null)).rejects.toThrow('This field is required');
    });
  });

  // =========================================================================
  // 2. DOMAIN SCHEMA INTEGRATION (Nullable & Optional Real Contracts)
  // =========================================================================
  describe('Domain Schema Integration', () => {
    it('21. resolves blank values (empty string, whitespace) on DirectoryGroup email', async () => {
      const rule = zodToAntdRule(createDirectoryGroupSchema.shape.email);
      await expect(rule.validator({}, '')).resolves.toBeUndefined();
      await expect(rule.validator({}, '   ')).resolves.toBeUndefined();
    });

    it('22. resolves undefined, null, valid email, and rejects invalid on DirectoryGroup email', async () => {
      const rule = zodToAntdRule(createDirectoryGroupSchema.shape.email);
      await expect(rule.validator({}, undefined)).resolves.toBeUndefined();
      await expect(rule.validator({}, null)).resolves.toBeUndefined();
      await expect(rule.validator({}, 'devops@corp.internal')).resolves.toBeUndefined();
      await expect(rule.validator({}, 'invalid-email')).rejects.toThrow('Invalid email address');
    });

    it('23. resolves empty string on optional Vendor contactEmail, website, and contactPhone', async () => {
      const emailRule = zodToAntdRule(createVendorSchema.shape.contactEmail);
      const websiteRule = zodToAntdRule(createVendorSchema.shape.website);
      const phoneRule = zodToAntdRule(createVendorSchema.shape.contactPhone);

      await expect(emailRule.validator({}, '')).resolves.toBeUndefined();
      await expect(websiteRule.validator({}, '')).resolves.toBeUndefined();
      await expect(phoneRule.validator({}, '')).resolves.toBeUndefined();
    });

    it('24. resolves valid values on Vendor contactEmail, website, and contactPhone', async () => {
      const emailRule = zodToAntdRule(createVendorSchema.shape.contactEmail);
      const websiteRule = zodToAntdRule(createVendorSchema.shape.website);
      const phoneRule = zodToAntdRule(createVendorSchema.shape.contactPhone);

      await expect(emailRule.validator({}, 'support@cisco.com')).resolves.toBeUndefined();
      await expect(websiteRule.validator({}, 'https://cisco.com')).resolves.toBeUndefined();
      await expect(phoneRule.validator({}, '+84 24 3728 1234')).resolves.toBeUndefined();
    });

    it('25. rejects malformed values on Vendor contactEmail, website, and contactPhone', async () => {
      const emailRule = zodToAntdRule(createVendorSchema.shape.contactEmail);
      const websiteRule = zodToAntdRule(createVendorSchema.shape.website);
      const phoneRule = zodToAntdRule(createVendorSchema.shape.contactPhone);

      await expect(emailRule.validator({}, 'cisco-email')).rejects.toThrow('Invalid email address');
      await expect(websiteRule.validator({}, 'not-a-url')).rejects.toThrow('Invalid URL format');
      await expect(phoneRule.validator({}, '123')).rejects.toThrow('Invalid telephone number format');
      await expect(phoneRule.validator({}, '(---)---')).rejects.toThrow('Phone number must contain at least 7 digits');
    });

    it('26. handles Asset costCenterId blank and invalid UUID format', async () => {
      const costCenterRule = zodToAntdRule(createAssetSchema.shape.costCenterId);
      await expect(costCenterRule.validator({}, '')).resolves.toBeUndefined();
      await expect(costCenterRule.validator({}, '   ')).resolves.toBeUndefined();
      await expect(costCenterRule.validator({}, 'bad-uuid')).rejects.toThrow('Invalid UUID format');
    });

    it('27. handles Asset unitCost blank, zero, positive amounts, and negative rejection', async () => {
      const unitCostRule = zodToAntdRule(createAssetSchema.shape.unitCost);
      await expect(unitCostRule.validator({}, '')).resolves.toBeUndefined();
      await expect(unitCostRule.validator({}, 0)).resolves.toBeUndefined();
      await expect(unitCostRule.validator({}, 150.5)).resolves.toBeUndefined();
      await expect(unitCostRule.validator({}, -10)).rejects.toThrow('Amount cannot be negative');
    });

    it('28. handles License totalSeats required numeric constraints', async () => {
      const seatsRule = zodToAntdRule(createLicenseSchema.shape.totalSeats);
      await expect(seatsRule.validator({}, '')).rejects.toThrow('This field is required');
      await expect(seatsRule.validator({}, 0)).rejects.toThrow();
      await expect(seatsRule.validator({}, 10)).resolves.toBeUndefined();
      await expect(seatsRule.validator({}, 'five')).rejects.toThrow();
    });
  });

  // =========================================================================
  // 3. CUSTOM ERROR MESSAGE OVERRIDES
  // =========================================================================
  describe('Custom Error Message Overrides', () => {
    it('29. uses custom error message on required field empty submission', async () => {
      const rule = zodToAntdRule(emailSchema, 'Distribution email is strictly required');
      await expect(rule.validator({}, '')).rejects.toThrow('Distribution email is strictly required');
      await expect(rule.validator({}, '   ')).rejects.toThrow('Distribution email is strictly required');
      await expect(rule.validator({}, undefined)).rejects.toThrow('Distribution email is strictly required');
    });

    it('30. uses custom error message on invalid input', async () => {
      const rule = zodToAntdRule(emailSchema, 'Please enter a valid company email');
      await expect(rule.validator({}, 'not-an-email')).rejects.toThrow('Please enter a valid company email');
    });
  });

  // =========================================================================
  // 4. antdRules.fromZod UTILITY
  // =========================================================================
  describe('antdRules.fromZod Utility', () => {
    it('31. mirrors zodToAntdRule behavior through antdRules.fromZod builder for optional and required', async () => {
      const optRule = antdRules.fromZod(emailSchema.optional());
      await expect(optRule.validator({}, '')).resolves.toBeUndefined();
      await expect(optRule.validator({}, 'valid@corp.com')).resolves.toBeUndefined();
      await expect(optRule.validator({}, 'invalid')).rejects.toThrow();

      const reqRule = antdRules.fromZod(emailSchema, 'Email required');
      await expect(reqRule.validator({}, '')).rejects.toThrow('Email required');
    });
  });

  // =========================================================================
  // 5. COMPLEX EDGE CASES & SCHEMA VARIANTS
  // =========================================================================
  describe('Complex Edge Cases & Schema Variants', () => {
    it('32. handles z.string() without min constraint permitting empty string', async () => {
      const looseStringRule = zodToAntdRule(z.string());
      await expect(looseStringRule.validator({}, '')).resolves.toBeUndefined();
      await expect(looseStringRule.validator({}, 'anything')).resolves.toBeUndefined();
      await expect(looseStringRule.validator({}, undefined)).rejects.toThrow('This field is required');
    });

    it('33. handles z.string().min(1) requiring non-empty string', async () => {
      const strictStringRule = zodToAntdRule(z.string().min(1, 'Cannot be empty'));
      await expect(strictStringRule.validator({}, '')).rejects.toThrow('This field is required');
      await expect(strictStringRule.validator({}, '   ')).rejects.toThrow('This field is required');
      await expect(strictStringRule.validator({}, 'valid')).resolves.toBeUndefined();
    });

    it('34. handles arrays and complex objects', async () => {
      const arrayRule = zodToAntdRule(z.array(z.string()).min(1, 'Select at least one'));
      await expect(arrayRule.validator({}, ['admin'])).resolves.toBeUndefined();
      await expect(arrayRule.validator({}, [])).rejects.toThrow();

      const optArrayRule = zodToAntdRule(z.array(z.string()).optional());
      await expect(optArrayRule.validator({}, [])).resolves.toBeUndefined();
      await expect(optArrayRule.validator({}, undefined)).resolves.toBeUndefined();
    });
  });
});
