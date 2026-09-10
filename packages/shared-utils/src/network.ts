import type { NetworkCalculation } from '@uims/shared-types';

/**
 * Validates whether a string is a valid IPv4 address.
 */
export function isValidIp(ip: string): boolean {
  if (typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    if (n < 0 || n > 255) return false;
    if (p.length > 1 && p.startsWith('0')) return false;
  }
  return true;
}

/**
 * Validates whether a string is a valid IPv4 CIDR notation (e.g., 10.232.130.0/24).
 */
export function isValidCidr(cidr: string): boolean {
  if (typeof cidr !== 'string') return false;
  const parts = cidr.trim().split('/');
  if (parts.length !== 2) return false;
  const [ip, prefixStr] = parts;
  if (!isValidIp(ip)) return false;
  if (!/^\d{1,2}$/.test(prefixStr)) return false;
  const prefix = Number(prefixStr);
  return prefix >= 0 && prefix <= 32;
}

/**
 * Converts an IPv4 dotted-decimal string into an unsigned 32-bit integer.
 */
export function ipToInt(ip: string): number {
  if (!isValidIp(ip)) {
    throw new Error(`Invalid IPv4 address: "${ip}"`);
  }
  const parts = ip.trim().split('.').map(Number);
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

/**
 * Converts an unsigned 32-bit integer into an IPv4 dotted-decimal string.
 */
export function intToIp(int: number): string {
  const unsigned = int >>> 0;
  return [
    (unsigned >>> 24) & 255,
    (unsigned >>> 16) & 255,
    (unsigned >>> 8) & 255,
    unsigned & 255,
  ].join('.');
}

/**
 * Converts a CIDR prefix length (0-32) to an IPv4 dotted-decimal subnet mask.
 */
export function prefixToMask(prefix: number): string {
  if (prefix <= 0) return '0.0.0.0';
  if (prefix >= 32) return '255.255.255.255';
  const mask = (~0 << (32 - prefix)) >>> 0;
  return intToIp(mask);
}

/**
 * Converts an IPv4 dotted-decimal subnet mask into a CIDR prefix length (0-32).
 */
export function maskToPrefix(mask: string): number {
  if (!isValidIp(mask)) return 24;
  const int = ipToInt(mask);
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((int & (1 << i)) !== 0) count++;
    else break;
  }
  return count;
}

/**
 * Calculates complete subnet specifications from a CIDR string.
 * Returns network address, broadcast address, netmask, usable IP range,
 * total hosts, usable hosts, and suggested enterprise default gateway (.254 or .1).
 */
export function calculateSubnet(cidr: string): NetworkCalculation {
  if (!isValidCidr(cidr)) {
    throw new Error(`Invalid IPv4 CIDR format: "${cidr}"`);
  }

  const [ipPart, prefixStr] = cidr.trim().split('/');
  const prefix = Number(prefixStr);
  const maskInt = prefix === 0 ? 0 : prefix === 32 ? 0xffffffff : (~0 << (32 - prefix)) >>> 0;
  const subnetMask = intToIp(maskInt);
  const ipInt = ipToInt(ipPart);
  const networkInt = (ipInt & maskInt) >>> 0;
  const networkAddress = intToIp(networkInt);
  const wildcardInt = ~maskInt >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;
  const broadcastAddress = intToIp(broadcastInt);
  const totalHosts = prefix === 0 ? 4294967296 : Math.pow(2, 32 - prefix);

  let usableHosts: number;
  let usableStart: string;
  let usableEnd: string;
  let suggestedGateway: string;

  if (prefix === 31) {
    // RFC 3021 point-to-point links
    usableHosts = 2;
    usableStart = networkAddress;
    usableEnd = broadcastAddress;
    suggestedGateway = usableStart;
  } else if (prefix === 32) {
    // Host route / loopback
    usableHosts = 1;
    usableStart = networkAddress;
    usableEnd = networkAddress;
    suggestedGateway = networkAddress;
  } else {
    usableHosts = Math.max(0, totalHosts - 2);
    const usableStartInt = (networkInt + 1) >>> 0;
    const usableEndInt = (broadcastInt - 1) >>> 0;
    usableStart = intToIp(usableStartInt);
    usableEnd = intToIp(usableEndInt);

    // Enterprise Gateway convention: For standard subnets (/24, /23, etc.),
    // .254 (usableEnd) is standard across industrial & enterprise switches, or .1 (usableStart).
    suggestedGateway = usableEnd;
  }

  return {
    networkAddress,
    broadcastAddress,
    subnetMask,
    prefix,
    totalHosts,
    usableHosts,
    usableStart,
    usableEnd,
    suggestedGateway,
  };
}

