import { ApiPropertyOptional } from '@nestjs/swagger';
import type { LicenseQueryDto as ILicenseQueryDto } from '@uims/shared-types';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class LicenseQueryDto implements ILicenseQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term across name, vendor, license key' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by vendor' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  vendor?: string;

  @ApiPropertyOptional({ description: 'Filter by license type' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by license status' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  status?: string;
}
