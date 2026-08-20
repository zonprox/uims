import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AssignUserLicenseDto, LicenseQueryDto } from '@uims/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { LicensesService } from './licenses.service';

@ApiTags('licenses')
@ApiBearerAuth()
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get license statistics' })
  getStats() {
    return this.licensesService.getStats();
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create license' })
  create(@Body() body: CreateLicenseDto) {
    return this.licensesService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all licenses' })
  findAll(@Query() query: LicenseQueryDto) {
    return this.licensesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get license by ID' })
  findOne(@Param('id') id: string) {
    return this.licensesService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update license' })
  update(@Param('id') id: string, @Body() body: UpdateLicenseDto) {
    return this.licensesService.update(id, body);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete license' })
  remove(@Param('id') id: string) {
    return this.licensesService.remove(id);
  }

  @Post(':id/assign')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Assign license seat' })
  assignSeat(@Param('id') id: string, @Body() body: AssignUserLicenseDto) {
    return this.licensesService.assignUser(id, body);
  }

  @Delete(':id/assign/:assignmentId')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Revoke license seat' })
  revokeSeat(@Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    return this.licensesService.revokeUser(id, assignmentId);
  }
}
