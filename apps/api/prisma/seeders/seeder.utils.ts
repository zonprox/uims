import * as crypto from 'node:crypto';
import { Logger } from '@nestjs/common';
import { LocationType, type Prisma, type PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface LocationDef {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  status: string;
  building?: string;
  floor?: string;
  room?: string;
  address?: string;
  parentId?: string | null;
  fullPath: string;
  organizationId: string;
}

export interface FactorySectionDef {
  id: string;
  name: string;
  code: string;
  description: string;
  organizationId: string;
  parentId: string;
  managerName: string;
  managerEmail: string;
  status: string;
}

export interface SeederContext {
  organizations: Map<string, string>;
  locations: Map<string, string>;
  departments: Map<string, string>;
  positions: Map<string, string>;
  assetCategories: Map<string, string>;
  inventoryCategories: Map<string, string>;
  roles: Map<string, string>;
  appUsers: Map<string, string>;
  directoryUsers: Map<string, string>;
  vendors: Map<string, string>;
  assets: Map<string, string>;
  licenses: Map<string, string>;
  inventory: Map<string, string>;
}

export function createSeederContext(): SeederContext {
  return {
    organizations: new Map(),
    locations: new Map(),
    departments: new Map(),
    positions: new Map(),
    assetCategories: new Map(),
    inventoryCategories: new Map(),
    roles: new Map(),
    appUsers: new Map(),
    directoryUsers: new Map(),
    vendors: new Map(),
    assets: new Map(),
    licenses: new Map(),
    inventory: new Map(),
  };
}

export async function upsertById<TModel, TData extends { id: string }>(
  delegate: {
    upsert: (args: { where: { id: string }; update: TData; create: TData }) => Promise<TModel>;
  },
  data: TData,
): Promise<TModel> {
  const { id, ...rest } = data;
  return delegate.upsert({
    where: { id },
    update: rest as unknown as TData,
    create: data,
  });
}

export async function upsertByCode<TModel, TData extends { code: string }>(
  delegate: {
    upsert: (args: { where: { code: string }; update: TData; create: TData }) => Promise<TModel>;
  },
  data: TData,
): Promise<TModel> {
  const { code, ...rest } = data;
  return delegate.upsert({
    where: { code },
    update: rest as unknown as TData,
    create: data,
  });
}

export async function inTransactionChunks<T, R>(
  prisma: PrismaClient,
  items: T[],
  chunkSize: number,
  fn: (tx: Prisma.TransactionClient, item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await prisma.$transaction(async (tx) => {
      const res: R[] = [];
      for (const item of chunk) {
        res.push(await fn(tx, item));
      }
      return res;
    });
    results.push(...chunkResults);
  }
  return results;
}

export async function runDomainSeeder<T>(
  domainName: string,
  icon: string,
  description: string,
  fn: (logger: Logger) => Promise<T>,
): Promise<T> {
  const logger = new Logger(domainName);
  logger.log(`${icon} Starting ${description}...`);
  const start = Date.now();
  try {
    const result = await fn(logger);
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    logger.log(`✅ Completed ${description} in ${duration}s.`);
    return result;
  } catch (error: unknown) {
    logger.error(`❌ Failed ${description}:`, error instanceof Error ? error.stack : String(error));
    throw error;
  }
}

export function buildLookupMap<T extends { id: string }>(
  items: T[],
  keyExtractors: Array<(item: T) => string | undefined>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(item.id, item.id);
    for (const extract of keyExtractors) {
      const key = extract(item);
      if (key) {
        map.set(key, item.id);
        map.set(key.toLowerCase(), item.id);
        map.set(key.toUpperCase(), item.id);
      }
    }
  }
  return map;
}

export interface SeedCredentials {
  adminPassword: string;
  demoPassword: string;
  adminPasswordHash: string;
  defaultPasswordHash: string;
}

export async function getSeedCredentials(): Promise<SeedCredentials> {
  const adminPassword =
    process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString('base64url');
  const demoPassword =
    process.env.INITIAL_DEMO_PASSWORD || crypto.randomBytes(16).toString('base64url');

  const [adminPasswordHash, defaultPasswordHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(demoPassword, 12),
  ]);

  return { adminPassword, demoPassword, adminPasswordHash, defaultPasswordHash };
}

