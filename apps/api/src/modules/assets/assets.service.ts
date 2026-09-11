import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import type {
  AssetQueryDto,
  AssetStatsDto,
  CreateAssetDto,
  UpdateAssetDto,
} from '@uims/shared-types';
import { mapAssetStatus, mapAssetStatusToLabel } from '@uims/shared-utils';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveDescendantLocationIds } from '../organization/location-tree.util';

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    category: true;
    assignedTo: { include: { organization: true } };
    location: { include: { organization: true } };
    department: { include: { organization: true } };
    credential: true;
  };
}>;

function generateAssetTag(): string {
  const timeSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AST-${timeSuffix}${randSuffix}`;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notificationsService?: NotificationsService,
  ) {}

  private async resolveCategoryId(
    tx: Prisma.TransactionClient,
    categoryId?: string,
    categoryName?: string,
  ): Promise<string | undefined> {
    if (categoryId) {
      const cat = await tx.assetCategory.findUnique({ where: { id: categoryId } });
      if (!cat) {
        throw new NotFoundException(`Asset category with ID "${categoryId}" not found`);
      }
      return cat.id;
    }
    if (categoryName && categoryName !== 'all') {
      const cat = await tx.assetCategory.findFirst({ where: { name: categoryName } });
      if (!cat) {
        throw new BadRequestException(
          `Asset category "${categoryName}" does not exist. Please select an existing category.`,
        );
      }
      return cat.id;
    }
    return undefined;
  }

  private async resolveLocationId(
    tx: Prisma.TransactionClient,
    locationId?: string,
    locationName?: string,
  ): Promise<string | undefined> {
    if (locationId) {
      const loc = await tx.location.findUnique({ where: { id: locationId } });
      if (!loc) {
        throw new NotFoundException(`Location with ID "${locationId}" not found`);
      }
      return loc.id;
    }
    if (locationName && locationName !== 'all') {
      const loc = await tx.location.findFirst({ where: { name: locationName } });
      if (!loc) {
        throw new BadRequestException(
          `Location "${locationName}" does not exist. Please select an existing location.`,
        );
      }
      return loc.id;
    }
    return undefined;
  }

  async create(data: CreateAssetDto) {
    let status: AssetStatus;
    if (data.status) {
      status = mapAssetStatus(data.status);
    } else if (data.assignedToId) {
      status = AssetStatus.IN_USE;
    } else {
      status = AssetStatus.AVAILABLE;
    }

    const formatted = await this.prisma.$transaction(async (tx) => {
      const categoryId = await this.resolveCategoryId(tx, data.categoryId, data.category);
      const locationId = await this.resolveLocationId(tx, data.locationId, data.location);

      if (data.assignedToId) {
        const user = await tx.directoryUser.findUnique({ where: { id: data.assignedToId } });
        if (!user) {
          throw new NotFoundException(`Directory user with ID "${data.assignedToId}" not found`);
        }
      }

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
          description: data.description || null,
          status,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          purchaseCost,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          categoryId,
          locationId,
          departmentId: data.departmentId || null,
          credentialId: data.credentialId || null,
          assignedToId: data.assignedToId || null,
          specs: (data.specs as Prisma.InputJsonValue) || {},
          notes: data.notes || '',
        },
        include: {
          category: true,
          assignedTo: { include: { organization: true } },
          location: { include: { organization: true } },
          department: { include: { organization: true } },
          credential: true,
        },
      });

      if (tx.assetHistory) {
        await tx.assetHistory.create({
          data: {
            assetId: created.id,
            action: data.assignedToId ? 'ASSET_CREATED_AND_ASSIGNED' : 'ASSET_CREATED',
            changedBy: 'System/Admin',
            oldValue: Prisma.JsonNull,
            newValue: {
              status: created.status,
              assignedToId: created.assignedToId,
              categoryId: created.categoryId,
              locationId: created.locationId,
            },
          },
        });
      }

      return this.formatAsset(created);
    });

    if (data.assignedToId && this.notificationsService) {
      try {
        await this.notificationsService.notifyUser(data.assignedToId, {
          title: 'Asset Assigned',
          message: `Asset "${formatted.name}" (Tag: ${formatted.tag}) has been assigned to you.`,
          type: 'INFO',
          link: '/assets',
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch asset assignment notification for asset "${formatted.name}" (${formatted.tag})`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return formatted;
  }

  async findAll(query?: AssetQueryDto) {
    const where: Prisma.AssetWhereInput = {};
    const andConditions: Prisma.AssetWhereInput[] = [];

    if (query?.search) {
      andConditions.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { assetTag: { contains: query.search, mode: 'insensitive' } },
          { serialNumber: { contains: query.search, mode: 'insensitive' } },
          { model: { contains: query.search, mode: 'insensitive' } },
          { manufacturer: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query?.organizationId && query.organizationId !== 'all') {
      andConditions.push({
        OR: [
          { department: { organizationId: query.organizationId } },
          { location: { organizationId: query.organizationId } },
          { assignedTo: { organizationId: query.organizationId } },
        ],
      });
    } else if (query?.organization && query.organization !== 'all') {
      andConditions.push({
        OR: [
          {
            department: {
              organization: { name: { contains: query.organization, mode: 'insensitive' } },
            },
          },
          {
            location: {
              organization: { name: { contains: query.organization, mode: 'insensitive' } },
            },
          },
          {
            assignedTo: {
              organization: { name: { contains: query.organization, mode: 'insensitive' } },
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    } else if (query?.category && query.category !== 'all') {
      where.category = { name: query.category };
    }

    if (query?.locationId) {
      const descendantIds = await this.getDescendantLocationIds(query.locationId);
      where.locationId = { in: descendantIds };
    }

    if (query?.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query?.assignedToId) {
      where.assignedToId = query.assignedToId;
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
        assignedTo: { include: { organization: true } },
        location: { include: { organization: true } },
        department: { include: { organization: true } },
        credential: true,
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
        assignedTo: { include: { organization: true } },
        location: { include: { organization: true } },
        department: { include: { organization: true } },
        credential: true,
      },
    });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return this.formatAsset(asset);
  }

  async update(id: string, data: UpdateAssetDto) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Asset with ID ${id} not found`);

    const updateData: Prisma.AssetUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.tag !== undefined || data.assetTag !== undefined) {
      updateData.assetTag = data.tag || data.assetTag;
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.specs) updateData.specs = data.specs as Prisma.InputJsonValue;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.purchasePrice !== undefined) updateData.purchaseCost = Number(data.purchasePrice);
    if (data.purchaseCost !== undefined) updateData.purchaseCost = Number(data.purchaseCost);
    if (data.purchaseDate) updateData.purchaseDate = new Date(data.purchaseDate);
    if (data.warrantyExpiry) updateData.warrantyExpiry = new Date(data.warrantyExpiry);

    if (data.categoryId !== undefined) {
      updateData.category = data.categoryId
        ? { connect: { id: data.categoryId } }
        : { disconnect: true };
    } else if (data.category && data.category !== 'all') {
      const cat = await this.prisma.assetCategory.findFirst({ where: { name: data.category } });
      if (!cat) throw new BadRequestException(`Asset category "${data.category}" not found`);
      updateData.category = { connect: { id: cat.id } };
    }

    if (data.locationId !== undefined) {
      updateData.location = data.locationId
        ? { connect: { id: data.locationId } }
        : { disconnect: true };
    } else if (data.location && data.location !== 'all') {
      const loc = await this.prisma.location.findFirst({ where: { name: data.location } });
      if (!loc) throw new BadRequestException(`Location "${data.location}" not found`);
      updateData.location = { connect: { id: loc.id } };
    }

    if (data.departmentId !== undefined) {
      updateData.department = data.departmentId
        ? { connect: { id: data.departmentId } }
        : { disconnect: true };
    }

    if (data.credentialId !== undefined) {
      updateData.credential = data.credentialId
        ? { connect: { id: data.credentialId } }
        : { disconnect: true };
    }

    if (data.assignedToId !== undefined) {
      updateData.assignedTo = data.assignedToId
        ? { connect: { id: data.assignedToId } }
        : { disconnect: true };
    }

    // Lifecycle State Machine:
    if (data.status) {
      updateData.status = mapAssetStatus(data.status);
    } else if (data.assignedToId !== undefined) {
      if (data.assignedToId) {
        if (existing.status === AssetStatus.AVAILABLE) {
          updateData.status = AssetStatus.IN_USE;
        }
      } else {
        if (existing.status === AssetStatus.IN_USE) {
          updateData.status = AssetStatus.AVAILABLE;
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.asset.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          assignedTo: { include: { organization: true } },
          location: { include: { organization: true } },
          department: { include: { organization: true } },
          credential: true,
        },
      });

      const statusChanged = result.status !== existing.status;
      const assignmentChanged = result.assignedToId !== existing.assignedToId;

      if (statusChanged || assignmentChanged) {
        let action = 'ASSET_UPDATED';
        if (statusChanged && assignmentChanged) {
          action = result.assignedToId
            ? 'ASSET_AUTO_ASSIGNED_IN_USE'
            : 'ASSET_AUTO_UNASSIGNED_AVAILABLE';
        } else if (statusChanged) {
          action = `STATUS_CHANGE_TO_${result.status}`;
        } else if (assignmentChanged) {
          action = result.assignedToId ? 'ASSIGNED_TO_USER' : 'UNASSIGNED_FROM_USER';
        }

        if (tx.assetHistory) {
          await tx.assetHistory.create({
            data: {
              assetId: id,
              action,
              changedBy: 'System/Admin',
              oldValue: { status: existing.status, assignedToId: existing.assignedToId },
              newValue: { status: result.status, assignedToId: result.assignedToId },
            },
          });
        }
      }

      return result;
    });

    const formatted = this.formatAsset(updated);

    if (this.notificationsService) {
      try {
        if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
          await this.notificationsService.notifyUser(data.assignedToId, {
            title: 'Asset Assigned',
            message: `Asset "${formatted.name}" (Tag: ${formatted.tag}) has been assigned to you.`,
            type: 'INFO',
            link: '/assets',
          });
        }
        if (
          data.status &&
          (updated.status === 'MAINTENANCE' || updated.status === 'LOST') &&
          existing.status !== updated.status
        ) {
          await this.notificationsService.notifyAdmins({
            title: `Asset Alert: ${formatted.name}`,
            message: `Asset "${formatted.name}" (${formatted.tag}) status changed to ${formatted.status}.`,
            type: 'ALERT',
            link: '/assets',
          });
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch asset notification for asset "${formatted.name}" (${formatted.tag})`,
          error instanceof Error ? error.stack : String(error),
        );
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
      description: asset.description || '',
      manufacturer: asset.manufacturer || 'Generic',
      model: asset.model || 'Standard',
      serialNumber: asset.serialNumber || 'N/A',
      categoryId: asset.categoryId,
      category: asset.category?.name || 'Laptop',
      status: statusLabel,
      assignedToId: asset.assignedToId,
      assignedTo: asset.assignedTo
        ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`.trim()
        : 'Unassigned',
      assignedEmail: asset.assignedTo?.email || '',
      departmentId: asset.departmentId,
      department: asset.department?.name || '',
      locationId: asset.locationId,
      location: asset.location?.name || 'Storage Vault',
      locationPath: asset.location?.fullPath || asset.location?.name || 'Storage Vault',

      organizationId:
        asset.department?.organizationId ||
        asset.location?.organizationId ||
        asset.assignedTo?.organizationId ||
        null,
      organization:
        asset.department?.organization?.name ||
        asset.location?.organization?.name ||
        asset.assignedTo?.organization?.name ||
        null,
      credentialId: asset.credentialId,
      credential: asset.credential?.name || '',
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

  async getCategories() {
    const categories = await this.prisma.assetCategory.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.name.toUpperCase().replace(/\s+/g, '_'),
      parentId: c.parentId,
    }));
  }

  async getDescendantLocationIds(locationId: string): Promise<string[]> {
    return resolveDescendantLocationIds(this.prisma, locationId);
  }
}
