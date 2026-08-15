import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScheduleReportDto } from './dto/schedule-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get report metrics' })
  getStats() {
    return this.reportsService.getStats();
  }

  @Get()
  @ApiOperation({ summary: 'Get available executive report suites' })
  getReportSuites() {
    return this.reportsService.getReportSuites();
  }

  @Get('schedules')
  @ApiOperation({ summary: 'Get automated report schedules' })
  getScheduledReports() {
    return this.reportsService.getScheduledReports();
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule automated report delivery' })
  scheduleReport(@Body() body: ScheduleReportDto) {
    return this.reportsService.scheduleReport(body);
  }
}