/**
 * Checks whether an IP address belongs to the specified CIDR subnet block via bitwise matching.
 */
export function isIpInSubnet(ip: string, cidr: string): boolean {
  if (!isValidIp(ip) || !isValidCidr(cidr)) return false;
  const [networkIp, prefixStr] = cidr.trim().split('/');
  const prefix = Number(prefixStr);
  const maskInt = prefix === 0 ? 0 : prefix === 32 ? 0xffffffff : (~0 << (32 - prefix)) >>> 0;
  const ipInt = ipToInt(ip);
  const netInt = (ipToInt(networkIp) & maskInt) >>> 0;
  return (ipInt & maskInt) >>> 0 === netInt;
}

/**
 * Finds the best matching subnet for a given IP address using longest prefix match (LPM).
 */
export function findMatchingSubnet<T extends { cidr: string }>(ip: string, subnets: T[]): T | null {
  if (!isValidIp(ip) || !Array.isArray(subnets) || subnets.length === 0) return null;

  let bestMatch: T | null = null;
  let longestPrefix = -1;

  for (const subnet of subnets) {
    if (subnet?.cidr && isValidCidr(subnet.cidr) && isIpInSubnet(ip, subnet.cidr)) {
      const prefix = Number(subnet.cidr.split('/')[1]);
      if (prefix > longestPrefix) {
        longestPrefix = prefix;
        bestMatch = subnet;
      }
    }
  }

  return bestMatch;
}

/**
 * Finds the lowest unallocated usable IP address in a subnet given the list of allocated IPs.
 * Returns null if the subnet is fully exhausted.
 */
export function findNextAvailableIp(subnetCidr: string, allocatedIps: string[]): string | null {
  if (!isValidCidr(subnetCidr)) return null;
  const calc = calculateSubnet(subnetCidr);
  if (calc.usableHosts <= 0) return null;

  const allocatedSet = new Set(
    (allocatedIps || [])
      .filter((ip) => typeof ip === 'string' && isValidIp(ip))
      .map((ip) => ipToInt(ip)),
  );

  const startInt = ipToInt(calc.usableStart);
  const endInt = ipToInt(calc.usableEnd);

  for (let current = startInt; current <= endInt; current++) {
    if (!allocatedSet.has(current)) {
      return intToIp(current);
    }
  }

  return null;
}

/**
 * Normalizes a MAC address string into uppercase standard colon-separated format (XX:XX:XX:XX:XX:XX)
 * or 12-character uppercase hex string.
 */
export function normalizeMac(mac: string): string {
  if (typeof mac !== 'string') return '';
  const hex = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (hex.length === 12) {
    const formatted = hex.match(/.{1,2}/g)?.join(':');
    return formatted || hex;
  }
  return hex;
}

