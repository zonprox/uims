import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImportUserRowDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  stt?: number | string;

  @ApiPropertyOptional({ example: '63020037' })
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiPropertyOptional({ example: 'Phung Thi Nhu Y' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'yptn.st@youngonevn.com' })
  @IsString()
  email!: string;

  @ApiPropertyOptional({ example: 'Asst. Officer' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: 'BSL' })
  @IsOptional()
  @IsString()
  groupCompany?: string;

  @ApiPropertyOptional({ example: 'BSL Others' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: '1 BSL-1' })
  @IsOptional()
  @IsString()
  plant?: string;

  @ApiPropertyOptional({ example: 'Production' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 'Printing' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ example: 'Logo Embroidery' })
  @IsOptional()
  @IsString()
  subSection?: string;

  @ApiPropertyOptional({ example: '888152675' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ example: 'OU=Production,OU=BSL,DC=uims,DC=internal' })
  @IsOptional()
  @IsString()
  ouPath?: string;

  @ApiPropertyOptional({ example: 'Nguyen Doan Quang Huy' })
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ example: 'STOTHPR102' })
  @IsOptional()
  @IsString()
  computerName?: string;

  @ApiPropertyOptional({ example: 'STOTHPR102-LAP' })
  @IsOptional()
  @IsString()
  computerName2?: string;

  @ApiPropertyOptional({ example: 'kPm#*Ed8' })
  @IsOptional()
  @IsString()
  initialPassword?: string;

  @ApiPropertyOptional({ example: 'GR_BSLOTHPrinting' })
  @IsOptional()
  @IsString()
  adGroup?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isClosed?: boolean | string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class BatchImportUsersDto {
  @ApiProperty({ type: [ImportUserRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportUserRowDto)
  users!: ImportUserRowDto[];
}
