import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePositionDto {
  @ApiProperty({ example: 'Senior Cloud DevOps Architect' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'POS-SR-DEVOPS' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: 'Oversees Multi-Region AWS infrastructure' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'Senior' })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;
}
