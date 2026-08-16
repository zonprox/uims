import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Engineering Core' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'engineering-core@company.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'engineering-core@company.com' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Software engineers and platform architects' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  memberCount?: number | string;

  @ApiPropertyOptional({ example: 'Internal Only' })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({ example: 'IT Admin' })
  @IsString()
  @IsOptional()
  managedBy?: string;
}
