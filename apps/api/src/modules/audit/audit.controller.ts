import { Body, Controller, Get, Header, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { LogEventDto } from './dto/log-event.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin', 'Manager', 'Viewer')
  @ApiOperation({ summary: 'Get audit statistics' })
  getStats() {
    return this.auditService.getStats();
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin', 'Manager', 'Viewer')
  @ApiOperation({ summary: 'Export audit logs' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-logs.csv"')
  async exportCsv(@Query() query: AuditQueryDto, @Res() res: Response) {
    const csv = await this.auditService.exportCsv(query);
    res.send(csv);
  }

  @Get('entity/:type/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin', 'Manager', 'Viewer')
  @ApiOperation({ summary: 'Get entity audit history' })
  findByEntity(
    @Param('type') type: string,
    @Param('id') id: string,
    @Query() query: AuditQueryDto,
  ) {
    return this.auditService.findByEntity(type, id, query);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin', 'Manager', 'Viewer')
  @ApiOperation({ summary: 'Get all audit logs' })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin', 'Manager', 'Viewer')
  @ApiOperation({ summary: 'Get audit log by ID' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Log audit event' })
  logEvent(@Body() body: LogEventDto) {
    return this.auditService.logEvent(body);
  }
}
