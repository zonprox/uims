import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SwitchPortQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by parent NetworkSwitch UUID' })
  @IsOptional()
  @IsString()
  switchId?: string;

  @ApiPropertyOptional({ description: 'Filter by VLAN UUID' })
  @IsOptional()
  @IsString()
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Filter by admin status' })
  @IsOptional()
  @IsString()
  adminStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by operational status' })
  @IsOptional()
  @IsString()
  operStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by port mode (ACCESS, TRUNK, LACP)' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ description: 'Search by port name or description' })
  @IsOptional()
  @IsString()
  search?: string;
}
