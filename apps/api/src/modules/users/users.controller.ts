import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { BatchImportUsersDto } from './dto/import-users.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get user statistics summary' })
  getStatsSummary() {
    return this.usersService.getStats();
  }

  @Get('organizational-units')
  @ApiOperation({ summary: 'Get organizational units' })
  getOrganizationalUnits() {
    return this.usersService.getOrganizationalUnits();
  }

  @Post('sync-domain')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Sync domain controller' })
  syncDomain() {
    return this.usersService.syncDomain();
  }

  @Get('roles/list')
  @ApiOperation({ summary: 'Get all roles' })
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all directory groups' })
  getGroups() {
    return this.usersService.findAllGroups();
  }

  @Post('groups')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create directory group' })
  createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.usersService.createGroup(createGroupDto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export users' })
  exportMaster() {
    return this.usersService.exportMaster();
  }

  @Post('import')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Import users' })
  importBatch(@Body() importDto: BatchImportUsersDto) {
    return this.usersService.importBatch(importDto);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/toggle-status')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Toggle user status' })
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
