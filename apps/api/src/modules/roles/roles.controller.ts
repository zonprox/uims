import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get all RBAC roles with user & permission counts' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get RBAC role and permission summary statistics' })
  getStats() {
    return this.rolesService.getStats();
  }

  @Get('catalog')
  @ApiOperation({
    summary: 'Get master system permission catalog grouped by subject domain',
  })
  getCatalog() {
    return this.rolesService.getCatalog();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed role with assigned permissions and users' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create new custom RBAC role' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update role description and assigned permissions' })
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Post(':id/clone')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Duplicate an existing role into a new custom role' })
  clone(@Param('id') id: string, @Body() cloneRoleDto: CloneRoleDto) {
    return this.rolesService.clone(id, cloneRoleDto);
  }

  @Post(':id/permissions')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch sync / replace permissions assigned to a role' })
  syncPermissions(
    @Param('id') id: string,
    @Body() syncPermissionsDto: SyncPermissionsDto,
  ) {
    return this.rolesService.syncPermissions(id, syncPermissionsDto);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete a custom role (must have 0 assigned users)' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
