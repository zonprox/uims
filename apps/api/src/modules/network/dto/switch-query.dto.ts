import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class SwitchQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term for name, model, vendor, serial, MAC' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by mounted NetworkRack UUID' })
  @IsOptional()
  @IsUUID('4')
  rackId?: string;

  @ApiPropertyOptional({ description: 'Filter by vendor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendor?: string;

  @ApiPropertyOptional({ description: 'Filter by switch role' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  @ApiPropertyOptional({ description: 'Filter by operating status' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
