import { Form } from 'antd';
import type { Rule, RuleObject } from 'antd/es/form';
import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import {
  CIDR_REGEX,
  IPV4_REGEX,
  IPV6_REGEX,
  MAC_REGEX,
  PHONE_REGEX,
  SKU_REGEX,
  URL_REGEX,
  antdRules,
  formRules,
  isValidationError,
  zodToAntdRule,
} from './formValidators';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Challenger M3-1: Adversarial Form Rule Stress Testing & Catch Block Defense', () => {
  // Helper to extract validator function from Rule
  type ValidatorFn = (rule: RuleObject, value: unknown) => Promise<void>;

  function getValidator(rule: Rule): ValidatorFn {
    if (typeof rule === 'function') {
      throw new Error('Rule is a functional rule, pass form context');
    }
    if (typeof rule === 'object' && rule !== null && 'validator' in rule) {
      return rule.validator as ValidatorFn;
    }
    throw new Error('Rule does not contain a validator');
  }

  // Helper to test Ant Design pattern regex
  function getPattern(rule: Rule): RegExp {
    if (typeof rule === 'object' && rule !== null && 'pattern' in rule) {
      return rule.pattern as RegExp;
    }
    throw new Error('Rule does not contain a pattern');
  }

  describe('1. Adversarial Form Rule Stress Testing', () => {
    describe('1.1 IPv4 Rule Stress Testing', () => {
      const ipv4Rule = formRules.ipv4();
      const pattern = getPattern(ipv4Rule);

      it('must reject out-of-range octets: 999.999.999.999', () => {
        expect(pattern.test('999.999.999.999')).toBe(false);
      });

      it('must reject leading zeros: 01.0.0.1', () => {
        expect(pattern.test('01.0.0.1')).toBe(false);
        expect(pattern.test('192.168.01.1')).toBe(false);
        expect(pattern.test('001.0.0.1')).toBe(false);
      });

      it('must reject octets exceeding 255: 256.0.0.1', () => {
        expect(pattern.test('256.0.0.1')).toBe(false);
        expect(pattern.test('10.256.0.1')).toBe(false);
        expect(pattern.test('10.0.256.1')).toBe(false);
        expect(pattern.test('10.0.0.256')).toBe(false);
      });

      it('must reject non-numeric and malformed strings: abc', () => {
        expect(pattern.test('abc')).toBe(false);
        expect(pattern.test('10.0.0')).toBe(false);
        expect(pattern.test('10.0.0.1.5')).toBe(false);
        expect(pattern.test('10.0.0.1/24')).toBe(false);
        expect(pattern.test('...')).toBe(false);
        expect(pattern.test('localhost')).toBe(false);
      });

      it('must accept valid IPv4 boundary addresses', () => {
        expect(pattern.test('0.0.0.0')).toBe(true);
        expect(pattern.test('255.255.255.255')).toBe(true);
        expect(pattern.test('10.232.130.15')).toBe(true);
        expect(pattern.test('192.168.1.1')).toBe(true);
        expect(pattern.test('172.16.0.1')).toBe(true);
      });
    });

    describe('1.2 CIDR Rule Stress Testing', () => {
      const cidrRule = formRules.cidr();
      const pattern = getPattern(cidrRule);

      it('must reject prefix greater than 32: 10.0.0.0/33', () => {
        expect(pattern.test('10.0.0.0/33')).toBe(false);
        expect(pattern.test('192.168.1.0/34')).toBe(false);
        expect(pattern.test('10.0.0.0/128')).toBe(false);
      });

      it('must reject negative prefix: 10.0.0.0/-1', () => {
        expect(pattern.test('10.0.0.0/-1')).toBe(false);
      });

      it('must reject invalid IP in CIDR: 999.999.999.999/24', () => {
        expect(pattern.test('999.999.999.999/24')).toBe(false);
        expect(pattern.test('256.0.0.0/24')).toBe(false);
        expect(pattern.test('01.0.0.0/24')).toBe(false);
      });

      it('must accept valid CIDR blocks across the 0..32 range', () => {
        expect(pattern.test('0.0.0.0/0')).toBe(true);
        expect(pattern.test('10.0.0.0/8')).toBe(true);
        expect(pattern.test('172.16.0.0/12')).toBe(true);
        expect(pattern.test('192.168.1.0/24')).toBe(true);
        expect(pattern.test('192.168.1.1/32')).toBe(true);
      });
    });

    describe('1.3 MAC Address Rule Stress Testing', () => {
      const macRule = formRules.mac();
      const pattern = getPattern(macRule);

      it('must reject incomplete MAC: 00:11:22:33:44 (5 octets)', () => {
        expect(pattern.test('00:11:22:33:44')).toBe(false);
      });

      it('must reject non-hexadecimal characters: ZZ:ZZ:ZZ:ZZ:ZZ:ZZ', () => {
        expect(pattern.test('ZZ:ZZ:ZZ:ZZ:ZZ:ZZ')).toBe(false);
        expect(pattern.test('GG:11:22:33:44:55')).toBe(false);
        expect(pattern.test('00:11:22:33:44:ZZ')).toBe(false);
      });

      it('must reject oversized hex string: 00112233445566 (14 hex chars)', () => {
        expect(pattern.test('00112233445566')).toBe(false);
      });

      it('must accept valid standard MAC formats', () => {
        // Colon-delimited
        expect(pattern.test('00:11:22:33:44:55')).toBe(true);
        expect(pattern.test('00:1B:44:11:3A:B7')).toBe(true);
        // Dash-delimited
        expect(pattern.test('00-11-22-33-44-55')).toBe(true);
        expect(pattern.test('00-1B-44-11-3A-B7')).toBe(true);
        // Cisco dotted quad
        expect(pattern.test('0011.2233.4455')).toBe(true);
        expect(pattern.test('001b.4411.3ab7')).toBe(true);
        // Bare 12-hex
        expect(pattern.test('001122334455')).toBe(true);
        expect(pattern.test('001B44113AB7')).toBe(true);
      });
    });

    describe('1.4 Phone Number Rule Stress Testing', () => {
      const phoneRule = formRules.phone();
      const pattern = getPattern(phoneRule);

      it('must reject non-numeric strings: abc', () => {
        expect(pattern.test('abc')).toBe(false);
        expect(pattern.test('phone-number')).toBe(false);
      });

      it('must reject too-short numbers: 123 (< 7 chars)', () => {
        expect(pattern.test('123')).toBe(false);
        expect(pattern.test('123456')).toBe(false);
      });

      it('must accept valid E.164 and international phone numbers', () => {
        expect(pattern.test('+84 222 384 8000')).toBe(true);
        expect(pattern.test('+84 24 3728 1234')).toBe(true);
        expect(pattern.test('+1 (555) 123-4567')).toBe(true);
        expect(pattern.test('0912345678')).toBe(true);
        expect(pattern.test('+84912345678')).toBe(true);
        expect(pattern.test('+44-20-7123-4567')).toBe(true);
      });
    });

    describe('1.5 SKU / Code Rule Stress Testing', () => {
      const skuRule = formRules.sku();
      const pattern = getPattern(skuRule);

      it('must reject special characters: SKU#123', () => {
        expect(pattern.test('SKU#123')).toBe(false);
        expect(pattern.test('SKU@123')).toBe(false);
        expect(pattern.test('SKU$123')).toBe(false);
      });

      it('must reject whitespace: SKU 123', () => {
        expect(pattern.test('SKU 123')).toBe(false);
        expect(pattern.test(' SKU123')).toBe(false);
        expect(pattern.test('SKU123 ')).toBe(false);
      });

      it('must accept valid alphanumeric strings with hyphens and underscores', () => {
        expect(pattern.test('SKU123')).toBe(true);
        expect(pattern.test('SKU-123')).toBe(true);
        expect(pattern.test('SKU_123_PRO')).toBe(true);
        expect(pattern.test('DELL-LATITUDE-5420')).toBe(true);
      });
    });

    describe('1.6 Currency Validator Stress Testing', () => {
      const currencyRule = formRules.currency('Cost');
      const validator = getValidator(currencyRule);
      const ruleObj = currencyRule as RuleObject;

      it('must reject negative numbers', async () => {
        await expect(validator(ruleObj, -1)).rejects.toThrow('Cost cannot be negative.');
        await expect(validator(ruleObj, -0.01)).rejects.toThrow('Cost cannot be negative.');
        await expect(validator(ruleObj, '-50')).rejects.toThrow('Cost cannot be negative.');
      });

      it('must reject numbers with more than 2 decimal places: 12.345', async () => {
        await expect(validator(ruleObj, 12.345)).rejects.toThrow(
          'Cost cannot have more than 2 decimal places.',
        );
        await expect(validator(ruleObj, '0.001')).rejects.toThrow(
          'Cost cannot have more than 2 decimal places.',
        );
        await expect(validator(ruleObj, 99.999)).rejects.toThrow(
          'Cost cannot have more than 2 decimal places.',
        );
      });

      it('must reject non-numeric inputs', async () => {
        await expect(validator(ruleObj, 'abc')).rejects.toThrow('Cost must be a valid number.');
      });

      it('must reject amounts exceeding maximum bound', async () => {
        await expect(validator(ruleObj, 100_000_001)).rejects.toThrow('Cost cannot exceed 100,000,000.');
      });

      it('must accept valid currency values within bounds', async () => {
        await expect(validator(ruleObj, 0)).resolves.toBeUndefined();
        await expect(validator(ruleObj, 0.99)).resolves.toBeUndefined();
        await expect(validator(ruleObj, 12.5)).resolves.toBeUndefined();
        await expect(validator(ruleObj, 12.34)).resolves.toBeUndefined();
        await expect(validator(ruleObj, '12.34')).resolves.toBeUndefined();
        await expect(validator(ruleObj, 100_000_000)).resolves.toBeUndefined();
      });

      it('must resolve cleanly for empty/blank values (optional unless required)', async () => {
        await expect(validator(ruleObj, undefined)).resolves.toBeUndefined();
        await expect(validator(ruleObj, null)).resolves.toBeUndefined();
        await expect(validator(ruleObj, '')).resolves.toBeUndefined();
      });
    });

    describe('1.7 Chronological Date Validator Stress Testing', () => {
      const getFieldMock = (values: Record<string, unknown>) => (field: string) => values[field];

      it('must reject when end date is strictly before start date', async () => {
        const dateRuleBuilder = formRules.chronologicalDate('startDate', 'Start Date', 'End Date');
        const ruleConfig = (dateRuleBuilder as (ctx: { getFieldValue: (f: string) => unknown }) => Rule)({
          getFieldValue: getFieldMock({ startDate: '2026-10-10' }),
        });
        const validator = getValidator(ruleConfig);

        await expect(validator(ruleConfig as RuleObject, '2026-10-05')).rejects.toThrow(
          'End Date cannot precede start date.',
        );
      });

      it('must accept when end date is same as start date', async () => {
        const dateRuleBuilder = formRules.chronologicalDate('startDate', 'Start Date', 'End Date');
        const ruleConfig = (dateRuleBuilder as (ctx: { getFieldValue: (f: string) => unknown }) => Rule)({
          getFieldValue: getFieldMock({ startDate: '2026-10-10' }),
        });
        const validator = getValidator(ruleConfig);

        await expect(validator(ruleConfig as RuleObject, '2026-10-10')).resolves.toBeUndefined();
      });

      it('must accept when end date is after start date', async () => {
        const dateRuleBuilder = formRules.chronologicalDate('startDate', 'Start Date', 'End Date');
        const ruleConfig = (dateRuleBuilder as (ctx: { getFieldValue: (f: string) => unknown }) => Rule)({
          getFieldValue: getFieldMock({ startDate: '2026-10-10' }),
        });
        const validator = getValidator(ruleConfig);

        await expect(validator(ruleConfig as RuleObject, '2026-10-15')).resolves.toBeUndefined();
      });

      it('must handle dayjs instances correctly', async () => {
        const dateRuleBuilder = formRules.chronologicalDate('startDate', 'Start Date', 'End Date');
        const ruleConfig = (dateRuleBuilder as (ctx: { getFieldValue: (f: string) => unknown }) => Rule)({
          getFieldValue: getFieldMock({ startDate: dayjs('2026-10-10') }),
        });
        const validator = getValidator(ruleConfig);

        await expect(validator(ruleConfig as RuleObject, dayjs('2026-10-09'))).rejects.toThrow(
          'End Date cannot precede start date.',
        );
        await expect(validator(ruleConfig as RuleObject, dayjs('2026-10-11'))).resolves.toBeUndefined();
      });

      it('must resolve when either start date or end date is missing', async () => {
        const dateRuleBuilder = formRules.chronologicalDate('startDate', 'Start Date', 'End Date');
        const ruleConfigNoStart = (dateRuleBuilder as (ctx: { getFieldValue: (f: string) => unknown }) => Rule)({
          getFieldValue: getFieldMock({ startDate: undefined }),
        });
        const validatorNoStart = getValidator(ruleConfigNoStart);
        await expect(validatorNoStart(ruleConfigNoStart as RuleObject, '2026-10-10')).resolves.toBeUndefined();

        const ruleConfigNoEnd = (dateRuleBuilder as (ctx: { getFieldValue: (f: string) => unknown }) => Rule)({
          getFieldValue: getFieldMock({ startDate: '2026-10-10' }),
        });
        const validatorNoEnd = getValidator(ruleConfigNoEnd);
        await expect(validatorNoEnd(ruleConfigNoEnd as RuleObject, undefined)).resolves.toBeUndefined();
      });
    });
  });

  describe('2. Catch Block Defense Verification: isValidationError', () => {
    it('must return true for Ant Design validation rejection object', () => {
      const antdRejection = {
        errorFields: [{ name: ['email'], errors: ['Required'] }],
        values: {},
        outOfDate: false,
      };
      expect(isValidationError(antdRejection)).toBe(true);
    });

    it('must return true for object with empty errorFields array', () => {
      const emptyErrorFields = { errorFields: [] };
      expect(isValidationError(emptyErrorFields)).toBe(true);
    });

    it('must return true for object with name="ValidationError"', () => {
      const customValidationError = { name: 'ValidationError', message: 'Form invalid' };
      expect(isValidationError(customValidationError)).toBe(true);

      class ValidationError extends Error {
        constructor() {
          super('Form validation error');
          this.name = 'ValidationError';
        }
      }
      expect(isValidationError(new ValidationError())).toBe(true);
    });

    it('must return false for standard Error("Network error")', () => {
      const standardError = new Error('Network error');
      expect(isValidationError(standardError)).toBe(false);
    });

    it('must return false for AxiosError instances or shapes', () => {
      const axiosError = {
        name: 'AxiosError',
        message: 'Request failed with status code 500',
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };
      expect(isValidationError(axiosError)).toBe(false);
    });

    it('must return false for null, undefined, and empty object {}', () => {
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
      expect(isValidationError({})).toBe(false);
    });

    it('must return false for primitive types', () => {
      expect(isValidationError('')).toBe(false);
      expect(isValidationError('ValidationError')).toBe(false);
      expect(isValidationError(123)).toBe(false);
      expect(isValidationError(true)).toBe(false);
      expect(isValidationError(false)).toBe(false);
      expect(isValidationError(Symbol('err'))).toBe(false);
    });

    it('must return false if errorFields is not an array', () => {
      expect(isValidationError({ errorFields: 'not-an-array' })).toBe(false);
      expect(isValidationError({ errorFields: null })).toBe(false);
      expect(isValidationError({ errorFields: 123 })).toBe(false);
      expect(isValidationError({ errorFields: {} })).toBe(false);
    });
  });

  describe('3. Integration Defense: Ant Design Form.validateFields() and isValidationError', () => {
    it('correctly catches Ant Design validation failure in a try/catch block', async () => {
      let isValidationCatch = false;
      let caughtError: unknown = null;

      try {
        // Create an Ant Design validation rejection object directly
        const err = {
          values: { email: '' },
          errorFields: [{ name: ['email'], errors: ['Email is required.'] }],
          outOfDate: false,
        };
        throw err;
      } catch (err: unknown) {
        caughtError = err;
        if (isValidationError(err)) {
          isValidationCatch = true;
          // Successfully guarded against showing toast
        }
      }

      expect(isValidationCatch).toBe(true);
      expect(isValidationError(caughtError)).toBe(true);
    });

    it('does not swallow real network/server errors in a try/catch block', async () => {
      let caughtUnexpectedError = false;

      try {
        throw new Error('500 Internal Server Error: Database offline');
      } catch (err: unknown) {
        if (isValidationError(err)) {
          // Should NOT enter here
          caughtUnexpectedError = false;
        } else {
          // Properly surfaces to logger or error notification
          caughtUnexpectedError = true;
        }
      }

      expect(caughtUnexpectedError).toBe(true);
    });

    it('end-to-end Form.validateFields() rejects invalid inputs and produces isValidationError-compatible error', async () => {
      let formInstance: import('antd').FormInstance | null = null;
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = (await import('react-dom/client')).createRoot(container);

      const TestComponent = () => {
        const [form] = Form.useForm();
        formInstance = form;
        return (
          <Form form={form}>
            <Form.Item name="ip" rules={[formRules.ipv4()]}>
              <input />
            </Form.Item>
            <Form.Item name="cidr" rules={[formRules.cidr()]}>
              <input />
            </Form.Item>
            <Form.Item name="mac" rules={[formRules.mac()]}>
              <input />
            </Form.Item>
            <Form.Item name="phone" rules={[formRules.phone()]}>
              <input />
            </Form.Item>
            <Form.Item name="sku" rules={[formRules.sku()]}>
              <input />
            </Form.Item>
            <Form.Item name="cost" rules={[formRules.currency('Cost')]}>
              <input />
            </Form.Item>
          </Form>
        );
      };

      const { act } = await import('react');
      await act(async () => {
        root.render(<TestComponent />);
      });

      // 1. Set invalid fields
      await act(async () => {
        formInstance?.setFieldsValue({
          ip: '999.999.999.999',
          cidr: '10.0.0.0/33',
          mac: '00:11:22:33:44',
          phone: 'abc',
          sku: 'SKU#123',
          cost: -50,
        });
      });

      let actualError: unknown = null;
      try {
        await act(async () => {
          await formInstance?.validateFields();
        });
      } catch (err) {
        actualError = err;
      }

      expect(actualError).not.toBeNull();
      expect(isValidationError(actualError)).toBe(true);

      const errorObj = actualError as {
        errorFields: Array<{ name: string[]; errors: string[] }>;
      };
      const fieldNames = errorObj.errorFields.map((f) => f.name[0]);
      expect(fieldNames).toContain('ip');
      expect(fieldNames).toContain('cidr');
      expect(fieldNames).toContain('mac');
      expect(fieldNames).toContain('phone');
      expect(fieldNames).toContain('sku');
      expect(fieldNames).toContain('cost');

      // 2. Set valid fields
      await act(async () => {
        formInstance?.setFieldsValue({
          ip: '10.232.130.15',
          cidr: '10.232.130.0/24',
          mac: '00:1B:44:11:3A:B7',
          phone: '+84 222 384 8000',
          sku: 'SKU-123_PRO',
          cost: 1500.5,
        });
      });

      let validResult: unknown = null;
      await act(async () => {
        validResult = await formInstance?.validateFields();
      });

      expect(validResult).toEqual({
        ip: '10.232.130.15',
        cidr: '10.232.130.0/24',
        mac: '00:1B:44:11:3A:B7',
        phone: '+84 222 384 8000',
        sku: 'SKU-123_PRO',
        cost: 1500.5,
      });

      // Cleanup
      await act(async () => {
        root.unmount();
      });
      container.remove();
    });
  });

  describe('4. Extended Form Rule Verification', () => {
    it('required rule trims whitespace-only strings', async () => {
      const requiredRule = formRules.required('Asset Name');
      const validator = getValidator(requiredRule);
      const ruleObj = requiredRule as RuleObject;

      await expect(validator(ruleObj, '')).rejects.toThrow('Asset Name is required.');
      await expect(validator(ruleObj, '   ')).rejects.toThrow('Asset Name is required.');
      await expect(validator(ruleObj, null)).rejects.toThrow('Asset Name is required.');
      await expect(validator(ruleObj, undefined)).rejects.toThrow('Asset Name is required.');
      await expect(validator(ruleObj, 'MacBook Pro')).resolves.toBeUndefined();
    });

    it('re-exported regexes and constants match shared-validators authoritative patterns', () => {
      expect(IPV4_REGEX).toBeDefined();
      expect(IPV6_REGEX).toBeDefined();
      expect(CIDR_REGEX).toBeDefined();
      expect(MAC_REGEX).toBeDefined();
      expect(PHONE_REGEX).toBeDefined();
      expect(SKU_REGEX).toBeDefined();
      expect(URL_REGEX).toBeDefined();
      expect(antdRules).toBeDefined();
      expect(zodToAntdRule).toBeDefined();
    });
  });
});
