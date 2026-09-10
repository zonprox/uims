import { describe, expect, it } from 'vitest';
import {
  calculateSubnet,
  calculateUtilization,
  findMatchingSubnet,
  findNextAvailableIp,
  intToIp,
  ipToInt,
  isIpInSubnet,
  isValidCidr,
  isValidIp,
  lookupMacVendor,
  maskToPrefix,
  normalizeMac,
  prefixToMask,
} from './network';

describe('network calculations', () => {
  describe('isValidIp', () => {
    it('returns true for valid IPv4 addresses', () => {
      expect(isValidIp('10.232.130.1')).toBe(true);
      expect(isValidIp('192.168.1.254')).toBe(true);
      expect(isValidIp('0.0.0.0')).toBe(true);
      expect(isValidIp('255.255.255.255')).toBe(true);
    });

    it('returns false for invalid addresses', () => {
      expect(isValidIp('256.0.0.1')).toBe(false);
      expect(isValidIp('10.1.1')).toBe(false);
      expect(isValidIp('10.1.1.1.1')).toBe(false);
      expect(isValidIp('01.02.03.04')).toBe(false);
      expect(isValidIp('abc.def.ghi.jkl')).toBe(false);
      expect(isValidIp('')).toBe(false);
    });
  });

  describe('isValidCidr', () => {
    it('returns true for valid IPv4 CIDR blocks', () => {
      expect(isValidCidr('10.232.130.0/24')).toBe(true);
      expect(isValidCidr('192.168.0.0/16')).toBe(true);
      expect(isValidCidr('0.0.0.0/0')).toBe(true);
      expect(isValidCidr('10.0.0.1/32')).toBe(true);
    });

    it('returns false for invalid CIDR notation', () => {
      expect(isValidCidr('10.232.130.0/33')).toBe(false);
      expect(isValidCidr('10.232.130.0/-1')).toBe(false);
      expect(isValidCidr('10.232.130.0')).toBe(false);
      expect(isValidCidr('bad/24')).toBe(false);
    });
  });

  describe('ipToInt and intToIp conversions', () => {
    it('converts IP to 32-bit unsigned integer and back', () => {
      const ip = '10.232.130.15';
      const int = ipToInt(ip);
      expect(intToIp(int)).toBe(ip);

      expect(ipToInt('0.0.0.0')).toBe(0);
      expect(intToIp(0)).toBe('0.0.0.0');

      expect(ipToInt('255.255.255.255')).toBe(4294967295);
      expect(intToIp(4294967295)).toBe('255.255.255.255');
    });

    it('throws error for invalid IP on ipToInt', () => {
      expect(() => ipToInt('invalid')).toThrow();
    });
  });

  describe('prefixToMask and maskToPrefix', () => {
    it('converts prefix length to dotted subnet mask', () => {
      expect(prefixToMask(24)).toBe('255.255.255.0');
      expect(prefixToMask(16)).toBe('255.255.0.0');
      expect(prefixToMask(8)).toBe('255.0.0.0');
      expect(prefixToMask(23)).toBe('255.255.254.0');
      expect(prefixToMask(32)).toBe('255.255.255.255');
      expect(prefixToMask(0)).toBe('0.0.0.0');
    });

    it('converts dotted subnet mask to prefix length', () => {
      expect(maskToPrefix('255.255.255.0')).toBe(24);
      expect(maskToPrefix('255.255.0.0')).toBe(16);
      expect(maskToPrefix('255.0.0.0')).toBe(8);
      expect(maskToPrefix('255.255.254.0')).toBe(23);
      expect(maskToPrefix('255.255.255.255')).toBe(32);
    });
  });

  describe('calculateSubnet', () => {
    it('calculates standard /24 enterprise subnet accurately', () => {
      const calc = calculateSubnet('10.232.130.0/24');
      expect(calc.networkAddress).toBe('10.232.130.0');
      expect(calc.broadcastAddress).toBe('10.232.130.255');
      expect(calc.subnetMask).toBe('255.255.255.0');
      expect(calc.prefix).toBe(24);
      expect(calc.totalHosts).toBe(256);
      expect(calc.usableHosts).toBe(254);
      expect(calc.usableStart).toBe('10.232.130.1');
      expect(calc.usableEnd).toBe('10.232.130.254');
      expect(calc.suggestedGateway).toBe('10.232.130.254');
    });

    it('handles host IP in CIDR input and extracts correct network boundary', () => {
      const calc = calculateSubnet('10.232.130.45/24');
      expect(calc.networkAddress).toBe('10.232.130.0');
      expect(calc.broadcastAddress).toBe('10.232.130.255');
    });

    it('calculates /23 subnet accurately (e.g. HCM Office 7)', () => {
      const calc = calculateSubnet('10.233.100.0/23');
      expect(calc.networkAddress).toBe('10.233.100.0');
      expect(calc.broadcastAddress).toBe('10.233.101.255');
      expect(calc.subnetMask).toBe('255.255.254.0');
      expect(calc.totalHosts).toBe(512);
      expect(calc.usableHosts).toBe(510);
      expect(calc.usableStart).toBe('10.233.100.1');
      expect(calc.usableEnd).toBe('10.233.101.254');
    });

    it('calculates /25 subnet accurately (e.g. VLAN 996)', () => {
      const calc = calculateSubnet('192.168.232.128/25');
      expect(calc.networkAddress).toBe('192.168.232.128');
      expect(calc.broadcastAddress).toBe('192.168.232.255');
      expect(calc.subnetMask).toBe('255.255.255.128');
      expect(calc.totalHosts).toBe(128);
      expect(calc.usableHosts).toBe(126);
      expect(calc.usableStart).toBe('192.168.232.129');
      expect(calc.usableEnd).toBe('192.168.232.254');
    });

    it('calculates /30 point-to-point link subnet', () => {
      const calc = calculateSubnet('10.10.10.4/30');
      expect(calc.networkAddress).toBe('10.10.10.4');
      expect(calc.broadcastAddress).toBe('10.10.10.7');
      expect(calc.totalHosts).toBe(4);
      expect(calc.usableHosts).toBe(2);
      expect(calc.usableStart).toBe('10.10.10.5');
      expect(calc.usableEnd).toBe('10.10.10.6');
    });

    it('calculates /31 and /32 special edge cases', () => {
      const p31 = calculateSubnet('10.0.0.0/31');
      expect(p31.usableHosts).toBe(2);
      expect(p31.usableStart).toBe('10.0.0.0');
      expect(p31.usableEnd).toBe('10.0.0.1');

      const p32 = calculateSubnet('10.0.0.1/32');
      expect(p32.usableHosts).toBe(1);
      expect(p32.usableStart).toBe('10.0.0.1');
      expect(p32.usableEnd).toBe('10.0.0.1');
    });

    it('throws error on invalid CIDR', () => {
      expect(() => calculateSubnet('invalid-cidr')).toThrow();
    });
  });

  describe('isIpInSubnet', () => {
    it('returns true when IP is within subnet bounds', () => {
      expect(isIpInSubnet('10.232.130.15', '10.232.130.0/24')).toBe(true);
      expect(isIpInSubnet('10.232.130.254', '10.232.130.0/24')).toBe(true);
      expect(isIpInSubnet('10.233.101.50', '10.233.100.0/23')).toBe(true);
    });

    it('returns false when IP is outside subnet bounds', () => {
      expect(isIpInSubnet('10.232.131.15', '10.232.130.0/24')).toBe(false);
      expect(isIpInSubnet('10.233.102.1', '10.233.100.0/23')).toBe(false);
      expect(isIpInSubnet('192.168.1.1', '10.0.0.0/8')).toBe(false);
    });

    it('returns false for invalid inputs', () => {
      expect(isIpInSubnet('bad-ip', '10.0.0.0/24')).toBe(false);
      expect(isIpInSubnet('10.0.0.1', 'bad-cidr')).toBe(false);
    });
  });

  describe('findMatchingSubnet', () => {
    const subnets = [
      { id: 'sub-super', cidr: '10.0.0.0/8', name: 'Corporate Supernet' },
      { id: 'sub-site', cidr: '10.232.0.0/16', name: 'BSL Factory Site' },
      { id: 'sub-ac', cidr: '10.232.130.0/24', name: 'BSL Access Control' },
      { id: 'sub-cctv', cidr: '10.232.99.0/24', name: 'BSL CCTV VLAN 99' },
    ];

    it('finds the most specific subnet using longest prefix match', () => {
      const match = findMatchingSubnet('10.232.130.50', subnets);
      expect(match).not.toBeNull();
      expect(match?.id).toBe('sub-ac');
    });

    it('falls back to wider subnet if specific subnet is not defined', () => {
      const match = findMatchingSubnet('10.232.200.1', subnets);
      expect(match).not.toBeNull();
      expect(match?.id).toBe('sub-site');
    });

    it('returns null if IP does not match any subnet', () => {
      const match = findMatchingSubnet('192.168.1.100', subnets);
      expect(match).toBeNull();
    });
  });

  describe('findNextAvailableIp', () => {
    it('returns the first usable host when subnet has no allocations', () => {
      const nextIp = findNextAvailableIp('10.232.130.0/24', []);
      expect(nextIp).toBe('10.232.130.1');
    });

    it('returns the next consecutive IP when first IPs are occupied', () => {
      const allocated = ['10.232.130.1', '10.232.130.2', '10.232.130.3'];
      const nextIp = findNextAvailableIp('10.232.130.0/24', allocated);
      expect(nextIp).toBe('10.232.130.4');
    });

    it('fills in the lowest gap in non-contiguous allocations', () => {
      const allocated = ['10.232.130.1', '10.232.130.3', '10.232.130.4'];
      const nextIp = findNextAvailableIp('10.232.130.0/24', allocated);
      expect(nextIp).toBe('10.232.130.2');
    });

    it('returns null when subnet is completely full', () => {
      // /30 has 2 usable hosts: .1 and .2
      const allocated = ['192.168.10.1', '192.168.10.2'];
      const nextIp = findNextAvailableIp('192.168.10.0/30', allocated);
      expect(nextIp).toBeNull();
    });
  });

  describe('normalizeMac and lookupMacVendor', () => {
    it('normalizes various MAC representations to standard colon-separated format', () => {
      expect(normalizeMac('001A2B3C4D5E')).toBe('00:1A:2B:3C:4D:5E');
      expect(normalizeMac('00-1a-2b-3c-4d-5e')).toBe('00:1A:2B:3C:4D:5E');
      expect(normalizeMac('001a.2b3c.4d5e')).toBe('00:1A:2B:3C:4D:5E');
    });

    it('identifies enterprise hardware vendors by OUI prefix', () => {
      expect(lookupMacVendor('00:00:0C:11:22:33')).toBe('Cisco');
      expect(lookupMacVendor('44:19:B6:AB:CD:EF')).toBe('Hikvision');
      expect(lookupMacVendor('00:09:18:01:02:03')).toBe('Hanwha/Samsung');
      expect(lookupMacVendor('00:21:99:44:55:66')).toBe('Sindoh');
      expect(lookupMacVendor('3C:D9:2B:77:88:99')).toBe('HP');
      expect(lookupMacVendor('00:30:4F:01:02:03')).toBe('Planet');
      expect(lookupMacVendor('18:66:DA:AA:BB:CC')).toBe('Dell');
      expect(lookupMacVendor('00:11:32:DD:EE:FF')).toBe('Synology');
      expect(lookupMacVendor('68:05:CA:12:34:56')).toBe('Intel');
      expect(lookupMacVendor('A4:83:E7:65:43:21')).toBe('Apple');
      expect(lookupMacVendor('00:17:61:99:88:77')).toBe('ZKTeco');
    });

    it('returns Unknown Vendor for unrecognized MAC prefix', () => {
      expect(lookupMacVendor('FF:FF:FF:11:22:33')).toBe('Unknown Vendor');
      expect(lookupMacVendor('bad-mac')).toBe('Unknown Vendor');
    });
  });

  describe('calculateUtilization', () => {
    it('calculates percentage accurately rounded to 1 decimal place', () => {
      expect(calculateUtilization(254, 127)).toBe(50);
      expect(calculateUtilization(254, 100)).toBe(39.4);
      expect(calculateUtilization(100, 33)).toBe(33);
      expect(calculateUtilization(0, 0)).toBe(0);
      expect(calculateUtilization(254, 0)).toBe(0);
    });

    it('caps utilization at 100% and handles out-of-range', () => {
      expect(calculateUtilization(100, 150)).toBe(100);
      expect(calculateUtilization(100, -5)).toBe(0);
    });
  });
});
