import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum NotificationTypeEnum {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ALERT = 'ALERT',
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID target for the notification' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Notification headline / title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Detailed notification content' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ enum: NotificationTypeEnum, default: NotificationTypeEnum.INFO })
  @IsEnum(NotificationTypeEnum)
  @IsOptional()
  type?: NotificationTypeEnum;

  @ApiPropertyOptional({ description: 'Navigation route link' })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;
}
