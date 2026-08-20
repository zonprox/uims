import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CloneRoleDto } from './dto/clone-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { SyncPermissionsDto } from './dto/sync-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get role statistics' })
  getStats() {
    return this.rolesService.getStats();
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Get permission catalog' })
  getCatalog() {
    return this.rolesService.getCatalog();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create role' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update role' })
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Post(':id/clone')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Clone role' })
  clone(@Param('id') id: string, @Body() cloneRoleDto: CloneRoleDto) {
    return this.rolesService.clone(id, cloneRoleDto);
  }

  @Post(':id/permissions')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Sync role permissions' })
  syncPermissions(@Param('id') id: string, @Body() syncPermissionsDto: SyncPermissionsDto) {
    return this.rolesService.syncPermissions(id, syncPermissionsDto);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete role' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
