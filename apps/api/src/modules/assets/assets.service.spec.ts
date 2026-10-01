import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { AssetStatus } from '@uims/shared-types';
import { AssetsService } from './assets.service';
import { BatchDeleteAssetDto } from './dto/batch-delete-asset.dto';

describe('AssetsService', () => {
  let service: AssetsService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
      asset: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
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
      location: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      directoryUser: {
        findUnique: vi.fn(),
      },
    };

    service = new AssetsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('create', () => {
    it('should create an asset with atomic category and location lookup within transaction', async () => {
      mockPrisma.assetCategory.findFirst.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', name: 'HQ Storage' });

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
        locationId: 'loc-1',
        category: { name: 'Laptops' },
        location: { name: 'HQ Storage' },
        assignedTo: { firstName: 'Alex', lastName: 'Johnson', email: 'alex@company.com' },
        notes: 'Lead engineer laptop',
      });

      const result = await service.create({
        name: 'MacBook Pro 16',
        category: 'Laptops',
        location: 'HQ Storage',
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
      expect(result.locationId).toBe('loc-1');
    });

    it('should automatically set status to IN_USE when assignedToId is provided', async () => {
      mockPrisma.assetCategory.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.location.findUnique.mockResolvedValue({ id: 'loc-1', name: 'HQ Storage' });
      mockPrisma.directoryUser.findUnique.mockResolvedValue({ id: 'dir-1' });

      mockPrisma.asset.create.mockResolvedValue({
        id: 'ast-2',
        assetTag: 'AST-1002',
        name: 'ThinkPad T14',
        status: AssetStatus.IN_USE,
        assignedToId: 'dir-1',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        category: { id: 'cat-1', name: 'Laptops' },
        location: { id: 'loc-1', name: 'HQ Storage' },
        assignedTo: { firstName: 'Alex', lastName: 'Johnson', email: 'alex@company.com' },
      });

      const asset = await service.create({
        name: 'ThinkPad T14',
        categoryId: 'cat-1',
        locationId: 'loc-1',
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
        location: { name: 'Storage' },
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
        location: { name: 'Storage' },
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
        location: { name: 'Storage' },
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
        location: { name: 'Storage' },
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
          location: { name: 'Floor 3' },
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
        location: { name: 'Datacenter' },
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
      const mockRes = stream as unknown as Response & PassThrough & {
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
          location: { name: 'HQ Building', fullPath: 'HQ / Floor 2' },
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
      expect(headerRow?.getCell(6).value).toBe('Location');
      expect(headerRow?.getCell(7).value).toBe('Serial Number');
      expect(headerRow?.getCell(8).value).toBe('Purchase Cost');
      expect(headerRow?.getCell(9).value).toBe('Purchase Date');
      expect(headerRow?.getCell(10).value).toBe('Warranty Expiry');
      expect(headerRow?.getCell(11).value).toBe('Assigned To');

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
      expect(dataRow?.getCell(6).value).toBe('HQ Building');
      expect(dataRow?.getCell(7).value).toBe('SN123456');
      expect(dataRow?.getCell(8).numFmt).toBe('$#,##0.00');
      expect(dataRow?.getCell(9).numFmt).toBe('yyyy-mm-dd');
      expect(dataRow?.getCell(10).numFmt).toBe('yyyy-mm-dd');
      expect(dataRow?.getCell(11).value).toBe('Alice Johnson');

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
        location: { name: 'Storage' },
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
        location: { name: 'Storage' },
        department: { name: 'IT' },
        assignedTo: null,
      }));

      mockPrisma.asset.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2);

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
      const dto = plainToInstance(BatchDeleteAssetDto, { ids: ['ast-1', 'ast-2'] });
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
});