export function generateFactoryLocations(
  factoryNum: number,
  orgId: string,
  campusPath: string,
): LocationDef[] {
  const f = factoryNum;
  const fId = `loc-bsl-f${f}`;
  const fName = `Factory ${f} (Phân xưởng ${f})`;
  const fCode = `BSL-F${f}`;
  const fPath = `${campusPath} > ${fName}`;
  const locations: LocationDef[] = [
    {
      id: fId,
      name: fName,
      code: fCode,
      type: LocationType.WORKSHOP,
      status: 'ACTIVE',
      building: `Production Hall ${f}`,
      address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
      parentId: 'loc-bsl-st',
      fullPath: fPath,
      organizationId: orgId,
    },
  ];

  type SubLoc = [
    string,
    string,
    string,
    LocationType,
    string,
    [string, string, string, LocationType]?,
  ];
  const subZones: SubLoc[] = [
    [
      `loc-bsl-f${f}-qa`,
      `Factory ${f} - QA Lab & Technical Inspection`,
      `F${f}-QA`,
      LocationType.ZONE,
      `${fPath} > Factory ${f} - QA Lab & Technical Inspection`,
      [`loc-bsl-f${f}-qa-bench1`, 'Inspection Bench 01', `F${f}-QA-B01`, LocationType.STATION],
    ],
    [
      `loc-bsl-f${f}-sales`,
      `Factory ${f} - Sales & Planning Office`,
      `F${f}-SALES`,
      LocationType.ROOM,
      `${fPath} > Factory ${f} - Sales & Planning Office`,
    ],
    [
      `loc-bsl-f${f}-cut`,
      `Factory ${f} - Fabric Cutting Area`,
      `F${f}-CUT`,
      LocationType.ZONE,
      `${fPath} > Factory ${f} - Fabric Cutting Area`,
      [`loc-bsl-f${f}-cut-tbl1`, 'Auto Cutting Table 01', `F${f}-CUT-T01`, LocationType.STATION],
    ],
    [
      `loc-bsl-f${f}-print`,
      `Factory ${f} - Printing & Embroidery Zone`,
      `F${f}-PRINT`,
      LocationType.ZONE,
      `${fPath} > Factory ${f} - Printing & Embroidery Zone`,
      [`loc-bsl-f${f}-print-hp1`, 'Heat Press Station 01', `F${f}-PRN-HP1`, LocationType.STATION],
    ],
    [
      `loc-bsl-f${f}-maint`,
      `Factory ${f} - Equipment Maintenance Workshop (Khu Bảo Trì Cơ Điện)`,
      `F${f}-MAINT`,
      LocationType.WORKSHOP,
      `${fPath} > Factory ${f} - Equipment Maintenance Workshop`,
      [
        `loc-bsl-f${f}-maint-ws1`,
        'Maintenance Workbench 01',
        `F${f}-MNT-W01`,
        LocationType.STATION,
      ],
    ],
    [
      `loc-bsl-f${f}-pack`,
      `Factory ${f} - Finishing & Packing Hall`,
      `F${f}-PACK`,
      LocationType.ZONE,
      `${fPath} > Factory ${f} - Finishing & Packing Hall`,
      [`loc-bsl-f${f}-pack-st1`, 'Packing Table 01', `F${f}-PCK-T01`, LocationType.STATION],
    ],
    [
      `loc-bsl-f${f}-sample`,
      `Factory ${f} - Sample Making & Pattern Prototyping (Phòng May Mẫu & Rập)`,
      `F${f}-SAMPLE`,
      LocationType.ROOM,
      `${fPath} > Factory ${f} - Sample Making & Pattern Prototyping (Phòng May Mẫu & Rập)`,
      [
        `loc-bsl-f${f}-sample-st1`,
        'Sample Sewing Station 01',
        `F${f}-SMP-S01`,
        LocationType.STATION,
      ],
    ],
  ];

  for (const [id, name, code, type, fullPath, sub] of subZones) {
    locations.push({
      id,
      name,
      code,
      type,
      status: 'ACTIVE',
      parentId: fId,
      fullPath,
      organizationId: orgId,
    });
    if (sub) {
      locations.push({
        id: sub[0],
        name: sub[1],
        code: sub[2],
        type: sub[3],
        status: 'ACTIVE',
        parentId: id,
        fullPath: `${fullPath} > ${sub[1]}`,
        organizationId: orgId,
      });
    }
  }

  // MDC Sub-Warehouse
  const mdcId = `loc-bsl-f${f}-mdc`;
  const mdcPath = `${fPath} > Factory ${f} - Material Distribution Center (MDC)`;
  const mdcShelfPath = `${mdcPath} > Accessories Shelf 01`;
  locations.push(
    {
      id: mdcId,
      name: `Factory ${f} - Material Distribution Center (MDC)`,
      code: `F${f}-MDC`,
      type: LocationType.WAREHOUSE,
      status: 'ACTIVE',
      parentId: fId,
      fullPath: mdcPath,
      organizationId: orgId,
    },
    {
      id: `loc-bsl-f${f}-mdc-sh1`,
      name: 'Accessories Shelf 01',
      code: `F${f}-MDC-SH1`,
      type: LocationType.SHELF,
      status: 'ACTIVE',
      parentId: mdcId,
      fullPath: mdcShelfPath,
      organizationId: orgId,
    },
    {
      id: `loc-bsl-f${f}-mdc-bin1`,
      name: 'Bin MDC-01 (Zippers)',
      code: `F${f}-MDC-B01`,
      type: LocationType.BIN,
      status: 'ACTIVE',
      parentId: `loc-bsl-f${f}-mdc-sh1`,
      fullPath: `${mdcShelfPath} > Bin MDC-01 (Zippers)`,
      organizationId: orgId,
    },
    {
      id: `loc-bsl-f${f}-mdc-bin2`,
      name: 'Bin MDC-02 (Buttons)',
      code: `F${f}-MDC-B02`,
      type: LocationType.BIN,
      status: 'ACTIVE',
      parentId: `loc-bsl-f${f}-mdc-sh1`,
      fullPath: `${mdcShelfPath} > Bin MDC-02 (Buttons)`,
      organizationId: orgId,
    },
    {
      id: `loc-bsl-f${f}-mdc-bin3`,
      name: 'Bin MDC-03 (Threads)',
      code: `F${f}-MDC-B03`,
      type: LocationType.BIN,
      status: 'ACTIVE',
      parentId: `loc-bsl-f${f}-mdc-sh1`,
      fullPath: `${mdcShelfPath} > Bin MDC-03 (Threads)`,
      organizationId: orgId,
    },
  );

  // Production floor and sewing lines
  const prodId = `loc-bsl-f${f}-prod`;
  const prodPath = `${fPath} > Factory ${f} - Garment Production & Sewing Floor`;
  locations.push({
    id: prodId,
    name: `Factory ${f} - Garment Production & Sewing Floor`,
    code: `F${f}-PROD`,
    type: LocationType.ZONE,
    status: 'ACTIVE',
    parentId: fId,
    fullPath: prodPath,
    organizationId: orgId,
  });

  for (let l = 1; l <= 4; l++) {
    const lineId =
      f === 1 && l === 1
        ? 'loc-bsl-f1-sew'
        : l === 1
          ? `loc-bsl-f${f}-sew`
          : `loc-bsl-f${f}-sew${l}`;
    const lineName = `Factory ${f} - Sewing Line 0${l} (Chuyền may 0${l})`;
    const lineCode = l === 1 ? `F${f}-PROD` : `F${f}-SEW-L0${l}`;
    const linePath = `${prodPath} > ${lineName}`;
    locations.push({
      id: lineId,
      name: lineName,
      code: lineCode,
      type: LocationType.LINE,
      status: 'ACTIVE',
      parentId: prodId,
      fullPath: linePath,
      organizationId: orgId,
    });

    for (let s = 1; s <= 4; s++) {
      const stId =
        f === 1 && l === 1 && s === 1
          ? 'loc-bsl-f1-sew-st1'
          : f === 1 && l === 1
            ? `loc-bsl-f1-sew-st${s}`
            : l === 1
              ? `loc-bsl-f${f}-sew-st${s}`
              : `loc-bsl-f${f}-sew${l}-st${s}`;
      const stName = `Station 0${s} (Bàn may 0${s})`;
      locations.push({
        id: stId,
        name: stName,
        code: `F${f}-S${l}-ST0${s}`,
        type: LocationType.STATION,
        status: 'ACTIVE',
        parentId: lineId,
        fullPath: `${linePath} > ${stName}`,
        organizationId: orgId,
      });
    }

    if (f > 1 && l === 1) {
      locations.push({
        id: `loc-bsl-f${f}-sew1-st1`,
        name: 'Station 01 (Bàn may 01) [Legacy Alias]',
        code: `F${f}-S1-ST01-LEGACY`,
        type: LocationType.STATION,
        status: 'ACTIVE',
        parentId: lineId,
        fullPath: `${linePath} > Station 01 (Legacy Alias)`,
        organizationId: orgId,
      });
    }
  }

  return locations;
}

