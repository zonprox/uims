import {
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  RackStatus,
  SwitchRole,
  SwitchStatus,
} from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  createRackSchema,
  createSwitchPortSchema,
  createSwitchSchema,
  macRegex,
  updateRackSchema,
  updateSwitchPortSchema,
  updateSwitchSchema,
} from './network.validator';

describe('Milestone 1 Challenger — Empirical Zod Schema Adversarial Suite', () => {
  // =========================================================================
  // 1. PORT NUMBER EDGE CASES
  // =========================================================================
  describe('Port Number Boundary & Edge Cases (createSwitchPortSchema)', () => {
    const baseValidPort = {
      switchId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Gi1/0/1',
      formFactor: PortFormFactor.RJ45_1G,
    };

    it('accepts lower valid boundary (portNumber = 1)', () => {
      const res = createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: 1 });
      expect(res.success).toBe(true);
    });

    it('accepts upper valid boundary (portNumber = 128)', () => {
      const res = createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: 128 });
      expect(res.success).toBe(true);
    });

    it('rejects portNumber = 0 (underflow)', () => {
      const res = createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: 0 });
      expect(res.success).toBe(false);
    });

    it('rejects negative portNumber (e.g. -1, -48)', () => {
      expect(createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: -1 }).success).toBe(
        false,
      );
      expect(createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: -48 }).success).toBe(
        false,
      );
    });

    it('rejects portNumber > 128 (overflow, e.g. 129, 99999)', () => {
      expect(createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: 129 }).success).toBe(
        false,
      );
      expect(
        createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: 99999 }).success,
      ).toBe(false);
    });

    it('rejects floating-point port numbers (e.g. 1.5, 24.01)', () => {
      expect(createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: 1.5 }).success).toBe(
        false,
      );
      expect(
        createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: 24.01 }).success,
      ).toBe(false);
    });

    it('rejects non-numeric port numbers (NaN, Infinity, string numbers)', () => {
      expect(createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: NaN }).success).toBe(
        false,
      );
      expect(
        createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: Infinity }).success,
      ).toBe(false);
      expect(
        createSwitchPortSchema.safeParse({ ...baseValidPort, portNumber: '1' as unknown as number })
          .success,
      ).toBe(false);
    });
  });

  // =========================================================================
  // 2. RACK UNIT HEIGHT & POSITION EDGE CASES
  // =========================================================================
  describe('Rack Unit Height & Position Boundaries', () => {
    describe('createRackSchema.totalHeight', () => {
      const baseValidRack = {
        name: 'Rack-Alpha',
        code: 'RACK-A01',
      };

      it('defaults totalHeight to 42 when omitted', () => {
        const res = createRackSchema.safeParse(baseValidRack);
        expect(res.success).toBe(true);
        if (res.success) {
          expect(res.data.totalHeight).toBe(42);
        }
      });

      it('accepts standard rack heights (12, 24, 42, 48, 100)', () => {
        for (const height of [1, 12, 24, 42, 48, 100]) {
          const res = createRackSchema.safeParse({ ...baseValidRack, totalHeight: height });
          expect(res.success, `totalHeight ${height} should be valid`).toBe(true);
        }
      });

      it('rejects totalHeight <= 0', () => {
        expect(createRackSchema.safeParse({ ...baseValidRack, totalHeight: 0 }).success).toBe(
          false,
        );
        expect(createRackSchema.safeParse({ ...baseValidRack, totalHeight: -12 }).success).toBe(
          false,
        );
      });

      it('rejects totalHeight > 100', () => {
        expect(createRackSchema.safeParse({ ...baseValidRack, totalHeight: 101 }).success).toBe(
          false,
        );
        expect(createRackSchema.safeParse({ ...baseValidRack, totalHeight: 1000 }).success).toBe(
          false,
        );
      });

      it('rejects float totalHeight (e.g. 42.5)', () => {
        expect(createRackSchema.safeParse({ ...baseValidRack, totalHeight: 42.5 }).success).toBe(
          false,
        );
      });

      it('rejects negative dimensions and power capacities', () => {
        expect(createRackSchema.safeParse({ ...baseValidRack, depth: -1000 }).success).toBe(false);
        expect(createRackSchema.safeParse({ ...baseValidRack, width: 0 }).success).toBe(false);
        expect(createRackSchema.safeParse({ ...baseValidRack, maxPowerKw: -5 }).success).toBe(
          false,
        );
        expect(createRackSchema.safeParse({ ...baseValidRack, maxWeightKg: -100 }).success).toBe(
          false,
        );
      });
    });

    describe('createSwitchSchema.rackPosition & rackHeight', () => {
      const baseValidSwitch = {
        name: 'Edge-Switch-01',
        model: 'Catalyst 9200',
        vendor: 'Cisco',
      };

      it('accepts valid rackPosition (1..100) and rackHeight (1..10)', () => {
        const res = createSwitchSchema.safeParse({
          ...baseValidSwitch,
          rackPosition: 1,
          rackHeight: 1,
        });
        expect(res.success).toBe(true);

        const res2 = createSwitchSchema.safeParse({
          ...baseValidSwitch,
          rackPosition: 48,
          rackHeight: 4,
        });
        expect(res2.success).toBe(true);
      });

      it('rejects rackPosition <= 0 or > 100', () => {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, rackPosition: 0 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, rackPosition: -5 }).success).toBe(
          false,
        );
        expect(
          createSwitchSchema.safeParse({ ...baseValidSwitch, rackPosition: 101 }).success,
        ).toBe(false);
      });

      it('rejects rackHeight <= 0 or > 10', () => {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, rackHeight: 0 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, rackHeight: -1 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, rackHeight: 11 }).success).toBe(
          false,
        );
      });

      it('rejects float rackPosition or rackHeight', () => {
        expect(
          createSwitchSchema.safeParse({ ...baseValidSwitch, rackPosition: 20.5 }).success,
        ).toBe(false);
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, rackHeight: 1.5 }).success).toBe(
          false,
        );
      });

      it('rejects totalPorts <= 0, odd numbers, or > 48', () => {
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: 0 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: -1 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: 1 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: 7 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: 49 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: 50 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: 128 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, totalPorts: 129 }).success).toBe(
          false,
        );
      });

      it('validates uplinkPorts and fiberPorts bounds (0..8)', () => {
        expect(
          createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: 0, fiberPorts: 0 })
            .success,
        ).toBe(true);
        expect(
          createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: 8, fiberPorts: 8 })
            .success,
        ).toBe(true);
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: -1 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, uplinkPorts: 9 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: -1 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseValidSwitch, fiberPorts: 9 }).success).toBe(
          false,
        );
      });
    });
  });

  // =========================================================================
  // 3. MAC ADDRESS REGEX & FORMAT EDGE CASES
  // =========================================================================
  describe('MAC Address Regex & Formatting (macRegex & createSwitchSchema)', () => {
    const baseValidSwitch = {
      name: 'SW-MAC-TEST',
      model: 'EX2300',
      vendor: 'Juniper',
    };

    it('accepts valid IEEE standard colon format (00:1A:2B:3C:4D:5E)', () => {
      expect(macRegex.test('00:1A:2B:3C:4D:5E')).toBe(true);
      expect(macRegex.test('00:1a:2b:3c:4d:5e')).toBe(true);
      const res = createSwitchSchema.safeParse({
        ...baseValidSwitch,
        macAddress: '00:1A:2B:3C:4D:5E',
      });
      expect(res.success).toBe(true);
    });

    it('accepts valid hyphen format (00-1A-2B-3C-4D-5E)', () => {
      expect(macRegex.test('00-1A-2B-3C-4D-5E')).toBe(true);
      expect(macRegex.test('00-1a-2b-3c-4d-5e')).toBe(true);
      const res = createSwitchSchema.safeParse({
        ...baseValidSwitch,
        macAddress: '00-1A-2B-3C-4D-5E',
      });
      expect(res.success).toBe(true);
    });

    it('accepts valid Cisco dotted quad format (001A.2B3C.4D5E)', () => {
      expect(macRegex.test('001A.2B3C.4D5E')).toBe(true);
      expect(macRegex.test('001a.2b3c.4d5e')).toBe(true);
      const res = createSwitchSchema.safeParse({
        ...baseValidSwitch,
        macAddress: '001A.2B3C.4D5E',
      });
      expect(res.success).toBe(true);
    });

    it('accepts valid raw 12-hex bare format (001A2B3C4D5E)', () => {
      expect(macRegex.test('001A2B3C4D5E')).toBe(true);
      expect(macRegex.test('001a2b3c4d5e')).toBe(true);
      const res = createSwitchSchema.safeParse({ ...baseValidSwitch, macAddress: '001A2B3C4D5E' });
      expect(res.success).toBe(true);
    });

    it('rejects non-hex characters (e.g. 00:1A:2B:3C:4D:GG)', () => {
      expect(macRegex.test('00:1A:2B:3C:4D:GG')).toBe(false);
      expect(macRegex.test('ZZ:1A:2B:3C:4D:5E')).toBe(false);
      const res = createSwitchSchema.safeParse({
        ...baseValidSwitch,
        macAddress: '00:1A:2B:3C:4D:GG',
      });
      expect(res.success).toBe(false);
    });

    it('rejects too short MAC address (e.g. 5 octets)', () => {
      expect(macRegex.test('00:1A:2B:3C:4D')).toBe(false);
      const res = createSwitchSchema.safeParse({
        ...baseValidSwitch,
        macAddress: '00:1A:2B:3C:4D',
      });
      expect(res.success).toBe(false);
    });

    it('rejects too long MAC address (e.g. 7 octets)', () => {
      expect(macRegex.test('00:1A:2B:3C:4D:5E:6F')).toBe(false);
      const res = createSwitchSchema.safeParse({
        ...baseValidSwitch,
        macAddress: '00:1A:2B:3C:4D:5E:6F',
      });
      expect(res.success).toBe(false);
    });

    it('rejects random strings, IP addresses, and CIDR blocks as MAC', () => {
      expect(macRegex.test('not-a-mac-address')).toBe(false);
      expect(macRegex.test('192.168.1.1')).toBe(false);
      expect(macRegex.test('10.0.0.0/24')).toBe(false);
    });
  });

  // =========================================================================
  // 4. ENUM VALIDATION DEFECT CHALLENGE (Vulnerability Surface)
  // =========================================================================
  describe('Enum Validation Robustness vs Loose z.union([z.nativeEnum, z.string()])', () => {
    /**
     * EMPIRICAL FINDING:
     * When schemas declare `z.union([z.nativeEnum(Enum), z.string()])`,
     * any arbitrary garbage string matches the second union member (`z.string()`).
     * As a result, Zod returns success: true, allowing corrupt strings to pass through
     * to the controller/service and blow up with unhandled DB exceptions (500) in PostgreSQL.
     */

    it('rejects invalid arbitrary strings for createRackSchema and updateRackSchema status', () => {
      const res = createRackSchema.safeParse({
        name: 'Rack-Vulnerability-Test',
        code: 'RACK-VULN-01',
        status: 'COMPLETELY_INVALID_STATUS_12345' as unknown as RackStatus,
      });
      expect(res.success).toBe(false);

      const resUpdate = updateRackSchema.safeParse({
        status: 'BOGUS_STATUS' as unknown as RackStatus,
      });
      expect(resUpdate.success).toBe(false);
    });

    it('rejects invalid arbitrary strings for createSwitchSchema and updateSwitchSchema role and status', () => {
      const resRole = createSwitchSchema.safeParse({
        name: 'SW-Role-Test',
        model: 'EX2300',
        vendor: 'Juniper',
        role: 'NON_EXISTENT_SWITCH_ROLE' as unknown as SwitchRole,
      });
      expect(resRole.success).toBe(false);

      const resStatus = createSwitchSchema.safeParse({
        name: 'SW-Status-Test',
        model: 'EX2300',
        vendor: 'Juniper',
        status: 'COMPLETELY_BOGUS_STATUS' as unknown as SwitchStatus,
      });
      expect(resStatus.success).toBe(false);

      const resUpdateRole = updateSwitchSchema.safeParse({
        role: 'BOGUS_ROLE' as unknown as SwitchRole,
      });
      expect(resUpdateRole.success).toBe(false);

      const resUpdateStatus = updateSwitchSchema.safeParse({
        status: 'BOGUS_STATUS' as unknown as SwitchStatus,
      });
      expect(resUpdateStatus.success).toBe(false);
    });

    it('rejects invalid arbitrary strings for createSwitchPortSchema and updateSwitchPortSchema enums', () => {
      const res = createSwitchPortSchema.safeParse({
        switchId: '123e4567-e89b-12d3-a456-426614174000',
        portNumber: 1,
        name: 'Gi1/0/1',
        operStatus: 'SUPER_FLAPPING_EXPLODED' as unknown as PortOperStatus,
        mode: 'MAGIC_TRUNK_MODE' as unknown as PortMode,
      });
      expect(res.success).toBe(false);

      const resUpdate = updateSwitchPortSchema.safeParse({
        formFactor: 'INVALID_FORM_FACTOR' as unknown as PortFormFactor,
        adminStatus: 'INVALID_ADMIN' as unknown as PortAdminStatus,
        operStatus: 'INVALID_OPER' as unknown as PortOperStatus,
        mode: 'INVALID_MODE' as unknown as PortMode,
      });
      expect(resUpdate.success).toBe(false);
    });

    it('verifies that legitimate enum members ARE accepted properly', () => {
      // Valid RackStatus
      for (const st of Object.values(RackStatus)) {
        expect(createRackSchema.safeParse({ name: 'R', code: 'C', status: st }).success).toBe(true);
      }
      // Valid SwitchRole
      for (const r of Object.values(SwitchRole)) {
        expect(
          createSwitchSchema.safeParse({ name: 'S', model: 'M', vendor: 'V', role: r }).success,
        ).toBe(true);
      }
      // Valid SwitchStatus
      for (const st of Object.values(SwitchStatus)) {
        expect(
          createSwitchSchema.safeParse({ name: 'S', model: 'M', vendor: 'V', status: st }).success,
        ).toBe(true);
      }
      // Valid PortOperStatus
      for (const op of Object.values(PortOperStatus)) {
        expect(
          createSwitchPortSchema.safeParse({
            switchId: '123e4567-e89b-12d3-a456-426614174000',
            portNumber: 1,
            name: 'Gi1/0/1',
            operStatus: op,
          }).success,
        ).toBe(true);
      }
    });
  });
});
