import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockPrisma: {
    asset: {
      aggregate: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    license: {
      findMany: ReturnType<typeof vi.fn>;
      aggregate?: ReturnType<typeof vi.fn>;
    };
    inventoryItem: {
      findMany: ReturnType<typeof vi.fn>;
    };
    networkSwitch: {
      findMany: ReturnType<typeof vi.fn>;
    };
    subnet: {
      findMany: ReturnType<typeof vi.fn>;
    };
    directoryUser: {
      findMany: ReturnType<typeof vi.fn>;
    };
    reportSchedule: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    $queryRaw?: ReturnType<typeof vi.fn>;
  };

  const createMockResponse = () => {
    const chunks: Buffer[] = [];
    return {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      write: vi.fn((chunk: unknown) => {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk);
        return true;
      }),
      end: vi.fn((chunk?: unknown) => {
        if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      }),
      emit: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      removeListener: vi.fn(),
      headersSent: false,
      _getChunks: () => chunks,
    } as unknown as Response & { _getChunks: () => Buffer[] };
  };

  beforeEach(() => {
    mockPrisma = {
      asset: { aggregate: vi.fn(), count: vi.fn(), findMany: vi.fn() },
      license: { findMany: vi.fn() },
      inventoryItem: { findMany: vi.fn() },
      networkSwitch: { findMany: vi.fn() },
      subnet: { findMany: vi.fn() },
      directoryUser: { findMany: vi.fn() },
      reportSchedule: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    };
    service = new ReportsService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('getStats', () => {
    it('should aggregate financial, SaaS, and hardware asset utilization KPIs', async () => {
      mockPrisma.reportSchedule.count.mockResolvedValue(4);
      mockPrisma.license.findMany.mockResolvedValue([
        { totalSeats: 100, usedSeats: 50, costPerSeat: 20 },
      ]);
      mockPrisma.asset.count
        .mockResolvedValueOnce(100) // totalAssets
        .mockResolvedValueOnce(95); // inUseAssets

      const stats = await service.getStats();

      expect(stats.scheduledReports).toBe('4 Active');
      expect(stats.globalSlaMet).toBe('95.0%');
      expect(stats.auditReadiness).toBe('100%');
    });

    it('should use $queryRaw database aggregate when available for SaaS spend in getStats', async () => {
      mockPrisma.reportSchedule.count.mockResolvedValue(2);
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([{ totalSpend: 50000 }]);
      mockPrisma.asset.count.mockResolvedValueOnce(50).mockResolvedValueOnce(45);

      const stats = await service.getStats();

      expect(stats.scheduledReports).toBe('2 Active');
      expect(stats.annualCostSavings).toBe('$7,500'); // 50000 * 0.15 = 7500
      expect(stats.globalSlaMet).toBe('90.0%');
    });
  });

  describe('getReportSuites', () => {
    it('should return system report definitions with dynamic stats', async () => {
      mockPrisma.asset.count.mockResolvedValue(200);
      mockPrisma.license.findMany.mockResolvedValue([
        { totalSeats: 100, usedSeats: 80, costPerSeat: 30 },
      ]);

      const reports = await service.getReportSuites();

      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].id).toBe('r1');
      expect(reports[0].stats.label).toBe('Managed Fleet');
      expect(reports[0].stats.primary).toBe('200 Assets');
      expect(reports[1].id).toBe('r2');
    });

    it('should use database aggregations for license seats and spend when available in getReportSuites', async () => {
      mockPrisma.asset.count.mockResolvedValue(350);
      mockPrisma.$queryRaw = vi.fn().mockResolvedValue([{ totalSpend: 60000 }]);
      mockPrisma.license.aggregate = vi.fn().mockResolvedValue({
        _sum: { totalSeats: 500, usedSeats: 400 },
      });

      const reports = await service.getReportSuites();

      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].stats.label).toBe('Managed Fleet');
      expect(reports[0].stats.primary).toBe('350 Assets');
      expect(reports[1].stats.secondary).toBe('80.0% Seat Usage');
    });
  });

  describe('getDomainDataset (Operational Domain Extractions)', () => {
    it('should extract Hardware Assets with relations using cursor pagination', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'asset-1',
          assetTag: 'AST-001',
          name: 'MacBook Pro 16',
          model: 'M3 Max',
          category: { name: 'Laptops' },
          status: 'IN_USE',
          department: { name: 'Engineering' },
          costCenter: { code: 'CC-101', name: 'R&D' },
          serialNumber: 'SN-998877',
          purchaseDate: new Date('2025-01-15T00:00:00Z'),
          warrantyExpiry: new Date('2028-01-15T00:00:00Z'),
          assignedTo: { firstName: 'Alice', lastName: 'Smith' },
        },
      ]);

      const dataset = await service.getDomainDataset('hardware');

      expect(dataset.domain).toBe('hardware');
      expect(dataset.title).toBe('Hardware Assets Report');
      expect(dataset.columns.length).toBe(11);
      expect(dataset.rows.length).toBe(1);
      expect(dataset.rows[0]).toEqual([
        'AST-001',
        'MacBook Pro 16',
        'M3 Max',
        'Laptops',
        'IN_USE',
        'Engineering',
        'R&D',
        'SN-998877',
        '2025-01-15',
        '2028-01-15',
        'Alice Smith',
      ]);
    });

    it('should extract Software Licenses with available seats and spend calculations', async () => {
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'lic-1',
          name: 'Figma Enterprise',
          vendor: 'Figma Inc',
          type: 'SUBSCRIPTION',
          totalSeats: 50,
          usedSeats: 35,
          costPerSeat: 45,
          status: 'ACTIVE',
          expiryDate: new Date('2027-12-31T00:00:00Z'),
        },
      ]);

      const dataset = await service.getDomainDataset('licenses');

      expect(dataset.domain).toBe('licenses');
      expect(dataset.columns.length).toBe(10);
      expect(dataset.rows.length).toBe(1);
      expect(dataset.rows[0][0]).toBe('Figma Enterprise');
      expect(dataset.rows[0][3]).toBe(50); // totalSeats
      expect(dataset.rows[0][4]).toBe(35); // usedSeats
      expect(dataset.rows[0][5]).toBe(15); // availableSeats (50 - 35)
      expect(dataset.rows[0][6]).toBe('$45.00'); // cost/seat
      expect(dataset.rows[0][7]).toBe('$2250.00'); // total cost (50 * 45)
    });

    it('should extract Consumable Inventory with threshold and valuation calculations', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          sku: 'SKU-RJ45-CAT6',
          name: 'Cat6 Patch Cable 2m',
          category: { name: 'Cables & Adapters' },
          quantity: 4,
          minThreshold: 10,
          unitCost: 3.5,
          binNumber: 'BIN-A3',
          supplier: 'TechSupply Co',
        },
      ]);

      const dataset = await service.getDomainDataset('inventory');

      expect(dataset.domain).toBe('inventory');
      expect(dataset.columns.length).toBe(10);
      expect(dataset.rows.length).toBe(1);
      expect(dataset.rows[0][0]).toBe('SKU-RJ45-CAT6');
      expect(dataset.rows[0][3]).toBe(4); // quantity
      expect(dataset.rows[0][5]).toBe('Low Stock'); // quantity (4) <= minThreshold (10)
      expect(dataset.rows[0][6]).toBe('$3.50');
      expect(dataset.rows[0][7]).toBe('$14.00'); // 4 * 3.5
    });

    it('should extract Network Assets uniting switches and subnets', async () => {
      mockPrisma.networkSwitch.findMany.mockResolvedValue([
        {
          id: 'sw-1',
          name: 'Core-Switch-01',
          vendor: 'Cisco',
          model: 'Catalyst 9300',
          status: 'ONLINE',
          totalPorts: 48,
          ipAddress: { address: '10.0.0.1' },
        },
      ]);
      mockPrisma.subnet.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          name: 'Server VLAN Subnet',
          cidr: '10.0.10.0/24',
          gateway: '10.0.10.1',
          totalIps: 254,
        },
      ]);

      const dataset = await service.getDomainDataset('network');

      expect(dataset.domain).toBe('network');
      expect(dataset.columns.length).toBe(7);
      expect(dataset.rows.length).toBe(2);
      expect(dataset.rows[0]).toEqual([
        'Core-Switch-01',
        'Switch',
        'Cisco',
        'Catalyst 9300',
        'ONLINE',
        '48 Ports',
        '10.0.0.1',
      ]);
      expect(dataset.rows[1]).toEqual([
        'Server VLAN Subnet',
        'Subnet',
        '10.0.10.0/24',
        '10.0.10.1',
        'Active',
        '254 IPs',
        '10.0.10.1',
      ]);
    });

    it('should extract Directory Employees with department and domain join metadata', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([
        {
          id: 'emp-1',
          employeeCode: 'EMP-0042',
          email: 'john.doe@company.com',
          firstName: 'John',
          lastName: 'Doe',
          department: { name: 'Security Operations' },
          position: { title: 'Security Engineer' },
          organization: { name: 'Global HQ' },
          phone: '+1-555-0199',
          status: 'ACTIVE',
          domainJoined: true,
          domainJoinStatus: 'JOINED',
        },
      ]);

      const dataset = await service.getDomainDataset('employees');

      expect(dataset.domain).toBe('employees');
      expect(dataset.columns.length).toBe(9);
      expect(dataset.rows.length).toBe(1);
      expect(dataset.rows[0]).toEqual([
        'EMP-0042',
        'John Doe',
        'john.doe@company.com',
        'Security Operations',
        'Security Engineer',
        'Global HQ',
        '+1-555-0199',
        'ACTIVE',
        'JOINED',
      ]);
    });

    it('should throw BadRequestException when unsupported domain is requested', async () => {
      await expect(service.getDomainDataset('unsupported-domain')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('exportXlsx', () => {
    it('should stream an Excel workbook for valid domain and call res.end()', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([]);
      const res = createMockResponse();

      await service.exportXlsx('hardware', res);

      expect(res.end).toHaveBeenCalled();
    });

    it('should return 400 Bad Request if domain is unsupported', async () => {
      const res = createMockResponse();

      await service.exportXlsx('invalid-domain', res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
        }),
      );
    });
  });

  describe('exportPdf', () => {
    it('should generate standard PDF 1.4 table document buffer starting with %PDF-1.4', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'a1',
          assetTag: 'AST-001',
          name: 'Server Node',
          model: 'PowerEdge R750',
          category: { name: 'Servers' },
          status: 'ACTIVE',
          department: { name: 'Infra' },
          costCenter: { code: 'CC-01' },
          serialNumber: 'SN-001',
          purchaseDate: new Date('2024-05-01'),
          warrantyExpiry: new Date('2027-05-01'),
          assignedTo: null,
        },
      ]);

      const res = createMockResponse();

      await service.exportPdf('hardware', res);

      expect(res.end).toHaveBeenCalled();
      const endArg = vi.mocked(res.end).mock.calls[0][0] as Buffer;
      expect(Buffer.isBuffer(endArg)).toBe(true);

      const pdfString = endArg.toString('latin1');
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfString).toContain('%%EOF');
      expect(pdfString).toContain('Hardware Assets Report');
    });

    it('should return 400 Bad Request if domain is unsupported', async () => {
      const res = createMockResponse();

      await service.exportPdf('invalid-domain', res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
        }),
      );
    });
  });
});
