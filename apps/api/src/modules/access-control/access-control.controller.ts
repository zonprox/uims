import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessAssignmentStatus, AccessSubjectType } from '@uims/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccessControlStorageService } from './access-control-storage.service';
import { AccessControlService } from './access-control.service';
import {
  CreateDoorDto,
  CreateNonADUserDto,
  DocumentScanQueryDto,
  DoorQueryDto,
  GrantAccessDto,
  NonADUserQueryDto,
  RevokeAccessDto,
  TemplateQueryDto,
  UnifiedUserQueryDto,
  UpdateDoorDto,
  UpdateNonADUserDto,
  UploadDocumentDto,
} from './dto';

interface RequestWithUser {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    role?: string;
  };
}

@ApiTags('access-control')
@ApiBearerAuth()
@Controller('access-control')
export class AccessControlController {
  constructor(
    private readonly accessControlService: AccessControlService,
    private readonly storageService: AccessControlStorageService,
  ) {}

  // ==========================================
  // 1. TELEMETRY & STATS
  // ==========================================

  @Get('stats')
  @ApiOperation({ summary: 'Get access control dashboard telemetry and metrics' })
  getStats() {
    return this.accessControlService.getAccessControlStats();
  }

  // ==========================================
  // 2. PHYSICAL DOORS INVENTORY
  // ==========================================

  @Get('doors')
  @ApiOperation({ summary: 'Get paginated physical doors directory with active user counts' })
  getDoors(@Query() query: DoorQueryDto) {
    return this.accessControlService.getDoors(query);
  }

  @Get('doors/:id')
  @ApiOperation({ summary: 'Get physical door configuration, status, and recent assignments' })
  getDoorById(@Param('id') id: string) {
    return this.accessControlService.getDoorById(id);
  }

