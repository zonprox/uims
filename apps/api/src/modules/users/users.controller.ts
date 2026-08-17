import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { BatchImportUsersDto } from './dto/import-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user metrics summary' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get user metrics summary (alias)' })
  getStatsSummary() {
    return this.usersService.getStats();
  }

  @Get('organizational-units')
  @ApiOperation({ summary: 'Get Active Directory Organizational Units (OUs) hierarchy' })
  getOrganizationalUnits() {
    return this.usersService.getOrganizationalUnits();
  }

  @Post('sync-domain')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Trigger Active Directory Domain Controller replication sync' })
  syncDomain() {
    return this.usersService.syncDomain();
  }

  @Get('roles/list')
  @ApiOperation({ summary: 'Get all available RBAC roles' })
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all Active Directory distribution & security groups' })
  getGroups() {
    return this.usersService.findAllGroups();
  }

  @Post('groups')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create new distribution / security group' })
  createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.usersService.createGroup(createGroupDto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export standardized Active Directory & user master dataset' })
  exportMaster() {
    return this.usersService.exportMaster();
  }

  @Post('import')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch import Active Directory users from Excel/CSV master' })
  importBatch(@Body() importDto: BatchImportUsersDto) {
    return this.usersService.importBatch(importDto);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create new user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with search and filter' })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
    @Query('section') section?: string,
    @Query('company') company?: string,
    @Query('plant') plant?: string,
    @Query('adGroup') adGroup?: string,
    @Query('ouPath') ouPath?: string,
    @Query('source') source?: string,
  ) {
    return this.usersService.findAll({
      page,
      pageSize,
      limit,
      search,
      role,
      status,
      department,
      section,
      company,
      plant,
      adGroup,
      ouPath,
      source,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/reset-password')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Reset user password' })
  resetPassword(@Param('id') id: string, @Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(id, body.password);
  }

  @Patch(':id/toggle-status')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Toggle user active status' })
  toggleStatus(@Param('id') id: string, @Body() body: ToggleStatusDto) {
    return this.usersService.toggleStatus(id, body.status);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
