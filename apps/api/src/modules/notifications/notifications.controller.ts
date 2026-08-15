import { Body, Controller, Delete, Get, Param, Patch, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the authenticated user' })
  async findAll(@Request() req: { user?: { sub?: string; id?: string; role?: string } }) {
    const userId = req.user?.role === 'Super Admin' ? undefined : req.user?.id || req.user?.sub;
    return this.notificationsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new system notification' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: { user?: { sub?: string; id?: string; role?: string } }) {
    const userId = req.user?.role === 'Super Admin' ? undefined : req.user?.id || req.user?.sub;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all notifications' })
  async clearAll(@Request() req: { user?: { sub?: string; id?: string; role?: string } }) {
    const userId = req.user?.role === 'Super Admin' ? undefined : req.user?.id || req.user?.sub;
    return this.notificationsService.clearAll(userId);
  }
}
