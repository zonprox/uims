import { BadRequestException, Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { ScheduleReportDto } from './dto/schedule-report.dto';
import { ReportsService } from './reports.service';

const SUPPORTED_EXPORT_DOMAINS = [
  'hardware',
  'licenses',
  'inventory',
  'network',
  'employees',
] as const;

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get report statistics' })
  getStats() {
    return this.reportsService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get report suites' })
  getReportSuites() {
    return this.reportsService.getReportSuites();
  }

  @Get('schedules')
  @ApiOperation({ summary: 'Get report schedules' })
  getScheduledReports() {
    return this.reportsService.getScheduledReports();
  }

  @Post('schedule')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create report schedule' })
  scheduleReport(@Body() body: ScheduleReportDto) {
    return this.reportsService.scheduleReport(body);
  }

  @Get('export/:domain/xlsx')
  @ApiOperation({ summary: 'Stream operational dataset export as Excel (.xlsx)' })
  @ApiParam({
    name: 'domain',
    enum: SUPPORTED_EXPORT_DOMAINS,
    description: 'Operational domain dataset to export',
  })
  async exportXlsx(@Param('domain') domain: string, @Res() res: Response): Promise<void> {
    const normalized = domain.toLowerCase();
    if (
      !SUPPORTED_EXPORT_DOMAINS.includes(normalized as (typeof SUPPORTED_EXPORT_DOMAINS)[number])
    ) {
      throw new BadRequestException(
        `Unsupported export domain: ${domain}. Must be one of: ${SUPPORTED_EXPORT_DOMAINS.join(', ')}`,
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${normalized}_report_${today}.xlsx"`,
    );

    await this.reportsService.exportXlsx(normalized, res);
  }

  @Get('export/:domain/pdf')
  @ApiOperation({ summary: 'Stream operational dataset export as standard PDF 1.4' })
  @ApiParam({
    name: 'domain',
    enum: SUPPORTED_EXPORT_DOMAINS,
    description: 'Operational domain dataset to export',
  })
  async exportPdf(@Param('domain') domain: string, @Res() res: Response): Promise<void> {
    const normalized = domain.toLowerCase();
    if (
      !SUPPORTED_EXPORT_DOMAINS.includes(normalized as (typeof SUPPORTED_EXPORT_DOMAINS)[number])
    ) {
      throw new BadRequestException(
        `Unsupported export domain: ${domain}. Must be one of: ${SUPPORTED_EXPORT_DOMAINS.join(', ')}`,
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${normalized}_report_${today}.pdf"`,
    );

    await this.reportsService.exportPdf(normalized, res);
  }
}
