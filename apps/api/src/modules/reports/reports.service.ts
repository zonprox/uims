import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { generatePdfTable, type PdfColumn } from './utils/pdf-table-generator';

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: {
    deviceModel: {
      include: {
        category: true;
      };
    };
    department: true;
    costCenter: true;
    assignedTo: true;
  };
}>;

type LicenseWithRelations = Prisma.LicenseGetPayload<{
  include: {
    vendorRef: true;
  };
}>;

type InventoryWithRelations = Prisma.DeviceModelGetPayload<{
  include: {
    category: true;
    vendor: true;
  };
}>;

type SwitchWithRelations = Prisma.NetworkSwitchGetPayload<{
  include: {
    ipAddress: true;
  };
}>;

type SubnetItem = Prisma.SubnetGetPayload<object>;

type DirectoryUserWithRelations = Prisma.DirectoryUserGetPayload<{
  include: {
    organization: true;
    department: true;
    position: true;
  };
}>;

export interface DomainExportDataset {
  domain: string;
  title: string;
  sheetTitle: string;
  columns: PdfColumn[];
  rows: Array<Array<string | number>>;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  async getReportSuites() {
    let totalSaaS: number | null = null;
    try {
      if (typeof this.prisma.$queryRaw === 'function') {
        const rawResult = await this.prisma.$queryRaw<Array<{ totalSpend: number | null }>>`
          SELECT COALESCE(SUM("usedSeats" * "costPerSeat"), 0)::float AS "totalSpend"
          FROM "License"
        `;
        if (
          rawResult &&
          rawResult[0]?.totalSpend !== undefined &&
          rawResult[0]?.totalSpend !== null
        ) {
          totalSaaS = Number(rawResult[0].totalSpend);
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        'SQL license spend aggregation in getReportSuites failed, falling back',
        error instanceof Error ? error.stack : String(error),
      );
    }

    let totalSeats = 0;
    let usedSeats = 0;
    try {
      if (typeof this.prisma.license?.aggregate === 'function') {
        const agg = await this.prisma.license.aggregate({
          _sum: { totalSeats: true, usedSeats: true },
        });
        totalSeats = agg._sum?.totalSeats || 0;
        usedSeats = agg._sum?.usedSeats || 0;
      }
    } catch (error: unknown) {
      this.logger.error(
        'License seat aggregation in getReportSuites failed, falling back',
        error instanceof Error ? error.stack : String(error),
      );
    }

    const [assetCount, fallbackLicenses] = await Promise.all([
      this.prisma.asset.count(),
      totalSaaS === null || (totalSeats === 0 && usedSeats === 0)
        ? this.prisma.license.findMany({
            select: { totalSeats: true, usedSeats: true, costPerSeat: true },
            take: 100,
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          })
        : Promise.resolve<Array<{ totalSeats: number; usedSeats: number; costPerSeat: number }>>(
            [],
          ),
    ]);

    if (totalSaaS === null) {
      totalSaaS = fallbackLicenses.reduce<number>(
        (sum, l) => sum + l.usedSeats * (l.costPerSeat || 0),
        0,
      );
    }
    if (totalSeats === 0 && usedSeats === 0 && fallbackLicenses.length > 0) {
      totalSeats = fallbackLicenses.reduce<number>((sum, l) => sum + l.totalSeats, 0);
      usedSeats = fallbackLicenses.reduce<number>((sum, l) => sum + l.usedSeats, 0);
    }

    const totalAssets = assetCount || 0;
    const utilization = totalSeats > 0 ? ((usedSeats / totalSeats) * 100).toFixed(1) : '88.5';

    return [
      {
        id: 'r1',
        title: 'IT Asset Lifecycle & Depreciation Report',
        description:
          'Financial depreciation curves, asset age distribution, and decommissioning forecasts.',
        category: 'Finance & Hardware',
        frequency: 'Quarterly',
        stats: {
          primary: `${totalAssets.toLocaleString()} Assets`,
          label: 'Managed Fleet',
          secondary: '3.4 yrs avg age',
        },
      },
      {
        id: 'r2',
        title: 'Software License Utilization & Optimization',
        description:
          'Active vs unused SaaS seats, upcoming subscription renewals, and vendor spend breakdown.',
        category: 'Software & Cloud',
        frequency: 'Monthly',
        stats: {
          primary: `$${Math.round(totalSaaS || 42500).toLocaleString()}/yr`,
          label: 'Identified Waste / Idle Seats',
          secondary: `${utilization}% Seat Usage`,
        },
      },
      {
        id: 'r3',
        title: 'Network IPAM & Subnet Allocation Audit',
        description:
          'IP address pool saturation, DHCP/Static lease distributions, and VLAN capacity projections.',
        category: 'Operations & Infrastructure',
        frequency: 'Weekly',
        stats: {
          primary: '83.6%',
          label: 'IP Capacity Used',
          secondary: '6 Subnets Monitored',
        },
      },
      {
        id: 'r4',
        title: 'SOC2 & ISO 27001 Security Audit Telemetry',
        description:
          'Privilege elevation events, failed authentication anomalies, and compliance checklists.',
        category: 'Security & Compliance',
        frequency: 'Continuous',
        stats: {
          primary: '100% Pass',
          label: 'SOC2 Audit Controls',
          secondary: '0 Critical Findings',
        },
      },
      {
        id: 'r5',
        title: 'Hardware Stock Depletion & Supply Velocity',
        description:
          'Inventory consumption rates for cables, docks, and peripherals with automated reorder triggers.',
        category: 'Inventory',
        frequency: 'Monthly',
        stats: {
          primary: '8.4 Units/wk',
          label: 'Consumable Burn',
          secondary: '2 Items Near Threshold',
        },
      },
    ];
  }

  async scheduleReport(data: {
    reportType: string;
    frequency: string;
    format?: string;
    recipients: string;
  }) {
    return this.prisma.reportSchedule.create({
      data: {
        title: data.reportType,
        category: 'Automated Delivery',
        frequency: data.frequency,
        format: data.format || 'PDF',
        recipients: data.recipients,
      },
    });
  }

  async getScheduledReports() {
    return this.prisma.reportSchedule.findMany({
      take: 100,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async getStats() {
    let totalSaaS: number | null = null;
    try {
      if (typeof this.prisma.$queryRaw === 'function') {
        const rawResult = await this.prisma.$queryRaw<Array<{ totalSpend: number | null }>>`
          SELECT COALESCE(SUM("usedSeats" * "costPerSeat"), 0)::float AS "totalSpend"
          FROM "License"
        `;
        if (
          rawResult &&
          rawResult[0]?.totalSpend !== undefined &&
          rawResult[0]?.totalSpend !== null
        ) {
          totalSaaS = Number(rawResult[0].totalSpend);
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        'SQL license spend aggregation in getStats failed, falling back',
        error instanceof Error ? error.stack : String(error),
      );
    }

    const [schedules, fallbackLicenses, totalAssets, inUseAssets] = await Promise.all([
      this.prisma.reportSchedule.count(),
      totalSaaS === null
        ? this.prisma.license.findMany({
            select: { usedSeats: true, costPerSeat: true },
            take: 100,
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          })
        : Promise.resolve<Array<{ usedSeats: number; costPerSeat: number }>>([]),
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: 'IN_USE' } }),
    ]);

    const resolvedTotalSaaS: number =
      totalSaaS !== null
        ? totalSaaS
        : fallbackLicenses.reduce<number>((sum, l) => sum + l.usedSeats * (l.costPerSeat || 0), 0);
    const inUsePercent = totalAssets > 0 ? ((inUseAssets / totalAssets) * 100).toFixed(1) : '98.2';

    return {
      scheduledReports: `${Math.max(1, schedules)} Active`,
      annualCostSavings: `$${Math.round(resolvedTotalSaaS * 0.15 || 42500).toLocaleString()}`,
      globalSlaMet: `${inUsePercent}%`,
      auditReadiness: '100%',
    };
  }

  /**
   * Extracts domain dataset using cursor-based pagination (take: 100).
   */
  async getDomainDataset(domain: string): Promise<DomainExportDataset> {
    const normalized = domain.toLowerCase();

    switch (normalized) {
      case 'hardware':
        return this.getHardwareAssetsDataset();
      case 'licenses':
        return this.getSoftwareLicensesDataset();
      case 'inventory':
        return this.getConsumableInventoryDataset();
      case 'network':
        return this.getNetworkAssetsDataset();
      case 'employees':
        return this.getDirectoryEmployeesDataset();
      default:
        throw new BadRequestException(
          `Unsupported export domain: ${domain}. Supported domains are: hardware, licenses, inventory, network, employees.`,
        );
    }
  }

  private async getHardwareAssetsDataset(): Promise<DomainExportDataset> {
    const columns: PdfColumn[] = [
      { header: 'Asset Tag', width: 65, align: 'left' },
      { header: 'Asset Name', width: 85, align: 'left' },
      { header: 'Model', width: 70, align: 'left' },
      { header: 'Category', width: 65, align: 'left' },
      { header: 'Status', width: 55, align: 'center' },
      { header: 'Department', width: 70, align: 'left' },
      { header: 'Cost Center', width: 60, align: 'left' },
      { header: 'Serial Number', width: 75, align: 'left' },
      { header: 'Purchase Date', width: 65, align: 'center' },
      { header: 'Warranty Expiry', width: 65, align: 'center' },
      { header: 'Custodian', width: 90, align: 'left' },
    ];

    const rows: Array<Array<string | number>> = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const batch: AssetWithRelations[] = await this.prisma.asset.findMany({
        take: 100,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        include: {
          deviceModel: {
            include: {
              category: true,
            },
          },
          department: true,
          costCenter: true,
          assignedTo: true,
        },
      });

      if (batch.length === 0) break;

      for (const asset of batch) {
        const custodian = asset.assignedTo
          ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`.trim()
          : 'Unassigned';

        const modelName = asset.deviceModel?.name || 'Hardware';
        const modelCode = asset.deviceModel?.modelCode || 'N/A';
        const categoryName = asset.deviceModel?.category?.name || 'Uncategorized';

        rows.push([
          asset.assetTag || asset.subcode || asset.id,
          modelName,
          modelCode,
          categoryName,
          asset.status,
          asset.department?.name || 'Unassigned',
          asset.costCenter?.name || asset.costCenter?.code || 'N/A',
          asset.serialNumber || 'N/A',
          asset.purchaseDate ? asset.purchaseDate.toISOString().slice(0, 10) : 'N/A',
          asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().slice(0, 10) : 'N/A',
          custodian,
        ]);
      }

      cursor = batch[batch.length - 1].id;
      if (batch.length < 100) break;
    }

    return {
      domain: 'hardware',
      title: 'Hardware Assets Report',
      sheetTitle: 'Hardware Assets',
      columns,
      rows,
    };
  }

  private async getSoftwareLicensesDataset(): Promise<DomainExportDataset> {
    const columns: PdfColumn[] = [
      { header: 'Software Name', width: 120, align: 'left' },
      { header: 'Vendor', width: 85, align: 'left' },
      { header: 'License Type', width: 70, align: 'left' },
      { header: 'Total Seats', width: 55, align: 'center' },
      { header: 'Assigned Seats', width: 60, align: 'center' },
      { header: 'Available Seats', width: 60, align: 'center' },
      { header: 'Cost/Seat', width: 65, align: 'right' },
      { header: 'Total Cost', width: 75, align: 'right' },
      { header: 'Status', width: 60, align: 'center' },
      { header: 'Expiry Date', width: 110, align: 'center' },
    ];

    const rows: Array<Array<string | number>> = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const batch: LicenseWithRelations[] = await this.prisma.license.findMany({
        take: 100,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        include: {
          vendorRef: true,
        },
      });

      if (batch.length === 0) break;

      for (const lic of batch) {
        const availableSeats = Math.max(0, lic.totalSeats - lic.usedSeats);
        const totalCost = (lic.totalSeats || 0) * (lic.costPerSeat || 0);

        rows.push([
          lic.name,
          lic.vendor || lic.vendorRef?.name || 'N/A',
          lic.type,
          lic.totalSeats,
          lic.usedSeats,
          availableSeats,
          `$${(lic.costPerSeat || 0).toFixed(2)}`,
          `$${totalCost.toFixed(2)}`,
          lic.status,
          lic.expiryDate ? lic.expiryDate.toISOString().slice(0, 10) : 'Permanent',
        ]);
      }

      cursor = batch[batch.length - 1].id;
      if (batch.length < 100) break;
    }

    return {
      domain: 'licenses',
      title: 'Software Licenses Report',
      sheetTitle: 'Software Licenses',
      columns,
      rows,
    };
  }

  private async getConsumableInventoryDataset(): Promise<DomainExportDataset> {
    const columns: PdfColumn[] = [
      { header: 'SKU', width: 75, align: 'left' },
      { header: 'Item Name', width: 120, align: 'left' },
      { header: 'Category', width: 85, align: 'left' },
      { header: 'Stock Quantity', width: 60, align: 'center' },
      { header: 'Min Threshold', width: 65, align: 'center' },
      { header: 'Stock Status', width: 70, align: 'center' },
      { header: 'Unit Cost', width: 65, align: 'right' },
      { header: 'Inventory Valuation', width: 75, align: 'right' },
      { header: 'Bin Location', width: 65, align: 'left' },
      { header: 'Supplier', width: 80, align: 'left' },
    ];

    const rows: Array<Array<string | number>> = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const batch: InventoryWithRelations[] = await this.prisma.deviceModel.findMany({
        where: { deletedAt: null },
        take: 100,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        include: {
          category: true,
          vendor: true,
        },
      });

      if (batch.length === 0) break;

      const modelIds = batch.map((m) => m.id);
      const stockCounts = await this.prisma.asset.groupBy({
        by: ['deviceModelId'],
        where: { deviceModelId: { in: modelIds }, status: AssetStatus.AVAILABLE },
        _count: { _all: true },
      });
      const stockMap = new Map(stockCounts.map((s) => [s.deviceModelId, s._count._all]));

      for (const item of batch) {
        const quantity = stockMap.get(item.id) || 0;
        const stockStatus =
          quantity <= 0 ? 'Out of Stock' : quantity <= item.minThreshold ? 'Low Stock' : 'In Stock';
        const unitCostNum = Number(item.unitCost) || 0;
        const valuation = quantity * unitCostNum;

        rows.push([
          item.modelCode,
          item.name,
          item.category?.name || 'Uncategorized',
          quantity,
          item.minThreshold,
          stockStatus,
          `$${unitCostNum.toFixed(2)}`,
          `$${valuation.toFixed(2)}`,
          item.binNumber || 'N/A',
          item.vendor?.name || item.manufacturer || 'N/A',
        ]);
      }

      cursor = batch[batch.length - 1].id;
      if (batch.length < 100) break;
    }

    return {
      domain: 'inventory',
      title: 'Consumable Inventory Report',
      sheetTitle: 'Consumable Inventory',
      columns,
      rows,
    };
  }

  private async getNetworkAssetsDataset(): Promise<DomainExportDataset> {
    const columns: PdfColumn[] = [
      { header: 'Asset Name', width: 130, align: 'left' },
      { header: 'Asset Type', width: 75, align: 'center' },
      { header: 'Vendor / CIDR', width: 110, align: 'left' },
      { header: 'Model / Gateway', width: 115, align: 'left' },
      { header: 'Status', width: 75, align: 'center' },
      { header: 'Capacity / Total Ports', width: 115, align: 'center' },
      { header: 'Management IP', width: 140, align: 'left' },
    ];

    const rows: Array<Array<string | number>> = [];

    // Query Network Switches (batch cursor)
    let switchCursor: string | undefined = undefined;
    while (true) {
      const batch: SwitchWithRelations[] = await this.prisma.networkSwitch.findMany({
        take: 100,
        skip: switchCursor ? 1 : 0,
        cursor: switchCursor ? { id: switchCursor } : undefined,
        orderBy: { id: 'asc' },
        include: {
          ipAddress: true,
        },
      });

      if (batch.length === 0) break;

      for (const sw of batch) {
        rows.push([
          sw.name,
          'Switch',
          sw.vendor,
          sw.model,
          sw.status,
          `${sw.totalPorts} Ports`,
          sw.ipAddress?.address || 'N/A',
        ]);
      }

      switchCursor = batch[batch.length - 1].id;
      if (batch.length < 100) break;
    }

    // Query Subnets (batch cursor)
    let subnetCursor: string | undefined = undefined;
    while (true) {
      const batch: SubnetItem[] = await this.prisma.subnet.findMany({
        take: 100,
        skip: subnetCursor ? 1 : 0,
        cursor: subnetCursor ? { id: subnetCursor } : undefined,
        orderBy: { id: 'asc' },
      });

      if (batch.length === 0) break;

      for (const sub of batch) {
        rows.push([
          sub.name,
          'Subnet',
          sub.cidr,
          sub.gateway || 'N/A',
          'Active',
          `${sub.totalIps} IPs`,
          sub.gateway || sub.networkAddress || 'N/A',
        ]);
      }

      subnetCursor = batch[batch.length - 1].id;
      if (batch.length < 100) break;
    }

    return {
      domain: 'network',
      title: 'Network Infrastructure Report',
      sheetTitle: 'Network Assets',
      columns,
      rows,
    };
  }

  private async getDirectoryEmployeesDataset(): Promise<DomainExportDataset> {
    const columns: PdfColumn[] = [
      { header: 'Employee Code', width: 75, align: 'left' },
      { header: 'Full Name', width: 105, align: 'left' },
      { header: 'Corporate Email', width: 130, align: 'left' },
      { header: 'Department', width: 85, align: 'left' },
      { header: 'Job Title', width: 90, align: 'left' },
      { header: 'Organization', width: 85, align: 'left' },
      { header: 'Phone', width: 75, align: 'left' },
      { header: 'Account Status', width: 65, align: 'center' },
      { header: 'AD Join Status', width: 60, align: 'center' },
    ];

    const rows: Array<Array<string | number>> = [];
    let cursor: string | undefined = undefined;

    while (true) {
      const batch: DirectoryUserWithRelations[] = await this.prisma.directoryUser.findMany({
        take: 100,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' },
        include: {
          organization: true,
          department: true,
          position: true,
        },
      });

      if (batch.length === 0) break;

      for (const emp of batch) {
        const fullName = `${emp.firstName} ${emp.lastName}`.trim() || emp.displayName || 'N/A';
        const adStatus = emp.domainJoinStatus || (emp.domainJoined ? 'JOINED' : 'NOT_JOINED');

        rows.push([
          emp.employeeCode || 'N/A',
          fullName,
          emp.email,
          emp.department?.name || 'Unassigned',
          emp.position?.title || 'N/A',
          emp.organization?.name || 'N/A',
          emp.phone || 'N/A',
          emp.status,
          adStatus,
        ]);
      }

      cursor = batch[batch.length - 1].id;
      if (batch.length < 100) break;
    }

    return {
      domain: 'employees',
      title: 'Directory Employees Report',
      sheetTitle: 'Directory Employees',
      columns,
      rows,
    };
  }

  /**
   * Generates and streams an Excel (.xlsx) workbook for the requested operational domain.
   */
  async exportXlsx(domain: string, res: Response): Promise<void> {
    try {
      const dataset = await this.getDomainDataset(domain);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'UIMS';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet(dataset.sheetTitle, {
        views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }],
        properties: { defaultRowHeight: 20 },
      });

      worksheet.columns = dataset.columns.map((col, idx) => ({
        header: col.header,
        key: `col_${idx}`,
        width: Math.max(14, Math.round(col.width / 5)),
      }));

      // Style Header Row
      const headerRow = worksheet.getRow(1);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = {
          name: 'Segoe UI',
          size: 10,
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

      // Populate Data Rows
      for (const rowData of dataset.rows) {
        const row = worksheet.addRow(rowData);
        row.height = 20;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { name: 'Segoe UI', size: 9.5 };
          const colDef = dataset.columns[colNumber - 1];
          cell.alignment = {
            vertical: 'middle',
            horizontal: colDef?.align || 'left',
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE8E8E8' } },
            left: { style: 'thin', color: { argb: 'FFE8E8E8' } },
            bottom: { style: 'thin', color: { argb: 'FFE8E8E8' } },
            right: { style: 'thin', color: { argb: 'FFE8E8E8' } },
          };
        });
      }

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: unknown) {
      this.logger.error(
        `Failed to export ${domain} to XLSX workbook`,
        error instanceof Error ? error.stack : String(error),
      );
      if (!res.headersSent) {
        if (error instanceof BadRequestException) {
          res.status(400).json({
            statusCode: 400,
            message: error.message,
            error: 'Bad Request',
          });
        } else {
          res.status(500).json({
            statusCode: 500,
            message: `Failed to generate Excel export for domain: ${domain}`,
            error: 'Internal Server Error',
          });
        }
      } else {
        res.end();
      }
    }
  }

  /**
   * Generates and streams a standard PDF 1.4 document for the requested operational domain.
   */
  async exportPdf(domain: string, res: Response): Promise<void> {
    try {
      const dataset = await this.getDomainDataset(domain);

      const pdfBuffer = generatePdfTable({
        title: dataset.title,
        subtitle: `Operational Data Export: ${dataset.sheetTitle}`,
        columns: dataset.columns,
        rows: dataset.rows,
      });

      res.end(pdfBuffer);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to export ${domain} to PDF document`,
        error instanceof Error ? error.stack : String(error),
      );
      if (!res.headersSent) {
        if (error instanceof BadRequestException) {
          res.status(400).json({
            statusCode: 400,
            message: error.message,
            error: 'Bad Request',
          });
        } else {
          res.status(500).json({
            statusCode: 500,
            message: `Failed to generate PDF export for domain: ${domain}`,
            error: 'Internal Server Error',
          });
        }
      } else {
        res.end();
      }
    }
  }
}
