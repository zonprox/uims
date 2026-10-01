import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AssetQueryDto } from '@uims/shared-types';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssetsService } from './assets.service';
import { BatchDeleteAssetDto } from './dto/batch-delete-asset.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get asset statistics' })
  getStats() {
    return this.assetsService.getStats();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all asset categories' })
  getCategories() {
    return this.assetsService.getCategories();
  }

  @Get('export.xlsx')
  @ApiOperation({ summary: 'Export assets as styled XLSX workbook' })
  async exportXlsx(@Query() query: AssetQueryDto, @Res() res: Response): Promise<void> {
    await this.assetsService.exportXlsx(query, res);
  }

  @Get('export/xlsx')
  @ApiOperation({ summary: 'Export assets as styled XLSX workbook (alias)' })
  async exportXlsxAlias(@Query() query: AssetQueryDto, @Res() res: Response): Promise<void> {
    await this.assetsService.exportXlsx(query, res);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create asset' })
  create(@Body() body: CreateAssetDto) {
    return this.assetsService.create(body);
  }

  @Post('batch-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch delete assets by IDs' })
  batchDelete(@Body() body: BatchDeleteAssetDto) {
    return this.assetsService.batchDelete(body.ids);
  }

  @Delete('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch delete assets by IDs (DELETE alias)' })
  batchDeleteAlias(@Body() body: BatchDeleteAssetDto) {
    return this.assetsService.batchDelete(body.ids);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets' })
  findAll(@Query() query: AssetQueryDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update asset' })
  update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.assetsService.update(id, body);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete asset' })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
