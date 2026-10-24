import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DoorSecurityLevel, DoorStatus } from '@uims/shared-types';

export class DoorQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Search term across code, name, building, floor, zone' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: DoorStatus })
  @IsEnum(DoorStatus)
  @IsOptional()
  status?: DoorStatus;

  @ApiPropertyOptional({ enum: DoorSecurityLevel })
  @IsEnum(DoorSecurityLevel)
  @IsOptional()
  securityLevel?: DoorSecurityLevel;

  @ApiPropertyOptional({ description: 'Filter by building name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  building?: string;

  @ApiPropertyOptional({ description: 'Filter by floor identifier' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  floor?: string;

  @ApiPropertyOptional({ description: 'Sort column name' })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'asc';
}
