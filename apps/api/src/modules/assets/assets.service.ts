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
  BatchDeleteResultDto,
  CreateAssetDto,
  UpdateAssetDto,
} from '@uims/shared-types';
import { mapAssetStatus, mapAssetStatusToLabel } from '@uims/shared-utils';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveDescendantLocationIds } from '../organization/location-tree.util';

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    category: true;
    assignedTo: { include: { organization: true } };
    location: { include: { organization: true } };
    department: { include: { organization: true } };
  };
}>;

interface StatusStyle {
  fill: string;
  font: string;
  border: string;
  label: string;
}

function resolveStatusStyle(rawStatus?: string | null): StatusStyle {
  const normalized = (rawStatus || '').toUpperCase().trim();
  switch (normalized) {
    case 'ACTIVE':
    case 'IN_USE':
      return {
        fill: 'FFF6FFED',
        font: 'FF237804',
        border: 'FFB7EB8F',
        label: 'Active',
      };
    case 'IN_STORAGE':
    case 'AVAILABLE':
      return {
        fill: 'FFE6F4FF',
        font: 'FF0958D9',
        border: 'FF91CAFF',
        label: 'Available',
      };
    case 'IN_REPAIR':
    case 'MAINTENANCE':
      return {
        fill: 'FFFFFBE6',
        font: 'FFD46B08',
        border: 'FFFFD591',
        label: 'In Repair',
      };
    case 'RETIRED':
      return {
        fill: 'FFF5F5F5',
        font: 'FF595959',
        border: 'FFD9D9D9',
        label: 'Retired',
      };
    case 'LOST':
    case 'DISPOSED':
      return {
        fill: 'FFFFF1F0',
        font: 'FFCF1322',
        border: 'FFFFA39E',
        label: 'Lost',
      };
    default:
      return {
        fill: 'FFF5F5F5',
        font: 'FF595959',
        border: 'FFD9D9D9',
        label: rawStatus || 'Unknown',
      };
  }
}

