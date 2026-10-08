import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import type {
  AssetQueryDto,
  AssetStatsDto,
  BatchAssignAssetDto,
  BatchAssignAssetResultDto,
  BatchDeleteResultDto,
  CreateAssetDto,
  CreateCostCenterDto,
  CreateDeviceModelDto,
  IssueAssetUnitDto,
  RegisterPhysicalUnitDto,
  UpdateAssetDto,
  UpdateCostCenterDto,
  UpdateDeviceModelDto,
  UpdatePhysicalUnitDto,
} from '@uims/shared-types';
import { mapAssetStatus, mapAssetStatusToLabel } from '@uims/shared-utils';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    category: true;
    assignedTo: { include: { organization: true } };
    department: { include: { organization: true } };
    parent: true;
    costCenter: true;
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

      if (data.assignedToId) {
        const user = await tx.directoryUser.findUnique({ where: { id: data.assignedToId } });
        if (!user) {
          throw new NotFoundException(`Directory user with ID "${data.assignedToId}" not found`);
        }
      }

      const created = await tx.asset.create({
        data: {
          assetCode: data.assetCode ? data.assetCode.trim().toUpperCase() : null,
          subcode: data.subcode ? data.subcode.trim().toUpperCase() : null,
          assetTag:
            data.assetTag ||
            data.tag ||
            (data.subcode ? data.subcode.trim().toUpperCase() : undefined) ||
            (data.assetCode ? data.assetCode.trim().toUpperCase() : undefined) ||
            generateAssetTag(),
          parentId: data.parentId || null,
          costCenterId: data.costCenterId || null,
          name: data.name,
          manufacturer: data.manufacturer,
          model: data.model,
          serialNumber: data.serialNumber ? data.serialNumber.trim() : null,
          specifications: data.specifications || null,
          unitCost:
            data.unitCost !== undefined && data.unitCost !== null ? Number(data.unitCost) : null,
          description: data.description || null,
          status,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          categoryId,
          departmentId: data.departmentId || null,
          assignedToId: data.assignedToId || null,
          notes: data.notes || '',
        },
        include: {
          category: true,
          assignedTo: { include: { organization: true } },
          department: { include: { organization: true } },
          parent: true,
          costCenter: true,
        },
      });

      return this.formatAsset(created as unknown as AssetWithRelations);
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

    if (query?.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query?.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query?.status && query.status !== 'all') {
      where.status = mapAssetStatus(query.status);
    }

    if (query?.type === 'model') {
      where.parentId = null;
    } else if (query?.type === 'unit') {
      where.parentId = { not: null };
    }

    if (query?.parentId) {
      if (query.parentId === 'null') {
        where.parentId = null;
      } else if (query.parentId === 'not-null') {
        where.parentId = { not: null };
      } else {
        where.parentId = query.parentId;
      }
    }

    if (query?.costCenterId) {
      where.costCenterId = query.costCenterId;
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
        department: { include: { organization: true } },
        parent: true,
        costCenter: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return assets.map((a) => this.formatAsset(a as unknown as AssetWithRelations));
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
            department: { include: { organization: true } },
            parent: true,
            costCenter: true,
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
            assetTag: asset.assetTag || asset.subcode || asset.assetCode || 'N/A',
            name: asset.name,
            category: asset.category?.name || 'Uncategorized',
            status: statusStyle.label,
            department: asset.department?.name || 'Unassigned',
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
              cell.font = {
                name: 'Segoe UI',
                size: 10,
                bold: true,
                color: { argb: statusStyle.font },
              };
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
            // Col 6: Serial Number
            else if (colNumber === 6) {
              cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
            // Col 7: Purchase Cost
            else if (colNumber === 7) {
              cell.numFmt = '$#,##0.00';
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
            }
            // Col 8 & 9: Purchase Date & Warranty Expiry
            else if (colNumber === 8 || colNumber === 9) {
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
        department: { include: { organization: true } },
        parent: true,
        costCenter: true,
        children: {
          take: 100,
          orderBy: [{ id: 'asc' }],
          include: {
            assignedTo: { include: { organization: true } },
            costCenter: true,
          },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    const formatted = this.formatAsset(asset as unknown as AssetWithRelations);
    if (asset.parentId === null) {
      const [totalUnits, availableUnits, inUseUnits] = await Promise.all([
        this.prisma.asset.count({ where: { parentId: asset.id } }),
        this.prisma.asset.count({ where: { parentId: asset.id, status: AssetStatus.AVAILABLE } }),
        this.prisma.asset.count({ where: { parentId: asset.id, status: AssetStatus.IN_USE } }),
      ]);
      return {
        ...formatted,
        totalUnits,
        availableUnits,
        inUseUnits,
        childUnits:
          asset.children?.map((c) => this.formatAsset(c as unknown as AssetWithRelations)) || [],
      };
    }

    return formatted;
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
    if (data.specifications !== undefined) {
      updateData.specifications = data.specifications ? data.specifications.trim() : null;
    }
    if (data.unitCost !== undefined) {
      updateData.unitCost = data.unitCost !== null ? Number(data.unitCost) : null;
    }
    if (data.costCenterId !== undefined) {
      updateData.costCenter = data.costCenterId
        ? { connect: { id: data.costCenterId } }
        : { disconnect: true };
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
          department: { include: { organization: true } },
          parent: true,
          costCenter: true,
        },
      });

      return result;
    });

    const formatted = this.formatAsset(updated as unknown as AssetWithRelations);

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

  async batchAssign(dto: BatchAssignAssetDto): Promise<BatchAssignAssetResultDto> {
    if (!dto.assetIds || !Array.isArray(dto.assetIds) || dto.assetIds.length === 0) {
      return { count: 0, assignedIds: [] };
    }

    const uniqueIds = Array.from(
      new Set(
        dto.assetIds
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    );

    if (uniqueIds.length === 0) {
      return { count: 0, assignedIds: [] };
    }

    if (dto.assignedToId) {
      const user = await this.prisma.directoryUser.findUnique({
        where: { id: dto.assignedToId },
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
      });
      if (!user) {
        throw new NotFoundException(`Directory user with ID "${dto.assignedToId}" not found`);
      }
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) {
        throw new NotFoundException(`Department with ID "${dto.departmentId}" not found`);
      }
    }

    let targetStatus: AssetStatus;
    if (dto.status) {
      targetStatus = mapAssetStatus(dto.status);
    } else if (dto.assignedToId) {
      targetStatus = AssetStatus.IN_USE;
    } else {
      targetStatus = AssetStatus.AVAILABLE;
    }

    const updatePayload: Prisma.AssetUncheckedUpdateManyInput = {
      assignedToId: dto.assignedToId ? dto.assignedToId : null,
      status: targetStatus,
    };
    if (dto.departmentId !== undefined) {
      updatePayload.departmentId = dto.departmentId ? dto.departmentId : null;
    }

    const CHUNK_SIZE = 100;
    let totalAssigned = 0;
    const assignedIds: string[] = [];

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
          return { count: 0, assignedIds: [] };
        }

        const updateResult = await tx.asset.updateMany({
          where: { id: { in: existingIds } },
          data: updatePayload,
        });

        return { count: updateResult.count, assignedIds: existingIds };
      });

      totalAssigned += chunkResult.count;
      assignedIds.push(...chunkResult.assignedIds);
    }

    this.logger.log(`Batch assigned ${totalAssigned} assets (${uniqueIds.length} requested)`);

    if (this.notificationsService && dto.assignedToId && assignedIds.length > 0) {
      try {
        await this.notificationsService.notifyUser(dto.assignedToId, {
          title: 'Assets Assigned',
          message: `${totalAssigned} hardware asset${totalAssigned > 1 ? 's have' : ' has'} been assigned to you.`,
          type: 'INFO',
          link: '/assets',
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch batch assign notification to user "${dto.assignedToId}"`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return {
      count: totalAssigned,
      assignedIds,
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
      assetCode: asset.assetCode || null,
      subcode: asset.subcode || null,
      parentId: asset.parentId || null,
      parent: asset.parent
        ? {
            id: asset.parent.id,
            assetCode: asset.parent.assetCode,
            name: asset.parent.name,
            model: asset.parent.model,
            manufacturer: asset.parent.manufacturer,
            categoryId: asset.parent.categoryId,
            specifications: asset.parent.specifications,
            unitCost:
              asset.parent.unitCost !== null && asset.parent.unitCost !== undefined
                ? Number(asset.parent.unitCost)
                : null,
          }
        : null,
      costCenterId: asset.costCenterId || null,
      costCenter: asset.costCenter
        ? {
            id: asset.costCenter.id,
            code: asset.costCenter.code,
            name: asset.costCenter.name,
            description: asset.costCenter.description,
          }
        : null,
      assetTag: asset.assetTag || asset.subcode || asset.assetCode || '',
      tag: asset.assetTag || asset.subcode || asset.assetCode || '',
      name: asset.name,
      description: asset.description || '',
      manufacturer: asset.manufacturer || 'Generic',
      model: asset.model || 'Standard',
      serialNumber: asset.serialNumber || null,
      specifications: asset.specifications || null,
      unitCost:
        asset.unitCost !== null && asset.unitCost !== undefined ? Number(asset.unitCost) : null,
      categoryId: asset.categoryId,
      category: asset.category?.name || 'Laptop',
      status: statusLabel,
      assignedToId: asset.assignedToId,
      assignedTo: assignedUserName,
      assignedUser: assignedUserName,
      assignedEmail: asset.assignedTo?.email || '',
      departmentId: asset.departmentId,
      department: asset.department?.name || '',

      organizationId:
        asset.department?.organizationId ||
        asset.assignedTo?.organizationId ||
        null,
      organization:
        asset.department?.organization?.name ||
        asset.assignedTo?.organization?.name ||
        null,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : '',
      notes: asset.notes || '',
      createdAt: asset.createdAt ? asset.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: asset.updatedAt ? asset.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  // =========================================================================
  // Device Models Management (Catalog CRUD & Telemetry)
  // =========================================================================

  async createModel(data: CreateDeviceModelDto) {
    if (!data.assetCode || data.assetCode.trim().length === 0) {
      throw new BadRequestException('Asset code (model code) is required');
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Device model name is required');
    }
    if (data.unitCost !== undefined && data.unitCost < 0) {
      throw new BadRequestException('Unit cost cannot be negative');
    }

    const normalizedAssetCode = data.assetCode.trim().toUpperCase();

    const existing = await this.prisma.asset.findFirst({
      where: {
        OR: [
          { assetCode: { equals: normalizedAssetCode, mode: 'insensitive' } },
          { assetTag: { equals: normalizedAssetCode, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      throw new ConflictException(
        `Device model with asset code "${normalizedAssetCode}" already exists. Model codes must be unique.`,
      );
    }

    let categoryId: string | undefined = undefined;
    if (data.categoryId) {
      const cat = await this.prisma.assetCategory.findUnique({ where: { id: data.categoryId } });
      if (cat) categoryId = cat.id;
    }

    const created = await this.prisma.asset.create({
      data: {
        assetCode: normalizedAssetCode,
        assetTag: normalizedAssetCode,
        subcode: null,
        parentId: null,
        name: data.name.trim(),
        manufacturer: data.manufacturer?.trim() || null,
        model: data.model?.trim() || null,
        categoryId: categoryId || null,
        specifications: data.specifications?.trim() || null,
        unitCost: data.unitCost !== undefined ? Number(data.unitCost) : null,
        notes: data.notes?.trim() || null,
        status: AssetStatus.AVAILABLE,
      },
      include: {
        category: true,
        costCenter: true,
      },
    });

    return this.getModel(created.id);
  }

  async getModel(id: string) {
    const model = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        costCenter: true,
        children: {
          take: 100,
          orderBy: [{ id: 'asc' }],
          include: {
            assignedTo: { include: { organization: true } },
            costCenter: true,
          },
        },
      },
    });

    if (!model || model.parentId !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    const [totalUnits, availableUnits, inUseUnits] = await Promise.all([
      this.prisma.asset.count({ where: { parentId: model.id } }),
      this.prisma.asset.count({ where: { parentId: model.id, status: AssetStatus.AVAILABLE } }),
      this.prisma.asset.count({ where: { parentId: model.id, status: AssetStatus.IN_USE } }),
    ]);

    const formatted = this.formatAsset(model as unknown as AssetWithRelations);

    return {
      ...formatted,
      totalUnits,
      availableUnits,
      inUseUnits,
      childUnits:
        model.children?.map((c) => this.formatAsset(c as unknown as AssetWithRelations)) || [],
    };
  }

  async listModels(query?: AssetQueryDto) {
    const where: Prisma.AssetWhereInput = {
      parentId: null,
    };

    if (query?.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { assetCode: { contains: q, mode: 'insensitive' } },
        { manufacturer: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 10));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const [total, models] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        include: {
          category: true,
          costCenter: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: pageSize,
        skip,
      }),
    ]);

    const modelIds = models.map((m) => m.id);
    const countsMap = new Map<string, { total: number; available: number; inUse: number }>();

    if (modelIds.length > 0) {
      const stats = await this.prisma.asset.groupBy({
        by: ['parentId', 'status'],
        where: { parentId: { in: modelIds } },
        _count: { _all: true },
      });

      for (const stat of stats) {
        if (!stat.parentId) continue;
        const current = countsMap.get(stat.parentId) || { total: 0, available: 0, inUse: 0 };
        current.total += stat._count._all;
        if (stat.status === AssetStatus.AVAILABLE) {
          current.available += stat._count._all;
        } else if (stat.status === AssetStatus.IN_USE) {
          current.inUse += stat._count._all;
        }
        countsMap.set(stat.parentId, current);
      }
    }

    const items = models.map((m) => {
      const counts = countsMap.get(m.id) || { total: 0, available: 0, inUse: 0 };
      const formatted = this.formatAsset(m as unknown as AssetWithRelations);
      return {
        ...formatted,
        totalUnits: counts.total,
        availableUnits: counts.available,
        inUseUnits: counts.inUse,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async updateModel(id: string, data: UpdateDeviceModelDto) {
    const model = await this.prisma.asset.findUnique({ where: { id } });
    if (!model || model.parentId !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    const updateData: Prisma.AssetUpdateInput = {};

    if (data.assetCode !== undefined) {
      if (data.assetCode.trim().length === 0) {
        throw new BadRequestException('Asset code cannot be empty');
      }
      const normalized = data.assetCode.trim().toUpperCase();
      const existing = await this.prisma.asset.findFirst({
        where: {
          id: { not: id },
          OR: [
            { assetCode: { equals: normalized, mode: 'insensitive' } },
            { assetTag: { equals: normalized, mode: 'insensitive' } },
          ],
        },
      });
      if (existing) {
        throw new ConflictException(
          `Device model with asset code "${normalized}" already exists. Model codes must be unique.`,
        );
      }
      updateData.assetCode = normalized;
      updateData.assetTag = normalized;
    }

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new BadRequestException('Device model name cannot be empty');
      }
      updateData.name = data.name.trim();
    }

    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer.trim() || null;
    if (data.model !== undefined) updateData.model = data.model.trim() || null;
    if (data.specifications !== undefined)
      updateData.specifications = data.specifications.trim() || null;
    if (data.unitCost !== undefined) {
      if (data.unitCost < 0) throw new BadRequestException('Unit cost cannot be negative');
      updateData.unitCost = Number(data.unitCost);
    }
    if (data.notes !== undefined) updateData.notes = data.notes.trim() || null;
    if (data.categoryId !== undefined) {
      updateData.category = data.categoryId
        ? { connect: { id: data.categoryId } }
        : { disconnect: true };
    }

    await this.prisma.asset.update({
      where: { id },
      data: updateData,
    });

    return this.getModel(id);
  }

  async deleteModel(id: string) {
    const model = await this.prisma.asset.findUnique({ where: { id } });
    if (!model || model.parentId !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    const childCount = await this.prisma.asset.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot delete device model with ${childCount} active physical units. Decommission or reassign units first.`,
      );
    }

    await this.prisma.asset.delete({ where: { id } });
    return { success: true, id };
  }

  async getModelUnits(modelId: string, query?: AssetQueryDto) {
    const model = await this.prisma.asset.findUnique({ where: { id: modelId } });
    if (!model || model.parentId !== null) {
      throw new NotFoundException(`Device model with ID ${modelId} not found`);
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AssetWhereInput = { parentId: modelId };
    if (query?.status) where.status = mapAssetStatus(query.status);

    const [total, units] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        include: {
          parent: true,
          costCenter: true,
          assignedTo: { include: { organization: true } },
          department: { include: { organization: true } },
          category: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: pageSize,
        skip,
      }),
    ]);

    return {
      items: units.map((u) => this.formatAsset(u as unknown as AssetWithRelations)),
      total,
      page,
      pageSize,
    };
  }

  // =========================================================================
  // Physical Units Operations (Registration, Custody, Issue & Check-in)
  // =========================================================================

  async registerUnit(data: RegisterPhysicalUnitDto) {
    if (!data.subcode || data.subcode.trim().length === 0) {
      throw new BadRequestException('Subcode is required for physical units');
    }
    if (!data.parentId || data.parentId.trim().length === 0) {
      throw new BadRequestException('Parent device model ID is required');
    }

    const parentModel = await this.prisma.asset.findUnique({ where: { id: data.parentId } });
    if (!parentModel) {
      throw new NotFoundException(`Parent device model with ID ${data.parentId} not found`);
    }

    if (parentModel.parentId !== null) {
      throw new BadRequestException(
        'Cannot register unit under another physical unit. Parent must be a device model.',
      );
    }

    const normalizedSubcode = data.subcode.trim().toUpperCase();

    const existing = await this.prisma.asset.findFirst({
      where: {
        OR: [
          { subcode: { equals: normalizedSubcode, mode: 'insensitive' } },
          { assetTag: { equals: normalizedSubcode, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) {
      throw new ConflictException(
        `Physical unit with subcode "${normalizedSubcode}" already exists. Unit subcodes must be unique.`,
      );
    }

    if (data.costCenterId) {
      const cc = await this.prisma.costCenter.findUnique({ where: { id: data.costCenterId } });
      if (!cc) {
        throw new NotFoundException(`Cost center with ID ${data.costCenterId} not found`);
      }
    }

    const created = await this.prisma.asset.create({
      data: {
        subcode: normalizedSubcode,
        assetTag: normalizedSubcode,
        assetCode: null,
        name: parentModel.name,
        manufacturer: parentModel.manufacturer,
        model: parentModel.model,
        categoryId: parentModel.categoryId,
        specifications: parentModel.specifications,
        unitCost: parentModel.unitCost,
        status: AssetStatus.AVAILABLE,
        serialNumber: data.serialNumber?.trim() || null,
        parentId: parentModel.id,
        costCenterId: data.costCenterId || null,
        departmentId: data.departmentId || null,
        assignedToId: null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        notes: data.notes?.trim() || null,
      },
      include: {
        parent: true,
        costCenter: true,
        category: true,
        department: { include: { organization: true } },
        assignedTo: { include: { organization: true } },
      },
    });

    return this.getUnit(created.id);
  }

  async getUnit(id: string) {
    const unit = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        parent: true,
        costCenter: true,
        category: true,
        department: { include: { organization: true } },
        assignedTo: { include: { organization: true } },
      },
    });

    if (!unit || unit.parentId === null) {
      throw new NotFoundException(`Physical unit with ID ${id} not found`);
    }

    return this.formatAsset(unit as unknown as AssetWithRelations);
  }

  async updateUnit(id: string, data: UpdatePhysicalUnitDto) {
    const unit = await this.prisma.asset.findUnique({ where: { id } });
    if (!unit || unit.parentId === null) {
      throw new NotFoundException(`Physical unit with ID ${id} not found`);
    }

    const updateData: Prisma.AssetUpdateInput = {};

    if (data.subcode !== undefined) {
      if (data.subcode.trim().length === 0) {
        throw new BadRequestException('Subcode cannot be empty');
      }
      const normalized = data.subcode.trim().toUpperCase();
      const existing = await this.prisma.asset.findFirst({
        where: {
          id: { not: id },
          OR: [
            { subcode: { equals: normalized, mode: 'insensitive' } },
            { assetTag: { equals: normalized, mode: 'insensitive' } },
          ],
        },
      });
      if (existing) {
        throw new ConflictException(
          `Physical unit with subcode "${normalized}" already exists. Unit subcodes must be unique.`,
        );
      }
      updateData.subcode = normalized;
      updateData.assetTag = normalized;
    }

    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber.trim() || null;
    if (data.costCenterId !== undefined) {
      if (data.costCenterId) {
        const cc = await this.prisma.costCenter.findUnique({ where: { id: data.costCenterId } });
        if (!cc) throw new NotFoundException(`Cost center ${data.costCenterId} not found`);
        updateData.costCenter = { connect: { id: data.costCenterId } };
      } else {
        updateData.costCenter = { disconnect: true };
      }
    }
    if (data.departmentId !== undefined) {
      updateData.department = data.departmentId
        ? { connect: { id: data.departmentId } }
        : { disconnect: true };
    }
    if (data.purchaseDate !== undefined) {
      updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    }
    if (data.warrantyExpiry !== undefined) {
      updateData.warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes.trim() || null;
    if (data.status !== undefined) {
      updateData.status = mapAssetStatus(data.status);
    }

    await this.prisma.asset.update({
      where: { id },
      data: updateData,
    });

    return this.getUnit(id);
  }

  async deleteUnit(id: string) {
    const unit = await this.prisma.asset.findUnique({ where: { id } });
    if (!unit || unit.parentId === null) {
      throw new NotFoundException(`Physical unit with ID ${id} not found`);
    }

    if (unit.status === AssetStatus.IN_USE || unit.assignedToId !== null) {
      throw new ConflictException(
        'Cannot delete physical unit currently issued to an employee. Check in unit before deletion.',
      );
    }

    await this.prisma.asset.delete({ where: { id } });
    return { success: true, id };
  }

  async issueUnit(unitId: string, data: IssueAssetUnitDto) {
    const unit = await this.prisma.asset.findUnique({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Asset with ID ${unitId} not found`);
    }

    if (unit.parentId === null) {
      throw new BadRequestException(
        'Cannot assign a device model to an employee. Only individual physical units can be assigned.',
      );
    }

    const userId = data.assignedToId || data.userId;
    if (!userId) {
      throw new BadRequestException('Target employee ID is required');
    }

    const user = await this.prisma.directoryUser.findFirst({
      where: { OR: [{ id: userId }, { employeeCode: userId }] },
    });
    if (!user) {
      throw new NotFoundException(`Directory user with ID ${userId} not found`);
    }

    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot issue equipment to ${user.status.toLowerCase()} employee`,
      );
    }

    if (unit.assignedToId !== null || unit.status === AssetStatus.IN_USE) {
      throw new ConflictException(
        `Physical unit ${unit.subcode || unit.assetTag} is already in use by another custodian`,
      );
    }

    if (unit.status !== AssetStatus.AVAILABLE) {
      throw new BadRequestException(
        `Cannot issue unit in "${unit.status}" status. Unit must be AVAILABLE.`,
      );
    }

    await this.prisma.asset.update({
      where: { id: unitId },
      data: {
        assignedToId: user.id,
        status: AssetStatus.IN_USE,
        notes: data.notes?.trim() || unit.notes,
      },
      include: {
        parent: true,
        costCenter: true,
        category: true,
        department: { include: { organization: true } },
        assignedTo: { include: { organization: true } },
      },
    });

    if (this.notificationsService) {
      try {
        await this.notificationsService.notifyUser(user.id, {
          title: 'Equipment Issued',
          message: `Physical unit "${unit.name}" (${unit.subcode || unit.assetTag}) has been issued to you.`,
          type: 'INFO',
          link: '/assets',
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch equipment issue notification for unit ${unitId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return this.getUnit(unitId);
  }

  async checkinUnit(unitId: string, notes?: string) {
    const unit = await this.prisma.asset.findUnique({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Asset with ID ${unitId} not found`);
    }

    if (unit.parentId === null) {
      throw new BadRequestException('Cannot check in a device model.');
    }

    await this.prisma.asset.update({
      where: { id: unitId },
      data: {
        assignedToId: null,
        status: AssetStatus.AVAILABLE,
        notes: notes ? notes.trim() : unit.notes,
      },
    });

    return this.getUnit(unitId);
  }

  // =========================================================================
  // Cost Centers Management (code @unique)
  // =========================================================================

  async createCostCenter(data: CreateCostCenterDto) {
    if (!data.code || data.code.trim().length === 0) {
      throw new BadRequestException('Cost center code is required');
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Cost center name is required');
    }

    const normalizedCode = data.code.trim().toUpperCase();

    const existing = await this.prisma.costCenter.findFirst({
      where: { code: { equals: normalizedCode, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(
        `Cost center with code "${normalizedCode}" already exists. Cost center codes must be unique.`,
      );
    }

    const created = await this.prisma.costCenter.create({
      data: {
        code: normalizedCode,
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
    });

    return {
      ...created,
      linkedAssetCount: 0,
    };
  }

  async listCostCenters() {
    const list = await this.prisma.costCenter.findMany({
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
      take: 100,
    });

    const ccIds = list.map((c) => c.id);
    const countsMap = new Map<string, number>();

    if (ccIds.length > 0) {
      const stats = await this.prisma.asset.groupBy({
        by: ['costCenterId'],
        where: { costCenterId: { in: ccIds } },
        _count: { _all: true },
      });

      for (const s of stats) {
        if (s.costCenterId) {
          countsMap.set(s.costCenterId, s._count._all);
        }
      }
    }

    return list.map((cc) => ({
      ...cc,
      linkedAssetCount: countsMap.get(cc.id) || 0,
    }));
  }

  async getCostCenter(id: string) {
    const cc = await this.prisma.costCenter.findUnique({ where: { id } });
    if (!cc) {
      throw new NotFoundException(`Cost center with ID ${id} not found`);
    }

    const linkedAssetCount = await this.prisma.asset.count({ where: { costCenterId: id } });
    return {
      ...cc,
      linkedAssetCount,
    };
  }

  async updateCostCenter(id: string, data: UpdateCostCenterDto) {
    const cc = await this.prisma.costCenter.findUnique({ where: { id } });
    if (!cc) {
      throw new NotFoundException(`Cost center with ID ${id} not found`);
    }

    const updateData: Prisma.CostCenterUpdateInput = {};

    if (data.code !== undefined) {
      if (data.code.trim().length === 0) {
        throw new BadRequestException('Cost center code cannot be empty');
      }
      const normalizedCode = data.code.trim().toUpperCase();
      const existing = await this.prisma.costCenter.findFirst({
        where: {
          id: { not: id },
          code: { equals: normalizedCode, mode: 'insensitive' },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Cost center with code "${normalizedCode}" already exists. Cost center codes must be unique.`,
        );
      }
      updateData.code = normalizedCode;
    }

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new BadRequestException('Cost center name cannot be empty');
      }
      updateData.name = data.name.trim();
    }

    if (data.description !== undefined) {
      updateData.description = data.description.trim() || null;
    }

    const updated = await this.prisma.costCenter.update({
      where: { id },
      data: updateData,
    });

    const linkedAssetCount = await this.prisma.asset.count({ where: { costCenterId: id } });
    return {
      ...updated,
      linkedAssetCount,
    };
  }

  async deleteCostCenter(id: string) {
    const cc = await this.prisma.costCenter.findUnique({ where: { id } });
    if (!cc) {
      throw new NotFoundException(`Cost center with ID ${id} not found`);
    }

    const linkedCount = await this.prisma.asset.count({ where: { costCenterId: id } });
    if (linkedCount > 0) {
      throw new ConflictException(
        `Cannot delete cost center with ${linkedCount} linked assets. Reassign assets before deletion.`,
      );
    }

    await this.prisma.costCenter.delete({ where: { id } });
    return { success: true, id };
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
}
