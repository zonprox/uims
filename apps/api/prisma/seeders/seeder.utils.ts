import * as crypto from 'node:crypto';
import { Logger } from '@nestjs/common';
import { type Prisma, type PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
