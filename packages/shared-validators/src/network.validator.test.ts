import { IPStatus, VlanStatus } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  autoDetectQuerySchema,
  calculateSubnetQuerySchema,
  createIpAddressSchema,
  createSubnetSchema,
  createVlanSchema,
  macVendorQuerySchema,
  updateSubnetSchema,
  updateVlanSchema,
  vlanQuerySchema,
} from './network.validator';

describe('network.validator', () => {
  describe('createVlanSchema', () => {
    it('validates a correct VLAN input', () => {
      const valid = {
        vlanNumber: 130,
        name: 'Access Control',
        description: 'VLAN for door access and fingerprint readers',
        status: VlanStatus.ACTIVE,
      };
      const result = createVlanSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid VLAN number', () => {
      expect(createVlanSchema.safeParse({ vlanNumber: 0, name: 'VLAN 0' }).success).toBe(false);
      expect(createVlanSchema.safeParse({ vlanNumber: 5000, name: 'VLAN 5000' }).success).toBe(
        false,
      );
    });

    it('rejects missing VLAN name', () => {
      expect(createVlanSchema.safeParse({ vlanNumber: 100, name: '' }).success).toBe(false);
    });
  });

  describe('updateVlanSchema', () => {
    it('allows partial updates', () => {
      const result = updateVlanSchema.safeParse({ name: 'Renamed VLAN' });
      expect(result.success).toBe(true);
    });
  });

  describe('vlanQuerySchema', () => {
    it('coerces numeric page and limit', () => {
      const result = vlanQuerySchema.safeParse({ page: '2', limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
      }
    });
  });

  describe('createSubnetSchema', () => {
    it('validates valid CIDR and name', () => {
      const valid = {
        cidr: '10.232.130.0/24',
        name: 'BSL Access Control Subnet',
        gateway: '10.232.130.254',
      };
      const result = createSubnetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects malformed CIDR', () => {
      expect(
        createSubnetSchema.safeParse({ cidr: '10.232.130.0/35', name: 'Bad CIDR' }).success,
      ).toBe(false);
      expect(createSubnetSchema.safeParse({ cidr: 'invalid-cidr', name: 'Bad CIDR' }).success).toBe(
        false,
      );
    });

    it('rejects invalid gateway address', () => {
      expect(
        createSubnetSchema.safeParse({
          cidr: '10.232.130.0/24',
          name: 'Subnet',
          gateway: '999.999.999.999',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateSubnetSchema', () => {
    it('allows partial subnet updates', () => {
      const result = updateSubnetSchema.safeParse({ gateway: '10.232.130.1' });
      expect(result.success).toBe(true);
    });
  });

  describe('createIpAddressSchema', () => {
    it('validates a complete IP record', () => {
      const valid = {
        address: '10.232.130.15',
        hostname: 'BSL-AC-01',
        macAddress: '00:1A:2B:3C:4D:5E',
        vendor: 'Cisco',
        status: IPStatus.ASSIGNED,
        deviceType: 'Access Control',
      };
      const result = createIpAddressSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid IP address', () => {
      expect(createIpAddressSchema.safeParse({ address: 'not-an-ip' }).success).toBe(false);
    });
  });

  describe('automation query schemas', () => {
    it('validates calculateSubnetQuerySchema', () => {
      expect(calculateSubnetQuerySchema.safeParse({ cidr: '192.168.1.0/24' }).success).toBe(true);
      expect(calculateSubnetQuerySchema.safeParse({ cidr: '192.168.1.0' }).success).toBe(false);
    });

    it('validates autoDetectQuerySchema', () => {
      expect(autoDetectQuerySchema.safeParse({ ip: '10.232.130.15' }).success).toBe(true);
      expect(autoDetectQuerySchema.safeParse({ ip: 'invalid' }).success).toBe(false);
    });

    it('validates macVendorQuerySchema', () => {
      expect(macVendorQuerySchema.safeParse({ mac: '44:19:B6' }).success).toBe(true);
      expect(macVendorQuerySchema.safeParse({ mac: '12' }).success).toBe(false);
    });
  });
});
