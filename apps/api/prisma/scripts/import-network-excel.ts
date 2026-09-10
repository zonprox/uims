import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { type IPStatus, PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { Pool } from 'pg';
import { CredentialVaultService } from '../../src/modules/network/credential-vault.service';

interface SubnetSpec {
  cidr: string;
  name: string;
  vlanNumber: number;
  vlanName: string;
  locationCode: string;
  gateway: string;
  description: string;
}

interface ParsedRawRecord {
  sheetName: string;
  rowNumber: number;
  ip: string;
  hostname: string;
  macAddress?: string;
  vendor?: string;
  model?: string;
  serialNumber?: string;
  section?: string;
  floor?: string;
  locationCode: string;
  vlanNumber: number;
  subnetCidr: string;
  deviceType: string;
  status: IPStatus;
  username?: string;
  password?: string;
  protocol?: string;
  port?: number;
  description?: string;
}

interface SheetConfig {
  vlan: number;
  subnet: string;
  loc: string;
}

const SHEET_CONFIGS: Record<string, SheetConfig> = {
  'VLAN 100': { vlan: 100, subnet: '10.232.100.0/24', loc: 'BSL-ST' },
  'VLAN 998': { vlan: 998, subnet: '10.232.112.0/24', loc: 'BSL-ST' },
  'VLAN 996': { vlan: 996, subnet: '192.168.232.128/25', loc: 'BSL-ST' },
  'VLAN 129': { vlan: 129, subnet: '10.232.129.0/24', loc: 'BSL-ST' },
  'VLAN 130': { vlan: 130, subnet: '10.232.130.0/24', loc: 'BSL-ST' },
  'VLAN 131': { vlan: 131, subnet: '10.232.131.0/24', loc: 'BSL-ST' },
  'VLAN 132': { vlan: 132, subnet: '10.232.132.0/24', loc: 'BSL-ST' },
  'VLAN 133': { vlan: 133, subnet: '10.232.133.0/24', loc: 'BSL-ST' },
  'VLAN 134': { vlan: 134, subnet: '10.232.134.0/24', loc: 'BSL-ST' },
  'VLAN 135': { vlan: 135, subnet: '10.232.135.0/24', loc: 'BSL-ST' },
  'VLAN 136': { vlan: 136, subnet: '10.232.136.0/24', loc: 'BSL-ST' },
  Fingerprint: { vlan: 130, subnet: '10.232.130.0/24', loc: 'BSL-ST' },
  'VLAN 137': { vlan: 137, subnet: '10.232.137.0/24', loc: 'BSL-ST' },
  'VLAN 138': { vlan: 138, subnet: '10.232.138.0/24', loc: 'BSL-ST' },
  'VLAN 139': { vlan: 139, subnet: '10.232.139.0/24', loc: 'BSL-ST' },
  'HCM OFFICE 7': { vlan: 233, subnet: '10.233.100.0/23', loc: 'HCM-D7' },
  'HCM OFFICE 3': { vlan: 1, subnet: '192.168.1.0/24', loc: 'HCM-D3' },
  'VLAN 97': { vlan: 97, subnet: '10.232.97.0/24', loc: 'BSL-ST' },
  'VLAN 98': { vlan: 98, subnet: '10.232.98.0/24', loc: 'BSL-ST' },
  'VLAN 99': { vlan: 99, subnet: '10.232.99.0/24', loc: 'BSL-ST' },
};

// Convert IPv4 string to 32-bit unsigned number
function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

// Convert 32-bit unsigned number to IPv4 string
function longToIp(long: number): string {
  return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
}

// Convert subnet mask to CIDR prefix
function maskToPrefix(mask: string): number {
  const cleanMask = mask.trim().replace(/\.+$/, '');
  const long = ipToLong(cleanMask);
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((long & (1 << i)) !== 0) count++;
    else break;
  }
  return count || 24;
}

// Convert CIDR prefix to subnet mask
function prefixToMask(prefix: number): string {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return longToIp(mask);
}

// Safely extracts string value from Excel cell across primitives, rich text, and hyperlinks
function getCellValue(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if ('text' in val && typeof (val as { text: unknown }).text === 'string') {
      return (val as { text: string }).text.trim();
    }
    if ('richText' in val && Array.isArray((val as { richText: unknown[] }).richText)) {
      return (val as { richText: Array<{ text?: string }> }).richText
        .map((t) => t.text || '')
        .join('')
        .trim();
    }
    if ('result' in val) {
      return String((val as { result: unknown }).result || '').trim();
    }
  }
  return String(val).trim();
}

/**
 * Sanitizes device remarks to prevent leaking plaintext credentials into IPAddress.description.
 * Replaces credentials with redaction markers and standardizes vaulted descriptions.
 */
function sanitizeRemark(remark?: string, extractedPassword?: string): string | undefined {
  if (!remark) return undefined;
  let sanitized = remark.trim();

  // Redact specific extracted password if present
  if (extractedPassword && extractedPassword.length >= 3) {
    const escaped = extractedPassword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(escaped, 'g'), '••••••••');
  }

  // Redact standard credential patterns
  sanitized = sanitized
    .replace(/(?:admin|administrator)\/[^\s,;)]+/gi, 'admin/••••••••')
    .replace(/Soctrang\d+/gi, '••••••••')
    .replace(/CamYo-Tw!!\)?/gi, '••••••••')
    .replace(/BSLsoctrang@\d+/gi, '••••••••')
    .replace(/\[object Object\]/gi, '');

  const trimmed = sanitized.trim();
  if (!trimmed || trimmed === 'admin/••••••••' || trimmed === '••••••••') {
    return 'Vaulted credential';
  }
  return trimmed;
}