export function generateFactorySections(
  factoryNum: number,
  orgId: string,
  parentDeptId: string,
): FactorySectionDef[] {
  const f = factoryNum;
  const pId = parentDeptId;
  const sections = [
    'cut|Cutting Section|Fabric spreading, CAD marker plotting, automated knife cutting & bundling|Section Lead|cut',
    'prt|Printing & Embroidery Section|Screen printing, heat-transfer vinyl & multi-head automated embroidery|Section Lead|prt',
    'sew|Sewing Assembly Lines|Industrial lockstitch, overlock, flatlock sewing & seam-sealing lines|Line Supervisor|sew',
    'maint|Machine Maintenance Section|Industrial sewing machine servicing, preventive maintenance & repairs|Maintenance Lead|maint',
    'mdc|MDC Sub-Warehouse|Material Distribution Center sub-warehouse staging point for accessories|Storekeeper|mdc',
    'qa|Inline QA/QC Section|Inline traffic-light inspection, endline AQL audit & metal detector safety|QA Lead|qa',
    'smp|Sample & Pattern Development|Pre-production sample sewing, pattern prototyping & fit trials|Sample Lead|sample',
    'sale|Factory Sales & Planning|Production scheduling, daily output tracking & buyer progress updates|Planner|plan',
    'pck|Finishing & Packing Section|Thread trimming, steam ironing, barcode hang-tagging & export packing|Packing Lead|pck',
  ];

  return sections.map((row) => {
    const [codeSuffix, name, desc, role, prefix] = row.split('|');
    return {
      id: `${pId}-${codeSuffix}`,
      name: `Factory ${f} - ${name}`,
      code: `DEPT-BSL-F${f}-${codeSuffix.toUpperCase()}`,
      description: `${desc} for Factory ${f}`,
      organizationId: orgId,
      parentId: pId,
      managerName: `${role} F${f}`,
      managerEmail: `${prefix}.f${f}@youngonevn.com`,
      status: 'ACTIVE',
    };
  });
}

