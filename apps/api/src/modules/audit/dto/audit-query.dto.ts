import { ApiPropertyOptional } from '@nestjs/swagger';
import type { AuditQueryDto as IAuditQueryDto } from '@uims/shared-types';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AuditQueryDto implements IAuditQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term across action, details, user' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by action' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by severity' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by entity' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  entity?: string;

  @ApiPropertyOptional({ description: 'Filter by User UUID' })
  @IsUUID('4')
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 end date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
