import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AssignUserLicenseDto, LicenseQueryDto } from '@uims/shared-types';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';
import { LicensesService } from './licenses.service';


@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get license metrics and spend' })
  getStats() {
    return this.licensesService.getStats();
  }

  @Post()
  @ApiOperation({ summary: 'Create new software license' })
  create(@Body() body: CreateLicenseDto) {
    return this.licensesService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all software licenses' })
  findAll(@Query() query: LicenseQueryDto) {
    return this.licensesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get license by id' })
  findOne(@Param('id') id: string) {
    return this.licensesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update software license' })
  update(@Param('id') id: string, @Body() body: UpdateLicenseDto) {
    return this.licensesService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete software license' })
  remove(@Param('id') id: string) {
    return this.licensesService.remove(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign seat to user' })
  assignSeat(@Param('id') id: string, @Body() body: AssignUserLicenseDto) {
    return this.licensesService.assignUser(id, body);
  }

  @Delete(':id/assign/:assignmentId')
  @ApiOperation({ summary: 'Revoke seat from user' })
  revokeSeat(@Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    return this.licensesService.revokeUser(id, assignmentId);
  }
}
