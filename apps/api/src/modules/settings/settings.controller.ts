import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get('time')
  @ApiOperation({ summary: 'Get server time' })
  getServerTime() {
    return this.settingsService.getServerTimeInfo();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health telemetry' })
  getHealthTelemetry() {
    return this.settingsService.getHealthTelemetry();
  }

  @Get(':group')
  @ApiOperation({ summary: 'Get settings by group' })
  getSetting(@Param('group') group: string) {
    return this.settingsService.getSetting(group);
  }

  @Patch(':group')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update settings by group' })
  updateSetting(@Param('group') group: string, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateSetting(group, body);
  }

  @Post('backup')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Create backup snapshot' })
  runBackup() {
    return this.settingsService.runBackup();
  }
}
