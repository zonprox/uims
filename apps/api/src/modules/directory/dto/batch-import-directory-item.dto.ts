import { ApiPropertyOptional } from '@nestjs/swagger';
import type { BatchImportDirectoryUserItem } from '@uims/shared-types';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BatchImportDirectoryItemDto implements BatchImportDirectoryUserItem {
  @ApiPropertyOptional()
  @IsOptional()
  stt?: number | string;

  @ApiPropertyOptional({ example: 'EMP-63020037' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  employeeCode?: string;

  @ApiPropertyOptional({ example: 'Alex Chen' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name!: string;

  @ApiPropertyOptional({ example: 'alex.chen@youngonevn.com' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  email!: string;

  @ApiPropertyOptional({ example: 'IT Specialist' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  groupCompany?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  company?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  plant?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  department?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  section?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  subSection?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  computerName?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  computerName2?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  adGroup?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  ouPath?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isClosed?: boolean | string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(50)
  @IsOptional()
  status?: string;
}
