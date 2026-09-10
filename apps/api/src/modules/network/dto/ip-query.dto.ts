import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class IPAddressQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
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

  @ApiPropertyOptional({ description: 'Search term for IP, hostname, MAC, or vendor' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by VLAN UUID' })
  @IsOptional()
  @IsString()
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Filter by VLAN name or ID (legacy support)' })
  @IsOptional()
  @IsString()
  vlan?: string;

  @ApiPropertyOptional({ description: 'Filter by Subnet UUID' })
  @IsOptional()
  @IsString()
  subnetId?: string;

  @ApiPropertyOptional({ description: 'Filter by Subnet name or CIDR (legacy support)' })
  @IsOptional()
  @IsString()
  subnet?: string;

  @ApiPropertyOptional({ description: 'Filter by IP status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Filter by Location UUID' })
  @IsOptional()
  @IsString()
  locationId?: string;
}

export type IpQueryDto = IPAddressQueryDto;
export const IpQueryDto = IPAddressQueryDto;
