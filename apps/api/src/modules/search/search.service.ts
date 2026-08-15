import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SearchQueryDto, SearchResponseDto, SearchResultItem } from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';

function mapMeiliHit(indexUid: string, hit: Record<string, unknown>): SearchResultItem | null {
  if (indexUid === 'assets') {
    return {
      id: String(hit.id),
      title: `${hit.name} (${hit.assetTag || hit.tag})`,
      subtitle: `${hit.manufacturer || ''} ${hit.model || ''} • ${hit.category || 'Asset'}`.trim(),
      category: 'Asset',
      path: '/assets',
      status: hit.status as string,
    };
  }
  if (indexUid === 'licenses') {
    return {
      id: String(hit.id),
      title: `${hit.name} (${hit.vendor || 'License'})`,
      subtitle: `${hit.totalSeats} seats • ${hit.type}`,
      category: 'License',
      path: '/licenses',
      status: hit.status as string,
    };
  }
  if (indexUid === 'users') {
    return {
      id: String(hit.id),
      title: (hit.name || hit.displayName || hit.username) as string,
      subtitle: `${hit.email} • ${hit.jobTitle || hit.department || 'Directory'}`,
      category: 'Directory',
      path: '/directory',
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
    private configService: ConfigService,
  ) {
    this.meiliHost =
      this.configService.get<string>('MEILISEARCH_HOST') ||
      process.env.MEILISEARCH_HOST ||
      'http://localhost:7700';
    this.meiliApiKey =
      this.configService.get<string>('MEILISEARCH_API_KEY') ||
      process.env.MEILISEARCH_API_KEY ||
      'uims_meili_master_key_2026';
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

    if (!q) {
      return { query: q, total: 0, results: [] };
    }

    if (this.isMeiliAvailable) {
      try {
        const meiliResults = await this.searchMeilisearch(q, limit);
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
    return this.searchDatabaseFallback(q, limit);
  }

  private async searchMeilisearch(q: string, limit: number): Promise<Array<SearchResultItem>> {
    const searchBody = {
      queries: [
        { indexUid: 'assets', q, limit },
        { indexUid: 'licenses', q, limit },
        { indexUid: 'users', q, limit },
      ],
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

  async searchDatabaseFallback(q: string, limit: number): Promise<SearchResponseDto> {
    const [assets, licenses, users] = await Promise.all([
      this.prisma.asset.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { assetTag: { contains: q, mode: 'insensitive' } },
            { serialNumber: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { category: true },
        take: limit,
      }),
      this.prisma.license.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { vendor: { contains: q, mode: 'insensitive' } },
            { licenseKey: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
      }),
      this.prisma.directoryUser.findMany({
        where: {
          OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
      }),
    ]);

    const results: Array<SearchResultItem> = [
      ...assets.map((a) => ({
        id: a.id,
        title: `${a.name} (${a.assetTag})`,
        subtitle:
          `${a.manufacturer || ''} ${a.model || ''} • ${a.category?.name || 'Asset'}`.trim(),
        category: 'Asset' as const,
        path: '/assets',
        status: a.status,
      })),
      ...licenses.map((l) => ({
        id: l.id,
        title: `${l.name} (${l.vendor || 'License'})`,
        subtitle: `${l.totalSeats} seats • ${l.type}`,
        category: 'License' as const,
        path: '/licenses',
        status: l.status,
      })),
      ...users.map((u) => ({
        id: u.id,
        title: u.displayName || u.username,
        subtitle: `${u.email} • ${u.jobTitle || u.department || 'Directory'}`,
        category: 'Directory' as const,
        path: '/directory',
        status: u.accountStatus,
      })),
    ].slice(0, limit);

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
        return { success: false, message: 'Meilisearch service is unreachable' };
      }
    }

    try {
      const [assets, licenses, users] = await Promise.all([
        this.prisma.asset.findMany({ include: { category: true } }),
        this.prisma.license.findMany(),
        this.prisma.directoryUser.findMany(),
      ]);

      const assetDocs = assets.map((a) => ({
        id: a.id,
        name: a.name,
        assetTag: a.assetTag,
        serialNumber: a.serialNumber,
        model: a.model,
        manufacturer: a.manufacturer,
        category: a.category?.name,
        status: a.status,
      }));

      const licenseDocs = licenses.map((l) => ({
        id: l.id,
        name: l.name,
        vendor: l.vendor,
        type: l.type,
        totalSeats: l.totalSeats,
        status: l.status,
      }));

      const userDocs = users.map((u) => ({
        id: u.id,
        name: u.displayName,
        username: u.username,
        email: u.email,
        jobTitle: u.jobTitle,
        department: u.department,
        status: u.accountStatus,
      }));

      await Promise.all([
        this.sendDocuments('assets', assetDocs),
        this.sendDocuments('licenses', licenseDocs),
        this.sendDocuments('users', userDocs),
      ]);

      return {
        success: true,
        message: 'Successfully synchronized entities to Meilisearch indices',
        counts: {
          assets: assetDocs.length,
          licenses: licenseDocs.length,
          users: userDocs.length,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to sync to Meilisearch: ${msg}`);
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
