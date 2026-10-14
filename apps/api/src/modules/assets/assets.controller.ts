import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AssetsService } from './assets.service';
import { AllocateAssetDto } from './dto/allocate-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';
import { AttachHandoverDocumentDto } from './dto/attach-handover-document.dto';
import { BatchAssignAssetDto } from './dto/batch-assign-asset.dto';
import { BatchDeleteAssetDto } from './dto/batch-delete-asset.dto';
import { BatchStockIntakeDto } from './dto/batch-stock-intake.dto';
import { CheckinPhysicalUnitDto } from './dto/checkin-physical-unit.dto';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { CreateDeviceModelDto } from './dto/create-device-model.dto';
import { GenerateHandoverDocumentDto } from './dto/generate-handover-document.dto';
import { IssueAssetUnitDto } from './dto/issue-asset-unit.dto';
import { RegisterPhysicalUnitDto } from './dto/register-physical-unit.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { TransferAssetDto } from './dto/transfer-asset.dto';
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

  @Get('handover-template')
  @ApiOperation({ summary: 'Get standardized printable asset handover or return record template' })
  async getHandoverTemplate(
    @Query('type') type: 'assignment' | 'return' | 'transfer' | undefined,
    @Res() res: Response,
    @Query('format') format?: 'docx' | 'html',
  ): Promise<void> {
    const targetType = type || 'assignment';
    if (format === 'html') {
      const html = this.assetsService.getHandoverTemplateHtml(
        targetType as 'assignment' | 'return',
      );
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="asset_${targetType}_template.html"`,
      );
      res.send(html);
      return;
    }

    // Default format is docx (Microsoft Word)
    const { buffer, filename } = await this.assetsService.getHandoverTemplateDocx(targetType);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('handover-documents/docx')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({
    summary: 'Download populated asset handover, return, or transfer Word document (.docx)',
  })
  async downloadHandoverDocx(
    @Body() body: GenerateHandoverDocumentDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.assetsService.generateHandoverDocx(body);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('handover-documents/docx')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({
    summary: 'Download populated asset handover, return, or transfer Word document via GET',
  })
  async downloadHandoverDocxGet(
    @Query('type') type: 'assignment' | 'return' | 'transfer' | undefined,
    @Query('assetIds') assetIds: string | undefined,
    @Query('recipientId') recipientId: string | undefined,
    @Query('transferorId') transferorId: string | undefined,
    @Query('conditionNotes') conditionNotes: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const parsedAssetIds = assetIds
      ? assetIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const { buffer, filename } = await this.assetsService.generateHandoverDocx({
      type: type || 'assignment',
      assetIds: parsedAssetIds,
      recipientId,
      transferorId,
      conditionNotes,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('handover-documents/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Generate populated printable asset handover or return document' })
  generateHandoverDocument(@Body() body: GenerateHandoverDocumentDto) {
    return this.assetsService.generateHandoverDocument(body);
  }

  @Get('handover-documents/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Generate populated printable asset handover or return document (GET)' })
  generateHandoverDocumentGet(
    @Query('type') type: 'assignment' | 'return' | 'transfer' | undefined,
    @Query('assetIds') assetIds: string | undefined,
    @Query('recipientId') recipientId: string | undefined,
    @Query('transferorId') transferorId: string | undefined,
    @Query('conditionNotes') conditionNotes: string | undefined,
  ) {
    if (type && type !== 'assignment' && type !== 'return' && type !== 'transfer') {
      throw new BadRequestException('type must be "assignment", "return", or "transfer"');
    }
    const parsedAssetIds = assetIds
      ? assetIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    return this.assetsService.generateHandoverDocument({
      type: type || 'assignment',
      assetIds: parsedAssetIds,
      recipientId,
      transferorId,
      conditionNotes,
    });
  }

  @Post('handover-documents/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        assetId: { type: 'string', nullable: true },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedMimes.includes(file.mimetype?.toLowerCase())) {
          return callback(
            new BadRequestException(
              'Invalid file type. Only PDF, PNG, JPG, and JPEG documents are permitted.',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload scanned signed handover or return document (PDF/images up to 10MB)',
  })
  uploadHandoverDocument(
    @UploadedFile()
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Body('assetId') assetId?: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        'A document file is required (PDF, PNG, JPG, or JPEG up to 10MB).',
      );
    }
    const cleanAssetId = assetId?.trim() ? assetId.trim() : undefined;
    return this.assetsService.saveHandoverDocumentFile(file, cleanAssetId);
  }

  @Get('handover-documents/file/:filename')
  @ApiOperation({ summary: 'Download or view stored signed handover document' })
  getHandoverDocumentFile(
    @Param('filename') filename: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const isAttachment = download === 'true' || download === '1';
    return this.assetsService.streamHandoverDocumentFile(filename, res, isAttachment);
  }

  @Get('export.xlsx')
  @ApiOperation({ summary: 'Export assets as styled XLSX workbook' })
  async exportXlsx(@Query() query: AssetQueryDto, @Res() res: Response): Promise<void> {
    await this.assetsService.exportXlsx(query, res);
  }

  @Get('export/xlsx')
  @ApiOperation({ summary: 'Export assets to Excel (.xlsx) file (alias)' })
  async exportXlsxAlias(@Query() query: AssetQueryDto, @Res() res: Response): Promise<void> {
    await this.assetsService.exportXlsx(query, res);
  }

  // --- Custody Workflows Endpoints ---

  @Post('allocate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({
    summary: 'Allocate assets to a directory user (AVAILABLE -> IN_USE) with handover record',
  })
  allocate(@Body() body: AllocateAssetDto) {
    return this.assetsService.allocate(body);
  }

  @Post('batch-assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch assign or unassign assets with handover/return records' })
  batchAssign(@Body() body: BatchAssignAssetDto) {
    return this.assetsService.batchAssign(body);
  }

  @Post('return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({
    summary: 'Batch return assets from field custody (IN_USE -> AVAILABLE | MAINTENANCE | RETIRED)',
  })
  returnUnits(@Body() body: ReturnAssetDto) {
    return this.assetsService.returnUnits(body);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Transfer asset custody between two employees in 1 atomic transaction' })
  transfer(@Body() body: TransferAssetDto) {
    return this.assetsService.transfer(body);
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
  @ApiOperation({ summary: 'Create device model with manual modelCode' })
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

  @Post('models/:id/units')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Register a physical unit under a device model' })
  registerModelUnit(@Param('id') id: string, @Body() body: RegisterPhysicalUnitDto) {
    return this.assetsService.registerUnit({ ...body, deviceModelId: id });
  }

  @Post('models/:id/intake')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch stock intake physical units under a device model' })
  intakeModel(@Param('id') id: string, @Body() body: BatchStockIntakeDto) {
    return this.assetsService.batchIntake(id, body);
  }

  // --- Physical Unit Endpoints ---

  @Post('intake')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch intake physical units into warehouse stock' })
  intake(@Body() body: BatchStockIntakeDto) {
    return this.assetsService.batchIntakeUnits(body);
  }

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

  // --- Generic Asset Endpoints (Physical Units) ---

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
  update(@Param('id') id: string, @Body() body: UpdatePhysicalUnitDto) {
    return this.assetsService.update(id, body);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete asset' })
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }

  @Post(':id/return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Return asset to storage with handover record' })
  returnAsset(@Param('id') id: string, @Body() body: ReturnAssetDto) {
    return this.assetsService.returnAsset(id, body);
  }

  @Post(':id/handover-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Attach signed handover document and resolve pending record' })
  attachHandoverDocument(@Param('id') id: string, @Body() body: AttachHandoverDocumentDto) {
    return this.assetsService.attachHandoverDocument(id, body.fileUrl, body.recordId, body.notes);
  }
}
