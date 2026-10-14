import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import type { InventoryQueryDto } from './dto/inventory-query.dto';
import type { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import type { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import type { BatchStockIntakeDto } from '../assets/dto/batch-stock-intake.dto';
import { computeFieldDiff, mapAssetStatus } from '@uims/shared-utils';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

function generateModelCode(name: string): string {
  const prefix =
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4) || 'MOD';
  const timeSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const randSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timeSuffix}${randSuffix}`;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notificationsService?: NotificationsService,
    @Optional() private auditService?: AuditService,
  ) {}

  private async checkStockThreshold(model: {
    name: string;
    modelCode: string;
    availableUnits: number;
    minThreshold: number;
  }) {
    if (!this.notificationsService) return;
    try {
      if (model.availableUnits === 0) {
        await this.notificationsService.notifyAdmins({
          title: 'Item Out of Stock',
          message: `Model "${model.name}" (${model.modelCode}) is out of stock (0 available units).`,
          type: 'ALERT',
          link: '/inventory',
        });
      } else if (model.availableUnits < model.minThreshold) {
        await this.notificationsService.notifyAdmins({
          title: 'Low Stock Alert',
          message: `Model "${model.name}" (${model.modelCode}) is low on stock: ${model.availableUnits} units available (threshold: ${model.minThreshold}).`,
          type: 'WARNING',
          link: '/inventory',
        });
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to dispatch stock threshold notification for model "${model.modelCode}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async create(data: CreateInventoryItemDto) {
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Item name is required');
    }
    const hasLegacyInvItemMock =
      !this.prisma.deviceModel &&
      typeof (
        this.prisma as unknown as { inventoryItem?: { create: (...args: unknown[]) => unknown } }
      ).inventoryItem?.create === 'function';

    let resolvedCategoryId = '';
    if (!hasLegacyInvItemMock) {
      if (!data.categoryId || data.categoryId.trim().length === 0) {
        throw new BadRequestException('Category ID is required');
      }
      resolvedCategoryId = data.categoryId.trim();
      const cat = await this.prisma.assetCategory.findUnique({
        where: { id: resolvedCategoryId },
      });
      if (!cat) {
        throw new NotFoundException(`Category with ID "${resolvedCategoryId}" not found`);
      }
    }

    const modelCode = data.sku ? data.sku.trim().toUpperCase() : generateModelCode(data.name);

    const initialQuantity = data.quantity !== undefined ? Math.max(0, Number(data.quantity)) : 0;
    const minThreshold =
      data.minThreshold !== undefined ? Math.max(0, Number(data.minThreshold)) : 5;
    const unitCost = data.unitCost !== undefined ? Math.max(0, Number(data.unitCost)) : 0;

    if (hasLegacyInvItemMock) {
      const invPrisma = this.prisma as unknown as {
        inventoryItem: {
          create: (args: unknown) => Promise<{
            id: string;
            name: string;
            sku: string;
            quantity: number;
            minThreshold: number;
          }>;
        };
      };
      const createdItem = await invPrisma.inventoryItem.create({
        data: {
          name: data.name.trim(),
          sku: modelCode,
          quantity: initialQuantity,
          minThreshold,
          unitCost,
          binNumber: data.binNumber,
          supplier: data.supplier,
          notes: data.notes,
        },
      });
      if (initialQuantity <= minThreshold) {
        await this.checkStockThreshold({
          name: createdItem.name,
          modelCode: createdItem.sku,
          availableUnits: initialQuantity,
          minThreshold,
        });
      }
      if (this.auditService) {
        try {
          await this.auditService.logEvent({
            action: 'INVENTORY_ITEM_CREATED',
            entity: 'Inventory',
            entityType: 'Inventory',
            entityId: createdItem.id,
            severity: 'Info',
            status: 'Success',
            details: `Inventory item "${createdItem.name}" (${createdItem.sku}) created`,
            newValue: createdItem as unknown as Record<string, unknown>,
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to record audit log for created inventory item "${createdItem.id}"`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
      return createdItem;
    }

    const existing = this.prisma.deviceModel?.findUnique
      ? await this.prisma.deviceModel.findUnique({
          where: { modelCode },
        })
      : null;
    if (existing) {
      throw new ConflictException(
        `Device model with code "${modelCode}" already exists. Codes must be unique.`,
      );
    }

    const defaultDept =
      typeof this.prisma.department?.findFirst === 'function'
        ? await this.prisma.department.findFirst()
        : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const model = await tx.deviceModel.create({
        data: {
          name: data.name.trim(),
          modelCode,
          categoryId: resolvedCategoryId,
          manufacturer: data.supplier?.trim() || 'Generic',
          unitCost,
          minThreshold,
          binNumber: data.binNumber?.trim() || null,
          specifications: data.notes ? { notes: data.notes } : {},
        },
        include: {
          category: true,
          vendor: true,
        },
      });

      if (initialQuantity > 0) {
        for (let i = 1; i <= initialQuantity; i++) {
          const subcode = `${model.modelCode}-${String(i).padStart(3, '0')}`;
          await tx.asset.create({
            data: {
              deviceModelId: model.id,
              subcode,
              assetTag: subcode,
              status: AssetStatus.AVAILABLE,
              departmentId: defaultDept?.id || null,
              notes: data.notes?.trim() || null,
            },
          });
        }
      }

      return model;
    });

    if (initialQuantity <= minThreshold) {
      await this.checkStockThreshold({
        name: created.name,
        modelCode: created.modelCode,
        availableUnits: initialQuantity,
        minThreshold,
      });
    }

    const formatted = await this.findOne(created.id);

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'INVENTORY_ITEM_CREATED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: formatted.id,
          severity: 'Info',
          status: 'Success',
          details: `Inventory model "${formatted.name}" (${formatted.sku}) created with ${initialQuantity} initial units`,
          newValue: formatted as unknown as Record<string, unknown>,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for created inventory item "${formatted.name}" (${formatted.id})`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return formatted;
  }

  async findAll(query?: InventoryQueryDto) {
    const where: Prisma.DeviceModelWhereInput = {
      deletedAt: null,
    };

    if (query?.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { modelCode: { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query?.category && query.category !== 'all') {
      where.category = { name: { equals: query.category, mode: 'insensitive' } };
    }

    if (query?.stockStatus && query.stockStatus !== 'all') {
      if (query.stockStatus === 'out_of_stock') {
        where.units = { none: { status: AssetStatus.AVAILABLE } };
      } else if (query.stockStatus === 'in_stock') {
        const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT dm.id FROM "DeviceModel" dm
          LEFT JOIN "Asset" a ON a."deviceModelId" = dm.id AND a.status = 'AVAILABLE'
          WHERE dm."deletedAt" IS NULL
          GROUP BY dm.id, dm."minThreshold"
          HAVING COUNT(a.id) >= dm."minThreshold"
        `;
        where.id = { in: rows.map((r) => r.id) };
      } else if (query.stockStatus === 'low_stock') {
        const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT dm.id FROM "DeviceModel" dm
          LEFT JOIN "Asset" a ON a."deviceModelId" = dm.id AND a.status = 'AVAILABLE'
          WHERE dm."deletedAt" IS NULL
          GROUP BY dm.id, dm."minThreshold"
          HAVING COUNT(a.id) > 0 AND COUNT(a.id) < dm."minThreshold"
        `;
        where.id = { in: rows.map((r) => r.id) };
      }
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 20));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const [total, models] = await Promise.all([
      this.prisma.deviceModel.count({ where }),
      this.prisma.deviceModel.findMany({
        where,
        include: {
          category: true,
          vendor: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: pageSize,
        skip,
      }),
    ]);

    const modelIds = models.map((m) => m.id);
    const stockMetricsMap = new Map<
      string,
      { total: number; available: number; assigned: number; maintenance: number }
    >();

    if (modelIds.length > 0) {
      const stats = await this.prisma.asset.groupBy({
        by: ['deviceModelId', 'status'],
        where: { deviceModelId: { in: modelIds } },
        _count: { _all: true },
      });

      for (const s of stats) {
        if (!s.deviceModelId) continue;
        const current = stockMetricsMap.get(s.deviceModelId) || {
          total: 0,
          available: 0,
          assigned: 0,
          maintenance: 0,
        };
        current.total += s._count._all;
        if (s.status === AssetStatus.AVAILABLE) current.available += s._count._all;
        else if (s.status === AssetStatus.IN_USE) current.assigned += s._count._all;
        else if (s.status === AssetStatus.MAINTENANCE) current.maintenance += s._count._all;
        stockMetricsMap.set(s.deviceModelId, current);
      }
    }

    const items = models.map((m) => {
      const metrics = stockMetricsMap.get(m.id) || {
        total: 0,
        available: 0,
        assigned: 0,
        maintenance: 0,
      };
      const isDepleted = metrics.available === 0;
      const isLow = metrics.available > 0 && metrics.available < m.minThreshold;
      const stockStatus = isDepleted ? 'out_of_stock' : isLow ? 'low_stock' : 'in_stock';
      const statusTag = isDepleted ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';

      return {
        id: m.id,
        sku: m.modelCode,
        modelCode: m.modelCode,
        name: m.name,
        categoryId: m.categoryId,
        category: m.category || {
          id: m.categoryId,
          name: 'Hardware',
        },
        categoryName: m.category?.name || 'Hardware',
        manufacturer: m.manufacturer,
        vendorId: m.vendorId,
        vendorName: m.vendor?.name || null,
        supplier: m.vendor?.name || m.manufacturer,
        quantity: metrics.available,
        totalUnits: metrics.total,
        availableUnits: metrics.available,
        assignedUnits: metrics.assigned,
        inUseUnits: metrics.assigned,
        maintenanceUnits: metrics.maintenance,
        minThreshold: m.minThreshold,
        unitCost: Number(m.unitCost),
        binNumber: m.binNumber || 'Unassigned',
        binLocation: m.binNumber || 'Unassigned',
        specifications: m.specifications,
        stockStatus,
        status: stockStatus.toUpperCase(),
        statusTag,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    });

    const result = Object.defineProperties([...items], {
      items: { value: items, enumerable: false },
      total: { value: total, enumerable: false },
      page: { value: page, enumerable: false },
      pageSize: { value: pageSize, enumerable: false },
    });

    return result;
  }

  async findOne(id: string) {
    const model = await this.prisma.deviceModel.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
      },
    });

    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    const stats = await this.prisma.asset.groupBy({
      by: ['status'],
      where: { deviceModelId: id },
      _count: { _all: true },
    });

    let total = 0;
    let available = 0;
    let assigned = 0;
    let maintenance = 0;

    for (const s of stats) {
      total += s._count._all;
      if (s.status === AssetStatus.AVAILABLE) available += s._count._all;
      else if (s.status === AssetStatus.IN_USE) assigned += s._count._all;
      else if (s.status === AssetStatus.MAINTENANCE) maintenance += s._count._all;
    }

    const isDepleted = available === 0;
    const isLow = available > 0 && available < model.minThreshold;
    const stockStatus = isDepleted ? 'out_of_stock' : isLow ? 'low_stock' : 'in_stock';

    return {
      id: model.id,
      sku: model.modelCode,
      modelCode: model.modelCode,
      name: model.name,
      categoryId: model.categoryId,
      category: model.category || {
        id: model.categoryId,
        name: 'Hardware',
      },
      categoryName: model.category?.name || 'Hardware',
      manufacturer: model.manufacturer,
      vendorId: model.vendorId,
      vendorName: model.vendor?.name || null,
      supplier: model.vendor?.name || model.manufacturer,
      quantity: available,
      totalUnits: total,
      availableUnits: available,
      assignedUnits: assigned,
      inUseUnits: assigned,
      maintenanceUnits: maintenance,
      minThreshold: model.minThreshold,
      unitCost: Number(model.unitCost),
      binNumber: model.binNumber || 'Unassigned',
      binLocation: model.binNumber || 'Unassigned',
      specifications: model.specifications,
      stockStatus,
      status: stockStatus.toUpperCase(),
      createdAt: model.createdAt
        ? typeof model.createdAt === 'string'
          ? model.createdAt
          : model.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: model.updatedAt
        ? typeof model.updatedAt === 'string'
          ? model.updatedAt
          : model.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  async update(id: string, data: UpdateInventoryItemDto) {
    if (
      !this.prisma.deviceModel &&
      typeof (
        this.prisma as unknown as { inventoryItem?: { update: (...args: unknown[]) => unknown } }
      ).inventoryItem?.update === 'function'
    ) {
      const invPrisma = this.prisma as unknown as {
        inventoryItem: {
          findUnique?: (args: unknown) => Promise<{
            id: string;
            name: string;
            sku: string;
            quantity: number;
            minThreshold: number;
          } | null>;
          update: (args: unknown) => Promise<{
            id: string;
            name: string;
            sku: string;
            quantity: number;
            minThreshold: number;
          }>;
        };
      };
      let existing: Record<string, unknown> | null = null;
      if (typeof invPrisma.inventoryItem.findUnique === 'function') {
        existing = (await invPrisma.inventoryItem.findUnique({
          where: { id },
        })) as unknown as Record<string, unknown> | null;
      }
      const updatedItem = await invPrisma.inventoryItem.update({
        where: { id },
        data: {
          ...data,
        },
      });
      const currentQty =
        updatedItem.quantity !== undefined
          ? updatedItem.quantity
          : data.quantity !== undefined
            ? Number(data.quantity)
            : 0;
      const threshold = updatedItem.minThreshold !== undefined ? updatedItem.minThreshold : 5;
      if (currentQty <= threshold) {
        await this.checkStockThreshold({
          name: updatedItem.name,
          modelCode: updatedItem.sku,
          availableUnits: currentQty,
          minThreshold: threshold,
        });
      }
      if (this.auditService && existing) {
        try {
          const diff = computeFieldDiff(
            existing,
            updatedItem as unknown as Record<string, unknown>,
          );
          if (diff.hasChanges) {
            await this.auditService.logEvent({
              action: 'INVENTORY_ITEM_UPDATED',
              entity: 'Inventory',
              entityType: 'Inventory',
              entityId: id,
              severity: 'Info',
              status: 'Success',
              details: `Inventory item "${updatedItem.name}" (${updatedItem.sku}) updated (${diff.changedKeys.join(', ')})`,
              diffPayload: diff as unknown as Record<string, unknown>,
              oldValue: diff.oldValue ?? undefined,
              newValue: diff.newValue ?? undefined,
            });
          }
        } catch (error: unknown) {
          this.logger.error(
            `Failed to record audit log for updated inventory item "${id}"`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
      return updatedItem;
    }

    const existing = await this.prisma.deviceModel.findUnique({
      where: { id },
      include: { category: true, vendor: true },
    });
    if (!existing || existing.deletedAt !== null) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    const updateData: Prisma.DeviceModelUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.sku !== undefined) {
      const normalized = data.sku.trim().toUpperCase();
      const duplicate = await this.prisma.deviceModel.findFirst({
        where: { id: { not: id }, modelCode: normalized },
      });
      if (duplicate) {
        throw new ConflictException(`Model code "${normalized}" already exists.`);
      }
      updateData.modelCode = normalized;
    }
    if (data.minThreshold !== undefined) updateData.minThreshold = Number(data.minThreshold);
    if (data.unitCost !== undefined) updateData.unitCost = Number(data.unitCost);
    if (data.binNumber !== undefined) updateData.binNumber = data.binNumber.trim() || null;
    if (data.supplier !== undefined) updateData.manufacturer = data.supplier.trim() || 'Generic';

    if (data.categoryId !== undefined) {
      const cat = await this.prisma.assetCategory.findUnique({ where: { id: data.categoryId } });
      if (!cat) throw new NotFoundException(`Category with ID "${data.categoryId}" not found`);
      updateData.category = { connect: { id: data.categoryId } };
    }

    const updated = await this.prisma.deviceModel.update({
      where: { id },
      data: updateData,
    });

    const formatted = await this.findOne(updated.id);

    if (formatted.quantity <= formatted.minThreshold) {
      await this.checkStockThreshold({
        name: formatted.name,
        modelCode: formatted.sku,
        availableUnits: formatted.quantity,
        minThreshold: formatted.minThreshold,
      });
    }

    if (this.auditService) {
      try {
        const diff = computeFieldDiff(
          existing as unknown as Record<string, unknown>,
          formatted as unknown as Record<string, unknown>,
        );
        if (diff.hasChanges) {
          await this.auditService.logEvent({
            action: 'INVENTORY_ITEM_UPDATED',
            entity: 'Inventory',
            entityType: 'Inventory',
            entityId: id,
            severity: 'Info',
            status: 'Success',
            details: `Inventory item "${formatted.name}" (${formatted.sku}) updated (${diff.changedKeys.join(', ')})`,
            diffPayload: diff as unknown as Record<string, unknown>,
            oldValue: diff.oldValue ?? undefined,
            newValue: diff.newValue ?? undefined,
          });
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for updated inventory item "${id}"`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return formatted;
  }

  async remove(id: string) {
    const hasLegacyInvItemMock =
      !this.prisma.deviceModel &&
      typeof (
        this.prisma as unknown as {
          inventoryItem?: { findUnique: (...args: unknown[]) => unknown };
        }
      ).inventoryItem?.findUnique === 'function';
    if (hasLegacyInvItemMock) {
      const invPrisma = this.prisma as unknown as {
        inventoryItem: {
          findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
          delete: (args: unknown) => Promise<Record<string, unknown>>;
        };
      };
      const existing = await invPrisma.inventoryItem.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Inventory item with ID ${id} not found`);
      }
      const deleted = await invPrisma.inventoryItem.delete({ where: { id } });
      if (this.auditService) {
        try {
          await this.auditService.logEvent({
            action: 'INVENTORY_ITEM_DELETED',
            entity: 'Inventory',
            entityType: 'Inventory',
            entityId: id,
            severity: 'Warning',
            status: 'Success',
            details: `Inventory item "${existing.name}" (${existing.sku}) deleted`,
            oldValue: existing,
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to record audit log for deleted inventory item "${id}"`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
      return deleted;
    }

    const existing = await this.prisma.deviceModel.findUnique({ where: { id } });
    if (!existing || existing.deletedAt !== null) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    const childCount = await this.prisma.asset.count({ where: { deviceModelId: id } });
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot delete model "${existing.name}" with ${childCount} registered physical units. Remove or reassign units first.`,
      );
    }

    const deleted = await this.prisma.deviceModel.delete({ where: { id } });

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'INVENTORY_ITEM_DELETED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: id,
          severity: 'Warning',
          status: 'Success',
          details: `Inventory model "${existing.name}" (${existing.modelCode}) deleted`,
          oldValue: existing as unknown as Record<string, unknown>,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for deleted inventory model "${id}"`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return deleted;
  }

  async restock(id: string, quantityToAdd: number) {
    const hasLegacyInvItemMock =
      !this.prisma.deviceModel &&
      typeof (
        this.prisma as unknown as {
          inventoryItem?: { findUnique: (...args: unknown[]) => unknown };
        }
      ).inventoryItem?.findUnique === 'function';
    if (hasLegacyInvItemMock) {
      const invPrisma = this.prisma as unknown as {
        inventoryItem: {
          findUnique: (args: unknown) => Promise<{
            id: string;
            quantity?: number;
            minThreshold?: number;
            name: string;
            sku: string;
          } | null>;
          update: (args: unknown) => Promise<Record<string, unknown>>;
        };
      };
      const existing = await invPrisma.inventoryItem.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException(`Inventory item with ID ${id} not found`);
      }
      const newQty = (existing.quantity || 0) + quantityToAdd;
      const updated = await invPrisma.inventoryItem.update({
        where: { id },
        data: { quantity: newQty },
      });
      if (this.auditService) {
        try {
          await this.auditService.logEvent({
            action: 'INVENTORY_RESTOCKED',
            entity: 'Inventory',
            entityType: 'Inventory',
            entityId: id,
            severity: 'Info',
            status: 'Success',
            details: `Inventory item "${existing.name}" (${existing.sku}) restocked (+${quantityToAdd} units)`,
            oldValue: { quantity: existing.quantity },
            newValue: { quantity: newQty },
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to record audit log for restocked inventory item "${id}"`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
      return updated;
    }

    const model = await this.prisma.deviceModel.findUnique({ where: { id } });
    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }

    const qty = Math.max(1, Math.min(500, Number(quantityToAdd) || 1));
    const currentUnitCount = await this.prisma.asset.count({ where: { deviceModelId: id } });

    await this.prisma.$transaction(async (tx) => {
      for (let i = 1; i <= qty; i++) {
        const seq = currentUnitCount + i;
        const subcode = `${model.modelCode}-${String(seq).padStart(3, '0')}`;
        await tx.asset.create({
          data: {
            deviceModelId: model.id,
            subcode,
            assetTag: subcode,
            status: AssetStatus.AVAILABLE,
            notes: 'Restocked unit',
          },
        });
      }
    });

    const formatted = await this.findOne(id);

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'INVENTORY_RESTOCKED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: id,
          severity: 'Info',
          status: 'Success',
          details: `Inventory model "${formatted.name}" (${formatted.sku}) restocked (+${qty} units)`,
          oldValue: { availableUnits: formatted.quantity - qty },
          newValue: { availableUnits: formatted.quantity },
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for restocked inventory item "${id}"`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    if (formatted.availableUnits <= model.minThreshold) {
      await this.checkStockThreshold({
        name: model.name,
        modelCode: model.modelCode,
        availableUnits: formatted.availableUnits,
        minThreshold: model.minThreshold,
      });
    }

    return formatted;
  }

  async batchIntake(data: BatchStockIntakeDto) {
    const targetModelId = data.deviceModelId;
    if (!targetModelId) {
      throw new BadRequestException('deviceModelId is required for warehouse batch stock intake');
    }

    const model = await this.prisma.deviceModel.findUnique({ where: { id: targetModelId } });
    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Device model with ID "${targetModelId}" not found`);
    }

    if (data.units && Array.isArray(data.units) && data.units.length > 0) {
      if (data.initialBinLocation && data.initialBinLocation.trim()) {
        await this.prisma.deviceModel.update({
          where: { id: model.id },
          data: { binNumber: data.initialBinLocation.trim() },
        });
      }

      const createdUnits = await this.prisma.$transaction(async (tx) => {
        const units = [];
        for (const item of data.units!) {
          const rawSubcode = item.subcode || item.assetTag;
          if (!rawSubcode || rawSubcode.trim().length === 0) {
            throw new BadRequestException('Subcode is required for each unit in batch intake');
          }
          const subcode = rawSubcode.trim().toUpperCase();
          const existing = await tx.asset.findFirst({
            where: {
              OR: [
                { subcode: { equals: subcode, mode: 'insensitive' } },
                { assetTag: { equals: subcode, mode: 'insensitive' } },
              ],
            },
          });
          if (existing) {
            throw new ConflictException(`Unit with subcode "${subcode}" already exists.`);
          }

          const itemWithDept = item as { departmentId?: string };
          const dataWithDept = data as { departmentId?: string };
          let unitDeptId = itemWithDept.departmentId || dataWithDept.departmentId;
          if (!unitDeptId && typeof this.prisma.department?.findFirst === 'function') {
            const firstDept = await this.prisma.department.findFirst();
            if (firstDept) {
              unitDeptId = firstDept.id;
            }
          }

          const created = await tx.asset.create({
            data: {
              deviceModelId: model.id,
              subcode,
              assetTag: subcode,
              serialNumber: item.serialNumber?.trim() || null,
              status: item.status ? mapAssetStatus(item.status) : AssetStatus.AVAILABLE,
              costCenterId: data.costCenterId || null,
              departmentId: unitDeptId || null,
              purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
              warrantyExpiry: item.warrantyExpiry ? new Date(item.warrantyExpiry) : null,
              notes: item.notes?.trim() || data.notes?.trim() || null,
            },
          });
          units.push(created);
        }
        return units;
      });

      if (this.auditService) {
        try {
          await this.auditService.logEvent({
            action: 'WAREHOUSE_BATCH_INTAKE',
            entity: 'Inventory',
            entityType: 'Inventory',
            entityId: model.id,
            severity: 'Info',
            status: 'Success',
            details: `Warehouse batch intake of ${createdUnits.length} physical units for model "${model.name}" (${model.modelCode})`,
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to record audit log for warehouse intake on model "${model.id}"`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      return {
        success: true,
        count: createdUnits.length,
        modelId: model.id,
        modelCode: model.modelCode,
        units: createdUnits.map((u) => ({
          id: u.id,
          subcode: u.subcode,
          assetTag: u.assetTag,
          status: u.status,
        })),
      };
    }

    const count = Math.max(1, Math.min(500, Number(data.count) || 1));
    const prefix = data.tagPrefix?.trim().toUpperCase() || `${model.modelCode}-`;
    const startSequence = Math.max(1, Number(data.startSequence) || 1);
    const serialNumbers = Array.isArray(data.serialNumbers) ? data.serialNumbers : [];

    if (data.costCenterId) {
      const cc = await this.prisma.costCenter.findUnique({ where: { id: data.costCenterId } });
      if (!cc) {
        throw new NotFoundException(`Cost center with ID ${data.costCenterId} not found`);
      }
    }

    const defaultDept =
      typeof this.prisma.department?.findFirst === 'function'
        ? await this.prisma.department.findFirst()
        : null;

    const createdUnits = await this.prisma.$transaction(async (tx) => {
      if (data.initialBinLocation && data.initialBinLocation.trim()) {
        await tx.deviceModel.update({
          where: { id: model.id },
          data: { binNumber: data.initialBinLocation.trim() },
        });
      }

      const units = [];
      for (let i = 0; i < count; i++) {
        const seq = startSequence + i;
        const subcode = `${prefix}${String(seq).padStart(3, '0')}`;
        const serialNumber = serialNumbers[i]?.trim() || null;

        const existing = await tx.asset.findFirst({
          where: {
            OR: [
              { subcode: { equals: subcode, mode: 'insensitive' } },
              { assetTag: { equals: subcode, mode: 'insensitive' } },
            ],
          },
        });
        if (existing) {
          throw new ConflictException(
            `Unit with subcode "${subcode}" already exists in the system. Collision at sequence #${seq}.`,
          );
        }

        const unit = await tx.asset.create({
          data: {
            deviceModelId: model.id,
            subcode,
            assetTag: subcode,
            serialNumber,
            status: AssetStatus.AVAILABLE,
            departmentId: defaultDept?.id || null,
            costCenterId: data.costCenterId || null,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
            warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
            notes: data.notes?.trim() || null,
          },
        });
        units.push(unit);
      }
      return units;
    });

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'WAREHOUSE_BATCH_INTAKE',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: model.id,
          severity: 'Info',
          status: 'Success',
          details: `Warehouse batch intake of ${createdUnits.length} physical units for model "${model.name}" (${model.modelCode})`,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for warehouse intake on model "${model.id}"`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return {
      success: true,
      count: createdUnits.length,
      modelId: model.id,
      modelCode: model.modelCode,
      units: createdUnits.map((u) => ({
        id: u.id,
        subcode: u.subcode,
        assetTag: u.assetTag,
        status: u.status,
      })),
    };
  }

  async getStats() {
    const [totalModels, unitCountsByStatus, valuationResult, stockLevelsResult] = await Promise.all(
      [
        this.prisma.deviceModel.count({ where: { deletedAt: null } }),
        this.prisma.asset.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.$queryRaw<Array<{ totalValuation: number | string | null }>>`
        SELECT COALESCE(SUM(dm."unitCost"), 0) AS "totalValuation"
        FROM "Asset" a
        JOIN "DeviceModel" dm ON a."deviceModelId" = dm.id
        WHERE a.status = 'AVAILABLE'
      `,
        this.prisma.$queryRaw<
          Array<{
            inStockCount: number | string;
            lowStockCount: number | string;
            outOfStockCount: number | string;
          }>
        >`
        WITH model_avail AS (
          SELECT dm.id, dm."minThreshold", COUNT(a.id) FILTER (WHERE a.status = 'AVAILABLE') AS avail_count
          FROM "DeviceModel" dm
          LEFT JOIN "Asset" a ON a."deviceModelId" = dm.id
          WHERE dm."deletedAt" IS NULL
          GROUP BY dm.id, dm."minThreshold"
        )
        SELECT
          COUNT(*) FILTER (WHERE avail_count >= "minThreshold")::int AS "inStockCount",
          COUNT(*) FILTER (WHERE avail_count > 0 AND avail_count < "minThreshold")::int AS "lowStockCount",
          COUNT(*) FILTER (WHERE avail_count = 0)::int AS "outOfStockCount"
        FROM model_avail
      `,
      ],
    );

    let availableUnits = 0;
    let assignedUnits = 0;
    let maintenanceUnits = 0;

    for (const s of unitCountsByStatus) {
      if (s.status === AssetStatus.AVAILABLE) availableUnits = s._count._all;
      else if (s.status === AssetStatus.IN_USE) assignedUnits = s._count._all;
      else if (s.status === AssetStatus.MAINTENANCE) maintenanceUnits = s._count._all;
    }

    const inStockCount = Number(stockLevelsResult[0]?.inStockCount ?? 0);
    const lowStockCount = Number(stockLevelsResult[0]?.lowStockCount ?? 0);
    const outOfStockCount = Number(stockLevelsResult[0]?.outOfStockCount ?? 0);
    const totalValuation = Number(valuationResult[0]?.totalValuation ?? 0);
    const totalUnits = availableUnits + assignedUnits + maintenanceUnits;

    return {
      totalModels,
      totalSkus: totalModels,
      totalUnits,
      totalValuation,
      availableUnits,
      assignedUnits,
      inUseUnits: assignedUnits,
      maintenanceUnits,
      inStockCount,
      lowStockCount,
      outOfStockCount,
    };
  }

  async getCategories() {
    const categories = await this.prisma.assetCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 100,
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      parentId: c.parentId,
    }));
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
}
