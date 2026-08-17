import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AssetQueryDto } from '@uims/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get asset KPIs and metrics' })
  getStats() {
    return this.assetsService.getStats();
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create new asset (Admin/Super Admin only)' })
  create(@Body() body: CreateAssetDto) {
    return this.assetsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets with filtering' })
  findAll(@Query() query: AssetQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by id' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update asset (Admin/Super Admin only)' })
  update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.assetsService.update(id, body);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete asset (Admin/Super Admin only)' })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
