import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { NonADUserStatus } from '@uims/shared-types';

export class NonADUserQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Search term across name, badge, ID, company, email, phone' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: NonADUserStatus })
  @IsEnum(NonADUserStatus)
  @IsOptional()
  status?: NonADUserStatus;

  @ApiPropertyOptional({ description: 'Filter by company name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ description: 'Filter by user type' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  userType?: string;

  @ApiPropertyOptional({ description: 'Sort column name' })
  @IsString()
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'asc';
}
