import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SearchQueryDto as ISearchQueryDto } from '@uims/shared-types';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SearchQueryDto implements ISearchQueryDto {
  @ApiProperty({ description: 'Search keyword query', example: 'MacBook' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q!: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Category filter',
    enum: ['all', 'assets', 'licenses', 'users'],
    default: 'all',
  })
  @IsEnum(['all', 'assets', 'licenses', 'users'])
  @IsOptional()
  type?: 'all' | 'assets' | 'licenses' | 'users';
}
