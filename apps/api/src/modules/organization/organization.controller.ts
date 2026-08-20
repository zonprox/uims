import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { OrganizationService } from './organization.service';

@ApiTags('organization')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get organization statistics' })
  getStats() {
    return this.orgService.getStats();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get organization hierarchy' })
  getTree() {
    return this.orgService.getHierarchyTree();
  }

  @Get('locations')
  @ApiOperation({ summary: 'Get all locations' })
  getLocations() {
    return this.orgService.findAllLocations();
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations' })
  findAll() {
    return this.orgService.findAllOrganizations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  findOne(@Param('id') id: string) {
    return this.orgService.findOrganization(id);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create organization' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.orgService.createOrganization(dto);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update organization' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgService.updateOrganization(id, dto);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete organization' })
  remove(@Param('id') id: string) {
    return this.orgService.deleteOrganization(id);
  }
}

@ApiTags('departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  findAll() {
    return this.orgService.findAllDepartments();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  findOne(@Param('id') id: string) {
    return this.orgService.findDepartment(id);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create department' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.orgService.createDepartment(dto);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update department' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.orgService.updateDepartment(id, dto);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete department' })
  remove(@Param('id') id: string) {
    return this.orgService.deleteDepartment(id);
  }
}

@ApiTags('positions')
@ApiBearerAuth()
@Controller('positions')
export class PositionController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all positions' })
  findAll() {
    return this.orgService.findAllPositions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  findOne(@Param('id') id: string) {
    return this.orgService.findPosition(id);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create position' })
  create(@Body() dto: CreatePositionDto) {
    return this.orgService.createPosition(dto);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update position' })
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.orgService.updatePosition(id, dto);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete position' })
  remove(@Param('id') id: string) {
    return this.orgService.deletePosition(id);
  }
}
