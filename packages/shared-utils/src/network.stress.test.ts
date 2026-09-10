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

describe('Network Calculation & Automation Engine - Empirical Stress Tests', () => {
  describe('1. CIDR Calculations Across Diverse Masks (/8 to /32)', () => {
    it('accurately calculates /8 Class A supernet (10.0.0.0/8)', () => {
      const calc = calculateSubnet('10.0.0.0/8');
      expect(calc.prefix).toBe(8);
      expect(calc.subnetMask).toBe('255.0.0.0');
      expect(calc.networkAddress).toBe('10.0.0.0');
      expect(calc.broadcastAddress).toBe('10.255.255.255');
      expect(calc.totalHosts).toBe(16777216);
      expect(calc.usableHosts).toBe(16777214);
      expect(calc.usableStart).toBe('10.0.0.1');
      expect(calc.usableEnd).toBe('10.255.255.254');
      expect(calc.suggestedGateway).toBe('10.255.255.254');
    });

    it('accurately calculates /16 Class B enterprise network (172.16.0.0/16)', () => {
      const calc = calculateSubnet('172.16.0.0/16');
      expect(calc.prefix).toBe(16);
      expect(calc.subnetMask).toBe('255.255.0.0');
      expect(calc.networkAddress).toBe('172.16.0.0');
      expect(calc.broadcastAddress).toBe('172.16.255.255');
      expect(calc.totalHosts).toBe(65536);
      expect(calc.usableHosts).toBe(65534);
      expect(calc.usableStart).toBe('172.16.0.1');
      expect(calc.usableEnd).toBe('172.16.255.254');
      expect(calc.suggestedGateway).toBe('172.16.255.254');
    });

    it('accurately calculates /20 non-octet boundary subnet (10.232.112.0/20)', () => {
      const calc = calculateSubnet('10.232.112.0/20');
      expect(calc.prefix).toBe(20);
      expect(calc.subnetMask).toBe('255.255.240.0');
      expect(calc.networkAddress).toBe('10.232.112.0');
      expect(calc.broadcastAddress).toBe('10.232.127.255');
      expect(calc.totalHosts).toBe(4096);
      expect(calc.usableHosts).toBe(4094);
      expect(calc.usableStart).toBe('10.232.112.1');
      expect(calc.usableEnd).toBe('10.232.127.254');
      expect(calc.suggestedGateway).toBe('10.232.127.254');
    });

    it('accurately normalizes host IP inside /20 subnet (10.232.125.10/20)', () => {
      const calc = calculateSubnet('10.232.125.10/20');
      expect(calc.prefix).toBe(20);
      expect(calc.networkAddress).toBe('10.232.112.0');
      expect(calc.broadcastAddress).toBe('10.232.127.255');
      expect(calc.usableStart).toBe('10.232.112.1');
      expect(calc.usableEnd).toBe('10.232.127.254');
    });

    it('accurately calculates /23 multi-class-C subnet (10.233.100.0/23)', () => {
      const calc = calculateSubnet('10.233.100.0/23');
      expect(calc.prefix).toBe(23);
      expect(calc.subnetMask).toBe('255.255.254.0');
      expect(calc.networkAddress).toBe('10.233.100.0');
      expect(calc.broadcastAddress).toBe('10.233.101.255');
      expect(calc.totalHosts).toBe(512);
      expect(calc.usableHosts).toBe(510);
      expect(calc.usableStart).toBe('10.233.100.1');
      expect(calc.usableEnd).toBe('10.233.101.254');
      expect(calc.suggestedGateway).toBe('10.233.101.254');
    });

    it('accurately calculates standard /24 subnet (192.168.1.0/24)', () => {
      const calc = calculateSubnet('192.168.1.0/24');
      expect(calc.prefix).toBe(24);
      expect(calc.subnetMask).toBe('255.255.255.0');
      expect(calc.networkAddress).toBe('192.168.1.0');
      expect(calc.broadcastAddress).toBe('192.168.1.255');
      expect(calc.totalHosts).toBe(256);
      expect(calc.usableHosts).toBe(254);
      expect(calc.usableStart).toBe('192.168.1.1');
      expect(calc.usableEnd).toBe('192.168.1.254');
      expect(calc.suggestedGateway).toBe('192.168.1.254');
    });

    it('accurately calculates /25 lower half subnet (192.168.232.0/25)', () => {
      const calc = calculateSubnet('192.168.232.0/25');
      expect(calc.prefix).toBe(25);
      expect(calc.subnetMask).toBe('255.255.255.128');
      expect(calc.networkAddress).toBe('192.168.232.0');
      expect(calc.broadcastAddress).toBe('192.168.232.127');
      expect(calc.totalHosts).toBe(128);
      expect(calc.usableHosts).toBe(126);
      expect(calc.usableStart).toBe('192.168.232.1');
      expect(calc.usableEnd).toBe('192.168.232.126');
      expect(calc.suggestedGateway).toBe('192.168.232.126');
    });

    it('accurately calculates /25 upper half subnet (192.168.232.128/25)', () => {
      const calc = calculateSubnet('192.168.232.128/25');
      expect(calc.prefix).toBe(25);
      expect(calc.subnetMask).toBe('255.255.255.128');
      expect(calc.networkAddress).toBe('192.168.232.128');
      expect(calc.broadcastAddress).toBe('192.168.232.255');
      expect(calc.totalHosts).toBe(128);
      expect(calc.usableHosts).toBe(126);
      expect(calc.usableStart).toBe('192.168.232.129');
      expect(calc.usableEnd).toBe('192.168.232.254');
      expect(calc.suggestedGateway).toBe('192.168.232.254');
    });

    it('accurately calculates /29 small routing subnet (192.168.10.8/29)', () => {
      const calc = calculateSubnet('192.168.10.8/29');
      expect(calc.prefix).toBe(29);
      expect(calc.subnetMask).toBe('255.255.255.248');
      expect(calc.networkAddress).toBe('192.168.10.8');
      expect(calc.broadcastAddress).toBe('192.168.10.15');
      expect(calc.totalHosts).toBe(8);
      expect(calc.usableHosts).toBe(6);
      expect(calc.usableStart).toBe('192.168.10.9');
      expect(calc.usableEnd).toBe('192.168.10.14');
      expect(calc.suggestedGateway).toBe('192.168.10.14');
    });

    it('accurately calculates /30 point-to-point link (10.10.10.4/30)', () => {
      const calc = calculateSubnet('10.10.10.4/30');
      expect(calc.prefix).toBe(30);
      expect(calc.subnetMask).toBe('255.255.255.252');
      expect(calc.networkAddress).toBe('10.10.10.4');
      expect(calc.broadcastAddress).toBe('10.10.10.7');
      expect(calc.totalHosts).toBe(4);
      expect(calc.usableHosts).toBe(2);
      expect(calc.usableStart).toBe('10.10.10.5');
      expect(calc.usableEnd).toBe('10.10.10.6');
      expect(calc.suggestedGateway).toBe('10.10.10.6');
    });

    it('accurately calculates RFC 3021 /31 point-to-point link (10.0.0.0/31)', () => {
      const calc = calculateSubnet('10.0.0.0/31');
      expect(calc.prefix).toBe(31);
      expect(calc.subnetMask).toBe('255.255.255.254');
      expect(calc.networkAddress).toBe('10.0.0.0');
      expect(calc.broadcastAddress).toBe('10.0.0.1');
      expect(calc.totalHosts).toBe(2);
      expect(calc.usableHosts).toBe(2);
      expect(calc.usableStart).toBe('10.0.0.0');
      expect(calc.usableEnd).toBe('10.0.0.1');
      expect(calc.suggestedGateway).toBe('10.0.0.0');
    });

    it('accurately calculates /32 single host route (10.0.0.1/32)', () => {
      const calc = calculateSubnet('10.0.0.1/32');
      expect(calc.prefix).toBe(32);
      expect(calc.subnetMask).toBe('255.255.255.255');
      expect(calc.networkAddress).toBe('10.0.0.1');
      expect(calc.broadcastAddress).toBe('10.0.0.1');
      expect(calc.totalHosts).toBe(1);
      expect(calc.usableHosts).toBe(1);
      expect(calc.usableStart).toBe('10.0.0.1');
      expect(calc.usableEnd).toBe('10.0.0.1');
      expect(calc.suggestedGateway).toBe('10.0.0.1');
    });

    it('systematically tests every prefix length from /0 to /32', () => {
      for (let prefix = 0; prefix <= 32; prefix++) {
        const mask = prefixToMask(prefix);
        expect(maskToPrefix(mask)).toBe(prefix);

        const calc = calculateSubnet(`10.0.0.0/${prefix}`);
        expect(calc.prefix).toBe(prefix);
        expect(isValidIp(calc.networkAddress)).toBe(true);
        expect(isValidIp(calc.broadcastAddress)).toBe(true);
        expect(isValidIp(calc.usableStart)).toBe(true);
        expect(isValidIp(calc.usableEnd)).toBe(true);
        expect(isValidIp(calc.suggestedGateway)).toBe(true);
        expect(calc.totalHosts).toBe(prefix === 0 ? 4294967296 : Math.pow(2, 32 - prefix));
      }
    });
  });

  describe('2. Bitwise Accuracy of isIpInSubnet Across Public and Private Ranges', () => {
    it('verifies Private Class A (10.0.0.0/8) boundaries and interior', () => {
      expect(isIpInSubnet('10.0.0.0', '10.0.0.0/8')).toBe(true);
      expect(isIpInSubnet('10.255.255.255', '10.0.0.0/8')).toBe(true);
      expect(isIpInSubnet('10.128.55.99', '10.0.0.0/8')).toBe(true);
      expect(isIpInSubnet('9.255.255.255', '10.0.0.0/8')).toBe(false);
      expect(isIpInSubnet('11.0.0.0', '10.0.0.0/8')).toBe(false);
    });

    it('verifies Private Class B (172.16.0.0/12) boundaries and interior', () => {
      expect(isIpInSubnet('172.16.0.0', '172.16.0.0/12')).toBe(true);
      expect(isIpInSubnet('172.31.255.255', '172.16.0.0/12')).toBe(true);
      expect(isIpInSubnet('172.20.10.5', '172.16.0.0/12')).toBe(true);
      expect(isIpInSubnet('172.15.255.255', '172.16.0.0/12')).toBe(false);
      expect(isIpInSubnet('172.32.0.0', '172.16.0.0/12')).toBe(false);
    });

    it('verifies Private Class C (192.168.0.0/16) boundaries and interior', () => {
      expect(isIpInSubnet('192.168.0.0', '192.168.0.0/16')).toBe(true);
      expect(isIpInSubnet('192.168.255.255', '192.168.0.0/16')).toBe(true);
      expect(isIpInSubnet('192.168.130.5', '192.168.0.0/16')).toBe(true);
      expect(isIpInSubnet('192.167.255.255', '192.168.0.0/16')).toBe(false);
      expect(isIpInSubnet('192.169.0.0', '192.168.0.0/16')).toBe(false);
    });

    it('verifies Carrier-Grade NAT (100.64.0.0/10) RFC 6598', () => {
      expect(isIpInSubnet('100.64.0.0', '100.64.0.0/10')).toBe(true);
      expect(isIpInSubnet('100.127.255.255', '100.64.0.0/10')).toBe(true);
      expect(isIpInSubnet('100.100.50.25', '100.64.0.0/10')).toBe(true);
      expect(isIpInSubnet('100.63.255.255', '100.64.0.0/10')).toBe(false);
      expect(isIpInSubnet('100.128.0.0', '100.64.0.0/10')).toBe(false);
    });

    it('verifies Public IPs with high MSB bit set (> 127) avoiding 32-bit signed integer errors', () => {
      // 198.51.100.0/24 (TEST-NET-2) - First octet 198 has bit 7 set (MSB)
      expect(isIpInSubnet('198.51.100.1', '198.51.100.0/24')).toBe(true);
      expect(isIpInSubnet('198.51.100.254', '198.51.100.0/24')).toBe(true);
      expect(isIpInSubnet('198.51.101.1', '198.51.100.0/24')).toBe(false);

      // 203.0.113.0/24 (TEST-NET-3)
      expect(isIpInSubnet('203.0.113.50', '203.0.113.0/24')).toBe(true);
      expect(isIpInSubnet('203.0.114.1', '203.0.113.0/24')).toBe(false);

      // 220.100.48.0/22
      expect(isIpInSubnet('220.100.48.1', '220.100.48.0/22')).toBe(true);
      expect(isIpInSubnet('220.100.51.254', '220.100.48.0/22')).toBe(true);
      expect(isIpInSubnet('220.100.52.0', '220.100.48.0/22')).toBe(false);

      // Top boundary 255.255.255.0/24
      expect(isIpInSubnet('255.255.255.100', '255.255.255.0/24')).toBe(true);
      expect(isIpInSubnet('255.255.254.100', '255.255.255.0/24')).toBe(false);
    });

    it('verifies Public DNS resolvers against global supernets', () => {
      expect(isIpInSubnet('1.1.1.1', '1.0.0.0/8')).toBe(true);
      expect(isIpInSubnet('8.8.8.8', '8.0.0.0/8')).toBe(true);
      expect(isIpInSubnet('8.8.4.4', '8.8.4.0/24')).toBe(true);
      expect(isIpInSubnet('8.8.8.8', '8.8.4.0/24')).toBe(false);
    });
  });

  describe('3. Overlapping Subnet Matching with Longest Prefix Match (LPM)', () => {
    const enterpriseHierarchy = [
      { id: 'all-private', cidr: '10.0.0.0/8', name: 'Global Private Supernet' },
      { id: 'site-hcm', cidr: '10.232.0.0/16', name: 'Ho Chi Minh Site' },
      { id: 'building-a', cidr: '10.232.112.0/20', name: 'Building A Network Block' },
      { id: 'floor-3', cidr: '10.232.125.0/24', name: 'Floor 3 Production Subnet' },
      { id: 'vip-zone', cidr: '10.232.125.0/25', name: 'Floor 3 VIP Server Zone' },
    ];

    it('matches /25 over /24, /20, /16, and /8 for host in 10.232.125.10', () => {
      const match = findMatchingSubnet('10.232.125.10', enterpriseHierarchy);
      expect(match).not.toBeNull();
      expect(match?.id).toBe('vip-zone');
      expect(match?.cidr).toBe('10.232.125.0/25');
    });

    it('matches /24 over /20, /16, and /8 for host in upper half 10.232.125.200', () => {
      const match = findMatchingSubnet('10.232.125.200', enterpriseHierarchy);
      expect(match).not.toBeNull();
      expect(match?.id).toBe('floor-3');
      expect(match?.cidr).toBe('10.232.125.0/24');
    });

    it('matches /20 over /16 and /8 for host in adjacent floor 10.232.120.50', () => {
      const match = findMatchingSubnet('10.232.120.50', enterpriseHierarchy);
      expect(match).not.toBeNull();
      expect(match?.id).toBe('building-a');
      expect(match?.cidr).toBe('10.232.112.0/20');
    });

    it('matches /16 over /8 for host in another building 10.232.50.1', () => {
      const match = findMatchingSubnet('10.232.50.1', enterpriseHierarchy);
      expect(match).not.toBeNull();
      expect(match?.id).toBe('site-hcm');
      expect(match?.cidr).toBe('10.232.0.0/16');
    });

    it('matches /8 for host in another remote office 10.5.5.5', () => {
      const match = findMatchingSubnet('10.5.5.5', enterpriseHierarchy);
      expect(match).not.toBeNull();
      expect(match?.id).toBe('all-private');
      expect(match?.cidr).toBe('10.0.0.0/8');
    });

    it('returns null when IP does not belong to any candidate subnet', () => {
      const match = findMatchingSubnet('192.168.1.1', enterpriseHierarchy);
      expect(match).toBeNull();
    });

    it('demonstrates order independence when subnets are reversed or randomized', () => {
      const reversed = [...enterpriseHierarchy].reverse();
      const match1 = findMatchingSubnet('10.232.125.10', reversed);
      expect(match1?.id).toBe('vip-zone');

      const match2 = findMatchingSubnet('10.232.125.200', reversed);
      expect(match2?.id).toBe('floor-3');
    });

    it('resolves between adjacent non-overlapping subnets at boundary', () => {
      const adjacent = [
        { id: 'sub-lower', cidr: '192.168.1.0/25' },
        { id: 'sub-upper', cidr: '192.168.1.128/25' },
      ];
      expect(findMatchingSubnet('192.168.1.127', adjacent)?.id).toBe('sub-lower');
      expect(findMatchingSubnet('192.168.1.128', adjacent)?.id).toBe('sub-upper');
    });
  });

  describe('4. Next Available IP Allocation Engine Stress Testing', () => {
    it('allocates the lowest IP (.1) in an empty /24 subnet', () => {
      const next = findNextAvailableIp('10.232.130.0/24', []);
      expect(next).toBe('10.232.130.1');
    });

    it('fills consecutive allocations sequentially', () => {
      const allocated = ['10.232.130.1', '10.232.130.2', '10.232.130.3'];
      const next = findNextAvailableIp('10.232.130.0/24', allocated);
      expect(next).toBe('10.232.130.4');
    });

    it('fills lowest gap in fragmented allocations', () => {
      // Missing .1
      expect(findNextAvailableIp('10.232.130.0/24', ['10.232.130.2', '10.232.130.3'])).toBe(
        '10.232.130.1',
      );

      // Missing .2
      expect(
        findNextAvailableIp('10.232.130.0/24', ['10.232.130.1', '10.232.130.3', '10.232.130.4']),
      ).toBe('10.232.130.2');

      // Missing .5 among scattered allocations
      expect(
        findNextAvailableIp('10.232.130.0/24', [
          '10.232.130.1',
          '10.232.130.2',
          '10.232.130.3',
          '10.232.130.4',
          '10.232.130.6',
          '10.232.130.100',
        ]),
      ).toBe('10.232.130.5');
    });

    it('returns null when a subnet is completely exhausted (/30)', () => {
      // /30 has exactly 2 usable IPs: .1 and .2
      const next = findNextAvailableIp('192.168.1.0/30', ['192.168.1.1', '192.168.1.2']);
      expect(next).toBeNull();
    });

    it('returns null when a /29 subnet is completely exhausted (6 usable IPs)', () => {
      // 192.168.10.8/29 has usable range: .9 to .14
      const allocated = [
        '192.168.10.9',
        '192.168.10.10',
        '192.168.10.11',
        '192.168.10.12',
        '192.168.10.13',
        '192.168.10.14',
      ];
      expect(findNextAvailableIp('192.168.10.8/29', allocated)).toBeNull();
    });

    it('correctly handles 253 allocated IPs in a /24 and finds the single remaining IP', () => {
      // Allocate .1 through .253, leaving .254
      const allocated: Array<string> = [];
      for (let i = 1; i <= 253; i++) {
        allocated.push(`10.232.130.${i}`);
      }
      expect(findNextAvailableIp('10.232.130.0/24', allocated)).toBe('10.232.130.254');

      // Now allocate .254 as well -> full
      allocated.push('10.232.130.254');
      expect(findNextAvailableIp('10.232.130.0/24', allocated)).toBeNull();
    });

    it('ignores extraneous or invalid IPs in the allocated list', () => {
      const allocated = [
        '192.168.1.1', // external IP
        'invalid-ip', // malformed
        '', // empty
        '10.232.130.0', // network address (not usable host)
        '10.232.130.255', // broadcast address (not usable host)
        '10.232.130.1', // real allocated IP
      ];
      const next = findNextAvailableIp('10.232.130.0/24', allocated);
      expect(next).toBe('10.232.130.2');
    });

    it('allocates correctly on /31 point-to-point links (RFC 3021)', () => {
      // Both .0 and .1 are usable in /31
      expect(findNextAvailableIp('10.0.0.0/31', [])).toBe('10.0.0.0');
      expect(findNextAvailableIp('10.0.0.0/31', ['10.0.0.0'])).toBe('10.0.0.1');
      expect(findNextAvailableIp('10.0.0.0/31', ['10.0.0.0', '10.0.0.1'])).toBeNull();
    });

    it('allocates correctly on /32 single-host links', () => {
      expect(findNextAvailableIp('10.0.0.1/32', [])).toBe('10.0.0.1');
      expect(findNextAvailableIp('10.0.0.1/32', ['10.0.0.1'])).toBeNull();
    });
  });

  describe('5. MAC Address Vendor Lookup Across Formats & Comprehensive OUI Registry', () => {
    it('normalizes and resolves all common MAC separator formats', () => {
      // Cisco OUI 00:00:0C
      expect(lookupMacVendor('00:00:0C:11:22:33')).toBe('Cisco'); // standard colons
      expect(lookupMacVendor('00-00-0C-11-22-33')).toBe('Cisco'); // standard hyphens
      expect(lookupMacVendor('0000.0c11.2233')).toBe('Cisco'); // Cisco 4-hex dot notation
      expect(lookupMacVendor('00000C112233')).toBe('Cisco'); // unseparated 12 hex
      expect(lookupMacVendor('00 00 0c 11 22 33')).toBe('Cisco'); // space separated
    });

    it('handles case-insensitivity seamlessly (lowercase, uppercase, mixed)', () => {
      // Hikvision OUI 44:19:B6
      expect(lookupMacVendor('44:19:b6:ab:cd:ef')).toBe('Hikvision');
      expect(lookupMacVendor('44:19:B6:AB:CD:EF')).toBe('Hikvision');
      expect(lookupMacVendor('44:19:B6:ab:Cd:Ef')).toBe('Hikvision');

      // Hikvision OUI BC:AD:28
      expect(lookupMacVendor('bc:ad:28:01:02:03')).toBe('Hikvision');
      expect(lookupMacVendor('BC:AD:28:01:02:03')).toBe('Hikvision');
    });

    it('identifies key enterprise hardware vendors in UIMS target environments', () => {
      expect(lookupMacVendor('00:09:18:11:22:33')).toBe('Hanwha/Samsung');
      expect(lookupMacVendor('00:21:99:11:22:33')).toBe('Sindoh');
      expect(lookupMacVendor('00:01:E6:11:22:33')).toBe('HP');
      expect(lookupMacVendor('00:30:4F:11:22:33')).toBe('Planet');
      expect(lookupMacVendor('00:14:22:11:22:33')).toBe('Dell');
      expect(lookupMacVendor('00:11:32:11:22:33')).toBe('Synology');
      expect(lookupMacVendor('00:02:B3:11:22:33')).toBe('Intel');
      expect(lookupMacVendor('00:03:93:11:22:33')).toBe('Apple');
      expect(lookupMacVendor('00:17:61:11:22:33')).toBe('ZKTeco');
      expect(lookupMacVendor('00:11:58:11:22:33')).toBe('Suprema');
      expect(lookupMacVendor('00:19:E0:11:22:33')).toBe('TP-Link');
      expect(lookupMacVendor('00:05:5D:11:22:33')).toBe('D-Link');
      expect(lookupMacVendor('00:09:0F:11:22:33')).toBe('Fortinet');
      expect(lookupMacVendor('00:05:85:11:22:33')).toBe('Juniper');
      expect(lookupMacVendor('00:15:6D:11:22:33')).toBe('Ubiquiti');
      expect(lookupMacVendor('00:0C:42:11:22:33')).toBe('MikroTik');
      expect(lookupMacVendor('00:00:85:11:22:33')).toBe('Canon');
      expect(lookupMacVendor('00:00:48:11:22:33')).toBe('Epson');
      expect(lookupMacVendor('00:80:77:11:22:33')).toBe('Brother');
      expect(lookupMacVendor('00:00:74:11:22:33')).toBe('Ricoh');
      expect(lookupMacVendor('00:17:C8:11:22:33')).toBe('Kyocera');
      expect(lookupMacVendor('3C:EF:8C:11:22:33')).toBe('Dahua');
    });

    it('returns "Unknown Vendor" for invalid, short, or unregistered MAC addresses', () => {
      expect(lookupMacVendor('FF:FF:FF:11:22:33')).toBe('Unknown Vendor');
      expect(lookupMacVendor('00:00:00:00:00:00')).toBe('Unknown Vendor');
      expect(lookupMacVendor('00:11')).toBe('Unknown Vendor');
      expect(lookupMacVendor('')).toBe('Unknown Vendor');
      expect(lookupMacVendor('xyz-invalid-mac')).toBe('Unknown Vendor');
    });

    it('normalizeMac cleans and formats properly', () => {
      expect(normalizeMac('001122334455')).toBe('00:11:22:33:44:55');
      expect(normalizeMac('00-11-22-33-44-55')).toBe('00:11:22:33:44:55');
      expect(normalizeMac('xyz-ghi-jkl')).toBe('');
      expect(normalizeMac('not-a-mac')).toBe('AAC');
      expect(normalizeMac('00:11:22')).toBe('001122');
    });
  });

  describe('6. High-Volume Bitwise Consistency & Stress Harness', () => {
    it('executes 1,000 randomized IP in-subnet bitwise checks without drift', () => {
      const baseSubnet = '172.20.0.0/16';
      const baseStart = ipToInt('172.20.0.0');
      const baseEnd = ipToInt('172.20.255.255');

      for (let i = 0; i < 1000; i++) {
        // Generate pseudo-random IP within or outside subnet
        const testInt = (baseStart - 500 + i) >>> 0;
        const testIp = intToIp(testInt);

        const expected = testInt >= baseStart && testInt <= baseEnd;
        const actual = isIpInSubnet(testIp, baseSubnet);
        expect(actual).toBe(expected);
      }
    });

    it('verifies integer conversion roundtrip for edge values', () => {
      const edgeIps = [
        '0.0.0.0',
        '0.0.0.1',
        '127.0.0.1',
        '128.0.0.0',
        '192.168.1.1',
        '224.0.0.1',
        '255.255.255.254',
        '255.255.255.255',
      ];

      for (const ip of edgeIps) {
        expect(intToIp(ipToInt(ip))).toBe(ip);
      }
    });

    it('verifies calculateSubnet for 0.0.0.0/0 default route', () => {
      const calc = calculateSubnet('0.0.0.0/0');
      expect(calc.prefix).toBe(0);
      expect(calc.networkAddress).toBe('0.0.0.0');
      expect(calc.broadcastAddress).toBe('255.255.255.255');
      expect(calc.subnetMask).toBe('0.0.0.0');
      expect(calc.totalHosts).toBe(4294967296);
      expect(calc.usableHosts).toBe(4294967294);
      expect(calc.usableStart).toBe('0.0.0.1');
      expect(calc.usableEnd).toBe('255.255.255.254');
    });

    it('verifies calculateSubnet for /1 boundary', () => {
      const calc = calculateSubnet('0.0.0.0/1');
      expect(calc.prefix).toBe(1);
      expect(calc.networkAddress).toBe('0.0.0.0');
      expect(calc.broadcastAddress).toBe('127.255.255.255');
      expect(calc.subnetMask).toBe('128.0.0.0');
      expect(calc.totalHosts).toBe(2147483648);
      expect(calc.usableHosts).toBe(2147483646);
      expect(calc.usableStart).toBe('0.0.0.1');
      expect(calc.usableEnd).toBe('127.255.255.254');
    });

    it('verifies findNextAvailableIp on 0.0.0.0/0 default supernet', () => {
      expect(findNextAvailableIp('0.0.0.0/0', [])).toBe('0.0.0.1');
      expect(findNextAvailableIp('0.0.0.0/0', ['0.0.0.1'])).toBe('0.0.0.2');
    });

    it('verifies calculateUtilization edge cases and clamping', () => {
      expect(calculateUtilization(254, 0)).toBe(0);
      expect(calculateUtilization(254, 254)).toBe(100);
      expect(calculateUtilization(254, 300)).toBe(100);
      expect(calculateUtilization(254, -10)).toBe(0);
      expect(calculateUtilization(0, 50)).toBe(0);
      expect(calculateUtilization(-100, 50)).toBe(0);
      expect(calculateUtilization(3, 1)).toBe(33.3);
      expect(calculateUtilization(3, 2)).toBe(66.7);
    });

    it('verifies findMatchingSubnet resiliency against malformed items', () => {
      const candidateList = [
        { cidr: 'invalid-cidr' },
        { cidr: '' },
        { cidr: '10.0.0.0/8' },
        { cidr: '10.232.0.0/16' },
      ];
      const match = findMatchingSubnet('10.232.1.1', candidateList);
      expect(match?.cidr).toBe('10.232.0.0/16');

      expect(findMatchingSubnet('invalid-ip', candidateList)).toBeNull();
      expect(findMatchingSubnet('10.232.1.1', [])).toBeNull();
    });

    it('strictly rejects octal representations and malformed IPs in isValidIp', () => {
      expect(isValidIp('010.0.0.1')).toBe(false); // Octal leading zero
      expect(isValidIp('10.00.0.1')).toBe(false);
      expect(isValidIp('10.0.0.01')).toBe(false);
      expect(isValidIp('10.0.0.256')).toBe(false);
      expect(isValidIp('-1.0.0.1')).toBe(false);
      expect(isValidIp('10.0.0')).toBe(false);
      expect(isValidIp('10.0.0.1.1')).toBe(false);
      expect(isValidIp('10.0.0.1.')).toBe(false);
      expect(isValidIp('.10.0.0.1')).toBe(false);
    });

    it('handles unicode, spaces and special characters in lookupMacVendor', () => {
      expect(lookupMacVendor('00:00:0C:🚀:11:22')).toBe('Cisco');
      expect(lookupMacVendor('   00-00-0C-AA-BB-CC   ')).toBe('Cisco');
      expect(lookupMacVendor(null as unknown as string)).toBe('Unknown Vendor');
      expect(lookupMacVendor(undefined as unknown as string)).toBe('Unknown Vendor');
      expect(lookupMacVendor(12345678 as unknown as string)).toBe('Unknown Vendor');
    });
  });
});
