import { ApiPropertyOptional } from '@nestjs/swagger';
import type { DirectoryUserQueryDto as IDirectoryUserQueryDto } from '@uims/shared-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class DirectoryQueryDto implements IDirectoryUserQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size limit', default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Page size alias' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Free-text search query across names, emails, employee codes, hostnames',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by company name' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Filter by manufacturing plant' })
  @IsOptional()
  @IsString()
  plant?: string;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter by operational section' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Filter by Active Directory group' })
  @IsOptional()
  @IsString()
  adGroup?: string;

  @ApiPropertyOptional({ description: 'Filter by OU canonical path' })
  @IsOptional()
  @IsString()
  ouPath?: string;

  @ApiPropertyOptional({ description: 'Filter by source (LOCAL, LDAP, AZURE_AD)' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Filter by account status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by closed account status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isClosed?: boolean;
}
