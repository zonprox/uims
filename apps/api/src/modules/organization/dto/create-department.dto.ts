import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Cloud Infrastructure & DevOps' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'DEPT-INFRA' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: 'Responsible for Cloud Systems, VPCs, and Core Infrastructure' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ example: 'Sarah Chen' })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({ example: 'sarah.chen@company.com' })
  @IsEmail()
  @IsOptional()
  managerEmail?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}
