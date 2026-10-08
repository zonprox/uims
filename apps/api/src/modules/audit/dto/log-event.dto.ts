import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LogEventDto as ILogEventDto } from '@uims/shared-types';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum AuditSeverityEnum {
  Info = 'Info',
  Warning = 'Warning',
  Error = 'Error',
  Critical = 'Critical',
}

export enum AuditStatusEnum {
  Success = 'Success',
  Failure = 'Failure',
  Warning = 'Warning',
  Pending = 'Pending',
}

export class LogEventDto implements ILogEventDto {
  @ApiPropertyOptional({ description: 'User UUID performing action' })
  @IsUUID('4')
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'User name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  userName?: string;

  @ApiPropertyOptional({ description: 'User corporate email' })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  userEmail?: string;

  @ApiProperty({ description: 'Audit action keyword', example: 'ASSET_CREATE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  action!: string;

  @ApiPropertyOptional({ enum: AuditSeverityEnum, default: AuditSeverityEnum.Info })
  @IsEnum(AuditSeverityEnum)
  @IsOptional()
  severity?: AuditSeverityEnum;

  @ApiProperty({ description: 'Entity domain / resource', example: 'Asset' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entity!: string;

  @ApiPropertyOptional({ description: 'Entity type' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Entity UUID' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Originating IP address', example: '10.232.130.15' })
  @IsString()
  @MaxLength(45)
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ enum: AuditStatusEnum, default: AuditStatusEnum.Success })
  @IsEnum(AuditStatusEnum)
  @IsOptional()
  status?: AuditStatusEnum;

  @ApiPropertyOptional({ description: 'HTTP status code', example: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  @IsOptional()
  statusCode?: number;

  @ApiPropertyOptional({ description: 'Execution duration in milliseconds', example: 45 })
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  durationMs?: number;

  @ApiPropertyOptional({ description: 'Audit details / remarks' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  details?: string;

  @ApiPropertyOptional({ description: 'Diff payload' })
  @IsObject()
  @IsOptional()
  diffPayload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Old state values' })
  @IsObject()
  @IsOptional()
  oldValue?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'New state values' })
  @IsObject()
  @IsOptional()
  newValue?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Client User-Agent' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  userAgent?: string;
}
