import { STANDARD_SWITCH_PORT_COUNTS, type StandardSwitchPortCount } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import { createAssetSchema, updateAssetSchema } from './asset.validator';
import {
  createIpAddressSchema,
  createSwitchSchema,
  updateIpAddressSchema,
  updateSwitchSchema,
} from './network.validator';

describe('Milestone 1 Empirical Challenger — Shared Layer Validation Suite', () => {
  // =========================================================================
  // 1. ASSET SCHEMA: serialNumber Optionality & Boundaries
  // =========================================================================
  describe('createAssetSchema — serialNumber edge cases & boundaries', () => {
    const baseAsset = {
      name: 'MacBook Pro 16 M3',
    };

    it('accepts serialNumber: null', () => {
      const res = createAssetSchema.safeParse({ ...baseAsset, serialNumber: null });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.serialNumber).toBeNull();
      }
    });

    it('accepts serialNumber: undefined', () => {
      const res = createAssetSchema.safeParse({ ...baseAsset, serialNumber: undefined });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.serialNumber).toBeUndefined();
      }
    });

    it('accepts omitted serialNumber', () => {
      const res = createAssetSchema.safeParse(baseAsset);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.serialNumber).toBeUndefined();
      }
    });

    it('accepts serialNumber: empty string ("")', () => {
      const res = createAssetSchema.safeParse({ ...baseAsset, serialNumber: '' });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.serialNumber).toBe('');
      }
    });

    it('accepts serialNumber at max boundary (100 characters)', () => {
      const serial100 = 'A'.repeat(100);
      const res = createAssetSchema.safeParse({ ...baseAsset, serialNumber: serial100 });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.serialNumber).toBe(serial100);
      }
    });

    it('rejects serialNumber exceeding max boundary (101 characters)', () => {
      const serial101 = 'A'.repeat(101);
      const res = createAssetSchema.safeParse({ ...baseAsset, serialNumber: serial101 });
      expect(res.success).toBe(false);
      if (!res.success) {
        const serialError = res.error.issues.find((issue) => issue.path.includes('serialNumber'));
        expect(serialError).toBeDefined();
      }
    });

    it('rejects non-string serialNumber types (e.g. number, boolean, object)', () => {
      expect(
        createAssetSchema.safeParse({ ...baseAsset, serialNumber: 12345 as unknown as string })
          .success,
      ).toBe(false);
      expect(
        createAssetSchema.safeParse({ ...baseAsset, serialNumber: true as unknown as string })
          .success,
      ).toBe(false);
      expect(
        createAssetSchema.safeParse({
          ...baseAsset,
          serialNumber: { value: 'SN123' } as unknown as string,
        }).success,
      ).toBe(false);
    });

    it('verifies updateAssetSchema handles serialNumber similarly', () => {
      expect(updateAssetSchema.safeParse({ serialNumber: null }).success).toBe(true);
      expect(updateAssetSchema.safeParse({ serialNumber: undefined }).success).toBe(true);
      expect(updateAssetSchema.safeParse({ serialNumber: '' }).success).toBe(true);
      expect(updateAssetSchema.safeParse({ serialNumber: 'A'.repeat(100) }).success).toBe(true);
      expect(updateAssetSchema.safeParse({ serialNumber: 'A'.repeat(101) }).success).toBe(false);
    });
  });

  // =========================================================================
  // 2. ASSET SCHEMA: Complete Purge of purchasePrice and purchaseCost
  // =========================================================================
  describe('createAssetSchema — purchasePrice & purchaseCost purge', () => {
    it('confirms purchasePrice and purchaseCost are not keys on createAssetSchema.shape', () => {
      const shape = createAssetSchema.shape;
      expect('purchasePrice' in shape).toBe(false);
      expect('purchaseCost' in shape).toBe(false);
    });

    it('strips purchasePrice and purchaseCost from parsed output in default safeParse', () => {
      const inputWithFinancials = {
        name: 'Dell PowerEdge R750',
        purchasePrice: 4500.0,
        purchaseCost: 4200.0,
        notes: 'Rackmount server',
      };
      const res = createAssetSchema.safeParse(inputWithFinancials);
      expect(res.success).toBe(true);
      if (res.success) {
        expect('purchasePrice' in res.data).toBe(false);
        expect('purchaseCost' in res.data).toBe(false);
        expect(res.data.name).toBe('Dell PowerEdge R750');
        expect(res.data.notes).toBe('Rackmount server');
      }
    });

    it('rejects payload with purchasePrice or purchaseCost under strict validation', () => {
      const strictSchema = createAssetSchema.strict();

      const resPrice = strictSchema.safeParse({
        name: 'Asset A',
        purchasePrice: 1500,
      });
      expect(resPrice.success).toBe(false);
      if (!resPrice.success) {
        const issue = resPrice.error.issues.find(
          (i) =>
            i.code === 'unrecognized_keys' &&
            (i as unknown as { keys: string[] }).keys.includes('purchasePrice'),
        );
        expect(issue).toBeDefined();
      }

      const resCost = strictSchema.safeParse({
        name: 'Asset B',
        purchaseCost: 1200,
      });
      expect(resCost.success).toBe(false);
      if (!resCost.success) {
        const issue = resCost.error.issues.find(
          (i) =>
            i.code === 'unrecognized_keys' &&
            (i as unknown as { keys: string[] }).keys.includes('purchaseCost'),
        );
        expect(issue).toBeDefined();
      }
    });

    it('confirms updateAssetSchema also strips or rejects purchasePrice and purchaseCost', () => {
      const res = updateAssetSchema.safeParse({ purchasePrice: 999, purchaseCost: 888 });
      expect(res.success).toBe(true);
      if (res.success) {
        expect('purchasePrice' in res.data).toBe(false);
        expect('purchaseCost' in res.data).toBe(false);
      }

      const resStrict = updateAssetSchema.strict().safeParse({ purchasePrice: 999 });
      expect(resStrict.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. NETWORK SWITCH SCHEMA: totalPorts Diverse Standard Sizes & Boundaries
  // =========================================================================
  describe('createSwitchSchema — totalPorts standards and boundary challenge', () => {
    const baseSwitch = {
      name: 'Access Switch 01',
      model: 'Catalyst 9300',
      vendor: 'Cisco',
    };

    it('validates standard switch port counts: 8, 16, 24, and 48 ports', () => {
      const portSizes: StandardSwitchPortCount[] = [8, 16, 24, 48];
      for (const ports of portSizes) {
        const res = createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: ports });
        expect(res.success, `totalPorts: ${ports} should be valid`).toBe(true);
        if (res.success) {
          expect(res.data.totalPorts).toBe(ports);
        }
      }
    });

    it('confirms all STANDARD_SWITCH_PORT_COUNTS constant values parse successfully', () => {
      for (const ports of STANDARD_SWITCH_PORT_COUNTS) {
        const res = createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: ports });
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.totalPorts).toBe(ports);
        }
      }
    });

    it('defaults totalPorts to 24 when omitted', () => {
      const res = createSwitchSchema.safeParse(baseSwitch);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.totalPorts).toBe(24);
      }
    });

    it('rejects totalPorts = 0 (underflow)', () => {
      const res = createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: 0 });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find((i) => i.path.includes('totalPorts'));
        expect(issue).toBeDefined();
      }
    });

    it('rejects negative totalPorts (e.g. -1, -24)', () => {
      expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: -1 }).success).toBe(false);
      expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: -24 }).success).toBe(false);
    });

    it('rejects totalPorts = 129 (overflow > 128)', () => {
      const res = createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: 129 });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find((i) => i.path.includes('totalPorts'));
        expect(issue).toBeDefined();
      }
    });

    it('rejects non-integer floating point numbers (e.g. 8.5, 24.1, 48.001)', () => {
      expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: 8.5 }).success).toBe(false);
      expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: 24.1 }).success).toBe(false);
      expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: 48.001 }).success).toBe(
        false,
      );
    });

    it('rejects non-numeric totalPorts (e.g. string numbers, boolean, NaN, Infinity)', () => {
      expect(
        createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: '24' as unknown as number })
          .success,
      ).toBe(false);
      expect(
        createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: true as unknown as number })
          .success,
      ).toBe(false);
      expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: NaN }).success).toBe(false);
      expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: Infinity }).success).toBe(
        false,
      );
    });

    it('verifies updateSwitchSchema accepts valid totalPorts and rejects invalid', () => {
      expect(updateSwitchSchema.safeParse({ totalPorts: 8 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ totalPorts: 16 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ totalPorts: 24 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ totalPorts: 48 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ totalPorts: 0 }).success).toBe(false);
      expect(updateSwitchSchema.safeParse({ totalPorts: -1 }).success).toBe(false);
      expect(updateSwitchSchema.safeParse({ totalPorts: 129 }).success).toBe(false);
      expect(updateSwitchSchema.safeParse({ totalPorts: 16.5 }).success).toBe(false);
    });
  });

  // =========================================================================
  // 4. IP ADDRESS SCHEMA: Hostname Purge Verification
  // =========================================================================
  describe('createIpAddressSchema — hostname purge verification', () => {
    it('confirms hostname is no longer in createIpAddressSchema.shape', () => {
      expect('hostname' in createIpAddressSchema.shape).toBe(false);
    });

    it('confirms hostname is no longer in updateIpAddressSchema.shape', () => {
      expect('hostname' in updateIpAddressSchema.shape).toBe(false);
    });

    it('strips hostname from parsed output when provided in payload', () => {
      const inputWithHostname = {
        address: '10.232.130.25',
        hostname: 'sw-mgmt-core-01.youngonevn.com',
        deviceType: 'Switch Management',
      };
      const res = createIpAddressSchema.safeParse(inputWithHostname);
      expect(res.success).toBe(true);
      if (res.success) {
        expect('hostname' in res.data).toBe(false);
        expect(res.data.address).toBe('10.232.130.25');
        expect(res.data.deviceType).toBe('Switch Management');
      }
    });

    it('rejects payload with hostname under strict validation', () => {
      const strictSchema = createIpAddressSchema.strict();
      const res = strictSchema.safeParse({
        address: '10.232.130.25',
        hostname: 'sw-mgmt-core-01.youngonevn.com',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(
          (i) =>
            i.code === 'unrecognized_keys' &&
            (i as unknown as { keys: string[] }).keys.includes('hostname'),
        );
        expect(issue).toBeDefined();
      }
    });

    it('rejects updateIpAddressSchema with hostname under strict validation', () => {
      const res = updateIpAddressSchema.strict().safeParse({
        hostname: 'legacy-hostname.corp',
      });
      expect(res.success).toBe(false);
    });
  });
});
