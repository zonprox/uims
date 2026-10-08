import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class InventoryQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term across SKU, item name, supplier' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by Category UUID' })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by category name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by Organization UUID' })
  @IsUUID('4')
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filter by organization name' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  organization?: string;

  @ApiPropertyOptional({
    description: 'Filter by stock status',
    enum: ['all', 'in_stock', 'low_stock', 'out_of_stock'],
  })
  @IsEnum(['all', 'in_stock', 'low_stock', 'out_of_stock'])
  @IsOptional()
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}
