import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { DirectoryService } from './directory.service';
import { CreateDirectoryGroupDto } from './dto/create-directory-group.dto';
import { CreateDirectoryUserDto } from './dto/create-directory-user.dto';
import { DirectoryQueryDto } from './dto/directory-query.dto';
import { BatchImportDirectoryDto } from './dto/import-directory.dto';
import { UpdateDirectoryUserDto } from './dto/update-directory-user.dto';

@ApiTags('directory')
@ApiBearerAuth()
@Controller('directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get directory telemetry and statistics' })
  getStats() {
    return this.directoryService.getStats();
  }

  @Get('organizational-units')
  @ApiOperation({ summary: 'Get organizational unit hierarchy tree' })
  getOrganizationalUnits() {
    return this.directoryService.getOrganizationalUnits();
  }

  @Post('sync-domain')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Trigger Active Directory domain controller sync' })
  syncDomain() {
    return this.directoryService.syncDomain();
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all Active Directory and distribution groups' })
  findAllGroups() {
    return this.directoryService.findAllGroups();
  }

  @Post('groups')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create new directory group' })
  createGroup(@Body() createGroupDto: CreateDirectoryGroupDto) {
    return this.directoryService.createGroup(createGroupDto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export corporate employee directory as tabular records' })
  exportMaster() {
    return this.directoryService.exportMaster();
  }

  @Post('import')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch import employee records into corporate directory' })
  importBatch(@Body() importDto: BatchImportDirectoryDto) {
    return this.directoryService.importBatch(importDto);
  }

  @Get('users')
  @ApiOperation({ summary: 'Search and filter corporate employee directory' })
  findAll(@Query() query: DirectoryQueryDto) {
    return this.directoryService.findAll(query);
  }

  @Post('users')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Register new employee record in corporate directory' })
  create(@Body() createUserDto: CreateDirectoryUserDto) {
    return this.directoryService.create(createUserDto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get employee profile with assigned assets, licenses, and groups' })
  findOne(@Param('id') id: string) {
    return this.directoryService.findOne(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update employee directory profile' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateDirectoryUserDto) {
    return this.directoryService.update(id, updateUserDto);
  }

  @Delete('users/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Remove employee profile from corporate directory' })
  remove(@Param('id') id: string) {
    return this.directoryService.remove(id);
  }
}
