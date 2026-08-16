import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get('time')
  @ApiOperation({ summary: 'Get server time telemetry and timezone info' })
  getServerTime() {
    return this.settingsService.getServerTimeInfo();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get subsystem health telemetry' })
  getHealthTelemetry() {
    return this.settingsService.getHealthTelemetry();
  }

  @Get(':group')
  @ApiOperation({ summary: 'Get settings by group' })
  getSetting(@Param('group') group: string) {
    return this.settingsService.getSetting(group);
  }

  @Patch(':group')
  @ApiOperation({ summary: 'Update settings group' })
  updateSetting(@Param('group') group: string, @Body() body: Record<string, unknown>) {
    return this.settingsService.updateSetting(group, body);
  }

  @Post('backup')
  @ApiOperation({ summary: 'Trigger on-demand encrypted backup' })
  runBackup() {
    return this.settingsService.runBackup();
  }
}
