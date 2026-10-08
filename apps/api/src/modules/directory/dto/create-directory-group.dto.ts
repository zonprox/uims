import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateDirectoryGroupDto as ICreateDirectoryGroupDto } from '@uims/shared-types';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDirectoryGroupDto implements ICreateDirectoryGroupDto {
  @ApiProperty({ description: 'Group identifier name', example: 'GR_BSLOTHPrinting' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Distribution email address', example: 'dl-printing@company.corp' })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Group type (e.g. AD Security Group, Distribution)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ description: 'Group scope (e.g. Domain Local, Global, Universal)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  scope?: string;

  @ApiPropertyOptional({ description: 'Container / OU path', example: 'OU=Groups,DC=corp,DC=uims' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ouPath?: string;

  @ApiPropertyOptional({ description: 'Managed by contact identity' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  managedBy?: string;
}