// Enterprise OUI lookup table for common network, surveillance, access control, and IT devices
const MAC_OUI_MAP: Record<string, string> = {
  // Cisco Systems
  '00000C': 'Cisco',
  '000142': 'Cisco',
  '000143': 'Cisco',
  '000163': 'Cisco',
  '000196': 'Cisco',
  '0001C7': 'Cisco',
  '000216': 'Cisco',
  '00024A': 'Cisco',
  '00027D': 'Cisco',
  '00028A': 'Cisco',
  '0002BA': 'Cisco',
  '0002FD': 'Cisco',
  '00036B': 'Cisco',
  '00044D': 'Cisco',
  '00049B': 'Cisco',
  '000531': 'Cisco',
  '00055E': 'Cisco',
  '000573': 'Cisco',
  '0005DC': 'Cisco',
  '000628': 'Cisco',
  '000652': 'Cisco',
  '0006D6': 'Cisco',
  '00070D': 'Cisco',
  '00074F': 'Cisco',
  '00077D': 'Cisco',
  '000784': 'Cisco',
  '0007B3': 'Cisco',
  '0007EB': 'Cisco',
  '000820': 'Cisco',
  '00087C': 'Cisco',
  '0008A3': 'Cisco',
  '0008E2': 'Cisco',
  '000943': 'Cisco',
  '00097B': 'Cisco',
  '0009B7': 'Cisco',
  '0009E8': 'Cisco',
  '000A41': 'Cisco',
  '000A8A': 'Cisco',
  '000AB7': 'Cisco',
  '000AF4': 'Cisco',
  '000B45': 'Cisco',
  '000B5F': 'Cisco',
  '000B85': 'Cisco',
  '000BBE': 'Cisco',
  '000C30': 'Cisco',
  '000C85': 'Cisco',
  '000CCE': 'Cisco',
  '000D28': 'Cisco',
  '000D65': 'Cisco',
  '000DBC': 'Cisco',
  '000DEC': 'Cisco',
  '000E38': 'Cisco',
  '000E83': 'Cisco',
  '000ED6': 'Cisco',
  '000F23': 'Cisco',
  '000F34': 'Cisco',
  '000F8F': 'Cisco',
  '000FF7': 'Cisco',
  '001007': 'Cisco',
  '001011': 'Cisco',
  '001029': 'Cisco',
  '001054': 'Cisco',
  '00107B': 'Cisco',
  '0010F6': 'Cisco',
  '001120': 'Cisco',
  '00115C': 'Cisco',
  '001192': 'Cisco',
  '0011BB': 'Cisco',
  '001200': 'Cisco',
  '001243': 'Cisco',
  '00127F': 'Cisco',
  '0012D9': 'Cisco',
  '001319': 'Cisco',
  '00135F': 'Cisco',
  '00137F': 'Cisco',
  '0013C3': 'Cisco',
  '00141B': 'Cisco',
  '001469': 'Cisco',
  '0014A8': 'Cisco',
  '0014F1': 'Cisco',
  '00152B': 'Cisco',
  '001562': 'Cisco',
  '0015C6': 'Cisco',
  '0015F9': 'Cisco',
  '001646': 'Cisco',
  '00169C': 'Cisco',
  '0016C7': 'Cisco',
  '00170E': 'Cisco',
  '001759': 'Cisco',
  '001794': 'Cisco',
  '0017DF': 'Cisco',
  '001818': 'Cisco',
  '001873': 'Cisco',
  '0018B9': 'Cisco',
  '001906': 'Cisco',
  '00192F': 'Cisco',
  '001955': 'Cisco',
  '0019A9': 'Cisco',
  '0019E7': 'Cisco',
  '001A2F': 'Cisco',
  '001A6C': 'Cisco',
  '001AA1': 'Cisco',
  '001B0D': 'Cisco',
  '001B2A': 'Cisco',
  '001B53': 'Cisco',
  '001B8F': 'Cisco',
  '001BD4': 'Cisco',
  '001C0E': 'Cisco',
  '001C57': 'Cisco',
  '001CB0': 'Cisco',
  '001CF6': 'Cisco',
  '001D45': 'Cisco',
  '001D70': 'Cisco',
  '001DA1': 'Cisco',
  '001E13': 'Cisco',
  '001E49': 'Cisco',
  '001E79': 'Cisco',
  '001EBD': 'Cisco',
  '001EF6': 'Cisco',
  '001F26': 'Cisco',
  '001F6C': 'Cisco',
  '001F9E': 'Cisco',
  '001FCA': 'Cisco',
  '00211B': 'Cisco',
  '002155': 'Cisco',
  '0021A0': 'Cisco',
  '0021D7': 'Cisco',
  '002255': 'Cisco',
  '002290': 'Cisco',
  '0022BD': 'Cisco',
  '002304': 'Cisco',
  '002333': 'Cisco',
  '00235D': 'Cisco',
  '0023AC': 'Cisco',
  '0023EA': 'Cisco',
  '002413': 'Cisco',
  '002450': 'Cisco',
  '002497': 'Cisco',
  '0024C3': 'Cisco',
  '0024F7': 'Cisco',
  '002545': 'Cisco',
  '002583': 'Cisco',
  '0025B4': 'Cisco',
  '00260A': 'Cisco',
  '002643': 'Cisco',
  '002698': 'Cisco',
  '0026CB': 'Cisco',
  '00270C': 'Cisco',
  '002790': 'Cisco',
  '00400B': 'Cisco',
  '004096': 'Cisco',
  '00500F': 'Cisco',
  '005014': 'Cisco',
  '00503E': 'Cisco',
  '005050': 'Cisco',
  '005053': 'Cisco',
  '005054': 'Cisco',
  '005073': 'Cisco',
  '005080': 'Cisco',
  '0050A2': 'Cisco',
  '0050BD': 'Cisco',
  '0050D1': 'Cisco',
  '0050E2': 'Cisco',
  '0050F0': 'Cisco',
  '006009': 'Cisco',
  '00602F': 'Cisco',
  '00603E': 'Cisco',
  '006047': 'Cisco',
  '00605C': 'Cisco',
  '006070': 'Cisco',
  '009021': 'Cisco',
  '00902B': 'Cisco',
  '00905F': 'Cisco',
  '00906D': 'Cisco',
  '009086': 'Cisco',
  '009092': 'Cisco',
  '0090AB': 'Cisco',
  '0090B1': 'Cisco',
  '0090BF': 'Cisco',
  '0090F2': 'Cisco',
  '00A08E': 'Cisco',
  '00D000': 'Cisco',
  '00D058': 'Cisco',
  '00D079': 'Cisco',
  '00D097': 'Cisco',
  '00D0BA': 'Cisco',
  '00D0BB': 'Cisco',
  '00D0BC': 'Cisco',
  '00D0C5': 'Cisco',
  '00D0D3': 'Cisco',
  '00D0E0': 'Cisco',
  '00D0FF': 'Cisco',
  '00E014': 'Cisco',
  '00E01E': 'Cisco',
  '00E034': 'Cisco',
  '00E04F': 'Cisco',
  '00E052': 'Cisco',
  '00E08F': 'Cisco',
  '00E0A3': 'Cisco',
  '00E0B0': 'Cisco',
  '00E0F7': 'Cisco',
  '00E0FE': 'Cisco',

  // Hikvision (CCTV / Surveillance)
  '4419B6': 'Hikvision',
  BCAD28: 'Hikvision',
  C056E3: 'Hikvision',
  '0018AE': 'Hikvision',
  '10D07A': 'Hikvision',
  '2857BE': 'Hikvision',
  '40B034': 'Hikvision',
  '48EA63': 'Hikvision',
  '54C415': 'Hikvision',
  '741E93': 'Hikvision',
  '804867': 'Hikvision',
  A41437: 'Hikvision',
  AC6417: 'Hikvision',
  C42F90: 'Hikvision',
  D8B04C: 'Hikvision',
  E0508B: 'Hikvision',
  F84D89: 'Hikvision',
  '2418C6': 'Hikvision',

  // Hanwha Techwin / Samsung Techwin (Surveillance / Access Control)
  '000918': 'Hanwha/Samsung',
  '0012FB': 'Hanwha/Samsung',
  '001599': 'Hanwha/Samsung',
  '00166C': 'Hanwha/Samsung',
  '0017C3': 'Hanwha/Samsung',
  '001B98': 'Hanwha/Samsung',
  '001D25': 'Hanwha/Samsung',
  '0021D1': 'Hanwha/Samsung',
  '0021D2': 'Hanwha/Samsung',
  '002454': 'Hanwha/Samsung',
  '00265F': 'Hanwha/Samsung',
  '00E064': 'Hanwha/Samsung',
  '702C1F': 'Hanwha/Samsung',
  E43022: 'Hanwha/Samsung',
  B0C554: 'Hanwha/Samsung',
  '14B484': 'Hanwha/Samsung',
  '2C228B': 'Hanwha/Samsung',

  // Sindoh (Printers & Office Multifunction)
  '002199': 'Sindoh',
  '001B35': 'Sindoh',
  '000F7B': 'Sindoh',
  '001E8F': 'Sindoh',

  // HP / Hewlett Packard Enterprise
  '0001E6': 'HP',
  '0002A5': 'HP',
  '000802': 'HP',
  '000883': 'HP',
  '000BCD': 'HP',
  '000E7F': 'HP',
  '000F20': 'HP',
  '00110A': 'HP',
  '001185': 'HP',
  '001279': 'HP',
  '001321': 'HP',
  '0014C2': 'HP',
  '001560': 'HP',
  '001635': 'HP',
  '0017A4': 'HP',
  '001871': 'HP',
  '0018FE': 'HP',
  '0019BB': 'HP',
  '001A4B': 'HP',
  '001E0B': 'HP',
  '001F28': 'HP',
  '00215A': 'HP',
  '002264': 'HP',
  '00237D': 'HP',
  '002481': 'HP',
  '0025B3': 'HP',
  '002655': 'HP',
  '3CD92B': 'HP',
  '9C8E99': 'HP',
  A45D36: 'HP',
  D8D385: 'HP',

  // Planet Technology (Switches / Industrial Ethernet)
  '00304F': 'Planet',
  '00002B': 'Planet',
  '0000E8': 'Planet',

  // Dell Inc.
  '001422': 'Dell',
  '0016F0': 'Dell',
  '00188B': 'Dell',
  '0019B9': 'Dell',
  '001AA0': 'Dell',
  '001C23': 'Dell',
  '001D09': 'Dell',
  '001E4F': 'Dell',
  '001EC9': 'Dell',
  '00219B': 'Dell',
  '002219': 'Dell',
  '0023AE': 'Dell',
  '0024E8': 'Dell',
  '002564': 'Dell',
  '0026B9': 'Dell',
  '1866DA': 'Dell',
  '24B6FD': 'Dell',
  '44A842': 'Dell',
  '74867A': 'Dell',
  B82A72: 'Dell',
  D4BED9: 'Dell',
  F8DB88: 'Dell',

  // Synology (NAS)
  '001132': 'Synology',
  '00089B': 'Synology',

  // Intel Corporation
  '0002B3': 'Intel',
  '000347': 'Intel',
  '000423': 'Intel',
  '0007E9': 'Intel',
  '000E0C': 'Intel',
  '001111': 'Intel',
  '001302': 'Intel',
  '001320': 'Intel',
  '0013E8': 'Intel',
  '001500': 'Intel',
  '001517': 'Intel',
  '001676': 'Intel',
  '0018DE': 'Intel',
  '0019D1': 'Intel',
  '001AA9': 'Intel',
  '001B21': 'Intel',
  '001CC0': 'Intel',
  '001DE0': 'Intel',
  '001E67': 'Intel',
  '001F3B': 'Intel',
  '00215C': 'Intel',
  '00216A': 'Intel',
  '0022FB': 'Intel',
  '002314': 'Intel',
  '0024D7': 'Intel',
  '0026C6': 'Intel',
  '002710': 'Intel',
  '3413E8': 'Intel',
  '6805CA': 'Intel',
  A44CC8: 'Intel',

  // Apple Inc.
  '000393': 'Apple',
  '000502': 'Apple',
  '000A27': 'Apple',
  '000A95': 'Apple',
  '000D93': 'Apple',
  '0010FA': 'Apple',
  '001124': 'Apple',
  '001451': 'Apple',
  '0016CB': 'Apple',
  '0017F2': 'Apple',
  '0019E3': 'Apple',
  '001B63': 'Apple',
  '001CB3': 'Apple',
  '001E52': 'Apple',
  '001EC2': 'Apple',
  '001F5B': 'Apple',
  '001FF3': 'Apple',
  '0021E9': 'Apple',
  '002241': 'Apple',
  '002312': 'Apple',
  '002332': 'Apple',
  '002369': 'Apple',
  '002436': 'Apple',
  '002500': 'Apple',
  '00254B': 'Apple',
  '0025BC': 'Apple',
  '002608': 'Apple',
  '00264A': 'Apple',
  '0026B0': 'Apple',
  '0026BB': 'Apple',
  '34159E': 'Apple',
  '3C0754': 'Apple',
  '406C8F': 'Apple',
  '705681': 'Apple',
  A483E7: 'Apple',
  ACBC32: 'Apple',
  BC52B7: 'Apple',

  // ZKTeco (Access Control / Time Attendance / Fingerprint)
  '001761': 'ZKTeco',
  '006171': 'ZKTeco',
  '5056A6': 'ZKTeco',
  A06C54: 'ZKTeco',

  // Suprema (Access Control / Biometrics)
  '001158': 'Suprema',
  E04F43: 'Suprema',

  // TP-Link
  '0019E0': 'TP-Link',
  '002127': 'TP-Link',
  '0023CD': 'TP-Link',
  '002586': 'TP-Link',
  '002719': 'TP-Link',
  '14CC20': 'TP-Link',
  '30DE4B': 'TP-Link',
  '50C7BF': 'TP-Link',
  '60A44C': 'TP-Link',
  '704F57': 'TP-Link',
  '98DAC4': 'TP-Link',
  B04E26: 'TP-Link',
  C025E9: 'TP-Link',
  C46E1F: 'TP-Link',
  D46E0E: 'TP-Link',
  E894F6: 'TP-Link',
  F4F26D: 'TP-Link',

  // D-Link
  '00055D': 'D-Link',
  '000D88': 'D-Link',
  '001195': 'D-Link',
  '001346': 'D-Link',
  '0015E9': 'D-Link',
  '00179A': 'D-Link',
  '00195B': 'D-Link',
  '001B11': 'D-Link',
  '001CF0': 'D-Link',
  '001E58': 'D-Link',
  '002191': 'D-Link',
  '0022B0': 'D-Link',
  '002401': 'D-Link',
  '00265A': 'D-Link',
  '14D64D': 'D-Link',
  '28107B': 'D-Link',

  // Fortinet
  '00090F': 'Fortinet',
  '704CA5': 'Fortinet',
  '906CAC': 'Fortinet',
  '085B0E': 'Fortinet',
  '84144D': 'Fortinet',

  // Juniper Networks
  '000585': 'Juniper',
  '0010DB': 'Juniper',
  '00121E': 'Juniper',
  '0014F6': 'Juniper',
  '0019E2': 'Juniper',
  '001DB5': 'Juniper',
  '002159': 'Juniper',
  '002395': 'Juniper',
  '0024DC': 'Juniper',
  '002688': 'Juniper',

  // Ubiquiti Networks
  '00156D': 'Ubiquiti',
  '002722': 'Ubiquiti',
  '0418D6': 'Ubiquiti',
  '24A43C': 'Ubiquiti',
  '44D9E7': 'Ubiquiti',
  '687251': 'Ubiquiti',
  '7483C2': 'Ubiquiti',
  '788A20': 'Ubiquiti',
  '802AA8': 'Ubiquiti',
  B4FBE4: 'Ubiquiti',
  DC9FDB: 'Ubiquiti',
  F09FC2: 'Ubiquiti',

  // MikroTik
  '000C42': 'MikroTik',
  '2CC81B': 'MikroTik',
  '488F5A': 'MikroTik',
  '4C5E0C': 'MikroTik',
  '64D154': 'MikroTik',
  '6C3B6B': 'MikroTik',
  '744D28': 'MikroTik',
  B869F4: 'MikroTik',
  C4AD34: 'MikroTik',
  D401C3: 'MikroTik',
  D4CA6D: 'MikroTik',
  E48D8C: 'MikroTik',

  // Canon (Printers)
  '000085': 'Canon',
  '0021E1': 'Canon',
  '002380': 'Canon',
  '002673': 'Canon',
  '180CAC': 'Canon',
  '708A09': 'Canon',
  '84BA3B': 'Canon',

  // Epson
  '000048': 'Epson',
  '0021B7': 'Epson',
  '0026AB': 'Epson',
  '44D244': 'Epson',
  AC1826: 'Epson',

  // Brother
  '008077': 'Brother',
  '001BA9': 'Brother',
  '002258': 'Brother',
  '30055C': 'Brother',
  '40B076': 'Brother',
  '8056F2': 'Brother',

  // Ricoh
  '000074': 'Ricoh',

  // Kyocera
  '0017C8': 'Kyocera',
  '00008F': 'Kyocera',
  '002536': 'Kyocera',

  // Dahua Technology (CCTV)
  '3CEF8C': 'Dahua',
  '4C11BF': 'Dahua',
  '9002A9': 'Dahua',
  '001212': 'Dahua',
};

/**
 * Looks up the hardware vendor from a MAC address OUI prefix.
 * Returns the vendor name or 'Unknown Vendor' if unrecognized.
 */
export function lookupMacVendor(mac: string): string {
  if (typeof mac !== 'string') return 'Unknown Vendor';
  const cleanHex = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (cleanHex.length < 6) return 'Unknown Vendor';

  const oui = cleanHex.slice(0, 6);
  return MAC_OUI_MAP[oui] || 'Unknown Vendor';
}

/**
 * Calculates network utilization percentage rounded to 1 decimal place.
 * Returns 0 if totalUsable is 0 or negative.
 */
export function calculateUtilization(totalUsable: number, allocatedCount: number): number {
  if (!totalUsable || totalUsable <= 0) return 0;
  if (!allocatedCount || allocatedCount <= 0) return 0;
  const pct = (allocatedCount / totalUsable) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}
