import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview' })
  getOverview(@Query('period') period?: string, @Query('refresh') refresh?: string) {
    return this.dashboardService.getOverview(period, refresh === 'true');
  }

  @Get('pending-handovers')
  @ApiOperation({ summary: 'Get pending handover documents compliance summary' })
  getPendingHandoversSummary() {
    return this.dashboardService.getPendingHandoversSummary();
  }
}