  @Get('doors/:id/users')
  @ApiOperation({ summary: 'Get paginated authorized and revoked users for a physical door' })
  getDoorUsers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: AccessAssignmentStatus,
    @Query('subjectType') subjectType?: AccessSubjectType,
  ) {
    return this.accessControlService.getDoorUsers(id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      subjectType,
    });
  }

  @Post('doors')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Register a new physical door facility' })
  createDoor(@Body() dto: CreateDoorDto) {
    return this.accessControlService.createDoor(dto);
  }

  @Patch('doors/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update physical door configuration or operational status' })
  updateDoor(@Param('id') id: string, @Body() dto: UpdateDoorDto) {
    return this.accessControlService.updateDoor(id, dto);
  }

  @Put('doors/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update physical door configuration or operational status (PUT alias)' })
  updateDoorPut(@Param('id') id: string, @Body() dto: UpdateDoorDto) {
    return this.accessControlService.updateDoor(id, dto);
  }

  @Delete('doors/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Deactivate or remove a physical door (fails if active users exist)' })
  deleteDoor(@Param('id') id: string) {
    return this.accessControlService.deleteDoor(id);
  }

  // ==========================================
  // 3. NON-AD EXTERNAL PERSONNEL REGISTRY
  // ==========================================

  @Get('non-ad-users')
  @ApiOperation({ summary: 'Get paginated external contractors and visitors registry' })
  getNonADUsers(@Query() query: NonADUserQueryDto) {
    return this.accessControlService.getNonADUsers(query);
  }

  @Get('non-ad-users/:id')
  @ApiOperation({ summary: 'Get external non-AD user profile with assigned doors' })
  getNonADUserById(@Param('id') id: string) {
    return this.accessControlService.getNonADUserById(id);
  }

  @Post('non-ad-users')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Register a new external contractor or visitor' })
  createNonADUser(@Body() dto: CreateNonADUserDto) {
    return this.accessControlService.createNonADUser(dto);
  }

  @Patch('non-ad-users/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update external non-AD personnel profile' })
  updateNonADUser(@Param('id') id: string, @Body() dto: UpdateNonADUserDto) {
    return this.accessControlService.updateNonADUser(id, dto);
  }

  @Put('non-ad-users/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update external non-AD personnel profile (PUT alias)' })
  updateNonADUserPut(@Param('id') id: string, @Body() dto: UpdateNonADUserDto) {
    return this.accessControlService.updateNonADUser(id, dto);
  }

  @Delete('non-ad-users/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({
    summary: 'Deactivate or remove external personnel (fails if active access exists)',
  })
  deleteNonADUser(@Param('id') id: string) {
    return this.accessControlService.deleteNonADUser(id);
  }

  // ==========================================
  // 4. UNIFIED USER ACCESS MATRIX & PROFILE
  // ==========================================

  @Get('users')
  @ApiOperation({
    summary: 'Unified search directory of AD employees and Non-AD external personnel',
  })
  getUnifiedUsers(@Query() query: UnifiedUserQueryDto) {
    return this.accessControlService.getUnifiedUsers(query);
  }

  @Get('users/access-matrix')
  @ApiOperation({ summary: 'Unified directory of AD & Non-AD users with door counts (alias)' })
  getUsersAccessMatrix(@Query() query: UnifiedUserQueryDto) {
    return this.accessControlService.getUnifiedUsers(query);
  }

  @Get('users/:subjectType/:subjectId')
  @ApiOperation({
    summary: 'Get complete door access profile & audit history for an AD or Non-AD user',
  })
  getUserAccessDetail(
    @Param('subjectType') subjectType: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.accessControlService.getUserAccessDetail(subjectType, subjectId);
  }

  @Get('users/:subjectType/:subjectId/doors')
  @ApiOperation({ summary: 'Get accessible doors & historical records for user (alias)' })
  getUserDoorsDetail(
    @Param('subjectType') subjectType: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.accessControlService.getUserAccessDetail(subjectType, subjectId);
  }

  // ==========================================
  // 5. ACCESS OPERATIONS (GRANT & REVOKE)
  // MANDATORY SCAN ATTACHMENT ENFORCED!
  // ==========================================

  @Post('grants')
  @Roles('Admin', 'Super Admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Grant physical door access (single or batch) with mandatory approval scan check',
  })
  grantAccess(
    @Body() dto: GrantAccessDto,
    @UploadedFile()
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Req() req: RequestWithUser,
  ) {
    const currentUserId = req.user?.id || req.user?.sub;
    return this.accessControlService.grantAccess(dto, file, currentUserId);
  }

  @Post('revocations')
  @Roles('Admin', 'Super Admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Revoke physical door access (single or batch) with mandatory revocation scan check',
  })
  revokeAccess(
    @Body() dto: RevokeAccessDto,
    @UploadedFile()
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Req() req: RequestWithUser,
  ) {
    const currentUserId = req.user?.id || req.user?.sub;
    return this.accessControlService.revokeAccess(dto, file, currentUserId);
  }

  // ==========================================
  // 6. APPROVAL SCAN DOCUMENT AUDIT MANAGEMENT
  // ==========================================

  @Post('documents/upload')
  @Roles('Admin', 'Super Admin')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', enum: ['GRANT', 'REVOCATION'] },
        approverName: { type: 'string' },
        approverTitle: { type: 'string' },
        referenceNumber: { type: 'string' },
        reason: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['file', 'documentType', 'approverName', 'reason'],
    },
  })
  @ApiOperation({ summary: 'Upload scanned signed approval document (PDF/images up to 10MB)' })
  uploadDocument(
    @Body() dto: UploadDocumentDto,
    @UploadedFile()
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException(
        'A document file is required (PDF, PNG, JPG, or JPEG up to 10MB).',
      );
    }
    const currentUserId = req.user?.id || req.user?.sub;
    return this.accessControlService.uploadDocument(dto, file, currentUserId);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Audit list of uploaded approval scan documents' })
  getDocuments(@Query() query: DocumentScanQueryDto) {
    return this.accessControlService.getDocuments(query);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Document scan record details with linked assignments' })
  getDocumentById(@Param('id') id: string) {
    return this.accessControlService.getDocumentById(id);
  }

  @Get('documents/file/:filename')
  @ApiOperation({ summary: 'Stream or download stored scanned approval document' })
  getScanFile(
    @Param('filename') filename: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const isAttachment = download === 'true' || download === '1';
    return this.storageService.streamScanFile(filename, res, isAttachment);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download stored scanned approval document by document ID (alias)' })
  async downloadDocumentById(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const doc = await this.accessControlService.getDocumentById(id);
    return this.storageService.streamScanFile(doc.fileName, res, true);
  }

  // ==========================================
  // 7. TEMPLATE GENERATION (.DOCX & HTML)
  // ==========================================

  @Get('templates/request.docx')
  @ApiOperation({ summary: 'Download pre-populated Microsoft Word (.docx) access clearance form' })
  async downloadRequestDocx(@Query() query: TemplateQueryDto, @Res() res: Response): Promise<void> {
    const buffer = await this.accessControlService.generateDocxTemplate(query);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="door-access-request-form.docx"');
    res.send(buffer);
  }

  @Post('templates/request')
  @ApiOperation({ summary: 'Generate & download .docx access clearance form (POST alias)' })
  async generateRequestDocxPost(
    @Body() body: TemplateQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.accessControlService.generateDocxTemplate(body);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="door-access-request-form.docx"');
    res.send(buffer);
  }

  @Get('templates/request.html')
  @ApiOperation({ summary: 'Get printable HTML access authorization request form' })
  async getRequestHtml(@Query() query: TemplateQueryDto, @Res() res: Response): Promise<void> {
    const html = await this.accessControlService.generateHtmlTemplate(query);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('templates/request/print')
  @ApiOperation({ summary: 'Printable HTML request template (alias)' })
  async getRequestHtmlAlias(@Query() query: TemplateQueryDto, @Res() res: Response): Promise<void> {
    const html = await this.accessControlService.generateHtmlTemplate(query);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
