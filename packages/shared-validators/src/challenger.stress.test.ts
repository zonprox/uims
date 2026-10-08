import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  assetStatusSchema,
  createAssetSchema,
  createCostCenterSchema,
  createDeviceModelSchema,
  createAssetUnitSchema,
} from './asset.validator';
import {
  currencySchema,
  emailSchema,
  phoneSchema,
  urlSchema,
  uuidSchema,
} from './common.validator';
import {
  createInventoryCategorySchema,
  createInventoryItemSchema,
  restockInventorySchema,
  adjustInventorySchema,
} from './inventory.validator';
import {
  createLicenseSchema,
  licenseStatusSchema,
  licenseTypeSchema,
} from './license.validator';
import {
  autoDetectQuerySchema,
  calculateSubnetQuerySchema,
  cidrRegex,
  cidrSchema,
  createIpAddressSchema,
  createSubnetSchema,
  createSwitchPortSchema,
  createSwitchSchema,
  createVlanSchema,
  ipv4Regex,
  ipv4Schema,
  macRegex,
  macSchema,
} from './network.validator';
import { loginSchema } from './auth.validator';
import { createAppUserSchema } from './user.validator';


describe('Adversarial Stress Testing — Challenger M1-1', () => {
  describe('1. Malformed IPv4 Inputs', () => {
    const malformedIps = [
      '01.0.0.1', // leading zero in first octet
      '10.01.0.1', // leading zero in second octet
      '10.0.01.1', // leading zero in third octet
      '10.0.0.01', // leading zero in fourth octet
      '999.999.999.999', // out of range octets
      '256.0.0.1', // 256 > 255
      '192.168.1.256', // 256 > 255
      'abc.def.ghi.jkl', // non-numeric characters
      '', // empty string
      '   ', // whitespace only
      '192.168.1', // incomplete 3 octets
      '192.168.1.1.1', // too many octets
      '192.168.1.-1', // negative octet
      '0.0.0.00', // multiple zeros
    ];

    it.each(malformedIps)('rejects malformed IP "%s" via ipv4Schema with ZodError', (ip) => {
      const res = ipv4Schema.safeParse(ip);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
        expect(res.error.issues.length).toBeGreaterThan(0);
      }
    });

    it.each(malformedIps)('rejects malformed gateway IP "%s" in createSubnetSchema', (ip) => {
      // Subnet gateway is nullable/optional, but when a non-empty malformed string is supplied it must fail
      if (ip.trim() === '') return;
      const res = createSubnetSchema.safeParse({
        name: 'Corporate Subnet',
        cidr: '10.0.0.0/24',
        gateway: ip,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it.each(malformedIps)('rejects malformed IP "%s" in autoDetectQuerySchema', (ip) => {
      const res = autoDetectQuerySchema.safeParse({ ip });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it.each(malformedIps)('rejects malformed IP "%s" in createIpAddressSchema address', (ip) => {
      if (ip === '') return;
      const res = createIpAddressSchema.safeParse({ address: ip });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('2. Malformed CIDR Inputs', () => {
    const malformedCidrs = [
      '10.0.0.0/33', // prefix > 32
      '10.0.0.0/-1', // negative prefix
      '10.0.0.0/01', // leading zero in prefix
      '10.0.0.0/00', // leading zero in prefix
      '10.0.0.0/08', // leading zero in prefix
      '10.0.0.0/024', // 3 digit prefix
      '10.0.0.0/', // empty prefix
      '10.0.0.0', // missing prefix
      '01.0.0.0/24', // leading zero in IP portion
      '256.0.0.0/24', // invalid IP portion
      '999.999.999.999/24', // invalid IP portion
      '', // empty string
      '10.0.0.0/abc', // non-numeric prefix
    ];

    it.each(malformedCidrs)('rejects malformed CIDR "%s" via cidrSchema with ZodError', (cidr) => {
      const res = cidrSchema.safeParse(cidr);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
        expect(res.error.issues.length).toBeGreaterThan(0);
      }
    });

    it.each(malformedCidrs)('rejects malformed CIDR "%s" in createSubnetSchema', (cidr) => {
      const res = createSubnetSchema.safeParse({
        name: 'VLAN 10 Subnet',
        cidr,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it.each(malformedCidrs)('rejects malformed CIDR "%s" in calculateSubnetQuerySchema', (cidr) => {
      const res = calculateSubnetQuerySchema.safeParse({ cidr });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('3. Malformed MAC Address Inputs', () => {
    const malformedMacs = [
      '00:11:22:33:44', // only 5 octets
      'ZZ:ZZ:ZZ:ZZ:ZZ:ZZ', // invalid non-hex characters
      '00112233445566', // 14 hex characters (must be exactly 12)
      '00:11:22:33:44:55:66', // 7 octets
      '00-11-22-33-44', // 5 octets with dashes
      '00:11:22:33:44:GG', // non-hex character
      '0011.2233.445', // incomplete cisco format (11 hex)
      '0011.2233.44556', // oversized cisco format (13 hex)
      '', // empty string
      '00:11:22:33:44:5', // single-char octet
      '00:11:22:33:44:555', // 3-char octet
    ];

    it.each(malformedMacs)('rejects malformed MAC "%s" via macSchema with ZodError', (mac) => {
      const res = macSchema.safeParse(mac);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
        expect(res.error.issues.length).toBeGreaterThan(0);
      }
    });

    it.each(malformedMacs)('rejects malformed MAC "%s" in createIpAddressSchema', (mac) => {
      if (mac === '') return;
      const res = createIpAddressSchema.safeParse({ macAddress: mac });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it.each(malformedMacs)('rejects malformed MAC "%s" in createSwitchSchema', (mac) => {
      if (mac === '') return;
      const res = createSwitchSchema.safeParse({
        name: 'Core Switch',
        model: 'Catalyst 9300',
        vendor: 'Cisco',
        macAddress: mac,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });
  });

  describe('4. Out of Bound Numerical Values', () => {
    describe('VLAN boundaries', () => {
      const invalidVlans = [0, -1, 4095, 5000, -100, 1.5, NaN, Infinity];

      it.each(invalidVlans)('rejects invalid vlanNumber %s in createVlanSchema', (vlanNumber) => {
        const res = createVlanSchema.safeParse({
          name: 'Management VLAN',
          vlanNumber,
        });
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBeInstanceOf(z.ZodError);
        }
      });
    });

    describe('Inventory quantities boundaries', () => {
      it('rejects negative quantity in createInventoryItemSchema', () => {
        const res = createInventoryItemSchema.safeParse({
          name: 'Cat6 Cable',
          categoryId: 'd3b07384-d113-4ec6-8968-3d1f11223344',
          quantity: -1,
        });
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBeInstanceOf(z.ZodError);
        }
      });

      it('rejects negative minThreshold in createInventoryItemSchema', () => {
        const res = createInventoryItemSchema.safeParse({
          name: 'Cat6 Cable',
          categoryId: 'd3b07384-d113-4ec6-8968-3d1f11223344',
          minThreshold: -1,
        });
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBeInstanceOf(z.ZodError);
        }
      });

      it('rejects quantity exceeding 1,000,000 in createInventoryItemSchema', () => {
        const res = createInventoryItemSchema.safeParse({
          name: 'Cat6 Cable',
          categoryId: 'd3b07384-d113-4ec6-8968-3d1f11223344',
          quantity: 1_000_001,
        });
        expect(res.success).toBe(false);
      });

      it('rejects 0 or negative quantity in restockInventorySchema (must be > 0)', () => {
        expect(restockInventorySchema.safeParse({ quantity: 0 }).success).toBe(false);
        expect(restockInventorySchema.safeParse({ quantity: -5 }).success).toBe(false);
        expect(restockInventorySchema.safeParse({ quantity: 100_001 }).success).toBe(false);
      });

      it('rejects negative quantity in adjustInventorySchema', () => {
        const res = adjustInventorySchema.safeParse({
          quantity: -10,
          reason: 'Correction',
        });
        expect(res.success).toBe(false);
      });
    });

    describe('License seats boundaries', () => {
      it('rejects 0 and negative seats in createLicenseSchema', () => {
        expect(
          createLicenseSchema.safeParse({
            name: 'MS Office 365',
            totalSeats: 0,
          }).success,
        ).toBe(false);

        expect(
          createLicenseSchema.safeParse({
            name: 'MS Office 365',
            totalSeats: -10,
          }).success,
        ).toBe(false);

        expect(
          createLicenseSchema.safeParse({
            name: 'MS Office 365',
            totalSeats: 1_000_001,
          }).success,
        ).toBe(false);
      });
    });

    describe('Currency and unitCost boundaries', () => {
      const invalidCurrencies = [-1, -0.01, -100, -99999, 100_000_001, 10.999]; // 3 decimals violates precision

      it.each(invalidCurrencies)('rejects invalid currency amount %s via currencySchema', (val) => {
        const res = currencySchema.safeParse(val);
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBeInstanceOf(z.ZodError);
        }
      });

      it('rejects negative unitCost in createAssetSchema', () => {
        const res = createAssetSchema.safeParse({
          name: 'MacBook Pro 16',
          unitCost: -1500,
        });
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBeInstanceOf(z.ZodError);
        }
      });

      it('rejects negative unitCost in createInventoryItemSchema', () => {
        const res = createInventoryItemSchema.safeParse({
          name: 'USB-C Adapter',
          categoryId: 'd3b07384-d113-4ec6-8968-3d1f11223344',
          unitCost: -25.5,
        });
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBeInstanceOf(z.ZodError);
        }
      });

      it('rejects negative costPerSeat and cost in createLicenseSchema', () => {
        expect(
          createLicenseSchema.safeParse({
            name: 'JetBrains All Products',
            totalSeats: 10,
            costPerSeat: -50,
          }).success,
        ).toBe(false);

        expect(
          createLicenseSchema.safeParse({
            name: 'JetBrains All Products',
            totalSeats: 10,
            cost: -500,
          }).success,
        ).toBe(false);
      });
    });
  });

  describe('5. String Length Attacks (> 255 / 1000 / 2000 chars)', () => {
    const string256 = 'A'.repeat(256);
    const string501 = 'B'.repeat(501);
    const string1001 = 'C'.repeat(1001);
    const string2001 = 'D'.repeat(2001);

    it('rejects email exceeding 255 characters via emailSchema', () => {
      // 250 characters + '@test.com' = 259 chars
      const longEmail = 'a'.repeat(250) + '@test.com';
      const res = emailSchema.safeParse(longEmail);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it('rejects URL exceeding 255 characters via urlSchema', () => {
      const longUrl = 'https://example.com/' + 'x'.repeat(250);
      const res = urlSchema.safeParse(longUrl);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it('rejects asset name exceeding 100 characters in createAssetSchema', () => {
      const res = createAssetSchema.safeParse({
        name: 'A'.repeat(101),
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it('rejects asset description exceeding 500 characters in createAssetSchema', () => {
      const res = createAssetSchema.safeParse({
        name: 'Valid Asset',
        description: string501,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it('rejects asset notes exceeding 1000 characters in createAssetSchema', () => {
      const res = createAssetSchema.safeParse({
        name: 'Valid Asset',
        notes: string1001,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it('rejects asset specifications exceeding 2000 characters in createAssetSchema', () => {
      const res = createAssetSchema.safeParse({
        name: 'Server Node',
        specifications: string2001,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
        expect(res.error.issues[0]?.message).toContain('Specifications cannot exceed 2000 characters');
      }
    });

    it('rejects VLAN name exceeding 100 characters in createVlanSchema', () => {
      const res = createVlanSchema.safeParse({
        name: 'V'.repeat(101),
        vlanNumber: 10,
      });
      expect(res.success).toBe(false);
    });

    it('rejects Subnet name exceeding 100 characters in createSubnetSchema', () => {
      const res = createSubnetSchema.safeParse({
        name: 'S'.repeat(101),
        cidr: '192.168.1.0/24',
      });
      expect(res.success).toBe(false);
    });

    it('rejects Switch notes exceeding 1000 characters in createSwitchSchema', () => {
      const res = createSwitchSchema.safeParse({
        name: 'Switch 1',
        model: 'Catalyst',
        vendor: 'Cisco',
        notes: string1001,
      });
      expect(res.success).toBe(false);
    });

    it('rejects Inventory item name exceeding 150 characters in createInventoryItemSchema', () => {
      const res = createInventoryItemSchema.safeParse({
        name: 'I'.repeat(151),
        categoryId: 'd3b07384-d113-4ec6-8968-3d1f11223344',
      });
      expect(res.success).toBe(false);
    });

    it('rejects Inventory notes exceeding 1000 characters in createInventoryItemSchema', () => {
      const res = createInventoryItemSchema.safeParse({
        name: 'Valid Item',
        categoryId: 'd3b07384-d113-4ec6-8968-3d1f11223344',
        notes: string1001,
      });
      expect(res.success).toBe(false);
    });
  });

  describe('6. Unwhitelisted Enum Bypasses & Prototype Injections', () => {
    const maliciousEnumPayloads = [
      'InvalidStatus',
      '__proto__',
      '',
      '   ',
      'constructor',
      'valueOf',
      'toString',
      'ADMIN',
      'DROP TABLE',
      'null',
      'undefined',
    ];

    it.each(maliciousEnumPayloads)('rejects unwhitelisted status "%s" in assetStatusSchema', (status) => {
      const res = assetStatusSchema.safeParse(status);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
        expect(res.error.issues.length).toBeGreaterThan(0);
      }
    });

    it.each(maliciousEnumPayloads)('rejects unwhitelisted status "%s" in createAssetSchema', (status) => {
      const res = createAssetSchema.safeParse({
        name: 'Laptop Asset',
        status,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it.each(maliciousEnumPayloads)('rejects unwhitelisted status "%s" in createVlanSchema', (status) => {
      const res = createVlanSchema.safeParse({
        name: 'VLAN 100',
        vlanNumber: 100,
        status,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it.each(maliciousEnumPayloads)('rejects unwhitelisted status "%s" in createIpAddressSchema', (status) => {
      const res = createIpAddressSchema.safeParse({
        status,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toBeInstanceOf(z.ZodError);
      }
    });

    it.each(maliciousEnumPayloads)('rejects unwhitelisted role/status "%s" in createSwitchSchema', (badVal) => {
      expect(
        createSwitchSchema.safeParse({
          name: 'SW1',
          model: 'M1',
          vendor: 'V1',
          status: badVal,
        }).success,
      ).toBe(false);

      expect(
        createSwitchSchema.safeParse({
          name: 'SW1',
          model: 'M1',
          vendor: 'V1',
          role: badVal,
        }).success,
      ).toBe(false);
    });

    it.each(maliciousEnumPayloads)('rejects unwhitelisted formFactor/adminStatus/operStatus "%s" in createSwitchPortSchema', (badVal) => {
      const base = {
        switchId: 'd3b07384-d113-4ec6-8968-3d1f11223344',
        portNumber: 1,
        name: 'GigabitEthernet0/1',
      };

      expect(createSwitchPortSchema.safeParse({ ...base, formFactor: badVal }).success).toBe(false);
      expect(createSwitchPortSchema.safeParse({ ...base, adminStatus: badVal }).success).toBe(false);
      expect(createSwitchPortSchema.safeParse({ ...base, operStatus: badVal }).success).toBe(false);
    });

    it.each(maliciousEnumPayloads)('rejects unwhitelisted type and status "%s" in createLicenseSchema', (badVal) => {
      expect(
        createLicenseSchema.safeParse({
          name: 'Software License',
          totalSeats: 10,
          type: badVal,
        }).success,
      ).toBe(false);

      expect(
        createLicenseSchema.safeParse({
          name: 'Software License',
          totalSeats: 10,
          status: badVal,
        }).success,
      ).toBe(false);
    });
  });

  describe('7. Directory & Auth Adversarial Tests', () => {
    it('rejects short password (< 8 chars) in loginSchema and createAppUserSchema', () => {
      expect(loginSchema.safeParse({ email: 'test@example.com', password: '123' }).success).toBe(false);
      expect(
        createAppUserSchema.safeParse({
          username: 'admin_test',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          password: 'short',
        }).success,
      ).toBe(false);
    });

    it('rejects oversized password (> 128 chars) in loginSchema and createAppUserSchema', () => {
      const over128 = 'a'.repeat(129);
      expect(loginSchema.safeParse({ email: 'test@example.com', password: over128 }).success).toBe(false);
      expect(
        createAppUserSchema.safeParse({
          username: 'admin_test',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          password: over128,
        }).success,
      ).toBe(false);
    });

    it('rejects invalid username characters in createAppUserSchema', () => {
      const badUsernames = ['user name', 'user@domain', 'user#123', 'us', '<script>'];
      for (const bad of badUsernames) {
        expect(
          createAppUserSchema.safeParse({
            username: bad,
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
          }).success,
        ).toBe(false);
      }
    });

    it('rejects unwhitelisted UserStatus in createAppUserSchema', () => {
      expect(
        createAppUserSchema.safeParse({
          username: 'validuser',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          status: 'INVALID_STATUS',
        }).success,
      ).toBe(false);
    });
  });

  describe('8. Verification that ALL adversarial inputs produce structured ZodError issues', () => {
    it('confirms every rejection returns an instance of z.ZodError with non-empty issues', () => {
      const results = [
        ipv4Schema.safeParse('999.999.999.999'),
        cidrSchema.safeParse('10.0.0.0/33'),
        macSchema.safeParse('ZZ:ZZ:ZZ:ZZ:ZZ:ZZ'),
        createVlanSchema.safeParse({ name: 'VLAN', vlanNumber: 0 }),
        createInventoryItemSchema.safeParse({ name: 'Item', categoryId: 'd3b07384-d113-4ec6-8968-3d1f11223344', quantity: -1 }),
        createAssetSchema.safeParse({ name: 'Asset', specifications: 'A'.repeat(2001) }),
        assetStatusSchema.safeParse('__proto__'),
      ];

      for (const res of results) {
        expect(res.success).toBe(false);
        if (!res.success) {
          expect(res.error).toBeInstanceOf(z.ZodError);
          expect(res.error.issues).toBeInstanceOf(Array);
          expect(res.error.issues.length).toBeGreaterThan(0);
          expect(typeof res.error.issues[0]?.message).toBe('string');
        }
      }
    });
  });
});

