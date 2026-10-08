import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientIP } from '../../common/decorators/client-ip.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DirectoryService } from './directory.service';
import { CreateDirectoryGroupDto } from './dto/create-directory-group.dto';
import { CreateDirectoryUserDto } from './dto/create-directory-user.dto';
import { DirectoryQueryDto } from './dto/directory-query.dto';
import { BatchImportDirectoryDto } from './dto/import-directory.dto';
import { ResetEmailPasswordDto } from './dto/reset-email-password.dto';
import { UpdateDirectoryGroupDto } from './dto/update-directory-group.dto';
import { UpdateDirectoryUserDto } from './dto/update-directory-user.dto';

interface RequestWithUser {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    role?: string;
  };
}

@ApiTags('directory')
@ApiBearerAuth()
@Controller('directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get directory telemetry and statistics' })
  getStats() {
    return this.directoryService.getStats();
  }

  @Post('sync-domain')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Trigger Active Directory domain controller sync' })
  syncDomain() {
    return this.directoryService.syncDomain();
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get all Active Directory and distribution groups' })
  findAllGroups() {
    return this.directoryService.findAllGroups();
  }

  @Get('groups/:id')
  @ApiOperation({ summary: 'Get directory group by identifier' })
  findOneGroup(@Param('id') id: string) {
    return this.directoryService.findOneGroup(id);
  }

  @Post('groups')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create new directory group' })
  createGroup(@Body() createGroupDto: CreateDirectoryGroupDto) {
    return this.directoryService.createGroup(createGroupDto);
  }

  @Patch('groups/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update directory group details' })
  updateGroup(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateDirectoryGroupDto,
  ) {
    return this.directoryService.updateGroup(id, updateGroupDto);
  }

  @Delete('groups/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({
    summary: 'Remove directory group with cascade cleanup of memberships',
  })
  removeGroup(@Param('id') id: string) {
    return this.directoryService.removeGroup(id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export corporate employee directory as tabular records' })
  exportMaster() {
    return this.directoryService.exportMaster();
  }

  @Post('import')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Batch import employee records into corporate directory' })
  importBatch(@Body() importDto: BatchImportDirectoryDto) {
    return this.directoryService.importBatch(importDto);
  }

  // --- Hardware Device & License Pools ---

  @Get('available-assets')
  @ApiOperation({ summary: 'Get available hardware assets from inventory' })
  getAvailableAssets() {
    return this.directoryService.getAvailableAssets();
  }

  @Get('available-licenses')
  @ApiOperation({ summary: 'Get active software licenses with available seats' })
  getAvailableLicenses() {
    return this.directoryService.getAvailableLicenses();
  }

  // --- Directory User CRUD ---

  @Get('users')
  @ApiOperation({ summary: 'Search and filter corporate employee directory' })
  findAll(@Query() query: DirectoryQueryDto) {
    return this.directoryService.findAll(query);
  }

  @Post('users')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Register new employee record in corporate directory' })
  create(@Body() createUserDto: CreateDirectoryUserDto) {
    return this.directoryService.create(createUserDto);
  }

  // --- Audited Email Credential Operations (R1) ---

  @Get('users/:id/email-password')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Audited reveal of enterprise email password' })
  revealEmailPassword(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @ClientIP() ip: string,
  ) {
    return this.directoryService.revealEmailPassword(id, {
      id: req.user?.id || req.user?.sub,
      email: req.user?.email,
      role: req.user?.role,
      ipAddress: ip,
    });
  }

  @Post('users/:id/email-password/copy')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Audited clipboard copy of enterprise email password' })
  copyEmailPassword(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
    @ClientIP() ip: string,
  ) {
    return this.directoryService.copyEmailPassword(id, {
      id: req.user?.id || req.user?.sub,
      email: req.user?.email,
      role: req.user?.role,
      ipAddress: ip,
    });
  }

  @Post('users/:id/email-password/reset')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Reset enterprise email password with audit trail' })
  resetEmailPassword(
    @Param('id') id: string,
    @Body() resetDto: ResetEmailPasswordDto,
    @Request() req: RequestWithUser,
    @ClientIP() ip: string,
  ) {
    return this.directoryService.resetEmailPassword(id, resetDto, {
      id: req.user?.id || req.user?.sub,
      email: req.user?.email,
      role: req.user?.role,
      ipAddress: ip,
    });
  }

  // --- Assigned Hardware Devices (R2) ---

  @Get('users/:id/assets')
  @ApiOperation({ summary: 'Get hardware devices assigned to directory user' })
  getUserAssets(@Param('id') id: string) {
    return this.directoryService.getUserAssets(id);
  }

  @Post('users/:id/assets/:assetId')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Assign hardware device to directory user' })
  assignAsset(@Param('id') id: string, @Param('assetId') assetId: string) {
    return this.directoryService.assignAsset(id, assetId);
  }

  @Delete('users/:id/assets/:assetId')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Unassign hardware device from directory user' })
  unassignAsset(@Param('id') id: string, @Param('assetId') assetId: string) {
    return this.directoryService.unassignAsset(id, assetId);
  }

  // --- Assigned Software Licenses (R2) ---

  @Get('users/:id/licenses')
  @ApiOperation({ summary: 'Get software license seats assigned to directory user' })
  getUserLicenses(@Param('id') id: string) {
    return this.directoryService.getUserLicenses(id);
  }

  @Post('users/:id/licenses/:licenseId')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Allocate software license seat to directory user' })
  assignLicense(@Param('id') id: string, @Param('licenseId') licenseId: string) {
    return this.directoryService.assignLicense(id, licenseId);
  }

  @Delete('users/:id/licenses/:assignmentId')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Revoke software license seat from directory user' })
  unassignLicense(@Param('id') id: string, @Param('assignmentId') assignmentId: string) {
    return this.directoryService.unassignLicense(id, assignmentId);
  }

  // --- User Profile Details, Update, Delete ---

  @Get('users/:id')
  @ApiOperation({ summary: 'Get employee profile with assigned assets, licenses, and groups' })
  findOne(@Param('id') id: string) {
    return this.directoryService.findOne(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update employee directory profile' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateDirectoryUserDto) {
    return this.directoryService.update(id, updateUserDto);
  }

  @Delete('users/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({
    summary: 'Remove employee profile from corporate directory with cascade cleanup',
  })
  remove(@Param('id') id: string) {
    return this.directoryService.remove(id);
  }
}
