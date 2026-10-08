import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AssetQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term across name, code, model' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['model', 'unit', 'all'] })
  @IsEnum(['model', 'unit', 'all'])
  @IsOptional()
  type?: 'model' | 'unit' | 'all';

  @ApiPropertyOptional({ description: 'Filter by parent asset model UUID' })
  @IsUUID('4')
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Filter by Cost Center UUID' })
  @IsUUID('4')
  @IsOptional()
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Filter by category name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by Category UUID' })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by Department UUID' })
  @IsUUID('4')
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by Assigned User UUID' })
  @IsUUID('4')
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Filter by Organization UUID' })
  @IsUUID('4')
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by organization name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  organization?: string;

  @ApiPropertyOptional({ description: 'Filter by asset status' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc';
}
