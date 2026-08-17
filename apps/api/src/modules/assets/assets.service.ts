import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AssetQueryDto,
  AssetStatsDto,
  CreateAssetDto,
  UpdateAssetDto,
} from '@uims/shared-types';
import { mapAssetStatus, mapAssetStatusToLabel } from '@uims/shared-utils';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    category: true;
    assignedTo: true;
    location: true;
  };
}>;

function generateAssetTag(): string {
  const timeSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AST-${timeSuffix}${randSuffix}`;
}

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    @Optional() private notificationsService?: NotificationsService,
  ) {}

  private async resolveCategoryId(
    tx: Prisma.TransactionClient,
    categoryId?: string,
    categoryName?: string,
  ): Promise<string | undefined> {
    if (categoryId) return categoryId;
    if (!categoryName) return undefined;
    const cat = await tx.assetCategory.findFirst({ where: { name: categoryName } });
    if (cat) return cat.id;
    const newCat = await tx.assetCategory.create({ data: { name: categoryName } });
    return newCat.id;
  }

  private async resolveLocationId(
    tx: Prisma.TransactionClient,
    locationId?: string,
    locationName?: string,
  ): Promise<string | undefined> {
    if (locationId) return locationId;
    if (!locationName) return undefined;
    const loc = await tx.location.findFirst({ where: { name: locationName } });
    if (loc) return loc.id;
    const newLoc = await tx.location.create({ data: { name: locationName } });
    return newLoc.id;
  }

  async create(data: CreateAssetDto) {
    const status = mapAssetStatus(data.status);

    const formatted = await this.prisma.$transaction(async (tx) => {
      const categoryId = await this.resolveCategoryId(tx, data.categoryId, data.category);
      const locationId = await this.resolveLocationId(tx, data.locationId, data.location);

      const purchaseCost =
        data.purchasePrice !== undefined
          ? Number(data.purchasePrice)
          : data.purchaseCost !== undefined
            ? Number(data.purchaseCost)
            : 0;

      const created = await tx.asset.create({
        data: {
          assetTag: data.assetTag || data.tag || generateAssetTag(),
          name: data.name,
          manufacturer: data.manufacturer,
          model: data.model,
          serialNumber: data.serialNumber,
          status,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          purchaseCost,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          categoryId,
          locationId,
          assignedToId: data.assignedToId || null,
          specs: (data.specs as Prisma.InputJsonValue) || {},
          notes: data.notes || '',
        },
        include: {
          category: true,
          assignedTo: true,
          location: true,
        },
      });

      return this.formatAsset(created);
    });

    if (data.assignedToId && this.notificationsService) {
      try {
        await this.notificationsService.notifyUser(data.assignedToId, {
          title: 'Hardware Asset Assigned',
          message: `Asset "${formatted.name}" (Tag: ${formatted.tag}) has been assigned to your corporate profile.`,
          type: 'INFO',
          link: '/assets',
        });
      } catch {
        // Non-blocking
      }
    }

    return formatted;
  }

  async findAll(query?: AssetQueryDto) {
    const where: Prisma.AssetWhereInput = {};

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { assetTag: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { manufacturer: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.category && query.category !== 'all') {
      where.category = { name: query.category };
    }

    if (query?.status && query.status !== 'all') {
      where.status = mapAssetStatus(query.status);
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const assets = await this.prisma.asset.findMany({
      where,
      include: {
        category: true,
        assignedTo: true,
        location: true,
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
    });

    return assets.map((a) => this.formatAsset(a));
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        assignedTo: true,
        location: true,
      },
    });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return this.formatAsset(asset);
  }

  private assignScalarFields(data: UpdateAssetDto, updateData: Prisma.AssetUpdateInput) {
    if (data.name !== undefined) updateData.name = data.name;
    if (data.tag !== undefined || data.assetTag !== undefined) {
      updateData.assetTag = data.tag || data.assetTag;
    }
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.specs) updateData.specs = data.specs as Prisma.InputJsonValue;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status) updateData.status = mapAssetStatus(data.status);
    if (data.assignedToId !== undefined) {
      updateData.assignedTo = data.assignedToId
        ? { connect: { id: data.assignedToId } }
        : { disconnect: true };
    }
  }

  private assignFinancialFields(data: UpdateAssetDto, updateData: Prisma.AssetUpdateInput) {
    if (data.purchasePrice !== undefined) updateData.purchaseCost = Number(data.purchasePrice);
    if (data.purchaseCost !== undefined) updateData.purchaseCost = Number(data.purchaseCost);
    if (data.purchaseDate) updateData.purchaseDate = new Date(data.purchaseDate);
    if (data.warrantyExpiry) updateData.warrantyExpiry = new Date(data.warrantyExpiry);
  }

  private async buildAssetUpdateData(data: UpdateAssetDto): Promise<Prisma.AssetUpdateInput> {
    const updateData: Prisma.AssetUpdateInput = {};
    this.assignScalarFields(data, updateData);
    this.assignFinancialFields(data, updateData);

    if (data.category) {
      const cat = await this.prisma.assetCategory.findFirst({ where: { name: data.category } });
      if (cat) updateData.category = { connect: { id: cat.id } };
    }

    if (data.location) {
      const loc = await this.prisma.location.findFirst({ where: { name: data.location } });
      if (loc) updateData.location = { connect: { id: loc.id } };
    }

    return updateData;
  }

  async update(id: string, data: UpdateAssetDto) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Asset ${id} not found`);

    const updateData = await this.buildAssetUpdateData(data);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.asset.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          assignedTo: true,
          location: true,
        },
      });

      if (data.status || data.assignedToId !== undefined) {
        await tx.assetHistory.create({
          data: {
            assetId: id,
            action: data.status ? `STATUS_CHANGE_TO_${data.status}` : 'ASSIGNMENT_UPDATE',
            changedBy: 'System/Admin',
            oldValue: { status: existing.status, assignedToId: existing.assignedToId },
            newValue: { status: result.status, assignedToId: result.assignedToId },
          },
        });
      }

      return result;
    });

    const formatted = this.formatAsset(updated);

    // Business event triggers
    if (this.notificationsService) {
      try {
        // 1. Assignment change notification
        if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
          await this.notificationsService.notifyUser(data.assignedToId, {
            title: 'Hardware Asset Assigned',
            message: `Asset "${formatted.name}" (Tag: ${formatted.tag}) has been assigned to your corporate profile.`,
            type: 'INFO',
            link: '/assets',
          });
        }
        // 2. Critical status change notification
        if (
          data.status &&
          (updated.status === 'MAINTENANCE' || updated.status === 'LOST') &&
          existing.status !== updated.status
        ) {
          await this.notificationsService.notifyAdmins({
            title: `Asset Alert: ${formatted.name}`,
            message: `Hardware asset ${formatted.name} (${formatted.tag}) has been marked as ${formatted.status}.`,
            type: 'ALERT',
            link: '/assets',
          });
        }
      } catch {
        // Non-blocking
      }
    }

    return formatted;
  }

  async remove(id: string) {
    return this.prisma.asset.delete({ where: { id } });
  }

  async getStats(): Promise<AssetStatsDto> {
    const [total, inUse, maintenance, available, retired] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'IN_USE' } }),
      this.prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.asset.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.asset.count({ where: { status: 'RETIRED' } }),
    ]);

    return {
      total,
      active: inUse,
      inRepair: maintenance,
      inStorage: available,
      retired,
    };
  }

  private formatAsset(asset: AssetWithRelations) {
    const statusLabel = mapAssetStatusToLabel(asset.status);

    const defaultSpecs = {
      cpu: 'N/A',
      ram: 'N/A',
      storage: 'N/A',
      os: 'N/A',
    };

    return {
      id: asset.id,
      tag: asset.assetTag,
      name: asset.name,
      manufacturer: asset.manufacturer || 'Generic',
      model: asset.model || 'Standard',
      serialNumber: asset.serialNumber || 'N/A',
      category: asset.category?.name || 'Laptop',
      status: statusLabel,
      assignedTo: asset.assignedTo
        ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`.trim()
        : 'Unassigned',
      assignedEmail: asset.assignedTo?.email || '',
      location: asset.location?.name || 'Storage Vault',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
      purchasePrice: asset.purchaseCost || 0,
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : '',
      specs: {
        ...defaultSpecs,
        ...(typeof asset.specs === 'object' && asset.specs ? asset.specs : {}),
      },
      notes: asset.notes || '',
    };
  }
}
