import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AccountStatus,
  DirectorySource,
  type DirectoryUserQueryDto as IDirectoryUserQueryDto,
  DomainJoinStatus,
} from '@uims/shared-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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
    description: 'Free-text search query across names, emails, employee codes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by Organization UUID' })
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by Department UUID' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by Position UUID' })
  @IsOptional()
  @IsUUID('4')
  positionId?: string;

  @ApiPropertyOptional({ description: 'Filter by source (LOCAL, LDAP, AZURE_AD)' })
  @IsOptional()
  @IsEnum(DirectorySource)
  source?: DirectorySource;

  @ApiPropertyOptional({ description: 'Filter by account status' })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiPropertyOptional({ description: 'Filter by domain joined status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  domainJoined?: boolean;

  @ApiPropertyOptional({ description: 'Filter by domain join status enum' })
  @IsOptional()
  @IsEnum(DomainJoinStatus)
  domainJoinStatus?: DomainJoinStatus;

  @ApiPropertyOptional({ description: 'Filter by Active Directory domain' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  adDomain?: string;
}
