import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateInventoryItemDto,
  InventoryQueryDto,
  InventoryStatsDto,
  UpdateInventoryItemDto,
} from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveDescendantLocationIds } from '../organization/location-tree.util';

function generateSku(): string {
  const timeSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SKU-${timeSuffix}${randSuffix}`;
}

function formatInventoryItem<T extends { quantity: number; minThreshold: number }>(item: T) {
  const isDepleted = item.quantity === 0;
  const isLow = item.quantity > 0 && item.quantity <= item.minThreshold;
  const status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = isDepleted
    ? 'OUT_OF_STOCK'
    : isLow
      ? 'LOW_STOCK'
      : 'IN_STOCK';
  const statusTag: 'In Stock' | 'Low Stock' | 'Out of Stock' = isDepleted
    ? 'Out of Stock'
    : isLow
      ? 'Low Stock'
      : 'In Stock';
  return {
    ...item,
    status,
    statusTag,
  };
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notificationsService?: NotificationsService,
  ) {}

  private async checkStockThreshold(item: {
    name: string;
    sku: string;
    quantity: number;
    minThreshold: number;
  }) {
    if (!this.notificationsService) return;
    try {
      if (item.quantity === 0) {
        await this.notificationsService.notifyAdmins({
          title: 'Item Out of Stock',
          message: `Item "${item.name}" (${item.sku}) is out of stock (0 units remaining).`,
          type: 'ALERT',
          link: '/inventory',
        });
      } else if (item.quantity <= item.minThreshold) {
        await this.notificationsService.notifyAdmins({
          title: 'Low Stock Alert',
          message: `Item "${item.name}" (${item.sku}) is low on stock: ${item.quantity} units remaining (threshold: ${item.minThreshold}).`,
          type: 'WARNING',
          link: '/inventory',
        });
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to dispatch stock threshold notification for SKU "${item.sku}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async create(data: CreateInventoryItemDto) {
    let categoryId = data.categoryId;
    if (!categoryId && data.category && this.prisma.inventoryCategory) {
      const cat = await this.prisma.inventoryCategory.findFirst({ where: { name: data.category } });
      if (cat) categoryId = cat.id;
    }
    if (!categoryId && this.prisma.inventoryCategory) {
      const defaultCat = await this.prisma.inventoryCategory.findFirst();
      if (defaultCat) categoryId = defaultCat.id;
    }
    if (!categoryId && this.prisma.inventoryCategory) {
      const createdCat = await this.prisma.inventoryCategory.create({
        data: { name: data.category || 'General Supplies' },
      });
      if (createdCat) categoryId = createdCat.id;
    }

    let locationId = data.locationId;
    if (!locationId && data.location && this.prisma.location) {
      const loc = await this.prisma.location.findFirst({ where: { name: data.location } });
      if (loc) locationId = loc.id;
    }

    const item = await this.prisma.inventoryItem.create({
      data: {
        sku: data.sku || generateSku(),
        name: data.name,
        categoryId,
        quantity: data.quantity !== undefined ? Number(data.quantity) : 10,
        minThreshold: data.minThreshold !== undefined ? Number(data.minThreshold) : 5,
        unitCost: data.unitCost !== undefined ? Number(data.unitCost) : 0,
        locationId,
        binNumber: data.binNumber || 'Unassigned',
        supplier: data.supplier || 'Direct Order',
        notes: data.notes || '',
      },
      include: {
        category: true,
        location: true,
      },
    });

    if (item.quantity <= item.minThreshold) {
      await this.checkStockThreshold(item);
    }

    return formatInventoryItem(item);
  }

  async findAll(query?: InventoryQueryDto) {
    const where: Prisma.InventoryItemWhereInput = {};

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { location: { name: { contains: query.search, mode: 'insensitive' } } },
        { supplier: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query?.category && query.category !== 'all') {
      where.category = { name: query.category };
    }

    if (query?.locationId) {
      const descendantIds = await this.getDescendantLocationIds(query.locationId);
      where.locationId = { in: descendantIds };
    } else if (query?.location && query.location !== 'all') {
      where.location = { name: query.location };
    }

    if (query?.organizationId && query.organizationId !== 'all') {
      where.location = { organizationId: query.organizationId };
    } else if (query?.organization && query.organization !== 'all') {
      where.location = {
        organization: { name: { contains: query.organization, mode: 'insensitive' } },
      };
    }

    if (query?.stockStatus && query.stockStatus !== 'all') {
      if (query.stockStatus === 'in_stock') {
        where.quantity = { gt: 0 };
      } else if (query.stockStatus === 'low_stock') {
        where.quantity = { gt: 0, lte: 5 };
      } else if (query.stockStatus === 'out_of_stock') {
        where.quantity = 0;
      }
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        category: true,
        location: {
          include: { organization: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return items.map((item) => formatInventoryItem(item));
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
      },
    });
    if (!item) throw new NotFoundException(`Inventory item with ID ${id} not found`);
    return formatInventoryItem(item);
  }

  async update(id: string, data: UpdateInventoryItemDto) {
    const updateData: Prisma.InventoryItemUpdateInput = {};
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
    if (data.minThreshold !== undefined) updateData.minThreshold = Number(data.minThreshold);
    if (data.unitCost !== undefined) updateData.unitCost = Number(data.unitCost);
    if (data.binNumber !== undefined) updateData.binNumber = data.binNumber;
    if (data.supplier !== undefined) updateData.supplier = data.supplier;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.categoryId !== undefined) {
      updateData.category = { connect: { id: data.categoryId } };
    } else if (data.category) {
      const cat = await this.prisma.inventoryCategory.findFirst({ where: { name: data.category } });
      if (cat) updateData.category = { connect: { id: cat.id } };
    }

    if (data.locationId !== undefined) {
      updateData.location = data.locationId
        ? { connect: { id: data.locationId } }
        : { disconnect: true };
    } else if (data.location) {
      const loc = await this.prisma.location.findFirst({ where: { name: data.location } });
      if (loc) updateData.location = { connect: { id: loc.id } };
    }

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        location: true,
      },
    });

    if (item.quantity <= item.minThreshold) {
      await this.checkStockThreshold(item);
    }

    return formatInventoryItem(item);
  }

  async remove(id: string) {
    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  async restock(id: string, quantityToAdd: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Inventory item with ID ${id} not found`);

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        quantity: { increment: Number(quantityToAdd) },
      },
      include: {
        category: true,
        location: true,
      },
    });

    if (updated.quantity <= updated.minThreshold) {
      await this.checkStockThreshold(updated);
    }

    return formatInventoryItem(updated);
  }

  async getStats(): Promise<InventoryStatsDto> {
    const [totalSkus, sumUnits, lowStockCount, outOfStockCount, valuationResult] =
      await Promise.all([
        this.prisma.inventoryItem.count(),
        this.prisma.inventoryItem.aggregate({ _sum: { quantity: true } }),
        this.prisma.inventoryItem.count({ where: { quantity: { gt: 0, lte: 5 } } }),
        this.prisma.inventoryItem.count({ where: { quantity: 0 } }),
        this.prisma.$queryRaw<
          Array<{ totalValuation: number | string | null }>
        >`SELECT COALESCE(SUM(quantity * "unitCost"), 0) AS "totalValuation" FROM "InventoryItem"`,
      ]);

    const totalValuation = Number(valuationResult[0]?.totalValuation ?? 0);

    return {
      totalSkus,
      totalUnits: sumUnits._sum.quantity || 0,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    };
  }

  async getCategories() {
    return this.prisma.inventoryCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }

  async findAllVendors() {
    const vendors = await this.prisma.vendor.findMany({
      take: 100,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return vendors.map((v) => ({
      id: v.id,
      name: v.name,
      contactName: null,
      contactEmail: v.contactEmail,
      contactPhone: v.contactPhone,
      website: v.website,
      notes: v.notes,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));
  }

  async findOneVendor(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${id}" not found`);
    }
    return {
      id: vendor.id,
      name: vendor.name,
      contactName: null,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
      website: vendor.website,
      notes: vendor.notes,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }

  async getDescendantLocationIds(locationId: string): Promise<string[]> {
    return resolveDescendantLocationIds(this.prisma, locationId);
  }
}