function autoFitColumnWidths(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns.forEach((column) => {
    let maxLength = column.header ? String(column.header).length : 10;

    column.eachCell?.({ includeEmpty: false }, (cell) => {
      let cellLen = 0;
      const val = cell.value;
      if (val instanceof Date) {
        cellLen = 10;
      } else if (cell.numFmt === '$#,##0.00' && typeof val === 'number') {
        cellLen = val.toLocaleString('en-US', { style: 'currency', currency: 'USD' }).length;
      } else if (val !== null && val !== undefined) {
        const strVal = String(val);
        if (strVal.includes('\n')) {
          cellLen = Math.max(...strVal.split('\n').map((line) => line.length));
        } else {
          cellLen = strVal.length;
        }
      }

      if (cellLen > maxLength) {
        maxLength = cellLen;
      }
    });

    column.width = Math.min(Math.max(maxLength + 4, 13), 45);
  });
}

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

      const created = await tx.asset.create({
        data: {
          assetTag: data.assetTag || data.tag || generateAssetTag(),
          name: data.name,
          manufacturer: data.manufacturer,
          model: data.model,
          serialNumber: data.serialNumber ? data.serialNumber.trim() : null,
          description: data.description || null,
          status,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          categoryId,
          locationId,
          departmentId: data.departmentId || null,
          assignedToId: data.assignedToId || null,
          notes: data.notes || '',
        },
        include: {
          category: true,
          assignedTo: { include: { organization: true } },
          location: { include: { organization: true } },
          department: { include: { organization: true } },
        },
      });

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

  private async buildWhere(query?: AssetQueryDto): Promise<Prisma.AssetWhereInput> {
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

    return where;
  }

  async findAll(query?: AssetQueryDto) {
    const where = await this.buildWhere(query);

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
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return assets.map((a) => this.formatAsset(a));
  }

  async exportXlsx(query: AssetQueryDto | undefined, res: Response): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const filename = `assets_export_${today}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'UIMS';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet('Hardware Assets', {
        views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }],
        properties: { defaultRowHeight: 20 },
      });

      worksheet.columns = [
        { header: 'Asset Tag', key: 'assetTag', width: 16 },
        { header: 'Name', key: 'name', width: 28 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Department', key: 'department', width: 22 },
        { header: 'Location', key: 'location', width: 24 },
        { header: 'Serial Number', key: 'serialNumber', width: 20 },
        { header: 'Purchase Cost', key: 'purchaseCost', width: 16 },
        { header: 'Purchase Date', key: 'purchaseDate', width: 16 },
        { header: 'Warranty Expiry', key: 'warrantyExpiry', width: 16 },
        { header: 'Assigned To', key: 'assignedTo', width: 22 },
      ];

      // Format Header Row
      const headerRow = worksheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = {
          name: 'Segoe UI',
          size: 11,
          bold: true,
          color: { argb: 'FFFFFFFF' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1677FF' },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF0E5AC0' } },
          left: { style: 'thin', color: { argb: 'FF0E5AC0' } },
          bottom: { style: 'medium', color: { argb: 'FF0E5AC0' } },
          right: { style: 'thin', color: { argb: 'FF0E5AC0' } },
        };
      });

      const where = await this.buildWhere(query);
      let cursor: string | undefined = undefined;

      while (true) {
        const batch: AssetWithRelations[] = await this.prisma.asset.findMany({
          where,
          include: {
            category: true,
            assignedTo: { include: { organization: true } },
            location: { include: { organization: true } },
            department: { include: { organization: true } },
          },
          take: 100,
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          orderBy: { id: 'asc' },
        });

        if (batch.length === 0) break;

        for (const asset of batch) {
          const statusStyle = resolveStatusStyle(asset.status);
          const assignedUser = asset.assignedTo
            ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`.trim()
            : 'Unassigned';

          const row = worksheet.addRow({
            assetTag: asset.assetTag,
            name: asset.name,
            category: asset.category?.name || 'Uncategorized',
            status: statusStyle.label,
            department: asset.department?.name || 'Unassigned',
            location: asset.location?.name || asset.location?.fullPath || 'Storage Vault',
            serialNumber: asset.serialNumber || 'N/A',
            purchaseCost: null,
            purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
            warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : null,
            assignedTo: assignedUser,
          });

          row.height = 22;

          // Style Data Cells
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE8E8E8' } },
              left: { style: 'thin', color: { argb: 'FFE8E8E8' } },
              bottom: { style: 'thin', color: { argb: 'FFE8E8E8' } },
              right: { style: 'thin', color: { argb: 'FFE8E8E8' } },
            };

            // Col 1: Asset Tag
            if (colNumber === 1) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1677FF' } };
            }
            // Col 2: Name
            else if (colNumber === 2) {
              cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              cell.font = { name: 'Segoe UI', size: 10, bold: true };
            }
            // Col 3: Category
            else if (colNumber === 3) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            // Col 4: Status Badge
            else if (colNumber === 4) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
              cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: statusStyle.font } };
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: statusStyle.fill },
              };
              cell.border = {
                top: { style: 'thin', color: { argb: statusStyle.border } },
                left: { style: 'thin', color: { argb: statusStyle.border } },
                bottom: { style: 'thin', color: { argb: statusStyle.border } },
                right: { style: 'thin', color: { argb: statusStyle.border } },
              };
            }
            // Col 7: Serial Number
            else if (colNumber === 7) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            // Col 8: Purchase Cost
            else if (colNumber === 8) {
              cell.numFmt = '$#,##0.00';
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
            }
            // Col 9 & 10: Purchase Date & Warranty Expiry
            else if (colNumber === 9 || colNumber === 10) {
              cell.numFmt = 'yyyy-mm-dd';
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
          });
        }

        cursor = batch[batch.length - 1].id;
        if (batch.length < 100) break;
      }

      autoFitColumnWidths(worksheet);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: unknown) {
      this.logger.error(
        'Failed to export assets to XLSX workbook',
        error instanceof Error ? error.stack : String(error),
      );
      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          message: 'Failed to generate Excel export',
          error: 'Internal Server Error',
        });
      } else {
        res.end();
      }
    }
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        assignedTo: { include: { organization: true } },
        location: { include: { organization: true } },
        department: { include: { organization: true } },
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
    if (data.serialNumber !== undefined) {
      updateData.serialNumber = data.serialNumber ? data.serialNumber.trim() : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
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
        },
      });

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

  async batchDelete(ids: string[]): Promise<BatchDeleteResultDto> {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { count: 0, deletedIds: [] };
    }

    const uniqueIds = Array.from(
      new Set(
        ids
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    );

    if (uniqueIds.length === 0) {
      return { count: 0, deletedIds: [] };
    }

    const CHUNK_SIZE = 100;
    let totalDeleted = 0;
    const deletedIds: string[] = [];

    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);

      const chunkResult = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.asset.findMany({
          where: { id: { in: chunk } },
          select: { id: true },
          take: chunk.length,
          orderBy: [{ id: 'asc' }],
        });

        const existingIds = existing.map((a) => a.id);
        if (existingIds.length === 0) {
          return { count: 0, deletedIds: [] };
        }

        const deleteResult = await tx.asset.deleteMany({
          where: { id: { in: existingIds } },
        });

        return { count: deleteResult.count, deletedIds: existingIds };
      });

      totalDeleted += chunkResult.count;
      deletedIds.push(...chunkResult.deletedIds);
    }

    this.logger.log(`Batch deleted ${totalDeleted} assets (${uniqueIds.length} requested)`);

    return {
      count: totalDeleted,
      deletedIds,
    };
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

    const assignedUserName = asset.assignedTo
      ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`.trim()
      : 'Unassigned';

    return {
      id: asset.id,
      assetTag: asset.assetTag,
      tag: asset.assetTag,
      name: asset.name,
      description: asset.description || '',
      manufacturer: asset.manufacturer || 'Generic',
      model: asset.model || 'Standard',
      serialNumber: asset.serialNumber || null,
      categoryId: asset.categoryId,
      category: asset.category?.name || 'Laptop',
      status: statusLabel,
      assignedToId: asset.assignedToId,
      assignedTo: assignedUserName,
      assignedUser: assignedUserName,
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
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : '',
      notes: asset.notes || '',
      createdAt: asset.createdAt ? asset.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: asset.updatedAt ? asset.updatedAt.toISOString() : new Date().toISOString(),
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
      code: c.name.toUpperCase().replace(/\s+/g, '_'),
      parentId: c.parentId,
    }));
  }

  async getDescendantLocationIds(locationId: string): Promise<string[]> {
    return resolveDescendantLocationIds(this.prisma, locationId);
  }
}
