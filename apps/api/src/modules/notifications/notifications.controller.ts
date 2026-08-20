import { Body, Controller, Delete, Get, Param, Patch, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  async findAll(@Request() req: { user?: { sub?: string; id?: string; role?: string } }) {
    const userId = req.user?.role === 'Super Admin' ? undefined : req.user?.id || req.user?.sub;
    return this.notificationsService.findAll(userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req: { user?: { sub?: string; id?: string; role?: string } }) {
    const userId = req.user?.role === 'Super Admin' ? undefined : req.user?.id || req.user?.sub;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create notification' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
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
  @ApiOperation({ summary: 'Delete notification' })
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
