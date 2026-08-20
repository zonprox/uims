import { Body, Controller, Get, Header, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuditQueryDto, LogEventDto } from '@uims/shared-types';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get audit statistics' })
  getStats() {
    return this.auditService.getStats();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-logs.csv"')
  async exportCsv(@Res() res: Response) {
    const csv = await this.auditService.exportCsv();
    res.send(csv);
  }

  @Get()
  @ApiOperation({ summary: 'Get all audit logs' })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Log audit event' })
  logEvent(@Body() body: LogEventDto) {
    return this.auditService.logEvent(body);
  }
}
