import { Body, Controller, Delete, Get, Param, Patch, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
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

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the authenticated user' })
  async getUnreadCount(@Request() req: { user?: { sub?: string; id?: string; role?: string } }) {
    const userId = req.user?.role === 'Super Admin' ? undefined : req.user?.id || req.user?.sub;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create a new system notification (Admin/Super Admin only)' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('broadcast')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Broadcast an announcement to users (Admin/Super Admin only)' })
  async broadcast(@Body() broadcastDto: BroadcastNotificationDto) {
    return this.notificationsService.broadcast(broadcastDto);
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
