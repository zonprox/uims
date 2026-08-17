import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationTypeEnum } from './create-notification.dto';

export enum BroadcastTargetRole {
  ALL = 'All',
  ADMIN = 'Admin',
  SUPER_ADMIN = 'Super Admin',
  EMPLOYEE = 'Employee',
}

export class BroadcastNotificationDto {
  @ApiProperty({ description: 'Broadcast headline / title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Detailed announcement body' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ enum: NotificationTypeEnum, default: NotificationTypeEnum.INFO })
  @IsEnum(NotificationTypeEnum)
  @IsOptional()
  type?: NotificationTypeEnum;

  @ApiPropertyOptional({ enum: BroadcastTargetRole, default: BroadcastTargetRole.ALL })
  @IsEnum(BroadcastTargetRole)
  @IsOptional()
  targetRole?: BroadcastTargetRole;

  @ApiPropertyOptional({ description: 'Navigation route link (e.g. /inventory, /licenses)' })
  @IsString()
  @IsOptional()
  link?: string;
}
