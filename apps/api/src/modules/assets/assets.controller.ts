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
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssetsService } from './assets.service';
import { AssetQueryDto } from './dto/asset-query.dto';
import { BatchAssignAssetDto } from './dto/batch-assign-asset.dto';
import { BatchDeleteAssetDto } from './dto/batch-delete-asset.dto';
import { CheckinPhysicalUnitDto } from './dto/checkin-physical-unit.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { CreateDeviceModelDto } from './dto/create-device-model.dto';
import { IssueAssetUnitDto } from './dto/issue-asset-unit.dto';
import { RegisterPhysicalUnitDto } from './dto/register-physical-unit.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { UpdateDeviceModelDto } from './dto/update-device-model.dto';
import { UpdatePhysicalUnitDto } from './dto/update-physical-unit.dto';

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

  @Post('batch-assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch assign assets to a user or location/department' })
  batchAssign(@Body() body: BatchAssignAssetDto) {
    return this.assetsService.batchAssign(body);
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

  // --- Device Model Endpoints ---

  @Get('models')
  @ApiOperation({ summary: 'List device models with aggregate unit count metrics' })
  getModels(@Query() query: AssetQueryDto) {
    return this.assetsService.listModels(query);
  }

  @Post('models')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create device model with manual assetCode' })
  createModel(@Body() body: CreateDeviceModelDto) {
    return this.assetsService.createModel(body);
  }

  @Get('models/:id')
  @ApiOperation({ summary: 'Get device model details and child units' })
  getModel(@Param('id') id: string) {
    return this.assetsService.getModel(id);
  }

  @Patch('models/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update device model metadata' })
  updateModel(@Param('id') id: string, @Body() body: UpdateDeviceModelDto) {
    return this.assetsService.updateModel(id, body);
  }

  @Delete('models/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete device model (blocked if child units exist)' })
  deleteModel(@Param('id') id: string) {
    return this.assetsService.deleteModel(id);
  }

  @Get('models/:id/units')
  @ApiOperation({ summary: 'Get physical units belonging to device model' })
  getModelUnits(@Param('id') id: string, @Query() query: AssetQueryDto) {
    return this.assetsService.getModelUnits(id, query);
  }

  // --- Physical Unit Endpoints ---

  @Post('units')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Register physical unit with manual subcode linked to parent model' })
  registerUnit(@Body() body: RegisterPhysicalUnitDto) {
    return this.assetsService.registerUnit(body);
  }

  @Get('units/:id')
  @ApiOperation({ summary: 'Get physical unit details' })
  getUnit(@Param('id') id: string) {
    return this.assetsService.getUnit(id);
  }

  @Patch('units/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update physical unit' })
  updateUnit(@Param('id') id: string, @Body() body: UpdatePhysicalUnitDto) {
    return this.assetsService.updateUnit(id, body);
  }

  @Delete('units/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete physical unit' })
  deleteUnit(@Param('id') id: string) {
    return this.assetsService.deleteUnit(id);
  }

  @Post('units/:id/issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Issue physical unit to directory user' })
  issueUnit(@Param('id') id: string, @Body() body: IssueAssetUnitDto) {
    return this.assetsService.issueUnit(id, body);
  }

  @Post('units/:id/checkin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Check in physical unit returning to AVAILABLE' })
  checkinUnit(@Param('id') id: string, @Body() body?: CheckinPhysicalUnitDto) {
    return this.assetsService.checkinUnit(id, body?.notes);
  }

  // --- Cost Center Endpoints ---

  @Get('cost-centers')
  @ApiOperation({ summary: 'List all enterprise cost centers' })
  getCostCenters() {
    return this.assetsService.listCostCenters();
  }

  @Post('cost-centers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create enterprise cost center with unique code' })
  createCostCenter(@Body() body: CreateCostCenterDto) {
    return this.assetsService.createCostCenter(body);
  }

  @Get('cost-centers/:id')
  @ApiOperation({ summary: 'Get cost center by ID with linked asset count' })
  getCostCenter(@Param('id') id: string) {
    return this.assetsService.getCostCenter(id);
  }

  @Patch('cost-centers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update cost center' })
  updateCostCenter(@Param('id') id: string, @Body() body: UpdateCostCenterDto) {
    return this.assetsService.updateCostCenter(id, body);
  }

  @Delete('cost-centers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete cost center (blocked if linked assets exist)' })
  deleteCostCenter(@Param('id') id: string) {
    return this.assetsService.deleteCostCenter(id);
  }

  // --- Generic Asset Endpoints ---

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create asset' })
  create(@Body() body: CreateAssetDto) {
    return this.assetsService.create(body);
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
