import { describe, expect, it } from 'vitest';
import {
  currencySchema,
  dateSchema,
  dateStringSchema,
  emailSchema,
  idParamSchema,
  normalizedEnum,
  phoneSchema,
  urlSchema,
  uuidSchema,
} from './common.validator';

describe('common validators', () => {
  describe('uuidSchema', () => {
    it('validates standard UUIDs', () => {
      expect(uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
    });

    it('trims whitespace around UUID', () => {
      const res = uuidSchema.safeParse('  123e4567-e89b-12d3-a456-426614174000  ');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('rejects invalid UUID strings', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
      expect(uuidSchema.safeParse('').success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('validates valid emails', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
    });

    it('trims leading/trailing whitespace and lowercases domain/local part', () => {
      const res = emailSchema.safeParse('  JOHN.DOE@CORP.VN  ');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe('john.doe@corp.vn');
      }
    });

    it('rejects invalid email formats', () => {
      expect(emailSchema.safeParse('invalid-email').success).toBe(false);
      expect(emailSchema.safeParse('user@').success).toBe(false);
      expect(emailSchema.safeParse('@example.com').success).toBe(false);
    });

    it('rejects emails exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(emailSchema.safeParse(longEmail).success).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it('validates international E.164 and standard formats', () => {
      expect(phoneSchema.safeParse('+84912345678').success).toBe(true);
      expect(phoneSchema.safeParse('+84 24 3728 1234').success).toBe(true);
      expect(phoneSchema.safeParse('+1 (555) 123-4567').success).toBe(true);
      expect(phoneSchema.safeParse('0912345678').success).toBe(true);
      expect(phoneSchema.safeParse('(024) 3728-1234').success).toBe(true);
    });

    it('rejects numbers with fewer than 7 digits', () => {
      expect(phoneSchema.safeParse('123456').success).toBe(false);
      expect(phoneSchema.safeParse('+12 34').success).toBe(false);
    });

    it('rejects alphabetic characters or symbols', () => {
      expect(phoneSchema.safeParse('phone-number').success).toBe(false);
      expect(phoneSchema.safeParse('-------').success).toBe(false);
    });

    it('rejects strings exceeding 30 characters', () => {
      expect(phoneSchema.safeParse('+84' + '1'.repeat(30)).success).toBe(false);
    });
  });

  describe('urlSchema', () => {
    it('validates HTTP and HTTPS URLs', () => {
      expect(urlSchema.safeParse('https://example.com').success).toBe(true);
      expect(urlSchema.safeParse('http://sub.domain.org/path?query=1').success).toBe(true);
    });

    it('trims whitespace', () => {
      const res = urlSchema.safeParse('  https://example.com  ');
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe('https://example.com');
      }
    });

    it('rejects URLs missing protocol', () => {
      expect(urlSchema.safeParse('example.com').success).toBe(false);
      expect(urlSchema.safeParse('www.example.com').success).toBe(false);
    });

    it('rejects URLs exceeding 255 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(250);
      expect(urlSchema.safeParse(longUrl).success).toBe(false);
    });
  });

  describe('currencySchema', () => {
    it('accepts integers and 2-decimal floats', () => {
      expect(currencySchema.safeParse(0).success).toBe(true);
      expect(currencySchema.safeParse(150).success).toBe(true);
      expect(currencySchema.safeParse(21.5).success).toBe(true);
      expect(currencySchema.safeParse(99.99).success).toBe(true);
    });

    it('safely handles IEEE-754 precision boundary amounts (0.29, 0.07)', () => {
      expect(currencySchema.safeParse(0.29).success).toBe(true);
      expect(currencySchema.safeParse(0.07).success).toBe(true);
    });

    it('coerces valid numeric strings to numbers', () => {
      const res1 = currencySchema.safeParse('21.00');
      expect(res1.success).toBe(true);
      if (res1.success) expect(res1.data).toBe(21);

      const res2 = currencySchema.safeParse('19.99');
      expect(res2.success).toBe(true);
      if (res2.success) expect(res2.data).toBe(19.99);
    });

    it('rejects negative numbers and negative numeric strings', () => {
      expect(currencySchema.safeParse(-5).success).toBe(false);
      expect(currencySchema.safeParse('-10.50').success).toBe(false);
    });

    it('rejects numbers with more than 2 decimal places', () => {
      expect(currencySchema.safeParse(21.555).success).toBe(false);
      expect(currencySchema.safeParse(0.001).success).toBe(false);
      expect(currencySchema.safeParse('10.999').success).toBe(false);
    });

    it('rejects amounts exceeding 100,000,000', () => {
      expect(currencySchema.safeParse(100_000_001).success).toBe(false);
    });

    it('rejects non-numeric strings', () => {
      expect(currencySchema.safeParse('abc').success).toBe(false);
    });
  });

  describe('dateStringSchema and dateSchema', () => {
    it('accepts standard YYYY-MM-DD dates', () => {
      expect(dateStringSchema.safeParse('2026-10-08').success).toBe(true);
    });

    it('accepts full ISO 8601 datetimes', () => {
      expect(dateStringSchema.safeParse('2026-10-08T03:00:00.000Z').success).toBe(true);
      expect(dateStringSchema.safeParse('2026-10-08T10:00:00+07:00').success).toBe(true);
    });

    it('accepts Date objects and transforms them to ISO string in dateSchema', () => {
      const d = new Date('2026-10-08T03:00:00.000Z');
      const res = dateSchema.safeParse(d);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBe(d.toISOString());
      }
    });

    it('rejects non-existent calendar dates', () => {
      expect(dateStringSchema.safeParse('2026-02-31').success).toBe(false);
      expect(dateStringSchema.safeParse('2023-02-29').success).toBe(false); // non-leap year
    });

    it('rejects malformed date strings', () => {
      expect(dateStringSchema.safeParse('not-a-date').success).toBe(false);
      expect(dateStringSchema.safeParse('10/08/2026').success).toBe(false);
    });
  });

  describe('normalizedEnum', () => {
    enum TestStatus {
      AVAILABLE = 'AVAILABLE',
      IN_USE = 'IN_USE',
      MAINTENANCE = 'MAINTENANCE',
    }

    const testSynonyms: Record<string, TestStatus> = {
      ACTIVE: TestStatus.IN_USE,
      IN_STORAGE: TestStatus.AVAILABLE,
    };

    const testEnumSchema = normalizedEnum(TestStatus, testSynonyms);

    it('accepts exact enum members', () => {
      const res = testEnumSchema.safeParse('AVAILABLE');
      expect(res.success).toBe(true);
      if (res.success) expect(res.data).toBe(TestStatus.AVAILABLE);
    });

    it('normalizes lowercase strings to enum members', () => {
      const res = testEnumSchema.safeParse('available');
      expect(res.success).toBe(true);
      if (res.success) expect(res.data).toBe(TestStatus.AVAILABLE);
    });

    it('maps synonym keys correctly', () => {
      const res1 = testEnumSchema.safeParse('Active');
      expect(res1.success).toBe(true);
      if (res1.success) expect(res1.data).toBe(TestStatus.IN_USE);

      const res2 = testEnumSchema.safeParse('In Storage');
      expect(res2.success).toBe(true);
      if (res2.success) expect(res2.data).toBe(TestStatus.AVAILABLE);
    });

    it('rejects unauthorized or arbitrary strings', () => {
      expect(testEnumSchema.safeParse('MALFORMED').success).toBe(false);
      expect(testEnumSchema.safeParse('UNKNOWN_STATUS').success).toBe(false);
    });
  });

  describe('idParamSchema', () => {
    it('validates id param with valid UUID', () => {
      expect(
        idParamSchema.safeParse({ id: '123e4567-e89b-12d3-a456-426614174000' }).success,
      ).toBe(true);
    });

    it('rejects non-UUID id param', () => {
      expect(idParamSchema.safeParse({ id: 'invalid' }).success).toBe(false);
    });
  });
});
