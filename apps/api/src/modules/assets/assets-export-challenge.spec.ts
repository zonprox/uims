import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { AssetStatus } from '@uims/shared-types';
import { AssetsService } from './assets.service';

describe('AssetsService — Adversarial XLSX Export Challenge & Stress Tests', () => {
  let service: AssetsService;
  let mockPrisma: {
    $transaction: ReturnType<typeof vi.fn>;
    asset: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    assetCategory: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    location: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    directoryUser: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

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

  async function readWorkbookFromStream(stream: PassThrough): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.read(stream);
    return workbook;
  }

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
      asset: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      assetCategory: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      location: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      directoryUser: {
        findUnique: vi.fn(),
      },
    };

    service = new AssetsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('1. Excel Workbook Round-Trip & Data Preservation', () => {
    it('should generate a valid XLSX binary that can be read back by ExcelJS with all formatting intact', async () => {
      const mockRes = createMockResponse();

      mockPrisma.asset.findMany.mockResolvedValueOnce([
        {
          id: 'ast-rt-1',
          assetTag: 'AST-9901',
          name: 'Precision Workstation 7920',
          status: AssetStatus.IN_USE,
          serialNumber: 'SN-DELL-9988',
          purchaseDate: new Date('2025-06-15T00:00:00.000Z'),
          warrantyExpiry: new Date('2028-06-15T00:00:00.000Z'),
          category: { name: 'Workstations' },
          location: { name: 'Engineering Lab 4', fullPath: 'HQ / Building B / Lab 4' },
          department: { name: 'R&D' },
          assignedTo: { firstName: 'Sarah', lastName: 'Connor' },
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

      const wb = await readWorkbookFromStream(mockRes);
      expect(wb.creator).toBe('UIMS');

      const ws = wb.getWorksheet('Hardware Assets');
      expect(ws).toBeDefined();
      expect(ws?.views).toBeDefined();
      expect(ws?.views[0]).toMatchObject({
        showGridLines: true,
        state: 'frozen',
        ySplit: 1,
      });

      // Verify Column count and headers
      const expectedHeaders = [
        'Asset Tag',
        'Name',
        'Category',
        'Status',
        'Department',
        'Location',
        'Serial Number',
        'Purchase Cost',
        'Purchase Date',
        'Warranty Expiry',
        'Assigned To',
      ];

      const headerRow = ws?.getRow(1);
      expect(headerRow?.height).toBe(28);
      expectedHeaders.forEach((expectedTitle, idx) => {
        const cell = headerRow?.getCell(idx + 1);
        expect(cell?.value).toBe(expectedTitle);
        // Header styling
        expect(cell?.font?.name).toBe('Segoe UI');
        expect(cell?.font?.bold).toBe(true);
        expect(cell?.font?.color?.argb).toBe('FFFFFFFF');
        expect(cell?.fill?.type).toBe('pattern');
        expect((cell?.fill as ExcelJS.FillPattern)?.fgColor?.argb).toBe('FF1677FF');
      });

      // Verify Data Row
      expect(ws?.rowCount).toBe(2); // 1 header + 1 data row
      const dataRow = ws?.getRow(2);
      expect(dataRow?.height).toBe(22);

      expect(dataRow?.getCell(1).value).toBe('AST-9901');
      expect(dataRow?.getCell(1).font?.bold).toBe(true);
      expect(dataRow?.getCell(1).font?.color?.argb).toBe('FF1677FF');

      expect(dataRow?.getCell(2).value).toBe('Precision Workstation 7920');
      expect(dataRow?.getCell(2).font?.bold).toBe(true);

      expect(dataRow?.getCell(3).value).toBe('Workstations');
      expect(dataRow?.getCell(4).value).toBe('Active');

      // Status badge styling on Active
      const statusCell = dataRow?.getCell(4);
      expect((statusCell?.fill as ExcelJS.FillPattern)?.fgColor?.argb).toBe('FFF6FFED');
      expect(statusCell?.font?.color?.argb).toBe('FF237804');
      expect(statusCell?.font?.bold).toBe(true);

      expect(dataRow?.getCell(5).value).toBe('R&D');
      expect(dataRow?.getCell(6).value).toBe('Engineering Lab 4');
      expect(dataRow?.getCell(7).value).toBe('SN-DELL-9988');

      // Purchase Cost format
      const costCell = dataRow?.getCell(8);
      expect(costCell?.numFmt).toBe('$#,##0.00');

      // Date formats
      const purchaseDateCell = dataRow?.getCell(9);
      expect(purchaseDateCell?.numFmt).toBe('yyyy-mm-dd');
      expect(purchaseDateCell?.value).toBeInstanceOf(Date);

      const warrantyCell = dataRow?.getCell(10);
      expect(warrantyCell?.numFmt).toBe('yyyy-mm-dd');
      expect(warrantyCell?.value).toBeInstanceOf(Date);

      expect(dataRow?.getCell(11).value).toBe('Sarah Connor');
    });

    it('should correctly format status badge styles across all known and unknown status codes', async () => {
      const mockRes = createMockResponse();

      const statusesToTest = [
        { status: 'ACTIVE', expectedLabel: 'Active', fill: 'FFF6FFED', font: 'FF237804' },
        { status: 'IN_USE', expectedLabel: 'Active', fill: 'FFF6FFED', font: 'FF237804' },
        { status: 'AVAILABLE', expectedLabel: 'Available', fill: 'FFE6F4FF', font: 'FF0958D9' },
        { status: 'IN_STORAGE', expectedLabel: 'Available', fill: 'FFE6F4FF', font: 'FF0958D9' },
        { status: 'IN_REPAIR', expectedLabel: 'In Repair', fill: 'FFFFFBE6', font: 'FFD46B08' },
        { status: 'MAINTENANCE', expectedLabel: 'In Repair', fill: 'FFFFFBE6', font: 'FFD46B08' },
        { status: 'RETIRED', expectedLabel: 'Retired', fill: 'FFF5F5F5', font: 'FF595959' },
        { status: 'LOST', expectedLabel: 'Lost', fill: 'FFFFF1F0', font: 'FFCF1322' },
        { status: 'DISPOSED', expectedLabel: 'Lost', fill: 'FFFFF1F0', font: 'FFCF1322' },
        { status: 'CUSTOM_STAGED', expectedLabel: 'CUSTOM_STAGED', fill: 'FFF5F5F5', font: 'FF595959' },
        { status: null, expectedLabel: 'Unknown', fill: 'FFF5F5F5', font: 'FF595959' },
      ];

      const testAssets = statusesToTest.map((item, idx) => ({
        id: `ast-st-${idx}`,
        assetTag: `TAG-${idx}`,
        name: `Asset ${idx}`,
        status: item.status,
        serialNumber: `SN-${idx}`,
        category: null,
        location: null,
        department: null,
        assignedTo: null,
      }));

      mockPrisma.asset.findMany.mockResolvedValueOnce(testAssets);

      await service.exportXlsx({}, mockRes);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');

      statusesToTest.forEach((item, idx) => {
        const row = ws?.getRow(idx + 2);
        const cell = row?.getCell(4);
        expect(cell?.value).toBe(item.expectedLabel);
        expect((cell?.fill as ExcelJS.FillPattern)?.fgColor?.argb).toBe(item.fill);
        expect(cell?.font?.color?.argb).toBe(item.font);
        expect(cell?.font?.bold).toBe(true);
      });
    });
  });

  describe('2. Cursor Pagination Stress Testing', () => {
    it('should handle boundary case: 0 total items in database gracefully (header only, no crash)', async () => {
      const mockRes = createMockResponse();

      mockPrisma.asset.findMany.mockResolvedValueOnce([]);

      await service.exportXlsx({}, mockRes);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: { id: 'asc' },
        }),
      );

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');
      expect(ws).toBeDefined();
      expect(ws?.rowCount).toBe(1); // Only header row
      expect(ws?.getRow(1).getCell(1).value).toBe('Asset Tag');
    });

    it('should handle boundary case: exactly 100 items (1 full batch followed by empty batch, no infinite loop)', async () => {
      const mockRes = createMockResponse();

      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `ast-exact-${String(i + 1).padStart(3, '0')}`,
        assetTag: `TAG-${String(i + 1).padStart(3, '0')}`,
        name: `Exact Item ${i + 1}`,
        status: AssetStatus.AVAILABLE,
        serialNumber: `SN-${i + 1}`,
      }));

      // 1st query returns 100 items; 2nd query returns empty
      mockPrisma.asset.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce([]);

      await service.exportXlsx({}, mockRes);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(2);

      // Verify query 1
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          take: 100,
          skip: 0,
          cursor: undefined,
          orderBy: { id: 'asc' },
        }),
      );

      // Verify query 2
      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          take: 100,
          skip: 1,
          cursor: { id: 'ast-exact-100' },
          orderBy: { id: 'asc' },
        }),
      );

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');
      expect(ws?.rowCount).toBe(101); // 1 header + 100 items
      expect(ws?.getRow(2).getCell(1).value).toBe('TAG-001');
      expect(ws?.getRow(101).getCell(1).value).toBe('TAG-100');
    });

    it('should paginate 150 items across 2 batches (100 + 50) without dropping rows or looping', async () => {
      const mockRes = createMockResponse();

      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `ast-p1-${String(i + 1).padStart(3, '0')}`,
        assetTag: `TAG-${String(i + 1).padStart(3, '0')}`,
        name: `Batch1 Item ${i + 1}`,
        status: AssetStatus.IN_USE,
      }));

      const batch2 = Array.from({ length: 50 }, (_, i) => ({
        id: `ast-p2-${String(i + 101).padStart(3, '0')}`,
        assetTag: `TAG-${String(i + 101).padStart(3, '0')}`,
        name: `Batch2 Item ${i + 101}`,
        status: AssetStatus.AVAILABLE,
      }));

      mockPrisma.asset.findMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2);

      await service.exportXlsx({}, mockRes);

      // Batch 2 had 50 < 100 items, loop breaks immediately without 3rd call
      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(2);

      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          take: 100,
          skip: 1,
          cursor: { id: 'ast-p1-100' },
        }),
      );

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');
      expect(ws?.rowCount).toBe(151); // 1 header + 150 items

      // Check boundaries
      expect(ws?.getRow(2).getCell(1).value).toBe('TAG-001');
      expect(ws?.getRow(101).getCell(1).value).toBe('TAG-100');
      expect(ws?.getRow(102).getCell(1).value).toBe('TAG-101');
      expect(ws?.getRow(151).getCell(1).value).toBe('TAG-150');
    });

    it('should handle large dataset across 4 batches (350 items: 100 + 100 + 100 + 50)', async () => {
      const mockRes = createMockResponse();

      const createBatch = (start: number, count: number) =>
        Array.from({ length: count }, (_, i) => ({
          id: `ast-bulk-${String(start + i).padStart(4, '0')}`,
          assetTag: `TAG-${String(start + i).padStart(4, '0')}`,
          name: `Bulk Device ${start + i}`,
          status: AssetStatus.AVAILABLE,
        }));

      mockPrisma.asset.findMany
        .mockResolvedValueOnce(createBatch(1, 100))
        .mockResolvedValueOnce(createBatch(101, 100))
        .mockResolvedValueOnce(createBatch(201, 100))
        .mockResolvedValueOnce(createBatch(301, 50));

      await service.exportXlsx({}, mockRes);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(4);

      expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          take: 100,
          skip: 1,
          cursor: { id: 'ast-bulk-0300' },
        }),
      );

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');
      expect(ws?.rowCount).toBe(351); // 1 header + 350 items
      expect(ws?.getRow(351).getCell(1).value).toBe('TAG-0350');
    });

    it('should paginate exact multiple of batch size (200 items: 100 + 100 + 0)', async () => {
      const mockRes = createMockResponse();

      const createBatch = (start: number, count: number) =>
        Array.from({ length: count }, (_, i) => ({
          id: `ast-200-${String(start + i).padStart(3, '0')}`,
          assetTag: `TAG-${String(start + i).padStart(3, '0')}`,
          name: `Item ${start + i}`,
          status: AssetStatus.AVAILABLE,
        }));

      mockPrisma.asset.findMany
        .mockResolvedValueOnce(createBatch(1, 100))
        .mockResolvedValueOnce(createBatch(101, 100))
        .mockResolvedValueOnce([]);

      await service.exportXlsx({}, mockRes);

      expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(3);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');
      expect(ws?.rowCount).toBe(201); // 1 header + 200 items
      expect(ws?.getRow(201).getCell(1).value).toBe('TAG-200');
    });
  });

  describe('3. Edge Cases, Null Handling & Character Encodings', () => {
    it('should handle completely empty and null optional fields without crashing', async () => {
      const mockRes = createMockResponse();

      mockPrisma.asset.findMany.mockResolvedValueOnce([
        {
          id: 'ast-nulls-1',
          assetTag: 'AST-EMPTY',
          name: 'Bare Metal Asset',
          status: null,
          serialNumber: null,
          purchaseDate: null,
          warrantyExpiry: null,
          category: null,
          location: null,
          department: null,
          assignedTo: null,
        },
      ]);

      await service.exportXlsx({}, mockRes);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');
      const row = ws?.getRow(2);

      expect(row?.getCell(1).value).toBe('AST-EMPTY');
      expect(row?.getCell(2).value).toBe('Bare Metal Asset');
      expect(row?.getCell(3).value).toBe('Uncategorized');
      expect(row?.getCell(4).value).toBe('Unknown');
      expect(row?.getCell(5).value).toBe('Unassigned');
      expect(row?.getCell(6).value).toBe('Storage Vault');
      expect(row?.getCell(7).value).toBe('N/A');
      expect(row?.getCell(8).value).toBeNull();
      expect(row?.getCell(9).value).toBeNull();
      expect(row?.getCell(10).value).toBeNull();
      expect(row?.getCell(11).value).toBe('Unassigned');
    });

    it('should preserve location fallback hierarchy (name -> fullPath -> Storage Vault)', async () => {
      const mockRes = createMockResponse();

      mockPrisma.asset.findMany.mockResolvedValueOnce([
        {
          id: 'ast-loc-1',
          assetTag: 'AST-L1',
          name: 'Asset With Name',
          status: AssetStatus.AVAILABLE,
          location: { name: 'Rack 12', fullPath: 'HQ / DC / Rack 12' },
        },
        {
          id: 'ast-loc-2',
          assetTag: 'AST-L2',
          name: 'Asset With Only FullPath',
          status: AssetStatus.AVAILABLE,
          location: { name: null, fullPath: 'HQ / DC / Rack 99' },
        },
        {
          id: 'ast-loc-3',
          assetTag: 'AST-L3',
          name: 'Asset With Null Location',
          status: AssetStatus.AVAILABLE,
          location: null,
        },
      ]);

      await service.exportXlsx({}, mockRes);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');

      expect(ws?.getRow(2).getCell(6).value).toBe('Rack 12');
      expect(ws?.getRow(3).getCell(6).value).toBe('HQ / DC / Rack 99');
      expect(ws?.getRow(4).getCell(6).value).toBe('Storage Vault');
    });

    it('should safely handle quotes, commas, XML tags, and special symbols in string fields', async () => {
      const mockRes = createMockResponse();

      const complexName = 'Server 2U "Dual Xeon" 64GB, 2x1TB SSD & <Redundant PSU>';
      const complexSerial = `SN/\\#$%'&*![]`;

      mockPrisma.asset.findMany.mockResolvedValueOnce([
        {
          id: 'ast-spec-1',
          assetTag: 'AST-SPEC-01',
          name: complexName,
          status: AssetStatus.AVAILABLE,
          serialNumber: complexSerial,
          category: { name: 'Servers & Racks' },
          location: { name: 'Datacenter A -> Row 1 <Cold Aisle>' },
          department: { name: 'Operations, Infrastructure & Cloud' },
          assignedTo: { firstName: `Patrick "Pat"`, lastName: `O'Reilly & Sons` },
        },
      ]);

      await service.exportXlsx({}, mockRes);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');
      const row = ws?.getRow(2);

      expect(row?.getCell(2).value).toBe(complexName);
      expect(row?.getCell(7).value).toBe(complexSerial);
      expect(row?.getCell(3).value).toBe('Servers & Racks');
      expect(row?.getCell(5).value).toBe('Operations, Infrastructure & Cloud');
      expect(row?.getCell(6).value).toBe('Datacenter A -> Row 1 <Cold Aisle>');
      expect(row?.getCell(11).value).toBe(`Patrick "Pat" O'Reilly & Sons`);
    });

    it('should safely preserve potential spreadsheet formula injection strings as text without evaluation', async () => {
      const mockRes = createMockResponse();

      const formulaInjections = [
        '=SUM(1, 2)',
        '-2+3',
        '+cmd| /C calc!A0',
        '@SUM(A1:A10)',
        '=1+1',
      ];

      mockPrisma.asset.findMany.mockResolvedValueOnce(
        formulaInjections.map((inj, idx) => ({
          id: `ast-inj-${idx}`,
          assetTag: `TAG-INJ-${idx}`,
          name: inj,
          status: AssetStatus.AVAILABLE,
          serialNumber: inj,
        })),
      );

      await service.exportXlsx({}, mockRes);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');

      formulaInjections.forEach((inj, idx) => {
        const row = ws?.getRow(idx + 2);
        const nameCell = row?.getCell(2);
        // Verify value is preserved as string literal and not evaluated as formula object
        expect(typeof nameCell?.value).toBe('string');
        expect(nameCell?.value).toBe(inj);
      });
    });

    it('should correctly handle multi-byte Unicode, Vietnamese, CJK, and Emojis', async () => {
      const mockRes = createMockResponse();

      const unicodeAssets = [
        {
          id: 'ast-uni-1',
          assetTag: 'AST-VN-1',
          name: 'Máy trạm đồ họa chuyên dụng Kỹ thuật số 🚀',
          status: AssetStatus.IN_USE,
          department: { name: 'Phòng Nghiên Cứu & Phát Triển' },
          location: { name: 'Tòa nhà A - Tầng 7' },
          assignedTo: { firstName: 'Nguyễn', lastName: 'Văn Bình' },
        },
        {
          id: 'ast-uni-2',
          assetTag: 'AST-CJK-1',
          name: '東京データセンター 高性能サーバー 💻',
          status: AssetStatus.AVAILABLE,
          department: { name: '情報システム部' },
          location: { name: '第3ラック' },
          assignedTo: { firstName: '佐藤', lastName: '健一' },
        },
      ];

      mockPrisma.asset.findMany.mockResolvedValueOnce(unicodeAssets);

      await service.exportXlsx({}, mockRes);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');

      const vnRow = ws?.getRow(2);
      expect(vnRow?.getCell(2).value).toBe('Máy trạm đồ họa chuyên dụng Kỹ thuật số 🚀');
      expect(vnRow?.getCell(5).value).toBe('Phòng Nghiên Cứu & Phát Triển');
      expect(vnRow?.getCell(6).value).toBe('Tòa nhà A - Tầng 7');
      expect(vnRow?.getCell(11).value).toBe('Nguyễn Văn Bình');

      const cjkRow = ws?.getRow(3);
      expect(cjkRow?.getCell(2).value).toBe('東京データセンター 高性能サーバー 💻');
      expect(cjkRow?.getCell(5).value).toBe('情報システム部');
      expect(cjkRow?.getCell(11).value).toBe('佐藤 健一');
    });

    it('should enforce column width boundaries between 13 and 45 characters', async () => {
      const mockRes = createMockResponse();

      const longName = 'A'.repeat(120); // 120 chars, should be clamped to 45
      const shortTag = 'AB'; // 2 chars, should be clamped to minimum 13

      mockPrisma.asset.findMany.mockResolvedValueOnce([
        {
          id: 'ast-clamp-1',
          assetTag: shortTag,
          name: longName,
          status: AssetStatus.AVAILABLE,
        },
      ]);

      await service.exportXlsx({}, mockRes);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');

      ws?.columns.forEach((col) => {
        expect(col.width).toBeGreaterThanOrEqual(13);
        expect(col.width).toBeLessThanOrEqual(45);
      });

      // Name column (col 2) should hit maximum 45
      const nameCol = ws?.getColumn(2);
      expect(nameCol?.width).toBe(45);

      // Asset Tag column (col 1) should be at least 13
      const tagCol = ws?.getColumn(1);
      expect(tagCol?.width).toBeGreaterThanOrEqual(13);
    });

    it('should handle multiline strings cleanly in autoFitColumnWidths', async () => {
      const mockRes = createMockResponse();

      const multilineName = 'Line 1 short\nLine 2 is somewhat longer than line 1\nL3';

      mockPrisma.asset.findMany.mockResolvedValueOnce([
        {
          id: 'ast-ml-1',
          assetTag: 'AST-ML',
          name: multilineName,
          status: AssetStatus.AVAILABLE,
        },
      ]);

      await service.exportXlsx({}, mockRes);

      const wb = await readWorkbookFromStream(mockRes);
      const ws = wb.getWorksheet('Hardware Assets');
      const nameCell = ws?.getRow(2).getCell(2);

      expect(nameCell?.value).toBe(multilineName);
      expect(ws?.getColumn(2).width).toBeLessThanOrEqual(45);
      expect(ws?.getColumn(2).width).toBeGreaterThanOrEqual(13);
    });
  });

  describe('4. Error Handling and Query Filter Parity', () => {
    it('should forward search, status, and relation filters to Prisma query in exportXlsx', async () => {
      const mockRes = createMockResponse();

      mockPrisma.location.findMany.mockResolvedValueOnce([{ id: 'loc-child-1' }]);
      mockPrisma.asset.findMany.mockResolvedValueOnce([]);

      await service.exportXlsx(
        {
          search: 'MacBook',
          status: 'Active',
          categoryId: 'cat-laptop',
          departmentId: 'dept-eng',
          assignedToId: 'usr-123',
        },
        mockRes,
      );

      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AssetStatus.IN_USE,
            categoryId: 'cat-laptop',
            departmentId: 'dept-eng',
            assignedToId: 'usr-123',
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { name: { contains: 'MacBook', mode: 'insensitive' } },
                  { assetTag: { contains: 'MacBook', mode: 'insensitive' } },
                  { serialNumber: { contains: 'MacBook', mode: 'insensitive' } },
                  { model: { contains: 'MacBook', mode: 'insensitive' } },
                  { manufacturer: { contains: 'MacBook', mode: 'insensitive' } },
                ]),
              }),
            ]),
          }),
        }),
      );
    });

    it('should cleanly close response on error if streaming has already started', async () => {
      const mockRes = createMockResponse();
      // Simulate headers already sent
      mockRes.headersSent = true;
      const endSpy = vi.spyOn(mockRes, 'end');

      // 1st batch succeeds, 2nd batch throws database error
      mockPrisma.asset.findMany
        .mockResolvedValueOnce(
          Array.from({ length: 100 }, (_, i) => ({
            id: `ast-err-${i}`,
            assetTag: `TAG-${i}`,
            name: `Item ${i}`,
            status: AssetStatus.AVAILABLE,
          })),
        )
        .mockRejectedValueOnce(new Error('Connection terminated by database'));

      await service.exportXlsx({}, mockRes);

      // Since headers were sent, status 500 should NOT be called (would crash Express)
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(endSpy).toHaveBeenCalled();
    });
  });
});
