import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AssetStatus } from '@uims/shared-types';
import { AssetsService } from './assets.service';
import { BatchDeleteAssetDto } from './dto/batch-delete-asset.dto';

describe('AssetsService', () => {
  let service: AssetsService;
  let mockPrisma: Record<string, unknown>;

  let mockNotificationsService: Record<string, ReturnType<typeof vi.fn>>;
  let mockAuditService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockNotificationsService = {
      notifyUser: vi.fn().mockResolvedValue(undefined),
      notifyAdmins: vi.fn().mockResolvedValue(undefined),
    };
    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
      asset: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      assetCategory: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      directoryUser: {
        findUnique: vi.fn(),
      },
      assetHandoverRecord: {
        create: vi.fn(),
        createMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new AssetsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      mockNotificationsService as unknown as import('../notifications/notifications.service').NotificationsService,
      mockAuditService as unknown as import('../audit/audit.service').AuditService,
    );
  });

  describe('create', () => {
    it('should create an asset with atomic category lookup within transaction', async () => {
      mockPrisma.assetCategory.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });

      mockPrisma.asset.create.mockResolvedValue({
        id: 'ast-1',
        assetTag: 'AST-1001',
        name: 'MacBook Pro 16',
        manufacturer: 'Apple',
        model: 'M3 Max',
        serialNumber: 'C02XYZ123',
        status: AssetStatus.IN_USE,
        purchaseDate: new Date('2026-01-15'),
        warrantyExpiry: new Date('2029-01-15'),
        categoryId: 'cat-1',
        category: { name: 'Laptops' },
        assignedTo: { firstName: 'Alex', lastName: 'Johnson', email: 'alex@company.com' },
        notes: 'Lead engineer laptop',
      });

      const result = await service.create({
        name: 'MacBook Pro 16',
        category: 'Laptops',
        status: 'Active',
        serialNumber: 'C02XYZ123',
        manufacturer: 'Apple',
        model: 'M3 Max',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe('ast-1');
      expect(result.status).toBe('Active');
      expect(result.assignedTo).toBe('Alex Johnson');
      expect(result.categoryId).toBe('cat-1');
    });

    it('should automatically set status to IN_USE when assignedToId is provided', async () => {
      mockPrisma.assetCategory.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.directoryUser.findUnique.mockResolvedValue({ id: 'dir-1' });

      mockPrisma.asset.create.mockResolvedValue({
        id: 'ast-2',
        assetTag: 'AST-1002',
        name: 'ThinkPad T14',
        status: AssetStatus.IN_USE,
        assignedToId: 'dir-1',
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Laptops' },
        assignedTo: { firstName: 'Alex', lastName: 'Johnson', email: 'alex@company.com' },
      });

      const asset = await service.create({
        name: 'ThinkPad T14',
        categoryId: 'cat-1',
        assignedToId: 'dir-1',
      });

      expect(asset.status).toBe('Active');
      expect(mockPrisma.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: AssetStatus.IN_USE, assignedToId: 'dir-1' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should transition status to AVAILABLE when asset is unassigned', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.IN_USE,
        assignedToId: 'dir-1',
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
        category: { name: 'Laptops' },
      });

      const updated = await service.update('ast-1', { assignedToId: null });
      expect(updated.status).toBe('In Storage');
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssetStatus.AVAILABLE,
            assignedTo: { disconnect: true },
          }),
        }),
      );
    });

    it('should transition status to IN_USE when available asset is assigned to a user', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.IN_USE,
        assignedToId: 'dir-1',
        category: { name: 'Laptops' },
        assignedTo: { firstName: 'Alice', lastName: 'Engineer', email: 'alice@company.com' },
      });

      const updated = await service.update('ast-1', { assignedToId: 'dir-1' });
      expect(updated.status).toBe('Active');
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssetStatus.IN_USE,
            assignedTo: { connect: { id: 'dir-1' } },
          }),
        }),
      );
    });

    it('should respect explicit status overrides (e.g. MAINTENANCE) during user assignment', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.MAINTENANCE,
        assignedToId: 'dir-1',
        category: { name: 'Laptops' },
        assignedTo: { firstName: 'Alice', lastName: 'Engineer', email: 'alice@company.com' },
      });

      const updated = await service.update('ast-1', {
        assignedToId: 'dir-1',
        status: 'In Repair',
      });
      expect(updated.status).toBe('In Repair');
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssetStatus.MAINTENANCE,
            assignedTo: { connect: { id: 'dir-1' } },
          }),
        }),
      );
    });

    it('should preserve MAINTENANCE status when unassigning an asset without explicit status', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.MAINTENANCE,
        assignedToId: 'dir-1',
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-1',
        status: AssetStatus.MAINTENANCE,
        assignedToId: null,
        category: { name: 'Laptops' },
      });

      await service.update('ast-1', { assignedToId: null });
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            status: AssetStatus.AVAILABLE,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should query assets with search query and pagination bounds', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'ast-1',
          assetTag: 'AST-1001',
          name: 'Dell XPS 15',
          status: AssetStatus.AVAILABLE,
          category: { name: 'Laptops' },
          assignedTo: null,
        },
      ]);

      const result = await service.findAll({ search: 'Dell', page: 1, pageSize: 20 });

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('In Storage');
    });
  });

  describe('getStats', () => {
    it('should aggregate asset counts across statuses', async () => {
      mockPrisma.asset.count
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(110) // IN_USE
        .mockResolvedValueOnce(15) // MAINTENANCE
        .mockResolvedValueOnce(20) // AVAILABLE
        .mockResolvedValueOnce(5); // RETIRED

      const stats = await service.getStats();

      expect(stats.total).toBe(150);
      expect(stats.active).toBe(110);
      expect(stats.inRepair).toBe(15);
      expect(stats.inStorage).toBe(20);
      expect(stats.retired).toBe(5);
    });
  });

  describe('getCategories', () => {
    it('should query assetCategory and return categories with derived code', async () => {
      const mockCats = [
        { id: 'cat-1', name: 'Laptops', description: 'Laptops', parentId: null },
        { id: 'cat-2', name: 'Network Switches', description: 'Switches', parentId: null },
      ];
      mockPrisma.assetCategory.findMany.mockResolvedValue(mockCats);

      const result = await service.getCategories();

      expect(mockPrisma.assetCategory.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          description: true,
          parentId: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: 100,
      });
      expect(result).toEqual([
        { id: 'cat-1', name: 'Laptops', code: 'LAPTOPS', parentId: null },
        { id: 'cat-2', name: 'Network Switches', code: 'NETWORK_SWITCHES', parentId: null },
      ]);
    });
  });

  describe('formatAsset', () => {
    it('should format asset core fields and retain notes cleanly', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-sw-1',
        assetTag: 'AST-1010',
        name: 'Cisco Catalyst 9300-48P',
        status: AssetStatus.IN_USE,
        category: { name: 'Network Switches' },
        assignedTo: null,
        notes: 'Rack 4 - Switch 2',
      });

      const result = await service.findOne('ast-sw-1');

      expect(result.id).toBe('ast-sw-1');
      expect(result.notes).toBe('Rack 4 - Switch 2');
      expect(result).not.toHaveProperty('specs');
    });

    it('should handle multiline notes, Unicode, and empty notes gracefully in formatting', async () => {
      const multilineNotes = 'Line 1: Rack 01\nLine 2: Port 24\r\nLine 3: 10G uplink';
      mockPrisma.asset.findUnique.mockResolvedValueOnce({
        id: 'ast-ml-1',
        assetTag: 'AST-1011',
        name: 'Switch 01',
        status: AssetStatus.IN_USE,
        notes: multilineNotes,
      });

      const multilineResult = await service.findOne('ast-ml-1');
      expect(multilineResult.notes).toBe(multilineNotes);
      expect(multilineResult).not.toHaveProperty('specs');

      const unicodeNotes = 'Thiết bị cấp cho phòng Kỹ thuật công nghệ 🚀';
      mockPrisma.asset.findUnique.mockResolvedValueOnce({
        id: 'ast-uni-1',
        assetTag: 'AST-1012',
        name: 'Workstation',
        status: AssetStatus.AVAILABLE,
        notes: unicodeNotes,
      });

      const unicodeResult = await service.findOne('ast-uni-1');
      expect(unicodeResult.notes).toBe(unicodeNotes);
      expect(unicodeResult).not.toHaveProperty('specs');

      mockPrisma.asset.findUnique.mockResolvedValueOnce({
        id: 'ast-null-1',
        assetTag: 'AST-1013',
        name: 'Monitor',
        status: AssetStatus.AVAILABLE,
        notes: null,
      });

      const nullResult = await service.findOne('ast-null-1');
      expect(nullResult.notes).toBe('');
      expect(nullResult).not.toHaveProperty('specs');
    });
  });

  describe('update notes', () => {
    it('should update asset notes cleanly and omit specs', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-upd-1',
        assetTag: 'AST-1014',
      });
      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-upd-1',
        assetTag: 'AST-1014',
        name: 'Updated Server',
        status: AssetStatus.IN_USE,
        notes: 'Updated deployment notes',
      });

      const result = await service.update('ast-upd-1', {
        notes: 'Updated deployment notes',
      });

      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ast-upd-1' },
          data: expect.objectContaining({
            notes: 'Updated deployment notes',
          }),
        }),
      );
      expect(result.notes).toBe('Updated deployment notes');
      expect(result).not.toHaveProperty('specs');
    });
  });

  describe('exportXlsx', () => {
    function createMockResponse() {
      const stream = new PassThrough();
      const mockRes = stream as unknown as Response &
        PassThrough & {
          setHeader: ReturnType<typeof vi.fn>;
          status: ReturnType<typeof vi.fn>;
          json: ReturnType<typeof vi.fn>;
          headersSent: boolean;
        };
      mockRes.setHeader = vi.fn();
      mockRes.status = vi.fn().mockReturnThis();
      mockRes.json = vi.fn().mockReturnThis();
      mockRes.headersSent = false;
      return mockRes;
    }

    it('should set headers and stream styled workbook to response', async () => {
      const mockRes = createMockResponse();

      mockPrisma.asset.findMany.mockResolvedValueOnce([
        {
          id: 'ast-1',
          assetTag: 'AST-1001',
          name: 'MacBook Pro 16',
          status: AssetStatus.IN_USE,
          serialNumber: 'SN123456',
          purchaseDate: new Date('2026-01-15'),
          warrantyExpiry: new Date('2029-01-15'),
          category: { name: 'Laptops' },
          department: { name: 'Engineering' },
          assignedTo: { firstName: 'Alice', lastName: 'Johnson' },
        },
      ]);

      await service.exportXlsx({}, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/^attachment; filename="assets_export_\d{4}-\d{2}-\d{2}\.xlsx"$/),
      );

      // Verify generated workbook content and styles
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.read(mockRes);

      const worksheet = readWorkbook.getWorksheet('Hardware Assets');
      expect(worksheet).toBeDefined();
      expect(worksheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });

      const headerRow = worksheet?.getRow(1);
      expect(headerRow?.getCell(1).value).toBe('Asset Tag');
      expect(headerRow?.getCell(2).value).toBe('Name');
      expect(headerRow?.getCell(3).value).toBe('Category');
      expect(headerRow?.getCell(4).value).toBe('Status');
      expect(headerRow?.getCell(5).value).toBe('Department');
      expect(headerRow?.getCell(6).value).toBe('Serial Number');
      expect(headerRow?.getCell(7).value).toBe('Purchase Cost');
      expect(headerRow?.getCell(8).value).toBe('Purchase Date');
      expect(headerRow?.getCell(9).value).toBe('Warranty Expiry');
      expect(headerRow?.getCell(10).value).toBe('Assigned To');

      // Verify header cell style
      const headerCell = headerRow?.getCell(1);
      expect(headerCell?.fill).toMatchObject({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1677FF' },
      });
      expect(headerCell?.font).toMatchObject({
        bold: true,
        color: { argb: 'FFFFFFFF' },
      });

      // Verify data row
      const dataRow = worksheet?.getRow(2);
      expect(dataRow?.getCell(1).value).toBe('AST-1001');
      expect(dataRow?.getCell(2).value).toBe('MacBook Pro 16');
      expect(dataRow?.getCell(3).value).toBe('Laptops');
      expect(dataRow?.getCell(4).value).toBe('Active');
      expect(dataRow?.getCell(5).value).toBe('Engineering');
      expect(dataRow?.getCell(6).value).toBe('SN123456');
      expect(dataRow?.getCell(7).numFmt).toBe('$#,##0.00');
      expect(dataRow?.getCell(8).numFmt).toBe('yyyy-mm-dd');
      expect(dataRow?.getCell(9).numFmt).toBe('yyyy-mm-dd');
      expect(dataRow?.getCell(10).value).toBe('Alice Johnson');

      // Verify column width bounds
      worksheet?.columns.forEach((col) => {
        expect(col.width).toBeGreaterThanOrEqual(13);
        expect(col.width).toBeLessThanOrEqual(45);
      });
    });

    it('should paginate with cursor batches of 100 per AGENTS.md 16.3', async () => {
      const mockRes = createMockResponse();

      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `ast-${i + 1}`,
        assetTag: `AST-${1000 + i}`,
        name: `Device ${i + 1}`,
        status: AssetStatus.AVAILABLE,
        serialNumber: `SN-${i + 1}`,
        category: { name: 'Devices' },
        department: { name: 'IT' },
        assignedTo: null,
      }));

      const batch2 = Array.from({ length: 25 }, (_, i) => ({
        id: `ast-${101 + i}`,
        assetTag: `AST-${1100 + i}`,
        name: `Device ${101 + i}`,
        status: AssetStatus.AVAILABLE,
        serialNumber: `SN-${101 + i}`,
        category: { name: 'Devices' },
        department: { name: 'IT' },
        assignedTo: null,
      }));

      mockPrisma.asset.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

      await service.exportXlsx({}, mockRes);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(2);

      // First query: no cursor
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: { id: 'asc' },
        }),
      );

      // Second query: cursor on last element of batch 1 ('ast-100')
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          take: 100,
          skip: 1,
          cursor: { id: 'ast-100' },
          orderBy: { id: 'asc' },
        }),
      );

      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.read(mockRes);
      const worksheet = readWorkbook.getWorksheet('Hardware Assets');
      expect(worksheet?.rowCount).toBe(126); // 1 header + 125 data rows
    });

    it('should handle export error and return HTTP 500 when headers are not sent', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        end: vi.fn(),
        headersSent: false,
      } as unknown as Response;

      mockPrisma.asset.findMany.mockRejectedValueOnce(new Error('Database query timeout'));

      await service.exportXlsx({}, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Failed to generate Excel export',
        }),
      );
    });
  });

  describe('batchDelete', () => {
    it('should execute batch deletion in transaction and return count and deletedIds', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([{ id: 'ast-1' }, { id: 'ast-2' }]);
      mockPrisma.asset.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.batchDelete(['ast-1', 'ast-2']);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['ast-1', 'ast-2'] } },
        select: { id: true },
        take: 2,
        orderBy: [{ id: 'asc' }],
      });
      expect(mockPrisma.asset.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['ast-1', 'ast-2'] } },
      });
      expect(result).toEqual({
        count: 2,
        deletedIds: ['ast-1', 'ast-2'],
      });
    });

    it('should partition large batches (>100 items) into multiple chunked transactions', async () => {
      const sampleIds = Array.from({ length: 150 }, (_, i) => `ast-${i + 1}`);

      // First chunk: 100 items, second chunk: 50 items
      mockPrisma.asset.findMany
        .mockResolvedValueOnce(sampleIds.slice(0, 100).map((id) => ({ id })))
        .mockResolvedValueOnce(sampleIds.slice(100, 150).map((id) => ({ id })));

      mockPrisma.asset.deleteMany
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 50 });

      const result = await service.batchDelete(sampleIds);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
      expect(result.count).toBe(150);
      expect(result.deletedIds).toHaveLength(150);
    });

    it('should return 0 count and empty deletedIds without hitting database when input is empty array', async () => {
      const result = await service.batchDelete([]);

      expect(result).toEqual({ count: 0, deletedIds: [] });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only or non-string IDs gracefully', async () => {
      const result = await service.batchDelete(['   ', '']);

      expect(result).toEqual({ count: 0, deletedIds: [] });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should deduplicate IDs before transaction execution', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([{ id: 'ast-1' }]);
      mockPrisma.asset.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.batchDelete(['ast-1', 'ast-1', 'ast-1']);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['ast-1'] } },
        }),
      );
      expect(result.count).toBe(1);
      expect(result.deletedIds).toEqual(['ast-1']);
    });

    it('should return 0 count when none of the specified IDs exist in the database', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);

      const result = await service.batchDelete(['ast-nonexistent-1', 'ast-nonexistent-2']);

      expect(mockPrisma.asset.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual({ count: 0, deletedIds: [] });
    });
  });

  describe('BatchDeleteAssetDto validation', () => {
    it('should validate valid array of ID strings', async () => {
      const dto = plainToInstance(BatchDeleteAssetDto, {
        ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b8c3445e-653a-43d9-a75d-59508d5e08b1'],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when ids array is empty', async () => {
      const dto = plainToInstance(BatchDeleteAssetDto, { ids: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.arrayNotEmpty).toBeDefined();
    });

    it('should fail when elements are not strings', async () => {
      const dto = plainToInstance(BatchDeleteAssetDto, { ids: [123, null] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when elements are empty strings', async () => {
      const dto = plainToInstance(BatchDeleteAssetDto, { ids: [''] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('batchAssign', () => {
    it('should return empty result when assetIds is empty or invalid', async () => {
      const res1 = await service.batchAssign({ assetIds: [] });
      expect(res1).toEqual({ count: 0, assignedIds: [] });

      const res2 = await service.batchAssign({ assetIds: ['   ', ''] });
      expect(res2).toEqual({ count: 0, assignedIds: [] });
    });

    it('should throw NotFoundException if assignedToId user does not exist', async () => {
      (
        mockPrisma.directoryUser as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValue(null);

      await expect(
        service.batchAssign({
          assetIds: ['ast-1'],
          assignedToId: 'nonexistent-user',
        }),
      ).rejects.toThrow('Directory user with ID "nonexistent-user" not found');
    });

    it('should batch assign with pending record and dispatch warning when signedDocUrl is omitted', async () => {
      (
        mockPrisma.directoryUser as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValue({
        id: 'usr-1',
        firstName: 'John',
        lastName: 'Doe',
      });
      (mockPrisma.asset as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
        { id: 'ast-1' },
        { id: 'ast-2' },
      ]);
      (mockPrisma.asset as { updateMany: ReturnType<typeof vi.fn> }).updateMany.mockResolvedValue({
        count: 2,
      });
      (
        mockPrisma.assetHandoverRecord as { createMany: ReturnType<typeof vi.fn> }
      ).createMany.mockResolvedValue({ count: 2 });

      const res = await service.batchAssign({
        assetIds: ['ast-1', 'ast-2'],
        assignedToId: 'usr-1',
      });

      expect(res.count).toBe(2);
      expect(res.assignedIds).toEqual(['ast-1', 'ast-2']);
      expect(
        (mockPrisma.asset as { updateMany: ReturnType<typeof vi.fn> }).updateMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: 'usr-1',
            hasPendingRecord: true,
          }),
        }),
      );
      expect(
        (mockPrisma.assetHandoverRecord as { createMany: ReturnType<typeof vi.fn> }).createMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              assetId: 'ast-1',
              recipientId: 'usr-1',
              isPending: true,
              signedDocUrl: null,
            }),
          ]),
        }),
      );
      expect(mockNotificationsService.notifyUser).toHaveBeenCalledWith(
        'usr-1',
        expect.objectContaining({
          type: 'WARNING',
          title: expect.stringContaining('Pending'),
        }),
      );
    });

    it('should batch assign with completed record when signedDocUrl is provided', async () => {
      (
        mockPrisma.directoryUser as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValue({
        id: 'usr-1',
        firstName: 'John',
        lastName: 'Doe',
      });
      (mockPrisma.asset as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
        { id: 'ast-1' },
      ]);
      (mockPrisma.asset as { updateMany: ReturnType<typeof vi.fn> }).updateMany.mockResolvedValue({
        count: 1,
      });
      (
        mockPrisma.assetHandoverRecord as { createMany: ReturnType<typeof vi.fn> }
      ).createMany.mockResolvedValue({ count: 1 });

      const res = await service.batchAssign({
        assetIds: ['ast-1'],
        assignedToId: 'usr-1',
        signedDocUrl: 'https://storage.corp/handover-1.pdf',
      });

      expect(res.count).toBe(1);
      expect(
        (mockPrisma.asset as { updateMany: ReturnType<typeof vi.fn> }).updateMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: 'usr-1',
            hasPendingRecord: false,
          }),
        }),
      );
      expect(
        (mockPrisma.assetHandoverRecord as { createMany: ReturnType<typeof vi.fn> }).createMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              assetId: 'ast-1',
              recipientId: 'usr-1',
              isPending: false,
              signedDocUrl: 'https://storage.corp/handover-1.pdf',
            }),
          ]),
        }),
      );
      expect(mockNotificationsService.notifyUser).toHaveBeenCalledWith(
        'usr-1',
        expect.objectContaining({
          type: 'INFO',
        }),
      );
    });
  });

  describe('returnAsset', () => {
    it('should throw NotFoundException if target asset is not found', async () => {
      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue(
        null,
      );

      await expect(service.returnAsset('ast-404', { status: 'In Storage' })).rejects.toThrow(
        'Asset with ID "ast-404" not found',
      );
    });

    it('should return asset with pending record when signedDocUrl is omitted and log audit event', async () => {
      const mockExisting = {
        id: 'ast-10',
        name: 'Dell XPS 15',
        assetTag: 'AST-10',
        status: AssetStatus.IN_USE,
        assignedToId: 'usr-10',
        hasPendingRecord: false,
        notes: 'Initial assignment',
      };
      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue(
        mockExisting,
      );
      (mockPrisma.asset as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue({
        ...mockExisting,
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
        hasPendingRecord: true,
      });
      (
        mockPrisma.assetHandoverRecord as { create: ReturnType<typeof vi.fn> }
      ).create.mockResolvedValue({
        id: 'hor-1',
        assetId: 'ast-10',
        isPending: true,
      });

      const result = await service.returnAsset('ast-10', {
        status: 'In Storage',
        conditionNotes: 'Good physical condition, minor scratch',
      });

      expect(result.id).toBe('ast-10');
      expect(
        (mockPrisma.asset as { update: ReturnType<typeof vi.fn> }).update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: null,
            hasPendingRecord: true,
          }),
        }),
      );
      expect(
        (mockPrisma.assetHandoverRecord as { create: ReturnType<typeof vi.fn> }).create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assetId: 'ast-10',
            recipientId: 'usr-10',
            isPending: true,
            signedDocUrl: null,
          }),
        }),
      );
      expect(mockNotificationsService.notifyUser).toHaveBeenCalledWith(
        'usr-10',
        expect.objectContaining({
          type: 'WARNING',
        }),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_RETURNED',
          entityId: 'ast-10',
        }),
      );
    });

    it('should return asset without pending record when signedDocUrl is provided', async () => {
      const mockExisting = {
        id: 'ast-11',
        name: 'MacBook Air M2',
        assetTag: 'AST-11',
        status: AssetStatus.IN_USE,
        assignedToId: 'usr-11',
        hasPendingRecord: false,
        notes: null,
      };
      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue(
        mockExisting,
      );
      (mockPrisma.asset as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue({
        ...mockExisting,
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
        hasPendingRecord: false,
      });
      (
        mockPrisma.assetHandoverRecord as { create: ReturnType<typeof vi.fn> }
      ).create.mockResolvedValue({
        id: 'hor-2',
        assetId: 'ast-11',
        isPending: false,
      });

      const result = await service.returnAsset('ast-11', {
        status: 'In Storage',
        signedDocUrl: 'https://storage.corp/return-rec.pdf',
      });

      expect(result.id).toBe('ast-11');
      expect(
        (mockPrisma.asset as { update: ReturnType<typeof vi.fn> }).update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hasPendingRecord: false,
          }),
        }),
      );
      expect(
        (mockPrisma.assetHandoverRecord as { create: ReturnType<typeof vi.fn> }).create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            signedDocUrl: 'https://storage.corp/return-rec.pdf',
            isPending: false,
          }),
        }),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalled();
    });
  });

  describe('getHandoverTemplateHtml', () => {
    it('should generate printable assignment handover template HTML', () => {
      const html = service.getHandoverTemplateHtml('assignment');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('HARDWARE ASSET HANDOVER RECORD');
      expect(html).toContain('Parties Involved');
      expect(html).toContain('Hardware Equipment Specifications');
      expect(html).toContain('Signatures');
    });

    it('should generate printable return handover template HTML', () => {
      const html = service.getHandoverTemplateHtml('return');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('HARDWARE ASSET RETURN RECORD');
      expect(html).toContain('Return (To Storage)');
    });
  });

  describe('generateHandoverDocument', () => {
    it('should generate assignment document populated with asset details and recipient info', async () => {
      const mockAsset = {
        id: 'ast-gen-1',
        assetTag: 'AST-5001',
        name: 'Dell Latitude 5540',
        manufacturer: 'Dell',
        model: 'Latitude 5540',
        serialNumber: 'SN-DELL-5540',
        status: AssetStatus.IN_USE,
        notes: 'Equipped with 32GB RAM',
        category: { name: 'Laptops' },
      };
      const mockUser = {
        id: 'usr-gen-1',
        employeeCode: 'EMP-900',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        email: 'john.doe@company.internal',
        department: { name: 'Operations' },
      };

      (mockPrisma.asset as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
        mockAsset,
      ]);
      (
        mockPrisma.directoryUser as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValue(mockUser);

      const result = await service.generateHandoverDocument({
        type: 'assignment',
        assetIds: ['ast-gen-1'],
        recipientId: 'usr-gen-1',
        conditionNotes: 'All ports verified and operational',
      });

      expect(result.title).toContain('HARDWARE ASSET HANDOVER RECORD');
      expect(result.html).toContain('HARDWARE ASSET HANDOVER RECORD');
      expect(result.html).toContain('AST-5001');
      expect(result.html).toContain('Dell Latitude 5540');
      expect(result.html).toContain('SN-DELL-5540');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('EMP-900');
      expect(result.html).toContain('Operations');
      expect(result.html).toContain('All ports verified and operational');
      expect(result.html).toContain('Employee / Custodian (Recipient)');
      expect(result.html).toContain('IT Department Representative (Issuer)');
      expect(result.filename).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('should generate return document populated with returning asset info', async () => {
      const mockAsset = {
        id: 'ast-gen-2',
        assetTag: 'AST-5002',
        name: 'MacBook Pro 14',
        manufacturer: 'Apple',
        model: 'M2 Pro',
        serialNumber: 'SN-APL-002',
        status: AssetStatus.AVAILABLE,
        notes: 'Slight scratches on bottom lid',
        category: { name: 'Laptops' },
      };

      (mockPrisma.asset as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
        mockAsset,
      ]);

      const result = await service.generateHandoverDocument({
        type: 'return',
        assetIds: ['ast-gen-2'],
      });

      expect(result.title).toContain('HARDWARE ASSET RETURN RECORD');
      expect(result.html).toContain('HARDWARE ASSET RETURN RECORD');
      expect(result.html).toContain('AST-5002');
      expect(result.html).toContain('MacBook Pro 14');
      expect(result.html).toContain('Employee / Custodian (Returner)');
      expect(result.html).toContain('IT Department Representative (Receiver)');
    });

    it('should chunk asset queries by 100 when generating document for >100 assets without truncation', async () => {
      const assetIds = Array.from({ length: 150 }, (_, i) => `ast-${i + 1}`);

      const chunk1 = assetIds.slice(0, 100).map((id, i) => ({
        id,
        assetTag: `AST-${i + 1}`,
        name: `Device ${i + 1}`,
        manufacturer: 'Dell',
        model: 'Latitude',
        serialNumber: `SN-${i + 1}`,
        status: AssetStatus.AVAILABLE,
        category: { name: 'Laptops' },
      }));

      const chunk2 = assetIds.slice(100).map((id, i) => ({
        id,
        assetTag: `AST-${i + 101}`,
        name: `Device ${i + 101}`,
        manufacturer: 'Dell',
        model: 'Latitude',
        serialNumber: `SN-${i + 101}`,
        status: AssetStatus.AVAILABLE,
        category: { name: 'Laptops' },
      }));

      (mockPrisma.asset as { findMany: ReturnType<typeof vi.fn> }).findMany
        .mockResolvedValueOnce(chunk1)
        .mockResolvedValueOnce(chunk2);

      const result = await service.generateHandoverDocument({
        type: 'assignment',
        assetIds,
      });

      expect(
        (mockPrisma.asset as { findMany: ReturnType<typeof vi.fn> }).findMany,
      ).toHaveBeenCalledTimes(2);
      expect(result.html).toContain('AST-1');
      expect(result.html).toContain('AST-100');
      expect(result.html).toContain('AST-150');
      expect(result.html).toContain('Device 150');
    });

    it('should include paged media break rules (thead, tr, terms, signatures) in document HTML', async () => {
      const result = await service.generateHandoverDocument({
        type: 'assignment',
        assetIds: [],
      });

      expect(result.html).toContain('display: table-header-group;');
      expect(result.html).toContain('page-break-inside: avoid;');
      expect(result.html).toContain('break-inside: avoid;');
      expect(result.html).toContain('size: A4 portrait;');
    });
  });

  describe('saveHandoverDocumentFile', () => {
    it('should throw BadRequestException when file buffer is missing', async () => {
      const invalidFile = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 0,
        buffer: undefined as unknown as Buffer,
      } as Express.Multer.File;

      await expect(service.saveHandoverDocumentFile(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file mimetype is not allowed', async () => {
      const invalidFile = {
        fieldname: 'file',
        originalname: 'script.sh',
        encoding: '7bit',
        mimetype: 'application/x-sh',
        size: 100,
        buffer: Buffer.from('#!/bin/bash\necho hello'),
      } as Express.Multer.File;

      await expect(service.saveHandoverDocumentFile(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file size exceeds 10MB', async () => {
      const oversizedFile = {
        fieldname: 'file',
        originalname: 'large.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024,
        buffer: Buffer.alloc(100),
      } as Express.Multer.File;

      await expect(service.saveHandoverDocumentFile(oversizedFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should save valid PDF file and return fileUrl', async () => {
      const validFile = {
        fieldname: 'file',
        originalname: 'signed-record.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 test content'),
      } as Express.Multer.File;

      const result = await service.saveHandoverDocumentFile(validFile);

      expect(result.fileName).toBeDefined();
      expect(result.fileUrl).toContain('/api/v1/assets/handover-documents/file/');
      expect(result.size).toBe(1024);
      expect(result.originalName).toBe('signed-record.pdf');
    });

    it('should automatically attach document to asset when assetId is provided', async () => {
      const validFile = {
        fieldname: 'file',
        originalname: 'signed-handover.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 2048,
        buffer: Buffer.from('fake-png-data'),
      } as Express.Multer.File;

      const mockAsset = {
        id: 'ast-with-pending',
        assetTag: 'AST-999',
        name: 'HP EliteBook',
        hasPendingRecord: true,
      };

      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue(
        mockAsset,
      );
      (
        mockPrisma.assetHandoverRecord as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue({
        id: 'hor-pending-1',
        assetId: 'ast-with-pending',
        isPending: true,
      });
      (
        mockPrisma.assetHandoverRecord as { update: ReturnType<typeof vi.fn> }
      ).update.mockResolvedValue({
        id: 'hor-pending-1',
        isPending: false,
      });
      (mockPrisma.asset as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue({
        ...mockAsset,
        hasPendingRecord: false,
        handoverRecords: [{ id: 'hor-pending-1', signedDocUrl: 'url' }],
      });

      const result = await service.saveHandoverDocumentFile(validFile, 'ast-with-pending');

      expect(result.fileUrl).toBeDefined();
      expect(
        (mockPrisma.assetHandoverRecord as { update: ReturnType<typeof vi.fn> }).update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'hor-pending-1' },
          data: expect.objectContaining({
            isPending: false,
            signedDocUrl: result.fileUrl,
          }),
        }),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_RECORD_RESOLVED',
          entityId: 'ast-with-pending',
        }),
      );
    });

    it('should sanitize dangerous or unlisted file extensions to safe extension based on MIME type', async () => {
      const maliciousFile = {
        fieldname: 'file',
        originalname: 'exploit.php',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 512,
        buffer: Buffer.from('%PDF-1.4 test'),
      } as Express.Multer.File;

      const result = await service.saveHandoverDocumentFile(maliciousFile);
      expect(result.fileName.endsWith('.pdf')).toBe(true);
      expect(result.fileName.endsWith('.php')).toBe(false);
    });

    it('should rollback and delete temporary file if attachHandoverDocument fails', async () => {
      const validFile = {
        fieldname: 'file',
        originalname: 'rollback-test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF-1.4 rollback test'),
      } as Express.Multer.File;

      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.saveHandoverDocumentFile(validFile, 'non-existent-asset-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject zero-byte empty document files with BadRequestException', async () => {
      const emptyFile = {
        fieldname: 'file',
        originalname: 'empty.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 0,
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      await expect(service.saveHandoverDocumentFile(emptyFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('streamHandoverDocumentFile', () => {
    it('should throw NotFoundException when file does not exist', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      await expect(
        service.streamHandoverDocumentFile('non-existent-file-12345.pdf', mockRes),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject non-allowed file extensions with NotFoundException', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      await expect(service.streamHandoverDocumentFile('suspicious.exe', mockRes)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject path traversal attempts with NotFoundException', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      await expect(
        service.streamHandoverDocumentFile('../../../../etc/passwd', mockRes),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject requests pointing to directories inside upload folder with NotFoundException', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as Response;

      await expect(service.streamHandoverDocumentFile('.', mockRes)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('attachHandoverDocument', () => {
    it('should throw NotFoundException if asset does not exist', async () => {
      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.attachHandoverDocument('non-existent-ast', '/uploads/doc.pdf'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should resolve pending handover record and update hasPendingRecord to false', async () => {
      const mockAsset = {
        id: 'ast-pending-resolve',
        assetTag: 'AST-RESOLVE-1',
        name: 'Lenovo ThinkPad P1',
        hasPendingRecord: true,
      };

      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue(
        mockAsset,
      );
      (
        mockPrisma.assetHandoverRecord as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue({
        id: 'rec-p-1',
        assetId: 'ast-pending-resolve',
        isPending: true,
        notes: 'Initial assignment notes',
      });
      (
        mockPrisma.assetHandoverRecord as { update: ReturnType<typeof vi.fn> }
      ).update.mockResolvedValue({
        id: 'rec-p-1',
        isPending: false,
        signedDocUrl: '/files/signed.pdf',
      });
      (mockPrisma.asset as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue({
        ...mockAsset,
        hasPendingRecord: false,
        handoverRecords: [{ id: 'rec-p-1', signedDocUrl: '/files/signed.pdf' }],
      });

      const result = await service.attachHandoverDocument(
        'ast-pending-resolve',
        '/files/signed.pdf',
        'Signed hardcopy received',
      );

      expect(result.hasPendingRecord).toBe(false);
      expect(
        (mockPrisma.assetHandoverRecord as { update: ReturnType<typeof vi.fn> }).update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-p-1' },
          data: expect.objectContaining({
            isPending: false,
            signedDocUrl: '/files/signed.pdf',
            notes: 'Initial assignment notes; Signed hardcopy received',
          }),
        }),
      );
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_RECORD_RESOLVED',
          entityId: 'ast-pending-resolve',
        }),
      );
    });

    it('should create new completed handover record if no pending record exists', async () => {
      const mockAsset = {
        id: 'ast-no-pending',
        assetTag: 'AST-NO-PENDING',
        name: 'Dell Monitor',
        hasPendingRecord: false,
      };

      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue(
        mockAsset,
      );
      (
        mockPrisma.assetHandoverRecord as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue(null);
      (
        mockPrisma.assetHandoverRecord as { create: ReturnType<typeof vi.fn> }
      ).create.mockResolvedValue({
        id: 'rec-new-1',
        assetId: 'ast-no-pending',
        isPending: false,
        signedDocUrl: '/files/signed-receipt.pdf',
      });
      (mockPrisma.asset as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue({
        ...mockAsset,
        hasPendingRecord: false,
        handoverRecords: [{ id: 'rec-new-1', signedDocUrl: '/files/signed-receipt.pdf' }],
      });

      await service.attachHandoverDocument(
        'ast-no-pending',
        '/files/signed-receipt.pdf',
        'Direct upload',
      );

      expect(
        (mockPrisma.assetHandoverRecord as { create: ReturnType<typeof vi.fn> }).create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assetId: 'ast-no-pending',
            isPending: false,
            signedDocUrl: '/files/signed-receipt.pdf',
          }),
        }),
      );
    });
  });

  describe('Audit Logging Integration', () => {
    it('should log ASSET_CREATED audit event with Hardware entityType', async () => {
      (
        mockPrisma.assetCategory as { findFirst: ReturnType<typeof vi.fn> }
      ).findFirst.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      (mockPrisma.asset as { create: ReturnType<typeof vi.fn> }).create.mockResolvedValue({
        id: 'ast-aud-1',
        assetTag: 'AST-AUD-100',
        name: 'Audit Laptop',
        status: AssetStatus.AVAILABLE,
      });

      await service.create({
        name: 'Audit Laptop',
        category: 'Laptops',
        status: 'Available',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_CREATED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'ast-aud-1',
          newValue: expect.objectContaining({ id: 'ast-aud-1', name: 'Audit Laptop' }),
        }),
      );
    });

    it('should log ASSET_UPDATED audit event with field-level diff', async () => {
      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue({
        id: 'ast-aud-1',
        name: 'Old Name',
        assetTag: 'TAG-1',
        status: AssetStatus.AVAILABLE,
        unitCost: 1000,
      });
      (mockPrisma.asset as { update: ReturnType<typeof vi.fn> }).update.mockResolvedValue({
        id: 'ast-aud-1',
        name: 'New Name',
        assetTag: 'TAG-1',
        status: AssetStatus.AVAILABLE,
        unitCost: 1200,
      });

      await service.update('ast-aud-1', {
        name: 'New Name',
        unitCost: 1200,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_UPDATED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'ast-aud-1',
          oldValue: expect.objectContaining({ name: 'Old Name', unitCost: 1000 }),
          newValue: expect.objectContaining({ name: 'New Name', unitCost: 1200 }),
        }),
      );
    });

    it('should log ASSET_ASSIGNED audit event in batchAssign', async () => {
      (
        mockPrisma.directoryUser as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValue({
        id: 'usr-1',
        displayName: 'John User',
        email: 'john@example.com',
      });
      (mockPrisma.asset as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
        { id: 'ast-batch-1', assignedToId: null, hasPendingRecord: false, status: 'AVAILABLE' },
      ]);
      (mockPrisma.asset as { updateMany: ReturnType<typeof vi.fn> }).updateMany.mockResolvedValue({
        count: 1,
      });
      (
        mockPrisma.assetHandoverRecord as { createMany: ReturnType<typeof vi.fn> }
      ).createMany.mockResolvedValue({ count: 1 });

      await service.batchAssign({
        assetIds: ['ast-batch-1'],
        assignedToId: 'usr-1',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_ASSIGNED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'ast-batch-1',
          oldValue: expect.objectContaining({ assignedToId: null }),
          newValue: expect.objectContaining({ assignedToId: 'usr-1' }),
        }),
      );
    });

    it('should log ASSET_DELETED audit event in remove', async () => {
      (mockPrisma.asset as { findUnique: ReturnType<typeof vi.fn> }).findUnique.mockResolvedValue({
        id: 'ast-del-1',
        name: 'Deleted Asset',
        assetTag: 'DEL-101',
      });
      (mockPrisma.asset as { delete: ReturnType<typeof vi.fn> }).delete.mockResolvedValue({
        id: 'ast-del-1',
        name: 'Deleted Asset',
        assetTag: 'DEL-101',
      });

      await service.remove('ast-del-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_DELETED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'ast-del-1',
        }),
      );
    });
  });
});
