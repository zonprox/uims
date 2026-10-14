import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SearchQueryDto, SearchResponseDto, SearchResultItem } from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';

function mapMeiliHit(indexUid: string, hit: Record<string, unknown>): SearchResultItem | null {
  if (indexUid === 'assets') {
    return {
      id: String(hit.id),
      title: `${hit.name} (${hit.assetTag || hit.tag || 'Asset'})`,
      subtitle:
        `${hit.manufacturer || ''} ${hit.model || ''} • ${hit.category || 'Hardware'}`.trim(),
      category: 'Hardware',
      path: `/assets?drawer=${hit.id}`,
      status: hit.status as string,
    };
  }
  if (indexUid === 'licenses') {
    return {
      id: String(hit.id),
      title: `${hit.name} (${hit.vendor || 'License'})`,
      subtitle: `${hit.totalSeats || 0} seats • ${hit.type || 'License'}`,
      category: 'License',
      path: `/licenses?drawer=${hit.id}`,
      status: hit.status as string,
    };
  }
  if (indexUid === 'inventory') {
    const sku = (hit.sku || hit.id) as string;
    return {
      id: String(hit.id),
      title: `${hit.name} (${sku})`,
      subtitle: `Qty: ${hit.quantity ?? 0} • ${hit.category || 'Consumable'}`,
      category: 'Inventory',
      path: `/inventory?sku=${sku}`,
      status:
        (hit.status as string) ||
        (hit.quantity !== undefined
          ? Number(hit.quantity) <= Number(hit.minThreshold ?? 5)
            ? 'LOW_STOCK'
            : 'IN_STOCK'
          : undefined),
    };
  }
  if (indexUid === 'network') {
    return {
      id: String(hit.id),
      title: `${hit.name} (${hit.model || hit.cidr || 'Network'})`,
      subtitle:
        `${hit.vendor || ''} ${hit.role ? `• ${hit.role}` : ''} ${hit.totalPorts ? `• ${hit.totalPorts} Ports` : ''}`.trim(),
      category: 'Network',
      path: '/network',
      status: hit.status as string,
    };
  }
  if (indexUid === 'employees') {
    return {
      id: String(hit.id),
      title: (hit.displayName || hit.name || hit.email) as string,
      subtitle: `${hit.email} • ${hit.jobTitle || hit.department || 'Directory'}`,
      category: 'Employee',
      path: `/directory?drawer=${hit.id}`,
      status: hit.status as string,
    };
  }
  if (indexUid === 'users') {
    return {
      id: String(hit.id),
      title: (hit.displayName || hit.name || hit.username) as string,
      subtitle: `${hit.email} • ${hit.role || 'Console User'}`,
      category: 'User',
      path: `/users?drawer=${hit.id}`,
      status: hit.status as string,
    };
  }
  return null;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private meiliHost: string;
  private meiliApiKey: string;
  private isMeiliAvailable = false;

  constructor(
    private prisma: PrismaService,
    @Optional() private configService?: ConfigService,
  ) {
    this.meiliHost = this.configService
      ? this.configService.get<string>('MEILISEARCH_HOST') || 'http://localhost:7700'
      : process.env.MEILISEARCH_HOST || 'http://localhost:7700';

    if (this.configService) {
      let apiKey =
        this.configService.get<string>('MEILI_API_KEY') ||
        this.configService.get<string>('MEILISEARCH_API_KEY');

      if (!apiKey && typeof this.configService.getOrThrow === 'function') {
        apiKey = this.configService.getOrThrow<string>('MEILI_API_KEY');
      }

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        if (typeof this.configService.getOrThrow === 'function') {
          this.configService.getOrThrow<string>('MEILI_API_KEY');
        }
        throw new Error('MEILI_API_KEY environment variable is required and must not be empty');
      }
      this.meiliApiKey = apiKey;
    } else {
      const resolvedApiKey = process.env.MEILI_API_KEY || process.env.MEILISEARCH_API_KEY;
      if (!resolvedApiKey) {
        throw new Error('MEILI_API_KEY environment variable is required and must not be empty');
      }
      this.meiliApiKey = resolvedApiKey;
    }
  }

  async onModuleInit() {
    await this.checkHealthAndInit();
  }

  async checkHealthAndInit(): Promise<boolean> {
    try {
      const res = await fetch(`${this.meiliHost}/health`, {
        headers: { Authorization: `Bearer ${this.meiliApiKey}` },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        this.isMeiliAvailable = true;
        this.logger.log(`Meilisearch connected successfully at ${this.meiliHost}`);
        return true;
      }
    } catch (err: unknown) {
      this.isMeiliAvailable = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Meilisearch offline at ${this.meiliHost} (${msg}). Using database search fallback.`,
      );
    }
    return false;
  }

  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const q = (query.q || '').trim();
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const type = query.type || 'all';

    if (!q) {
      return { query: q, total: 0, results: [] };
    }

    if (this.isMeiliAvailable) {
      try {
        const meiliResults = await this.searchMeilisearch(q, limit, type);
        if (meiliResults && meiliResults.length > 0) {
          return {
            query: q,
            total: meiliResults.length,
            results: meiliResults,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Meilisearch query failed (${msg}), falling back to database search.`);
      }
    }

    // Database search fallback
    return this.searchDatabaseFallback(q, limit, type);
  }

  private async searchMeilisearch(
    q: string,
    limit: number,
    type: SearchQueryDto['type'] = 'all',
  ): Promise<Array<SearchResultItem>> {
    let indexUids: string[];
    switch (type) {
      case 'hardware':
      case 'assets':
        indexUids = ['assets'];
        break;
      case 'licenses':
        indexUids = ['licenses'];
        break;
      case 'inventory':
        indexUids = ['inventory'];
        break;
      case 'network':
        indexUids = ['network'];
        break;
      case 'employees':
        indexUids = ['employees'];
        break;
      case 'users':
        indexUids = ['users'];
        break;
      case 'all':
      default:
        indexUids = ['assets', 'licenses', 'inventory', 'network', 'employees', 'users'];
        break;
    }

    const searchBody = {
      queries: indexUids.map((indexUid) => ({ indexUid, q, limit })),
    };

    const res = await fetch(`${this.meiliHost}/multi-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.meiliApiKey}`,
      },
      body: JSON.stringify(searchBody),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      throw new Error(`Meilisearch multi-search error: ${res.statusText}`);
    }

    const data = await res.json();
    const results: Array<SearchResultItem> = [];

    for (const result of data.results || []) {
      for (const hit of result.hits || []) {
        const item = mapMeiliHit(result.indexUid, hit);
        if (item) results.push(item);
      }
    }

    return results.slice(0, limit);
  }

  async searchDatabaseFallback(
    q: string,
    limit: number,
    type: SearchQueryDto['type'] = 'all',
  ): Promise<SearchResponseDto> {
    const boundedLimit = Math.min(Math.max(1, limit || 20), 100);
    const shouldSearchAll = !type || type === 'all';
    const shouldSearchHardware = shouldSearchAll || type === 'hardware' || type === 'assets';
    const shouldSearchLicenses = shouldSearchAll || type === 'licenses';
    const shouldSearchInventory = shouldSearchAll || type === 'inventory';
    const shouldSearchNetwork = shouldSearchAll || type === 'network';
    const shouldSearchEmployees = shouldSearchAll || type === 'employees';
    const shouldSearchUsers = shouldSearchAll || type === 'users';

    const [assets, licenses, inventoryItems, networkSwitches, subnets, directoryUsers, appUsers] =
      await Promise.all([
        shouldSearchHardware
          ? this.prisma.asset.findMany({
              where: {
                OR: [
                  { assetTag: { contains: q, mode: 'insensitive' } },
                  { subcode: { contains: q, mode: 'insensitive' } },
                  { serialNumber: { contains: q, mode: 'insensitive' } },
                  { deviceModel: { name: { contains: q, mode: 'insensitive' } } },
                  { deviceModel: { modelCode: { contains: q, mode: 'insensitive' } } },
                  { deviceModel: { manufacturer: { contains: q, mode: 'insensitive' } } },
                ],
              },
              include: { deviceModel: { include: { category: true } } },
              take: boundedLimit,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            })
          : Promise.resolve([]),
        shouldSearchLicenses
          ? this.prisma.license.findMany({
              where: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { vendor: { contains: q, mode: 'insensitive' } },
                  { licenseKey: { contains: q, mode: 'insensitive' } },
                ],
              },
              take: boundedLimit,
              orderBy: [{ name: 'asc' }, { id: 'asc' }],
            })
          : Promise.resolve([]),
        shouldSearchInventory
          ? this.prisma.deviceModel.findMany({
              where: {
                deletedAt: null,
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { modelCode: { contains: q, mode: 'insensitive' } },
                  { manufacturer: { contains: q, mode: 'insensitive' } },
                ],
              },
              include: { category: true, vendor: true },
              take: boundedLimit,
              orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            })
          : Promise.resolve([]),
        shouldSearchNetwork
          ? this.prisma.networkSwitch.findMany({
              where: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { model: { contains: q, mode: 'insensitive' } },
                  { vendor: { contains: q, mode: 'insensitive' } },
                  { serialNumber: { contains: q, mode: 'insensitive' } },
                ],
              },
              take: boundedLimit,
              orderBy: [{ name: 'asc' }, { id: 'asc' }],
            })
          : Promise.resolve([]),
        shouldSearchNetwork
          ? this.prisma.subnet.findMany({
              where: {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { cidr: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                ],
              },
              take: boundedLimit,
              orderBy: [{ name: 'asc' }, { id: 'asc' }],
            })
          : Promise.resolve([]),
        shouldSearchEmployees
          ? this.prisma.directoryUser.findMany({
              where: {
                OR: [
                  { displayName: { contains: q, mode: 'insensitive' } },
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                  { employeeCode: { contains: q, mode: 'insensitive' } },
                  { department: { name: { contains: q, mode: 'insensitive' } } },
                  { position: { title: { contains: q, mode: 'insensitive' } } },
                ],
              },
              include: {
                department: true,
                position: true,
              },
              take: boundedLimit,
              orderBy: [{ email: 'asc' }, { id: 'asc' }],
            })
          : Promise.resolve([]),
        shouldSearchUsers
          ? this.prisma.appUser.findMany({
              where: {
                OR: [
                  { username: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  { displayName: { contains: q, mode: 'insensitive' } },
                ],
              },
              include: {
                role: true,
              },
              take: boundedLimit,
              orderBy: [{ username: 'asc' }, { id: 'asc' }],
            })
          : Promise.resolve([]),
      ]);

    const results: Array<SearchResultItem> = [
      ...assets.map((a) => {
        const modelName = a.deviceModel?.name || 'Hardware';
        const modelCode = a.deviceModel?.modelCode || a.subcode || a.assetTag || 'Asset';
        return {
          id: a.id,
          title: `${modelName} (${modelCode})`,
          subtitle: `${[a.deviceModel?.manufacturer, a.deviceModel?.name].filter(Boolean).join(' ') || 'Hardware'} • ${a.deviceModel?.category?.name || 'Uncategorized'}`,
          category: 'Hardware' as const,
          path: `/assets?drawer=${a.id}`,
          status: a.status,
        };
      }),
      ...licenses.map((l) => ({
        id: l.id,
        title: `${l.name} (${l.vendor || 'License'})`,
        subtitle: `${l.totalSeats} seats • ${l.type}`,
        category: 'License' as const,
        path: `/licenses?drawer=${l.id}`,
        status: l.status,
      })),
      ...inventoryItems.map((i) => ({
        id: i.id,
        title: `${i.name} (${i.modelCode})`,
        subtitle: `${i.manufacturer} • ${i.category?.name || 'Hardware'}`,
        category: 'Inventory' as const,
        path: `/inventory?sku=${i.modelCode || i.id}`,
        status: 'IN_STOCK',
      })),
      ...networkSwitches.map((s) => ({
        id: s.id,
        title: `${s.name} (${s.model})`,
        subtitle: `${s.vendor} • ${s.totalPorts} Ports • ${s.role}`,
        category: 'Network' as const,
        path: '/network',
        status: s.status,
      })),
      ...subnets.map((sub) => ({
        id: sub.id,
        title: `${sub.name} (${sub.cidr})`,
        subtitle: `Gateway: ${sub.gateway || 'N/A'} • ${sub.totalIps} IPs`,
        category: 'Network' as const,
        path: '/network',
        status: 'ACTIVE',
      })),
      ...directoryUsers.map((u) => ({
        id: u.id,
        title: u.displayName || `${u.firstName} ${u.lastName}`.trim() || u.email,
        subtitle: `${u.email} • ${u.position?.title || u.department?.name || 'Directory'}`,
        category: 'Employee' as const,
        path: `/directory?drawer=${u.id}`,
        status: u.status,
      })),
      ...appUsers.map((usr) => ({
        id: usr.id,
        title: usr.displayName || `${usr.firstName} ${usr.lastName}`.trim() || usr.username,
        subtitle: `${usr.email} • ${usr.role?.name || 'Console User'}`,
        category: 'User' as const,
        path: `/users?drawer=${usr.id}`,
        status: usr.status,
      })),
    ].slice(0, boundedLimit);

    return {
      query: q,
      total: results.length,
      results,
    };
  }

  async syncAllToMeilisearch() {
    if (!this.isMeiliAvailable) {
      const isOnline = await this.checkHealthAndInit();
      if (!isOnline) {
        return { success: false, message: 'Search service is unreachable' };
      }
    }

    try {
      // 1. Assets (Hardware): Cursor-based pagination in batches of 100
      let totalAssetDocs = 0;
      let lastAssetId: string | undefined;
      while (true) {
        const assetsBatch = await this.prisma.asset.findMany({
          take: 100,
          skip: lastAssetId ? 1 : 0,
          cursor: lastAssetId ? { id: lastAssetId } : undefined,
          orderBy: { id: 'asc' },
          include: { deviceModel: { include: { category: true } } },
        });

        if (!assetsBatch || assetsBatch.length === 0) break;

        const assetDocs = assetsBatch.map((a) => ({
          id: a.id,
          name: a.deviceModel?.name || 'Hardware Unit',
          assetTag: a.subcode || a.assetTag,
          serialNumber: a.serialNumber,
          model: a.deviceModel?.modelCode || a.deviceModel?.name,
          manufacturer: a.deviceModel?.manufacturer || 'Generic',
          category: a.deviceModel?.category?.name,
          status: a.status,
        }));
        await this.sendDocuments('assets', assetDocs);
        totalAssetDocs += assetDocs.length;
        lastAssetId = assetsBatch[assetsBatch.length - 1].id;

        if (assetsBatch.length < 100) break;
      }

      // 2. Licenses: Cursor-based pagination in batches of 100
      let totalLicenseDocs = 0;
      let lastLicenseId: string | undefined;
      while (true) {
        const licensesBatch = await this.prisma.license.findMany({
          take: 100,
          skip: lastLicenseId ? 1 : 0,
          cursor: lastLicenseId ? { id: lastLicenseId } : undefined,
          orderBy: { id: 'asc' },
        });

        if (!licensesBatch || licensesBatch.length === 0) break;

        const licenseDocs = licensesBatch.map((l) => ({
          id: l.id,
          name: l.name,
          vendor: l.vendor,
          type: l.type,
          totalSeats: l.totalSeats,
          status: l.status,
        }));
        await this.sendDocuments('licenses', licenseDocs);
        totalLicenseDocs += licenseDocs.length;
        lastLicenseId = licensesBatch[licensesBatch.length - 1].id;

        if (licensesBatch.length < 100) break;
      }

      // 3. Device Models & Inventory: Cursor-based pagination in batches of 100
      let totalInventoryDocs = 0;
      let lastInventoryId: string | undefined;
      while (true) {
        interface InventoryDocSource {
          id: string;
          name: string;
          modelCode?: string;
          sku?: string;
          category?: { name?: string } | null;
          minThreshold?: number;
          vendor?: { name?: string } | null;
          manufacturer?: string;
          supplier?: string;
          binNumber?: string | null;
        }
        let inventoryBatch: Array<InventoryDocSource> = [];
        if (typeof this.prisma.deviceModel?.findMany === 'function') {
          inventoryBatch = (await this.prisma.deviceModel.findMany({
            where: { deletedAt: null },
            take: 100,
            skip: lastInventoryId ? 1 : 0,
            cursor: lastInventoryId ? { id: lastInventoryId } : undefined,
            orderBy: { id: 'asc' },
            include: { category: true, vendor: true },
          })) as unknown as Array<InventoryDocSource>;
        } else if (
          typeof (
            this.prisma as unknown as {
              inventoryItem?: { findMany: (...args: unknown[]) => unknown };
            }
          ).inventoryItem?.findMany === 'function'
        ) {
          inventoryBatch = (await (
            this.prisma as unknown as {
              inventoryItem: { findMany: (args: unknown) => Promise<Array<InventoryDocSource>> };
            }
          ).inventoryItem.findMany({
            take: 100,
            skip: lastInventoryId ? 1 : 0,
            cursor: lastInventoryId ? { id: lastInventoryId } : undefined,
            orderBy: { id: 'asc' },
          })) as unknown as Array<InventoryDocSource>;
        }

        if (!inventoryBatch || inventoryBatch.length === 0) break;

        const inventoryDocs = inventoryBatch.map((i) => ({
          id: i.id,
          name: i.name,
          sku: i.modelCode || i.sku,
          modelCode: i.modelCode || i.sku,
          category: i.category?.name,
          minThreshold: i.minThreshold,
          supplier: i.vendor?.name || i.manufacturer || i.supplier,
          binNumber: i.binNumber,
        }));
        await this.sendDocuments('inventory', inventoryDocs);
        totalInventoryDocs += inventoryDocs.length;
        lastInventoryId = inventoryBatch[inventoryBatch.length - 1].id;

        if (inventoryBatch.length < 100) break;
      }

      // 4. Network: Switches & Subnets in batches of 100
      let totalNetworkDocs = 0;
      let lastSwitchId: string | undefined;
      while (true) {
        const switchBatch = await this.prisma.networkSwitch.findMany({
          take: 100,
          skip: lastSwitchId ? 1 : 0,
          cursor: lastSwitchId ? { id: lastSwitchId } : undefined,
          orderBy: { id: 'asc' },
        });

        if (!switchBatch || switchBatch.length === 0) break;

        const switchDocs = switchBatch.map((s) => ({
          id: s.id,
          name: s.name,
          model: s.model,
          vendor: s.vendor,
          role: s.role,
          totalPorts: s.totalPorts,
          status: s.status,
        }));
        await this.sendDocuments('network', switchDocs);
        totalNetworkDocs += switchDocs.length;
        lastSwitchId = switchBatch[switchBatch.length - 1].id;

        if (switchBatch.length < 100) break;
      }

      let lastSubnetId: string | undefined;
      while (true) {
        const subnetBatch = await this.prisma.subnet.findMany({
          take: 100,
          skip: lastSubnetId ? 1 : 0,
          cursor: lastSubnetId ? { id: lastSubnetId } : undefined,
          orderBy: { id: 'asc' },
        });

        if (!subnetBatch || subnetBatch.length === 0) break;

        const subnetDocs = subnetBatch.map((sub) => ({
          id: sub.id,
          name: sub.name,
          cidr: sub.cidr,
          gateway: sub.gateway,
          totalIps: sub.totalIps,
          status: 'ACTIVE',
        }));
        await this.sendDocuments('network', subnetDocs);
        totalNetworkDocs += subnetDocs.length;
        lastSubnetId = subnetBatch[subnetBatch.length - 1].id;

        if (subnetBatch.length < 100) break;
      }

      // 5. Employees (Directory Users): Cursor-based pagination in batches of 100
      let totalEmployeeDocs = 0;
      let lastEmployeeId: string | undefined;
      while (true) {
        const employeesBatch = await this.prisma.directoryUser.findMany({
          take: 100,
          skip: lastEmployeeId ? 1 : 0,
          cursor: lastEmployeeId ? { id: lastEmployeeId } : undefined,
          orderBy: { id: 'asc' },
          include: { department: true, position: true },
        });

        if (!employeesBatch || employeesBatch.length === 0) break;

        const employeeDocs = employeesBatch.map((u) => ({
          id: u.id,
          name: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
          employeeCode: u.employeeCode,
          email: u.email,
          jobTitle: u.position?.title,
          department: u.department?.name,
          status: u.status,
        }));
        await this.sendDocuments('employees', employeeDocs);
        totalEmployeeDocs += employeeDocs.length;
        lastEmployeeId = employeesBatch[employeesBatch.length - 1].id;

        if (employeesBatch.length < 100) break;
      }

      // 6. Users (Console App Users): Cursor-based pagination in batches of 100
      let totalUserDocs = 0;
      let lastUserId: string | undefined;
      while (true) {
        const usersBatch = await this.prisma.appUser.findMany({
          take: 100,
          skip: lastUserId ? 1 : 0,
          cursor: lastUserId ? { id: lastUserId } : undefined,
          orderBy: { id: 'asc' },
          include: { role: true },
        });

        if (!usersBatch || usersBatch.length === 0) break;

        const userDocs = usersBatch.map((usr) => ({
          id: usr.id,
          username: usr.username,
          name: usr.displayName || `${usr.firstName} ${usr.lastName}`.trim(),
          email: usr.email,
          role: usr.role?.name,
          status: usr.status,
        }));
        await this.sendDocuments('users', userDocs);
        totalUserDocs += userDocs.length;
        lastUserId = usersBatch[usersBatch.length - 1].id;

        if (usersBatch.length < 100) break;
      }

      return {
        success: true,
        message: 'Successfully synchronized search indices',
        counts: {
          assets: totalAssetDocs,
          licenses: totalLicenseDocs,
          inventory: totalInventoryDocs,
          network: totalNetworkDocs,
          employees: totalEmployeeDocs,
          users: totalUserDocs,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to sync to Meilisearch: ${msg}`,
        err instanceof Error ? err.stack : undefined,
      );
      return { success: false, error: msg };
    }
  }

  private async sendDocuments(indexUid: string, documents: Array<Record<string, unknown>>) {
    if (documents.length === 0) return;
    const res = await fetch(`${this.meiliHost}/indexes/${indexUid}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.meiliApiKey}`,
      },
      body: JSON.stringify(documents),
    });
    if (!res.ok) {
      throw new Error(`Failed to index ${indexUid}: ${res.statusText}`);
    }
  }
}