// Calculate complete subnet details
function calculateSubnet(networkOrIp: string, prefixOrMask: number | string) {
  let prefix: number;
  if (typeof prefixOrMask === 'number') {
    prefix = prefixOrMask;
  } else if (/^\d+$/.test(prefixOrMask.trim())) {
    prefix = parseInt(prefixOrMask.trim(), 10);
  } else {
    prefix = maskToPrefix(prefixOrMask);
  }

  const netmask = prefixToMask(prefix);
  const maskLong = ipToLong(netmask);
  const ipLong = ipToLong(networkOrIp);
  const netLong = (ipLong & maskLong) >>> 0;
  const networkAddress = longToIp(netLong);
  const broadcastLong = (netLong | (~maskLong >>> 0)) >>> 0;
  const broadcastAddress = longToIp(broadcastLong);

  let startIp = networkAddress;
  let endIp = broadcastAddress;
  let totalIps = 254;

  if (prefix < 31) {
    startIp = longToIp(netLong + 1);
    endIp = longToIp(broadcastLong - 1);
    totalIps = Math.max(1, Math.pow(2, 32 - prefix) - 2);
  } else if (prefix === 31) {
    startIp = networkAddress;
    endIp = broadcastAddress;
    totalIps = 2;
  } else {
    totalIps = 1;
  }

  return {
    cidr: `${networkAddress}/${prefix}`,
    networkAddress,
    netmask,
    broadcastAddress,
    startIp,
    endIp,
    totalIps,
  };
}

// Dynamically find matching standard subnet by mathematical CIDR containment
function findMatchingSubnet(ip: string, subnets: SubnetSpec[]): SubnetSpec | undefined {
  const ipLong = ipToLong(ip);
  for (const spec of subnets) {
    const [netAddr, prefixStr] = spec.cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    const maskLong = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const netLong = ipToLong(netAddr);
    if ((ipLong & maskLong) >>> 0 === (netLong & maskLong) >>> 0) {
      return spec;
    }
  }
  return undefined;
}

// Normalize MAC address
function normalizeMac(rawMac?: string | null): { mac?: string; serial?: string } {
  if (!rawMac) return {};
  const cleaned = String(rawMac).trim();
  if (!cleaned || cleaned === '0' || cleaned.toLowerCase() === 'bsl') return {};

  // Check if newline separated
  const firstLine = cleaned.split(/[\r\n]+/)[0]?.trim() || '';

  // Match standard 6-byte MAC
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  if (macRegex.test(firstLine)) {
    return { mac: firstLine.replace(/-/g, ':').toUpperCase() };
  }

  // If string contains alphanumeric serial pattern (e.g. DS-K1T... or printer serial)
  if (cleaned.length >= 8 && /[A-Za-z0-9_-]{8,}/.test(cleaned)) {
    return { serial: cleaned };
  }

  return {};
}

// Determine enterprise device type
function classifyDeviceType(
  hostname?: string,
  model?: string,
  sheetName?: string,
  remark?: string,
): string {
  const combined =
    `${hostname || ''} ${model || ''} ${sheetName || ''} ${remark || ''}`.toLowerCase();

  if (/core|switch|c9300|c1300|c1200|omniswitch|planet/i.test(combined)) return 'Switch';
  if (/nvr|server|poweredge|synology|nas|pbx|tda-600/i.test(combined)) return 'Server';
  if (/camera|hikvision|hanwha|xno-|qno-|cctv/i.test(combined)) return 'Camera';
  if (/mcc|máy chấm công|face|door|terminal|ds-k1t|fingerprint|ivms|access control/i.test(combined))
    return 'Access Control';
  if (/printer|máy in|sindoh|epson|laserjet|mfp/i.test(combined)) return 'Printer';
  if (/ap|access point|unifi|grandstream/i.test(combined)) return 'Access Point';
  if (/modem|gpon|gateway|cato|router|ftth|ips vnpt|ips viettel/i.test(combined)) return 'Gateway';

  return 'Workstation';
}

