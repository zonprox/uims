import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Asset, License } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationsService } from './notifications.service';

export interface ScanResult {
  scanned: number;
  notified: number;
  throttled: number;
}

export interface DailyAlertScanSummary {
  licenses: ScanResult | { error: unknown };
  warranties: ScanResult | { error: unknown };
  maintenance: ScanResult | { error: unknown };
  lowStock: ScanResult | { error: unknown };
}

@Injectable()
export class ScheduledAlertsWorker {
  private readonly logger = new Logger(ScheduledAlertsWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /**
   * Daily scheduled background cron job executing at midnight UTC.
   */
  @Cron('0 0 * * *')
  async handleCronScan(): Promise<DailyAlertScanSummary> {
    return this.runDailyAlertScans();
  }

  /**
   * Run all alert scan routines concurrently and aggregate execution results.
   */
  async runDailyAlertScans(): Promise<DailyAlertScanSummary> {
    this.logger.log('Starting proactive scheduled alert scans...');

    const [licenses, warranties, maintenance, lowStock] = await Promise.allSettled([
      this.scanExpiringLicenses(),
      this.scanExpiringWarranties(),
      this.scanOverdueMaintenance(),
      this.scanLowStock(),
    ]);

    const summary: DailyAlertScanSummary = {
      licenses: licenses.status === 'fulfilled' ? licenses.value : { error: licenses.reason },
      warranties:
        warranties.status === 'fulfilled' ? warranties.value : { error: warranties.reason },
      maintenance:
        maintenance.status === 'fulfilled' ? maintenance.value : { error: maintenance.reason },
      lowStock: lowStock.status === 'fulfilled' ? lowStock.value : { error: lowStock.reason },
    };

    this.logger.log(`Proactive scheduled alert scans completed: ${JSON.stringify(summary)}`);
    return summary;
  }

  /**
   * 1. Scan Expiring Licenses (30, 15, 7, 1 day tiers and expired status)
   */
  async scanExpiringLicenses(): Promise<ScanResult> {
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const BATCH_SIZE = 100;

    let notified = 0;
    let throttled = 0;
    let totalScanned = 0;
    let cursor: string | undefined = undefined;

    while (true) {
      const licenses: License[] = await this.prisma.license.findMany({
        where: {
          expiryDate: { not: null, lte: thirtyDaysAhead },
        },
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
      });

      if (licenses.length === 0) break;
      totalScanned += licenses.length;

      for (const lic of licenses) {
        if (!lic.expiryDate) continue;

        const diffMs = lic.expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const dateStr = lic.expiryDate.toISOString().split('T')[0];

        if (daysRemaining <= 0) {
          // Expired tier
          if (lic.status !== 'EXPIRED') {
            await this.prisma.license.update({
              where: { id: lic.id },
              data: { status: 'EXPIRED' },
            });
          }
          const sent = await this.dispatchThrottledAlert(
            `alert:license:expired:${lic.id}`,
            86400 * 7, // 7 days cooldown
            {
              title: 'License Expired',
              message: `License "${lic.name}" expired on ${dateStr}. Review subscriptions immediately.`,
              type: 'ALERT',
              link: '/licenses',
            },
          );
          if (sent) notified++;
          else throttled++;
        } else if (daysRemaining === 1) {
          // 1-day critical tier
          if (lic.status !== 'EXPIRING_SOON') {
            await this.prisma.license.update({
              where: { id: lic.id },
              data: { status: 'EXPIRING_SOON' },
            });
          }
          const sent = await this.dispatchThrottledAlert(
            `alert:license:expiring:${lic.id}:1d`,
            86400, // 24 hours cooldown
            {
              title: 'Urgent: License Expiring Tomorrow',
              message: `License "${lic.name}" will expire tomorrow (${dateStr}). Immediate renewal required.`,
              type: 'ALERT',
              link: '/licenses',
            },
          );
          if (sent) notified++;
          else throttled++;
        } else if (daysRemaining <= 7) {
          // 7-day critical tier
          if (lic.status !== 'EXPIRING_SOON') {
            await this.prisma.license.update({
              where: { id: lic.id },
              data: { status: 'EXPIRING_SOON' },
            });
          }
          const sent = await this.dispatchThrottledAlert(
            `alert:license:expiring:${lic.id}:7d`,
            86400 * 3, // 3 days cooldown
            {
              title: 'Critical: License Expiring Soon',
              message: `License "${lic.name}" will expire in ${daysRemaining} day(s) (${dateStr}).`,
              type: 'ALERT',
              link: '/licenses',
            },
          );
          if (sent) notified++;
          else throttled++;
        } else if (daysRemaining <= 15) {
          // 15-day warning tier
          const sent = await this.dispatchThrottledAlert(
            `alert:license:expiring:${lic.id}:15d`,
            86400 * 7, // 7 days cooldown
            {
              title: 'License Expiring in 15 Days',
              message: `License "${lic.name}" will expire in ${daysRemaining} days (${dateStr}). Plan renewal.`,
              type: 'WARNING',
              link: '/licenses',
            },
          );
          if (sent) notified++;
          else throttled++;
        } else if (daysRemaining <= 30) {
          // 30-day advance notice tier
          const sent = await this.dispatchThrottledAlert(
            `alert:license:expiring:${lic.id}:30d`,
            86400 * 14, // 14 days cooldown
            {
              title: 'License Expiration Notice (30 Days)',
              message: `License "${lic.name}" will expire in ${daysRemaining} days (${dateStr}).`,
              type: 'WARNING',
              link: '/licenses',
            },
          );
          if (sent) notified++;
          else throttled++;
        }
      }

      cursor = licenses[licenses.length - 1].id;
      if (licenses.length < BATCH_SIZE) break;
    }

    return { scanned: totalScanned, notified, throttled };
  }

  /**
   * 2. Scan Expiring Asset Warranties (30, 15, 7 day tiers and expired warranties)
   */
  async scanExpiringWarranties(): Promise<ScanResult> {
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const BATCH_SIZE = 100;

    let notified = 0;
    let throttled = 0;
    let totalScanned = 0;
    let cursor: string | undefined = undefined;

    while (true) {
      const assets: Asset[] = await this.prisma.asset.findMany({
        where: {
          warrantyExpiry: { not: null, lte: thirtyDaysAhead },
          status: { in: ['AVAILABLE', 'IN_USE', 'MAINTENANCE'] },
        },
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
      });

      if (assets.length === 0) break;
      totalScanned += assets.length;

      for (const asset of assets) {
        if (!asset.warrantyExpiry) continue;

        const diffMs = asset.warrantyExpiry.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const dateStr = asset.warrantyExpiry.toISOString().split('T')[0];

        if (daysRemaining <= 0) {
          // Warranty expired
          const sent = await this.dispatchThrottledAlert(
            `alert:asset:warranty_expired:${asset.id}`,
            86400 * 7, // 7 days cooldown
            {
              title: 'Asset Warranty Expired',
              message: `Warranty for asset "${asset.name}" (${asset.assetTag}) has expired on ${dateStr}.`,
              type: 'WARNING',
              link: '/assets',
            },
          );
          if (sent) notified++;
          else throttled++;
        } else if (daysRemaining <= 7) {
          // 7-day tier
          const sent = await this.dispatchThrottledAlert(
            `alert:asset:warranty_expiring:${asset.id}:7d`,
            86400 * 3, // 3 days cooldown
            {
              title: 'Asset Warranty Expiring in 7 Days',
              message: `Warranty for asset "${asset.name}" (${asset.assetTag}) expires in ${daysRemaining} day(s) (${dateStr}).`,
              type: 'WARNING',
              link: '/assets',
            },
          );
          if (sent) notified++;
          else throttled++;
        } else if (daysRemaining <= 15) {
          // 15-day tier
          const sent = await this.dispatchThrottledAlert(
            `alert:asset:warranty_expiring:${asset.id}:15d`,
            86400 * 7, // 7 days cooldown
            {
              title: 'Asset Warranty Expiring in 15 Days',
              message: `Warranty for asset "${asset.name}" (${asset.assetTag}) expires in ${daysRemaining} days (${dateStr}).`,
              type: 'WARNING',
              link: '/assets',
            },
          );
          if (sent) notified++;
          else throttled++;
        } else if (daysRemaining <= 30) {
          // 30-day tier
          const sent = await this.dispatchThrottledAlert(
            `alert:asset:warranty_expiring:${asset.id}:30d`,
            86400 * 14, // 14 days cooldown
            {
              title: 'Asset Warranty Expiring Soon (30 Days)',
              message: `Warranty for asset "${asset.name}" (${asset.assetTag}) expires in ${daysRemaining} days (${dateStr}).`,
              type: 'WARNING',
              link: '/assets',
            },
          );
          if (sent) notified++;
          else throttled++;
        }
      }

      cursor = assets[assets.length - 1].id;
      if (assets.length < BATCH_SIZE) break;
    }

    return { scanned: totalScanned, notified, throttled };
  }

  /**
   * 3. Scan Overdue Maintenance (assets in MAINTENANCE status for > 14 days)
   */
  async scanOverdueMaintenance(): Promise<ScanResult> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const BATCH_SIZE = 100;

    let notified = 0;
    let throttled = 0;
    let totalScanned = 0;
    let cursor: string | undefined = undefined;

    while (true) {
      const assets: Asset[] = await this.prisma.asset.findMany({
        where: {
          status: 'MAINTENANCE',
          updatedAt: { lte: fourteenDaysAgo },
        },
        take: BATCH_SIZE,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
      });

      if (assets.length === 0) break;
      totalScanned += assets.length;

      for (const asset of assets) {
        const daysInMaintenance = Math.floor(
          (Date.now() - asset.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
        );

        const sent = await this.dispatchThrottledAlert(
          `alert:asset:maintenance_overdue:${asset.id}`,
          86400 * 3, // 3 days cooldown
          {
            title: 'Overdue Maintenance Alert',
            message: `Asset "${asset.name}" (${asset.assetTag}) has been under maintenance for ${daysInMaintenance} days (exceeds 14-day threshold).`,
            type: 'WARNING',
            link: '/assets',
          },
        );
        if (sent) notified++;
        else throttled++;
      }

      cursor = assets[assets.length - 1].id;
      if (assets.length < BATCH_SIZE) break;
    }

    return { scanned: totalScanned, notified, throttled };
  }

  /**
   * 4. Scan Low Stock & Out of Stock Inventory Items (quantity <= minThreshold)
   */
  async scanLowStock(): Promise<ScanResult> {
    let notified = 0;
    let throttled = 0;
    let totalScanned = 0;
    const BATCH_SIZE = 100;
    let cursor: string | undefined = undefined;

    while (true) {
      let items: Array<{
        id: string;
        name: string;
        sku: string;
        quantity: number;
        minThreshold: number;
      }>;
      let hasMore = false;

      if (typeof this.prisma.$queryRaw === 'function') {
        items = await this.prisma.$queryRaw<
          Array<{
            id: string;
            name: string;
            sku: string;
            quantity: number;
            minThreshold: number;
          }>
        >`
          SELECT id, name, sku, quantity, "minThreshold"
          FROM "InventoryItem"
          WHERE quantity <= "minThreshold"
            ${cursor ? Prisma.sql`AND id > ${cursor}` : Prisma.empty}
          ORDER BY id ASC
          LIMIT ${BATCH_SIZE}
        `;

        if (items.length === 0) break;
        cursor = items[items.length - 1].id;
        hasMore = items.length === BATCH_SIZE;
      } else {
        const fetched: Array<{
          id: string;
          name: string;
          sku: string;
          quantity: number;
          minThreshold: number;
        }> = await this.prisma.inventoryItem.findMany({
          take: BATCH_SIZE,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { id: 'asc' },
        });

        if (fetched.length === 0) break;
        cursor = fetched[fetched.length - 1].id;
        hasMore = fetched.length === BATCH_SIZE;
        items = fetched.filter((item) => item.quantity <= item.minThreshold);
      }

      totalScanned += items.length;

      for (const item of items) {
        if (item.quantity === 0) {
          const sent = await this.dispatchThrottledAlert(
            `alert:inventory:out_of_stock:${item.id}`,
            86400, // 24 hours cooldown
            {
              title: 'Item Out of Stock',
              message: `Item "${item.name}" (${item.sku}) is out of stock (0 units remaining).`,
              type: 'ALERT',
              link: '/inventory',
            },
          );
          if (sent) notified++;
          else throttled++;
        } else {
          const sent = await this.dispatchThrottledAlert(
            `alert:inventory:low_stock:${item.id}`,
            86400, // 24 hours cooldown
            {
              title: 'Low Stock Alert',
              message: `Item "${item.name}" (${item.sku}) is low on stock: ${item.quantity} units remaining (threshold: ${item.minThreshold}).`,
              type: 'WARNING',
              link: '/inventory',
            },
          );
          if (sent) notified++;
          else throttled++;
        }
      }

      if (!hasMore) break;
    }

    return { scanned: totalScanned, notified, throttled };
  }

  /**
   * Helper to dispatch an alert with Redis cache-based deduplication and throttling.
   */
  private async dispatchThrottledAlert(
    cacheKey: string,
    ttlSeconds: number,
    payload: {
      title: string;
      message: string;
      type: 'ALERT' | 'WARNING' | 'INFO';
      link?: string;
    },
  ): Promise<boolean> {
    if (this.redis) {
      try {
        const alreadySent = await this.redis.get<boolean>(cacheKey);
        if (alreadySent) {
          this.logger.debug(`Alert throttled for cacheKey: ${cacheKey}`);
          return false;
        }
        await this.redis.set(cacheKey, true, ttlSeconds);
      } catch (error: unknown) {
        this.logger.warn(
          `Redis throttling check failed for ${cacheKey}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    try {
      await this.notificationsService.notifyAdmins(payload);
      return true;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to dispatch alert',
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
