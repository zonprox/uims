import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CreateLocationDto, LocationType, UpdateLocationDto } from '@uims/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrganizationService } from './organization.service';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Get('tree')
  @ApiOperation({ summary: 'Get hierarchical location tree' })
  getTree(@Query('organizationId') organizationId?: string) {
    return this.orgService.getLocationTree(organizationId);
  }

  @Get(':id/descendants')
  @ApiOperation({ summary: 'Get all descendant location IDs for a location' })
  getDescendants(@Param('id') id: string) {
    return this.orgService.getDescendantLocationIds(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all locations' })
  findAll(
    @Query('organizationId') organizationId?: string,
    @Query('type') type?: LocationType,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
  ) {
    return this.orgService.findAllLocations({
      organizationId,
      type,
      parentId,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get location by ID with parent and children' })
  findOne(@Param('id') id: string) {
    return this.orgService.findLocation(id);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create location' })
  create(@Body() dto: CreateLocationDto) {
    return this.orgService.createLocation(dto);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update location' })
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.orgService.updateLocation(id, dto);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete location' })
  remove(@Param('id') id: string) {
    return this.orgService.deleteLocation(id);
  }
}
