import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateInventoryItemDto,
  InventoryQueryDto,
  InventoryStatsDto,
  UpdateInventoryItemDto,
} from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

function generateSku(): string {
  const timeSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SKU-${timeSuffix}${randSuffix}`;
}

@Injectable()
export class InventoryService {
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
          message: `Inventory SKU ${item.sku} (${item.name}) is completely depleted (0 units remaining).`,
          type: 'ALERT',
          link: '/inventory',
        });
      } else if (item.quantity <= item.minThreshold) {
        await this.notificationsService.notifyAdmins({
          title: 'Low Stock Alert',
          message: `Inventory SKU ${item.sku} (${item.name}) is running low: ${item.quantity} units left (Threshold: ${item.minThreshold}).`,
          type: 'WARNING',
          link: '/inventory',
        });
      }
    } catch {
      // Non-blocking notification dispatch
    }
  }

  async create(data: CreateInventoryItemDto) {
    const item = await this.prisma.inventoryItem.create({
      data: {
        sku: data.sku || generateSku(),
        name: data.name,
        category: data.category || 'Cables & Adapters',
        quantity: data.quantity !== undefined ? Number(data.quantity) : 10,
        minThreshold: data.minThreshold !== undefined ? Number(data.minThreshold) : 5,
        unitCost: data.unitCost !== undefined ? Number(data.unitCost) : 0,
        location: data.location || 'Storage Room A',
        binNumber: data.binNumber || 'Unassigned',
        supplier: data.supplier || 'Direct Order',
        notes: data.notes || '',
      },
    });

    if (item.quantity <= item.minThreshold) {
      await this.checkStockThreshold(item);
    }

    return item;
  }

  async findAll(query?: InventoryQueryDto) {
    const where: Prisma.InventoryItemWhereInput = {};

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        { supplier: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.category && query.category !== 'all') {
      where.category = query.category;
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

    return this.prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  async update(id: string, data: UpdateInventoryItemDto) {
    const updateData: Prisma.InventoryItemUpdateInput = {};
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.quantity !== undefined) updateData.quantity = Number(data.quantity);
    if (data.minThreshold !== undefined) updateData.minThreshold = Number(data.minThreshold);
    if (data.unitCost !== undefined) updateData.unitCost = Number(data.unitCost);
    if (data.location !== undefined) updateData.location = data.location;
    if (data.binNumber !== undefined) updateData.binNumber = data.binNumber;
    if (data.supplier !== undefined) updateData.supplier = data.supplier;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    });

    if (item.quantity <= item.minThreshold) {
      await this.checkStockThreshold(item);
    }

    return item;
  }

  async remove(id: string) {
    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  async restock(id: string, quantityToAdd: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        quantity: { increment: Number(quantityToAdd) },
      },
    });

    return updated;
  }

  async getStats(): Promise<InventoryStatsDto> {
    const [totalSkus, sumUnits, lowStockCount, outOfStockCount, items] = await Promise.all([
      this.prisma.inventoryItem.count(),
      this.prisma.inventoryItem.aggregate({ _sum: { quantity: true } }),
      this.prisma.inventoryItem.count({ where: { quantity: { gt: 0, lte: 5 } } }),
      this.prisma.inventoryItem.count({ where: { quantity: 0 } }),
      this.prisma.inventoryItem.findMany({ select: { quantity: true, unitCost: true } }),
    ]);

    const totalValuation = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    return {
      totalSkus,
      totalUnits: sumUnits._sum.quantity || 0,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    };
  }
}
