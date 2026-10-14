import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AssetStatus, HandoverRecordType, Prisma } from '@prisma/client';
import { AssetQueryDto } from './dto/asset-query.dto';
import type {
  AssetStatsDto,
  BatchAssignAssetResultDto,
  BatchDeleteResultDto,
  CreateCostCenterDto,
  CreateDeviceModelDto,
  IssueAssetUnitDto,
  LogEventDto,
  UpdateCostCenterDto,
  UpdateDeviceModelDto,
  UpdatePhysicalUnitDto,
} from '@uims/shared-types';
import type { AllocateAssetDto } from './dto/allocate-asset.dto';
import type { BatchStockIntakeDto } from './dto/batch-stock-intake.dto';
import type { RegisterPhysicalUnitDto } from './dto/register-physical-unit.dto';
import type { ReturnAssetDto } from './dto/return-asset.dto';
import type { TransferAssetDto } from './dto/transfer-asset.dto';
import type { UpdatePhysicalUnitDto as UpdateAssetDto } from './dto/update-physical-unit.dto';
import { computeFieldDiff, mapAssetStatus, mapAssetStatusToLabel } from '@uims/shared-utils';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BatchAssignAssetDto } from './dto/batch-assign-asset.dto';
import type { GenerateHandoverDocumentDto } from './dto/generate-handover-document.dto';
import { buildHandoverDocx, HandoverDocumentParams } from './utils/handover-document.builder';

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    deviceModel: {
      include: {
        category: true;
        vendor: true;
      };
    };
    assignedTo: { include: { organization: true } };
    department: { include: { organization: true } };
    costCenter: true;
  };
}> & {
  handoverRecords?: Array<{
    id: string;
    type: HandoverRecordType;
    signedDocUrl: string | null;
    isPending: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

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

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getHandoverUploadDir(): string {
  const cwd = process.cwd();
  const dir = cwd.endsWith('apps/api')
    ? path.resolve(cwd, 'uploads/handover-records')
    : path.resolve(cwd, 'apps/api/uploads/handover-records');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notificationsService?: NotificationsService,
    @Optional() private auditService?: AuditService,
  ) {}

  private async buildWhere(query?: AssetQueryDto): Promise<Prisma.AssetWhereInput> {
    const where: Prisma.AssetWhereInput = {};
    const andConditions: Prisma.AssetWhereInput[] = [];

    if (query?.search) {
      andConditions.push({
        OR: [
          { assetTag: { contains: query.search, mode: 'insensitive' } },
          { subcode: { contains: query.search, mode: 'insensitive' } },
          { serialNumber: { contains: query.search, mode: 'insensitive' } },
          { deviceModel: { name: { contains: query.search, mode: 'insensitive' } } },
          { deviceModel: { modelCode: { contains: query.search, mode: 'insensitive' } } },
          { deviceModel: { manufacturer: { contains: query.search, mode: 'insensitive' } } },
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

    if (query?.deviceModelId) {
      where.deviceModelId = query.deviceModelId;
    }

    if (query?.categoryId) {
      where.deviceModel = {
        categoryId: query.categoryId,
      };
    } else if (query?.category && query.category !== 'all') {
      where.deviceModel = {
        category: { name: query.category },
      };
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

    if (query?.costCenterId) {
      where.costCenterId = query.costCenterId;
    }

    if (typeof query?.hasPendingRecord === 'boolean') {
      where.hasPendingRecord = query.hasPendingRecord;
    } else if (query?.hasPendingRecord !== undefined && query?.hasPendingRecord !== null) {
      const parsed = String(query.hasPendingRecord).toLowerCase();
      if (parsed === 'true' || parsed === '1') {
        where.hasPendingRecord = true;
      } else if (parsed === 'false' || parsed === '0') {
        where.hasPendingRecord = false;
      }
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
        deviceModel: {
          include: {
            category: true,
            vendor: true,
          },
        },
        assignedTo: { include: { organization: true } },
        department: { include: { organization: true } },
        costCenter: true,
        handoverRecords: {
          take: 1,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
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
            deviceModel: {
              include: {
                category: true,
                vendor: true,
              },
            },
            assignedTo: { include: { organization: true } },
            department: { include: { organization: true } },
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
            assetTag: asset.assetTag || asset.subcode || 'N/A',
            name: asset.deviceModel?.name || (asset as { name?: string }).name || 'Hardware Asset',
            category:
              asset.deviceModel?.category?.name ||
              (asset as { category?: { name?: string } }).category?.name ||
              'Uncategorized',
            status: statusStyle.label,
            department: asset.department?.name || 'Unassigned',
            serialNumber: asset.serialNumber || 'N/A',
            purchaseCost:
              asset.deviceModel?.unitCost ??
              (asset as { purchaseCost?: number }).purchaseCost ??
              null,
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
        deviceModel: {
          include: {
            category: true,
            vendor: true,
          },
        },
        assignedTo: { include: { organization: true } },
        department: { include: { organization: true } },
        costCenter: true,
        handoverRecords: {
          take: 5,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        },
      },
    });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return this.formatAsset(asset as unknown as AssetWithRelations);
  }

  async update(id: string, data: UpdateAssetDto) {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Asset with ID ${id} not found`);

    const updateData: Prisma.AssetUpdateInput = {};

    if (data.tag !== undefined || data.assetTag !== undefined) {
      updateData.assetTag = data.tag || data.assetTag;
    }
    if (data.subcode !== undefined) {
      updateData.subcode = data.subcode ? data.subcode.trim().toUpperCase() : null;
    }
    if (data.serialNumber !== undefined) {
      updateData.serialNumber = data.serialNumber ? data.serialNumber.trim() : null;
    }
    if (data.costCenterId !== undefined) {
      updateData.costCenter = data.costCenterId
        ? { connect: { id: data.costCenterId } }
        : { disconnect: true };
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.purchaseDate) updateData.purchaseDate = new Date(data.purchaseDate);
    if (data.warrantyExpiry) updateData.warrantyExpiry = new Date(data.warrantyExpiry);

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
          deviceModel: {
            include: {
              category: true,
              vendor: true,
            },
          },
          assignedTo: { include: { organization: true } },
          department: { include: { organization: true } },
          costCenter: true,
          handoverRecords: {
            take: 1,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          },
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

    if (this.auditService) {
      try {
        const diff = computeFieldDiff(
          existing as unknown as Record<string, unknown>,
          updated as unknown as Record<string, unknown>,
        );
        if (diff.hasChanges) {
          await this.auditService.logEvent({
            action: 'ASSET_UPDATED',
            entity: 'Asset',
            entityType: 'Hardware',
            entityId: id,
            severity: 'Info',
            status: 'Success',
            details: `Asset "${formatted.name}" (${formatted.tag}) updated (${diff.changedKeys.join(', ')})`,
            diffPayload: diff as unknown as Record<string, unknown>,
            oldValue: diff.oldValue ?? undefined,
            newValue: diff.newValue ?? undefined,
          });
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for updated asset "${id}"`,
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

    if (this.auditService && deletedIds.length > 0) {
      for (const id of deletedIds) {
        try {
          await this.auditService.logEvent({
            action: 'ASSET_DELETED',
            entity: 'Asset',
            entityType: 'Hardware',
            entityId: id,
            severity: 'Warning',
            status: 'Success',
            details: `Hardware asset "${id}" deleted in batch operation`,
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to record audit log for batch deleted asset "${id}"`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }

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

    let targetStatus: AssetStatus;
    if (dto.status) {
      targetStatus = mapAssetStatus(dto.status);
    } else if (dto.assignedToId) {
      targetStatus = AssetStatus.IN_USE;
    } else {
      targetStatus = AssetStatus.AVAILABLE;
    }

    const docUrl = dto.signedDocUrl;
    const hasDoc = Boolean(docUrl && docUrl.trim().length > 0);
    const isPending = !hasDoc;
    const hasPendingRecord = isPending;

    const updatePayload: Prisma.AssetUncheckedUpdateManyInput = {
      assignedToId: dto.assignedToId ? dto.assignedToId : null,
      status: targetStatus,
      hasPendingRecord,
    };

    const CHUNK_SIZE = 100;
    let totalAssigned = 0;
    const assignedIds: string[] = [];

    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);

      const chunkResult = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.asset.findMany({
          where: { id: { in: chunk } },
          select: { id: true, assignedToId: true, hasPendingRecord: true, status: true },
          take: chunk.length,
          orderBy: [{ id: 'asc' }],
        });

        const existingIds = existing.map((a) => a.id);
        if (existingIds.length === 0) {
          return { count: 0, assignedIds: [], existingAssets: [] };
        }

        const updateResult = await tx.asset.updateMany({
          where: { id: { in: existingIds } },
          data: updatePayload,
        });

        if (dto.assignedToId) {
          await tx.assetHandoverRecord.createMany({
            data: existingIds.map((assetId) => ({
              assetId,
              type: HandoverRecordType.ASSIGNMENT,
              recipientId: dto.assignedToId as string,
              signedDocUrl: hasDoc ? docUrl?.trim() : null,
              isPending,
              notes: hasDoc
                ? 'Batch assigned with signed handover record'
                : 'Batch assigned pending signed handover record',
            })),
          });
        } else {
          const previouslyAssigned = existing.filter((a) => Boolean(a.assignedToId));
          if (previouslyAssigned.length > 0) {
            await tx.assetHandoverRecord.createMany({
              data: previouslyAssigned.map((a) => ({
                assetId: a.id,
                type: HandoverRecordType.RETURN,
                recipientId: a.assignedToId,
                signedDocUrl: hasDoc ? docUrl?.trim() : null,
                isPending,
                notes: hasDoc
                  ? 'Batch unassigned (returned) with signed handover record'
                  : 'Batch unassigned (returned) pending signed handover record',
              })),
            });
          }
        }

        return { count: updateResult.count, assignedIds: existingIds, existingAssets: existing };
      });

      totalAssigned += chunkResult.count;
      assignedIds.push(...chunkResult.assignedIds);

      if (
        this.auditService &&
        chunkResult.existingAssets &&
        chunkResult.existingAssets.length > 0
      ) {
        for (const asset of chunkResult.existingAssets) {
          try {
            await this.auditService.logEvent({
              action: 'ASSET_ASSIGNED',
              entity: 'Asset',
              entityType: 'Hardware',
              entityId: asset.id,
              severity: isPending ? 'Warning' : 'Info',
              status: 'Success',
              details: `Asset assigned to recipient "${dto.assignedToId || 'Storage'}"${isPending ? ' (pending handover record)' : ''}`,
              oldValue: {
                assignedToId: asset.assignedToId,
                hasPendingRecord: asset.hasPendingRecord,
                status: asset.status,
              },
              newValue: {
                assignedToId: dto.assignedToId || null,
                hasPendingRecord,
                status: targetStatus,
              },
            });
          } catch (error: unknown) {
            this.logger.error(
              `Failed to record audit log for batch assigned asset "${asset.id}"`,
              error instanceof Error ? error.stack : String(error),
            );
          }
        }
      }
    }

    this.logger.log(`Batch assigned ${totalAssigned} assets (${uniqueIds.length} requested)`);

    if (this.notificationsService && dto.assignedToId && assignedIds.length > 0) {
      try {
        if (hasPendingRecord) {
          await this.notificationsService.notifyUser(dto.assignedToId, {
            title: 'Assets Assigned — Handover Record Pending',
            message: `${totalAssigned} hardware asset${totalAssigned > 1 ? 's have' : ' has'} been assigned to you. A signed handover record is pending. Please sign and upload the record.`,
            type: 'WARNING',
            link: '/assets',
          });
          await this.notificationsService.notifyAdmins({
            title: 'Pending Asset Handover Records',
            message: `${totalAssigned} hardware assets assigned to user without uploaded handover documentation. Flagged with Pending Record badge.`,
            type: 'WARNING',
            link: '/assets',
          });
        } else {
          await this.notificationsService.notifyUser(dto.assignedToId, {
            title: 'Assets Assigned',
            message: `${totalAssigned} hardware asset${totalAssigned > 1 ? 's have' : ' has'} been assigned to you with signed handover documentation attached.`,
            type: 'INFO',
            link: '/assets',
          });
        }
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

  buildHandoverDocumentHtml(params: HandoverDocumentParams): string {
    const isReturn = params.type === 'return';
    const isTransfer = params.type === 'transfer';
    const recipient = params.recipient;
    const transferor = params.transferor;
    const assets = params.assets;

    let equipmentRowsHtml = '';
    if (assets.length > 0) {
      equipmentRowsHtml = assets
        .map(
          (a, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td><strong style="color: #1e40af;">${escapeHtml(a.tag)}</strong></td>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        <td>${escapeHtml(`${a.manufacturer} ${a.model}`.trim() || '—')}</td>
        <td><code>${escapeHtml(a.serialNumber || 'N/A')}</code></td>
        <td>${escapeHtml(a.condition)}</td>
      </tr>`,
        )
        .join('');
    } else {
      equipmentRowsHtml = `
      <tr>
        <td style="text-align: center;">1</td>
        <td>AST-__________</td>
        <td>____________________</td>
        <td>____________________</td>
        <td>SN-_________________</td>
        <td>${isReturn ? '[ ] Normal [ ] Defective' : '[ ] Good / Operational'}</td>
      </tr>
      <tr>
        <td style="text-align: center;">2</td>
        <td>AST-__________</td>
        <td>____________________</td>
        <td>____________________</td>
        <td>SN-_________________</td>
        <td>${isReturn ? '[ ] Normal [ ] Defective' : '[ ] Good / Operational'}</td>
      </tr>`;
    }

    const orgName = recipient?.organization || transferor?.organization || 'Youngone Corporation';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)} — UIMS</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 18mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      padding: 32px 40px;
      max-width: 840px;
      margin: 0 auto;
      background: #ffffff;
      font-size: 12px;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #2563eb;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      font-size: 12px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-value {
      font-weight: 600;
      color: #0f172a;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      margin: 18px 0 10px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 12px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    .terms {
      font-size: 11px;
      color: #475569;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      line-height: 1.6;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .terms ol {
      margin: 4px 0 0 0;
      padding-left: 18px;
    }
    .signatures {
      display: grid;
      grid-template-columns: ${isTransfer ? '1fr 1fr 1fr' : '1fr 1fr'};
      gap: ${isTransfer ? '16px' : '28px'};
      margin-top: 24px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      background: #fff;
    }
    .sig-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .sig-details {
      font-size: 11px;
      color: #475569;
      margin-bottom: 36px;
      line-height: 1.6;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      font-size: 11px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body {
        padding: 0;
        margin: 0;
        max-width: 100%;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print {
        display: none !important;
      }
      thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .terms {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .signatures {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Unified IT Management System (UIMS)</div>
      <h1 class="title">${escapeHtml(params.title)}</h1>
      <p class="subtitle">${escapeHtml(params.subtitle)}</p>
    </div>
    <div style="text-align: right; font-size: 12px; color: #64748b;">
      <div>Ref ID: <strong>${escapeHtml(params.refId)}</strong></div>
      <div>Date: <strong>${escapeHtml(params.currentDate)}</strong></div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item">
      <span class="meta-label">Record Type</span>
      <span class="meta-value">${isTransfer ? 'Transfer (Reassignment)' : isReturn ? 'Return (To Storage)' : 'Handover (Assignment)'}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Execution Date</span>
      <span class="meta-value">${escapeHtml(params.currentDate)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Issued By</span>
      <span class="meta-value">IT Asset Management</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Organization</span>
      <span class="meta-value">${escapeHtml(orgName)}</span>
    </div>
  </div>

  <div class="section-title">1. Parties Involved</div>
  ${
    isTransfer
      ? `<table>
    <thead>
      <tr>
        <th style="width: 34%;">Transferor / Custodian A</th>
        <th style="width: 33%;">Transferee / Custodian B</th>
        <th style="width: 33%;">Witness / IT Representative</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div><strong>Name:</strong> ${transferor ? `<strong>${escapeHtml(transferor.fullName)}</strong>` : '___________________________________'}</div>
          <div style="margin-top: 4px;">
            <strong>Code:</strong> ${transferor?.employeeCode ? escapeHtml(transferor.employeeCode) : '—'}
            &nbsp;&nbsp;
            <strong>Dept:</strong> ${transferor?.department ? escapeHtml(transferor.department) : '—'}
          </div>
          <div style="margin-top: 4px;"><strong>Email:</strong> ${transferor?.email ? escapeHtml(transferor.email) : '—'}</div>
        </td>
        <td>
          <div><strong>Name:</strong> ${recipient ? `<strong>${escapeHtml(recipient.fullName)}</strong>` : '___________________________________'}</div>
          <div style="margin-top: 4px;">
            <strong>Code:</strong> ${recipient?.employeeCode ? escapeHtml(recipient.employeeCode) : '—'}
            &nbsp;&nbsp;
            <strong>Dept:</strong> ${recipient?.department ? escapeHtml(recipient.department) : '—'}
          </div>
          <div style="margin-top: 4px;"><strong>Email:</strong> ${recipient?.email ? escapeHtml(recipient.email) : '—'}</div>
        </td>
        <td>
          <div><strong>Name:</strong> IT Asset Administrator</div>
          <div style="margin-top: 4px;"><strong>Department:</strong> IT Infrastructure & Operations</div>
          <div style="margin-top: 4px;"><strong>Status:</strong> Custody Reassigned</div>
        </td>
      </tr>
    </tbody>
  </table>`
      : `<table>
    <thead>
      <tr>
        <th style="width: 50%;">IT Representative (${isReturn ? 'Receiver' : 'Issuer'})</th>
        <th style="width: 50%;">Employee / Custodian (${isReturn ? 'Returner' : 'Recipient'})</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div><strong>Name:</strong> IT Asset Administrator</div>
          <div style="margin-top: 4px;"><strong>Department:</strong> IT Infrastructure & Operations</div>
          <div style="margin-top: 4px;"><strong>Contact:</strong> it-support@youngonevn.com</div>
        </td>
        <td>
          <div><strong>Name:</strong> ${recipient ? `<strong>${escapeHtml(recipient.fullName)}</strong>` : '___________________________________'}</div>
          <div style="margin-top: 4px;">
            <strong>Code:</strong> ${recipient?.employeeCode ? escapeHtml(recipient.employeeCode) : '_________________'}
            &nbsp;&nbsp;
            <strong>Dept:</strong> ${recipient?.department ? escapeHtml(recipient.department) : '____________________'}
          </div>
          <div style="margin-top: 4px;"><strong>Email:</strong> ${recipient?.email ? escapeHtml(recipient.email) : '___________________________________'}</div>
        </td>
      </tr>
    </tbody>
  </table>`
  }

  <div class="section-title">2. Hardware Equipment Specifications (${assets.length} item${assets.length === 1 ? '' : 's'})</div>
  <table>
    <thead>
      <tr>
        <th style="width: 6%; text-align: center;">#</th>
        <th style="width: 20%;">Asset Tag</th>
        <th style="width: 24%;">Asset Name</th>
        <th style="width: 22%;">Manufacturer & Model</th>
        <th style="width: 14%;">Serial Number</th>
        <th style="width: 14%;">Condition</th>
      </tr>
    </thead>
    <tbody>
      ${equipmentRowsHtml}
    </tbody>
  </table>

  ${
    params.conditionNotes
      ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; font-size: 11.5px;">
          <strong>${isTransfer ? 'Transfer Condition Notes' : isReturn ? 'Return Inspection Notes' : 'Handover Notes & Remarks'}:</strong> ${escapeHtml(params.conditionNotes)}
        </div>`
      : ''
  }

  <div class="terms">
    <strong>Terms & Custody Acknowledgement:</strong>
    <ol>
      ${
        isTransfer
          ? `<li>Transferor confirms relinquishing physical custody and administrative responsibility for all equipment listed above.</li>
             <li>Transferee acknowledges physical receipt of the equipment in good working order and assumes all custody obligations.</li>
             <li>All equipment remains corporate property and must be maintained according to Youngone IT Asset Policies.</li>
             <li>The IT Department has verified the hardware state and updated the central asset custody registry effective immediately.</li>`
          : isReturn
            ? `<li>The employee confirms that all assigned hardware assets listed above have been returned to IT Department custody.</li>
               <li>All corporate data stored on local drives will be backed up or securely wiped in accordance with corporate information security standards.</li>
               <li>Physical hardware condition and returned accessories have been inspected and documented above.</li>`
            : `<li>The recipient acknowledges receipt of the equipment listed above in good working condition and verified specifications.</li>
               <li>The recipient agrees to follow corporate security policies, safeguard the equipment, and use it exclusively for authorized business purposes.</li>
               <li>The equipment remains company property and must be returned upon department transfer, role transition, or employment termination.</li>
               <li>Any physical damage, loss, theft, or hardware malfunction must be reported immediately to IT Asset Management.</li>`
      }
    </ol>
  </div>

  <div class="section-title">3. Acknowledgement & Signatures</div>
  <div class="signatures">
    ${
      isTransfer
        ? `<div class="sig-card">
      <div class="sig-title">Transferor (Custodian A)</div>
      <div class="sig-details">
        <div><strong>Name:</strong> ${transferor ? escapeHtml(transferor.fullName) : '__________________________'}</div>
        <div><strong>Code:</strong> ${transferor?.employeeCode ? escapeHtml(transferor.employeeCode) : '________________'}</div>
        <div><strong>Dept:</strong> ${transferor?.department ? escapeHtml(transferor.department) : '________________'}</div>
      </div>
      <div class="sig-line">
        <span>Signature: ______________________</span>
        <span>Date: ___/___/______</span>
      </div>
    </div>
    <div class="sig-card">
      <div class="sig-title">Transferee (Custodian B)</div>
      <div class="sig-details">
        <div><strong>Name:</strong> ${recipient ? escapeHtml(recipient.fullName) : '__________________________'}</div>
        <div><strong>Code:</strong> ${recipient?.employeeCode ? escapeHtml(recipient.employeeCode) : '________________'}</div>
        <div><strong>Dept:</strong> ${recipient?.department ? escapeHtml(recipient.department) : '________________'}</div>
      </div>
      <div class="sig-line">
        <span>Signature: ______________________</span>
        <span>Date: ___/___/______</span>
      </div>
    </div>
    <div class="sig-card">
      <div class="sig-title">IT Witness / Inspector</div>
      <div class="sig-details">
        <div><strong>Name:</strong> IT Asset Administrator</div>
        <div><strong>Title:</strong> IT Asset Custodian</div>
        <div><strong>Department:</strong> IT Operations</div>
      </div>
      <div class="sig-line">
        <span>Signature: ______________________</span>
        <span>Date: ___/___/______</span>
      </div>
    </div>`
        : `<div class="sig-card">
      <div class="sig-title">IT Department Representative (${isReturn ? 'Receiver' : 'Issuer'})</div>
      <div class="sig-details">
        <div><strong>Name:</strong> IT Asset Administrator</div>
        <div><strong>Title:</strong> IT Asset Custodian</div>
        <div><strong>Department:</strong> IT Infrastructure</div>
      </div>
      <div class="sig-line">
        <span>Signature: ______________________</span>
        <span>Date: ___/___/______</span>
      </div>
    </div>
    <div class="sig-card">
      <div class="sig-title">Employee / Custodian (${isReturn ? 'Returner' : 'Recipient'})</div>
      <div class="sig-details">
        <div><strong>Name:</strong> ${recipient ? escapeHtml(recipient.fullName) : '__________________________'}</div>
        <div><strong>Code:</strong> ${recipient?.employeeCode ? escapeHtml(recipient.employeeCode) : '________________'}</div>
        <div><strong>Dept:</strong> ${recipient?.department ? escapeHtml(recipient.department) : '________________'}</div>
      </div>
      <div class="sig-line">
        <span>Signature: ______________________</span>
        <span>Date: ___/___/______</span>
      </div>
    </div>`
    }
  </div>
</body>
</html>`;
  }

  async resolveHandoverParams(dto: GenerateHandoverDocumentDto): Promise<HandoverDocumentParams> {
    const isReturn = dto.type === 'return';
    const isTransfer = dto.type === 'transfer';
    const currentDate = new Date().toISOString().split('T')[0];
    const refId = `${isTransfer ? 'TRF' : isReturn ? 'RET' : 'HOR'}-${Date.now().toString(36).toUpperCase()}`;

    let recipient: {
      fullName: string;
      employeeCode?: string;
      department?: string;
      email?: string;
      organization?: string;
    } | null = null;

    let transferor: {
      fullName: string;
      employeeCode?: string;
      department?: string;
      email?: string;
      organization?: string;
    } | null = null;

    let assets: Array<{
      id?: string;
      tag: string;
      name: string;
      manufacturer?: string;
      model?: string;
      serialNumber?: string | null;
      condition: string;
    }> = [];

    if (dto.recipientId) {
      const user = await this.prisma.directoryUser.findUnique({
        where: { id: dto.recipientId },
        include: { department: true, organization: true },
      });
      if (user) {
        recipient = {
          fullName: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
          employeeCode: user.employeeCode || '—',
          department: user.department?.name || '—',
          email: user.email || '—',
          organization: user.organization?.name || 'Youngone Corporation',
        };
      }
    }

    if (dto.transferorId) {
      const tUser = await this.prisma.directoryUser.findUnique({
        where: { id: dto.transferorId },
        include: { department: true, organization: true },
      });
      if (tUser) {
        transferor = {
          fullName: tUser.displayName || `${tUser.firstName} ${tUser.lastName}`.trim(),
          employeeCode: tUser.employeeCode || '—',
          department: tUser.department?.name || '—',
          email: tUser.email || '—',
          organization: tUser.organization?.name || 'Youngone Corporation',
        };
      }
    }

    if (dto.assetIds && dto.assetIds.length > 0) {
      type AssetForDocument = Prisma.AssetGetPayload<{
        include: {
          deviceModel: { include: { category: true } };
          assignedTo: { include: { department: true; organization: true } };
          department: { include: { organization: true } };
        };
      }>;
      const foundAssets: AssetForDocument[] = [];
      const CHUNK_SIZE = 100;
      for (let i = 0; i < dto.assetIds.length; i += CHUNK_SIZE) {
        const chunk = dto.assetIds.slice(i, i + CHUNK_SIZE);
        const chunkFound = await this.prisma.asset.findMany({
          where: { id: { in: chunk } },
          include: {
            deviceModel: { include: { category: true } },
            assignedTo: { include: { department: true, organization: true } },
            department: { include: { organization: true } },
          },
          take: chunk.length,
          orderBy: [{ id: 'asc' }],
        });
        foundAssets.push(...chunkFound);
      }

      assets = foundAssets.map((a) => {
        const legacy = a as unknown as { name?: string; manufacturer?: string; model?: string };
        return {
          id: a.id,
          tag: a.assetTag || a.subcode || a.id,
          name: a.deviceModel?.name || legacy.name || 'Hardware Unit',
          manufacturer: a.deviceModel?.manufacturer || legacy.manufacturer || 'Generic',
          model: a.deviceModel?.modelCode || a.deviceModel?.name || legacy.model || 'Standard',
          serialNumber: a.serialNumber || 'N/A',
          condition: isReturn
            ? dto.conditionNotes || 'Returned / Inspected'
            : isTransfer
              ? dto.conditionNotes || 'Transferred / Operational'
              : 'Good / Operational',
        };
      });

      if (!recipient && isReturn && foundAssets.length > 0 && foundAssets[0].assignedTo) {
        const u = foundAssets[0].assignedTo;
        recipient = {
          fullName: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
          employeeCode: u.employeeCode || '—',
          department: u.department?.name || foundAssets[0].department?.name || '—',
          email: u.email || '—',
          organization: u.organization?.name || 'Youngone Corporation',
        };
      }

      if (!transferor && isTransfer && foundAssets.length > 0 && foundAssets[0].assignedTo) {
        const u = foundAssets[0].assignedTo;
        transferor = {
          fullName: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
          employeeCode: u.employeeCode || '—',
          department: u.department?.name || foundAssets[0].department?.name || '—',
          email: u.email || '—',
          organization: u.organization?.name || 'Youngone Corporation',
        };
      }
    }

    const title = isTransfer
      ? 'HARDWARE ASSET CUSTODY TRANSFER AGREEMENT'
      : isReturn
        ? 'HARDWARE ASSET RETURN RECORD'
        : 'HARDWARE ASSET HANDOVER RECORD';
    const subtitle = isTransfer
      ? 'Internal Equipment Relocation & Dual Custodian Handover'
      : isReturn
        ? 'Equipment Return & Custody Termination'
        : 'Equipment Assignment & Custody Transfer';

    return {
      title,
      subtitle,
      refId,
      type: dto.type,
      currentDate,
      recipient,
      transferor,
      assets,
      conditionNotes: dto.conditionNotes,
    };
  }

  getHandoverTemplateHtml(type: 'assignment' | 'return' | 'transfer' = 'assignment'): string {
    const isReturn = type === 'return';
    const isTransfer = type === 'transfer';
    const currentDate = new Date().toISOString().split('T')[0];
    const refId = `${isTransfer ? 'TRF' : isReturn ? 'RET' : 'HOR'}-${Date.now().toString(36).toUpperCase()}`;
    return this.buildHandoverDocumentHtml({
      title: isTransfer
        ? 'HARDWARE ASSET CUSTODY TRANSFER AGREEMENT'
        : isReturn
          ? 'HARDWARE ASSET RETURN RECORD'
          : 'HARDWARE ASSET HANDOVER RECORD',
      subtitle: isTransfer
        ? 'Internal Equipment Relocation & Dual Custodian Handover'
        : isReturn
          ? 'Equipment Return & Custody Termination'
          : 'Equipment Assignment & Custody Transfer',
      refId,
      type,
      currentDate,
      assets: [],
    });
  }

  async getHandoverTemplateDocx(
    type: 'assignment' | 'return' | 'transfer' = 'assignment',
  ): Promise<{ buffer: Buffer; filename: string }> {
    const isReturn = type === 'return';
    const isTransfer = type === 'transfer';
    const currentDate = new Date().toISOString().split('T')[0];
    const refId = `${isTransfer ? 'TRF' : isReturn ? 'RET' : 'HOR'}-${Date.now().toString(36).toUpperCase()}`;
    const filename = `asset_${isTransfer ? 'transfer' : isReturn ? 'return' : 'handover'}_template.docx`;
    const buffer = await buildHandoverDocx({
      title: isTransfer
        ? 'HARDWARE ASSET CUSTODY TRANSFER AGREEMENT'
        : isReturn
          ? 'HARDWARE ASSET RETURN RECORD'
          : 'HARDWARE ASSET HANDOVER RECORD',
      subtitle: isTransfer
        ? 'Internal Equipment Relocation & Dual Custodian Handover'
        : isReturn
          ? 'Equipment Return & Custody Termination'
          : 'Equipment Assignment & Custody Transfer',
      refId,
      type,
      currentDate,
      assets: [],
    });
    return { buffer, filename };
  }

  async generateHandoverDocument(dto: GenerateHandoverDocumentDto) {
    const params = await this.resolveHandoverParams(dto);
    const html = this.buildHandoverDocumentHtml(params);
    const isReturn = dto.type === 'return';
    const filename = `asset_${isReturn ? 'return' : 'handover'}_${params.currentDate}_${params.refId.toLowerCase()}.docx`;

    return {
      html,
      title: params.title,
      filename,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateHandoverDocx(
    dto: GenerateHandoverDocumentDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const params = await this.resolveHandoverParams(dto);
    const isReturn = dto.type === 'return';
    const filename = `asset_${isReturn ? 'return' : 'handover'}_${params.currentDate}_${params.refId.toLowerCase()}.docx`;
    const buffer = await buildHandoverDocx(params);
    return { buffer, filename };
  }

  async saveHandoverDocumentFile(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    assetId?: string,
  ) {
    if (!file || !file.buffer || file.size === 0 || file.buffer.length === 0) {
      throw new BadRequestException(
        'A non-empty document file is required (PDF, PNG, JPG, or JPEG up to 10MB).',
      );
    }

    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, PNG, JPG, and JPEG documents are permitted.',
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File exceeds the maximum permitted size of 10MB.');
    }

    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const rawExt = path.extname(file.originalname).toLowerCase();
    let ext: string;
    if (allowedExtensions.includes(rawExt)) {
      ext = rawExt;
    } else {
      const mime = file.mimetype.toLowerCase();
      if (mime.includes('pdf')) {
        ext = '.pdf';
      } else if (mime.includes('png')) {
        ext = '.png';
      } else {
        ext = '.jpg';
      }
    }
    const safeName = `handover-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const uploadDir = getHandoverUploadDir();
    const filePath = path.join(uploadDir, safeName);

    try {
      await fs.promises.writeFile(filePath, file.buffer);
    } catch (writeErr: unknown) {
      this.logger.error(
        `Failed to write handover document file "${safeName}" to disk`,
        writeErr instanceof Error ? writeErr.stack : String(writeErr),
      );
      throw new InternalServerErrorException(
        'Failed to save uploaded document file due to storage error.',
      );
    }

    const fileUrl = `/api/v1/assets/handover-documents/file/${safeName}`;

    let assetResult = undefined;
    const cleanAssetId = assetId?.trim() || undefined;
    if (cleanAssetId) {
      try {
        assetResult = await this.attachHandoverDocument(cleanAssetId, fileUrl);
      } catch (attachErr: unknown) {
        try {
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        } catch (cleanupErr: unknown) {
          this.logger.warn(
            `Failed to cleanup temporary handover document file "${filePath}" after error`,
            cleanupErr instanceof Error ? cleanupErr.stack : String(cleanupErr),
          );
        }
        throw attachErr;
      }
    }

    return {
      fileUrl,
      fileName: safeName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      asset: assetResult,
    };
  }

  async streamHandoverDocumentFile(
    filename: string,
    res: Response,
    isAttachment = false,
  ): Promise<void> {
    const sanitized = path.basename(filename).replace(/\0/g, '');
    const uploadDir = getHandoverUploadDir();
    const filePath = path.resolve(uploadDir, sanitized);

    const ext = path.extname(sanitized).toLowerCase();
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];

    if (
      !allowedExtensions.includes(ext) ||
      !filePath.startsWith(uploadDir + path.sep) ||
      !fs.existsSync(filePath) ||
      !fs.statSync(filePath).isFile()
    ) {
      throw new NotFoundException(`Handover document file "${sanitized}" not found`);
    }

    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const dispositionType = isAttachment ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${sanitized}"`);
    res.setHeader('Cache-Control', 'private, max-age=86400');

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err: unknown) => {
      this.logger.error(
        `Failed to stream handover document file "${sanitized}"`,
        err instanceof Error ? err.stack : String(err),
      );
      if (!res.headersSent) {
        res.status(500).json({ statusCode: 500, message: 'Failed to stream handover document' });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  }

  async attachHandoverDocument(id: string, fileUrl: string, recordId?: string, notes?: string) {
    const existing = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        deviceModel: { include: { category: true, vendor: true } },
        assignedTo: { include: { organization: true } },
        department: { include: { organization: true } },
        costCenter: true,
        handoverRecords: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Asset with ID "${id}" not found`);
    }

    let resolvedRecordId: string | undefined = undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      let targetRecord: { id: string; notes: string | null } | null = null;
      let effectiveNotes = notes;
      let actualRecordId = recordId;

      if (recordId && notes === undefined && /\s/.test(recordId)) {
        actualRecordId = undefined;
        effectiveNotes = recordId;
      }

      if (actualRecordId) {
        targetRecord = await tx.assetHandoverRecord.findFirst({
          where: { id: actualRecordId, assetId: id },
          select: { id: true, notes: true },
        });
        if (!targetRecord && !notes) {
          effectiveNotes = actualRecordId;
        }
      }
      if (!targetRecord) {
        targetRecord = await tx.assetHandoverRecord.findFirst({
          where: { assetId: id, isPending: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { id: true, notes: true },
        });
      }

      if (targetRecord) {
        resolvedRecordId = targetRecord.id;
        const isTransferRecord = Boolean(
          targetRecord.notes?.startsWith('Transfer:') ||
            targetRecord.notes?.includes('Custody transferred'),
        );

        if (
          isTransferRecord &&
          !actualRecordId &&
          typeof tx.assetHandoverRecord?.updateMany === 'function'
        ) {
          // Resolve both parts of the custody transfer agreement with the uploaded transfer document
          await tx.assetHandoverRecord.updateMany({
            where: {
              assetId: id,
              isPending: true,
              OR: [
                { notes: { startsWith: 'Transfer:' } },
                { notes: { contains: 'Custody transferred' } },
              ],
            },
            data: {
              signedDocUrl: fileUrl,
              isPending: false,
            },
          });
        } else {
          await tx.assetHandoverRecord.update({
            where: { id: targetRecord.id },
            data: {
              signedDocUrl: fileUrl,
              isPending: false,
              notes: effectiveNotes
                ? `${targetRecord.notes ? `${targetRecord.notes}; ` : ''}${effectiveNotes}`
                : targetRecord.notes,
            },
          });
        }
      } else {
        const createdRecord = await tx.assetHandoverRecord.create({
          data: {
            assetId: id,
            type: existing.assignedToId ? HandoverRecordType.ASSIGNMENT : HandoverRecordType.RETURN,
            recipientId: existing.assignedToId || null,
            signedDocUrl: fileUrl,
            isPending: false,
            notes: effectiveNotes || 'Signed handover document attached directly',
          },
        });
        resolvedRecordId = createdRecord.id;
      }

      const pendingRemaining =
        typeof tx.assetHandoverRecord?.count === 'function'
          ? await tx.assetHandoverRecord.count({
              where: { assetId: id, isPending: true },
            })
          : 0;

      const updated = await tx.asset.update({
        where: { id },
        data: {
          hasPendingRecord: pendingRemaining > 0,
        },
        include: {
          deviceModel: { include: { category: true, vendor: true } },
          assignedTo: { include: { organization: true } },
          department: { include: { organization: true } },
          costCenter: true,
          handoverRecords: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 5,
          },
        },
      });

      return updated;
    });

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'ASSET_RECORD_RESOLVED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: id,
          severity: 'Info',
          status: 'Success',
          details: `Signed handover document attached to asset (${existing.subcode || existing.assetTag || id}). Pending record resolved. File: ${fileUrl}`,
          oldValue: { hasPendingRecord: existing.hasPendingRecord },
          newValue: { hasPendingRecord: result.hasPendingRecord, signedDocUrl: fileUrl },
        });
      } catch (auditErr: unknown) {
        this.logger.error(
          `Failed to log audit event for resolving record on asset "${id}"`,
          auditErr instanceof Error ? auditErr.stack : String(auditErr),
        );
      }
    }

    if (
      this.notificationsService &&
      typeof this.notificationsService.clearHandoverDocumentAlert === 'function'
    ) {
      try {
        await this.notificationsService.clearHandoverDocumentAlert(resolvedRecordId || id, id);
      } catch (notifyErr: unknown) {
        this.logger.warn(
          `Failed to clear handover alert for asset "${id}": ${notifyErr instanceof Error ? notifyErr.message : String(notifyErr)}`,
        );
      }
    }

    return this.formatAsset(result as unknown as AssetWithRelations);
  }

  async allocate(dto: AllocateAssetDto) {
    if (!dto.assetIds || !Array.isArray(dto.assetIds) || dto.assetIds.length === 0) {
      throw new BadRequestException(
        'At least one physical asset unit ID is required for allocation',
      );
    }

    const uniqueIds = Array.from(new Set(dto.assetIds.map((id) => id.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Valid asset unit IDs are required for allocation');
    }

    const recipient = await this.prisma.directoryUser.findUnique({
      where: { id: dto.assignedToId },
      include: { department: true, organization: true },
    });
    if (!recipient) {
      throw new NotFoundException(`Directory user with ID "${dto.assignedToId}" not found`);
    }

    if (recipient.status === 'SUSPENDED' || recipient.status === 'DISABLED') {
      throw new BadRequestException(
        `Cannot allocate assets to ${recipient.status.toLowerCase()} employee`,
      );
    }

    const targetDepartmentId = dto.departmentId || recipient.departmentId || null;
    const docUrl = dto.signedDocUrl?.trim();
    const hasDoc = Boolean(docUrl && docUrl.length > 0);
    const isPending = !hasDoc;

    const allocatedUnits = await this.prisma.$transaction(async (tx) => {
      const units = await tx.asset.findMany({
        where: { id: { in: uniqueIds } },
        include: { deviceModel: true },
      });

      if (units.length !== uniqueIds.length) {
        const foundSet = new Set(units.map((u) => u.id));
        const missing = uniqueIds.filter((id) => !foundSet.has(id));
        throw new NotFoundException(`Physical units not found: ${missing.join(', ')}`);
      }

      const unavailable = units.filter(
        (u) => u.status !== AssetStatus.AVAILABLE || u.assignedToId !== null,
      );
      if (unavailable.length > 0) {
        throw new ConflictException(
          `Cannot allocate unit(s) ${unavailable.map((u) => u.subcode || u.assetTag).join(', ')}: units must be AVAILABLE in inventory`,
        );
      }

      await tx.asset.updateMany({
        where: { id: { in: uniqueIds } },
        data: {
          assignedToId: recipient.id,
          departmentId: targetDepartmentId,
          costCenterId: dto.costCenterId || undefined,
          status: AssetStatus.IN_USE,
          hasPendingRecord: isPending,
        },
      });

      await tx.assetHandoverRecord.createMany({
        data: uniqueIds.map((assetId) => ({
          assetId,
          type: HandoverRecordType.ASSIGNMENT,
          recipientId: recipient.id,
          signedDocUrl: hasDoc ? docUrl : null,
          isPending,
          notes:
            dto.conditionNotes ||
            dto.notes ||
            (hasDoc
              ? 'Allocated with signed handover document'
              : 'Allocated pending signed handover document'),
        })),
      });

      return units;
    });

    if (this.auditService) {
      for (const unit of allocatedUnits) {
        try {
          await this.auditService.logEvent({
            action: 'ASSET_ALLOCATED',
            entity: 'Asset',
            entityType: 'Hardware',
            entityId: unit.id,
            severity: isPending ? 'Warning' : 'Info',
            status: 'Success',
            details: `Asset unit "${unit.subcode || unit.assetTag}" allocated to ${recipient.displayName || recipient.firstName} (${recipient.email})${isPending ? ' (pending signed record)' : ''}`,
            oldValue: {
              status: unit.status,
              assignedToId: unit.assignedToId,
              hasPendingRecord: unit.hasPendingRecord,
            },
            newValue: {
              status: AssetStatus.IN_USE,
              assignedToId: recipient.id,
              hasPendingRecord: isPending,
            },
          });
        } catch (auditErr: unknown) {
          this.logger.error(
            `Failed to log audit event for allocated asset "${unit.id}"`,
            auditErr instanceof Error ? auditErr.stack : String(auditErr),
          );
        }
      }
    }

    if (this.notificationsService) {
      try {
        const appUser =
          typeof this.prisma.appUser?.findFirst === 'function'
            ? await this.prisma.appUser.findFirst({
                where: {
                  OR: [
                    { id: recipient.id },
                    ...(recipient.email
                      ? [{ email: { equals: recipient.email, mode: 'insensitive' as const } }]
                      : []),
                  ],
                },
                select: { id: true },
              })
            : { id: recipient.id };

        if (isPending) {
          if (appUser) {
            await this.notificationsService.notifyUser(appUser.id, {
              title: 'Equipment Allocated — Pending Signature',
              message: `${uniqueIds.length} equipment unit(s) have been allocated to you. Please review and upload the signed handover document.`,
              type: 'WARNING',
              link: '/assets',
            });
          }
          await this.notificationsService.notifyAdmins({
            title: 'Pending Asset Handover Record',
            message: `${uniqueIds.length} equipment unit(s) allocated to ${recipient.displayName || recipient.firstName} without uploaded signed record.`,
            type: 'WARNING',
            link: '/assets',
          });
        } else {
          if (appUser) {
            await this.notificationsService.notifyUser(appUser.id, {
              title: 'Equipment Allocated',
              message: `${uniqueIds.length} equipment unit(s) have been allocated to you with signed handover documentation attached.`,
              type: 'INFO',
              link: '/assets',
            });
          }
        }
      } catch (notifyErr: unknown) {
        this.logger.error(
          `Failed to dispatch allocation notification for recipient "${recipient.id}"`,
          notifyErr instanceof Error ? notifyErr.stack : String(notifyErr),
        );
      }
    }

    return {
      success: true,
      count: uniqueIds.length,
      allocatedIds: uniqueIds,
      assignedToId: recipient.id,
      hasPendingRecord: isPending,
    };
  }

  async allocateUnits(dto: AllocateAssetDto) {
    return this.allocate(dto);
  }

  async returnUnits(dto: ReturnAssetDto) {
    const rawIds = dto.assetIds || [];
    const uniqueIds = Array.from(new Set(rawIds.map((id) => id.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      throw new BadRequestException('At least one physical asset unit ID is required for return');
    }

    const rawTarget = dto.targetStatus || dto.status || 'AVAILABLE';
    const normalizedRaw = String(rawTarget).toUpperCase().trim();
    const validReturnInputs = ['AVAILABLE', 'IN STORAGE', 'MAINTENANCE', 'IN REPAIR', 'RETIRED'];
    if (!validReturnInputs.includes(normalizedRaw)) {
      throw new BadRequestException(
        `Invalid return target status: ${rawTarget}. Permitted statuses: AVAILABLE, MAINTENANCE, RETIRED`,
      );
    }
    const targetStatus = mapAssetStatus(rawTarget);

    const docUrl = dto.signedDocUrl?.trim();
    const hasDoc = Boolean(docUrl && docUrl.length > 0);
    const isPending = !hasDoc;
    const returnTimestamp = new Date().toISOString().split('T')[0];

    const returnedAssets = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.asset.findMany({
        where: { id: { in: uniqueIds } },
        include: { deviceModel: true },
      });

      if (existing.length !== uniqueIds.length) {
        const foundSet = new Set(existing.map((u) => u.id));
        const missing = uniqueIds.filter((id) => !foundSet.has(id));
        throw new NotFoundException(`Physical units not found: ${missing.join(', ')}`);
      }

      const notInUse = existing.filter((u) => u.status !== AssetStatus.IN_USE);
      if (notInUse.length > 0) {
        throw new ConflictException(
          `Unit(s) ${notInUse.map((u) => u.subcode || u.assetTag).join(', ')} are not currently IN_USE (status: ${notInUse.map((u) => u.status).join(', ')})`,
        );
      }

      for (const unit of existing) {
        const previousRecipientId = unit.assignedToId;
        const conditionNotes = dto.conditionNotes || dto.inspectionNotes || dto.notes;
        const updatedNotes = conditionNotes
          ? `${unit.notes ? `${unit.notes}\n` : ''}[Return ${returnTimestamp}]: ${conditionNotes}`
          : unit.notes;

        await tx.assetHandoverRecord.create({
          data: {
            assetId: unit.id,
            type: HandoverRecordType.RETURN,
            recipientId: previousRecipientId,
            signedDocUrl: hasDoc ? docUrl : null,
            isPending,
            notes:
              conditionNotes ||
              (hasDoc ? 'Returned with signed document' : 'Returned pending signed document'),
          },
        });

        await tx.asset.update({
          where: { id: unit.id },
          data: {
            assignedToId: null,
            status: targetStatus,
            hasPendingRecord: isPending,
            notes: updatedNotes,
          },
        });
      }

      return existing;
    });

    if (this.auditService && returnedAssets.length > 0) {
      for (const unit of returnedAssets) {
        try {
          await this.auditService.logEvent({
            action: 'ASSET_RETURNED',
            entity: 'Asset',
            entityType: 'Hardware',
            entityId: unit.id,
            severity: isPending ? 'Warning' : 'Info',
            status: 'Success',
            details: `Asset unit "${unit.subcode || unit.assetTag}" returned to inventory (${targetStatus})${isPending ? ' (pending signed record)' : ''}`,
            oldValue: { status: unit.status, assignedToId: unit.assignedToId },
            newValue: { status: targetStatus, assignedToId: null, hasPendingRecord: isPending },
          });
        } catch (auditErr: unknown) {
          this.logger.error(
            `Failed to log audit event for returned asset "${unit.id}"`,
            auditErr instanceof Error ? auditErr.stack : String(auditErr),
          );
        }
      }
    }

    return {
      success: true,
      count: returnedAssets.length,
      returnedIds: returnedAssets.map((u) => u.id),
      status: targetStatus,
      hasPendingRecord: isPending,
    };
  }

  async transfer(dto: TransferAssetDto) {
    if (!dto.assetIds || !Array.isArray(dto.assetIds) || dto.assetIds.length === 0) {
      throw new BadRequestException('At least one physical asset unit ID is required for transfer');
    }
    const uniqueIds = Array.from(new Set(dto.assetIds.map((id) => id.trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Valid asset unit IDs are required for transfer');
    }

    const toUser = await this.prisma.directoryUser.findUnique({
      where: { id: dto.toUserId },
      include: { department: true, organization: true },
    });

    if (!toUser) {
      throw new NotFoundException(`Destination directory user with ID "${dto.toUserId}" not found`);
    }

    if (toUser.status === 'SUSPENDED' || toUser.status === 'DISABLED') {
      throw new BadRequestException(
        `Cannot transfer asset to ${toUser.status.toLowerCase()} employee`,
      );
    }

    const docUrl = dto.signedDocUrl?.trim();
    const hasDoc = Boolean(docUrl && docUrl.length > 0);
    const isPending = !hasDoc;
    const targetDeptId = dto.toDepartmentId || toUser.departmentId || null;
    const transferTimestamp = new Date().toISOString().split('T')[0];

    const transferredUnits = await this.prisma.$transaction(async (tx) => {
      const units = await tx.asset.findMany({
        where: { id: { in: uniqueIds } },
        include: { deviceModel: true, assignedTo: true },
      });

      if (units.length !== uniqueIds.length) {
        const foundSet = new Set(units.map((u) => u.id));
        const missing = uniqueIds.filter((id) => !foundSet.has(id));
        throw new NotFoundException(`Physical units not found: ${missing.join(', ')}`);
      }

      for (const unit of units) {
        if (unit.status !== AssetStatus.IN_USE) {
          throw new BadRequestException(
            `Asset ${unit.subcode || unit.assetTag} is not IN_USE (status: ${unit.status})`,
          );
        }
        if (unit.assignedToId === toUser.id) {
          throw new BadRequestException(
            `Asset ${unit.subcode || unit.assetTag} is already assigned to destination user "${toUser.id}"`,
          );
        }
        if (dto.fromUserId && unit.assignedToId !== dto.fromUserId) {
          throw new ConflictException(
            `Asset ${unit.subcode || unit.assetTag} is currently assigned to user "${unit.assignedToId}", not "${dto.fromUserId}"`,
          );
        }
      }

      for (const unit of units) {
        const previousCustodianId = unit.assignedToId || null;
        const previousCustodianName = unit.assignedTo
          ? unit.assignedTo.displayName ||
            `${unit.assignedTo.firstName} ${unit.assignedTo.lastName}`.trim()
          : 'Previous Custodian';

        // Supersede any prior pending assignment records for releasing custodian on this asset
        if (previousCustodianId && typeof tx.assetHandoverRecord?.updateMany === 'function') {
          await tx.assetHandoverRecord.updateMany({
            where: {
              assetId: unit.id,
              recipientId: previousCustodianId,
              type: HandoverRecordType.ASSIGNMENT,
              isPending: true,
            },
            data: {
              isPending: false,
              notes: 'Superseded by custody transfer',
            },
          });
        }

        // 1. HandoverRecordType.RETURN for releasing custodian (Custodian A)
        await tx.assetHandoverRecord.create({
          data: {
            assetId: unit.id,
            type: HandoverRecordType.RETURN,
            recipientId: previousCustodianId,
            signedDocUrl: hasDoc ? dto.returnSignedDocUrl || docUrl : null,
            isPending,
            notes:
              dto.transferReason || dto.notes
                ? `Transfer: ${dto.transferReason || dto.notes}`
                : `Custody transferred to ${toUser.displayName || toUser.firstName}`,
          },
        });

        // 2. HandoverRecordType.ASSIGNMENT for receiving custodian (Custodian B)
        await tx.assetHandoverRecord.create({
          data: {
            assetId: unit.id,
            type: HandoverRecordType.ASSIGNMENT,
            recipientId: toUser.id,
            signedDocUrl: hasDoc ? dto.assignmentSignedDocUrl || docUrl : null,
            isPending,
            notes:
              dto.transferReason || dto.notes
                ? `Transfer: ${dto.transferReason || dto.notes}`
                : `Custody transferred from ${previousCustodianName}`,
          },
        });

        const conditionNotes = dto.conditionNotes || dto.notes || dto.transferReason;
        const updatedNotes = conditionNotes
          ? `${unit.notes ? `${unit.notes}\n` : ''}[Transfer ${transferTimestamp}]: ${conditionNotes}`
          : unit.notes;

        await tx.asset.update({
          where: { id: unit.id },
          data: {
            assignedToId: toUser.id,
            departmentId: targetDeptId,
            status: AssetStatus.IN_USE,
            hasPendingRecord: isPending,
            notes: updatedNotes,
          },
        });
      }

      return units;
    });

    if (this.auditService) {
      for (const unit of transferredUnits) {
        try {
          await this.auditService.logEvent({
            action: 'ASSET_TRANSFERRED',
            entity: 'Asset',
            entityType: 'Hardware',
            entityId: unit.id,
            severity: isPending ? 'Warning' : 'Info',
            status: 'Success',
            details: `Asset unit "${unit.subcode || unit.assetTag}" transferred to ${toUser.displayName || toUser.firstName}${isPending ? ' (pending signed record)' : ''}`,
            oldValue: { assignedToId: unit.assignedToId, status: unit.status },
            newValue: {
              assignedToId: toUser.id,
              status: AssetStatus.IN_USE,
              hasPendingRecord: isPending,
            },
          });
        } catch (auditErr: unknown) {
          this.logger.error(
            `Failed to log audit event for transferred asset "${unit.id}"`,
            auditErr instanceof Error ? auditErr.stack : String(auditErr),
          );
        }
      }
    }

    if (this.notificationsService) {
      try {
        const appUser =
          typeof this.prisma.appUser?.findFirst === 'function'
            ? await this.prisma.appUser.findFirst({
                where: {
                  OR: [
                    { id: toUser.id },
                    ...(toUser.email
                      ? [{ email: { equals: toUser.email, mode: 'insensitive' as const } }]
                      : []),
                  ],
                },
                select: { id: true },
              })
            : { id: toUser.id };

        if (appUser) {
          await this.notificationsService.notifyUser(appUser.id, {
            title: 'Equipment Transferred to You',
            message: `${uniqueIds.length} equipment unit(s) transferred to your custody.${isPending ? ' Please upload the signed transfer agreement.' : ''}`,
            type: isPending ? 'WARNING' : 'INFO',
            link: '/assets',
          });
        }

        if (isPending) {
          await this.notificationsService.notifyAdmins({
            title: 'Pending Asset Transfer Record',
            message: `${uniqueIds.length} equipment unit(s) transferred to ${toUser.displayName || toUser.firstName} without uploaded signed transfer record.`,
            type: 'WARNING',
            link: '/assets',
          });
        }
      } catch (notifyErr: unknown) {
        this.logger.error(
          `Failed to dispatch transfer notification for recipient "${toUser.id}"`,
          notifyErr instanceof Error ? notifyErr.stack : String(notifyErr),
        );
      }
    }

    return {
      success: true,
      count: uniqueIds.length,
      transferredIds: uniqueIds,
      toUserId: toUser.id,
      hasPendingRecord: isPending,
    };
  }

  async transferUnits(dto: TransferAssetDto) {
    return this.transfer(dto);
  }

  async batchIntakeUnits(data: BatchStockIntakeDto) {
    if (!data.deviceModelId) {
      throw new BadRequestException('deviceModelId is required for batch stock intake');
    }

    const model = await this.prisma.deviceModel.findUnique({
      where: { id: data.deviceModelId },
    });
    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Device model with ID "${data.deviceModelId}" not found`);
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

    return this.batchIntake(data.deviceModelId, data);
  }

  async returnAsset(id: string, dto: ReturnAssetDto) {
    const existing = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        deviceModel: { include: { category: true, vendor: true } },
        assignedTo: { include: { organization: true } },
        department: { include: { organization: true } },
        costCenter: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Asset with ID "${id}" not found`);
    }

    const displayName = existing.deviceModel?.name || existing.subcode || existing.assetTag || id;

    if (existing.status !== AssetStatus.IN_USE) {
      throw new BadRequestException(
        `Asset "${displayName}" is not currently IN_USE (status: ${existing.status})`,
      );
    }

    const previousRecipientId = existing.assignedToId;
    const rawTarget = dto.targetStatus || dto.status || 'AVAILABLE';
    const normalizedRaw = String(rawTarget).toUpperCase().trim();
    const validReturnInputs = ['AVAILABLE', 'IN STORAGE', 'MAINTENANCE', 'IN REPAIR', 'RETIRED'];
    if (!validReturnInputs.includes(normalizedRaw)) {
      throw new BadRequestException(
        `Invalid return target status: ${rawTarget}. Permitted statuses: AVAILABLE, MAINTENANCE, RETIRED`,
      );
    }
    const targetStatus = mapAssetStatus(rawTarget);

    const conditionNotes = dto.conditionNotes || dto.inspectionNotes || dto.notes;
    const docUrl = dto.signedDocUrl;
    const hasDoc = Boolean(docUrl && docUrl.trim().length > 0);
    const isPending = !hasDoc;
    const hasPendingRecord = !hasDoc;

    const returnTimestamp = new Date().toISOString().split('T')[0];
    const updatedNotes = conditionNotes
      ? `${existing.notes ? `${existing.notes}\n` : ''}[Return ${returnTimestamp}]: ${conditionNotes}`
      : existing.notes;

    const result = await this.prisma.$transaction(async (tx) => {
      const handoverRecord = await tx.assetHandoverRecord.create({
        data: {
          assetId: id,
          type: HandoverRecordType.RETURN,
          recipientId: previousRecipientId,
          signedDocUrl: hasDoc ? docUrl?.trim() : null,
          isPending,
          notes: conditionNotes || null,
        },
      });

      const updated = await tx.asset.update({
        where: { id },
        data: {
          status: targetStatus,
          assignedToId: null,
          hasPendingRecord,
          notes: updatedNotes,
        },
        include: {
          deviceModel: { include: { category: true, vendor: true } },
          assignedTo: { include: { organization: true } },
          department: { include: { organization: true } },
          costCenter: true,
          handoverRecords: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 5,
          },
        },
      });

      return { asset: updated, handoverRecord };
    });

    if (this.notificationsService && isPending) {
      try {
        if (previousRecipientId) {
          await this.notificationsService.notifyUser(previousRecipientId, {
            title: 'Pending Return Record',
            message: `Asset "${displayName}" (${existing.subcode || existing.assetTag || id}) was returned without a signed record. Please upload the signed return document.`,
            type: 'WARNING',
            link: `/assets?drawer=${id}`,
          });
        }
        await this.notificationsService.notifyAdmins({
          title: 'Pending Asset Return Record',
          message: `Asset "${displayName}" (${existing.subcode || existing.assetTag || id}) was returned without a signed document. Marked with Pending Record badge.`,
          type: 'WARNING',
          link: `/assets?drawer=${id}`,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch pending return record notification for asset "${displayName}"`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    try {
      const auditData: LogEventDto = {
        action: 'ASSET_RETURNED',
        entity: 'Asset',
        entityType: 'Hardware',
        entityId: id,
        severity: isPending ? 'Warning' : 'Info',
        status: 'Success',
        details: `Asset "${existing.deviceModel?.name || 'Hardware'}" (${existing.assetTag || existing.subcode || id}) returned. Status: ${targetStatus}. Signed doc: ${hasDoc ? 'Attached' : 'Pending'}.${dto.conditionNotes ? ` Notes: ${dto.conditionNotes}` : ''}`,
        oldValue: {
          status: existing.status,
          assignedToId: previousRecipientId,
          hasPendingRecord: existing.hasPendingRecord,
        },
        newValue: {
          status: targetStatus,
          assignedToId: null,
          hasPendingRecord,
          handoverRecordId: result.handoverRecord.id,
        },
      };

      if (this.auditService) {
        await this.auditService.logEvent(auditData);
      } else {
        await this.prisma.auditLog.create({
          data: {
            userName: 'System Engine',
            userEmail: 'daemon@youngonevn.com',
            action: auditData.action,
            severity: auditData.severity || 'Info',
            entity: auditData.entity,
            entityType: auditData.entityType || 'Hardware',
            entityId: auditData.entityId,
            ipAddress: '127.0.0.1 (Localhost)',
            status: 'Success',
            statusCode: 200,
            details: auditData.details || '',
            oldValue: auditData.oldValue as Prisma.InputJsonValue,
            newValue: auditData.newValue as Prisma.InputJsonValue,
          },
        });
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to record audit log for asset return "${id}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return this.formatAsset(result.asset as unknown as AssetWithRelations);
  }

  async remove(id: string) {
    const existing = await this.prisma.asset.findUnique({
      where: { id },
      include: { deviceModel: true },
    });
    if (!existing) {
      throw new NotFoundException(`Asset with ID "${id}" not found`);
    }
    const deleted = await this.prisma.asset.delete({ where: { id } });

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'ASSET_DELETED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: id,
          severity: 'Warning',
          status: 'Success',
          details: `Hardware asset "${existing.deviceModel?.name || deleted.subcode || deleted.assetTag || id}" (${existing.subcode || existing.assetTag || deleted.subcode || deleted.assetTag || id}) deleted`,
          oldValue: existing as unknown as Record<string, unknown>,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for deleted asset "${id}"`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return deleted;
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

    const handoverRecords = (
      asset as {
        handoverRecords?: Array<{
          id: string;
          type: string;
          signedDocUrl?: string | null;
          isPending: boolean;
          notes?: string | null;
          createdAt?: Date;
        }>;
      }
    ).handoverRecords;
    const latestHandover = handoverRecords?.[0] || null;
    const signedRecord = handoverRecords?.find((r) => Boolean(r.signedDocUrl));
    const signedDocUrl = signedRecord?.signedDocUrl || latestHandover?.signedDocUrl || null;

    const deviceModel = asset.deviceModel;

    return {
      id: asset.id,
      deviceModelId: asset.deviceModelId,
      parentId: asset.deviceModelId || null,
      deviceModel: deviceModel
        ? {
            id: deviceModel.id,
            name: deviceModel.name,
            modelCode: deviceModel.modelCode,
            manufacturer: deviceModel.manufacturer,
            categoryId: deviceModel.categoryId,
            categoryName: deviceModel.category?.name || 'Hardware',
            unitCost: Number(deviceModel.unitCost),
            minThreshold: deviceModel.minThreshold,
            binLocation: deviceModel.binNumber || null,
            specifications: deviceModel.specifications,
          }
        : null,
      subcode: asset.subcode || null,
      assetTag: asset.assetTag || asset.subcode || '',
      tag: asset.assetTag || asset.subcode || '',
      name: deviceModel?.name || (asset as { name?: string }).name || 'Unknown Unit',
      description: deviceModel?.name || (asset as { description?: string }).description || '',
      manufacturer:
        deviceModel?.manufacturer || (asset as { manufacturer?: string }).manufacturer || 'Generic',
      model: deviceModel?.name || (asset as { model?: string }).model || 'Standard',
      modelCode: deviceModel?.modelCode || null,
      serialNumber: asset.serialNumber || null,
      specifications: deviceModel?.specifications
        ? typeof deviceModel.specifications === 'string'
          ? deviceModel.specifications
          : JSON.stringify(deviceModel.specifications)
        : null,
      unitCost: deviceModel ? Number(deviceModel.unitCost) : null,
      categoryId: deviceModel?.categoryId || null,
      category: deviceModel?.category?.name || 'Hardware',
      costCenterId: asset.costCenterId || null,
      costCenter: asset.costCenter
        ? {
            id: asset.costCenter.id,
            code: asset.costCenter.code,
            name: asset.costCenter.name,
            description: asset.costCenter.description,
          }
        : null,
      status: statusLabel,
      assignedToId: asset.assignedToId,
      assignedTo: assignedUserName,
      assignedUser: assignedUserName,
      assignedEmail: asset.assignedTo?.email || '',
      departmentId: asset.departmentId,
      department: asset.department?.name || '',
      organizationId: asset.department?.organizationId || asset.assignedTo?.organizationId || null,
      organization:
        asset.department?.organization?.name || asset.assignedTo?.organization?.name || null,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : '',
      hasPendingRecord: Boolean(asset.hasPendingRecord),
      signedDocUrl,
      latestHandoverRecord: latestHandover
        ? {
            id: latestHandover.id,
            type: latestHandover.type,
            signedDocUrl: latestHandover.signedDocUrl || null,
            isPending: Boolean(latestHandover.isPending),
            notes: latestHandover.notes || null,
            createdAt: latestHandover.createdAt
              ? latestHandover.createdAt.toISOString()
              : undefined,
          }
        : null,
      notes: asset.notes || '',
      createdAt: asset.createdAt ? asset.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: asset.updatedAt ? asset.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  // =========================================================================
  // Device Models Management (Catalog CRUD & Telemetry)
  // =========================================================================

  async createModel(data: CreateDeviceModelDto) {
    const rawModelCode = data.modelCode || data.assetCode;
    if (!rawModelCode || rawModelCode.trim().length === 0) {
      throw new BadRequestException('Model code is required');
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Device model name is required');
    }

    const normalizedModelCode = rawModelCode.trim().toUpperCase();

    const existing = await this.prisma.deviceModel.findUnique({
      where: { modelCode: normalizedModelCode },
    });
    if (existing) {
      throw new ConflictException(
        `Device model with modelCode "${normalizedModelCode}" already exists. Model codes must be unique.`,
      );
    }

    let categoryId = data.categoryId;
    if (!categoryId || categoryId.trim().length === 0) {
      const defaultCat = await this.prisma.assetCategory.findFirst();
      if (defaultCat) {
        categoryId = defaultCat.id;
      } else {
        throw new BadRequestException('Category ID is required');
      }
    } else {
      const cat = await this.prisma.assetCategory.findUnique({ where: { id: categoryId } });
      if (!cat) {
        throw new NotFoundException(`Asset category with ID "${categoryId}" not found`);
      }
    }

    if (data.unitCost !== undefined && data.unitCost < 0) {
      throw new BadRequestException('Unit cost cannot be negative');
    }

    if (data.vendorId) {
      const vendor = await this.prisma.vendor.findUnique({ where: { id: data.vendorId } });
      if (!vendor) {
        throw new NotFoundException(`Vendor with ID "${data.vendorId}" not found`);
      }
    }

    let parsedSpecs: Prisma.InputJsonValue = {};
    if (data.specifications) {
      if (typeof data.specifications === 'string') {
        try {
          parsedSpecs = JSON.parse(data.specifications) as Prisma.InputJsonValue;
        } catch {
          parsedSpecs = { details: data.specifications };
        }
      } else {
        parsedSpecs = data.specifications as Prisma.InputJsonValue;
      }
    }

    const created = await this.prisma.deviceModel.create({
      data: {
        name: data.name.trim(),
        modelCode: normalizedModelCode,
        categoryId: categoryId,
        manufacturer: data.manufacturer?.trim() || 'Generic',
        vendorId: data.vendorId || null,
        specifications: parsedSpecs,
        unitCost: data.unitCost !== undefined ? Number(data.unitCost) : 0,
        minThreshold: data.minThreshold !== undefined ? Number(data.minThreshold) : 5,
        binNumber: data.binNumber?.trim() || data.binLocation?.trim() || null,
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    return this.getModel(created.id);
  }

  async getModel(id: string) {
    const model = await this.prisma.deviceModel.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
      },
    });

    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    const [totalUnits, availableUnits, inUseUnits, maintenanceUnits] = await Promise.all([
      this.prisma.asset.count({ where: { deviceModelId: id } }),
      this.prisma.asset.count({ where: { deviceModelId: id, status: AssetStatus.AVAILABLE } }),
      this.prisma.asset.count({ where: { deviceModelId: id, status: AssetStatus.IN_USE } }),
      this.prisma.asset.count({ where: { deviceModelId: id, status: AssetStatus.MAINTENANCE } }),
    ]);

    const childUnits =
      (await this.prisma.asset.findMany({
        where: { deviceModelId: id },
        include: {
          deviceModel: { include: { category: true, vendor: true } },
          assignedTo: { include: { organization: true } },
          department: { include: { organization: true } },
          costCenter: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: 100,
      })) || [];

    return {
      id: model.id,
      name: model.name,
      modelCode: model.modelCode,
      assetCode: model.modelCode,
      parentId: null,
      manufacturer: model.manufacturer,
      model: model.name,
      categoryId: model.categoryId,
      category: model.category?.name || 'Hardware',
      vendorId: model.vendorId,
      vendor: model.vendor?.name || null,
      vendorName: model.vendor?.name || null,
      specifications: model.specifications,
      unitCost: Number(model.unitCost),
      minThreshold: model.minThreshold,
      binNumber: model.binNumber,
      binLocation: model.binNumber,
      totalUnits,
      availableUnits,
      inUseUnits,
      maintenanceUnits,
      childUnits: (childUnits || []).map((c) =>
        this.formatAsset(c as unknown as AssetWithRelations),
      ),
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    };
  }

  async listModels(query?: AssetQueryDto) {
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
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 10));
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
    const countsMap = new Map<
      string,
      { total: number; available: number; inUse: number; maintenance: number }
    >();

    if (modelIds.length > 0) {
      const stats = await this.prisma.asset.groupBy({
        by: ['deviceModelId', 'status'],
        where: { deviceModelId: { in: modelIds } },
        _count: { _all: true },
      });

      for (const stat of stats) {
        if (!stat.deviceModelId) continue;
        const current = countsMap.get(stat.deviceModelId) || {
          total: 0,
          available: 0,
          inUse: 0,
          maintenance: 0,
        };
        current.total += stat._count._all;
        if (stat.status === AssetStatus.AVAILABLE) {
          current.available += stat._count._all;
        } else if (stat.status === AssetStatus.IN_USE) {
          current.inUse += stat._count._all;
        } else if (stat.status === AssetStatus.MAINTENANCE) {
          current.maintenance += stat._count._all;
        }
        countsMap.set(stat.deviceModelId, current);
      }
    }

    const items = models.map((m) => {
      const counts = countsMap.get(m.id) || { total: 0, available: 0, inUse: 0, maintenance: 0 };
      return {
        id: m.id,
        name: m.name,
        modelCode: m.modelCode,
        assetCode: m.modelCode,
        manufacturer: m.manufacturer,
        model: m.name,
        categoryId: m.categoryId,
        category: m.category?.name || 'Hardware',
        vendorId: m.vendorId,
        vendor: m.vendor?.name || null,
        vendorName: m.vendor?.name || null,
        specifications: m.specifications,
        unitCost: Number(m.unitCost),
        minThreshold: m.minThreshold,
        binNumber: m.binNumber,
        binLocation: m.binNumber,
        totalUnits: counts.total,
        availableUnits: counts.available,
        inUseUnits: counts.inUse,
        maintenanceUnits: counts.maintenance,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
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
    const model = await this.prisma.deviceModel.findUnique({
      where: { id },
    });
    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    const updateData: Prisma.DeviceModelUpdateInput = {};

    const rawCode = data.modelCode || data.assetCode;
    if (rawCode !== undefined) {
      if (rawCode.trim().length === 0) {
        throw new BadRequestException('Model code cannot be empty');
      }
      const normalized = rawCode.trim().toUpperCase();
      const existing = await this.prisma.deviceModel.findFirst({
        where: {
          id: { not: id },
          modelCode: { equals: normalized, mode: 'insensitive' },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Device model with modelCode "${normalized}" already exists. Model codes must be unique.`,
        );
      }
      updateData.modelCode = normalized;
    }

    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new BadRequestException('Device model name cannot be empty');
      }
      updateData.name = data.name.trim();
    }

    if (data.manufacturer !== undefined) {
      updateData.manufacturer = data.manufacturer.trim() || 'Generic';
    }

    if (data.specifications !== undefined) {
      if (typeof data.specifications === 'string') {
        try {
          updateData.specifications = JSON.parse(data.specifications) as Prisma.InputJsonValue;
        } catch {
          updateData.specifications = { details: data.specifications };
        }
      } else {
        updateData.specifications = data.specifications as Prisma.InputJsonValue;
      }
    }

    if (data.unitCost !== undefined) {
      if (data.unitCost < 0) throw new BadRequestException('Unit cost cannot be negative');
      updateData.unitCost = Number(data.unitCost);
    }

    if (data.minThreshold !== undefined) {
      if (data.minThreshold < 0)
        throw new BadRequestException('Minimum threshold cannot be negative');
      updateData.minThreshold = Number(data.minThreshold);
    }

    if (data.binNumber !== undefined || data.binLocation !== undefined) {
      updateData.binNumber = (data.binNumber || data.binLocation)?.trim() || null;
    }

    if (data.categoryId !== undefined) {
      const cat = await this.prisma.assetCategory.findUnique({ where: { id: data.categoryId } });
      if (!cat)
        throw new NotFoundException(`Asset category with ID "${data.categoryId}" not found`);
      updateData.category = { connect: { id: data.categoryId } };
    }

    if (data.vendorId !== undefined) {
      if (data.vendorId) {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: data.vendorId } });
        if (!vendor) throw new NotFoundException(`Vendor with ID "${data.vendorId}" not found`);
        updateData.vendor = { connect: { id: data.vendorId } };
      } else {
        updateData.vendor = { disconnect: true };
      }
    }

    await this.prisma.deviceModel.update({
      where: { id },
      data: updateData,
    });

    return this.getModel(id);
  }

  async deleteModel(id: string) {
    const model = await this.prisma.deviceModel.findUnique({ where: { id } });
    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Device model with ID ${id} not found`);
    }

    const childCount = await this.prisma.asset.count({ where: { deviceModelId: id } });
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot delete device model with ${childCount} active physical units. Decommission or delete units first.`,
      );
    }

    await this.prisma.deviceModel.delete({ where: { id } });
    return { success: true, id };
  }

  async getModelUnits(modelId: string, query?: AssetQueryDto) {
    const model = await this.prisma.deviceModel.findUnique({ where: { id: modelId } });
    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Device model with ID ${modelId} not found`);
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AssetWhereInput = { deviceModelId: modelId };
    if (query?.status) where.status = mapAssetStatus(query.status);

    const [total, units] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        include: {
          deviceModel: { include: { category: true, vendor: true } },
          costCenter: true,
          assignedTo: { include: { organization: true } },
          department: { include: { organization: true } },
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
    const rawSubcode = data.subcode || data.assetTag;
    if (!rawSubcode || rawSubcode.trim().length === 0) {
      throw new BadRequestException('Subcode is required for physical units');
    }
    const modelId = data.deviceModelId;
    if (!modelId || modelId.trim().length === 0) {
      throw new BadRequestException('deviceModelId is required for physical units');
    }

    const model = await this.prisma.deviceModel.findUnique({ where: { id: modelId } });
    if (!model || model.deletedAt !== null) {
      const isExistingUnit = await this.prisma.asset.findUnique({ where: { id: modelId } });
      if (isExistingUnit) {
        throw new BadRequestException(
          'Cannot register unit under another physical unit. Parent must be a device model.',
        );
      }
      throw new NotFoundException(`Device model with ID ${modelId} not found`);
    }

    const normalizedSubcode = rawSubcode.trim().toUpperCase();

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

    let resolvedDeptId = data.departmentId;
    if (resolvedDeptId) {
      const dept = await this.prisma.department.findUnique({ where: { id: resolvedDeptId } });
      if (!dept) {
        throw new NotFoundException(`Department with ID ${resolvedDeptId} not found`);
      }
    } else if (typeof this.prisma.department?.findFirst === 'function') {
      const firstDept = await this.prisma.department.findFirst();
      if (firstDept) {
        resolvedDeptId = firstDept.id;
      }
    }

    const created = await this.prisma.asset.create({
      data: {
        deviceModelId: model.id,
        subcode: normalizedSubcode,
        assetTag: normalizedSubcode,
        status: data.status ? mapAssetStatus(data.status) : AssetStatus.AVAILABLE,
        serialNumber: data.serialNumber?.trim() || null,
        costCenterId: data.costCenterId || null,
        departmentId: resolvedDeptId || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        notes: data.notes?.trim() || null,
      },
      include: {
        deviceModel: { include: { category: true, vendor: true } },
        costCenter: true,
        department: { include: { organization: true } },
        assignedTo: { include: { organization: true } },
      },
    });

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'ASSET_CREATED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: created.id,
          severity: 'Info',
          status: 'Success',
          details: `Physical unit "${created.subcode}" registered under model "${model.name}"`,
          newValue: {
            id: created.id,
            subcode: created.subcode,
            assetTag: created.assetTag,
            deviceModelId: created.deviceModelId,
            status: created.status,
          },
        });
      } catch (auditErr: unknown) {
        this.logger.error(
          `Failed to log audit event for registered unit "${created.id}"`,
          auditErr instanceof Error ? auditErr.stack : String(auditErr),
        );
      }
    }

    return this.getUnit(created.id);
  }

  async batchIntake(modelId: string, data: BatchStockIntakeDto) {
    const targetModelId = modelId || data.deviceModelId;
    if (!targetModelId) {
      throw new BadRequestException('deviceModelId is required for batch stock intake');
    }

    const model = await this.prisma.deviceModel.findUnique({ where: { id: targetModelId } });
    if (!model || model.deletedAt !== null) {
      throw new NotFoundException(`Device model with ID "${targetModelId}" not found`);
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

    const createdUnits = await this.prisma.$transaction(async (tx) => {
      if (data.initialBinLocation && data.initialBinLocation.trim()) {
        await tx.deviceModel.update({
          where: { id: model.id },
          data: { binNumber: data.initialBinLocation.trim() },
        });
      }

      const unitsToCreate = [];
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
            costCenterId: data.costCenterId || null,
            purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
            warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
            notes: data.notes?.trim() || null,
          },
        });
        unitsToCreate.push(unit);
      }

      return unitsToCreate;
    });

    if (this.auditService) {
      try {
        await this.auditService.logEvent({
          action: 'BATCH_STOCK_INTAKE',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: model.id,
          severity: 'Info',
          status: 'Success',
          details: `Batch stock intake of ${createdUnits.length} physical units for model "${model.name}" (${model.modelCode})`,
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to record audit log for batch intake on model "${model.id}"`,
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

  async getUnit(id: string) {
    const unit = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        deviceModel: { include: { category: true, vendor: true } },
        costCenter: true,
        department: { include: { organization: true } },
        assignedTo: { include: { organization: true } },
        handoverRecords: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    if (!unit) {
      throw new NotFoundException(`Physical unit with ID ${id} not found`);
    }

    return this.formatAsset(unit as unknown as AssetWithRelations);
  }

  async updateUnit(id: string, data: UpdatePhysicalUnitDto) {
    const unit = await this.prisma.asset.findUnique({ where: { id } });
    if (!unit) {
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
    if (!unit) {
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
    const isModel = await this.prisma.deviceModel.findUnique({ where: { id: unitId } });
    if (isModel) {
      throw new BadRequestException(
        'Cannot issue a device model blueprint. Only physical units can be issued.',
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

    await this.allocate({
      assetIds: [unitId],
      assignedToId: user.id,
      departmentId: user.departmentId || undefined,
      notes: data.notes?.trim(),
    });

    return this.getUnit(unitId);
  }

  async checkinUnit(unitId: string, notes?: string) {
    const isModel = await this.prisma.deviceModel.findUnique({ where: { id: unitId } });
    if (isModel) {
      throw new BadRequestException(
        'Cannot check in a device model blueprint. Only physical units can be checked in.',
      );
    }

    const unit = await this.prisma.asset.findUnique({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException(`Asset with ID ${unitId} not found`);
    }

    await this.returnUnits({
      assetIds: [unitId],
      conditionNotes: notes,
      targetStatus: 'AVAILABLE',
      status: 'AVAILABLE',
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