export interface SubnetDetails {
  networkAddress: string;
  netmask: string;
  broadcastAddress: string;
  startIp: string;
  endIp: string;
  gateway: string;
  totalIps: number;
}

export function calcSubnetDetails(cidr: string, overrideGateway?: string): SubnetDetails {
  const [ipPart, prefixStr] = cidr.trim().split('/');
  const prefix = Number(prefixStr);
  const maskInt = prefix === 0 ? 0 : prefix === 32 ? 0xffffffff : (~0 << (32 - prefix)) >>> 0;

  const intToIp = (int: number): string =>
    [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
  const ipToInt = (ip: string): number =>
    ip.split('.').reduce((acc, oct) => ((acc << 8) + Number(oct)) >>> 0, 0);

  const ipInt = ipToInt(ipPart);
  const networkInt = (ipInt & maskInt) >>> 0;
  const networkAddress = intToIp(networkInt);
  const wildcardInt = ~maskInt >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;
  const broadcastAddress = intToIp(broadcastInt);
  const netmask = intToIp(maskInt);
  const totalIps =
    prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.max(0, Math.pow(2, 32 - prefix) - 2);
  const startIp = intToIp((networkInt + 1) >>> 0);
  const endIp = intToIp((broadcastInt - 1) >>> 0);
  const gateway = overrideGateway || (prefix === 23 ? startIp : endIp);

  return {
    networkAddress,
    netmask,
    broadcastAddress,
    startIp,
    endIp,
    gateway,
    totalIps,
  };
}
