import {
  IPStatus,
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  RackStatus,
  SwitchRole,
  SwitchStatus,
  VlanStatus,
} from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  autoDetectQuerySchema,
  calculateSubnetQuerySchema,
  createIpAddressSchema,
  createRackSchema,
  createSubnetSchema,
  createSwitchPortSchema,
  createSwitchSchema,
  createVlanSchema,
  ipAddressQuerySchema,
  macVendorQuerySchema,
  rackQuerySchema,
  subnetQuerySchema,
  switchPortQuerySchema,
  switchQuerySchema,
  updateIpAddressSchema,
  updateRackSchema,
  updateSubnetSchema,
  updateSwitchPortSchema,
  updateSwitchSchema,
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

  describe('createRackSchema', () => {
    it('validates a correct Rack payload', () => {
      const valid = {
        name: 'Datacenter Rack 01',
        code: 'RACK-DC-01',
        totalHeight: 42,
        depth: 1070,
        width: 600,
        maxPowerKw: 10,
        maxWeightKg: 1200,
        status: RackStatus.ACTIVE,
        notes: 'Main server and network cabinet',
      };
      const result = createRackSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects missing name or code', () => {
      expect(createRackSchema.safeParse({ name: '', code: 'RACK-01' }).success).toBe(false);
      expect(createRackSchema.safeParse({ name: 'Rack 01', code: '' }).success).toBe(false);
    });

    it('rejects invalid height', () => {
      expect(
        createRackSchema.safeParse({ name: 'Rack', code: 'R-01', totalHeight: 0 }).success,
      ).toBe(false);
      expect(
        createRackSchema.safeParse({ name: 'Rack', code: 'R-01', totalHeight: 150 }).success,
      ).toBe(false);
    });
  });

  describe('updateRackSchema', () => {
    it('allows partial updates to rack fields', () => {
      const result = updateRackSchema.safeParse({
        maxPowerKw: 12.5,
        status: RackStatus.MAINTENANCE,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('rackQuerySchema', () => {
    it('coerces numeric page and limit parameters', () => {
      const result = rackQuerySchema.safeParse({ page: '1', pageSize: '20', search: 'DC-01' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.search).toBe('DC-01');
      }
    });
  });

  describe('createSwitchSchema', () => {
    it('validates a complete NetworkSwitch payload', () => {
      const valid = {
        name: 'BSL-CORE-SW01',
        model: 'Catalyst 9300-48P',
        vendor: 'Cisco',
        serialNumber: 'FOC2345ABCD',
        macAddress: '00:1A:2B:3C:4D:5E',
        role: SwitchRole.CORE,
        status: SwitchStatus.ONLINE,
        totalPorts: 48,
        rackPosition: 39,
        rackHeight: 1,
      };
      const result = createSwitchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects missing name, model, or vendor', () => {
      expect(
        createSwitchSchema.safeParse({ name: '', model: '9300', vendor: 'Cisco' }).success,
      ).toBe(false);
      expect(
        createSwitchSchema.safeParse({ name: 'Switch', model: '', vendor: 'Cisco' }).success,
      ).toBe(false);
      expect(
        createSwitchSchema.safeParse({ name: 'Switch', model: '9300', vendor: '' }).success,
      ).toBe(false);
    });

    it('rejects invalid MAC address format', () => {
      expect(
        createSwitchSchema.safeParse({
          name: 'SW',
          model: 'M',
          vendor: 'V',
          macAddress: 'not-a-mac',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateSwitchSchema', () => {
    it('allows partial switch updates', () => {
      const result = updateSwitchSchema.safeParse({
        status: SwitchStatus.MAINTENANCE,
        firmwareVersion: '17.9.4a',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('switchQuerySchema', () => {
    it('parses filter criteria', () => {
      const result = switchQuerySchema.safeParse({
        vendor: 'Cisco',
        role: SwitchRole.CORE,
        status: SwitchStatus.ONLINE,
        page: '1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vendor).toBe('Cisco');
        expect(result.data.page).toBe(1);
      }
    });
  });

  describe('createSwitchPortSchema', () => {
    it('validates a complete switch port payload', () => {
      const valid = {
        switchId: '123e4567-e89b-12d3-a456-426614174000',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: PortFormFactor.RJ45_1G,
        poeEnabled: true,
        adminStatus: PortAdminStatus.UP,
        operStatus: PortOperStatus.ACTIVE,
        speed: '1 Gbps',
        duplex: 'Full',
        mode: PortMode.ACCESS,
      };
      const result = createSwitchPortSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid port number or missing name', () => {
      expect(
        createSwitchPortSchema.safeParse({
          switchId: '123e4567-e89b-12d3-a456-426614174000',
          portNumber: 0,
          name: 'Gi1/0/1',
        }).success,
      ).toBe(false);
      expect(
        createSwitchPortSchema.safeParse({
          switchId: '123e4567-e89b-12d3-a456-426614174000',
          portNumber: 1,
          name: '',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateSwitchPortSchema', () => {
    it('allows updating port status and mode', () => {
      const result = updateSwitchPortSchema.safeParse({
        adminStatus: PortAdminStatus.DOWN,
        operStatus: PortOperStatus.DOWN,
        mode: PortMode.TRUNK,
        taggedVlanIds: [100, 110, 120],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('switchPortQuerySchema', () => {
    it('validates switch port query filters', () => {
      const result = switchPortQuerySchema.safeParse({
        switchId: '123e4567-e89b-12d3-a456-426614174000',
        operStatus: PortOperStatus.ACTIVE,
        page: '1',
        pageSize: '48',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(48);
      }
    });
  });
});
