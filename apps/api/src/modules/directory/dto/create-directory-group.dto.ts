import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CreateDirectoryGroupDto as ICreateDirectoryGroupDto } from '@uims/shared-types';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDirectoryGroupDto implements ICreateDirectoryGroupDto {
  @ApiProperty({ description: 'Group identifier name', example: 'GR_BSLOTHPrinting' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Group distribution email',
    example: 'printing-ops@youngonevn.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Group type (e.g. AD Security Group, Distribution)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Group scope (e.g. Domain Local, Global, Universal)' })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ description: 'Canonical OU path' })
  @IsOptional()
  @IsString()
  ouPath?: string;

  @ApiPropertyOptional({ description: 'Managed by contact identity' })
  @IsOptional()
  @IsString()
  managedBy?: string;
}
