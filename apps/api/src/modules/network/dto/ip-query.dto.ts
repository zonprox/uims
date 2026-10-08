import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Search term for IP, MAC, or vendor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by VLAN UUID' })
  @IsOptional()
  @IsUUID('4')
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Filter by Subnet UUID' })
  @IsOptional()
  @IsUUID('4')
  subnetId?: string;

  @ApiPropertyOptional({ description: 'Filter by IP status' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by device type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceType?: string;
}