export async function importNetworkExcel(prismaClient?: PrismaClient) {
  const logger = new Logger('NetworkExcelImporter');
  let pool: Pool | undefined = undefined;
  let prisma: PrismaClient;

  if (prismaClient) {
    prisma = prismaClient;
  } else {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for importNetworkExcel');
    }
    pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  const vault = new CredentialVaultService();

  const candidatePaths = [
    path.resolve(process.cwd(), 'temp/New IP Network(NW, Server).xlsx'),
    path.resolve(process.cwd(), '../../temp/New IP Network(NW, Server).xlsx'),
    path.resolve(__dirname, '../../../../temp/New IP Network(NW, Server).xlsx'),
    '/home/user/projects/uims/temp/New IP Network(NW, Server).xlsx',
  ];
  const excelPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!excelPath) {
    throw new Error(`Workbook not found in candidates: ${candidatePaths.join(', ')}`);
  }
  logger.log(`Starting Enterprise IPAM Workbook ingestion from: ${excelPath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  logger.log(`Loaded workbook with ${workbook.worksheets.length} worksheets.`);

  // 0. Pre-Ingestion Database Hygiene & Purge
  logger.log('Executing Pre-Ingestion Database Hygiene & Purge...');

  // 0.1 Purge legacy orphaned mock subnets and IP addresses (DEF-06)
  const deletedIps = await prisma.iPAddress.deleteMany({
    where: {
      subnetId: null,
      vlanId: null,
      locationId: null,
    },
  });
  logger.log(`Purged ${deletedIps.count} orphaned legacy mock IP addresses.`);

  const deletedSubnets = await prisma.subnet.deleteMany({
    where: {
      vlanId: null,
      locationId: null,
    },
  });
  logger.log(`Purged ${deletedSubnets.count} orphaned legacy mock subnets.`);

  // 0.2 Purge out-of-bounds IP addresses that violate mathematical CIDR subnet containment (DEF-05)
  const existingIps = await prisma.iPAddress.findMany({
    where: { subnetId: { not: null } },
    include: { subnet: true },
  });
  const oobIds: string[] = [];
  for (const ipRec of existingIps) {
    if (!ipRec.subnet) continue;
    const ipL = ipToLong(ipRec.address);
    const netL = ipToLong(ipRec.subnet.networkAddress);
    const maskL = ipToLong(ipRec.subnet.netmask);
    if ((ipL & maskL) >>> 0 !== (netL & maskL) >>> 0) {
      oobIds.push(ipRec.id);
    }
  }
  if (oobIds.length > 0) {
    const deletedOob = await prisma.iPAddress.deleteMany({
      where: { id: { in: oobIds } },
    });
    logger.log(
      `Purged ${deletedOob.count} out-of-bounds IP records violating subnet CIDR boundaries.`,
    );
  }

  // 0.3 Purge unlinked / duplicate credentials (INT-03)
  // Disconnect assets pointing to orphaned credentials that have no linked IP addresses
  await prisma.asset.updateMany({
    where: {
      credential: {
        ipAddresses: { none: {} },
      },
    },
    data: {
      credentialId: null,
    },
  });

  // Purge any unlinked credentials (including unlinked duplicate IPS VNPT)
  const deletedOrphans = await prisma.networkCredential.deleteMany({
    where: {
      OR: [
        {
          name: 'IPS VNPT (192.168.1.1)',
          ipAddresses: { none: {} },
        },
        {
          ipAddresses: { none: {} },
        },
      ],
    },
  });
  logger.log(`Purged ${deletedOrphans.count} unlinked orphaned credentials.`);

  // 0.4 Sanitize existing plaintext password records in IPAddress.description (INT-01)
  const sanitizedCount1 = await prisma.$executeRawUnsafe(`
    UPDATE "IPAddress"
    SET description = 'Vaulted credential'
    WHERE description ~* 'CamYo-Tw!!|BSLsoctrang@|Soctrang\\d+|\\[object Object\\]'
       OR description IN ('admin/••••••••', '••••••••', 'admin/CamYo-Tw!!)', 'Soctrang123')
  `);
  const sanitizedCount2 = await prisma.$executeRawUnsafe(`
    UPDATE "IPAddress"
    SET description = REGEXP_REPLACE(description, '(admin(?:istrator)?/)[^\\s,;)]+', '\\1••••••••', 'gi')
    WHERE description ~* 'admin/'
  `);
  logger.log(
    `Sanitized legacy plaintext password records in IPAddress.description (${Number(sanitizedCount1) + Number(sanitizedCount2)} updated).`,
  );

  // 1. Reconcile Enterprise Locations
  logger.log('Reconciling enterprise physical locations...');
  const locationsMap = new Map<string, string>(); // code -> id

  const locationsConfig = [
    {
      code: 'BSL-ST',
      name: 'BSL - Soc Trang Campus',
      building: 'Main Manufacturing Complex (F1-F7)',
      type: 'Campus / Factory',
      address: 'An Nghiep Industrial Park, Soc Trang Province, Vietnam',
    },
    {
      code: 'HCM-D7',
      name: 'HCM Office - District 7',
      building: 'BSH1 + BSH2 Office',
      type: 'Branch Office',
      address: 'District 7, Ho Chi Minh City, Vietnam',
    },
    {
      code: 'HCM-D3',
      name: 'HCM Office - District 3',
      building: 'District 3 Office',
      type: 'Branch Office',
      address: 'District 3, Ho Chi Minh City, Vietnam',
    },
  ];

  for (const loc of locationsConfig) {
    const existing = await prisma.location.findFirst({
      where: { OR: [{ code: loc.code }, { name: loc.name }] },
    });

    if (existing) {
      locationsMap.set(loc.code, existing.id);
    } else {
      const created = await prisma.location.create({
        data: loc,
      });
      locationsMap.set(loc.code, created.id);
    }
  }

  // 2. Standard Subnet & VLAN Specifications (Domain Reference Architecture)
  logger.log('Provisioning Enterprise VLAN and Subnet topology...');
  const standardSubnets: SubnetSpec[] = [
    {
      cidr: '10.232.100.0/24',
      name: 'BSL Server Room & Core Infrastructure',
      vlanNumber: 100,
      vlanName: 'BSL Servers & Core',
      locationCode: 'BSL-ST',
      gateway: '10.232.100.254',
      description: 'Production hypervisors, ERP servers, PBX, CATO SD-WAN, core portals',
    },
    {
      cidr: '10.232.129.0/24',
      name: 'BSL Core & Edge Switch Management',
      vlanNumber: 129,
      vlanName: 'BSL Switch Management',
      locationCode: 'BSL-ST',
      gateway: '10.232.129.254',
      description: 'Cisco Catalyst 9300 and C1300 switch management interfaces',
    },
    {
      cidr: '10.232.130.0/24',
      name: 'BSL Access Control & Time Attendance',
      vlanNumber: 130,
      vlanName: 'BSL Access Control',
      locationCode: 'BSL-ST',
      gateway: '10.232.130.254',
      description: 'Time attendance fingerprint terminals (MCC F1-F7) and wireless APs',
    },
    {
      cidr: '10.232.131.0/24',
      name: 'BSL Factory 1 Terminals & Printers',
      vlanNumber: 131,
      vlanName: 'Factory 1 Devices',
      locationCode: 'BSL-ST',
      gateway: '10.232.131.254',
      description: 'Hikvision facial recognition terminals and local production printers',
    },
    {
      cidr: '10.232.132.0/24',
      name: 'BSL Factory 2 Terminals & Printers',
      vlanNumber: 132,
      vlanName: 'Factory 2 Devices',
      locationCode: 'BSL-ST',
      gateway: '10.232.132.254',
      description: 'Factory 2 face recognition terminals and printers',
    },
    {
      cidr: '10.232.133.0/24',
      name: 'BSL Factory 3 Terminals',
      vlanNumber: 133,
      vlanName: 'Factory 3 Devices',
      locationCode: 'BSL-ST',
      gateway: '10.232.133.254',
      description: 'Factory 3 face recognition door terminals',
    },
    {
      cidr: '10.232.134.0/24',
      name: 'BSL Factory 4 Terminals & Cameras',
      vlanNumber: 134,
      vlanName: 'Factory 4 Devices',
      locationCode: 'BSL-ST',
      gateway: '10.232.134.254',
      description: 'Factory 4 face recognition door terminals and cameras',
    },
    {
      cidr: '10.232.135.0/24',
      name: 'BSL Factory 5 Terminals & Printers',
      vlanNumber: 135,
      vlanName: 'Factory 5 Devices',
      locationCode: 'BSL-ST',
      gateway: '10.232.135.254',
      description: 'Factory 5 face recognition door terminals and printers',
    },
    {
      cidr: '10.232.136.0/24',
      name: 'BSL Factory 6 Terminals',
      vlanNumber: 136,
      vlanName: 'Factory 6 Devices',
      locationCode: 'BSL-ST',
      gateway: '10.232.136.254',
      description: 'Factory 6 face recognition door terminals and MCD units',
    },
    {
      cidr: '10.232.137.0/24',
      name: 'BSL CMCD QA & Lab Terminals',
      vlanNumber: 137,
      vlanName: 'CMCD QA & Lab',
      locationCode: 'BSL-ST',
      gateway: '10.232.137.254',
      description: 'Quality assurance and lab room access control terminals',
    },
    {
      cidr: '10.232.138.0/24',
      name: 'BSL Administrative Office Printers',
      vlanNumber: 138,
      vlanName: 'Office Printers',
      locationCode: 'BSL-ST',
      gateway: '10.232.138.254',
      description: 'SAP, accounting, import-export network printers',
    },
    {
      cidr: '10.232.139.0/24',
      name: 'BSL Factory 7 Office Printers',
      vlanNumber: 139,
      vlanName: 'Factory 7 Printers',
      locationCode: 'BSL-ST',
      gateway: '10.232.139.254',
      description: 'Factory 7 sales and maintenance office printers',
    },
    {
      cidr: '10.232.97.0/24',
      name: 'BSL CCTV Backbone & NVR Storage',
      vlanNumber: 97,
      vlanName: 'CCTV Backbone',
      locationCode: 'BSL-ST',
      gateway: '10.232.97.254',
      description: 'Hanwha Techwin NVR storage array and Alcatel OmniSwitch backbone',
    },
    {
      cidr: '10.232.98.0/24',
      name: 'BSL Factory 1-6 CCTV Fleet',
      vlanNumber: 98,
      vlanName: 'CCTV Factory 1-6',
      locationCode: 'BSL-ST',
      gateway: '10.232.98.254',
      description: 'Hanwha Vision & Hikvision camera surveillance fleet across F1-F6',
    },
    {
      cidr: '10.232.99.0/24',
      name: 'BSL Factory 7 CCTV Fleet',
      vlanNumber: 99,
      vlanName: 'CCTV Factory 7',
      locationCode: 'BSL-ST',
      gateway: '10.232.99.254',
      description: 'Hanwha Vision camera surveillance fleet across Factory 7',
    },
    {
      cidr: '10.232.125.0/24',
      name: 'BSL Legacy CCTV Fleet',
      vlanNumber: 125,
      vlanName: 'CCTV Legacy',
      locationCode: 'BSL-ST',
      gateway: '10.232.125.254',
      description: 'Hikvision surveillance cameras in solar substation and factories',
    },
    {
      cidr: '10.232.112.0/24',
      name: 'BSL Factory 7 Construction Network',
      vlanNumber: 998,
      vlanName: 'Factory 7 Construction',
      locationCode: 'BSL-ST',
      gateway: '10.232.112.1',
      description: 'Temporary construction field units at Factory 7 (normalized to /24)',
    },
    {
      cidr: '192.168.232.0/25',
      name: 'BSL Server Room WAN (VNPT)',
      vlanNumber: 996,
      vlanName: 'Legacy Construction & WAN',
      locationCode: 'BSL-ST',
      gateway: '192.168.232.1',
      description: 'VNPT fiber modem WAN gateway for BSL server room (lower /25 block)',
    },
    {
      cidr: '192.168.232.128/25',
      name: 'BSL Legacy Construction Network',
      vlanNumber: 996,
      vlanName: 'Legacy Construction & WAN',
      locationCode: 'BSL-ST',
      gateway: '192.168.232.129',
      description: 'Legacy construction field units and Viettel modem (upper /25 block)',
    },
    {
      cidr: '10.233.100.0/23',
      name: 'HCM District 7 Corporate Office',
      vlanNumber: 233,
      vlanName: 'HCM Office D7',
      locationCode: 'HCM-D7',
      gateway: '10.233.100.1',
      description: 'CATO SD-WAN, Cisco switches, Synology NAS, APs and office printers',
    },
    {
      cidr: '192.168.1.0/24',
      name: 'HCM District 3 Branch Office',
      vlanNumber: 1,
      vlanName: 'HCM Office D3',
      locationCode: 'HCM-D3',
      gateway: '192.168.1.1',
      description: 'VNPT fiber modem, biometric terminals, APs, office workstations',
    },
  ];

  const vlanMap = new Map<number, string>(); // vlanNumber -> id
  const subnetMap = new Map<string, string>(); // cidr -> id

  for (const spec of standardSubnets) {
    const locId = locationsMap.get(spec.locationCode) || null;

    // Upsert VLAN
    const vlan = await prisma.vLAN.upsert({
      where: { vlanNumber: spec.vlanNumber },
      update: {
        name: spec.vlanName,
        locationId: locId,
        description: spec.description,
      },
      create: {
        vlanNumber: spec.vlanNumber,
        name: spec.vlanName,
        locationId: locId,
        description: spec.description,
        status: 'ACTIVE',
      },
    });
    vlanMap.set(spec.vlanNumber, vlan.id);

    // Calculate Subnet math metrics
    const [netAddr, prefixStr] = spec.cidr.split('/');
    const details = calculateSubnet(netAddr, parseInt(prefixStr, 10));

    const subnet = await prisma.subnet.upsert({
      where: { cidr: spec.cidr },
      update: {
        name: spec.name,
        vlanId: vlan.id,
        locationId: locId,
        gateway: spec.gateway,
        networkAddress: details.networkAddress,
        netmask: details.netmask,
        broadcastAddress: details.broadcastAddress,
        startIp: details.startIp,
        endIp: details.endIp,
        totalIps: details.totalIps,
        description: spec.description,
      },
      create: {
        cidr: spec.cidr,
        name: spec.name,
        vlanId: vlan.id,
        locationId: locId,
        gateway: spec.gateway,
        networkAddress: details.networkAddress,
        netmask: details.netmask,
        broadcastAddress: details.broadcastAddress,
        startIp: details.startIp,
        endIp: details.endIp,
        totalIps: details.totalIps,
        description: spec.description,
      },
    });
    subnetMap.set(spec.cidr, subnet.id);
  }

  // 3. Parse and Standardize All Worksheets
  logger.log('Parsing all 22 sheets with layout adaptation and anomaly resolution...');
  const rawRecords: ParsedRawRecord[] = [];

  for (const ws of workbook.worksheets) {
    if (ws.name === 'MDM') {
      logger.log('Skipping MDM sheet (empty placeholder stub).');
      continue;
    }

    // Determine header row dynamically based on uniqueness
    const r1Set = new Set<string>();
    ws.getRow(1).eachCell((c) => {
      if (c.value) r1Set.add(String(c.value).trim());
    });
    const r2Set = new Set<string>();
    ws.getRow(2).eachCell((c) => {
      if (c.value) r2Set.add(String(c.value).trim());
    });
    const headerRow = r1Set.size <= 2 && r2Set.size >= 4 ? 2 : 1;

    // Detect column indexes
    const colMap: Record<string, number> = {};
    ws.getRow(headerRow).eachCell((c, colNum) => {
      const h = String(c.value || '')
        .trim()
        .toLowerCase();
      if (h === 'ip address' || h === 'ip-new' || h === 'ip address (new)') colMap['ip'] = colNum;
      else if (h === 'subnet mask' || h === 'subnet mask (new)') colMap['mask'] = colNum;
      else if (h === 'gateway' || h === 'default gateway' || h === 'default gateway (new)')
        colMap['gateway'] = colNum;
      else if (h.includes('mac')) colMap['mac'] = colNum;
      else if (h === 'hostname' || h === 'camera name' || h === 'name') colMap['hostname'] = colNum;
      else if (h === 'model' || h === 'camera model') colMap['model'] = colNum;
      else if (h.includes('brand') || h.includes('manufacturer')) colMap['manufacturer'] = colNum;
      else if (h === 'location' || h === 'area') colMap['location'] = colNum;
      else if (h === 'section') colMap['section'] = colNum;
      else if (h.includes('s/n') || h === 'serial') colMap['serial'] = colNum;
      else if (h === 'account' || h === 'username') colMap['account'] = colNum;
      else if (h === 'password') colMap['password'] = colNum;
      else if (h === 'remark' || h === 'note') colMap['remark'] = colNum;
      else if (h === 'status') colMap['status'] = colNum;
    });

    // Handle archetype overrides
    if (ws.name === 'VLAN 98' || ws.name === 'VLAN 99') {
      colMap['ip'] = 9; // IP-new
      colMap['remark'] = 11; // Note
    } else if (ws.name.startsWith('VLAN 125')) {
      colMap['ip'] = 6;
      colMap['remark'] = 17; // Note
    } else if (ws.name === 'Fingerprint') {
      colMap['ip'] = 6; // IP Address (NEW)
    }

    // Determine default VLAN and Subnet for sheet
    let defaultVlan = 100;
    let defaultSubnet = '10.232.100.0/24';
    let defaultLoc = 'BSL-ST';

    if (SHEET_CONFIGS[ws.name]) {
      defaultVlan = SHEET_CONFIGS[ws.name].vlan;
      defaultSubnet = SHEET_CONFIGS[ws.name].subnet;
      defaultLoc = SHEET_CONFIGS[ws.name].loc;
    } else if (ws.name.startsWith('VLAN 125')) {
      defaultVlan = 125;
      defaultSubnet = '10.232.125.0/24';
      defaultLoc = 'BSL-ST';
    }

    for (let r = headerRow + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      let ip = colMap['ip'] ? getCellValue(row.getCell(colMap['ip'])) : '';
      let hostname = colMap['hostname'] ? getCellValue(row.getCell(colMap['hostname'])) : '';
      let rawMac = colMap['mac'] ? getCellValue(row.getCell(colMap['mac'])) : '';
      let model = colMap['model'] ? getCellValue(row.getCell(colMap['model'])) : '';
      let manufacturer = colMap['manufacturer']
        ? getCellValue(row.getCell(colMap['manufacturer']))
        : '';
      let section = colMap['section'] ? getCellValue(row.getCell(colMap['section'])) : '';
      let serial = colMap['serial'] ? getCellValue(row.getCell(colMap['serial'])) : '';
      let account = colMap['account'] ? getCellValue(row.getCell(colMap['account'])) : '';
      let password = colMap['password'] ? getCellValue(row.getCell(colMap['password'])) : '';
      let remark = colMap['remark'] ? getCellValue(row.getCell(colMap['remark'])) : '';
      let statusStr = colMap['status'] ? getCellValue(row.getCell(colMap['status'])) : '';

      // Skip non-IP SaaS account rows in VLAN 100 without IP
      if (!ip && ws.name === 'VLAN 100' && (account || password || hostname)) {
        continue;
      }

      // Skip URL in HCM Office 3 row 24
      if (ip.startsWith('http')) {
        continue;
      }

      // Anomaly Fix 1: Typo 10.233.130.x -> 10.232.130.x in VLAN 130
      if (/^10\.233\.130\.\d+$/.test(ip) && ws.name.includes('130')) {
        ip = ip.replace('10.233.130.', '10.232.130.');
      }

      // Anomaly Fix 2: Discard pending migrations with missing New IP in Fingerprint sheet
      if (ws.name === 'Fingerprint' && (!ip || ip.toLowerCase().includes('chuẩn bị'))) {
        continue;
      }

      // Anomaly Fix 3: Fingerprint ID 205 collision with ID 105 (golden record precedence to VLAN 130)
      if (
        ws.name === 'Fingerprint' &&
        ip === '10.232.130.120' &&
        getCellValue(row.getCell(1)).includes('205')
      ) {
        ip = '10.232.130.130';
      }

      // Must be a valid IPv4
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        continue;
      }

      // Extract credentials from remarks if present
      if (!password && remark) {
        const credMatch = remark.match(/(?:admin|administrator)\/([^\s,;)]+)/i);
        if (credMatch) {
          account = 'admin';
          password = credMatch[1].trim();
        } else if (/^Soctrang\d+$/i.test(remark)) {
          account = 'admin';
          password = remark.trim();
        }
      }

      // Clean and sanitize description to prevent leaking plaintext credentials
      const cleanDescription = sanitizeRemark(remark, password);

      // Normalize MAC and serial
      const { mac, serial: parsedSerial } = normalizeMac(rawMac);
      if (!serial && parsedSerial) serial = parsedSerial;

      // Classify device type
      const deviceType = classifyDeviceType(hostname, model, ws.name, remark);

      // Determine status
      let status: IPStatus = 'ASSIGNED';
      if (/repair|hỏng|bảo trì/i.test(statusStr)) status = 'RESERVED';
      else if (!hostname && !model && (ws.name === 'VLAN 98' || ws.name === 'VLAN 99')) {
        status = 'AVAILABLE';
      }

      // Dynamically resolve standard subnet by mathematical CIDR containment
      const matchedSubnet = findMatchingSubnet(ip, standardSubnets);
      const effectiveSubnetCidr = matchedSubnet ? matchedSubnet.cidr : defaultSubnet;
      const effectiveVlanNumber = matchedSubnet ? matchedSubnet.vlanNumber : defaultVlan;
      const effectiveLocationCode = matchedSubnet ? matchedSubnet.locationCode : defaultLoc;

      rawRecords.push({
        sheetName: ws.name,
        rowNumber: r,
        ip,
        hostname: hostname || `${deviceType}-${ip.split('.').pop()}`,
        macAddress: mac,
        vendor: manufacturer || undefined,
        model: model || undefined,
        serialNumber: serial || undefined,
        section: section || undefined,
        locationCode: effectiveLocationCode,
        vlanNumber: effectiveVlanNumber,
        subnetCidr: effectiveSubnetCidr,
        deviceType,
        status,
        username: account || (password ? 'admin' : undefined),
        password: password || undefined,
        protocol: deviceType === 'Switch' ? 'SSH' : deviceType === 'Camera' ? 'RTSP' : 'HTTP',
        port: deviceType === 'Switch' ? 22 : deviceType === 'Camera' ? 554 : 80,
        description: cleanDescription,
      });
    }
  }

  logger.log(`Parsed ${rawRecords.length} candidate device records across all worksheets.`);

  // 4. Golden Record Precedence & Deduplication
  logger.log('Executing Golden Record Precedence and Deduplication...');
  const deduplicatedRecords = new Map<string, ParsedRawRecord>(); // key: `${ip}_${subnetCidr}`

  for (const rec of rawRecords) {
    // Special Anomaly Precedence 1: Core Switch 9300-01 vs 9300-02 at .254
    if (rec.vlanNumber === 129 && rec.ip === '10.232.129.254') {
      if (rec.hostname.includes('01')) {
        rec.ip = '10.232.129.252';
        rec.description = 'Primary Core Switch 9300-01 (Active) / Shared VIP .254';
      } else if (rec.hostname.includes('02')) {
        rec.ip = '10.232.129.253';
        rec.description = 'Secondary Core Switch 9300-02 (Standby) / Shared VIP .254';
      }
    }

    // Special Anomaly Precedence 2: Printer Collision at 10.232.135.79 (VLAN 135)
    if (
      rec.vlanNumber === 135 &&
      rec.ip === '10.232.135.79' &&
      (rec.hostname?.includes('M211dw') || rec.model?.includes('M211dw'))
    ) {
      rec.ip = '10.232.135.80';
      rec.description = `${rec.description || ''} [Reassigned from duplicate .79 in source]`.trim();
    }

    // Special Anomaly Precedence 3: PBX vs IVMS4200 at 10.232.100.5 (VLAN 100)
    if (rec.vlanNumber === 100 && rec.ip === '10.232.100.5' && rec.hostname.includes('IVMS')) {
      rec.ip = '10.232.100.50';
      rec.description = `${rec.description || ''} [IVMS-4200 Access Control Server (Client Soft)]`;
    }

    const key = `${rec.ip}__${rec.subnetCidr}`;
    if (!deduplicatedRecords.has(key)) {
      deduplicatedRecords.set(key, rec);
    } else {
      // Merge records with golden record precedence
      const existing = deduplicatedRecords.get(key)!;
      // VLAN 130 takes precedence over Fingerprint
      if (rec.sheetName === 'VLAN 130' && existing.sheetName === 'Fingerprint') {
        deduplicatedRecords.set(key, rec);
      } else {
        // Merge attributes
        if (!existing.macAddress && rec.macAddress) existing.macAddress = rec.macAddress;
        if (!existing.serialNumber && rec.serialNumber) existing.serialNumber = rec.serialNumber;
        if (!existing.model && rec.model) existing.model = rec.model;
        if (!existing.password && rec.password) {
          existing.password = rec.password;
          existing.username = rec.username;
        }
      }
    }
  }

  const finalRecords = Array.from(deduplicatedRecords.values());
  logger.log(
    `Total unique, conflict-free IP records ready for database persistence: ${finalRecords.length}`,
  );

  // 5. Chunked Transaction Execution
  const chunkSize = 100;
  let vaultedCredsCount = 0;
  let createdAssetsCount = 0;
  let persistedIpsCount = 0;

  for (let i = 0; i < finalRecords.length; i += chunkSize) {
    const chunk = finalRecords.slice(i, i + chunkSize);
    logger.log(
      `Processing batch ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(finalRecords.length / chunkSize)} (${chunk.length} items)...`,
    );

    await prisma.$transaction(async (tx) => {
      for (const rec of chunk) {
        const subnetId = subnetMap.get(rec.subnetCidr);
        const vlanId = vlanMap.get(rec.vlanNumber);
        const locationId = locationsMap.get(rec.locationCode);

        // 5.1 Secure Credential Vaulting (AES-256-GCM) with Strict Idempotency
        let credentialId: string | undefined = undefined;
        if (rec.password) {
          const encrypted = vault.encrypt(rec.password);
          const credName = `${rec.hostname} (${rec.ip})`;

          // 1. Check if IPAddress already exists with a linked credential
          const existingIp = await tx.iPAddress.findUnique({
            where: {
              address_subnetId: {
                address: rec.ip,
                subnetId: subnetId || '',
              },
            },
            select: { credentialId: true },
          });

          if (existingIp?.credentialId) {
            // Update existing linked credential
            const cred = await tx.networkCredential.update({
              where: { id: existingIp.credentialId },
              data: {
                name: credName,
                username: rec.username || 'admin',
                encryptedData: encrypted.encryptedData,
                iv: encrypted.iv,
                authTag: encrypted.authTag,
                keyVersion: encrypted.keyVersion,
                protocol: rec.protocol || 'HTTP',
                port: rec.port || 80,
                notes: `Vaulted from ${rec.sheetName} row ${rec.rowNumber}`,
              },
            });
            credentialId = cred.id;
          } else {
            // 2. Fallback: check if a credential with identical name already exists
            const existingCred = await tx.networkCredential.findFirst({
              where: { name: credName },
            });

            if (existingCred) {
              const cred = await tx.networkCredential.update({
                where: { id: existingCred.id },
                data: {
                  username: rec.username || 'admin',
                  encryptedData: encrypted.encryptedData,
                  iv: encrypted.iv,
                  authTag: encrypted.authTag,
                  keyVersion: encrypted.keyVersion,
                  protocol: rec.protocol || 'HTTP',
                  port: rec.port || 80,
                  notes: `Vaulted from ${rec.sheetName} row ${rec.rowNumber}`,
                },
              });
              credentialId = cred.id;
            } else {
              // 3. Create fresh credential
              const cred = await tx.networkCredential.create({
                data: {
                  name: credName,
                  username: rec.username || 'admin',
                  encryptedData: encrypted.encryptedData,
                  iv: encrypted.iv,
                  authTag: encrypted.authTag,
                  keyVersion: encrypted.keyVersion,
                  protocol: rec.protocol || 'HTTP',
                  port: rec.port || 80,
                  notes: `Vaulted from ${rec.sheetName} row ${rec.rowNumber}`,
                },
              });
              credentialId = cred.id;
            }
          }
          vaultedCredsCount++;
        }

        // 5.2 Physical Asset Creation (Optional Linkage)
        let assetId: string | undefined = undefined;
        if (rec.model || rec.vendor || rec.serialNumber) {
          const assetTag = `NET-${rec.vlanNumber}-${rec.ip.split('.').pop()}`;
          const asset = await tx.asset.upsert({
            where: { assetTag },
            update: {
              name: rec.hostname,
              model: rec.model,
              manufacturer: rec.vendor,
              serialNumber: rec.serialNumber,
              locationId,
              credentialId: credentialId ?? null,
            },
            create: {
              assetTag,
              name: rec.hostname,
              model: rec.model,
              manufacturer: rec.vendor,
              serialNumber: rec.serialNumber,
              locationId,
              credentialId: credentialId ?? null,
              status: 'AVAILABLE',
            },
          });
          assetId = asset.id;
          createdAssetsCount++;
        }

        // 5.3 IPAddress Record Upsert
        await tx.iPAddress.upsert({
          where: {
            address_subnetId: {
              address: rec.ip,
              subnetId: subnetId || '',
            },
          },
          update: {
            hostname: rec.hostname,
            macAddress: rec.macAddress,
            vendor: rec.vendor,
            deviceType: rec.deviceType,
            model: rec.model,
            serialNumber: rec.serialNumber,
            section: rec.section,
            vlanId,
            locationId,
            assetId,
            credentialId: credentialId ?? null,
            status: rec.status,
            pingStatus: 'online',
            lastSeen: new Date(),
            description: rec.description,
          },
          create: {
            address: rec.ip,
            hostname: rec.hostname,
            macAddress: rec.macAddress,
            vendor: rec.vendor,
            deviceType: rec.deviceType,
            model: rec.model,
            serialNumber: rec.serialNumber,
            section: rec.section,
            subnetId,
            vlanId,
            locationId,
            assetId,
            credentialId: credentialId ?? null,
            status: rec.status,
            pingStatus: 'online',
            lastSeen: new Date(),
            description: rec.description,
          },
        });
        persistedIpsCount++;
      }
    });
  }

  // 6. Recalculate Subnet Usage Statistics
  logger.log('Recalculating subnet utilization and address pools...');
  for (const [cidr, subnetId] of subnetMap.entries()) {
    const assignedCount = await prisma.iPAddress.count({
      where: { subnetId, status: 'ASSIGNED' },
    });
    const reservedCount = await prisma.iPAddress.count({
      where: { subnetId, status: 'RESERVED' },
    });

    await prisma.subnet.update({
      where: { id: subnetId },
      data: {
        usedIps: assignedCount,
        reservedIps: reservedCount,
      },
    });
  }

  logger.log('=============================================================================');
  logger.log('ENTERPRISE IPAM WORKBOOK INGESTION COMPLETE');
  logger.log(`• Physical Locations Reconciled: ${locationsMap.size}`);
  logger.log(`• VLANs Provisioned:             ${vlanMap.size}`);
  logger.log(`• Subnets Calculated & Seeded:   ${subnetMap.size}`);
  logger.log(`• IP Addresses Ingested:         ${persistedIpsCount}`);
  logger.log(`• Hardware Assets Associated:    ${createdAssetsCount}`);
  logger.log(`• Device Credentials Vaulted:    ${vaultedCredsCount} (AES-256-GCM Encrypted)`);
  logger.log('=============================================================================');

  if (pool) {
    await prisma.$disconnect();
    await pool.end();
  }

  return {
    locationsCount: locationsMap.size,
    vlansCount: vlanMap.size,
    subnetsCount: subnetMap.size,
    ipsCount: persistedIpsCount,
    assetsCount: createdAssetsCount,
    credentialsCount: vaultedCredsCount,
  };
}

if (require.main === module) {
  importNetworkExcel()
    .then(() => {
      process.exit(0);
    })
    .catch((error: unknown) => {
      const logger = new Logger('NetworkExcelImporter');
      logger.error(
        'Fatal error during Excel network ingestion:',
        error instanceof Error ? error.stack : error,
      );
      process.exit(1);
    });
}
